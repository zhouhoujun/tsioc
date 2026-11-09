import {
    Attribute,
    AfterViewInit,
    Component,
    ElementRef,
    OnDestroy,
    PROJECTION_NODES,
    RNode,
    ViewChild
} from '@tsdi/components';
import { Optional } from '@tsdi/ioc';
import { markElementRefRaw } from './raw-element';

export type WorkspacePane = 'left' | 'right' | 'bottom';

interface ProjectionNode extends RNode {
    tagName?: string;
}

const MIN_RATIO = 0.08;
const MAX_LEFT_RIGHT_RATIO = 0.6;
const MAX_BOTTOM_RATIO = 0.7;

/**
 * Generic workspace layout used by editors and consoles.
 *
 * Structure:
 *
 *   +---------+---------------------------+-----------+
 *   |  left   |          center           |   right   |
 *   +---------+---------------------------+-----------+
 *   |                     bottom                        |
 *   +---------------------------------------------------+
 *
 * Sizes are ratios of the container, so the layout stays responsive when the
 * window resizes. Drag the splitters to change the left/right/bottom ratios.
 * Every pane owns `overflow: auto` and therefore its own scrollbar.
 *
 * Usage:
 * ```html
 * <workspace-layout [leftRatio]="0.2" [rightRatio]="0.24" [bottomRatio]="0.26">
 *   <workspace-left>...</workspace-left>
 *   <workspace-center>...</workspace-center>
 *   <workspace-right>...</workspace-right>
 *   <workspace-bottom>...</workspace-bottom>
 * </workspace-layout>
 * ```
 */
@Component({
    selector: 'workspace-layout',
    template: `
    <div class="workspace-layout" #layoutRoot [style]="layoutStyle">
        <div class="workspace-layout-main">
            <section class="workspace-pane workspace-layout-left" aria-label="Left pane" v-show="!leftCollapsed">
                <div class="workspace-slot" data-workspace-slot="left"></div>
            </section>
            <div class="workspace-splitter workspace-splitter-left"
                 role="separator" aria-orientation="vertical" aria-label="Resize left pane"
                 @mousedown="beginResize($event, 'left')">
                <button class="workspace-collapse workspace-collapse-left"
                        type="button"
                        [title]="leftCollapsed ? 'Show left pane' : 'Hide left pane'"
                        @mousedown="stopEvent($event)"
                        @click="togglePane('left')">{{leftCollapsed ? '›' : '‹'}}</button>
            </div>
            <section class="workspace-pane workspace-layout-center" aria-label="Center pane">
                <div class="workspace-slot" data-workspace-slot="center"></div>
            </section>
            <div class="workspace-splitter workspace-splitter-right"
                 role="separator" aria-orientation="vertical" aria-label="Resize right pane"
                 @mousedown="beginResize($event, 'right')">
                <button class="workspace-collapse workspace-collapse-right"
                        type="button"
                        [title]="rightCollapsed ? 'Show right pane' : 'Hide right pane'"
                        @mousedown="stopEvent($event)"
                        @click="togglePane('right')">{{rightCollapsed ? '‹' : '›'}}</button>
            </div>
            <section class="workspace-pane workspace-layout-right" aria-label="Right pane" v-show="!rightCollapsed">
                <div class="workspace-slot" data-workspace-slot="right"></div>
            </section>
        </div>
        <div class="workspace-splitter workspace-splitter-bottom"
             role="separator" aria-orientation="horizontal" aria-label="Resize bottom pane"
             @mousedown="beginResize($event, 'bottom')">
            <button class="workspace-collapse workspace-collapse-bottom"
                    type="button"
                    [title]="bottomCollapsed ? 'Show bottom pane' : 'Hide bottom pane'"
                    @mousedown="stopEvent($event)"
                    @click="togglePane('bottom')">{{bottomCollapsed ? '▲' : '▼'}}</button>
        </div>
        <section class="workspace-pane workspace-layout-bottom" aria-label="Bottom pane" v-show="!bottomCollapsed">
            <div class="workspace-slot" data-workspace-slot="bottom"></div>
        </section>
    </div>`
})
export class WorkspaceLayoutComponent implements AfterViewInit, OnDestroy {
    @Attribute() leftRatio = 0.2;
    @Attribute() rightRatio = 0.24;
    @Attribute() bottomRatio = 0.26;
    @Attribute() minLeft = 160;
    @Attribute() minRight = 180;
    @Attribute() minBottom = 80;
    @Attribute() resizable = true;
    @Attribute() leftCollapsed = false;
    @Attribute() rightCollapsed = false;
    @Attribute() bottomCollapsed = false;
    @Attribute() resizeAction?: (pane: WorkspacePane, ratio: number) => void;
    @Attribute() collapseAction?: (pane: WorkspacePane, collapsed: boolean) => void;

