import {
    IVisualWorkflowNode,
    NodeExecutionStatus,
    WorkflowConfigField,
    WorkflowConfigFieldCondition,
    WorkflowCanvasEdgeView,
    WorkflowCanvasModel,
    WorkflowCanvasNodeView,
    WorkflowCanvasPortView,
    WorkflowInspectorFieldView,
    WorkflowCanvasGroupView,
    WorkflowDebugItem,
    WorkflowInspectorModel,
    WorkflowNodeDefinition,
    WorkflowPaletteGroup,
    WorkflowRunHistoryItem,
    WorkflowStatusModel,
    WorkflowToolbarModel
} from './types';
import { localize, WorkflowLocale, WorkflowNodeRegistry } from './node-registry';
import { WorkflowDesigner } from './workflow-designer';
import { Translator } from '@tsdi/i18n';
import { resolveWorkflowText, translateWorkflow } from './i18n';
import {
    WORKFLOW_NODE_WIDTH,
    WORKFLOW_PORT_SPACING,
    WORKFLOW_PORT_START,
    workflowNodeFrame
} from './workflow-geometry';

export {
    WORKFLOW_NODE_WIDTH,
    WORKFLOW_NODE_HEADER_HEIGHT,
    WORKFLOW_PORT_SPACING,
    WORKFLOW_PORT_START,
    workflowNodeFrame
} from './workflow-geometry';

const STATUS_LABELS: Record<NodeExecutionStatus, string> = {
    idle: 'Idle',
    pending: 'Pending',
    running: 'Running',
    success: 'Done',
    failed: 'Failed',
    skipped: 'Skipped',
    cancelled: 'Cancelled'
};

function groupSlug(group: string): string {
    return String(group).toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

export function nodeStatusLabel(status: NodeExecutionStatus, locale: WorkflowLocale, translator?: Translator): string {
    return translateWorkflow(
        translator,
        locale,
        `workflow.status.${status}`,
        STATUS_LABELS[status] || STATUS_LABELS.idle
    );
}

function executionStatusLabel(
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

function nodeGeometry(node: IVisualWorkflowNode): {
    width: number;
    height: number;
    inputs: WorkflowCanvasPortView[];
    outputs: WorkflowCanvasPortView[];
} {
    const { width, height } = workflowNodeFrame(node);
    const makePorts = (ports: IVisualWorkflowNode['inputs'], x: number): WorkflowCanvasPortView[] =>
        (ports || []).map((port, index) => ({
            id: port.id,
            label: port.label || port.name || port.id,
            type: port.type,
            x,
            y: node.position.y + WORKFLOW_PORT_START + index * WORKFLOW_PORT_SPACING - 5
        }));
    return {
        width,
        height,
        inputs: makePorts(node.inputs, node.position.x),
        outputs: makePorts(node.outputs, node.position.x + width)
    };
}

export function edgePath(
    source: { x: number; y: number },
    target: { x: number; y: number }
): string {
    const dx = Math.max(48, Math.abs(target.x - source.x) / 2);
    return `M ${source.x} ${source.y} C ${source.x + dx} ${source.y}, ${target.x - dx} ${target.y}, ${target.x} ${target.y}`;
}


function nodeAttrs(view: Omit<WorkflowCanvasNodeView, 'attrs'>): Record<string, string> {
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
            `min-height:${view.height}px`
        ].join(';')
    };
}

/**
 * Signature per rendered canvas view. The model is rebuilt on every designer
 * change, but reusing the same view object for unchanged nodes/edges keeps
 * `v-for` from re-rendering the whole graph (drag, pan, selection, one field).
 *
 * The signature lives on the view under a symbol instead of a WeakMap: host
 * components read cached models through reactive proxies, so a WeakMap lookup
 * with the proxied view would miss and silently rebuild the whole graph.
 */
const VIEW_SIGNATURE = Symbol('workflowCanvasViewSignature');
type SignedView = { [VIEW_SIGNATURE]?: string };

function viewSignature(view: unknown): string | undefined {
    return view ? (view as SignedView)[VIEW_SIGNATURE] : undefined;
}

