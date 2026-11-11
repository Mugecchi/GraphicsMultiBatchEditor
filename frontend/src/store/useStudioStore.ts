import { create } from 'zustand';
import {
  ArrangementMode,
  CanvasElement,
  ElementOverride,
  EventRecord,
  LogoAsset,
  LogoGroupItem,
  ProjectData,
} from '../types/studio';
import { api } from '../api/client';

export type ActiveView = 'dashboard' | 'editor' | 'batch' | 'schedule_importer' | 'generate';
export type LeftTab = 'layers' | 'elements' | 'logos' | 'events';

interface HistorySnapshot {
  elements: CanvasElement[];
  events: EventRecord[];
  active_event_id?: string | null;
}

interface StudioState {
  theme: 'dark' | 'light';
  activeView: ActiveView;
  leftTab: LeftTab;
  project: ProjectData | null;
  selectedElementIds: string[];
  clipboard: CanvasElement[];
  zoom: number;
  pan: { x: number; y: number };
  showRulers: boolean;
  showGuides: boolean;
  snapEnabled: boolean;
  saveStatus: 'saved' | 'saving' | 'unsaved' | 'error';
  statusMessage: string;
  historyPast: HistorySnapshot[];
  historyFuture: HistorySnapshot[];
  availableFonts: string[];

