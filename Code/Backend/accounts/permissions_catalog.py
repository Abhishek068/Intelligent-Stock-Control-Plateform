MODULES = [
    ("dashboard", "Dashboard"),
    ("users", "Users"),
    ("roles", "Roles"),
    ("products", "Products"),
    ("categories", "Categories"),
    ("suppliers", "Suppliers"),
    ("stock_in", "Stock In"),
    ("stock_out", "Stock Out"),
    ("adjustments", "Adjustments"),
    ("transfers", "Transfers"),
    ("stock_take", "Stock Take"),
    ("purchase_orders", "Purchase Orders"),
    ("customers", "Customers"),
    ("invoices", "Invoices"),
    ("forecasting", "Forecasting"),
    ("alerts", "Alerts"),
    ("reports", "Reports"),
    ("audit", "Audit"),
    ("settings", "Settings"),
    ("notifications", "Notifications"),
    ("emails", "Emails"),
]

ACTIONS = [
    ("view", "View"),
    ("create", "Create"),
    ("edit", "Edit"),
    ("delete", "Delete"),
    ("export", "Export"),
    ("approve", "Approve"),
    ("manage", "Manage"),
]

MODULE_CODES = [m[0] for m in MODULES]
ACTION_CODES = [a[0] for a in ACTIONS]

MANAGER_DEFAULTS = {
    "dashboard": ["view"],
    "products": ["view", "create", "edit", "delete", "export"],
    "categories": ["view", "create", "edit", "delete"],
    "suppliers": ["view", "create", "edit", "delete"],
    "stock_in": ["view", "create", "edit", "export"],
    "stock_out": ["view", "create", "edit", "export"],
    "adjustments": ["view", "create", "approve"],
    "transfers": ["view", "create", "approve"],
    "stock_take": ["view", "create", "edit", "delete", "approve"],
    "purchase_orders": ["view", "create", "edit", "delete", "approve"],
    "customers": ["view", "create", "edit", "delete"],
    "invoices": ["view", "create", "edit", "delete", "approve", "export"],
    "forecasting": ["view", "create", "edit", "manage", "export"],
    "alerts": ["view", "create", "edit", "manage"],
    "audit": ["view", "export"],
    "settings": ["view"],
    "notifications": ["view", "create", "edit", "manage"],
    "emails": ["view"],
}

STAFF_DEFAULTS = {
    "dashboard": ["view"],
    "products": ["view"],
    "categories": ["view"],
    "stock_in": ["view", "create"],
    "stock_out": ["view", "create"],
    "forecasting": ["view", "create"],
    "alerts": ["view", "create"],
    "notifications": ["view", "create", "edit"],
}


def catalog_as_list():
    return {
        "modules": [{"code": c, "label": l} for c, l in MODULES],
        "actions": [{"code": c, "label": l} for c, l in ACTIONS],
    }
