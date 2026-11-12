import React, { useState } from 'react';
import {
  AlignCenter,
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignLeft,
  AlignRight,
  AlignStartHorizontal,
  AlignStartVertical,
  ArrowLeft,
  ArrowRight,
  Bold,
  CircleDot,
  Copy,
  Crop,
  Eye,
  EyeOff,
  GripVertical,
  Group,
  Italic,
  Lock,
  RotateCcw,
  Search,
  Trash2,
  Underline,
  Ungroup,
  Unlock,
} from 'lucide-react';
import { ensureFontFaceLoaded, useStudioStore } from '../store/useStudioStore';
import { ArrangementMode, TextStyle } from '../types/studio';

export const RightSidebar: React.FC = () => {
  const {
    project,
    selectedElementIds,
    availableFonts,
    updateElement,
    updateElementNested,
    deleteSelectedElements,
    duplicateSelectedElements,
    alignSelectedElements,
    groupSelectedElements,
    ungroupSelectedElements,
    removeLogoFromGroup,
    reorderLogoInGroup,
    moveLogoInGroupToIndex,
    moveEventLogoToIndex,
    replaceLogoInGroup,
    updateLogoInGroup,
    updateEventLogo,
    trimLogoAsset,
    trimAllLogoAssets,
    setElementOverride,
    clearElementOverride,
    detectLocalBrowserFonts,
    uploadCustomFont,
    addDynamicFieldAndElement,
  } = useStudioStore();

  const [draggedSidebarLogoId, setDraggedSidebarLogoId] = useState<string | null>(null);
  const [dragOverSidebarLogoId, setDragOverSidebarLogoId] = useState<string | null>(null);
  const [canDragLogoId, setCanDragLogoId] = useState<string | null>(null);
  const [sidebarLogoSearch, setSidebarLogoSearch] = useState('');

  if (!project) return null;

  const allCustomFieldKeys = Array.from(
    new Set(project.events.flatMap((ev) => Object.keys(ev.custom_fields || {})))
  );

  const selectedElements = project.elements.filter((e) => selectedElementIds.includes(e.id));
  const el = selectedElements.length === 1 ? selectedElements[0] : null;
  const activeEvent =
    project.events.find((e) => e.id === project.active_event_id) || project.events[0] || null;

  const updateTextProp = (patch: Partial<TextStyle>) => {
    if (!el || !el.text_props) return;
    updateElementNested(
      el.id,
      (draft) => {
        draft.text_props = { ...draft.text_props!, ...patch };
        return draft;
      },
      true
    );
  };

  return (
    <aside className="w-80 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col shrink-0 select-none z-20 overflow-y-auto">
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Properties Inspector
        </span>
        {el && (
          <span className="text-[10px] px-2 py-0.5 rounded bg-sky-500/15 text-sky-400 font-semibold uppercase">
            {el.type.replace('_', ' ')}
          </span>
        )}
      </div>

      {/* Alignment & Distribution Toolbar (Always available when >= 1 element selected) */}
      {selectedElements.length > 0 && (
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-2">
          <div className="text-[11px] font-semibold text-slate-400">
            Alignment & Distribution ({selectedElements.length === 1 ? 'To Canvas' : 'Selection'})
          </div>
          <div className="grid grid-cols-6 gap-1">
            <button
              onClick={() => alignSelectedElements('left')}
              className="p-1.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex justify-center"
              title="Align Left"
            >
              <AlignStartVertical className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => alignSelectedElements('center-h')}
              className="p-1.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex justify-center"
              title="Center Horizontally"
            >
              <AlignCenterVertical className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => alignSelectedElements('right')}
              className="p-1.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex justify-center"
              title="Align Right"
            >
              <AlignEndVertical className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => alignSelectedElements('top')}
              className="p-1.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex justify-center"
              title="Align Top"
            >
              <AlignStartHorizontal className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => alignSelectedElements('center-v')}
              className="p-1.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex justify-center"
              title="Center Vertically"
            >
              <AlignCenterHorizontal className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => alignSelectedElements('bottom')}
              className="p-1.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex justify-center"
              title="Align Bottom"
            >
              <AlignEndHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>

          {selectedElements.length >= 2 && (
            <div className="grid grid-cols-2 gap-1.5 pt-1">
              <button
                onClick={() => alignSelectedElements('distribute-h')}
                disabled={selectedElements.length < 3}
                className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[11px] font-medium disabled:opacity-40"
              >
                Distribute Horiz.
              </button>
              <button
                onClick={() => alignSelectedElements('distribute-v')}
                disabled={selectedElements.length < 3}
                className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[11px] font-medium disabled:opacity-40"
              >
                Distribute Vert.
              </button>
              <button
                onClick={groupSelectedElements}
                className="px-2 py-1 rounded bg-sky-500/15 text-sky-400 hover:bg-sky-500/25 text-[11px] font-semibold flex items-center justify-center gap-1"
              >
                <Group className="w-3 h-3" />
                Group
              </button>
              <button
                onClick={ungroupSelectedElements}
                className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[11px] font-medium flex items-center justify-center gap-1"
              >
                <Ungroup className="w-3 h-3" />
                Ungroup
              </button>
            </div>
          )}
        </div>
      )}

      {!el ? (
        <div className="p-6 text-center text-xs text-slate-400 space-y-2">
          {selectedElements.length > 1 ? (
            <p>{selectedElements.length} elements selected. Use alignment or group tools above.</p>
          ) : (
            <p>
              Select an element on the canvas or in the Layers list to configure its typography,
              logo layout, data binding, or position.
            </p>
          )}
        </div>
      ) : (
        <div className="p-3 space-y-5 text-xs">
          {/* SECTION 1: COMMON GEOMETRY & LAYER CONTROLS */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold uppercase tracking-wider text-slate-400 text-[11px]">
                Position & Dimensions (% of Template)
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => updateElement(el.id, { visible: !el.visible }, true)}
                  className="p-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700"
                  title="Toggle Visibility"
                >
                  {el.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => updateElement(el.id, { locked: !el.locked }, true)}
                  className="p-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700"
                  title="Lock / Unlock Position"
                >
                  {el.locked ? (
                    <Lock className="w-3.5 h-3.5 text-rose-400" />
                  ) : (
                    <Unlock className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  onClick={duplicateSelectedElements}
                  className="p-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700"
                  title="Duplicate Element"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={deleteSelectedElements}
                  className="p-1 rounded bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                  title="Delete Element"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-0.5">Layer Name</label>
              <input
                type="text"
                value={el.name}
                onChange={(e) => updateElement(el.id, { name: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] text-slate-400">X (%)</label>
                <input
                  type="number"
                  step="0.5"
                  value={el.x}
                  onChange={(e) => updateElement(el.id, { x: Number(e.target.value) }, true)}
                  className="w-full px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400">Y (%)</label>
                <input
                  type="number"
                  step="0.5"
                  value={el.y}
                  onChange={(e) => updateElement(el.id, { y: Number(e.target.value) }, true)}
                  className="w-full px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400">Rotation (°)</label>
                <input
                  type="number"
                  step="1"
                  value={el.rotation}
                  onChange={(e) =>
                    updateElement(el.id, { rotation: Number(e.target.value) }, true)
                  }
                  className="w-full px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400">Width (%)</label>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  value={el.width}
                  onChange={(e) =>
                    updateElement(el.id, { width: Math.max(1, Number(e.target.value)) }, true)
                  }
                  className="w-full px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400">Height (%)</label>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  value={el.height}
                  onChange={(e) =>
                    updateElement(el.id, { height: Math.max(1, Number(e.target.value)) }, true)
                  }
                  className="w-full px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: TEXT ELEMENT INSPECTOR */}
          {el.type === 'text' && el.text_props && (() => {
            const tp = el.text_props;
            return (
              <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <div className="font-bold uppercase tracking-wider text-sky-400 text-[11px]">
                  Text & Data Binding
                </div>

                <div>
                  <div className="flex items-center justify-between mb-0.5">
                    <label className="text-[11px] text-slate-400">
                      Dynamic Event Field Binding
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const key = window.prompt(
                          'Enter a new dynamic field name (e.g., speaker, host, sponsor_tier):'
                        );
                        if (!key || !key.trim()) return;
                        const clean = key
                          .trim()
                          .toLowerCase()
                          .replace(/[^a-z0-9_]+/g, '_')
                          .replace(/^_+|_+$/g, '');
                        if (!clean) return;
                        addDynamicFieldAndElement(clean, '');
                        const token = `{{event.custom.${clean}}}`;
                        updateTextProp({ binding: token, content: token });
                      }}
                      className="text-[10px] text-sky-400 hover:underline font-semibold"
                    >
                      + New Dynamic Field
                    </button>
                  </div>
                  <select
                    value={tp.binding || ''}
                    onChange={(e) => {
                      const val = e.target.value || null;
                      updateTextProp({
                        binding: val,
                        content: val ? val : tp.content,
                      });
                    }}
                    className="w-full px-2 py-1.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  >
                    <option value="">None (Static / Custom Text)</option>
                    <optgroup label="Standard Event Fields">
                      <option value="{{event.title}}">Event Title ({'{{event.title}}'})</option>
                      <option value="{{event.subtitle}}">Subtitle ({'{{event.subtitle}}'})</option>
                      <option value="{{event.venue}}">Venue ({'{{event.venue}}'})</option>
                      <option value="{{event.address}}">Address ({'{{event.address}}'})</option>
                      <option value="{{event.date}}">Event Date ({'{{event.date}}'})</option>
                      <option value="{{event.name}}">Event Record Name ({'{{event.name}}'})</option>
                    </optgroup>
                    {allCustomFieldKeys.length > 0 && (
                      <optgroup label="Custom Dynamic Fields">
                        {allCustomFieldKeys.map((k) => (
                          <option key={k} value={`{{event.custom.${k}}}`}>
                            {k} ({`{{event.custom.${k}}}`})
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-0.5">
                    Text Content / Template String
                  </label>
                  <textarea
                    rows={3}
                    value={tp.content}
                    onChange={(e) => updateTextProp({ content: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="col-span-2">
                    <div className="flex items-center justify-between mb-0.5">
                      <label className="text-[10px] text-slate-400">
                        Font Family ({availableFonts.length} available)
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={detectLocalBrowserFonts}
                          className="text-[10px] text-sky-400 hover:underline font-medium"
                          title="Detect all fonts installed on your computer"
                        >
                          Detect My PC Fonts
                        </button>
                        <label
                          className="text-[10px] text-emerald-400 hover:underline font-medium cursor-pointer"
                          title="Upload a custom .TTF or .OTF font file"
                        >
                          + Upload .TTF
                          <input
                            type="file"
                            accept=".ttf,.otf"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const fam = await uploadCustomFont(file);
                              if (fam) {
                                updateTextProp({ font_family: fam });
                              }
                              e.target.value = '';
                            }}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                    <select
                      value={tp.font_family}
                      onChange={(e) => {
                        ensureFontFaceLoaded(e.target.value);
                        updateTextProp({ font_family: e.target.value });
                      }}
                      style={{ fontFamily: `"${tp.font_family.replace(/"/g, '')}", sans-serif` }}
                      className="w-full px-2 py-1.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                    >
                      {availableFonts.map((f) => (
                        <option
                          key={f}
                          value={f}
                          style={{ fontFamily: `"${f.replace(/"/g, '')}", sans-serif` }}
                        >
                          {f}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] text-slate-400">Font Size (px)</label>
                    <input
                      type="number"
                      min="8"
                      max="400"
                      value={tp.font_size}
                      onChange={(e) => updateTextProp({ font_size: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                    />
                  </div>
                </div>

                {/* Style & Color Row */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded border border-slate-200 dark:border-slate-700">
                    <button
                      onClick={() => updateTextProp({ bold: !tp.bold })}
                      className={`p-1.5 rounded ${
                        tp.bold ? 'bg-sky-500 text-white' : 'hover:bg-slate-700/40'
                      }`}
                      title="Bold"
                    >
                      <Bold className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => updateTextProp({ italic: !tp.italic })}
                      className={`p-1.5 rounded ${
                        tp.italic ? 'bg-sky-500 text-white' : 'hover:bg-slate-700/40'
                      }`}
                      title="Italic"
                    >
                      <Italic className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => updateTextProp({ underline: !tp.underline })}
                      className={`p-1.5 rounded ${
                        tp.underline ? 'bg-sky-500 text-white' : 'hover:bg-slate-700/40'
                      }`}
                      title="Underline"
                    >
                      <Underline className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded border border-slate-200 dark:border-slate-700">
                    <button
                      onClick={() => updateTextProp({ align: 'left' })}
                      className={`p-1.5 rounded ${
                        tp.align === 'left' ? 'bg-sky-500 text-white' : ''
                      }`}
                      title="Align Left"
                    >
                      <AlignLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => updateTextProp({ align: 'center' })}
                      className={`p-1.5 rounded ${
                        tp.align === 'center' ? 'bg-sky-500 text-white' : ''
                      }`}
                      title="Align Center"
                    >
                      <AlignCenter className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => updateTextProp({ align: 'right' })}
                      className={`p-1.5 rounded ${
                        tp.align === 'right' ? 'bg-sky-500 text-white' : ''
                      }`}
                      title="Align Right"
                    >
                      <AlignRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <input
                    type="color"
                    value={tp.color}
                    onChange={(e) => updateTextProp({ color: e.target.value })}
                    className="w-8 h-8 rounded cursor-pointer border border-slate-600 bg-transparent"
                    title="Text Color"
                  />
                </div>

                {/* Vertical Alignment & Line/Letter Spacing */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-400">Vertical Align</label>
                    <select
                      value={tp.vertical_align}
                      onChange={(e) =>
                        updateTextProp({
                          vertical_align: e.target.value as 'top' | 'middle' | 'bottom',
                        })
                      }
                      className="w-full px-1.5 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-700"
                    >
                      <option value="top">Top</option>
                      <option value="middle">Middle</option>
                      <option value="bottom">Bottom</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400">Line Height</label>
                    <input
                      type="number"
                      step="0.05"
                      min="0.8"
                      max="3"
                      value={tp.line_height}
                      onChange={(e) => updateTextProp({ line_height: Number(e.target.value) })}
                      className="w-full px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-700 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400">Letter Space</label>
                    <input
                      type="number"
                      step="0.5"
                      min="-5"
                      max="30"
                      value={tp.letter_spacing}
                      onChange={(e) => updateTextProp({ letter_spacing: Number(e.target.value) })}
                      className="w-full px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-700 font-mono"
                    />
                  </div>
                </div>

                {/* Wrapping & Auto-fit */}
                <div className="p-2.5 rounded-lg bg-sky-500/10 border border-sky-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-sky-400">
                      <input
                        type="checkbox"
                        checked={tp.auto_fit}
                        onChange={(e) => updateTextProp({ auto_fit: e.target.checked })}
                      />
                      <span>Auto-Fit Text Inside Box</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={tp.wrap}
                        onChange={(e) => updateTextProp({ wrap: e.target.checked })}
                      />
                      <span>Word Wrap</span>
                    </label>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    When enabled, long dynamic text automatically shrinks its font size so it never
                    overflows the text box width or height.
                  </p>
                </div>

                {/* Text Outline & Shadow */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-1.5 font-semibold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={tp.outline_enabled}
                        onChange={(e) => updateTextProp({ outline_enabled: e.target.checked })}
                      />
                      <span>Text Outline (Stroke)</span>
                    </label>
                    {tp.outline_enabled && (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={tp.outline_width}
                          onChange={(e) => updateTextProp({ outline_width: Number(e.target.value) })}
                          className="w-14 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-700 font-mono"
                        />
                        <input
                          type="color"
                          value={tp.outline_color}
                          onChange={(e) => updateTextProp({ outline_color: e.target.value })}
                          className="w-6 h-6 rounded cursor-pointer"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-1.5 font-semibold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={tp.shadow_enabled}
                        onChange={(e) => updateTextProp({ shadow_enabled: e.target.checked })}
                      />
                      <span>Drop Shadow</span>
                    </label>
                    {tp.shadow_enabled && (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="0"
                          max="30"
                          value={tp.shadow_offset_y}
                          onChange={(e) =>
                            updateTextProp({
                              shadow_offset_x: Number(e.target.value),
                              shadow_offset_y: Number(e.target.value),
                            })
                          }
                          className="w-14 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-700 font-mono"
                          title="Shadow Offset (px)"
                        />
                        <input
                          type="color"
                          value={tp.shadow_color}
                          onChange={(e) => updateTextProp({ shadow_color: e.target.value })}
                          className="w-6 h-6 rounded cursor-pointer"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* SECTION 3: SINGLE LOGO INSPECTOR */}
          {el.type === 'logo' && el.logo_props && (() => {
            const lp = el.logo_props;
            return (
              <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <div className="font-bold uppercase tracking-wider text-sky-400 text-[11px]">
                  Single Logo Settings
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={lp.preserve_aspect_ratio}
                    onChange={(e) =>
                      updateElementNested(
                        el.id,
                        (d) => {
                          d.logo_props!.preserve_aspect_ratio = e.target.checked;
                          return d;
                        },
                        true
                      )
                    }
                  />
                  <span>Preserve Original Aspect Ratio (Never Stretch)</span>
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-400">Opacity</label>
                    <input
                      type="number"
                      step="0.05"
                      min="0.1"
                      max="1"
                      value={lp.opacity}
                      onChange={(e) =>
                        updateElementNested(
                          el.id,
                          (d) => {
                            d.logo_props!.opacity = Number(e.target.value);
                            return d;
                          },
                          true
                        )
                      }
                      className="w-full px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-700 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400">Margin (%)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="30"
                      value={lp.margin}
                      onChange={(e) =>
                        updateElementNested(
                          el.id,
                          (d) => {
                            d.logo_props!.margin = Number(e.target.value);
                            return d;
                          },
                          true
                        )
                      }
                      className="w-full px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-700 font-mono"
                    />
                  </div>
                </div>
              </div>
            );
          })()}

          {/* SECTION 4: DYNAMIC LOGO GROUP INSPECTOR */}
          {el.type === 'logo_group' && el.logo_group_props && (() => {
            const gp = el.logo_group_props;
            return (
              <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <div className="font-bold uppercase tracking-wider text-sky-400 text-[11px]">
                  Auto-Layout Logo Group ({gp.logos.length} Logos)
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">
                    Arrangement & Distribution Mode
                  </label>
                  <select
                    value={gp.arrangement}
                    onChange={(e) =>
                      updateElementNested(
                        el.id,
                        (d) => {
                          d.logo_group_props!.arrangement = e.target.value as ArrangementMode;
                          return d;
                        },
                        true
                      )
                    }
                    className="w-full px-2 py-1.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-700 font-semibold text-sky-400"
                  >
                    <option value="auto">✨ Smart Auto-Fit (Best Visual Balance)</option>
                    <option value="horizontal">1. Horizontal (Single Row)</option>
                    <option value="grid">2. Grid (Multi-Row & Columns)</option>
                    <option value="centered">3. Centered Arrangement</option>
                    <option value="space-between">4. Space Between (Even Width)</option>
                    <option value="space-around">5. Space Around (Balanced Outer/Inner)</option>
                  </select>
                </div>

                <label className="flex items-center justify-between gap-2 p-2 rounded-lg bg-sky-500/10 border border-sky-500/25 cursor-pointer text-[11px]">
                  <div>
                    <div className="font-semibold text-sky-400">
                      Optical Shape Balance (Rectangles + Circles)
                    </div>
                    <div className="text-[9px] text-slate-400">
                      Balances wide rectangular banners with round/square seals so none look oversized or cut off
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(gp.optical_balance || gp.arrangement === 'auto')}
                    onChange={(e) =>
                      updateElementNested(
                        el.id,
                        (d) => {
                          d.logo_group_props!.optical_balance = e.target.checked;
                          return d;
                        },
                        true
                      )
                    }
                    className="accent-sky-500 w-4 h-4 shrink-0"
                  />
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-400">Max Logo Height (%)</label>
                    <input
                      type="number"
                      min="10"
                      max="100"
                      value={gp.max_logo_height}
                      onChange={(e) =>
                        updateElementNested(
                          el.id,
                          (d) => {
                            d.logo_group_props!.max_logo_height = Number(e.target.value);
                            return d;
                          },
                          true
                        )
                      }
                      className="w-full px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-700 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400">Max Logo Width (%)</label>
                    <input
                      type="number"
                      min="5"
                      max="100"
                      value={gp.max_logo_width}
                      onChange={(e) =>
                        updateElementNested(
                          el.id,
                          (d) => {
                            d.logo_group_props!.max_logo_width = Number(e.target.value);
                            return d;
                          },
                          true
                        )
                      }
                      className="w-full px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-700 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400">Horiz. Spacing (%)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="25"
                      value={gp.horizontal_spacing}
                      onChange={(e) =>
                        updateElementNested(
                          el.id,
                          (d) => {
                            d.logo_group_props!.horizontal_spacing = Number(e.target.value);
                            return d;
                          },
                          true
                        )
                      }
                      className="w-full px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-700 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400">Vert. Spacing (%)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="25"
                      value={gp.vertical_spacing}
                      onChange={(e) =>
                        updateElementNested(
                          el.id,
                          (d) => {
                            d.logo_group_props!.vertical_spacing = Number(e.target.value);
                            return d;
                          },
                          true
                        )
                      }
                      className="w-full px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-700 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400">Max Logos / Row</label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={gp.max_logos_per_row}
                      onChange={(e) =>
                        updateElementNested(
                          el.id,
                          (d) => {
                            d.logo_group_props!.max_logos_per_row = Math.max(
                              1,
                              Number(e.target.value)
                            );
                            return d;
                          },
                          true
                        )
                      }
                      className="w-full px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-700 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400">Row Alignment</label>
                    <select
                      value={gp.alignment}
                      onChange={(e) =>
                        updateElementNested(
                          el.id,
                          (d) => {
                            d.logo_group_props!.alignment = e.target.value as
                              | 'left'
                              | 'center'
                              | 'right';
                            return d;
                          },
                          true
                        )
                      }
                      className="w-full px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-700"
                    >
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                      <option value="right">Right</option>
                    </select>
                  </div>
                </div>

                {/* Ordered Logos Inside Group + Per-Logo Size/Width/Height Controls */}
                <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between gap-1">
                    <div className="text-[11px] font-semibold text-slate-400">
                      Individual Logos (Size, Fit & Order)
                    </div>
                    <div className="flex items-center gap-1">
                      {project.assets.length > 0 && (
                        <button
                          type="button"
                          onClick={() => trimAllLogoAssets('auto')}
                          className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 font-semibold flex items-center gap-1 transition"
                          title="Auto-crop empty square/transparent/white canvas borders around all logos in this project"
                        >
                          <Crop className="w-2.5 h-2.5" />
                          Trim All Spaces
                        </button>
                      )}
                      {activeEvent?.logos && activeEvent.logos.length > 0 && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-400 font-semibold">
                          Custom Row
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    Drag the <strong>top handle</strong> to reorder. Use <strong>Trim</strong> or{' '}
                    <strong>Circle Fit</strong> if a round logo has an empty square canvas around it.
                  </p>
                  {(() => {
                    const isEditingEventLogos = Boolean(
                      activeEvent?.logos && activeEvent.logos.length > 0
                    );
                    const activeLogosList = isEditingEventLogos
                      ? activeEvent!.logos
                      : gp.logos;

                    const handlePatchLogoItem = (
                      itemId: string,
                      patch: Partial<(typeof activeLogosList)[0]>
                    ) => {
                      if (isEditingEventLogos && activeEvent) {
                        updateEventLogo(activeEvent.id, itemId, patch, true);
                      } else {
                        updateLogoInGroup(el.id, itemId, patch, true);
                      }
                    };

                    if (activeLogosList.length === 0) {
                      return (
                        <div className="p-3 rounded border border-dashed border-slate-700 text-center text-[11px] text-slate-500">
                          Open the "Logos" tab on the left to upload or add logos to this group.
                        </div>
                      );
                    }

                    const visibleSidebarLogos = activeLogosList.filter((item) => {
                      const q = sidebarLogoSearch.trim().toLowerCase();
                      if (!q) return true;
                      return item.name.toLowerCase().includes(q);
                    });

                    return (
                      <div className="space-y-2">
                        {activeLogosList.length > 2 && (
                          <div className="relative">
                            <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-2" />
                            <input
                              type="text"
                              placeholder="Search active logos..."
                              value={sidebarLogoSearch}
                              onChange={(e) => setSidebarLogoSearch(e.target.value)}
                              className="w-full pl-7 pr-6 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] outline-none focus:border-sky-500"
                            />
                            {sidebarLogoSearch && (
                              <button
                                type="button"
                                onClick={() => setSidebarLogoSearch('')}
                                className="absolute right-2 top-1 text-[10px] text-slate-400 hover:text-slate-200"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        )}
                        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                          {visibleSidebarLogos.map((item, idx) => {
                          const scalePct = Math.round((item.scale_override ?? 1) * 100);
                          const wScalePct = Math.round((item.width_scale ?? 1) * 100);
                          const hScalePct = Math.round((item.height_scale ?? 1) * 100);
                          const isSquareForced = Math.abs((item.aspect_ratio || 1) - 1) < 0.01;
                          const isDragTarget =
                            draggedSidebarLogoId &&
                            dragOverSidebarLogoId === item.id &&
                            draggedSidebarLogoId !== item.id;

                          return (
                            <div
                              key={item.id}
                              draggable={canDragLogoId === item.id}
                              onDragStart={(e) => {
                                if (canDragLogoId !== item.id) {
                                  e.preventDefault();
                                  return;
                                }
                                setDraggedSidebarLogoId(item.id);
                                e.dataTransfer.effectAllowed = 'move';
                              }}
                              onDragOver={(e) => {
                                e.preventDefault();
                                if (draggedSidebarLogoId) {
                                  setDragOverSidebarLogoId(item.id);
                                }
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                if (draggedSidebarLogoId && draggedSidebarLogoId !== item.id) {
                                  if (isEditingEventLogos && activeEvent) {
                                    moveEventLogoToIndex(
                                      activeEvent.id,
                                      draggedSidebarLogoId,
                                      item.id
                                    );
                                  } else {
                                    moveLogoInGroupToIndex(el.id, draggedSidebarLogoId, item.id);
                                  }
                                }
                                setDraggedSidebarLogoId(null);
                                setDragOverSidebarLogoId(null);
                                setCanDragLogoId(null);
                              }}
                              onDragEnd={() => {
                                setDraggedSidebarLogoId(null);
                                setDragOverSidebarLogoId(null);
                                setCanDragLogoId(null);
                              }}
                              className={`p-2 rounded-lg bg-slate-50 dark:bg-slate-800/70 border space-y-1.5 transition ${
                                isDragTarget
                                  ? 'border-sky-400 ring-2 ring-sky-400/50'
                                  : 'border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <div
                                  onMouseDown={() => setCanDragLogoId(item.id)}
                                  onMouseUp={() => setCanDragLogoId(null)}
                                  className="flex items-center gap-1.5 min-w-0 cursor-grab active:cursor-grabbing flex-1"
                                  title="Drag here to reorder logo position"
                                >
                                  <GripVertical className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <img
                                    src={item.url}
                                    alt={item.name}
                                    draggable={false}
                                    className="w-8 h-8 object-contain bg-checkerboard rounded p-0.5 shrink-0"
                                  />
                                  <div className="truncate">
                                    <div className="text-[11px] font-semibold truncate">
                                      {item.name}
                                    </div>
                                    {!isEditingEventLogos && project.assets.length > 1 && (
                                      <select
                                        value={item.asset_id}
                                        onMouseDown={(e) => {
                                          e.stopPropagation();
                                          setCanDragLogoId(null);
                                        }}
                                        onChange={(e) => {
                                          const replacement = project.assets.find(
                                            (a) => a.id === e.target.value
                                          );
                                          if (replacement) {
                                            replaceLogoInGroup(el.id, item.id, replacement);
                                          }
                                        }}
                                        className="text-[9px] bg-transparent text-sky-400 outline-none cursor-pointer"
                                        title="Replace with another uploaded logo"
                                      >
                                        {project.assets.map((a) => (
                                          <option
                                            key={a.id}
                                            value={a.id}
                                            className="bg-slate-900 text-slate-100"
                                          >
                                            Swap: {a.name}
                                          </option>
                                        ))}
                                      </select>
                                    )}
                                  </div>
                                </div>

                                <div
                                  onMouseDown={(e) => {
                                    e.stopPropagation();
                                    setCanDragLogoId(null);
                                  }}
                                  className="flex items-center gap-0.5 shrink-0"
                                >
                                  <button
                                    type="button"
                                    onClick={() => trimLogoAsset(item.asset_id, 'auto')}
                                    className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 flex items-center gap-0.5 transition"
                                    title="Tightly crop empty transparent or white square space around this logo"
                                  >
                                    <Crop className="w-2.5 h-2.5" />
                                    Trim
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => trimLogoAsset(item.asset_id, 'circle')}
                                    className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 flex items-center gap-0.5 transition"
                                    title="Fit & mask this logo into a clean 1:1 transparent circle (removes square corners around round seals)"
                                  >
                                    <CircleDot className="w-2.5 h-2.5" />
                                    Circle
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handlePatchLogoItem(item.id, {
                                        aspect_ratio: isSquareForced
                                          ? item.natural_width /
                                            Math.max(1, item.natural_height)
                                          : 1.0,
                                        width_scale: 1.0,
                                        height_scale: 1.0,
                                      })
                                    }
                                    className={`px-1.5 py-0.5 rounded text-[9px] font-semibold transition ${
                                      isSquareForced
                                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                                        : 'bg-slate-200 dark:bg-slate-700 text-slate-300 hover:bg-slate-600'
                                    }`}
                                    title="Force 1:1 equal height and width box"
                                  >
                                    1:1
                                  </button>
                                  {!isEditingEventLogos && (
                                    <>
                                      <button
                                        onClick={() => reorderLogoInGroup(el.id, item.id, 'left')}
                                        disabled={idx === 0}
                                        className="p-1 rounded hover:bg-slate-700 disabled:opacity-30"
                                        title="Move Earlier"
                                      >
                                        <ArrowLeft className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={() => reorderLogoInGroup(el.id, item.id, 'right')}
                                        disabled={idx === activeLogosList.length - 1}
                                        className="p-1 rounded hover:bg-slate-700 disabled:opacity-30"
                                        title="Move Later"
                                      >
                                        <ArrowRight className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={() => removeLogoFromGroup(el.id, item.id)}
                                        className="p-1 rounded hover:bg-rose-500/20 text-rose-400"
                                        title="Remove from Group"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* Per-logo Individual Scale, Width %, and Height % controls (Never triggers drag) */}
                              <div
                                draggable={false}
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  setCanDragLogoId(null);
                                }}
                                onDragStart={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                }}
                                className="grid grid-cols-3 gap-1.5 pt-1 border-t border-slate-200/60 dark:border-slate-700/60 text-[10px]"
                              >
                                <div>
                                  <div className="flex items-center justify-between text-slate-400">
                                    <span>Size</span>
                                    <span className="font-mono text-sky-400">{scalePct}%</span>
                                  </div>
                                  <input
                                    type="range"
                                    min={30}
                                    max={220}
                                    step={5}
                                    value={scalePct}
                                    onChange={(e) =>
                                      handlePatchLogoItem(item.id, {
                                        scale_override: Number(e.target.value) / 100,
                                      })
                                    }
                                    className="w-full accent-sky-500 cursor-pointer"
                                    title="Overall scale multiplier for this specific logo"
                                  />
                                </div>

                                <div>
                                  <div className="flex items-center justify-between text-slate-400">
                                    <span>Width</span>
                                    <span className="font-mono text-indigo-400">{wScalePct}%</span>
                                  </div>
                                  <input
                                    type="range"
                                    min={40}
                                    max={200}
                                    step={5}
                                    value={wScalePct}
                                    onChange={(e) =>
                                      handlePatchLogoItem(item.id, {
                                        width_scale: Number(e.target.value) / 100,
                                      })
                                    }
                                    className="w-full accent-indigo-500 cursor-pointer"
                                    title="Adjust individual logo width independently"
                                  />
                                </div>

                                <div>
                                  <div className="flex items-center justify-between text-slate-400">
                                    <span>Height</span>
                                    <span className="font-mono text-emerald-400">{hScalePct}%</span>
                                  </div>
                                  <input
                                    type="range"
                                    min={40}
                                    max={200}
                                    step={5}
                                    value={hScalePct}
                                    onChange={(e) =>
                                      handlePatchLogoItem(item.id, {
                                        height_scale: Number(e.target.value) / 100,
                                      })
                                    }
                                    className="w-full accent-emerald-500 cursor-pointer"
                                    title="Adjust individual logo height independently"
                                  />
                                </div>
                              </div>

                              {(scalePct !== 100 || wScalePct !== 100 || hScalePct !== 100) && (
                                <div className="flex justify-end">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handlePatchLogoItem(item.id, {
                                        scale_override: 1.0,
                                        width_scale: 1.0,
                                        height_scale: 1.0,
                                      })
                                    }
                                    className="text-[9px] text-slate-400 hover:text-sky-400 underline"
                                  >
                                    Reset to 100%
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            );
          })()}

          {/* SECTION 5: PER-EVENT OVERRIDES FOR CURRENT ACTIVE EVENT */}
          {activeEvent && (
            <div className="space-y-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="font-bold uppercase tracking-wider text-amber-400 text-[11px]">
                  Per-Event Override ({activeEvent.name})
                </span>
                {activeEvent.element_overrides?.[el.id] && (
                  <button
                    onClick={() => clearElementOverride(activeEvent.id, el.id)}
                    className="flex items-center gap-1 text-[10px] text-rose-400 hover:underline"
                    title="Reset override for this event"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset
                  </button>
                )}
              </div>

              <p className="text-[10px] text-slate-400">
                Customize this element specifically for <strong>{activeEvent.name}</strong> without
                affecting other events.
              </p>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={activeEvent.element_overrides?.[el.id]?.visible !== false}
                  onChange={(e) =>
                    setElementOverride(activeEvent.id, el.id, { visible: e.target.checked })
                  }
                />
                <span>Visible in "{activeEvent.name}"</span>
              </label>

              {el.type === 'text' && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="col-span-2">
                    <label className="block text-[10px] text-slate-400">
                      Override Text for this Event
                    </label>
                    <input
                      type="text"
                      placeholder="Leave blank to use shared binding"
                      value={activeEvent.element_overrides?.[el.id]?.text_content ?? ''}
                      onChange={(e) =>
                        setElementOverride(activeEvent.id, el.id, {
                          text_content: e.target.value || null,
                        })
                      }
                      className="w-full px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-700"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400">Override Font Size</label>
                    <input
                      type="number"
                      placeholder="Shared"
                      value={activeEvent.element_overrides?.[el.id]?.font_size ?? ''}
                      onChange={(e) =>
                        setElementOverride(activeEvent.id, el.id, {
                          font_size: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      className="w-full px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-700 font-mono"
                    />
                  </div>
                </div>
              )}

              {el.type === 'logo_group' && (
                <div>
                  <label className="block text-[10px] text-slate-400">
                    Override Arrangement for this Event
                  </label>
                  <select
                    value={activeEvent.element_overrides?.[el.id]?.arrangement || ''}
                    onChange={(e) =>
                      setElementOverride(activeEvent.id, el.id, {
                        arrangement: (e.target.value || null) as ArrangementMode | null,
                      })
                    }
                    className="w-full px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-700"
                  >
                    <option value="">Use Shared Arrangement</option>
                    <option value="horizontal">Horizontal</option>
                    <option value="grid">Grid</option>
                    <option value="centered">Centered</option>
                    <option value="space-between">Space Between</option>
                    <option value="space-around">Space Around</option>
                  </select>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </aside>
  );
};
