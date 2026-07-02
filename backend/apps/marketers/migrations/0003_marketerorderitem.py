from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0004_product_discount_soldout'),
        ('orders', '0005_link_marketer_orders'),
        ('marketers', '0002_link_order_and_shipping'),
    ]

    operations = [
        migrations.AlterField(
            model_name='marketerorder',
            name='product',
            field=models.ForeignKey(
                null=True, blank=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='marketer_orders', to='products.product',
            ),
        ),
        migrations.AlterField(
            model_name='marketerorder',
            name='quantity',
            field=models.PositiveIntegerField(null=True, blank=True),
        ),
        migrations.AlterField(
            model_name='marketerorder',
            name='sale_price_per_unit',
            field=models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True),
        ),
        migrations.AlterField(
            model_name='marketerorder',
            name='assigned_price_per_unit',
            field=models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True),
        ),
        migrations.CreateModel(
            name='MarketerOrderItem',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('quantity', models.PositiveIntegerField()),
                ('sale_price_per_unit', models.DecimalField(max_digits=10, decimal_places=2)),
                ('assigned_price_per_unit', models.DecimalField(max_digits=10, decimal_places=2)),
                ('profit_amount', models.DecimalField(max_digits=10, decimal_places=2)),
                ('order', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='items', to='marketers.marketerorder',
                )),
                ('product', models.ForeignKey(
                    null=True, on_delete=django.db.models.deletion.SET_NULL,
                    related_name='marketer_order_items', to='products.product',
                )),
                ('variant', models.ForeignKey(
                    null=True, blank=True, on_delete=django.db.models.deletion.SET_NULL,
                    related_name='marketer_order_items', to='products.productvariant',
                )),
            ],
            options={
                'verbose_name': 'Marketer Order Item',
                'verbose_name_plural': 'Marketer Order Items',
            },
        ),
    ]