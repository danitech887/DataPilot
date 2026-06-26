"""
DataPilot — Pandas Data Operations Engine
All heavy data transformations live here, isolated from views.
"""
import pandas as pd
import io
import os


def load_dataframe(file_path: str) -> pd.DataFrame:
    """Load a CSV or Excel file into a DataFrame."""
    ext = os.path.splitext(file_path)[1].lower()
    if ext in ['.xlsx', '.xls']:
        try:
            return pd.read_excel(file_path, engine='openpyxl')
        except Exception:
            try:
                return pd.read_excel(file_path, engine='xlrd')
            except Exception:
                # Last resort: Handle CSV files disguised with an .xls extension
                try:
                    return pd.read_csv(file_path)
                except Exception:
                    return pd.read_csv(file_path, on_bad_lines='skip')
    elif ext == '.tsv':
        try:
            return pd.read_csv(file_path, sep='\t')
        except Exception:
            return pd.read_csv(file_path, sep='\t', on_bad_lines='skip')
    else:
        try:
            return pd.read_csv(file_path)
        except Exception:
            return pd.read_csv(file_path, on_bad_lines='skip')


def save_dataframe(df: pd.DataFrame, file_path: str) -> None:
    """Save DataFrame back to disk, preserving original format."""
    ext = os.path.splitext(file_path)[1].lower()
    if ext in ['.xlsx', '.xls']:
        df.to_excel(file_path, index=False, engine='openpyxl')
    else:
        df.to_csv(file_path, index=False)


def get_preview(df: pd.DataFrame, n: int = 100) -> dict:
    """Return JSON-serialisable preview of the dataframe."""
    preview_df = df.head(n).fillna('')
    return {
        'columns': list(df.columns),
        'rows': preview_df.values.tolist(),
        'total_rows': len(df),
        'total_cols': len(df.columns),
        'dtypes': {col: str(dtype) for col, dtype in df.dtypes.items()},
        'null_counts': df.isnull().sum().to_dict(),
        'duplicate_count': int(df.duplicated().sum()),
    }


def remove_duplicates(df: pd.DataFrame) -> tuple[pd.DataFrame, int]:
    before = len(df)
    df = df.drop_duplicates()
    return df, before - len(df)


def trim_whitespace(df: pd.DataFrame) -> pd.DataFrame:
    str_cols = df.select_dtypes(include='object').columns
    df[str_cols] = df[str_cols].apply(lambda col: col.str.strip())
    return df


def fill_empty_cells(df: pd.DataFrame, fill_value: str = 'N/A') -> tuple[pd.DataFrame, int]:
    count = int(df.isnull().sum().sum())
    df = df.fillna(fill_value)
    return df, count


def drop_empty_rows(df: pd.DataFrame) -> tuple[pd.DataFrame, int]:
    before = len(df)
    df = df.dropna(how='all')
    df = df[~(df.astype(str).apply(lambda r: r.str.strip()).eq('').all(axis=1))]
    return df, before - len(df)


def sort_dataframe(df: pd.DataFrame, column: str = None, ascending: bool = True) -> pd.DataFrame:
    col = column if column and column in df.columns else df.columns[0]
    return df.sort_values(by=col, ascending=ascending)


def normalize_headers(df: pd.DataFrame) -> pd.DataFrame:
    df.columns = [
        c.strip().lower().replace(' ', '_').replace('-', '_')
        for c in df.columns
    ]
    return df


def standardize_column_case(df: pd.DataFrame, column: str, case: str = 'title') -> pd.DataFrame:
    if column not in df.columns:
        return df
    if case == 'upper':
        df[column] = df[column].astype(str).str.upper()
    elif case == 'lower':
        df[column] = df[column].astype(str).str.lower()
    else:
        df[column] = df[column].astype(str).str.title()
    return df


