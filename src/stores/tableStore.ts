import { create } from 'zustand';
import type { TableRowData, ColumnMeta, FocusedCell } from '../types';

interface TableState {
	rows: TableRowData[];
	columns: ColumnMeta[];
	focusedCell: FocusedCell | null;
	columnSizing: Record<string, number>;

	/** Replace all data (called from onDataUpdated) */
	setData: (rows: TableRowData[], columns: ColumnMeta[]) => void;

	/** Optimistic update: update a single cell value locally */
	updateCell: (rowIndex: number, propertyId: string, value: any) => void;

	/** Set the focused cell for keyboard navigation */
	setFocusedCell: (cell: FocusedCell | null) => void;

	/** Set the width of a column */
	setColumnSize: (columnId: string, width: number) => void;
}

export const useTableStore = create<TableState>((set) => ({
	rows: [],
	columns: [],
	focusedCell: null,
	columnSizing: {},

	setData: (rows, columns) => set({ rows, columns }),

	updateCell: (rowIndex, propertyId, value) =>
		set((state) => ({
			rows: state.rows.map((row, i) =>
				i === rowIndex ? { ...row, [propertyId]: value } : row
			),
		})),

	setFocusedCell: (cell) => set({ focusedCell: cell }),

	setColumnSize: (columnId, width) =>
		set((state) => ({
			columnSizing: { ...state.columnSizing, [columnId]: width },
		})),
}));
