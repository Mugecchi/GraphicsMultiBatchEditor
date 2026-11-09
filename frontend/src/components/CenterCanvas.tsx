import React, { useEffect, useRef, useState } from 'react';
import { RotateCw } from 'lucide-react';
import { useStudioStore } from '../store/useStudioStore';
import { computeLogoGroupLayout, resolveTextBinding } from '../utils/layoutEngine';
import { CanvasElement, LogoAsset } from '../types/studio';

type InteractionMode =
  | 'none'
  | 'pan'
  | 'drag'
  | 'resize-nw'
  | 'resize-n'
  | 'resize-ne'
  | 'resize-e'
  | 'resize-se'
  | 'resize-s'
  | 'resize-sw'
  | 'resize-w'
  | 'rotate';

interface SnapGuide {
  axis: 'x' | 'y';
  percent: number;
  label?: string;
}

export const CenterCanvas: React.FC = () => {
  const {
    project,
    selectedElementIds,
    selectElement,
    updateElement,
    addLogoElement,
    addAssetsToLogoGroup,
    pushHistory,
    zoom,
    setZoom,
    pan,
    setPan,
    showRulers,
    showGuides,
    snapEnabled,
  } = useStudioStore();

  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasBoxRef = useRef<HTMLDivElement>(null);

  const [interaction, setInteraction] = useState<{
    mode: InteractionMode;
    elementId: string;
    startClientX: number;
    startClientY: number;
    initialEl: CanvasElement;
    initialPan: { x: number; y: number };
  } | null>(null);

  const [activeGuides, setActiveGuides] = useState<SnapGuide[]>([]);

  if (!project) return null;

  const tpl = project.template;
  const tplW = tpl?.width || 1920;
  const tplH = tpl?.height || 1080;
  const displayW = tplW * zoom;
  const displayH = tplH * zoom;

  const activeEvent =
    project.events.find((e) => e.id === project.active_event_id) || project.events[0] || null;

  // Sort elements ascending by z_index for rendering bottom-to-top
  const sortedElements = [...project.elements].sort((a, b) => a.z_index - b.z_index);

  const getEffectiveElementBounds = (el: CanvasElement) => {
    const ov = activeEvent?.element_overrides?.[el.id];
    return {
      x: ov?.x ?? el.x,
      y: ov?.y ?? el.y,
      width: ov?.width ?? el.width,
      height: ov?.height ?? el.height,
      visible:
        el.visible &&
        activeEvent?.element_visibility?.[el.id] !== false &&
        ov?.visible !== false,
    };
  };

  useEffect(() => {
    if (!interaction || interaction.mode === 'none') return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!interaction) return;

      if (interaction.mode === 'pan') {
        const dx = e.clientX - interaction.startClientX;
        const dy = e.clientY - interaction.startClientY;
        setPan({
          x: interaction.initialPan.x + dx,
          y: interaction.initialPan.y + dy,
        });
        return;
      }

      const el = interaction.initialEl;
      if (el.locked) return;

      const dxPx = e.clientX - interaction.startClientX;
      const dyPx = e.clientY - interaction.startClientY;
      const dxPct = (dxPx / displayW) * 100;
      const dyPct = (dyPx / displayH) * 100;

      const SNAP_THRESH = 0.85; // percentage threshold for snapping
      const newGuides: SnapGuide[] = [];

      if (interaction.mode === 'drag') {
        let nextX = el.x + dxPct;
        let nextY = el.y + dyPct;

        if (snapEnabled) {
          // Candidate X snap targets: 0, 50, 100, and other elements' edges/centers
          const xTargets: number[] = [0, 50, 100];
          const yTargets: number[] = [0, 50, 100];

          for (const other of project.elements) {
            if (other.id === el.id || !other.visible) continue;
            xTargets.push(other.x, other.x + other.width / 2, other.x + other.width);
            yTargets.push(other.y, other.y + other.height / 2, other.y + other.height);
          }

          // Check left, center, right of dragged element against xTargets
          const myXPoints = [
            { offset: 0, val: nextX },
            { offset: el.width / 2, val: nextX + el.width / 2 },
            { offset: el.width, val: nextX + el.width },
          ];
          for (const pt of myXPoints) {
            for (const target of xTargets) {
              if (Math.abs(pt.val - target) <= SNAP_THRESH) {
                nextX = target - pt.offset;
                newGuides.push({ axis: 'x', percent: target });
                break;
              }
            }
          }

          // Check top, middle, bottom of dragged element against yTargets
          const myYPoints = [
            { offset: 0, val: nextY },
            { offset: el.height / 2, val: nextY + el.height / 2 },
            { offset: el.height, val: nextY + el.height },
          ];
          for (const pt of myYPoints) {
            for (const target of yTargets) {
              if (Math.abs(pt.val - target) <= SNAP_THRESH) {
                nextY = target - pt.offset;
                newGuides.push({ axis: 'y', percent: target });
                break;
              }
            }
          }
        }

        setActiveGuides(newGuides);
        updateElement(
          el.id,
          {
            x: Number(nextX.toFixed(2)),
            y: Number(nextY.toFixed(2)),
          },
          false
        );
        return;
      }

      if (interaction.mode === 'rotate') {
        if (!canvasBoxRef.current) return;
        const rect = canvasBoxRef.current.getBoundingClientRect();
        const centerX = rect.left + ((el.x + el.width / 2) / 100) * rect.width;
        const centerY = rect.top + ((el.y + el.height / 2) / 100) * rect.height;
        const angleRad = Math.atan2(e.clientY - centerY, e.clientX - centerX);
        let angleDeg = (angleRad * 180) / Math.PI + 90;
        if (e.shiftKey) {
          angleDeg = Math.round(angleDeg / 15) * 15;
        }
        updateElement(el.id, { rotation: Number(angleDeg.toFixed(1)) }, false);
        return;
      }

      // Resizing handles
      let { x, y, width, height } = el;
      const mode = interaction.mode;

      if (mode.includes('e')) {
        width = Math.max(2, el.width + dxPct);
      }
      if (mode.includes('s')) {
        height = Math.max(2, el.height + dyPct);
      }
      if (mode.includes('w')) {
        const proposedW = el.width - dxPct;
        if (proposedW >= 2) {
          width = proposedW;
          x = el.x + dxPct;
        }
      }
      if (mode.includes('n')) {
        const proposedH = el.height - dyPct;
        if (proposedH >= 2) {
          height = proposedH;
          y = el.y + dyPct;
        }
      }

      // Preserve aspect ratio for single logo if enabled
      if (el.type === 'logo' && el.logo_props?.preserve_aspect_ratio && (mode === 'resize-se' || mode === 'resize-nw' || mode === 'resize-ne' || mode === 'resize-sw')) {
        const ratio = el.width / Math.max(0.1, el.height);
        height = width / ratio;
      }

      updateElement(
        el.id,
        {
          x: Number(x.toFixed(2)),
          y: Number(y.toFixed(2)),
          width: Number(width.toFixed(2)),
          height: Number(height.toFixed(2)),
        },
        false
      );
    };

    const handleMouseUp = () => {
      setInteraction(null);
      setActiveGuides([]);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [interaction, displayW, displayH, snapEnabled, project.elements]);

  const startElementInteraction = (
    e: React.MouseEvent,
    el: CanvasElement,
    mode: InteractionMode
  ) => {
    e.stopPropagation();
    selectElement(el.id, e.shiftKey || e.ctrlKey);
    if (el.locked) return;
    pushHistory();
    setInteraction({
      mode,
      elementId: el.id,
      startClientX: e.clientX,
      startClientY: e.clientY,
      initialEl: JSON.parse(JSON.stringify(el)),
      initialPan: { ...pan },
    });
  };

  const handleViewportMouseDown = (e: React.MouseEvent) => {
    // Middle mouse button or Alt+Click pans the canvas; clicking empty background deselects
    if (e.button === 1 || e.altKey) {
      setInteraction({
        mode: 'pan',
        elementId: '',
        startClientX: e.clientX,
        startClientY: e.clientY,
        initialEl: {} as CanvasElement,
        initialPan: { ...pan },
      });
      return;
    }
    if (e.target === viewportRef.current) {
      selectElement(null);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.08 : -0.08;
      setZoom(zoom + delta);
    } else {
      setPan({
        x: pan.x - e.deltaX * 0.6,
        y: pan.y - e.deltaY * 0.6,
      });
    }
  };

  const handleDropLogoOnCanvas = (e: React.DragEvent) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData('application/tarp-logo-asset');
    if (!raw) return;
    try {
      const asset: LogoAsset = JSON.parse(raw);
      // Check if dropped onto a selected logo_group
      const selectedGroup = project.elements.find(
        (el) => selectedElementIds.includes(el.id) && el.type === 'logo_group'
      );
      if (selectedGroup) {
        addAssetsToLogoGroup(selectedGroup.id, [asset]);
      } else {
        addLogoElement(asset);
      }
    } catch {
      // ignore invalid drag payload
    }
  };

  return (
    <main
      ref={viewportRef}
      onMouseDown={handleViewportMouseDown}
      onWheel={handleWheel}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDropLogoOnCanvas}
      className="flex-1 relative overflow-hidden bg-slate-200/80 dark:bg-slate-950 flex items-center justify-center select-none"
    >
      {/* Top Horizontal Ruler */}
      {showRulers && (
        <div className="absolute top-0 left-6 right-0 h-6 bg-slate-100 dark:bg-slate-900 border-b border-slate-300 dark:border-slate-800 flex items-end text-[9px] font-mono text-slate-400 pointer-events-none z-20 px-2">
          {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((pct) => (
            <div key={pct} className="flex-1 border-l border-slate-400/40 pl-1 pb-0.5">
              {pct}% ({Math.round((pct / 100) * tplW)}px)
            </div>
          ))}
        </div>
      )}

      {/* Left Vertical Ruler */}
      {showRulers && (
        <div className="absolute top-6 bottom-0 left-0 w-6 bg-slate-100 dark:bg-slate-900 border-r border-slate-300 dark:border-slate-800 flex flex-col justify-between text-[9px] font-mono text-slate-400 pointer-events-none z-20 py-2">
          {[0, 20, 40, 60, 80, 100].map((pct) => (
            <div key={pct} className="border-t border-slate-400/40 pt-0.5 text-center">
              {pct}%
            </div>
          ))}
        </div>
      )}

      {/* Main Positioned Canvas Stage */}
      <div
        ref={canvasBoxRef}
        onClick={(e) => {
          if (e.target === canvasBoxRef.current) selectElement(null);
        }}
        style={{
          width: `${displayW}px`,
          height: `${displayH}px`,
          transform: `translate(${pan.x}px, ${pan.y}px)`,
        }}
        className="relative shadow-2xl bg-checkerboard ring-1 ring-slate-400/40 dark:ring-slate-700 transition-shadow"
      >
        {/* 1. IMMUTABLE ORIGINAL PNG BACKGROUND LAYER */}
        {tpl?.url ? (
          <img
            src={tpl.url}
            alt="Original Tarpaulin Template"
            draggable={false}
            onClick={() => selectElement(null)}
            className="absolute inset-0 w-full h-full object-fill pointer-events-auto select-none"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
            Upload a PNG template to begin
          </div>
        )}

        {/* Static Center Alignment Reference Lines (when Guides enabled) */}
        {showGuides && (
          <>
            <div className="absolute top-0 bottom-0 left-1/2 w-px border-l border-dashed border-sky-400/25 pointer-events-none" />
            <div className="absolute left-0 right-0 top-1/2 h-px border-t border-dashed border-sky-400/25 pointer-events-none" />
          </>
        )}

        {/* Active Dynamic Snap Guides while dragging */}
        {activeGuides.map((g, i) =>
          g.axis === 'x' ? (
            <div
              key={`gx_${i}`}
              style={{ left: `${g.percent}%` }}
              className="absolute top-0 bottom-0 w-0.5 bg-fuchsia-500 shadow pointer-events-none z-40"
            />
          ) : (
            <div
              key={`gy_${i}`}
              style={{ top: `${g.percent}%` }}
              className="absolute left-0 right-0 h-0.5 bg-fuchsia-500 shadow pointer-events-none z-40"
            />
          )
        )}

        {/* 2. EDITABLE FOREGROUND LAYERS */}
        {sortedElements.map((el) => {
          const bounds = getEffectiveElementBounds(el);
          if (!bounds.visible) return null;

          const isSelected = selectedElementIds.includes(el.id);
          const ov = activeEvent?.element_overrides?.[el.id];

          const boxPxW = (bounds.width / 100) * displayW;
          const boxPxH = (bounds.height / 100) * displayH;

          return (
            <div
              key={el.id}
              onMouseDown={(e) => startElementInteraction(e, el, 'drag')}
              style={{
                left: `${bounds.x}%`,
                top: `${bounds.y}%`,
                width: `${bounds.width}%`,
                height: `${bounds.height}%`,
                transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
                zIndex: el.z_index + 5,
              }}
              className={`absolute group ${
                el.locked ? 'cursor-not-allowed' : 'cursor-move'
              } ${
                isSelected
                  ? 'ring-2 ring-sky-400 bg-sky-500/5'
                  : 'hover:ring-1 hover:ring-sky-400/60'
              }`}
            >
              {/* ELEMENT TYPE A: TEXT */}
              {el.type === 'text' && el.text_props && (() => {
                const tp = el.text_props;
                const rawContent = ov?.text_content ?? tp.content;
                const resolvedText = resolveTextBinding(rawContent, tp.binding, activeEvent);
                const baseFontSize = ov?.font_size ?? tp.font_size;
                let scaledFontPx = baseFontSize * zoom;

                // Accurate DOM offscreen measurement for Auto-Fit Font Size inside the bounding box
                if (tp.auto_fit && resolvedText.trim().length > 0 && boxPxW > 12 && boxPxH > 12) {
                  const paragraphs = resolvedText.split('\n');
                  const lineHeightMult = Math.max(0.85, tp.line_height || 1.2);
                  let testSize = scaledFontPx;

                  // Estimate using both horizontal character width and wrapped vertical height
                  while (testSize > 8 * zoom) {
                    const avgCharW = testSize * (tp.bold ? 0.62 : 0.55) + tp.letter_spacing * zoom;
                    const maxCharsPerLine = tp.wrap
                      ? Math.max(1, Math.floor((boxPxW * 0.94) / Math.max(4, avgCharW)))
                      : 999999;

                    let totalWrappedLines = 0;
                    let widestSingleWordOrLinePx = 0;

                    for (const para of paragraphs) {
                      if (!para) {
                        totalWrappedLines += 1;
                        continue;
                      }
                      if (!tp.wrap) {
                        totalWrappedLines += 1;
                        widestSingleWordOrLinePx = Math.max(
                          widestSingleWordOrLinePx,
                          para.length * avgCharW
                        );
                      } else {
                        const words = para.split(' ');
                        let currLen = 0;
                        let linesInPara = 1;
                        for (const w of words) {
                          widestSingleWordOrLinePx = Math.max(
                            widestSingleWordOrLinePx,
                            w.length * avgCharW
                          );
                          if (currLen === 0) {
                            currLen = w.length;
                          } else if (currLen + 1 + w.length <= maxCharsPerLine) {
                            currLen += 1 + w.length;
                          } else {
                            linesInPara += 1;
                            currLen = w.length;
                          }
                        }
                        totalWrappedLines += linesInPara;
                      }
                    }

                    const totalHeightNeeded = totalWrappedLines * testSize * lineHeightMult;
                    if (
                      totalHeightNeeded <= boxPxH * 0.94 &&
                      widestSingleWordOrLinePx <= boxPxW * 0.96
                    ) {
                      break;
                    }
                    testSize *= 0.92;
                  }
                  scaledFontPx = Math.max(8 * zoom, testSize);
                }

                const textColor = ov?.color || tp.color;
                const textStroke = tp.outline_enabled
                  ? `${Math.max(0.5, tp.outline_width * zoom * 0.5)}px ${tp.outline_color}`
                  : undefined;
                const textShadow = tp.shadow_enabled
                  ? `${tp.shadow_offset_x * zoom}px ${tp.shadow_offset_y * zoom}px ${
                      tp.shadow_blur * zoom
                    }px ${tp.shadow_color}`
                  : undefined;

                const justifyContent =
                  tp.vertical_align === 'top'
                    ? 'flex-start'
                    : tp.vertical_align === 'bottom'
                    ? 'flex-end'
                    : 'center';

                return (
                  <div
                    style={{
                      fontFamily: tp.font_family,
                      fontSize: `${scaledFontPx}px`,
                      fontWeight: tp.bold ? 'bold' : 'normal',
                      fontStyle: tp.italic ? 'italic' : 'normal',
                      textDecoration: tp.underline ? 'underline' : 'none',
                      color: textColor,
                      textAlign: tp.align,
                      lineHeight: tp.line_height,
                      letterSpacing: `${tp.letter_spacing * zoom}px`,
                      whiteSpace: tp.wrap ? 'pre-wrap' : 'pre',
                      WebkitTextStroke: textStroke,
                      textShadow,
                      justifyContent,
                    }}
                    className="w-full h-full flex flex-col overflow-hidden px-1 select-none pointer-events-none break-words"
                  >
                    <span>{resolvedText}</span>
                  </div>
                );
              })()}

              {/* ELEMENT TYPE B: SINGLE LOGO */}
              {el.type === 'logo' && el.logo_props && (() => {
                const lp = el.logo_props;
                const justify =
                  lp.horizontal_align === 'left'
                    ? 'flex-start'
                    : lp.horizontal_align === 'right'
                    ? 'flex-end'
                    : 'center';
                const align =
                  lp.vertical_align === 'top'
                    ? 'flex-start'
                    : lp.vertical_align === 'bottom'
                    ? 'flex-end'
                    : 'center';

                return (
                  <div
                    style={{
                      padding: `${lp.margin}%`,
                      opacity: lp.opacity,
                      justifyContent: justify,
                      alignItems: align,
                    }}
                    className="w-full h-full flex overflow-hidden pointer-events-none"
                  >
                    {lp.url ? (
                      <img
                        src={lp.url}
                        alt={el.name}
                        style={{
                          objectFit: lp.preserve_aspect_ratio ? 'contain' : 'fill',
                        }}
                        className="max-w-full max-h-full"
                      />
                    ) : (
                      <div className="text-[10px] text-amber-300 border border-dashed border-amber-400/50 p-2 rounded">
                        No Logo Image
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* ELEMENT TYPE C: AUTO-LAYOUT LOGO GROUP */}
              {el.type === 'logo_group' && el.logo_group_props && (() => {
                const gp = { ...el.logo_group_props };
                if (ov?.arrangement) {
                  gp.arrangement = ov.arrangement;
                }
                let logosList = gp.logos || [];
                if (activeEvent?.logos && activeEvent.logos.length > 0) {
                  logosList = activeEvent.logos;
                }
                if (ov?.logo_ids) {
                  const idSet = new Set(ov.logo_ids);
                  logosList = logosList.filter(
                    (l) => idSet.has(l.id) || idSet.has(l.asset_id)
                  );
                }

                const placements = computeLogoGroupLayout(boxPxW, boxPxH, logosList, gp);

                return (
                  <div
                    style={{ opacity: gp.opacity }}
                    className="relative w-full h-full overflow-hidden pointer-events-none"
                  >
                    {placements.length === 0 ? (
                      <div className="w-full h-full border border-dashed border-sky-400/50 rounded flex items-center justify-center text-[11px] text-sky-300 bg-sky-950/30">
                        Logo Group — Upload or add logos from the Logos tab
                      </div>
                    ) : (
                      placements.map((pl) => (
                        <img
                          key={pl.id}
                          src={pl.url}
                          alt={pl.name}
                          style={{
                            position: 'absolute',
                            left: `${pl.x}px`,
                            top: `${pl.y}px`,
                            width: `${pl.width}px`,
                            height: `${pl.height}px`,
                          }}
                          className="object-contain select-none"
                        />
                      ))
                    )}
                  </div>
                );
              })()}

              {/* Element Label Pill & Resize/Rotate Handles when Selected */}
              {isSelected && (
                <>
                  <div className="absolute -top-5 left-0 px-1.5 py-0.5 rounded bg-sky-500 text-white text-[10px] font-semibold whitespace-nowrap shadow pointer-events-none">
                    {el.name} {el.locked ? '(Locked)' : ''}
                  </div>

                  {!el.locked && (
                    <>
                      {/* Rotation Handle */}
                      <div
                        onMouseDown={(e) => startElementInteraction(e, el, 'rotate')}
                        className="absolute -top-7 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-white text-slate-900 border border-sky-500 shadow flex items-center justify-center cursor-grab hover:bg-sky-100"
                        title="Drag to Rotate (Hold Shift for 15° steps)"
                      >
                        <RotateCw className="w-3 h-3" />
                      </div>

                      {/* 8 Resize Handles */}
                      {(
                        [
                          ['resize-nw', '-top-1.5 -left-1.5 cursor-nwse-resize'],
                          ['resize-n', '-top-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize'],
                          ['resize-ne', '-top-1.5 -right-1.5 cursor-nesw-resize'],
                          ['resize-e', 'top-1/2 -translate-y-1/2 -right-1.5 cursor-ew-resize'],
                          ['resize-se', '-bottom-1.5 -right-1.5 cursor-nwse-resize'],
                          ['resize-s', '-bottom-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize'],
                          ['resize-sw', '-bottom-1.5 -left-1.5 cursor-nesw-resize'],
                          ['resize-w', 'top-1/2 -translate-y-1/2 -left-1.5 cursor-ew-resize'],
                        ] as const
                      ).map(([mode, posClass]) => (
                        <div
                          key={mode}
                          onMouseDown={(e) => startElementInteraction(e, el, mode)}
                          className={`absolute w-3 h-3 rounded-sm bg-white border-2 border-sky-500 shadow ${posClass}`}
                        />
                      ))}
                    </>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
};
