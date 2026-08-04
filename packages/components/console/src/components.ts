import { Attribute, Component, Directive, ElementRef, EventEmitter, OnDestroy, AfterViewInit, Renderer, RNode, NodeType, PROJECTION_NODES } from '@tsdi/components';
import { Optional } from '@tsdi/ioc';
import {
    applyConsoleClipboardPaste,
    clampConsoleSelectIndex,
    formatConsoleSelectOptionTableRow,
    resolveConsoleOptionLabelColumnWidth,
    resolveConsoleClipboardSelection,
    resolveConsoleSelectWindow
} from './input';

abstract class ConsoleEditableDirective implements AfterViewInit, OnDestroy {
    protected _value = '';
    protected _cursorPos = 0;
    protected _focused = false;
    protected nativeListeners: Array<{ type: string; listener: EventListener }> = [];
    protected mutationObserver?: any;

    constructor(
        protected elementRef: ElementRef,
        protected renderer: Renderer
    ) {
    }

    @Attribute()
    get value(): string {
        return this._value;
    }

    set value(value: string) {
        this._value = String(value || '');
        this.syncNativeValue();
        this.syncNativeCursor();
    }

    @Attribute()
    get cursorPos(): number {
        return this._cursorPos;
    }

    set cursorPos(value: number | string) {
        const resolved = Number.parseInt(String(value ?? this._value.length), 10);
        this._cursorPos = Math.max(0, Math.min(this._value.length, Number.isFinite(resolved) ? resolved : this._value.length));
        this.syncNativeCursor();
    }

    @Attribute()
    get focused(): boolean {
        return this._focused;
    }

    set focused(value: boolean | string) {
        this._focused = value === '' || value === true || value === 'true';
        this.syncNativeCursor();
    }