    @ViewChild('layoutRoot', ElementRef) layoutRoot?: ElementRef;

    protected resizing?: {
        pane: WorkspacePane;
        startX: number;
        startY: number;
        startLeft: number;
        startRight: number;
        startBottom: number;
        width: number;
        height: number;
    };

    private moveHandler?: (event: any) => void;
    private upHandler?: (event: any) => void;
    private projected = false;

    constructor(@Optional() protected elementRef?: ElementRef) {
        markElementRefRaw(elementRef);
    }

    get layoutStyle(): Record<string, string> {
        return {
            '--workspace-left': `${this.leftRatio * 100}%`,
            '--workspace-right': `${this.rightRatio * 100}%`,
            '--workspace-bottom': `${this.bottomRatio * 100}%`
        };
    }

    onAfterViewInit(): void {
        markElementRefRaw(this.layoutRoot);
        this.mountProjectedContent();
        this.bindResizeListeners();
    }

    onDestroy(): void {
        this.unbindResizeListeners();
    }

    /** Move declarative slot wrappers into the template's scrollable panes. */
    mountProjectedContent(): void {
        if (this.projected) {
            return;
        }
        const root = this.layoutRoot?.nativeElement as any;
        if (!root) {
            return;
        }
        const host = root.closest?.('workspace-layout') || root.parentElement || this.hostElement;
        const nodes: ProjectionNode[] = (host as any)?.[PROJECTION_NODES] || [];
        if (!nodes.length) {
            return;
        }
        const slots: Record<string, any> = {};
        root.querySelectorAll?.('[data-workspace-slot]')?.forEach?.((slot: any) => {
            slots[slot.getAttribute('data-workspace-slot')] = slot;
        });
        if (!Object.keys(slots).length) {
            return;
        }
        nodes.forEach((node, index) => {
            const tag = String(node.tagName || '').toLowerCase();
            const key = tag.startsWith('workspace-') ? tag.slice('workspace-'.length) : '';
            const fallback = ['left', 'center', 'right', 'bottom'][index];
            const slot = slots[key] || slots[fallback];
            if (slot && typeof slot.appendChild === 'function') {
                slot.appendChild(node as any);
            }
        });
        this.projected = true;
    }

    beginResize(event: any, pane: WorkspacePane): void {
        if (!this.resizable || this.isCollapsed(pane)) {
            return;
        }
        event?.preventDefault?.();
        event?.stopPropagation?.();
        const host = this.layoutRoot?.nativeElement as any || this.hostElement;
        const rect = host?.getBoundingClientRect?.() || { width: 0, height: 0 };
        this.resizing = {
            pane,
            startX: Number(event?.clientX) || 0,
            startY: Number(event?.clientY) || 0,
            startLeft: this.leftRatio,
            startRight: this.rightRatio,
            startBottom: this.bottomRatio,
            width: rect.width || 0,
            height: rect.height || 0
        };
    }

    resizeMove(event: any): void {
        const resize = this.resizing;
        if (!resize) {
            return;
        }
        if (resize.pane === 'left') {
            const delta = resize.width ? (Number(event?.clientX) - resize.startX) / resize.width : 0;
            this.setLeftRatio(resize.startLeft + delta);
        } else if (resize.pane === 'right') {
            const delta = resize.width ? (Number(event?.clientX) - resize.startX) / resize.width : 0;
            this.setRightRatio(resize.startRight - delta);
        } else {
            const delta = resize.height ? (Number(event?.clientY) - resize.startY) / resize.height : 0;
            this.setBottomRatio(resize.startBottom - delta);
        }
    }

    endResize(): void {
        if (!this.resizing) {
            return;
        }
        this.resizing = undefined;
    }

