import { BasesView, BasesPropertyId, BasesEntry, BasesQueryResult, QueryController, Plugin, TFile } from 'obsidian';
import type { Root } from 'react-dom/client';
import type { TableRowData, ColumnMeta, SortConfig, RollupConfig, AggregationType, GroupData } from './types';

/**
 * Module-level state for property filtering in view options.
 * Updated by the active view instance in onDataUpdated().
 *
 * This is a workaround for the Bases Plugin API limitation where
 * getViewOptions() is static and filter() only receives the property ID.
 */
const viewOptionsState = {
	/** All columns currently in this view (from config.getOrder()) */
	currentViewColumns: [] as string[],
	/** Columns detected as relations (wikilink arrays, file references, etc.) */
	detectedRelationColumns: [] as string[],
};

export class RelationalTableView extends BasesView {
	type = 'relational-table';
	private viewContainerEl: HTMLElement;
	private plugin: Plugin;
	private reactRoot: Root | null = null;

	constructor(
		controller: QueryController,
		containerEl: HTMLElement,
		plugin: Plugin
	) {
		super(controller);
		this.viewContainerEl = containerEl;
		this.plugin = plugin;
	}

	onload(): void {
		this.viewContainerEl.addClass('relational-table-container');
	}

	onunload(): void {
		if (this.reactRoot) {
			this.reactRoot.unmount();
			this.reactRoot = null;
		}
	}

	onDataUpdated(): void {
		this.updateViewOptionsState();
		this.renderTable();
	}

	/**
	 * Update the module-level state used by getViewOptions() filters.
	 * Called before rendering so the config panel has current data.
	 */
	private updateViewOptionsState(): void {
		const { data, config } = this;
		if (!data?.data) return;

		const orderedProperties = config.getOrder();
		const entries = data.data;

		// Build temporary rows for relation detection
		const rows: TableRowData[] = entries.slice(0, 10).map((entry: BasesEntry) => {
			const row: TableRowData = { file: entry.file };
			for (const propId of orderedProperties) {
				row[propId as string] = this.unwrapValue(entry.getValue(propId));
			}
			return row;
		});

		const baseFolder = this.getBaseFolder(entries);

		// Update module-level state
		viewOptionsState.currentViewColumns = orderedProperties.map(p => String(p));
		viewOptionsState.detectedRelationColumns = orderedProperties
			.map(p => String(p))
			.filter(propId => this.detectRelationColumn(propId, rows, baseFolder));
	}

