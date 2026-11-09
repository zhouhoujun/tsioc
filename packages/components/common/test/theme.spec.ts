import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { ThemeService, applyThemeToDocument, isDarkTheme } from '../src';
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
