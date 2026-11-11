import React, { useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  CopyPlus,
  Download,
  Eye,
  FileDown,
  Layers,
  Moon,
  Redo2,
  Save,
  Sparkles,
  Sun,
  Undo2,
  Upload,
} from 'lucide-react';
import { useStudioStore } from '../store/useStudioStore';
import { api } from '../api/client';

export const TopBar: React.FC = () => {
  const {
    theme,
    setTheme,
    activeView,
    setActiveView,
    project,
    setProject,
    undo,
    redo,
    historyPast,
    historyFuture,
    saveProjectNow,
    saveAsNewProject,
    saveStatus,
    setActiveEvent,
  } = useStudioStore();

  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const [replacingTpl, setReplacingTpl] = useState(false);

  const handleReplaceTemplate = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !project) return;
    const confirmed = window.confirm(
      'Replace background template?\n\nExisting element positions are stored proportionally as percentages, but if the new template has a different layout or aspect ratio, you may want to adjust element positions.'
    );
    if (!confirmed) {
      e.target.value = '';
      return;
    }
    setReplacingTpl(true);
    try {
      const updated = await api.replaceTemplate(project.id, file);
      setProject(updated);
    } catch (err: any) {
      alert(`Template replacement failed: ${err.message}`);
    } finally {
      setReplacingTpl(false);
      e.target.value = '';
    }
  };

  const handleSaveAs = async () => {
    if (!project) return;
    const newName = window.prompt('Enter name for the new project copy:', `${project.name} (v2)`);
    if (!newName || !newName.trim()) return;
    await saveAsNewProject(newName.trim());
  };

  const handleQuickSingleExport = async () => {
    if (!project) return;
    await saveProjectNow();
    try {
      const activeEventId = project.active_event_id || project.events[0]?.id;
      const res = await api.exportTarpaulins(project.id, {
        event_ids: activeEventId ? [activeEventId] : [],
        as_zip: false,
      });
      if (res.exports?.[0]) {
        const link = document.createElement('a');
        link.href = res.exports[0].url;
        link.download = res.exports[0].filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err: any) {
      alert(`Export error: ${err.message}`);
    }
  };

  return (
    <header className="h-14 border-b border-slate-800 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-4 flex items-center justify-between select-none shrink-0 z-30">
      {/* Left: Brand & Project Title */}
      <div className="flex items-center gap-3">
        {activeView !== 'dashboard' && (
          <button
            onClick={() => setActiveView('dashboard')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Dashboard
          </button>
        )}

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-sm">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-tight">Tarpaulin Studio</span>
              <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-500 font-semibold border border-sky-500/20">
                Standalone
              </span>
            </div>
          </div>
        </div>

        {project && activeView !== 'dashboard' && (
          <>
            <div className="h-5 w-px bg-slate-300 dark:bg-slate-700 mx-1" />
            {editingName ? (
              <input
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                onBlur={() => {
                  if (tempName.trim()) {
                    setProject({ ...project, name: tempName.trim() });
                    saveProjectNow();
                  }
                  setEditingName(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (tempName.trim()) {
                      setProject({ ...project, name: tempName.trim() });
                      saveProjectNow();
                    }
                    setEditingName(false);
                  }
                }}
                autoFocus
                className="px-2 py-1 text-sm font-semibold rounded bg-slate-100 dark:bg-slate-800 border border-sky-500 outline-none"
              />
            ) : (
              <button
                onClick={() => {
                  setTempName(project.name);
                  setEditingName(true);
                }}
                className="text-sm font-semibold hover:text-sky-400 transition truncate max-w-[220px]"
                title="Click to rename project"
              >
                {project.name}
              </button>
            )}

            {/* Active Event Switcher Dropdown */}
            {project.events.length > 0 && (
              <div className="flex items-center gap-1.5 ml-2 bg-slate-100 dark:bg-slate-800/90 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  Active Event:
                </span>
                <select
                  value={project.active_event_id || project.events[0]?.id || ''}
                  onChange={(e) => setActiveEvent(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-sky-600 dark:text-sky-400 outline-none cursor-pointer max-w-[200px]"
                >
                  {project.events.map((ev, i) => (
                    <option
                      key={ev.id}
                      value={ev.id}
                      className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                    >
                      #{i + 1} — {ev.name || ev.title || 'Untitled Event'}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </>
        )}
      </div>

      {/* Center: Mode Switcher when Project is open */}
      {project && activeView !== 'dashboard' && (
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveView('editor')}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition flex items-center gap-1.5 ${
              activeView === 'editor'
                ? 'bg-sky-500 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            Visual Editor
          </button>
          <button
            onClick={() => setActiveView('batch')}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition flex items-center gap-1.5 ${
              activeView === 'batch'
                ? 'bg-sky-500 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Batch Titles & Logos ({project.events.length})
          </button>
          <button
            onClick={() => setActiveView('schedule_importer')}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition flex items-center gap-1.5 ${
              activeView === 'schedule_importer'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
            title="Smart Copy-Paste Schedule Importer (Activities, Lead Office, Partners, Venue)"
          >
            <Calendar className="w-3.5 h-3.5" />
            Smart Schedule Importer
          </button>
          <button
            onClick={() => setActiveView('generate')}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition flex items-center gap-1.5 ${
              activeView === 'generate'
                ? 'bg-sky-500 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Generate & Export ({project.events.length})
          </button>
        </div>
      )}

      {/* Right: Editor Actions, Undo/Redo, Save, Export, Theme */}
      <div className="flex items-center gap-2">
        {project && activeView !== 'dashboard' && (
          <>
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-md p-0.5 border border-slate-200 dark:border-slate-700">
              <button
                onClick={undo}
                disabled={historyPast.length === 0}
                className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-35 transition"
                title="Undo (Ctrl+Z)"
              >
                <Undo2 className="w-4 h-4" />
              </button>
              <button
                onClick={redo}
                disabled={historyFuture.length === 0}
                className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-35 transition"
                title="Redo (Ctrl+Y)"
              >
                <Redo2 className="w-4 h-4" />
              </button>
            </div>

            <label
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 cursor-pointer transition"
              title="Replace Background PNG Template"
            >
              <Upload className="w-3.5 h-3.5 text-sky-400" />
              <span>{replacingTpl ? 'Replacing...' : 'Replace Template'}</span>
              <input
                type="file"
                accept=".png,.jpg,.jpeg,.webp"
                onChange={handleReplaceTemplate}
                className="hidden"
              />
            </label>

            <button
              onClick={saveProjectNow}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition"
              title="Save Project (Ctrl+S)"
            >
              {saveStatus === 'saved' ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Save className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>{saveStatus === 'saving' ? 'Saving...' : 'Save'}</span>
            </button>

            <button
              onClick={handleSaveAs}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition"
              title="Save as a new project"
            >
              <CopyPlus className="w-3.5 h-3.5" />
              <span>Save As</span>
            </button>

            <a
              href={`/api/projects/${project.id}/config-export`}
              download
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition"
              title="Export project configuration as JSON"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>JSON</span>
            </a>

            <button
              onClick={handleQuickSingleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition"
              title="Export Current Event as Full-Resolution PNG"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export PNG</span>
            </button>
          </>
        )}

        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition"
          title="Toggle Dark / Light Theme"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-700" />
          )}
        </button>
      </div>
    </header>
  );
};
