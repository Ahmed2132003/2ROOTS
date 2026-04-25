from django.contrib import admin
from django.utils import timezone
from .models import Invoice, InvoiceItem


class InvoiceItemInline(admin.TabularInline):
    model = InvoiceItem
    extra = 0
    readonly_fields = ['subtotal']


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display  = ['invoice_number', 'customer_name', 'status', 'total', 'created_at']
    list_filter   = ['status', 'created_at']
    search_fields = ['invoice_number', 'customer_name', 'customer_phone']
    readonly_fields = ['invoice_number', 'subtotal', 'total', 'created_at', 'updated_at']
    inlines = [InvoiceItemInline]

    actions = ['mark_issued', 'mark_paid', 'mark_void']

    @admin.action(description='📋 Mark as Issued')
    def mark_issued(self, request, queryset):
        queryset.update(status='issued', issued_at=timezone.now())

    @admin.action(description='💰 Mark as Paid')
    def mark_paid(self, request, queryset):
        queryset.update(status='paid')

    @admin.action(description='❌ Mark as Void')
    def mark_void(self, request, queryset):
        queryset.update(status='void')


@admin.register(InvoiceItem)
class InvoiceItemAdmin(admin.ModelAdmin):
    list_display = ['invoice', 'product_name', 'variant_name', 'unit_price', 'quantity', 'subtotal']