# REF Web Application

A web application interface for the Rapid Evaluation Framework (REF). 
This system enables near real-time evaluation of Earth system models.

This is a full-stack application that consists of a:
* FastAPI-based API 
    * PostgreSQL database
* Modern React frontend
  * TypeScript, Tanstack Query, Shadcn, Vite

## Overview

The REF Web Application provides researchers and scientists with tools to:
- Perform model evaluations quickly
- Visualize evaluation results
- Compare models against benchmark data
- Access evaluation metrics and diagnostics

## Getting Started

### Prerequisites

- Python 3.10+
- PostgreSQL database 
- Node.js v20 and npm (for frontend)
- Docker and Docker Compose (optional)

### Backend Setup

1. **Clone the repository**

```bash
git clone <repository-url>
cd ref-web-app
```

2. **Set up environment variables**

Create a `.env` file in the project root with the following variables:

```
PROJECT_NAME=REF Web Application
SQLALCHEMY_DATABASE_URI=postgresql://user:password@localhost:5432/refdb
BACKEND_CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

3. **Install dependencies**

```bash
cd backend
uv venv .venv
source .venv/bin/activate
uv pip install -e .
```

4. **Run database migrations**

Connect to your PostgreSQL database and ensure it's properly configured.

5. **Start the backend server**

```bash
make backend
```

## Development

### Running Tests

```bash
cd backend
pytest
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

### Project Structure

```
ref-web-app/
├─�� .env                     # Environment variables
├── Makefile                 # Project automation tasks
├── backend/
│   ├── src/
│   │   └── ref_backend/     # Main package
│   │       ├── api/         # API endpoints
│   │       ├── core/        # Core functionality
│   │       └── main.py      # Application entry point
│   ├── tests/               # Test suite
│   └── pyproject.toml       # Python dependencies
```

## API Documentation

When the backend is running, API documentation is available at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- OpenAPI JSON: http://localhost:8000/api/v1/openapi.json


## License


