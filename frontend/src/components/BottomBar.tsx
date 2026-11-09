import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Grid,
  Magnet,
  Maximize2,
  Ruler,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useStudioStore } from '../store/useStudioStore';
import { validateProject } from '../utils/validation';

export const BottomBar: React.FC = () => {
  const {
    project,
    selectedElementIds,
    zoom,
    setZoom,
    setPan,
    showRulers,
    toggleRulers,
    showGuides,
    toggleGuides,
    snapEnabled,
    toggleSnap,
    saveStatus,
    statusMessage,
  } = useStudioStore();

  if (!project) return null;

  const tpl = project.template;
  const selectedEl =
    selectedElementIds.length === 1
      ? project.elements.find((e) => e.id === selectedElementIds[0])
      : null;

  const activeEvent =
    project.events.find((e) => e.id === project.active_event_id) || project.events[0] || null;
  const issues = validateProject(project, activeEvent);

  return (
    <footer className="h-9 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 px-4 flex items-center justify-between text-xs select-none shrink-0 z-20">
      {/* Left: Template Dimensions & Selected Element Summary */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-slate-800 dark:text-slate-200">Canvas:</span>
          {tpl ? (
            <span>
              {tpl.width} × {tpl.height} px ({tpl.format}) • Immutable Original
            </span>
          ) : (
            <span className="text-amber-400">No Template Uploaded</span>
          )}
        </div>

        <div className="h-3.5 w-px bg-slate-300 dark:bg-slate-700" />

        <div>
          {selectedEl ? (
            <span>
              Selected:{' '}
              <strong className="text-sky-500 dark:text-sky-400">{selectedEl.name}</strong> (X:{' '}
              {selectedEl.x.toFixed(1)}%, Y: {selectedEl.y.toFixed(1)}%, W:{' '}
              {selectedEl.width.toFixed(1)}%, H: {selectedEl.height.toFixed(1)}%)
            </span>
          ) : selectedElementIds.length > 1 ? (
            <span className="text-sky-400 font-medium">
              {selectedElementIds.length} elements selected
            </span>
          ) : (
            <span>No element selected</span>
          )}
        </div>
      </div>

      {/* Center: Canvas Aids & Zoom Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={toggleRulers}
          className={`flex items-center gap-1 px-2 py-0.5 rounded border transition ${
            showRulers
              ? 'bg-sky-500/15 border-sky-500/40 text-sky-400'
              : 'border-transparent hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title="Toggle Rulers"
        >
          <Ruler className="w-3.5 h-3.5" />
          <span>Rulers</span>
        </button>

        <button
          onClick={toggleGuides}
          className={`flex items-center gap-1 px-2 py-0.5 rounded border transition ${
            showGuides
              ? 'bg-sky-500/15 border-sky-500/40 text-sky-400'
              : 'border-transparent hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title="Toggle Alignment Guides"
        >
          <Grid className="w-3.5 h-3.5" />
          <span>Guides</span>
        </button>

        <button
          onClick={toggleSnap}
          className={`flex items-center gap-1 px-2 py-0.5 rounded border transition ${
            snapEnabled
              ? 'bg-sky-500/15 border-sky-500/40 text-sky-400'
              : 'border-transparent hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title="Toggle Snapping to Edges, Center, and Elements"
        >
          <Magnet className="w-3.5 h-3.5" />
          <span>Snap</span>
        </button>

        <div className="h-3.5 w-px bg-slate-300 dark:bg-slate-700 mx-1" />

        <button
          onClick={() => setZoom(zoom - 0.1)}
          className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
          title="Zoom Out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <span className="w-12 text-center font-mono font-semibold text-slate-800 dark:text-slate-200">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom(zoom + 0.1)}
          className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
          title="Zoom In"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => {
            setZoom(0.55);
            setPan({ x: 0, y: 0 });
          }}
          className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[11px] font-medium flex items-center gap-1"
          title="Fit Canvas to Screen"
        >
          <Maximize2 className="w-3 h-3" />
          Fit
        </button>
        <button
          onClick={() => {
            setZoom(1.0);
            setPan({ x: 0, y: 0 });
          }}
          className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[11px] font-medium"
          title="Actual Size (100%)"
        >
          100%
        </button>
      </div>

      {/* Right: Validation & Save Status */}
      <div className="flex items-center gap-3">
        {issues.length > 0 ? (
          <div
            className="flex items-center gap-1 text-amber-400 font-medium"
            title={issues.map((i) => `• ${i.message}`).join('\n')}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{issues.length} warning(s)</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Valid</span>
          </div>
        )}

        <div className="h-3.5 w-px bg-slate-300 dark:bg-slate-700" />
        <span className="truncate max-w-[220px]">{statusMessage}</span>
        <span
          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
            saveStatus === 'saved'
              ? 'bg-emerald-500/10 text-emerald-400'
              : saveStatus === 'saving'
              ? 'bg-sky-500/10 text-sky-400'
              : saveStatus === 'error'
              ? 'bg-rose-500/10 text-rose-400'
              : 'bg-amber-500/10 text-amber-400'
          }`}
        >
          {saveStatus}
        </span>
      </div>
    </footer>
  );
};
