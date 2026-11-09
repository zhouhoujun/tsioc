import {
    IVisualWorkflowNode,
    NodeExecutionStatus,
    WorkflowCanvasEdgeView,
    WorkflowCanvasModel,
    WorkflowCanvasNodeView,
    WorkflowCanvasPortView,
    WorkflowInspectorFieldView,
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

export const WORKFLOW_NODE_WIDTH = 184;
export const WORKFLOW_NODE_HEADER_HEIGHT = 34;
export const WORKFLOW_PORT_SPACING = 20;
export const WORKFLOW_PORT_START = 48;

const STATUS_LABELS: Record<NodeExecutionStatus, { en: string; zh: string }> = {
    idle: { en: '', zh: '' },
    pending: { en: 'Pending', zh: '等待' },
    running: { en: 'Running', zh: '运行中' },
    success: { en: 'Done', zh: '成功' },
    failed: { en: 'Failed', zh: '失败' },
    skipped: { en: 'Skipped', zh: '跳过' },
    cancelled: { en: 'Cancelled', zh: '已取消' }
};

export function nodeStatusLabel(status: NodeExecutionStatus, locale: WorkflowLocale, translator?: Translator): string {
    const label = STATUS_LABELS[status] || STATUS_LABELS.idle;
    return translateWorkflow(
        translator,
        locale,
        `workflow.status.${status}`,
        localize(locale, label.en, label.zh)
    );
}

function executionStatusLabel(
    status: string | undefined,
    locale: WorkflowLocale,
    translator?: Translator
): string {
    const key = status || 'idle';
    const fallback: Record<string, { en: string; zh: string }> = {
        running: { en: 'Running', zh: '运行中' },
        completed: { en: 'Completed', zh: '已完成' },
        failed: { en: 'Failed', zh: '失败' },
        cancelled: { en: 'Cancelled', zh: '已取消' },
        pending: { en: 'Pending', zh: '等待' },
        idle: { en: 'Idle', zh: '空闲' }
    };
    const label = fallback[key] || fallback.idle;
    return translateWorkflow(
        translator,
        locale,
        `workflow.status.${key}`,
        localize(locale, label.en, label.zh)
    );
}

export function workflowNodeFrame(node: IVisualWorkflowNode): { width: number; height: number } {
    const width = node.dimension?.width || WORKFLOW_NODE_WIDTH;
    const portCount = Math.max(node.inputs?.length || 0, node.outputs?.length || 0, 1);
    const height = Math.max(
        node.dimension?.height || 64,
        WORKFLOW_PORT_START + portCount * WORKFLOW_PORT_SPACING + 10
    );
    return { width, height };
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
            view.selected ? 'is-selected' : ''
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
 * Project the designer state into a canvas render model. The model is a fresh
 * plain object on every change so child components can update through their own
 * reactive attributes without sharing a mutable graph.
 */
export function buildWorkflowCanvasModel(
    designer: WorkflowDesigner,
    registry: WorkflowNodeRegistry,
    locale: WorkflowLocale = 'zh-CN',
    translator?: Translator
): WorkflowCanvasModel {
    const nodeViews: WorkflowCanvasNodeView[] = [];
    const geometry = new Map<string, ReturnType<typeof nodeGeometry>>();
    const execution = designer.execution;

    for (const node of designer.nodes) {
        const geo = nodeGeometry(node);
        geometry.set(node.id, geo);
        const status = (execution?.nodeStates?.[node.id]?.status as NodeExecutionStatus) || 'idle';
        const view: Omit<WorkflowCanvasNodeView, 'attrs'> = {
            id: node.id,
            name: node.name,
            type: node.type,
            typeLabel: registry.nodeLabel(node.type, locale, translator),
            description: node.description || registry.nodeDescription(node.type, locale, translator),
            x: node.position.x,
            y: node.position.y,
            width: geo.width,
            height: geo.height,
            icon: node.style?.icon || registry.get(node.type)?.icon || '◆',
            color: node.style?.backgroundColor || registry.get(node.type)?.color || '#64748b',
            textColor: node.style?.textColor || registry.get(node.type)?.textColor || '#ffffff',
            selected: designer.selection.nodeId === node.id,
            status,
            statusLabel: nodeStatusLabel(status, locale, translator),
            inputs: geo.inputs,
            outputs: geo.outputs
        };
        nodeViews.push({ ...view, attrs: nodeAttrs(view) });
    }

    const edgeViews: WorkflowCanvasEdgeView[] = designer.connections.map(connection => {
        const source = designer.nodes.find(node => node.id === connection.sourceNodeId);
        const target = designer.nodes.find(node => node.id === connection.targetNodeId);
        const sourceGeo = source ? geometry.get(source.id) : undefined;
        const targetGeo = target ? geometry.get(target.id) : undefined;
        const sourcePort = sourceGeo?.outputs.find(port => port.id === connection.sourcePort) || sourceGeo?.outputs[0];
        const targetPort = targetGeo?.inputs.find(port => port.id === connection.targetPort) || targetGeo?.inputs[0];
        const status = execution?.edgeStates?.[connection.id]?.status || 'idle';
        const selected = designer.selection.connectionId === connection.id;
        const d = sourcePort && targetPort
            ? edgePath(sourcePort, targetPort)
            : 'M 0 0';
        const midX = sourcePort && targetPort ? (sourcePort.x + targetPort.x) / 2 : 0;
        const midY = sourcePort && targetPort ? (sourcePort.y + targetPort.y) / 2 : 0;
        const attrs: Record<string, string> = {
            class: `workflow-edge workflow-edge-${status}${selected ? ' is-selected' : ''}`,
            'data-edge-id': connection.id,
            'data-status': status,
            d,
            'marker-end': `url(#wf-arrow-${status})`
        };
        return {
            id: connection.id,
            sourceNodeId: connection.sourceNodeId,
            targetNodeId: connection.targetNodeId,
            sourcePort: connection.sourcePort,
            targetPort: connection.targetPort,
            label: connection.label || '',
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
    });

    let draft: WorkflowCanvasModel['draft'];
    if (designer.connectionDraft) {
        const source = designer.nodes.find(node => node.id === designer.connectionDraft!.sourceNodeId);
        const sourceGeo = source ? geometry.get(source.id) : undefined;
        const sourcePort = sourceGeo?.outputs.find(port => port.id === designer.connectionDraft!.sourcePort);
        if (sourcePort) {
            draft = {
                d: edgePath(sourcePort, { x: designer.connectionDraft.x, y: designer.connectionDraft.y }),
                attrs: {
                    class: 'workflow-edge workflow-edge-draft',
                    'pointer-events': 'none'
                }
            };
        }
    }

    const maxX = nodeViews.reduce((value, node) => Math.max(value, node.x + node.width), 0);
    const maxY = nodeViews.reduce((value, node) => Math.max(value, node.y + node.height), 0);
    return {
        nodes: nodeViews,
        edges: edgeViews,
        draft,
        width: Math.max(1200, maxX + 320),
        height: Math.max(720, maxY + 240),
        zoom: designer.zoom,
        pan: { ...designer.pan },
        gridStyle: {
            '--wf-grid-size': `${24 * designer.zoom}px`,
            '--wf-grid-x': `${designer.pan.x}px`,
            '--wf-grid-y': `${designer.pan.y}px`
        }
    };
}

export function buildWorkflowPalette(
    registry: WorkflowNodeRegistry,
    locale: WorkflowLocale = 'zh-CN',
    translator?: Translator
): WorkflowPaletteGroup[] {
    return registry.palette(locale, translator);
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
            typeLabel: '',
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
    const fields: WorkflowInspectorFieldView[] = (definition?.fields || []).map(field => {
        const value = node.config?.[field.key] !== undefined
            ? node.config[field.key]
            : field.defaultValue;
        return {
            key: field.key,
            label: translateWorkflow(
                translator,
                locale,
                `workflow.field.${node.type}.${field.key}`,
                localize(locale, field.label, field.labelZh)
            ),
            type: field.type,
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
                    localize(locale, option.label, option.labelZh)
                ),
                value: option.value
            })),
            placeholder: field.placeholder || '',
            description: localize(locale, field.description || '', field.description),
            min: field.min,
            max: field.max,
            required: field.required === true,
            pattern: field.pattern,
            language: field.language
        };
    });
    let resultText = '';
    if (execution?.result?.data !== undefined) {
        try {
            resultText = JSON.stringify(execution.result.data, null, 2);
        } catch {
            resultText = String(execution.result.data);
        }
    }
    const duration = execution?.durationMs || 0;
    return {
        hasSelection: true,
        nodeId: node.id,
        name: node.name,
        description: node.description || '',
        typeLabel: registry.nodeLabel(node.type, locale, translator),
        status,
        statusLabel: nodeStatusLabel(status, locale, translator),
        durationLabel: duration ? `${duration} ms` : '',
        fields,
        resultText,
        errorText: execution?.error || ''
    };
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
        hasSelection: !!designer.selection?.nodeId || !!designer.selection?.connectionId,
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
    return {
        message: resolveWorkflowText(translator, locale, designer.message, '', designer.messageParams),
        error: resolveWorkflowText(translator, locale, designer.error, '', designer.errorParams),
        running: designer.running,
        nodeCount: designer.nodes.length,
        selectedLabel: selected
            ? `${selected.name} · ${typeLabel}`
            : translateWorkflow(translator, locale, 'workflow.ui.noSelection',
                localize(locale, 'No node selected', '未选择节点')),
        zoomLabel: `${Math.round(designer.zoom * 100)}%`,
        executionLabel: executionStatusLabel(execution?.status, locale, translator)
    };
}

function formatClock(timestamp?: number): string {
    if (!timestamp) {
        return '';
    }
    const date = new Date(timestamp);
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
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
            tone,
            active: designer.selectedExecutionId === snapshot.executionId
        };
    });
}
