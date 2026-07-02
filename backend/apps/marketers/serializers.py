from rest_framework import serializers
from apps.products.models import ProductVariant, Product
from apps.orders.models import Order, OrderItem, ShippingRegion
from apps.orders.services.email_service import OrderEmailService
from .models import (
    Marketer,
    MarketerProductPrice,
    MarketerOrder,
    MarketerOrderItem,
    RewardTier,
    TeamReward,
    TeamLeaderRequest,
    TeamLeaderRequestMember,
    WithdrawalRequest,
)


# ── Marketer (full) ───────────────────────────────────────────────────────────
class MarketerSerializer(serializers.ModelSerializer):
    email    = serializers.EmailField(source='user.email', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model  = Marketer
        fields = [
            'id', 'email', 'username', 'referral_code',
            'status', 'role',
            'team_leader', 'credited_team_leader',
            'cycle_anchor_date', 'current_cycle_number',
            'monthly_completed_orders_count', 'monthly_profit_balance',
            'lifetime_total_orders', 'lifetime_total_profit',
            'created_at', 'promoted_to_leader_at',
        ]
        read_only_fields = [
            'id', 'email', 'username', 'referral_code',
            'cycle_anchor_date', 'current_cycle_number',
            'monthly_completed_orders_count', 'monthly_profit_balance',
            'lifetime_total_orders', 'lifetime_total_profit',
            'created_at', 'promoted_to_leader_at',
            'credited_team_leader',
        ]


# ── Marketer (brief) ──────────────────────────────────────────────────────────
class MarketerBriefSerializer(serializers.ModelSerializer):
    email      = serializers.EmailField(source='user.email', read_only=True)
    full_name  = serializers.SerializerMethodField()

    class Meta:
        model  = Marketer
        fields = ['id', 'email', 'full_name', 'referral_code', 'status']

    def get_full_name(self, obj):
        return obj.user.get_full_name() or obj.user.username


# ── MarketerProductPrice ──────────────────────────────────────────────────────
class MarketerProductPriceSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    has_variants = serializers.BooleanField(source='product.has_variants', read_only=True)

    class Meta:
        model  = MarketerProductPrice
        fields = ['id', 'marketer', 'product', 'product_name', 'has_variants', 'assigned_price', 'updated_at']
        read_only_fields = ['id', 'updated_at', 'product_name', 'has_variants']


# ═════════════════════════════════════════════════════════════════════════════
# MarketerOrder — أسطر متعددة (NEW)
# ═════════════════════════════════════════════════════════════════════════════

class MarketerOrderItemInputSerializer(serializers.Serializer):
    """سطر واحد جاي من الفرونت — منتج + variant اختياري + كمية + سعر بيع."""
    product_id = serializers.IntegerField()
    variant_id = serializers.IntegerField(required=False, allow_null=True)
    quantity   = serializers.IntegerField(min_value=1)
    sale_price_per_unit = serializers.DecimalField(max_digits=10, decimal_places=2)

    def validate_sale_price_per_unit(self, value):
        if value <= 0:
            raise serializers.ValidationError("سعر البيع يجب أن يكون أكبر من صفر.")
        return value


class MarketerOrderItemSerializer(serializers.ModelSerializer):
    """عرض سطر — مستخدمة جوه MarketerOrderSerializer للقراءة."""
    product_name  = serializers.CharField(source='product.name', read_only=True, default=None)
    variant_name  = serializers.CharField(source='variant.name', read_only=True, default=None)
    variant_color = serializers.CharField(source='variant.color.name', read_only=True, default=None)
    variant_size  = serializers.CharField(source='variant.size.name', read_only=True, default=None)
    subtotal      = serializers.ReadOnlyField()

    class Meta:
        model  = MarketerOrderItem
        fields = [
            'id', 'product', 'product_name', 'variant', 'variant_name',
            'variant_color', 'variant_size', 'quantity',
            'sale_price_per_unit', 'assigned_price_per_unit', 'profit_amount', 'subtotal',
        ]
        read_only_fields = fields


class MarketerOrderCreateSerializer(serializers.ModelSerializer):
    """
    إنشاء أوردر مسوق — بيدعم أسطر متعددة.

    الطريقة الجديدة (مفضّلة): إرسال `items`: [{product_id, variant_id?,
    quantity, sale_price_per_unit}, ...] — سطر أو أكتر.

    توافق خلفي: لو 'items' متبعتش، بيتم اعتبار الحقول القديمة
    (product_id, variant_id, quantity, sale_price_per_unit) كسطر واحد
    تلقائيًا — أي مستهلك قديم للـ API يفضل شغال من غير أي تغيير.
    """
    items = MarketerOrderItemInputSerializer(many=True, required=False)

    # ── حقول قديمة (توافق خلفي فقط — مش مستخدمة في الفرونت الجديد) ──
    product_id = serializers.IntegerField(write_only=True, required=False)
    variant_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    quantity   = serializers.IntegerField(write_only=True, required=False)
    sale_price_per_unit = serializers.DecimalField(
        max_digits=10, decimal_places=2, write_only=True, required=False
    )

    shipping_region_id = serializers.IntegerField(write_only=True)
    shipping_address    = serializers.CharField(write_only=True, allow_blank=False)

    class Meta:
        model = MarketerOrder
        fields = [
            'id', 'items',
            'product_id', 'variant_id', 'quantity', 'sale_price_per_unit',
            'customer_name', 'customer_phone',
            'shipping_region_id', 'shipping_address',
            'status', 'created_at',
        ]
        read_only_fields = ['id', 'status', 'created_at']

    def validate(self, attrs):
        request    = self.context['request']
        marketer   = request.user.marketer_profile

        raw_items = attrs.get('items')
        if not raw_items:
            # ── توافق خلفي: سطر واحد قديم ──
            legacy_product_id = attrs.get('product_id')
            legacy_quantity   = attrs.get('quantity')
            legacy_price      = attrs.get('sale_price_per_unit')
            if not legacy_product_id or not legacy_quantity or legacy_price is None:
                raise serializers.ValidationError({
                    'items': "يجب إضافة سطر واحد على الأقل (منتج، كمية، وسعر بيع)."
                })
            if legacy_quantity <= 0:
                raise serializers.ValidationError({'items': "الكمية يجب أن تكون أكبر من صفر."})
            if legacy_price <= 0:
                raise serializers.ValidationError({'items': "سعر البيع يجب أن يكون أكبر من صفر."})
            raw_items = [{
                'product_id': legacy_product_id,
                'variant_id': attrs.get('variant_id'),
                'quantity':   legacy_quantity,
                'sale_price_per_unit': legacy_price,
            }]

        resolved_items = []
        for idx, item in enumerate(raw_items, start=1):
            product_id = item.get('product_id')
            variant_id = item.get('variant_id')
            quantity   = item.get('quantity')
            sale_price = item.get('sale_price_per_unit')

            price_entry = (
                MarketerProductPrice.objects
                .filter(marketer=marketer, product_id=product_id)
                .first()
            )
            if not price_entry:
                raise serializers.ValidationError({
                    'items': f"السطر {idx}: مفيش سعر محدد لك على هذا المنتج، تواصل مع الإدارة."
                })

            variant = None
            if variant_id is not None:
                variant = ProductVariant.objects.filter(id=variant_id, product_id=product_id).first()
                if not variant:
                    raise serializers.ValidationError({
                        'items': f"السطر {idx}: المتغيّر (اللون/المقاس) ده غير متاح لهذا المنتج."
                    })

            resolved_items.append({
                'product_id': product_id,
                'variant': variant,
                'quantity': quantity,
                'sale_price_per_unit': sale_price,
                'assigned_price_per_unit': price_entry.assigned_price,
                'profit_amount': (sale_price - price_entry.assigned_price) * quantity,
            })

        try:
            shipping_region = ShippingRegion.objects.get(id=attrs['shipping_region_id'])
        except ShippingRegion.DoesNotExist:
            raise serializers.ValidationError({'shipping_region_id': "محافظة الشحن غير صالحة."})

        attrs['_marketer']        = marketer
        attrs['_resolved_items']  = resolved_items
        attrs['_shipping_region'] = shipping_region
        return attrs

    def create(self, validated_data):
        marketer         = validated_data.pop('_marketer')
        resolved_items    = validated_data.pop('_resolved_items')
        shipping_region    = validated_data.pop('_shipping_region')
        shipping_address   = validated_data['shipping_address']

        for f in ('items', 'product_id', 'variant_id', 'quantity',
                  'sale_price_per_unit', 'shipping_region_id'):
            validated_data.pop(f, None)

        total_quantity = sum(it['quantity'] for it in resolved_items)
        total_profit   = sum(it['profit_amount'] for it in resolved_items)

        if len(resolved_items) == 1:
            # سطر واحد — نحافظ على الحقول القديمة معبّأة (توافق خلفي/تقارير قديمة)
            only = resolved_items[0]
            legacy_kwargs = {
                'product_id': only['product_id'],
                'variant': only['variant'],
                'quantity': only['quantity'],
                'sale_price_per_unit': only['sale_price_per_unit'],
                'assigned_price_per_unit': only['assigned_price_per_unit'],
            }
        else:
            # أكتر من سطر — الحقول القديمة بتفضل فاضية، البيانات الحقيقية في .items
            legacy_kwargs = {
                'product': None,
                'variant': None,
                'quantity': total_quantity,
                'sale_price_per_unit': None,
                'assigned_price_per_unit': None,
            }

        marketer_order = MarketerOrder.objects.create(
            marketer=marketer,
            profit_amount=total_profit,
            customer_name=validated_data['customer_name'],
            customer_phone=validated_data['customer_phone'],
            shipping_region=shipping_region,
            shipping_address=shipping_address,
            status='pending',
            **legacy_kwargs,
        )

        for it in resolved_items:
            MarketerOrderItem.objects.create(
                order=marketer_order,
                product_id=it['product_id'],
                variant=it['variant'],
                quantity=it['quantity'],
                sale_price_per_unit=it['sale_price_per_unit'],
                assigned_price_per_unit=it['assigned_price_per_unit'],
                profit_amount=it['profit_amount'],
            )

        # ── إنشاء Order حقيقي مرتبط فورًا — نفس باترن AdminOrderWriteSerializer ──
        order = Order.objects.create(
            customer=None,
            is_marketer_order=True,
            marketer=marketer,
            shipping_name=marketer_order.customer_name,
            shipping_email='',
            shipping_phone=marketer_order.customer_phone,
            shipping_address=shipping_address,
            shipping_region=shipping_region.name,
            shipping_fee=shipping_region.price,
            status='pending',
        )
        for it in resolved_items:
            product = it['variant'].product if it['variant'] else Product.objects.filter(id=it['product_id']).first()
            OrderItem.objects.create(
                order=order,
                variant=it['variant'],
                product_name=product.name if product else '',
                variant_name=it['variant'].name if it['variant'] else '',
                price_at_order=it['sale_price_per_unit'],
                quantity=it['quantity'],
            )
        order.calculate_total()

        marketer_order.linked_order = order
        marketer_order.save(update_fields=['linked_order'])

        try:
            OrderEmailService._send_admin_notification(order)
        except Exception:
            import logging
            logging.getLogger(__name__).exception(
                "Failed to send admin notification email for marketer order_id=%s", order.id
            )

        return marketer_order


class MarketerOrderSerializer(serializers.ModelSerializer):
    """عرض أوردر المسوق — شامل items (الأسطر)، مع الحفاظ على الحقول
    القديمة المسطّحة لأي مستهلك قديم (هتكون None للأوردرات multi-item)."""
    marketer_email = serializers.CharField(source='marketer.user.email', read_only=True)
    product_name   = serializers.CharField(source='product.name', read_only=True, default=None)
    variant_name   = serializers.CharField(source='variant.name', read_only=True, default=None)
    variant_color  = serializers.CharField(source='variant.color.name', read_only=True, default=None)
    variant_size   = serializers.CharField(source='variant.size.name', read_only=True, default=None)
    items          = MarketerOrderItemSerializer(many=True, read_only=True)

    shipping_region_name = serializers.CharField(source='shipping_region.name', read_only=True, default=None)
    linked_order_id       = serializers.IntegerField(source='linked_order.id', read_only=True, default=None)
    order_status = serializers.CharField(source='linked_order.status', read_only=True, default=None)

    class Meta:
        model = MarketerOrder
        fields = [
            'id', 'marketer', 'marketer_email', 'product', 'product_name',
            'variant', 'variant_name', 'variant_color', 'variant_size',
            'items',
            'quantity', 'sale_price_per_unit', 'assigned_price_per_unit',
            'profit_amount', 'customer_name', 'customer_phone',
            'shipping_region', 'shipping_region_name', 'shipping_address',
            'linked_order_id', 'order_status',
            'status', 'is_counted', 'counted_in_cycle_number',
            'counted_towards_leader', 'created_at', 'confirmed_at',
        ]
        read_only_fields = fields


# ── RewardTier ────────────────────────────────────────────────────────────────
class RewardTierSerializer(serializers.ModelSerializer):
    class Meta:
        model  = RewardTier
        fields = ['id', 'min_team_sales', 'reward_amount', 'is_active']


# ── TeamReward ────────────────────────────────────────────────────────────────
class TeamRewardSerializer(serializers.ModelSerializer):
    marketer_email = serializers.EmailField(source='marketer.user.email', read_only=True)
    tier_details   = RewardTierSerializer(source='tier', read_only=True)

    class Meta:
        model  = TeamReward
        fields = [
            'id', 'marketer', 'marketer_email',
            'tier', 'tier_details',
            'cycle_number', 'team_sales_count_at_award',
            'reward_amount', 'status', 'created_at',
        ]
        read_only_fields = [
            'id', 'marketer_email', 'tier_details',
            'cycle_number', 'team_sales_count_at_award',
            'reward_amount', 'created_at',
        ]


# ── TeamLeaderRequest ─────────────────────────────────────────────────────────
class TeamLeaderRequestSerializer(serializers.ModelSerializer):
    marketer_email = serializers.EmailField(source='marketer.user.email', read_only=True)
    members_count  = serializers.IntegerField(source='members.count', read_only=True)
    accepted_members_count = serializers.SerializerMethodField()

    class Meta:
        model  = TeamLeaderRequest
        fields = [
            'id', 'marketer', 'marketer_email',
            'status', 'triggered_at', 'responded_at',
            'members_count', 'accepted_members_count',
        ]
        read_only_fields = [
            'id', 'marketer_email', 'triggered_at',
            'members_count', 'accepted_members_count',
        ]

    def get_accepted_members_count(self, obj):
        return obj.members.filter(status='accepted').count()


class TeamLeaderRequestMemberSerializer(serializers.ModelSerializer):
    """
    ⚠️ تحديث (دعوات الانضمام): بتُستخدم دلوقتي كمان لعرض دعوة الانضمام
    نفسها للمسوّق المرشَّح (MyTeamInvitationsListView) — فيها status
    و leader_email (بريد القائد اللي بعت الدعوة) عشان المسوّق يعرف
    مين رشّحه، وresponded_at لتاريخ ردّه لو رد بالفعل.
    """
    marketer_email = serializers.EmailField(source='marketer.user.email', read_only=True)
    leader_email   = serializers.EmailField(source='request.marketer.user.email', read_only=True)

    class Meta:
        model  = TeamLeaderRequestMember
        fields = ['id', 'request', 'marketer', 'marketer_email', 'leader_email', 'status', 'responded_at']
        read_only_fields = ['id', 'marketer_email', 'leader_email', 'status', 'responded_at']


# ── WithdrawalRequest — Read ──────────────────────────────────────────────────
class WithdrawalRequestSerializer(serializers.ModelSerializer):
    """
    ⚠️ تحديث: أُضيف 'marketer_name' و 'marketer_referral_code' عشان تظهر
    اسم المسوّق وكوده في صفحة "طلبات سحب الأرباح" بالأدمن (الفرونت كان
    بيحاول يعرض w.marketer_name لكنه ما كانش موجود في الـ response،
    فكان بيرجع للـ fallback "مسوق #id"). مفيش أي تعديل على المنطق أو
    الموديل — فقط إضافة الحقلين للسيريلايزر.
    """
    marketer_email         = serializers.EmailField(source='marketer.user.email', read_only=True)
    marketer_name           = serializers.SerializerMethodField()
    marketer_referral_code  = serializers.CharField(source='marketer.referral_code', read_only=True)

    class Meta:
        model  = WithdrawalRequest
        fields = [
            'id', 'marketer', 'marketer_email', 'marketer_name', 'marketer_referral_code',
            'amount', 'status', 'cycle_number',
            'is_forced_settlement', 'created_at', 'resolved_at',
        ]
        read_only_fields = [
            'id', 'marketer_email', 'marketer_name', 'marketer_referral_code', 'cycle_number',
            'is_forced_settlement', 'created_at', 'resolved_at',
        ]

    def get_marketer_name(self, obj):
        return obj.marketer.user.get_full_name() or obj.marketer.user.username


# ── WithdrawalRequest — Create (A6) ──────────────────────────────────────────
class WithdrawalRequestCreateSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=10, decimal_places=2)

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("المبلغ يجب أن يكون أكبر من صفر.")
        return value


