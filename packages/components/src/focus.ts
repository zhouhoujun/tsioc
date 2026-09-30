import { Injectable } from '@tsdi/ioc';

export type FocusOrigin = 'keyboard' | 'mouse' | 'touch' | 'program';

export interface FocusChange {
    readonly focused: boolean;
    readonly origin: FocusOrigin | null;
}

export interface FocusableElement {
    focus?(): void;
    blur?(): void;
    addEventListener?(type: string, listener: (event: any) => void, useCapture?: boolean): void;
    removeEventListener?(type: string, listener?: (event: any) => void, useCapture?: boolean): void;
    getAttribute?(name: string): string | null;
    hasAttribute?(name: string): boolean;
    querySelectorAll?(selector: string): FocusableElement[] | ArrayLike<FocusableElement> | null;
    ownerDocument?: { activeElement?: unknown };
}

export type FocusMonitorListener = (change: FocusChange) => void;

interface MonitoredElement {
    listeners: Set<FocusMonitorListener>;
    origin: FocusOrigin | null;
    cleanup: () => void;
}

/** Renderer-neutral focus observation inspired by Angular CDK's FocusMonitor. */
@Injectable()
export class FocusMonitor {
    private readonly monitored = new Map<FocusableElement, MonitoredElement>();

    monitor(element: FocusableElement, listener: FocusMonitorListener): () => void {
        let entry = this.monitored.get(element);
        if (!entry) {
            entry = this.createEntry(element);
            this.monitored.set(element, entry);
        }
        entry.listeners.add(listener);
        return () => {
            entry?.listeners.delete(listener);
            if (entry && entry.listeners.size === 0) this.stopMonitoring(element);
        };
    }

    stopMonitoring(element: FocusableElement): void {
        const entry = this.monitored.get(element);
        if (!entry) return;
        entry.cleanup();
        this.monitored.delete(element);
    }

    focusVia(element: FocusableElement, origin: FocusOrigin = 'program'): void {
        const entry = this.monitored.get(element);
        if (entry) entry.origin = origin;
        element.focus?.();
    }

    private createEntry(element: FocusableElement): MonitoredElement {
        const listeners = new Set<FocusMonitorListener>();
        const entry: MonitoredElement = { listeners, origin: null, cleanup: () => undefined };
        const setOrigin = (origin: FocusOrigin) => () => { entry.origin = origin; };
        const onKeyboard = setOrigin('keyboard');
        const onMouse = setOrigin('mouse');
        const onTouch = setOrigin('touch');
        const onFocus = () => {
            const origin = entry.origin || 'program';
            entry.origin = null;
            listeners.forEach(listener => listener({ focused: true, origin }));
        };
        const onBlur = () => {
            entry.origin = null;
            listeners.forEach(listener => listener({ focused: false, origin: null }));
        };
        element.addEventListener?.('keydown', onKeyboard, true);
        element.addEventListener?.('mousedown', onMouse, true);
        element.addEventListener?.('touchstart', onTouch, true);
        element.addEventListener?.('focus', onFocus, true);
        element.addEventListener?.('blur', onBlur, true);
        entry.cleanup = () => {
            element.removeEventListener?.('keydown', onKeyboard, true);
            element.removeEventListener?.('mousedown', onMouse, true);
            element.removeEventListener?.('touchstart', onTouch, true);
            element.removeEventListener?.('focus', onFocus, true);
            element.removeEventListener?.('blur', onBlur, true);
        };
        return entry;
    }
}

/** Keeps Tab navigation inside one host without owning application focus regions. */
export class FocusTrap {
    enabled = true;
    private readonly onKeydown = (event: any) => this.handleKeydown(event);

    constructor(private readonly host: FocusableElement, private readonly monitor: FocusMonitor) {
        host.addEventListener?.('keydown', this.onKeydown, true);
    }

    focusInitialElement(): boolean {
        const initial = this.query('[focusInitial],[focus-initial]')[0];
        return initial ? this.focus(initial) : this.focusFirstTabbableElement();
    }

    focusFirstTabbableElement(): boolean {
        const first = this.tabbableElements()[0];
        return first ? this.focus(first) : false;
    }

    focusLastTabbableElement(): boolean {
        const elements = this.tabbableElements();
        const last = elements[elements.length - 1];
        return last ? this.focus(last) : false;
    }

    destroy(): void {
        this.host.removeEventListener?.('keydown', this.onKeydown, true);
    }

    private handleKeydown(event: any): void {
        if (!this.enabled || String(event?.key || '').toLowerCase() !== 'tab') return;
        const elements = this.tabbableElements();
        if (!elements.length) return;
        const active = this.host.ownerDocument?.activeElement;
        const index = elements.indexOf(active as FocusableElement);
        const next = event.shiftKey
            ? elements[index <= 0 ? elements.length - 1 : index - 1]
            : elements[index < 0 || index === elements.length - 1 ? 0 : index + 1];
        event.preventDefault?.();
        this.focus(next);
    }

    private tabbableElements(): FocusableElement[] {
        return this.query('input,textarea,select,button,a,[tabindex]')
            .filter(element => !element.hasAttribute?.('disabled') && element.getAttribute?.('tabindex') !== '-1');
    }

    private query(selector: string): FocusableElement[] {
        return Array.from(this.host.querySelectorAll?.(selector) || []);
    }

    private focus(element: FocusableElement): boolean {
        if (typeof element.focus !== 'function') return false;
        this.monitor.focusVia(element, 'program');
        return true;
    }
}

@Injectable()
export class FocusTrapFactory {
    constructor(private readonly monitor: FocusMonitor) {}

    create(host: FocusableElement): FocusTrap {
        return new FocusTrap(host, this.monitor);
    }
}
