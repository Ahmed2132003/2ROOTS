from datetime import timedelta
from decimal import Decimal
from io import StringIO

from django.conf import settings
from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.products.models import Category, Product
from apps.orders.models import ShippingRegion
from apps.marketers.models import (
    Marketer, MarketerOrder, MarketerProductPrice,
    TeamLeaderRequest, TeamLeaderRequestMember, WithdrawalRequest,
    RewardTier, TeamReward,
)
from apps.users.models import User


# ═════════════════════════════════════════════════════════════════════════════
# Part A2 — تسجيل الأوردر + تأكيد/رفض الأدمن
# ═════════════════════════════════════════════════════════════════════════════

class MarketerOrderFlowTests(TestCase):
    """
    تغطي Part A2:
    - تسجيل أوردر من المسوق (نجاح / رفض لعدم وجود سعر / validation الكمية والسعر)
    - تأكيد الأدمن وتحديث العدادات (شهري + تراكمي)
    - رفض الأدمن بعد التأكيد ورجوع العدادات (rollback)
    - رفض أوردر pending عادي (بدون تأكيد سابق)
    - قائمة الأدمن + الفلترة
    - منع غير المسوق من تسجيل أوردر
    """

    def setUp(self):
        self.client = APIClient()

        self.admin_user = User.objects.create_user(
            username='admin1', email='admin1@test.com',
            password='pass12345', role='admin',
        )
        self.marketer_user = User.objects.create_user(
            username='marketer1', email='marketer1@test.com',
            password='pass12345', role='marketer',
        )
        self.marketer = Marketer.objects.create(
            user=self.marketer_user,
            cycle_anchor_date=timezone.localdate(),
        )

        self.category = Category.objects.create(name='Test Category')
        self.product = Product.objects.create(
            category=self.category, name='Test Product',
            base_price=Decimal('100.00'),
        )

        self.price_entry = MarketerProductPrice.objects.create(
            marketer=self.marketer, product=self.product,
            assigned_price=Decimal('50.00'),
        )

        self.shipping_region = ShippingRegion.objects.create(
            name='Cairo', price=Decimal('30.00'),
        )

    def _auth_as(self, user):
        self.client.force_authenticate(user=user)

    # ── Creation ──────────────────────────────────────────────────────────

    def test_marketer_can_create_order(self):
        self._auth_as(self.marketer_user)
        resp = self.client.post('/api/marketers/me/orders/', {
            'product_id': self.product.id,
            'quantity': 2,
            'sale_price_per_unit': '80.00',
            'customer_name': 'Ahmed',
            'customer_phone': '0100000000',
            'shipping_region_id': self.shipping_region.id,
            'shipping_address': '123 Test Street',
        }, format='json')

        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.data)
        order = MarketerOrder.objects.get()
        self.assertEqual(order.status, 'pending')
        self.assertEqual(order.assigned_price_per_unit, Decimal('50.00'))
        self.assertEqual(order.profit_amount, Decimal('60.00'))  # (80-50)*2

    def test_create_order_fails_without_price_entry(self):
        other_product = Product.objects.create(
            category=self.category, name='No Price Product',
            base_price=Decimal('30.00'),
        )
        self._auth_as(self.marketer_user)
        resp = self.client.post('/api/marketers/me/orders/', {
            'product_id': other_product.id,
            'quantity': 1,
            'sale_price_per_unit': '40.00',
            'customer_name': 'Sara',
            'customer_phone': '0111111111',
        }, format='json')

        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(MarketerOrder.objects.count(), 0)

    def test_create_order_validates_quantity_and_price(self):
        self._auth_as(self.marketer_user)

        resp_qty = self.client.post('/api/marketers/me/orders/', {
            'product_id': self.product.id,
            'quantity': 0,
            'sale_price_per_unit': '80.00',
            'customer_name': 'Ahmed',
            'customer_phone': '0100000000',
        }, format='json')
        self.assertEqual(resp_qty.status_code, status.HTTP_400_BAD_REQUEST)

        resp_price = self.client.post('/api/marketers/me/orders/', {
            'product_id': self.product.id,
            'quantity': 1,
            'sale_price_per_unit': '0',
            'customer_name': 'Ahmed',
            'customer_phone': '0100000000',
        }, format='json')
        self.assertEqual(resp_price.status_code, status.HTTP_400_BAD_REQUEST)

        self.assertEqual(MarketerOrder.objects.count(), 0)

    def test_non_marketer_cannot_create_order(self):
        self._auth_as(self.admin_user)
        resp = self.client.post('/api/marketers/me/orders/', {
            'product_id': self.product.id,
            'quantity': 1,
            'sale_price_per_unit': '60.00',
            'customer_name': 'X',
            'customer_phone': '0100000000',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    # ── Confirm ───────────────────────────────────────────────────────────

    def test_admin_confirm_updates_counters(self):
        order = MarketerOrder.objects.create(
            marketer=self.marketer, product=self.product, quantity=3,
            sale_price_per_unit=Decimal('90.00'),
            assigned_price_per_unit=Decimal('50.00'),
            profit_amount=Decimal('120.00'),
            customer_name='Mona', customer_phone='0122222222',
        )
        self._auth_as(self.admin_user)
        resp = self.client.patch(f'/api/dashboard/marketer-orders/{order.id}/confirm/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.data)

        order.refresh_from_db()
        self.marketer.refresh_from_db()

        self.assertEqual(order.status, 'confirmed')
        self.assertTrue(order.is_counted)
        self.assertEqual(order.counted_in_cycle_number, 0)
        self.assertEqual(self.marketer.monthly_completed_orders_count, 1)
        self.assertEqual(self.marketer.lifetime_total_orders, 1)
        self.assertEqual(self.marketer.monthly_profit_balance, Decimal('120.00'))
        self.assertEqual(self.marketer.lifetime_total_profit, Decimal('120.00'))

    def test_confirm_twice_rejected(self):
        order = MarketerOrder.objects.create(
            marketer=self.marketer, product=self.product, quantity=1,
            sale_price_per_unit=Decimal('60.00'),
            assigned_price_per_unit=Decimal('50.00'),
            profit_amount=Decimal('10.00'),
            customer_name='X', customer_phone='0100000000',
        )
        self._auth_as(self.admin_user)
        self.client.patch(f'/api/dashboard/marketer-orders/{order.id}/confirm/')
        resp = self.client.patch(f'/api/dashboard/marketer-orders/{order.id}/confirm/')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    # ── Reject after confirm (rollback) ──────────────────────────────────

    def test_reject_after_confirm_rolls_back_counters(self):
        order = MarketerOrder.objects.create(
            marketer=self.marketer, product=self.product, quantity=2,
            sale_price_per_unit=Decimal('80.00'),
            assigned_price_per_unit=Decimal('50.00'),
            profit_amount=Decimal('60.00'),
            customer_name='Karim', customer_phone='0133333333',
        )
        self._auth_as(self.admin_user)
        self.client.patch(f'/api/dashboard/marketer-orders/{order.id}/confirm/')
        resp = self.client.patch(f'/api/dashboard/marketer-orders/{order.id}/reject/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.data)

        order.refresh_from_db()
        self.marketer.refresh_from_db()

        self.assertEqual(order.status, 'rejected')
        self.assertFalse(order.is_counted)
        self.assertIsNone(order.counted_in_cycle_number)
        self.assertEqual(self.marketer.monthly_completed_orders_count, 0)
        self.assertEqual(self.marketer.lifetime_total_orders, 0)
        self.assertEqual(self.marketer.monthly_profit_balance, Decimal('0.00'))
        self.assertEqual(self.marketer.lifetime_total_profit, Decimal('0.00'))

    def test_reject_pending_order_without_prior_confirm(self):
        order = MarketerOrder.objects.create(
            marketer=self.marketer, product=self.product, quantity=1,
            sale_price_per_unit=Decimal('70.00'),
            assigned_price_per_unit=Decimal('50.00'),
            profit_amount=Decimal('20.00'),
            customer_name='Laila', customer_phone='0144444444',
        )
        self._auth_as(self.admin_user)
        resp = self.client.patch(f'/api/dashboard/marketer-orders/{order.id}/reject/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        order.refresh_from_db()
        self.marketer.refresh_from_db()
        self.assertEqual(order.status, 'rejected')
        self.assertFalse(order.is_counted)
        self.assertEqual(self.marketer.monthly_completed_orders_count, 0)
        self.assertEqual(self.marketer.monthly_profit_balance, Decimal('0.00'))

    def test_reject_already_rejected_returns_400(self):
        order = MarketerOrder.objects.create(
            marketer=self.marketer, product=self.product, quantity=1,
            sale_price_per_unit=Decimal('70.00'),
            assigned_price_per_unit=Decimal('50.00'),
            profit_amount=Decimal('20.00'),
            customer_name='X', customer_phone='0100000000',
            status='rejected',
        )
        self._auth_as(self.admin_user)
        resp = self.client.patch(f'/api/dashboard/marketer-orders/{order.id}/reject/')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    # ── Listing (dashboard) ──────────────────────────────────────────────

    def test_admin_can_list_and_filter_orders(self):
        MarketerOrder.objects.create(
            marketer=self.marketer, product=self.product, quantity=1,
            sale_price_per_unit=Decimal('70.00'),
            assigned_price_per_unit=Decimal('50.00'),
            profit_amount=Decimal('20.00'),
            customer_name='X', customer_phone='0100000000',
            status='pending',
        )
        MarketerOrder.objects.create(
            marketer=self.marketer, product=self.product, quantity=1,
            sale_price_per_unit=Decimal('70.00'),
            assigned_price_per_unit=Decimal('50.00'),
            profit_amount=Decimal('20.00'),
            customer_name='Y', customer_phone='0100000001',
            status='confirmed', is_counted=True,
        )

        self._auth_as(self.admin_user)
        resp = self.client.get('/api/dashboard/marketer-orders/?status=pending')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        results = resp.data['results'] if isinstance(resp.data, dict) else resp.data
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['customer_name'], 'X')

    def test_non_admin_cannot_access_dashboard_endpoints(self):
        self._auth_as(self.marketer_user)
        resp = self.client.get('/api/dashboard/marketer-orders/')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)


# ═════════════════════════════════════════════════════════════════════════════
# Part A3 — process_monthly_cycles command
# ═════════════════════════════════════════════════════════════════════════════

class ProcessMonthlyCyclesCommandTests(TestCase):
    """
    Part A3 — تغطي management command `process_monthly_cycles`:
    - دورة لسه ماخلصتش → مفيش تغيير
    - دورة خلصت بدون رصيد → تصفير بدون تصفية
    - دورة خلصت برصيد → تصفية إجبارية (WithdrawalRequest بـ is_forced_settlement=True)
    - فوات أكتر من دورة واحدة → current_cycle_number بيتقدّم صح
    - تشغيل الكوماند مرتين → idempotent
    - --dry-run → صفر تغييرات محفوظة
    """

    def _make_marketer(self, username, days_ago=0):
        user = User.objects.create_user(
            username=username,
            email=f'{username}@test.com',
            password='pass12345',
            role='marketer',
        )
        anchor = timezone.localdate() - timedelta(days=days_ago)
        return Marketer.objects.create(user=user, cycle_anchor_date=anchor)

    def test_cycle_not_yet_elapsed_no_change(self):
        marketer = self._make_marketer('cyc1', days_ago=10)
        marketer.monthly_profit_balance = Decimal('250.00')
        marketer.monthly_completed_orders_count = 3
        marketer.save()

        call_command('process_monthly_cycles', stdout=StringIO())
        marketer.refresh_from_db()

        self.assertEqual(marketer.current_cycle_number, 0)
        self.assertEqual(marketer.monthly_profit_balance, Decimal('250.00'))
        self.assertEqual(marketer.monthly_completed_orders_count, 3)
        self.assertEqual(WithdrawalRequest.objects.filter(marketer=marketer).count(), 0)

    def test_cycle_elapsed_no_balance_resets_without_settlement(self):
        marketer = self._make_marketer('cyc2', days_ago=31)
        marketer.monthly_completed_orders_count = 7
        marketer.monthly_profit_balance = Decimal('0.00')
        marketer.save()

        call_command('process_monthly_cycles', stdout=StringIO())
        marketer.refresh_from_db()

        self.assertEqual(marketer.current_cycle_number, 1)
        self.assertEqual(marketer.monthly_completed_orders_count, 0)
        self.assertEqual(marketer.monthly_profit_balance, Decimal('0.00'))
        self.assertEqual(WithdrawalRequest.objects.filter(marketer=marketer).count(), 0)

    def test_cycle_elapsed_with_balance_forces_settlement(self):
        marketer = self._make_marketer('cyc3', days_ago=31)
        marketer.monthly_completed_orders_count = 12
        marketer.monthly_profit_balance = Decimal('1500.50')
        marketer.lifetime_total_profit = Decimal('9000.00')
        marketer.lifetime_total_orders = 50
        marketer.save()

        call_command('process_monthly_cycles', stdout=StringIO())
        marketer.refresh_from_db()

        self.assertEqual(marketer.current_cycle_number, 1)
        self.assertEqual(marketer.monthly_completed_orders_count, 0)
        self.assertEqual(marketer.monthly_profit_balance, Decimal('0.00'))
        self.assertEqual(marketer.lifetime_total_profit, Decimal('9000.00'))
        self.assertEqual(marketer.lifetime_total_orders, 50)

        settlement = WithdrawalRequest.objects.get(marketer=marketer)
        self.assertTrue(settlement.is_forced_settlement)
        self.assertEqual(settlement.amount, Decimal('1500.50'))
        self.assertEqual(settlement.status, 'paid')
        self.assertEqual(settlement.cycle_number, 0)
        self.assertIsNotNone(settlement.resolved_at)

    def test_multiple_missed_cycles_advance_correctly(self):
        marketer = self._make_marketer('cyc4', days_ago=95)
        marketer.monthly_profit_balance = Decimal('100.00')
        marketer.save()

        call_command('process_monthly_cycles', stdout=StringIO())
        marketer.refresh_from_db()

        self.assertEqual(marketer.current_cycle_number, 3)
        self.assertEqual(marketer.monthly_profit_balance, Decimal('0.00'))
        self.assertEqual(WithdrawalRequest.objects.filter(marketer=marketer).count(), 1)
        settlement = WithdrawalRequest.objects.get(marketer=marketer)
        self.assertEqual(settlement.amount, Decimal('100.00'))
        self.assertEqual(settlement.cycle_number, 0)

    def test_command_is_idempotent_on_rerun(self):
        marketer = self._make_marketer('cyc5', days_ago=31)
        marketer.monthly_profit_balance = Decimal('300.00')
        marketer.save()

        call_command('process_monthly_cycles', stdout=StringIO())
        call_command('process_monthly_cycles', stdout=StringIO())
        marketer.refresh_from_db()

        self.assertEqual(marketer.current_cycle_number, 1)
        self.assertEqual(WithdrawalRequest.objects.filter(marketer=marketer).count(), 1)

    def test_dry_run_does_not_persist_changes(self):
        marketer = self._make_marketer('cyc6', days_ago=31)
        marketer.monthly_profit_balance = Decimal('400.00')
        marketer.save()

        call_command('process_monthly_cycles', '--dry-run', stdout=StringIO())
        marketer.refresh_from_db()

        self.assertEqual(marketer.current_cycle_number, 0)
        self.assertEqual(marketer.monthly_profit_balance, Decimal('400.00'))
        self.assertEqual(WithdrawalRequest.objects.filter(marketer=marketer).count(), 0)


# ═════════════════════════════════════════════════════════════════════════════
# Part A4 — طلب الترقية لـ Team Leader
# ═════════════════════════════════════════════════════════════════════════════

class TeamLeaderUpgradeTests(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.admin_user = User.objects.create_user(
            username='admin_a4', email='admin_a4@test.com',
            password='pass12345', role='admin',
        )
        self.marketer_user = User.objects.create_user(
            username='marketer_a4', email='marketer_a4@test.com',
            password='pass12345', role='marketer',
        )
        self.marketer = Marketer.objects.create(
            user=self.marketer_user,
            cycle_anchor_date=timezone.localdate(),
        )
        self.category = Category.objects.create(name='Cat A4')
        self.product = Product.objects.create(
            category=self.category, name='Prod A4',
            base_price=Decimal('100.00'),
        )
        MarketerProductPrice.objects.create(
            marketer=self.marketer, product=self.product,
            assigned_price=Decimal('50.00'),
        )

    def _auth_as(self, user):
        self.client.force_authenticate(user=user)

    def _make_extra_marketers(self, count):
        result = []
        for i in range(count):
            u = User.objects.create_user(
                username=f'extra_{i}_{id(self)}',
                email=f'extra_{i}_{id(self)}@test.com',
                password='pass12345', role='marketer',
            )
            result.append(Marketer.objects.create(
                user=u, cycle_anchor_date=timezone.localdate(),
            ))
        return result

    def _confirm_orders_until_target(self):
        target = getattr(settings, 'MARKETER_MONTHLY_TARGET_ORDERS', 10)
        self._auth_as(self.admin_user)
        for i in range(target):
            order = MarketerOrder.objects.create(
                marketer=self.marketer, product=self.product,
                quantity=1,
                sale_price_per_unit=Decimal('80.00'),
                assigned_price_per_unit=Decimal('50.00'),
                profit_amount=Decimal('30.00'),
                customer_name=f'Customer {i}',
                customer_phone='0100000000',
            )
            self.client.patch(f'/api/dashboard/marketer-orders/{order.id}/confirm/')

    # ── 1. تحقيق التارجت → إنشاء طلب (لا ترقية تلقائية) ──────────────────────

    def test_reaching_target_creates_request_not_promotion(self):
        self._confirm_orders_until_target()

        self.marketer.refresh_from_db()
        self.assertEqual(self.marketer.role, 'marketer')

        req = TeamLeaderRequest.objects.filter(marketer=self.marketer).first()
        self.assertIsNotNone(req)
        self.assertEqual(req.status, 'awaiting_response')

    # ── 2. لا تكرار للطلب عند أوردرات إضافية ─────────────────────────────────

    def test_no_duplicate_request_on_extra_orders(self):
        self._confirm_orders_until_target()

        extra_order = MarketerOrder.objects.create(
            marketer=self.marketer, product=self.product,
            quantity=1,
            sale_price_per_unit=Decimal('80.00'),
            assigned_price_per_unit=Decimal('50.00'),
            profit_amount=Decimal('30.00'),
            customer_name='Extra', customer_phone='0100000000',
        )
        self._auth_as(self.admin_user)
        self.client.patch(f'/api/dashboard/marketer-orders/{extra_order.id}/confirm/')

        self.assertEqual(
            TeamLeaderRequest.objects.filter(marketer=self.marketer).count(), 1
        )

    # ── 3. رفض المسوق ────────────────────────────────────────────────────────

    def test_marketer_decline_request(self):
        self._confirm_orders_until_target()
        req = TeamLeaderRequest.objects.get(marketer=self.marketer)

        self._auth_as(self.marketer_user)
        resp = self.client.post(
            f'/api/marketers/me/team-leader-request/{req.id}/respond/',
            {'accepted': False}, format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        req.refresh_from_db()
        self.marketer.refresh_from_db()
        self.assertEqual(req.status, 'declined')
        self.assertEqual(self.marketer.role, 'marketer')

    # ── 4. قبول المسوق → accepted_pending_requirement ────────────────────────

    def test_marketer_accept_request(self):
        self._confirm_orders_until_target()
        req = TeamLeaderRequest.objects.get(marketer=self.marketer)

        self._auth_as(self.marketer_user)
        resp = self.client.post(
            f'/api/marketers/me/team-leader-request/{req.id}/respond/',
            {'accepted': True}, format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        req.refresh_from_db()
        self.assertEqual(req.status, 'accepted_pending_requirement')
        self.marketer.refresh_from_db()
        self.assertEqual(self.marketer.role, 'marketer')

    # ── 5. submit-team بأقل من 10 → رفض ─────────────────────────────────────

    def test_submit_team_less_than_min_fails(self):
        self._confirm_orders_until_target()
        req = TeamLeaderRequest.objects.get(marketer=self.marketer)
        req.status = 'accepted_pending_requirement'
        req.save()

        extra = self._make_extra_marketers(5)

        self._auth_as(self.marketer_user)
        resp = self.client.post(
            f'/api/marketers/me/team-leader-request/{req.id}/submit-team/',
            {'marketer_ids': [m.id for m in extra]},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

        self.marketer.refresh_from_db()
        self.assertEqual(self.marketer.role, 'marketer')

    # ── 6. submit-team بـ10 صحيحين → ترقية كاملة + credited_team_leader ─────

    def test_submit_team_valid_promotes_and_sets_credited_leader(self):
        leader_user = User.objects.create_user(
            username='old_leader', email='old_leader@test.com',
            password='pass12345', role='marketer',
        )
        old_leader = Marketer.objects.create(
            user=leader_user,
            cycle_anchor_date=timezone.localdate(),
            role='team_leader',
        )
        self.marketer.team_leader = old_leader
        self.marketer.save()

        self._confirm_orders_until_target()
        req = TeamLeaderRequest.objects.get(marketer=self.marketer)
        req.status = 'accepted_pending_requirement'
        req.save()

        extra = self._make_extra_marketers(10)

        self._auth_as(self.marketer_user)
        resp = self.client.post(
            f'/api/marketers/me/team-leader-request/{req.id}/submit-team/',
            {'marketer_ids': [m.id for m in extra]},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.data)

        self.marketer.refresh_from_db()
        self.assertEqual(self.marketer.role, 'team_leader')
        self.assertIsNotNone(self.marketer.promoted_to_leader_at)
        self.assertEqual(self.marketer.credited_team_leader, old_leader)

        req.refresh_from_db()
        self.assertEqual(req.status, 'completed')

        for m in extra:
            m.refresh_from_db()
            self.assertEqual(m.team_leader, self.marketer)

    # ── 7. submit-team بدون قائد سابق → credited_team_leader=null ───────────

    def test_submit_team_no_prior_leader_sets_credited_null(self):
        self._confirm_orders_until_target()
        req = TeamLeaderRequest.objects.get(marketer=self.marketer)
        req.status = 'accepted_pending_requirement'
        req.save()

        extra = self._make_extra_marketers(10)

        self._auth_as(self.marketer_user)
        self.client.post(
            f'/api/marketers/me/team-leader-request/{req.id}/submit-team/',
            {'marketer_ids': [m.id for m in extra]},
            format='json',
        )

        self.marketer.refresh_from_db()
        self.assertIsNone(self.marketer.credited_team_leader)

    # ── 8. ترقية يدوية من الأدمن ────────────────────────────────────────────

    def test_admin_manual_promote_no_conditions(self):
        self._auth_as(self.admin_user)
        resp = self.client.post(
            f'/api/dashboard/marketers/{self.marketer.id}/promote-to-leader/'
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.data)

        self.marketer.refresh_from_db()
        self.assertEqual(self.marketer.role, 'team_leader')
        self.assertIsNotNone(self.marketer.promoted_to_leader_at)
        self.assertIsNone(self.marketer.credited_team_leader)

    # ── 9. ترقية قائد بالفعل → 400 ──────────────────────────────────────────

    def test_admin_promote_already_leader_returns_400(self):
        self.marketer.role = 'team_leader'
        self.marketer.save()

        self._auth_as(self.admin_user)
        resp = self.client.post(
            f'/api/dashboard/marketers/{self.marketer.id}/promote-to-leader/'
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)


# ═════════════════════════════════════════════════════════════════════════════
# Part A5 — مبيعات الفريق (مع استثناء مبيعات القائد الشخصية) + المكافآت الشهرية
# ═════════════════════════════════════════════════════════════════════════════

class TeamSalesAndRewardsTests(TestCase):
    """
    Part A5 — تغطي:
    1. مبيعات الفريق = مبيعات الأعضاء الحاليين فقط (لا تشمل مبيعات القائد
       الشخصية — counted_towards_leader بيستبعدها تلقائيًا وقت confirm).
    2. مسوق تابع لقائد A، اترقّى هو نفسه لقائد B (مستقل)، سجّل أوردر شخصي
       جديد بعد ترقيته → الأوردر ده يُحسب لصالح فريق A (القديم)، وغير ظاهر
       في مبيعات فريقه الجديد B.
    3. evaluate_team_rewards (الكوماند + الـ endpoint اليدوي): حساب مكافأة
       صحيحة حسب أعلى درجة محققة، وعدم تكرار نفس الـ tier في نفس الدورة.
    """

    def setUp(self):
        self.client = APIClient()
        self.admin_user = User.objects.create_user(
            username='admin_a5', email='admin_a5@test.com',
            password='pass12345', role='admin',
        )
        self.category = Category.objects.create(name='Cat A5')
        self.product = Product.objects.create(
            category=self.category, name='Prod A5',
            base_price=Decimal('100.00'),
        )

    def _auth_admin(self):
        self.client.force_authenticate(user=self.admin_user)

    def _make_marketer(self, username, role='marketer', team_leader=None,
                        credited_team_leader=None):
        user = User.objects.create_user(
            username=username, email=f'{username}@test.com',
            password='pass12345', role='marketer',
        )
        return Marketer.objects.create(
            user=user, cycle_anchor_date=timezone.localdate(),
            role=role, team_leader=team_leader,
            credited_team_leader=credited_team_leader,
        )

    def _confirm_order_for(self, marketer, sale_price='80.00', cost_price='50.00'):
        MarketerProductPrice.objects.get_or_create(
            marketer=marketer, product=self.product,
            defaults={'assigned_price': Decimal(cost_price)},
        )
        order = MarketerOrder.objects.create(
            marketer=marketer, product=self.product, quantity=1,
            sale_price_per_unit=Decimal(sale_price),
            assigned_price_per_unit=Decimal(cost_price),
            profit_amount=Decimal(sale_price) - Decimal(cost_price),
            customer_name='X', customer_phone='0100000000',
        )
        self._auth_admin()
        resp = self.client.patch(f'/api/dashboard/marketer-orders/{order.id}/confirm/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.data)
        order.refresh_from_db()
        return order

    def test_team_sales_excludes_leader_personal_orders(self):
        leader = self._make_marketer('leader_a5', role='team_leader')
        member1 = self._make_marketer('m1_a5', team_leader=leader)
        member2 = self._make_marketer('m2_a5', team_leader=leader)

        self._confirm_order_for(member1, sale_price='80.00', cost_price='50.00')
        self._confirm_order_for(member2, sale_price='90.00', cost_price='50.00')
        self._confirm_order_for(leader, sale_price='70.00', cost_price='50.00')

        sales = leader.get_team_sales_for_current_cycle()
        self.assertEqual(sales['orders_count'], 2)
        self.assertEqual(sales['total_profit'], Decimal('70.00'))

    def test_personal_order_after_promotion_counts_for_old_leader(self):
        leader_a = self._make_marketer('leader_A_a5', role='team_leader')
        member = self._make_marketer('member_a5', team_leader=leader_a)

        member.credited_team_leader = member.team_leader
        member.role = 'team_leader'
        member.team_leader = None
        member.save()

        self._confirm_order_for(member, sale_price='100.00', cost_price='60.00')

        sales_a = leader_a.get_team_sales_for_current_cycle()
        self.assertEqual(sales_a['orders_count'], 1)
        self.assertEqual(sales_a['total_profit'], Decimal('40.00'))

        member.refresh_from_db()
        sales_b = member.get_team_sales_for_current_cycle()
        self.assertEqual(sales_b['orders_count'], 0)
        self.assertEqual(sales_b['total_profit'], Decimal('0'))

    def test_evaluate_team_rewards_creates_correct_tier(self):
        leader = self._make_marketer('leader_rw_a5', role='team_leader')
        member1 = self._make_marketer('rwm1_a5', team_leader=leader)
        member2 = self._make_marketer('rwm2_a5', team_leader=leader)

        tier_low = RewardTier.objects.create(
            min_team_sales=1, reward_amount=Decimal('50.00'), is_active=True,
        )
        tier_high = RewardTier.objects.create(
            min_team_sales=2, reward_amount=Decimal('150.00'), is_active=True,
        )
        RewardTier.objects.create(
            min_team_sales=2, reward_amount=Decimal('999.00'), is_active=False,
        )

        self._confirm_order_for(member1)
        self._confirm_order_for(member2)

        out = StringIO()
        call_command('evaluate_team_rewards', stdout=out)

        rewards = TeamReward.objects.filter(marketer=leader)
        self.assertEqual(rewards.count(), 1)
        reward = rewards.first()
        self.assertEqual(reward.tier, tier_high)
        self.assertEqual(reward.status, 'pending')
        self.assertEqual(reward.team_sales_count_at_award, 2)
        self.assertEqual(reward.reward_amount, Decimal('150.00'))
        self.assertEqual(reward.cycle_number, leader.current_cycle_number)

    def test_evaluate_team_rewards_no_duplicate_same_tier_same_cycle(self):
        leader = self._make_marketer('leader_rw2_a5', role='team_leader')
        member = self._make_marketer('rwm3_a5', team_leader=leader)
        RewardTier.objects.create(
            min_team_sales=1, reward_amount=Decimal('50.00'), is_active=True,
        )

        self._confirm_order_for(member)

        call_command('evaluate_team_rewards', stdout=StringIO())
        call_command('evaluate_team_rewards', stdout=StringIO())

        self.assertEqual(TeamReward.objects.filter(marketer=leader).count(), 1)

    def test_evaluate_team_rewards_new_tier_same_cycle_adds_new_reward(self):
        leader = self._make_marketer('leader_rw3_a5', role='team_leader')
        member1 = self._make_marketer('rwm4_a5', team_leader=leader)
        RewardTier.objects.create(
            min_team_sales=1, reward_amount=Decimal('50.00'), is_active=True,
        )
        tier_high = RewardTier.objects.create(
            min_team_sales=2, reward_amount=Decimal('150.00'), is_active=True,
        )

        self._confirm_order_for(member1)
        call_command('evaluate_team_rewards', stdout=StringIO())
        self.assertEqual(TeamReward.objects.filter(marketer=leader).count(), 1)

        member2 = self._make_marketer('rwm5_a5', team_leader=leader)
        self._confirm_order_for(member2)
        call_command('evaluate_team_rewards', stdout=StringIO())

        rewards = TeamReward.objects.filter(marketer=leader)
        self.assertEqual(rewards.count(), 2)
        self.assertTrue(rewards.filter(tier=tier_high).exists())

    def test_evaluate_team_rewards_admin_endpoint(self):
        leader = self._make_marketer('leader_rw6_a5', role='team_leader')
        member = self._make_marketer('rwm6_a5', team_leader=leader)
        RewardTier.objects.create(
            min_team_sales=1, reward_amount=Decimal('50.00'), is_active=True,
        )

        self._confirm_order_for(member)

        self._auth_admin()
        resp = self.client.post('/api/dashboard/team-rewards/evaluate/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.data)
        self.assertEqual(resp.data['created_count'], 1)
        self.assertEqual(len(resp.data['rewards']), 1)
        self.assertEqual(TeamReward.objects.filter(marketer=leader).count(), 1)

        resp2 = self.client.post('/api/dashboard/team-rewards/evaluate/')
        self.assertEqual(resp2.data['created_count'], 0)
        self.assertEqual(TeamReward.objects.filter(marketer=leader).count(), 1)

    def test_non_admin_cannot_access_evaluate_endpoint(self):
        marketer_user = User.objects.create_user(
            username='not_admin_a5', email='not_admin_a5@test.com',
            password='pass12345', role='marketer',
        )
        self.client.force_authenticate(user=marketer_user)
        resp = self.client.post('/api/dashboard/team-rewards/evaluate/')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)


# ═════════════════════════════════════════════════════════════════════════════
# Part A6 — طلبات سحب الأرباح (Withdrawal Requests)
# ═════════════════════════════════════════════════════════════════════════════

class WithdrawalRequestTests(TestCase):
    """
    Part A6 — تغطي:
    1. طلب سحب صحيح → 201 + WithdrawalRequest بـ status=pending
    2. طلب يتجاوز الرصيد المتاح → 400
    3. طلب بمبلغ صفر أو سالب → 400
    4. اعتماد الأدمن → status=approved + خصم من monthly_profit_balance
    5. رفض الأدمن → status=rejected + الرصيد لا يتغير (لم يُخصم عند التقديم)
    6. اعتماد طلب غير pending → 400
    7. رفض طلب غير pending → 400
    8. مسوق غير مصرح → 403
    """

    def setUp(self):
        self.client = APIClient()

        self.admin_user = User.objects.create_user(
            username='admin_a6', email='admin_a6@test.com',
            password='pass12345', role='admin',
        )
        self.marketer_user = User.objects.create_user(
            username='marketer_a6', email='marketer_a6@test.com',
            password='pass12345', role='marketer',
        )
        self.marketer = Marketer.objects.create(
            user=self.marketer_user,
            cycle_anchor_date=timezone.localdate(),
            monthly_profit_balance=Decimal('500.00'),
        )

    def _auth_marketer(self):
        self.client.force_authenticate(user=self.marketer_user)

    def _auth_admin(self):
        self.client.force_authenticate(user=self.admin_user)

    # ── 1. طلب سحب صحيح ─────────────────────────────────────────────────────

    def test_valid_withdrawal_creates_pending_request(self):
        self._auth_marketer()
        resp = self.client.post('/api/marketers/me/withdrawals/', {'amount': '200.00'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.data)

        withdrawal = WithdrawalRequest.objects.get(marketer=self.marketer)
        self.assertEqual(withdrawal.status, 'pending')
        self.assertEqual(withdrawal.amount, Decimal('200.00'))
        self.assertEqual(withdrawal.cycle_number, self.marketer.current_cycle_number)

        # الرصيد لم يتغير (الخصم عند approve فقط — قرار A6)
        self.marketer.refresh_from_db()
        self.assertEqual(self.marketer.monthly_profit_balance, Decimal('500.00'))

    # ── 2. طلب يتجاوز الرصيد → 400 ─────────────────────────────────────────

    def test_withdrawal_exceeding_balance_rejected(self):
        self._auth_marketer()
        resp = self.client.post('/api/marketers/me/withdrawals/', {'amount': '600.00'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('500', str(resp.data))
        self.assertEqual(WithdrawalRequest.objects.filter(marketer=self.marketer).count(), 0)

    # ── 3. طلب بمبلغ صفر → 400 ──────────────────────────────────────────────

    def test_withdrawal_zero_amount_rejected(self):
        self._auth_marketer()
        resp = self.client.post('/api/marketers/me/withdrawals/', {'amount': '0'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(WithdrawalRequest.objects.filter(marketer=self.marketer).count(), 0)

    # ── 4. اعتماد الأدمن → خصم الرصيد ──────────────────────────────────────

    def test_admin_approve_deducts_balance(self):
        withdrawal = WithdrawalRequest.objects.create(
            marketer=self.marketer,
            amount=Decimal('300.00'),
            status='pending',
            cycle_number=0,
        )

        self._auth_admin()
        resp = self.client.patch(f'/api/dashboard/withdrawals/{withdrawal.id}/approve/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.data)

        withdrawal.refresh_from_db()
        self.assertEqual(withdrawal.status, 'approved')
        self.assertIsNotNone(withdrawal.resolved_at)

        self.marketer.refresh_from_db()
        self.assertEqual(self.marketer.monthly_profit_balance, Decimal('200.00'))  # 500 - 300

    # ── 5. رفض الأدمن → الرصيد لا يتغير ────────────────────────────────────

    def test_admin_reject_does_not_change_balance(self):
        withdrawal = WithdrawalRequest.objects.create(
            marketer=self.marketer,
            amount=Decimal('300.00'),
            status='pending',
            cycle_number=0,
        )

        self._auth_admin()
        resp = self.client.patch(f'/api/dashboard/withdrawals/{withdrawal.id}/reject/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.data)

        withdrawal.refresh_from_db()
        self.assertEqual(withdrawal.status, 'rejected')
        self.assertIsNotNone(withdrawal.resolved_at)

        # الرصيد لم يتغير لأن المبلغ لم يُخصم عند التقديم (قرار A6)
        self.marketer.refresh_from_db()
        self.assertEqual(self.marketer.monthly_profit_balance, Decimal('500.00'))

    # ── 6. اعتماد طلب غير pending → 400 ─────────────────────────────────────

    def test_approve_non_pending_returns_400(self):
        withdrawal = WithdrawalRequest.objects.create(
            marketer=self.marketer,
            amount=Decimal('100.00'),
            status='approved',
            cycle_number=0,
        )
        self._auth_admin()
        resp = self.client.patch(f'/api/dashboard/withdrawals/{withdrawal.id}/approve/')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    # ── 7. رفض طلب غير pending → 400 ────────────────────────────────────────

    def test_reject_non_pending_returns_400(self):
        withdrawal = WithdrawalRequest.objects.create(
            marketer=self.marketer,
            amount=Decimal('100.00'),
            status='rejected',
            cycle_number=0,
        )
        self._auth_admin()
        resp = self.client.patch(f'/api/dashboard/withdrawals/{withdrawal.id}/reject/')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    # ── 8. مسوق بدون صلاحية → 403 ───────────────────────────────────────────

    def test_non_marketer_cannot_submit_withdrawal(self):
        self._auth_admin()
        resp = self.client.post('/api/marketers/me/withdrawals/', {'amount': '100.00'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    # ── 9. قائمة الأدمن + فلترة بالـ status ──────────────────────────────────

    def test_admin_can_list_and_filter_withdrawals(self):
        WithdrawalRequest.objects.create(
            marketer=self.marketer, amount=Decimal('100.00'),
            status='pending', cycle_number=0,
        )
        WithdrawalRequest.objects.create(
            marketer=self.marketer, amount=Decimal('200.00'),
            status='approved', cycle_number=0,
        )

        self._auth_admin()
        resp = self.client.get('/api/dashboard/withdrawals/?status=pending')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        results = resp.data['results'] if isinstance(resp.data, dict) else resp.data
        self.assertEqual(len(results), 1)
        self.assertEqual(str(results[0]['amount']), '100.00')

# ═════════════════════════════════════════════════════════════════════════════
# Part A12 — اختبار شامل لنظام المسوقين كامل (End-to-End، النسخة المعدّلة)
# ═════════════════════════════════════════════════════════════════════════════

class MarketerSystemEndToEndTests(TestCase):
    """
    Part A12 — يغطي السيناريو الشامل المطلوب بالكامل (11 خطوة)، باستخدام
    الـ endpoints الفعلية (مش إنشاء مباشر للبيانات) في كل خطوة ممكنة، عشان
    نتأكد إن التكامل الحقيقي بين A1→A8 شغال صحيح مع بعضه، مش كل Part لوحده.

    كل test method هنا بيبدأ من setUp() جديدة (نفس باترن باقي كلاسات هذا
    الملف — مفيش مشاركة state بين tests مختلفة)، لكن مجتمعين بيغطوا
    الـ11 خطوة المطلوبة في خطة A12 حرفيًا:

    01 → خطوة 1+2  (تسعير + تسجيل/تأكيد أوردر + تحديث العدادات الشهرية والتراكمية)
    02 → خطوة 3    (الوصول للتارجت ينشئ TeamLeaderRequest فقط، مش ترقية تلقائية)
    03 → خطوة 4+5  (قبول الطلب + رفض submit-team بأقل من 10 — الحالة متتغيرش)
    04 → خطوة 6    (submit-team بـ10 صحيحين → ترقية كاملة، credited_team_leader=null)
    05 → خطوة 7    (الترقية اليدوية الفورية من الأدمن بدون أي شرط)
    06 → خطوة 8    (مبيعات شخصية بعد الترقية تروح للقائد القديم، لا الفريق الجديد)
    07 → خطوة 9    (الدورة الشهرية + التصفية الإجبارية + ثبات الأرقام التراكمية)
    08 → خطوة 10   (سحب يتجاوز الرصيد يُرفض، وطلب صحيح يُخصم عند approve فقط)
    09 → خطوة 11   (رفض أوردر بعد تأكيده يرجّع كل العدادات بما فيها مبيعات الفريق)
    """

    def setUp(self):
        self.client = APIClient()
        self.admin_user = User.objects.create_user(
            username='admin_a12', email='admin_a12@test.com',
            password='pass12345', role='admin',
        )
        self.category = Category.objects.create(name='Cat A12')
        self.product = Product.objects.create(
            category=self.category, name='Prod A12',
            base_price=Decimal('100.00'),
        )
        self.shipping_region = ShippingRegion.objects.create(
            name='Cairo', price=Decimal('30.00'),
        )

    # ── Helpers ──────────────────────────────────────────────────────────────

    def _auth_admin(self):
        self.client.force_authenticate(user=self.admin_user)

    def _auth_as(self, user):
        self.client.force_authenticate(user=user)

    def _make_marketer(self, username, role='marketer', team_leader=None,
                        credited_team_leader=None):
        user = User.objects.create_user(
            username=username, email=f'{username}@test.com',
            password='pass12345', role='marketer',
        )
        return Marketer.objects.create(
            user=user, cycle_anchor_date=timezone.localdate(),
            role=role, team_leader=team_leader,
            credited_team_leader=credited_team_leader,
        )

    def _make_extra_marketers(self, count, prefix='extra_a12'):
        result = []
        for i in range(count):
            result.append(self._make_marketer(f'{prefix}_{i}_{id(self)}'))
        return result

    def _set_price(self, marketer, product=None, price='50.00'):
        product = product or self.product
        return MarketerProductPrice.objects.get_or_create(
            marketer=marketer, product=product,
            defaults={'assigned_price': Decimal(price)},
        )[0]

    def _register_order(self, marketer_user, product=None, sale_price='80.00',
                         customer_name='Customer'):
        product = product or self.product
        self._auth_as(marketer_user)
        resp = self.client.post('/api/marketers/me/orders/', {
            'product_id': product.id,
            'quantity': 1,
            'sale_price_per_unit': sale_price,
            'customer_name': customer_name,
            'customer_phone': '0100000000',
            'shipping_region_id': self.shipping_region.id,
            'shipping_address': '123 Test Street',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.data)
        return resp.data['id']

    def _confirm_order(self, order_id):
        self._auth_admin()
        resp = self.client.patch(f'/api/dashboard/marketer-orders/{order_id}/confirm/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.data)
        return resp

    def _register_and_confirm(self, marketer, product=None, sale_price='80.00',
                               customer_name='Customer'):
        order_id = self._register_order(
            marketer.user, product=product, sale_price=sale_price,
            customer_name=customer_name,
        )
        self._confirm_order(order_id)
        return MarketerOrder.objects.get(pk=order_id)

    def _confirm_orders_until_target(self, marketer, product=None, sale_price='80.00'):
        target = getattr(settings, 'MARKETER_MONTHLY_TARGET_ORDERS', 10)
        for i in range(target):
            self._register_and_confirm(
                marketer, product=product, sale_price=sale_price,
                customer_name=f'Target Customer {i}',
            )

    # ── 01: تسعير + تسجيل/تأكيد أوردر + تحديث العدادات (خطوة 1+2) ────────────

    def test_01_pricing_then_order_registration_and_confirmation_updates_counters(self):
        marketer = self._make_marketer('m01_a12')
        self._set_price(marketer, price='50.00')

        order = self._register_and_confirm(marketer, sale_price='80.00')

        self.assertEqual(order.status, 'confirmed')
        self.assertTrue(order.is_counted)
        self.assertEqual(order.assigned_price_per_unit, Decimal('50.00'))
        self.assertEqual(order.profit_amount, Decimal('30.00'))  # (80-50)*1

        marketer.refresh_from_db()
        self.assertEqual(marketer.monthly_completed_orders_count, 1)
        self.assertEqual(marketer.monthly_profit_balance, Decimal('30.00'))
        self.assertEqual(marketer.lifetime_total_orders, 1)
        self.assertEqual(marketer.lifetime_total_profit, Decimal('30.00'))

    # ── 02: الوصول للتارجت → طلب فقط، لا ترقية تلقائية (خطوة 3) ──────────────

    def test_02_reaching_target_creates_request_without_auto_promotion(self):
        marketer = self._make_marketer('m02_a12')
        self._set_price(marketer, price='50.00')

        self._confirm_orders_until_target(marketer)

        marketer.refresh_from_db()
        self.assertEqual(marketer.role, 'marketer')

        req = TeamLeaderRequest.objects.get(marketer=marketer)
        self.assertEqual(req.status, 'awaiting_response')

    # ── 03: قبول الطلب + رفض submit-team بأقل من 10 (خطوة 4+5) ──────────────

    def test_03_accept_request_then_submit_team_below_minimum_is_rejected(self):
        marketer = self._make_marketer('m03_a12')
        self._set_price(marketer, price='50.00')
        self._confirm_orders_until_target(marketer)
        req = TeamLeaderRequest.objects.get(marketer=marketer)

        self._auth_as(marketer.user)
        resp = self.client.post(
            f'/api/marketers/me/team-leader-request/{req.id}/respond/',
            {'accepted': True}, format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        req.refresh_from_db()
        self.assertEqual(req.status, 'accepted_pending_requirement')

        too_few = self._make_extra_marketers(5, prefix='m03_few')
        resp2 = self.client.post(
            f'/api/marketers/me/team-leader-request/{req.id}/submit-team/',
            {'marketer_ids': [m.id for m in too_few]}, format='json',
        )
        self.assertEqual(resp2.status_code, status.HTTP_400_BAD_REQUEST)

        req.refresh_from_db()
        marketer.refresh_from_db()
        self.assertEqual(req.status, 'accepted_pending_requirement')  # متتغيرش
        self.assertEqual(marketer.role, 'marketer')

    # ── 04: submit-team بـ10 صحيحين → ترقية كاملة (خطوة 6) ───────────────────

    def test_04_submit_team_with_minimum_members_completes_promotion(self):
        marketer = self._make_marketer('m04_a12')
        self._set_price(marketer, price='50.00')
        self._confirm_orders_until_target(marketer)
        req = TeamLeaderRequest.objects.get(marketer=marketer)

        self._auth_as(marketer.user)
        self.client.post(
            f'/api/marketers/me/team-leader-request/{req.id}/respond/',
            {'accepted': True}, format='json',
        )

        team = self._make_extra_marketers(10, prefix='m04_team')
        resp = self.client.post(
            f'/api/marketers/me/team-leader-request/{req.id}/submit-team/',
            {'marketer_ids': [m.id for m in team]}, format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.data)

        marketer.refresh_from_db()
        req.refresh_from_db()
        self.assertEqual(marketer.role, 'team_leader')
        self.assertIsNone(marketer.credited_team_leader)  # أول ترقية، بدون قائد سابق
        self.assertIsNotNone(marketer.promoted_to_leader_at)
        self.assertEqual(req.status, 'completed')

        for m in team:
            m.refresh_from_db()
            self.assertEqual(m.team_leader_id, marketer.id)

    # ── 05: الترقية اليدوية الفورية من الأدمن بدون أي شرط (خطوة 7) ──────────

    def test_05_admin_manual_promotion_is_instant_without_any_requirements(self):
        marketer = self._make_marketer('m05_a12')
        # مفيش أوردرات أصلاً ولا TeamLeaderRequest
        self.assertEqual(MarketerOrder.objects.filter(marketer=marketer).count(), 0)

        self._auth_admin()
        resp = self.client.post(f'/api/dashboard/marketers/{marketer.id}/promote-to-leader/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.data)

        marketer.refresh_from_db()
        self.assertEqual(marketer.role, 'team_leader')
        self.assertIsNotNone(marketer.promoted_to_leader_at)
        self.assertIsNone(marketer.credited_team_leader)

    # ── 06: مبيعات شخصية بعد الترقية تروح للقائد القديم، لا الجديد (خطوة 8) ──

    def test_06_personal_order_after_promotion_counts_for_old_leader_only(self):
        leader_a = self._make_marketer('leaderA_m06_a12', role='team_leader')
        member = self._make_marketer('member_m06_a12', team_leader=leader_a)
        self._set_price(member, price='60.00')

        # ترقية يدوية من الأدمن (بأي طريقة من الاتنين — هنا اليدوية أبسط لتجهيز السيناريو)
        self._auth_admin()
        resp = self.client.post(f'/api/dashboard/marketers/{member.id}/promote-to-leader/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.data)

        member.refresh_from_db()
        self.assertEqual(member.role, 'team_leader')
        self.assertEqual(member.credited_team_leader_id, leader_a.id)

        # أوردر شخصي جديد بعد الترقية، وتأكيده
        order = self._register_and_confirm(member, sale_price='100.00')
        self.assertEqual(order.counted_towards_leader_id, leader_a.id)

        sales_a = leader_a.get_team_sales_for_current_cycle()
        self.assertEqual(sales_a['orders_count'], 1)
        self.assertEqual(sales_a['total_profit'], Decimal('40.00'))  # 100-60

        member.refresh_from_db()
        sales_new_team = member.get_team_sales_for_current_cycle()
        self.assertEqual(sales_new_team['orders_count'], 0)
        self.assertEqual(sales_new_team['total_profit'], Decimal('0'))

    # ── 07: الدورة الشهرية + التصفية الإجبارية + ثبات الأرقام التراكمية (خطوة 9) ─

    def test_07_monthly_cycle_closes_resets_and_force_settles_without_touching_lifetime(self):
        marketer = self._make_marketer('m07_a12')
        marketer.cycle_anchor_date = timezone.localdate() - timedelta(days=31)
        marketer.monthly_completed_orders_count = 7
        marketer.monthly_profit_balance = Decimal('850.00')
        marketer.lifetime_total_orders = 40
        marketer.lifetime_total_profit = Decimal('5000.00')
        marketer.save()

        call_command('process_monthly_cycles', stdout=StringIO())
        marketer.refresh_from_db()

        self.assertEqual(marketer.current_cycle_number, 1)
        self.assertEqual(marketer.monthly_completed_orders_count, 0)
        self.assertEqual(marketer.monthly_profit_balance, Decimal('0.00'))
        self.assertEqual(marketer.lifetime_total_orders, 40)               # ثابت
        self.assertEqual(marketer.lifetime_total_profit, Decimal('5000.00'))  # ثابت

        settlement = WithdrawalRequest.objects.get(marketer=marketer)
        self.assertTrue(settlement.is_forced_settlement)
        self.assertEqual(settlement.amount, Decimal('850.00'))
        self.assertEqual(settlement.status, 'paid')
        self.assertEqual(settlement.cycle_number, 0)

    # ── 08: سحب يتجاوز الرصيد يُرفض، طلب صحيح يُخصم عند approve فقط (خطوة 10) ──

    def test_08_withdrawal_exceeding_balance_rejected_and_valid_one_deducts_only_on_approve(self):
        marketer = self._make_marketer('m08_a12')
        marketer.monthly_profit_balance = Decimal('400.00')
        marketer.save()

        self._auth_as(marketer.user)
        too_much = self.client.post(
            '/api/marketers/me/withdrawals/', {'amount': '500.00'}, format='json',
        )
        self.assertEqual(too_much.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(WithdrawalRequest.objects.filter(marketer=marketer).count(), 0)

        valid = self.client.post(
            '/api/marketers/me/withdrawals/', {'amount': '300.00'}, format='json',
        )
        self.assertEqual(valid.status_code, status.HTTP_201_CREATED, valid.data)
        withdrawal_id = valid.data['id']

        # القرار المؤكَّد (Part A6): الرصيد لا يُخصم عند تقديم الطلب
        marketer.refresh_from_db()
        self.assertEqual(marketer.monthly_profit_balance, Decimal('400.00'))

        self._auth_admin()
        approve = self.client.patch(f'/api/dashboard/withdrawals/{withdrawal_id}/approve/')
        self.assertEqual(approve.status_code, status.HTTP_200_OK, approve.data)

        marketer.refresh_from_db()
        self.assertEqual(marketer.monthly_profit_balance, Decimal('100.00'))  # 400-300

    # ── 09: رفض أوردر بعد تأكيده يرجّع كل العدادات، ومبيعات الفريق (خطوة 11) ──

    def test_09_rejecting_confirmed_order_rolls_back_all_counters_and_team_sales(self):
        leader = self._make_marketer('leader_m09_a12', role='team_leader')
        member = self._make_marketer('member_m09_a12', team_leader=leader)
        self._set_price(member, price='50.00')

        order = self._register_and_confirm(member, sale_price='90.00')
        member.refresh_from_db()
        self.assertEqual(member.monthly_completed_orders_count, 1)
        self.assertEqual(member.monthly_profit_balance, Decimal('40.00'))
        sales_before = leader.get_team_sales_for_current_cycle()
        self.assertEqual(sales_before['orders_count'], 1)

        self._auth_admin()
        resp = self.client.patch(f'/api/dashboard/marketer-orders/{order.id}/reject/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.data)

        order.refresh_from_db()
        self.assertEqual(order.status, 'rejected')
        self.assertFalse(order.is_counted)
        self.assertIsNone(order.counted_in_cycle_number)
        self.assertIsNone(order.counted_towards_leader)

        member.refresh_from_db()
        self.assertEqual(member.monthly_completed_orders_count, 0)
        self.assertEqual(member.monthly_profit_balance, Decimal('0.00'))
        self.assertEqual(member.lifetime_total_orders, 0)
        self.assertEqual(member.lifetime_total_profit, Decimal('0.00'))

        sales_after = leader.get_team_sales_for_current_cycle()
        self.assertEqual(sales_after['orders_count'], 0)
        self.assertEqual(sales_after['total_profit'], Decimal('0'))