from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CategoryListView,
    ProductListView, ProductDetailView, FeaturedProductsView,
    AdminProductViewSet,
)

router = DefaultRouter()
router.register(r'admin/products', AdminProductViewSet, basename='admin-products')

urlpatterns = [
    # Public
    path('',                CategoryListView.as_view(),    name='category-list'),
    path('items/',          ProductListView.as_view(),      name='product-list'),
    path('items/<slug:slug>/', ProductDetailView.as_view(), name='product-detail'),
    path('featured/',       FeaturedProductsView.as_view(), name='product-featured'),

    # Admin
    path('', include(router.urls)),
]