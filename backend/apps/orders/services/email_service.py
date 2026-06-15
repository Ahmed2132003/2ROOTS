import logging
from typing import Iterable

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags

logger = logging.getLogger(__name__)


class OrderEmailService:
    """Reusable service responsible for composing and sending order emails."""

    @staticmethod
    def _tracking_link(order_id: int) -> str:
        base_url = getattr(settings, 'ORDER_TRACKING_BASE_URL', 'https://yourdomain.com')
        return f"{base_url.rstrip('/')}/track/{order_id}"

    @staticmethod
    def _item_name(item) -> str:
        """Safely resolve product name from OrderItem regardless of model shape."""
        try:
            return item.variant.product.name
        except AttributeError:
            pass
        try:
            return item.product.name
        except AttributeError:
            pass
        return getattr(item, 'name', 'Unknown Product')

    @staticmethod
    def _order_total(order) -> str:
        """Safely resolve total from order regardless of field name."""
        total = getattr(order, 'total', None) or getattr(order, 'total_price', None) or 0
        return total

    @classmethod
    def send_order_confirmation(cls, order) -> bool:
        """Send confirmation email to customer + admin notification."""
        recipient = getattr(order.customer, 'email', '')
        if not recipient:
            logger.warning("Skipping confirmation email for order_id=%s: missing customer email", order.id)
            return False

        context = {
            'order': order,
            'order_items': order.items.all(),
            'tracking_link': cls._tracking_link(order.id),
            'status_label': order.get_status_display(),
        }
        html_content = render_to_string('orders/emails/order_confirmation.html', context)
        text_content = strip_tags(html_content)

        # Send to customer
        result = cls._send_email(
            subject='Order Confirmation — 2Roots',
            body=text_content,
            to_emails=[recipient],
            html_content=html_content,
            order_id=order.id,
            email_type='order_confirmation',
        )

        # Send admin notification
        cls._send_admin_notification(order)

        return result

    @classmethod
    def _send_admin_notification(cls, order) -> bool:
        """Send a new order notification to the store admin."""
        admin_email = getattr(settings, 'ADMIN_ORDER_EMAIL', None)
        if not admin_email:
            logger.warning("ADMIN_ORDER_EMAIL not set — skipping admin notification for order_id=%s", order.id)
            return False

        customer_name  = getattr(order.customer, 'get_full_name', lambda: '')() or getattr(order.customer, 'username', 'Unknown')
        customer_email = getattr(order.customer, 'email', 'N/A')
        order_total    = cls._order_total(order)

        # ── Plain-text body ──────────────────────────────────────────────────
        items_lines = '\n'.join(
            f"  - {cls._item_name(item)} × {item.quantity}  ({item.price} EGP)"
            for item in order.items.select_related('variant__product').all()
        )

        # Shipping info
        shipping_name    = getattr(order, 'shipping_name',    '') or customer_name
        shipping_phone   = getattr(order, 'shipping_phone',   'N/A')
        shipping_address = getattr(order, 'shipping_address', 'N/A')
        shipping_city    = getattr(order, 'shipping_city',    '')
        shipping_region  = getattr(order, 'shipping_region',  None)
        region_name      = getattr(shipping_region, 'name', '') if shipping_region else ''
        full_address     = ', '.join(filter(None, [shipping_address, shipping_city, region_name]))

        body = (
            f"🛒 NEW ORDER — #{order.id}\n"
            f"{'='*40}\n\n"
            f"👤 Customer   : {customer_name}\n"
            f"📧 Email      : {customer_email}\n"
            f"📞 Phone      : {shipping_phone}\n"
            f"📦 Ship To    : {shipping_name}\n"
            f"📍 Address    : {full_address}\n\n"
            f"{'─'*40}\n"
            f"🧾 Items:\n{items_lines}\n"
            f"{'─'*40}\n"
            f"💰 Total      : {order_total} EGP\n"
            f"📋 Status     : {order.get_status_display()}\n\n"
            f"🔗 Track Order: {cls._tracking_link(order.id)}\n"
        )

        # ── HTML body ────────────────────────────────────────────────────────
        items_html = ''.join(
            f"<tr>"
            f"<td style='padding:8px 12px;border-bottom:1px solid #222;'>{cls._item_name(item)}</td>"
            f"<td style='padding:8px 12px;border-bottom:1px solid #222;text-align:center;'>{item.quantity}</td>"
            f"<td style='padding:8px 12px;border-bottom:1px solid #222;text-align:right;'>{item.price} EGP</td>"
            f"</tr>"
            for item in order.items.select_related('variant__product').all()
        )

        html_content = f"""
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#d8d2c2;padding:32px;border-radius:4px;">
          <h2 style="font-family:'Bebas Neue',sans-serif;font-size:28px;letter-spacing:4px;color:#fff;margin:0 0 4px;">
            🛒 NEW ORDER
          </h2>
          <p style="color:#b89b5e;font-size:13px;letter-spacing:2px;margin:0 0 24px;">ORDER #{order.id}</p>

          <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
            <tr>
              <td style="padding:8px 0;color:#888;font-size:12px;width:120px;">Customer</td>
              <td style="padding:8px 0;color:#fff;font-size:13px;">{customer_name}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#888;font-size:12px;">Email</td>
              <td style="padding:8px 0;color:#fff;font-size:13px;">{customer_email}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#888;font-size:12px;">Phone</td>
              <td style="padding:8px 0;color:#fff;font-size:13px;">{shipping_phone}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#888;font-size:12px;">Ship To</td>
              <td style="padding:8px 0;color:#fff;font-size:13px;">{shipping_name}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#888;font-size:12px;">Address</td>
              <td style="padding:8px 0;color:#fff;font-size:13px;">{full_address}</td>
            </tr>
          </table>

          <h3 style="font-size:12px;letter-spacing:3px;color:#888;text-transform:uppercase;margin:0 0 12px;border-top:1px solid #222;padding-top:20px;">
            Items
          </h3>
          <table style="width:100%;border-collapse:collapse;margin-bottom:24px;font-size:13px;">
            <thead>
              <tr style="background:#111;">
                <th style="padding:10px 12px;text-align:left;color:#888;font-size:11px;letter-spacing:2px;font-weight:400;">PRODUCT</th>
                <th style="padding:10px 12px;text-align:center;color:#888;font-size:11px;letter-spacing:2px;font-weight:400;">QTY</th>
                <th style="padding:10px 12px;text-align:right;color:#888;font-size:11px;letter-spacing:2px;font-weight:400;">PRICE</th>
              </tr>
            </thead>
            <tbody style="color:#d8d2c2;">
              {items_html}
            </tbody>
          </table>

          <div style="background:#111;border:1px solid #222;border-radius:4px;padding:16px 20px;margin-bottom:24px;display:flex;justify-content:space-between;">
            <span style="font-size:12px;letter-spacing:2px;color:#888;">TOTAL</span>
            <span style="font-size:22px;color:#fff;font-family:'Bebas Neue',sans-serif;letter-spacing:2px;">{order_total} EGP</span>
          </div>

          <a href="{cls._tracking_link(order.id)}"
             style="display:block;background:#fff;color:#0a0a0a;text-align:center;padding:14px;border-radius:2px;
                    font-size:12px;letter-spacing:3px;font-weight:700;text-decoration:none;">
            VIEW ORDER →
          </a>
        </div>
        """

        return cls._send_email(
            subject=f"[2Roots] 🛒 New Order #{order.id} — {customer_name} ({order_total} EGP)",
            body=body,
            to_emails=[admin_email],
            html_content=html_content,
            order_id=order.id,
            email_type='admin_new_order',
        )

    @classmethod
    def send_order_status_update(cls, order, note: str = '') -> bool:
        recipient = getattr(order.customer, 'email', '')
        if not recipient:
            logger.warning("Skipping status email for order_id=%s: missing customer email", order.id)
            return False

        context = {
            'order': order,
            'status_label': order.get_status_display(),
            'note': note or cls._default_status_note(order.status),
            'tracking_link': cls._tracking_link(order.id),
        }
        html_content = render_to_string('orders/emails/order_status_update.html', context)
        text_content = strip_tags(html_content)

        return cls._send_email(
            subject=f"Order #{order.id} Status Update — 2Roots",
            body=text_content,
            to_emails=[recipient],
            html_content=html_content,
            order_id=order.id,
            email_type='order_status_update',
        )

    @staticmethod
    def _default_status_note(status: str) -> str:
        notes = {
            'pending':   'Your order is pending review and will be confirmed shortly.',
            'confirmed': 'Your order has been confirmed and is now being prepared.',
            'shipped':   'Great news! Your order has been shipped and is on the way.',
            'delivered': 'Your order has been delivered. Thank you for shopping with us!',
            'cancelled': 'Your order has been cancelled. Contact support if you need help.',
        }
        return notes.get(status, 'Your order status has been updated.')

    @staticmethod
    def _send_email(
        *,
        subject: str,
        body: str,
        to_emails: Iterable[str],
        html_content: str,
        order_id: int,
        email_type: str,
    ) -> bool:
        try:
            message = EmailMultiAlternatives(
                subject=subject,
                body=body,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=list(to_emails),
            )
            message.attach_alternative(html_content, 'text/html')
            message.send(fail_silently=False)
            logger.info(
                "Email delivered successfully: type=%s order_id=%s recipients=%s",
                email_type,
                order_id,
                list(to_emails),
            )
            return True
        except Exception as exc:
            logger.exception(
                "Email delivery failed: type=%s order_id=%s error=%s",
                email_type,
                order_id,
                str(exc),
            )
            return False