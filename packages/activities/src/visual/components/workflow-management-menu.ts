import { Attribute, Component, NoReactive } from '@tsdi/components';
import { Optional } from '@tsdi/ioc';
import { MenuBarGroup, ThemeName, isThemeName } from '@tsdi/components/common';
import { Translator } from '@tsdi/i18n';
import { translateWorkflow } from '../i18n';
import { WorkflowToolbarModel } from '../types';

const THEME_OPTIONS: ThemeName[] = ['light', 'dark', 'solarized', 'high-contrast'];
const EMPTY_MODEL: WorkflowToolbarModel = {
    name: '',
    nodeCount: 0,
    connectionCount: 0,
    hasSelection: false,
    canUndo: false,
    canRedo: false,
    canResume: false,
    running: false,
    zoomLabel: '100%',
    statusLabel: ''
};

/**
 * Global workflow management menu.
 *
 * Tabs, save/open, run controls, theme and shortcuts are product-management
 * concerns, so this menu lives in the host chrome (top-right) instead of inside
 * the designer canvas/toolbar. It emits action ids to the host.
 */
@Component({
    selector: 'workflow-management-menu',
    template: `
    <div class="workflow-management-menu" data-theme="{{themeName}}">
        <menu-bar icon="☰" label="" caret="▾" :triggerTitle="menuLabel"
            :groups="menuGroups" :selectAction="menuSelect"></menu-bar>
    </div>`
})
export class WorkflowManagementMenuComponent {
    @Attribute() model: WorkflowToolbarModel = EMPTY_MODEL;
    @Attribute() locale = 'zh-CN';
    @Attribute() theme: ThemeName = 'light';
    @Attribute() action?: (name: string) => void;
    @Attribute() themeChangeAction?: (theme: ThemeName) => void;

    @NoReactive() private cache?: { model: WorkflowToolbarModel; theme: string; locale: string; groups: MenuBarGroup[] };

    constructor(@Optional() private translator?: Translator) { }

    get isZh(): boolean {
        return String(this.locale || '').toLowerCase().startsWith('zh');
    }

    get themeName(): ThemeName {
        return isThemeName(this.theme) ? this.theme : 'light';
    }

    private t(key: string, fallback: string): string {
        return translateWorkflow(
            this.translator,
            this.isZh ? 'zh-CN' : 'en',
            `workflow.ui.${key}`,
            fallback
        );
    }

    get menuLabel(): string { return this.t('menu', 'Menu'); }

    get menuGroups(): MenuBarGroup[] {
        const model = this.model || EMPTY_MODEL;
        const cache = this.cache;
        if (cache && cache.model === model && cache.theme === this.theme && cache.locale === this.locale) {
            return cache.groups;
        }
        const t = (key: string, fallback: string) => this.t(key, fallback);
        const groups: MenuBarGroup[] = [
            {
                items: [
                    { id: 'save', label: t('save', 'Save'), shortcut: 'Ctrl+S' },
                    { id: 'open-library', label: t('library', 'Workflows') },
                    { id: 'toggle-json', label: t('jsonMenu', 'Import / Export JSON') }
                ]
            },
            {
                items: [
                    {
                        id: 'run',
                        label: t('run', 'Run'),
                        icon: '▶',
                        disabled: model.running || !model.nodeCount
                    },
                    {
                        id: 'resume',
                        label: t('resume', 'Resume'),
                        icon: '⏵',
                        disabled: !model.canResume
                    },
                    {
                        id: 'cancel',
                        label: t('stop', 'Stop'),
                        icon: '■',
                        disabled: !model.running
                    }
                ]
            },
            {
                items: [
                    { id: 'undo', label: t('undo', 'Undo'), shortcut: 'Ctrl+Z', disabled: !model.canUndo },
                    { id: 'redo', label: t('redo', 'Redo'), shortcut: 'Ctrl+Y', disabled: !model.canRedo },
                    { id: 'duplicate', label: t('duplicate', 'Duplicate'), shortcut: 'Ctrl+D', disabled: !model.hasSelection },
                    { id: 'delete', label: t('delete', 'Delete'), shortcut: 'Del', disabled: !model.hasSelection, danger: true },
                    { id: 'clear', label: t('clear', 'Clear'), disabled: !model.nodeCount }
                ]
            },
            {
                items: [
                    { id: 'reset-view', label: t('fit', 'Fit') },
                    { id: 'auto-layout', label: t('layout', 'Auto layout') },
                    { id: 'toggle-logs', label: t('logs', 'Logs') },
                    {
                        id: 'theme',
                        label: t('themeMenu', 'Theme'),
                        icon: '◐',
                        children: THEME_OPTIONS.map(theme => ({
                            id: `theme:${theme}`,
                            label: this.themeOptionLabel(theme),
                            checked: this.themeName === theme
                        }))
                    }
                ]
            },
            {
                items: [
                    { id: 'shortcuts', label: t('shortcuts', 'Keyboard shortcuts'), shortcut: '?' }
                ]
            }
        ];
        this.cache = { model, theme: this.theme, locale: this.locale, groups };
        return groups;
    }

    private themeOptionLabel(theme: ThemeName): string {
        switch (theme) {
            case 'dark': return this.t('themeDark', 'Dark');
            case 'solarized': return this.t('themeSolarized', 'Solarized');
            case 'high-contrast': return this.t('themeHighContrast', 'High contrast');
            default: return this.t('themeLight', 'Light');
        }
    }

    readonly menuSelect = (id: string): void => {
        if (id.startsWith('theme:')) {
            const theme = id.slice('theme:'.length);
            if ((THEME_OPTIONS as string[]).includes(theme)) {
                this.themeChangeAction?.(theme as ThemeName);
            }
            return;
        }
        this.action?.(id);
    };
}