	private renderTable(): void {
		const { data, config } = this;
		if (!data) return;

		// Get ordered columns (typed as BasesPropertyId[])
		const orderedProperties = config.getOrder();

		// Transform BasesEntry[] into TableRowData[]
		const entries = data.data;
		if (!entries) return;

		const rows: TableRowData[] = entries.map((entry: BasesEntry) => {
			const row: TableRowData = { file: entry.file };
			for (const propId of orderedProperties) {
				const value = entry.getValue(propId);
				row[propId as string] = this.unwrapValue(value);
			}
			return row;
		});

		// Build column metadata
		const baseFolder = this.getBaseFolder(entries);
		const columns: ColumnMeta[] = orderedProperties.map((propId) => {
			const isRelation = this.detectRelationColumn(propId as string, rows, baseFolder);
			return {
				propertyId: propId as string,
				displayName: config.getDisplayName(propId),
				isRelation,
				relationFolderFilter: isRelation
					? this.inferRelationFolder(propId as string, baseFolder)
					: undefined,
			};
		});

		// Compute rollup columns
		const rollupConfigs = this.getRollupConfigs();
		if (rollupConfigs.length > 0) {
			const { RollupService } = require('./services/RollupService');
			const rollupResults = RollupService.computeRollups(
				this.app,
				rows,
				rollupConfigs
			);

			// Inject computed values into row data
			for (const [rowIdx, rollupValues] of rollupResults) {
				for (const [rollupId, value] of rollupValues) {
					rows[rowIdx][rollupId] = value;
				}
			}

			// Add rollup columns to column list
			for (const rc of rollupConfigs) {
				columns.push({
					propertyId: rc.id,
					displayName: rc.displayName,
					isRelation: false,
					isRollup: true,
					rollupConfig: rc,
				});
			}
		}

		// Get sort config for display indicators
		const sortEntries = config.getSort() || [];
		const sortConfig: SortConfig[] = sortEntries.map((s) => ({
			propertyId: s.property as string,
			direction: s.direction as 'ASC' | 'DESC',
		}));

		// Build grouped data if available
		let groups: GroupData[] | undefined;
		try {
			const groupedData = (data as any).groupedData;
			if (groupedData && Array.isArray(groupedData) && groupedData.length > 0) {
				groups = groupedData.map((group: any) => ({
					groupKey: String(group.key ?? ''),
					groupValue: this.unwrapValue(group.key),
					rows: (group.entries || []).map((entry: BasesEntry) => {
						const row: TableRowData = { file: entry.file };
						for (const propId of orderedProperties) {
							row[propId as string] = this.unwrapValue(entry.getValue(propId));
						}
						return row;
					}),
				}));
			}
		} catch {
			// groupedData not available — use flat rendering
		}

		// Build summary values if available
		let summaryValues: Record<string, any> | undefined;
		try {
			const sv: Record<string, any> = {};
			let hasSummary = false;
			for (const propId of orderedProperties) {
				try {
					const summaryVal = (data as any).getSummaryValue?.(propId);
					if (summaryVal !== undefined && summaryVal !== null) {
						sv[propId as string] = this.unwrapValue(summaryVal);
						hasSummary = true;
					}
				} catch {
					// No summary for this property
				}
			}
			if (hasSummary) {
				summaryValues = sv;
			}
		} catch {
			// Summary not available
		}

		// Mount React
		if (!this.reactRoot) {
			const { createRoot } = require('react-dom/client');
			this.reactRoot = createRoot(this.viewContainerEl);
		}

		// Render
		const React = require('react');
		const { AppContext } = require('./components/AppContext');
		const { RelationalTable } = require('./components/RelationalTable');

		this.reactRoot!.render(
			React.createElement(
				AppContext.Provider,
				{ value: this.app },
				React.createElement(RelationalTable, {
					rows,
					columns,
					sortConfig,
					groups,
					summaryValues,
					baseFolder,
					onUpdateRelation: this.handleUpdateRelation.bind(this),
					onUpdateCell: this.handleUpdateCell.bind(this),
				})
			)
		);
	}

	/**
	 * Unwrap Obsidian Value objects into JS primitives.
	 *
	 * Runtime shape (minified): { icon, data, lazyEvaluator? }
	 * - ListValue.data = Value[] (array of nested Value objects)
	 * - PrimitiveValue.data = string | number | boolean
	 * - LinkValue.data = string (path, may or may not include [[]])
	 *
	 * See .claude/reference/v0.1/obsidian-value-api.md
	 */
	private unwrapValue(value: any): unknown {
		if (value === null || value === undefined) return null;

		// Obsidian Value objects have .data as the actual value
		if (value.data !== undefined) {
			if (Array.isArray(value.data)) {
				return value.data.map((v: any) => this.unwrapValue(v));
			}
			// Recurse if .data is a nested Value (has its own .data),
			// otherwise return the primitive directly
			if (value.data !== null && typeof value.data === 'object' && 'data' in value.data) {
				return this.unwrapValue(value.data);
			}
			return value.data;
		}

		// Fallback: if it's a non-null object with a custom toString(), use that
		if (typeof value === 'object' && typeof value.toString === 'function'
			&& value.toString !== Object.prototype.toString) {
			return value.toString();
		}

		return value;
	}

