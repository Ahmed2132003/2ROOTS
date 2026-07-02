"""
apps/marketers/views.py

Marketer-facing endpoints (self-service) + الـ helper functions المشتركة
اللي بيستوردها dashboard_views.py وsignals.py برضو.

- Part A2: تسجيل الأوردر (marketer-facing)                      ✅
- Part A4: طلب الترقية (marketer-facing)                         ✅
- Part A6: سحب الأرباح (marketer-facing)                          ✅
- Part A8: API المسوق الشخصي (داشبورده الشخصي)                   ✅

⚠️ تحديث (دعوات الانضمام للفريق): `MyTeamLeaderRequestSubmitTeamView`
القديمة (كانت بتضم المرشَّحين مباشرة من غير ما تسألهم) اتلغت، وبدّلناها
بدورة دعوة/رد حقيقية:
  1. MyTeamLeaderRequestNominateView  — القائد يرشّح (يبعت دعوات pending).
  2. MyTeamInvitationsListView        — المرشَّح يشوف الدعوات المعلّقة الجايالوله.
  3. MyTeamInvitationRespondView      — المرشَّح يقبل/يرفض. القبول لا
     يضم المسوّق فورًا فقط — بيفحص هل عدد الموافقين على نفس الطلب وصل
     MARKETER_MIN_TEAM_MEMBERS، ولو وصل تتم الترقية الفعلية هنا.
  الرفض لا يؤثر على العدّاد إطلاقًا، والقائد يقدر يرشّح مسوّقين بدل
  اللي رفضوا بأي عدد استدعاءات لـ nominate.

⚠️ قرار Part A7: كل الـ Admin Views (اللي كانت هنا في A2/A4/A5/A6)
انتقلت لملف منفصل apps/marketers/dashboard_views.py، عشان نفصل
بوضوح بين endpoints المسوق الشخصية وendpoints إدارة الداشبورد، بدل
ما يتكوم كل حاجة في ملف views.py واحد كبير. الـ helper functions
(_apply_counters, rollback_marketer_order_counters,
_maybe_trigger_leader_request) فضلت هنا لأنها منطق core مشترك،
وdashboard_views.py بيستوردها من هنا. راجع تقرير "Part A7" في
PROGRESS.md لتفاصيل القرار وأي كود قديم اتأثر.

⚠️ قرارات Part A8 (راجع تقرير "Part A8" الكامل في PROGRESS.md):
1. تم حذف IsMarketerOrTeamLeader (كانت غير مستخدمة فعليًا — الملاحظة
   المفتوحة #7) واستبدالها بـ IsTeamLeader من permissions.py، مُستخدمة
   في الـ3 endpoints الجديدة المخصّصة لقادة الفرق فقط.
2. GET /me/orders/ اندمج مع POST /me/orders/ في view واحدة
   (MyMarketerOrderListCreateView) بدل ما تكون منفصلة — نفس المسار
   بالضبط زي ما طلبت الخطة، الفرق بس في الـ HTTP method.
3. GET+POST /me/withdrawals/ (كانت متقسومة من A6: POST على
   /me/withdrawals/ وGET على /me/withdrawals/list/) — اندمجوا هنا في
   endpoint واحد (MyWithdrawalListCreateView) على /me/withdrawals/
   فقط، و/me/withdrawals/list/ اتشالت. هذا قرار مؤكَّد من صاحب
   المشروع في نفس جلسة A8 (كان سؤال مفتوح من تقرير A6).

⚠️ تحديث (تكامل أوردرات المسوقين بنظام الأوردرات الأساسي):
- إضافة confirm_marketer_order() كدالة مشتركة تحتوي بالظبط نفس منطق
  AdminMarketerOrderConfirmView القديم (كان مكتوب inline في
  dashboard_views.py). الهدف: نفس منطق التأكيد يُستخدم سواء كان
  التأكيد يدوي (الأدمن بيدوس "تأكيد" في صفحة المراجعة) أو تلقائي
  (لما الـ Order المرتبط يوصل لحالة 'delivered' — راجع
  apps/marketers/signals.py: auto_confirm_marketer_order_on_delivery).
  كده مفيش تكرار منطق ولا فرصة لاختلاف نتيجة بين الطريقتين، ومفيش
  احتمال double counting لأن الدالة idempotent (بترجع False من غير
  ما تعمل حاجة لو الأوردر مؤكَّد بالفعل).

⚠️ تحديث (خصم المخزون لأوردرات المسوقين):
- قرار مؤكَّد من صاحب المشروع: المخزون يُخصم فقط عند تأكيد الأدمن
  (status → confirmed)، مش وقت تسجيل المسوق للأوردر (status=pending)،
  لأن الأوردر ممكن يترفض. نفس فلسفة CreateOrderSerializer.create()
  في apps/orders/serializers.py (خصم مباشر: stock.quantity -= qty)
  بدون select_for_update إضافي (الـ caller بيعمل select_for_update
  على الـ MarketerOrder نفسه أصلاً، راجع dashboard_views.py).
  لو الأوردر اتأكد وبعدين اترفض، المخزون بيرجع تاني في
  rollback_marketer_order_counters() — نفس فلسفة CancelOrderView في
  apps/orders/order_controller.py (stock.quantity += qty).
  لو الأوردر مالوش variant (نادر، variant اتحذف بعد التسجيل)، يتجاهل
  خصم/إرجاع المخزون بأمان (نفس شرط "if item.variant" المستخدم في
  CancelOrderView).
"""
from django.conf import settings
from django.db import transaction
from django.db.models import Max
from django.shortcuts import get_object_or_404
from django.utils import timezone

