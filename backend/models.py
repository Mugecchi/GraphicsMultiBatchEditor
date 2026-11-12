from __future__ import annotations
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field


class LogoAsset(BaseModel):
    id: str
    name: str
    url: str
    relative_path: str
    natural_width: int
    natural_height: int
    aspect_ratio: float
    format: str = "PNG"


class LogoGroupItem(BaseModel):
    id: str
    asset_id: str
    name: str
    url: str
    relative_path: str
    natural_width: int
    natural_height: int
    aspect_ratio: float
    visible: bool = True
    scale_override: Optional[float] = None
    width_scale: Optional[float] = None
    height_scale: Optional[float] = None
    crop_transparent: bool = True


class TextStyle(BaseModel):
    content: str = "Sample Text"
    binding: Optional[str] = None  # e.g. "{{event.title}}", "{{event.venue}}"
    font_family: str = "Arial"
    font_size: float = 48.0  # Stored in reference template pixels (or scaled dynamically)
    font_weight: str = "bold"  # "normal" | "bold" | "600" | "800"
    bold: bool = True
    italic: bool = False
    underline: bool = False
    color: str = "#FFFFFF"
    align: Literal["left", "center", "right"] = "center"
    vertical_align: Literal["top", "middle", "bottom"] = "middle"
    line_height: float = 1.2
    letter_spacing: float = 0.0
    wrap: bool = True
    auto_fit: bool = True
    outline_enabled: bool = False
    outline_color: str = "#000000"
    outline_width: float = 2.0
    shadow_enabled: bool = False
    shadow_color: str = "#000000"
    shadow_blur: float = 4.0
    shadow_offset_x: float = 2.0
    shadow_offset_y: float = 2.0


class LogoElementProps(BaseModel):
    asset_id: str = ""
    url: str = ""
    relative_path: str = ""
    natural_width: int = 200
    natural_height: int = 200
    preserve_aspect_ratio: bool = True
    opacity: float = 1.0
    horizontal_align: Literal["left", "center", "right"] = "center"
    vertical_align: Literal["top", "middle", "bottom"] = "middle"
    fit_mode: Literal["contain", "cover", "fill"] = "contain"
    margin: float = 0.0  # percentage or px


class LogoGroupProps(BaseModel):
    logos: List[LogoGroupItem] = Field(default_factory=list)
    arrangement: Literal["auto", "horizontal", "grid", "centered", "space-between", "space-around"] = "horizontal"
    max_logo_height: float = 80.0  # percentage of group height (10-100)
    max_logo_width: float = 45.0   # percentage of group width (5-100)
    horizontal_spacing: float = 2.5  # percentage of group width
    vertical_spacing: float = 4.0    # percentage of group height
    max_logos_per_row: int = 6
    alignment: Literal["left", "center", "right"] = "center"
    vertical_alignment: Literal["top", "middle", "bottom"] = "middle"
    opacity: float = 1.0
    margin: float = 1.0  # inner padding percentage
    crop_transparent: bool = True  # auto-trim transparent borders so logos match visual height/width
    optical_balance: bool = True  # visually balance rectangles vs square/round seals


class CanvasElement(BaseModel):
    id: str
    name: str
    type: Literal["text", "logo", "logo_group"]
    field_role: Optional[str] = None  # "title", "subtitle", "venue", "address", "date", "custom", etc.
    # Coordinates stored as percentages (0.0 to 100.0) of the original template dimensions
    x: float = 10.0
    y: float = 10.0
    width: float = 80.0
    height: float = 15.0
    rotation: float = 0.0
    visible: bool = True
    locked: bool = False
    z_index: int = 0
    group_id: Optional[str] = None
    text_props: Optional[TextStyle] = None
    logo_props: Optional[LogoElementProps] = None
    logo_group_props: Optional[LogoGroupProps] = None


class ElementOverride(BaseModel):
    text_content: Optional[str] = None
    font_size: Optional[float] = None
    color: Optional[str] = None
    x: Optional[float] = None
    y: Optional[float] = None
    width: Optional[float] = None
    height: Optional[float] = None
    visible: Optional[bool] = None
    logo_ids: Optional[List[str]] = None  # Selected subset/order of logos for a logo_group
    arrangement: Optional[Literal["horizontal", "grid", "centered", "space-between", "space-around"]] = None


class EventRecord(BaseModel):
    id: str
    name: str
    title: str = ""
    subtitle: str = ""
    venue: str = ""
    address: str = ""
    date: str = ""
    custom_fields: Dict[str, str] = Field(default_factory=dict)
    logos: List[LogoGroupItem] = Field(default_factory=list)
    element_visibility: Dict[str, bool] = Field(default_factory=dict)
    element_overrides: Dict[str, ElementOverride] = Field(default_factory=dict)
    order_index: int = 0


class TemplateMeta(BaseModel):
    filename: str
    relative_path: str
    url: str
    width: int
    height: int
    aspect_ratio: float
    format: str = "PNG"
    file_size: int = 0
    sha256: str = ""


class ProjectData(BaseModel):
    id: str
    name: str
    description: str = ""
    created_at: str
    updated_at: str
    is_template: bool = False
    template: Optional[TemplateMeta] = None
    elements: List[CanvasElement] = Field(default_factory=list)
    events: List[EventRecord] = Field(default_factory=list)
    assets: List[LogoAsset] = Field(default_factory=list)
    active_event_id: Optional[str] = None


class ProjectUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_template: Optional[bool] = None
    elements: Optional[List[CanvasElement]] = None
    events: Optional[List[EventRecord]] = None
    assets: Optional[List[LogoAsset]] = None
    active_event_id: Optional[str] = None


class ExportRequest(BaseModel):
    event_ids: List[str] = Field(default_factory=list)
    custom_width: Optional[int] = None
    custom_height: Optional[int] = None
    preserve_aspect_ratio: bool = True
    dpi: int = 300
    as_zip: bool = False
