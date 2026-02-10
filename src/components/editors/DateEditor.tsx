import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DateEditorProps {
	value: string | null;
	type: 'date' | 'datetime';
	onSave: (value: string | null) => void;
	onCancel: () => void;
}

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function parseDate(value: string | null): { year: number; month: number; day: number; time: string } {
	const now = new Date();
	if (!value) return { year: now.getFullYear(), month: now.getMonth(), day: 0, time: '00:00' };
	const dateMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
	const timeMatch = value.match(/T(\d{2}:\d{2})/);
	if (dateMatch) {
		return {
			year: parseInt(dateMatch[1]),
			month: parseInt(dateMatch[2]) - 1,
			day: parseInt(dateMatch[3]),
			time: timeMatch ? timeMatch[1] : '00:00',
		};
	}
	return { year: now.getFullYear(), month: now.getMonth(), day: 0, time: '00:00' };
}

function getDaysInMonth(year: number, month: number): number {
	return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
	return new Date(year, month, 1).getDay();
}

const MONTH_NAMES = [
	'January', 'February', 'March', 'April', 'May', 'June',
	'July', 'August', 'September', 'October', 'November', 'December',
];

export function DateEditor({ value, type, onSave, onCancel }: DateEditorProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const savedRef = useRef(false);
	const parsed = parseDate(value);
	const [viewYear, setViewYear] = useState(parsed.year);
	const [viewMonth, setViewMonth] = useState(parsed.month);
	const [selectedDay, setSelectedDay] = useState(parsed.day);
	const [selectedYear, setSelectedYear] = useState(parsed.year);
	const [selectedMonth, setSelectedMonth] = useState(parsed.month);
	const [timeValue, setTimeValue] = useState(parsed.time);

	const today = new Date();
	const todayYear = today.getFullYear();
	const todayMonth = today.getMonth();
	const todayDay = today.getDate();

	const buildValue = useCallback((y: number, m: number, d: number, t: string): string => {
		const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
		if (type === 'datetime') return `${dateStr}T${t}`;
		return dateStr;
	}, [type]);

	const handleDayClick = useCallback((day: number) => {
		setSelectedDay(day);
		setSelectedYear(viewYear);
		setSelectedMonth(viewMonth);
		savedRef.current = true;
		onSave(buildValue(viewYear, viewMonth, day, timeValue));
	}, [viewYear, viewMonth, timeValue, buildValue, onSave]);

	const handlePrevMonth = useCallback(() => {
		setViewMonth(prev => {
			if (prev === 0) { setViewYear(y => y - 1); return 11; }
			return prev - 1;
		});
	}, []);

	const handleNextMonth = useCallback(() => {
		setViewMonth(prev => {
			if (prev === 11) { setViewYear(y => y + 1); return 0; }
			return prev + 1;
		});
	}, []);

	const handleToday = useCallback(() => {
		setViewYear(todayYear);
		setViewMonth(todayMonth);
		setSelectedDay(todayDay);
		setSelectedYear(todayYear);
		setSelectedMonth(todayMonth);
		savedRef.current = true;
		onSave(buildValue(todayYear, todayMonth, todayDay, timeValue));
	}, [todayYear, todayMonth, todayDay, timeValue, buildValue, onSave]);

	const handleClear = useCallback(() => {
		savedRef.current = true;
		onSave(null);
	}, [onSave]);

	// Close on Escape
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				e.preventDefault();
				onCancel();
			}
		};
		document.addEventListener('keydown', handleKeyDown);
		return () => document.removeEventListener('keydown', handleKeyDown);
	}, [onCancel]);

	// Close on click outside
	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (savedRef.current) return;
			if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
				onCancel();
			}
		};
		// Delay to avoid immediate trigger from the double-click that opened us
		const timer = setTimeout(() => {
			document.addEventListener('mousedown', handleClickOutside);
		}, 0);
		return () => { clearTimeout(timer); document.removeEventListener('mousedown', handleClickOutside); };
	}, [selectedDay, selectedYear, selectedMonth, timeValue, buildValue, onSave, onCancel]);

	// Build calendar grid
	const daysInMonth = getDaysInMonth(viewYear, viewMonth);
	const firstDay = getFirstDayOfWeek(viewYear, viewMonth);
	const cells: (number | null)[] = [];
	for (let i = 0; i < firstDay; i++) cells.push(null);
	for (let d = 1; d <= daysInMonth; d++) cells.push(d);
	// Pad to fill last row
	while (cells.length % 7 !== 0) cells.push(null);

	const isSelected = (day: number) =>
		day === selectedDay && viewYear === selectedYear && viewMonth === selectedMonth;
	const isToday = (day: number) =>
		day === todayDay && viewYear === todayYear && viewMonth === todayMonth;

	return (
		<div className="calendar-popup" ref={containerRef}>
			<div className="calendar-header">
				<button className="calendar-nav" onClick={handlePrevMonth} type="button">
					<ChevronLeft size={16} />
				</button>
				<span className="calendar-month-label">
					{MONTH_NAMES[viewMonth]} {viewYear}
				</span>
				<button className="calendar-nav" onClick={handleNextMonth} type="button">
					<ChevronRight size={16} />
				</button>
			</div>
			<div className="calendar-grid">
				{DAYS_OF_WEEK.map(d => (
					<div key={d} className="calendar-day-header">{d}</div>
				))}
				{cells.map((day, i) => (
					<div
						key={i}
						className={
							'calendar-day' +
							(day === null ? ' empty' : '') +
							(day !== null && isToday(day) ? ' today' : '') +
							(day !== null && isSelected(day) ? ' selected' : '')
						}
						onClick={day !== null ? () => handleDayClick(day) : undefined}
					>
						{day}
					</div>
				))}
			</div>
			{type === 'datetime' && (
				<div className="calendar-time">
					<input
						type="time"
						className="calendar-time-input"
						value={timeValue}
						onChange={(e) => setTimeValue(e.target.value)}
					/>
				</div>
			)}
			<div className="calendar-footer">
				<button className="calendar-footer-btn" onClick={handleClear} type="button">Clear</button>
				<button className="calendar-footer-btn" onClick={handleToday} type="button">Today</button>
			</div>
		</div>
	);
}
