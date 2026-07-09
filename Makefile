# Convenience wrappers around the documented commands (see README for the
# full versions if make is not available on your system).

.PHONY: dev dev-build down migrate test test-backend test-frontend lint lint-backend lint-frontend check prod-build prod-up prod-down

dev: ## Start the development stack (app: :5174, api: :8001, mail: :8025)
	docker compose up -d

dev-build: ## Rebuild images and start the development stack
	docker compose up -d --build

down: ## Stop the development stack
	docker compose down

migrate: ## Apply database migrations (dev)
	docker compose run --rm backend alembic upgrade head

test: test-backend test-frontend ## Run both test suites

test-backend:
	docker compose run --rm backend pytest

test-frontend:
	docker compose run --rm frontend npm test

lint: lint-backend lint-frontend ## Lint and type-check everything

lint-backend:
	docker compose run --rm backend ruff check .

lint-frontend:
	docker compose run --rm frontend sh -c "npm run lint && npm run type-check"

check: lint test ## Everything CI runs

prod-build: ## Build production images
	docker compose -f docker-compose.prod.yml build

prod-up: ## Start the production stack (then run prod migrations once)
	docker compose -f docker-compose.prod.yml up -d
	docker compose -f docker-compose.prod.yml run --rm backend alembic upgrade head

prod-down: ## Stop the production stack (volumes are preserved)
	docker compose -f docker-compose.prod.yml down
