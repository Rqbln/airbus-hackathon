.PHONY: setup setup-ml setup-backend setup-frontend train api web submission docs

PYTHON ?= python3
VENV ?= .venv
PIP := $(VENV)/bin/pip
PY := $(VENV)/bin/python

setup: setup-ml setup-backend setup-frontend

setup-ml:
	$(PYTHON) -m venv $(VENV)
	$(PIP) install --upgrade pip
	$(PIP) install -e ./ml
	$(PIP) install -e ./backend

setup-backend: setup-ml

setup-frontend:
	cd frontend && npm install

train:
	$(PY) -m corrotwin_ml.cli train --model histgb --calibration sigmoid

train-baseline:
	$(PY) -m corrotwin_ml.cli train --model constant --calibration none

submission:
	$(PY) -m corrotwin_ml.cli submission

api:
	cd backend && ../$(VENV)/bin/uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

web:
	cd frontend && npm run dev
