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


def get_available_fonts() -> List[str]:
    base = list(FONT_MAP.keys())
    if CUSTOM_FONTS_DIR.exists():
        for ttf in sorted(CUSTOM_FONTS_DIR.glob("*.ttf")):
            if ttf.stem not in base:
                base.append(ttf.stem)
    return base


def _search_dirs() -> List[Path]:
    dirs = [CUSTOM_FONTS_DIR, WIN_FONTS_DIR, LOCAL_USER_FONTS_DIR] + LINUX_FONTS_DIRS
    return [d for d in dirs if d.exists()]


def resolve_font_path(font_family: str, bold: bool = False, italic: bool = False) -> Optional[Path]:
    # Check if custom font file matches directly
    custom_direct = CUSTOM_FONTS_DIR / f"{font_family}.ttf"
    if custom_direct.exists():
        return custom_direct

    family_entry = FONT_MAP.get(font_family, FONT_MAP["Arial"])
    if bold and italic:
        style_key = "bold_italic"
    elif bold:
        style_key = "bold"
    elif italic:
        style_key = "italic"
    else:
        style_key = "regular"

    candidates = family_entry.get(style_key, []) + family_entry.get("regular", []) + ["arial.ttf"]
    search_roots = _search_dirs()

    for filename in candidates:
        for root in search_roots:
            candidate_path = root / filename
            if candidate_path.exists():
                return candidate_path
            # Case-insensitive fallback in directory
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
