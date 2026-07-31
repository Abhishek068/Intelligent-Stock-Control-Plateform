from decimal import Decimal, InvalidOperation

import pandas as pd
from celery import shared_task
from django.db import transaction

from activity.services import record_activity
from inventory.models import Category, Product, ProductImportJob
from suppliers.models import Supplier


REQUIRED_COLUMNS = {"sku", "name", "category", "supplier"}
OPTIONAL_COLUMNS = {
    "unit_price",
    "minimum_level",
    "reorder_level",
    "barcode",
    "description",
}


def _clean(value):
    return "" if pd.isna(value) else str(value).strip()


def _load_rows(job):
    name = job.file.name.lower()
    if name.endswith(".csv"):
        frame = pd.read_csv(job.file.path, dtype=str, keep_default_na=False)
    elif name.endswith((".xlsx", ".xls")):
        frame = pd.read_excel(job.file.path, dtype=str, keep_default_na=False)
    else:
        raise ValueError("Only CSV and Excel (.xlsx/.xls) files are supported.")

    frame.columns = [_clean(column).lower() for column in frame.columns]
    missing = REQUIRED_COLUMNS.difference(frame.columns)
    if missing:
        raise ValueError(f"Missing required columns: {', '.join(sorted(missing))}.")
    return frame.fillna("")


def _validate_rows(frame, organization):
    errors = []
    normalized = []
    seen_skus = set()
    existing_skus = set(
        Product.objects.filter(organization=organization).values_list("sku", flat=True)
    )
    suppliers = {
        supplier.name.casefold(): supplier
        for supplier in Supplier.objects.filter(organization=organization)
    }

    for index, row in frame.iterrows():
        row_number = index + 2
        values = {column: _clean(row.get(column, "")) for column in REQUIRED_COLUMNS | OPTIONAL_COLUMNS}
        sku = values["sku"]
        name = values["name"]
        category_name = values["category"]
        supplier_name = values["supplier"]

        if not sku:
            errors.append(f"Row {row_number}: SKU is required.")
        elif sku in existing_skus:
            errors.append(f"Row {row_number}: Product with SKU '{sku}' already exists.")
        elif sku.casefold() in seen_skus:
            errors.append(f"Row {row_number}: SKU '{sku}' is duplicated in the file.")
        seen_skus.add(sku.casefold())

        if not name:
            errors.append(f"Row {row_number}: Name is required.")
        if not category_name:
            errors.append(f"Row {row_number}: Category is required.")
        if not supplier_name:
            errors.append(f"Row {row_number}: Supplier is required.")
        elif supplier_name.casefold() not in suppliers:
            errors.append(f"Row {row_number}: Supplier '{supplier_name}' was not found.")

        try:
            unit_price = Decimal(values["unit_price"] or "0")
            minimum_level = int(values["minimum_level"] or "10")
            reorder_level = int(values["reorder_level"] or "20")
            if unit_price < 0 or minimum_level < 0 or reorder_level < 0:
                raise ValueError
        except (InvalidOperation, ValueError):
            errors.append(f"Row {row_number}: Price and stock thresholds must be non-negative numbers.")
            continue

        normalized.append(
            {
                "sku": sku,
                "name": name,
                "category_name": category_name,
                "supplier": suppliers.get(supplier_name.casefold()),
                "unit_price": unit_price,
                "minimum_level": minimum_level,
                "reorder_level": reorder_level,
                "barcode": values["barcode"],
                "description": values["description"],
            }
        )
    return normalized, errors


@shared_task
def process_product_import_job(job_id):
    job = ProductImportJob.objects.select_related("organization", "created_by").get(pk=job_id)
    job.status = ProductImportJob.Status.VALIDATING
    job.progress = 10
    job.errors = []
    job.save(update_fields=["status", "progress", "errors", "updated_at"])

    try:
        frame = _load_rows(job)
        job.total_rows = len(frame)
        job.progress = 40
        job.save(update_fields=["total_rows", "progress", "updated_at"])
        rows, errors = _validate_rows(frame, job.organization)
        if errors:
            job.status = ProductImportJob.Status.FAILED
            job.progress = 100
            job.errors = errors
            job.save(update_fields=["status", "progress", "errors", "updated_at"])
            return {"status": job.status, "errors": errors}

        job.status = ProductImportJob.Status.IMPORTING
        job.progress = 70
        job.save(update_fields=["status", "progress", "updated_at"])
        with transaction.atomic():
            categories = {}
            for row in rows:
                category = categories.get(row["category_name"].casefold())
                if not category:
                    category, _ = Category.objects.get_or_create(
                        organization=job.organization, name=row["category_name"]
                    )
                    categories[row["category_name"].casefold()] = category
                Product.objects.create(
                    organization=job.organization,
                    category=category,
                    supplier=row["supplier"],
                    sku=row["sku"],
                    name=row["name"],
                    description=row["description"],
                    unit_price=row["unit_price"],
                    minimum_level=row["minimum_level"],
                    reorder_level=row["reorder_level"],
                    barcode=row["barcode"],
                )

        job.status = ProductImportJob.Status.COMPLETED
        job.progress = 100
        job.imported_count = len(rows)
        job.save(
            update_fields=["status", "progress", "imported_count", "updated_at"]
        )
        if job.created_by:
            record_activity(
                organization=job.organization,
                user=job.created_by,
                event_type="product_imported",
                title=f"Products imported: {job.imported_count}",
                description=f"Bulk import job {job.id} completed.",
                entity_type="ProductImportJob",
                entity_id=str(job.id),
            )
        return {"status": job.status, "count": job.imported_count}
    except Exception as exc:
        job.status = ProductImportJob.Status.FAILED
        job.progress = 100
        job.errors = [str(exc)]
        job.save(update_fields=["status", "progress", "errors", "updated_at"])
        return {"status": job.status, "errors": job.errors}
