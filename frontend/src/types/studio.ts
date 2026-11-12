export type ArrangementMode =
  | 'auto'
  | 'horizontal'
  | 'grid'
  | 'centered'
  | 'space-between'
  | 'space-around';

export interface LogoAsset {
  id: string;
  name: string;
  url: string;
  relative_path: string;
  natural_width: number;
  natural_height: number;
  aspect_ratio: number;
  format: string;
}

export interface LogoGroupItem {
  id: string;
  asset_id: string;
  name: string;
  url: string;
  relative_path: string;
  natural_width: number;
  natural_height: number;
  aspect_ratio: number;
  visible: boolean;
  scale_override?: number | null;
  width_scale?: number | null;
  height_scale?: number | null;
  crop_transparent?: boolean;
}

export interface TextStyle {
  content: string;
  binding?: string | null;
  font_family: string;
  font_size: number;
  font_weight: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  color: string;
  align: 'left' | 'center' | 'right';
  vertical_align: 'top' | 'middle' | 'bottom';
  line_height: number;
  letter_spacing: number;
  wrap: boolean;
  auto_fit: boolean;
  outline_enabled: boolean;
  outline_color: string;
  outline_width: number;
  shadow_enabled: boolean;
  shadow_color: string;
  shadow_blur: number;
  shadow_offset_x: number;
  shadow_offset_y: number;
}

export interface LogoElementProps {
  asset_id: string;
  url: string;
  relative_path: string;
  natural_width: number;
  natural_height: number;
  preserve_aspect_ratio: boolean;
  opacity: number;
  horizontal_align: 'left' | 'center' | 'right';
  vertical_align: 'top' | 'middle' | 'bottom';
  fit_mode: 'contain' | 'cover' | 'fill';
  margin: number;
}

export interface LogoGroupProps {
  logos: LogoGroupItem[];
  arrangement: ArrangementMode;
  max_logo_height: number;
  max_logo_width: number;
  horizontal_spacing: number;
  vertical_spacing: number;
  max_logos_per_row: number;
  alignment: 'left' | 'center' | 'right';
  vertical_alignment: 'top' | 'middle' | 'bottom';
  opacity: number;
  margin: number;
  crop_transparent?: boolean;
  optical_balance?: boolean;
}

export interface CanvasElement {
  id: string;
  name: string;
  type: 'text' | 'logo' | 'logo_group';
  field_role?: string | null;
  x: number; // percentage 0..100
  y: number; // percentage 0..100
  width: number; // percentage 0..100
  height: number; // percentage 0..100
  rotation: number;
  visible: boolean;
  locked: boolean;
  z_index: number;
  group_id?: string | null;
  text_props?: TextStyle | null;
  logo_props?: LogoElementProps | null;
  logo_group_props?: LogoGroupProps | null;
}

export interface ElementOverride {
  text_content?: string | null;
  font_size?: number | null;
  color?: string | null;
  x?: number | null;
  y?: number | null;
  width?: number | null;
  height?: number | null;
  visible?: boolean | null;
  logo_ids?: string[] | null;
  arrangement?: ArrangementMode | null;
}

export interface EventRecord {
  id: string;
  name: string;
  title: string;
  subtitle: string;
  venue: string;
  address: string;
  date: string;
  custom_fields: Record<string, string>;
  logos: LogoGroupItem[];
  element_visibility: Record<string, boolean>;
  element_overrides: Record<string, ElementOverride>;
  order_index: number;
}

export interface TemplateMeta {
  filename: string;
  relative_path: string;
  url: string;
  width: number;
  height: number;
  aspect_ratio: number;
  format: string;
  file_size: number;
  sha256: string;
}

export interface ProjectData {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  is_template: boolean;
  template?: TemplateMeta | null;
  elements: CanvasElement[];
  events: EventRecord[];
  assets: LogoAsset[];
  active_event_id?: string | null;
  missing_assets?: string[];
}

export interface ExportHistoryItem {
  id: string;
  project_id: string;
  project_name: string;
  event_id: string;
  event_name: string;
  filename: string;
  relative_path: string;
  url: string;
  width: number;
  height: number;
  export_type: 'PNG' | 'ZIP';
  created_at: string;
}

export interface DashboardSummary {
  projects: ProjectData[];
  saved_templates: ProjectData[];
  recent_exports: ExportHistoryItem[];
}

export interface ValidationIssue {
  id: string;
  severity: 'error' | 'warning';
  element_id?: string;
  event_id?: string;
  message: string;
}