function markView(view: object, signature: string): void {
    (view as SignedView)[VIEW_SIGNATURE] = signature;
}

/**
 * Projection inputs per view. Node/connection objects are replaced immutably on
 * every edit, so identity checks let the projection skip building per-field
 * signatures for the whole graph when a single node changed (typing in the
 * inspector otherwise re-signed all 300 nodes on every keystroke).
 */
const VIEW_INPUTS = Symbol('workflowCanvasViewInputs');
type NodeViewInputs = {
    node: any;
    status: string;
    selected: boolean;
    locale: string;
    revision: number;
};
type EdgeViewInputs = {
    connection: any;
    status: string;
    selected: boolean;
    sourcePort: WorkflowCanvasPortView | undefined;
    targetPort: WorkflowCanvasPortView | undefined;
    locale: string;
    revision: number;
};
type InputsHolder = {
    [VIEW_INPUTS]?: NodeViewInputs | EdgeViewInputs;
};

function viewInputsOf<T extends NodeViewInputs | EdgeViewInputs>(view: unknown): T | undefined {
    return view ? (view as InputsHolder)[VIEW_INPUTS] as T : undefined;
}

function markInputs(view: object, inputs: NodeViewInputs | EdgeViewInputs): void {
    (view as InputsHolder)[VIEW_INPUTS] = inputs;
}

function portSignature(ports: WorkflowCanvasPortView[]): string {
    return ports.map(port => `${port.id}:${port.label}:${port.type || ''}:${port.x}:${port.y}`).join(',');
}

/**
 * Project the designer state into a canvas render model.
 *
 * `previous` enables incremental projection: nodes/edges whose painted fields
 * did not change keep their existing view object. Pan/zoom and inspector edits
 * therefore stop rebuilding the whole node list, while the returned model is
 * still a fresh wrapper so viewport bindings update normally.
 */
