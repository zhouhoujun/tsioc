import { AfterViewInit, Attribute, Component, ElementRef, ViewChild } from '@tsdi/components';
import { Optional } from '@tsdi/ioc';
import { markElementRefRaw } from '@tsdi/components/common';
import { Translator } from '@tsdi/i18n';
import { translateWorkflow } from '../i18n';
import { WorkflowCanvasModel, WorkflowCanvasNodeView, WorkflowCanvasPortView } from '../types';

export type WorkflowCanvasPointerType =
    | 'background-down'
    | 'pointer-move'
    | 'pointer-up'
    | 'pointer-leave'
    | 'node-down'
    | 'node-up'
    | 'node-context'
    | 'group-down'
    | 'group-remove'
    | 'group-toggle'
    | 'group-rename'
    | 'box-select-start'
    | 'box-select-move'
    | 'box-select'
    | 'edge-click'
    | 'edge-dblclick'
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
    groupId?: string;
    connectionId?: string;
    portId?: string;
    portType?: 'input' | 'output' | 'both';
    nodeType?: string;
    box?: { x: number; y: number; width: number; height: number };
    additive?: boolean;
    key?: string;
    shiftKey?: boolean;
    ctrlKey?: boolean;
    metaKey?: boolean;
    deltaX?: number;
    deltaY?: number;
}

