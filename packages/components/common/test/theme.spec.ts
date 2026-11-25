import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { ThemeService, applyThemeToDocument, contrastRatio, isDarkTheme, themeTokens } from '../src';
import { JSDOM } from 'jsdom';

@Suite('common theme service')
export class ThemeServiceTest {
    @Test('toggles built-in themes and notifies subscribers')
    toggles() {
        const service = new ThemeService();
        const seen: string[] = [];
        const unsubscribe = service.subscribe(theme => seen.push(theme));
        expect(service.current).toBe('light');
        expect(service.isDark).toBe(false);
        service.setTheme('dark');
        expect(service.current).toBe('dark');
        expect(service.isDark).toBe(true);
        expect(seen).toEqual(['light', 'dark']);
        expect(service.toggle()).toBe('solarized');
        expect(isDarkTheme('solarized')).toBe(true);
        unsubscribe();
        service.onDestroy();
    }

    @Test('built-in token sets keep readable text contrast')
    tokensContrast() {
        for (const theme of ['light', 'dark', 'solarized', 'high-contrast']) {
            const tokens = themeTokens(theme);
            expect(contrastRatio(tokens.fg, tokens.bg)).toBeGreaterThanOrEqual(4.5);
            expect(contrastRatio(tokens.mutedFg, tokens.bg)).toBeGreaterThanOrEqual(3);
            expect(contrastRatio(tokens.accentFg, tokens.accent)).toBeGreaterThanOrEqual(4.5);
            expect(contrastRatio(tokens.danger, tokens.bg)).toBeGreaterThanOrEqual(3);
        }
        expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 0);
        expect(contrastRatio('not-a-color', '#000000')).toBe(1);
    }

    @Test('applies optional token variables without changing the default contract')
    appliesTokens() {
        const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
        const service = new ThemeService();
        service.setTheme('dark');
        service.applyTo(dom.window.document, { tokens: true });
        const root = dom.window.document.documentElement;
        expect(root.getAttribute('data-theme')).toBe('dark');
        expect(root.style.getPropertyValue('--ui-bg')).toBe('#0d1117');
        expect(root.style.getPropertyValue('--ui-muted-fg')).toBe('#9da7b3');
        expect(root.style.getPropertyValue('--ui-accent-fg')).toBe('#0d1117');
        service.onDestroy();
    }

    @Test('applies theme attributes to the document')
    appliesDocumentTheme() {
        const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
        applyThemeToDocument(dom.window.document, 'high-contrast');
        const root = dom.window.document.documentElement;
        expect(root.getAttribute('data-theme')).toBe('high-contrast');
        expect(root.getAttribute('data-agent-theme')).toBe('high-contrast');
        expect(root.getAttribute('data-workspace-theme')).toBe('high-contrast');
    }
}