    onAfterViewInit(): void {
        const nativeElement = this.elementRef?.nativeElement as any;
        if (!nativeElement?.addEventListener) {
            return;
        }
        const syncValue = () => {
            const nextValue = typeof nativeElement.value === 'string' ? nativeElement.value : '';
            this._value = nextValue;
            this.renderer.setAttribute(nativeElement, 'value', nextValue);
            syncCursor();
        };
        const syncCursor = () => {
            const selection = typeof nativeElement.selectionStart === 'number'
                ? nativeElement.selectionStart
                : this._value.length;
            this._cursorPos = Math.max(0, Math.min(this._value.length, selection));
            this.renderer.setAttribute(nativeElement, 'cursorPos', String(this._cursorPos));
        };
        const getSelection = () => resolveConsoleClipboardSelection(
            typeof nativeElement.value === 'string' ? nativeElement.value : this._value,
            typeof nativeElement.selectionStart === 'number' ? nativeElement.selectionStart : this._cursorPos,
            typeof nativeElement.selectionEnd === 'number' ? nativeElement.selectionEnd : this._cursorPos
        );
        const readClipboardText = (event: any): string | undefined => {
            const data = event?.clipboardData || event?.originalEvent?.clipboardData;
            if (data && typeof data.getData === 'function') {
                const text = data.getData('text/plain') || data.getData('text');
                return typeof text === 'string' ? text : undefined;
            }
            return undefined;
        };
        const writeClipboardText = (event: any, text: string): boolean => {
            const data = event?.clipboardData || event?.originalEvent?.clipboardData;
            if (!data || typeof data.setData !== 'function') {
                return false;
            }
            data.setData('text/plain', text);
            return true;
        };
        const setNativeValueAndCursor = (value: string, cursor: number) => {
            nativeElement.value = value;
            this._value = value;
            this._cursorPos = Math.max(0, Math.min(value.length, cursor));
            this.renderer.setAttribute(nativeElement, 'value', value);
            this.renderer.setAttribute(nativeElement, 'cursorPos', String(this._cursorPos));
            this.syncNativeValue();
            this.syncNativeCursor();
        };
        const bind = (type: string, listener: EventListener) => {
            nativeElement.addEventListener(type, listener);
            this.nativeListeners.push({ type, listener });
        };
        bind('focus', () => {
            this._focused = true;
            this.renderer.setAttribute(nativeElement, 'focused', 'true');
            syncCursor();
        });
        bind('blur', () => {
            this._focused = false;
            this.renderer.setAttribute(nativeElement, 'focused', 'false');
        });
        bind('click', syncCursor);
        bind('keyup', syncCursor);
        bind('input', syncValue);
        bind('copy', ((event: any) => {
            const selection = getSelection();
            if (!selection.text) {
                return;
            }
            if (writeClipboardText(event, selection.text)) {
                event.preventDefault?.();
            }
        }) as EventListener);
        bind('cut', ((event: any) => {
            const selection = getSelection();
            if (!selection.text) {
                return;
            }
            if (!writeClipboardText(event, selection.text)) {
                return;
            }
            const nextValue = `${this._value.slice(0, selection.start)}${this._value.slice(selection.end)}`;
            event.preventDefault?.();
            setNativeValueAndCursor(nextValue, selection.start);
        }) as EventListener);
        bind('paste', ((event: any) => {
            const clipboardText = readClipboardText(event);
            if (clipboardText === undefined) {
                Promise.resolve().then(syncValue);
                return;
            }
            const selection = getSelection();
            const next = applyConsoleClipboardPaste(
                this._value,
                selection.start,
                selection.end,
                clipboardText,
                nativeElement.tagName
            );
            event.preventDefault?.();
            setNativeValueAndCursor(next.value, next.cursor);
        }) as EventListener);
        const MutationObserverCtor = nativeElement?.ownerDocument?.defaultView?.MutationObserver || (globalThis as any).MutationObserver;
        if (MutationObserverCtor) {
            this.mutationObserver = new MutationObserverCtor(() => {
                const attrValue = nativeElement.getAttribute?.('value');
                if (typeof attrValue === 'string' && attrValue !== this._value) {
                    this._value = attrValue;
                    this.syncNativeValue();
                }
                const cursorText = nativeElement.getAttribute?.('cursorPos') ?? nativeElement.getAttribute?.('cursorpos');
                if (cursorText != null) {
                    const nextCursor = Number.parseInt(String(cursorText), 10);
                    if (Number.isFinite(nextCursor)) {
                        this._cursorPos = Math.max(0, Math.min(this._value.length, nextCursor));
                    }
                }
                const focusedText = nativeElement.getAttribute?.('focused');
                if (focusedText != null) {
                    this._focused = focusedText === '' || focusedText === 'true';
                }
                this.syncNativeCursor();
            });
            this.mutationObserver?.observe?.(nativeElement, {
                attributes: true,
                attributeFilter: ['value', 'cursorPos', 'cursorpos', 'focused']
            });
        }
        this.syncNativeValue();
        this.syncNativeCursor();
    }

    onDestroy(): void {
        const nativeElement = this.elementRef?.nativeElement as any;
        if (nativeElement?.removeEventListener) {
            this.nativeListeners.forEach(({ type, listener }) => nativeElement.removeEventListener(type, listener));
        }
        this.nativeListeners = [];
        this.mutationObserver?.disconnect();
        this.mutationObserver = undefined;
    }

    protected syncNativeValue(): void {
        const nativeElement = this.elementRef?.nativeElement as any;
        if (!nativeElement) {
            return;
        }
        if ('value' in nativeElement && nativeElement.value !== this._value) {
            nativeElement.value = this._value;
        }
        if (typeof nativeElement.textContent === 'string' && nativeElement.tagName?.toLowerCase?.() === 'textarea') {
            nativeElement.textContent = this._value;
        }
    }

    protected syncNativeCursor(): void {
        const nativeElement = this.elementRef?.nativeElement as any;
        if (!nativeElement || typeof nativeElement.setSelectionRange !== 'function') {
            return;
        }
        if (!this._focused) {
            return;
        }
        const pos = Math.max(0, Math.min(this._value.length, this._cursorPos));
        try {
            nativeElement.setSelectionRange(pos, pos);
        } catch {
            // Ignore renderers without native selection support.
        }
    }
}

