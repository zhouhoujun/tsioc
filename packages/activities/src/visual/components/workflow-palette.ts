import { Attribute, Component } from '@tsdi/components';
import { Optional } from '@tsdi/ioc';
import { Translator } from '@tsdi/i18n';
import { AccordionItem } from '@tsdi/components/common/accordion';
import { workflowQuickAdd } from './workflow-quick-add';
import { translateWorkflow } from '../i18n';
import { WorkflowPaletteGroup, WorkflowPaletteItem } from '../types';

/**
 * Generic workflow node palette. Items are data-driven from
 * {@link WorkflowNodeRegistry}; drag/drop and click both produce the same
 * insert action so custom hosts can choose either interaction.
 *
 * A local search box filters the registered components by label, description
 * and type without changing the registry or the parent view model.
 */
@Component({
    selector: 'workflow-palette',
    template: `
    <div class="workflow-palette">
        <div class="workflow-palette-search">
            <input class="workflow-palette-search-input" type="search"
                placeholder="{{searchPlaceholder}}"
                aria-label="{{searchPlaceholder}}"
                [value]="query"
                @input="search($event)"
                @keydown="searchKeydown($event)" />
            <button class="workflow-palette-quick-add" type="button"
                data-palette-quick-add title="{{quickAddTitle}}" aria-label="{{quickAddTitle}}"
                @click="openQuickAdd()">⌘</button>
        </div>
        <div class="workflow-palette-empty" v-if="query && !visibleGroups.length">{{noMatchesLabel}}</div>
        <div class="{{groupClass(group)}}" v-for="group in visibleGroups"
            data-palette-group="{{group.id}}" data-protocol="{{group.protocol}}">
            <ui-accordion controlled size="sm" variant="plain"
                :title="group.label"
                :count="group.items.length"
                :expanded="groupExpanded(group)"
                :toggleAction="toggleActionFor(group)"
                :items="accordionItems(group)"
                :selectAction="selectAccordionItem"
                :dragStartAction="dragAccordionItem"
                :draggable="true">
            </ui-accordion>
        </div>
    </div>`
})
export class WorkflowPaletteComponent {
    @Attribute() groups: WorkflowPaletteGroup[] = [];
    @Attribute() locale = 'zh-CN';
    @Attribute() addAction?: (item: WorkflowPaletteItem) => void;
    @Attribute() dragStartAction?: (event: any, item: WorkflowPaletteItem) => void;
    /** Recents bucket (the designer passes the workflow/document id). */
    @Attribute() recentScope = 'default';

    query = '';

    /** Groups start expanded; hosts keep the collapsed state while mounted. */
    collapsedGroups: Record<string, boolean> = {};

    constructor(@Optional() private translator?: Translator) { }

    get isZh(): boolean {
        return String(this.locale || '').toLowerCase().startsWith('zh');
    }

    get searchPlaceholder(): string {
        return translateWorkflow(
            this.translator,
            this.isZh ? 'zh-CN' : 'en',
            'workflow.ui.searchNodes',
            'Search nodes…'
        );
    }

    get noMatchesLabel(): string {
        return translateWorkflow(
            this.translator,
            this.isZh ? 'zh-CN' : 'en',
            'workflow.ui.noMatches',
            'No matching nodes'
        );
    }

    /** Groups filtered by the current query; empty groups are hidden. */
    get visibleGroups(): WorkflowPaletteGroup[] {
        const query = this.query.trim().toLowerCase();
        if (!query) {
            return this.groups || [];
        }
        return (this.groups || [])
            .map(group => ({
                ...group,
                items: (group.items || []).filter(item => this.matches(item, query))
            }))
            .filter(group => group.items.length > 0);
    }

    groupClass(group: WorkflowPaletteGroup): string {
        const classes = ['workflow-palette-group'];
        if (group.protocol) {
            classes.push('is-protocol');
        }
        if (!this.groupExpanded(group)) {
            classes.push('is-collapsed');
        }
        return classes.join(' ');
    }

    /** Search always reveals matches; otherwise the user's toggle wins. */
    groupExpanded(group: WorkflowPaletteGroup): boolean {
        if (this.query.trim()) {
            return true;
        }
        return !this.collapsedGroups[group.id];
    }

    toggleGroup(group: WorkflowPaletteGroup, expanded: boolean): void {
        // While filtering, the matching groups are forced open so results are
        // never hidden behind a previously collapsed header.
        if (this.query.trim()) {
            return;
        }
        this.collapsedGroups[group.id] = !expanded;
    }

    /** Bind one callback per row; keeps `this` on the palette proxy. */
    toggleActionFor(group: WorkflowPaletteGroup): (expanded: boolean) => void {
        return expanded => this.toggleGroup(group, expanded);
    }

    /** Map registry entries to the shared accordion row shape. */
    accordionItems(group: WorkflowPaletteGroup): AccordionItem[] {
        return (group.items || []).map(entry => ({
            id: entry.type,
            label: entry.label,
            description: entry.description,
            icon: entry.type,
            iconGlyph: entry.icon,
            className: 'workflow-palette-item',
            iconClassName: 'workflow-palette-icon',
            attrs: { 'data-node-type': entry.type },
            iconAttrs: { 'data-node-type': entry.type },
            value: entry
        }));
    }

    readonly selectAccordionItem = (item: WorkflowPaletteItem): void => {
        this.add(item);
    };

    readonly dragAccordionItem = (event: any, item: WorkflowPaletteItem): void => {
        this.dragStart(event, item);
    };

    search(event: any): void {
        this.query = String(event?.target?.value ?? '');
    }

    searchKeydown(event: any): void {
        const key = String(event?.key || '');
        if ((event?.ctrlKey || event?.metaKey) && key.toLowerCase() === 'k') {
            event.preventDefault?.();
            this.openQuickAdd();
            return;
        }
        if (key === 'Escape' && this.query) {
            event.preventDefault?.();
            this.query = '';
        }
    }

    openQuickAdd(): void {
        workflowQuickAdd.open();
    }

    add(item: WorkflowPaletteItem): void {
        workflowQuickAdd.remember(this.recentScope, item.type);
        this.addAction?.(item);
    }

    dragStart(event: any, item: WorkflowPaletteItem): void {
        if (event?.dataTransfer?.setData) {
            event.dataTransfer.setData('application/x-tsdi-workflow-node', item.type);
            event.dataTransfer.effectAllowed = 'copy';
        }
        this.dragStartAction?.(event, item);
    }

    protected matches(item: WorkflowPaletteItem, query: string): boolean {
        return [item.type, item.label, item.description, item.category]
            .filter(Boolean)
            .some(value => String(value).toLowerCase().includes(query));
    }
}
