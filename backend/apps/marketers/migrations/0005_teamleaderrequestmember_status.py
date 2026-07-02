from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('marketers', '0004_alter_marketerorderitem_id'),
    ]

    operations = [
        migrations.AddField(
            model_name='teamleaderrequestmember',
            name='status',
            field=models.CharField(
                choices=[('pending', 'Pending'), ('accepted', 'Accepted'), ('declined', 'Declined')],
                db_index=True,
                default='pending',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='teamleaderrequestmember',
            name='responded_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]