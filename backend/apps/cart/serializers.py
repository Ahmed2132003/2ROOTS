from rest_framework import serializers
from .models import Cart, CartItem
from apps.products.serializers import ProductVariantSerializer


class CartItemSerializer(serializers.ModelSerializer):
    variant  = ProductVariantSerializer(read_only=True)
    subtotal = serializers.ReadOnlyField()
    is_available = serializers.ReadOnlyField()

    class Meta:
        model  = CartItem
        fields = ['id', 'variant', 'quantity', 'subtotal', 'is_available', 'added_at']


class CartSerializer(serializers.ModelSerializer):
    items       = CartItemSerializer(many=True, read_only=True)
    total_items = serializers.ReadOnlyField()
    total_price = serializers.ReadOnlyField()
    is_empty    = serializers.ReadOnlyField()

    class Meta:
        model  = Cart
        fields = ['id', 'items', 'total_items', 'total_price', 'is_empty', 'updated_at']


class AddToCartSerializer(serializers.Serializer):
    variant_id = serializers.IntegerField()
    quantity   = serializers.IntegerField(min_value=1, default=1)

    def validate(self, attrs):
        from apps.products.models import ProductVariant
        try:
            variant = ProductVariant.objects.get(
                id=attrs['variant_id'],
                is_active=True
            )
        except ProductVariant.DoesNotExist:
            raise serializers.ValidationError({"variant_id": "Variant not found or inactive."})

        # تأكد إن الكمية المطلوبة موجودة في الـ Stock
        try:
            if variant.stock.quantity < attrs['quantity']:
                raise serializers.ValidationError({
                    "quantity": f"Only {variant.stock.quantity} items available in stock."
                })
        except Exception:
            raise serializers.ValidationError({"variant_id": "Stock info not available."})

        attrs['variant'] = variant
        return attrs


class UpdateCartItemSerializer(serializers.Serializer):
    quantity = serializers.IntegerField(min_value=1)

    def validate_quantity(self, value):
        # التحقق من الـ Stock وقت الـ update
        cart_item = self.context.get('cart_item')
        if cart_item and cart_item.variant.stock.quantity < value:
            raise serializers.ValidationError(
                f"Only {cart_item.variant.stock.quantity} items available."
            )
        return value