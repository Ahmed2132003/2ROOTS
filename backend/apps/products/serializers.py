from rest_framework import serializers
from .models import Category, Product, ProductColor, ProductSize, ProductVariant, Stock, ProductImage


class CategorySerializer(serializers.ModelSerializer):
    subcategories = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = [
            'id', 'name', 'slug', 'description', 'image', 'image_url',
            'parent', 'is_active', 'subcategories', 'created_at'
        ]

    def get_subcategories(self, obj):
        subs = obj.subcategories.filter(is_active=True)
        return CategorySerializer(subs, many=True, context=self.context).data

    def get_image_url(self, obj):
        if not obj.image:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.image.url)
        return obj.image.url


class StockSerializer(serializers.ModelSerializer):
    class Meta:
        model = Stock
        fields = ['quantity', 'is_available', 'is_low_stock']


class ProductImageSerializer(serializers.ModelSerializer):
    is_main = serializers.BooleanField(source='is_primary', required=False)
    image = serializers.SerializerMethodField()

    class Meta:
        model = ProductImage
        fields = ['id', 'image', 'alt_text', 'is_primary', 'is_main', 'order']
        read_only_fields = ['id']

    def get_image(self, obj):
        if not obj.image:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.image.url)
        return obj.image.url

    def validate(self, attrs):
        request_data = getattr(self, 'initial_data', {}) or {}
        if 'is_main' in request_data and 'is_primary' not in request_data:
            attrs['is_primary'] = request_data.get('is_main') in [True, 'true', 'True', '1', 1]
        return attrs


class ProductColorSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductColor
        fields = ['id', 'name', 'hex_code']


class ProductSizeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductSize
        fields = ['id', 'name']


class ProductVariantSerializer(serializers.ModelSerializer):
    stock = StockSerializer(read_only=True)
    stock_quantity = serializers.SerializerMethodField()
    color = ProductColorSerializer(read_only=True)
    size = ProductSizeSerializer(read_only=True)
    effective_price = serializers.ReadOnlyField()

    class Meta:
        model = ProductVariant
        fields = [
            'id', 'name', 'sku', 'color', 'size', 'price', 'price_override',
            'effective_price', 'is_active', 'stock', 'stock_quantity', 'created_at'
        ]

    def get_stock_quantity(self, obj):
        return getattr(getattr(obj, 'stock', None), 'quantity', 0)


DISCOUNT_FIELDS = [
    'stock_status', 'is_sold_out', 'is_low_stock',
    'discount_type', 'discount_value', 'discount_start', 'discount_end',
    'discount_active', 'discount_is_active', 'discounted_price', 'discount_percentage',
]


class ProductListSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    main_image = serializers.ReadOnlyField()
    in_stock = serializers.ReadOnlyField()
    is_sold_out = serializers.ReadOnlyField()
    is_low_stock = serializers.ReadOnlyField()
    discount_is_active = serializers.ReadOnlyField()
    discounted_price = serializers.ReadOnlyField()
    discount_percentage = serializers.ReadOnlyField()
    images = ProductImageSerializer(many=True, read_only=True)
    variants = ProductVariantSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'slug', 'category', 'base_price', 'has_variants',
            'main_image', 'images', 'variants', 'in_stock', 'is_featured', 'created_at',
            'stock_status', 'is_sold_out', 'is_low_stock',
            'discount_type', 'discount_value', 'discount_start', 'discount_end',
            'discount_active', 'discount_is_active', 'discounted_price', 'discount_percentage',
        ]


class ProductDetailSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)
    variants = ProductVariantSerializer(many=True, read_only=True)
    colors = serializers.SerializerMethodField()
    sizes = serializers.SerializerMethodField()
    in_stock = serializers.ReadOnlyField()
    is_sold_out = serializers.ReadOnlyField()
    is_low_stock = serializers.ReadOnlyField()
    discount_is_active = serializers.ReadOnlyField()
    discounted_price = serializers.ReadOnlyField()
    discount_percentage = serializers.ReadOnlyField()

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'slug', 'description', 'category', 'base_price',
            'has_variants', 'in_stock', 'is_active', 'is_featured', 'images',
            'colors', 'sizes', 'variants', 'created_at',
            'stock_status', 'is_sold_out', 'is_low_stock',
            'discount_type', 'discount_value', 'discount_start', 'discount_end',
            'discount_active', 'discount_is_active', 'discounted_price', 'discount_percentage',
        ]

    def get_colors(self, obj):
        colors = ProductColor.objects.filter(variants__product=obj).distinct()
        return ProductColorSerializer(colors, many=True).data

    def get_sizes(self, obj):
        sizes = ProductSize.objects.filter(variants__product=obj).distinct()
        return ProductSizeSerializer(sizes, many=True).data


