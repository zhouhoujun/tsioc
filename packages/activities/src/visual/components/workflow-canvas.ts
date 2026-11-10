import { Attribute, Component, ElementRef } from '@tsdi/components';
import { Optional } from '@tsdi/ioc';
import { WorkflowCanvasModel, WorkflowCanvasNodeView, WorkflowCanvasPortView } from '../types';

export type WorkflowCanvasPointerType =
    | 'background-down'
    | 'pointer-move'
    | 'pointer-up'
    | 'pointer-leave'
    | 'node-down'
    | 'node-up'
    | 'edge-click'
    | 'port-down'
    | 'port-up'
    | 'drop'
    | 'key-down'
    | 'wheel';

export interface WorkflowCanvasPointerPayload {
    type: WorkflowCanvasPointerType;
    event?: any;
    world?: { x: number; y: number };
    clientX?: number;
    clientY?: number;
    nodeId?: string;
    connectionId?: string;
    portId?: string;
    portType?: 'input' | 'output' | 'both';
    nodeType?: string;
    key?: string;
    shiftKey?: boolean;
    ctrlKey?: boolean;
    metaKey?: boolean;
    deltaX?: number;
    deltaY?: number;
}

const EMPTY_CANVAS: WorkflowCanvasModel = {
    nodes: [],
    edges: [],
    width: 1200,
    height: 720,
    zoom: 1,
    pan: { x: 0, y: 0 },
    gridStyle: {}
};

/**
 * Renderer-neutral workflow canvas. It renders nodes/edges from a plain view
 * model and reports pointer gestures as semantic actions (`node-down`,
 * `port-up`, `drop`, ...). The HTML renderer paints the class-based skin; a TUI
 * host can project the same model to terminal cells.
 */
@Component({
    selector: 'workflow-canvas',
    template: `
    <div class="workflow-canvas"
         tabindex="0"
         data-connecting="{{model.connecting}}"
         data-connecting-side="{{model.connectingSide}}"
         [style]="canvasStyle"
         @mousedown="backgroundDown($event)"
         @mousemove="pointerMove($event)"
         @mouseup="pointerUp($event)"
         @mouseleave="pointerLeave($event)"
         @dragover="dragOver($event)"
         @drop="drop($event)"
         @keydown="keyDown($event)"
         @wheel="wheel($event)">
        <div class="workflow-canvas-empty" v-if="!model.nodes.length">{{emptyHint}}</div>
        <div class="workflow-canvas-content" [style]="contentStyle">
            <svg class="workflow-canvas-edges" v-bind="svgAttrs">
                <defs>
                    <marker id="wf-arrow-idle" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" class="workflow-arrow-idle"/></marker>
                    <marker id="wf-arrow-active" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" class="workflow-arrow-active"/></marker>
                    <marker id="wf-arrow-traversed" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" class="workflow-arrow-traversed"/></marker>
                    <marker id="wf-arrow-skipped" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" class="workflow-arrow-skipped"/></marker>
                </defs>
                <path v-for="edge in model.edges" v-bind="edge.attrs"></path>
                <path v-for="edge in model.edges" v-bind="edge.hitAttrs"
                      @mousedown="edgeDown($event)"
                      @click="edgeClick($event, edge)"></path>
                <text v-for="edge in model.edges" v-if="edge.label" v-bind="edge.labelAttrs">{{edge.label}}</text>
                <g v-if="model.draft">
                    <path v-bind="model.draft ? model.draft.attrs : {}"></path>
                </g>
            </svg>
            <div class="workflow-canvas-nodes">
                <div v-for="node in model.nodes"
                     v-bind="node.attrs"
                     @mousedown="nodeDown($event, node)"
                     @mouseup="nodeUp($event, node)">
                    <div class="workflow-node-header">
                        <span class="workflow-node-icon">{{node.icon}}</span>
                        <span class="workflow-node-title">{{node.name}}</span>
                        <span class="workflow-node-status" v-if="node.statusLabel">{{node.statusLabel}}</span>
                    </div>
                    <div class="workflow-node-body">
                        <span class="workflow-node-type">{{node.typeLabel}}</span>
                        <span class="workflow-node-desc">{{node.description}}</span>
                    </div>
                    <span v-for="port in node.inputs"
                          v-bind="portAttrs(node, port, 'input')"
                          @mousedown="portDown($event, node, port, 'input')"
                          @mouseup="portUp($event, node, port, 'input')"></span>
                    <span v-for="port in node.outputs"
                          v-bind="portAttrs(node, port, 'output')"
                          @mousedown="portDown($event, node, port, 'output')"
                          @mouseup="portUp($event, node, port, 'output')"></span>
                </div>
            </div>
        </div>
    </div>`
})
export class WorkflowCanvasComponent {
    @Attribute() model: WorkflowCanvasModel = EMPTY_CANVAS;
    @Attribute() locale = 'zh-CN';
    @Attribute() pointerAction?: (payload: WorkflowCanvasPointerPayload) => void;
    @Attribute() panAction?: (dx: number, dy: number) => void;

