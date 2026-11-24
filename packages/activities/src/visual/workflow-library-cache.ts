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

    set(items: WorkflowDefinitionSummary[]): void {
        this.options = items.map(item => ({ ...item }));
    }
}
