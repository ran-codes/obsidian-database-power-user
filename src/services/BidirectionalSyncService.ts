import { App, TFile } from 'obsidian';
import { ParseService } from './ParseService';
import { NoteSearchService } from './NoteSearchService';

/**
 * Manages bidirectional relation sync.
 * When a relation is edited on note A, back-links are added/removed
 * on the target notes to keep both sides in sync.
 *
 * Uses processFrontMatter for atomic read+write to avoid stale cache
 * race conditions when multiple back-links target the same file.
 */
export class BidirectionalSyncService {
	/**
	 * After a relation cell is edited, sync back-links to target notes.
	 */
	static syncBackLinks(
		app: App,
		sourceFile: TFile,
		propertyName: string,
		oldLinks: string[],
		newLinks: string[]
	): void {
		console.log('[Bases Power User] syncBackLinks called:', {
			sourceFile: sourceFile.path,
			propertyName,
			oldLinks,
			newLinks,
		});

		const { added, removed } = BidirectionalSyncService.diffLinks(
			oldLinks,
			newLinks
		);

		console.log('[Bases Power User] diffLinks result:', { added, removed });

		const sourceBackLink = ParseService.formatAsWikiLink(sourceFile.path);
		console.log('[Bases Power User] sourceBackLink:', sourceBackLink);

		// Add back-links to newly added targets
		for (const link of added) {
			const parsed = ParseService.parseWikiLink(link);
			console.log('[Bases Power User] Parsing added link:', link, '→', parsed);
			if (!parsed) continue;

			const targetFile = NoteSearchService.resolveWikiLink(
				app,
				parsed.path,
				sourceFile.path
			);
			console.log('[Bases Power User] Resolved target file:', targetFile?.path);
			if (!targetFile) continue;

			console.log('[Bases Power User] Adding back-link to:', targetFile.path, 'property:', propertyName);
			BidirectionalSyncService.addBackLink(
				app,
				targetFile,
				propertyName,
				sourceBackLink
			);
		}

		// Remove back-links from removed targets
		for (const link of removed) {
			const parsed = ParseService.parseWikiLink(link);
			if (!parsed) continue;

			const targetFile = NoteSearchService.resolveWikiLink(
				app,
				parsed.path,
				sourceFile.path
			);
			if (!targetFile) continue;

			BidirectionalSyncService.removeBackLink(
				app,
				targetFile,
				propertyName,
				sourceBackLink
			);
		}
	}

	/**
	 * Compute which links were added and which were removed.
	 */
	private static diffLinks(
		oldLinks: string[],
		newLinks: string[]
	): { added: string[]; removed: string[] } {
		const normalize = (link: string): string => {
			const parsed = ParseService.parseWikiLink(link);
			return parsed ? parsed.path.toLowerCase() : link.toLowerCase();
		};

		const oldPaths = new Set(oldLinks.map(normalize));
		const newPaths = new Set(newLinks.map(normalize));

		const added = newLinks.filter(
			(link) => !oldPaths.has(normalize(link))
		);
		const removed = oldLinks.filter(
			(link) => !newPaths.has(normalize(link))
		);

		return { added, removed };
	}

	/**
	 * Add a back-link to a target note's property.
	 * Uses processFrontMatter for atomic read+write to avoid race conditions
	 * when multiple concurrent calls target the same file.
	 */
	private static addBackLink(
		app: App,
		targetFile: TFile,
		propertyName: string,
		backLink: string
	): void {
		const backParsed = ParseService.parseWikiLink(backLink);
		const backPath = backParsed?.path.toLowerCase() ?? '';

		app.fileManager.processFrontMatter(targetFile, (fm: any) => {
			const existing = fm[propertyName];

			if (Array.isArray(existing)) {
				// Check if back-link already exists
				const alreadyPresent = existing.some((item: any) => {
					if (typeof item !== 'string') return false;
					const parsed = ParseService.parseWikiLink(item);
					return parsed?.path.toLowerCase() === backPath;
				});
				if (!alreadyPresent) {
					fm[propertyName] = [...existing, backLink];
				}
			} else if (existing === undefined || existing === null) {
				// Property doesn't exist — create as list
				fm[propertyName] = [backLink];
			}
			// If property exists but is not an array, don't modify
		});
	}

	/**
	 * Remove a back-link from a target note's property.
	 * Uses processFrontMatter for atomic read+write.
	 */
	private static removeBackLink(
		app: App,
		targetFile: TFile,
		propertyName: string,
		backLink: string
	): void {
		const backParsed = ParseService.parseWikiLink(backLink);
		const backPath = backParsed?.path.toLowerCase() ?? '';

		app.fileManager.processFrontMatter(targetFile, (fm: any) => {
			const existing = fm[propertyName];
			if (!Array.isArray(existing)) return;

			const filtered = existing.filter((item: any) => {
				if (typeof item !== 'string') return true;
				const parsed = ParseService.parseWikiLink(item);
				return parsed?.path.toLowerCase() !== backPath;
			});

			if (filtered.length !== existing.length) {
				fm[propertyName] = filtered;
			}
		});
	}
}
