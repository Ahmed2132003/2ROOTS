from rest_framework import generics, status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Order, OrderStatusHistory
from .serializers import (
    OrderSerializer,
    OrderListSerializer,
    CreateOrderSerializer,
    UpdateOrderStatusSerializer,
)


class IsAdminOrStaff(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['admin', 'staff']


# ─── Customer Views ────────────────────────────────────────────────────────────

class CreateOrderView(APIView):
    """POST — إنشاء أوردر جديدة من الـ Cart"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = CreateOrderSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        order = serializer.save()
        return Response(
            OrderSerializer(order).data,
            status=status.HTTP_201_CREATED
        )


class MyOrdersView(generics.ListAPIView):
    """GET — قائمة أوردرات العميل"""
    serializer_class   = OrderListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(
            customer=self.request.user
        ).prefetch_related('items')


class OrderDetailView(generics.RetrieveAPIView):
    """GET — تفاصيل أوردر واحدة للعميل"""
    serializer_class   = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # العميل يشوف أوردراته بس
        return Order.objects.filter(
            customer=self.request.user
        ).prefetch_related('items', 'status_history')


class TrackOrderView(APIView):
    """GET — تتبع أوردر بالـ ID بدون login (للـ Guest)"""
    permission_classes = [permissions.AllowAny]

    def get(self, request, order_id):
        try:
            order = Order.objects.prefetch_related(
                'items', 'status_history'
            ).get(id=order_id)
        except Order.DoesNotExist:
            return Response(
                {"detail": "Order not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        return Response({
            "id":      order.id,
            "status":  order.status,
            "total":   order.total,
            "history": [
                {
                    "status":     h.new_status,
                    "note":       h.note,
                    "changed_at": h.changed_at,
                }
                for h in order.status_history.all()
            ],
        })


class CancelOrderView(APIView):
    """POST — العميل يلغي أوردر pending"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            order = Order.objects.get(pk=pk, customer=request.user)
        except Order.DoesNotExist:
            return Response({"detail": "Order not found."}, status=status.HTTP_404_NOT_FOUND)

        if order.status != 'pending':
            return Response(
                {"detail": f"Cannot cancel order with status '{order.status}'."},
                status=status.HTTP_400_BAD_REQUEST
            )

        order.status = 'cancelled'
        order.save()

        # رجّع الكمية للـ Stock
        for item in order.items.all():
            if item.variant:
                stock = item.variant.stock
                stock.quantity += item.quantity
                stock.save()

        return Response({"detail": "Order cancelled successfully."})


# ─── Admin Views ───────────────────────────────────────────────────────────────

class AdminOrderListView(generics.ListAPIView):
    """GET — كل الأوردرات للـ Dashboard"""
    serializer_class   = OrderListSerializer
    permission_classes = [IsAdminOrStaff]

    def get_queryset(self):
        qs = Order.objects.all().select_related('customer')

        # Filter بالـ status لو موجود في الـ query params
        order_status = self.request.query_params.get('status')
        if order_status:
            qs = qs.filter(status=order_status)

        return qs


class AdminOrderDetailView(generics.RetrieveAPIView):
    """GET — تفاصيل أوردر كاملة للـ Admin"""
    serializer_class   = OrderSerializer
    permission_classes = [IsAdminOrStaff]
    queryset           = Order.objects.prefetch_related('items', 'status_history', 'customer')


class AdminUpdateOrderStatusView(APIView):
    """PATCH — تغيير status الأوردر من الـ Dashboard"""
    permission_classes = [IsAdminOrStaff]

    def patch(self, request, pk):
        try:
            order = Order.objects.get(pk=pk)
        except Order.DoesNotExist:
            return Response({"detail": "Order not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = UpdateOrderStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        old_status = order.status
        new_status = serializer.validated_data['status']
        note       = serializer.validated_data.get('note', '')

        # منع الـ rollback — الأوردر ميرجعش لـ status قديم
        STATUS_FLOW = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']
        if STATUS_FLOW.index(new_status) < STATUS_FLOW.index(old_status):
            return Response(
                {"detail": f"Cannot move order from '{old_status}' back to '{new_status}'."},
                status=status.HTTP_400_BAD_REQUEST
            )

        order.status = new_status
        order.save()

        # سجّل في الـ History مع الـ Admin اللي غيّره
        OrderStatusHistory.objects.create(
            order=order,
            old_status=old_status,
            new_status=new_status,
            changed_by=request.user,
            note=note,
        )

        return Response(OrderSerializer(order).data)