import React from 'react';
import type { CellContext } from '@tanstack/react-table';
import type { TableRowData } from '../../types';

/**
 * Read-only cell renderer for rollup (aggregated) values.
 * Displays numbers, percentages, and comma-separated lists.
 */
export function RollupCell({ getValue }: CellContext<TableRowData, unknown>) {
	const value = getValue();

	if (value === null || value === undefined) {
		return <span className="cell-empty" />;
	}

	// Numeric values
	if (typeof value === 'number') {
		return (
			<span className="rollup-cell rollup-numeric">
				{Number.isInteger(value) ? value : value.toFixed(2)}
			</span>
		);
	}

	// Percentage strings "(3/5) 60%"
	if (typeof value === 'string' && value.includes('%')) {
		return <span className="rollup-cell rollup-percent">{value}</span>;
	}

	// List/unique strings
	return (
		<span className="rollup-cell rollup-list" title={String(value)}>
			{String(value)}
		</span>
	);
}
