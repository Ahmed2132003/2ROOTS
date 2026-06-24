from datetime import timedelta
from decimal import Decimal
from io import StringIO

from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.products.models import Category, Product
from apps.marketers.models import (
    Marketer, MarketerOrder, MarketerProductPrice, WithdrawalRequest,
)
from apps.users.models import User


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
            profit_amount=Decimal('120.00'),  # (90-50)*3
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
        # العدادات ما اتأثرتش لأنها أصلاً ما كانتش اتزودت
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

        # المشروع شغّال بـ pagination على مستوى الـ DRF settings، فالـ response بيكون
        # dict فيه count/next/previous/results مش list مباشرة.
        results = resp.data['results'] if isinstance(resp.data, dict) else resp.data
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['customer_name'], 'X')

    def test_non_admin_cannot_access_dashboard_endpoints(self):
        self._auth_as(self.marketer_user)
        resp = self.client.get('/api/dashboard/marketer-orders/')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)


class ProcessMonthlyCyclesCommandTests(TestCase):
    """
    Part A3 — تغطي management command `process_monthly_cycles`:
    - دورة لسه ماخلصتش → مفيش تغيير
    - دورة خلصت بدون رصيد → تصفير بدون تصفية
    - دورة خلصت برصيد → تصفية إجبارية (WithdrawalRequest بـ is_forced_settlement=True)
    - فوات أكتر من دورة واحدة → current_cycle_number بيتقدّم صح، تصفية واحدة بس
      (لأن الرصيد اتصفّر من أول دورة قافلة)
    - تشغيل الكوماند مرتين → idempotent
    - --dry-run → صفر تغييرات محفوظة

    Backdating note: `Marketer.save()` بيحدد `cycle_anchor_date` تلقائيًا بس لو
    القيمة فاضية وقت أول save. تمرير `cycle_anchor_date` بتاريخ ماضي مباشرة في
    `.create()` كافي لمحاكاة حساب قديم — مفيش حاجة لـ mock للوقت.
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
        marketer = self._make_marketer('cyc1', days_ago=10)  # only 10 of 30 days
        marketer.monthly_profit_balance = Decimal('250.00')
        marketer.monthly_completed_orders_count = 3
        marketer.save()

        call_command('process_monthly_cycles', stdout=StringIO())
        marketer.refresh_from_db()

        self.assertEqual(marketer.current_cycle_number, 0)
        self.assertEqual(marketer.monthly_profit_balance, Decimal('250.00'))
        self.assertEqual(marketer.monthly_completed_orders_count, 3)
        self.assertEqual(
            WithdrawalRequest.objects.filter(marketer=marketer).count(), 0
        )

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
        self.assertEqual(
            WithdrawalRequest.objects.filter(marketer=marketer).count(), 0
        )

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
        # lifetime numbers must never be touched by a cycle reset
        self.assertEqual(marketer.lifetime_total_profit, Decimal('9000.00'))
        self.assertEqual(marketer.lifetime_total_orders, 50)

        settlement = WithdrawalRequest.objects.get(marketer=marketer)
        self.assertTrue(settlement.is_forced_settlement)
        self.assertEqual(settlement.amount, Decimal('1500.50'))
        self.assertEqual(settlement.status, 'paid')
        self.assertEqual(settlement.cycle_number, 0)  # the cycle that just closed
        self.assertIsNotNone(settlement.resolved_at)

    def test_multiple_missed_cycles_advance_correctly(self):
        # 95 days elapsed = 3 full 30-day cycles passed (90 days), 4th not due yet
        marketer = self._make_marketer('cyc4', days_ago=95)
        marketer.monthly_profit_balance = Decimal('100.00')
        marketer.save()

        call_command('process_monthly_cycles', stdout=StringIO())
        marketer.refresh_from_db()

        self.assertEqual(marketer.current_cycle_number, 3)
        self.assertEqual(marketer.monthly_profit_balance, Decimal('0.00'))
        # only the first of the 3 closed cycles had a balance to settle —
        # cycles 2 and 3 closed with a balance of 0 since cycle 1 already
        # zeroed it out
        self.assertEqual(
            WithdrawalRequest.objects.filter(marketer=marketer).count(), 1
        )
        settlement = WithdrawalRequest.objects.get(marketer=marketer)
        self.assertEqual(settlement.amount, Decimal('100.00'))
        self.assertEqual(settlement.cycle_number, 0)

    def test_command_is_idempotent_on_rerun(self):
        marketer = self._make_marketer('cyc5', days_ago=31)
        marketer.monthly_profit_balance = Decimal('300.00')
        marketer.save()

        call_command('process_monthly_cycles', stdout=StringIO())
        call_command('process_monthly_cycles', stdout=StringIO())  # rerun, same day
        marketer.refresh_from_db()

        self.assertEqual(marketer.current_cycle_number, 1)  # not 2
        self.assertEqual(
            WithdrawalRequest.objects.filter(marketer=marketer).count(), 1
        )

    def test_dry_run_does_not_persist_changes(self):
        marketer = self._make_marketer('cyc6', days_ago=31)
        marketer.monthly_profit_balance = Decimal('400.00')
        marketer.save()

        call_command('process_monthly_cycles', '--dry-run', stdout=StringIO())
        marketer.refresh_from_db()

        self.assertEqual(marketer.current_cycle_number, 0)
        self.assertEqual(marketer.monthly_profit_balance, Decimal('400.00'))
        self.assertEqual(
            WithdrawalRequest.objects.filter(marketer=marketer).count(), 0
        )