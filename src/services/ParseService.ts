import type { WikiLink } from '../types';

/** Regex for matching wikilink strings: [[path]] or [[path|alias]] */
export const WIKILINK_REGEX = /^\[\[([^\]|]+)(?:\|([^\]]+))?\]\]$/;

/**
 * Bidirectional value transformation service.
 * Handles conversion between Obsidian Value objects, display strings,
 * and YAML frontmatter storage format.
 */
export class ParseService {
	/**
	 * Check if a string is a wikilink.
	 */
	static isWikiLink(value: string): boolean {
		return WIKILINK_REGEX.test(value);
	}

	/**
	 * Parse a wikilink string into a WikiLink object.
	 * Returns null if the string is not a valid wikilink.
	 */
	static parseWikiLink(value: string): WikiLink | null {
		const match = value.match(WIKILINK_REGEX);
		if (!match) return null;

		const path = match[1].trim();
		const alias = match[2]?.trim();

		return {
			raw: value,
			path,
			display: alias || path.split('/').pop() || path,
		};
	}

	/**
	 * Check if a value is a relation (array where all elements are wikilinks).
	 */
	static isRelationValue(value: unknown): boolean {
		if (!Array.isArray(value) || value.length === 0) return false;
		return value.every(
			(item) => typeof item === 'string' && WIKILINK_REGEX.test(item)
		);
	}

	/**
	 * Parse an array of wikilink strings into WikiLink objects.
	 */
	static parseWikiLinks(value: unknown): WikiLink[] {
		if (!Array.isArray(value)) return [];
		return value
			.filter((item) => typeof item === 'string')
			.map((item) => ParseService.parseWikiLink(item))
			.filter((link): link is WikiLink => link !== null);
	}

	/**
	 * Format a note path as a wikilink string.
	 */
	static formatAsWikiLink(notePath: string, alias?: string): string {
		// Strip .md extension for cleaner wikilinks
		const cleanPath = notePath.replace(/\.md$/, '');
		if (alias) {
			return `[[${cleanPath}|${alias}]]`;
		}
		return `[[${cleanPath}]]`;
	}

	/**
	 * Format a value for display in a table cell.
	 */
	static parseForDisplay(value: unknown): string {
		if (value === null || value === undefined) return '';
		if (typeof value === 'boolean') return value ? 'true' : 'false';
		if (Array.isArray(value)) return value.map((v) => ParseService.parseForDisplay(v)).join(', ');
		return String(value);
	}
}
