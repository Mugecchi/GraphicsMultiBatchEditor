import { EventRecord, LogoGroupItem, LogoGroupProps } from '../types/studio';

export interface PositionedLogoItem {
  id: string;
  asset_id: string;
  name: string;
  url: string;
  relative_path: string;
  x: number; // pixel relative to group box left (or canvas)
  y: number; // pixel relative to group box top (or canvas)
  width: number;
  height: number;
}

/**
 * Resolves {{event.field}} placeholders and direct bindings identically to backend renderer.py.
 */
export function resolveTextBinding(
  rawText: string,
  binding: string | null | undefined,
  event: EventRecord | null | undefined
): string {
  let text = rawText || '';
  if (binding && binding.trim() && binding.includes('{{')) {
    if (!text.includes('{{')) {
      text = binding;
    }
  }
  if (!event) {
    return text;
  }

  const replacements: Record<string, string> = {
    'event.name': event.name || '',
    'event.title': event.title || '',
    'event.subtitle': event.subtitle || '',
    'event.venue': event.venue || '',
    'event.address': event.address || '',
    'event.date': event.date || '',
  };

  if (event.custom_fields) {
    for (const [k, v] of Object.entries(event.custom_fields)) {
      replacements[`event.custom.${k}`] = v || '';
      replacements[`event.${k}`] = v || '';
    }
  }

  const hasAnyToken = /\{\{\s*[a-zA-Z0-9_.-]+\s*\}\}/.test(text);
  let anyTokenResolvedNonEmpty = false;

  const resolved = text.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_match, key) => {
    const trimmed = String(key).trim();
    if (trimmed in replacements) {
      const val = replacements[trimmed];
      if (val && val.trim().length > 0) {
        anyTokenResolvedNonEmpty = true;
      }
      return val;
    }
    // If a custom/unique field does not exist on this specific event row, resolve to empty string
    if (trimmed.startsWith('event.custom.') || trimmed.startsWith('event.')) {
      return '';
    }
    return '';
  });

  // If the text box had a dynamic {{...}} token (like "Special Event: {{event.custom.special_badge}}")
  // and the token resolved to empty on this row, hide the entire line/prefix so nothing dangling prints!
  if (hasAnyToken && !anyTokenResolvedNonEmpty) {
    return '';
  }

  return resolved;
}

/**
 * Deterministic Logo Group layout algorithm matching backend/renderer.py 1:1.
 * Computes exact (x, y, width, height) inside a bounding box of (boxW, boxH).
 */
