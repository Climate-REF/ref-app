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


.PHONY: virtual-environment
virtual-environment: # Install the project dependencies
	uv sync

.PHONY: dev
dev: # Start the backend
	uv run fastapi dev "src/ref_backend/main.py" --reload


.PHONY: test
test: ## Run pytest
	uv run \
	pytest src tests
#	-r a -v --doctest-modules --cov=src --cov-report=term