export function buildWorkflowCanvasModel(
    designer: WorkflowDesigner,
    registry: WorkflowNodeRegistry,
    locale: WorkflowLocale = 'zh-CN',
    translator?: Translator,
    previous?: WorkflowCanvasModel
): WorkflowCanvasModel {
    const nodeViews: WorkflowCanvasNodeView[] = [];
    const geometry = new Map<string, ReturnType<typeof nodeGeometry>>();
    const execution = designer.execution;
    const selection = designer.selection;
    const selectedNodeIds = new Set(designer.selectedNodeIds);
    const previousNodes = previous
        ? new Map(previous.nodes.map(view => [view.id, view]))
        : undefined;
    const hiddenNodeIds = new Set<string>();
    (designer.definition.groups || []).forEach(group => {
        if (group.collapsed === true) {
            (group.nodeIds || []).forEach(id => hiddenNodeIds.add(id));
        }
    });

    for (const node of designer.nodes) {
        if (hiddenNodeIds.has(node.id)) {
            continue;
        }
        const status = (execution?.nodeStates?.[node.id]?.status as NodeExecutionStatus) || 'idle';
        const selected = selectedNodeIds.has(node.id);
        const prior = previousNodes?.get(node.id);
        const inputs = prior ? viewInputsOf<NodeViewInputs>(prior) : undefined;
        if (inputs
            && prior
            && inputs.node === node
            && inputs.status === status
            && inputs.selected === selected
            && inputs.locale === locale
            && inputs.revision === registry.revision) {
            nodeViews.push(prior);
            geometry.set(node.id, {
                width: prior.width,
                height: prior.height,
                inputs: prior.inputs,
                outputs: prior.outputs
            });
            continue;
        }
        const geo = nodeGeometry(node);
        geometry.set(node.id, geo);
        const typeLabel = registry.nodeLabel(node.type, locale, translator);
        const description = node.description || registry.nodeDescription(node.type, locale, translator);
        const icon = node.style?.icon || registry.get(node.type)?.icon || '◆';
        const color = node.style?.backgroundColor || registry.get(node.type)?.color || '#64748b';
        const textColor = node.style?.textColor || registry.get(node.type)?.textColor || '#ffffff';
        const disabled = node.disabled === true;
        const statusLabel = nodeStatusLabel(status, locale, translator);
        const signature = [
            node.id, node.name, node.type, typeLabel, description,
            node.position.x, node.position.y, geo.width, geo.height,
            icon, color, textColor, selected ? 1 : 0, disabled ? 1 : 0,
            status, statusLabel,
            portSignature(geo.inputs), portSignature(geo.outputs)
        ].join('\u0001');
        if (prior && viewSignature(prior) === signature) {
            nodeViews.push(prior);
            continue;
        }
        const view: Omit<WorkflowCanvasNodeView, 'attrs'> = {
            id: node.id,
            name: node.name,
            type: node.type,
            typeLabel,
            description,
            x: node.position.x,
            y: node.position.y,
            width: geo.width,
            height: geo.height,
            icon,
            color,
            textColor,
            selected,
            disabled,
            status,
            statusLabel,
            inputs: geo.inputs,
            outputs: geo.outputs
        };
        const next = { ...view, attrs: nodeAttrs(view) };
        markView(next, signature);
        markInputs(next, { node, status, selected, locale, revision: registry.revision });
        nodeViews.push(next);
    }

    const previousEdges = previous
        ? new Map(previous.edges.map(view => [view.id, view]))
        : undefined;
    const edgeViews: WorkflowCanvasEdgeView[] = designer.connections
        .filter(connection => !hiddenNodeIds.has(connection.sourceNodeId)
            && !hiddenNodeIds.has(connection.targetNodeId))
        .map(connection => {
        const sourceGeo = geometry.get(connection.sourceNodeId);
        const targetGeo = geometry.get(connection.targetNodeId);
        const sourcePort = sourceGeo?.outputs.find(port => port.id === connection.sourcePort) || sourceGeo?.outputs[0];
        const targetPort = targetGeo?.inputs.find(port => port.id === connection.targetPort) || targetGeo?.inputs[0];
        const status = execution?.edgeStates?.[connection.id]?.status || 'idle';
        const selected = selection?.connectionId === connection.id;
        const priorEdge = previousEdges?.get(connection.id);
        if (priorEdge) {
            const inputs = viewInputsOf<EdgeViewInputs>(priorEdge);
            if (inputs
                && inputs.connection === connection
                && inputs.status === status
                && inputs.selected === selected
                && inputs.sourcePort === sourcePort
                && inputs.targetPort === targetPort
                && inputs.locale === locale
                && inputs.revision === registry.revision) {
                return priorEdge;
            }
        }
        const label = connection.label || '';
        const d = sourcePort && targetPort
            ? edgePath(sourcePort, targetPort)
            : 'M 0 0';
        const midX = sourcePort && targetPort ? (sourcePort.x + targetPort.x) / 2 : 0;
        const midY = sourcePort && targetPort ? (sourcePort.y + targetPort.y) / 2 : 0;
        const signature = [
            connection.id, connection.sourceNodeId, connection.targetNodeId,
            connection.sourcePort, connection.targetPort, label,
            d, status, selected ? 1 : 0, midX, midY
        ].join('\u0001');
        if (priorEdge && viewSignature(priorEdge) === signature) {
            return priorEdge;
        }
        const attrs: Record<string, string> = {
            class: `workflow-edge workflow-edge-${status}${selected ? ' is-selected' : ''}`,
            'data-edge-id': connection.id,
            'data-status': status,
            d,
            'marker-end': `url(#wf-arrow-${status})`
        };
        const view: WorkflowCanvasEdgeView = {
            id: connection.id,
            sourceNodeId: connection.sourceNodeId,
            targetNodeId: connection.targetNodeId,
            sourcePort: connection.sourcePort,
            targetPort: connection.targetPort,
            label,
            d,
            status,
            selected,
            attrs,
            hitAttrs: {
                class: 'workflow-edge-hit',
                'data-edge-id': connection.id,
                d
            },
            labelAttrs: {
                x: String(midX),
                y: String(midY - 6),
                class: 'workflow-edge-label'
            }
        };
        markView(view, signature);
        markInputs(view, {
            connection,
            status,
            selected,
            sourcePort,
            targetPort,
            locale,
            revision: registry.revision
        });
        return view;
    });

    const draft = buildCanvasDraft(designer, nodeId => geometry.get(nodeId));
    const groupViews = buildCanvasGroups(designer);
    const maxX = nodeViews.reduce((value, node) => Math.max(value, node.x + node.width), 0);
    const maxY = nodeViews.reduce((value, node) => Math.max(value, node.y + node.height), 0);
    return {
        nodes: nodeViews,
        groups: groupViews,
        edges: edgeViews,
        draft,
        connecting: !!designer.connectionDraft,
        connectingSide: designer.connectionDraft?.sourceSide || 'output',
        width: Math.max(1200, maxX + 320),
        height: Math.max(720, maxY + 240),
        zoom: designer.zoom,
        pan: { ...designer.pan },
        gridStyle: canvasGridStyle(designer)
    };
}