const EMPTY_CANVAS: WorkflowCanvasModel = {
    nodes: [],
    groups: [],
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
    <div #canvasRoot class="workflow-canvas"
         tabindex="0"
         data-connecting="{{model.connecting}}"
         data-connecting-side="{{model.connectingSide}}"
         @mousedown="backgroundDown($event)"
         @mousemove="pointerMove($event)"
         @mouseup="pointerUp($event)"
         @mouseleave="pointerLeave($event)"
         @dragover="dragOver($event)"
         @drop="drop($event)"
         @keydown="keyDown($event)"
         @wheel="wheel($event)">
        <div class="workflow-canvas-grid" [style]="canvasStyle"></div>
        <div class="workflow-canvas-empty" v-if="!model.nodes.length">{{emptyHint}}</div>
        <div class="workflow-canvas-content" [style]="contentStyle">
            <div class="workflow-group" v-for="group in model.groups" v-bind="group.attrs"
                 @mousedown="groupDown($event, group)">
                <button class="workflow-group-toggle" type="button"
                    [title]="group.collapsed ? 'Expand group' : 'Collapse group'"
                    @mousedown="stopGroupRemove($event)"
                    @click="groupToggle($event, group)">{{group.collapsed ? '▸' : '▾'}}</button>
                <span class="workflow-group-title" title="{{group.name}}"
                    @dblclick="groupRename($event, group)">{{group.name}}</span>
                <button class="workflow-group-remove" type="button" title="{{group.name}}"
                    @mousedown="stopGroupRemove($event)" @click="groupRemove($event, group)">✕</button>
            </div>
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
                      @click="edgeClick($event, edge)"
                      @dblclick="edgeDouble($event, edge)"></path>
                <text v-for="edge in model.edges" v-if="edge.label" v-bind="edge.labelAttrs">{{edge.label}}</text>
                <g v-if="model.draft">
                    <path v-bind="model.draft ? model.draft.attrs : {}"></path>
                </g>
            </svg>
            <div class="workflow-canvas-nodes">
                <div v-for="node in model.nodes"
                     v-bind="node.attrs"
                     @mousedown="nodeDown($event, node)"
                     @mouseup="nodeUp($event, node)"
                     @contextmenu="nodeContext($event, node)">
                    <div class="workflow-node-header">
                        <span class="workflow-node-icon"><icon [name]="node.type" [glyph]="node.icon" size="sm"></icon></span>
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
export class WorkflowCanvasComponent implements AfterViewInit {
    @Attribute() model: WorkflowCanvasModel = EMPTY_CANVAS;
    @Attribute() locale = 'zh-CN';
    @Attribute() pointerAction?: (payload: WorkflowCanvasPointerPayload) => void;
    @Attribute() panAction?: (dx: number, dy: number) => void;

    private panStart?: { clientX: number; clientY: number };
    selectionBox?: { x: number; y: number; width: number; height: number };
    private boxStart?: { x: number; y: number };
    private boxAdditive = false;

    /**
     * Injected ElementRef can point at the outer host page in nested templates,
     * so coordinate math uses the canvas root captured from this view.
     */
    @ViewChild('canvasRoot', ElementRef) canvasRoot?: ElementRef;

    constructor(
        @Optional() protected elementRef?: ElementRef,
        @Optional() private readonly translator?: Translator
    ) { }

    onAfterViewInit(): void {
        markElementRefRaw(this.canvasRoot);
    }

    get emptyHint(): string {
        const locale = String(this.locale || '').toLowerCase().startsWith('zh') ? 'zh-CN' : 'en';
        return translateWorkflow(
            this.translator,
            locale,
            'workflow.ui.canvasEmpty',
            'Drag a component from the palette, or click one to add it'
        );
    }

    /**
     * Grid layout for the dedicated grid layer.
     *
     * Two constraints keep pan/zoom cheap: the grid must live on its own paint
     * layer (changing the canvas root's background repaints the whole node
     * subtree), and it must use non-inherited properties. Writing
     * `--wf-grid-*` custom properties on an ancestor of the nodes invalidated
     * style for every node (300 nodes ≈ 25ms/frame).
     */
    get canvasStyle(): Record<string, string> {
        const size = `${24 * (this.model.zoom || 1)}px`;
        return {
            'background-size': `${size} ${size}`,
            'background-position': `${this.model.pan?.x || 0}px ${this.model.pan?.y || 0}px`
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
        const world = this.worldFromEvent(event);
        if (event?.shiftKey) {
            // Shift+drag draws a selection rectangle; Ctrl/Command adds to the
            // existing selection instead of replacing it.
            event?.preventDefault?.();
            this.panStart = undefined;
            this.boxStart = world;
            this.boxAdditive = !!(event?.ctrlKey || event?.metaKey);
            this.selectionBox = { x: world.x, y: world.y, width: 0, height: 0 };
            this.emit({
                type: 'box-select-start',
                event,
                world,
                clientX: Number(event?.clientX) || 0,
                clientY: Number(event?.clientY) || 0
            });
            return;
        }
        this.boxStart = undefined;
        this.selectionBox = undefined;
        this.panStart = { clientX: Number(event?.clientX) || 0, clientY: Number(event?.clientY) || 0 };
        this.emit({ type: 'background-down', event, world });
    }

    pointerMove(event: any): void {
        if (this.boxStart) {
            const world = this.worldFromEvent(event);
            this.selectionBox = this.boxBetween(this.boxStart, world);
            this.emit({
                type: 'box-select-move',
                event,
                box: this.selectionBox,
                clientX: Number(event?.clientX) || 0,
                clientY: Number(event?.clientY) || 0
            });
            return;
        }
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
        if (this.boxStart) {
            const box = this.selectionBox;
            const additive = this.boxAdditive;
            this.boxStart = undefined;
            this.boxAdditive = false;
            this.selectionBox = undefined;
            if (box && (box.width > 2 || box.height > 2)) {
                this.emit({ type: 'box-select', event, box, additive });
                return;
            }
        }
        this.emit({ type: 'pointer-up', event, world: this.worldFromEvent(event) });
    }

    pointerLeave(event: any): void {
        this.panStart = undefined;
        if (this.boxStart) {
            this.boxStart = undefined;
            this.boxAdditive = false;
            this.selectionBox = undefined;
            return;
        }
        this.emit({ type: 'pointer-leave', event });
    }

    boxBetween(a: { x: number; y: number }, b: { x: number; y: number }): { x: number; y: number; width: number; height: number } {
        return {
            x: Math.min(a.x, b.x),
            y: Math.min(a.y, b.y),
            width: Math.abs(b.x - a.x),
            height: Math.abs(b.y - a.y)
        };
    }

    nodeDown(event: any, node: WorkflowCanvasNodeView): void {
        this.stop(event);
        this.panStart = undefined;
        this.emit({
            type: 'node-down',
            event,
            nodeId: node.id,
            shiftKey: !!event?.shiftKey,
            ctrlKey: !!event?.ctrlKey,
            metaKey: !!event?.metaKey,
            world: this.worldFromEvent(event)
        });
    }

    nodeUp(event: any, node: WorkflowCanvasNodeView): void {
        this.stop(event);
        this.emit({ type: 'node-up', event, nodeId: node.id, world: this.worldFromEvent(event) });
    }

    nodeContext(event: any, node: WorkflowCanvasNodeView): void {
        this.stop(event);
        event?.preventDefault?.();
        this.panStart = undefined;
        this.emit({
            type: 'node-context',
            event,
            nodeId: node.id,
            clientX: Number(event?.clientX) || 0,
            clientY: Number(event?.clientY) || 0
        });
    }

    edgeClick(event: any, edge: { id: string }): void {
        this.stop(event);
        this.emit({ type: 'edge-click', event, connectionId: edge.id });
    }

    edgeDouble(event: any, edge: { id: string }): void {
        this.stop(event);
        event?.preventDefault?.();
        this.emit({ type: 'edge-dblclick', event, connectionId: edge.id });
    }

    groupDown(event: any, group: { id: string }): void {
        this.stop(event);
        event?.preventDefault?.();
        this.panStart = undefined;
        this.emit({
            type: 'group-down',
            event,
            groupId: group.id,
            world: this.worldFromEvent(event)
        });
    }

    stopGroupRemove(event: any): void {
        this.stop(event);
        event?.preventDefault?.();
    }

    groupRename(event: any, group: { id: string }): void {
        this.stop(event);
        event?.preventDefault?.();
        this.emit({ type: 'group-rename', event, groupId: group.id });
    }

    groupToggle(event: any, group: { id: string }): void {
        this.stop(event);
        event?.preventDefault?.();
        this.emit({ type: 'group-toggle', event, groupId: group.id });
    }

    groupRemove(event: any, group: { id: string }): void {
        this.stop(event);
        event?.preventDefault?.();
        this.emit({ type: 'group-remove', event, groupId: group.id });
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
        if ((event?.ctrlKey || event?.metaKey) && ['f', 'F', 'k', 'K'].includes(key)) {
            // Keep the browser's find bar / search box from stealing these.
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
        const document = (globalThis as { document?: Document }).document;
        const scroller = this.canvasRoot?.nativeElement
            || (this.elementRef?.nativeElement as any)?.querySelector?.('.workflow-canvas')
            || document?.querySelector?.('.workflow-canvas')
            || (this.elementRef?.nativeElement as any);
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
