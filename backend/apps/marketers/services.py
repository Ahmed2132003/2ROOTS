"""
apps/marketers/services.py

Part A5 — منطق "evaluate_team_rewards" مُستخرج هنا في موديول service
بدل تكراره في الـ management command والـ endpoint اليدوي. الخطة قالت
"(management command أو) endpoint يدوي" — القرار: ننفّذ الاتنين معًا
(الكوماند للتشغيل الدوري/cron، والـ endpoint لزرار يدوي من الداشبورد لو
الأدمن عايز يشغّل التقييم فورًا)، وكلاهما بينادي نفس الدالة هنا، فمفيش
تكرار منطق ولا فرصة لاختلاف نتيجة بين الطريقتين.
"""
from django.db import transaction

from .models import Marketer, RewardTier, TeamReward


def evaluate_team_rewards_for_leader(leader: Marketer):
    """
    يحسب مبيعات فريق هذا القائد الحالية (get_team_sales_for_current_cycle)،
    ويبحث عن أعلى RewardTier نشطة حققها (min_team_sales <= عدد أوردرات
    فريقه الحالية) ولسه ملوش TeamReward بنفس الـ tier في نفس
    current_cycle_number بتاعه.

    لو لقى درجة مستحقة وجديدة → يعمل TeamReward جديد بـ status='pending'
    ويرجعه. لو لا (مفيش درجة محققة، أو محقق بالفعل وأُخِذت قبل كده) → يرجع
    None.

    ملحوظة: لو القائد ارتقى لدرجة أعلى في نفس الدورة (زاد عدد أعضاء فريقه
    ومبيعاتهم)، هيتعمل TeamReward *جديد* للدرجة الأعلى (tier مختلف، فمفيش
    تضارب مع unique_together=(marketer, tier, cycle_number))، والدرجة
    الأقدم تفضل في سجله كما هي — مفيش حذف/استبدال للمكافآت القديمة.
    """
    sales = leader.get_team_sales_for_current_cycle()
    orders_count = sales['orders_count']

    tier = (
        RewardTier.objects
        .filter(is_active=True, min_team_sales__lte=orders_count)
        .order_by('-min_team_sales')
        .first()
    )
    if not tier:
        return None

    already_awarded = TeamReward.objects.filter(
        marketer=leader,
        tier=tier,
        cycle_number=leader.current_cycle_number,
    ).exists()
    if already_awarded:
        return None

    return TeamReward.objects.create(
        marketer=leader,
        tier=tier,
        cycle_number=leader.current_cycle_number,
        team_sales_count_at_award=orders_count,
        reward_amount=tier.reward_amount,
        status='pending',
    )


def evaluate_all_team_rewards():
    """
    يشغّل evaluate_team_rewards_for_leader على كل Marketer بـ role='team_leader'.
    كل قائد جوه transaction.atomic() + select_for_update() منفصلة (نفس
    باترن process_monthly_cycles من Part A3) — قفل صف قائد واحد ميعطلش
    تقييم باقي القادة.

    يرجع list بكل TeamReward اللي اتعملت في هذا التشغيل.
    """
    created = []
    leader_ids = list(
        Marketer.objects.filter(role='team_leader').values_list('id', flat=True)
    )
    for leader_id in leader_ids:
        with transaction.atomic():
            leader = Marketer.objects.select_for_update().get(pk=leader_id)
            reward = evaluate_team_rewards_for_leader(leader)
            if reward:
                created.append(reward)
    return created