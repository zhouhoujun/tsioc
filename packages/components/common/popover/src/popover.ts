import { Attribute, Component, ElementRef } from '@tsdi/components';
import { Optional } from '@tsdi/ioc';
import { markElementRefRaw } from '../../src/raw-element';
import { normalizeBoolean } from '../../src/ui';
import { installPlainButtonStyles } from '../../src/ui.styles';
import { installPopoverStyles } from './popover.styles';

export type PopoverPlacement = 'top' | 'bottom' | 'left' | 'right';

/**
 * Renderer-neutral popover (Ant Design Popover / MUI Popover).
 *
 * `open` is host-owned: the component provides the panel chrome, placement
 * classes and Escape handling; hosts wire their trigger. Browsers position the
 * panel above the anchor, terminal hosts paint the same title/lines inline.
 */
@Component({
    selector: 'ui-popover',
    template: `
    <span class="ui-popover {{popoverClass}}" @keydown="onKeydown($event)">
        <v-content></v-content>
        <div class="ui-popover-popup is-{{placement}}" role="dialog"
            aria-label="{{ariaLabel || title}}" v-if="visibleState">
            <div class="ui-popover-header" v-if="title">
                <span class="ui-popover-title">{{title}}</span>
                <button class="ui-popover-close ui-plain-button" type="button" data-plain="true"
                    v-if="closable" aria-label="{{closeLabel}}" @click="close" @keydown="closeKeydown($event)">{{closeGlyph}}</button>
            </div>
            <div class="ui-popover-line" v-for="line in viewLines">{{line}}</div>
        </div>
    </span>`
})
export class PopoverComponent {
    constructor(@Optional() protected elementRef?: ElementRef) {
        markElementRefRaw(elementRef);
    }

    onInit(): void {
        const doc = (this.elementRef?.nativeElement as { ownerDocument?: Document } | undefined)?.ownerDocument;
        installPopoverStyles(doc);
        installPlainButtonStyles(doc);
    }

    @Attribute() title = '';
    @Attribute() lines: string[] = [];
    @Attribute() ariaLabel = '';
    @Attribute() closeLabel = 'Close';
    @Attribute() closeAction?: () => void;
    @Attribute() className = '';

    private _visible = false;
    private _closable = true;
    private _placement: PopoverPlacement = 'bottom';

    @Attribute()
    get visible(): boolean { return this._visible; }
    set visible(value: boolean | string) { this._visible = normalizeBoolean(value); }

    @Attribute()
    get closable(): boolean { return this._closable; }
    set closable(value: boolean | string) { this._closable = normalizeBoolean(value, true); }

    @Attribute()
    get placement(): PopoverPlacement { return this._placement; }
    set placement(value: string) {
        this._placement = value === 'top' || value === 'left' || value === 'right' ? value : 'bottom';
    }

    get closeGlyph(): string {
        return '✕';
    }

    get viewLines(): string[] {
        return Array.isArray(this.lines) ? this.lines.map(line => String(line ?? '')) : [];
    }

    get visibleState(): boolean {
        return this._visible && (!!this.title || !!this.viewLines.length);
    }

    get popoverClass(): string {
        return [this.className].filter(Boolean).join(' ');
    }

    close(): void {
        this.closeAction?.();
        this._visible = false;
    }

    closeKeydown(event: any): void {
        if (event?.key === 'Enter' || event?.key === ' ' || event?.key === 'Spacebar') {
            event.preventDefault?.();
            event.stopPropagation?.();
            this.close();
        }
    }

    onKeydown(event: any): void {
        if (event?.key === 'Escape' && this.visibleState) {
            event.preventDefault?.();
            event.stopPropagation?.();
            this.close();
        }
    }
}
