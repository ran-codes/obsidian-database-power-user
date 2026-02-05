import { createContext, useContext } from 'react';
import { App } from 'obsidian';

export const AppContext = createContext<App | undefined>(undefined);

export function useApp(): App {
	const app = useContext(AppContext);
	if (!app) {
		throw new Error('useApp must be used within AppContext.Provider');
	}
	return app;
}