/**
 * Refresh only the viewport-dependent parts of a canvas model.
 *
 * Pan, zoom and wire dragging do not change node/edge projections, so callers
 * can keep the previous node and edge arrays instead of re-projecting every
 * node on each pointer event.
 */
export function buildWorkflowCanvasViewport(
    previous: WorkflowCanvasModel,
    designer: WorkflowDesigner
): WorkflowCanvasModel {
    return {
        nodes: previous.nodes,
        groups: previous.groups,
        edges: previous.edges,
        // Only wire dragging needs a source node lookup; pan/zoom stays O(1).
        draft: buildCanvasDraft(designer, nodeId => previous.nodes.find(node => node.id === nodeId)),
        connecting: !!designer.connectionDraft,
        connectingSide: designer.connectionDraft?.sourceSide || 'output',
        width: previous.width,
        height: previous.height,
        zoom: designer.zoom,
        pan: { ...designer.pan },
        gridStyle: canvasGridStyle(designer)
    };
}

function buildCanvasGroups(designer: WorkflowDesigner): WorkflowCanvasGroupView[] {
    const groups = designer.definition.groups || [];
    const views: WorkflowCanvasGroupView[] = [];
    for (const group of groups) {
        const nodes = designer.nodes.filter(node => (group.nodeIds || []).includes(node.id));
        if (!nodes.length) {
            continue;
        }
        const frames = nodes.map(node => ({ node, ...workflowNodeFrame(node) }));
        const padding = 22;
        const header = 30;
        const minX = Math.min(...frames.map(frame => frame.node.position.x)) - padding;
        const minY = Math.min(...frames.map(frame => frame.node.position.y)) - padding - header;
        const maxX = Math.max(...frames.map(frame => frame.node.position.x + frame.width)) + padding;
        const maxY = Math.max(...frames.map(frame => frame.node.position.y + frame.height)) + padding;
        const color = group.color || '#60a5fa';
        const collapsed = group.collapsed === true;
        const width = Math.max(160, maxX - minX);
        const height = collapsed ? 34 : Math.max(80, maxY - minY);
        views.push({
            id: group.id,
            name: group.name || group.id,
            x: minX,
            y: minY,
            width,
            height,
            color,
            collapsed,
            attrs: {
                class: ['workflow-group', collapsed ? 'is-collapsed' : ''].filter(Boolean).join(' '),
                'data-group-id': group.id,
                'data-collapsed': collapsed ? 'true' : 'false',
                style: [
                    `left:${minX}px`,
                    `top:${minY}px`,
                    `width:${width}px`,
                    `height:${height}px`,
                    `--wf-group-color:${color}`
                ].join(';')
            }
        });
    }
    return views;
}

function buildCanvasDraft(
    designer: WorkflowDesigner,
    portsOf: (nodeId: string) => { inputs?: WorkflowCanvasPortView[]; outputs?: WorkflowCanvasPortView[] } | undefined
): WorkflowCanvasModel['draft'] {
    const draft = designer.connectionDraft;
    if (!draft) {
        return undefined;
    }
    const source = portsOf(draft.sourceNodeId);
    const sourcePorts = draft.sourceSide === 'input' ? source?.inputs : source?.outputs;
    const sourcePort = sourcePorts?.find(port => port.id === draft.sourcePort);
    if (!sourcePort) {
        return undefined;
    }
    return {
        d: edgePath(sourcePort, { x: draft.x, y: draft.y }),
        attrs: {
            class: 'workflow-edge workflow-edge-draft',
            'pointer-events': 'none'
        }
    };
}

