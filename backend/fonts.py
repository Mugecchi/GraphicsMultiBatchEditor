import os
from pathlib import Path
from typing import Dict, List, Optional
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

SKIP_FONT_FILES = {
    "marlett.ttf",
    "webdings.ttf",
    "wingding.ttf",
    "wingdng2.ttf",
    "wingdng3.ttf",
    "symbol.ttf",
    "holomdl2.ttf",
    "segmdl2.ttf",
    "segoeicons.ttf",
    "refspcl.ttf",
    "bookshelf symbol 7.ttf",
    "ms outlook.ttf",
    "mt extra.ttf",
}


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
            font_files: List[Path] = []
            for ext in ("*.ttf", "*.otf", "*.ttc", "*.TTF", "*.OTF", "*.TTC"):
                font_files.extend(root.glob(ext))
        except Exception:
            continue

        # Deduplicate paths on case-insensitive filesystems
        seen_paths = set()
        for fp in font_files:
            norm = str(fp).lower()
            if norm in seen_paths:
                continue
            seen_paths.add(norm)

            low_name = fp.name.lower()
            if low_name in SKIP_FONT_FILES:
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
        for f in CUSTOM_FONTS_DIR.iterdir():
            if f.suffix.lower() in (".ttf", ".otf", ".ttc"):
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
    if not font_family:
        font_family = "Arial"
    clean_family = font_family.strip().strip('"').strip("'")

    if bold and italic:
        style_key = "bold_italic"
    elif bold:
        style_key = "bold"
    elif italic:
        style_key = "italic"
    else:
        style_key = "regular"

    # 1. Check direct custom font file match
    for ext in (".ttf", ".otf", ".ttc"):
        direct = CUSTOM_FONTS_DIR / f"{clean_family}{ext}"
        if direct.exists():
            return direct

    # 2. Check dynamically scanned system & custom fonts catalog (exact, then case-insensitive, then prefix/substring)
    catalog = _scan_installed_fonts()
    matched_entry = catalog.get(clean_family)
    low_target = clean_family.lower()

    if not matched_entry:
        for k, v in catalog.items():
            if k.lower() == low_target:
                matched_entry = v
                break

    if not matched_entry:
        # Handle browser font names that include or omit weights like "Arial Black" or "Bahnschrift SemiBold"
        for k, v in catalog.items():
            kl = k.lower()
            if low_target.startswith(kl) or kl.startswith(low_target):
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
    family_entry = FONT_MAP.get(clean_family, FONT_MAP["Arial"])
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
