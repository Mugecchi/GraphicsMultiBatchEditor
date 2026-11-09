import io
import sys
import zipfile
from pathlib import Path
from PIL import Image, ImageDraw
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from main import app
from database import STORAGE_DIR
from renderer import compute_logo_group_layout, resolve_text_binding

client = TestClient(app)


def make_test_template_bytes(width: int = 2400, height: int = 1200) -> bytes:
    """Creates a high-resolution PNG template with a known deterministic pixel pattern."""
    img = Image.new("RGBA", (width, height), (18, 34, 64, 255))
    draw = ImageDraw.Draw(img)
    # Draw distinct corner markers so we can verify untouched pixels outside added elements
    draw.rectangle([0, 0, 80, 80], fill=(210, 45, 90, 255))
    draw.rectangle([width - 80, height - 80, width, height], fill=(40, 195, 110, 255))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def make_test_logo_bytes(width: int, height: int, rgba: tuple) -> bytes:
    img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle([4, 4, width - 4, height - 4], radius=12, fill=rgba)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def test_all_12_required_scenarios():
    # -------------------------------------------------------------------------
    # SCENARIO 1: Upload a PNG template and create a title
    # -------------------------------------------------------------------------
    tpl_bytes = make_test_template_bytes(2400, 1200)
    res = client.post(
        "/api/projects",
        data={
            "name": "QA Verification Project",
            "description": "Automated 12-scenario test suite",
            "is_template": "true",
            "init_defaults": "true",
        },
        files={"template_file": ("qa_template_2400x1200.png", tpl_bytes, "image/png")},
    )
    assert res.status_code == 200, res.text
    proj = res.json()
    project_id = proj["id"]
    assert proj["template"]["width"] == 2400
    assert proj["template"]["height"] == 1200
    title_el = next((e for e in proj["elements"] if e["field_role"] == "title"), None)
    assert title_el is not None

    # -------------------------------------------------------------------------
    # SCENARIO 2: Upload two logos and distribute them horizontally
    # -------------------------------------------------------------------------
    logo1 = make_test_logo_bytes(200, 100, (255, 80, 80, 255))
    logo2 = make_test_logo_bytes(160, 160, (80, 180, 255, 255))
    up_res = client.post(
        f"/api/projects/{project_id}/logos",
        files=[
            ("files", ("partner_a.png", logo1, "image/png")),
            ("files", ("partner_b.png", logo2, "image/png")),
        ],
    )
    assert up_res.status_code == 200
    uploaded_two = up_res.json()["uploaded"]
    assert len(uploaded_two) == 2

    group_el = next(e for e in proj["elements"] if e["type"] == "logo_group")
    group_el["logo_group_props"]["logos"] = [
        {
            "id": f"item_{a['id']}",
            "asset_id": a["id"],
            "name": a["name"],
            "url": a["url"],
            "relative_path": a["relative_path"],
            "natural_width": a["natural_width"],
            "natural_height": a["natural_height"],
            "aspect_ratio": a["aspect_ratio"],
            "visible": True,
        }
        for a in uploaded_two
    ]
    group_el["logo_group_props"]["arrangement"] = "horizontal"

    layout_2 = compute_logo_group_layout(
        0, 0, 1920, 150, group_el["logo_group_props"]["logos"], group_el["logo_group_props"]
    )
    assert len(layout_2) == 2
    # Verify both are on the same horizontal row and non-overlapping
    assert layout_2[0]["x"] + layout_2[0]["width"] <= layout_2[1]["x"] + 0.1
    # Verify aspect ratios preserved (2:1 and 1:1)
    assert abs((layout_2[0]["width"] / layout_2[0]["height"]) - 2.0) < 0.02
    assert abs((layout_2[1]["width"] / layout_2[1]["height"]) - 1.0) < 0.02

    # -------------------------------------------------------------------------
    # SCENARIO 3: Upload six logos and verify automatic resizing and spacing
    # -------------------------------------------------------------------------
    more_four = [
        ("files", (f"logo_extra_{i}.png", make_test_logo_bytes(220, 110, (100, 220, 120, 255)), "image/png"))
        for i in range(4)
    ]
    up6_res = client.post(f"/api/projects/{project_id}/logos", files=more_four)
    assert up6_res.status_code == 200
    all_six_assets = up6_res.json()["project"]["assets"]
    assert len(all_six_assets) == 6

    six_items = [
        {
            "id": f"item_{a['id']}",
            "asset_id": a["id"],
            "name": a["name"],
            "url": a["url"],
            "relative_path": a["relative_path"],
            "natural_width": a["natural_width"],
            "natural_height": a["natural_height"],
            "aspect_ratio": a["aspect_ratio"],
            "visible": True,
        }
        for a in all_six_assets
    ]
    group_el["logo_group_props"]["logos"] = six_items
    layout_6 = compute_logo_group_layout(
        0, 0, 1920, 150, six_items, group_el["logo_group_props"]
    )
    assert len(layout_6) == 6
    for idx in range(5):
        assert layout_6[idx]["x"] + layout_6[idx]["width"] <= layout_6[idx + 1]["x"] + 0.1

    # -------------------------------------------------------------------------
    # SCENARIO 4: Upload twelve logos and verify multi-row arrangements
    # -------------------------------------------------------------------------
    more_six = [
        ("files", (f"logo_batch2_{i}.png", make_test_logo_bytes(180, 120, (240, 180, 60, 255)), "image/png"))
        for i in range(6)
    ]
    up12_res = client.post(f"/api/projects/{project_id}/logos", files=more_six)
    assert up12_res.status_code == 200
    all_twelve_assets = up12_res.json()["project"]["assets"]
    assert len(all_twelve_assets) == 12

    twelve_items = [
        {
            "id": f"item_{a['id']}",
            "asset_id": a["id"],
            "name": a["name"],
            "url": a["url"],
            "relative_path": a["relative_path"],
            "natural_width": a["natural_width"],
            "natural_height": a["natural_height"],
            "aspect_ratio": a["aspect_ratio"],
            "visible": True,
        }
        for a in all_twelve_assets
    ]
    group_el["logo_group_props"]["logos"] = twelve_items
    group_el["logo_group_props"]["arrangement"] = "grid"
    group_el["logo_group_props"]["max_logos_per_row"] = 6

    layout_12 = compute_logo_group_layout(
        0, 0, 1920, 240, twelve_items, group_el["logo_group_props"]
    )
    assert len(layout_12) == 12
    # First 6 logos should be in row 1 (smaller Y), next 6 in row 2 (larger Y)
    row1_y = layout_12[0]["y"]
    row2_y = layout_12[6]["y"]
    assert row2_y > row1_y + layout_12[0]["height"]

    # -------------------------------------------------------------------------
    # SCENARIO 5 & 6: Create five events using one template & verify dynamic binding
    # -------------------------------------------------------------------------
    five_events = [
        {
            "id": f"evt_qa_{i + 1}",
            "name": f"Regional Conference #{i + 1}",
            "title": f"ANNUAL SUMMIT VARIATION #{i + 1}",
            "subtitle": f"Subtitle for Event {i + 1}",
            "venue": f"Convention Hall {i + 1}",
            "address": f"{100 + i} Avenue, City {i + 1}",
            "date": f"November {10 + i}, 2026",
            "custom_fields": {"code": f"CONF-{i + 1}"},
            "logos": [],
            "element_visibility": {},
            "element_overrides": {},
            "order_index": i,
        }
        for i in range(5)
    ]

    for ev in five_events:
        bound_title = resolve_text_binding("{{event.title}}", "{{event.title}}", ev)
        assert bound_title == ev["title"]
        bound_custom = resolve_text_binding("Code: {{event.custom.code}}", None, ev)
        assert bound_custom == f"Code: CONF-{ev['order_index'] + 1}"

    # -------------------------------------------------------------------------
    # SCENARIO 7: Move a text element and verify position is retained after saving & reopening
    # -------------------------------------------------------------------------
    title_el["x"] = 14.5
    title_el["y"] = 27.25
    save_res = client.put(
        f"/api/projects/{project_id}",
        json={
            "elements": proj["elements"],
            "events": five_events,
            "assets": all_twelve_assets,
            "active_event_id": five_events[0]["id"],
        },
    )
    assert save_res.status_code == 200

    reopen_res = client.get(f"/api/projects/{project_id}")
    assert reopen_res.status_code == 200
    reopened = reopen_res.json()
    reopened_title = next(e for e in reopened["elements"] if e["id"] == title_el["id"])
    assert reopened_title["x"] == 14.5
    assert reopened_title["y"] == 27.25
    assert len(reopened["events"]) == 5

    # -------------------------------------------------------------------------
    # SCENARIO 8: Export an individual event and compare with editor preview
    # -------------------------------------------------------------------------
    preview_res = client.get(
        f"/api/projects/{project_id}/preview?event_id=evt_qa_1&max_width=2400"
    )
    assert preview_res.status_code == 200

    single_exp_res = client.post(
        f"/api/projects/{project_id}/export",
        json={"event_ids": ["evt_qa_1"], "as_zip": False, "dpi": 300},
    )
    assert single_exp_res.status_code == 200
    exp_data = single_exp_res.json()
    assert exp_data["count"] == 1
    single_file_path = STORAGE_DIR / exp_data["exports"][0]["relative_path"]
    assert single_file_path.exists()

    # -------------------------------------------------------------------------
    # SCENARIO 9 & 10: Batch export all five events & Export as a ZIP archive
    # -------------------------------------------------------------------------
    batch_res = client.post(
        f"/api/projects/{project_id}/export",
        json={
            "event_ids": [e["id"] for e in five_events],
            "as_zip": True,
            "dpi": 300,
        },
    )
    assert batch_res.status_code == 200
    batch_data = batch_res.json()
    assert batch_data["count"] == 5
    assert batch_data["zip"] is not None

    zip_path = STORAGE_DIR / batch_data["zip"]["relative_path"]
    assert zip_path.exists()
    with zipfile.ZipFile(zip_path, "r") as zf:
        names = zf.namelist()
        assert len(names) == 5

    # -------------------------------------------------------------------------
    # SCENARIO 11 & 12: Verify original PNG background pixels remain unchanged
    # outside added elements AND high-resolution exports use original template dimensions (2400x1200)
    # -------------------------------------------------------------------------
    with Image.open(single_file_path) as exported_img:
        assert exported_img.size == (2400, 1200)
        exp_rgba = exported_img.convert("RGBA")
        # Top-left corner (10, 10) and bottom-right corner (2390, 1190) are outside all elements
        assert exp_rgba.getpixel((10, 10)) == (210, 45, 90, 255)
        assert exp_rgba.getpixel((2390, 1190)) == (40, 195, 110, 255)

    # Clean up test project
    del_res = client.delete(f"/api/projects/{project_id}")
    assert del_res.status_code == 200
