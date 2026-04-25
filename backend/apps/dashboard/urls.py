from django.urls import path
from .views import (
    DashboardStatsView,
    DashboardSalesChartView,
    DashboardTopProductsView,
)

urlpatterns = [
    path('stats/',        DashboardStatsView.as_view(),       name='dashboard-stats'),
    path('sales-chart/',  DashboardSalesChartView.as_view(),  name='dashboard-sales-chart'),
    path('top-products/', DashboardTopProductsView.as_view(), name='dashboard-top-products'),
]