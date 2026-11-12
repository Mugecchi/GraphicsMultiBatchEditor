import hashlib
import io
import json
import os
import re
import shutil
import uuid
import zipfile
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, File, Form, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from PIL import Image, ImageDraw

from database import (
    BACKUPS_DIR,
    EXPORTS_DIR,
    PROJECTS_DIR,
    STORAGE_DIR,
    create_backup,
    ensure_dirs,
    get_conn,
    init_db,
    now_iso,
    row_to_project_dict,
)
from fonts import (
    CUSTOM_FONTS_DIR,
    get_available_fonts,
    get_custom_font_files,
    invalidate_font_cache,
    resolve_font_path,
)
from models import (
    CanvasElement,
    EventRecord,
    ExportRequest,
    LogoAsset,
    LogoGroupItem,
    LogoGroupProps,
    ProjectData,
    ProjectUpdateRequest,
    TemplateMeta,
    TextStyle,
)
from renderer import render_tarpaulin_image

ALLOWED_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}
FRONTEND_DIST_DIR = Path(__file__).resolve().parent.parent / "frontend" / "dist"

ALLOWED_ORIGINS = [
    "https://tarp.cyngfps.com",
    "http://tarp.cyngfps.com",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:8812",
    "http://localhost:8812",
]
extra_origins = os.environ.get("TARP_ALLOWED_ORIGINS", "")
if extra_origins.strip():
    ALLOWED_ORIGINS.extend([o.strip() for o in extra_origins.split(",") if o.strip()])

