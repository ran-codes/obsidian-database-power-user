import React, { useState, useCallback } from 'react';
import type { CellContext } from '@tanstack/react-table';
import type { TableRowData, WikiLink } from '../../types';
import { ParseService } from '../../services/ParseService';
import { RelationEditor } from '../editors/RelationEditor';
import { useApp } from '../AppContext';

/**
 * Relation cell renderer.
 * Display mode: renders wikilinks as clickable chips.
 * Edit mode (dirtyCell pattern from DB Folder): mounts RelationEditor.
 */
export function RelationCell({
	getValue,
	row,
	column,
	table,
}: CellContext<TableRowData, unknown>) {
	const [editing, setEditing] = useState(false);
	const app = useApp();

	const rawValue = getValue();
	const links: WikiLink[] = ParseService.parseWikiLinks(rawValue);
	const file = row.original.file;

	const handleChipClick = useCallback(
		(e: React.MouseEvent, link: WikiLink) => {
			e.stopPropagation();
			app.workspace.openLinkText(link.path, file.path);
		},
		[app, file]
	);

	const handleChipRemove = useCallback(
		(e: React.MouseEvent, linkToRemove: WikiLink) => {
			e.stopPropagation();
			const remaining = links
				.filter((l) => l.path !== linkToRemove.path)
				.map((l) => l.raw);
			table.options.meta?.updateRelation(
				row.index,
				column.id,
				remaining
			);
		},
		[links, table, row.index, column.id]
	);

	const handleEditDone = useCallback(
		(newLinks: string[]) => {
			setEditing(false);
			table.options.meta?.updateRelation(
				row.index,
				column.id,
				newLinks
			);
		},
		[table, row.index, column.id]
	);

	// Edit mode — mount the react-select CreatableSelect picker
	if (editing) {
		return (
			<RelationEditor
				currentLinks={links}
				onDone={handleEditDone}
				onCancel={() => setEditing(false)}
				folderFilter={table.options.meta?.getRelationFolder(column.id)}
			/>
		);
	}

	// Display mode — render wikilink chips
	return (
		<div
			className="relation-cell"
			onDoubleClick={() => setEditing(true)}
			onKeyDown={(e) => {
				if (e.key === 'Enter') setEditing(true);
			}}
			tabIndex={0}
		>
			{links.map((link, i) => (
				<span
					key={i}
					className="relation-chip"
					title={link.path}
				>
					<span
						className="relation-chip-label"
						onClick={(e) => handleChipClick(e, link)}
					>
						{link.display}
					</span>
					<span
						className="relation-chip-remove"
						onClick={(e) => handleChipRemove(e, link)}
						title="Remove"
					>
						{'\u00d7'}
					</span>
				</span>
			))}
			<button
				className="relation-add-btn"
				onClick={(e) => {
					e.stopPropagation();
					setEditing(true);
				}}
				title="Add relation"
			>
				+
			</button>
		</div>
	);
}
