"""
DataPilot — Django REST Framework Views
All API endpoints for auth, file management, quick actions, and AI.
"""
import os
import numpy as np
import pandas as pd
import traceback
from django.http import HttpResponse
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from rest_framework import status, generics
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from rest_framework.views import APIView

from .models import UploadedFile, ActionLog
from .serializers import UserSerializer, RegisterSerializer, UploadedFileSerializer
from . import pandas_ops
from .ai_agent import run_agent


# ── Auth ────────────────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        token, _ = Token.objects.get_or_create(user=user)
        return Response({'token': token.key, 'user': UserSerializer(user).data}, status=201)
    return Response(serializer.errors, status=400)


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    username = request.data.get('username')
    password = request.data.get('password')
    user = authenticate(username=username, password=password)
    if user:
        token, _ = Token.objects.get_or_create(user=user)
        return Response({'token': token.key, 'user': UserSerializer(user).data})
    return Response({'error': 'Invalid credentials'}, status=400)


@api_view(['POST'])
def logout_view(request):
    request.user.auth_token.delete()
    return Response({'detail': 'Logged out'})


@api_view(['GET'])
def me(request):
    return Response(UserSerializer(request.user).data)


# ── Files ────────────────────────────────────────────────────────────────────

class FileListCreateView(APIView):
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request):
        files = UploadedFile.objects.filter(user=request.user)
        return Response(UploadedFileSerializer(files, many=True, context={'request': request}).data)

    def post(self, request):
        uploaded = request.FILES.get('file')
        if not uploaded:
            return Response({'error': 'No file provided'}, status=400)

        allowed_ext = ['.csv', '.xlsx', '.xls', '.tsv']
        ext = os.path.splitext(uploaded.name)[1].lower()
        if ext not in allowed_ext:
            return Response({'error': f'Unsupported file type. Allowed: {", ".join(allowed_ext)}'}, status=400)

        obj = UploadedFile.objects.create(
            user=request.user,
            name=uploaded.name,
            file=uploaded,
            size=uploaded.size,
            status='processing',
        )

        try:
            df = pandas_ops.load_dataframe(obj.file.path)
            obj.row_count = len(df)
            obj.column_count = len(df.columns)
            obj.columns = list(df.columns)
            obj.status = 'ready'
            obj.save()
        except Exception as e:
            obj.status = 'error'
            obj.save()
            return Response({'error': f'Could not parse file: {str(e)}'}, status=400)

        return Response(UploadedFileSerializer(obj, context={'request': request}).data, status=201)


class FileDetailView(APIView):

    def get_object(self, request, pk):
        try:
            return UploadedFile.objects.get(pk=pk, user=request.user)
        except UploadedFile.DoesNotExist:
            return None

    def get(self, request, pk):
        obj = self.get_object(request, pk)
        if not obj:
            return Response({'error': 'Not found'}, status=404)
        return Response(UploadedFileSerializer(obj, context={'request': request}).data)

    def delete(self, request, pk):
        obj = self.get_object(request, pk)
        if not obj:
            return Response({'error': 'Not found'}, status=404)
        obj.delete()
        return Response(status=204)


