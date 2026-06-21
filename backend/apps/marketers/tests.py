from decimal import Decimal

from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.products.models import Category, Product
from apps.marketers.models import Marketer, MarketerOrder, MarketerProductPrice
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
        self.assertEqual(len(resp.data), 1)
        self.assertEqual(resp.data[0]['customer_name'], 'X')

    def test_non_admin_cannot_access_dashboard_endpoints(self):
        self._auth_as(self.marketer_user)
        resp = self.client.get('/api/dashboard/marketer-orders/')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)