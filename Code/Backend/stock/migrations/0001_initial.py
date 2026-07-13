                                                



import django.core.validators

import django.db.models.deletion

from decimal import Decimal

from django.conf import settings

from django.db import migrations, models





class Migration(migrations.Migration):



    initial = True



    dependencies = [

        ("inventory", "0001_initial"),

        ("suppliers", "0001_initial"),

        migrations.swappable_dependency(settings.AUTH_USER_MODEL),

    ]



    operations = [

        migrations.CreateModel(

            name="StockAdjustment",

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

                ("previous_qty", models.PositiveIntegerField()),

                ("adjusted_qty", models.PositiveIntegerField()),

                ("reason", models.TextField()),

                ("adjusted_at", models.DateTimeField()),

                (

                    "created_by",

                    models.ForeignKey(

                        on_delete=django.db.models.deletion.PROTECT,

                        related_name="stock_adjustments",

                        to=settings.AUTH_USER_MODEL,

                    ),

                ),

                (

                    "location",

                    models.ForeignKey(

                        on_delete=django.db.models.deletion.PROTECT,

                        related_name="stock_adjustments",

                        to="inventory.location",

                    ),

                ),

                (

                    "product",

                    models.ForeignKey(

                        on_delete=django.db.models.deletion.PROTECT,

                        related_name="stock_adjustments",

                        to="inventory.product",

                    ),

                ),

            ],

            options={

                "ordering": ["-adjusted_at"],

            },

        ),

        migrations.CreateModel(

            name="StockInTransaction",

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

                (

                    "quantity",

                    models.PositiveIntegerField(

                        validators=[django.core.validators.MinValueValidator(1)]

                    ),

                ),

                (

                    "unit_cost",

                    models.DecimalField(

                        decimal_places=2,

                        default=0,

                        max_digits=12,

                        validators=[

                            django.core.validators.MinValueValidator(Decimal("0"))

                        ],

                    ),

                ),

                ("reference", models.CharField(blank=True, max_length=100)),

                ("notes", models.TextField(blank=True)),

                ("received_at", models.DateTimeField()),

                (

                    "created_by",

                    models.ForeignKey(

                        on_delete=django.db.models.deletion.PROTECT,

                        related_name="stock_in_transactions",

                        to=settings.AUTH_USER_MODEL,

                    ),

                ),

                (

                    "location",

                    models.ForeignKey(

                        on_delete=django.db.models.deletion.PROTECT,

                        related_name="stock_in_transactions",

                        to="inventory.location",

                    ),

                ),

                (

                    "product",

                    models.ForeignKey(

                        on_delete=django.db.models.deletion.PROTECT,

                        related_name="stock_in_transactions",

                        to="inventory.product",

                    ),

                ),

                (

                    "supplier",

                    models.ForeignKey(

                        on_delete=django.db.models.deletion.PROTECT,

                        related_name="stock_in_transactions",

                        to="suppliers.supplier",

                    ),

                ),

            ],

            options={

                "ordering": ["-received_at"],

            },

        ),

        migrations.CreateModel(

            name="StockOutTransaction",

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

                (

                    "quantity",

                    models.PositiveIntegerField(

                        validators=[django.core.validators.MinValueValidator(1)]

                    ),

                ),

                ("issued_to", models.CharField(blank=True, max_length=255)),

                ("reference", models.CharField(blank=True, max_length=100)),

                ("notes", models.TextField(blank=True)),

                ("issued_at", models.DateTimeField()),

                (

                    "created_by",

                    models.ForeignKey(

                        on_delete=django.db.models.deletion.PROTECT,

                        related_name="stock_out_transactions",

                        to=settings.AUTH_USER_MODEL,

                    ),

                ),

                (

                    "location",

                    models.ForeignKey(

                        on_delete=django.db.models.deletion.PROTECT,

                        related_name="stock_out_transactions",

                        to="inventory.location",

                    ),

                ),

                (

                    "product",

                    models.ForeignKey(

                        on_delete=django.db.models.deletion.PROTECT,

                        related_name="stock_out_transactions",

                        to="inventory.product",

                    ),

                ),

            ],

            options={

                "ordering": ["-issued_at"],

            },

        ),

        migrations.CreateModel(

            name="StockTransfer",

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

                (

                    "quantity",

                    models.PositiveIntegerField(

                        validators=[django.core.validators.MinValueValidator(1)]

                    ),

                ),

                (

                    "status",

                    models.CharField(

                        choices=[

                            ("draft", "Draft"),

                            ("in_transit", "In Transit"),

                            ("completed", "Completed"),

                            ("cancelled", "Cancelled"),

                        ],

                        default="draft",

                        max_length=20,

                    ),

                ),

                ("notes", models.TextField(blank=True)),

                ("transferred_at", models.DateTimeField(blank=True, null=True)),

                (

                    "created_by",

                    models.ForeignKey(

                        on_delete=django.db.models.deletion.PROTECT,

                        related_name="stock_transfers",

                        to=settings.AUTH_USER_MODEL,

                    ),

                ),

                (

                    "destination_location",

                    models.ForeignKey(

                        on_delete=django.db.models.deletion.PROTECT,

                        related_name="transfers_in",

                        to="inventory.location",

                    ),

                ),

                (

                    "product",

                    models.ForeignKey(

                        on_delete=django.db.models.deletion.PROTECT,

                        related_name="stock_transfers",

                        to="inventory.product",

                    ),

                ),

                (

                    "source_location",

                    models.ForeignKey(

                        on_delete=django.db.models.deletion.PROTECT,

                        related_name="transfers_out",

                        to="inventory.location",

                    ),

                ),

            ],

            options={

                "ordering": ["-created_at"],

            },

        ),

    ]

