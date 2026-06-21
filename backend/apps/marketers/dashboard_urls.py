from django.urls import path

from .views import (
    AdminMarketerOrderListView,
    AdminMarketerOrderConfirmView,
    AdminMarketerOrderRejectView,
)

app_name = 'marketers_dashboard'

urlpatterns = [
    path('marketer-orders/', AdminMarketerOrderListView.as_view(), name='order-list'),
    path('marketer-orders/<int:pk>/confirm/', AdminMarketerOrderConfirmView.as_view(), name='order-confirm'),
    path('marketer-orders/<int:pk>/reject/', AdminMarketerOrderRejectView.as_view(), name='order-reject'),
]