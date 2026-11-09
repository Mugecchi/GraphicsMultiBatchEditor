import os
import re
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from PIL import ImageFont

BASE_DIR = Path(__file__).resolve().parent
CUSTOM_FONTS_DIR = BASE_DIR / "custom_fonts"
CUSTOM_FONTS_DIR.mkdir(parents=True, exist_ok=True)

WIN_FONTS_DIR = Path(os.environ.get("WINDIR", "C:\\Windows")) / "Fonts"
LOCAL_USER_FONTS_DIR = (
    Path(os.environ.get("LOCALAPPDATA", "C:\\Users\\Default\\AppData\\Local"))
    / "Microsoft"
    / "Windows"
    / "Fonts"
)
LINUX_FONTS_DIRS = [
    Path("/usr/share/fonts"),
    Path("/usr/local/share/fonts"),
]

# Curated map of common professional fonts to standard Windows/cross-platform TTF files
FONT_MAP: Dict[str, Dict[str, List[str]]] = {
    "Arial": {
        "regular": ["arial.ttf", "LiberationSans-Regular.ttf", "DejaVuSans.ttf"],
        "bold": ["arialbd.ttf", "LiberationSans-Bold.ttf", "DejaVuSans-Bold.ttf"],
        "italic": ["ariali.ttf", "LiberationSans-Italic.ttf", "DejaVuSans-Oblique.ttf"],
        "bold_italic": ["arialbi.ttf", "LiberationSans-BoldItalic.ttf", "DejaVuSans-BoldOblique.ttf"],
    },
    "Impact": {
        "regular": ["impact.ttf", "arialbd.ttf"],
        "bold": ["impact.ttf", "arialbd.ttf"],
        "italic": ["impact.ttf", "arialbi.ttf"],
        "bold_italic": ["impact.ttf", "arialbi.ttf"],
    },
    "Georgia": {
        "regular": ["georgia.ttf", "times.ttf"],
        "bold": ["georgiab.ttf", "timesbd.ttf"],
        "italic": ["georgiai.ttf", "timesi.ttf"],
        "bold_italic": ["Georgiaz.ttf", "georgiabi.ttf", "timesbi.ttf"],
    },
    "Times New Roman": {
        "regular": ["times.ttf", "DejaVuSerif.ttf"],
        "bold": ["timesbd.ttf", "DejaVuSerif-Bold.ttf"],
        "italic": ["timesi.ttf", "DejaVuSerif-Italic.ttf"],
        "bold_italic": ["timesbi.ttf", "DejaVuSerif-BoldItalic.ttf"],
    },
    "Verdana": {
        "regular": ["verdana.ttf", "arial.ttf"],
        "bold": ["verdanab.ttf", "arialbd.ttf"],
        "italic": ["verdanai.ttf", "ariali.ttf"],
        "bold_italic": ["verdanaz.ttf", "arialbi.ttf"],
    },
    "Trebuchet MS": {
        "regular": ["trebuc.ttf", "arial.ttf"],
        "bold": ["trebucbd.ttf", "arialbd.ttf"],
        "italic": ["trebucit.ttf", "ariali.ttf"],
        "bold_italic": ["trebucbi.ttf", "arialbi.ttf"],
    },
    "Tahoma": {
        "regular": ["tahoma.ttf", "arial.ttf"],
        "bold": ["tahomabd.ttf", "arialbd.ttf"],
        "italic": ["tahoma.ttf", "ariali.ttf"],
        "bold_italic": ["tahomabd.ttf", "arialbi.ttf"],
    },
    "Segoe UI": {
        "regular": ["segoeui.ttf", "arial.ttf"],
        "bold": ["segoeuib.ttf", "arialbd.ttf"],
        "italic": ["segoeuii.ttf", "ariali.ttf"],
        "bold_italic": ["segoeuiz.ttf", "arialbi.ttf"],
    },
    "Calibri": {
        "regular": ["calibri.ttf", "arial.ttf"],
        "bold": ["calibrib.ttf", "arialbd.ttf"],
        "italic": ["calibrii.ttf", "ariali.ttf"],
        "bold_italic": ["calibriz.ttf", "arialbi.ttf"],
    },
    "Courier New": {
        "regular": ["cour.ttf", "DejaVuSansMono.ttf"],
        "bold": ["courbd.ttf", "DejaVuSansMono-Bold.ttf"],
        "italic": ["couri.ttf", "DejaVuSansMono-Oblique.ttf"],
        "bold_italic": ["courbi.ttf", "DejaVuSansMono-BoldOblique.ttf"],
    },
}

# Cache discovered system font family -> style -> Path
_DISCOVERED_FONTS_CACHE: Optional[Dict[str, Dict[str, Path]]] = None


def _search_dirs() -> List[Path]:
    dirs = [CUSTOM_FONTS_DIR, WIN_FONTS_DIR, LOCAL_USER_FONTS_DIR] + LINUX_FONTS_DIRS
    return [d for d in dirs if d.exists()]


