import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  CheckSquare,
  Download,
  Eye,
  Sparkles,
  Square,
} from 'lucide-react';
import { useStudioStore } from '../store/useStudioStore';
import { api } from '../api/client';
import { ExportHistoryItem } from '../types/studio';
import { validateProject } from '../utils/validation';

export const GenerateView: React.FC = () => {
  const { project, saveProjectNow, setActiveEvent, setActiveView } = useStudioStore();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [useCustomDim, setUseCustomDim] = useState(false);
  const [customWidth, setCustomWidth] = useState<number>(1920);
  const [customHeight, setCustomHeight] = useState<number>(1080);
  const [preserveAspect, setPreserveAspect] = useState(true);
  const [dpi, setDpi] = useState<number>(300);

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingZipMode, setPendingZipMode] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [lastExportResult, setLastExportResult] = useState<{
    exports: ExportHistoryItem[];
    zip: ExportHistoryItem | null;
  } | null>(null);
  const [previewEventId, setPreviewEventId] = useState<string | null>(null);
  const [cacheBust, setCacheBust] = useState<number>(Date.now());

  useEffect(() => {
    if (project) {
      // Save latest changes so backend preview thumbnails are up-to-date
      saveProjectNow().then(() => setCacheBust(Date.now()));
      setSelectedIds(project.events.map((e) => e.id));
      if (project.template) {
        setCustomWidth(project.template.width);
        setCustomHeight(project.template.height);
      }
    }
  }, [project?.id]);

  if (!project) return null;

  const tpl = project.template;
  const aspectRatio = tpl ? tpl.width / Math.max(1, tpl.height) : 16 / 9;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => setSelectedIds(project.events.map((e) => e.id));
  const deselectAll = () => setSelectedIds([]);

  const handleWidthChange = (val: number) => {
    setCustomWidth(val);
    if (preserveAspect && val > 0) {
      setCustomHeight(Math.round(val / aspectRatio));
    }
  };

  const handleHeightChange = (val: number) => {
    setCustomHeight(val);
    if (preserveAspect && val > 0) {
      setCustomWidth(Math.round(val * aspectRatio));
    }
  };

  const initiateBatchExport = (ids: string[], asZip: boolean) => {
    if (ids.length === 0) {
      alert('Please select at least one event to generate.');
      return;
    }
    setSelectedIds(ids);
    setPendingZipMode(asZip);
    setShowConfirmModal(true);
  };

  const executeConfirmedExport = async () => {
    setShowConfirmModal(false);
    setExporting(true);
    try {
      await saveProjectNow();
      const res = await api.exportTarpaulins(project.id, {
        event_ids: selectedIds,
        custom_width: useCustomDim ? customWidth : null,
        custom_height: useCustomDim ? customHeight : null,
        preserve_aspect_ratio: preserveAspect,
        dpi,
        as_zip: pendingZipMode,
      });
      setLastExportResult({ exports: res.exports, zip: res.zip });

      // Automatically trigger download of ZIP or single PNG
      if (pendingZipMode && res.zip) {
        const a = document.createElement('a');
        a.href = res.zip.url;
        a.download = res.zip.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else if (res.exports.length === 1) {
        const a = document.createElement('a');
        a.href = res.exports[0].url;
        a.download = res.exports[0].filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (err: any) {
      alert(`Batch generation failed: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  const issues = validateProject(project, project.events[0] || null);
  const outW = useCustomDim ? customWidth : tpl?.width || 1920;
  const outH = useCustomDim ? customHeight : tpl?.height || 1080;

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Summary & Controls Card */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-1">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-sky-400" />
              Batch PNG Generator & Export Studio
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              All tarpaulins are composited directly from the original template at full resolution
              using saved percentage coordinates—never browser screenshots.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={selectAll}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              <CheckSquare className="w-3.5 h-3.5 text-sky-400" />
              Select All ({project.events.length})
            </button>
            <button
              onClick={deselectAll}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              <Square className="w-3.5 h-3.5" />
              Deselect All
            </button>

            <button
              onClick={() => initiateBatchExport(selectedIds, false)}
              disabled={exporting || selectedIds.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-white disabled:opacity-40 shadow-sm transition"
            >
              <Download className="w-4 h-4" />
              Generate Selected PNGs ({selectedIds.length})
            </button>

            <button
              onClick={() =>
                initiateBatchExport(
                  project.events.map((e) => e.id),
                  true
                )
              }
              disabled={exporting || project.events.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40 shadow-sm transition"
            >
              <Archive className="w-4 h-4" />
              Export All as ZIP Archive
            </button>
          </div>
        </div>

        {/* Summary Metrics & Print Resolution Options */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pre-Generation Summary Card */}
          <div className="lg:col-span-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Generation Summary & Quality Verification
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase">Total Events</div>
                <div className="text-lg font-bold mt-0.5">{project.events.length}</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase">Selected Events</div>
                <div className="text-lg font-bold text-sky-400 mt-0.5">{selectedIds.length}</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase">Template Size</div>
                <div className="text-sm font-mono font-bold mt-1">
                  {tpl ? `${tpl.width}×${tpl.height}` : 'N/A'}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase">Export Resolution</div>
                <div className="text-sm font-mono font-bold text-emerald-400 mt-1">
                  {outW}×{outH}px
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase">Output Format</div>
                <div className="text-sm font-bold mt-1">PNG ({dpi} DPI)</div>
              </div>
            </div>

            {issues.length > 0 && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  Validation Warnings ({issues.length})
                </div>
                <ul className="list-disc list-inside text-[11px] space-y-0.5">
                  {issues.map((iss) => (
                    <li key={iss.id}>{iss.message}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Print Resolution & Custom Dimensions */}
          <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-3 text-xs">
            <div className="font-bold uppercase tracking-wider text-slate-400">
              Print Resolution & Dimensions
            </div>

            <label className="flex items-center gap-2 cursor-pointer font-medium">
              <input
                type="checkbox"
                checked={useCustomDim}
                onChange={(e) => setUseCustomDim(e.target.checked)}
              />
              <span>Override Output Pixel Dimensions</span>
            </label>

            {useCustomDim && (
              <div className="space-y-2 pt-1">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-400">Width (px)</label>
                    <input
                      type="number"
                      min="100"
                      max="20000"
                      value={customWidth}
                      onChange={(e) => handleWidthChange(Number(e.target.value))}
                      className="w-full px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-700 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400">Height (px)</label>
                    <input
                      type="number"
                      min="100"
                      max="20000"
                      value={customHeight}
                      onChange={(e) => handleHeightChange(Number(e.target.value))}
                      className="w-full px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-700 font-mono"
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-400">
                  <input
                    type="checkbox"
                    checked={preserveAspect}
                    onChange={(e) => setPreserveAspect(e.target.checked)}
                  />
                  <span>Preserve Original Aspect Ratio</span>
                </label>
              </div>
            )}

            <div>
              <label className="block text-[10px] text-slate-400 mb-1">Print DPI Metadata</label>
              <select
                value={dpi}
                onChange={(e) => setDpi(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-700"
              >
                <option value={150}>150 DPI (Standard Large-Format Tarpaulin)</option>
                <option value={300}>300 DPI (High-Resolution Print Production)</option>
                <option value={600}>600 DPI (Ultra-Fine Archival Print)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Completed Export Result Banner */}
        {lastExportResult && (
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5" />
                Successfully generated {lastExportResult.exports.length} high-resolution PNG(s)!
              </div>
              {lastExportResult.zip && (
                <a
                  href={lastExportResult.zip.url}
                  download={lastExportResult.zip.filename}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                >
                  <Archive className="w-3.5 h-3.5" />
                  Download Batch ZIP ({lastExportResult.zip.filename})
                </a>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {lastExportResult.exports.map((item) => (
                <a
                  key={item.id}
                  href={item.url}
                  download={item.filename}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900/80 border border-emerald-500/30 text-xs text-emerald-300 hover:bg-slate-900"
                >
                  <Download className="w-3 h-3" />
                  {item.event_name} ({item.width}×{item.height}px)
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Gallery of All Event Tarpaulin Previews */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {project.events.map((ev, idx) => {
            const isSelected = selectedIds.includes(ev.id);
            const previewUrl = `/api/projects/${project.id}/preview?event_id=${encodeURIComponent(
              ev.id
            )}&max_width=640&t=${cacheBust}`;

            return (
              <div
                key={ev.id}
                className={`rounded-xl bg-white dark:bg-slate-900 border overflow-hidden shadow-sm transition flex flex-col ${
                  isSelected
                    ? 'border-sky-500 ring-1 ring-sky-500/40'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                {/* Live Rendered Thumbnail */}
                <div className="h-48 bg-checkerboard relative flex items-center justify-center border-b border-slate-100 dark:border-slate-800 overflow-hidden">
                  <img
                    src={previewUrl}
                    alt={ev.name}
                    className="max-w-full max-h-full object-contain"
                  />
                  <button
                    onClick={() => toggleSelect(ev.id)}
                    className="absolute top-2.5 left-2.5 p-1.5 rounded-md bg-slate-900/80 text-white hover:bg-slate-900"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-sky-400" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                  <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded bg-slate-900/80 text-white text-[10px] font-semibold">
                    Event #{idx + 1}
                  </span>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between space-y-3 text-xs">
                  <div className="space-y-1">
                    <div className="font-bold text-sm truncate">{ev.name}</div>
                    <div className="text-slate-400 truncate font-medium">{ev.title}</div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {ev.venue} • {ev.date}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPreviewEventId(ev.id)}
                        className="flex items-center gap-1 text-sky-400 hover:underline font-semibold"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Inspect
                      </button>
                      <button
                        onClick={() => {
                          setActiveEvent(ev.id);
                          setActiveView('editor');
                        }}
                        className="text-slate-400 hover:text-white"
                      >
                        Edit in Canvas
                      </button>
                    </div>

                    <button
                      onClick={() => initiateBatchExport([ev.id], false)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 font-semibold"
                    >
                      <Download className="w-3 h-3" />
                      Export PNG
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Confirmation Step Modal before Batch Export */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl text-xs">
            <h3 className="text-base font-bold">Confirm High-Resolution Export</h3>
            <p className="text-slate-400">
              Please review the export settings before rendering full-resolution tarpaulin files:
            </p>
            <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 space-y-1.5 font-mono text-[11px]">
              <div>• Total Project Events: {project.events.length}</div>
              <div>• Selected for Export: {selectedIds.length} event(s)</div>
              <div>
                • Original Template: {tpl?.width} × {tpl?.height} px
              </div>
              <div>
                • Output Resolution: {outW} × {outH} px ({dpi} DPI)
              </div>
              <div>
                • Packaging: {pendingZipMode ? 'PNGs + Single ZIP Archive' : 'Individual PNG File(s)'}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-lg font-semibold bg-slate-200 dark:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={executeConfirmedExport}
                className="px-5 py-2 rounded-lg font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md"
              >
                Confirm & Render Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Event Preview Lightbox */}
      {previewEventId && (
        <div
          onClick={() => setPreviewEventId(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-6"
        >
          <div className="max-w-5xl max-h-[85vh] overflow-hidden rounded-xl shadow-2xl border border-slate-700 bg-checkerboard">
            <img
              src={`/api/projects/${project.id}/preview?event_id=${encodeURIComponent(
                previewEventId
              )}&max_width=1920&t=${cacheBust}`}
              alt="Full Preview"
              className="max-w-full max-h-[82vh] object-contain"
            />
          </div>
          <button
            onClick={() => setPreviewEventId(null)}
            className="mt-4 px-4 py-2 rounded-lg bg-slate-800 text-white text-xs font-semibold"
          >
            Close Preview
          </button>
        </div>
      )}
    </div>
  );
};
