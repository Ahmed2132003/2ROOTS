from rest_framework import serializers
from .models import Category, Product, ProductVariant, Stock, ProductImage


class CategorySerializer(serializers.ModelSerializer):
    subcategories = serializers.SerializerMethodField()

    class Meta:
        model  = Category
        fields = ['id', 'name', 'slug', 'description', 'image', 'parent', 'subcategories']

    def get_subcategories(self, obj):
        subs = obj.subcategories.filter(is_active=True)
        return CategorySerializer(subs, many=True).data


class StockSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Stock
        fields = ['quantity', 'is_available', 'is_low_stock']


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model  = ProductImage
        fields = ['id', 'image', 'alt_text', 'is_main', 'order']


class ProductVariantSerializer(serializers.ModelSerializer):
    stock = StockSerializer(read_only=True)

    class Meta:
        model  = ProductVariant
        fields = ['id', 'name', 'sku', 'price', 'is_active', 'stock']


class ProductListSerializer(serializers.ModelSerializer):
    """نسخة خفيفة للـ listing — بدون تفاصيل كتير"""
    category   = CategorySerializer(read_only=True)
    main_image = serializers.ReadOnlyField()
    in_stock   = serializers.ReadOnlyField()

    class Meta:
        model  = Product
        fields = [
            'id', 'name', 'slug', 'category',
            'base_price', 'main_image', 'in_stock',
            'is_featured', 'created_at'
        ]


class ProductDetailSerializer(serializers.ModelSerializer):
    """نسخة كاملة للـ detail page"""
    category = CategorySerializer(read_only=True)
    images   = ProductImageSerializer(many=True, read_only=True)
    variants = ProductVariantSerializer(many=True, read_only=True)
    in_stock = serializers.ReadOnlyField()

    class Meta:
        model  = Product
        fields = [
            'id', 'name', 'slug', 'description', 'category',
            'base_price', 'in_stock', 'is_featured',
            'images', 'variants', 'created_at'
        ]


# ─── Admin Serializers (للـ Dashboard) ────────────────────────────────────────

class ProductWriteSerializer(serializers.ModelSerializer):
    """للـ Create & Update من الـ Dashboard"""
    class Meta:
        model  = Product
        fields = [
            'name', 'category', 'description',
            'base_price', 'is_active', 'is_featured'
        ]

    def validate_base_price(self, value):
        if value <= 0:
            raise serializers.ValidationError("Price must be greater than 0.")
        return value


class ProductVariantWriteSerializer(serializers.ModelSerializer):
    stock_quantity = serializers.IntegerField(write_only=True, required=False, default=0)

    class Meta:
        model  = ProductVariant
        fields = ['product', 'name', 'sku', 'price_override', 'is_active', 'stock_quantity']

    def create(self, validated_data):
        stock_quantity = validated_data.pop('stock_quantity', 0)
        variant = ProductVariant.objects.create(**validated_data)
        Stock.objects.create(variant=variant, quantity=stock_quantity)
        return variant

    def update(self, instance, validated_data):
        stock_quantity = validated_data.pop('stock_quantity', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if stock_quantity is not None:
            Stock.objects.update_or_create(
                variant=instance,
                defaults={'quantity': stock_quantity}
            )
        return instance