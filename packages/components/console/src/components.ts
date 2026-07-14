import { Attribute, Directive, ElementRef, OnDestroy, AfterViewInit, Renderer } from '@tsdi/components';
import {
    applyConsoleClipboardPaste,
    clampConsoleSelectIndex,
    formatConsoleIndexedOptionLabel,
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
    @Attribute() cursorStyle = 'color: #7ee787; background: #2ea043;';

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
    @Attribute() cursorStyle = 'color: #7ee787; background: #2ea043;';
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
    @Attribute() shellStyle = 'background: #10161d; color: #d6dee6; padding: 1; border: 1px solid #2a3441;';
    @Attribute() titleStyle = 'color: #f3f6fb; font-weight: bold;';
    @Attribute() metaStyle = 'color: #6f7c8a;';
    @Attribute() detailLabelStyle = 'color: #6f7c8a;';
    @Attribute() detailValueStyle = 'color: #d6dee6;';
    @Attribute() hintStyle = 'color: #6f7c8a;';
    @Attribute() optionActiveStyle = 'background: #18222d; color: #8fd0ff; padding: 0 1; font-weight: bold;';
    @Attribute() optionStyle = 'background: #10161d; color: #93a4b8; padding: 0 1;';

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
        const desc = opt.description ? `  ${opt.description}` : '';
        return `${formatConsoleIndexedOptionLabel(
            absIdx,
            opt.label,
            absIdx === clampConsoleSelectIndex(this.options.length, this.selectedIndex)
        )}${desc}`;
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

@Directive({
    selector: 'label'
})
export class LabelComponent {
    @Attribute() labelStyle = 'color: #6e7681;';
}


@Directive({
    selector: 'span'
})
export class SpanDirective {
    @Attribute() textStyle = '';
}

@Directive({
    selector: 'div'
})
export class DivDirective {
    @Attribute() blockStyle = '';
}

@Directive({
    selector: 'br'
})
export class BrDirective {
}