    /** Public helper used by hosts/tests. */
    resizePane(pane: WorkspacePane, ratio: number): void {
        if (pane === 'left') {
            this.setLeftRatio(ratio);
        } else if (pane === 'right') {
            this.setRightRatio(ratio);
        } else {
            this.setBottomRatio(ratio);
        }
    }

    isCollapsed(pane: WorkspacePane): boolean {
        return pane === 'left'
            ? this.leftCollapsed
            : pane === 'right'
                ? this.rightCollapsed
                : this.bottomCollapsed;
    }

    togglePane(pane: WorkspacePane): void {
        this.isCollapsed(pane) ? this.expandPane(pane) : this.collapsePane(pane);
    }

    collapsePane(pane: WorkspacePane): void {
        this.setCollapsed(pane, true);
    }

    expandPane(pane: WorkspacePane): void {
        this.setCollapsed(pane, false);
    }

    setCollapsed(pane: WorkspacePane, collapsed: boolean): void {
        if (pane === 'left') {
            this.leftCollapsed = collapsed;
        } else if (pane === 'right') {
            this.rightCollapsed = collapsed;
        } else {
            this.bottomCollapsed = collapsed;
        }
        this.collapseAction?.(pane, collapsed);
    }

    stopEvent(event: any): void {
        event?.preventDefault?.();
        event?.stopPropagation?.();
    }

    setLeftRatio(value: number): void {
        const width = this.layoutSize().width;
        const min = this.minRatio(this.minLeft, width);
        const max = Math.min(MAX_LEFT_RIGHT_RATIO, 1 - this.rightRatio - min);
        this.leftRatio = this.clamp(value, min, max);
        this.resizeAction?.('left', this.leftRatio);
    }

    setRightRatio(value: number): void {
        const width = this.layoutSize().width;
        const min = this.minRatio(this.minRight, width);
        const max = Math.min(MAX_LEFT_RIGHT_RATIO, 1 - this.leftRatio - min);
        this.rightRatio = this.clamp(value, min, max);
        this.resizeAction?.('right', this.rightRatio);
    }

    setBottomRatio(value: number): void {
        const height = this.layoutSize().height;
        const min = this.minRatio(this.minBottom, height);
        this.bottomRatio = this.clamp(value, min, MAX_BOTTOM_RATIO);
        this.resizeAction?.('bottom', this.bottomRatio);
    }

    protected layoutSize(): { width: number; height: number } {
        const rect = (this.layoutRoot?.nativeElement as any)?.getBoundingClientRect?.();
        return {
            width: Number(rect?.width) || 0,
            height: Number(rect?.height) || 0
        };
    }

    protected minRatio(pixels: number, dimension: number): number {
        const minimum = Math.max(0, Number(pixels) || 0);
        return dimension > 0 ? Math.max(MIN_RATIO, minimum / dimension) : MIN_RATIO;
    }

    protected get hostElement(): any {
        return this.elementRef?.nativeElement as any;
    }

    protected clamp(value: number, min: number, max: number): number {
        const number = Number(value);
        if (!Number.isFinite(number)) {
            return min;
        }
        return Math.max(min, Math.min(Math.max(min, max), number));
    }

    protected bindResizeListeners(): void {
        const doc = (this.layoutRoot?.nativeElement as any)?.ownerDocument;
        if (!doc || typeof doc.addEventListener !== 'function') {
            return;
        }
        if (this.moveHandler) {
            return;
        }
        // `this` is the reactive component proxy here; the handlers keep writes
        // reactive while the pointer is over any pane.
        this.moveHandler = (event: any) => this.resizeMove(event);
        this.upHandler = () => this.endResize();
        doc.addEventListener('mousemove', this.moveHandler);
        doc.addEventListener('mouseup', this.upHandler);
    }

    protected unbindResizeListeners(): void {
        const doc = (this.layoutRoot?.nativeElement as any)?.ownerDocument;
        if (!doc || typeof doc.removeEventListener !== 'function') {
            return;
        }
        if (this.moveHandler) {
            doc.removeEventListener('mousemove', this.moveHandler);
        }
        if (this.upHandler) {
            doc.removeEventListener('mouseup', this.upHandler);
        }
        this.moveHandler = undefined;
        this.upHandler = undefined;
    }
}
