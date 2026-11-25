import { WorkflowCanvasNodeView } from './types';

/**
 * DOM attributes for one canvas node.
 *
 * The accent/text custom properties carry the node's resolved style so an
 * inspector color edit repaints the canvas header instead of only updating the
 * inspector swatch. Type-based CSS accents remain the fallback for hosts that
 * render without this attribute map.
 */
export function workflowNodeAttrs(view: Omit<WorkflowCanvasNodeView, 'attrs'>): Record<string, string> {
    return {
        class: [
            'workflow-node',
            view.selected ? 'is-selected' : '',
            view.disabled ? 'is-disabled' : ''
        ].filter(Boolean).join(' '),
        'data-node-id': view.id,
        'data-node-type': view.type,
        'data-status': view.status,
        role: 'button',
        tabindex: '0',
        'aria-label': view.name,
        style: [
            `left:${view.x}px`,
            `top:${view.y}px`,
            `width:${view.width}px`,
            `min-height:${view.height}px`,
            `--wf-accent:${view.color}`,
            `--wf-node-text:${view.textColor}`
        ].join(';')
    };
}
