import type { WorkflowDefinitionSummary } from './workflow-store';

/**
 * Stored workflow summaries offered by the subflow/loop reference picker.
 *
 * The designer component refreshes these from the host store; the picker reads
 * them from the inspector view model, so a new save or delete only has to
 * replace `options` for every open picker to follow.
 */
export class WorkflowLibraryCache {
    options: WorkflowDefinitionSummary[] = [];
    /** True once a host store answered; an empty list then really means empty. */
    loaded = false;

    set(items: WorkflowDefinitionSummary[]): void {
        this.options = items.map(item => ({ ...item }));
        this.loaded = true;
    }

    /** Stored ids for reference validation; `undefined` before the first load. */
    get ids(): string[] | undefined {
        return this.loaded ? this.options.map(item => item.id) : undefined;
    }
}
