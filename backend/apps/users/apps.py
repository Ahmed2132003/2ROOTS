from django.apps import AppConfig


class UsersConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.users'  # ⚠️ مهم يكون apps.users مش users بس

    def ready(self):
        import apps.users.signals  # تسجيل الـ signals