                                                



import django.db.models.deletion

from django.conf import settings

from django.db import migrations, models





class Migration(migrations.Migration):



    initial = True



    dependencies = [

        ("core", "0001_initial"),

        migrations.swappable_dependency(settings.AUTH_USER_MODEL),

    ]



    operations = [

        migrations.CreateModel(

            name="Notification",

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

                (

                    "notification_type",

                    models.CharField(

                        choices=[

                            ("low_stock", "Low Stock"),

                            ("out_of_stock", "Out of Stock"),

                            ("predictive", "Predictive Stockout"),

                            ("expiry", "Expiry"),

                            ("anomaly", "Anomaly"),

                            ("system", "System"),

                        ],

                        max_length=30,

                    ),

                ),

                ("title", models.CharField(max_length=255)),

                ("message", models.TextField()),

                (

                    "severity",

                    models.CharField(

                        choices=[

                            ("critical", "Critical"),

                            ("warning", "Warning"),

                            ("info", "Info"),

                        ],

                        default="warning",

                        max_length=20,

                    ),

                ),

                ("related_entity_type", models.CharField(blank=True, max_length=50)),

                ("related_entity_id", models.CharField(blank=True, max_length=50)),

                ("explanation_json", models.JSONField(blank=True, null=True)),

                ("is_read", models.BooleanField(default=False)),

                ("created_at", models.DateTimeField(auto_now_add=True)),

                (

                    "organization",

                    models.ForeignKey(

                        on_delete=django.db.models.deletion.CASCADE,

                        related_name="notifications",

                        to="core.organization",

                    ),

                ),

                (

                    "user",

                    models.ForeignKey(

                        blank=True,

                        null=True,

                        on_delete=django.db.models.deletion.CASCADE,

                        related_name="notifications",

                        to=settings.AUTH_USER_MODEL,

                    ),

                ),

            ],

            options={

                "ordering": ["-created_at"],

                "indexes": [

                    models.Index(

                        fields=["organization", "is_read", "severity"],

                        name="notificatio_organiz_fc9712_idx",

                    )

                ],

            },

        ),

    ]

