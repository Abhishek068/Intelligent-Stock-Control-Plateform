                                                



import django.db.models.deletion

from django.db import migrations, models





class Migration(migrations.Migration):



    initial = True



    dependencies = []



    operations = [

        migrations.CreateModel(

            name="Organization",

            fields=[

                (

                    "id",

                    models.BigAutoField(

                        auto_created=True,

                        primary_key=True,

                        serialize=False,

                        verbose_name="ID",

                    ),

                ),

                ("created_at", models.DateTimeField(auto_now_add=True)),

                ("updated_at", models.DateTimeField(auto_now=True)),

                ("name", models.CharField(max_length=255)),

                ("slug", models.SlugField(max_length=100, unique=True)),

                ("is_active", models.BooleanField(default=True)),

            ],

            options={

                "ordering": ["name"],

            },

        ),

        migrations.CreateModel(

            name="OrganizationSettings",

            fields=[

                (

                    "id",

                    models.BigAutoField(

                        auto_created=True,

                        primary_key=True,

                        serialize=False,

                        verbose_name="ID",

                    ),

                ),

                ("created_at", models.DateTimeField(auto_now_add=True)),

                ("updated_at", models.DateTimeField(auto_now=True)),

                ("default_minimum_level", models.PositiveIntegerField(default=10)),

                ("default_reorder_level", models.PositiveIntegerField(default=20)),

                ("enable_predictive_alerts", models.BooleanField(default=True)),

                ("enable_email_notifications", models.BooleanField(default=False)),

                (

                    "forecast_model",

                    models.CharField(default="exponential_smoothing", max_length=50),

                ),

                ("forecast_horizon_days", models.PositiveIntegerField(default=30)),

                ("company_name", models.CharField(blank=True, max_length=255)),

                ("company_address", models.TextField(blank=True)),

                ("currency_code", models.CharField(default="GBP", max_length=3)),

                (

                    "organization",

                    models.OneToOneField(

                        on_delete=django.db.models.deletion.CASCADE,

                        related_name="settings",

                        to="core.organization",

                    ),

                ),

            ],

            options={

                "abstract": False,

            },

        ),

    ]

