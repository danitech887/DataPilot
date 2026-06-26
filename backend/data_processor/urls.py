from django.urls import path
from . import views

urlpatterns = [
    # Auth
    path('auth/register/', views.register),
    path('auth/login/', views.login_view),
    path('auth/logout/', views.logout_view),
    path('auth/me/', views.me),

    # Files
    path('files/', views.FileListCreateView.as_view()),
    path('files/<int:pk>/', views.FileDetailView.as_view()),
    path('files/<int:pk>/preview/', views.file_preview),
    path('files/<int:pk>/stats/', views.file_stats),
    path('files/<int:pk>/report/', views.generate_report),

    # Quick Actions
    path('files/<int:pk>/action/', views.quick_action),

    # AI Copilot
    path('files/<int:pk>/ai/', views.ai_query),

    # Data Science Analytics
    path('files/<int:pk>/correlation/', views.correlation_matrix),
    path('files/<int:pk>/regression/', views.regression_analysis),
]
