import React, { useMemo, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Eye,
  FilePlus2,
  Layers,
  ListChecks,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useStudioStore } from '../store/useStudioStore';
import {
  draftsToEventRecords,
  GAD_CAMPAIGN_2026_SAMPLE_TEXT,
  ParsedActivityDraft,
  parseStructuredScheduleText,
} from '../utils/scheduleParser';

export const ScheduleImporterView: React.FC = () => {
  const {
    project,
    setAllEvents,
    setActiveEvent,
    setActiveView,
    saveProjectNow,
  } = useStudioStore();

  const [scheduleText, setScheduleText] = useState<string>('');
  const [replaceExisting, setReplaceExisting] = useState<boolean>(true);
  const [autoCreateCanvasFields, setAutoCreateCanvasFields] = useState<boolean>(true);
  const [lastImportedCount, setLastImportedCount] = useState<number | null>(null);

  const previewDrafts: ParsedActivityDraft[] = useMemo(() => {
    if (!scheduleText.trim()) return [];
    return parseStructuredScheduleText(scheduleText);
  }, [scheduleText]);

  if (!project) return null;

  const ensureCanvasElementsForScheduleFields = () => {
    const st = useStudioStore.getState();
    if (!st.project) return;

    const checks: Array<{ key: string; label: string }> = [
      { key: 'day_header', label: 'Day Header' },
      { key: 'lead_office', label: 'Lead Office' },
      { key: 'partners', label: 'Partners' },
    ];

    for (const item of checks) {
      const exists = st.project.elements.some(
        (e) =>
          e.type === 'text' &&
          (e.text_props?.binding?.includes(item.key) ||
            e.text_props?.content?.includes(item.key))
      );
      if (!exists) {
        st.addTextElement('custom', item.key, item.label);
      }
    }
  };

  const handleLoadSampleSchedule = () => {
    setScheduleText(GAD_CAMPAIGN_2026_SAMPLE_TEXT);
    setLastImportedCount(null);
  };

  const handleApplyParsedSchedule = () => {
    if (previewDrafts.length === 0) {
      alert(
        'No structured schedule activities were detected. Paste a schedule with --- headers, Activity 1:, Lead Office:, Description:, Partners:, or Venue: lines.'
      );
      return;
    }

    const startIndex = replaceExisting ? 0 : project.events.length;
    const records = draftsToEventRecords(previewDrafts, startIndex);

    if (replaceExisting) {
      setAllEvents(records);
      if (records[0]) {
        setActiveEvent(records[0].id);
      }
    } else {
      setAllEvents([...project.events, ...records]);
    }

    if (autoCreateCanvasFields) {
      ensureCanvasElementsForScheduleFields();
    }

    setLastImportedCount(records.length);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Banner Header */}
        <div className="rounded-2xl bg-gradient-to-r from-indigo-950 via-slate-900 to-sky-950 border border-indigo-500/30 p-6 text-white shadow-lg flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-3xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-[11px] font-semibold">
              <Calendar className="w-3.5 h-3.5" />
              Dedicated Feature • Smart Copy-Paste Schedule Importer
            </div>
            <h2 className="text-xl font-bold tracking-tight">
              Smart Campaign & Activity Matrix Importer
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Paste multi-day schedules formatted with <code>---</code> headers,{' '}
              <code>Activity 1..N:</code>, <code>Lead Office:</code>, <code>Description:</code>,
              scoped <code>Partners (Activities 1, 2, 3):</code>, and{' '}
              <code>Venue (Activity 4):</code>. Each activity is automatically split into its own
              tarpaulin row with live token mapping.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => setActiveView('batch')}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold border border-slate-700 transition flex items-center gap-1.5"
            >
              <Layers className="w-3.5 h-3.5 text-sky-400" />
              Go to Batch Titles & Logos ({project.events.length})
            </button>
            <button
              onClick={() => setActiveView('editor')}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold border border-slate-700 transition flex items-center gap-1.5"
            >
              <Eye className="w-3.5 h-3.5 text-sky-400" />
              Open Visual Editor
            </button>
            <button
              onClick={async () => {
                await saveProjectNow();
                setActiveView('generate');
              }}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Generate & Export ({project.events.length})
            </button>
          </div>
        </div>

        {/* Main Importer Workspace: Left = Paste & Token Mapping Guide, Right = Live Parsed Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (7 cols): Schedule Input & Controls */}
          <div className="lg:col-span-7 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-1.5">
                  <FilePlus2 className="w-4 h-4 text-indigo-400" />
                  1. Paste Structured Schedule Text
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Paste your raw calendar/matrix text below or load the 18-Day Orange Campaign
                  preset to preview before importing.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleLoadSampleSchedule}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5 transition"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Load 18-Day Orange Campaign Sample (39 Activities)
                </button>
                {scheduleText && (
                  <button
                    type="button"
                    onClick={() => {
                      setScheduleText('');
                      setLastImportedCount(null);
                    }}
                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition"
                    title="Clear text"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <textarea
              rows={15}
              value={scheduleText}
              onChange={(e) => {
                setScheduleText(e.target.value);
                setLastImportedCount(null);
              }}
              placeholder={`--------------------------------------------------------------------------------
DAY 1 | NOV 25, 2026 | WED
--------------------------------------------------------------------------------
Activity 1:
  Lead Office: GAD Office
  Description: Wellness and Essential Care Distribution for Project S.U.N.S.H.I.N.E Beneficiaries.
Activity 2:
  Lead Office: GAD Office & Office of the City Mayor
  Description: Opening Program, Orange Campaign Kickoff, Parade around the City.
Partners: All City Offices, Barangays, PNP, BFP, BJMP, CSWD, Academe, CSOs
Venue: CITYWIDE`}
              className="w-full px-3.5 py-3 rounded-xl bg-slate-50 dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 text-xs font-mono leading-relaxed outline-none focus:border-indigo-500"
            />

            {/* Options & Action Bar */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                <label className="flex items-center gap-2 cursor-pointer font-medium">
                  <input
                    type="checkbox"
                    checked={replaceExisting}
                    onChange={(e) => setReplaceExisting(e.target.checked)}
                  />
                  <span>Replace existing tarpaulin rows ({project.events.length})</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-medium">
                  <input
                    type="checkbox"
                    checked={autoCreateCanvasFields}
                    onChange={(e) => setAutoCreateCanvasFields(e.target.checked)}
                  />
                  <span>Ensure canvas text layers exist for Lead Office & Partners</span>
                </label>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-slate-700/70">
                <div className="text-xs text-slate-400">
                  Detected:{' '}
                  <strong className="text-indigo-400 font-mono">
                    {previewDrafts.length} tarpaulin activity row(s)
                  </strong>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={previewDrafts.length === 0}
                    onClick={handleApplyParsedSchedule}
                    className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-bold shadow flex items-center gap-1.5 transition"
                  >
                    <FilePlus2 className="w-4 h-4" />
                    {replaceExisting
                      ? `Parse & Replace with ${previewDrafts.length} Tarpaulin Rows`
                      : `Parse & Append ${previewDrafts.length} Tarpaulin Rows`}
                  </button>
                </div>
              </div>

              {lastImportedCount !== null && (
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Successfully imported {lastImportedCount} tarpaulin rows into your project!
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveView('batch')}
                    className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px]"
                  >
                    Review in Batch Editor →
                  </button>
                </div>
              )}
            </div>

            {/* Automatic Field Mapping Reference Card */}
            <div className="p-3.5 rounded-xl bg-indigo-500/5 border border-indigo-500/20 space-y-2 text-xs">
              <div className="font-bold text-indigo-300 text-[11px] uppercase tracking-wider">
                Automatic Dynamic Field Mapping
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 text-[11px] text-slate-400">
                <div>
                  <code className="text-sky-400">{'{{event.title}}'}</code> → Activity Description /
                  Title
                </div>
                <div>
                  <code className="text-sky-400">{'{{event.date}}'}</code> → Date (incl. per-activity
                  date overrides)
                </div>
                <div>
                  <code className="text-sky-400">{'{{event.venue}}'}</code> → Venue (incl. scoped{' '}
                  <code>Venue (Activity 4):</code>)
                </div>
                <div>
                  <code className="text-sky-400">{'{{event.custom.day_header}}'}</code> → Day Header
                </div>
                <div>
                  <code className="text-sky-400">{'{{event.custom.lead_office}}'}</code> → Lead
                  Office / Advocacy Track
                </div>
                <div>
                  <code className="text-sky-400">{'{{event.custom.partners}}'}</code> → Partners
                  (incl. scoped <code>Partners (Activities 1, 2, 3):</code>)
                </div>
              </div>
            </div>
          </div>

          {/* Right Column (5 cols): Live Parsed Activities Preview */}
          <div className="lg:col-span-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-1.5">
                <ListChecks className="w-4 h-4 text-emerald-400" />
                2. Live Parsed Tarpaulin Preview ({previewDrafts.length})
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 font-mono">
                {previewDrafts.length === 0 ? 'Waiting for input' : 'Ready to import'}
              </span>
            </div>

            {previewDrafts.length === 0 ? (
              <div className="p-8 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 text-center space-y-2 text-xs text-slate-400">
                <Calendar className="w-8 h-8 text-slate-500 mx-auto opacity-60" />
                <div className="font-semibold text-slate-300">No schedule pasted yet</div>
                <p className="text-[11px] max-w-xs mx-auto">
                  Paste a formatted schedule on the left or click{' '}
                  <strong>Load 18-Day Orange Campaign Sample</strong> to see how each activity is
                  parsed into a tarpaulin row.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[560px] overflow-y-auto pr-1">
                {previewDrafts.map((d, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 font-bold text-indigo-400 text-[11px]">
                        <span className="px-1.5 py-0.5 rounded bg-indigo-500/15 font-mono">
                          #{idx + 1}
                        </span>
                        {d.name}
                      </span>
                      <span className="text-[10px] font-mono text-amber-400">{d.date}</span>
                    </div>

                    <div className="font-bold text-slate-900 dark:text-slate-100 leading-snug">
                      {d.title}
                    </div>

                    <div className="grid grid-cols-1 gap-1 pt-1 text-[10px] text-slate-400 border-t border-slate-200/60 dark:border-slate-800/80">
                      {d.custom_fields.lead_office && (
                        <div>
                          <span className="text-slate-500 font-semibold">Lead Office:</span>{' '}
                          <span className="text-sky-300">{d.custom_fields.lead_office}</span>
                        </div>
                      )}
                      {d.venue && (
                        <div>
                          <span className="text-slate-500 font-semibold">Venue:</span>{' '}
                          <span className="text-emerald-300">{d.venue}</span>
                        </div>
                      )}
                      {d.custom_fields.partners && (
                        <div className="truncate" title={d.custom_fields.partners}>
                          <span className="text-slate-500 font-semibold">Partners:</span>{' '}
                          <span>{d.custom_fields.partners}</span>
                        </div>
                      )}
                      {d.custom_fields.special_badge && (
                        <div>
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold">
                            Badge: {d.custom_fields.special_badge}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
