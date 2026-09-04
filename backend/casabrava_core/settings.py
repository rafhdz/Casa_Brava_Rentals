"""
Configuración de Django para el proyecto casabrava_core.

Backend dedicado de "Casa Brava Rentals" — reemplaza la capa de datos que
antes vivía en Supabase (Postgres + PostgREST + RLS + funciones plpgsql).
El esquema relacional se replica en el ORM, repartido en seis apps:

    usuarios       Perfiles y autenticación (modelo de usuario propio).
    propiedades    Configuración de la casa, tarifas, fotos y amenidades.
    servicios      Catálogos de spa/comida/vinos y su disponibilidad.
    proveedores    Masajistas y demás prestadores externos.
    reservaciones  Reserva principal + bookings de servicios adicionales.
    pagos          Estado y registro de cobros.

Django 6.1 — ver https://docs.djangoproject.com/en/6.1/
"""

import os
from datetime import timedelta
from decimal import Decimal
from pathlib import Path

from dotenv import load_dotenv

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Carga backend/.env si existe (ver .env.example). Nunca sobrescribe variables
# ya presentes en el entorno real, para que un despliegue siga mandando.
load_dotenv(BASE_DIR / ".env", override=False)


def env_bool(name: str, default: bool) -> bool:
    raw = os.environ.get(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def env_list(name: str, default: str) -> list[str]:
    return [item.strip() for item in os.environ.get(name, default).split(",") if item.strip()]


# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.environ.get(
    "DJANGO_SECRET_KEY",
    "django-insecure-94(44x^^1e#xcg)gh*opc)n9+$^!tb#9&#o&=*++rg7h03gwvw",
)

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = env_bool("DJANGO_DEBUG", True)

ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1")


# Application definition

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Terceros
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "drf_spectacular",
    # Apps del dominio
    "usuarios",
    "propiedades",
    "servicios",
    "proveedores",
    "reservaciones",
    "pagos",
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

ROOT_URLCONF = "casabrava_core.urls"

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

WSGI_APPLICATION = "casabrava_core.wsgi.application"
ASGI_APPLICATION = "casabrava_core.asgi.application"


# Database
# https://docs.djangoproject.com/en/6.1/ref/settings/#databases
#
# ⚠️ La lógica anti double-booking de reservaciones/services.py depende de
# `select_for_update()`, y SQLite NO soporta bloqueo de filas: Django lo ignora
# en silencio (`has_select_for_update = False`), así que el código corre pero
# SIN protección real contra escrituras concurrentes. SQLite solo sirve para
# levantar el proyecto rápido; usar PostgreSQL en desarrollo serio y en
# producción (DB_ENGINE=postgres).

if os.environ.get("DB_ENGINE", "sqlite") == "postgres":
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.environ.get("DB_NAME", "casabrava"),
            "USER": os.environ.get("DB_USER", "postgres"),
            "PASSWORD": os.environ.get("DB_PASSWORD", "postgres"),
            "HOST": os.environ.get("DB_HOST", "127.0.0.1"),
            "PORT": os.environ.get("DB_PORT", "5432"),
            "CONN_MAX_AGE": int(os.environ.get("DB_CONN_MAX_AGE", "60")),
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }


# Autenticación
# El modelo de usuario propio fusiona `auth.users` + `public.profiles` de
# Supabase en una sola tabla (`profiles`), con el correo como identificador.
AUTH_USER_MODEL = "usuarios.Usuario"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]


# Precio de una sesión de spa.
# En Supabase nunca hubo columna de precio en `spa_masseuses` (el frontend lo
# tenía como constante de módulo), así que vive aquí como parámetro de negocio:
# el cliente nunca manda el precio, el servidor lo aplica al crear el booking.
SPA_SESSION_PRICE = Decimal(os.environ.get("SPA_SESSION_PRICE", "600.00"))


# Django REST Framework
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    # Fail closed: todo endpoint exige sesión salvo que declare lo contrario
    # (el contenido del Home y el registro abren el acceso explícitamente).
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 50,
    "DEFAULT_FILTER_BACKENDS": (
        "rest_framework.filters.OrderingFilter",
        "rest_framework.filters.SearchFilter",
    ),
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=int(os.environ.get("JWT_ACCESS_MINUTES", "60"))),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=int(os.environ.get("JWT_REFRESH_DAYS", "7"))),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
}

SPECTACULAR_SETTINGS = {
    "TITLE": "Casa Brava Rentals API",
    "DESCRIPTION": "API REST del sistema de reservaciones de Casa Brava Rentals.",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    # Varios modelos tienen un campo `status` con juegos de valores distintos.
    # Sin estos alias, el generador los bautiza `Status5e4Enum` y compañía, y el
    # cliente TypeScript que salga del esquema hereda esos nombres.
    "ENUM_NAME_OVERRIDES": {
        "RoleTypeEnum": "usuarios.models.RoleType.choices",
        "ProfileStatusEnum": "usuarios.models.ProfileStatus.choices",
        "ReservationStatusEnum": "reservaciones.models.ReservationStatus.choices",
        "PaymentStatusEnum": "pagos.models.PaymentStatus.choices",
        "MealTypeEnum": "servicios.models.MealType.choices",
    },
}

# CORS — el frontend Next.js corre en :3000 durante desarrollo.
CORS_ALLOWED_ORIGINS = env_list(
    "CORS_ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
)
CORS_ALLOW_CREDENTIALS = True


# Internationalization
# https://docs.djangoproject.com/en/6.1/topics/i18n/

LANGUAGE_CODE = "es-mx"

TIME_ZONE = os.environ.get("DJANGO_TIME_ZONE", "America/Mexico_City")

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/6.1/howto/static-files/

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"


# Email
# https://docs.djangoproject.com/en/6.1/topics/email/#topic-email-configuration

MAILERS = {
    "default": {
        "BACKEND": "django.core.mail.backends.console.EmailBackend",
    },
}