function canvasGridStyle(designer: WorkflowDesigner): Record<string, string> {
    return {
        '--wf-grid-size': `${24 * designer.zoom}px`,
        '--wf-grid-x': `${designer.pan.x}px`,
        '--wf-grid-y': `${designer.pan.y}px`
    };
}

export function buildWorkflowPalette(
    registry: WorkflowNodeRegistry,
    locale: WorkflowLocale = 'zh-CN',
    translator?: Translator
): WorkflowPaletteGroup[] {
    return registry.palette(locale, translator);
}

function fieldConditionMatches(actual: any, condition: WorkflowConfigFieldCondition): boolean {
    if (condition.equals !== undefined) {
        return String(actual) === String(condition.equals);
    }
    if (condition.notEquals !== undefined) {
        return String(actual) !== String(condition.notEquals);
    }
    if (condition.in) {
        const allowed = condition.in.map(item => String(item));
        return allowed.includes(String(actual));
    }
    if (condition.truthy !== undefined) {
        return condition.truthy ? !!actual : !actual;
    }
    if (condition.falsy !== undefined) {
        return condition.falsy ? !actual : !!actual;
    }
    return true;
}

function fieldResetValue(field: { type: string; defaultValue?: any }): any {
    const value = field.defaultValue;
    if (field.type === 'json') {
        return value ?? {};
    }
    if (field.type === 'boolean') {
        return value === true;
    }
    return value === undefined || value === null ? '' : String(value);
}

export function buildWorkflowInspectorModel(
    designer: WorkflowDesigner,
    registry: WorkflowNodeRegistry,
    locale: WorkflowLocale = 'zh-CN',
    translator?: Translator
): WorkflowInspectorModel {
    const node = designer.selectedNode;
    if (!node) {
        return {
            hasSelection: false,
            nodeId: '',
            name: '',
            description: '',
            disabled: false,
            webhookUrl: '',
            icon: '',
            color: '',
            typeLabel: '',
        typeDescription: '',
            status: 'idle',
            statusLabel: '',
            durationLabel: '',
            fields: [],
            resultText: '',
            errorText: ''
        };
    }
    const definition: WorkflowNodeDefinition | undefined = registry.get(node.type);
    const execution = designer.execution?.nodeStates?.[node.id];
    const status = (execution?.status as NodeExecutionStatus) || 'idle';
    const values: Record<string, any> = {};
    (definition?.fields || []).forEach(field => {
        values[field.key] = node.config?.[field.key] !== undefined
            ? node.config[field.key]
            : field.defaultValue;
    });
    const mapField = (field: WorkflowConfigField, nested = false): WorkflowInspectorFieldView => {
        const value = nested ? undefined : values[field.key];
        return {
            key: field.key,
            label: translateWorkflow(
                translator,
                locale,
                `workflow.field.${node.type}.${field.key}`,
                field.label
            ),
            type: field.type,
            typed: field.typed === true,
            value,
            displayValue: field.type === 'json'
                ? (typeof value === 'string' ? value : JSON.stringify(value ?? {}, null, 2))
                : value === undefined || value === null ? '' : String(value),
            checked: value === true,
            options: (field.options || []).map(option => ({
                label: translateWorkflow(
                    translator,
                    locale,
                    `workflow.option.${option.value}`,
                    option.label
                ),
                value: option.value
            })),
            placeholder: translateWorkflow(
                translator,
                locale,
                `workflow.fieldPlaceholder.${node.type}.${field.key}`,
                field.placeholder || ''
            ),
            description: translateWorkflow(
                translator,
                locale,
                `workflow.fieldDescription.${node.type}.${field.key}`,
                field.description || ''
            ),
            group: field.group
                ? translateWorkflow(translator, locale, `workflow.group.${groupSlug(field.group)}`, field.group)
                : '',
            visible: nested || !field.visibleWhen
                ? true
                : fieldConditionMatches(values[field.visibleWhen.key], field.visibleWhen),
            min: field.min,
            max: field.max,
            step: field.step,
            unit: field.unit,
            span: field.span,
            minLength: field.minLength,
            maxLength: field.maxLength,
            rows: field.rows || (field.type === 'json' ? 4 : field.type === 'code' ? 8 : 3),
            required: field.required === true,
            readonly: field.readonly === true,
            disabled: field.disabled === true,
            pattern: field.pattern,
            rules: field.rules,
            errorMessages: field.errorMessages,
            inputClass: field.inputClass,
            fieldClass: field.fieldClass,
            language: field.language,
            itemFields: field.itemFields?.map(child => mapField(child, true)),
            addLabel: translateWorkflow(
                translator,
                locale,
                'workflow.ui.addItem',
                field.addLabel || 'Add'
            ),
            removeLabel: translateWorkflow(
                translator,
                locale,
                'workflow.ui.removeItem',
                field.removeLabel || 'Remove'
            ),
            minItems: field.minItems,
            maxItems: field.maxItems,
            visibleWhen: field.visibleWhen,
            hasDefault: field.defaultValue !== undefined,
            resetValue: fieldResetValue(field)
        };
    };
    const fields = (definition?.fields || []).map(field => mapField(field));
    let resultText = '';
    if (execution?.result?.data !== undefined) {
        try {
            resultText = JSON.stringify(execution.result.data, null, 2);
        } catch {
            resultText = String(execution.result.data);
        }
    }
    const duration = execution?.durationMs || 0;
    let webhookUrl = '';
    if (node.type === 'http-in') {
        const configured = String(node.config?.path || '').trim();
        const suffix = configured
            ? (configured.startsWith('/') ? configured : `/${configured}`)
            : '';
        webhookUrl = `/api/workflows/${designer.definition.id}/hook${suffix}`;
    }
    return {
        hasSelection: true,
        nodeId: node.id,
        name: node.name,
        description: node.description || '',
        disabled: node.disabled === true,
        webhookUrl,
        icon: node.style?.icon || definition?.icon || '◆',
        color: node.style?.backgroundColor || definition?.color || '#64748b',
        typeLabel: registry.nodeLabel(node.type, locale, translator),
        typeDescription: registry.nodeDescription(node.type, locale, translator),
        status,
        statusLabel: nodeStatusLabel(status, locale, translator),
        durationLabel: duration ? `${duration} ms` : '',
        fields,
        resultText,
        errorText: execution?.error || ''
    };
}

