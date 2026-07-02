from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CategoryListView,
    ProductListView, ProductDetailView, FeaturedProductsView,
    ProductVariantsView,
    AdminProductViewSet,
    AdminCategoryViewSet,
)

router = DefaultRouter()
router.register(r'admin/products', AdminProductViewSet, basename='admin-products')
router.register(r'admin/categories', AdminCategoryViewSet, basename='admin-categories')

urlpatterns = [
    # Public
    path('',                CategoryListView.as_view(),    name='category-list'),
    path('items/',          ProductListView.as_view(),      name='product-list'),
    path('items/<slug:slug>/', ProductDetailView.as_view(), name='product-detail'),
    path('featured/',       FeaturedProductsView.as_view(), name='product-featured'),

    # Variants (متاح لأي يوزر مسجّل دخول، زي المسوّقين) — لازم يفضل قبل include(router.urls)
    # عشان <int:pk> ميتعارضش مع أي حاجة تانية، بس الراوتر بيستخدم prefixes نصية فمفيش تعارض حقيقي.
    path('<int:pk>/variants/', ProductVariantsView.as_view(), name='product-variants-public'),

    # Admin
    path('', include(router.urls)),
]