from rest_framework import generics
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from .models import (
    Marketer, MarketerProductPrice, MarketerOrder, MarketerOrderItem, RewardTier, TeamReward,
    TeamLeaderRequest, TeamLeaderRequestMember, WithdrawalRequest,
)

from .permissions import IsMarketer, IsTeamLeader
from .serializers import (
    MarketerSerializer, MarketerOrderCreateSerializer, MarketerOrderSerializer,
    MarketerProductPriceSerializer, TeamLeaderRequestSerializer,
    TeamLeaderRequestMemberSerializer,
    MarketerBriefSerializer, TeamMemberStatusSerializer, TeamRewardSerializer,
    WithdrawalRequestSerializer, WithdrawalRequestCreateSerializer,
)


# ═════════════════════════════════════════════════════════════════════════════
# Counters logic (A2) — قابلة لإعادة الاستخدام
# مستخدمة هنا (مفيش حالياً) وفي dashboard_views.py (AdminMarketerOrderConfirmView/RejectView)
# وفي signals.py (auto_confirm_marketer_order_on_delivery)
# ═════════════════════════════════════════════════════════════════════════════

def _apply_counters(marketer: Marketer, profit_amount, sign: int):
    """
    sign = +1  → إضافة العدادات (عند confirm)
    sign = -1  → إرجاعها (rollback عند reject بعد ما كان confirmed)
    """
    marketer.monthly_completed_orders_count = max(
        0, marketer.monthly_completed_orders_count + sign * 1
    )
    marketer.lifetime_total_orders = max(
        0, marketer.lifetime_total_orders + sign * 1
    )
    marketer.monthly_profit_balance = marketer.monthly_profit_balance + (sign * profit_amount)
    marketer.lifetime_total_profit  = marketer.lifetime_total_profit  + (sign * profit_amount)
    marketer.save(update_fields=[
        'monthly_completed_orders_count',
        'lifetime_total_orders',
        'monthly_profit_balance',
        'lifetime_total_profit',
    ])


def _restore_marketer_order_stock(order: MarketerOrder):
    """
    يرجّع الكمية المحجوزة للمخزون — يُستخدم عند رفض أوردر كان مؤكَّداً
    بالفعل (المخزون كان اتخصم وقت التأكيد). نفس فلسفة CancelOrderView
    في apps/orders/order_controller.py.
    """
    items = list(order.items.all())
    if items:
        for item in items:
            if item.variant_id:
                stock = item.variant.stock
                stock.quantity = max(0, stock.quantity - item.quantity)
                stock.save(update_fields=['quantity'])
    elif order.variant_id:
        stock = order.variant.stock
        stock.quantity = max(0, stock.quantity - order.quantity)
        stock.save(update_fields=['quantity'])


