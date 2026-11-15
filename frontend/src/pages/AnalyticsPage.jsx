import React, { useEffect, useState, useCallback } from 'react';
import api from '../utils/api';
import CustomChart from '../components/CustomChart';

function parseMarkdown(md) {
  if (!md) return '';
  let html = md;
  html = html
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  html = html.replace(/^### (.*$)/gim, '<h3 class="text-sm font-semibold text-slate-800 mt-4 mb-2">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 class="text-base font-semibold text-blue-700 mt-6 mb-3 border-b pb-1">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 class="text-lg font-bold text-slate-900 mt-8 mb-4">$1</h1>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-slate-800">$1</strong>');
  html = html.replace(/^\s*-\s+(.*$)/gim, '<li class="ml-4 list-disc text-slate-600 mb-1">$1</li>');

  html = html.split('\n').map(line => {
    if (line.trim().startsWith('<li') || line.trim().startsWith('<h') || line.trim().startsWith('<hr')) {
      return line;
    }
    return line + '<br />';
  }).join('\n');

  return html;
}

export default function AnalyticsPage() {
  const [files, setFiles] = useState([]);
  const [activeFile, setActiveFile] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('vis'); // 'vis' | 'report' | 'corr' | 'regression'

  // Viz states
  const [selectedCol, setSelectedCol] = useState('');
  const [chartType, setChartType] = useState('bar');

  // Report states
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportText, setReportText] = useState('');
  const [reportError, setReportError] = useState('');

  // Correlation states
  const [corrData, setCorrData] = useState(null);
  const [loadingCorr, setLoadingCorr] = useState(false);

  // Regression states
  const [regX, setRegX] = useState('');
  const [regY, setRegY] = useState('');
  const [regResult, setRegResult] = useState(null);
  const [loadingReg, setLoadingReg] = useState(false);
  const [regError, setRegError] = useState('');

  // Load files list
  useEffect(() => {
    api.get('/files/').then(r => {
      setFiles(r.data);
      if (r.data.length > 0) setActiveFile(r.data[0]);
    });
  }, []);

  // Fetch stats for the active file
  const loadStats = useCallback(() => {
    if (!activeFile) return;
    setLoading(true);
    setCorrData(null);
    setRegResult(null);
    setReportText('');
    setRegX('');
    setRegY('');
    setRegError('');

    api.get(`/files/${activeFile.id}/stats/`)
      .then(r => {
        setStats(r.data);
        const numCols = r.data.numeric_cols || [];
        const catCols = r.data.categorical_cols || [];
        
        if (catCols.length > 0) {
          setSelectedCol(catCols[0]);
          setChartType('bar');
        } else if (numCols.length > 0) {
          setSelectedCol(numCols[0]);
          setChartType('line');
        } else {
          setSelectedCol('');
        }

        if (numCols.length >= 2) {
          setRegX(numCols[0]);
          setRegY(numCols[1]);
        }
      })
      .catch(err => {
        console.error("Failed to load statistics:", err);
      })
      .finally(() => setLoading(false));
  }, [activeFile]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Fetch Correlation Matrix
  const fetchCorrelation = useCallback(() => {
    if (!activeFile) return;
    setLoadingCorr(true);
    api.get(`/files/${activeFile.id}/correlation/`)
      .then(r => setCorrData(r.data))
      .catch(err => console.error(err))
      .finally(() => setLoadingCorr(false));
  }, [activeFile]);

  // Trigger loading correlation when tab changes
  useEffect(() => {
    if (activeTab === 'corr' && !corrData) {
      fetchCorrelation();
    }
  }, [activeTab, corrData, fetchCorrelation]);

  // Run Regression Analysis
  const handleFitRegression = async () => {
    if (!activeFile || !regX || !regY) return;
    setLoadingReg(true);
    setRegError('');
    setRegResult(null);

    try {
      const { data } = await api.post(`/files/${activeFile.id}/regression/`, {
        x_column: regX,
        y_column: regY
      });
      setRegResult(data);
    } catch (err) {
      setRegError(err.response?.data?.error || 'Failed to fit linear model.');
    } finally {
      setLoadingReg(false);
    }
  };

  const isNumeric = stats?.numeric_cols?.includes(selectedCol);
  const isCategorical = stats?.categorical_cols?.includes(selectedCol);

  // Prepare data for the distribution charts
  const getChartData = () => {
    if (!stats || !selectedCol) return { labels: [], values: [] };
    if (isNumeric) {
      const dist = stats.distributions?.[selectedCol];
      return dist ? { labels: dist.labels, values: dist.counts } : { labels: [], values: [] };
    }
    if (isCategorical) {
      const catData = stats.categorical?.[selectedCol] || {};
      return {
        labels: Object.keys(catData),
        values: Object.values(catData),
      };
    }
    return { labels: [], values: [] };
  };

  // Run AI report generation
  const handleGenerateReport = async () => {
    if (!activeFile) return;
    setGeneratingReport(true);
    setReportError('');
    setReportText('');

    const provider = localStorage.getItem('dp_provider') || 'ollama';
    const model = localStorage.getItem('dp_model') || (
      provider === 'ollama' ? 'qwen3.5:4b' :
      provider === 'gemini' ? 'gemini-2.5-pro' :
      provider === 'openai' ? 'gpt-4o' :
      'claude-sonnet-4-20250514'
    );

    try {
      const { data } = await api.post(`/files/${activeFile.id}/report/`, { provider, model });
      setReportText(data.reply);
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to generate report. Make sure your AI provider is configured and reachable.';
      setReportError(errorMsg);
    } finally {
      setGeneratingReport(false);
    }
  };

  // Print/Save PDF report
  const handlePrint = () => {
    if (!reportText || !stats) return;
    const printWin = window.open('', '_blank');
    printWin.document.write(`
      <html>
        <head>
          <title>DataPilot Executive Report - ${stats.name}</title>
          <style>
            body { font-family: 'Inter', -apple-system, sans-serif; padding: 45px; color: #1e293b; line-height: 1.6; }
            h1 { color: #1e3a8a; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; font-size: 24px; margin-top: 0; }
            h2 { color: #2563eb; margin-top: 30px; font-size: 16px; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px; }
            h3 { color: #0f172a; font-size: 13px; margin-top: 20px; }
            ul { padding-left: 20px; margin: 10px 0; }
            li { margin-bottom: 6px; font-size: 13px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 25px; }
            th, td { border: 1px solid #e2e8f0; padding: 8px 12px; text-align: left; font-size: 11px; }
            th { background-color: #f8fafc; font-weight: 600; color: #475569; }
            .meta { font-size: 11px; color: #64748b; margin-bottom: 25px; background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
            .meta div span { font-weight: 600; color: #334155; }
          </style>
        </head>
        <body>
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 15px; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px;">
            <img src="/icon.png" width="40" height="40" style="object-fit: contain;" />
            <div>
              <h1 style="color: #1e3a8a; font-size: 22px; margin: 0; border: none; padding: 0;">DataPilot Intelligence & Analytical Report</h1>
              <p style="margin: 2px 0 0 0; font-size: 11px; color: #64748b;">AI-Powered Data Platform</p>
            </div>
          </div>
          <div class="meta">
            <div>Dataset: <span>${stats.name}</span></div>
            <div>File Size: <span>${stats.size_display}</span></div>
            <div>Generated: <span>${new Date().toLocaleDateString()}</span></div>
            <div>Row Count: <span>${stats.row_count.toLocaleString()}</span></div>
            <div>Columns: <span>${stats.column_count}</span></div>
            <div>Duplicate Rows: <span>${stats.duplicate_count}</span></div>
          </div>
          <div>${document.getElementById('report-body').innerHTML}</div>
          <script>
            window.onload = function() { 
              window.print(); 
              setTimeout(function(){ window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  // Rendering Helper for Regression Scatter SVG
  const renderRegressionChart = () => {
    if (!regResult) return null;
    const { scatter, trendline } = regResult;
    if (scatter.length === 0) return null;

    const xVals = scatter.map(p => p.x);
    const yVals = scatter.map(p => p.y);

    const xMin = Math.min(...xVals);
    const xMax = Math.max(...xVals);
    const yMin = Math.min(...yVals);
    const yMax = Math.max(...yVals);

    const xSpan = (xMax - xMin) || 1;
    const ySpan = (yMax - yMin) || 1;

    // SVG parameters
    const width = 500;
    const height = 300;
    const padding = 45;

    // Mapping values to SVG coords
    const getXCoord = (xVal) => padding + ((xVal - xMin) / xSpan) * (width - 2 * padding);
    const getYCoord = (yVal) => height - padding - ((yVal - yMin) / ySpan) * (height - 2 * padding);

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto border border-slate-100 rounded-xl bg-white shadow-inner p-2 select-none overflow-visible">
        {/* Gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map((r, i) => {
          const yVal = height - padding - r * (height - 2 * padding);
          const xVal = padding + r * (width - 2 * padding);
          const yText = (yMin + r * ySpan).toLocaleString(undefined, { maximumFractionDigits: 1 });
          const xText = (xMin + r * xSpan).toLocaleString(undefined, { maximumFractionDigits: 1 });

          return (
            <g key={i} className="opacity-30">
              {/* Horizontal gridline */}
              <line x1={padding} y1={yVal} x2={width - padding} y2={yVal} stroke="#cbd5e1" strokeWidth={1} strokeDasharray="3 3" />
              <text x={padding - 6} y={yVal + 3} textAnchor="end" fill="#64748b" className="text-[9px]">{yText}</text>

              {/* Vertical gridline */}
              <line x1={xVal} y1={padding} x2={xVal} y2={height - padding} stroke="#cbd5e1" strokeWidth={1} strokeDasharray="3 3" />
              <text x={xVal} y={height - padding + 12} textAnchor="middle" fill="#64748b" className="text-[9px]">{xText}</text>
            </g>
          );
        })}

        {/* Axes lines */}
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#64748b" strokeWidth={1.5} />
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#64748b" strokeWidth={1.5} />

        {/* Scatter Points */}
        {scatter.map((p, idx) => (
          <circle key={idx} cx={getXCoord(p.x)} cy={getYCoord(p.y)} r={2.5} fill="#93c5fd" className="opacity-70 hover:fill-blue-600 hover:opacity-100 transition-all cursor-pointer" />
        ))}

        {/* Regression Trendline */}
        {trendline.length === 2 && (
          <line
            x1={getXCoord(trendline[0].x)}
            y1={getYCoord(trendline[0].y)}
            x2={getXCoord(trendline[1].x)}
            y2={getYCoord(trendline[1].y)}
            stroke="#2563eb"
            strokeWidth={2.5}
            strokeDasharray="0"
            className="drop-shadow-lg"
          />
        )}
      </svg>
    );
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 animate-slide-up">
      {/* Top Header */}
      <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-center gap-4">
        <div>
          <h1 className="text-base font-semibold text-slate-900">Advanced Analytics</h1>
          <p className="text-xs text-slate-400">Visualize distributions, plot charts, and generate AI insights</p>
        </div>

        {/* File selector */}
        <select value={activeFile?.id || ''} onChange={e => {
          const f = files.find(x => String(x.id) === e.target.value);
          setActiveFile(f);
        }} className="ml-auto text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">— select file —</option>
          {files.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
      </div>

      {/* Main Content Area */}
      {!activeFile ? (
        <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
          Select or upload a file to analyze.
        </div>
      ) : loading ? (
        <div className="flex-1 flex items-center justify-center text-slate-400 text-sm animate-pulse">
          Computing statistics…
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-6xl mx-auto w-full">
          {/* Metadata Cards */}
          {stats && (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4 hover-glow shadow-sm">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Rows</p>
                <p className="text-xl font-extrabold text-slate-800">{stats.row_count.toLocaleString()}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4 hover-glow shadow-sm">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Columns</p>
                <p className="text-xl font-extrabold text-slate-800">{stats.column_count}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4 hover-glow shadow-sm">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">File Size</p>
                <p className="text-xl font-extrabold text-slate-800">{stats.size_display}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4 hover-glow shadow-sm">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Duplicate Rows</p>
                <p className={`text-xl font-extrabold ${stats.duplicate_count > 0 ? 'text-amber-600' : 'text-slate-800'}`}>
                  {stats.duplicate_count}
                </p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4 hover-glow shadow-sm col-span-2 lg:col-span-1 flex flex-col justify-between">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Null Cells</p>
                  <p className={`text-xl font-extrabold ${Object.values(stats.null_counts || {}).reduce((a,b)=>a+b, 0) > 0 ? 'text-amber-600' : 'text-slate-800'}`}>
                    {Object.values(stats.null_counts || {}).reduce((a, b) => a + b, 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tabs Navigation */}
          <div className="border-b border-slate-200 flex flex-wrap gap-4">
            <button onClick={() => setActiveTab('vis')}
              className={`pb-2.5 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors ${
                activeTab === 'vis' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}>
              📊 Distribution Charts
            </button>
            <button onClick={() => setActiveTab('corr')}
              className={`pb-2.5 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors ${
                activeTab === 'corr' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}>
              🔗 Correlation Matrix
            </button>
            <button onClick={() => setActiveTab('regression')}
              className={`pb-2.5 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors ${
                activeTab === 'regression' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}>
              📈 Regression & Trend
            </button>
            <button onClick={() => setActiveTab('report')}
              className={`pb-2.5 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors ${
                activeTab === 'report' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}>
              📝 Intelligence Report
            </button>
          </div>

          {/* Tab Contents */}
          {activeTab === 'vis' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              {/* Settings Panel */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                <div>
                  <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Chart Settings</h2>
                  <p className="text-[10px] text-slate-400 mt-0.5">Select variable and plot options</p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Column (X-Axis)</label>
                    <select value={selectedCol} onChange={e => {
                      setSelectedCol(e.target.value);
                      const isNum = stats?.numeric_cols?.includes(e.target.value);
                      setChartType(isNum ? 'line' : 'bar');
                    }}
                      className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                      {stats && [
                        ...stats.categorical_cols.map(c => ({ name: c, type: 'Categorical' })),
                        ...stats.numeric_cols.map(c => ({ name: c, type: 'Numeric' }))
                      ].map(c => (
                        <option key={c.name} value={c.name}>
                          {c.name} ({c.type})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Chart Type</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['bar', 'line', 'pie'].map(t => (
                        <button key={t} onClick={() => setChartType(t)}
                          disabled={t === 'line' && isCategorical}
                          title={t === 'line' && isCategorical ? 'Line charts require numeric data' : ''}
                          className={`py-1.5 text-[10px] font-medium border rounded-lg uppercase tracking-wider transition-colors disabled:opacity-30 ${
                            chartType === t
                              ? 'bg-blue-600 border-blue-600 text-white font-semibold'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {selectedCol && (
                  <div className="pt-4 border-t border-slate-100 space-y-2">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase">Variable Details</p>
                    <div className="text-[11px] text-slate-600 space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-150">
                      <p className="flex justify-between">
                        <span>Type:</span>
                        <span className="font-medium text-slate-800">{isNumeric ? 'Numeric' : 'Categorical'}</span>
                      </p>
                      <p className="flex justify-between">
                        <span>Null values:</span>
                        <span className={`font-medium ${stats?.null_counts?.[selectedCol] > 0 ? 'text-amber-600' : 'text-slate-800'}`}>
                          {stats?.null_counts?.[selectedCol]?.toLocaleString() || 0}
                        </span>
                      </p>
                      {isNumeric && stats?.numeric?.[selectedCol] && (
                        <>
                          <p className="flex justify-between">
                            <span>Mean:</span>
                            <span className="font-medium text-slate-800">
                              {stats.numeric[selectedCol].mean?.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </span>
                          </p>
                          <p className="flex justify-between">
                            <span>Min / Max:</span>
                            <span className="font-medium text-slate-800">
                              {stats.numeric[selectedCol].min?.toLocaleString(undefined, { maximumFractionDigits: 1 })} / {stats.numeric[selectedCol].max?.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                            </span>
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Chart Rendering Panel */}
              <div className="md:col-span-2">
                <CustomChart
                  type={chartType}
                  data={getChartData()}
                  title={selectedCol ? `Distribution of ${selectedCol}` : 'No Column Selected'}
                />
              </div>
            </div>
          )}

          {/* CORRELATION MATRIX TAB */}
          {activeTab === 'corr' && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <div>
                <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Correlation Heatmap</h2>
                <p className="text-[10px] text-slate-400 mt-0.5">Statistical relationships between numeric columns</p>
              </div>

              {loadingCorr ? (
                <div className="py-20 text-center text-slate-400 text-xs animate-pulse">Calculating correlations…</div>
              ) : corrData && corrData.columns.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse border border-slate-200">
                    <thead>
                      <tr>
                        <th className="border border-slate-200 bg-slate-50 px-3 py-2 text-left text-[10px] font-bold text-slate-500 uppercase">Variable</th>
                        {corrData.columns.map(col => (
                          <th key={col} className="border border-slate-200 bg-slate-50 px-2 py-2 text-center text-[10px] font-bold text-slate-500 uppercase max-w-[100px] truncate" title={col}>
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {corrData.columns.map((rowCol, rIdx) => (
                        <tr key={rowCol}>
                          <td className="border border-slate-200 px-3 py-2 text-[10px] font-semibold text-slate-700 bg-slate-50 max-w-[150px] truncate" title={rowCol}>
                            {rowCol}
                          </td>
                          {corrData.matrix[rIdx].map((val, cIdx) => {
                            // Calculate color based on correlation strength (-1 to 1)
                            let background = 'rgba(255,255,255,1)';
                            if (val > 0) {
                              background = `rgba(59, 130, 246, ${val * 0.85})`; // blue
                            } else if (val < 0) {
                              background = `rgba(239, 68, 68, ${Math.abs(val) * 0.85})`; // red
                            }
                            // Text color logic for high contrast
                            const textColor = Math.abs(val) > 0.45 ? 'text-white font-semibold' : 'text-slate-800';

                            return (
                              <td key={cIdx} style={{ backgroundColor: background }} className={`border border-slate-200 px-1 py-3 text-center text-[11px] ${textColor} transition-all hover:scale-105 duration-100 cursor-pointer`}
                                title={`${rowCol} vs ${corrData.columns[cIdx]}: ${val.toFixed(3)}`}>
                                {val.toFixed(2)}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-20 text-center text-slate-400 text-xs">
                  This dataset requires at least 2 numerical columns to construct a correlation heatmap.
                </div>
              )}
            </div>
          )}

          {/* REGRESSION & TREND TAB */}
          {activeTab === 'regression' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              {/* Settings Panel */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                <div>
                  <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Regression Settings</h2>
                  <p className="text-[10px] text-slate-400 mt-0.5">Fit a linear trend line between variables</p>
                </div>

                {stats && stats.numeric_cols.length >= 2 ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Independent Variable (X)</label>
                      <select value={regX} onChange={e => setRegX(e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                        {stats.numeric_cols.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Dependent Variable (Y)</label>
                      <select value={regY} onChange={e => setRegY(e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                        {stats.numeric_cols.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>

                    <button onClick={handleFitRegression} disabled={loadingReg || !regX || !regY}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors">
                      {loadingReg ? 'Fitting model…' : 'Fit Regression Model'}
                    </button>
                  </div>
                ) : (
                  <div className="text-slate-400 text-xs py-4 text-center">
                    Requires at least 2 numerical columns.
                  </div>
                )}

                {regError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-[10px] p-2.5 rounded-lg">
                    ⚠️ {regError}
                  </div>
                )}

                {/* Regression Summary Stats */}
                {regResult && (
                  <div className="pt-4 border-t border-slate-100 space-y-2">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase">Model Parameters</p>
                    <div className="text-[11px] text-slate-600 space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-150">
                      <p className="flex justify-between">
                        <span>Equation:</span>
                        <span className="font-semibold text-blue-700">y = {regResult.slope.toFixed(3)}x + {regResult.intercept.toFixed(2)}</span>
                      </p>
                      <p className="flex justify-between">
                        <span>R-squared (R²):</span>
                        <span className="font-medium text-slate-800">{regResult.r_squared.toFixed(4)}</span>
                      </p>
                      <p className="flex justify-between">
                        <span>Slope (m):</span>
                        <span className="font-medium text-slate-800">{regResult.slope.toFixed(4)}</span>
                      </p>
                      <p className="flex justify-between">
                        <span>Intercept (c):</span>
                        <span className="font-medium text-slate-800">{regResult.intercept.toFixed(2)}</span>
                      </p>
                      <p className="flex justify-between">
                        <span>Valid Data Rows:</span>
                        <span className="font-medium text-slate-800">{regResult.n_samples.toLocaleString()}</span>
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Chart Rendering Panel */}
              <div className="md:col-span-2 space-y-4">
                {regResult ? (
                  <div className="space-y-3">
                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                      <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider mb-2">
                        Linear Trend: {regY} vs {regX}
                      </h3>
                      {renderRegressionChart()}
                      <p className="text-[10px] text-slate-400 mt-2 text-center">
                        Scatter shows up to 500 random sample points. The solid line represents the fitted trend.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="h-72 border border-slate-200 border-dashed rounded-xl flex flex-col items-center justify-center text-slate-400 text-xs bg-white space-y-2 p-4">
                    <span>📈</span>
                    <span>Select variables and click "Fit Regression Model" to plot trend.</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* REPORT TAB */}
          {activeTab === 'report' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Executive Intelligence Report</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Let AI compile an analytical report of dataset statistics</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleGenerateReport} disabled={generatingReport}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50">
                    {generatingReport ? 'Generating report…' : reportText ? 'Regenerate Report' : 'Generate AI Report'}
                  </button>
                  {reportText && (
                    <button onClick={handlePrint}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5">
                      <span>🖨️</span> Save PDF / Print
                    </button>
                  )}
                </div>
              </div>

              {generatingReport && (
                <div className="py-20 flex flex-col items-center justify-center space-y-4">
                  <div className="relative w-12 h-12">
                    <div className="absolute inset-0 rounded-full border-4 border-blue-50 border-t-blue-600 animate-spin" />
                    <div className="absolute inset-2 rounded-full border-4 border-indigo-100 border-b-indigo-500 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
                  </div>
                  <p className="text-xs font-semibold text-slate-500 animate-pulse">AI Analyst is generating insights, please wait…</p>
                </div>
              )}

              {reportError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-4 rounded-xl">
                  ⚠️ {reportError}
                </div>
              )}

              {!generatingReport && !reportText && !reportError && (
                <div className="py-20 text-center space-y-4">
                  <div className="text-3xl text-slate-300">📄</div>
                  <div className="max-w-md mx-auto">
                    <p className="text-xs font-medium text-slate-600">No report generated yet</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Click the "Generate AI Report" button. DataPilot will pass the pre-calculated statistics, duplicate rates, and missing value counts to the AI Copilot to draft a comprehensive audit.
                    </p>
                  </div>
                </div>
              )}

              {reportText && (
                <div className="prose prose-sm max-w-none text-slate-700">
                  <div id="report-body" className="space-y-4 text-xs leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: parseMarkdown(reportText) }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