@Directive({
    selector: 'input'
})
export class TuiInputComponent extends ConsoleEditableDirective {
    constructor(elementRef: ElementRef, renderer: Renderer) {
        super(elementRef, renderer);
    }

    @Attribute() prompt = '> ';
    @Attribute() cursor = ' ';
    @Attribute() placeholder = '';
    @Attribute() shellStyle = 'background: #1b2128; color: #c9d1d9; padding: 1 3;';
    @Attribute() promptStyle = 'color: #7ee787; font-weight: bold;';
    @Attribute() valueStyle = 'color: #c9d1d9;';
    @Attribute() placeholderStyle = 'color: #6e7681;';
    @Attribute() cursorStyle = 'color: #7ee787; background: #2ea043;';
    @Attribute() renderRegion = '';

    get displayPrompt(): string {
        return this.prompt;
    }

    get displayValue(): string {
        const value = String(this.value || '');
        const pos = Math.max(0, Math.min(this.cursorPos, value.length));
        return value.slice(0, pos);
    }

    get cursorChar(): string {
        const value = String(this.value || '');
        const pos = Math.max(0, Math.min(this.cursorPos, value.length));
        return pos < value.length ? value[pos] : this.cursor;
    }
}

@Directive({
    selector: 'textarea'
})
export class TuiTextareaComponent extends ConsoleEditableDirective {
    constructor(elementRef: ElementRef, renderer: Renderer) {
        super(elementRef, renderer);
    }

    @Attribute() prompt = '> ';
    @Attribute() placeholder = '';
    @Attribute() cursor = ' ';
    @Attribute() continuationPrompt = '  ';
    @Attribute() shellStyle = 'background: #1b2128; color: #c9d1d9; padding: 1 3;';
    @Attribute() promptStyle = 'color: #7ee787; font-weight: bold;';
    @Attribute() valueStyle = 'color: #c9d1d9;';
    @Attribute() placeholderStyle = 'color: #6e7681;';
    @Attribute() cursorStyle = 'color: #7ee787; background: #2ea043;';
    @Attribute() renderRegion = '';
}

@Directive({
    selector: 'select'
})
export class TuiSelectComponent {
    @Attribute() title = '';
    @Attribute() meta = '';
    @Attribute() hint = '';
    @Attribute() options: Array<{ label: string; value: string; description?: string }> = [];
    @Attribute() selectedIndex = 0;
    @Attribute() detailTitle = '';
    @Attribute() detailLines: string[] = [];
    @Attribute() visibleCount = 6;
    @Attribute() descriptionMaxWidth = 32;
    @Attribute() shellStyle = 'background: #10161d; color: #d6dee6; padding: 1; border: 1px solid #2a3441;';
    @Attribute() titleStyle = 'color: #f3f6fb; font-weight: bold;';
    @Attribute() metaStyle = 'color: #6f7c8a;';
    @Attribute() detailLabelStyle = 'color: #6f7c8a;';
    @Attribute() detailValueStyle = 'color: #d6dee6;';
    @Attribute() hintStyle = 'color: #6f7c8a;';
    @Attribute() optionActiveStyle = 'background: #18222d; color: #8fd0ff; padding: 0 1; font-weight: bold;';
    @Attribute() optionStyle = 'background: #10161d; color: #93a4b8; padding: 0 1;';
    @Attribute() renderRegion = '';

    protected readonly VISIBLE = 6;

    get metaLabel(): string {
        if (this.meta) {
            return this.meta;
        }
        return this.options.length ? `${this.selectedIndex + 1}/${this.options.length}` : '';
    }

    protected get visibleStart(): number {
        return resolveConsoleSelectWindow(this.options.length, this.selectedIndex, this.visibleWindowSize).start;
    }

    protected get visibleOptions(): Array<{ label: string; value: string; description?: string }> {
        const window = resolveConsoleSelectWindow(this.options.length, this.selectedIndex, this.visibleWindowSize);
        return this.options.slice(window.start, window.start + window.count);
    }