	/**
	 * Detect if a column contains relation values.
	 * Checks four patterns:
	 * 1a. Wikilink list: array where elements match [[...]]
	 * 1b. Path list: array where elements resolve to vault files (handles
	 *     LinkValue.data returning paths without brackets)
	 * 2.  Text reference: scalar string matching a vault file basename/alias
	 * 3.  Folder match: property name matches a subfolder (e.g. "project" → "projects/").
	 *     Catches columns that are currently empty but structurally relational.
	 * Scans first 10 rows for patterns 1–2, then falls back to pattern 3.
	 */
	private detectRelationColumn(propId: string, rows: TableRowData[], baseFolder?: string): boolean {
		if (!propId.startsWith('note.')) return false;

		const { WIKILINK_REGEX } = require('./services/ParseService');
		const { NoteSearchService } = require('./services/NoteSearchService');
		const sampled = rows.slice(0, 10);

		// Pattern 1: array values (wikilinks or file paths)
		for (const row of sampled) {
			const val = row[propId];
			if (!Array.isArray(val) || val.length === 0) continue;
			if (!val.every((item: any) => typeof item === 'string')) continue;

			// 1a: all items are wikilinks
			if (val.every((item: string) => WIKILINK_REGEX.test(item))) {
				return true;
			}

			// 1b: all items resolve to vault files (covers LinkValue.data
			//     returning bare paths like "Project Alpha" instead of "[[Project Alpha]]")
			if (val.every((item: string) =>
				NoteSearchService.isTextReference(this.app, item)
			)) {
				return true;
			}
		}

		// Pattern 2: scalar text references (e.g. project: "My Project")
		let textRefHits = 0;
		let textRefSamples = 0;
		for (const row of sampled) {
			const val = row[propId];
			if (val === null || val === undefined || val === '') continue;
			if (typeof val !== 'string') continue;
			if (WIKILINK_REGEX.test(val)) continue;
			textRefSamples++;
			if (NoteSearchService.isTextReference(this.app, val)) {
				textRefHits++;
			}
		}
		if (textRefSamples >= 2 && textRefHits / textRefSamples > 0.5) {
			return true;
		}

		// Pattern 3: property name matches a subfolder (e.g. "project" → "projects/")
		// Catches columns that are currently empty but structurally relational.
		if (this.matchRelationSubfolder(propId, baseFolder)) {
			return true;
		}

		return false;
	}

	/**
	 * Handle relation updates from the React table.
	 * Writes wikilinks to frontmatter via EditEngineService.
	 */
	private async handleUpdateRelation(
		file: TFile,
		propertyId: string,
		newLinks: string[]
	): Promise<void> {
		const { EditEngineService } = require('./services/EditEngineService');
		const { BidirectionalSyncService } = require('./services/BidirectionalSyncService');

		console.log('[Bases Power User] handleUpdateRelation called:', {
			file: file.path,
			propertyId,
			newLinks,
		});

		const propertyName = this.extractPropertyName(propertyId);

		// Read old links before overwriting (for bidi diff)
		const oldEntry = this.data?.data?.find(
			(e: BasesEntry) => e.file.path === file.path
		);
		const oldRaw = oldEntry
			? this.unwrapValue(
					oldEntry.getValue(propertyId as BasesPropertyId)
			  )
			: [];
		const oldLinks = Array.isArray(oldRaw)
			? oldRaw.filter((v: any) => typeof v === 'string')
			: [];

		console.log('[Bases Power User] oldLinks:', oldLinks);

		// Persist the primary edit
		EditEngineService.getInstance(this.app).updateRowFile({
			file,
			propertyName,
			value: newLinks,
		});

		// Sync back-links (non-blocking)
		// Look up reverse property name from bidi config
		const bidiConfigs = this.getBidiConfigs();
		console.log('[Bases Power User] bidiConfigs:', JSON.stringify(bidiConfigs));

		// Normalize comparison: config may store "project" or "note.project"
		const propertyNameOnly = this.extractPropertyName(propertyId);
		const bidiMatch = bidiConfigs.find((b) => {
			// Match if column equals full propertyId OR just the property name
			const match = b.column === propertyId ||
			              b.column === propertyNameOnly ||
			              `note.${b.column}` === propertyId;
			console.log('[Bases Power User] Comparing:', JSON.stringify(b.column), 'vs', JSON.stringify(propertyId), '/', JSON.stringify(propertyNameOnly), '→', match);
			return match;
		});
		console.log('[Bases Power User] bidiMatch:', bidiMatch, 'for propertyId:', propertyId);

		const reverseProperty = bidiMatch?.reverseProperty;

		if (reverseProperty) {
			console.log('[Bases Power User] Calling syncBackLinks:', {
				reverseProperty,
				oldLinks,
				newLinks,
			});
			BidirectionalSyncService.syncBackLinks(
				this.app,
				file,
				reverseProperty,
				oldLinks,
				newLinks
			);
		} else {
			console.log('[Bases Power User] No bidi match found, skipping sync');
		}
	}

