import React, { useState, useCallback } from 'react';
import type { CellContext } from '@tanstack/react-table';
import type { TableRowData } from '../../types';
import { TextEditor } from '../editors/TextEditor';

/**
 * Editable cell renderer for non-relation, non-rollup columns.
 * Display mode: shows read-only value (text, number, checkbox, array).
 * Edit mode: mounts inline editor (double-click or Enter to activate).
 *
 * Booleans toggle immediately on click (no editor needed).
 * Arrays remain read-only (complex editing deferred).
 */
export function EditableCell({
	getValue,
	row,
	column,
	table,
}: CellContext<TableRowData, unknown>) {
	const [editing, setEditing] = useState(false);
	const value = getValue();

	const handleSave = useCallback(
		(newValue: any) => {
			setEditing(false);
			table.options.meta?.updateCell?.(row.index, column.id, newValue);
		},
		[table, row.index, column.id]
	);

	const handleCancel = useCallback(() => {
		setEditing(false);
	}, []);

	// Determine if this cell is keyboard-focused
	const focusedCell = table.options.meta?.focusedCell;
	const colIndex = table
		.getAllColumns()
		.findIndex((c) => c.id === column.id);
	const isFocused =
		focusedCell?.rowIndex === row.index &&
		focusedCell?.colIndex === colIndex;

	// Edit mode for text/number
	if (editing && typeof value !== 'boolean' && !Array.isArray(value)) {
		const editorType = typeof value === 'number' ? 'number' : 'text';
		return (
			<TextEditor
				value={value}
				type={editorType as 'text' | 'number'}
				onSave={handleSave}
				onCancel={handleCancel}
			/>
		);
	}

	// Null/undefined
	if (value === null || value === undefined) {
		return (
			<span
				className={`cell-empty ${isFocused ? 'cell-focused' : ''}`}
				onDoubleClick={() => setEditing(true)}
				onKeyDown={(e) => {
					if (e.key === 'Enter') setEditing(true);
				}}
				tabIndex={0}
			/>
		);
	}

	// Boolean — toggle immediately on click
	if (typeof value === 'boolean') {
		return (
			<input
				type="checkbox"
				checked={value}
				className="cell-checkbox cell-checkbox-editable"
				onChange={(e) => {
					table.options.meta?.updateCell?.(
						row.index,
						column.id,
						e.target.checked
					);
				}}
			/>
		);
	}

	// Array — read-only (complex editing deferred)
	if (Array.isArray(value)) {
		return (
			<span className="cell-list">
				{value.map((v, i) => (
					<span key={i} className="cell-list-item">
						{String(v)}
						{i < value.length - 1 ? ', ' : ''}
					</span>
				))}
			</span>
		);
	}

	// Text/number — double-click to edit
	return (
		<span
			className={`cell-text ${isFocused ? 'cell-focused' : ''}`}
			onDoubleClick={() => setEditing(true)}
			onKeyDown={(e) => {
				if (e.key === 'Enter') setEditing(true);
			}}
			tabIndex={0}
		>
			{String(value)}
		</span>
	);
}
