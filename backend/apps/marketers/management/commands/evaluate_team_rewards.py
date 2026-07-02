"""
apps/marketers/management/commands/evaluate_team_rewards.py
Part A5 — يُشغَّل دورياً عبر cron لتقييم مكافآت قادة الفِرَق.

نفس المنطق المستخدم في AdminEvaluateTeamRewardsView (services.py).
"""
from django.core.management.base import BaseCommand

from apps.marketers.services import evaluate_all_team_rewards


class Command(BaseCommand):
    help = 'تقييم مكافآت قادة الفِرَق بناءً على مبيعات الفريق في الدورة الحالية.'

    def handle(self, *args, **options):
        created = evaluate_all_team_rewards()
        self.stdout.write(
            self.style.SUCCESS(
                f'evaluate_team_rewards: تم إنشاء {len(created)} مكافأة جديدة.'
            )
        )