export function computeLogoGroupLayout(
  boxW: number,
  boxH: number,
  logos: LogoGroupItem[],
  groupProps: LogoGroupProps
): PositionedLogoItem[] {
  const visibleLogos = (logos || []).filter((lg) => lg.visible !== false);
  const count = visibleLogos.length;
  if (count === 0 || boxW <= 2 || boxH <= 2) {
    return [];
  }

  const arrangement = groupProps.arrangement || 'horizontal';
  const marginPct = typeof groupProps.margin === 'number' ? groupProps.margin : 1.0;
  const marginX = boxW * (marginPct / 100.0);
  const marginY = boxH * (marginPct / 100.0);

  const innerX = marginX;
  const innerY = marginY;
  const innerW = Math.max(4.0, boxW - 2.0 * marginX);
  const innerH = Math.max(4.0, boxH - 2.0 * marginY);

  const maxLogoHPct = Math.max(5.0, Math.min(100.0, groupProps.max_logo_height ?? 85.0));
  const maxLogoWPct = Math.max(5.0, Math.min(100.0, groupProps.max_logo_width ?? 45.0));
  const hSpacePct = Math.max(0.0, Math.min(30.0, groupProps.horizontal_spacing ?? 2.5));
  const vSpacePct = Math.max(0.0, Math.min(30.0, groupProps.vertical_spacing ?? 4.0));
  const maxPerRow = Math.max(1, Math.round(groupProps.max_logos_per_row ?? 6));
  const hAlign = groupProps.alignment || 'center';
  const vAlign = groupProps.vertical_alignment || 'middle';

  let cols = count;
  if (
    arrangement === 'grid' ||
    (count > maxPerRow &&
      arrangement !== 'horizontal' &&
      arrangement !== 'space-between' &&
      arrangement !== 'space-around')
  ) {
    cols = Math.min(count, maxPerRow);
  }

  const rows: LogoGroupItem[][] = [];
  for (let i = 0; i < count; i += cols) {
    rows.push(visibleLogos.slice(i, i + cols));
  }

  const numRows = rows.length;
  const gapX = innerW * (hSpacePct / 100.0);
  const gapY = numRows > 1 ? innerH * (vSpacePct / 100.0) : 0.0;

  const totalVGaps = gapY * (numRows - 1);
  const availRowH = Math.max(4.0, (innerH - totalVGaps) / numRows);
  const permittedH = Math.min(availRowH, innerH * (maxLogoHPct / 100.0));
  const permittedW = innerW * (maxLogoWPct / 100.0);

  interface SizedEntry {
    item: LogoGroupItem;
    w: number;
    h: number;
    ar: number;
  }

  interface RowLayout {
    items: SizedEntry[];
    totalLogosW: number;
    rowH: number;
  }

  const rowLayouts: RowLayout[] = [];
  for (const rowItems of rows) {
    const nRow = rowItems.length;
    const sizedItems: SizedEntry[] = [];
    for (const item of rowItems) {
      let ar = item.aspect_ratio || 1.0;
      if (ar <= 0.01) {
        const nw = item.natural_width || 100;
        const nh = item.natural_height || 100;
        ar = nw / Math.max(1.0, nh);
      }
      const scaleMult = item.scale_override || 1.0;
      const wScale = item.width_scale || 1.0;
      const hScale = item.height_scale || 1.0;

      let baseH = permittedH;
      let baseW = baseH * ar;
      if (baseW > permittedW) {
        baseW = permittedW;
        baseH = baseW / ar;
      }

      const h = Math.max(4.0, baseH * scaleMult * hScale);
      const w = Math.max(4.0, baseW * scaleMult * wScale);
      sizedItems.push({ item, w, h, ar });
    }

    const minGap = gapX;
    let totalLogosW = sizedItems.reduce((acc, x) => acc + x.w, 0);
    const totalGapsW = minGap * Math.max(0, nRow - 1);

    if (totalLogosW + totalGapsW > innerW && totalLogosW > 0) {
      const availForLogos = Math.max(4.0 * nRow, innerW - totalGapsW);
      const shrinkFactor = availForLogos / totalLogosW;
      for (const x of sizedItems) {
        x.w *= shrinkFactor;
        x.h *= shrinkFactor;
      }
      totalLogosW = sizedItems.reduce((acc, x) => acc + x.w, 0);
    }

    const rowH = sizedItems.reduce((maxH, x) => Math.max(maxH, x.h), 0) || permittedH;
    rowLayouts.push({ items: sizedItems, totalLogosW, rowH });
  }

  const totalContentH =
    rowLayouts.reduce((acc, r) => acc + r.rowH, 0) + gapY * Math.max(0, numRows - 1);

  let currY = innerY;
  if (vAlign === 'top') {
    currY = innerY;
  } else if (vAlign === 'bottom') {
    currY = innerY + Math.max(0, innerH - totalContentH);
  } else {
    currY = innerY + (innerH - totalContentH) / 2.0;
  }

  const results: PositionedLogoItem[] = [];
  for (const rInfo of rowLayouts) {
    const { items: sizedItems, totalLogosW, rowH } = rInfo;
    const nRow = sizedItems.length;

    let currX = innerX;
    let stepGap = gapX;

    if (arrangement === 'space-between' && nRow > 1) {
      stepGap = Math.max(0.0, (innerW - totalLogosW) / (nRow - 1));
      currX = innerX;
    } else if (arrangement === 'space-around' && nRow >= 1) {
      const rem = Math.max(0.0, innerW - totalLogosW);
      const unitSpace = rem / (nRow * 2.0);
      currX = innerX + unitSpace;
      stepGap = unitSpace * 2.0;
    } else {
      stepGap = gapX;
      const rowTotalW = totalLogosW + stepGap * Math.max(0, nRow - 1);
      if (arrangement === 'centered' || hAlign === 'center') {
        currX = innerX + (innerW - rowTotalW) / 2.0;
      } else if (hAlign === 'right') {
        currX = innerX + (innerW - rowTotalW);
      } else {
        currX = innerX;
      }
    }

    for (const entry of sizedItems) {
      const { w, h, item } = entry;
      const itemY = currY + (rowH - h) / 2.0;
      results.push({
        id: item.id,
        asset_id: item.asset_id,
        name: item.name,
        url: item.url,
        relative_path: item.relative_path,
        x: currX,
        y: itemY,
        width: w,
        height: h,
      });
      currX += w + stepGap;
    }

    currY += rowH + gapY;
  }

  return results;
}
