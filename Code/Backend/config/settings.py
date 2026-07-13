import os

from datetime import timedelta

from pathlib import Path



import environ



BASE_DIR = Path(__file__).resolve().parent.parent



env = environ.Env(

    DJANGO_DEBUG=(bool, False),

    JWT_ACCESS_TOKEN_LIFETIME_MINUTES=(int, 60),

    JWT_REFRESH_TOKEN_LIFETIME_DAYS=(int, 7),

)



environ.Env.read_env(os.path.join(BASE_DIR, ".env"))



SECRET_KEY = env("DJANGO_SECRET_KEY")

DEBUG = env("DJANGO_DEBUG")

ALLOWED_HOSTS = env.list("DJANGO_ALLOWED_HOSTS", default=["localhost", "127.0.0.1"])



INSTALLED_APPS = [

    "django.contrib.admin",

    "django.contrib.auth",

    "django.contrib.contenttypes",

    "django.contrib.sessions",

    "django.contrib.messages",

    "django.contrib.staticfiles",

    "rest_framework",

    "rest_framework_simplejwt",

    "corsheaders",

    "django_filters",

    "drf_spectacular",

    "core",

    "accounts",

    "inventory",

    "suppliers",

    "stock",

    "audit",

    "notifications",

    "analytics",

]



MIDDLEWARE = [

    "django.middleware.security.SecurityMiddleware",

    "corsheaders.middleware.CorsMiddleware",

    "django.contrib.sessions.middleware.SessionMiddleware",

    "django.middleware.common.CommonMiddleware",

    "django.middleware.csrf.CsrfViewMiddleware",

    "django.contrib.auth.middleware.AuthenticationMiddleware",

    "django.contrib.messages.middleware.MessageMiddleware",

    "django.middleware.clickjacking.XFrameOptionsMiddleware",

]



ROOT_URLCONF = "config.urls"



TEMPLATES = [

    {

        "BACKEND": "django.template.backends.django.DjangoTemplates",

        "DIRS": [],

        "APP_DIRS": True,

        "OPTIONS": {

            "context_processors": [

                "django.template.context_processors.request",

                "django.contrib.auth.context_processors.auth",

                "django.contrib.messages.context_processors.messages",

            ],

        },

    },

]



WSGI_APPLICATION = "config.wsgi.application"



DATABASES = {"default": env.db("DATABASE_URL")}



AUTH_USER_MODEL = "accounts.User"



AUTHENTICATION_BACKENDS = [

    "accounts.backends.EmailAuthBackend",

    "django.contrib.auth.backends.ModelBackend",

]



AUTH_PASSWORD_VALIDATORS = [

    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},

    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},

    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},

    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},

]



LANGUAGE_CODE = "en-gb"

TIME_ZONE = "UTC"

USE_I18N = True

USE_TZ = True



STATIC_URL = "static/"

STATIC_ROOT = BASE_DIR / "staticfiles"



DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"



CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS", default=["http://localhost:3000"])

CORS_ALLOW_CREDENTIALS = True



REST_FRAMEWORK = {

    "DEFAULT_AUTHENTICATION_CLASSES": (

        "rest_framework_simplejwt.authentication.JWTAuthentication",

    ),

    "DEFAULT_PERMISSION_CLASSES": (

        "core.permissions.IsOrganizationMember",

    ),

    "DEFAULT_FILTER_BACKENDS": (

        "django_filters.rest_framework.DjangoFilterBackend",

        "rest_framework.filters.SearchFilter",

        "rest_framework.filters.OrderingFilter",

    ),

    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",

    "PAGE_SIZE": 20,

    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",

    "EXCEPTION_HANDLER": "core.exceptions.custom_exception_handler",

}



SIMPLE_JWT = {

    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=env("JWT_ACCESS_TOKEN_LIFETIME_MINUTES")),

    "REFRESH_TOKEN_LIFETIME": timedelta(days=env("JWT_REFRESH_TOKEN_LIFETIME_DAYS")),

    "ROTATE_REFRESH_TOKENS": True,

    "BLACKLIST_AFTER_ROTATION": False,

    "UPDATE_LAST_LOGIN": True,

}



SPECTACULAR_SETTINGS = {

    "TITLE": "StockSense API",

    "DESCRIPTION": "Intelligent Stock Control System — REST API",

    "VERSION": "1.0.0",

}



SEED_ADMIN_EMAIL = env("SEED_ADMIN_EMAIL", default="admin@stockcontrolsystem.com")

SEED_ADMIN_PASSWORD = env("SEED_ADMIN_PASSWORD", default="admin1234")

SEED_MANAGER_EMAIL = env("SEED_MANAGER_EMAIL", default="manager@stockcontrolsystem.com")

SEED_MANAGER_PASSWORD = env("SEED_MANAGER_PASSWORD", default="manager1234")

SEED_STAFF_EMAIL = env("SEED_STAFF_EMAIL", default="staff@stockcontrolsystem.com")

SEED_STAFF_PASSWORD = env("SEED_STAFF_PASSWORD", default="staff1234")