# ═════════════════════════════════════════════════════════════════════════════
# Part A7 — Serializers جديدة لإدارة الداشبورد
# ═════════════════════════════════════════════════════════════════════════════

class MarketerProductPriceCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = MarketerProductPrice
        fields = ['id', 'product', 'assigned_price', 'updated_at']
        read_only_fields = ['id', 'updated_at']

    def validate(self, attrs):
        marketer = self.context['marketer']
        product  = attrs.get('product')
        if MarketerProductPrice.objects.filter(marketer=marketer, product=product).exists():
            raise serializers.ValidationError(
                "يوجد سعر محدد لهذا المسوق على هذا المنتج بالفعل — استخدم التعديل بدلاً من الإضافة."
            )
        return attrs

    def create(self, validated_data):
        marketer = self.context['marketer']
        return MarketerProductPrice.objects.create(marketer=marketer, **validated_data)


class MarketerProductPriceUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = MarketerProductPrice
        fields = ['id', 'assigned_price', 'updated_at']
        read_only_fields = ['id', 'updated_at']


class MarketerStatusUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Marketer
        fields = ['status']


class MarketerAdminDetailSerializer(MarketerSerializer):
    team_members   = serializers.SerializerMethodField()
    recent_orders  = serializers.SerializerMethodField()
    product_prices = serializers.SerializerMethodField()
    team_leader_email = serializers.EmailField(
        source='team_leader.user.email', read_only=True, default=None
    )
    credited_team_leader_email = serializers.EmailField(
        source='credited_team_leader.user.email', read_only=True, default=None
    )

    class Meta(MarketerSerializer.Meta):
        fields = MarketerSerializer.Meta.fields + [
            'team_leader_email', 'credited_team_leader_email',
            'team_members', 'recent_orders', 'product_prices',
        ]

    def get_team_members(self, obj):
        if obj.role != 'team_leader':
            return []
        members = obj.team_members.select_related('user').order_by('-created_at')
        return MarketerBriefSerializer(members, many=True).data

    def get_recent_orders(self, obj):
        orders = obj.orders.select_related('product').prefetch_related('items').order_by('-created_at')[:20]
        return MarketerOrderSerializer(orders, many=True).data

    def get_product_prices(self, obj):
        prices = obj.product_prices.select_related('product')
        return MarketerProductPriceSerializer(prices, many=True).data


class TeamRewardStatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=['approved', 'paid'])

    def validate_status(self, value):
        instance = self.context.get('instance')
        order = ['pending', 'approved', 'paid']
        if instance and order.index(value) < order.index(instance.status):
            raise serializers.ValidationError("لا يمكن الرجوع لحالة سابقة.")
        return value


# ═════════════════════════════════════════════════════════════════════════════
# Part A8 — Serializer جديد لداشبورد المسوق الشخصي
# ═════════════════════════════════════════════════════════════════════════════

class TeamMemberStatusSerializer(serializers.ModelSerializer):
    """
    ⚠️ تحديث: أُضيف 'referral_code' لقائمة fields عشان يظهر كود المسوق
    في جدول "أفراد الفريق" بداشبورد Team Leader (الفرونت كان بيحاول
    يعرض m.referral_code لكنه ما كانش موجود في الـ response أصلاً).
    referral_code حقل موجود بالفعل على موديل Marketer — مفيش أي تعديل
    على المنطق أو الموديل، فقط إضافة الحقل للسيريلايزر.
    """
    email                 = serializers.EmailField(source='user.email', read_only=True)
    full_name             = serializers.SerializerMethodField()
    last_order_at         = serializers.DateTimeField(read_only=True, default=None)
    has_orders_this_month = serializers.SerializerMethodField()

    class Meta:
        model  = Marketer
        fields = [
            'id', 'email', 'full_name', 'referral_code', 'status',
            'monthly_completed_orders_count',
            'has_orders_this_month', 'last_order_at',
        ]

    def get_full_name(self, obj):
        return obj.user.get_full_name() or obj.user.username

    def get_has_orders_this_month(self, obj):
        return obj.monthly_completed_orders_count > 0