class ProductWriteSerializer(serializers.ModelSerializer):
    variants = serializers.ListField(child=serializers.DictField(), required=False, write_only=True)

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'category', 'description', 'base_price', 'has_variants',
            'is_active', 'is_featured', 'variants',
            'stock_status',
            'discount_type', 'discount_value', 'discount_start', 'discount_end', 'discount_active',
        ]
        read_only_fields = ['id']

    def validate_base_price(self, value):
        if value <= 0:
            raise serializers.ValidationError("Price must be greater than 0.")
        return value

    def validate(self, attrs):
        discount_type = attrs.get('discount_type')
        discount_value = attrs.get('discount_value')
        base_price = attrs.get('base_price')
        if discount_type == 'fixed' and discount_value and base_price:
            if discount_value >= base_price:
                raise serializers.ValidationError({
                    'discount_value': 'Fixed discount cannot be equal to or greater than base price.'
                })
        if discount_type == 'percentage' and discount_value:
            if not (0 < discount_value <= 100):
                raise serializers.ValidationError({
                    'discount_value': 'Percentage discount must be between 1 and 100.'
                })
        return attrs

    def create(self, validated_data):
        variants = validated_data.pop('variants', [])
        product = Product.objects.create(**validated_data)
        if variants:
            for variant_data in variants:
                self._upsert_variant(product, variant_data)
        return product

    def update(self, instance, validated_data):
        variants = validated_data.pop('variants', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if variants is not None:
            keep_ids = []
            for variant_data in variants:
                variant = self._upsert_variant(instance, variant_data)
                keep_ids.append(variant.id)
            if instance.has_variants:
                instance.variants.exclude(id__in=keep_ids).delete()
        return instance

    def _upsert_variant(self, product, data):
        from .models import ProductColor, ProductSize, ProductVariant, Stock
        data = dict(data)
        variant_id = data.get('id')
        color = self._get_or_create_color(data)
        size = self._get_or_create_size(data)
        defaults = {
            'color': color,
            'size': size,
            'name': data.get('name') or self._variant_name(color, size),
            'sku': data.get('sku') or None,
            'price_override': data.get('price_override') if data.get('price_override') not in ['', None] else None,
            'is_active': data.get('is_active', True),
        }
        if variant_id:
            variant = product.variants.get(id=variant_id)
            for attr, value in defaults.items():
                setattr(variant, attr, value)
            variant.save()
        else:
            variant = ProductVariant.objects.create(product=product, **defaults)
        Stock.objects.update_or_create(
            variant=variant,
            defaults={'quantity': max(0, int(data.get('stock_quantity', data.get('stock', 0)) or 0))}
        )
        return variant

    def _get_or_create_color(self, data):
        from .models import ProductColor
        color_id = data.get('color_id') or data.get('color')
        if isinstance(color_id, dict):
            data['color_name'] = color_id.get('name')
            data['hex_code'] = color_id.get('hex_code')
            color_id = color_id.get('id')
        if color_id:
            return ProductColor.objects.get(id=color_id)
        name = (data.get('color_name') or '').strip()
        if not name:
            return None
        color, _ = ProductColor.objects.get_or_create(
            name=name, defaults={'hex_code': data.get('hex_code') or None}
        )
        return color

    def _get_or_create_size(self, data):
        from .models import ProductSize
        size_id = data.get('size_id') or data.get('size')
        if isinstance(size_id, dict):
            data['size_name'] = size_id.get('name')
            size_id = size_id.get('id')
        if size_id:
            return ProductSize.objects.get(id=size_id)
        name = (data.get('size_name') or '').strip()
        if not name:
            return None
        size, _ = ProductSize.objects.get_or_create(name=name)
        return size

    def _variant_name(self, color, size):
        parts = [p for p in [color.name if color else '', size.name if size else ''] if p]
        return ' / '.join(parts) if parts else 'Default'


class ProductVariantWriteSerializer(serializers.ModelSerializer):
    stock_quantity = serializers.IntegerField(write_only=True, required=False, default=0)
    color_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    size_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    hex_code = serializers.CharField(write_only=True, required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = ProductVariant
        fields = [
            'id', 'product', 'name', 'color', 'size', 'color_name', 'size_name',
            'hex_code', 'sku', 'price_override', 'is_active', 'stock_quantity'
        ]
        read_only_fields = ['id']
        extra_kwargs = {
            'product': {'required': False},
            'color': {'required': False, 'allow_null': True},
            'size': {'required': False, 'allow_null': True},
            'sku': {'required': False, 'allow_blank': True, 'allow_null': True},
        }

    def validate_sku(self, value):
        return value or None

    def _pop_color_size(self, validated_data):
        color_name = validated_data.pop('color_name', '').strip()
        size_name = validated_data.pop('size_name', '').strip()
        hex_code = validated_data.pop('hex_code', None)
        if color_name and not validated_data.get('color'):
            color, _ = ProductColor.objects.get_or_create(name=color_name, defaults={'hex_code': hex_code or None})
            if hex_code and color.hex_code != hex_code:
                color.hex_code = hex_code
                color.save(update_fields=['hex_code'])
            validated_data['color'] = color
        if size_name and not validated_data.get('size'):
            size, _ = ProductSize.objects.get_or_create(name=size_name)
            validated_data['size'] = size

    def create(self, validated_data):
        stock_quantity = validated_data.pop('stock_quantity', 0)
        self._pop_color_size(validated_data)
        variant = ProductVariant.objects.create(**validated_data)
        Stock.objects.create(variant=variant, quantity=stock_quantity)
        return variant

    def update(self, instance, validated_data):
        stock_quantity = validated_data.pop('stock_quantity', None)
        self._pop_color_size(validated_data)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if stock_quantity is not None:
            Stock.objects.update_or_create(variant=instance, defaults={'quantity': stock_quantity})
        return instance