def rollback_marketer_order_counters(order: MarketerOrder):
    """
    يرجع كل العدادات اللي كانت اتزودت عند confirm، ويصفّر is_counted.
    كمان بيرجّع المخزون اللي كان اتخصم وقت التأكيد (راجع تحديث "خصم
    المخزون لأوردرات المسوقين" أعلى الملف).
    idempotent: لو الأوردر مكنش is_counted، مفيش حاجة تتعمل (لا عدادات
    ولا مخزون، لأن المخزون أصلاً ما كانش اتخصم).
    """
    if not order.is_counted:
        return
    _apply_counters(order.marketer, order.profit_amount, sign=-1)
    _restore_marketer_order_stock(order)
    order.is_counted = False
    order.counted_in_cycle_number = None
    order.counted_towards_leader = None
    order.save(update_fields=[
        'is_counted', 'counted_in_cycle_number', 'counted_towards_leader',
    ])


# ═════════════════════════════════════════════════════════════════════════════
# تأكيد أوردر المسوق — منطق مشترك (يدوي من الأدمن + تلقائي عند delivered)
# ═════════════════════════════════════════════════════════════════════════════

def confirm_marketer_order(order: MarketerOrder) -> bool:
    """
    يأكد MarketerOrder: نفس المنطق اللي كان inline في
    AdminMarketerOrderConfirmView بالظبط، بالإضافة لخصم المخزون
    (راجع تحديث "خصم المخزون لأوردرات المسوقين" أعلى الملف) — مستخرج
    هنا عشان يُستخدم من مصدرين: الزرار اليدوي في صفحة المراجعة، أو signal
    التأكيد التلقائي عند وصول الـ Order المرتبط لحالة 'delivered'.

    idempotent: لو الأوردر مؤكَّد بالفعل، يرجع False من غير أي تعديل —
    ده اللي بيمنع الـ double counting (وخصم المخزون مرتين) بين التأكيد
    اليدوي والتلقائي.

    ⚠️ المنادي مسؤول عن قفل الصف (select_for_update) قبل النداء لو محتاج
    حماية من race condition — الدالة نفسها مبتعملش القفل عشان تفضل قابلة
    لإعادة الاستخدام جوه transaction.atomic() مختلفة (راجع dashboard_views.py
    وsignals.py لطريقة الاستخدام في كل سياق).

    يرجع True لو اتأكد فعليًا، False لو كان already confirmed.
    """
    if order.status == 'confirmed':
        return False

    marketer = order.marketer

    # counted_towards_leader — راجع قرار A1
    if marketer.role == 'team_leader':
        counted_towards = marketer.credited_team_leader
    else:
        counted_towards = marketer.team_leader

    order.status                  = 'confirmed'
    order.is_counted              = True
    order.counted_in_cycle_number = marketer.current_cycle_number
    order.counted_towards_leader  = counted_towards
    order.confirmed_at            = timezone.now()
    order.save(update_fields=[
        'status', 'is_counted', 'counted_in_cycle_number',
        'counted_towards_leader', 'confirmed_at',
    ])

    # خصم المخزون عند التأكيد فقط (مش وقت التسجيل) — راجع تحديث أعلى الملف.
    # لو مفيش variant (منتج simple بدون ألوان/مقاسات، أو variant اتحذف)
    # يتجاهل الخصم بأمان بدل ما يكسر التأكيد.
    if order.variant_id:
        stock = order.variant.stock
        stock.quantity = max(0, stock.quantity - order.quantity)
        stock.save(update_fields=['quantity'])

    _apply_counters(marketer, order.profit_amount, sign=+1)

    # A4: طرح سؤال الترقية لو المسوق وصل للتارجت
    marketer.refresh_from_db(fields=[
        'monthly_completed_orders_count', 'role',
    ])
    _maybe_trigger_leader_request(marketer)

    return True


