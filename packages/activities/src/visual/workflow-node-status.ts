import type { NodeExecutionState, NodeExecutionStatus } from './types';
import { translateWorkflow } from './i18n';
import type { WorkflowLocale } from './node-registry';
import type { Translator } from '@tsdi/i18n';

const STATUS_LABELS: Record<string, string> = {
    idle: 'Idle',
    running: 'Running',
    success: 'Success',
    failed: 'Failed',
    skipped: 'Skipped',
    blocked: 'Blocked',
    cancelled: 'Cancelled'
};

export function nodeStatusLabel(status: NodeExecutionStatus, locale: WorkflowLocale, translator?: Translator): string {
    return translateWorkflow(
        translator,
        locale,
        `workflow.status.${status}`,
        STATUS_LABELS[status] || STATUS_LABELS.idle
    );
}

export function executionStatusLabel(
    status: string | undefined,
    locale: WorkflowLocale,
    translator?: Translator
): string {
    const key = status || 'idle';
    const fallback: Record<string, string> = {
        running: 'Running',
        completed: 'Completed',
        failed: 'Failed',
        cancelled: 'Cancelled',
        pending: 'Pending',
        idle: 'Idle'
    };
    return translateWorkflow(
        translator,
        locale,
        `workflow.status.${key}`,
        fallback[key] || fallback.idle
    );
}

/**
 * Status line for a node: translated through the workflow bundle when the
 * activity supplied a key, otherwise the reported text (`tcp 10.0.0.5:4711`).
 */
export function nodeStatusDetail(
    state: NodeExecutionState | undefined,
    locale: WorkflowLocale,
    translator?: Translator
): string {
    const status = state?.result?.status;
    if (!status?.text && !status?.key) {
        return '';
    }
    if (status.key) {
        return translateWorkflow(translator, locale, status.key, status.text || status.key, status.params);
    }
    return String(status.text || '');
}

/** Inline style for the Node-RED status dot/ring; empty when not reported. */
export function statusIndicatorStyle(shape?: string, fill?: string): string {
    if (!shape && !fill) {
        return '';
    }
    const color = fill || 'currentColor';
    return `background:${shape === 'ring' ? 'transparent' : color};border:1px solid ${color};`;
}
