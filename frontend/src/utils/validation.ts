import { CanvasElement, EventRecord, ProjectData, ValidationIssue } from '../types/studio';
import { resolveTextBinding } from './layoutEngine';

export function validateProject(
  project: ProjectData | null,
  activeEvent: EventRecord | null
): ValidationIssue[] {
  if (!project) return [];
  const issues: ValidationIssue[] = [];

  if (!project.template) {
    issues.push({
      id: 'missing_template',
      severity: 'error',
      message: 'No PNG background template uploaded for this project.',
    });
  }

  if (project.missing_assets && project.missing_assets.length > 0) {
    for (const missing of project.missing_assets) {
      issues.push({
        id: `missing_${missing}`,
        severity: 'error',
        message: `Missing asset file on disk: ${missing}`,
      });
    }
  }

  if (!project.events || project.events.length === 0) {
    issues.push({
      id: 'no_events',
      severity: 'warning',
      message: 'No event records found. Add at least one event in the Events Manager.',
    });
  } else {
    for (const ev of project.events) {
      if (!ev.title?.trim() && !ev.name?.trim()) {
        issues.push({
          id: `empty_event_${ev.id}`,
          severity: 'warning',
          event_id: ev.id,
          message: `Event "${ev.name || ev.id}" is missing a main event title.`,
        });
      }
    }
  }

  for (const el of project.elements) {
    if (!el.visible) continue;
    const ov = activeEvent?.element_overrides?.[el.id];
    if (ov?.visible === false) continue;

    const x = ov?.x ?? el.x;
    const y = ov?.y ?? el.y;
    const w = ov?.width ?? el.width;
    const h = ov?.height ?? el.height;

    if (x < -0.5 || y < -0.5 || x + w > 100.5 || y + h > 100.5) {
      issues.push({
        id: `out_of_bounds_${el.id}`,
        severity: 'warning',
        element_id: el.id,
        message: `Element "${el.name}" extends outside the template boundaries.`,
      });
    }

    if (el.type === 'text' && el.text_props) {
      const fontSize = ov?.font_size ?? el.text_props.font_size;
      if (fontSize < 12) {
        issues.push({
          id: `small_text_${el.id}`,
          severity: 'warning',
          element_id: el.id,
          message: `Text in "${el.name}" (${fontSize}px) may be too small for large-format tarpaulin printing.`,
        });
      }
      const rawContent = ov?.text_content ?? el.text_props.content;
      const resolved = resolveTextBinding(rawContent, el.text_props.binding, activeEvent);
      if (!el.text_props.auto_fit && resolved.length > 140 && h < 10) {
        issues.push({
          id: `overflow_text_${el.id}`,
          severity: 'warning',
          element_id: el.id,
          message: `Text in "${el.name}" may overflow its bounding box because Auto-Fit is disabled.`,
        });
      }
    }

    if (el.type === 'logo' && el.logo_props) {
      if (!el.logo_props.url && !el.logo_props.relative_path) {
        issues.push({
          id: `missing_logo_${el.id}`,
          severity: 'warning',
          element_id: el.id,
          message: `Logo element "${el.name}" has no image assigned.`,
        });
      }
    }
  }

  return issues;
}
