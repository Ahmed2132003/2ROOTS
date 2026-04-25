from django.urls import path
from .views import (
    CreateOrderView,
    MyOrdersView, OrderDetailView,
    TrackOrderView, CancelOrderView,
    AdminOrderListView, AdminOrderDetailView,
    AdminUpdateOrderStatusView,
)

urlpatterns = [
    # Customer
    path('',                    CreateOrderView.as_view(),   name='order-create'),
    path('my/',                 MyOrdersView.as_view(),       name='order-my-list'),
    path('my/<int:pk>/',        OrderDetailView.as_view(),    name='order-detail'),
    path('my/<int:pk>/cancel/', CancelOrderView.as_view(),    name='order-cancel'),
    path('track/<int:order_id>/', TrackOrderView.as_view(),   name='order-track'),

    # Admin
    path('admin/',              AdminOrderListView.as_view(),       name='admin-order-list'),
    path('admin/<int:pk>/',     AdminOrderDetailView.as_view(),     name='admin-order-detail'),
    path('admin/<int:pk>/status/', AdminUpdateOrderStatusView.as_view(), name='admin-order-status'),
]