                                                



import django.core.validators

import django.db.models.deletion

from decimal import Decimal

from django.db import migrations, models





class Migration(migrations.Migration):



    initial = True



    dependencies = [

        ("inventory", "0001_initial"),

    ]



    operations = [

        migrations.CreateModel(

            name="DemandForecast",

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

                ("forecast_period_start", models.DateField()),

                ("forecast_period_end", models.DateField()),

                (

                    "predicted_demand",

                    models.DecimalField(decimal_places=2, max_digits=12),

                ),

                ("model_name", models.CharField(max_length=50)),

                (

                    "mae",

                    models.DecimalField(

                        blank=True, decimal_places=4, max_digits=12, null=True

                    ),

                ),

                (

                    "rmse",

                    models.DecimalField(

                        blank=True, decimal_places=4, max_digits=12, null=True

                    ),

                ),

                (

                    "mape",

                    models.DecimalField(

                        blank=True, decimal_places=4, max_digits=8, null=True

                    ),

                ),

                ("generated_at", models.DateTimeField(auto_now_add=True)),

                (

                    "product",

                    models.ForeignKey(

                        on_delete=django.db.models.deletion.CASCADE,

                        related_name="demand_forecasts",

                        to="inventory.product",

                    ),

                ),

            ],

            options={

                "ordering": ["-generated_at"],

            },

        ),

        migrations.CreateModel(

            name="PredictiveAlert",

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

                ("predicted_stockout_date", models.DateField()),

                ("threshold_date", models.DateField()),

                (

                    "severity",

                    models.CharField(

                        choices=[("critical", "Critical"), ("warning", "Warning")],

                        max_length=20,

                    ),

                ),

                ("explanation_json", models.JSONField(default=dict)),

                ("is_resolved", models.BooleanField(default=False)),

                ("generated_at", models.DateTimeField(auto_now_add=True)),

                (

                    "product",

                    models.ForeignKey(

                        on_delete=django.db.models.deletion.CASCADE,

                        related_name="predictive_alerts",

                        to="inventory.product",

                    ),

                ),

            ],

            options={

                "ordering": ["-generated_at"],

            },

        ),

        migrations.CreateModel(

            name="ReorderRecommendation",

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

                ("current_stock", models.PositiveIntegerField()),

                ("lead_time_days", models.PositiveIntegerField()),

                (

                    "predicted_demand",

                    models.DecimalField(decimal_places=2, max_digits=12),

                ),

                ("reorder_point", models.PositiveIntegerField()),

                ("suggested_quantity", models.PositiveIntegerField()),

                (

                    "priority",

                    models.CharField(

                        choices=[

                            ("Critical", "Critical"),

                            ("High", "High"),

                            ("Medium", "Medium"),

                            ("Low", "Low"),

                        ],

                        max_length=20,

                    ),

                ),

                (

                    "stockout_risk",

                    models.DecimalField(

                        decimal_places=2,

                        max_digits=5,

                        validators=[

                            django.core.validators.MinValueValidator(Decimal("0"))

                        ],

                    ),

                ),

                ("explanation_json", models.JSONField(default=dict)),

                ("generated_at", models.DateTimeField(auto_now_add=True)),

                ("is_active", models.BooleanField(default=True)),

                (

                    "product",

                    models.ForeignKey(

                        on_delete=django.db.models.deletion.CASCADE,

                        related_name="reorder_recommendations",

                        to="inventory.product",

                    ),

                ),

            ],

            options={

                "ordering": ["-generated_at"],

            },

        ),

    ]

