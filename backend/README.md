# REF App Backend

A web application interface for the Rapid Evaluation Framework (REF). 
This system enables near real-time evaluation of Earth system models.

This is a full-stack application that consists of a:
* FastAPI-based API 
    * PostgreSQL database
* Modern React frontend
  * TypeScript, Tanstack Query, Shadcn, Vite


## Getting Started

### Prerequisites

- Python 3.10+
- PostgreSQL database 
- Node.js v20 and npm (for frontend)
- Docker and Docker Compose (optional)

### Backend Setup

See the project setup in the [root README](../README.md).


## Development

### Running Tests

```bash
make test
```

### Code Quality

The project uses:
- **ruff** for linting and formatting
- **mypy** for type checking
- **pre-commit** for git hooks

```bash
cd backend
ruff check .
mypy .
```

## API Documentation

When the backend is running, API documentation is available at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- OpenAPI JSON: http://localhost:8000/api/v1/openapi.json