def get_statistics(df: pd.DataFrame) -> dict:
    import numpy as np
    numeric = df.select_dtypes(include='number')
    cat = df.select_dtypes(include=['object', 'category'])
    
    stats = {
        'numeric_cols': list(numeric.columns),
        'categorical_cols': list(cat.columns),
        'numeric': {},
        'categorical': {},
        'distributions': {}
    }
    
    if not numeric.empty:
        stats['numeric'] = numeric.describe().to_dict()
        
        # Calculate 10-bin histograms for numeric columns
        for col in numeric.columns:
            try:
                values = df[col].dropna()
                if not values.empty:
                    counts, bin_edges = np.histogram(values, bins=min(10, len(values.unique())))
                    bin_labels = []
                    for i in range(len(counts)):
                        bin_labels.append(f"{bin_edges[i]:.2f} - {bin_edges[i+1]:.2f}")
                    stats['distributions'][col] = {
                        'labels': bin_labels,
                        'counts': [int(c) for c in counts]
                    }
            except Exception:
                pass
                
    for col in cat.columns:
        try:
            vc = df[col].value_counts().head(10).to_dict()
            stats['categorical'][col] = {str(k): int(v) for k, v in vc.items()}
        except Exception:
            pass
            
    return stats


def export_to_csv(df: pd.DataFrame) -> str:
    """Return CSV string."""
    return df.to_csv(index=False)


def export_to_excel(df: pd.DataFrame) -> bytes:
    """Return Excel bytes."""
    buf = io.BytesIO()
    with pd.ExcelWriter(buf, engine='openpyxl') as writer:
        df.to_excel(writer, index=False)
    return buf.getvalue()


