"""
Custom migration command that works around the django-mongodb-backend
ContentType/create_permissions hash bug.

The issue: Django's post_migrate signal fires `create_permissions`, which
calls `set(ctypes.values())` on ContentType instances. With MongoDB backend,
these instances may not have their PK (ObjectId) set yet, making them
unhashable.

Fix: Disconnect the create_permissions signal, run migrations, then manually
trigger permission creation with proper error handling.
"""

from django.contrib.auth.management import create_permissions
from django.contrib.contenttypes.management import create_contenttypes
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db.models.signals import post_migrate


class Command(BaseCommand):
    help = "Run migrations with MongoDB-safe permission creation"

    def handle(self, *args, **options):
        self.stdout.write("=== MongoDB-safe migration ===")

        # Step 1: Disconnect the problematic signal handlers
        self.stdout.write("Disconnecting post_migrate signals...")
        post_migrate.disconnect(create_permissions,
                                dispatch_uid="django.contrib.auth.management.create_permissions")
        post_migrate.disconnect(create_contenttypes,
                                dispatch_uid="django.contrib.contenttypes.management.create_contenttypes")

        # Step 2: Run migrations without the problematic signal handlers
        self.stdout.write("Running migrations...")
        try:
            call_command("migrate", "--noinput", verbosity=1)
            self.stdout.write(self.style.SUCCESS("Migrations completed successfully."))
        except Exception as e:
            self.stderr.write(self.style.ERROR(f"Migration failed: {e}"))
            raise

        # Step 3: Reconnect signals
        post_migrate.connect(create_contenttypes,
                             dispatch_uid="django.contrib.contenttypes.management.create_contenttypes")
        post_migrate.connect(create_permissions,
                             dispatch_uid="django.contrib.auth.management.create_permissions")

        # Step 4: Manually create content types and permissions with error handling
        self.stdout.write("Creating content types...")
        from django.apps import apps
        for app_config in apps.get_app_configs():
            try:
                create_contenttypes(app_config, verbosity=0)
            except Exception as e:
                self.stderr.write(f"  Warning: contenttypes for {app_config.label}: {e}")

        self.stdout.write("Creating permissions...")
        for app_config in apps.get_app_configs():
            try:
                create_permissions(app_config, verbosity=0)
            except TypeError as e:
                if "unhashable" in str(e):
                    self.stderr.write(
                        f"  Skipping permissions for {app_config.label} "
                        f"(MongoDB PK hash issue — non-fatal)"
                    )
                else:
                    raise
            except Exception as e:
                self.stderr.write(f"  Warning: permissions for {app_config.label}: {e}")

        self.stdout.write(self.style.SUCCESS("=== Migration complete ==="))
