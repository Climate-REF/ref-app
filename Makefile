# Makefile to help automate key steps

.DEFAULT_GOAL := help
# Will likely fail on Windows, but Makefiles are in general not Windows
# compatible so we're not too worried
TEMP_FILE := $(shell mktemp)

# A helper script to get short descriptions of each target in the Makefile
define PRINT_HELP_PYSCRIPT
import re, sys

for line in sys.stdin:
	match = re.match(r'^([\$$\(\)a-zA-Z_-]+):.*?## (.*)$$', line)
	if match:
		target, help = match.groups()
		print("%-30s %s" % (target, help))
endef
export PRINT_HELP_PYSCRIPT


.PHONY: help
help:  ## print short description of each target
	@python3 -c "$$PRINT_HELP_PYSCRIPT" < $(MAKEFILE_LIST)

.PHONY: dev-backend
dev-backend: # Start the backend
	@echo "Starting backend"
	@cd backend && uv run fastapi dev "src/ref_backend/main.py" --reload

.PHONY: dev-frontend
dev-frontend: # Start the frontend
	@echo "Starting frontend"
	@cd frontend && npm run dev

.PHONY: generate-client
generate-client: # Generate the frontend client SDK
	bash scripts/generate-client-sdk.sh

.PHONY: setup
setup: ## Setup the backend and frontend
	$(MAKE) -C backend virtual-environment

	@echo "==> Installing frontend dependencies"
	cd frontend && npm install

	@echo "==> Installing pre-commit hooks"
	uvx pre-commit install --config .pre-commit-config.yaml

.PHONY: generate-metadata
generate-metadata: ## Generate diagnostic metadata YAML from provider registry
	$(MAKE) -C backend generate-metadata

# Consistent alias with python-only projects
.PHONY: virtual-environment
virtual-environment: setup ## Install backend and frontend dependencies
