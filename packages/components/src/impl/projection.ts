import { Renderer } from '../renderer/Renderer';
import { PROJECTION_NODES, RAttr, RNode } from '../renderer/Node';

export const PROJECTION_OUTLETS = Symbol('__PROJECTION_OUTLETS');

interface ProjectionOutlet {
    outlet: RNode;
    select?: string;
    slot?: string;
}

/**
 * Register a `<v-content>`/`<ng-content>` outlet. Projection is flushed after
 * the component host view is created, so outlets can appear in any order.
 */
export function registerProjectionOutlet(host: any, outlet: RNode, attrs: RAttr[], renderer: Renderer): void {
    if (!host || typeof host !== 'object') {
        return;
    }
    let outlets = host[PROJECTION_OUTLETS] as ProjectionOutlet[] | undefined;
    if (!outlets) {
        outlets = [];
        host[PROJECTION_OUTLETS] = outlets;
    }
    const select = attrs?.find(attr => attr.name === 'select')?.value;
    const slot = attrs?.find(attr => attr.name === 'slot')?.value;
    outlets.push({ outlet, select, slot });
    attrs?.forEach(attr => {
        if (attr.name === 'class' || attr.name === 'id') {
            renderer.setAttribute?.(outlet, attr.name, attr.value);
        }
    });
}

export function flushProjectionOutlets(host: any, renderer: Renderer): void {
    if (!host || typeof host !== 'object') {
        return;
    }
    const outlets = host[PROJECTION_OUTLETS] as ProjectionOutlet[] | undefined;
    if (!outlets?.length) {
        return;
    }
    const nodes = host[PROJECTION_NODES] as RNode[] | undefined;
    if (!nodes?.length) {
        host[PROJECTION_OUTLETS] = undefined;
        return;
    }

    const defaults = outlets.filter(outlet => !outlet.select && !outlet.slot);
    const assigned = new Set<RNode>();
    const assign = (node: RNode, outlet: ProjectionOutlet): void => {
        if (assigned.has(node)) {
            return;
        }
        assigned.add(node);
        if (node.parentNode) {
            try {
                renderer.removeChild(node.parentNode, node);
            } catch {
                // Already detached.
            }
        }
        renderer.appendChild(outlet.outlet, node);
    };

    // Explicit selectors / slots first; the default outlet receives leftovers.
    for (const node of nodes) {
        const nodeSlot = getProjectedSlot(node, renderer);
        const target = nodeSlot
            ? outlets.find(outlet => outlet.slot === nodeSlot
                || (!!outlet.select && matchesSelector(renderer, node, outlet.select)))
            : outlets.find(outlet => !!outlet.select && matchesSelector(renderer, node, outlet.select));
        if (target) {
            assign(node, target);
        }
    }
    const fallback = defaults[0] ?? outlets[0];
    if (fallback) {
        for (const node of nodes) {
            if (!assigned.has(node)) {
                assign(node, fallback);
            }
        }
    }
    host[PROJECTION_OUTLETS] = undefined;
}

function getProjectedSlot(node: RNode, renderer: Renderer): string | undefined {
    try {
        const attrs = renderer.getAttributes(node) || [];
        return attrs.find(attr => attr.name === 'slot')?.value;
    } catch {
        return undefined;
    }
}

function matchesSelector(renderer: Renderer, node: RNode, selector: string): boolean {
    if (!selector) {
        return false;
    }
    const native = renderer as any;
    if (typeof native.matchesSelector === 'function') {
        try {
            return !!native.matchesSelector(node, selector);
        } catch {
            // Fall through to the simple matcher.
        }
    }
    const anyNode = node as any;
    if (selector.startsWith('[') && selector.endsWith(']')) {
        const body = selector.slice(1, -1);
        const eq = body.indexOf('=');
        if (eq >= 0) {
            const name = body.slice(0, eq).trim();
            const value = body.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
            return anyNode.getAttribute?.(name) === value;
        }
        return !!anyNode.hasAttribute?.(body.trim());
    }
    if (selector.startsWith('.')) {
        const className = selector.slice(1);
        return !!anyNode.classList?.contains?.(className)
            || String(anyNode.className || '').split(/\s+/).includes(className);
    }
    if (selector.startsWith('#')) {
        return anyNode.getAttribute?.('id') === selector.slice(1);
    }
    return String(anyNode.tagName || '').toLowerCase() === selector.toLowerCase();
}