    protected get visibleWindowSize(): number {
        const configured = Number.parseInt(String(this.visibleCount || this.VISIBLE), 10);
        return Number.isFinite(configured) && configured > 0 ? configured : this.VISIBLE;
    }

    optionLabelAt(index: number): string {
        const opt = this.visibleOptions[index];
        if (!opt) { return ''; }
        const absIdx = this.visibleStart + index;
        return formatConsoleSelectOptionTableRow(
            absIdx,
            opt.label,
            absIdx === clampConsoleSelectIndex(this.options.length, this.selectedIndex),
            opt.description || '',
            resolveConsoleOptionLabelColumnWidth(this.visibleOptions, this.visibleStart),
            Number.parseInt(String(this.descriptionMaxWidth || 32), 10) || 32
        );
    }

    optionStyleAt(index: number): Record<string, string> {
        const opt = this.visibleOptions[index];
        if (!opt) { return {}; }
        const absIdx = this.visibleStart + index;
        return this.parseStyle(absIdx === clampConsoleSelectIndex(this.options.length, this.selectedIndex) ? this.optionActiveStyle : this.optionStyle);
    }

    protected parseStyle(value: string): Record<string, string> {
        const style: Record<string, string> = {};
        String(value || '').split(';').map(s => s.trim()).filter(Boolean).forEach(part => {
            const idx = part.indexOf(':');
            if (idx < 0) { return; }
            style[part.slice(0, idx).trim()] = part.slice(idx + 1).trim();
        });
        return style;
    }
}

@Component({
    selector: 'panel',
    template: `
    <div class="console-panel console-base-panel" v-style="shellStyle">
        <label class="panel-summary" v-style="summaryStyle" @click="toggle" v-show="summaryLine">{{summaryLine}}</label>
        <label class="panel-hint" v-style="hintStyle" v-show="hintLabel">{{hintLabel}}</label>
        <label class="panel-detail" v-style="detailStyle" v-for="index in detailIndexes">{{detailLineAt(index)}}</label>
        <label class="panel-hint" v-style="hintStyle" v-show="hiddenDetailLabel">{{hiddenDetailLabel}}</label>
    </div>
    `
})
export class PanelComponent {
    private _summary = '';
    private _hint = '';
    private _detailLines: string[] = [];
    private _visibleLines = 3;
    private _expanded = false;

    constructor(
        @Optional() protected elementRef?: ElementRef
    ) {
    }

    @Attribute()
    get summary(): string {
        return this._summary;
    }

    set summary(value: string) {
        this._summary = String(value || '').trim();
    }

    @Attribute()
    get hint(): string {
        return this._hint;
    }

    set hint(value: string) {
        this._hint = String(value || '').trim();
    }

    @Attribute()
    get detailLines(): string[] {
        const contentLines = this.contentDetailLines;
        return contentLines.length ? contentLines : this._detailLines;
    }

    set detailLines(value: string[] | string | undefined | null) {
        if (Array.isArray(value)) {
            this._detailLines = value.map(line => String(line ?? ''));
            return;
        }
        const text = String(value || '').trim();
        if (!text) {
            this._detailLines = [];
            return;
        }
        try {
            const parsed = JSON.parse(text);
            if (Array.isArray(parsed)) {
                this._detailLines = parsed.map(line => String(line ?? ''));
                return;
            }
        } catch {
            // ignore JSON parse failures and fall back to newline splitting
        }
        this._detailLines = text.split('\n').map(line => String(line ?? ''));
    }

    @Attribute()
    get visibleLines(): number {
        return this._visibleLines;
    }

    set visibleLines(value: number | string) {
        const parsed = Number.parseInt(String(value ?? this._visibleLines), 10);
        this._visibleLines = Number.isFinite(parsed) && parsed > 0 ? parsed : 3;
    }

    @Attribute()
    get expanded(): boolean {
        return this._expanded;
    }

