                                                



import django.db.models.deletion

from django.conf import settings

from django.db import migrations, models





class Migration(migrations.Migration):



    initial = True



    dependencies = [

        migrations.swappable_dependency(settings.AUTH_USER_MODEL),

    ]



    operations = [

        migrations.CreateModel(

            name="ActivityLog",

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

                ("entity_type", models.CharField(max_length=50)),

                ("entity_id", models.CharField(max_length=50)),

                ("entity_name", models.CharField(blank=True, max_length=255)),

                ("action", models.CharField(max_length=100)),

                ("before_json", models.JSONField(blank=True, null=True)),

                ("after_json", models.JSONField(blank=True, null=True)),

                ("details", models.TextField(blank=True)),

                ("ip_address", models.GenericIPAddressField(blank=True, null=True)),

                ("created_at", models.DateTimeField(auto_now_add=True)),

                (

                    "user",

                    models.ForeignKey(

                        on_delete=django.db.models.deletion.PROTECT,

                        related_name="activity_logs",

                        to=settings.AUTH_USER_MODEL,

                    ),

                ),

            ],

            options={

                "ordering": ["-created_at"],

                "indexes": [

                    models.Index(

                        fields=["entity_type", "entity_id"],

                        name="audit_activ_entity__5a526e_idx",

                    ),

                    models.Index(

                        fields=["user", "created_at"],

                        name="audit_activ_user_id_82a5c3_idx",

                    ),

                ],

            },

        ),

    ]

