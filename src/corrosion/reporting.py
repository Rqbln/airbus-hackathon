"""Generation de rapports JSON/CSV pour le dashboard Next.js."""
from __future__ import annotations
import json
import numpy as np
import pandas as pd
from pathlib import Path
from . import config as C


def write_json(obj, name: str):
    path = C.REPORTS_DIR / name
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(obj, f, indent=2, default=_json_safe)
    return str(path)


def _json_safe(o):
    if isinstance(o, (np.floating,)):
        return float(o)
    if isinstance(o, (np.integer,)):
        return int(o)
    if isinstance(o, np.ndarray):
        return o.tolist()
    return str(o)


def write_csv(df: pd.DataFrame, name: str):
    path = C.REPORTS_DIR / name
    df.to_csv(path, index=False)
    return str(path)