    set expanded(value: boolean | string) {
        this._expanded = value === '' || value === true || value === 'true';
    }

    @Attribute() expandedChange = new EventEmitter<boolean>();

    get contentDetailLines(): string[] {
        const nodes = this.resolveProjectedContent();
        if (!nodes.length) {
            return [];
        }
        const lines: string[] = [];
        nodes.forEach(node => {
            this.collectContentText(node, lines);
        });
        return lines;
    }

    protected resolveProjectedContent(): RNode[] {
        const native = this.elementRef?.nativeElement as any;
        const nodes = native?.[PROJECTION_NODES] as RNode[] | undefined;
        return nodes?.length ? nodes : [];
    }

    protected collectContentText(node: RNode | undefined | null, lines: string[]): void {
        if (!node) {
            return;
        }
        if (node.nodeType === NodeType.Text || node.nodeType === NodeType.Comment) {
            const text = String((node as any).textContent || '');
            text.split('\n').forEach(line => {
                const trimmed = line.trim();
                if (trimmed) {
                    lines.push(trimmed);
                }
            });
            return;
        }
        const children = (node as any).childNodes as RNode[] | undefined;
        if (children?.length) {
            children.forEach(child => this.collectContentText(child, lines));
            return;
        }
        const text = String((node as any).textContent || '');
        text.split('\n').forEach(line => {
            const trimmed = line.trim();
            if (trimmed) {
                lines.push(trimmed);
            }
        });
    }

    get shellStyle(): string {
        return 'background: #10161d; color: #d6dee6; padding: 1; border: 1px solid #2a3441;';
    }

    get summaryLabel(): string {
        return this._summary || this.detailLines[0] || '';
    }

    get summaryLine(): string {
        const summary = this.summaryLabel;
        if (!summary) {
            return '';
        }
        return `${this._expanded ? '▾' : '▸'} ${summary}`;
    }

    get hintLabel(): string {
        if (this._hint) {
            return this._hint;
        }
        if (!this.detailLines.length) {
            return '';
        }
        return this._expanded ? 'click summary to collapse' : 'click summary to expand';
    }

    get visibleDetailLines(): string[] {
        const lines = this.detailLines;
        if (this._expanded) {
            return lines.slice();
        }
        return lines.slice(0, this._visibleLines);
    }

    get detailIndexes(): number[] {
        return Array.from({ length: this.visibleDetailLines.length }, (_value, index) => index);
    }

    detailLineAt(index: number): string {
        return this.visibleDetailLines[index] || '';
    }

    get hiddenDetailCount(): number {
        if (this._expanded) {
            return 0;
        }
        return Math.max(0, this.detailLines.length - this._visibleLines);
    }

    get hiddenDetailLabel(): string {
        const hidden = this.hiddenDetailCount;
        return hidden > 0 ? `… ${hidden} more line${hidden === 1 ? '' : 's'}` : '';
    }

    get summaryStyle(): Record<string, string> {
        return {
            color: '#f3f6fb',
            'font-weight': 'bold',
            cursor: 'pointer'
        };
    }

    get detailStyle(): Record<string, string> {
        return {
            color: '#d6dee6',
            'white-space': 'pre-wrap',
            'overflow-wrap': 'anywhere'
        };
    }

    get hintStyle(): Record<string, string> {
        return {
            color: '#6f7c8a'
        };
    }

    toggle(): void {
        this._expanded = !this._expanded;
        this.expandedChange.emit(this._expanded);
    }
}

@Directive({
    selector: 'label'
})
export class LabelComponent {
    @Attribute() labelStyle = 'color: #6e7681;';
    @Attribute() renderRegion = '';
}


@Directive({
    selector: 'span'
})
export class SpanDirective {
    @Attribute() textStyle = '';
    @Attribute() renderRegion = '';
}

@Directive({
    selector: 'div'
})
export class DivDirective {
    @Attribute() blockStyle = '';
    @Attribute() renderRegion = '';
}

@Directive({
    selector: 'br'
})
export class BrDirective {
    @Attribute() renderRegion = '';
}
