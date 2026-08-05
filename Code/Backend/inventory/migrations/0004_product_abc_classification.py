

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("inventory", "0003_productimportjob"),
    ]

    operations = [
        migrations.AddField(
            model_name="product",
            name="abc_classification",
            field=models.CharField(
                blank=True, choices=[("A", "A"), ("B", "B"), ("C", "C")], max_length=1
            ),
        ),
    ]
