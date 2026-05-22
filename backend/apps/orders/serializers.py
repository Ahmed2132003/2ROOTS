from rest_framework import serializers
from .models import Order, OrderItem, OrderStatusHistory, ShippingRegion
from apps.cart.models import Cart


class OrderItemSerializer(serializers.ModelSerializer):
    subtotal = serializers.ReadOnlyField()
    image = serializers.SerializerMethodField()
    size = serializers.SerializerMethodField()
    color = serializers.SerializerMethodField()

    def get_image(self, obj):
        variant = getattr(obj, 'variant', None)
        product = getattr(variant, 'product', None)
        return product.main_image if product else None
    
    def get_size(self, obj):
        variant = getattr(obj, 'variant', None)
        size = getattr(variant, 'size', None)
        return size.name if size else None

    def get_color(self, obj):
        variant = getattr(obj, 'variant', None)
        color = getattr(variant, 'color', None)
        return color.name if color else None

    class Meta:
        model  = OrderItem
        fields = ['id', 'product_name', 'variant_name', 'price_at_order', 'quantity', 'subtotal', 'image', 'size', 'color']
        

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
            'shipping_name', 'shipping_phone', 'shipping_address', 'shipping_region', 'shipping_fee',
            'shipping_email',
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
    shipping_email   = serializers.EmailField()
    shipping_phone   = serializers.CharField(max_length=20)    
    shipping_address = serializers.CharField()
    notes            = serializers.CharField(required=False, allow_blank=True)
    shipping_region_id = serializers.IntegerField()

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

        # تأكد إن مفيش items sold out
        sold_out_items = [
            f"{item.variant.product.name} is marked as Sold Out."
            for item in cart.items.all()
            if item.variant.product.stock_status == 'sold_out'
        ]
        if sold_out_items:
            raise serializers.ValidationError({
                "sold_out_items": sold_out_items
            })

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

        try:
            region = ShippingRegion.objects.get(id=attrs['shipping_region_id'])
        except ShippingRegion.DoesNotExist:
            raise serializers.ValidationError({"shipping_region_id": "Invalid shipping region."})

        attrs['cart'] = cart
        attrs['shipping_region'] = region
        return attrs

    def create(self, validated_data):
        from apps.products.models import Stock
        cart  = validated_data.pop('cart')
        request = self.context['request']

        order = Order.objects.create(
            customer=request.user,
            shipping_name=validated_data['shipping_name'],
            shipping_email=validated_data['shipping_email'],
            shipping_phone=validated_data['shipping_phone'],            
            shipping_address=validated_data['shipping_address'],
            notes=validated_data.get('notes', ''),
            shipping_region=validated_data['shipping_region'].name,
            shipping_fee=validated_data['shipping_region'].price,
        )

        for item in cart.items.all():
            OrderItem.objects.create(
                order=order,
                variant=item.variant,
                product_name=item.variant.product.name,
                variant_name=item.variant.name,
                price_at_order=item.variant.effective_price,                
                quantity=item.quantity,
            )
            stock = item.variant.stock
            stock.quantity -= item.quantity
            stock.save()

        order.calculate_total()
        cart.clear()
        return order


class UpdateOrderStatusSerializer(serializers.Serializer):
    """للـ Admin — تغيير status الأوردر"""
    status = serializers.ChoiceField(choices=Order.STATUS_CHOICES)
    note   = serializers.CharField(required=False, allow_blank=True)

class AdminOrderItemWriteSerializer(serializers.Serializer):
    variant_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)

class AdminOrderWriteSerializer(serializers.ModelSerializer):
    items = AdminOrderItemWriteSerializer(many=True)
    tax = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, default=0)
    shipping = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, default=0)
    discount = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, default=0)

    class Meta:
        model = Order
        fields = ['customer', 'shipping_name', 'shipping_email', 'shipping_phone', 'shipping_address', 'shipping_region', 'shipping_fee', 'status', 'notes', 'items', 'tax', 'shipping', 'discount']
        
    def create(self, validated_data):
        from apps.products.models import ProductVariant
        items = validated_data.pop('items', [])
        tax = validated_data.pop('tax', 0)
        shipping = validated_data.pop('shipping', 0)
        discount = validated_data.pop('discount', 0)
        order = Order.objects.create(**validated_data)
        subtotal = 0
        for item in items:
            variant = ProductVariant.objects.get(id=item['variant_id'])
            qty = item['quantity']
            price = variant.price
            OrderItem.objects.create(order=order, variant=variant, product_name=variant.product.name, variant_name=variant.name, price_at_order=price, quantity=qty)
            subtotal += price * qty
        order.total = subtotal + tax + shipping - discount
        order.save(update_fields=['total'])
        return order