def export_to_excel_with_charts(df: pd.DataFrame) -> bytes:
    """Return Excel bytes with an added Dashboard sheet containing charts."""
    import io
    import openpyxl
    from openpyxl.chart import BarChart, LineChart, Reference
    from openpyxl.utils.dataframe import dataframe_to_rows
    from openpyxl.styles import Font
    import numpy as np

    wb = openpyxl.Workbook()
    
    # 1. Raw Data Sheet
    ws_data = wb.active
    ws_data.title = "Data"
    
    for r in dataframe_to_rows(df, index=False, header=True):
        ws_data.append(r)
        
    # Auto-fit column widths in Data sheet
    for col in ws_data.columns:
        max_len = 0
        for cell in col:
            val_str = str(cell.value or '')
            if len(val_str) > max_len:
                max_len = len(val_str)
        col_letter = openpyxl.utils.get_column_letter(col[0].column)
        ws_data.column_dimensions[col_letter].width = max(max_len + 3, 10)

    # 2. Dashboard Sheet
    ws_dash = wb.create_sheet(title="Dashboard")
    ws_dash.views.sheetView[0].showGridLines = True
    
    # Titles
    ws_dash['A1'] = "DataPilot Analytics Dashboard"
    ws_dash['A1'].font = Font(name="Calibri", size=16, bold=True, color="1F3A8A")
    
    ws_dash['A2'] = f"Generated: {pd.Timestamp.now().strftime('%Y-%m-%d %H:%M:%S')}"
    ws_dash['A2'].font = Font(name="Calibri", size=10, italic=True, color="64748B")
    
    curr_row = 4
    
    # Limit columns to top 3 each
    cat_cols = df.select_dtypes(include=['object', 'category']).columns[:3]
    num_cols = df.select_dtypes(include='number').columns[:3]
    
    # Write Categorical Columns value counts
    for col in cat_cols:
        try:
            vc = df[col].value_counts().head(10)
            if vc.empty:
                continue
                
            ws_dash.cell(row=curr_row, column=1, value=f"Distribution: {col}").font = Font(name="Calibri", size=11, bold=True, color="0F172A")
            ws_dash.cell(row=curr_row+1, column=1, value="Category").font = Font(name="Calibri", size=10, bold=True)
            ws_dash.cell(row=curr_row+1, column=2, value="Count").font = Font(name="Calibri", size=10, bold=True)
            
            start_row = curr_row + 2
            for cat_name, count in vc.items():
                curr_row += 1
                ws_dash.cell(row=curr_row+1, column=1, value=str(cat_name))
                ws_dash.cell(row=curr_row+1, column=2, value=int(count))
            end_row = curr_row + 1
            
            # Create Excel Bar Chart
            chart = BarChart()
            chart.type = "col"
            chart.style = 10
            chart.title = f"Top Categories in {col}"
            chart.y_axis.title = "Count"
            chart.x_axis.title = col
            
            data = Reference(ws_dash, min_col=2, min_row=start_row-1, max_row=end_row)
            cats = Reference(ws_dash, min_col=1, min_row=start_row, max_row=end_row)
            chart.add_data(data, titles_from_data=True)
            chart.set_categories(cats)
            chart.legend = None
            chart.width = 16
            chart.height = 10
            
            ws_dash.add_chart(chart, f"D{start_row-1}")
            curr_row += 16
        except Exception:
            pass
        
    # Write Numeric Columns histograms
    for col in num_cols:
        try:
            values = df[col].dropna()
            if values.empty:
                continue
                
            counts, bin_edges = np.histogram(values, bins=min(10, len(values.unique())))
            
            ws_dash.cell(row=curr_row, column=1, value=f"Distribution: {col}").font = Font(name="Calibri", size=11, bold=True, color="0F172A")
            ws_dash.cell(row=curr_row+1, column=1, value="Interval Range").font = Font(name="Calibri", size=10, bold=True)
            ws_dash.cell(row=curr_row+1, column=2, value="Frequency").font = Font(name="Calibri", size=10, bold=True)
            
            start_row = curr_row + 2
            for i in range(len(counts)):
                curr_row += 1
                bin_label = f"{bin_edges[i]:.2f} - {bin_edges[i+1]:.2f}"
                ws_dash.cell(row=curr_row+1, column=1, value=bin_label)
                ws_dash.cell(row=curr_row+1, column=2, value=int(counts[i]))
            end_row = curr_row + 1
            
            # Create Excel Line Chart
            chart = LineChart()
            chart.style = 13
            chart.title = f"Value Distribution of {col}"
            chart.y_axis.title = "Frequency"
            chart.x_axis.title = col
            
            data = Reference(ws_dash, min_col=2, min_row=start_row-1, max_row=end_row)
            cats = Reference(ws_dash, min_col=1, min_row=start_row, max_row=end_row)
            chart.add_data(data, titles_from_data=True)
            chart.set_categories(cats)
            chart.legend = None
            chart.width = 16
            chart.height = 10
            
            ws_dash.add_chart(chart, f"D{start_row-1}")
            curr_row += 16
        except Exception:
            pass

    # Formatting Dashboard columns
    ws_dash.column_dimensions['A'].width = 30
    ws_dash.column_dimensions['B'].width = 15
    
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def impute_missing_values(df: pd.DataFrame, column: str, strategy: str = 'mean') -> tuple[pd.DataFrame, int]:
    if column not in df.columns:
        return df, 0
    null_count = int(df[column].isnull().sum())
    if null_count == 0:
        return df, 0
        
    if strategy == 'median':
        fill_val = df[column].median()
    elif strategy == 'mode':
        fill_val = df[column].mode()[0] if not df[column].mode().empty else 'N/A'
    else: # mean
        fill_val = df[column].mean()
        
    df[column] = df[column].fillna(fill_val)
    return df, null_count


def detect_and_handle_outliers(df: pd.DataFrame, column: str, method: str = 'clip') -> tuple[pd.DataFrame, int]:
    if column not in df.columns or not pd.api.types.is_numeric_dtype(df[column]):
        return df, 0
        
    col_data = df[column].dropna()
    if col_data.empty:
        return df, 0
        
    q1 = col_data.quantile(0.25)
    q3 = col_data.quantile(0.75)
    iqr = q3 - q1
    lower_bound = q1 - 1.5 * iqr
    upper_bound = q3 + 1.5 * iqr
    
    outliers_mask = (df[column] < lower_bound) | (df[column] > upper_bound)
    outlier_count = int(outliers_mask.sum())
    if outlier_count == 0:
        return df, 0
        
    if method == 'drop':
        df = df[~outliers_mask]
    else: # clip
        df[column] = df[column].clip(lower=lower_bound, upper=upper_bound)
        
    return df, outlier_count