	/**
	 * Handle inline cell edits from the React table.
	 * Writes the new value to frontmatter via EditEngineService.
	 */
	private handleUpdateCell(
		file: TFile,
		propertyId: string,
		value: any
	): void {
		const { EditEngineService } = require('./services/EditEngineService');
		const propertyName = this.extractPropertyName(propertyId);
		EditEngineService.getInstance(this.app).updateRowFile({
			file,
			propertyName,
			value,
		});
	}

	/**
	 * Extract frontmatter key from BasesPropertyId.
	 * "note.related-projects" → "related-projects"
	 */
	private extractPropertyName(propertyId: string): string {
		const dotIndex = propertyId.indexOf('.');
		return dotIndex >= 0 ? propertyId.substring(dotIndex + 1) : propertyId;
	}

	/**
	 * Infer a subfolder for a relation column's picker based on the property name.
	 * e.g. property "note.project" → look for "test-v1/project/" or "test-v1/projects/"
	 * Falls back to baseFolder if no matching subfolder found.
	 */
	private inferRelationFolder(propId: string, baseFolder?: string): string | undefined {
		return this.matchRelationSubfolder(propId, baseFolder) ?? baseFolder;
	}

	/**
	 * Check if a property name matches a subfolder under the base folder.
	 * Returns the matched subfolder path, or undefined if no match.
	 * Used for both folder filtering and as a relation detection signal.
	 */
	private matchRelationSubfolder(propId: string, baseFolder?: string): string | undefined {
		if (!baseFolder) return undefined;

		const propName = this.extractPropertyName(propId).toLowerCase();
		const candidates = [
			`${baseFolder}/${propName}`,
			`${baseFolder}/${propName}s`,
		];
		// Also try without trailing 's' if propName already ends with 's'
		if (propName.endsWith('s') && propName.length > 1) {
			candidates.push(`${baseFolder}/${propName.slice(0, -1)}`);
		}

		for (const candidate of candidates) {
			const folder = this.app.vault.getAbstractFileByPath(candidate);
			if (folder && 'children' in folder) {
				return candidate;
			}
		}

		return undefined;
	}

	/**
	 * Derive the base's root folder from the entries.
	 * Takes the common parent folder of all entries, then goes one level up
	 * to include sibling folders (e.g. tasks/ entries → parent test-v1/).
	 */
	private getBaseFolder(entries: BasesEntry[]): string | undefined {
		if (!entries || entries.length === 0) return undefined;

		const folders = entries.map((e) => {
			const lastSlash = e.file.path.lastIndexOf('/');
			return lastSlash >= 0 ? e.file.path.substring(0, lastSlash) : '';
		});

		// Find common prefix
		let common = folders[0];
		for (let i = 1; i < folders.length; i++) {
			while (!folders[i].startsWith(common)) {
				const lastSlash = common.lastIndexOf('/');
				common = lastSlash >= 0 ? common.substring(0, lastSlash) : '';
				if (!common) return undefined;
			}
		}

		// Go one level up to include sibling folders
		const parentSlash = common.lastIndexOf('/');
		return parentSlash >= 0 ? common.substring(0, parentSlash) : common || undefined;
	}

	/**
	 * Parse rollup configuration from view options.
	 */
	private getRollupConfigs(): RollupConfig[] {
		const count = parseInt(
			String(this.config.get('rollupCount') ?? '0'),
			10
		);
		const configs: RollupConfig[] = [];

		for (let i = 1; i <= count; i++) {
			const relation = this.config.get(`rollup${i}_relation`) as string | undefined;
			const target = this.config.get(`rollup${i}_target`) as string | undefined;
			const aggregation =
				(this.config.get(`rollup${i}_aggregation`) as string) || 'count';
			const name =
				(this.config.get(`rollup${i}_name`) as string) || `Rollup ${i}`;

			if (relation && target) {
				configs.push({
					id: `rollup_${i}`,
					displayName: name,
					relationPropertyId: relation,
					targetProperty: target,
					aggregation: aggregation as AggregationType,
				});
			}
		}

		return configs;
	}

