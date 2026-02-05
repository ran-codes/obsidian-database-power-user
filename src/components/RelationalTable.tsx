import React, { useMemo, useState, useCallback } from 'react';
import {
	useReactTable,
	getCoreRowModel,
	flexRender,
	createColumnHelper,
	ColumnDef,
	RowData,
} from '@tanstack/react-table';
import type { TFile } from 'obsidian';
import type { TableRowData, ColumnMeta, SortConfig, FocusedCell, GroupData } from '../types';
import { EditableCell } from './cells/EditableCell';
import { FileNameCell } from './cells/FileNameCell';
import { RelationCell } from './cells/RelationCell';
import { RollupCell } from './cells/RollupCell';

// Extend TableMeta for all table interactions
declare module '@tanstack/react-table' {
	interface TableMeta<TData extends RowData> {
		updateRelation: (
			rowIndex: number,
			columnId: string,
			newLinks: string[]
		) => void;
		updateCell?: (
			rowIndex: number,
			columnId: string,
			value: any
		) => void;
		focusedCell: FocusedCell | null;
		setFocusedCell: (cell: FocusedCell | null) => void;
		baseFolder?: string;
		getRelationFolder: (columnId: string) => string | undefined;
	}
}

interface RelationalTableProps {
	rows: TableRowData[];
	columns: ColumnMeta[];
	sortConfig: SortConfig[];
	groups?: GroupData[];
	summaryValues?: Record<string, any>;
	baseFolder?: string;
	onUpdateRelation: (
		file: TFile,
		propertyId: string,
		newLinks: string[]
	) => void;
	onUpdateCell?: (
		file: TFile,
		propertyId: string,
		value: any
	) => void;
}

const columnHelper = createColumnHelper<TableRowData>();

