                                                



import django.core.validators

import django.db.models.deletion

from decimal import Decimal

from django.db import migrations, models





class Migration(migrations.Migration):



    initial = True



    dependencies = [

        ("core", "0001_initial"),

        ("suppliers", "0001_initial"),

    ]



    operations = [

        migrations.CreateModel(

            name="Category",

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

                ("name", models.CharField(max_length=100)),

                ("description", models.TextField(blank=True)),

                (

                    "organization",

                    models.ForeignKey(

                        on_delete=django.db.models.deletion.CASCADE,

                        related_name="categories",

                        to="core.organization",

                    ),

                ),

            ],

            options={

                "ordering": ["name"],

                "unique_together": {("organization", "name")},

            },

        ),

        migrations.CreateModel(

            name="Location",

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

                ("name", models.CharField(max_length=150)),

                (

                    "location_type",

                    models.CharField(

                        choices=[

                            ("warehouse", "Warehouse"),

                            ("store", "Store"),

                            ("office", "Office"),

                        ],

                        default="warehouse",

                        max_length=20,

                    ),

                ),

                ("address", models.TextField(blank=True)),

                ("is_active", models.BooleanField(default=True)),

                ("capacity", models.PositiveIntegerField(blank=True, null=True)),

                (

                    "organization",

                    models.ForeignKey(

                        on_delete=django.db.models.deletion.CASCADE,

                        related_name="locations",

                        to="core.organization",

                    ),

                ),

            ],

            options={

                "ordering": ["name"],

                "unique_together": {("organization", "name")},

            },

        ),

        migrations.CreateModel(

            name="Product",

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

                ("sku", models.CharField(max_length=50)),

                ("name", models.CharField(max_length=255)),

                ("description", models.TextField(blank=True)),

                (

                    "unit_price",

                    models.DecimalField(

                        decimal_places=2,

                        max_digits=12,

                        validators=[

                            django.core.validators.MinValueValidator(Decimal("0"))

                        ],

                    ),

                ),

                ("minimum_level", models.PositiveIntegerField(default=10)),

                ("reorder_level", models.PositiveIntegerField(default=20)),

                ("barcode", models.CharField(blank=True, max_length=100)),

                ("qr_code", models.CharField(blank=True, max_length=255)),

                ("is_active", models.BooleanField(default=True)),

                (

                    "category",

                    models.ForeignKey(

                        on_delete=django.db.models.deletion.PROTECT,

                        related_name="products",

                        to="inventory.category",

                    ),

                ),

                (

                    "organization",

                    models.ForeignKey(

                        on_delete=django.db.models.deletion.CASCADE,

                        related_name="products",

                        to="core.organization",

                    ),

                ),

                (

                    "supplier",

                    models.ForeignKey(

                        on_delete=django.db.models.deletion.PROTECT,

                        related_name="products",

                        to="suppliers.supplier",

                    ),

                ),

            ],

            options={

                "ordering": ["name"],

            },

        ),

        migrations.CreateModel(

            name="InventoryBalance",

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

                ("quantity_on_hand", models.PositiveIntegerField(default=0)),

                ("reserved_qty", models.PositiveIntegerField(default=0)),

                (

                    "location",

                    models.ForeignKey(

                        on_delete=django.db.models.deletion.CASCADE,

                        related_name="inventory_balances",

                        to="inventory.location",

                    ),

                ),

                (

                    "product",

                    models.ForeignKey(

                        on_delete=django.db.models.deletion.CASCADE,

                        related_name="inventory_balances",

                        to="inventory.product",

                    ),

                ),

            ],

        ),

        migrations.AddIndex(

            model_name="product",

            index=models.Index(

                fields=["organization", "sku"], name="inventory_p_organiz_3eeb06_idx"

            ),

        ),

        migrations.AddIndex(

            model_name="product",

            index=models.Index(

                fields=["organization", "name"], name="inventory_p_organiz_520caf_idx"

            ),

        ),

        migrations.AlterUniqueTogether(

            name="product",

            unique_together={("organization", "sku")},

        ),

        migrations.AddIndex(

            model_name="inventorybalance",

            index=models.Index(

                fields=["product", "location"], name="inventory_i_product_377eda_idx"

            ),

        ),

        migrations.AlterUniqueTogether(

            name="inventorybalance",

            unique_together={("product", "location")},

        ),

    ]

