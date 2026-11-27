import { AfterViewInit, Attribute, Component, OnDestroy, ViewChild } from '@tsdi/components';
import { Optional } from '@tsdi/ioc';
import { Translator } from '@tsdi/i18n';
import { CommandPaletteComponent } from '@tsdi/components/common/command-palette';
import type { SearchListItem } from '@tsdi/components/common/search-list';
import { translateWorkflow } from '../i18n';
import { WorkflowPaletteGroup, WorkflowPaletteItem } from '../types';

let activePalette: CommandPaletteComponent | undefined;
const recents = new Map<string, string[]>();

/** Small app-level bus so the palette button can open the quick-add overlay. */
export const workflowQuickAdd = {
    open(): void {
        activePalette?.openPalette();
    },
    remember(scope: string | undefined, type: string): void {
        const key = String(scope || 'default');
        const current = recents.get(key) || [];
        recents.set(key, [type, ...current.filter(item => item !== type)].slice(0, 8));
    },
    recent(scope: string | undefined): string[] {
        return recents.get(String(scope || 'default')) || [];
    }
};

/**
 * Node quick-add overlay composed from the shared command palette.
 *
 * Lives above the workspace panes so designer re-renders cannot destroy the
 * overlay; the palette opens it through {@link workflowQuickAdd}.
 */
@Component({
    selector: 'workflow-quick-add',
    imports: [CommandPaletteComponent],
    template: `
    <ui-command-palette :items="items" :recentIds="recentNodeIds"
        :recentLabel="recentLabel" :title="titleLabel" :placeholder="searchPlaceholder"
        :emptyLabel="noMatchesLabel" :ariaLabel="titleLabel"
        :selectAction="select"></ui-command-palette>`
})
export class WorkflowQuickAddComponent implements AfterViewInit, OnDestroy {
    @Attribute() groups: WorkflowPaletteGroup[] = [];
    @Attribute() locale = 'zh-CN';
    /** Recents bucket (the designer passes the workflow/document id). */
    @Attribute() definitionId = 'default';
    @Attribute() addAction?: (item: WorkflowPaletteItem) => void;

    @ViewChild(CommandPaletteComponent) commandPalette?: CommandPaletteComponent;

    constructor(@Optional() private translator?: Translator) { }

    onAfterViewInit(): void {
        if (this.commandPalette) {
            activePalette = this.commandPalette;
        }
    }

    onDestroy(): void {
        if (activePalette === this.commandPalette) {
            activePalette = undefined;
        }
    }

    get isZh(): boolean {
        return String(this.locale || '').toLowerCase().startsWith('zh');
    }

    protected t(key: string, fallback: string): string {
        return translateWorkflow(
            this.translator,
            this.isZh ? 'zh-CN' : 'en',
            `workflow.ui.${key}`,
            fallback
        );
    }

    get titleLabel(): string { return this.t('quickAdd', 'Quick add'); }
    get searchPlaceholder(): string { return this.t('searchNodes', 'Search nodes…'); }
    get noMatchesLabel(): string { return this.t('noMatches', 'No matching nodes'); }
    get recentLabel(): string { return this.t('recentNodes', 'Recent'); }

    get recentNodeIds(): string[] {
        return workflowQuickAdd.recent(this.definitionId);
    }

    /** Flattened registry rows for the command palette. */
    get items(): SearchListItem[] {
        const items: SearchListItem[] = [];
        (this.groups || []).forEach(group => {
            (group.items || []).forEach(entry => {
                items.push({
                    id: entry.type,
                    label: entry.label,
                    description: entry.description,
                    icon: entry.icon,
                    group: group.label,
                    keywords: [entry.type, entry.category, group.protocol]
                        .filter(Boolean)
                        .join(' ')
                });
            });
        });
        return items;
    }

    readonly select = (item: SearchListItem): void => {
        const selected = this.findItem(item?.id);
        if (selected) {
            this.add(selected);
        }
    };

    protected findItem(type: string): WorkflowPaletteItem | undefined {
        for (const group of this.groups || []) {
            const found = (group.items || []).find(entry => entry.type === type);
            if (found) {
                return found;
            }
        }
        return undefined;
    }

    protected add(item: WorkflowPaletteItem): void {
        workflowQuickAdd.remember(this.definitionId, item.type);
        this.addAction?.(item);
    }
}