app = FastAPI(
    title="Tarpaulin Studio API",
    description="Standalone Event Tarpaulin Designer & High-Resolution Batch PNG Generator",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ensure_dirs()
init_db()

app.mount("/storage", StaticFiles(directory=str(STORAGE_DIR)), name="storage")
app.mount("/custom_fonts", StaticFiles(directory=str(CUSTOM_FONTS_DIR)), name="custom_fonts")


def sanitize_filename(name: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9._-]+", "_", name.strip())
    return cleaned or "tarpaulin"


def compute_sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def build_default_elements(tpl_height: int) -> List[Dict[str, Any]]:
    """Creates starter bound elements when a new project is initialized with a template."""
    scale = max(0.5, tpl_height / 1080.0)
    return [
        CanvasElement(
            id=f"el_logogroup_{uuid.uuid4().hex[:6]}",
            name="Partner Logos Group",
            type="logo_group",
            field_role="logos",
            x=10.0,
            y=4.0,
            width=80.0,
            height=13.0,
            z_index=1,
            logo_group_props=LogoGroupProps(
                logos=[],
                arrangement="horizontal",
                max_logo_height=85.0,
                max_logo_width=35.0,
                horizontal_spacing=2.5,
                vertical_spacing=4.0,
                max_logos_per_row=6,
                alignment="center",
            ),
        ).model_dump(),
        CanvasElement(
            id=f"el_title_{uuid.uuid4().hex[:6]}",
            name="Event Title",
            type="text",
            field_role="title",
            x=8.0,
            y=22.0,
            width=84.0,
            height=18.0,
            z_index=2,
            text_props=TextStyle(
                content="{{event.title}}",
                binding="{{event.title}}",
                font_family="Arial",
                font_size=round(64 * scale, 1),
                bold=True,
                color="#FFFFFF",
                align="center",
                vertical_align="middle",
                auto_fit=True,
                outline_enabled=True,
                outline_color="#0F172A",
                outline_width=round(3 * scale, 1),
                shadow_enabled=True,
                shadow_color="#000000",
                shadow_offset_x=round(2 * scale, 1),
                shadow_offset_y=round(2 * scale, 1),
            ),
        ).model_dump(),
        CanvasElement(
            id=f"el_subtitle_{uuid.uuid4().hex[:6]}",
            name="Subtitle",
            type="text",
            field_role="subtitle",
            x=12.0,
            y=43.0,
            width=76.0,
            height=10.0,
            z_index=3,
            text_props=TextStyle(
                content="{{event.subtitle}}",
                binding="{{event.subtitle}}",
                font_family="Arial",
                font_size=round(36 * scale, 1),
                bold=False,
                color="#F8FAFC",
                align="center",
                vertical_align="middle",
                auto_fit=True,
                outline_enabled=True,
                outline_color="#0F172A",
                outline_width=round(2 * scale, 1),
            ),
        ).model_dump(),
        CanvasElement(
            id=f"el_venue_{uuid.uuid4().hex[:6]}",
            name="Venue",
            type="text",
            field_role="venue",
            x=15.0,
            y=60.0,
            width=70.0,
            height=8.0,
            z_index=4,
            text_props=TextStyle(
                content="{{event.venue}}",
                binding="{{event.venue}}",
                font_family="Arial",
                font_size=round(32 * scale, 1),
                bold=True,
                color="#FACC15",
                align="center",
                vertical_align="middle",
                auto_fit=True,
                outline_enabled=True,
                outline_color="#0F172A",
                outline_width=round(2 * scale, 1),
            ),
        ).model_dump(),
        CanvasElement(
            id=f"el_address_{uuid.uuid4().hex[:6]}",
            name="Address",
            type="text",
            field_role="address",
            x=15.0,
            y=70.0,
            width=70.0,
            height=7.0,
            z_index=5,
            text_props=TextStyle(
                content="{{event.address}}",
                binding="{{event.address}}",
                font_family="Arial",
                font_size=round(26 * scale, 1),
                bold=False,
                color="#E2E8F0",
                align="center",
                vertical_align="middle",
                auto_fit=True,
            ),
        ).model_dump(),
        CanvasElement(
            id=f"el_date_{uuid.uuid4().hex[:6]}",
            name="Event Date",
            type="text",
            field_role="date",
            x=20.0,
            y=81.0,
            width=60.0,
            height=8.0,
            z_index=6,
            text_props=TextStyle(
                content="{{event.date}}",
                binding="{{event.date}}",
                font_family="Arial",
                font_size=round(30 * scale, 1),
                bold=True,
                color="#FFFFFF",
                align="center",
                vertical_align="middle",
                auto_fit=True,
                outline_enabled=True,
                outline_color="#0F172A",
                outline_width=round(2 * scale, 1),
            ),
        ).model_dump(),
    ]


def build_default_event() -> Dict[str, Any]:
    return EventRecord(
        id=f"evt_{uuid.uuid4().hex[:8]}",
        name="Main Summit Event",
        title="ANNUAL NATIONAL INNOVATION SUMMIT 2026",
        subtitle="Building Resilient Digital Infrastructure & Sustainable Communities",
        venue="Grand Ballroom, Philippine International Convention Center",
        address="Vicente Sotto St., Pasay City, Metro Manila",
        date="November 24–26, 2026 | 9:00 AM – 5:00 PM",
        custom_fields={"speaker": "Dr. Elena Reyes", "theme": "Future Ready"},
        order_index=0,
    ).model_dump()


@app.get("/api/health")
def health_check() -> Dict[str, Any]:
    return {"status": "ok", "fonts": get_available_fonts()}


@app.get("/api/fonts")
def list_fonts() -> Dict[str, Any]:
    return {
        "fonts": get_available_fonts(),
        "custom_font_files": get_custom_font_files(),
    }


@app.get("/api/fonts/file")
def serve_font_file(
    family: str = Query(...),
    bold: bool = Query(False),
    italic: bool = Query(False),
):
    """Serves the resolved TrueType/OpenType font file so the browser can load any installed server font via @font-face."""
    font_path = resolve_font_path(family, bold=bold, italic=italic)
    if not font_path or not font_path.exists():
        raise HTTPException(status_code=404, detail=f"Font '{family}' not found")
    media_type = "font/otf" if font_path.suffix.lower() == ".otf" else "font/ttf"
    return FileResponse(
        str(font_path),
        media_type=media_type,
        headers={"Cache-Control": "public, max-age=86400"},
    )


@app.post("/api/fonts/upload")
async def upload_custom_font(font_file: UploadFile = File(...)) -> Dict[str, Any]:
    if not font_file.filename:
        raise HTTPException(status_code=400, detail="No font file provided.")
    ext = Path(font_file.filename).suffix.lower()
    if ext not in (".ttf", ".otf"):
        raise HTTPException(
            status_code=400,
            detail="Unsupported font format. Please upload a .TTF or .OTF font file.",
        )
    raw = await font_file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Uploaded font file is empty.")

    safe_name = sanitize_filename(Path(font_file.filename).stem) + ext
    dest = CUSTOM_FONTS_DIR / safe_name
    dest.write_bytes(raw)
    invalidate_font_cache()

    return {
        "fonts": get_available_fonts(),
        "custom_font_files": get_custom_font_files(),
    }


@app.get("/api/dashboard")
def get_dashboard() -> Dict[str, Any]:
    with get_conn() as conn:
        proj_rows = conn.execute("SELECT * FROM projects ORDER BY updated_at DESC").fetchall()
        exp_rows = conn.execute("SELECT * FROM export_history ORDER BY created_at DESC LIMIT 30").fetchall()

    projects = [row_to_project_dict(r) for r in proj_rows]
    recent_exports = [dict(r) for r in exp_rows]
    saved_templates = [p for p in projects if p.get("is_template")]

    return {
        "projects": projects,
        "saved_templates": saved_templates,
        "recent_exports": recent_exports,
    }


@app.get("/api/projects")
def list_projects() -> List[Dict[str, Any]]:
    with get_conn() as conn:
        rows = conn.execute("SELECT * FROM projects ORDER BY updated_at DESC").fetchall()
    return [row_to_project_dict(r) for r in rows]


@app.post("/api/projects")
async def create_project(
    name: str = Form(...),
    description: str = Form(""),
    is_template: bool = Form(False),
    init_defaults: bool = Form(True),
    template_file: Optional[UploadFile] = File(None),
) -> Dict[str, Any]:
    if not name or not name.strip():
        raise HTTPException(status_code=400, detail="Project name is required.")

    project_id = f"proj_{uuid.uuid4().hex[:10]}"
    proj_dir = PROJECTS_DIR / project_id
    (proj_dir / "template").mkdir(parents=True, exist_ok=True)
    (proj_dir / "logos").mkdir(parents=True, exist_ok=True)

    template_meta: Optional[Dict[str, Any]] = None
    elements: List[Dict[str, Any]] = []
    events: List[Dict[str, Any]] = [build_default_event()]

    if template_file and template_file.filename:
        ext = Path(template_file.filename).suffix.lower()
        if ext not in ALLOWED_IMAGE_EXTENSIONS:
            shutil.rmtree(proj_dir, ignore_errors=True)
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported image format '{ext}'. Allowed formats: PNG, JPG, JPEG, WEBP.",
            )
        raw_bytes = await template_file.read()
        if not raw_bytes:
            shutil.rmtree(proj_dir, ignore_errors=True)
            raise HTTPException(status_code=400, detail="Uploaded template file is empty.")

        try:
            with Image.open(io.BytesIO(raw_bytes)) as img:
                img.verify()
            with Image.open(io.BytesIO(raw_bytes)) as img2:
                width, height = img2.size
                img_format = img2.format or "PNG"
        except Exception as exc:
            shutil.rmtree(proj_dir, ignore_errors=True)
            raise HTTPException(status_code=400, detail=f"Invalid image file: {exc}")

        safe_name = sanitize_filename(Path(template_file.filename).stem) + ext
        rel_path = f"projects/{project_id}/template/{safe_name}"
        dest_path = STORAGE_DIR / rel_path
        # Write exact original bytes without modifying a single pixel!
        dest_path.write_bytes(raw_bytes)

        template_meta = TemplateMeta(
            filename=template_file.filename,
            relative_path=rel_path,
            url=f"/storage/{rel_path}",
            width=width,
            height=height,
            aspect_ratio=width / max(1.0, float(height)),
            format=img_format,
            file_size=len(raw_bytes),
            sha256=compute_sha256(raw_bytes),
        ).model_dump()

        if init_defaults:
            elements = build_default_elements(height)

    now = now_iso()
    active_event_id = events[0]["id"] if events else None

    with get_conn() as conn:
        conn.execute(
            """
            INSERT INTO projects (
                id, name, description, is_template, template_json,
                elements_json, events_json, assets_json, active_event_id,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                project_id,
                name.strip(),
                description.strip(),
                1 if is_template else 0,
                json.dumps(template_meta) if template_meta else None,
                json.dumps(elements),
                json.dumps(events),
                json.dumps([]),
                active_event_id,
                now,
                now,
            ),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()

    return row_to_project_dict(row)


@app.get("/api/projects/{project_id}")
def get_project(project_id: str) -> Dict[str, Any]:
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Project not found.")
    return row_to_project_dict(row)


@app.put("/api/projects/{project_id}")
def update_project(project_id: str, payload: ProjectUpdateRequest) -> Dict[str, Any]:
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Project not found.")

        current = row_to_project_dict(row)
        name = payload.name.strip() if payload.name is not None else current["name"]
        description = payload.description if payload.description is not None else current["description"]
        is_template = payload.is_template if payload.is_template is not None else current["is_template"]
        elements = [e.model_dump() for e in payload.elements] if payload.elements is not None else current["elements"]
        events = [ev.model_dump() for ev in payload.events] if payload.events is not None else current["events"]
        assets = [a.model_dump() for a in payload.assets] if payload.assets is not None else current["assets"]
        active_event_id = payload.active_event_id if payload.active_event_id is not None else current["active_event_id"]

        now = now_iso()
        conn.execute(
            """
            UPDATE projects
            SET name = ?, description = ?, is_template = ?, elements_json = ?,
                events_json = ?, assets_json = ?, active_event_id = ?, updated_at = ?
            WHERE id = ?
            """,
            (
                name,
                description,
                1 if is_template else 0,
                json.dumps(elements),
                json.dumps(events),
                json.dumps(assets),
                active_event_id,
                now,
                project_id,
            ),
        )
        conn.commit()
        updated_row = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()

    return row_to_project_dict(updated_row)


@app.post("/api/projects/{project_id}/template")
async def replace_project_template(
    project_id: str,
    template_file: UploadFile = File(...),
) -> Dict[str, Any]:
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Project not found.")

    create_backup(project_id, "before_template_replace")

    ext = Path(template_file.filename or "template.png").suffix.lower()
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported image format '{ext}'. Allowed formats: PNG, JPG, JPEG, WEBP.",
        )

    raw_bytes = await template_file.read()
    if not raw_bytes:
        raise HTTPException(status_code=400, detail="Uploaded template file is empty.")

    try:
        with Image.open(io.BytesIO(raw_bytes)) as img:
            img.verify()
        with Image.open(io.BytesIO(raw_bytes)) as img2:
            width, height = img2.size
            img_format = img2.format or "PNG"
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid template image: {exc}")

    proj_dir = PROJECTS_DIR / project_id / "template"
    proj_dir.mkdir(parents=True, exist_ok=True)
    safe_name = f"{uuid.uuid4().hex[:6]}_{sanitize_filename(Path(template_file.filename or 'template').stem)}{ext}"
    rel_path = f"projects/{project_id}/template/{safe_name}"
    dest_path = STORAGE_DIR / rel_path
    dest_path.write_bytes(raw_bytes)

    template_meta = TemplateMeta(
        filename=template_file.filename or safe_name,
        relative_path=rel_path,
        url=f"/storage/{rel_path}",
        width=width,
        height=height,
        aspect_ratio=width / max(1.0, float(height)),
        format=img_format,
        file_size=len(raw_bytes),
        sha256=compute_sha256(raw_bytes),
    ).model_dump()

    with get_conn() as conn:
        conn.execute(
            "UPDATE projects SET template_json = ?, updated_at = ? WHERE id = ?",
            (json.dumps(template_meta), now_iso(), project_id),
        )
        conn.commit()
        updated_row = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()

    return row_to_project_dict(updated_row)


@app.post("/api/projects/{project_id}/logos")
async def upload_project_logos(
    project_id: str,
    files: List[UploadFile] = File(...),
) -> Dict[str, Any]:
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Project not found.")
        project = row_to_project_dict(row)

    logos_dir = PROJECTS_DIR / project_id / "logos"
    logos_dir.mkdir(parents=True, exist_ok=True)

    existing_assets: List[Dict[str, Any]] = list(project.get("assets") or [])
    new_assets: List[Dict[str, Any]] = []

    for upload in files:
        if not upload.filename:
            continue
        ext = Path(upload.filename).suffix.lower()
        if ext not in ALLOWED_IMAGE_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported logo format '{ext}' in '{upload.filename}'. Use PNG, JPG, JPEG, or WEBP.",
            )
        raw_bytes = await upload.read()
        if not raw_bytes:
            continue
        try:
            with Image.open(io.BytesIO(raw_bytes)) as img:
                img.verify()
            with Image.open(io.BytesIO(raw_bytes)) as img2:
                rgba = img2.convert("RGBA")
                orig_w, orig_h = rgba.size
                # Only auto-trim if the uploaded logo has significant excess transparent border (>12% of width or height)
                alpha = rgba.getchannel("A")
                mask = alpha.point(lambda p: 255 if p > 10 else 0)
                bbox = mask.getbbox()
                if bbox:
                    content_w = bbox[2] - bbox[0]
                    content_h = bbox[3] - bbox[1]
                    if (
                        content_w >= 8
                        and content_h >= 8
                        and (content_w < orig_w * 0.88 or content_h < orig_h * 0.88)
                    ):
                        pad = 2
                        left = max(0, bbox[0] - pad)
                        top = max(0, bbox[1] - pad)
                        right = min(rgba.width, bbox[2] + pad)
                        bottom = min(rgba.height, bbox[3] + pad)
                        rgba = rgba.crop((left, top, right, bottom))
                nw, nh = rgba.size
                fmt = "PNG"
                trimmed_buf = io.BytesIO()
                rgba.save(trimmed_buf, format="PNG")
                save_bytes = trimmed_buf.getvalue()
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Invalid logo image '{upload.filename}': {exc}")

        asset_id = f"logo_{uuid.uuid4().hex[:8]}"
        safe_name = f"{asset_id}_{sanitize_filename(Path(upload.filename).stem)}.png"
        rel_path = f"projects/{project_id}/logos/{safe_name}"
        dest_path = STORAGE_DIR / rel_path
        dest_path.write_bytes(save_bytes)

        asset = LogoAsset(
            id=asset_id,
            name=Path(upload.filename).stem,
            url=f"/storage/{rel_path}",
            relative_path=rel_path,
            natural_width=nw,
            natural_height=nh,
            aspect_ratio=nw / max(1.0, float(nh)),
            format=fmt,
        ).model_dump()
        existing_assets.append(asset)
        new_assets.append(asset)

    with get_conn() as conn:
        conn.execute(
            "UPDATE projects SET assets_json = ?, updated_at = ? WHERE id = ?",
            (json.dumps(existing_assets), now_iso(), project_id),
        )
        conn.commit()
        updated_row = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()

    return {
        "uploaded": new_assets,
        "project": row_to_project_dict(updated_row),
    }


def _trim_or_circle_crop_rgba(rgba: Image.Image, mode: str = "auto") -> Image.Image:
    """
    Tightly crops empty transparent or solid-color border space around a logo.
    If mode == 'circle', also crops/masks the logo into a clean 1:1 transparent circle.
    """
    from collections import deque

    rgba = rgba.convert("RGBA")
    w, h = rgba.size
    if w < 4 or h < 4:
        return rgba

    px = rgba.load()
    corners = [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]
    opaque_corners = [px[x, y] for (x, y) in corners if px[x, y][3] > 200]

    # Step 1: If corners are opaque and share a uniform background color (e.g. white square box around a round logo),
    # flood-fill from the outer border pixels to make the outer background transparent.
    if len(opaque_corners) >= 3:
        ref_r, ref_g, ref_b, _ = opaque_corners[0]
        matching_corners = sum(
            1
            for (r, g, b, _) in opaque_corners
            if abs(r - ref_r) + abs(g - ref_g) + abs(b - ref_b) <= 60
        )
        if matching_corners >= 3:
            visited = bytearray(w * h)
            q: deque[tuple[int, int]] = deque()
            tol = 55

            def _matches_bg(x: int, y: int) -> bool:
                r, g, b, a = px[x, y]
                if a <= 25:
                    return True
                return (abs(r - ref_r) + abs(g - ref_g) + abs(b - ref_b)) <= tol

            for bx in range(w):
                for by in (0, h - 1):
                    idx = by * w + bx
                    if not visited[idx] and _matches_bg(bx, by):
                        visited[idx] = 1
                        q.append((bx, by))
            for by in range(h):
                for bx in (0, w - 1):
                    idx = by * w + bx
                    if not visited[idx] and _matches_bg(bx, by):
                        visited[idx] = 1
                        q.append((bx, by))

            while q:
                cx, cy = q.popleft()
                px[cx, cy] = (0, 0, 0, 0)
                for nx, ny in ((cx - 1, cy), (cx + 1, cy), (cx, cy - 1), (cx, cy + 1)):
                    if 0 <= nx < w and 0 <= ny < h:
                        nidx = ny * w + nx
                        if not visited[nidx] and _matches_bg(nx, ny):
                            visited[nidx] = 1
                            q.append((nx, ny))

    # Step 2: Tight crop to non-transparent bounding box
    alpha = rgba.getchannel("A")
    mask = alpha.point(lambda p: 255 if p > 18 else 0)
    bbox = mask.getbbox()
    if bbox:
        bw = bbox[2] - bbox[0]
        bh = bbox[3] - bbox[1]
        if bw >= 4 and bh >= 4:
            pad = 1
            left = max(0, bbox[0] - pad)
            top = max(0, bbox[1] - pad)
            right = min(rgba.width, bbox[2] + pad)
            bottom = min(rgba.height, bbox[3] + pad)
            rgba = rgba.crop((left, top, right, bottom))

    # Step 3: Optional 1:1 circular crop/mask for round seals
    if mode == "circle":
        cw, ch = rgba.size
        side = min(cw, ch)
        cx_off = (cw - side) // 2
        cy_off = (ch - side) // 2
        rgba = rgba.crop((cx_off, cy_off, cx_off + side, cy_off + side))

        # Apply supersampled anti-aliased circular mask
        scale = 2
        hi_mask = Image.new("L", (side * scale, side * scale), 0)
        draw = ImageDraw.Draw(hi_mask)
        draw.ellipse((0, 0, side * scale - 1, side * scale - 1), fill=255)
        circle_mask = hi_mask.resize((side, side), Image.Resampling.LANCZOS)

        existing_a = rgba.getchannel("A")
        combined_a = Image. composite(existing_a, Image.new("L", (side, side), 0), circle_mask)
        rgba.putalpha(combined_a)

    return rgba


def _apply_trimmed_logo_to_project_dict(
    proj: Dict[str, Any],
    asset_id: str,
    mode: str = "auto",
) -> bool:
    assets: List[Dict[str, Any]] = proj.get("assets") or []
    target_asset = next((a for a in assets if a.get("id") == asset_id), None)
    if not target_asset:
        return False

    rel_path = target_asset.get("relative_path", "")
    if not rel_path:
        return False
    full_path = STORAGE_DIR / rel_path
    if not full_path.exists():
        return False

    with Image.open(full_path) as img:
        processed = _trim_or_circle_crop_rgba(img, mode=mode)
        nw, nh = processed.size
        buf = io.BytesIO()
        processed.save(buf, format="PNG")
        save_bytes = buf.getvalue()

    full_path.write_bytes(save_bytes)
    new_ar = nw / max(1.0, float(nh))
    cache_bust = uuid.uuid4().hex[:6]
    new_url = f"/storage/{rel_path}?v={cache_bust}"

    target_asset["natural_width"] = nw
    target_asset["natural_height"] = nh
    target_asset["aspect_ratio"] = new_ar
    target_asset["url"] = new_url

    # Update all LogoGroup elements & single Logo elements
    for el in proj.get("elements") or []:
        if el.get("type") == "logo_group" and el.get("logo_group_props"):
            for lg in el["logo_group_props"].get("logos") or []:
                if lg.get("asset_id") == asset_id:
                    lg["natural_width"] = nw
                    lg["natural_height"] = nh
                    lg["aspect_ratio"] = new_ar
                    lg["url"] = new_url
        elif el.get("type") == "logo" and el.get("logo_props"):
            lp = el["logo_props"]
            if lp.get("asset_id") == asset_id:
                lp["natural_width"] = nw
                lp["natural_height"] = nh
                lp["aspect_ratio"] = new_ar
                lp["url"] = new_url

    # Update all Event-specific custom logo arrays AND per-LogoGroup element_overrides.logos
    for ev in proj.get("events") or []:
        for lg in ev.get("logos") or []:
            if lg.get("asset_id") == asset_id:
                lg["natural_width"] = nw
                lg["natural_height"] = nh
                lg["aspect_ratio"] = new_ar
                lg["url"] = new_url
        for _el_id, ov in (ev.get("element_overrides") or {}).items():
            if isinstance(ov, dict) and ov.get("logos"):
                for lg in ov["logos"]:
                    if lg.get("asset_id") == asset_id:
                        lg["natural_width"] = nw
                        lg["natural_height"] = nh
                        lg["aspect_ratio"] = new_ar
                        lg["url"] = new_url

    return True


@app.post("/api/projects/{project_id}/logos/{asset_id}/trim")
def trim_project_logo(
    project_id: str,
    asset_id: str,
    mode: str = Query("auto", pattern="^(auto|circle)$"),
) -> Dict[str, Any]:
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Project not found.")
        proj = row_to_project_dict(row)

    ok = _apply_trimmed_logo_to_project_dict(proj, asset_id=asset_id, mode=mode)
    if not ok:
        raise HTTPException(status_code=404, detail="Logo asset not found on disk.")

    with get_conn() as conn:
        conn.execute(
            """
            UPDATE projects
            SET assets_json = ?, elements_json = ?, events_json = ?, updated_at = ?
            WHERE id = ?
            """,
            (
                json.dumps(proj["assets"]),
                json.dumps(proj["elements"]),
                json.dumps(proj["events"]),
                now_iso(),
                project_id,
            ),
        )
        conn.commit()
        updated_row = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()

    return row_to_project_dict(updated_row)


@app.post("/api/projects/{project_id}/logos-trim-all")
def trim_all_project_logos(
    project_id: str,
    mode: str = Query("auto", pattern="^(auto|circle)$"),
) -> Dict[str, Any]:
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Project not found.")
        proj = row_to_project_dict(row)

    for asset in proj.get("assets") or []:
        aid = asset.get("id")
        if aid:
            _apply_trimmed_logo_to_project_dict(proj, asset_id=aid, mode=mode)

    with get_conn() as conn:
        conn.execute(
            """
            UPDATE projects
            SET assets_json = ?, elements_json = ?, events_json = ?, updated_at = ?
            WHERE id = ?
            """,
            (
                json.dumps(proj["assets"]),
                json.dumps(proj["elements"]),
                json.dumps(proj["events"]),
                now_iso(),
                project_id,
            ),
        )
        conn.commit()
        updated_row = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()

    return row_to_project_dict(updated_row)


@app.delete("/api/projects/{project_id}/logos/{asset_id}")
def delete_project_logo(project_id: str, asset_id: str) -> Dict[str, Any]:
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Project not found.")
        proj = row_to_project_dict(row)

    assets: List[Dict[str, Any]] = proj.get("assets") or []
    target_asset = next((a for a in assets if a.get("id") == asset_id), None)
    if not target_asset:
        raise HTTPException(status_code=404, detail="Logo asset not found.")

    rel_path = target_asset.get("relative_path", "")
    if rel_path:
        full_path = STORAGE_DIR / rel_path
        try:
            if full_path.exists():
                full_path.unlink()
        except Exception:
            pass

    proj["assets"] = [a for a in assets if a.get("id") != asset_id]

    next_elements: List[Dict[str, Any]] = []
    for el in proj.get("elements") or []:
        if el.get("type") == "logo_group" and el.get("logo_group_props"):
            el["logo_group_props"]["logos"] = [
                lg
                for lg in (el["logo_group_props"].get("logos") or [])
                if lg.get("asset_id") != asset_id
            ]
            next_elements.append(el)
        elif el.get("type") == "logo" and el.get("logo_props"):
            if el["logo_props"].get("asset_id") == asset_id:
                continue
            next_elements.append(el)
        else:
            next_elements.append(el)
    proj["elements"] = next_elements

    for ev in proj.get("events") or []:
        if ev.get("logos"):
            ev["logos"] = [lg for lg in ev["logos"] if lg.get("asset_id") != asset_id]
        for _el_id, ov in (ev.get("element_overrides") or {}).items():
            if isinstance(ov, dict) and ov.get("logos"):
                ov["logos"] = [lg for lg in ov["logos"] if lg.get("asset_id") != asset_id]

    with get_conn() as conn:
        conn.execute(
            """
            UPDATE projects
            SET assets_json = ?, elements_json = ?, events_json = ?, updated_at = ?
            WHERE id = ?
            """,
            (
                json.dumps(proj["assets"]),
                json.dumps(proj["elements"]),
                json.dumps(proj["events"]),
                now_iso(),
                project_id,
            ),
        )
        conn.commit()
        updated_row = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()

    return row_to_project_dict(updated_row)


@app.post("/api/projects/{project_id}/duplicate")
def duplicate_project(project_id: str, new_name: Optional[str] = Query(None)) -> Dict[str, Any]:
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Project not found.")
        source = row_to_project_dict(row)

    new_id = f"proj_{uuid.uuid4().hex[:10]}"
    src_dir = PROJECTS_DIR / project_id
    dst_dir = PROJECTS_DIR / new_id
    if src_dir.exists():
        shutil.copytree(src_dir, dst_dir, dirs_exist_ok=True)
    else:
        (dst_dir / "template").mkdir(parents=True, exist_ok=True)
        (dst_dir / "logos").mkdir(parents=True, exist_ok=True)

    # Rewrite relative paths from old project_id to new_id
    raw_json = json.dumps(source)
    rewritten_json = raw_json.replace(f"projects/{project_id}/", f"projects/{new_id}/")
    cloned = json.loads(rewritten_json)

    dup_name = (new_name or f"{source['name']} (Copy)").strip()
    now = now_iso()

    with get_conn() as conn:
        conn.execute(
            """
            INSERT INTO projects (
                id, name, description, is_template, template_json,
                elements_json, events_json, assets_json, active_event_id,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                new_id,
                dup_name,
                cloned.get("description", ""),
                1 if cloned.get("is_template") else 0,
                json.dumps(cloned.get("template")) if cloned.get("template") else None,
                json.dumps(cloned.get("elements", [])),
                json.dumps(cloned.get("events", [])),
                json.dumps(cloned.get("assets", [])),
                cloned.get("active_event_id"),
                now,
                now,
            ),
        )
        conn.commit()
        new_row = conn.execute("SELECT * FROM projects WHERE id = ?", (new_id,)).fetchone()

    return row_to_project_dict(new_row)