/** Per-node outputs of the selected execution for the debug panel. */
export function buildWorkflowDebugItems(
    designer: WorkflowDesigner,
    registry: WorkflowNodeRegistry,
    locale: WorkflowLocale = 'zh-CN',
    translator?: Translator
): WorkflowDebugItem[] {
    const states = designer.execution?.nodeStates;
    if (!states) {
        return [];
    }
    let runtimeStates: Record<string, Record<string, any>> = {};
    try {
        runtimeStates = designer.service?.getNodeRuntimeState(designer.definition.id) || {};
    } catch {
        runtimeStates = {};
    }
    return designer.nodes
        .filter(node => {
            const status = states[node.id]?.status;
            return status === 'success' || status === 'failed' || status === 'cancelled';
        })
        .map(node => {
            const state = states[node.id];
            let resultText = '';
            try {
                resultText = JSON.stringify(state.result?.data ?? state.result ?? null, null, 2);
            } catch {
                resultText = String(state.result?.data ?? '');
            }
            return {
                nodeId: node.id,
                name: node.name,
                typeLabel: registry.nodeLabel(node.type, locale, translator),
                status: state.status,
                statusLabel: nodeStatusLabel(state.status, locale, translator),
                durationLabel: formatDuration(state.startedAt, state.finishedAt),
                resultText,
                errorText: state.error || '',
                stateText: runtimeStates[node.id] && Object.keys(runtimeStates[node.id]).length
                    ? JSON.stringify(runtimeStates[node.id], null, 2)
                    : ''
            };
        });
}

