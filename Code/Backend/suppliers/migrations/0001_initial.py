                                                



import django.db.models.deletion

from django.db import migrations, models





class Migration(migrations.Migration):



    initial = True



    dependencies = [

        ("core", "0001_initial"),

    ]



    operations = [

        migrations.CreateModel(

            name="Supplier",

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

                ("contact_name", models.CharField(blank=True, max_length=150)),

                ("email", models.EmailField(blank=True, max_length=254)),

                ("phone", models.CharField(blank=True, max_length=30)),

                ("address", models.TextField(blank=True)),

                ("lead_time_days", models.PositiveIntegerField(default=7)),

                (

                    "status",

                    models.CharField(

                        choices=[("active", "Active"), ("inactive", "Inactive")],

                        default="active",

                        max_length=20,

                    ),

                ),

                (

                    "delivery_reliability",

                    models.DecimalField(decimal_places=2, default=90.0, max_digits=5),

                ),

                (

                    "organization",

                    models.ForeignKey(

                        on_delete=django.db.models.deletion.CASCADE,

                        related_name="suppliers",

                        to="core.organization",

                    ),

                ),

            ],

            options={

                "ordering": ["name"],

                "unique_together": {("organization", "name")},

            },

        ),

    ]

