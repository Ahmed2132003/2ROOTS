from rest_framework import generics, status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
import logging

from .models import Order, OrderStatusHistory, ShippingRegion
from .serializers import (
    OrderSerializer,
    OrderListSerializer,
    CreateOrderSerializer,
    UpdateOrderStatusSerializer,
    AdminOrderWriteSerializer,
)
from .services.email_service import OrderEmailService

logger = logging.getLogger(__name__)


class IsAdminOrStaff(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['admin', 'staff']


class CreateOrderView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = CreateOrderSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        order = serializer.save()

        # Email is non-critical — never let it block the order response
        try:
            OrderEmailService.send_order_confirmation(order)
        except Exception as exc:
            logger.exception("Failed to send order confirmation email for order_id=%s: %s", order.id, exc)

        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)


class MyOrdersView(generics.ListAPIView):
    serializer_class = OrderListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(customer=self.request.user).prefetch_related('items')


class OrderDetailView(generics.RetrieveAPIView):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(customer=self.request.user).prefetch_related('items', 'status_history')


class CancelOrderView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            order = Order.objects.get(pk=pk, customer=request.user)
        except Order.DoesNotExist:
            return Response({"detail": "Order not found."}, status=status.HTTP_404_NOT_FOUND)

        if order.status != 'pending':
            return Response(
                {"detail": f"Cannot cancel order with status '{order.status}'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        order.status = 'cancelled'
        order.save()
        for item in order.items.all():
            if item.variant:
                stock = item.variant.stock
                stock.quantity += item.quantity
                stock.save()

        try:
            OrderEmailService.send_order_status_update(order, note='Your order was cancelled as requested.')
        except Exception as exc:
            logger.exception("Failed to send cancellation email for order_id=%s: %s", order.id, exc)

        return Response({"detail": "Order cancelled successfully."})


class AdminOrderListView(generics.ListCreateAPIView):
    serializer_class = OrderListSerializer
    permission_classes = [IsAdminOrStaff]

    def get_queryset(self):
        qs = Order.objects.all().select_related('customer')
        order_status = self.request.query_params.get('status')
        search = self.request.query_params.get('search')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        sort_by = self.request.query_params.get('sortBy', 'dateDesc')
        if order_status:
            qs = qs.filter(status=order_status)
        if search:
            qs = qs.filter(shipping_name__icontains=search) | qs.filter(id__icontains=search)
        if date_from:
            qs = qs.filter(created_at__date__gte=date_from)
        if date_to:
            qs = qs.filter(created_at__date__lte=date_to)
        if sort_by == 'priceAsc':
            qs = qs.order_by('total')
        elif sort_by == 'priceDesc':
            qs = qs.order_by('-total')
        elif sort_by == 'dateAsc':
            qs = qs.order_by('created_at')
        else:
            qs = qs.order_by('-created_at')
        return qs

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return AdminOrderWriteSerializer
        return OrderListSerializer


class AdminOrderDetailView(generics.RetrieveAPIView):
    serializer_class = OrderSerializer
    permission_classes = [IsAdminOrStaff]
    queryset = Order.objects.prefetch_related('items', 'status_history', 'customer')


class AdminUpdateOrderStatusView(APIView):
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
        note = serializer.validated_data.get('note', '')

        status_flow = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']
        if status_flow.index(new_status) < status_flow.index(old_status):
            return Response(
                {"detail": f"Cannot move order from '{old_status}' back to '{new_status}'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        order.status = new_status
        order.save()
        OrderStatusHistory.objects.create(
            order=order,
            old_status=old_status,
            new_status=new_status,
            changed_by=request.user,
            note=note,
        )

        try:
            OrderEmailService.send_order_status_update(order, note=note)
        except Exception as exc:
            logger.exception("Failed to send status update email for order_id=%s: %s", order.id, exc)

        return Response(OrderSerializer(order).data)


class AdminOrderManageView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdminOrStaff]
    queryset = Order.objects.all().prefetch_related('items', 'status_history')

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return AdminOrderWriteSerializer
        return OrderSerializer

    def perform_update(self, serializer):
        instance = self.get_object()
        instance.items.all().delete()
        serializer.instance = None
        serializer.save()


class ShippingRegionListCreateView(generics.ListCreateAPIView):
    queryset = ShippingRegion.objects.all()
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.IsAuthenticated()]
        return [IsAdminOrStaff()]

    def get_serializer_class(self):
        from rest_framework import serializers

        class _Serializer(serializers.ModelSerializer):
            class Meta:
                model = ShippingRegion
                fields = ['id', 'name', 'price']

        return _Serializer


class ShippingRegionDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = ShippingRegion.objects.all()
    permission_classes = [IsAdminOrStaff]

    def get_serializer_class(self):
        from rest_framework import serializers

        class _Serializer(serializers.ModelSerializer):
            class Meta:
                model = ShippingRegion
                fields = ['id', 'name', 'price']

        return _Serializer