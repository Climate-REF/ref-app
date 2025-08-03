# Climate Rapid Evaluation Framework (REF) App

This repository contains the API and Frontend for the Climate Rapid Evaluation Framework (REF). This system enables comprehensive benchmarking and evaluation of Earth system models against observational data, integrating with the `climate-ref` core library.

This is a full-stack application that consists of a:
*   **Backend**: FastAPI API (Python 3.11+)
    *   FastAPI, Pydantic, SQLAlchemy, OpenAPI documentation
*   **Frontend**: React frontend (React 19, TypeScript)
    *   Vite, Tanstack Router, Tanstack Query, Tailwind CSS, Shadcn/ui, Recharts

**Status**: Alpha

**Other info :**
[![Licence](https://img.shields.io/github/license/Climate-REF/ref-app.svg)](https://github.com/Climate-REF/climate-ref/blob/main/LICENCE)
[![Last Commit](https://img.shields.io/github/last-commit/Climate-REF/ref-app.svg)](https://github.com/Climate-REF/climate-ref/commits/main)
[![Contributors](https://img.shields.io/github/contributors/Climate-REF/ref-app.svg)](https://github.com/Climate-REF/ref-app/graphs/contributors)


## Overview

The Climate REF Web Application provides researchers and scientists with tools to:
-   Enable rapid model evaluation and near real-time assessment of climate model performance.
-   Provide standardized, reproducible evaluation metrics across different models and datasets.
-   Make complex climate model diagnostics accessible through an intuitive web interface.
-   Ensure evaluation processes are transparent and results are traceable.
-   Consolidate various diagnostic tools into a unified framework.
-   Automate the execution of diagnostics when new datasets are available.
-   Help researchers find and understand available datasets and their evaluation status.
-   Enable easy comparison of model performance across different versions and experiments.

## Getting Started

### Prerequisites

-   Python 3.11+ (with `uv` for package management)
-   Node.js v20 and npm (for frontend)
-   Database: SQLite (development/test) or PostgreSQL (production)
-   Docker and Docker Compose (optional, for containerized deployment)

1.  **Clone the repository**

    ```bash
    git clone https://github.com/Climate-REF/ref-app.git
    cd ref-app
    ```

### Backend Setup

2.  **Set up environment variables**

    Create a `.env` file in the project root by copying the `.env.example` file.

    ```bash
    cp .env.example .env
    ```

    Modify the `.env` to your needs. The `REF_CONFIGURATION` variable should point to the configuration directory for the REF, which defines the database connection string and other REF-specific settings.

3.  **Install dependencies**

    ```bash
    cd backend
    make virtual-environment
    ```

4.  **Start the backend server**

    ```bash
    make dev
    ```

### Frontend Setup

1.  **Generate Client**

    ```bash
    make generate-client
    ```

2.  **Install dependencies**

    ```bash
    cd frontend
    npm install
    ```

3.  **Start the frontend server**

    ```bash
    npm run dev
    ```

### Project Structure

```
ref-app/
├── .env                     # Environment variables (copy from .env.sample)
├── Makefile                 # Project automation tasks (e.g., client generation, dev server)
├── backend/
│   ├── src/
│   │   └── ref_backend/     # Main Python package
│   │       ├── api/         # FastAPI API endpoints and dependencies
│   │       │   ├── routes/  # API route definitions (datasets, diagnostics, executions, etc.)
│   │       │   └── main.py  # API router aggregation
│   │       ├── core/        # Core application logic (config, file handling, REF initialization)
│   │       └── models.py    # Pydantic models for API responses
│   ├── tests/               # Backend test suite
│   ├── pyproject.toml       # Python dependencies and project metadata
│   └── uv.lock              # uv lock file for reproducible dependencies
├── frontend/
│   ├── public/              # Static assets
│   ├── src/
│   │   ├── client/          # Auto-generated API client (TypeScript types, React Query hooks)
│   │   ├── components/      # Reusable React components (app, dashboard, datasets, ui, etc.)
│   │   ├── routes/          # File-based routing for React application
│   │   ├── hooks/           # Custom React hooks
│   │   ├── lib/             # Utility functions
│   │   └── styles/          # Global styles
│   ├── package.json         # Node.js dependencies
│   ├── vite.config.ts       # Vite build configuration
│   └── openapi.json         # OpenAPI specification (generated from backend)
└── scripts/                 # Utility scripts
```

## API Documentation

When the backend is running, API documentation is available at:
-   Swagger UI: http://localhost:8001/docs
-   ReDoc: http://localhost:8001/redoc
-   OpenAPI JSON: http://localhost:8001/openapi.json
