# Casa Brava Rentals

Sistema de reservaciones para una casa privada de renta, de acceso exclusivo por invitación.

Arquitectura desacoplada en dos aplicaciones que corren por separado:

- **Frontend** — Next.js 16 + React 19 + Tailwind CSS v4 (raíz del repositorio, puerto 3000)
- **Backend** — Django 6.1 + Django REST Framework + JWT (carpeta [backend/](backend), puerto 8000)

## Arranque rápido

Se necesitan **dos terminales**.

**Terminal 1 — backend:**

```bash
cd backend
uv sync
cp .env.example .env
uv run python manage.py migrate
uv run python manage.py seed_demo
uv run python manage.py runserver
```

**Terminal 2 — frontend:**

```bash
npm install
npm run dev
```

Abrir <http://localhost:3000>. La API y su documentación interactiva quedan en <http://localhost:8000> y <http://localhost:8000/api/docs>.

Usuarios de desarrollo (contraseña `changeme123`): `admin@test.com`, `carlos.ruiz@example.com`, `maria.gomez@example.com`.

## Documentación

| Archivo | Para qué |
| --- | --- |
| [DOCUMENTATION.md](DOCUMENTATION.md) | Guía del equipo: estructura de carpetas, qué componente editar, cómo funcionan los flujos |
| [CLAUDE.md](CLAUDE.md) | Convenciones técnicas y decisiones de arquitectura |
| [backend/README.md](backend/README.md) | Apps de Django, endpoints, migraciones y reglas transaccionales |