export function RelationalTable({
	rows,
	columns,
	sortConfig,
	groups,
	summaryValues,
	baseFolder,
	onUpdateRelation,
	onUpdateCell,
}: RelationalTableProps) {
	const [focusedCell, setFocusedCell] = useState<FocusedCell | null>(null);

	// Build column definitions from ColumnMeta[]
	const columnDefs: ColumnDef<TableRowData, any>[] = useMemo(
		() =>
			columns.map((col) =>
				columnHelper.accessor(
					(row) => row[col.propertyId],
					{
						id: col.propertyId,
						header: () => {
							const sort = sortConfig.find(
								(s) => s.propertyId === col.propertyId
							);
							return (
								<span>
									{col.displayName}
									{col.isRollup && (
										<span className="rollup-indicator">
											{'\u03A3'}
										</span>
									)}
									{sort && (
										<span className="sort-indicator">
											{sort.direction === 'ASC'
												? ' \u2191'
												: ' \u2193'}
										</span>
									)}
								</span>
							);
						},
						cell: col.isRollup
							? RollupCell
							: col.isRelation
								? RelationCell
								: col.propertyId === 'file.name'
									? FileNameCell
									: EditableCell,
						size: 150,
						minSize: 50,
					}
				)
			),
		[columns, sortConfig]
	);

	const table = useReactTable({
		data: rows,
		columns: columnDefs,
		getCoreRowModel: getCoreRowModel(),
		manualSorting: true,
		columnResizeMode: 'onChange',
		meta: {
			updateRelation: (
				rowIndex: number,
				columnId: string,
				newLinks: string[]
			) => {
				const file = rows[rowIndex]?.file;
				if (file) {
					onUpdateRelation(file, columnId, newLinks);
				}
			},
			updateCell: onUpdateCell
				? (rowIndex: number, columnId: string, value: any) => {
						const file = rows[rowIndex]?.file;
						if (file) {
							onUpdateCell(file, columnId, value);
						}
				  }
				: undefined,
			focusedCell,
			setFocusedCell,
			baseFolder,
			getRelationFolder: (columnId: string) => {
				const col = columns.find((c) => c.propertyId === columnId);
				return col?.relationFolderFilter ?? baseFolder;
			},
		},
	});

	// Keyboard navigation handler
	const handleTableKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (!focusedCell) return;
			const { rowIndex, colIndex } = focusedCell;
			const maxRow = rows.length - 1;
			const maxCol = columns.length - 1;

			switch (e.key) {
				case 'ArrowUp':
					e.preventDefault();
					if (rowIndex > 0)
						setFocusedCell({
							rowIndex: rowIndex - 1,
							colIndex,
						});
					break;
				case 'ArrowDown':
					e.preventDefault();
					if (rowIndex < maxRow)
						setFocusedCell({
							rowIndex: rowIndex + 1,
							colIndex,
						});
					break;
				case 'ArrowLeft':
					e.preventDefault();
					if (colIndex > 0)
						setFocusedCell({
							rowIndex,
							colIndex: colIndex - 1,
						});
					break;
				case 'ArrowRight':
					e.preventDefault();
					if (colIndex < maxCol)
						setFocusedCell({
							rowIndex,
							colIndex: colIndex + 1,
						});
					break;
				case 'Tab':
					e.preventDefault();
					if (e.shiftKey) {
						if (colIndex > 0)
							setFocusedCell({
								rowIndex,
								colIndex: colIndex - 1,
							});
						else if (rowIndex > 0)
							setFocusedCell({
								rowIndex: rowIndex - 1,
								colIndex: maxCol,
							});
					} else {
						if (colIndex < maxCol)
							setFocusedCell({
								rowIndex,
								colIndex: colIndex + 1,
							});
						else if (rowIndex < maxRow)
							setFocusedCell({
								rowIndex: rowIndex + 1,
								colIndex: 0,
							});
					}
					break;
				case 'Escape':
					setFocusedCell(null);
					break;
			}
		},
		[focusedCell, rows.length, columns.length]
	);

	if (rows.length === 0) {
		return (
			<div className="relational-table-empty">
				No results found.
			</div>
		);
	}

	const renderRows = (rowsToRender: typeof table.getRowModel.prototype.rows) =>
		rowsToRender.map((row: any) => (
			<tr key={row.id}>
				{row.getVisibleCells().map((cell: any, colIdx: number) => (
					<td
						key={cell.id}
						onClick={() =>
							setFocusedCell({
								rowIndex: row.index,
								colIndex: colIdx,
							})
						}
						style={{ width: cell.column.getSize() }}
					>
						{flexRender(
							cell.column.columnDef.cell,
							cell.getContext()
						)}
					</td>
				))}
			</tr>
		));

	return (
		<div onKeyDown={handleTableKeyDown} tabIndex={-1}>
			<table
				className="relational-table"
				style={{ width: table.getCenterTotalSize() }}
			>
				<thead>
					{table.getHeaderGroups().map((headerGroup) => (
						<tr key={headerGroup.id}>
							{headerGroup.headers.map((header) => (
								<th
									key={header.id}
									style={{ width: header.getSize() }}
								>
									{header.isPlaceholder
										? null
										: flexRender(
												header.column.columnDef
													.header,
												header.getContext()
										  )}
									<div
										onMouseDown={header.getResizeHandler()}
										onTouchStart={header.getResizeHandler()}
										className={`resize-handle ${
											header.column.getIsResizing()
												? 'resizing'
												: ''
										}`}
									/>
								</th>
							))}
						</tr>
					))}
				</thead>
				<tbody>
					{groups && groups.length > 0
						? groups.map((group) => (
								<React.Fragment key={group.groupKey}>
									<tr className="group-header-row">
										<td
											colSpan={columns.length}
											className="group-header"
										>
											<span className="group-toggle">
												{'\u25BE'}
											</span>
											<span className="group-value">
												{String(
													group.groupValue ?? ''
												)}
											</span>
											<span className="group-count">
												({group.rows.length})
											</span>
										</td>
									</tr>
									{renderRows(
										table
											.getRowModel()
											.rows.filter((r: any) =>
												group.rows.some(
													(gr) =>
														gr.file.path ===
														r.original.file.path
												)
											)
									)}
								</React.Fragment>
						  ))
						: renderRows(table.getRowModel().rows)}
				</tbody>
				{summaryValues && (
					<tfoot>
						<tr className="summary-row">
							{table
								.getHeaderGroups()[0]
								?.headers.map((header) => (
									<td
										key={header.id}
										className="summary-cell"
									>
										{summaryValues[header.id] != null
											? String(
													summaryValues[header.id]
											  )
											: ''}
									</td>
								))}
						</tr>
					</tfoot>
				)}
			</table>
		</div>
	);
}