@api_view(['GET'])
@permission_classes([AllowAny])
def file_preview(request, pk):
    """Return paginated data preview for a file."""
    try:
        obj = UploadedFile.objects.get(pk=pk, user=request.user)
    except UploadedFile.DoesNotExist:
        return Response({'error': 'Not found'}, status=404)

    if obj.status != 'ready':
        return Response({'error': 'File is not ready for preview'}, status=400)

    try:
        df = pandas_ops.load_dataframe(obj.file.path)
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 100))
        search = request.query_params.get('search', '').strip()

        if search:
            mask = df.astype(str).apply(lambda col: col.str.contains(search, case=False, na=False)).any(axis=1)
            df = df[mask]

        total = len(df)
        start = (page - 1) * page_size
        page_df = df.iloc[start:start + page_size].fillna('')

        # Convert null_counts to int to ensure JSON serialization
        null_counts = {col: int(count) for col, count in df.isnull().sum().to_dict().items()}

        # Helper to convert numpy/pandas scalar types to native Python types
        def _to_native(v):
            try:
                if pd.isna(v):
                    return ''
            except Exception:
                pass
            if isinstance(v, (np.generic,)):
                try:
                    return v.item()
                except Exception:
                    return v
            # pandas Timestamp -> ISO string
            if isinstance(v, pd.Timestamp):
                try:
                    return v.isoformat()
                except Exception:
                    return str(v)
            return v

        rows = [[_to_native(v) for v in row] for row in page_df.values.tolist()]
        columns = [str(c) for c in df.columns]

        return Response({
            'columns': columns,
            'rows': rows,
            'total_rows': int(total),
            'page': page,
            'page_size': page_size,
            'total_pages': int(max(1, (total + page_size - 1) // page_size)),
            'duplicate_count': int(df.duplicated().sum()),
            'null_counts': null_counts,
        })
    except Exception as e:
        traceback.print_exc()
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
def file_stats(request, pk):
    """Return statistics and metadata for a file."""
    try:
        obj = UploadedFile.objects.get(pk=pk, user=request.user)
    except UploadedFile.DoesNotExist:
        return Response({'error': 'Not found'}, status=404)

    if obj.status != 'ready':
        return Response({'error': 'File is not ready'}, status=400)

    try:
        df = pandas_ops.load_dataframe(obj.file.path)
        stats = pandas_ops.get_statistics(df)
        
        # Calculate size display
        size = obj.size
        if size < 1024:
            size_display = f"{size} B"
        elif size < 1024 * 1024:
            size_display = f"{size / 1024:.1f} KB"
        else:
            size_display = f"{size / (1024 * 1024):.1f} MB"

        stats.update({
            'name': obj.name,
            'size_display': size_display,
            'row_count': obj.row_count,
            'column_count': obj.column_count,
            'null_counts': {col: int(count) for col, count in df.isnull().sum().to_dict().items()},
            'duplicate_count': int(df.duplicated().sum()),
        })
        return Response(stats)
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
def generate_report(request, pk):
    """
    Generate an AI-powered markdown data analysis report.
    """
    import json
    try:
        obj = UploadedFile.objects.get(pk=pk, user=request.user)
    except UploadedFile.DoesNotExist:
        return Response({'error': 'File not found'}, status=404)

    if obj.status != 'ready':
        return Response({'error': 'File is not ready'}, status=400)

    try:
        df = pandas_ops.load_dataframe(obj.file.path)
    except Exception as e:
        return Response({'error': f'Could not load file: {str(e)}'}, status=500)

    provider = request.data.get('provider', 'gemini')
    model = request.data.get('model')
    ai_api_key = request.headers.get('X-AI-Api-Key') or request.META.get('HTTP_X_AI_API_KEY')
    if ai_api_key in ['undefined', 'null', '']:
        ai_api_key = None

    stats = pandas_ops.get_statistics(df)
    
    summary_info = {
        'filename': obj.name,
        'rows': len(df),
        'columns_count': len(df.columns),
        'columns': list(df.columns),
        'null_counts': df.isnull().sum().to_dict(),
        'duplicate_count': int(df.duplicated().sum()),
        'numeric_stats': stats.get('numeric', {}),
        'categorical_top_values': stats.get('categorical', {})
    }

    prompt = (
        "Generate a comprehensive, professional Executive Data Analysis and Insights Report for the following dataset.\n\n"
        f"Dataset Details:\n{json.dumps(summary_info, indent=2)}\n\n"
        "Please write a highly detailed, professional report using markdown formatting. Organize it into the following sections:\n"
        "1. Executive Summary: High-level overview, overall data quality score, key takeaways.\n"
        "2. Data Quality & Cleanliness: Detail missing values, duplicates, suggestions for cleaning.\n"
        "3. Statistical Analysis & Insights: Call out key numeric findings (averages, outliers, trends) and top categories.\n"
        "4. Recommendations: Actionable next steps based on the findings.\n\n"
        "Use clean markdown, include simple bullet points or tables where appropriate, and keep it professional. Do not use code blocks around the report itself."
    )

    try:
        result = run_agent(prompt=prompt, df=df, provider=provider, model=model, api_key=ai_api_key)
        if 'error' in result:
            return Response(result, status=502)
        return Response(result)
    except Exception as e:
        return Response({'error': f'AI Report Generation failed: {str(e)}'}, status=500)


# ── Quick Actions ─────────────────────────────────────────────────────────────

@api_view(['POST'])
def quick_action(request, pk):
    """
    Perform a quick data-cleaning action and save the result back to the file.
    Body: { "action": "dedup" | "trim" | "fill" | "drop_empty" | "sort" |
                      "normalize_headers" | "export_csv" | "export_excel" }
    Optional: { "column": "col_name", "fill_value": "N/A", "ascending": true }
    """
    try:
        obj = UploadedFile.objects.get(pk=pk, user=request.user)
    except UploadedFile.DoesNotExist:
        return Response({'error': 'Not found'}, status=404)

    if obj.status != 'ready':
        return Response({'error': 'File is not ready'}, status=400)

    action = request.data.get('action')
    if not action:
        return Response({'error': 'action is required'}, status=400)

    try:
        df = pandas_ops.load_dataframe(obj.file.path)
        rows_affected = 0
        description = ''

        if action == 'dedup':
            df, rows_affected = pandas_ops.remove_duplicates(df)
            description = f'Removed {rows_affected} duplicate rows'

        elif action == 'trim':
            df = pandas_ops.trim_whitespace(df)
            description = 'Trimmed whitespace from all text cells'

        elif action == 'fill':
            fill_val = request.data.get('fill_value', 'N/A')
            df, rows_affected = pandas_ops.fill_empty_cells(df, fill_val)
            description = f'Filled {rows_affected} empty cells with "{fill_val}"'

        elif action == 'drop_empty':
            df, rows_affected = pandas_ops.drop_empty_rows(df)
            description = f'Dropped {rows_affected} empty rows'

        elif action == 'sort':
            col = request.data.get('column')
            asc = request.data.get('ascending', True)
            df = pandas_ops.sort_dataframe(df, col, asc)
            description = f'Sorted by {col or df.columns[0]}'

        elif action == 'normalize_headers':
            df = pandas_ops.normalize_headers(df)
            description = 'Normalized column headers'

        elif action == 'impute':
            col = request.data.get('column')
            strategy = request.data.get('strategy', 'mean')
            if not col:
                return Response({'error': 'column is required for imputation'}, status=400)
            df, rows_affected = pandas_ops.impute_missing_values(df, col, strategy)
            description = f'Imputed missing values in "{col}" using {strategy}'

        elif action == 'outliers':
            col = request.data.get('column')
            method = request.data.get('outlier_method', 'clip')
            if not col:
                return Response({'error': 'column is required for outlier handling'}, status=400)
            df, rows_affected = pandas_ops.detect_and_handle_outliers(df, col, method)
            description = f'Handled {rows_affected} outliers in "{col}" using method: {method}'

        elif action == 'one_hot':
            col = request.data.get('column')
            if not col:
                return Response({'error': 'column is required for one-hot encoding'}, status=400)
            df, rows_affected = pandas_ops.one_hot_encode(df, col)
            description = f'One-hot encoded column "{col}" (created {rows_affected} new binary columns)'

        elif action == 'scale':
            col = request.data.get('column')
            method = request.data.get('scaling_method', 'minmax')
            if not col:
                return Response({'error': 'column is required for feature scaling'}, status=400)
            df, rows_affected = pandas_ops.scale_features(df, col, method)
            description = f'Scaled column "{col}" using {method} scaling'

        elif action == 'export_csv':
            csv_data = pandas_ops.export_to_csv(df)
            response = HttpResponse(csv_data, content_type='text/csv')
            response['Content-Disposition'] = f'attachment; filename="{obj.name}_export.csv"'
            return response

        elif action == 'export_excel':
            excel_data = pandas_ops.export_to_excel_with_charts(df)
            response = HttpResponse(excel_data, content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
            response['Content-Disposition'] = f'attachment; filename="{obj.name}_export.xlsx"'
            return response

        else:
            return Response({'error': f'Unknown action: {action}'}, status=400)

        # Save back to disk
        pandas_ops.save_dataframe(df, obj.file.path)
        obj.row_count = len(df)
        obj.column_count = len(df.columns)
        obj.columns = list(df.columns)
        obj.save()

        # Log the action
        ActionLog.objects.create(
            file=obj,
            user=request.user,
            action=action,
            description=description,
            rows_affected=rows_affected,
        )

        preview = pandas_ops.get_preview(df, n=100)
        return Response({
            'success': True,
            'description': description,
            'rows_affected': rows_affected,
            'preview': preview,
        })

    except Exception as e:
        return Response({'error': str(e)}, status=500)


# ── AI Copilot ────────────────────────────────────────────────────────────────

@api_view(['POST'])
def ai_query(request, pk):
    """
    Natural-language query against the dataset.
    Body: { "prompt": "...", "provider": "anthropic"|"openai", "model": "..." }
    Header: X-AI-Api-Key: <user's own key>
    """
    try:
        obj = UploadedFile.objects.get(pk=pk, user=request.user)
    except UploadedFile.DoesNotExist:
        return Response({'error': 'File not found'}, status=404)

    if obj.status != 'ready':
        return Response({'error': 'File is not ready'}, status=400)

    prompt = request.data.get('prompt', '').strip()
    if not prompt:
        return Response({'error': 'prompt is required'}, status=400)

    provider = request.data.get('provider', 'anthropic')
    model = request.data.get('model')
    
    ai_api_key = request.headers.get('X-AI-Api-Key') or request.META.get('HTTP_X_AI_API_KEY')
    if ai_api_key in ['undefined', 'null', '']:
        ai_api_key = None

    try:
        df = pandas_ops.load_dataframe(obj.file.path)
    except Exception as e:
        return Response({'error': f'Could not load file: {str(e)}'}, status=500)

    result = run_agent(prompt=prompt, df=df, provider=provider, model=model, api_key=ai_api_key)

    if 'error' in result:
        return Response(result, status=502)

    return Response(result)


@api_view(['GET'])
def correlation_matrix(request, pk):
    """Return correlation matrix of numerical columns."""
    try:
        obj = UploadedFile.objects.get(pk=pk, user=request.user)
    except UploadedFile.DoesNotExist:
        return Response({'error': 'Not found'}, status=404)

    if obj.status != 'ready':
        return Response({'error': 'File is not ready'}, status=400)

    try:
        df = pandas_ops.load_dataframe(obj.file.path)
        data = pandas_ops.get_correlation_matrix(df)
        return Response(data)
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
def regression_analysis(request, pk):
    """Fit a linear regression and return scatter points and line."""
    try:
        obj = UploadedFile.objects.get(pk=pk, user=request.user)
    except UploadedFile.DoesNotExist:
        return Response({'error': 'Not found'}, status=404)

    if obj.status != 'ready':
        return Response({'error': 'File is not ready'}, status=400)

    x_col = request.data.get('x_column')
    y_col = request.data.get('y_column')

    if not x_col or not y_col:
        return Response({'error': 'Both x_column and y_column parameters are required'}, status=400)

    try:
        df = pandas_ops.load_dataframe(obj.file.path)
        data = pandas_ops.perform_linear_regression(df, x_col, y_col)
        if 'error' in data:
            return Response(data, status=400)
        return Response(data)
    except Exception as e:
        return Response({'error': str(e)}, status=500)
