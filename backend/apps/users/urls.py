from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import (
    RegisterView, LogoutView, ProfileView, ChangePasswordView,
    AdminCustomerListView, AdminCustomerDetailView,   
)

urlpatterns = [
    path('register/',        RegisterView.as_view(),       name='auth-register'),
    path('login/',           TokenObtainPairView.as_view(), name='auth-login'),
    path('logout/',          LogoutView.as_view(),          name='auth-logout'),
    path('token/refresh/',   TokenRefreshView.as_view(),    name='auth-token-refresh'),
    path('profile/',         ProfileView.as_view(),         name='auth-profile'),
    path('change-password/', ChangePasswordView.as_view(),  name='auth-change-password'),
    path('customers/',       AdminCustomerListView.as_view(),   name='admin-customers'),
    path('customers/<int:pk>/', AdminCustomerDetailView.as_view(), name='admin-customer-detail'),
]