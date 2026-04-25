from rest_framework import serializers
from .models import Order, OrderItem, OrderStatusHistory
from apps.cart.models import Cart


class OrderItemSerializer(serializers.ModelSerializer):
    subtotal = serializers.ReadOnlyField()

    class Meta:
        model  = OrderItem
        fields = ['id', 'product_name', 'variant_name', 'price_at_order', 'quantity', 'subtotal']


class OrderStatusHistorySerializer(serializers.ModelSerializer):
    changed_by = serializers.StringRelatedField()

    class Meta:
        model  = OrderStatusHistory
        fields = ['old_status', 'new_status', 'changed_by', 'note', 'changed_at']


class OrderSerializer(serializers.ModelSerializer):
    items          = OrderItemSerializer(many=True, read_only=True)
    status_history = OrderStatusHistorySerializer(many=True, read_only=True)
    customer       = serializers.StringRelatedField()

    class Meta:
        model  = Order
        fields = [
            'id', 'customer', 'status',
            'shipping_name', 'shipping_phone', 'shipping_address',
            'notes', 'total', 'items', 'status_history',
            'created_at', 'updated_at'
        ]


class OrderListSerializer(serializers.ModelSerializer):
    """نسخة خفيفة للـ listing — بدون items وhistory"""
    class Meta:
        model  = Order
        fields = [
            'id', 'status', 'total',
            'shipping_name', 'shipping_phone',
            'created_at'
        ]


class CreateOrderSerializer(serializers.Serializer):
    """
    العميل بيبعت بيانات الشحن بس
    الـ items بتيجي من الـ Cart تلقائياً
    """
    shipping_name    = serializers.CharField(max_length=200)
    shipping_phone   = serializers.CharField(max_length=20)
    shipping_address = serializers.CharField()
    notes            = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        request = self.context['request']

        # جيب الـ Cart
        if request.user.is_authenticated:
            try:
                cart = Cart.objects.get(user=request.user)
            except Cart.DoesNotExist:
                raise serializers.ValidationError("Cart not found.")
        else:
            raise serializers.ValidationError("You must be logged in to place an order.")

        # تأكد إن الـ Cart مش فاضية
        if cart.is_empty:
            raise serializers.ValidationError("Your cart is empty.")

        # تأكد إن كل items متاحة في الـ Stock
        unavailable = [
            f"{item.variant} — requested {item.quantity}, available {item.variant.stock.quantity}"
            for item in cart.items.all()
            if not item.is_available
        ]
        if unavailable:
            raise serializers.ValidationError({
                "unavailable_items": unavailable
            })

        attrs['cart'] = cart
        return attrs

    def create(self, validated_data):
        from apps.products.models import Stock
        cart  = validated_data.pop('cart')
        request = self.context['request']

        # إنشاء الـ Order
        order = Order.objects.create(
            customer=request.user,
            shipping_name=validated_data['shipping_name'],
            shipping_phone=validated_data['shipping_phone'],
            shipping_address=validated_data['shipping_address'],
            notes=validated_data.get('notes', ''),
        )

        # نقل الـ Cart items للـ Order + خصم من الـ Stock
        for item in cart.items.all():
            OrderItem.objects.create(
                order=order,
                variant=item.variant,
                product_name=item.variant.product.name,
                variant_name=item.variant.name,
                price_at_order=item.variant.price,
                quantity=item.quantity,
            )

            # خصم الكمية من الـ Stock
            stock = item.variant.stock
            stock.quantity -= item.quantity
            stock.save()

        # حساب الـ Total
        order.calculate_total()

        # فراغ الـ Cart بعد الأوردر
        cart.clear()

        return order


class UpdateOrderStatusSerializer(serializers.Serializer):
    """للـ Admin — تغيير status الأوردر"""
    status = serializers.ChoiceField(choices=Order.STATUS_CHOICES)
    note   = serializers.CharField(required=False, allow_blank=True)