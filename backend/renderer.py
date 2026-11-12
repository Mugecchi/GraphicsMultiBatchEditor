import math
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from PIL import Image, ImageDraw, ImageFilter, ImageFont

from database import STORAGE_DIR
from fonts import load_pil_font


def parse_hex_color(hex_str: str, opacity: float = 1.0) -> Tuple[int, int, int, int]:
    if not hex_str:
        return (255, 255, 255, int(255 * opacity))
    clean = hex_str.strip().lstrip("#")
    if len(clean) == 3:
        clean = "".join([c * 2 for c in clean])
    if len(clean) >= 6:
        try:
            r = int(clean[0:2], 16)
            g = int(clean[2:4], 16)
            b = int(clean[4:6], 16)
            a = int(round(max(0.0, min(1.0, opacity)) * 255))
            return (r, g, b, a)
        except ValueError:
            pass
    return (255, 255, 255, int(255 * opacity))


def resolve_text_binding(
    raw_text: str,
    binding: Optional[str],
    event: Optional[Dict[str, Any]],
) -> str:
    """Resolves {{event.field}} placeholders and direct binding attributes."""
    text = raw_text or ""
    if binding and binding.strip() and "{{" in binding:
        # If the element has an explicit binding token and raw_text doesn't include tokens, use binding or replace
        if "{{" not in text:
            text = binding

    if not event:
        return text

    custom_fields = event.get("custom_fields") or {}
    replacements = {
        "event.name": str(event.get("name") or ""),
        "event.title": str(event.get("title") or ""),
        "event.subtitle": str(event.get("subtitle") or ""),
        "event.venue": str(event.get("venue") or ""),
        "event.address": str(event.get("address") or ""),
        "event.date": str(event.get("date") or ""),
    }
    for k, v in custom_fields.items():
        replacements[f"event.custom.{k}"] = str(v or "")
        replacements[f"event.{k}"] = str(v or "")

    has_any_token = bool(re.search(r"\{\{\s*[a-zA-Z0-9_.-]+\s*\}\}", text))
    any_token_non_empty = False

    def repl(match: re.Match) -> str:
        nonlocal any_token_non_empty
        key = match.group(1).strip()
        if key in replacements:
            val = replacements[key]
            if val and val.strip():
                any_token_non_empty = True
            return val
        if key.startswith("event.custom.") or key.startswith("event."):
            return ""
        return ""

    resolved = re.sub(r"\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}", repl, text)
    if has_any_token and not any_token_non_empty:
        return ""
    return resolved


