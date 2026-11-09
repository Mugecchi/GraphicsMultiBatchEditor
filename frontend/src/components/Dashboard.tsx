import React, { useEffect, useState } from 'react';
import {
  Calendar,
  Copy,
  Download,
  FileJson,
  FolderOpen,
  Image as ImageIcon,
  Layers,
  Plus,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import { DashboardSummary, ProjectData } from '../types/studio';
import { api } from '../api/client';
import { useStudioStore } from '../store/useStudioStore';

export const Dashboard: React.FC = () => {
  const { setProject, setActiveView } = useStudioStore();
  const [data, setData] = useState<DashboardSummary>({
    projects: [],
    saved_templates: [],
    recent_exports: [],
  });
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Create project form state
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newIsTemplate, setNewIsTemplate] = useState(false);
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [templatePreviewUrl, setTemplatePreviewUrl] = useState<string | null>(null);
  const [templateDimensions, setTemplateDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSelectTemplateFile = (file: File | null) => {
    if (templatePreviewUrl) {
      URL.revokeObjectURL(templatePreviewUrl);
    }
    setTemplateFile(file);
    setTemplateDimensions(null);
    if (!file) {
      setTemplatePreviewUrl(null);
      return;
    }
    const objUrl = URL.createObjectURL(file);
    setTemplatePreviewUrl(objUrl);

    const img = new Image();
    img.onload = () => {
      setTemplateDimensions({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = objUrl;

    if (!newName.trim()) {
      const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ');
      setNewName(baseName);
    }
  };

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const summary = await api.getDashboard();
      setData(summary);
    } catch (err: any) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleOpenProject = async (proj: ProjectData) => {
    try {
      const fresh = await api.getProject(proj.id);
      setProject(fresh);
      setActiveView('editor');
    } catch (err: any) {
      alert(`Could not open project: ${err.message}`);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      setErrorMsg('Please enter a project name.');
      return;
    }
    if (!templateFile) {
      setErrorMsg('Please upload a PNG/JPG/WEBP tarpaulin background template.');
      return;
    }
    setCreating(true);
    setErrorMsg('');
    try {
      const fd = new FormData();
      fd.append('name', newName.trim());
      fd.append('description', newDesc.trim());
      fd.append('is_template', String(newIsTemplate));
      fd.append('init_defaults', 'true');
      fd.append('template_file', templateFile);
      const created = await api.createProject(fd);
      setShowCreateModal(false);
      setNewName('');
      setNewDesc('');
      handleSelectTemplateFile(null);
      setProject(created);
      setActiveView('editor');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create project.');
    } finally {
      setCreating(false);
    }
  };

  const handleCreateDemo = async () => {
    setCreating(true);
    try {
      const demo = await api.createDemoProject();
      setProject(demo);
      setActiveView('editor');
    } catch (err: any) {
      alert(`Failed to create demo project: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  const handleDuplicate = async (projId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.duplicateProject(projId);
      await fetchDashboard();
    } catch (err: any) {
      alert(`Duplicate failed: ${err.message}`);
    }
  };

  const handleDelete = async (proj: ProjectData, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Delete project "${proj.name}"? A backup snapshot will be retained.`)) {
      return;
    }
    try {
      await api.deleteProject(proj.id);
      await fetchDashboard();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imported = await api.importProjectConfig(file);
      setProject(imported);
      setActiveView('editor');
    } catch (err: any) {
      alert(`Import failed: ${err.message}`);
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-8">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Hero / Quick Actions Banner */}
        <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950 border border-slate-800 p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/15 border border-sky-500/30 text-sky-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              Standalone Event Tarpaulin Designer & Batch PNG Generator
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Welcome to Tarpaulin Studio</h1>
            <p className="text-slate-300 text-sm leading-relaxed">
              Upload your original PNG tarpaulin background, visually position dynamic event text and
              auto-resizing partner logo groups, preview multiple event variations live, and batch
              export full-resolution print-ready PNGs or ZIP archives locally.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-semibold text-sm shadow-lg shadow-sky-500/25 transition"
            >
              <Plus className="w-4 h-4" />
              Create New Project
            </button>

            <button
              onClick={handleCreateDemo}
              disabled={creating}
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-indigo-600/80 hover:bg-indigo-600 text-white font-semibold text-sm border border-indigo-400/30 transition"
            >
              <Sparkles className="w-4 h-4" />
              {creating ? 'Loading...' : 'Load Full 18-Day Orange Campaign (39 Tarps)'}
            </button>

            <label className="flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-slate-700 cursor-pointer transition">
              <FileJson className="w-4 h-4 text-sky-400" />
              Import JSON Config
              <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
            </label>
          </div>
        </div>

        {/* Section 1: Recent Projects */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold tracking-tight">Recent Projects</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Open, duplicate, or manage your saved tarpaulin projects
              </p>
            </div>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-200 dark:bg-slate-800">
              {data.projects.length} project(s)
            </span>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="h-64 rounded-xl bg-slate-200/50 dark:bg-slate-900/50 animate-pulse border border-slate-200 dark:border-slate-800"
                />
              ))}
            </div>
          ) : data.projects.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-800 p-12 text-center space-y-3 bg-white/50 dark:bg-slate-900/40">
              <Layers className="w-10 h-10 text-slate-400 mx-auto" />
              <div className="font-semibold text-sm">No projects yet</div>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Click "Create New Project" to upload your own PNG template, or click "Load 5-Event
                Sample Roadshow" to explore a complete multi-event setup immediately.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.projects.map((proj) => (
                <div
                  key={proj.id}
                  onClick={() => handleOpenProject(proj)}
                  className="group rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-sky-500/60 dark:hover:border-sky-500/60 overflow-hidden shadow-sm hover:shadow-md transition cursor-pointer flex flex-col"
                >
                  {/* Thumbnail */}
                  <div className="h-44 bg-checkerboard relative overflow-hidden flex items-center justify-center border-b border-slate-100 dark:border-slate-800">
                    {proj.template?.url ? (
                      <img
                        src={`/api/projects/${proj.id}/preview?max_width=480&t=${encodeURIComponent(
                          proj.updated_at
                        )}`}
                        alt={proj.name}
                        className="max-h-full max-w-full object-contain group-hover:scale-105 transition duration-300"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-slate-400 text-xs">
                        <ImageIcon className="w-8 h-8" />
                        <span>No template</span>
                      </div>
                    )}
                    {proj.template && (
                      <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-slate-900/85 text-white text-[10px] font-mono">
                        {proj.template.width}×{proj.template.height}px
                      </span>
                    )}
                    {proj.is_template && (
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-indigo-600 text-white text-[10px] font-semibold">
                        Saved Template
                      </span>
                    )}
                  </div>

                  {/* Details */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <h3 className="font-bold text-sm truncate group-hover:text-sky-500 transition">
                        {proj.name}
                      </h3>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-sky-400" />
                          {proj.events?.length || 0} Event Design(s)
                        </span>
                        <span>•</span>
                        <span>{new Date(proj.updated_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenProject(proj);
                        }}
                        className="flex items-center gap-1 text-xs font-semibold text-sky-500 hover:text-sky-400"
                      >
                        <FolderOpen className="w-3.5 h-3.5" />
                        Open Project
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => handleDuplicate(proj.id, e)}
                          className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition"
                          title="Duplicate Project"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDelete(proj, e)}
                          className="p-1.5 rounded hover:bg-rose-500/10 text-slate-500 hover:text-rose-500 transition"
                          title="Delete Project"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Section 2: Saved Templates */}
        {data.saved_templates.length > 0 && (
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-bold tracking-tight">Saved Templates</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Reusable configured templates ready for new event batches
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {data.saved_templates.map((tpl) => (
                <div
                  key={tpl.id}
                  onClick={() => handleOpenProject(tpl)}
                  className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500/60 cursor-pointer transition flex items-center justify-between"
                >
                  <div className="truncate pr-2">
                    <div className="font-semibold text-sm truncate">{tpl.name}</div>
                    <div className="text-[11px] text-slate-400">
                      {tpl.template
                        ? `${tpl.template.width}×${tpl.template.height}px`
                        : 'No image'}{' '}
                      • {tpl.elements.length} layers
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDuplicate(tpl.id, e)}
                    className="px-2.5 py-1 rounded bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 text-xs font-semibold shrink-0"
                  >
                    Use Template
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Section 3: Recent Exports */}
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-bold tracking-tight">Recent Exports</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              High-resolution PNG files and batch ZIP archives generated on this machine
            </p>
          </div>
          {data.recent_exports.length === 0 ? (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-6 text-xs text-slate-500 bg-white dark:bg-slate-900">
              No exports generated yet. Open a project and click "Export PNG" or use "Batch Generate
              & Export".
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800/70 text-slate-500 dark:text-slate-400 uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-4">File</th>
                    <th className="py-2.5 px-4">Project</th>
                    <th className="py-2.5 px-4">Event / Batch</th>
                    <th className="py-2.5 px-4">Resolution</th>
                    <th className="py-2.5 px-4">Type</th>
                    <th className="py-2.5 px-4 text-right">Download</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {data.recent_exports.slice(0, 10).map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-4 font-mono text-[11px] truncate max-w-[220px]">
                        {exp.filename}
                      </td>
                      <td className="py-2.5 px-4 font-medium">{exp.project_name}</td>
                      <td className="py-2.5 px-4 text-slate-500 dark:text-slate-400">
                        {exp.event_name}
                      </td>
                      <td className="py-2.5 px-4 font-mono">
                        {exp.width}×{exp.height}px
                      </td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded font-semibold text-[10px] ${
                            exp.export_type === 'ZIP'
                              ? 'bg-purple-500/15 text-purple-400'
                              : 'bg-emerald-500/15 text-emerald-400'
                          }`}
                        >
                          {exp.export_type}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <a
                          href={exp.url}
                          download={exp.filename}
                          className="inline-flex items-center gap-1 text-sky-500 hover:text-sky-400 font-semibold"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Download
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Create New Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Create New Tarpaulin Project</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Project Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., 2026 National Science Congress Tarpaulin"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Description (Optional)</label>
                <input
                  type="text"
                  placeholder="Notes about print size or regional series"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">
                  Upload Background Template (PNG, JPG, WEBP) *
                </label>
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-sky-500 rounded-xl p-4 cursor-pointer transition bg-slate-50 dark:bg-slate-800/40">
                  {templatePreviewUrl ? (
                    <div className="w-full space-y-2.5 text-center">
                      <div className="relative h-48 w-full bg-checkerboard rounded-lg overflow-hidden flex items-center justify-center border border-slate-200 dark:border-slate-700">
                        <img
                          src={templatePreviewUrl}
                          alt="Template Preview"
                          className="max-h-full max-w-full object-contain"
                        />
                        {templateDimensions && (
                          <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-slate-900/90 text-emerald-400 font-mono text-[11px] font-bold shadow">
                            {templateDimensions.width} × {templateDimensions.height} px
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-xs px-1">
                        <span className="font-semibold text-sky-400 truncate max-w-[260px]">
                          {templateFile?.name} ({((templateFile?.size || 0) / 1024).toFixed(1)} KB)
                        </span>
                        <span className="text-[11px] underline text-slate-400 hover:text-white">
                          Click to change image
                        </span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-7 h-7 text-sky-400 mb-2" />
                      <span className="text-xs font-medium text-center">
                        Click to select your original PNG tarpaulin template
                      </span>
                      <span className="text-[11px] text-slate-400 mt-1">
                        Original pixel dimensions and design are preserved 100% untouched.
                      </span>
                    </>
                  )}
                  <input
                    type="file"
                    accept=".png,.jpg,.jpeg,.webp"
                    onChange={(e) => handleSelectTemplateFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </label>
              </div>

              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={newIsTemplate}
                  onChange={(e) => setNewIsTemplate(e.target.checked)}
                  className="rounded border-slate-600"
                />
                <span>Also list this project under "Saved Templates" on the Dashboard</span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 rounded-lg text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-white shadow-md"
                >
                  {creating ? 'Creating Project...' : 'Create & Open Editor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
