# REF App Backend

A FastAPI application that serves as the backend for the REF App.

## Getting Started

### Prerequisites

- Python 3.11+
- A working REF installation

### Monorepo Setup (Backend + Frontend)

Use the backend Makefile to install dependencies and enable both backend and frontend pre-commit hooks in a single step:

```bash
cd backend
make virtual-environment
```

Make sure that you have correctly set the `REF_CONFIGURATION` variable in your `.env` file.

## Development

### Running the dev server

```bash
cd backend
make dev
```

### Running Tests

```bash
make test
```

### Code Quality

The project uses:
- **ruff** for linting and formatting
- **mypy** for type checking
- **pre-commit** for git hooks (via the root `.pre-commit-config.yaml`)

Run checks locally:

```bash
cd backend
make mypy
```

## API Documentation

When the backend is running, API documentation is available at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- OpenAPI JSON: http://localhost:8000/api/v1/openapi.json
