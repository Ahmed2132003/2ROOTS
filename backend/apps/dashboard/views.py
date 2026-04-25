from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from apps.orders.models import Order
from apps.products.models import Product, Stock

User = get_user_model()


class IsAdminOrStaff(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['admin', 'staff']


class DashboardStatsView(APIView):
    """GET — إحصائيات عامة للـ Dashboard"""
    permission_classes = [IsAdminOrStaff]

    def get(self, request):
        now        = timezone.now()
        this_month = now.replace(day=1, hour=0, minute=0, second=0)
        last_month = (this_month - timedelta(days=1)).replace(day=1)

        # ─── Orders ───────────────────────────────────
        all_orders        = Order.objects.all()
        orders_this_month = all_orders.filter(created_at__gte=this_month)
        orders_last_month = all_orders.filter(
            created_at__gte=last_month,
            created_at__lt=this_month
        )

        # ─── Revenue ──────────────────────────────────
        revenue_this_month = sum(o.total for o in orders_this_month)
        revenue_last_month = sum(o.total for o in orders_last_month)

        # ─── Customers ────────────────────────────────
        total_customers     = User.objects.filter(role='customer').count()
        new_customers_month = User.objects.filter(
            role='customer',
            created_at__gte=this_month
        ).count()

        # ─── Products ─────────────────────────────────
        total_products   = Product.objects.filter(is_active=True).count()
        low_stock_count  = Stock.objects.filter(
            quantity__lte=5,
            quantity__gt=0
        ).count()
        out_of_stock     = Stock.objects.filter(quantity=0).count()

        # ─── Orders by Status ─────────────────────────
        status_breakdown = {
            s: all_orders.filter(status=s).count()
            for s, _ in Order.STATUS_CHOICES
        }

        # ─── Recent Orders ────────────────────────────
        from apps.orders.serializers import OrderListSerializer
        recent_orders = Order.objects.select_related('customer').order_by('-created_at')[:5]

        return Response({
            "orders": {
                "total":       all_orders.count(),
                "this_month":  orders_this_month.count(),
                "last_month":  orders_last_month.count(),
                "by_status":   status_breakdown,
            },
            "revenue": {
                "this_month":  float(revenue_this_month),
                "last_month":  float(revenue_last_month),
                "growth":      self._growth(revenue_this_month, revenue_last_month),
            },
            "customers": {
                "total":       total_customers,
                "new_this_month": new_customers_month,
            },
            "products": {
                "total":       total_products,
                "low_stock":   low_stock_count,
                "out_of_stock": out_of_stock,
            },
            "recent_orders": OrderListSerializer(recent_orders, many=True).data,
        })

    def _growth(self, current, previous):
        """حساب نسبة النمو بالـ %"""
        if not previous:
            return 100 if current else 0
        return round(((current - previous) / previous) * 100, 2)


class DashboardSalesChartView(APIView):
    """GET — بيانات المبيعات لآخر 30 يوم للـ Chart"""
    permission_classes = [IsAdminOrStaff]

    def get(self, request):
        from django.db.models import Sum, Count
        from django.db.models.functions import TruncDate

        days = int(request.query_params.get('days', 30))
        since = timezone.now() - timedelta(days=days)

        sales = (
            Order.objects
            .filter(created_at__gte=since)
            .exclude(status='cancelled')
            .annotate(date=TruncDate('created_at'))
            .values('date')
            .annotate(
                revenue=Sum('total'),
                orders=Count('id')
            )
            .order_by('date')
        )

        return Response({
            "days":  days,
            "data": [
                {
                    "date":    entry['date'],
                    "revenue": float(entry['revenue'] or 0),
                    "orders":  entry['orders'],
                }
                for entry in sales
            ]
        })


class DashboardTopProductsView(APIView):
    """GET — أكتر المنتجات مبيعاً"""
    permission_classes = [IsAdminOrStaff]

    def get(self, request):
        from django.db.models import Sum
        from apps.orders.models import OrderItem

        limit = int(request.query_params.get('limit', 10))

        top = (
            OrderItem.objects
            .exclude(order__status='cancelled')
            .values('product_name', 'variant_name')
            .annotate(total_sold=Sum('quantity'))
            .order_by('-total_sold')[:limit]
        )

        return Response({"top_products": list(top)})