@app.delete("/api/projects/{project_id}")
def delete_project(project_id: str) -> Dict[str, Any]:
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Project not found.")

    create_backup(project_id, "before_project_delete")

    with get_conn() as conn:
        conn.execute("DELETE FROM projects WHERE id = ?", (project_id,))
        conn.commit()

    proj_dir = PROJECTS_DIR / project_id
    if proj_dir.exists():
        shutil.rmtree(proj_dir, ignore_errors=True)

    return {"deleted": True, "id": project_id}


@app.get("/api/projects/{project_id}/config-export")
def export_project_config(project_id: str) -> JSONResponse:
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Project not found.")
        project = row_to_project_dict(row)

    export_payload = {
        "schema_version": "1.0",
        "exported_at": now_iso(),
        "project": project,
    }
    filename = f"{sanitize_filename(project['name'])}_config.json"
    return JSONResponse(
        content=export_payload,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.post("/api/projects/config-import")
async def import_project_config(config_file: UploadFile = File(...)) -> Dict[str, Any]:
    raw = await config_file.read()
    try:
        parsed = json.loads(raw.decode("utf-8"))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid JSON configuration file: {exc}")

    proj_data = parsed.get("project") if "project" in parsed else parsed
    if not isinstance(proj_data, dict) or "name" not in proj_data:
        raise HTTPException(status_code=400, detail="Configuration JSON is missing required project fields.")

    new_id = f"proj_{uuid.uuid4().hex[:10]}"
    proj_dir = PROJECTS_DIR / new_id
    (proj_dir / "template").mkdir(parents=True, exist_ok=True)
    (proj_dir / "logos").mkdir(parents=True, exist_ok=True)

    # If the original project assets exist locally on this machine, copy them into the new project directory
    old_id = proj_data.get("id")
    if old_id and (PROJECTS_DIR / old_id).exists():
        shutil.copytree(PROJECTS_DIR / old_id, proj_dir, dirs_exist_ok=True)
        raw_str = json.dumps(proj_data).replace(f"projects/{old_id}/", f"projects/{new_id}/")
        proj_data = json.loads(raw_str)

    now = now_iso()
    with get_conn() as conn:
        conn.execute(
            """
            INSERT INTO projects (
                id, name, description, is_template, template_json,
                elements_json, events_json, assets_json, active_event_id,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                new_id,
                f"{proj_data['name']} (Imported)",
                proj_data.get("description", ""),
                1 if proj_data.get("is_template") else 0,
                json.dumps(proj_data.get("template")) if proj_data.get("template") else None,
                json.dumps(proj_data.get("elements", [])),
                json.dumps(proj_data.get("events", [])),
                json.dumps(proj_data.get("assets", [])),
                proj_data.get("active_event_id"),
                now,
                now,
            ),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM projects WHERE id = ?", (new_id,)).fetchone()

    return row_to_project_dict(row)


@app.get("/api/projects/{project_id}/preview")
def preview_rendered_event(
    project_id: str,
    event_id: Optional[str] = Query(None),
    max_width: int = Query(900),
) -> StreamingResponse:
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Project not found.")
        project = row_to_project_dict(row)

    try:
        rendered = render_tarpaulin_image(project, event_id=event_id)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    w, h = rendered.size
    if max_width and w > max_width:
        ratio = max_width / float(w)
        rendered = rendered.resize((max_width, max(1, int(round(h * ratio)))), Image.Resampling.LANCZOS)

    buf = io.BytesIO()
    rendered.save(buf, format="PNG")
    buf.seek(0)
    return StreamingResponse(buf, media_type="image/png")


@app.post("/api/projects/{project_id}/export")
def export_project_tarpaulins(project_id: str, req: ExportRequest) -> Dict[str, Any]:
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Project not found.")
        project = row_to_project_dict(row)

    if not project.get("template"):
        raise HTTPException(status_code=400, detail="Project has no background template uploaded.")

    if req.custom_width is not None and (req.custom_width < 50 or req.custom_width > 20000):
        raise HTTPException(status_code=400, detail="Custom width must be between 50 and 20,000 pixels.")
    if req.custom_height is not None and (req.custom_height < 50 or req.custom_height > 20000):
        raise HTTPException(status_code=400, detail="Custom height must be between 50 and 20,000 pixels.")

    all_events = project.get("events") or []
    if req.event_ids:
        id_set = set(req.event_ids)
        selected_events = [ev for ev in all_events if ev.get("id") in id_set]
    else:
        selected_events = all_events

    if not selected_events:
        # Render default/current design even if events list is empty
        selected_events = [{"id": "default", "name": project["name"]}]

    proj_export_dir = EXPORTS_DIR / project_id
    proj_export_dir.mkdir(parents=True, exist_ok=True)

    dpi_val = max(72, min(1200, int(req.dpi or 300)))
    exported_files: List[Dict[str, Any]] = []
    now = now_iso()

    for idx, ev in enumerate(selected_events):
        ev_id = ev.get("id")
        ev_name = ev.get("name") or ev.get("title") or f"Event_{idx + 1}"
        rendered = render_tarpaulin_image(
            project,
            event_id=None if ev_id == "default" else ev_id,
            custom_width=req.custom_width,
            custom_height=req.custom_height,
            preserve_aspect_ratio=req.preserve_aspect_ratio,
        )
        out_w, out_h = rendered.size
        safe_proj = sanitize_filename(project["name"])
        safe_ev = sanitize_filename(ev_name)
        unique_tag = uuid.uuid4().hex[:6]
        filename = f"{safe_proj}_{safe_ev}_{unique_tag}.png"
        rel_path = f"exports/{project_id}/{filename}"
        full_path = STORAGE_DIR / rel_path

        # Save lossless high-resolution PNG with DPI metadata
        rendered.save(
            full_path,
            format="PNG",
            dpi=(dpi_val, dpi_val),
            compress_level=1,
        )

        exp_record = {
            "id": f"exp_{uuid.uuid4().hex[:8]}",
            "project_id": project_id,
            "project_name": project["name"],
            "event_id": ev_id,
            "event_name": ev_name,
            "filename": filename,
            "relative_path": rel_path,
            "url": f"/storage/{rel_path}",
            "width": out_w,
            "height": out_h,
            "dpi": dpi_val,
            "export_type": "PNG",
            "created_at": now,
        }
        exported_files.append(exp_record)

        with get_conn() as conn:
            conn.execute(
                """
                INSERT INTO export_history (
                    id, project_id, project_name, event_id, event_name,
                    filename, relative_path, url, width, height, export_type, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    exp_record["id"],
                    project_id,
                    project["name"],
                    ev_id,
                    ev_name,
                    filename,
                    rel_path,
                    exp_record["url"],
                    out_w,
                    out_h,
                    "PNG",
                    now,
                ),
            )
            conn.commit()

    zip_record: Optional[Dict[str, Any]] = None
    if req.as_zip or len(exported_files) > 1:
        zip_filename = f"{sanitize_filename(project['name'])}_batch_{uuid.uuid4().hex[:6]}.zip"
        zip_rel_path = f"exports/{project_id}/{zip_filename}"
        zip_full_path = STORAGE_DIR / zip_rel_path

        with zipfile.ZipFile(zip_full_path, "w", compression=zipfile.ZIP_STORED) as zf:
            for item in exported_files:
                file_on_disk = STORAGE_DIR / item["relative_path"]
                if file_on_disk.exists():
                    zf.write(file_on_disk, arcname=item["filename"])

        first_w = exported_files[0]["width"] if exported_files else 0
        first_h = exported_files[0]["height"] if exported_files else 0
        zip_record = {
            "id": f"exp_zip_{uuid.uuid4().hex[:8]}",
            "project_id": project_id,
            "project_name": project["name"],
            "event_id": "batch_zip",
            "event_name": f"Batch ZIP ({len(exported_files)} PNGs)",
            "filename": zip_filename,
            "relative_path": zip_rel_path,
            "url": f"/storage/{zip_rel_path}",
            "width": first_w,
            "height": first_h,
            "export_type": "ZIP",
            "created_at": now,
        }
        with get_conn() as conn:
            conn.execute(
                """
                INSERT INTO export_history (
                    id, project_id, project_name, event_id, event_name,
                    filename, relative_path, url, width, height, export_type, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    zip_record["id"],
                    project_id,
                    project["name"],
                    "batch_zip",
                    zip_record["event_name"],
                    zip_filename,
                    zip_rel_path,
                    zip_record["url"],
                    first_w,
                    first_h,
                    "ZIP",
                    now,
                ),
            )
            conn.commit()

    return {
        "exports": exported_files,
        "zip": zip_record,
        "count": len(exported_files),
    }


@app.post("/api/demo-project")
def create_sample_demo_project(preset: str = Query("roadshow")) -> Dict[str, Any]:
    """Creates a ready-to-explore sample project: either the original 5-Event Roadshow ('roadshow') or the 39-Activity Orange Campaign ('gad')."""
    project_id = f"proj_{uuid.uuid4().hex[:10]}"
    proj_dir = PROJECTS_DIR / project_id
    (proj_dir / "template").mkdir(parents=True, exist_ok=True)
    (proj_dir / "logos").mkdir(parents=True, exist_ok=True)

    # Generate a crisp 1920x1080 event tarpaulin background template
    tpl_w, tpl_h = 1920, 1080
    tpl_img = Image.new("RGBA", (tpl_w, tpl_h), (15, 23, 42, 255))
    draw = ImageDraw.Draw(tpl_img)

    # Decorative geometric frame & header/footer accents on the template
    draw.rectangle([0, 0, tpl_w, 190], fill=(30, 41, 59, 255))
    draw.rectangle([0, tpl_h - 90, tpl_w, tpl_h], fill=(30, 41, 59, 255))
    draw.rectangle([36, 36, tpl_w - 36, tpl_h - 36], outline=(56, 189, 248, 180), width=4)
    draw.rectangle([48, 48, tpl_w - 48, tpl_h - 48], outline=(250, 204, 21, 120), width=2)

    tpl_filename = "summit_tarpaulin_template_1920x1080.png"
    tpl_rel = f"projects/{project_id}/template/{tpl_filename}"
    tpl_path = STORAGE_DIR / tpl_rel
    tpl_img.save(tpl_path, format="PNG")
    raw_tpl_bytes = tpl_path.read_bytes()

    template_meta = TemplateMeta(
        filename=tpl_filename,
        relative_path=tpl_rel,
        url=f"/storage/{tpl_rel}",
        width=tpl_w,
        height=tpl_h,
        aspect_ratio=tpl_w / float(tpl_h),
        format="PNG",
        file_size=len(raw_tpl_bytes),
        sha256=compute_sha256(raw_tpl_bytes),
    ).model_dump()

    # Generate 6 distinct transparent PNG partner logos
    badge_specs = [
        ("GAD Office", (234, 88, 12, 255), (210, 140)),
        ("City Mayor Office", (59, 130, 246, 255), (190, 170)),
        ("DILG & LGU", (16, 185, 129, 255), (220, 140)),
        ("CSWDO & Health", (139, 92, 246, 255), (200, 150)),
        ("PNP / BFP / BJMP", (236, 72, 153, 255), (190, 180)),
        ("PESO / COOP / DA", (20, 184, 166, 255), (230, 140)),
    ]

    assets: List[Dict[str, Any]] = []
    logo_group_items: List[Dict[str, Any]] = []

    for idx, (label, rgba, (lw, lh)) in enumerate(badge_specs):
        lg_img = Image.new("RGBA", (lw, lh), (0, 0, 0, 0))
        ld = ImageDraw.Draw(lg_img)
        ld.rounded_rectangle([6, 6, lw - 6, lh - 6], radius=22, fill=rgba, outline=(255, 255, 255, 230), width=4)
        short_label = "".join([w[0] for w in label.split()[:3]])
        ld.text((lw // 2 - 24, lh // 2 - 12), short_label, fill=(255, 255, 255, 255))

        asset_id = f"logo_demo_{idx + 1}"
        lg_file = f"{asset_id}.png"
        lg_rel = f"projects/{project_id}/logos/{lg_file}"
        lg_img.save(STORAGE_DIR / lg_rel, format="PNG")

        asset_obj = LogoAsset(
            id=asset_id,
            name=label,
            url=f"/storage/{lg_rel}",
            relative_path=lg_rel,
            natural_width=lw,
            natural_height=lh,
            aspect_ratio=lw / float(lh),
            format="PNG",
        ).model_dump()
        assets.append(asset_obj)

        logo_group_items.append(
            LogoGroupItem(
                id=f"lgi_{idx + 1}",
                asset_id=asset_id,
                name=label,
                url=f"/storage/{lg_rel}",
                relative_path=lg_rel,
                natural_width=lw,
                natural_height=lh,
                aspect_ratio=lw / float(lh),
                visible=True,
            ).model_dump()
        )

    scale = max(0.5, tpl_h / 1080.0)
    elements = [
        CanvasElement(
            id=f"el_logogroup_{uuid.uuid4().hex[:6]}",
            name="Partner Logos Group",
            type="logo_group",
            field_role="logos",
            x=10.0,
            y=4.0,
            width=80.0,
            height=12.0,
            z_index=1,
            logo_group_props=LogoGroupProps(
                logos=logo_group_items,
                arrangement="horizontal",
                max_logo_height=85.0,
                max_logo_width=35.0,
                horizontal_spacing=2.5,
                vertical_spacing=4.0,
                max_logos_per_row=6,
                alignment="center",
            ),
        ).model_dump(),
        CanvasElement(
            id=f"el_dayheader_{uuid.uuid4().hex[:6]}",
            name="Campaign Day / Phase",
            type="text",
            field_role="custom:day_header",
            x=15.0,
            y=18.0,
            width=70.0,
            height=6.0,
            z_index=2,
            text_props=TextStyle(
                content="{{event.custom.day_header}}",
                binding="{{event.custom.day_header}}",
                font_family="Arial",
                font_size=round(28 * scale, 1),
                bold=True,
                color="#38BDF8",
                align="center",
                vertical_align="middle",
                auto_fit=True,
            ),
        ).model_dump(),
        CanvasElement(
            id=f"el_title_{uuid.uuid4().hex[:6]}",
            name="Activity Title / Description",
            type="text",
            field_role="title",
            x=8.0,
            y=25.0,
            width=84.0,
            height=22.0,
            z_index=3,
            text_props=TextStyle(
                content="{{event.title}}",
                binding="{{event.title}}",
                font_family="Arial",
                font_size=round(54 * scale, 1),
                bold=True,
                color="#FFFFFF",
                align="center",
                vertical_align="middle",
                auto_fit=True,
                outline_enabled=True,
                outline_color="#0F172A",
                outline_width=round(3 * scale, 1),
                shadow_enabled=True,
                shadow_color="#000000",
                shadow_offset_x=round(2 * scale, 1),
                shadow_offset_y=round(2 * scale, 1),
            ),
        ).model_dump(),
        CanvasElement(
            id=f"el_leadoffice_{uuid.uuid4().hex[:6]}",
            name="Lead Office",
            type="text",
            field_role="custom:lead_office",
            x=12.0,
            y=49.0,
            width=76.0,
            height=8.0,
            z_index=4,
            text_props=TextStyle(
                content="Lead Office: {{event.custom.lead_office}}",
                binding=None,
                font_family="Arial",
                font_size=round(34 * scale, 1),
                bold=True,
                color="#FACC15",
                align="center",
                vertical_align="middle",
                auto_fit=True,
                outline_enabled=True,
                outline_color="#0F172A",
                outline_width=round(2 * scale, 1),
            ),
        ).model_dump(),
        CanvasElement(
            id=f"el_partners_{uuid.uuid4().hex[:6]}",
            name="Partners List",
            type="text",
            field_role="custom:partners",
            x=10.0,
            y=59.0,
            width=80.0,
            height=10.0,
            z_index=5,
            text_props=TextStyle(
                content="Partners: {{event.custom.partners}}",
                binding=None,
                font_family="Arial",
                font_size=round(26 * scale, 1),
                bold=False,
                color="#E2E8F0",
                align="center",
                vertical_align="middle",
                auto_fit=True,
            ),
        ).model_dump(),
        CanvasElement(
            id=f"el_venue_{uuid.uuid4().hex[:6]}",
            name="Venue",
            type="text",
            field_role="venue",
            x=15.0,
            y=71.0,
            width=70.0,
            height=8.0,
            z_index=6,
            text_props=TextStyle(
                content="Venue: {{event.venue}}",
                binding=None,
                font_family="Arial",
                font_size=round(30 * scale, 1),
                bold=True,
                color="#FFFFFF",
                align="center",
                vertical_align="middle",
                auto_fit=True,
            ),
        ).model_dump(),
        CanvasElement(
            id=f"el_date_{uuid.uuid4().hex[:6]}",
            name="Event Date",
            type="text",
            field_role="date",
            x=20.0,
            y=81.0,
            width=60.0,
            height=7.0,
            z_index=7,
            text_props=TextStyle(
                content="{{event.date}}",
                binding="{{event.date}}",
                font_family="Arial",
                font_size=round(28 * scale, 1),
                bold=True,
                color="#38BDF8",
                align="center",
                vertical_align="middle",
                auto_fit=True,
            ),
        ).model_dump(),
    ]

    raw_campaign_items = [
        (
            "Pre-Campaign - OGAD Validation",
            "PRE-CAMPAIGN INDEPENDENT VALIDATION",
            "Pre-Campaign",
            "Barangay Validation of Outstanding GAD Champions (OGAD Champions)",
            "GAD Office",
            "DILG, LGU Offices, Liga ng mga Barangay, CCGLO",
            "Per Regions",
            "November 16 - 20, 2026",
            "Best Barangay GAD Implementors",
        ),
        (
            "DAY 1 - Activity 1",
            "DAY 1 | NOV 25, 2026 | WED",
            "Activity 1",
            "Wellness and Essential Care Distribution for Project S.U.N.S.H.I.N.E Beneficiaries.",
            "GAD Office",
            "All City Offices, Barangays, PNP, BFP, BJMP, CSWD, Academe, CSOs",
            "CITYWIDE",
            "NOV 25, 2026 | WED",
            "",
        ),
        (
            "DAY 1 - Activity 2",
            "DAY 1 | NOV 25, 2026 | WED",
            "Activity 2",
            "Opening Program, Orange Campaign Kickoff, Parade around the City, Policy Call to Action, Project S.U.N.S.H.I.N.E. public launch.",
            "GAD Office & Office of the City Mayor",
            "All City Offices, Barangays, PNP, BFP, BJMP, CSWD, Academe, CSOs",
            "CITYWIDE",
            "NOV 25, 2026 | WED",
            "",
        ),
        (
            "DAY 2 - Activity 1",
            "DAY 2 | NOV 26, 2026 | THU",
            "Activity 1",
            "Women's economic empowerment, safe employment, anti-trafficking and cyber recruitment scam awareness.",
            "PESO / COOP / CEDIPO",
            "DA, DOLE, DTI, OWWA, COA, Cooperatives, MSMES, Barangays, CSOs, Private Sector",
            "F. L. Dy Colliseum, District III, Cauayan City, Isabela",
            "NOV 26, 2026 | THU",
            "",
        ),
        (
            "DAY 2 - Activity 2",
            "DAY 2 | NOV 26, 2026 | THU",
            "Activity 2",
            "Rural women protection, livelihood, cooperative support, and community-based prevention.",
            "City Agriculture & Cooperative Office",
            "DA, DOLE, DTI, OWWA, COA, Cooperatives, MSMES, Barangays, CSOs, Private Sector",
            "F. L. Dy Colliseum, District III, Cauayan City, Isabela",
            "NOV 26, 2026 | THU",
            "",
        ),
        (
            "DAY 2 - Activity 3",
            "DAY 2 | NOV 26, 2026 | THU",
            "Activity 3",
            "GAD Employee Development, Recognition and Organizational Strengthening Program.",
            "City Accounting Office",
            "DA, DOLE, DTI, OWWA, COA, Cooperatives, MSMES, Barangays, CSOs, Private Sector",
            "F. L. Dy Colliseum, District III, Cauayan City, Isabela",
            "NOV 26–30, 2026",
            "",
        ),
        (
            "DAY 3 - Activity 1",
            "DAY 3 | NOV 27, 2026 | FRI",
            "Activity 1",
            "Protection of women with disabilities & senior women; inclusive referral and access to support, and Sign Language Orientation.",
            "PDAO & OSCA",
            "CSWDO, Health Office, PNP, PNP-WCPD, NGAs, CSOs, ISAC, Women with Disabilities Group",
            "F. L. Dy Colliseum, District III, Cauayan City, Isabela",
            "NOV 27, 2026 | FRI",
            "",
        ),
        (
            "DAY 3 - Activity 2",
            "DAY 3 | NOV 27, 2026 | FRI",
            "Activity 2",
            "Namnama (PWD Film Viewing)",
            "GAD Office",
            "CSWDO, Health Office, PNP, PNP-WCPD, NGAs, CSOs, ISAC, Women with Disabilities Group",
            "F. L. Dy Colliseum, District III, Cauayan City, Isabela",
            "NOV 27, 2026 | FRI",
            "",
        ),
        (
            "DAY 3 - Activity 3",
            "DAY 3 | NOV 27, 2026 | FRI",
            "Activity 3",
            "Survivor-centered care management, psychosocial first aid, women and children referral mapping.",
            "CSWDO",
            "CSWDO, Health Office, PNP, PNP-WCPD, NGAs, CSOs, ISAC, Women with Disabilities Group",
            "F. L. Dy Colliseum, District III, Cauayan City, Isabela",
            "NOV 27, 2026 | FRI",
            "",
        ),
        (
            "DAY 3 - Activity 4",
            "DAY 3 | NOV 27, 2026 | FRI",
            "Activity 4",
            "KABATAAN PRO-TECT (Teen Empowerment and Care Team): Peer Helping Training on Safe Spaces, Mental Health, and ASRH",
            "City Population Office",
            "City Health Office, Local Youth Development Office, Cauayan City Stand Alone Senior High School",
            "Cauayan City Stand Alone Senior High School",
            "NOV 27, 2026 | FRI",
            "",
        ),
        (
            "DAY 4 - Main Activity",
            "DAY 4 | NOV 28, 2026 | SAT",
            "Main Activity",
            "Multi-stakeholder dialogues, citizen participation, social accountability, survivor advocacy, and community partnership building.",
            "Cooperative Office CSOs / POs / OGP Partners / Faith-based Groups",
            "All Community and Development Partners",
            "Isabela Convention Center, San Fermin, Cauayan City, Isabela",
            "NOV 28, 2026 | SAT",
            "",
        ),
        (
            "DAY 5 - Online Advocacy",
            "DAY 5 | NOV 29, 2026 | SUN",
            "Online Advocacy",
            "Posting of Advocacy Videos, Safe Spaces Pledges Videos and Advocacy Posters",
            "ONLINE ADVOCACY",
            "All City Offices, Barangays, CSOs",
            "Online / Social Media Platforms",
            "NOV 29, 2026 | SUN",
            "",
        ),
        (
            "DAY 6 - Youth Forum",
            "DAY 6 | NOV 30, 2026 | MON",
            "Main Activity",
            "Youth forum on online safety, consent, anti-bullying, anti-grooming, TFGBV and cyber trafficking prevention.",
            "City Youth Development Office, SK Federation of Cauayan City / Kalinga Kabataan Program",
            "DepEd, SK, VM Office, Sangguniang Panlungsod, Youth Groups, Faith Groups, PNP, Legal Office",
            "F. L. Dy Colliseum, District III, Cauayan City, Isabela",
            "NOV 30, 2026 | MON",
            "",
        ),
        (
            "DAY 7 - Safe Workplace",
            "DAY 7 | DEC 1, 2026 | TUE",
            "Main Activity",
            "Safe workplace, anti-sexual harassment, internal reporting and protection mechanisms.",
            "CHRMO & CODI",
            "DILG, HR Office, GAD Office, CSOs",
            "F. L. Dy Colliseum, District III, Cauayan City, Isabela",
            "DEC 1, 2026 | TUE",
            "",
        ),
        (
            "DAY 8 - Activity 1",
            "DAY 8 | DEC 2, 2026 | WED",
            "Activity 1",
            "Safe workplace, anti-sexual harassment, internal reporting and protection mechanisms.",
            "CHRMO & CODI",
            "DILG, HR Office, GAD Office, CSOs",
            "F. L. Dy Colliseum, District III, Cauayan City, Isabela",
            "DEC 2, 2026 | WED",
            "",
        ),
        (
            "DAY 8 - Activity 2 (World AIDS Day)",
            "DAY 8 | DEC 2, 2026 | WED",
            "Activity 2",
            "World Aids Day Celebrations 2026 : “Ending Aids Starts with Access”",
            "City Health Office (CHO)",
            "DILG, HR Office, GAD Office, CSOs",
            "F. L. Dy Colliseum, District III, Cauayan City, Isabela",
            "DEC 2, 2026 | WED",
            "",
        ),
        (
            "DAY 9 - Activity 1 (Men as Allies)",
            "DAY 9 | DEC 3, 2026 | THU",
            "Activity 1",
            "Men as allies forum, healthy masculinity, shared responsibility, and prevention of VAWC & online abuse.",
            "GAD Office & MOVE",
            "PNP, BFP, BJMP, CDRRMO, MDRRMO, All Teams, JCI, Faith Groups, Youth Groups, Academe, DepEd, MASON, ROTARY Club of Cauayan",
            "F. L. Dy Colliseum, District III, Cauayan City, Isabela",
            "DEC 3, 2026 | THU",
            "",
        ),
        (
            "DAY 9 - Activity 2 (Emergency Simulation)",
            "DAY 9 | DEC 3, 2026 | THU",
            "Activity 2",
            "Emergency response simulation, hotline awareness, safety drill, and rapid coordination.",
            "CDRRMO / Rescue 922 / Safe Line",
            "PNP, BFP, BJMP, CDRRMO, MDRRMO, All Teams, JCI, Faith Groups, Youth Groups, Academe, DepEd, MASON, ROTARY Club of Cauayan",
            "F. L. Dy Colliseum, District III, Cauayan City, Isabela",
            "DEC 3, 2026 | THU",
            "",
        ),
        (
            "DAY 10 - Activity 1 (Health Response)",
            "DAY 10 | DEC 4, 2026 | FRI",
            "Activity 1",
            "Health response, mental health, reproductive health, medico-legal awareness, and support services for survivors.",
            "City Health Office",
            "DILG, PNP, BJMP, City Prosecutor's Office, PAO, Barangays, Barangay Officials, BSWDO, Hospitals, RHUs, NGOs, Mental Health Partners, GAD Office, Tech Partners, JCI",
            "Isabela Convention Center, San Fermin, Cauayan City, Isabela",
            "DEC 4, 2026 | FRI",
            "",
        ),
        (
            "DAY 10 - Activity 2 (Legal Orientation)",
            "DAY 10 | DEC 4, 2026 | FRI",
            "Activity 2",
            "Orientation on RA 9262, Safe Spaces Act, Anti-Trafficking, cyber-related VAWC and online crimes; legal referral pathways.",
            "City Legal Office",
            "DILG, PNP, BJMP, City Prosecutor's Office, PAO, Barangays, Barangay Officials, BSWDO, Hospitals, RHUs, NGOs, Mental Health Partners, GAD Office, Tech Partners, JCI",
            "Isabela Convention Center, San Fermin, Cauayan City, Isabela",
            "DEC 4, 2026 | FRI",
            "",
        ),
        (
            "DAY 10 - Activity 3 (Justice & WCPD)",
            "DAY 10 | DEC 4, 2026 | FRI",
            "Activity 3",
            "Case documentation, law enforcement coordination, protection procedures, and anti-online exploitation response.",
            "PNP-WCPD / LCAT-VAWC / BJMP / Justice Sector",
            "DILG, PNP, BJMP, City Prosecutor's Office, PAO, Barangays, Barangay Officials, BSWDO, Hospitals, RHUs, NGOs, Mental Health Partners, GAD Office, Tech Partners, JCI",
            "Isabela Convention Center, San Fermin, Cauayan City, Isabela",
            "DEC 4, 2026 | FRI",
            "",
        ),
        (
            "DAY 10 - Activity 4 (Barangay VAW Desks)",
            "DAY 10 | DEC 4, 2026 | FRI",
            "Activity 4",
            "Barangay action planning, desk strengthening, community watch, and referral readiness.",
            "Liga ng mga Barangay / VAW Desks",
            "DILG, PNP, BJMP, City Prosecutor's Office, PAO, Barangays, Barangay Officials, BSWDO, Hospitals, RHUs, NGOs, Mental Health Partners, GAD Office, Tech Partners, JCI",
            "Isabela Convention Center, San Fermin, Cauayan City, Isabela",
            "DEC 4, 2026 | FRI",
            "",
        ),
        (
            "DAY 10 - Activity 5 (Digital Safety Day)",
            "DAY 10 | DEC 4, 2026 | FRI",
            "Activity 5",
            "Digital Safety Day: demo of Project S.U.N.S.H.I.N.E., iReport VAWC, Safe Line, online reporting, cyber safety & digital evidence awareness.",
            "JCD GAD CONNECT and CDRRMO",
            "DILG, PNP, BJMP, City Prosecutor's Office, PAO, Barangays, Barangay Officials, BSWDO, Hospitals, RHUs, NGOs, Mental Health Partners, GAD Office, Tech Partners, JCI",
            "Isabela Convention Center, San Fermin, Cauayan City, Isabela",
            "DEC 4, 2026 | FRI",
            "",
        ),
        (
            "DAY 11 - In-Person Activity",
            "DAY 11 | DEC 5, 2026 | SAT",
            "In-Person Activity",
            "Campaign Learning and Service Readiness Day",
            "GAD Office",
            "All City Offices, GAD Focal Point System",
            "Bamboo Hall, City Hall, Cauayan City, Isabela",
            "DEC 5, 2026 | SAT",
            "",
        ),
        (
            "DAY 11 - Online Activity",
            "DAY 11 | DEC 5, 2026 | SAT",
            "Online Activity",
            "Posting of Advocacy Videos, Safe Spaces Pledges Videos and Advocacy Posters",
            "ONLINE ADVOCACY",
            "All City Offices, Barangays, CSOs",
            "Online / Social Media Platforms",
            "DEC 5, 2026 | SAT",
            "",
        ),
        (
            "DAY 12 - Online Advocacy",
            "DAY 12 | DEC 6, 2026 | SUN",
            "Online Advocacy",
            "Posting of Advocacy Videos, Safe Spaces Pledges Videos and Advocacy Posters",
            "ONLINE ADVOCACY",
            "All City Offices, Barangays, CSOs",
            "Online / Social Media Platforms",
            "DEC 6, 2026 | SUN",
            "",
        ),
        (
            "DAY 13 - Activity 1 (GFAST & GERL Seminar)",
            "DAY 13 | DEC 7, 2026 | MON",
            "Activity 1",
            "Seminar on Gender Functionality Assessment Tool (GFAST) and Gender Responsiveness LGU (GERL) Assessment Tool.",
            "GAD Office",
            "DILG, PCW, Province of Isabela GFPS, Cauayan City GFPS, IT Office, Planning Office, All Offices",
            "Isabela Convention Center, San Fermin, Cauayan City, Isabela",
            "DEC 7, 2026 | MON",
            "",
        ),
        (
            "DAY 13 - Activity 2 (Data-Driven Governance)",
            "DAY 13 | DEC 7, 2026 | MON",
            "Activity 2",
            "Data-driven governance, sex-disaggregated data, monitoring dashboards, GERL and accountability tools.",
            "CPDO / GAD KMS Team",
            "DILG, PCW, Province of Isabela GFPS, Cauayan City GFPS, IT Office, Planning Office, All Offices",
            "Isabela Convention Center, San Fermin, Cauayan City, Isabela",
            "DEC 7, 2026 | MON",
            "",
        ),
        (
            "DAY 13 - Activity 3 (Orange Exhibits)",
            "DAY 13 | DEC 7, 2026 | MON",
            "Activity 3",
            "Display of Orange Exhibits",
            "GAD Office",
            "DILG, PCW, Province of Isabela GFPS, Cauayan City GFPS, IT Office, Planning Office, All Offices",
            "Isabela Convention Center, San Fermin, Cauayan City, Isabela",
            "DEC 7, 2026 | MON",
            "",
        ),
        (
            "DAY 14 - Culture Arts & Public Advocacy",
            "DAY 14 | DEC 8, 2026 | TUE",
            "Main Activity",
            "Orange Exhibit and Orange Bubble Culture Arts and Public Advocacy: Painting Competition, Spoken Poetry, Declamation and Wearable Fashion Designing",
            "PIO, GAD Office, DepEd, ISU-Cauayan, Tourism Office, ISAC, CSOs",
            "Local Artists, Media, Content Creators",
            "F. L. Dy Colliseum, District III, Cauayan City, Isabela",
            "DEC 8, 2026 | TUE",
            "Awarding of Winners",
        ),
        (
            "DAY 15 - Activity 1 (Culminating Activity)",
            "DAY 15 | DEC 9, 2026 | WED",
            "Activity 1",
            "Awarding of all barangays & offices, recognition of partners, presentation of commitments, and ceremonial signing of Memorandum of Partnership with NAPC and OPAPRU.",
            "Culminating Activity led by LGU Cauayan",
            "DILG, NAPC, OPAPRU, PCW, CEDIPO, CSWDO, City Budget Office, City Accounting Office, GSO, DTI, TESDA, Cooperatives, Barangay Local Government Units, All Offices, All Partners, CSOs",
            "F. L. Dy Colliseum, District III, Cauayan City, Isabela",
            "DEC 9, 2026 | WED",
            "",
        ),
        (
            "DAY 15 - Activity 2 (PROJECT ORANGE RISE)",
            "DAY 15 | DEC 9, 2026 | WED",
            "Activity 2",
            "PROJECT ORANGE RISE: Empowering 12 Women in Economic Enterprise through the Proceeds of Orange Run",
            "GAD Office",
            "DILG, NAPC, OPAPRU, PCW, CEDIPO, CSWDO, City Budget Office, City Accounting Office, GSO, DTI, TESDA, Cooperatives, Barangay Local Government Units, All Offices, All Partners, CSOs",
            "F. L. Dy Colliseum, District III, Cauayan City, Isabela",
            "DEC 9, 2026 | WED",
            "",
        ),
        (
            "DAY 16 - Activity 1 (GAD in Action)",
            "DAY 16 | DEC 10, 2026 | THU",
            "Activity 1",
            "GAD in Action: Enhancing Gender-Responsive Management and Leadership",
            "GAD Office",
            "DEPED RO2, SDO Cauayan City, CSOs",
            "F. L. Dy Colliseum, District III, Cauayan City, Isabela",
            "DEC 10, 2026 | THU",
            "",
        ),
        (
            "DAY 16 - Activity 2 (Research Conference)",
            "DAY 16 | DEC 10, 2026 | THU",
            "Activity 2",
            "Regional Educational Research Conference",
            "GAD Office",
            "DEPED RO2, SDO Cauayan City, CSOs",
            "F. L. Dy Colliseum, District III, Cauayan City, Isabela",
            "DEC 10, 2026 | THU",
            "",
        ),
        (
            "DAY 17 - In-Person Activity",
            "DAY 17 | DEC 11, 2026 | FRI",
            "In-Person Activity",
            "Regional Educational Research Conference",
            "GAD Office",
            "SDO Cauayan City, DEPED RO2",
            "F. L. Dy Colliseum, District III, Cauayan City, Isabela",
            "DEC 11, 2026 | FRI",
            "",
        ),
        (
            "DAY 17 - Online Activity",
            "DAY 17 | DEC 11, 2026 | FRI",
            "Online Activity",
            "Posting of Advocacy Videos, Safe Spaces Pledges Videos and Advocacy Posters",
            "ONLINE ADVOCACY",
            "SDO Cauayan City, DEPED RO2",
            "Online / Social Media Platforms",
            "DEC 11, 2026 | FRI",
            "",
        ),
        (
            "DAY 18 - Activity 1 (Orange Exhibits)",
            "DAY 18 | DEC 12, 2026 | SAT",
            "Activity 1",
            "Display of Orange Exhibits",
            "GAD Office",
            "All City Offices, Barangays, CSOs",
            "Cauayan City, Isabela",
            "DEC 12, 2026 | SAT",
            "",
        ),
        (
            "DAY 18 - Activity 2 (Accomplishment Reports)",
            "DAY 18 | DEC 12, 2026 | SAT",
            "Activity 2",
            "Posting of Accomplishment Reports for the 18-day Campaign",
            "GAD Office",
            "All City Offices, Barangays, CSOs",
            "Cauayan City, Isabela",
            "DEC 12, 2026 | SAT",
            "",
        ),
        (
            "DAY 18 - Online Activity",
            "DAY 18 | DEC 12, 2026 | SAT",
            "Online Activity",
            "Posting of Advocacy Videos, Safe Spaces Pledges Videos and Advocacy Posters",
            "ONLINE ADVOCACY",
            "All City Offices, Barangays, CSOs",
            "Online / Social Media Platforms",
            "DEC 12, 2026 | SAT",
            "",
        ),
    ]

    events = [
        EventRecord(
            id=f"evt_{uuid.uuid4().hex[:8]}",
            name=name,
            title=title,
            subtitle=f"Lead Office: {lead}" if lead != "ONLINE ADVOCACY" else "Advocacy Track: ONLINE ADVOCACY",
            venue=venue,
            address="Cauayan City, Isabela",
            date=date_str,
            custom_fields={
                "day_header": day_hdr,
                "activity_no": act_no,
                "lead_office": lead,
                "partners": partners,
                **({"special_badge": badge} if badge else {}),
            },
            order_index=idx,
        ).model_dump()
        for idx, (name, day_hdr, act_no, title, lead, partners, venue, date_str, badge) in enumerate(
            raw_campaign_items
        )
    ]

    if preset != "gad":
        roadshow_elements = [
            CanvasElement(
                id=f"el_logogroup_{uuid.uuid4().hex[:6]}",
                name="Partner Logos Group",
                type="logo_group",
                field_role="logos",
                x=10.0,
                y=4.0,
                width=80.0,
                height=12.0,
                z_index=1,
                logo_group_props=LogoGroupProps(
                    logos=logo_group_items,
                    arrangement="horizontal",
                    max_logo_height=85.0,
                    max_logo_width=35.0,
                    horizontal_spacing=2.5,
                    vertical_spacing=4.0,
                    max_logos_per_row=6,
                    alignment="center",
                ),
            ).model_dump(),
            CanvasElement(
                id=f"el_title_{uuid.uuid4().hex[:6]}",
                name="Event Title",
                type="text",
                field_role="title",
                x=10.0,
                y=24.0,
                width=80.0,
                height=22.0,
                z_index=2,
                text_props=TextStyle(
                    content="{{event.title}}",
                    binding="{{event.title}}",
                    font_family="Arial",
                    font_size=round(60 * scale, 1),
                    bold=True,
                    color="#FFFFFF",
                    align="center",
                    vertical_align="middle",
                    auto_fit=True,
                    outline_enabled=True,
                    outline_color="#0F172A",
                    outline_width=round(3 * scale, 1),
                    shadow_enabled=True,
                ),
            ).model_dump(),
            CanvasElement(
                id=f"el_sub_{uuid.uuid4().hex[:6]}",
                name="Subtitle",
                type="text",
                field_role="subtitle",
                x=15.0,
                y=48.0,
                width=70.0,
                height=12.0,
                z_index=3,
                text_props=TextStyle(
                    content="{{event.subtitle}}",
                    binding="{{event.subtitle}}",
                    font_family="Arial",
                    font_size=round(34 * scale, 1),
                    bold=False,
                    color="#FACC15",
                    align="center",
                    vertical_align="middle",
                    auto_fit=True,
                ),
            ).model_dump(),
            CanvasElement(
                id=f"el_venue_{uuid.uuid4().hex[:6]}",
                name="Venue & Date",
                type="text",
                field_role="venue",
                x=15.0,
                y=66.0,
                width=70.0,
                height=14.0,
                z_index=4,
                text_props=TextStyle(
                    content="{{event.venue}}\n{{event.date}}",
                    binding="{{event.venue}}\n{{event.date}}",
                    font_family="Arial",
                    font_size=round(28 * scale, 1),
                    bold=True,
                    color="#E2E8F0",
                    align="center",
                    vertical_align="middle",
                    auto_fit=True,
                ),
            ).model_dump(),
        ]
        roadshow_stops = [
            ("Manila Kickoff Summit", "NATIONAL AI & CLOUD SUMMIT — MANILA", "Grand Ballroom, PICC", "Pasay City, Metro Manila", "November 14, 2026 | 9:00 AM"),
            ("Cebu Tech Forum", "VISAYAS DIGITAL INNOVATION FORUM — CEBU", "Waterfront Cebu City Hotel", "Lahug, Cebu City", "November 21, 2026 | 9:00 AM"),
            ("Davao Mindanao Expo", "MINDANAO SMART CITIES EXPO — DAVAO", "SMX Convention Center Davao", "Lanang, Davao City", "November 28, 2026 | 9:00 AM"),
            ("Baguio North Luzon Leg", "CORDILLERA GREEN TECH SYMPOSIUM — BAGUIO", "Baguio Country Club Hall", "Baguio City, Benguet", "December 5, 2026 | 9:00 AM"),
            ("Iloilo Finale Showcase", "WESTERN VISAYAS STARTUP FINALE — ILOILO", "Iloilo Convention Center", "Mandurriao, Iloilo City", "December 12, 2026 | 9:00 AM"),
        ]
        roadshow_events = [
            EventRecord(
                id=f"evt_{uuid.uuid4().hex[:8]}",
                name=r_name,
                title=r_title,
                subtitle="Building Resilient Digital Infrastructure Across the Regions",
                venue=r_venue,
                address=r_addr,
                date=r_date,
                order_index=idx,
            ).model_dump()
            for idx, (r_name, r_title, r_venue, r_addr, r_date) in enumerate(roadshow_stops)
        ]
        now = now_iso()
        with get_conn() as conn:
            conn.execute(
                """
                INSERT INTO projects (
                    id, name, description, is_template, template_json,
                    elements_json, events_json, assets_json, active_event_id,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    project_id,
                    "2026 Regional Tech Roadshow (5 Sample Events)",
                    "Sample project with 5 regional tarpaulin variations and 6 partner logos.",
                    0,
                    json.dumps(template_meta),
                    json.dumps(roadshow_elements),
                    json.dumps(roadshow_events),
                    json.dumps(assets),
                    roadshow_events[0]["id"],
                    now,
                    now,
                ),
            )
            conn.commit()
            row = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
        return row_to_project_dict(row)

    now = now_iso()
    with get_conn() as conn:
        conn.execute(
            """
            INSERT INTO projects (
                id, name, description, is_template, template_json,
                elements_json, events_json, assets_json, active_event_id,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                project_id,
                "18-Day Orange Campaign 2026 (Full 39 Tarpaulin Activities)",
                "Complete 18-Day Campaign to End VAWC (Nov 25 – Dec 12, 2026 + Pre-Campaign Validation) for City Government of Cauayan, Isabela.",
                0,
                json.dumps(template_meta),
                json.dumps(elements),
                json.dumps(events),
                json.dumps(assets),
                events[0]["id"],
                now,
                now,
            ),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()

    return row_to_project_dict(row)


# Serve built React production bundle (frontend/dist) if available
if (FRONTEND_DIST_DIR / "assets").exists():
    app.mount(
        "/assets",
        StaticFiles(directory=str(FRONTEND_DIST_DIR / "assets")),
        name="frontend_assets",
    )


@app.get("/{full_path:path}", include_in_schema=False)
def serve_spa_frontend(full_path: str):
    if (
        full_path.startswith("api/")
        or full_path.startswith("storage/")
        or full_path.startswith("custom_fonts/")
    ):
        raise HTTPException(status_code=404, detail="Not found")
    if FRONTEND_DIST_DIR.exists():
        requested_file = (FRONTEND_DIST_DIR / full_path).resolve()
        if (
            full_path
            and str(requested_file).startswith(str(FRONTEND_DIST_DIR.resolve()))
            and requested_file.is_file()
        ):
            return FileResponse(str(requested_file))
        index_html = FRONTEND_DIST_DIR / "index.html"
        if index_html.exists():
            return FileResponse(str(index_html))
    return JSONResponse(
        {
            "app": "Tarpaulin Studio API",
            "domain": "tarp.cyngfps.com",
            "status": "running",
            "hint": "Run 'pnpm build' in frontend/ to serve the production UI from this server.",
        }
    )


if __name__ == "__main__":
    import uvicorn

    host = os.environ.get("TARP_HOST", "0.0.0.0")
    port = int(os.environ.get("TARP_PORT", "8812"))
    is_prod = os.environ.get("TARP_ENV", "").lower() == "production"

    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=not is_prod,
        proxy_headers=True,
        forwarded_allow_ips="*",
    )
