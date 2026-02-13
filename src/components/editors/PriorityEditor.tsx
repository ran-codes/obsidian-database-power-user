import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

/** The three default priority options */
const PRIORITY_OPTIONS = ['high', 'medium', 'low'] as const;

/** Priority value color mapping (matches EditableCell display) */
const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
	high:   { bg: '#e74c3c', text: '#ffffff' },
	medium: { bg: '#f5d89a', text: '#1a1a1a' },
	low:    { bg: '#a3d5f5', text: '#1a1a1a' },
};

interface PriorityEditorProps {
	currentValue: string | null;
	onSelect: (value: string) => void;
	onClose: () => void;
}

/**
 * Single-select priority dropdown with 3 color-coded options.
 * Replaces ChipEditor for priority columns to enforce single selection
 * and provide a clean, focused editing experience.
 */
export function PriorityEditor({
	currentValue,
	onSelect,
	onClose,
}: PriorityEditorProps) {
	const [selectedIndex, setSelectedIndex] = useState(() => {
		if (!currentValue) return 0;
		const idx = PRIORITY_OPTIONS.indexOf(currentValue.toLowerCase() as any);
		return idx >= 0 ? idx : 0;
	});
	const containerRef = useRef<HTMLDivElement>(null);
	const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });

	// Position the dropdown below the cell
	useEffect(() => {
		if (containerRef.current) {
			const rect = containerRef.current.getBoundingClientRect();
			setDropdownPos({
				top: rect.bottom + 2,
				left: rect.left,
				width: Math.max(rect.width, 120),
			});
		}
	}, []);

	// Focus the container for keyboard events
	useEffect(() => {
		containerRef.current?.focus();
	}, []);

	const handleKeyDown = (e: React.KeyboardEvent) => {
		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				setSelectedIndex(i => Math.min(i + 1, PRIORITY_OPTIONS.length - 1));
				break;
			case 'ArrowUp':
				e.preventDefault();
				setSelectedIndex(i => Math.max(i - 1, 0));
				break;
			case 'Enter':
				e.preventDefault();
				onSelect(PRIORITY_OPTIONS[selectedIndex]);
				break;
			case 'Escape':
				e.preventDefault();
				onClose();
				break;
		}
	};

	const handleOptionClick = (value: string) => {
		onSelect(value);
	};

	return (
		<>
			<div
				ref={containerRef}
				className="priority-editor"
				tabIndex={0}
				onKeyDown={handleKeyDown}
				onBlur={() => {
					// Delay to allow click on options
					setTimeout(() => onClose(), 150);
				}}
			>
				{currentValue ? (
					<span
						className="cell-chip cell-chip-priority"
						style={{ backgroundColor: PRIORITY_COLORS[currentValue.toLowerCase()]?.bg ?? '#e0e0e0' }}
					>
						<span
							className="cell-chip-label"
							style={{ color: PRIORITY_COLORS[currentValue.toLowerCase()]?.text ?? '#1a1a1a' }}
						>
							{currentValue}
						</span>
					</span>
				) : (
					<span className="cell-empty-placeholder">Select priority...</span>
				)}
			</div>

			{createPortal(
				<div
					className="priority-editor-dropdown"
					style={{
						position: 'fixed',
						top: dropdownPos.top,
						left: dropdownPos.left,
						minWidth: dropdownPos.width,
					}}
				>
					{PRIORITY_OPTIONS.map((option, i) => {
						const colors = PRIORITY_COLORS[option];
						const isSelected = currentValue?.toLowerCase() === option;
						return (
							<div
								key={option}
								className={`priority-editor-option ${i === selectedIndex ? 'focused' : ''} ${isSelected ? 'current' : ''}`}
								onMouseDown={(e) => {
									e.preventDefault(); // Prevent blur
									handleOptionClick(option);
								}}
								onMouseEnter={() => setSelectedIndex(i)}
							>
								<span
									className="priority-editor-chip"
									style={{ backgroundColor: colors.bg }}
								>
									<span style={{ color: colors.text }}>{option}</span>
								</span>
								{isSelected && <span className="priority-editor-check">&#10003;</span>}
							</div>
						);
					})}
				</div>,
				document.body
			)}
		</>
	);
}
