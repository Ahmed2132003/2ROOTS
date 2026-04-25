from django.contrib import admin
from .models import Cart, CartItem


class CartItemInline(admin.TabularInline):
    model = CartItem
    extra = 0
    readonly_fields = ['subtotal', 'is_available', 'added_at']


@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display  = ['__str__', 'total_items', 'total_price', 'updated_at']
    search_fields = ['user__email', 'session_key']
    readonly_fields = ['total_items', 'total_price', 'created_at', 'updated_at']
    inlines = [CartItemInline]


@admin.register(CartItem)
class CartItemAdmin(admin.ModelAdmin):
    list_display  = ['cart', 'variant', 'quantity', 'subtotal', 'is_available', 'added_at']
    search_fields = ['variant__product__name', 'cart__user__email']
    readonly_fields = ['subtotal', 'is_available']