  // Actions
  setTheme: (theme: 'dark' | 'light') => void;
  setActiveView: (view: ActiveView) => void;
  setLeftTab: (tab: LeftTab) => void;
  setProject: (project: ProjectData | null) => void;
  loadFonts: () => Promise<void>;
  detectLocalBrowserFonts: () => Promise<void>;
  uploadCustomFont: (file: File) => Promise<string | null>;
  selectElement: (id: string | null, multi?: boolean) => void;
  selectMultiple: (ids: string[]) => void;
  setZoom: (zoom: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  toggleRulers: () => void;
  toggleGuides: () => void;
  toggleSnap: () => void;

  // History
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;

  // Element CRUD & Manipulation
  addTextElement: (presetRole?: string, customFieldKey?: string, customFieldLabel?: string) => void;
  addDynamicFieldAndElement: (fieldKey: string, defaultLabel?: string) => void;
  removeDynamicField: (fieldKey: string) => void;
  keepDynamicFieldOnlyOnEvent: (eventId: string, fieldKey: string) => void;
  clearStandardFieldOnOtherEvents: (
    eventId: string,
    fieldKey: 'subtitle' | 'venue' | 'address' | 'date'
  ) => void;
  addLogoElement: (asset: LogoAsset) => void;
  addLogoGroupElement: (initialLogos?: LogoAsset[]) => void;
  updateElement: (id: string, patch: Partial<CanvasElement>, recordHistory?: boolean) => void;
  updateElementNested: (
    id: string,
    updater: (el: CanvasElement) => CanvasElement,
    recordHistory?: boolean
  ) => void;
  deleteSelectedElements: () => void;
  duplicateSelectedElements: () => void;
  copySelectedElements: () => void;
  pasteElements: () => void;
  nudgeSelectedElements: (dxPct: number, dyPct: number) => void;
  reorderElementLayer: (id: string, direction: 'up' | 'down' | 'top' | 'bottom') => void;
  groupSelectedElements: () => void;
  ungroupSelectedElements: () => void;

  // Alignment & Distribution
  alignSelectedElements: (
    mode:
      | 'left'
      | 'center-h'
      | 'right'
      | 'top'
      | 'center-v'
      | 'bottom'
      | 'distribute-h'
      | 'distribute-v'
  ) => void;

  // Logo Group specific helpers
  addAssetsToLogoGroup: (groupElementId: string, assets: LogoAsset[]) => void;
  removeLogoFromGroup: (groupElementId: string, itemId: string) => void;
  reorderLogoInGroup: (groupElementId: string, itemId: string, direction: 'left' | 'right') => void;
  moveLogoInGroupToIndex: (groupElementId: string, draggedItemId: string, targetItemId: string) => void;
  moveEventLogoToIndex: (eventId: string, draggedItemId: string, targetItemId: string) => void;
  replaceLogoInGroup: (groupElementId: string, itemId: string, newAsset: LogoAsset) => void;
  updateLogoInGroup: (
    groupElementId: string,
    itemId: string,
    patch: Partial<LogoGroupItem>,
    recordHistory?: boolean
  ) => void;
  updateEventLogo: (
    eventId: string,
    itemId: string,
    patch: Partial<LogoGroupItem>,
    recordHistory?: boolean
  ) => void;

  // Event Management & Overrides
  setActiveEvent: (eventId: string) => void;
  addEvent: (partial?: Partial<EventRecord>) => void;
  addBulkEventsFromTitles: (titles: string[]) => void;
  setAllEvents: (events: EventRecord[]) => void;
  duplicateEvent: (eventId: string) => void;
  updateEvent: (eventId: string, patch: Partial<EventRecord>) => void;
  deleteEvent: (eventId: string) => void;
  reorderEvent: (eventId: string, direction: 'up' | 'down') => void;
  setElementOverride: (eventId: string, elementId: string, patch: Partial<ElementOverride>) => void;
  clearElementOverride: (eventId: string, elementId: string) => void;

  // Persistence
  saveProjectNow: () => Promise<void>;
  saveAsNewProject: (newName: string) => Promise<ProjectData | null>;
}

let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleAutoSave(get: () => StudioState) {
  if (autoSaveTimer) clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => {
    const st = get();
    if (st.project && st.saveStatus === 'unsaved') {
      st.saveProjectNow();
    }
  }, 1200);
}

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export function ensureFontFaceLoaded(family: string) {
  if (!family || typeof document === 'undefined') return;
  const clean = family.trim().replace(/^["']|["']$/g, '');
  if (!clean) return;
  const styleId = `tarp_fontface_${clean.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  if (document.getElementById(styleId)) return;

  const encoded = encodeURIComponent(clean);
  const st = document.createElement('style');
  st.id = styleId;
  st.textContent = `
@font-face {
  font-family: "${clean}";
  src: local("${clean}"), url("/api/fonts/file?family=${encoded}&bold=false&italic=false");
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: "${clean}";
  src: local("${clean} Bold"), local("${clean}"), url("/api/fonts/file?family=${encoded}&bold=true&italic=false");
  font-weight: bold;
  font-style: normal;
  font-display: swap;
}
`;
  document.head.appendChild(st);
}

export const useStudioStore = create<StudioState>((set, get) => ({
  theme: 'dark',
  activeView: 'dashboard',
  leftTab: 'layers',
  project: null,
  selectedElementIds: [],
  clipboard: [],
  zoom: 0.55,
  pan: { x: 0, y: 0 },
  showRulers: true,
  showGuides: true,
  snapEnabled: true,
  saveStatus: 'saved',
  statusMessage: 'Ready',
  historyPast: [],
  historyFuture: [],
  availableFonts: [
    'Arial',
    'Impact',
    'Georgia',
    'Times New Roman',
    'Verdana',
    'Trebuchet MS',
    'Tahoma',
    'Segoe UI',
    'Calibri',
    'Courier New',
  ],

  setTheme: (theme) => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    set({ theme });
  },

  setActiveView: (activeView) => set({ activeView }),
  setLeftTab: (leftTab) => set({ leftTab }),

  setProject: (project) =>
    set({
      project,
      selectedElementIds: project?.elements?.[0] ? [project.elements[0].id] : [],
      historyPast: [],
      historyFuture: [],
      saveStatus: 'saved',
      statusMessage: project ? `Loaded "${project.name}"` : 'Ready',
    }),

  loadFonts: async () => {
    try {
      const data = await api.getFonts();
      const serverFonts = data.fonts || [];
      if (data.custom_font_files) {
        for (const cf of data.custom_font_files) {
          const styleId = `custom_font_${cf.filename.replace(/[^a-zA-Z0-9]/g, '_')}`;
          if (!document.getElementById(styleId)) {
            const st = document.createElement('style');
            st.id = styleId;
            st.textContent = `@font-face { font-family: "${cf.family}"; src: url("${cf.url}"); }`;
            document.head.appendChild(st);
          }
        }
      }
      if (serverFonts.length > 0) {
        const merged = Array.from(new Set([...get().availableFonts, ...serverFonts])).sort((a, b) =>
          a.localeCompare(b)
        );
        set({ availableFonts: merged });
      }
    } catch {
      // Keep fallback fonts
    }
  },

  detectLocalBrowserFonts: async () => {
    try {
      // Use Chromium/Edge/Chrome Local Font Access API if supported by the user's browser
      const winAny = window as any;
      if (typeof winAny.queryLocalFonts === 'function') {
        const localFonts: { family: string }[] = await winAny.queryLocalFonts();
        const families = localFonts
          .map((f) => f.family?.trim())
          .filter((f): f is string => Boolean(f && !f.startsWith('.')));
        if (families.length > 0) {
          const merged = Array.from(new Set([...get().availableFonts, ...families])).sort((a, b) =>
            a.localeCompare(b)
          );
          set({
            availableFonts: merged,
            statusMessage: `Loaded ${merged.length} available fonts from your device`,
          });
          return;
        }
      }
      await get().loadFonts();
      set({ statusMessage: `Refreshed ${get().availableFonts.length} available fonts` });
    } catch {
      await get().loadFonts();
    }
  },

  uploadCustomFont: async (file: File) => {
    try {
      const data = await api.uploadFont(file);
      await get().loadFonts();
      const newest = data.custom_font_files?.[data.custom_font_files.length - 1]?.family || null;
      set({ statusMessage: `Uploaded font "${file.name}"` });
      return newest;
    } catch (err: any) {
      set({ statusMessage: `Font upload failed: ${err?.message}` });
      return null;
    }
  },

  selectElement: (id, multi = false) => {
    if (!id) {
      set({ selectedElementIds: [] });
      return;
    }
    const { project, selectedElementIds } = get();
    const target = project?.elements.find((e) => e.id === id);

    // If element belongs to a group and not multi-selecting individual, select whole group
    if (target?.group_id && !multi) {
      const groupMembers = project!.elements
        .filter((e) => e.group_id === target.group_id)
        .map((e) => e.id);
      set({ selectedElementIds: groupMembers });
      return;
    }

    if (multi) {
      if (selectedElementIds.includes(id)) {
        set({ selectedElementIds: selectedElementIds.filter((i) => i !== id) });
      } else {
        set({ selectedElementIds: [...selectedElementIds, id] });
      }
    } else {
      set({ selectedElementIds: [id] });
    }
  },

  selectMultiple: (ids) => set({ selectedElementIds: ids }),
  setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(3.0, zoom)) }),
  setPan: (pan) => set({ pan }),
  toggleRulers: () => set((s) => ({ showRulers: !s.showRulers })),
  toggleGuides: () => set((s) => ({ showGuides: !s.showGuides })),
  toggleSnap: () => set((s) => ({ snapEnabled: !s.snapEnabled })),

  pushHistory: () => {
    const { project, historyPast } = get();
    if (!project) return;
    const snap: HistorySnapshot = {
      elements: deepClone(project.elements),
      events: deepClone(project.events),
      active_event_id: project.active_event_id,
    };
    const nextPast = [...historyPast.slice(-39), snap];
    set({ historyPast: nextPast, historyFuture: [] });
  },

  undo: () => {
    const { project, historyPast, historyFuture } = get();
    if (!project || historyPast.length === 0) return;
    const previous = historyPast[historyPast.length - 1];
    const currentSnap: HistorySnapshot = {
      elements: deepClone(project.elements),
      events: deepClone(project.events),
      active_event_id: project.active_event_id,
    };
    set({
      project: {
        ...project,
        elements: previous.elements,
        events: previous.events,
        active_event_id: previous.active_event_id,
      },
      historyPast: historyPast.slice(0, -1),
      historyFuture: [currentSnap, ...historyFuture],
      saveStatus: 'unsaved',
      statusMessage: 'Undo applied',
    });
    scheduleAutoSave(get);
  },

  redo: () => {
    const { project, historyPast, historyFuture } = get();
    if (!project || historyFuture.length === 0) return;
    const next = historyFuture[0];
    const currentSnap: HistorySnapshot = {
      elements: deepClone(project.elements),
      events: deepClone(project.events),
      active_event_id: project.active_event_id,
    };
    set({
      project: {
        ...project,
        elements: next.elements,
        events: next.events,
        active_event_id: next.active_event_id,
      },
      historyPast: [...historyPast, currentSnap],
      historyFuture: historyFuture.slice(1),
      saveStatus: 'unsaved',
      statusMessage: 'Redo applied',
    });
    scheduleAutoSave(get);
  },

  addTextElement: (presetRole = 'custom', customFieldKey?: string, customFieldLabel?: string) => {
    const { project, pushHistory } = get();
    if (!project) return;
    pushHistory();

    const tplH = project.template?.height || 1080;
    const scale = Math.max(0.5, tplH / 1080);

    const rolePresets: Record<
      string,
      { name: string; content: string; binding: string | null; size: number; y: number; h: number }
    > = {
      title: {
        name: 'Event Title',
        content: '{{event.title}}',
        binding: '{{event.title}}',
        size: Math.round(60 * scale),
        y: 24,
        h: 16,
      },
      subtitle: {
        name: 'Subtitle',
        content: '{{event.subtitle}}',
        binding: '{{event.subtitle}}',
        size: Math.round(36 * scale),
        y: 44,
        h: 10,
      },
      venue: {
        name: 'Venue',
        content: '{{event.venue}}',
        binding: '{{event.venue}}',
        size: Math.round(32 * scale),
        y: 60,
        h: 8,
      },
      address: {
        name: 'Address',
        content: '{{event.address}}',
        binding: '{{event.address}}',
        size: Math.round(26 * scale),
        y: 70,
        h: 7,
      },
      date: {
        name: 'Event Date',
        content: '{{event.date}}',
        binding: '{{event.date}}',
        size: Math.round(30 * scale),
        y: 80,
        h: 8,
      },
      custom: {
        name: 'Custom Text',
        content: 'Double-click or edit in Inspector',
        binding: null,
        size: Math.round(36 * scale),
        y: 50,
        h: 10,
      },
    };

    let preset = rolePresets[presetRole] || rolePresets.custom;
    if (customFieldKey) {
      const token = `{{event.custom.${customFieldKey}}}`;
      preset = {
        name: customFieldLabel || `Field: ${customFieldKey}`,
        content: token,
        binding: token,
        size: Math.round(34 * scale),
        y: 52,
        h: 9,
      };
    }

    const maxZ = project.elements.reduce((m, e) => Math.max(m, e.z_index), 0);
    const newEl: CanvasElement = {
      id: `el_txt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
      name: preset.name,
      type: 'text',
      field_role: customFieldKey ? `custom:${customFieldKey}` : presetRole,
      x: 15,
      y: preset.y,
      width: 70,
      height: preset.h,
      rotation: 0,
      visible: true,
      locked: false,
      z_index: maxZ + 1,
      text_props: {
        content: preset.content,
        binding: preset.binding,
        font_family: 'Arial',
        font_size: preset.size,
        font_weight: 'bold',
        bold: true,
        italic: false,
        underline: false,
        color: '#FFFFFF',
        align: 'center',
        vertical_align: 'middle',
        line_height: 1.2,
        letter_spacing: 0,
        wrap: true,
        auto_fit: true,
        outline_enabled: true,
        outline_color: '#0F172A',
        outline_width: Math.max(1, Math.round(2 * scale)),
        shadow_enabled: true,
        shadow_color: '#000000',
        shadow_blur: 4,
        shadow_offset_x: 2,
        shadow_offset_y: 2,
      },
    };

    set({
      project: { ...project, elements: [...project.elements, newEl] },
      selectedElementIds: [newEl.id],
      saveStatus: 'unsaved',
      statusMessage: `Added ${preset.name}`,
    });
    scheduleAutoSave(get);
  },

  addDynamicFieldAndElement: (fieldKey, defaultVal = '') => {
    const { project, pushHistory, addTextElement } = get();
    if (!project) return;
    const cleanKey = fieldKey
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, '_')
      .replace(/^_+|_+$/g, '');
    if (!cleanKey) return;

    pushHistory();
    // Ensure every event record has this custom_fields key initialized
    const updatedEvents = project.events.map((ev, idx) => ({
      ...ev,
      custom_fields: {
        ...(ev.custom_fields || {}),
        [cleanKey]:
          ev.custom_fields?.[cleanKey] !== undefined
            ? ev.custom_fields[cleanKey]
            : defaultVal || `${cleanKey.toUpperCase()} #${idx + 1}`,
      },
    }));

    set({
      project: { ...project, events: updatedEvents },
      saveStatus: 'unsaved',
    });

    // Also add a bound text box on the canvas if one doesn't already exist for this token
    const token = `{{event.custom.${cleanKey}}}`;
    const alreadyOnCanvas = project.elements.some(
      (e) => e.type === 'text' && (e.text_props?.binding === token || e.text_props?.content?.includes(token))
    );
    if (!alreadyOnCanvas) {
      addTextElement('custom', cleanKey, `Dynamic: ${cleanKey}`);
    } else {
      scheduleAutoSave(get);
    }
  },

  removeDynamicField: (fieldKey) => {
    const { project, pushHistory, selectedElementIds } = get();
    if (!project) return;
    pushHistory();
    const updatedEvents = project.events.map((ev) => {
      const nextCustom = { ...(ev.custom_fields || {}) };
      delete nextCustom[fieldKey];
      return { ...ev, custom_fields: nextCustom };
    });
    const token = `{{event.custom.${fieldKey}}}`;
    const updatedElements = project.elements.filter(
      (el) =>
        !(
          el.type === 'text' &&
          (el.text_props?.binding === token || el.text_props?.content?.trim() === token)
        )
    );
    const remainingIds = new Set(updatedElements.map((e) => e.id));
    set({
      project: { ...project, events: updatedEvents, elements: updatedElements },
      selectedElementIds: selectedElementIds.filter((id) => remainingIds.has(id)),
      saveStatus: 'unsaved',
      statusMessage: `Removed field "${fieldKey}" from all rows`,
    });
    scheduleAutoSave(get);
  },

  keepDynamicFieldOnlyOnEvent: (eventId, fieldKey) => {
    const { project, pushHistory } = get();
    if (!project) return;
    pushHistory();
    let removedCount = 0;
    const updatedEvents = project.events.map((ev) => {
      if (ev.id === eventId) return ev;
      if (ev.custom_fields && fieldKey in ev.custom_fields) {
        removedCount += 1;
        const nextCustom = { ...ev.custom_fields };
        delete nextCustom[fieldKey];
        return { ...ev, custom_fields: nextCustom };
      }
      return ev;
    });
    set({
      project: { ...project, events: updatedEvents },
      saveStatus: 'unsaved',
      statusMessage: `Removed "${fieldKey}" from ${removedCount} other tarpaulin(s) — kept only on selected row`,
    });
    scheduleAutoSave(get);
  },

  clearStandardFieldOnOtherEvents: (eventId, fieldKey) => {
    const { project, pushHistory } = get();
    if (!project) return;
    pushHistory();
    let clearedCount = 0;
    const updatedEvents = project.events.map((ev) => {
      if (ev.id === eventId) return ev;
      if (ev[fieldKey]) {
        clearedCount += 1;
        return { ...ev, [fieldKey]: '' };
      }
      return ev;
    });
    set({
      project: { ...project, events: updatedEvents },
      saveStatus: 'unsaved',
      statusMessage: `Cleared "${fieldKey}" from ${clearedCount} other tarpaulin(s)`,
    });
    scheduleAutoSave(get);
  },

  addLogoElement: (asset) => {
    const { project, pushHistory } = get();
    if (!project) return;
    pushHistory();

    const maxZ = project.elements.reduce((m, e) => Math.max(m, e.z_index), 0);
    const newEl: CanvasElement = {
      id: `el_logo_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
      name: `Logo: ${asset.name}`,
      type: 'logo',
      field_role: 'logo',
      x: 42,
      y: 12,
      width: 16,
      height: 14,
      rotation: 0,
      visible: true,
      locked: false,
      z_index: maxZ + 1,
      logo_props: {
        asset_id: asset.id,
        url: asset.url,
        relative_path: asset.relative_path,
        natural_width: asset.natural_width,
        natural_height: asset.natural_height,
        preserve_aspect_ratio: true,
        opacity: 1,
        horizontal_align: 'center',
        vertical_align: 'middle',
        fit_mode: 'contain',
        margin: 0,
      },
    };

    set({
      project: { ...project, elements: [...project.elements, newEl] },
      selectedElementIds: [newEl.id],
      saveStatus: 'unsaved',
      statusMessage: `Added logo "${asset.name}"`,
    });
    scheduleAutoSave(get);
  },

  addLogoGroupElement: (initialLogos = []) => {
    const { project, pushHistory } = get();
    if (!project) return;
    pushHistory();

    const maxZ = project.elements.reduce((m, e) => Math.max(m, e.z_index), 0);
    const items: LogoGroupItem[] = initialLogos.map((a, idx) => ({
      id: `lgi_${Date.now().toString(36)}_${idx}`,
      asset_id: a.id,
      name: a.name,
      url: a.url,
      relative_path: a.relative_path,
      natural_width: a.natural_width,
      natural_height: a.natural_height,
      aspect_ratio: a.aspect_ratio,
      visible: true,
    }));

    const newEl: CanvasElement = {
      id: `el_lg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
      name: 'Logo Group',
      type: 'logo_group',
      field_role: 'logos',
      x: 10,
      y: 5,
      width: 80,
      height: 14,
      rotation: 0,
      visible: true,
      locked: false,
      z_index: maxZ + 1,
      logo_group_props: {
        logos: items,
        arrangement: 'horizontal',
        max_logo_height: 85,
        max_logo_width: 40,
        horizontal_spacing: 2.5,
        vertical_spacing: 4.0,
        max_logos_per_row: 6,
        alignment: 'center',
        vertical_alignment: 'middle',
        opacity: 1,
        margin: 1,
      },
    };

    set({
      project: { ...project, elements: [...project.elements, newEl] },
      selectedElementIds: [newEl.id],
      saveStatus: 'unsaved',
      statusMessage: 'Added Logo Group',
    });
    scheduleAutoSave(get);
  },

  updateElement: (id, patch, recordHistory = false) => {
    const { project, pushHistory } = get();
    if (!project) return;
    if (recordHistory) pushHistory();

    const elements = project.elements.map((el) => (el.id === id ? { ...el, ...patch } : el));
    set({
      project: { ...project, elements },
      saveStatus: 'unsaved',
    });
    scheduleAutoSave(get);
  },

  updateElementNested: (id, updater, recordHistory = false) => {
    const { project, pushHistory } = get();
    if (!project) return;
    if (recordHistory) pushHistory();

    const elements = project.elements.map((el) => (el.id === id ? updater(deepClone(el)) : el));
    set({
      project: { ...project, elements },
      saveStatus: 'unsaved',
    });
    scheduleAutoSave(get);
  },

  deleteSelectedElements: () => {
    const { project, selectedElementIds, pushHistory } = get();
    if (!project || selectedElementIds.length === 0) return;
    const deletable = project.elements.filter(
      (e) => selectedElementIds.includes(e.id) && !e.locked
    );
    if (deletable.length === 0) return;

    pushHistory();
    const delIds = new Set(deletable.map((e) => e.id));
    const remaining = project.elements.filter((e) => !delIds.has(e.id));
    set({
      project: { ...project, elements: remaining },
      selectedElementIds: [],
      saveStatus: 'unsaved',
      statusMessage: `Deleted ${delIds.size} element(s)`,
    });
    scheduleAutoSave(get);
  },

  duplicateSelectedElements: () => {
    const { project, selectedElementIds, pushHistory } = get();
    if (!project || selectedElementIds.length === 0) return;
    pushHistory();

    let maxZ = project.elements.reduce((m, e) => Math.max(m, e.z_index), 0);
    const selected = project.elements.filter((e) => selectedElementIds.includes(e.id));
    const clones: CanvasElement[] = selected.map((el) => {
      maxZ += 1;
      const cloned = deepClone(el);
      return {
        ...cloned,
        id: `el_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
        name: `${el.name} (Copy)`,
        x: Math.min(92, el.x + 2.5),
        y: Math.min(92, el.y + 2.5),
        locked: false,
        z_index: maxZ,
      };
    });

    set({
      project: { ...project, elements: [...project.elements, ...clones] },
      selectedElementIds: clones.map((c) => c.id),
      saveStatus: 'unsaved',
      statusMessage: `Duplicated ${clones.length} element(s)`,
    });
    scheduleAutoSave(get);
  },

  copySelectedElements: () => {
    const { project, selectedElementIds } = get();
    if (!project || selectedElementIds.length === 0) return;
    const selected = project.elements
      .filter((e) => selectedElementIds.includes(e.id))
      .map((e) => deepClone(e));
    set({ clipboard: selected, statusMessage: `Copied ${selected.length} element(s)` });
  },

  pasteElements: () => {
    const { project, clipboard, pushHistory } = get();
    if (!project || clipboard.length === 0) return;
    pushHistory();

    let maxZ = project.elements.reduce((m, e) => Math.max(m, e.z_index), 0);
    const pasted: CanvasElement[] = clipboard.map((el) => {
      maxZ += 1;
      const cloned = deepClone(el);
      return {
        ...cloned,
        id: `el_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
        name: `${el.name} (Pasted)`,
        x: Math.min(92, el.x + 3),
        y: Math.min(92, el.y + 3),
        locked: false,
        z_index: maxZ,
      };
    });

    set({
      project: { ...project, elements: [...project.elements, ...pasted] },
      selectedElementIds: pasted.map((p) => p.id),
      saveStatus: 'unsaved',
      statusMessage: `Pasted ${pasted.length} element(s)`,
    });
    scheduleAutoSave(get);
  },

  nudgeSelectedElements: (dxPct, dyPct) => {
    const { project, selectedElementIds, pushHistory } = get();
    if (!project || selectedElementIds.length === 0) return;
    pushHistory();

    const idSet = new Set(selectedElementIds);
    const elements = project.elements.map((el) => {
      if (!idSet.has(el.id) || el.locked) return el;
      return {
        ...el,
        x: Number((el.x + dxPct).toFixed(2)),
        y: Number((el.y + dyPct).toFixed(2)),
      };
    });

    set({
      project: { ...project, elements },
      saveStatus: 'unsaved',
    });
    scheduleAutoSave(get);
  },

  reorderElementLayer: (id, direction) => {
    const { project, pushHistory } = get();
    if (!project) return;
    pushHistory();

    const sorted = [...project.elements].sort((a, b) => a.z_index - b.z_index);
    const idx = sorted.findIndex((e) => e.id === id);
    if (idx === -1) return;

    const [item] = sorted.splice(idx, 1);
    if (direction === 'up') {
      sorted.splice(Math.min(sorted.length, idx + 1), 0, item);
    } else if (direction === 'down') {
      sorted.splice(Math.max(0, idx - 1), 0, item);
    } else if (direction === 'top') {
      sorted.push(item);
    } else if (direction === 'bottom') {
      sorted.unshift(item);
    }

    const updated = sorted.map((el, i) => ({ ...el, z_index: i + 1 }));
    set({
      project: { ...project, elements: updated },
      saveStatus: 'unsaved',
    });
    scheduleAutoSave(get);
  },

  groupSelectedElements: () => {
    const { project, selectedElementIds, pushHistory } = get();
    if (!project || selectedElementIds.length < 2) return;
    pushHistory();

    const groupId = `grp_${Date.now().toString(36)}`;
    const idSet = new Set(selectedElementIds);
    const elements = project.elements.map((el) =>
      idSet.has(el.id) ? { ...el, group_id: groupId } : el
    );
    set({
      project: { ...project, elements },
      saveStatus: 'unsaved',
      statusMessage: `Grouped ${selectedElementIds.length} elements`,
    });
    scheduleAutoSave(get);
  },

  ungroupSelectedElements: () => {
    const { project, selectedElementIds, pushHistory } = get();
    if (!project || selectedElementIds.length === 0) return;
    pushHistory();

    const idSet = new Set(selectedElementIds);
    const elements = project.elements.map((el) =>
      idSet.has(el.id) ? { ...el, group_id: null } : el
    );
    set({
      project: { ...project, elements },
      saveStatus: 'unsaved',
      statusMessage: 'Ungrouped elements',
    });
    scheduleAutoSave(get);
  },

  alignSelectedElements: (mode) => {
    const { project, selectedElementIds, pushHistory } = get();
    if (!project || selectedElementIds.length === 0) return;
    pushHistory();

    const idSet = new Set(selectedElementIds);
    const selected = project.elements.filter((e) => idSet.has(e.id) && !e.locked);
    if (selected.length === 0) return;

    const updatedMap = new Map<string, Partial<CanvasElement>>();

    if (selected.length === 1) {
      // Align single element relative to canvas (0..100%)
      const el = selected[0];
      if (mode === 'left') updatedMap.set(el.id, { x: 0 });
      if (mode === 'center-h') updatedMap.set(el.id, { x: Number(((100 - el.width) / 2).toFixed(2)) });
      if (mode === 'right') updatedMap.set(el.id, { x: Number((100 - el.width).toFixed(2)) });
      if (mode === 'top') updatedMap.set(el.id, { y: 0 });
      if (mode === 'center-v') updatedMap.set(el.id, { y: Number(((100 - el.height) / 2).toFixed(2)) });
      if (mode === 'bottom') updatedMap.set(el.id, { y: Number((100 - el.height).toFixed(2)) });
    } else {
      const minX = Math.min(...selected.map((e) => e.x));
      const maxX = Math.max(...selected.map((e) => e.x + e.width));
      const minY = Math.min(...selected.map((e) => e.y));
      const maxY = Math.max(...selected.map((e) => e.y + e.height));
      const midX = (minX + maxX) / 2;
      const midY = (minY + maxY) / 2;

      for (const el of selected) {
        if (mode === 'left') updatedMap.set(el.id, { x: Number(minX.toFixed(2)) });
        if (mode === 'center-h')
          updatedMap.set(el.id, { x: Number((midX - el.width / 2).toFixed(2)) });
        if (mode === 'right') updatedMap.set(el.id, { x: Number((maxX - el.width).toFixed(2)) });
        if (mode === 'top') updatedMap.set(el.id, { y: Number(minY.toFixed(2)) });
        if (mode === 'center-v')
          updatedMap.set(el.id, { y: Number((midY - el.height / 2).toFixed(2)) });
        if (mode === 'bottom') updatedMap.set(el.id, { y: Number((maxY - el.height).toFixed(2)) });
      }

      if (mode === 'distribute-h' && selected.length >= 3) {
        const sortedX = [...selected].sort((a, b) => a.x - b.x);
        const totalW = sortedX.reduce((s, e) => s + e.width, 0);
        const span = maxX - minX;
        const gap = (span - totalW) / (sortedX.length - 1);
        let curr = minX;
        for (const el of sortedX) {
          updatedMap.set(el.id, { x: Number(curr.toFixed(2)) });
          curr += el.width + gap;
        }
      }

      if (mode === 'distribute-v' && selected.length >= 3) {
        const sortedY = [...selected].sort((a, b) => a.y - b.y);
        const totalH = sortedY.reduce((s, e) => s + e.height, 0);
        const span = maxY - minY;
        const gap = (span - totalH) / (sortedY.length - 1);
        let curr = minY;
        for (const el of sortedY) {
          updatedMap.set(el.id, { y: Number(curr.toFixed(2)) });
          curr += el.height + gap;
        }
      }
    }

    const elements = project.elements.map((el) =>
      updatedMap.has(el.id) ? { ...el, ...updatedMap.get(el.id)! } : el
    );

    set({
      project: { ...project, elements },
      saveStatus: 'unsaved',
    });
    scheduleAutoSave(get);
  },

  addAssetsToLogoGroup: (groupElementId, assets) => {
    const { updateElementNested } = get();
    updateElementNested(
      groupElementId,
      (el) => {
        if (!el.logo_group_props) return el;
        const newItems: LogoGroupItem[] = assets.map((a, idx) => ({
          id: `lgi_${Date.now().toString(36)}_${idx}_${Math.random().toString(36).slice(2, 5)}`,
          asset_id: a.id,
          name: a.name,
          url: a.url,
          relative_path: a.relative_path,
          natural_width: a.natural_width,
          natural_height: a.natural_height,
          aspect_ratio: a.aspect_ratio,
          visible: true,
        }));
        el.logo_group_props.logos = [...el.logo_group_props.logos, ...newItems];
        return el;
      },
      true
    );
  },

  removeLogoFromGroup: (groupElementId, itemId) => {
    const { updateElementNested } = get();
    updateElementNested(
      groupElementId,
      (el) => {
        if (!el.logo_group_props) return el;
        el.logo_group_props.logos = el.logo_group_props.logos.filter((l) => l.id !== itemId);
        return el;
      },
      true
    );
  },

  reorderLogoInGroup: (groupElementId, itemId, direction) => {
    const { updateElementNested } = get();
    updateElementNested(
      groupElementId,
      (el) => {
        if (!el.logo_group_props) return el;
        const list = [...el.logo_group_props.logos];
        const idx = list.findIndex((l) => l.id === itemId);
        if (idx === -1) return el;
        const targetIdx = direction === 'left' ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= list.length) return el;
        const [moved] = list.splice(idx, 1);
        list.splice(targetIdx, 0, moved);
        el.logo_group_props.logos = list;
        return el;
      },
      true
    );
  },

  moveLogoInGroupToIndex: (groupElementId, draggedItemId, targetItemId) => {
    if (!draggedItemId || !targetItemId || draggedItemId === targetItemId) return;
    const { updateElementNested } = get();
    updateElementNested(
      groupElementId,
      (el) => {
        if (!el.logo_group_props) return el;
        const list = [...el.logo_group_props.logos];
        const fromIdx = list.findIndex((l) => l.id === draggedItemId);
        const toIdx = list.findIndex((l) => l.id === targetItemId);
        if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return el;
        const [moved] = list.splice(fromIdx, 1);
        list.splice(toIdx, 0, moved);
        el.logo_group_props.logos = list;
        return el;
      },
      true
    );
  },

  moveEventLogoToIndex: (eventId, draggedItemId, targetItemId) => {
    if (!draggedItemId || !targetItemId || draggedItemId === targetItemId) return;
    const { project, pushHistory } = get();
    if (!project) return;
    pushHistory();
    const events = project.events.map((ev) => {
      if (ev.id !== eventId) return ev;
      const list = [...(ev.logos || [])];
      const fromIdx = list.findIndex((l) => l.id === draggedItemId);
      const toIdx = list.findIndex((l) => l.id === targetItemId);
      if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return ev;
      const [moved] = list.splice(fromIdx, 1);
      list.splice(toIdx, 0, moved);
      return { ...ev, logos: list };
    });
    set({
      project: { ...project, events },
      saveStatus: 'unsaved',
    });
    scheduleAutoSave(get);
  },

  replaceLogoInGroup: (groupElementId, itemId, newAsset) => {
    const { updateElementNested } = get();
    updateElementNested(
      groupElementId,
      (el) => {
        if (!el.logo_group_props) return el;
        el.logo_group_props.logos = el.logo_group_props.logos.map((item) =>
          item.id === itemId
            ? {
                ...item,
                asset_id: newAsset.id,
                name: newAsset.name,
                url: newAsset.url,
                relative_path: newAsset.relative_path,
                natural_width: newAsset.natural_width,
                natural_height: newAsset.natural_height,
                aspect_ratio: newAsset.aspect_ratio,
              }
            : item
        );
        return el;
      },
      true
    );
  },

  updateLogoInGroup: (groupElementId, itemId, patch, recordHistory = false) => {
    const { updateElementNested } = get();
    updateElementNested(
      groupElementId,
      (el) => {
        if (!el.logo_group_props) return el;
        el.logo_group_props.logos = el.logo_group_props.logos.map((item) =>
          item.id === itemId ? { ...item, ...patch } : item
        );
        return el;
      },
      recordHistory
    );
  },

  updateEventLogo: (eventId, itemId, patch, recordHistory = false) => {
    const { project, pushHistory } = get();
    if (!project) return;
    if (recordHistory) pushHistory();
    const events = project.events.map((ev) => {
      if (ev.id !== eventId) return ev;
      const logos = (ev.logos || []).map((item) =>
        item.id === itemId ? { ...item, ...patch } : item
      );
      return { ...ev, logos };
    });
    set({
      project: { ...project, events },
      saveStatus: 'unsaved',
    });
    scheduleAutoSave(get);
  },

  setActiveEvent: (eventId) => {
    const { project } = get();
    if (!project) return;
    set({
      project: { ...project, active_event_id: eventId },
      saveStatus: 'unsaved',
    });
    scheduleAutoSave(get);
  },

  addEvent: (partial = {}) => {
    const { project, pushHistory } = get();
    if (!project) return;
    pushHistory();

    const idx = project.events.length + 1;
    const newEv: EventRecord = {
      id: `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
      name: partial.name || `Event Variation #${idx}`,
      title: partial.title ?? `REGIONAL SUMMIT VARIATION #${idx}`,
      subtitle: partial.subtitle ?? 'Empowering Communities & Sustainable Innovation',
      venue: partial.venue ?? 'Main Convention Hall',
      address: partial.address ?? 'Metro Business Park, Philippines',
      date: partial.date ?? 'December 2026 | 9:00 AM – 5:00 PM',
      custom_fields: partial.custom_fields || {},
      logos: partial.logos || [],
      element_visibility: partial.element_visibility || {},
      element_overrides: partial.element_overrides || {},
      order_index: project.events.length,
    };

    set({
      project: {
        ...project,
        events: [...project.events, newEv],
        active_event_id: newEv.id,
      },
      saveStatus: 'unsaved',
      statusMessage: `Created event "${newEv.name}"`,
    });
    scheduleAutoSave(get);
  },

  addBulkEventsFromTitles: (titles) => {
    const { project, pushHistory } = get();
    if (!project) return;
    const cleaned = titles.map((t) => t.trim()).filter(Boolean);
    if (cleaned.length === 0) return;
    pushHistory();

    // Inherit default shared subtitle/venue/address/date from the first event if present
    const templateEv = project.events[0];
    const startIdx = project.events.length;
    const created: EventRecord[] = cleaned.map((titleText, i) => ({
      id: `evt_${Date.now().toString(36)}_${i}_${Math.random().toString(36).slice(2, 5)}`,
      name: titleText.length > 42 ? `${titleText.slice(0, 42)}...` : titleText,
      title: titleText,
      subtitle: templateEv?.subtitle ?? '',
      venue: templateEv?.venue ?? '',
      address: templateEv?.address ?? '',
      date: templateEv?.date ?? '',
      custom_fields: templateEv?.custom_fields ? deepClone(templateEv.custom_fields) : {},
      logos: [],
      element_visibility: {},
      element_overrides: {},
      order_index: startIdx + i,
    }));

    const nextEvents = [...project.events, ...created];
    set({
      project: {
        ...project,
        events: nextEvents,
        active_event_id: created[0]?.id || project.active_event_id,
      },
      saveStatus: 'unsaved',
      statusMessage: `Added ${created.length} event variation(s) from titles`,
    });
    scheduleAutoSave(get);
  },

  setAllEvents: (events) => {
    const { project, pushHistory } = get();
    if (!project) return;
    pushHistory();
    set({
      project: {
        ...project,
        events: events.map((ev, i) => ({ ...ev, order_index: i })),
        active_event_id: events[0]?.id || null,
      },
      saveStatus: 'unsaved',
      statusMessage: `Updated ${events.length} event record(s)`,
    });
    scheduleAutoSave(get);
  },

  duplicateEvent: (eventId) => {
    const { project, pushHistory } = get();
    if (!project) return;
    const src = project.events.find((e) => e.id === eventId);
    if (!src) return;
    pushHistory();

    const copy: EventRecord = {
      ...deepClone(src),
      id: `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
      name: `${src.name} (Copy)`,
      order_index: project.events.length,
    };

    set({
      project: {
        ...project,
        events: [...project.events, copy],
        active_event_id: copy.id,
      },
      saveStatus: 'unsaved',
      statusMessage: `Duplicated event "${src.name}"`,
    });
    scheduleAutoSave(get);
  },

  updateEvent: (eventId, patch) => {
    const { project } = get();
    if (!project) return;
    const events = project.events.map((ev) => (ev.id === eventId ? { ...ev, ...patch } : ev));
    set({
      project: { ...project, events },
      saveStatus: 'unsaved',
    });
    scheduleAutoSave(get);
  },

  deleteEvent: (eventId) => {
    const { project, pushHistory } = get();
    if (!project) return;
    if (project.events.length <= 1) {
      set({ statusMessage: 'At least one event record must remain in the project.' });
      return;
    }
    pushHistory();
    const events = project.events.filter((e) => e.id !== eventId);
    const nextActive =
      project.active_event_id === eventId ? events[0]?.id || null : project.active_event_id;
    set({
      project: { ...project, events, active_event_id: nextActive },
      saveStatus: 'unsaved',
      statusMessage: 'Deleted event record',
    });
    scheduleAutoSave(get);
  },

  reorderEvent: (eventId, direction) => {
    const { project, pushHistory } = get();
    if (!project) return;
    const list = [...project.events];
    const idx = list.findIndex((e) => e.id === eventId);
    if (idx === -1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    pushHistory();
    const [moved] = list.splice(idx, 1);
    list.splice(targetIdx, 0, moved);
    const reindexed = list.map((ev, i) => ({ ...ev, order_index: i }));
    set({
      project: { ...project, events: reindexed },
      saveStatus: 'unsaved',
    });
    scheduleAutoSave(get);
  },

  setElementOverride: (eventId, elementId, patch) => {
    const { project, pushHistory } = get();
    if (!project) return;
    pushHistory();
    const events = project.events.map((ev) => {
      if (ev.id !== eventId) return ev;
      const existing = ev.element_overrides?.[elementId] || {};
      return {
        ...ev,
        element_overrides: {
          ...(ev.element_overrides || {}),
          [elementId]: { ...existing, ...patch },
        },
      };
    });
    set({
      project: { ...project, events },
      saveStatus: 'unsaved',
    });
    scheduleAutoSave(get);
  },

  clearElementOverride: (eventId, elementId) => {
    const { project, pushHistory } = get();
    if (!project) return;
    pushHistory();
    const events = project.events.map((ev) => {
      if (ev.id !== eventId) return ev;
      const nextOverrides = { ...(ev.element_overrides || {}) };
      delete nextOverrides[elementId];
      return { ...ev, element_overrides: nextOverrides };
    });
    set({
      project: { ...project, events },
      saveStatus: 'unsaved',
      statusMessage: 'Cleared per-event override',
    });
    scheduleAutoSave(get);
  },

  saveProjectNow: async () => {
    const { project } = get();
    if (!project) return;
    set({ saveStatus: 'saving' });
    try {
      const updated = await api.updateProject(project.id, {
        name: project.name,
        description: project.description,
        is_template: project.is_template,
        elements: project.elements,
        events: project.events,
        assets: project.assets,
        active_event_id: project.active_event_id,
      });
      set({
        project: updated,
        saveStatus: 'saved',
        statusMessage: `Saved at ${new Date().toLocaleTimeString()}`,
      });
    } catch (err: any) {
      set({
        saveStatus: 'error',
        statusMessage: `Save failed: ${err?.message || 'Unknown error'}`,
      });
    }
  },

  saveAsNewProject: async (newName) => {
    const { project, saveProjectNow } = get();
    if (!project) return null;
    await saveProjectNow();
    try {
      const duplicated = await api.duplicateProject(project.id, newName);
      set({
        project: duplicated,
        saveStatus: 'saved',
        statusMessage: `Saved as new project "${duplicated.name}"`,
      });
      return duplicated;
    } catch (err: any) {
      set({
        saveStatus: 'error',
        statusMessage: `Save As failed: ${err?.message}`,
      });
      return null;
    }
  },
}));
