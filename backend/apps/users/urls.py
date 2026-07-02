from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import (
    # Auth
    RegisterView, LogoutView, ProfileView, ChangePasswordView,
    # Customers
    AdminCustomerListView, AdminCustomerDetailView,
    # Admin User Management (جديد)
    AdminUserListView, AdminUserRoleUpdateView, AdminUserCreateView,
)

urlpatterns = [
    # ── Auth ─────────────────────────────────────────────────────────────────
    path('register/',        RegisterView.as_view(),        name='auth-register'),
    path('login/',           TokenObtainPairView.as_view(), name='auth-login'),
    path('logout/',          LogoutView.as_view(),          name='auth-logout'),
    path('token/refresh/',   TokenRefreshView.as_view(),    name='auth-token-refresh'),
    path('profile/',         ProfileView.as_view(),         name='auth-profile'),
    path('change-password/', ChangePasswordView.as_view(),  name='auth-change-password'),

    # no-slash variants
    path('profile',          ProfileView.as_view(),         name='auth-profile-no-slash'),
    path('change-password',  ChangePasswordView.as_view(),  name='auth-change-password-no-slash'),

    # ── Customers (موجود من قبل) ──────────────────────────────────────────────
    path('customers/',          AdminCustomerListView.as_view(),   name='admin-customers'),
    path('customers/<int:pk>/', AdminCustomerDetailView.as_view(), name='admin-customer-detail'),

    # ── Admin User Management (جديد) ─────────────────────────────────────────
    # GET   /api/users/list/       — قائمة كل اليوزرز
    # POST  /api/users/create/     — إنشاء يوزر جديد
    # PATCH /api/users/<id>/role/  — تعديل دور يوزر
    path('list/',           AdminUserListView.as_view(),       name='admin-user-list'),
    path('create/',         AdminUserCreateView.as_view(),     name='admin-user-create'),
    path('<int:pk>/role/',  AdminUserRoleUpdateView.as_view(), name='admin-user-role-update'),
]