# Build the container for the the REF compute engine
# This docker container packages up the REF cli tool with the default set of diagnostic providers
# used as part of the CMIP7 FastTrack process.

FROM ghcr.io/astral-sh/uv:python3.10-bookworm-slim AS build

RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    && rm -rf /var/lib/apt/lists/*

# Enable bytecode compilation
ENV UV_COMPILE_BYTECODE=1

# Copy from the cache instead of linking since it's a mounted volume
ENV UV_LINK_MODE=copy

WORKDIR /app


# Install the project's dependencies using the lockfile and settings
COPY ./pyproject.toml ./uv.lock
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-editable --no-dev

# Runtime container
# Copy the installed packages from the build stage to decrease the size of the final image
FROM python:3.10-slim AS runtime

LABEL maintainer="Jared Lewis <jared.lewis@climate-resource.com>"
LABEL description="Docker image for the REF API"

# Allow celery to run as root
ENV C_FORCE_ROOT=false
ENV PATH="/app/.venv/bin:${PATH}"

# Copy the installed packages from the build stage
COPY --from=build --chown=app:app /app/.venv /app/.venv
COPY . /app

# Run the REF CLI tool by default
ENTRYPOINT ["fastapi", "run", "--workers", "4", "app/main.py"]
