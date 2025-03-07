# REF App

This repository contains a quick proof of concept for an API to serve outputs from the Rapid Evaluation Framework (REF).
This system enables near real-time evaluation of Earth system models.

This is a full-stack application that consists of a:
* **Backend**: API 
    * FastAPI, OpenAPI documentation
* **Frontend**: React frontend
  * TypeScript, Tanstack Query, Shadcn, Vite

**Status**: Pre-Alpha

**Other info :**
[![Licence](https://img.shields.io/github/license/Climate-REF/ref-app.svg)](https://github.com/Climate-REF/climate-ref/blob/main/LICENCE)
[![Last Commit](https://img.shields.io/github/last-commit/Climate-REF/ref-app.svg)](https://github.com/Climate-REF/climate-ref/commits/main)
[![Contributors](https://img.shields.io/github/contributors/Climate-REF/ref-app.svg)](https://github.com/Climate-REF/climate-ref/graphs/contributors)


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

1. **Clone the repository**

```bash
git clone https://github.com/Climate-REF/ref-app.git
cd ref-app
```

### Backend Setup

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
make virtual-environment
```

4. **Start the backend server**

```bash
make dev
```

## Frontend Setup

1. **Generate Client**

```bash
make generate-client
```

2. **Install dependencies**

```bash
cd frontend
npm install
```

3. **Start the frontend server**

```bash
npm run dev
```

### Project Structure

```
ref-app/
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