# ═════════════════════════════════════════════════════════════════════════════
# A4 helper — يُطرح سؤال الترقية لما المسوق يحقق التارجت
# ═════════════════════════════════════════════════════════════════════════════

def _maybe_trigger_leader_request(marketer: Marketer):
    """
    يُستدعى بعد كل confirm ناجح.
    لو المسوق وصل للتارجت الشهري ولسه role=marketer ومفيش طلب نشط،
    ينشئ TeamLeaderRequest جديد بـ status=awaiting_response.
    مش ترقية تلقائية — بس طرح السؤال.
    """
    target = getattr(settings, 'MARKETER_MONTHLY_TARGET_ORDERS', 10)

    if marketer.role != 'marketer':
        return
    if marketer.monthly_completed_orders_count < target:
        return

    active_exists = TeamLeaderRequest.objects.filter(
        marketer=marketer,
    ).exclude(
        status__in=['completed', 'declined', 'cancelled'],
    ).exists()

    if active_exists:
        return

    TeamLeaderRequest.objects.create(
        marketer=marketer,
        status='awaiting_response',
    )


# ═════════════════════════════════════════════════════════════════════════════
# Marketer-facing — A8: بيانات المسوق نفسه
# ═════════════════════════════════════════════════════════════════════════════

class MyMarketerDetailView(APIView):
    """
    GET /api/marketers/me/
    بيانات المسوق الحالي + عدّاداته الشهرية والتراكمية بالكامل
    (نفس حقول MarketerSerializer — موجودة فيها فعليًا من A1).
    """
    permission_classes = [IsMarketer]

    def get(self, request):
        marketer = request.user.marketer_profile
        return Response(MarketerSerializer(marketer).data)


# ═════════════════════════════════════════════════════════════════════════════
# Marketer-facing — A2 + A8: تسجيل الأوردرات وعرض سجلها
# ═════════════════════════════════════════════════════════════════════════════

class MyMarketerOrderListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/marketers/me/orders/  — سجل أوردرات المسوق (فلترة ?status=، paginated)
    POST /api/marketers/me/orders/  — تسجيل أوردر جديد (Part A2 + تكامل الأوردرات:
                                       بيعمل Order حقيقي مرتبط فورًا، راجع
                                       MarketerOrderCreateSerializer.create)

    قرار A8: كانت في الأصل CreateAPIView بس (POST فقط) — تم تحويلها
    لـ ListCreateAPIView عشان تدعم GET كمان على نفس المسار بالضبط، زي
    ما طلبت خطة Part A8 الأصلية. الـ pagination الافتراضية من settings
    (PAGE_SIZE=12) تنطبق تلقائيًا على GET.
    """
    permission_classes = [IsMarketer]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return MarketerOrderCreateSerializer
        return MarketerOrderSerializer

    def get_queryset(self):
        marketer = self.request.user.marketer_profile
        qs = (
            MarketerOrder.objects
            .filter(marketer=marketer)
            .select_related('product', 'shipping_region', 'linked_order')
        )
        status_param = self.request.query_params.get('status')
        if status_param:
            qs = qs.filter(status=status_param)
        return qs  # ordering الافتراضي من Meta.ordering = ['-created_at']


# ═════════════════════════════════════════════════════════════════════════════
# Marketer-facing — A8: الأسعار المحددة له على المنتجات
# ═════════════════════════════════════════════════════════════════════════════

class MyProductPricesListView(generics.ListAPIView):
    """GET /api/marketers/me/product-prices/ — أسعاره (تكلفته) على كل منتج."""
    permission_classes = [IsMarketer]
    serializer_class   = MarketerProductPriceSerializer

    def get_queryset(self):
        marketer = self.request.user.marketer_profile
        return (
            MarketerProductPrice.objects
            .filter(marketer=marketer)
            .select_related('product')
            .order_by('-updated_at')
        )


# ═════════════════════════════════════════════════════════════════════════════
# Marketer-facing — A4: طلب الترقية
# ═════════════════════════════════════════════════════════════════════════════

class MyTeamLeaderRequestView(APIView):
    """GET /api/marketers/me/team-leader-request/ — آخر طلب نشط للمسوق."""
    permission_classes = [IsMarketer]

    def get(self, request):
        marketer = request.user.marketer_profile
        req = (
            TeamLeaderRequest.objects
            .filter(marketer=marketer)
            .exclude(status__in=['completed', 'declined', 'cancelled'])
            .order_by('-triggered_at')
            .first()
        )
        if not req:
            return Response({"detail": "لا يوجد طلب ترقية نشط."}, status=status.HTTP_200_OK)
        return Response(TeamLeaderRequestSerializer(req).data)


class MyTeamLeaderRequestRespondView(APIView):
    """
    POST /api/marketers/me/team-leader-request/{id}/respond/
    body: {accepted: true/false}
    """
    permission_classes = [IsMarketer]

    def post(self, request, pk):
        marketer = request.user.marketer_profile
        req = get_object_or_404(
            TeamLeaderRequest,
            pk=pk,
            marketer=marketer,
            status='awaiting_response',
        )

        accepted = request.data.get('accepted')
        if accepted is None:
            return Response(
                {"detail": "يجب إرسال حقل 'accepted' بقيمة true أو false."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not accepted:
            req.status      = 'declined'
            req.responded_at = timezone.now()
            req.save(update_fields=['status', 'responded_at'])
            return Response({"detail": "تم رفض طلب الترقية."})

        req.status       = 'accepted_pending_requirement'
        req.responded_at = timezone.now()
        req.save(update_fields=['status', 'responded_at'])
        return Response(TeamLeaderRequestSerializer(req).data)


class AvailableForTeamView(generics.ListAPIView):
    """
    GET /api/marketers/available-for-team/
    كل المسوقين role=marketer وteam_leader is None
    (غير منضمين لأي فريق حالياً).
    """
    permission_classes = [IsMarketer]
    serializer_class   = MarketerBriefSerializer

    def get_queryset(self):
        me = self.request.user.marketer_profile
        return (
            Marketer.objects
            .filter(role='marketer', team_leader__isnull=True)
            .exclude(pk=me.pk)
            .select_related('user')
        )


# ═════════════════════════════════════════════════════════════════════════════
# Marketer-facing — (تحديث) دعوات الانضمام للفريق
# القائد يرشّح → يتبعت دعوة (pending) لكل مرشَّح → المرشَّح يقبل/يرفض
# من عنده هو، والترقية بتتم تلقائيًا لما عدد الموافقين يوصل الحد الأدنى.
# ═════════════════════════════════════════════════════════════════════════════

class MyTeamLeaderRequestNominateView(APIView):
    """
    POST /api/marketers/me/team-leader-request/{id}/nominate/
    body: {marketer_ids: [...]}

    يرسل دعوات (TeamLeaderRequestMember status='pending') لكل مسوق في
    القائمة، بدل ضمّهم مباشرة. الترقية الفعلية بتحصل تلقائيًا لما عدد
    الموافقين (status='accepted') يوصل MARKETER_MIN_TEAM_MEMBERS —
    راجع MyTeamInvitationRespondView تحت.

    يقبل استدعاءات متعددة على نفس الطلب (القائد يقدر يرشّح دفعات
    مختلفة، مثلاً بعد ما حد يرفض). لو مسوق اتبعتله دعوة قبل كده على
    نفس الطلب:
      - لو لسه pending أو accepted → يتجاهله (متكررش الدعوة).
      - لو كان declined → يعيد فتح الدعوة (status → pending, responded_at
        → None) — القائد بيحاول يرشّحه تاني.
    """
    permission_classes = [IsMarketer]

    @transaction.atomic
    def post(self, request, pk):
        marketer = get_object_or_404(
            Marketer.objects.select_for_update(),
            user=request.user,
        )
        req = get_object_or_404(
            TeamLeaderRequest,
            pk=pk,
            marketer=marketer,
            status='accepted_pending_requirement',
        )

        marketer_ids = request.data.get('marketer_ids', [])
        if not isinstance(marketer_ids, list) or not marketer_ids:
            return Response(
                {"detail": "يجب تقديم قائمة marketer_ids بها عنصر واحد على الأقل."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        candidates = (
            Marketer.objects
            .select_for_update()
            .filter(pk__in=marketer_ids)
        )
        candidates_map = {m.pk: m for m in candidates}

        existing_members = {
            mem.marketer_id: mem
            for mem in TeamLeaderRequestMember.objects.filter(
                request=req, marketer_id__in=marketer_ids,
            )
        }

        unavailable      = []
        already_invited  = []
        newly_invited    = []

        for mid in marketer_ids:
            m = candidates_map.get(mid)
            if not m or m.pk == marketer.pk or m.role != 'marketer' or m.team_leader_id is not None:
                unavailable.append(mid)
                continue

            existing = existing_members.get(mid)
            if existing:
                if existing.status in ('pending', 'accepted'):
                    already_invited.append(mid)
                    continue
                # كان declined قبل كده — نعيد فتح الدعوة
                existing.status       = 'pending'
                existing.responded_at = None
                existing.save(update_fields=['status', 'responded_at'])
                newly_invited.append(mid)
            else:
                TeamLeaderRequestMember.objects.create(
                    request=req, marketer=m, status='pending',
                )
                newly_invited.append(mid)

        return Response(
            {
                "detail": f"تم إرسال {len(newly_invited)} دعوة.",
                "invited_ids": newly_invited,
                "already_invited_ids": already_invited,
                "unavailable_ids": unavailable,
            },
            status=status.HTTP_200_OK,
        )


class MyTeamInvitationsListView(generics.ListAPIView):
    """
    GET /api/marketers/me/team-invitations/
    الدعوات المعلّقة (status='pending') المرسلة للمسوّق الحالي عشان
    ينضم لفريق قائد معيّن.
    """
    permission_classes = [IsMarketer]
    serializer_class   = TeamLeaderRequestMemberSerializer

    def get_queryset(self):
        marketer = self.request.user.marketer_profile
        return (
            TeamLeaderRequestMember.objects
            .filter(marketer=marketer, status='pending')
            .select_related('request__marketer__user')
            .order_by('-id')
        )


class MyTeamInvitationRespondView(APIView):
    """
    POST /api/marketers/me/team-invitations/{id}/respond/
    body: {accepted: true/false}

    - رفض → status='declined'. المسوق ما بيتضمش للفريق، وما بيتحسبش
      من الـ10 المطلوبين. القائد لازم يرشّح حد بدله (nominate تاني).
    - قبول → status='accepted'. لو ده خلّى عدد الموافقين على نفس
      الطلب يوصل MARKETER_MIN_TEAM_MEMBERS، تتم الترقية فورًا: القائد
      role='team_leader'، وكل الموافقين بيتربطوا بيه (team_leader FK)،
      والطلب يتقفل status='completed'.
    """
    permission_classes = [IsMarketer]

    @transaction.atomic
    def post(self, request, pk):
        marketer = get_object_or_404(
            Marketer.objects.select_for_update(),
            user=request.user,
        )
        member = get_object_or_404(
            TeamLeaderRequestMember.objects.select_related('request'),
            pk=pk,
            marketer=marketer,
            status='pending',
        )

        accepted = request.data.get('accepted')
        if accepted is None:
            return Response(
                {"detail": "يجب إرسال حقل 'accepted' بقيمة true أو false."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not accepted:
            member.status       = 'declined'
            member.responded_at = timezone.now()
            member.save(update_fields=['status', 'responded_at'])
            return Response({"detail": "تم رفض دعوة الانضمام."})

        if marketer.team_leader_id is not None:
            return Response(
                {"detail": "أنت منضم بالفعل لفريق آخر، لا يمكنك قبول هذه الدعوة."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        member.status       = 'accepted'
        member.responded_at = timezone.now()
        member.save(update_fields=['status', 'responded_at'])

        req = TeamLeaderRequest.objects.select_for_update().get(pk=member.request_id)

        # لو الطلب اتقفل بالفعل (اكتمل الفريق قبل كده لأي سبب) منعمل حاجة تانية
        if req.status != 'accepted_pending_requirement':
            return Response({"detail": "تم قبول الدعوة."})

        min_members = getattr(settings, 'MARKETER_MIN_TEAM_MEMBERS', 10)
        accepted_qs = TeamLeaderRequestMember.objects.select_for_update().filter(
            request=req, status='accepted',
        )
        accepted_count = accepted_qs.count()

        if accepted_count < min_members:
            return Response({"detail": "تم قبول الدعوة."})

        # ── اكتمل الفريق → نفّذ الترقية الآن ───────────────────────────────
        leader = Marketer.objects.select_for_update().get(pk=req.marketer_id)

        accepted_member_ids = list(accepted_qs.values_list('marketer_id', flat=True))
        # نفلتر team_leader__isnull=True زيادة أمان: لو حد من الموافقين
        # انضم لفريق تاني في نفس اللحظة (سيناريو نادر جدًا)، نتجاهله من
        # الربط الفعلي بدل ما نكسر سلامة بياناته.
        team_marketers = Marketer.objects.select_for_update().filter(
            pk__in=accepted_member_ids, team_leader__isnull=True,
        )

        leader.credited_team_leader  = leader.team_leader
        leader.role                  = 'team_leader'
        leader.promoted_to_leader_at = timezone.now()
        leader.save(update_fields=[
            'credited_team_leader', 'role', 'promoted_to_leader_at',
        ])

        for m in team_marketers:
            m.team_leader = leader
            m.save(update_fields=['team_leader'])

        req.status = 'completed'
        req.save(update_fields=['status'])

        return Response({
            "detail": "تم قبول الدعوة، واكتمل الفريق — تمت الترقية لـ Team Leader.",
        })


# ═════════════════════════════════════════════════════════════════════════════
# Marketer-facing — A8: قسم القائد فقط (team_leader) — IsTeamLeader
# ═════════════════════════════════════════════════════════════════════════════

class MyTeamMembersListView(generics.ListAPIView):
    """
    GET /api/marketers/me/team/ (IsTeamLeader فقط — غير ذلك 403)
    قائمة أفراد الفريق الحاليين + عدّاد كل واحد منهم (الشهري) + هل عمل
    أوردرات الشهر ده ولا لأ + تاريخ آخر أوردر سجّله (بأي حالة، مش بس
    confirmed، عشان القائد يقدر يتابع نشاط أعضائه فعليًا).

    `last_order_at` بتتحسب بـ annotation واحدة على الـ queryset
    (Max) بدل query إضافي لكل عضو — أداء أفضل مع فريق كبير.
    """
    permission_classes = [IsTeamLeader]
    serializer_class   = TeamMemberStatusSerializer

    def get_queryset(self):
        leader = self.request.user.marketer_profile
        return (
            leader.team_members
            .select_related('user')
            .annotate(last_order_at=Max('orders__created_at'))
            .order_by('-created_at')
        )


class MyTeamSalesSummaryView(APIView):
    """
    GET /api/marketers/me/team/sales-summary/ (IsTeamLeader فقط)
    مبيعات الفريق الشهرية الحالية (من get_team_sales_for_current_cycle
    الموجودة بالفعل من A5 — مفيش إعادة حساب هنا) + تقدّم القائد نحو
    أقرب RewardTier القادمة + عرض كل الدرجات النشطة وحالة كل واحدة
    (محققة أو لسه).

    ملاحظة توضيحية مهمة (راجع A5): النتيجة هنا بطبيعتها **لا تشمل**
    مبيعات القائد الشخصية — لو سجّل أوردر بنفسه بعد ترقيته، الأوردر
    ده بيتحسب لـ credited_team_leader بتاعه (القائد القديم لو موجود)،
    مش لفريقه الجديد. مفيش فلترة إضافية مطلوبة هنا، الاستعلام الأساسي
    (get_team_sales_for_current_cycle) بيستثنيه تلقائيًا.
    """
    permission_classes = [IsTeamLeader]

    def get(self, request):
        leader = request.user.marketer_profile
        sales = leader.get_team_sales_for_current_cycle()
        orders_count = sales['orders_count']

        tiers = RewardTier.objects.filter(is_active=True).order_by('min_team_sales')
        tiers_data = []
        next_tier = None
        for tier in tiers:
            achieved = orders_count >= tier.min_team_sales
            tiers_data.append({
                'id': tier.id,
                'min_team_sales': tier.min_team_sales,
                'reward_amount': tier.reward_amount,
                'achieved': achieved,
            })
            if not achieved and next_tier is None:
                next_tier = tier

        next_tier_data = None
        if next_tier is not None:
            next_tier_data = {
                'id': next_tier.id,
                'min_team_sales': next_tier.min_team_sales,
                'reward_amount': next_tier.reward_amount,
                'orders_remaining': next_tier.min_team_sales - orders_count,
            }

        return Response({
            'cycle_number': leader.current_cycle_number,
            'orders_count': orders_count,
            'total_profit': sales['total_profit'],
            'tiers': tiers_data,
            'next_tier': next_tier_data,
        })


class MyTeamRewardsListView(generics.ListAPIView):
    """GET /api/marketers/me/rewards/ (IsTeamLeader فقط) — سجل مكافآته كقائد."""
    permission_classes = [IsTeamLeader]
    serializer_class   = TeamRewardSerializer

    def get_queryset(self):
        leader = self.request.user.marketer_profile
        return (
            TeamReward.objects
            .filter(marketer=leader)
            .select_related('tier')
            .order_by('-created_at')
        )


# ═════════════════════════════════════════════════════════════════════════════
# Marketer-facing — A6 + A8: طلبات سحب الأرباح (مُدمَجة في endpoint واحد)
# ═════════════════════════════════════════════════════════════════════════════

class MyWithdrawalListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/marketers/me/withdrawals/  — سجل طلبات سحب المسوق (paginated)
    POST /api/marketers/me/withdrawals/  — تقديم طلب سحب جديد

    قرار A8 (مؤكَّد من صاحب المشروع): قبل كده كان GET على مسار منفصل
    /me/withdrawals/list/ وPOST على /me/withdrawals/ — تم توحيدهم هنا
    في endpoint واحد بنفس المسار المطلوب في خطة A8 الأصلية، و/list/
    اتشالت نهائيًا. الـ create() متعمّل override يدوي (مش
    perform_create العادية) لأنه لازم يفضل بالضبط نفس منطق A6
    (select_for_update على المسوق + فحص الرصيد + رسالة خطأ مخصصة)،
    والـ GET (list) بيستخدم سلوك ListAPIView الافتراضي عادي
    (pagination تلقائي من settings).

    قرار A6 الأساسي (لم يتغيّر): المبلغ لا يُخصم عند تقديم الطلب —
    يُخصم فقط عند approve من الأدمن (راجع dashboard_views.py).
    """
    permission_classes = [IsMarketer]

    def get_queryset(self):
        marketer = self.request.user.marketer_profile
        return WithdrawalRequest.objects.filter(marketer=marketer).order_by('-created_at')

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return WithdrawalRequestCreateSerializer
        return WithdrawalRequestSerializer

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        marketer = get_object_or_404(
            Marketer.objects.select_for_update(),
            user=request.user,
        )

        serializer = WithdrawalRequestCreateSerializer(
            data=request.data,
            context={'marketer': marketer},
        )
        serializer.is_valid(raise_exception=True)
        amount = serializer.validated_data['amount']

        # validate: amount <= الرصيد المتاح الفعلي
        if amount > marketer.monthly_profit_balance:
            return Response(
                {
                    "detail": (
                        f"الرصيد المتاح حالياً {marketer.monthly_profit_balance} جنيه فقط."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        withdrawal = WithdrawalRequest.objects.create(
            marketer=marketer,
            amount=amount,
            status='pending',
            cycle_number=marketer.current_cycle_number,
        )

        return Response(
            WithdrawalRequestSerializer(withdrawal).data,
            status=status.HTTP_201_CREATED,
        )