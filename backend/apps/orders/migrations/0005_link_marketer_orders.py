# apps/orders/migrations/0005_link_marketer_orders.py
#
# ⚠️ مهم قبل التشغيل: غيّر رقم الميجريشن (0005) واسم dependency بتاعة
# ('orders', '...') تحت لو عندك migrations بعد 0004_order_customer_account
# في مجلد apps/orders/migrations/ مش ظاهرة لي (كنت معايا 0002 بس وقت الكتابة).
# اعمل: python manage.py showmigrations orders
# وحط آخر اسم migration موجود فعليًا بدل القيمة تحت.
#
# نفس الكلام بالظبط على dependency بتاعة ('marketers', '...') — حط آخر
# migration موجودة فعليًا في apps/marketers/migrations/ (اللي بتعمل فيها
# create للموديل Marketer)، مش بالضرورة '0001_initial'.

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0004_order_customer_account'),  # ⚠️ تأكد إنها آخر واحدة فعليًا
        ('marketers', '0001_initial'),  # ⚠️ تأكد إنها آخر واحدة فعليًا
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='is_marketer_order',
            field=models.BooleanField(default=False, db_index=True),
        ),
        migrations.AddField(
            model_name='order',
            name='marketer',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='linked_orders',
                to='marketers.marketer',
            ),
        ),
    ]