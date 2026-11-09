import { Attribute, Component } from '@tsdi/components';
import { Optional } from '@tsdi/ioc';
import { Translator } from '@tsdi/i18n';
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
        </div>
        <div class="workflow-palette-empty" v-if="query && !visibleGroups.length">{{noMatchesLabel}}</div>
        <div class="workflow-palette-group" v-for="group in visibleGroups">
            <div class="workflow-palette-title">{{group.label}}</div>
            <div class="workflow-palette-item"
                 v-for="entry in group.items"
                 draggable="true"
                 [title]="entry.description"
                 data-node-type="{{entry.type}}"
                 @click="add(entry)"
                 @dragstart="dragStart($event, entry)">
                <span class="workflow-palette-icon" data-node-type="{{entry.type}}">{{entry.icon}}</span>
                <span class="workflow-palette-text">
                    <span class="workflow-palette-label">{{entry.label}}</span>
                    <span class="workflow-palette-desc">{{entry.description}}</span>
                </span>
            </div>
        </div>
    </div>`
})
export class WorkflowPaletteComponent {
    @Attribute() groups: WorkflowPaletteGroup[] = [];
    @Attribute() locale = 'zh-CN';
    @Attribute() addAction?: (item: WorkflowPaletteItem) => void;
    @Attribute() dragStartAction?: (event: any, item: WorkflowPaletteItem) => void;

    query = '';

    constructor(@Optional() private translator?: Translator) { }

    get isZh(): boolean {
        return String(this.locale || '').toLowerCase().startsWith('zh');
    }

    get searchPlaceholder(): string {
        return translateWorkflow(
            this.translator,
            this.isZh ? 'zh-CN' : 'en',
            'workflow.ui.searchNodes',
            this.isZh ? '搜索节点…' : 'Search nodes…'
        );
    }

    get noMatchesLabel(): string {
        return translateWorkflow(
            this.translator,
            this.isZh ? 'zh-CN' : 'en',
            'workflow.ui.noMatches',
            this.isZh ? '没有匹配的节点' : 'No matching nodes'
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

    search(event: any): void {
        this.query = String(event?.target?.value ?? '');
    }

    searchKeydown(event: any): void {
        if (event?.key === 'Escape' && this.query) {
            event.preventDefault?.();
            this.query = '';
        }
    }

    add(item: WorkflowPaletteItem): void {
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
