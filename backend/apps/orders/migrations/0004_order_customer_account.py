from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0003_customeraccount"),
        ("orders", "0003_order_shipping_email"),
    ]

    operations = [
        migrations.AddField(
            model_name="order",
            name="customer_account",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="orders",
                to="users.customeraccount",
            ),
        ),
    ]