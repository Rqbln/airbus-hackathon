# CorroTwin — commandes de développement (tout en local)
# Ports : backend FastAPI = 8000, frontend Next.js = 3000 (jamais 5000 sur macOS)

PYTHON ?= python3.12
VENV    = .venv
PIP     = $(VENV)/bin/pip
PY      = $(VENV)/bin/python

.PHONY: setup setup-py setup-web train api web submission clean

## Installation complète (Python + Node)
setup: setup-py setup-web

setup-py:
	$(PYTHON) -m venv $(VENV)
	$(PIP) install --upgrade pip
	$(PIP) install -e ml
	$(PIP) install -r backend/requirements.txt

setup-web:
	cd frontend && npm install

## Entraîne le modèle par défaut (run persisté dans data/artifacts/runs/)
train:
	$(PY) -m corrotwin_ml.cli train

## Génère la soumission Kaggle depuis le meilleur run
submission:
	$(PY) -m corrotwin_ml.cli submission

## Lance l'API FastAPI sur :8000
api:
	$(VENV)/bin/uvicorn app.main:app --app-dir backend --reload --port 8000

## Lance le frontend Next.js sur :3000
web:
	cd frontend && npm run dev

clean:
	rm -rf data/processed/* data/artifacts/* frontend/.next