    private panStart?: { clientX: number; clientY: number };

    constructor(@Optional() protected elementRef?: ElementRef) { }

    get emptyHint(): string {
        return String(this.locale || '').toLowerCase().startsWith('zh')
            ? '从左侧组件面板拖入节点，或点击组件添加'
            : 'Drag a component from the palette, or click one to add it';
    }

    /** Only layout variables live here; the visual skin comes from the stylesheet. */
    get canvasStyle(): Record<string, string> {
        return {
            '--wf-grid-size': `${24 * (this.model.zoom || 1)}px`,
            '--wf-grid-x': `${this.model.pan?.x || 0}px`,
            '--wf-grid-y': `${this.model.pan?.y || 0}px`
        };
    }

    /** Layout transform for pan/zoom, not visual styling. */
    get contentStyle(): Record<string, string> {
        const zoom = this.model.zoom || 1;
        const pan = this.model.pan || { x: 0, y: 0 };
        return {
            width: `${this.model.width || 1200}px`,
            height: `${this.model.height || 720}px`,
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`
        };
    }

    get svgAttrs(): Record<string, string> {
        return {
            width: String(this.model.width || 1200),
            height: String(this.model.height || 720)
        };
    }

    portAttrs(
        node: WorkflowCanvasNodeView,
        port: WorkflowCanvasPortView,
        side: 'input' | 'output'
    ): Record<string, string> {
        return {
            class: `workflow-node-port workflow-node-port-${side}`,
            'data-port-id': port.id,
            'data-port-side': side,
            title: port.label,
            'aria-label': port.label,
            // The element is a larger invisible hit target; the visible dot is
            // painted by CSS and centered on the exact wire endpoint.
            style: `left:${port.x - node.x}px;top:${port.y - node.y}px`
        };
    }

    backgroundDown(event: any): void {
        this.panStart = { clientX: Number(event?.clientX) || 0, clientY: Number(event?.clientY) || 0 };
        this.emit({ type: 'background-down', event, world: this.worldFromEvent(event) });
    }

    pointerMove(event: any): void {
        if (this.panStart && this.panAction) {
            const clientX = Number(event?.clientX) || 0;
            const clientY = Number(event?.clientY) || 0;
            this.panAction(clientX - this.panStart.clientX, clientY - this.panStart.clientY);
            this.panStart = { clientX, clientY };
        }
        this.emit({ type: 'pointer-move', event, world: this.worldFromEvent(event) });
    }

    pointerUp(event: any): void {
        this.panStart = undefined;
        this.emit({ type: 'pointer-up', event, world: this.worldFromEvent(event) });
    }

    pointerLeave(event: any): void {
        this.panStart = undefined;
        this.emit({ type: 'pointer-leave', event });
    }

    nodeDown(event: any, node: WorkflowCanvasNodeView): void {
        this.stop(event);
        this.panStart = undefined;
        this.emit({
            type: 'node-down',
            event,
            nodeId: node.id,
            world: this.worldFromEvent(event)
        });
    }

    nodeUp(event: any, node: WorkflowCanvasNodeView): void {
        this.stop(event);
        this.emit({ type: 'node-up', event, nodeId: node.id, world: this.worldFromEvent(event) });
    }

    edgeClick(event: any, edge: { id: string }): void {
        this.stop(event);
        this.emit({ type: 'edge-click', event, connectionId: edge.id });
    }

    edgeDown(event: any): void {
        this.stop(event);
        this.panStart = undefined;
    }

    portDown(
        event: any,
        node: WorkflowCanvasNodeView,
        port: WorkflowCanvasPortView,
        side: 'input' | 'output'
    ): void {
        this.stop(event);
        event?.preventDefault?.();
        this.panStart = undefined;
        this.emit({
            type: 'port-down',
            event,
            nodeId: node.id,
            portId: port.id,
            portType: side,
            world: this.worldFromEvent(event)
        });
    }

    portUp(
        event: any,
        node: WorkflowCanvasNodeView,
        port: WorkflowCanvasPortView,
        side: 'input' | 'output'
    ): void {
        this.stop(event);
        this.emit({
            type: 'port-up',
            event,
            nodeId: node.id,
            portId: port.id,
            portType: side,
            world: this.worldFromEvent(event)
        });
    }

    dragOver(event: any): void {
        event?.preventDefault?.();
        if (event?.dataTransfer) {
            event.dataTransfer.dropEffect = 'copy';
        }
    }

    drop(event: any): void {
        event?.preventDefault?.();
        const nodeType = event?.dataTransfer?.getData?.('application/x-tsdi-workflow-node') || undefined;
        this.emit({
            type: 'drop',
            event,
            nodeType,
            world: this.worldFromEvent(event)
        });
    }

    keyDown(event: any): void {
        const key = event?.key;
        if (!key) {
            return;
        }
        if (['Delete', 'Backspace', 'Escape', 'z', 'Z', 'y', 'Y', 'd', 'D'].includes(key)) {
            event?.preventDefault?.();
        }
        this.emit({
            type: 'key-down',
            event,
            key,
            shiftKey: !!event.shiftKey,
            ctrlKey: !!event.ctrlKey,
            metaKey: !!event.metaKey
        });
    }

    wheel(event: any): void {
        event?.preventDefault?.();
        this.emit({
            type: 'wheel',
            event,
            clientX: event?.clientX,
            clientY: event?.clientY,
            deltaX: event?.deltaX,
            deltaY: event?.deltaY,
            shiftKey: !!event.shiftKey,
            ctrlKey: !!event.ctrlKey,
            metaKey: !!event.metaKey,
            world: this.worldFromEvent(event)
        });
    }

    worldFromEvent(event: any): { x: number; y: number } {
        const zoom = this.model.zoom || 1;
        const pan = this.model.pan || { x: 0, y: 0 };
        const element = this.elementRef?.nativeElement as any;
        const scroller = element?.querySelector?.('.workflow-canvas') || element;
        const rect = scroller?.getBoundingClientRect?.() || { left: 0, top: 0 };
        const clientX = Number(event?.clientX);
        const clientY = Number(event?.clientY);
        const localX = (Number.isFinite(clientX) ? clientX : 0) - (rect.left || 0) + (scroller?.scrollLeft || 0);
        const localY = (Number.isFinite(clientY) ? clientY : 0) - (rect.top || 0) + (scroller?.scrollTop || 0);
        return {
            x: (localX - pan.x) / zoom,
            y: (localY - pan.y) / zoom
        };
    }

    private emit(payload: WorkflowCanvasPointerPayload): void {
        this.pointerAction?.(payload);
    }

    private stop(event: any): void {
        event?.stopPropagation?.();
    }
}
