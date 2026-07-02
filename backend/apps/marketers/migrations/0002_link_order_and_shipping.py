# apps/marketers/migrations/00XX_link_order_and_shipping.py
#
# ⚠️ مهم قبل التشغيل:
# 1) سمّي الملف برقم صحيح بدل 00XX (مثلاً 0009_... حسب آخر رقم عندك فعليًا
#    في apps/marketers/migrations/) وحدّث dependencies تحت ليطابق آخر
#    migration موجودة فعليًا في apps/marketers (شغّل:
#    python manage.py showmigrations marketers).
# 2) تأكد إن apps/orders عندها migration بتضيف is_marketer_order/marketer
#    على Order قبل أو في نفس وقت تشغيل الداتا مايجريشن تحت (الاعتماد على
#    orders.0005_link_marketer_orders مكتوب صراحة تحت).
#
# الملف ده بيعمل حاجتين:
#   أ) Schema: يضيف shipping_region / shipping_address / linked_order
#      على MarketerOrder.
#   ب) Data: يربط أي MarketerOrder قديم (اتعمل قبل التحديث) بـ Order حقيقي
#      جديد، عشان مفيش أوردر مسوق قديم يفضل من غير فاتورة/ظهور في الداشبورد.
#      أي MarketerOrder مالوش product (نادر، product اتحذف) بيتعدّى بأمان
#      من غير ما يكسر الـ migration (بيتسجّل في stdout بس للمراجعة اليدوية).

from decimal import Decimal

from django.db import migrations, models
import django.db.models.deletion


def backfill_linked_orders(apps, schema_editor):
    MarketerOrder = apps.get_model('marketers', 'MarketerOrder')
    Order = apps.get_model('orders', 'Order')
    OrderItem = apps.get_model('orders', 'OrderItem')

    qs = MarketerOrder.objects.filter(linked_order__isnull=True).select_related(
        'marketer', 'product', 'variant', 'shipping_region'
    )

    skipped = []

    for mo in qs:
        if mo.product_id is None:
            # مفيش منتج نقدر نعمل بيه OrderItem — نسيبه بدون linked_order
            # (هيفضل شغال زي ما كان، بس مش هيظهر في الداشبورد العادي)
            skipped.append(mo.pk)
            continue

        shipping_fee = mo.shipping_region.price if mo.shipping_region_id else Decimal('0')
        shipping_region_name = mo.shipping_region.name if mo.shipping_region_id else ''

        order = Order.objects.create(
            customer=None,
            is_marketer_order=True,
            marketer_id=mo.marketer_id,
            shipping_name=mo.customer_name,
            shipping_email='',
            shipping_phone=mo.customer_phone,
            shipping_address=mo.shipping_address or '—',
            shipping_region=shipping_region_name,
            shipping_fee=shipping_fee,
            status='delivered' if mo.status == 'confirmed' else (
                'cancelled' if mo.status == 'rejected' else 'pending'
            ),
        )

        OrderItem.objects.create(
            order=order,
            variant_id=mo.variant_id,
            product_name=mo.product.name,
            variant_name=mo.variant.name if mo.variant_id else '',
            price_at_order=mo.sale_price_per_unit,
            quantity=mo.quantity,
        )

        items_total = mo.sale_price_per_unit * mo.quantity
        order.total = items_total + shipping_fee
        order.save(update_fields=['total'])

        mo.linked_order_id = order.id
        mo.save(update_fields=['linked_order'])

    if skipped:
        print(
            f"[marketers migration] تنبيه: {len(skipped)} MarketerOrder قديم "
            f"اتعدّى من الربط لأن المنتج محذوف. المراجعة اليدوية مطلوبة لـ IDs: {skipped}"
        )


def noop_reverse(apps, schema_editor):
    # لا رجوع تلقائي لتفكيك الربط — البيانات المُنشأة (Orders) بتفضل موجودة
    # عمدًا حتى لو الميجريشن اتعمله rollback، تجنبًا لفقد بيانات حقيقية.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('marketers', '0001_initial'),  # ⚠️ تأكد إنها آخر واحدة فعليًا عندك
        ('orders', '0005_link_marketer_orders'),
    ]

    operations = [
        migrations.AddField(
            model_name='marketerorder',
            name='shipping_region',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='marketer_orders',
                to='orders.shippingregion',
            ),
        ),
        migrations.AddField(
            model_name='marketerorder',
            name='shipping_address',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='marketerorder',
            name='linked_order',
            field=models.OneToOneField(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='marketer_order_source',
                to='orders.order',
            ),
        ),
        migrations.RunPython(backfill_linked_orders, noop_reverse),
    ]