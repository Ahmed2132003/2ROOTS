from django.urls import path
from .views import CartView, AddToCartView, CartItemView, ClearCartView, CartSummaryView

urlpatterns = [
    path('',              CartView.as_view(),      name='cart'),
    path('add/',          AddToCartView.as_view(),  name='cart-add'),
    path('clear/',        ClearCartView.as_view(),  name='cart-clear'),
    path('summary/',      CartSummaryView.as_view(), name='cart-summary'),
    path('item/<int:item_id>/', CartItemView.as_view(), name='cart-item'),
]