import React, { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Calendar,
  Copy,
  Eye,
  EyeOff,
  FolderPlus,
  Image as ImageIcon,
  Layers,
  Lock,
  Plus,
  Search,
  Trash2,
  Type,
  Unlock,
  Upload,
} from 'lucide-react';
import { useStudioStore } from '../store/useStudioStore';
import { api } from '../api/client';
import { LogoAsset } from '../types/studio';

export const LeftSidebar: React.FC = () => {
  const {
    leftTab,
    setLeftTab,
    project,
    setProject,
    selectedElementIds,
    selectElement,
    addTextElement,
    addLogoElement,
    addLogoGroupElement,
    addAssetsToLogoGroup,
    updateElement,
    deleteSelectedElements,
    duplicateSelectedElements,
    reorderElementLayer,
    setActiveEvent,
    addEvent,
    duplicateEvent,
    updateEvent,
    deleteEvent,
    reorderEvent,
  } = useStudioStore();

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState('');
  const [uploadingLogos, setUploadingLogos] = useState(false);
  const [eventSearch, setEventSearch] = useState('');
  const [newCustomKey, setNewCustomKey] = useState('');
  const [newCustomVal, setNewCustomVal] = useState('');

  if (!project) return null;

  // Sort layers top-to-bottom (highest z_index at top of list)
  const sortedElements = [...project.elements].sort((a, b) => b.z_index - a.z_index);
  const activeEvent =
    project.events.find((e) => e.id === project.active_event_id) || project.events[0] || null;

  const selectedLogoGroup = project.elements.find(
    (e) => selectedElementIds.includes(e.id) && e.type === 'logo_group'
  );

  const handleMultiLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    setUploadingLogos(true);
    try {
      const files = Array.from(fileList);
      const res = await api.uploadLogos(project.id, files);
      setProject(res.project);

      // If a Logo Group is currently selected, automatically append uploaded logos into it
      if (selectedLogoGroup && res.uploaded.length > 0) {
        addAssetsToLogoGroup(selectedLogoGroup.id, res.uploaded);
      }
    } catch (err: any) {
      alert(`Logo upload failed: ${err.message}`);
    } finally {
      setUploadingLogos(false);
      e.target.value = '';
    }
  };

  const handleAddAssetToActiveGroupOrCanvas = (asset: LogoAsset) => {
    const groupEl =
      selectedLogoGroup || project.elements.find((e) => e.type === 'logo_group');
    if (groupEl) {
      addAssetsToLogoGroup(groupEl.id, [asset]);
      selectElement(groupEl.id);
    } else {
      addLogoElement(asset);
    }
  };

  const filteredEvents = project.events.filter((ev) => {
    const q = eventSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      ev.name.toLowerCase().includes(q) ||
      ev.title.toLowerCase().includes(q) ||
      ev.venue.toLowerCase().includes(q) ||
      ev.date.toLowerCase().includes(q)
    );
  });

  return (
    <aside className="w-80 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col shrink-0 select-none z-20">
      {/* Navigation Tabs */}
      <div className="grid grid-cols-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 p-1 gap-1">
        <button
          onClick={() => setLeftTab('layers')}
          className={`flex flex-col items-center py-1.5 rounded text-[11px] font-semibold transition ${
            leftTab === 'layers'
              ? 'bg-sky-500 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
          }`}
        >
          <Layers className="w-3.5 h-3.5 mb-0.5" />
          Layers
        </button>

        <button
          onClick={() => setLeftTab('elements')}
          className={`flex flex-col items-center py-1.5 rounded text-[11px] font-semibold transition ${
            leftTab === 'elements'
              ? 'bg-sky-500 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
          }`}
        >
          <Type className="w-3.5 h-3.5 mb-0.5" />
          Add Items
        </button>

        <button
          onClick={() => setLeftTab('logos')}
          className={`flex flex-col items-center py-1.5 rounded text-[11px] font-semibold transition ${
            leftTab === 'logos'
              ? 'bg-sky-500 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5 mb-0.5" />
          Logos ({project.assets.length})
        </button>

        <button
          onClick={() => setLeftTab('events')}
          className={`flex flex-col items-center py-1.5 rounded text-[11px] font-semibold transition ${
            leftTab === 'events'
              ? 'bg-sky-500 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
          }`}
        >
          <Calendar className="w-3.5 h-3.5 mb-0.5" />
          Events ({project.events.length})
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* TAB 1: LAYERS */}
        {leftTab === 'layers' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Design Layers ({project.elements.length + 1})
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={duplicateSelectedElements}
                  disabled={selectedElementIds.length === 0}
                  className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"
                  title="Duplicate Selected Layer (Ctrl+D)"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={deleteSelectedElements}
                  disabled={selectedElementIds.length === 0}
                  className="p-1 rounded hover:bg-rose-500/15 text-rose-400 disabled:opacity-30"
                  title="Delete Selected Layer (Delete)"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              {sortedElements.map((el) => {
                const isSelected = selectedElementIds.includes(el.id);
                return (
                  <div
                    key={el.id}
                    onClick={(e) => selectElement(el.id, e.shiftKey || e.ctrlKey)}
                    className={`group flex items-center justify-between px-2.5 py-2 rounded-lg border text-xs cursor-pointer transition ${
                      isSelected
                        ? 'bg-sky-500/15 border-sky-500 text-sky-600 dark:text-sky-300 font-semibold'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono uppercase shrink-0">
                        {el.type === 'logo_group' ? 'GRP' : el.type === 'logo' ? 'IMG' : 'TXT'}
                      </span>

                      {renamingId === el.id ? (
                        <input
                          type="text"
                          value={renameVal}
                          onChange={(e) => setRenameVal(e.target.value)}
                          onBlur={() => {
                            if (renameVal.trim()) {
                              updateElement(el.id, { name: renameVal.trim() }, true);
                            }
                            setRenamingId(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              if (renameVal.trim()) {
                                updateElement(el.id, { name: renameVal.trim() }, true);
                              }
                              setRenamingId(null);
                            }
                          }}
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                          className="w-full px-1 py-0.5 rounded bg-white dark:bg-slate-900 border border-sky-500 text-xs outline-none"
                        />
                      ) : (
                        <span
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            setRenamingId(el.id);
                            setRenameVal(el.name);
                          }}
                          className="truncate"
                          title="Double-click to rename layer"
                        >
                          {el.name}
                        </span>
                      )}
                    </div>

                    <div
                      className="flex items-center gap-0.5 shrink-0 ml-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => reorderElementLayer(el.id, 'up')}
                        className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
                        title="Bring Forward"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => reorderElementLayer(el.id, 'down')}
                        className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
                        title="Send Backward"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => updateElement(el.id, { visible: !el.visible }, true)}
                        className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
                        title={el.visible ? 'Hide Layer' : 'Show Layer'}
                      >
                        {el.visible ? (
                          <Eye className="w-3.5 h-3.5 text-slate-500" />
                        ) : (
                          <EyeOff className="w-3.5 h-3.5 text-amber-500" />
                        )}
                      </button>
                      <button
                        onClick={() => updateElement(el.id, { locked: !el.locked }, true)}
                        className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
                        title={el.locked ? 'Unlock Layer' : 'Lock Layer'}
                      >
                        {el.locked ? (
                          <Lock className="w-3.5 h-3.5 text-rose-400" />
                        ) : (
                          <Unlock className="w-3.5 h-3.5 text-slate-400" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Immutable Background Template Layer */}
              <div className="flex items-center justify-between px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-950/70 text-xs text-slate-500">
                <div className="flex items-center gap-2 truncate">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-mono uppercase">
                    BG
                  </span>
                  <span className="truncate font-medium">
                    {project.template?.filename || 'Background Template'}
                  </span>
                </div>
                <span
                  className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold"
                  title="Original template pixels are locked and never modified"
                >
                  <Lock className="w-3 h-3" />
                  Immutable
                </span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ADD ELEMENTS */}
        {leftTab === 'elements' && (
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Dynamic Event Text Fields
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2.5">
                Bound text elements automatically update when you switch between events.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { role: 'title', label: 'Event Title', token: '{{event.title}}' },
                  { role: 'subtitle', label: 'Subtitle', token: '{{event.subtitle}}' },
                  { role: 'venue', label: 'Venue', token: '{{event.venue}}' },
                  { role: 'address', label: 'Address', token: '{{event.address}}' },
                  { role: 'date', label: 'Event Date', token: '{{event.date}}' },
                  { role: 'custom', label: 'Custom Text', token: 'Static / Custom' },
                ].map((item) => (
                  <button
                    key={item.role}
                    onClick={() => addTextElement(item.role)}
                    className="flex flex-col items-start p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:border-sky-500 transition text-left"
                  >
                    <span className="text-xs font-semibold flex items-center gap-1">
                      <Plus className="w-3 h-3 text-sky-400" />
                      {item.label}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 mt-0.5">
                      {item.token}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Logo Containers
              </h4>
              <button
                onClick={() => addLogoGroupElement(project.assets)}
                className="w-full p-3 rounded-xl border border-sky-500/40 bg-sky-500/10 hover:bg-sky-500/20 text-left transition space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                    <FolderPlus className="w-4 h-4" />
                    Add Auto-Layout Logo Group
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Automatically resizes, spaces, and centers multiple logos (Horizontal, Grid,
                  Centered, Space-Between, Space-Around).
                </p>
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: DYNAMIC LOGOS MANAGER */}
        {leftTab === 'logos' && (
          <div className="space-y-4">
            <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-sky-500/50 hover:border-sky-400 rounded-xl bg-sky-500/5 cursor-pointer transition text-center">
              <Upload className="w-6 h-6 text-sky-400 mb-1.5" />
              <span className="text-xs font-semibold text-sky-400">
                {uploadingLogos ? 'Uploading Logos...' : 'Upload Multiple Logos'}
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5">
                PNG (transparent), JPG, WEBP supported
              </span>
              <input
                type="file"
                accept=".png,.jpg,.jpeg,.webp"
                multiple
                onChange={handleMultiLogoUpload}
                className="hidden"
              />
            </label>

            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Uploaded Logo Library ({project.assets.length})
              </span>
              {project.assets.length > 0 && (
                <button
                  onClick={() => {
                    const grp = project.elements.find((e) => e.type === 'logo_group');
                    if (grp) {
                      addAssetsToLogoGroup(grp.id, project.assets);
                      selectElement(grp.id);
                    } else {
                      addLogoGroupElement(project.assets);
                    }
                  }}
                  className="text-[11px] text-sky-400 hover:underline font-semibold"
                >
                  + Add All to Logo Group
                </button>
              )}
            </div>

            {project.assets.length === 0 ? (
              <div className="text-xs text-slate-500 text-center py-6 border border-slate-200 dark:border-slate-800 rounded-lg">
                No logos uploaded yet. Upload partner or sponsor logos above.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                {project.assets.map((asset) => (
                  <div
                    key={asset.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('application/tarp-logo-asset', JSON.stringify(asset));
                    }}
                    className="group p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 hover:border-sky-500 transition flex flex-col justify-between"
                  >
                    <div className="h-16 bg-checkerboard rounded flex items-center justify-center p-1.5 overflow-hidden">
                      <img
                        src={asset.url}
                        alt={asset.name}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <div className="mt-1.5">
                      <div className="text-[11px] font-semibold truncate" title={asset.name}>
                        {asset.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {asset.natural_width}×{asset.natural_height}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-1 mt-2">
                      <button
                        onClick={() => handleAddAssetToActiveGroupOrCanvas(asset)}
                        className="px-1.5 py-1 rounded bg-sky-500/15 hover:bg-sky-500/30 text-sky-400 text-[10px] font-semibold"
                        title="Add to Logo Group"
                      >
                        + Group
                      </button>
                      <button
                        onClick={() => addLogoElement(asset)}
                        className="px-1.5 py-1 rounded bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-[10px] font-semibold"
                        title="Add as standalone single logo layer"
                      >
                        + Single
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: EVENTS MANAGER */}
        {leftTab === 'events' && (
          <div className="space-y-3">
            <button
              onClick={() => useStudioStore.getState().setActiveView('batch')}
              className="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-bold shadow flex items-center justify-center gap-1.5 transition"
            >
              <Layers className="w-3.5 h-3.5" />
              Open Full Batch Titles & Logos Editor
            </button>

            <div className="flex items-center justify-between gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                <input
                  type="text"
                  placeholder="Search events..."
                  value={eventSearch}
                  onChange={(e) => setEventSearch(e.target.value)}
                  className="w-full pl-8 pr-2 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs outline-none focus:border-sky-500"
                />
              </div>
              <button
                onClick={() => addEvent()}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                New Event
              </button>
            </div>

            {/* Event List */}
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
              {filteredEvents.map((ev, idx) => {
                const isActive = activeEvent?.id === ev.id;
                return (
                  <div
                    key={ev.id}
                    onClick={() => setActiveEvent(ev.id)}
                    className={`flex items-center justify-between px-2.5 py-2 rounded-lg border text-xs cursor-pointer transition ${
                      isActive
                        ? 'bg-sky-500/15 border-sky-500 text-sky-400 font-semibold'
                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <div className="truncate">
                        #{idx + 1} {ev.name || 'Untitled Event'}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">{ev.title}</div>
                    </div>
                    <div
                      className="flex items-center gap-0.5 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => reorderEvent(ev.id, 'up')}
                        className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => reorderEvent(ev.id, 'down')}
                        className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => duplicateEvent(ev.id)}
                        className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
                        title="Duplicate Event"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => deleteEvent(ev.id)}
                        className="p-1 rounded hover:bg-rose-500/15 text-rose-400"
                        title="Delete Event"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Active Event Record Editor */}
            {activeEvent && (
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="text-xs font-bold uppercase tracking-wider text-sky-400">
                  Editing Event Data
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-0.5">
                    Event Record Name
                  </label>
                  <input
                    type="text"
                    value={activeEvent.name}
                    onChange={(e) => updateEvent(activeEvent.id, { name: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-0.5">
                    Main Title <code className="text-sky-400">{'{{event.title}}'}</code>
                  </label>
                  <textarea
                    rows={2}
                    value={activeEvent.title}
                    onChange={(e) => updateEvent(activeEvent.id, { title: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-0.5">
                    Subtitle <code className="text-sky-400">{'{{event.subtitle}}'}</code>
                  </label>
                  <input
                    type="text"
                    value={activeEvent.subtitle}
                    onChange={(e) => updateEvent(activeEvent.id, { subtitle: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-0.5">
                    Venue <code className="text-sky-400">{'{{event.venue}}'}</code>
                  </label>
                  <input
                    type="text"
                    value={activeEvent.venue}
                    onChange={(e) => updateEvent(activeEvent.id, { venue: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-0.5">
                    Address <code className="text-sky-400">{'{{event.address}}'}</code>
                  </label>
                  <input
                    type="text"
                    value={activeEvent.address}
                    onChange={(e) => updateEvent(activeEvent.id, { address: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-0.5">
                    Event Date <code className="text-sky-400">{'{{event.date}}'}</code>
                  </label>
                  <input
                    type="text"
                    value={activeEvent.date}
                    onChange={(e) => updateEvent(activeEvent.id, { date: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs outline-none focus:border-sky-500"
                  />
                </div>

                {/* Custom Fields */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="text-[11px] font-semibold text-slate-400">
                    Custom Fields ({'{{event.custom.key}}'})
                  </div>
                  {Object.entries(activeEvent.custom_fields || {}).map(([k, v]) => (
                    <div key={k} className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono px-1.5 py-1 rounded bg-slate-800 text-sky-400">
                        {k}
                      </span>
                      <input
                        type="text"
                        value={v}
                        onChange={(e) =>
                          updateEvent(activeEvent.id, {
                            custom_fields: {
                              ...activeEvent.custom_fields,
                              [k]: e.target.value,
                            },
                          })
                        }
                        className="flex-1 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-700 text-xs"
                      />
                      <button
                        onClick={() => {
                          const next = { ...activeEvent.custom_fields };
                          delete next[k];
                          updateEvent(activeEvent.id, { custom_fields: next });
                        }}
                        className="text-rose-400 hover:text-rose-300 px-1"
                      >
                        ✕
                      </button>
                    </div>
                  ))}

                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      placeholder="key"
                      value={newCustomKey}
                      onChange={(e) => setNewCustomKey(e.target.value)}
                      className="w-20 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-700 text-xs"
                    />
                    <input
                      type="text"
                      placeholder="value"
                      value={newCustomVal}
                      onChange={(e) => setNewCustomVal(e.target.value)}
                      className="flex-1 px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-700 text-xs"
                    />
                    <button
                      onClick={() => {
                        const cleanKey = newCustomKey.trim().replace(/\s+/g, '_');
                        if (!cleanKey) return;
                        updateEvent(activeEvent.id, {
                          custom_fields: {
                            ...(activeEvent.custom_fields || {}),
                            [cleanKey]: newCustomVal,
                          },
                        });
                        setNewCustomKey('');
                        setNewCustomVal('');
                      }}
                      className="px-2 py-1 rounded bg-sky-500 text-white text-xs font-semibold"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