	/**
	 * Parse bidirectional sync configuration from view options.
	 */
	private getBidiConfigs(): { column: string; reverseProperty: string }[] {
		const count = parseInt(
			String(this.config.get('bidiCount') ?? '0'),
			10
		);
		const configs: { column: string; reverseProperty: string }[] = [];

		for (let i = 1; i <= count; i++) {
			const column = this.config.get(`bidi${i}_column`) as string | undefined;
			const reverse = this.config.get(`bidi${i}_reverse`) as string | undefined;

			if (column && reverse) {
				configs.push({
					column,
					reverseProperty: reverse,
				});
			}
		}

		return configs;
	}

	static getViewOptions(): any[] {
		const aggregationOptions: Record<string, string> = {
			'count': 'Count (all links)',
			'count_values': 'Count Values (non-empty)',
			'sum': 'Sum',
			'average': 'Average',
			'min': 'Min',
			'max': 'Max',
			'list': 'List (all values)',
			'unique': 'Unique (deduplicated)',
			'percent_true': 'Percent True',
			'percent_not_empty': 'Percent Not Empty',
		};

		// Filter: only relation columns detected in current view
		// Falls back to note.* if view hasn't rendered yet
		const isRelationColumn = (prop: string) => {
			if (viewOptionsState.detectedRelationColumns.length > 0) {
				return viewOptionsState.detectedRelationColumns.includes(prop);
			}
			// Fallback: show all note.* properties
			return prop.startsWith('note.');
		};

		// Filter: only columns in current view (for target property)
		// Falls back to note.* if view hasn't rendered yet
		const isViewColumn = (prop: string) => {
			if (viewOptionsState.currentViewColumns.length > 0) {
				return viewOptionsState.currentViewColumns.includes(prop);
			}
			// Fallback: show all note.* properties
			return prop.startsWith('note.');
		};

		// Each rollup gets its own collapsible group
		const rollupGroup = (index: number): any => ({
			type: 'group',
			displayName: `Rollup ${index}`,
			shouldHide: (config: any) =>
				parseInt(config.get('rollupCount') ?? '0', 10) < index,
			items: [
				{
					type: 'property',
					key: `rollup${index}_relation`,
					displayName: 'Relation Property',
					placeholder: 'Select relation column...',
					filter: isRelationColumn,
				},
				{
					type: 'property',
					key: `rollup${index}_target`,
					displayName: 'Target Property',
					placeholder: 'Property to aggregate...',
					filter: isViewColumn,
				},
				{
					type: 'dropdown',
					key: `rollup${index}_aggregation`,
					displayName: 'Aggregation',
					default: 'count',
					options: aggregationOptions,
				},
				{
					type: 'text',
					key: `rollup${index}_name`,
					displayName: 'Column Name',
					default: `Rollup ${index}`,
					placeholder: 'Display name...',
				},
			],
		});

		// Each bidi sync gets its own collapsible group
		const bidiGroup = (index: number): any => ({
			type: 'group',
			displayName: `Bidi Sync ${index}`,
			shouldHide: (config: any) =>
				parseInt(config.get('bidiCount') ?? '0', 10) < index,
			items: [
				{
					type: 'property',
					key: `bidi${index}_column`,
					displayName: 'Relation Column',
					placeholder: 'Select relation column...',
					filter: isRelationColumn,
				},
				{
					type: 'text',
					key: `bidi${index}_reverse`,
					displayName: 'Write Back-Link To',
					placeholder: 'Property name on linked notes...',
				},
			],
		});

		return [
			// Master settings (always visible)
			{
				type: 'dropdown',
				key: 'relationDetection',
				displayName: 'Relation Detection',
				default: 'auto',
				options: {
					'auto': 'Auto-detect (list of wikilinks)',
					'manual': 'Select property',
				},
			},
			{
				type: 'dropdown',
				key: 'rollupCount',
				displayName: 'Number of Rollups',
				default: '0',
				options: {
					'0': 'None',
					'1': '1',
					'2': '2',
					'3': '3',
				},
			},
			{
				type: 'dropdown',
				key: 'bidiCount',
				displayName: 'Number of Bidi Syncs',
				default: '0',
				options: {
					'0': 'None',
					'1': '1',
					'2': '2',
					'3': '3',
				},
			},
			// Drill-down groups (collapsible, conditional)
			rollupGroup(1),
			rollupGroup(2),
			rollupGroup(3),
			bidiGroup(1),
			bidiGroup(2),
			bidiGroup(3),
		];
	}
}
