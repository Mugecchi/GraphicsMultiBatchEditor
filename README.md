# Tarpaulin Studio

**Standalone Event Tarpaulin Designer & High-Resolution Batch PNG Generator**

Tarpaulin Studio is a standalone desktop-first web application built with **React + TypeScript + Vite + Tailwind CSS + Zustand** on the frontend and **Python + FastAPI + Pillow (PIL) + SQLite** on the backend. It requires **no Microsoft Word, Excel, Mail Merge, or external document-generation software** and keeps all assets and processing 100% local.

---

## Key Capabilities

1. **Immutable PNG Template Upload**:
   - Upload any PNG, JPG, JPEG, or WEBP background template.
   - Automatically detects exact pixel dimensions and SHA-256 integrity checksum.
   - The original template pixels are never cropped, stretched, recolored, or modified. All editable elements are composited on separate foreground layers.
2. **Three-Panel Interactive Visual Editor**:
   - **Left Panel**: Layers list (select, rename, hide/show, lock/unlock, reorder, duplicate, delete), Add Elements tab, Multi-Logo Upload library, and Events Manager.
   - **Center Visual Canvas**: Drag-and-drop positioning, 8-point resize handles, rotation handle, zoom in/out, fit-to-screen, 100% actual size, panning, rulers, and dynamic snap guides (edges, center lines, other elements).
   - **Right Properties Inspector**: Full typography controls (font family, size, bold, italic, underline, color, horizontal/vertical alignment, line height, letter spacing, word wrap, auto-fit font sizing, text outline/stroke, drop shadow), single logo controls, auto-layout logo group settings, alignment/distribution toolbar, and per-event element overrides.
3. **Dynamic Logo Group Engine**:
   - Supports unlimited logos with 5 automatic layout modes: **Horizontal**, **Grid**, **Centered**, **Space Between**, and **Space Around**.
   - Preserves natural aspect ratios and transparent PNG backgrounds without stretching or cropping.
4. **Events Manager & Live Data Binding**:
   - Bind text elements to `{{event.title}}`, `{{event.subtitle}}`, `{{event.venue}}`, `{{event.address}}`, `{{event.date}}`, or custom fields (`{{event.custom.key}}`).
   - Switch between event records in the Top Bar or Events Manager with instant reactive canvas updates.
5. **Full-Resolution Pillow PNG & Batch ZIP Export**:
   - Renders directly from the original template resolution using Pillow (`LANCZOS` resampling and alpha compositing), with optional custom print dimensions and configurable DPI metadata (`150` / `300` / `600` DPI).
   - Export individual PNGs or download all events in a single ZIP archive.

---

## Quick Start

### Option 1: One-Click Windows Startup Script
Run [`start_studio.bat`](file:///d:/tarp_editor/start_studio.bat) or start the backend and frontend servers in two terminals:

### Option 2: Manual Startup

**1. Start the FastAPI Backend (`http://127.0.0.1:8000`)**:
```powershell
cd d:\tarp_editor\backend
python -m pip install -r requirements.txt
python main.py
```

**2. Start the Vite Frontend (`http://localhost:5173`)**:
```powershell
cd d:\tarp_editor\frontend
npm install
npm run dev
```

Open **`http://localhost:5173`** in your browser.

---

## Keyboard Shortcuts (Visual Editor)

| Shortcut | Action |
| :--- | :--- |
| `Ctrl + Z` | Undo |
| `Ctrl + Y` / `Ctrl + Shift + Z` | Redo |
| `Ctrl + C` | Copy selected element(s) |
| `Ctrl + V` | Paste element(s) |
| `Ctrl + D` | Duplicate selected element(s) |
| `Delete` / `Backspace` | Delete selected unlocked element(s) |
| `Arrow Keys` | Nudge selected element(s) by `0.25%` |
| `Shift + Arrow Keys` | Nudge selected element(s) by `2.0%` |
| `Ctrl + S` | Save project immediately |
| `Alt + Drag` / `Middle Mouse` | Pan canvas |
| `Ctrl + Mouse Wheel` | Zoom in / out |

---

## Running Automated Verification Scenarios

All 12 required testing scenarios are covered in [`backend/tests/test_scenarios.py`](file:///d:/tarp_editor/backend/tests/test_scenarios.py):

```powershell
cd d:\tarp_editor\backend
python -m pytest tests/test_scenarios.py -v
```
