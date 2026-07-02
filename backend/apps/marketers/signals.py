"""
apps/marketers/signals.py

1) ensure_cycle_anchor — الأصلية، من غير أي تعديل.
2) auto_confirm_marketer_order_on_delivery — جديدة (تكامل الأوردرات):
   لما الـ Order المرتبط بأوردر مسوق يوصل لحالة 'delivered' من الداشبورد
   العادي، يحصل تأكيد تلقائي (auto-confirm) لنفس الأوردر في نظام
   المسوقين، فورًا وبدون أي تدخل يدوي.

   قواعد مهمة محققة هنا (راجع طلب التكامل الأصلي):
   - التأكيد بيحصل **فقط** لما status يبقى 'delivered' تحديدًا — أي حالة
     تانية (confirmed/shipped/cancelled) متعملش حاجة.
   - idempotent بالكامل: لو الأوردر اتأكد يدوي بالفعل من الأدمن (عن طريق
     AdminMarketerOrderConfirmView) قبل ما الـ Order يوصل delivered،
     confirm_marketer_order() هترجع False من غير أي تعديل تاني — فمفيش
     احتمال double counting للعدّادات/الأرباح.
   - لو الأوردر اتعمله reject بالفعل (status='rejected')، الـ signal
     **لا** يتخطى الرفض ولا يأكده تلقائيًا — رفض الأدمن قرار نهائي يتقدّم
     على أي تأكيد تلقائي لاحق.
   - الشغل بيحصل جوه transaction.on_commit عشان نتأكد إن الـ Order
     اتحفظ فعليًا في الداتابيز الأول قبل ما نقرأ/نعدّل MarketerOrder
     المرتبطة بيه (تفادي race condition لو الـ save بتاع الأوردر لسه
     جوه transaction مفتوحة).
"""
from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone

from apps.orders.models import Order

from .models import Marketer, MarketerOrder
from .views import confirm_marketer_order


@receiver(post_save, sender=Marketer)
def ensure_cycle_anchor(sender, instance, created, **kwargs):
    """
    لو اتعمل Marketer جديد وعنده cycle_anchor_date فاضي (حالة نادرة)،
    يُعبّأ بتاريخ اليوم تلقائياً.
    """
    if created and not instance.cycle_anchor_date:
        Marketer.objects.filter(pk=instance.pk).update(
            cycle_anchor_date=timezone.localdate()
        )


@receiver(post_save, sender=Order)
def auto_confirm_marketer_order_on_delivery(sender, instance, created, **kwargs):
    """
    Order (apps.orders) post_save — يتفعّل لكل أوردر في النظام، لكن
    بيخرج فورًا لو مش أوردر مسوق أو مش 'delivered' عشان مفيش أي تأثير
    على الأوردرات العادية.
    """
    if created:
        return  # أوردر جديد لسه pending أكيد — مفيش حاجة تتعمل
    if not instance.is_marketer_order:
        return
    if instance.status != 'delivered':
        return

    order_id = instance.pk

    def _try_auto_confirm():
        with transaction.atomic():
            try:
                marketer_order = (
                    MarketerOrder.objects
                    .select_for_update()
                    .select_related('marketer')
                    .get(linked_order_id=order_id)
                )
            except MarketerOrder.DoesNotExist:
                return

            # idempotent: لو مؤكَّد بالفعل (يدوي أو تلقائي قبل كده) أو
            # مرفوض، منلمسوش — راجع التوضيح في docstring الملف فوق.
            if marketer_order.status != 'pending':
                return

            # confirm_marketer_order() بتحفظ status='confirmed' (وكل الحقول
            # المرتبطة) جوه نفسها — مفيش داعي لحفظ status تاني هنا.
            confirm_marketer_order(marketer_order)

    transaction.on_commit(_try_auto_confirm)