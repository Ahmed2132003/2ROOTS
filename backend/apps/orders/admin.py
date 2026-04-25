from django.contrib import admin
from .models import Order, OrderItem, OrderStatusHistory


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ['subtotal']


class OrderStatusHistoryInline(admin.TabularInline):
    model = OrderStatusHistory
    extra = 0
    readonly_fields = ['old_status', 'new_status', 'changed_by', 'changed_at']
    can_delete = False


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display  = ['id', 'customer', 'status', 'total', 'created_at']
    list_filter   = ['status', 'created_at']
    search_fields = ['shipping_name', 'shipping_phone', 'customer__email']
    readonly_fields = ['total', 'created_at', 'updated_at']
    inlines = [OrderItemInline, OrderStatusHistoryInline]

    # تغيير الـ status بسرعة من الـ list
    actions = ['mark_confirmed', 'mark_shipped', 'mark_delivered']

    @admin.action(description='✅ Mark as Confirmed')
    def mark_confirmed(self, request, queryset):
        queryset.update(status='confirmed')

    @admin.action(description='🚚 Mark as Shipped')
    def mark_shipped(self, request, queryset):
        queryset.update(status='shipped')

    @admin.action(description='📦 Mark as Delivered')
    def mark_delivered(self, request, queryset):
        queryset.update(status='delivered')


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display  = ['order', 'product_name', 'variant_name', 'price_at_order', 'quantity', 'subtotal']
    search_fields = ['product_name', 'order__id']


@admin.register(OrderStatusHistory)
class OrderStatusHistoryAdmin(admin.ModelAdmin):
    list_display  = ['order', 'old_status', 'new_status', 'changed_by', 'changed_at']
    list_filter   = ['new_status']
    readonly_fields = ['changed_at']