def one_hot_encode(df: pd.DataFrame, column: str) -> tuple[pd.DataFrame, int]:
    if column not in df.columns:
        return df, 0
        
    before_cols = len(df.columns)
    df = pd.get_dummies(df, columns=[column], prefix=column, drop_first=False)
    
    # Convert new dummy columns to standard float/int instead of boolean
    new_cols = [c for c in df.columns if c.startswith(f"{column}_")]
    for c in new_cols:
        df[c] = df[c].astype(int)
        
    added_cols = len(df.columns) - before_cols
    return df, added_cols


def scale_features(df: pd.DataFrame, column: str, method: str = 'minmax') -> tuple[pd.DataFrame, int]:
    if column not in df.columns or not pd.api.types.is_numeric_dtype(df[column]):
        return df, 0
        
    col_min = df[column].min()
    col_max = df[column].max()
    col_mean = df[column].mean()
    col_std = df[column].std()
    
    if method == 'standard': # Z-score scaling
        if col_std == 0:
            df[column] = 0.0
        else:
            df[column] = (df[column] - col_mean) / col_std
    else: # minmax scaling
        if col_max == col_min:
            df[column] = 0.0
        else:
            df[column] = (df[column] - col_min) / (col_max - col_min)
            
    return df, len(df)


def get_correlation_matrix(df: pd.DataFrame) -> dict:
    numeric = df.select_dtypes(include='number')
    if numeric.empty or len(numeric.columns) < 2:
        return {'columns': [], 'matrix': []}
        
    numeric_filled = numeric.fillna(numeric.mean())
    corr = numeric_filled.corr().fillna(0).to_dict()
    cols = list(corr.keys())
    
    matrix = []
    for c1 in cols:
        row = []
        for c2 in cols:
            row.append(float(corr[c1][c2]))
        matrix.append(row)
        
    return {
        'columns': cols,
        'matrix': matrix
    }


def perform_linear_regression(df: pd.DataFrame, x_col: str, y_col: str) -> dict:
    if x_col not in df.columns or y_col not in df.columns:
        return {'error': 'Columns not found in dataset'}
        
    data = df[[x_col, y_col]].dropna()
    if len(data) < 3:
        return {'error': 'Insufficient data points (need at least 3 rows) for regression'}
        
    import numpy as np
    x = data[x_col].values
    y = data[y_col].values
    
    try:
        x_mean = np.mean(x)
        y_mean = np.mean(y)
        
        num = np.sum((x - x_mean) * (y - y_mean))
        den = np.sum((x - x_mean) ** 2)
        
        if den == 0:
            return {'error': 'Variance of X is zero. Cannot perform linear regression.'}
            
        slope = float(num / den)
        intercept = float(y_mean - slope * x_mean)
        
        y_pred = slope * x + intercept
        ss_res = np.sum((y - y_pred) ** 2)
        ss_tot = np.sum((y - y_mean) ** 2)
        r_sq = float(1 - (ss_res / ss_tot)) if ss_tot != 0 else 1.0
        
        sample_size = min(500, len(x))
        if len(x) > 500:
            indices = np.random.choice(len(x), 500, replace=False)
            x_scatter = x[indices]
            y_scatter = y[indices]
        else:
            x_scatter = x
            y_scatter = y
            
        scatter_points = [{'x': float(xv), 'y': float(yv)} for xv, yv in zip(x_scatter, y_scatter)]
        
        x_min, x_max = float(np.min(x)), float(np.max(x))
        y_min_line = slope * x_min + intercept
        y_max_line = slope * x_max + intercept
        
        trendline = [
            {'x': x_min, 'y': y_min_line},
            {'x': x_max, 'y': y_max_line}
        ]
        
        return {
            'slope': slope,
            'intercept': intercept,
            'r_squared': r_sq,
            'scatter': scatter_points,
            'trendline': trendline,
            'n_samples': len(x)
        }
    except Exception as e:
        return {'error': f'Regression computation error: {str(e)}'}
