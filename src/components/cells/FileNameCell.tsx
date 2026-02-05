import React, { useCallback } from 'react';
import type { CellContext } from '@tanstack/react-table';
import type { TableRowData } from '../../types';
import { useApp } from '../AppContext';

/**
 * File name cell renderer.
 * Renders the note's basename as a clickable internal link
 * that opens the note in the workspace.
 */
export function FileNameCell({
	row,
}: CellContext<TableRowData, unknown>) {
	const app = useApp();
	const file = row.original.file;

	const handleClick = useCallback(
		(e: React.MouseEvent) => {
			e.stopPropagation();
			app.workspace.openLinkText(file.path, '');
		},
		[app, file]
	);

	return (
		<span
			className="cell-file-name"
			onClick={handleClick}
			title={file.path}
		>
			{file.basename}
		</span>
	);
}
