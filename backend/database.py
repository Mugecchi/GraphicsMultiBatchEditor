import json
import os
import shutil
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

BASE_DIR = Path(__file__).resolve().parent
STORAGE_DIR = BASE_DIR / "storage"
PROJECTS_DIR = STORAGE_DIR / "projects"
EXPORTS_DIR = STORAGE_DIR / "exports"
BACKUPS_DIR = STORAGE_DIR / "backups"
DB_PATH = STORAGE_DIR / "tarpaulin_studio.db"


def ensure_dirs() -> None:
    STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    PROJECTS_DIR.mkdir(parents=True, exist_ok=True)
    EXPORTS_DIR.mkdir(parents=True, exist_ok=True)
    BACKUPS_DIR.mkdir(parents=True, exist_ok=True)


def get_conn() -> sqlite3.Connection:
    ensure_dirs()
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    ensure_dirs()
    with get_conn() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT DEFAULT '',
                is_template INTEGER DEFAULT 0,
                template_json TEXT,
                elements_json TEXT DEFAULT '[]',
                events_json TEXT DEFAULT '[]',
                assets_json TEXT DEFAULT '[]',
                active_event_id TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS export_history (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                project_name TEXT NOT NULL,
                event_id TEXT,
                event_name TEXT NOT NULL,
                filename TEXT NOT NULL,
                relative_path TEXT NOT NULL,
                url TEXT NOT NULL,
                width INTEGER NOT NULL,
                height INTEGER NOT NULL,
                export_type TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS backups (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                reason TEXT NOT NULL,
                snapshot_json TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.commit()


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def row_to_project_dict(row: sqlite3.Row) -> Dict[str, Any]:
    template = json.loads(row["template_json"]) if row["template_json"] else None
    elements = json.loads(row["elements_json"]) if row["elements_json"] else []
    events = json.loads(row["events_json"]) if row["events_json"] else []
    assets = json.loads(row["assets_json"]) if row["assets_json"] else []

    # Check missing assets for diagnostics
    missing_assets: List[str] = []
    if template and template.get("relative_path"):
        full_p = STORAGE_DIR / template["relative_path"]
        if not full_p.exists():
            missing_assets.append(f"Template: {template.get('filename', 'background.png')}")
    for asset in assets:
        rel = asset.get("relative_path")
        if rel and not (STORAGE_DIR / rel).exists():
            missing_assets.append(f"Logo: {asset.get('name', rel)}")

    return {
        "id": row["id"],
        "name": row["name"],
        "description": row["description"] or "",
        "is_template": bool(row["is_template"]),
        "template": template,
        "elements": elements,
        "events": events,
        "assets": assets,
        "active_event_id": row["active_event_id"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
        "missing_assets": missing_assets,
    }


def create_backup(project_id: str, reason: str) -> Optional[str]:
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
        if not row:
            return None
        proj_dict = row_to_project_dict(row)
        backup_id = f"bkp_{project_id}_{int(datetime.now(timezone.utc).timestamp() * 1000)}"
        conn.execute(
            """
            INSERT INTO backups (id, project_id, reason, snapshot_json, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (backup_id, project_id, reason, json.dumps(proj_dict), now_iso()),
        )
        conn.commit()
        return backup_id