export function buildWorkflowToolbarModel(
    designer: WorkflowDesigner,
    locale: WorkflowLocale = 'zh-CN',
    translator?: Translator
): WorkflowToolbarModel {
    const execution = designer.execution;
    return {
        name: designer.definition.name,
        nodeCount: designer.nodes.length,
        connectionCount: designer.connections.length,
        hasSelection: designer.selectedNodeIds.length > 0 || !!designer.selection?.connectionId,
        canUndo: designer.canUndo,
        canRedo: designer.canRedo,
        canResume: designer.canResume,
        running: designer.running,
        zoomLabel: `${Math.round(designer.zoom * 100)}%`,
        statusLabel: executionStatusLabel(execution?.status, locale, translator)
    };
}

export function buildWorkflowStatusModel(
    designer: WorkflowDesigner,
    locale: WorkflowLocale = 'zh-CN',
    translator?: Translator
): WorkflowStatusModel {
    const selected = designer.selectedNode;
    const execution = designer.execution;
    const typeLabel = selected ? designer.registry.nodeLabel(selected.type, locale, translator) : '';
    const selectionCount = designer.selectedNodeIds.length;
    return {
        message: resolveWorkflowText(translator, locale, designer.message, '', designer.messageParams),
        error: resolveWorkflowText(translator, locale, designer.error, '', designer.errorParams),
        running: designer.running,
        nodeCount: designer.nodes.length,
        selectedLabel: selectionCount > 1
            ? translateWorkflow(
                translator,
                locale,
                'workflow.ui.nodesSelected',
                '{count} nodes selected',
                { count: selectionCount }
            )
            : selected
                ? `${selected.name} · ${typeLabel}`
                : translateWorkflow(translator, locale, 'workflow.ui.noSelection', 'No node selected'),
        zoomLabel: `${Math.round(designer.zoom * 100)}%`,
        executionLabel: executionStatusLabel(execution?.status, locale, translator),
        progress: executionProgress(designer, execution)
    };
}

/** Share of nodes that already finished in the current (or last) run. */
function executionProgress(designer: WorkflowDesigner, execution: any): number {
    const total = designer?.nodes?.length || 0;
    if (!execution || !total) {
        return 0;
    }
    const states = execution.nodeStates || {};
    const done = Object.values(states).filter((state: any) =>
        state && (state.status === 'success' || state.status === 'failed'
            || state.status === 'skipped' || state.status === 'cancelled')
    ).length;
    return Math.max(0, Math.min(100, Math.round((done / total) * 100)));
}

function formatClock(timestamp?: number): string {
    if (!timestamp) {
        return '';
    }
    const date = new Date(timestamp);
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function formatBytes(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes <= 0) {
        return '';
    }
    if (bytes < 1024) {
        return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(start?: number, end?: number): string {
    if (!start || !end || end < start) {
        return '';
    }
    const ms = end - start;
    if (ms < 1000) {
        return `${ms} ms`;
    }
    return `${(ms / 1000).toFixed(1)} s`;
}

/**
 * Project retained executions into clickable history chips. Selecting a chip
 * replays that run's node/edge states on the canvas without re-executing it.
 */
export function buildWorkflowRunHistory(
    designer: WorkflowDesigner,
    locale: WorkflowLocale = 'zh-CN',
    translator?: Translator
): WorkflowRunHistoryItem[] {
    return (designer.executionHistory || []).filter(Boolean).map(snapshot => {
        const tone: WorkflowRunHistoryItem['tone'] = snapshot.status === 'completed'
            ? 'success'
            : snapshot.status === 'failed'
                ? 'failed'
                : snapshot.status === 'cancelled'
                    ? 'cancelled'
                    : snapshot.status === 'running'
                        ? 'running'
                        : 'idle';
        return {
            executionId: snapshot.executionId,
            label: formatClock(snapshot.startTime),
            status: snapshot.status,
            statusLabel: executionStatusLabel(snapshot.status, locale, translator),
            timeLabel: formatClock(snapshot.startTime),
            durationLabel: formatDuration(snapshot.startTime, snapshot.endTime),
            nodeCount: Object.keys(snapshot.nodeStates || {}).length,
            sizeLabel: formatBytes(JSON.stringify(snapshot).length),
            tone,
            active: designer.selectedExecutionId === snapshot.executionId
        };
    });
}
