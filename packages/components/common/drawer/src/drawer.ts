import { Attribute, Component, ElementRef } from '@tsdi/components';
import { Optional } from '@tsdi/ioc';
import { markElementRefRaw } from '../../src/raw-element';
import { normalizeBoolean } from '../../src/ui';
import { installPlainButtonStyles } from '../../src/ui.styles';
import { installDrawerStyles } from './drawer.styles';

export type DrawerPlacement = 'left' | 'right' | 'bottom';

/**
 * Host-controlled side panel (Ant Design Drawer).
 *
 * Browsers paint a fixed edge panel; terminal hosts paint the same title/lines
 * inline. `visible` is owned by the host so overlay placement stays a host
 * decision, while Escape/close handling and the plain close button are shared.
 */
@Component({
    selector: 'ui-drawer',
    template: `
    <div class="ui-drawer is-{{placement}} {{drawerClass}}" role="dialog"
        aria-modal="true" aria-label="{{ariaLabel || title}}"
        [style]="panelStyle" v-show="visibleState" @keydown="onKeydown($event)">
        <div class="ui-drawer-header" v-if="title">
            <span class="ui-drawer-title">{{title}}</span>
            <button class="ui-drawer-close ui-plain-button" type="button" data-plain="true"
                v-if="closable" aria-label="{{closeLabel}}"
                @click="close" @keydown="closeKeydown($event)">{{closeGlyph}}</button>
        </div>
        <div class="ui-drawer-body">
            <span class="ui-drawer-line" v-for="line in viewLines">{{line}}</span>
            <v-content></v-content>
        </div>
    </div>`
})
export class DrawerComponent {
    constructor(@Optional() protected elementRef?: ElementRef) {
        markElementRefRaw(elementRef);
    }

    onInit(): void {
        const doc = (this.elementRef?.nativeElement as { ownerDocument?: Document } | undefined)?.ownerDocument;
        installDrawerStyles(doc);
        installPlainButtonStyles(doc);
    }

    @Attribute() title = '';
    @Attribute() lines: string[] = [];
    @Attribute() ariaLabel = '';
    @Attribute() closeLabel = 'Close';
    @Attribute() size: number | string = 32;
    @Attribute() placement: DrawerPlacement = 'right';
    @Attribute() className = '';
    @Attribute() closeAction?: () => void;

    private _visible = false;
    private _closable = true;

    @Attribute()
    get visible(): boolean { return this._visible; }
    set visible(value: boolean | string) { this._visible = normalizeBoolean(value); }

    @Attribute()
    get closable(): boolean { return this._closable; }
    set closable(value: boolean | string) { this._closable = normalizeBoolean(value, true); }

    get closeGlyph(): string {
        return '✕';
    }

    get visibleState(): boolean {
        return this._visible;
    }

    get drawerClass(): string {
        return [this.className].filter(Boolean).join(' ');
    }

    get viewLines(): string[] {
        return Array.isArray(this.lines) ? this.lines.map(line => String(line ?? '')) : [];
    }

    get panelStyle(): Record<string, string> {
        const value = typeof this.size === 'number' ? `${this.size}ch` : String(this.size || '32ch');
        return this.placement === 'bottom'
            ? { height: value, width: '100%' }
            : { width: value };
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
