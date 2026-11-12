import React, { useState } from "react";
import {
	ArrowDown,
	ArrowLeft,
	ArrowRight,
	ArrowUp,
	Calendar,
	CheckSquare,
	CircleDot,
	Copy,
	Crop,
	Eye,
	FilePlus2,
	GripVertical,
	Image as ImageIcon,
	Layers,
	ListPlus,
	Pencil,
	Plus,
	Search,
	Sparkles,
	Trash2,
	Upload,
} from "lucide-react";
import { useStudioStore } from "../store/useStudioStore";
import { api } from "../api/client";
import { EventRecord, LogoAsset, LogoGroupItem } from "../types/studio";

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
		addLogoGroupElement,
		addAssetsToLogoGroup,
		removeLogoFromGroup,
		reorderLogoInGroup,
		moveLogoInGroupToIndex,
		moveEventLogoToIndex,
		updateLogoInGroup,
		updateEventLogo,
		trimLogoAsset,
		trimAllLogoAssets,
		renameLogoAsset,
		deleteLogoAsset,
		updateElementNested,
	} = useStudioStore();

	const [renamingPoolAssetId, setRenamingPoolAssetId] = useState<string | null>(
		null,
	);
	const [renamePoolVal, setRenamePoolVal] = useState("");
	const [poolLogoSearch, setPoolLogoSearch] = useState("");
	const [rowLogoSearches, setRowLogoSearches] = useState<
		Record<string, string>
	>({});

	const [bulkTitlesText, setBulkTitlesText] = useState("");
	const [countToGenerate, setCountToGenerate] = useState<number>(5);
	const [replaceExistingOnPaste, setReplaceExistingOnPaste] = useState(false);
	const [keepLogosOnPaste, setKeepLogosOnPaste] = useState(true);
	const [uploadingForEventId, setUploadingForEventId] = useState<string | null>(
		null,
	);
	const [uploadingGlobalLibrary, setUploadingGlobalLibrary] = useState(false);
	const [expandedSecondaryFields, setExpandedSecondaryFields] = useState(true);
	const [newDynamicColName, setNewDynamicColName] = useState("");
	const [addingUniqueFieldForRow, setAddingUniqueFieldForRow] = useState<
		string | null
	>(null);
	const [uniqueFieldKeyInput, setUniqueFieldKeyInput] = useState("");
	const [uniqueFieldValInput, setUniqueFieldValInput] = useState("");
	const [draggedLogoInfo, setDraggedLogoInfo] = useState<{
		scope: string; // 'shared' or eventId
		itemId: string;
	} | null>(null);
	const [dragOverLogoId, setDragOverLogoId] = useState<string | null>(null);

	if (!project) return null;

	// Separate global fields (present on most rows) vs unique fields
	const addUniqueFieldToRow = (
		ev: EventRecord,
		rawKey: string,
		val: string,
	) => {
		const cleanKey = rawKey
			.trim()
			.toLowerCase()
			.replace(/[^a-z0-9_]+/g, "_")
			.replace(/^_+|_+$/g, "");
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
				el.type === "text" &&
				(el.text_props?.binding === token ||
					el.text_props?.content?.includes(token)),
		);
		if (!existsOnCanvas) {
			st.addTextElement("custom", cleanKey, `Unique: ${cleanKey}`);
		}
	};

	const removeFieldFromSingleRow = (ev: EventRecord, keyToRemove: string) => {
		const nextCustom = { ...(ev.custom_fields || {}) };
		delete nextCustom[keyToRemove];
		updateEvent(ev.id, { custom_fields: nextCustom });
	};

	// Find shared Logo Group element so users can see/copy shared logos if desired
	const sharedLogoGroup = project.elements.find((e) => e.type === "logo_group");
	const sharedGroupLogos = sharedLogoGroup?.logo_group_props?.logos || [];

	const toggleAssetInSharedGroup = (asset: LogoAsset) => {
		if (!sharedLogoGroup) {
			addLogoGroupElement([asset]);
			return;
		}
		const existingItem = sharedGroupLogos.find((l) => l.asset_id === asset.id);
		if (existingItem) {
			removeLogoFromGroup(sharedLogoGroup.id, existingItem.id);
		} else {
			addAssetsToLogoGroup(sharedLogoGroup.id, [asset]);
		}
	};

	const clearAllSharedGroupLogos = () => {
		if (!sharedLogoGroup) return;
		updateElementNested(
			sharedLogoGroup.id,
			(el) => {
				if (el.logo_group_props) {
					el.logo_group_props.logos = [];
				}
				return el;
			},
			true,
		);
	};

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

	const handleBulkPasteCreate = () => {
		const lines = bulkTitlesText
			.split(/\r?\n/)
			.map((l) => l.trim())
			.filter(Boolean);
		if (lines.length === 0) {
			alert("Please enter or paste at least one event title (one per line).");
			return;
		}

		if (replaceExistingOnPaste) {
			const templateEv = project.events[0];
			const freshEvents: EventRecord[] = lines.map((titleText, i) => {
				const existingRow = project.events[i];
				return {
					id:
						existingRow?.id ||
						`evt_${Date.now().toString(36)}_${i}_${Math.random().toString(36).slice(2, 5)}`,
					name:
						titleText.length > 42 ? `${titleText.slice(0, 42)}...` : titleText,
					title: titleText,
					subtitle: existingRow?.subtitle ?? templateEv?.subtitle ?? "",
					venue: existingRow?.venue ?? templateEv?.venue ?? "",
					address: existingRow?.address ?? templateEv?.address ?? "",
					date: existingRow?.date ?? templateEv?.date ?? "",
					custom_fields: existingRow?.custom_fields
						? { ...existingRow.custom_fields }
						: templateEv?.custom_fields
							? { ...templateEv.custom_fields }
							: {},
					logos:
						keepLogosOnPaste && existingRow?.logos
							? JSON.parse(JSON.stringify(existingRow.logos))
							: [],
					element_visibility:
						keepLogosOnPaste && existingRow?.element_visibility
							? { ...existingRow.element_visibility }
							: {},
					element_overrides:
						keepLogosOnPaste && existingRow?.element_overrides
							? JSON.parse(JSON.stringify(existingRow.element_overrides))
							: {},
					order_index: i,
				};
			});
			setAllEvents(freshEvents);
		} else {
			addBulkEventsFromTitles(lines);
		}
		setBulkTitlesText("");
	};

	const handleSetExactRowCount = () => {
		const target = Math.max(1, Math.min(200, Math.round(countToGenerate)));
		const current = project.events.length;
		if (target === current) return;

		if (target > current) {
			const diff = target - current;
			const newTitles = Array.from(
				{ length: diff },
				(_, i) => `EVENT TITLE VARIATION #${current + i + 1}`,
			);
			addBulkEventsFromTitles(newTitles);
		} else {
			if (
				!window.confirm(
					`Reduce tarpaulin count from ${current} to ${target}? This will remove the last ${
						current - target
					} row(s).`,
				)
			) {
				return;
			}
			setAllEvents(project.events.slice(0, target));
		}
	};

	const handleUploadGlobalLogos = async (
		e: React.ChangeEvent<HTMLInputElement>,
	) => {
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
			e.target.value = "";
		}
	};

	const handleUploadLogosDirectlyToEvent = async (
		eventId: string,
		e: React.ChangeEvent<HTMLInputElement>,
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
				ev.id === eventId
					? { ...ev, logos: [...existingLogos, ...addedItems] }
					: ev,
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
			e.target.value = "";
		}
	};

	const toggleAssetInEvent = (ev: EventRecord, asset: LogoAsset) => {
		const hasCustom = Boolean(ev.logos && ev.logos.length > 0);
		const baseList: LogoGroupItem[] = hasCustom
			? [...(ev.logos || [])]
			: JSON.parse(JSON.stringify(sharedGroupLogos));
		const exists = baseList.some((l) => l.asset_id === asset.id);
		if (exists) {
			updateEvent(ev.id, {
				logos: baseList.filter((l) => l.asset_id !== asset.id),
			});
		} else {
			updateEvent(ev.id, {
				logos: [...baseList, assetToGroupItem(asset)],
			});
		}
	};

	const moveEventLogo = (
		ev: EventRecord,
		logoItemId: string,
		dir: "left" | "right",
	) => {
		const list = [...(ev.logos || [])];
		const idx = list.findIndex((l) => l.id === logoItemId);
		if (idx === -1) return;
		const targetIdx = dir === "left" ? idx - 1 : idx + 1;
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
					},
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
							Every row below uses the <strong>exact same visual layout</strong>{" "}
							configured in your template. Simply type or paste as many titles
							as you need and assign different logos to each row—the Logo Group
							will automatically resize and space each row's logos to fit its
							bounding box.
						</p>
					</div>

					<div className="flex flex-wrap items-center gap-2.5 shrink-0">
						<button
							onClick={() => setActiveView("schedule_importer")}
							className="px-3.5 py-2 rounded-xl bg-indigo-600/90 hover:bg-indigo-500 text-white text-xs font-semibold border border-indigo-400/30 shadow-sm transition flex items-center gap-1.5"
							title="Open the dedicated Smart Copy-Paste Schedule Importer"
						>
							<Calendar className="w-3.5 h-3.5" />
							Open Smart Schedule Importer
						</button>
						<button
							onClick={() => setActiveView("editor")}
							className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold border border-slate-700 transition flex items-center gap-1.5"
						>
							<Eye className="w-3.5 h-3.5 text-sky-400" />
							Adjust Shared Layout in Canvas
						</button>
						<button
							onClick={async () => {
								await saveProjectNow();
								setActiveView("generate");
							}}
							className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition flex items-center gap-1.5"
						>
							<Sparkles className="w-3.5 h-3.5" />
							Preview & Batch Export All ({project.events.length})
						</button>
					</div>
				</div>

				{/* Top Controls Grid: Original Multi-Line Title Paste + Row Count + Shared Logo Pool */}
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					{/* Card 1: Original Multi-Line Bulk Paste & Row Count */}
					<div className="lg:col-span-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
						<div className="flex flex-wrap items-center justify-between gap-2">
							<div>
								<h3 className="text-sm font-bold flex items-center gap-1.5">
									<ListPlus className="w-4 h-4 text-sky-400" />
									1. How Many Tarpaulins & Bulk Title Paste
								</h3>
								<p className="text-[11px] text-slate-500 dark:text-slate-400">
									Paste multiple titles below (one line = one tarpaulin), or set
									the exact number of tarpaulin rows. Need to import a
									structured multi-day campaign schedule? Use the{" "}
									<button
										type="button"
										onClick={() => setActiveView("schedule_importer")}
										className="text-indigo-400 hover:underline font-semibold"
									>
										Smart Schedule Importer
									</button>{" "}
									tab.
								</p>
							</div>

							<div className="flex items-center gap-2">
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

						<textarea
							rows={5}
							placeholder={
								"Paste multiple event titles here (one title per line)...\nExample:\nNATIONAL AI & ROBOTICS SUMMIT — MANILA LEG\nREGIONAL AGRI-FISHERY FORUM — CEBU LEG\nYOUTH LEADERSHIP & DIGITAL SKILLS — DAVAO LEG"
							}
							value={bulkTitlesText}
							onChange={(e) => setBulkTitlesText(e.target.value)}
							className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-xs outline-none focus:border-sky-500 font-mono"
						/>

						<div className="flex flex-wrap items-center justify-between gap-3">
							<div className="flex flex-wrap items-center gap-3">
								<label className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 cursor-pointer">
									<input
										type="checkbox"
										checked={replaceExistingOnPaste}
										onChange={(e) => setReplaceExistingOnPaste(e.target.checked)}
									/>
									<span>Replace existing rows instead of appending</span>
								</label>
								{replaceExistingOnPaste && (
									<label className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 cursor-pointer">
										<input
											type="checkbox"
											checked={keepLogosOnPaste}
											onChange={(e) => setKeepLogosOnPaste(e.target.checked)}
											className="accent-emerald-500"
										/>
										<span>Keep existing row logos</span>
									</label>
								)}
							</div>

							<div className="flex items-center gap-2">
								<button
									onClick={() =>
										addEvent({
											title: `NEW TARPAULIN TITLE #${project.events.length + 1}`,
										})
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
									Create Rows from Pasted Titles
								</button>
							</div>
						</div>
					</div>

					{/* Card 2: Project Logo Pool & Shared Default Logos */}
					<div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between space-y-3">
						<div className="space-y-3">
							<div className="flex items-center justify-between">
								<h3 className="text-sm font-bold flex items-center gap-1.5">
									<ImageIcon className="w-4 h-4 text-sky-400" />
									Shared Logos & Project Pool ({project.assets.length})
								</h3>
								<label className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold cursor-pointer transition">
									<Upload className="w-3.5 h-3.5" />
									<span>
										{uploadingGlobalLibrary ? "Uploading..." : "+ Upload Logos"}
									</span>
									<input
										type="file"
										accept=".png,.jpg,.jpeg,.webp"
										multiple
										onChange={handleUploadGlobalLogos}
										className="hidden"
									/>
								</label>
							</div>

							{/* Shared Default Logos Editor (Applies to all rows using Shared) */}
							<div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-2">
								<div className="flex items-center justify-between">
									<span className="text-[11px] font-bold text-sky-400">
										Active Shared Logos ({sharedGroupLogos.length}) — Default
										for All Rows
									</span>
									<div className="flex items-center gap-1.5">
										{project.assets.length > 0 && (
											<button
												type="button"
												onClick={() => trimAllLogoAssets("auto")}
												className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 font-semibold flex items-center gap-0.5"
												title="Auto-crop empty square/transparent/white canvas borders around all uploaded logos"
											>
												<Crop className="w-2.5 h-2.5" />
												Trim All Spaces
											</button>
										)}
										{project.assets.length > 0 && (
											<button
												type="button"
												onClick={() => {
													if (!sharedLogoGroup) {
														addLogoGroupElement(project.assets);
													} else {
														const existingAssetIds = new Set(
															sharedGroupLogos.map((l) => l.asset_id),
														);
														const missing = project.assets.filter(
															(a) => !existingAssetIds.has(a.id),
														);
														if (missing.length > 0) {
															addAssetsToLogoGroup(sharedLogoGroup.id, missing);
														}
													}
												}}
												className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/15 hover:bg-sky-500/25 text-sky-400 font-semibold"
												title="Add all uploaded pool logos to the Shared Logo Group"
											>
												+ Add All Pool
											</button>
										)}
										{sharedGroupLogos.length > 0 && (
											<button
												type="button"
												onClick={clearAllSharedGroupLogos}
												className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 font-semibold"
												title="Remove all default shared logos"
											>
												Clear Shared
											</button>
										)}
									</div>
								</div>

								{sharedGroupLogos.length === 0 ? (
									<div className="text-[11px] text-slate-400 py-1.5">
										No shared default logos active. Click any logo in the pool
										below to add it to shared logos.
									</div>
								) : (
									<div className="flex flex-wrap items-center gap-1.5">
										{sharedGroupLogos.map((lg, sIdx) => {
											const scalePct = Math.round(
												(lg.scale_override ?? 1) * 100,
											);
											const isSquareForced =
												Math.abs((lg.aspect_ratio || 1) - 1) < 0.01;
											const isDragTarget =
												draggedLogoInfo?.scope === "shared" &&
												dragOverLogoId === lg.id &&
												draggedLogoInfo.itemId !== lg.id;
											return (
												<div
													key={lg.id}
													draggable
													onDragStart={(e) => {
														setDraggedLogoInfo({
															scope: "shared",
															itemId: lg.id,
														});
														e.dataTransfer.effectAllowed = "move";
													}}
													onDragOver={(e) => {
														e.preventDefault();
														if (draggedLogoInfo?.scope === "shared") {
															setDragOverLogoId(lg.id);
														}
													}}
													onDrop={(e) => {
														e.preventDefault();
														if (
															sharedLogoGroup &&
															draggedLogoInfo?.scope === "shared" &&
															draggedLogoInfo.itemId !== lg.id
														) {
															moveLogoInGroupToIndex(
																sharedLogoGroup.id,
																draggedLogoInfo.itemId,
																lg.id,
															);
														}
														setDraggedLogoInfo(null);
														setDragOverLogoId(null);
													}}
													onDragEnd={() => {
														setDraggedLogoInfo(null);
														setDragOverLogoId(null);
													}}
													className={`flex items-center gap-1.5 px-2 py-1 rounded bg-white dark:bg-slate-900 border shadow-sm cursor-grab active:cursor-grabbing transition ${
														isDragTarget
															? "border-sky-400 ring-2 ring-sky-400/50 scale-105"
															: "border-slate-200 dark:border-slate-700"
													}`}
													title="Drag and drop to reorder shared logos"
												>
													<GripVertical className="w-3 h-3 text-slate-400 shrink-0" />
													<img
														src={lg.url}
														alt={lg.name}
														draggable={false}
														className="w-6 h-6 object-contain bg-checkerboard rounded p-0.5"
													/>
													<span className="text-[10px] font-medium max-w-[75px] truncate">
														{lg.name}
													</span>
													{/* Quick Individual Size, Trim & Circle Fit controls in Shared Logos */}
													<div
														onMouseDown={(e) => e.stopPropagation()}
														onDragStart={(e) => {
															e.preventDefault();
															e.stopPropagation();
														}}
														className="flex items-center gap-0.5 border-l border-slate-200 dark:border-slate-800 pl-1"
													>
														<button
															type="button"
															onClick={() => trimLogoAsset(lg.asset_id, "auto")}
															className="px-1 py-0.5 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-[8px] font-semibold flex items-center gap-0.5"
															title="Tightly crop empty transparent or white square space around this logo"
														>
															<Crop className="w-2 h-2" />
															Trim
														</button>
														<button
															type="button"
															onClick={() =>
																trimLogoAsset(lg.asset_id, "circle")
															}
															className="px-1 py-0.5 rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 text-[8px] font-semibold flex items-center gap-0.5"
															title="Fit & mask this logo into a clean 1:1 transparent circle (removes square corners around round seals)"
														>
															<CircleDot className="w-2 h-2" />
															Circle
														</button>
														<button
															type="button"
															onClick={() =>
																sharedLogoGroup &&
																updateLogoInGroup(
																	sharedLogoGroup.id,
																	lg.id,
																	{
																		scale_override: Math.max(
																			0.3,
																			Number(
																				(
																					(lg.scale_override ?? 1) - 0.1
																				).toFixed(2),
																			),
																		),
																	},
																	true,
																)
															}
															className="px-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-[10px] font-bold text-slate-400"
															title="Shrink this logo by 10%"
														>
															−
														</button>
														<span
															className="text-[9px] font-mono text-sky-400 min-w-[28px] text-center"
															title="Individual logo size scale"
														>
															{scalePct}%
														</span>
														<button
															type="button"
															onClick={() =>
																sharedLogoGroup &&
																updateLogoInGroup(
																	sharedLogoGroup.id,
																	lg.id,
																	{
																		scale_override: Math.min(
																			2.2,
																			Number(
																				(
																					(lg.scale_override ?? 1) + 0.1
																				).toFixed(2),
																			),
																		),
																	},
																	true,
																)
															}
															className="px-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-[10px] font-bold text-slate-400"
															title="Enlarge this logo by 10%"
														>
															+
														</button>
														<button
															type="button"
															onClick={() =>
																sharedLogoGroup &&
																updateLogoInGroup(
																	sharedLogoGroup.id,
																	lg.id,
																	{
																		aspect_ratio: isSquareForced
																			? lg.natural_width /
																				Math.max(1, lg.natural_height)
																			: 1.0,
																	},
																	true,
																)
															}
															className={`px-1 py-0.5 rounded text-[8px] font-semibold ${
																isSquareForced
																	? "bg-sky-500/20 text-sky-300"
																	: "text-slate-400 hover:bg-slate-800"
															}`}
															title="Force 1:1 equal height and width for round logos"
														>
															1:1
														</button>
													</div>
													<div className="flex items-center gap-0.5">
														<button
															type="button"
															onClick={() =>
																sharedLogoGroup &&
																reorderLogoInGroup(
																	sharedLogoGroup.id,
																	lg.id,
																	"left",
																)
															}
															disabled={sIdx === 0}
															className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-25"
															title="Move Left in Shared Logos"
														>
															<ArrowLeft className="w-2.5 h-2.5" />
														</button>
														<button
															type="button"
															onClick={() =>
																sharedLogoGroup &&
																reorderLogoInGroup(
																	sharedLogoGroup.id,
																	lg.id,
																	"right",
																)
															}
															disabled={sIdx === sharedGroupLogos.length - 1}
															className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-25"
															title="Move Right in Shared Logos"
														>
															<ArrowRight className="w-2.5 h-2.5" />
														</button>
														<button
															type="button"
															onClick={() =>
																sharedLogoGroup &&
																removeLogoFromGroup(sharedLogoGroup.id, lg.id)
															}
															className="p-0.5 rounded hover:bg-rose-500/20 text-rose-400 text-[10px]"
															title="Remove from Shared Logos"
														>
															✕
														</button>
													</div>
												</div>
											);
										})}
									</div>
								)}
							</div>

							{/* Project Logo Pool — click to toggle in/out of Shared Logos, or rename/delete */}
							<div className="space-y-1.5">
								<div className="flex flex-wrap items-center justify-between gap-2">
									<div className="text-[10px] font-semibold text-slate-400">
										Uploaded Logo Pool (Click to toggle in Shared • Pencil to
										rename • Trash to delete):
									</div>
									{project.assets.length > 0 && (
										<div className="relative w-44">
											<Search className="w-3 h-3 text-slate-400 absolute left-2 top-1.5" />
											<input
												type="text"
												placeholder="Search pool logos..."
												value={poolLogoSearch}
												onChange={(e) => setPoolLogoSearch(e.target.value)}
												className="w-full pl-6 pr-5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] outline-none focus:border-sky-500"
											/>
											{poolLogoSearch && (
												<button
													type="button"
													onClick={() => setPoolLogoSearch("")}
													className="absolute right-1.5 top-0.5 text-[10px] text-slate-400 hover:text-slate-200"
												>
													✕
												</button>
											)}
										</div>
									)}
								</div>
								{project.assets.length === 0 ? (
									<div className="p-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-800 text-center text-[11px] text-slate-400">
										No logos in pool yet. Click "+ Upload Logos" above.
									</div>
								) : (
									<div className="grid grid-cols-4 gap-2 max-h-36 overflow-y-auto p-1">
										{project.assets
											.filter((a) =>
												!poolLogoSearch.trim()
													? true
													: a.name
															.toLowerCase()
															.includes(poolLogoSearch.trim().toLowerCase()),
											)
											.map((asset) => {
												const inShared = sharedGroupLogos.some(
													(l) => l.asset_id === asset.id,
												);
												return (
													<div
														key={asset.id}
														onClick={() => {
															if (renamingPoolAssetId === asset.id) return;
															toggleAssetInSharedGroup(asset);
														}}
														className={`group relative p-1.5 rounded bg-checkerboard border flex flex-col items-center justify-center cursor-pointer transition ${
															inShared
																? "border-sky-500 ring-1 ring-sky-500/40"
																: "border-slate-200 dark:border-slate-800 opacity-75 hover:opacity-100"
														}`}
														title={`${asset.name} (${asset.natural_width}×${asset.natural_height}) — Click to ${
															inShared ? "remove from" : "add to"
														} Shared Logos`}
													>
														<div className="absolute top-0.5 right-0.5 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition bg-slate-900/85 rounded p-0.5 z-10">
															<button
																type="button"
																onClick={(e) => {
																	e.stopPropagation();
																	setRenamingPoolAssetId(asset.id);
																	setRenamePoolVal(asset.name);
																}}
																className="p-0.5 rounded hover:bg-sky-500/30 text-sky-300"
																title="Rename logo in pool"
															>
																<Pencil className="w-2.5 h-2.5" />
															</button>
															<button
																type="button"
																onClick={(e) => {
																	e.stopPropagation();
																	if (
																		window.confirm(
																			`Delete logo "${asset.name}" from the project pool and remove it from all tarpaulins?`,
																		)
																	) {
																		deleteLogoAsset(asset.id);
																	}
																}}
																className="p-0.5 rounded hover:bg-rose-500/30 text-rose-400"
																title="Delete logo from pool"
															>
																<Trash2 className="w-2.5 h-2.5" />
															</button>
														</div>
														<img
															src={asset.url}
															alt={asset.name}
															className="h-7 object-contain"
														/>
														{renamingPoolAssetId === asset.id ? (
															<input
																type="text"
																value={renamePoolVal}
																onClick={(e) => e.stopPropagation()}
																onChange={(e) =>
																	setRenamePoolVal(e.target.value)
																}
																onBlur={() => {
																	if (renamePoolVal.trim()) {
																		renameLogoAsset(
																			asset.id,
																			renamePoolVal.trim(),
																		);
																	}
																	setRenamingPoolAssetId(null);
																}}
																onKeyDown={(e) => {
																	if (e.key === "Enter") {
																		if (renamePoolVal.trim()) {
																			renameLogoAsset(
																				asset.id,
																				renamePoolVal.trim(),
																			);
																		}
																		setRenamingPoolAssetId(null);
																	} else if (e.key === "Escape") {
																		setRenamingPoolAssetId(null);
																	}
																}}
																autoFocus
																className="w-full mt-0.5 px-1 py-0.5 rounded bg-slate-900 border border-sky-500 text-[9px] text-white outline-none"
															/>
														) : (
															<span className="text-[9px] truncate w-full text-center mt-0.5 text-slate-300 font-medium">
																{inShared ? "✓ " : "+ "}
																{asset.name}
															</span>
														)}
													</div>
												);
											})}
									</div>
								)}
							</div>
						</div>

						<div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2 text-[11px]">
							<div className="flex items-center justify-between">
								<label className="flex items-center gap-1.5 cursor-pointer text-slate-400 hover:text-slate-200">
									<input
										type="checkbox"
										checked={expandedSecondaryFields}
										onChange={(e) =>
											setExpandedSecondaryFields(e.target.checked)
										}
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
										addDynamicFieldAndElement(newDynamicColName.trim(), "");
										setNewDynamicColName("");
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
							Tarpaulin Variations ({project.events.length} Total — Shared
							Layout)
						</div>
						<div className="text-[11px] text-slate-400">
							Tip: If a row has custom logos selected, it uses those logos; if
							left empty, it falls back to the shared Logo Group (
							{sharedGroupLogos.length} default logos).
						</div>
					</div>

					<div className="space-y-3">
						{project.events.map((ev, idx) => {
							const rowLogos = ev.logos || [];
							const hasCustomLogos = rowLogos.length > 0;
							const effectiveLogos = hasCustomLogos
								? rowLogos
								: sharedGroupLogos;

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
													onClick={() => reorderEvent(ev.id, "up")}
													disabled={idx === 0}
													className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"
													title="Move Row Up"
												>
													<ArrowUp className="w-3.5 h-3.5" />
												</button>
												<button
													onClick={() => reorderEvent(ev.id, "down")}
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
													setActiveView("editor");
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
													Tarpaulin Title{" "}
													<code className="text-sky-400">
														{"{{event.title}}"}
													</code>
												</label>
												<input
													type="text"
													value={ev.name}
													onChange={(e) =>
														updateEvent(ev.id, { name: e.target.value })
													}
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
															ev.name.startsWith("Event Variation") ||
															ev.name.startsWith("EVENT TITLE")
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
															<label className="block text-[10px] text-slate-400">
																Subtitle
															</label>
															{project.events.length > 1 && (
																<button
																	type="button"
																	onClick={() =>
																		clearStandardFieldOnOtherEvents(
																			ev.id,
																			"subtitle",
																		)
																	}
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
															onChange={(e) =>
																updateEvent(ev.id, { subtitle: e.target.value })
															}
															className="w-full px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-700 text-xs"
														/>
													</div>
													<div>
														<div className="flex items-center justify-between">
															<label className="block text-[10px] text-slate-400">
																Venue
															</label>
															{project.events.length > 1 && (
																<button
																	type="button"
																	onClick={() =>
																		clearStandardFieldOnOtherEvents(
																			ev.id,
																			"venue",
																		)
																	}
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
															onChange={(e) =>
																updateEvent(ev.id, { venue: e.target.value })
															}
															className="w-full px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-700 text-xs"
														/>
													</div>
													<div>
														<div className="flex items-center justify-between">
															<label className="block text-[10px] text-slate-400">
																Address
															</label>
															{project.events.length > 1 && (
																<button
																	type="button"
																	onClick={() =>
																		clearStandardFieldOnOtherEvents(
																			ev.id,
																			"address",
																		)
																	}
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
															onChange={(e) =>
																updateEvent(ev.id, { address: e.target.value })
															}
															className="w-full px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-700 text-xs"
														/>
													</div>
													<div>
														<div className="flex items-center justify-between">
															<label className="block text-[10px] text-slate-400">
																Date
															</label>
															{project.events.length > 1 && (
																<button
																	type="button"
																	onClick={() =>
																		clearStandardFieldOnOtherEvents(
																			ev.id,
																			"date",
																		)
																	}
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
															onChange={(e) =>
																updateEvent(ev.id, { date: e.target.value })
															}
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
																addingUniqueFieldForRow === ev.id
																	? null
																	: ev.id,
															);
															setUniqueFieldKeyInput("");
															setUniqueFieldValInput("");
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
															Create a unique field for{" "}
															<strong>Row #{idx + 1}</strong> (e.g.,{" "}
															<code>special_badge</code>,{" "}
															<code>guest_speaker</code>,{" "}
															<code>award_note</code>). It also adds a bound
															text box on the canvas that stays blank on rows
															that don't have it.
														</div>
														<div className="flex items-center gap-1.5">
															<input
																type="text"
																placeholder="Field key (e.g. special_badge)"
																value={uniqueFieldKeyInput}
																onChange={(e) =>
																	setUniqueFieldKeyInput(e.target.value)
																}
																className="w-40 px-2 py-1 rounded bg-white dark:bg-slate-900 border border-indigo-500/40 text-xs outline-none"
															/>
															<input
																type="text"
																placeholder="Value for this tarpaulin..."
																value={uniqueFieldValInput}
																onChange={(e) =>
																	setUniqueFieldValInput(e.target.value)
																}
																className="flex-1 px-2 py-1 rounded bg-white dark:bg-slate-900 border border-indigo-500/40 text-xs outline-none"
															/>
															<button
																type="button"
																onClick={() => {
																	if (!uniqueFieldKeyInput.trim()) return;
																	addUniqueFieldToRow(
																		ev,
																		uniqueFieldKeyInput,
																		uniqueFieldValInput,
																	);
																	setAddingUniqueFieldForRow(null);
																	setUniqueFieldKeyInput("");
																	setUniqueFieldValInput("");
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
														{Object.entries(ev.custom_fields || {}).map(
															([k, val]) => {
																const existsOnOtherRows = project.events.some(
																	(other) =>
																		other.id !== ev.id &&
																		other.custom_fields &&
																		k in other.custom_fields,
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
																						onClick={() =>
																							keepDynamicFieldOnlyOnEvent(
																								ev.id,
																								k,
																							)
																						}
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
																					onClick={() =>
																						removeFieldFromSingleRow(ev, k)
																					}
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
																			value={val ?? ""}
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
															},
														)}
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
																? "bg-sky-500/15 text-sky-400"
																: "bg-slate-200 dark:bg-slate-800 text-slate-400"
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
																	logos: JSON.parse(
																		JSON.stringify(sharedGroupLogos),
																	),
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
																? "Uploading..."
																: "+ Upload Logos for Row"}
														</span>
														<input
															type="file"
															accept=".png,.jpg,.jpeg,.webp"
															multiple
															onChange={(e) =>
																handleUploadLogosDirectlyToEvent(ev.id, e)
															}
															className="hidden"
														/>
													</label>
												</div>
											</div>

											{/* Active Logos Strip for this Row (Reorderable & Removable) */}
											<div className="min-h-[58px] p-2 rounded-lg bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-2">
												{effectiveLogos.length === 0 ? (
													<span className="text-[11px] text-slate-400 pl-1">
														No logos assigned. Upload logos or click a logo from
														the quick-toggle bar below.
													</span>
												) : (
													effectiveLogos.map((lg, lgIdx) => {
														const scalePct = Math.round(
															(lg.scale_override ?? 1) * 100,
														);
														const isSquareForced =
															Math.abs((lg.aspect_ratio || 1) - 1) < 0.01;
														const patchRowOrSharedLogo = (
															patch: Partial<LogoGroupItem>,
														) => {
															if (hasCustomLogos) {
																updateEventLogo(ev.id, lg.id, patch, true);
															} else if (sharedLogoGroup) {
																updateLogoInGroup(
																	sharedLogoGroup.id,
																	lg.id,
																	patch,
																	true,
																);
															}
														};
														const rowScope = hasCustomLogos
															? ev.id
															: `row_shared_${ev.id}`;
														const isRowDragTarget =
															draggedLogoInfo?.scope === rowScope &&
															dragOverLogoId === lg.id &&
															draggedLogoInfo.itemId !== lg.id;
														return (
															<div
																key={lg.id}
																draggable
																onDragStart={(e) => {
																	setDraggedLogoInfo({
																		scope: rowScope,
																		itemId: lg.id,
																	});
																	e.dataTransfer.effectAllowed = "move";
																}}
																onDragOver={(e) => {
																	e.preventDefault();
																	if (draggedLogoInfo?.scope === rowScope) {
																		setDragOverLogoId(lg.id);
																	}
																}}
																onDrop={(e) => {
																	e.preventDefault();
																	if (
																		draggedLogoInfo?.scope === rowScope &&
																		draggedLogoInfo.itemId !== lg.id
																	) {
																		if (hasCustomLogos) {
																			moveEventLogoToIndex(
																				ev.id,
																				draggedLogoInfo.itemId,
																				lg.id,
																			);
																		} else if (sharedLogoGroup) {
																			moveLogoInGroupToIndex(
																				sharedLogoGroup.id,
																				draggedLogoInfo.itemId,
																				lg.id,
																			);
																		}
																	}
																	setDraggedLogoInfo(null);
																	setDragOverLogoId(null);
																}}
																onDragEnd={() => {
																	setDraggedLogoInfo(null);
																	setDragOverLogoId(null);
																}}
																className={`group flex items-center gap-1.5 px-2 py-1 rounded-md bg-white dark:bg-slate-900 border shadow-sm cursor-grab active:cursor-grabbing transition ${
																	isRowDragTarget
																		? "border-sky-400 ring-2 ring-sky-400/50 scale-105"
																		: "border-slate-200 dark:border-slate-700"
																}`}
																title="Drag and drop to reorder logos"
															>
																<GripVertical className="w-3 h-3 text-slate-400 shrink-0" />
																<img
																	src={lg.url}
																	alt={lg.name}
																	draggable={false}
																	className="w-7 h-7 object-contain bg-checkerboard rounded p-0.5"
																/>
																<span className="text-[11px] font-medium max-w-[80px] truncate">
																	{lg.name}
																</span>

																<div
																	onMouseDown={(e) => e.stopPropagation()}
																	onDragStart={(e) => {
																		e.preventDefault();
																		e.stopPropagation();
																	}}
																	className="flex items-center gap-0.5 border-l border-slate-200 dark:border-slate-800 pl-1"
																>
																	<button
																		type="button"
																		onClick={() =>
																			trimLogoAsset(lg.asset_id, "auto")
																		}
																		className="px-1 py-0.5 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-[8px] font-semibold flex items-center gap-0.5"
																		title="Tightly crop empty transparent or white square space around this logo"
																	>
																		<Crop className="w-2 h-2" />
																		Trim
																	</button>
																	<button
																		type="button"
																		onClick={() =>
																			trimLogoAsset(lg.asset_id, "circle")
																		}
																		className="px-1 py-0.5 rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 text-[8px] font-semibold flex items-center gap-0.5"
																		title="Fit & mask this logo into a clean 1:1 transparent circle (removes square corners around round seals)"
																	>
																		<CircleDot className="w-2 h-2" />
																		Circle
																	</button>
																	<button
																		type="button"
																		onClick={() =>
																			patchRowOrSharedLogo({
																				scale_override: Math.max(
																					0.3,
																					Number(
																						(
																							(lg.scale_override ?? 1) - 0.1
																						).toFixed(2),
																					),
																				),
																			})
																		}
																		className="px-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-[10px] font-bold text-slate-400"
																		title="Shrink this logo by 10%"
																	>
																		−
																	</button>
																	<span
																		className="text-[9px] font-mono text-sky-400 min-w-[28px] text-center"
																		title="Individual logo size scale"
																	>
																		{scalePct}%
																	</span>
																	<button
																		type="button"
																		onClick={() =>
																			patchRowOrSharedLogo({
																				scale_override: Math.min(
																					2.2,
																					Number(
																						(
																							(lg.scale_override ?? 1) + 0.1
																						).toFixed(2),
																					),
																				),
																			})
																		}
																		className="px-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-[10px] font-bold text-slate-400"
																		title="Enlarge this logo by 10%"
																	>
																		+
																	</button>
																	<button
																		type="button"
																		onClick={() =>
																			patchRowOrSharedLogo({
																				aspect_ratio: isSquareForced
																					? lg.natural_width /
																						Math.max(1, lg.natural_height)
																					: 1.0,
																			})
																		}
																		className={`px-1 py-0.5 rounded text-[8px] font-semibold ${
																			isSquareForced
																				? "bg-sky-500/20 text-sky-300"
																				: "text-slate-400 hover:bg-slate-800"
																		}`}
																		title="Force 1:1 equal height and width for round logos"
																	>
																		1:1
																	</button>
																</div>

																<div className="flex items-center gap-0.5 ml-0.5">
																	<button
																		onClick={() => {
																			if (hasCustomLogos) {
																				moveEventLogo(ev, lg.id, "left");
																			} else if (sharedLogoGroup) {
																				reorderLogoInGroup(
																					sharedLogoGroup.id,
																					lg.id,
																					"left",
																				);
																			}
																		}}
																		disabled={lgIdx === 0}
																		className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-25"
																		title={
																			hasCustomLogos
																				? "Move Left in Row"
																				: "Move Left in Shared Logos"
																		}
																	>
																		<ArrowLeft className="w-3 h-3" />
																	</button>
																	<button
																		onClick={() => {
																			if (hasCustomLogos) {
																				moveEventLogo(ev, lg.id, "right");
																			} else if (sharedLogoGroup) {
																				reorderLogoInGroup(
																					sharedLogoGroup.id,
																					lg.id,
																					"right",
																				);
																			}
																		}}
																		disabled={
																			lgIdx === effectiveLogos.length - 1
																		}
																		className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-25"
																		title={
																			hasCustomLogos
																				? "Move Right in Row"
																				: "Move Right in Shared Logos"
																		}
																	>
																		<ArrowRight className="w-3 h-3" />
																	</button>
																	<button
																		onClick={() => {
																			if (hasCustomLogos) {
																				removeEventLogo(ev, lg.id);
																			} else {
																				// Fork shared logos into this row without this logo so only this row is affected
																				const forked = sharedGroupLogos.filter(
																					(item) => item.id !== lg.id,
																				);
																				updateEvent(ev.id, {
																					logos: JSON.parse(
																						JSON.stringify(forked),
																					),
																				});
																			}
																		}}
																		className="p-0.5 rounded hover:bg-rose-500/20 text-rose-400"
																		title={
																			hasCustomLogos
																				? "Remove Logo from this Row"
																				: "Remove Logo from this Row (switches row to Custom Logos)"
																		}
																	>
																		✕
																	</button>
																</div>
															</div>
														);
													})
												)}
											</div>

											{/* Quick-Toggle Pills from Project Logo Pool */}
											{project.assets.length > 0 &&
												(() => {
													const rowQuery = (
														rowLogoSearches[ev.id] ?? poolLogoSearch
													)
														.trim()
														.toLowerCase();
													const matchingAssets = project.assets.filter((a) =>
														!rowQuery
															? true
															: a.name.toLowerCase().includes(rowQuery),
													);
													return (
														<div className="flex flex-wrap items-center gap-1.5 pt-0.5">
															<span className="text-[10px] text-slate-400">
																Toggle from Pool:
															</span>
															<div className="relative w-36 mr-1">
																<Search className="w-2.5 h-2.5 text-slate-400 absolute left-2 top-1.5" />
																<input
																	type="text"
																	placeholder="Search logo..."
																	value={rowLogoSearches[ev.id] ?? ""}
																	onChange={(e) =>
																		setRowLogoSearches((prev) => ({
																			...prev,
																			[ev.id]: e.target.value,
																		}))
																	}
																	className="w-full pl-5 pr-4 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-[10px] outline-none focus:border-sky-500"
																/>
																{rowLogoSearches[ev.id] && (
																	<button
																		type="button"
																		onClick={() =>
																			setRowLogoSearches((prev) => ({
																				...prev,
																				[ev.id]: "",
																			}))
																		}
																		className="absolute right-1.5 top-0.5 text-[9px] text-slate-400 hover:text-slate-200"
																	>
																		✕
																	</button>
																)}
															</div>
															{matchingAssets.map((asset) => {
																const isSelectedInRow = effectiveLogos.some(
																	(l) => l.asset_id === asset.id,
																);
																return (
																	<button
																		key={asset.id}
																		onClick={() =>
																			toggleAssetInEvent(ev, asset)
																		}
																		className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border transition ${
																			isSelectedInRow
																				? "bg-sky-500/20 border-sky-500 text-sky-300 font-semibold"
																				: "bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-200"
																		}`}
																		title="Click to add/remove this logo for this tarpaulin variation"
																	>
																		<CheckSquare
																			className={`w-2.5 h-2.5 ${
																				isSelectedInRow
																					? "text-sky-400"
																					: "opacity-30"
																			}`}
																		/>
																		<span className="truncate max-w-[90px]">
																			{asset.name}
																		</span>
																	</button>
																);
															})}
														</div>
													);
												})()}
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
