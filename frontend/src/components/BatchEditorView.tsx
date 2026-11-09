import React, { useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  CheckSquare,
  Copy,
  Eye,
  FilePlus2,
  Image as ImageIcon,
  Layers,
  ListPlus,
  Plus,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import { useStudioStore } from '../store/useStudioStore';
import { api } from '../api/client';
import { EventRecord, LogoAsset, LogoGroupItem } from '../types/studio';
import {
  draftsToEventRecords,
  GAD_CAMPAIGN_2026_SAMPLE_TEXT,
  parseStructuredScheduleText,
} from '../utils/scheduleParser';

export const BatchEditorView: React.FC = () => {
  const {
    project,
    setProject,
    addEvent,
    addBulkEventsFromTitles,
    setAllEvents,
    updateEvent,
    duplicateEvent,
    deleteEvent,
    reorderEvent,
    setActiveEvent,
    setActiveView,
    saveProjectNow,
    addDynamicFieldAndElement,
    removeDynamicField,
    keepDynamicFieldOnlyOnEvent,
    clearStandardFieldOnOtherEvents,
  } = useStudioStore();

  const [bulkTitlesText, setBulkTitlesText] = useState('');
  const [countToGenerate, setCountToGenerate] = useState<number>(5);
  const [replaceExistingOnPaste, setReplaceExistingOnPaste] = useState(false);
  const [uploadingForEventId, setUploadingForEventId] = useState<string | null>(null);
  const [uploadingGlobalLibrary, setUploadingGlobalLibrary] = useState(false);
  const [expandedSecondaryFields, setExpandedSecondaryFields] = useState(true);
  const [newDynamicColName, setNewDynamicColName] = useState('');
  const [pasteMode, setPasteMode] = useState<'schedule' | 'titles'>('schedule');
  const [addingUniqueFieldForRow, setAddingUniqueFieldForRow] = useState<string | null>(null);
  const [uniqueFieldKeyInput, setUniqueFieldKeyInput] = useState('');
  const [uniqueFieldValInput, setUniqueFieldValInput] = useState('');

  if (!project) return null;

  const allCustomFieldKeys = Array.from(
    new Set(project.events.flatMap((ev) => Object.keys(ev.custom_fields || {})))
  );

  // Separate global fields (present on most rows) vs unique fields
  const addUniqueFieldToRow = (ev: EventRecord, rawKey: string, val: string) => {
    const cleanKey = rawKey
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, '_')
      .replace(/^_+|_+$/g, '');
    if (!cleanKey) return;

    // 1. Add the field ONLY to this specific event row
    updateEvent(ev.id, {
      custom_fields: {
        ...(ev.custom_fields || {}),
        [cleanKey]: val,
      },
    });

    // 2. Ensure a corresponding text box bound to {{event.custom.<cleanKey>}} exists on the canvas
    const st = useStudioStore.getState();
    const token = `{{event.custom.${cleanKey}}}`;
    const existsOnCanvas = st.project?.elements.some(
      (el) =>
        el.type === 'text' &&
        (el.text_props?.binding === token || el.text_props?.content?.includes(token))
    );
    if (!existsOnCanvas) {
      st.addTextElement('custom', cleanKey, `Unique: ${cleanKey}`);
    }
  };

  const removeFieldFromSingleRow = (ev: EventRecord, keyToRemove: string) => {
    const nextCustom = { ...(ev.custom_fields || {}) };
    delete nextCustom[keyToRemove];
    updateEvent(ev.id, { custom_fields: nextCustom });
  };

  // Find shared Logo Group element so users can see/copy shared logos if desired
  const sharedLogoGroup = project.elements.find((e) => e.type === 'logo_group');
  const sharedGroupLogos = sharedLogoGroup?.logo_group_props?.logos || [];

  const assetToGroupItem = (asset: LogoAsset): LogoGroupItem => ({
    id: `evlg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    asset_id: asset.id,
    name: asset.name,
    url: asset.url,
    relative_path: asset.relative_path,
    natural_width: asset.natural_width,
    natural_height: asset.natural_height,
    aspect_ratio: asset.aspect_ratio,
    visible: true,
  });

  const ensureCanvasElementsForScheduleFields = () => {
    // Ensure canvas has bound text boxes for lead_office and partners if not yet present
    const st = useStudioStore.getState();
    if (!st.project) return;
    const hasLead = st.project.elements.some(
      (e) =>
        e.type === 'text' &&
        (e.text_props?.binding?.includes('lead_office') ||
          e.text_props?.content?.includes('lead_office'))
    );
    const hasPartners = st.project.elements.some(
      (e) =>
        e.type === 'text' &&
        (e.text_props?.binding?.includes('partners') ||
          e.text_props?.content?.includes('partners'))
    );
    if (!hasLead) {
      st.addTextElement('custom', 'lead_office', 'Lead Office');
    }
    if (!hasPartners) {
      st.addTextElement('custom', 'partners', 'Partners');
    }
  };

  const handleBulkPasteCreate = () => {
    if (!bulkTitlesText.trim()) {
      alert('Please paste a schedule or event titles first.');
      return;
    }

    // Check if text looks like a structured schedule (contains "Activity", "Lead Office:", "Partners:", or "---")
    const looksStructured =
      pasteMode === 'schedule' ||
      /Lead Office\s*:|Activity\s+\d+|-{10,}/i.test(bulkTitlesText);

    if (looksStructured) {
      const drafts = parseStructuredScheduleText(bulkTitlesText);
      if (drafts.length > 0) {
        const records = draftsToEventRecords(
          drafts,
          replaceExistingOnPaste ? 0 : project.events.length
        );
        if (replaceExistingOnPaste) {
          setAllEvents(records);
        } else {
          setAllEvents([...project.events, ...records]);
        }
        ensureCanvasElementsForScheduleFields();
        setExpandedSecondaryFields(true);
        setBulkTitlesText('');
        return;
      }
    }

    const lines = bulkTitlesText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) {
      alert('Please enter or paste at least one event title (one per line).');
      return;
    }

    if (replaceExistingOnPaste) {
      const templateEv = project.events[0];
      const freshEvents: EventRecord[] = lines.map((titleText, i) => ({
        id: `evt_${Date.now().toString(36)}_${i}_${Math.random().toString(36).slice(2, 5)}`,
        name: titleText.length > 42 ? `${titleText.slice(0, 42)}...` : titleText,
        title: titleText,
        subtitle: templateEv?.subtitle ?? '',
        venue: templateEv?.venue ?? '',
        address: templateEv?.address ?? '',
        date: templateEv?.date ?? '',
        custom_fields: templateEv?.custom_fields ? { ...templateEv.custom_fields } : {},
        logos: [],
        element_visibility: {},
        element_overrides: {},
        order_index: i,
      }));
      setAllEvents(freshEvents);
    } else {
      addBulkEventsFromTitles(lines);
    }
    setBulkTitlesText('');
  };

  const handleLoadGadSampleSchedule = () => {
    setPasteMode('schedule');
    setBulkTitlesText(GAD_CAMPAIGN_2026_SAMPLE_TEXT);
    const drafts = parseStructuredScheduleText(GAD_CAMPAIGN_2026_SAMPLE_TEXT);
    const records = draftsToEventRecords(drafts, 0);
    setAllEvents(records);
    ensureCanvasElementsForScheduleFields();
    setExpandedSecondaryFields(true);
  };

  const handleSetExactRowCount = () => {
    const target = Math.max(1, Math.min(200, Math.round(countToGenerate)));
    const current = project.events.length;
    if (target === current) return;

    if (target > current) {
      const diff = target - current;
      const newTitles = Array.from(
        { length: diff },
        (_, i) => `EVENT TITLE VARIATION #${current + i + 1}`
      );
      addBulkEventsFromTitles(newTitles);
    } else {
      if (
        !window.confirm(
          `Reduce tarpaulin count from ${current} to ${target}? This will remove the last ${
            current - target
          } row(s).`
        )
      ) {
        return;
      }
      setAllEvents(project.events.slice(0, target));
    }
  };

  const handleUploadGlobalLogos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    setUploadingGlobalLibrary(true);
    try {
      const res = await api.uploadLogos(project.id, Array.from(fileList));
      setProject(res.project);
    } catch (err: any) {
      alert(`Logo upload failed: ${err.message}`);
    } finally {
      setUploadingGlobalLibrary(false);
      e.target.value = '';
    }
  };

  const handleUploadLogosDirectlyToEvent = async (
    eventId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    setUploadingForEventId(eventId);
    try {
      const res = await api.uploadLogos(project.id, Array.from(fileList));
      // Append newly uploaded logos directly to this event's logos array
      const targetEv = res.project.events.find((ev) => ev.id === eventId);
      const existingLogos = targetEv?.logos || [];
      const addedItems = res.uploaded.map(assetToGroupItem);
      const updatedEvents = res.project.events.map((ev) =>
        ev.id === eventId ? { ...ev, logos: [...existingLogos, ...addedItems] } : ev
      );
      const saved = await api.updateProject(project.id, {
        assets: res.project.assets,
        events: updatedEvents,
      });
      setProject(saved);
    } catch (err: any) {
      alert(`Failed to upload logos for event: ${err.message}`);
    } finally {
      setUploadingForEventId(null);
      e.target.value = '';
    }
  };

  const toggleAssetInEvent = (ev: EventRecord, asset: LogoAsset) => {
    const currentLogos = ev.logos || [];
    const exists = currentLogos.some((l) => l.asset_id === asset.id);
    if (exists) {
      updateEvent(ev.id, {
        logos: currentLogos.filter((l) => l.asset_id !== asset.id),
      });
    } else {
      updateEvent(ev.id, {
        logos: [...currentLogos, assetToGroupItem(asset)],
      });
    }
  };

  const moveEventLogo = (ev: EventRecord, logoItemId: string, dir: 'left' | 'right') => {
    const list = [...(ev.logos || [])];
    const idx = list.findIndex((l) => l.id === logoItemId);
    if (idx === -1) return;
    const targetIdx = dir === 'left' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    const [moved] = list.splice(idx, 1);
    list.splice(targetIdx, 0, moved);
    updateEvent(ev.id, { logos: list });
  };

  const removeEventLogo = (ev: EventRecord, logoItemId: string) => {
    updateEvent(ev.id, {
      logos: (ev.logos || []).filter((l) => l.id !== logoItemId),
    });
  };

  const applyFirstRowSecondaryFieldsToAll = () => {
    const first = project.events[0];
    if (!first) return;
    const updated = project.events.map((ev, idx) =>
      idx === 0
        ? ev
        : {
            ...ev,
            subtitle: first.subtitle,
            venue: first.venue,
            address: first.address,
            date: first.date,
          }
    );
    setAllEvents(updated);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header & Workflow Explanation */}
        <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-sky-950 border border-slate-800 p-6 text-white shadow-lg flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-3xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-500/20 border border-sky-400/30 text-sky-300 text-[11px] font-semibold">
              <Layers className="w-3.5 h-3.5" />
              Same Template Layout • Different Titles & Logos per Tarpaulin
            </div>
            <h2 className="text-xl font-bold tracking-tight">
              Batch Titles & Per-Tarpaulin Logos Editor
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Every row below uses the <strong>exact same visual layout</strong> configured in your
              template. Simply type or paste as many titles as you need and assign different logos
              to each row—the Logo Group will automatically resize and space each row's logos to fit
              its bounding box.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => setActiveView('editor')}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold border border-slate-700 transition flex items-center gap-1.5"
            >
              <Eye className="w-3.5 h-3.5 text-sky-400" />
              Adjust Shared Layout in Canvas
            </button>
            <button
              onClick={async () => {
                await saveProjectNow();
                setActiveView('generate');
              }}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Preview & Batch Export All ({project.events.length})
            </button>
          </div>
        </div>

        {/* Top Controls Grid: Quick Row Count + Multi-Line Title Paste + Shared Logo Pool */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Card 1: Smart Schedule Importer / Multi-Line Bulk Paste / Row Count */}
          <div className="lg:col-span-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-1.5">
                  <ListPlus className="w-4 h-4 text-sky-400" />
                  Smart Schedule Importer & Bulk Title Paste
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Paste a multi-day campaign schedule (with <code>Activity 1..N</code>,{' '}
                  <code>Lead Office</code>, <code>Description</code>, <code>Partners</code>,{' '}
                  <code>Venue</code>, <code>Dates</code>) or a simple list of titles.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleLoadGadSampleSchedule}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5 transition"
                  title="Instantly load and parse all 39 activities from the full 18-Day Orange Campaign Schedule"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Load Full 18-Day Orange Campaign (39 Activities)
                </button>

                {/* Set Exact Number of Tarpaulins */}
                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
                  <span className="text-[11px] text-slate-400 pl-1">Rows:</span>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    value={countToGenerate}
                    onChange={(e) => setCountToGenerate(Number(e.target.value))}
                    className="w-14 px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono text-center font-bold"
                  />
                  <button
                    onClick={handleSetExactRowCount}
                    className="px-2 py-0.5 rounded bg-sky-500 hover:bg-sky-400 text-white font-semibold text-[11px]"
                  >
                    Set
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => setPasteMode('schedule')}
                className={`px-2.5 py-1 rounded-md font-semibold transition ${
                  pasteMode === 'schedule'
                    ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40'
                    : 'text-slate-400 hover:bg-slate-800'
                }`}
              >
                Smart Schedule Parser (Activities / Lead Office / Partners / Venue)
              </button>
              <button
                type="button"
                onClick={() => setPasteMode('titles')}
                className={`px-2.5 py-1 rounded-md font-semibold transition ${
                  pasteMode === 'titles'
                    ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40'
                    : 'text-slate-400 hover:bg-slate-800'
                }`}
              >
                Simple Line-by-Line Titles
              </button>
            </div>

            <textarea
              rows={5}
              placeholder={
                pasteMode === 'schedule'
                  ? 'Paste your structured schedule here (e.g. DAY 1 | NOV 25, 2026 | WED, Activity 1:, Lead Office:, Description:, Partners:, Venue:)...'
                  : 'Paste multiple titles here (one title per line)...'
              }
              value={bulkTitlesText}
              onChange={(e) => setBulkTitlesText(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-xs outline-none focus:border-sky-500 font-mono"
            />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={replaceExistingOnPaste}
                  onChange={(e) => setReplaceExistingOnPaste(e.target.checked)}
                />
                <span>Replace existing rows instead of appending</span>
              </label>

              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    addEvent({ title: `NEW TARPAULIN TITLE #${project.events.length + 1}` })
                  }
                  className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5 text-sky-400" />
                  Add 1 Empty Row
                </button>
                <button
                  onClick={handleBulkPasteCreate}
                  className="px-4 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5"
                >
                  <FilePlus2 className="w-3.5 h-3.5" />
                  {pasteMode === 'schedule'
                    ? 'Parse Schedule into Tarpaulin Rows'
                    : 'Create Rows from Pasted Titles'}
                </button>
              </div>
            </div>
          </div>

          {/* Card 2: Project Logo Pool (Upload once or per-row) */}
          <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-sky-400" />
                  Logo Pool ({project.assets.length})
                </h3>
                <label className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-400 text-xs font-semibold cursor-pointer transition">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{uploadingGlobalLibrary ? 'Uploading...' : 'Upload Logos'}</span>
                  <input
                    type="file"
                    accept=".png,.jpg,.jpeg,.webp"
                    multiple
                    onChange={handleUploadGlobalLogos}
                    className="hidden"
                  />
                </label>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Upload all partner/sponsor logos here (or upload directly on any row below). Click
                any logo pill inside a row to toggle which logos appear on that specific tarpaulin.
              </p>

              {project.assets.length === 0 ? (
                <div className="p-4 rounded-lg border border-dashed border-slate-300 dark:border-slate-800 text-center text-[11px] text-slate-400">
                  No logos in pool yet. Click "Upload Logos" above.
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2 max-h-28 overflow-y-auto p-1">
                  {project.assets.map((asset) => (
                    <div
                      key={asset.id}
                      className="p-1.5 rounded bg-checkerboard border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center"
                      title={`${asset.name} (${asset.natural_width}×${asset.natural_height})`}
                    >
                      <img src={asset.url} alt={asset.name} className="h-8 object-contain" />
                      <span className="text-[9px] truncate w-full text-center mt-0.5 text-slate-400">
                        {asset.name}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2 text-[11px]">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-400 hover:text-slate-200">
                  <input
                    type="checkbox"
                    checked={expandedSecondaryFields}
                    onChange={(e) => setExpandedSecondaryFields(e.target.checked)}
                  />
                  <span>Also show Subtitle / Venue / Date columns</span>
                </label>

                {expandedSecondaryFields && project.events.length > 1 && (
                  <button
                    onClick={applyFirstRowSecondaryFieldsToAll}
                    className="text-sky-400 hover:underline font-semibold"
                    title="Copy Row #1's Subtitle, Venue, Address, and Date to all other rows"
                  >
                    Sync Row #1 Info to All
                  </button>
                )}
              </div>

              {/* Add Custom Dynamic Field Column right from Batch Editor */}
              <div className="flex items-center gap-1.5 pt-1">
                <input
                  type="text"
                  placeholder="Add dynamic field (e.g. speaker, host)"
                  value={newDynamicColName}
                  onChange={(e) => setNewDynamicColName(e.target.value)}
                  className="flex-1 px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs outline-none focus:border-sky-500"
                />
                <button
                  onClick={() => {
                    if (!newDynamicColName.trim()) return;
                    addDynamicFieldAndElement(newDynamicColName.trim(), '');
                    setNewDynamicColName('');
                  }}
                  className="px-2.5 py-1 rounded bg-sky-500 hover:bg-sky-400 text-white font-semibold text-xs shrink-0"
                >
                  + Add Dynamic Field
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Batch Rows List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Tarpaulin Variations ({project.events.length} Total — Shared Layout)
            </div>
            <div className="text-[11px] text-slate-400">
              Tip: If a row has custom logos selected, it uses those logos; if left empty, it falls
              back to the shared Logo Group ({sharedGroupLogos.length} default logos).
            </div>
          </div>

          <div className="space-y-3">
            {project.events.map((ev, idx) => {
              const rowLogos = ev.logos || [];
              const hasCustomLogos = rowLogos.length > 0;
              const effectiveLogos = hasCustomLogos ? rowLogos : sharedGroupLogos;

              return (
                <div
                  key={ev.id}
                  className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-sm hover:border-sky-500/40 transition"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                    {/* Column 1: Row Number & Actions (1 col) */}
                    <div className="lg:col-span-1 flex lg:flex-col items-center lg:items-start justify-between gap-2">
                      <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg bg-sky-500/15 text-sky-400 font-mono font-bold text-xs">
                        #{idx + 1}
                      </span>

                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={() => reorderEvent(ev.id, 'up')}
                          disabled={idx === 0}
                          className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"
                          title="Move Row Up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => reorderEvent(ev.id, 'down')}
                          disabled={idx === project.events.length - 1}
                          className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"
                          title="Move Row Down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => duplicateEvent(ev.id)}
                          className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Duplicate Row"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteEvent(ev.id)}
                          disabled={project.events.length <= 1}
                          className="p-1 rounded hover:bg-rose-500/15 text-rose-400 disabled:opacity-30"
                          title="Delete Row"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        onClick={() => {
                          setActiveEvent(ev.id);
                          setActiveView('editor');
                        }}
                        className="text-[10px] text-sky-400 hover:underline font-semibold flex items-center gap-1"
                        title="Preview this exact row on the main interactive canvas"
                      >
                        <Eye className="w-3 h-3" />
                        Canvas
                      </button>
                    </div>

                    {/* Column 2: Title Input & Optional Secondary Fields (5 cols) */}
                    <div className="lg:col-span-5 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-semibold text-slate-400">
                          Tarpaulin Title <code className="text-sky-400">{'{{event.title}}'}</code>
                        </label>
                        <input
                          type="text"
                          value={ev.name}
                          onChange={(e) => updateEvent(ev.id, { name: e.target.value })}
                          placeholder="Short label / filename"
                          className="text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-transparent focus:border-sky-500 outline-none text-right w-44"
                          title="Event label used for exported PNG filename"
                        />
                      </div>

                      <textarea
                        rows={2}
                        value={ev.title}
                        onChange={(e) =>
                          updateEvent(ev.id, {
                            title: e.target.value,
                            name:
                              ev.name.startsWith('Event Variation') ||
                              ev.name.startsWith('EVENT TITLE')
                                ? e.target.value.slice(0, 40) || ev.name
                                : ev.name,
                          })
                        }
                        placeholder="Enter main event title for this tarpaulin..."
                        className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold outline-none focus:border-sky-500"
                      />

                      {expandedSecondaryFields && (
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <div>
                            <div className="flex items-center justify-between">
                              <label className="block text-[10px] text-slate-400">Subtitle</label>
                              {project.events.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => clearStandardFieldOnOtherEvents(ev.id, 'subtitle')}
                                  className="text-[9px] text-indigo-400 hover:text-indigo-300"
                                  title="Clear Subtitle from all other tarpaulin rows (keep only on this row)"
                                >
                                  only here
                                </button>
                              )}
                            </div>
                            <input
                              type="text"
                              value={ev.subtitle}
                              onChange={(e) => updateEvent(ev.id, { subtitle: e.target.value })}
                              className="w-full px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-700 text-xs"
                            />
                          </div>
                          <div>
                            <div className="flex items-center justify-between">
                              <label className="block text-[10px] text-slate-400">Venue</label>
                              {project.events.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => clearStandardFieldOnOtherEvents(ev.id, 'venue')}
                                  className="text-[9px] text-indigo-400 hover:text-indigo-300"
                                  title="Clear Venue from all other tarpaulin rows (keep only on this row)"
                                >
                                  only here
                                </button>
                              )}
                            </div>
                            <input
                              type="text"
                              value={ev.venue}
                              onChange={(e) => updateEvent(ev.id, { venue: e.target.value })}
                              className="w-full px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-700 text-xs"
                            />
                          </div>
                          <div>
                            <div className="flex items-center justify-between">
                              <label className="block text-[10px] text-slate-400">Address</label>
                              {project.events.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => clearStandardFieldOnOtherEvents(ev.id, 'address')}
                                  className="text-[9px] text-indigo-400 hover:text-indigo-300"
                                  title="Clear Address from all other tarpaulin rows (keep only on this row)"
                                >
                                  only here
                                </button>
                              )}
                            </div>
                            <input
                              type="text"
                              value={ev.address}
                              onChange={(e) => updateEvent(ev.id, { address: e.target.value })}
                              className="w-full px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-700 text-xs"
                            />
                          </div>
                          <div>
                            <div className="flex items-center justify-between">
                              <label className="block text-[10px] text-slate-400">Date</label>
                              {project.events.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => clearStandardFieldOnOtherEvents(ev.id, 'date')}
                                  className="text-[9px] text-indigo-400 hover:text-indigo-300"
                                  title="Clear Date from all other tarpaulin rows (keep only on this row)"
                                >
                                  only here
                                </button>
                              )}
                            </div>
                            <input
                              type="text"
                              value={ev.date}
                              onChange={(e) => updateEvent(ev.id, { date: e.target.value })}
                              className="w-full px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-700 text-xs"
                            />
                          </div>
                        </div>
                      )}

                      {/* Custom & Unique Dynamic Fields for this specific row */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Dynamic & Unique Fields for Row #{idx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setAddingUniqueFieldForRow(
                                addingUniqueFieldForRow === ev.id ? null : ev.id
                              );
                              setUniqueFieldKeyInput('');
                              setUniqueFieldValInput('');
                            }}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-400 text-[10px] font-semibold transition"
                            title="Add a unique field that only applies to this tarpaulin row (automatically hidden on other rows where it is empty)"
                          >
                            <Plus className="w-3 h-3" />
                            Add Unique Field to Row #{idx + 1}
                          </button>
                        </div>

                        {addingUniqueFieldForRow === ev.id && (
                          <div className="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 space-y-2">
                            <div className="text-[10px] text-indigo-300 font-medium">
                              Create a unique field for <strong>Row #{idx + 1}</strong> (e.g.,{' '}
                              <code>special_badge</code>, <code>guest_speaker</code>,{' '}
                              <code>award_note</code>). It also adds a bound text box on the canvas
                              that stays blank on rows that don't have it.
                            </div>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                placeholder="Field key (e.g. special_badge)"
                                value={uniqueFieldKeyInput}
                                onChange={(e) => setUniqueFieldKeyInput(e.target.value)}
                                className="w-40 px-2 py-1 rounded bg-white dark:bg-slate-900 border border-indigo-500/40 text-xs outline-none"
                              />
                              <input
                                type="text"
                                placeholder="Value for this tarpaulin..."
                                value={uniqueFieldValInput}
                                onChange={(e) => setUniqueFieldValInput(e.target.value)}
                                className="flex-1 px-2 py-1 rounded bg-white dark:bg-slate-900 border border-indigo-500/40 text-xs outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  if (!uniqueFieldKeyInput.trim()) return;
                                  addUniqueFieldToRow(ev, uniqueFieldKeyInput, uniqueFieldValInput);
                                  setAddingUniqueFieldForRow(null);
                                  setUniqueFieldKeyInput('');
                                  setUniqueFieldValInput('');
                                }}
                                className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shrink-0"
                              >
                                Add
                              </button>
                            </div>
                          </div>
                        )}

                        {Object.keys(ev.custom_fields || {}).length > 0 && (
                          <div className="grid grid-cols-2 gap-2">
                            {Object.entries(ev.custom_fields || {}).map(([k, val]) => {
                              const existsOnOtherRows = project.events.some(
                                (other) =>
                                  other.id !== ev.id &&
                                  other.custom_fields &&
                                  k in other.custom_fields
                              );
                              return (
                                <div key={k}>
                                  <div className="flex items-center justify-between gap-1 mb-0.5">
                                    <label
                                      className="block text-[10px] font-mono text-sky-400 truncate"
                                      title={`Bound to {{event.custom.${k}}}`}
                                    >
                                      {k}
                                    </label>
                                    <div className="flex items-center gap-1 shrink-0">
                                      {existsOnOtherRows ? (
                                        <button
                                          type="button"
                                          onClick={() => keepDynamicFieldOnlyOnEvent(ev.id, k)}
                                          className="px-1.5 py-0.5 rounded bg-indigo-500/15 hover:bg-indigo-500/30 text-[9px] font-semibold text-indigo-300 transition"
                                          title={`Remove "${k}" from the rest of the tarpaulins and keep it ONLY on Row #${idx + 1}`}
                                        >
                                          only this row
                                        </button>
                                      ) : (
                                        <span
                                          className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-[9px] font-semibold text-emerald-400"
                                          title={`"${k}" only exists on Row #${idx + 1}`}
                                        >
                                          unique here
                                        </span>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => removeFieldFromSingleRow(ev, k)}
                                        className="px-1 py-0.5 rounded hover:bg-amber-500/15 text-[9px] text-slate-400 hover:text-amber-300 transition"
                                        title={`Remove "${k}" from Row #${idx + 1} only`}
                                      >
                                        remove here
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => removeDynamicField(k)}
                                        className="px-1 py-0.5 rounded hover:bg-rose-500/15 text-[9px] text-slate-400 hover:text-rose-400 transition"
                                        title={`Delete "${k}" from ALL rows and remove its canvas layer`}
                                      >
                                        ✕ all
                                      </button>
                                    </div>
                                  </div>
                                  <input
                                    type="text"
                                    value={val ?? ''}
                                    onChange={(e) =>
                                      updateEvent(ev.id, {
                                        custom_fields: {
                                          ...(ev.custom_fields || {}),
                                          [k]: e.target.value,
                                        },
                                      })
                                    }
                                    placeholder={`Empty (hidden on tarp #${idx + 1})`}
                                    className="w-full px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs outline-none focus:border-sky-500"
                                  />
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Column 3: Per-Tarpaulin Logos Assignment & Ordering (6 cols) */}
                    <div className="lg:col-span-6 space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-semibold text-slate-400">
                            Logos for Tarpaulin #{idx + 1}:
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                              hasCustomLogos
                                ? 'bg-sky-500/15 text-sky-400'
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                            }`}
                          >
                            {hasCustomLogos
                              ? `${rowLogos.length} Custom Logo(s)`
                              : `Using Shared (${sharedGroupLogos.length} Logos)`}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {!hasCustomLogos && sharedGroupLogos.length > 0 && (
                            <button
                              onClick={() =>
                                updateEvent(ev.id, {
                                  logos: JSON.parse(JSON.stringify(sharedGroupLogos)),
                                })
                              }
                              className="text-[10px] px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-medium"
                              title="Copy the shared logos into this row so you can customize them"
                            >
                              Customize from Shared
                            </button>
                          )}

                          {hasCustomLogos && (
                            <button
                              onClick={() => updateEvent(ev.id, { logos: [] })}
                              className="text-[10px] px-2 py-1 rounded bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 font-medium"
                              title="Clear custom logos and revert to shared template logos"
                            >
                              Reset to Shared
                            </button>
                          )}

                          <label className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-sky-500 hover:bg-sky-400 text-white text-[11px] font-semibold cursor-pointer transition">
                            <Upload className="w-3 h-3" />
                            <span>
                              {uploadingForEventId === ev.id
                                ? 'Uploading...'
                                : '+ Upload Logos for Row'}
                            </span>
                            <input
                              type="file"
                              accept=".png,.jpg,.jpeg,.webp"
                              multiple
                              onChange={(e) => handleUploadLogosDirectlyToEvent(ev.id, e)}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>

                      {/* Active Logos Strip for this Row (Reorderable & Removable) */}
                      <div className="min-h-[58px] p-2 rounded-lg bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-2">
                        {effectiveLogos.length === 0 ? (
                          <span className="text-[11px] text-slate-400 pl-1">
                            No logos assigned. Upload logos or click a logo from the quick-toggle
                            bar below.
                          </span>
                        ) : (
                          effectiveLogos.map((lg, lgIdx) => (
                            <div
                              key={lg.id}
                              className="group flex items-center gap-1.5 px-2 py-1 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm"
                            >
                              <img
                                src={lg.url}
                                alt={lg.name}
                                className="w-7 h-7 object-contain bg-checkerboard rounded p-0.5"
                              />
                              <span className="text-[11px] font-medium max-w-[90px] truncate">
                                {lg.name}
                              </span>

                              {hasCustomLogos && (
                                <div className="flex items-center gap-0.5 ml-1">
                                  <button
                                    onClick={() => moveEventLogo(ev, lg.id, 'left')}
                                    disabled={lgIdx === 0}
                                    className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-25"
                                    title="Move Left"
                                  >
                                    <ArrowLeft className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => moveEventLogo(ev, lg.id, 'right')}
                                    disabled={lgIdx === rowLogos.length - 1}
                                    className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-25"
                                    title="Move Right"
                                  >
                                    <ArrowRight className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => removeEventLogo(ev, lg.id)}
                                    className="p-0.5 rounded hover:bg-rose-500/20 text-rose-400"
                                    title="Remove Logo from this Row"
                                  >
                                    ✕
                                  </button>
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>

                      {/* Quick-Toggle Pills from Project Logo Pool */}
                      {project.assets.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                          <span className="text-[10px] text-slate-400 mr-1">
                            Toggle from Pool:
                          </span>
                          {project.assets.map((asset) => {
                            const isSelectedInRow = rowLogos.some((l) => l.asset_id === asset.id);
                            return (
                              <button
                                key={asset.id}
                                onClick={() => toggleAssetInEvent(ev, asset)}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border transition ${
                                  isSelectedInRow
                                    ? 'bg-sky-500/20 border-sky-500 text-sky-300 font-semibold'
                                    : 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-200'
                                }`}
                                title="Click to add/remove this logo for this tarpaulin variation"
                              >
                                <CheckSquare
                                  className={`w-2.5 h-2.5 ${
                                    isSelectedInRow ? 'text-sky-400' : 'opacity-30'
                                  }`}
                                />
                                <span className="truncate max-w-[90px]">{asset.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
