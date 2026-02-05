import React, { useState, useEffect, useRef } from 'react';

interface TextEditorProps {
	value: any;
	type: 'text' | 'number';
	onSave: (newValue: any) => void;
	onCancel: () => void;
}

/**
 * Inline text/number editor for table cells.
 * Auto-focuses and selects on mount. Enter to save, Escape to cancel.
 */
export function TextEditor({ value, type, onSave, onCancel }: TextEditorProps) {
	const [draft, setDraft] = useState(value == null ? '' : String(value));
	const inputRef = useRef<HTMLInputElement>(null);
	const cancelledRef = useRef(false);

	useEffect(() => {
		inputRef.current?.focus();
		inputRef.current?.select();
	}, []);

	const commitValue = () => {
		if (cancelledRef.current) return;
		if (type === 'number') {
			const parsed = parseFloat(draft);
			onSave(isNaN(parsed) ? null : parsed);
		} else {
			onSave(draft);
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			commitValue();
		} else if (e.key === 'Escape') {
			e.preventDefault();
			cancelledRef.current = true;
			onCancel();
		}
	};

	return (
		<input
			ref={inputRef}
			className="cell-inline-editor"
			type={type}
			value={draft}
			onChange={(e) => setDraft(e.target.value)}
			onKeyDown={handleKeyDown}
			onBlur={commitValue}
		/>
	);
}