def _classify_style(style_name: str) -> str:
    s = style_name.lower()
    is_bold = any(k in s for k in ("bold", "black", "heavy", "semibold", "demi"))
    is_italic = any(k in s for k in ("italic", "oblique"))
    if is_bold and is_italic:
        return "bold_italic"
    if is_bold:
        return "bold"
    if is_italic:
        return "italic"
    return "regular"


def _scan_installed_fonts() -> Dict[str, Dict[str, Path]]:
    global _DISCOVERED_FONTS_CACHE
    if _DISCOVERED_FONTS_CACHE is not None:
        return _DISCOVERED_FONTS_CACHE

    catalog: Dict[str, Dict[str, Path]] = {}

    for root in _search_dirs():
        try:
            font_files = list(root.glob("*.ttf")) + list(root.glob("*.otf"))
        except Exception:
            continue

        for fp in font_files:
            # Skip symbol/dingbat internal system fonts
            low_name = fp.name.lower()
            if low_name in ("marlett.ttf", "webdings.ttf", "wingding.ttf", "symbol.ttf", "holomdl2.ttf", "segmdl2.ttf"):
                continue
            try:
                pil_f = ImageFont.truetype(str(fp), size=16)
                family, style = pil_f.getname()
                if not family or family.startswith(".") or family.startswith("@"):
                    continue
                family = family.strip()
                style_key = _classify_style(style or "Regular")
                if family not in catalog:
                    catalog[family] = {}
                # Prefer keeping the first discovered regular/bold/italic match
                if style_key not in catalog[family]:
                    catalog[family][style_key] = fp
                if "regular" not in catalog[family]:
                    catalog[family]["regular"] = fp
            except Exception:
                continue

    _DISCOVERED_FONTS_CACHE = catalog
    return catalog


def invalidate_font_cache() -> None:
    global _DISCOVERED_FONTS_CACHE
    _DISCOVERED_FONTS_CACHE = None


def get_available_fonts() -> List[str]:
    catalog = _scan_installed_fonts()
    names = set(FONT_MAP.keys()) | set(catalog.keys())
    if CUSTOM_FONTS_DIR.exists():
        for f in CUSTOM_FONTS_DIR.glob("*.[to]tf"):
            names.add(f.stem)
    return sorted(names, key=lambda x: x.lower())


def get_custom_font_files() -> List[Dict[str, str]]:
    """Returns custom uploaded .ttf/.otf font files so frontend can load them via @font-face."""
    items: List[Dict[str, str]] = []
    if not CUSTOM_FONTS_DIR.exists():
        return items
    for fp in sorted(CUSTOM_FONTS_DIR.iterdir()):
        if fp.suffix.lower() in (".ttf", ".otf"):
            family_name = fp.stem
            try:
                pil_f = ImageFont.truetype(str(fp), size=16)
                fam, _ = pil_f.getname()
                if fam:
                    family_name = fam.strip()
            except Exception:
                pass
            items.append(
                {
                    "family": family_name,
                    "filename": fp.name,
                    "url": f"/custom_fonts/{fp.name}",
                }
            )
    return items


def resolve_font_path(font_family: str, bold: bool = False, italic: bool = False) -> Optional[Path]:
    if bold and italic:
        style_key = "bold_italic"
    elif bold:
        style_key = "bold"
    elif italic:
        style_key = "italic"
    else:
        style_key = "regular"

    # 1. Check direct custom font file match
    for ext in (".ttf", ".otf"):
        direct = CUSTOM_FONTS_DIR / f"{font_family}{ext}"
        if direct.exists():
            return direct

    # 2. Check dynamically scanned system & custom fonts catalog
    catalog = _scan_installed_fonts()
    # Case-insensitive lookup in catalog
    matched_entry = catalog.get(font_family)
    if not matched_entry:
        low_target = font_family.lower()
        for k, v in catalog.items():
            if k.lower() == low_target:
                matched_entry = v
                break

    if matched_entry:
        if style_key in matched_entry and matched_entry[style_key].exists():
            return matched_entry[style_key]
        if "regular" in matched_entry and matched_entry["regular"].exists():
            return matched_entry["regular"]
        for any_path in matched_entry.values():
            if any_path.exists():
                return any_path

    # 3. Fallback to curated FONT_MAP
    family_entry = FONT_MAP.get(font_family, FONT_MAP["Arial"])
    candidates = family_entry.get(style_key, []) + family_entry.get("regular", []) + ["arial.ttf"]
    search_roots = _search_dirs()

    for filename in candidates:
        for root in search_roots:
            candidate_path = root / filename
            if candidate_path.exists():
                return candidate_path
            lower_map = {p.name.lower(): p for p in root.glob("*.ttf")}
            if filename.lower() in lower_map:
                return lower_map[filename.lower()]
    return None


def load_pil_font(font_family: str, size_px: int, bold: bool = False, italic: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    size_px = max(6, int(round(size_px)))
    font_path = resolve_font_path(font_family, bold=bold, italic=italic)
    if font_path and font_path.exists():
        try:
            return ImageFont.truetype(str(font_path), size=size_px)
        except Exception:
            pass
    try:
        return ImageFont.load_default(size=size_px)
    except Exception:
        return ImageFont.load_default()