def compute_logo_group_layout(
    box_x: float,
    box_y: float,
    box_w: float,
    box_h: float,
    logos: List[Dict[str, Any]],
    group_props: Dict[str, Any],
) -> List[Dict[str, Any]]:
    """
    Deterministic logo group layout algorithm shared between Frontend and Backend.
    Inputs:
      box_x, box_y, box_w, box_h: Pixel coordinates of the logo_group bounding box.
      logos: List of visible logo items with natural_width, natural_height, aspect_ratio.
      group_props: LogoGroupProps dictionary.
    Returns:
      List of positioned logo items with pixel {x, y, width, height, item}.
    """
    visible_logos = [lg for lg in logos if lg.get("visible", True)]
    count = len(visible_logos)
    if count == 0 or box_w <= 2 or box_h <= 2:
        return []

    arrangement = group_props.get("arrangement", "horizontal")
    margin_pct = float(group_props.get("margin", 1.0))
    margin_x = box_w * (margin_pct / 100.0)
    margin_y = box_h * (margin_pct / 100.0)

    inner_x = box_x + margin_x
    inner_y = box_y + margin_y
    inner_w = max(4.0, box_w - 2.0 * margin_x)
    inner_h = max(4.0, box_h - 2.0 * margin_y)

    max_logo_h_pct = max(5.0, min(100.0, float(group_props.get("max_logo_height", 85.0))))
    max_logo_w_pct = max(5.0, min(100.0, float(group_props.get("max_logo_width", 45.0))))
    h_space_pct = max(0.0, min(30.0, float(group_props.get("horizontal_spacing", 2.5))))
    v_space_pct = max(0.0, min(30.0, float(group_props.get("vertical_spacing", 4.0))))
    max_per_row = max(1, int(group_props.get("max_logos_per_row", 6)))
    h_align = group_props.get("alignment", "center")
    v_align = group_props.get("vertical_alignment", "middle")
    optical_balance = bool(group_props.get("optical_balance", False) or arrangement == "auto")

    gap_x = inner_w * (h_space_pct / 100.0)

    def _effective_ar(item: Dict[str, Any]) -> float:
        ar = float(item.get("aspect_ratio") or 1.0)
        if ar <= 0.01:
            nw = float(item.get("natural_width") or 100)
            nh = float(item.get("natural_height") or 100)
            ar = nw / max(1.0, nh)
        return max(0.1, min(12.0, ar))

    # Determine rows based on arrangement mode + smart overflow wrapping
    rows: List[List[Dict[str, Any]]] = []
    if arrangement == "grid" or (count > max_per_row and arrangement not in ("horizontal", "space-between", "space-around")):
        cols = min(count, max_per_row)
        for i in range(0, count, cols):
            rows.append(visible_logos[i : i + cols])
    else:
        # Check if a single row would become unreadably small or overflow when box_h allows wrapping
        base_single_h = inner_h * (max_logo_h_pct / 100.0)
        permitted_single_w = inner_w * (max_logo_w_pct / 100.0)
        est_total_w = 0.0
        for item in visible_logos:
            ar = _effective_ar(item)
            opt_factor = (1.0 / (ar ** 0.32)) if optical_balance else 1.0
            opt_factor = max(0.55, min(1.30, opt_factor))
            bh = base_single_h * opt_factor
            bw = min(permitted_single_w, bh * ar)
            est_total_w += bw * float(item.get("scale_override") or 1.0) * float(item.get("width_scale") or 1.0)
        est_total_w += gap_x * max(0, count - 1)

        # Auto-wrap into balanced rows if arrangement == 'auto' or if single row shrinks below 42% of target height
        should_wrap = False
        if count > max_per_row:
            should_wrap = True
        elif arrangement == "auto" and count >= 4 and est_total_w > inner_w * 1.35:
            should_wrap = True
        elif count >= 5 and est_total_w > inner_w * 2.35 and inner_h >= 60.0:
            should_wrap = True

        if should_wrap:
            # Split into balanced rows (e.g. 7 logos -> 4 + 3 instead of 6 + 1)
            est_rows = max(2, int((est_total_w / max(1.0, inner_w * 1.15)) + 0.999))
            if count > max_per_row:
                est_rows = max(est_rows, (count + max_per_row - 1) // max_per_row)
            est_rows = min(count, max(2, min(4, est_rows)))
            base_per_row = count // est_rows
            rem = count % est_rows
            idx_cursor = 0
            for r_idx in range(est_rows):
                take = base_per_row + (1 if r_idx < rem else 0)
                if take > 0:
                    rows.append(visible_logos[idx_cursor : idx_cursor + take])
                    idx_cursor += take
        else:
            rows = [visible_logos]

    num_rows = len(rows)
    gap_y = inner_h * (v_space_pct / 100.0) if num_rows > 1 else 0.0

    total_v_gaps = gap_y * (num_rows - 1)
    avail_row_h = max(4.0, (inner_h - total_v_gaps) / num_rows)
    permitted_h = min(avail_row_h, inner_h * (max_logo_h_pct / 100.0))
    permitted_w = inner_w * (max_logo_w_pct / 100.0)

    row_layouts: List[Dict[str, Any]] = []
    for row_items in rows:
        n_row = len(row_items)
        # Step 1: Size each logo to permitted_h while respecting permitted_w, optical balance, and natural aspect ratio
        sized_items: List[Dict[str, Any]] = []
        for item in row_items:
            ar = _effective_ar(item)
            scale_mult = float(item.get("scale_override") or 1.0)
            w_scale = float(item.get("width_scale") or 1.0)
            h_scale = float(item.get("height_scale") or 1.0)

            opt_factor = (1.0 / (ar ** 0.32)) if optical_balance else 1.0
            opt_factor = max(0.55, min(1.30, opt_factor))

            base_h = permitted_h * opt_factor
            base_w = base_h * ar
            if base_w > permitted_w:
                base_w = permitted_w
                base_h = base_w / ar

            h = max(4.0, base_h * scale_mult * h_scale)
            w = max(4.0, base_w * scale_mult * w_scale)

            # Never let a single oversized logo exceed inner_w or avail_row_h
            if w > inner_w:
                clamp_s = inner_w / w
                w *= clamp_s
                h *= clamp_s
            if h > avail_row_h:
                clamp_s = avail_row_h / h
                w *= clamp_s
                h *= clamp_s

            sized_items.append({"item": item, "w": w, "h": h, "ar": ar})

        # Step 2: Check if total width + gaps exceeds inner_w; if so, proportionally scale down both logos AND gaps
        min_gap = gap_x
        total_logos_w = sum(x["w"] for x in sized_items)
        total_gaps_w = min_gap * max(0, n_row - 1)
        row_step_gap = min_gap

        if total_logos_w + total_gaps_w > inner_w and total_logos_w > 0:
            # If gaps alone take more than 25% of inner_w, compress gap first so logos stay larger and never overflow right
            max_allowed_gaps_w = inner_w * 0.22
            if total_gaps_w > max_allowed_gaps_w and n_row > 1:
                row_step_gap = max_allowed_gaps_w / (n_row - 1)
                total_gaps_w = row_step_gap * (n_row - 1)

            avail_for_logos = max(2.0 * n_row, inner_w - total_gaps_w)
            shrink_factor = avail_for_logos / total_logos_w
            for x in sized_items:
                x["w"] *= shrink_factor
                x["h"] *= shrink_factor
            total_logos_w = sum(x["w"] for x in sized_items)

        row_h = max((x["h"] for x in sized_items), default=permitted_h)
        row_layouts.append(
            {
                "items": sized_items,
                "total_logos_w": total_logos_w,
                "row_h": row_h,
                "step_gap": row_step_gap,
            }
        )

    # Step 3: Ensure total vertical height never overflows inner_h
    total_content_h = sum(r["row_h"] for r in row_layouts) + gap_y * max(0, num_rows - 1)
    if total_content_h > inner_h and total_content_h > 0:
        v_shrink = inner_h / total_content_h
        gap_y *= v_shrink
        for r_info in row_layouts:
            r_info["row_h"] *= v_shrink
            for x in r_info["items"]:
                x["w"] *= v_shrink
                x["h"] *= v_shrink
            r_info["total_logos_w"] = sum(x["w"] for x in r_info["items"])
        total_content_h = sum(r["row_h"] for r in row_layouts) + gap_y * max(0, num_rows - 1)

    if v_align == "top":
        curr_y = inner_y
    elif v_align == "bottom":
        curr_y = inner_y + max(0.0, inner_h - total_content_h)
    else:
        curr_y = inner_y + (inner_h - total_content_h) / 2.0

    results: List[Dict[str, Any]] = []
    for r_info in row_layouts:
        sized_items = r_info["items"]
        n_row = len(sized_items)
        total_logos_w = r_info["total_logos_w"]
        row_h = r_info["row_h"]
        base_step_gap = r_info["step_gap"]

        if arrangement == "space-between" and n_row > 1:
            dynamic_gap = max(0.0, (inner_w - total_logos_w) / (n_row - 1))
            curr_x = inner_x
            step_gap = dynamic_gap
        elif arrangement == "space-around" and n_row >= 1:
            rem = max(0.0, inner_w - total_logos_w)
            unit_space = rem / (n_row * 2.0)
            curr_x = inner_x + unit_space
            step_gap = unit_space * 2.0
        else:
            # auto, horizontal, centered, or grid
            step_gap = base_step_gap
            row_total_w = total_logos_w + step_gap * max(0, n_row - 1)
            if row_total_w > inner_w and n_row > 1:
                step_gap = max(0.0, (inner_w - total_logos_w) / (n_row - 1))
                row_total_w = total_logos_w + step_gap * (n_row - 1)
            if arrangement in ("centered", "auto") or h_align == "center":
                curr_x = inner_x + max(0.0, (inner_w - row_total_w) / 2.0)
            elif h_align == "right":
                curr_x = inner_x + max(0.0, inner_w - row_total_w)
            else:
                curr_x = inner_x

        for entry in sized_items:
            w = entry["w"]
            h = entry["h"]
            # Vertically center each logo within its row
            item_y = curr_y + (row_h - h) / 2.0
            results.append(
                {
                    "id": entry["item"].get("id"),
                    "asset_id": entry["item"].get("asset_id"),
                    "name": entry["item"].get("name", "Logo"),
                    "url": entry["item"].get("url", ""),
                    "relative_path": entry["item"].get("relative_path", ""),
                    "x": curr_x,
                    "y": item_y,
                    "width": w,
                    "height": h,
                }
            )
            curr_x += w + step_gap

        curr_y += row_h + gap_y

    return results


def wrap_text_lines(
    draw: ImageDraw.ImageDraw,
    text: str,
    font: ImageFont.FreeTypeFont | ImageFont.ImageFont,
    max_width: float,
    wrap_enabled: bool,
    letter_spacing: float = 0.0,
) -> List[str]:
    if not text:
        return [""]
    paragraphs = text.splitlines() or [""]
    if not wrap_enabled or max_width <= 10:
        return paragraphs

    lines: List[str] = []
    for para in paragraphs:
        words = para.split(" ")
        if not words:
            lines.append("")
            continue
        current_line = words[0]
        for word in words[1:]:
            candidate = f"{current_line} {word}"
            bbox = draw.textbbox((0, 0), candidate, font=font)
            w = (bbox[2] - bbox[0]) + max(0, len(candidate) - 1) * letter_spacing
            if w <= max_width:
                current_line = candidate
            else:
                lines.append(current_line)
                current_line = word
        lines.append(current_line)
    return lines


def measure_multiline(
    draw: ImageDraw.ImageDraw,
    lines: List[str],
    font: ImageFont.FreeTypeFont | ImageFont.ImageFont,
    line_height_mult: float,
    font_size_px: float,
    letter_spacing: float = 0.0,
) -> Tuple[float, float, List[float]]:
    line_widths: List[float] = []
    for ln in lines:
        if not ln:
            line_widths.append(0.0)
        else:
            bbox = draw.textbbox((0, 0), ln, font=font)
            w = (bbox[2] - bbox[0]) + max(0, len(ln) - 1) * letter_spacing
            line_widths.append(float(w))
    line_step = font_size_px * max(0.8, line_height_mult)
    total_h = line_step * len(lines)
    max_w = max(line_widths, default=0.0)
    return max_w, total_h, line_widths


def render_text_element_onto_canvas(
    base_img: Image.Image,
    el: Dict[str, Any],
    event: Optional[Dict[str, Any]],
    scale_x: float,
    scale_y: float,
) -> None:
    tp = dict(el.get("text_props") or {})
    override = (event.get("element_overrides") or {}).get(el["id"], {}) if event else {}

    box_x_pct = float(override.get("x") if override.get("x") is not None else el.get("x", 10.0))
    box_y_pct = float(override.get("y") if override.get("y") is not None else el.get("y", 10.0))
    box_w_pct = float(override.get("width") if override.get("width") is not None else el.get("width", 80.0))
    box_h_pct = float(override.get("height") if override.get("height") is not None else el.get("height", 15.0))

    canvas_w, canvas_h = base_img.size
    box_x = (box_x_pct / 100.0) * canvas_w
    box_y = (box_y_pct / 100.0) * canvas_h
    box_w = max(4.0, (box_w_pct / 100.0) * canvas_w)
    box_h = max(4.0, (box_h_pct / 100.0) * canvas_h)

    raw_content = override.get("text_content") if override.get("text_content") is not None else tp.get("content", "")
    resolved_text = resolve_text_binding(raw_content, tp.get("binding"), event)
    if not resolved_text.strip():
        return

    font_family = tp.get("font_family", "Arial")
    base_font_size = float(override.get("font_size") if override.get("font_size") is not None else tp.get("font_size", 48.0))
    font_size_px = max(8.0, base_font_size * scale_y)
    bold = bool(tp.get("bold", True))
    italic = bool(tp.get("italic", False))
    underline = bool(tp.get("underline", False))
    color_hex = override.get("color") or tp.get("color", "#FFFFFF")
    align = tp.get("align", "center")
    v_align = tp.get("vertical_align", "middle")
    line_height = float(tp.get("line_height", 1.2))
    letter_spacing = float(tp.get("letter_spacing", 0.0)) * scale_x
    wrap_enabled = bool(tp.get("wrap", True))
    auto_fit = bool(tp.get("auto_fit", True))

    layer = Image.new("RGBA", (int(math.ceil(box_w)), int(math.ceil(box_h))), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)

    curr_size = font_size_px
    font = load_pil_font(font_family, int(round(curr_size)), bold=bold, italic=italic)
    lines = wrap_text_lines(draw, resolved_text, font, box_w, wrap_enabled, letter_spacing)
    max_w, total_h, line_widths = measure_multiline(draw, lines, font, line_height, curr_size, letter_spacing)

    if auto_fit:
        while (max_w > box_w * 0.98 or total_h > box_h * 0.98) and curr_size > 10:
            curr_size = max(10.0, curr_size * 0.92)
            font = load_pil_font(font_family, int(round(curr_size)), bold=bold, italic=italic)
            lines = wrap_text_lines(draw, resolved_text, font, box_w, wrap_enabled, letter_spacing)
            max_w, total_h, line_widths = measure_multiline(draw, lines, font, line_height, curr_size, letter_spacing)

    line_step = curr_size * max(0.8, line_height)
    if v_align == "top":
        start_y = 0.0
    elif v_align == "bottom":
        start_y = max(0.0, box_h - total_h)
    else:
        start_y = (box_h - total_h) / 2.0

    fill_rgba = parse_hex_color(color_hex, 1.0)
    outline_enabled = bool(tp.get("outline_enabled", False))
    outline_width = int(round(float(tp.get("outline_width", 2.0)) * scale_y)) if outline_enabled else 0
    outline_rgba = parse_hex_color(tp.get("outline_color", "#000000"), 1.0)

    shadow_enabled = bool(tp.get("shadow_enabled", False))
    shadow_rgba = parse_hex_color(tp.get("shadow_color", "#000000"), 0.75)
    shadow_ox = float(tp.get("shadow_offset_x", 2.0)) * scale_x
    shadow_oy = float(tp.get("shadow_offset_y", 2.0)) * scale_y

    for idx, ln in enumerate(lines):
        lw = line_widths[idx]
        if align == "left":
            lx = 0.0
        elif align == "right":
            lx = box_w - lw
        else:
            lx = (box_w - lw) / 2.0
        ly = start_y + idx * line_step

        if shadow_enabled:
            draw.text(
                (lx + shadow_ox, ly + shadow_oy),
                ln,
                font=font,
                fill=shadow_rgba,
            )

        draw.text(
            (lx, ly),
            ln,
            font=font,
            fill=fill_rgba,
            stroke_width=outline_width,
            stroke_fill=outline_rgba if outline_width > 0 else None,
        )

        if underline and lw > 0:
            uy = ly + curr_size * 1.05
            draw.line(
                [(lx, uy), (lx + lw, uy)],
                fill=fill_rgba,
                width=max(1, int(round(curr_size * 0.06))),
            )

    rotation = float(el.get("rotation", 0.0))
    if abs(rotation) > 0.1:
        layer = layer.rotate(-rotation, expand=True, resample=Image.Resampling.BICUBIC)

    base_img.alpha_composite(layer, (int(round(box_x)), int(round(box_y))))


def open_logo_image(relative_path: str, crop_transparent: bool = True) -> Optional[Image.Image]:
    if not relative_path:
        return None
    full_path = STORAGE_DIR / relative_path
    if not full_path.exists():
        return None
    try:
        img = Image.open(full_path)
        rgba = img.convert("RGBA")
        if crop_transparent:
            orig_w, orig_h = rgba.size
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
        return rgba
    except Exception:
        return None


def apply_opacity(img: Image.Image, opacity: float) -> Image.Image:
    if opacity >= 0.999:
        return img
    opacity = max(0.0, min(1.0, opacity))
    r, g, b, a = img.split()
    a = a.point(lambda p: int(round(p * opacity)))
    return Image.merge("RGBA", (r, g, b, a))


def render_single_logo_element(
    base_img: Image.Image,
    el: Dict[str, Any],
    event: Optional[Dict[str, Any]],
) -> None:
    lp = dict(el.get("logo_props") or {})
    override = (event.get("element_overrides") or {}).get(el["id"], {}) if event else {}

    rel_path = lp.get("relative_path", "")
    logo_img = open_logo_image(rel_path)
    if logo_img is None:
        return

    canvas_w, canvas_h = base_img.size
    box_x_pct = float(override.get("x") if override.get("x") is not None else el.get("x", 10.0))
    box_y_pct = float(override.get("y") if override.get("y") is not None else el.get("y", 10.0))
    box_w_pct = float(override.get("width") if override.get("width") is not None else el.get("width", 15.0))
    box_h_pct = float(override.get("height") if override.get("height") is not None else el.get("height", 15.0))

    box_x = (box_x_pct / 100.0) * canvas_w
    box_y = (box_y_pct / 100.0) * canvas_h
    box_w = max(2.0, (box_w_pct / 100.0) * canvas_w)
    box_h = max(2.0, (box_h_pct / 100.0) * canvas_h)

    margin_pct = float(lp.get("margin", 0.0))
    pad_x = box_w * (margin_pct / 100.0)
    pad_y = box_h * (margin_pct / 100.0)
    avail_w = max(2.0, box_w - 2 * pad_x)
    avail_h = max(2.0, box_h - 2 * pad_y)

    nw, nh = logo_img.size
    ar = nw / max(1.0, float(nh))
    preserve = bool(lp.get("preserve_aspect_ratio", True))
    fit_mode = lp.get("fit_mode", "contain")

    if not preserve or fit_mode == "fill":
        target_w = int(round(avail_w))
        target_h = int(round(avail_h))
    else:
        # Contain without stretching or cropping
        if avail_w / avail_h > ar:
            target_h = int(round(avail_h))
            target_w = max(1, int(round(target_h * ar)))
        else:
            target_w = int(round(avail_w))
            target_h = max(1, int(round(target_w / ar)))

    resized = logo_img.resize((max(1, target_w), max(1, target_h)), Image.Resampling.LANCZOS)
    opacity = float(lp.get("opacity", 1.0))
    resized = apply_opacity(resized, opacity)

    h_align = lp.get("horizontal_align", "center")
    v_align = lp.get("vertical_align", "middle")

    if h_align == "left":
        dest_x = box_x + pad_x
    elif h_align == "right":
        dest_x = box_x + box_w - pad_x - target_w
    else:
        dest_x = box_x + (box_w - target_w) / 2.0

    if v_align == "top":
        dest_y = box_y + pad_y
    elif v_align == "bottom":
        dest_y = box_y + box_h - pad_y - target_h
    else:
        dest_y = box_y + (box_h - target_h) / 2.0

    rotation = float(el.get("rotation", 0.0))
    if abs(rotation) > 0.1:
        resized = resized.rotate(-rotation, expand=True, resample=Image.Resampling.BICUBIC)

    # Safe composite handling negative coordinates if rotated/near edge
    layer = Image.new("RGBA", base_img.size, (0, 0, 0, 0))
    layer.paste(resized, (int(round(dest_x)), int(round(dest_y))))
    base_img.alpha_composite(layer)


def render_logo_group_element(
    base_img: Image.Image,
    el: Dict[str, Any],
    event: Optional[Dict[str, Any]],
) -> None:
    gp = dict(el.get("logo_group_props") or {})
    override = (event.get("element_overrides") or {}).get(el["id"], {}) if event else {}

    canvas_w, canvas_h = base_img.size
    box_x_pct = float(override.get("x") if override.get("x") is not None else el.get("x", 10.0))
    box_y_pct = float(override.get("y") if override.get("y") is not None else el.get("y", 5.0))
    box_w_pct = float(override.get("width") if override.get("width") is not None else el.get("width", 80.0))
    box_h_pct = float(override.get("height") if override.get("height") is not None else el.get("height", 12.0))

    box_x = (box_x_pct / 100.0) * canvas_w
    box_y = (box_y_pct / 100.0) * canvas_h
    box_w = max(4.0, (box_w_pct / 100.0) * canvas_w)
    box_h = max(4.0, (box_h_pct / 100.0) * canvas_h)

    logos = list(gp.get("logos") or [])
    # If event defines its own logos or override specifies logo_ids
    if event and event.get("logos"):
        # Merge or use event-specific logos if present
        logos = list(event["logos"])
    if override.get("logo_ids") is not None:
        id_set = set(override["logo_ids"])
        logos = [lg for lg in logos if lg.get("id") in id_set or lg.get("asset_id") in id_set]

    if override.get("arrangement"):
        gp["arrangement"] = override["arrangement"]

    placements = compute_logo_group_layout(box_x, box_y, box_w, box_h, logos, gp)
    opacity = float(gp.get("opacity", 1.0))

    for pl in placements:
        logo_img = open_logo_image(pl.get("relative_path", ""))
        if logo_img is None:
            continue
        tw = max(1, int(round(pl["width"])))
        th = max(1, int(round(pl["height"])))
        resized = logo_img.resize((tw, th), Image.Resampling.LANCZOS)
        resized = apply_opacity(resized, opacity)

        px = int(round(pl["x"]))
        py = int(round(pl["y"]))
        # Composite onto base_img preserving full PNG alpha channel
        if 0 <= px and 0 <= py and px + tw <= canvas_w and py + th <= canvas_h:
            base_img.alpha_composite(resized, (px, py))
        else:
            temp = Image.new("RGBA", base_img.size, (0, 0, 0, 0))
            temp.paste(resized, (px, py))
            base_img.alpha_composite(temp)


def render_tarpaulin_image(
    project: Dict[str, Any],
    event_id: Optional[str] = None,
    custom_width: Optional[int] = None,
    custom_height: Optional[int] = None,
    preserve_aspect_ratio: bool = True,
) -> Image.Image:
    """
    Renders a completed tarpaulin at full template resolution (or requested custom dimensions).
    Guarantees that the original background template pixels remain 100% untouched outside added elements.
    """
    template_meta = project.get("template")
    if not template_meta or not template_meta.get("relative_path"):
        raise ValueError("Project does not have a valid template image uploaded.")

    template_path = STORAGE_DIR / template_meta["relative_path"]
    if not template_path.exists():
        raise FileNotFoundError(f"Template file missing on disk: {template_meta['relative_path']}")

    # Open fresh copy of the original template
    with Image.open(template_path) as raw_tpl:
        orig_w, orig_h = raw_tpl.size
        base_img = raw_tpl.convert("RGBA")

    # Find target event record
    events = project.get("events") or []
    target_event: Optional[Dict[str, Any]] = None
    if event_id:
        for ev in events:
            if ev.get("id") == event_id:
                target_event = ev
                break
    if target_event is None and events:
        active_id = project.get("active_event_id")
        for ev in events:
            if ev.get("id") == active_id:
                target_event = ev
                break
        if target_event is None:
            target_event = events[0]

    # Sort elements by z_index ascending so higher layers composite on top
    elements = list(project.get("elements") or [])
    elements.sort(key=lambda e: int(e.get("z_index", 0)))

    for el in elements:
        if not el.get("visible", True):
            continue
        el_id = el.get("id", "")
        if target_event:
            ev_vis = (target_event.get("element_visibility") or {}).get(el_id)
            if ev_vis is False:
                continue
            ov = (target_event.get("element_overrides") or {}).get(el_id, {})
            if ov.get("visible") is False:
                continue

        el_type = el.get("type")
        if el_type == "text":
            render_text_element_onto_canvas(base_img, el, target_event, 1.0, 1.0)
        elif el_type == "logo":
            render_single_logo_element(base_img, el, target_event)
        elif el_type == "logo_group":
            render_logo_group_element(base_img, el, target_event)

    # Apply optional custom output dimensions at the end if requested
    if custom_width or custom_height:
        ar = orig_w / max(1.0, float(orig_h))
        if preserve_aspect_ratio:
            if custom_width and not custom_height:
                out_w = int(custom_width)
                out_h = max(1, int(round(out_w / ar)))
            elif custom_height and not custom_width:
                out_h = int(custom_height)
                out_w = max(1, int(round(out_h * ar)))
            else:
                out_w = int(custom_width or orig_w)
                out_h = max(1, int(round(out_w / ar)))
        else:
            out_w = int(custom_width or orig_w)
            out_h = int(custom_height or orig_h)

        if (out_w, out_h) != (orig_w, orig_h):
            base_img = base_img.resize((out_w, out_h), Image.Resampling.LANCZOS)

    return base_img
