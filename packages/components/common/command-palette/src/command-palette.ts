import { Attribute, Component, ElementRef, EventEmitter, ViewChild } from '@tsdi/components';
import { Inject, Optional } from '@tsdi/ioc';
import { markElementRefRaw } from '../../src/raw-element';
import { normalizeBoolean, nextUiId } from '../../src/ui';
import { OverlayManager } from '../../src/overlay-manager';
import {
    SearchListComponent,
    SearchListItem,
    SearchListSource
} from '../../search-list/src/search-list';
import { installCommandPaletteStyles } from './command-palette.styles';

/**
 * Command palette overlay composed from `ui-search-list` + `OverlayManager`.
 *
 * Hosts own the command catalog and recent ids; the palette owns the overlay,
 * close affordances and the search list contract (local filtering or an async
 * source, keyboard roving, loading/error/retry).
 */
@Component({
    selector: 'ui-command-palette',
    imports: [SearchListComponent],
    template: `
    <div class="ui-command-palette {{className}}" v-show="openState">
        <div class="ui-command-palette-backdrop" @click="backdropClose"></div>
        <div class="ui-command-palette-panel" v-if="openState" role="dialog" aria-modal="true"
            aria-label="{{ariaLabel}}" @keydown="onKeydown($event)">
            <div class="ui-command-palette-header" v-if="title || closable">
                <span class="ui-command-palette-title" v-if="title">{{title}}</span>
                <button class="ui-command-palette-close ui-plain-button" type="button"
                    v-if="closable" aria-label="{{closeLabel}}" @click="close">{{closeLabel}}</button>
            </div>
            <ui-search-list :items="items" :source="source" :recentIds="recentIds"
                :placeholder="placeholder" :emptyLabel="emptyLabel" :loadingLabel="loadingLabel"
                :retryLabel="retryLabel" :ariaLabel="ariaLabel" :minChars="minChars"
                :maxVisible="maxVisible"></ui-search-list>
            <div class="ui-command-palette-hint" v-if="hint">{{hint}}</div>
        </div>
    </div>`
})
export class CommandPaletteComponent {
    constructor(
        @Optional() protected elementRef?: ElementRef,
        @Optional() @Inject(OverlayManager) private overlays?: OverlayManager | null
    ) {
        markElementRefRaw(elementRef);
    }

    onInit(): void {
        installCommandPaletteStyles((this.elementRef?.nativeElement as { ownerDocument?: Document } | undefined)?.ownerDocument);
        if (this._open) {
            this.syncOverlay();
        }
    }

    onDestroy(): void {
        if (this.overlayRegistered) {
            this.overlayRegistered = false;
            this.overlays?.close(this.overlayId);
        }
    }

    @ViewChild(SearchListComponent) searchList?: SearchListComponent;

    protected readonly overlayId = nextUiId('ui-command-palette');
    private overlayRegistered = false;

    @Attribute() title = '';
    @Attribute() hint = '';
    @Attribute() ariaLabel = 'Command palette';
    @Attribute() closeLabel = '✕';
    @Attribute() className = '';
    @Attribute() placeholder = 'Type a command…';
    @Attribute() emptyLabel = 'No matching commands';
    @Attribute() loadingLabel = 'Searching…';
    @Attribute() retryLabel = 'Retry';
    @Attribute() minChars = 0;
    @Attribute() maxVisible = 12;
    @Attribute() items: SearchListItem[] = [];
    @Attribute() recentIds: string[] = [];
    @Attribute() source: SearchListSource | undefined = undefined;
    @Attribute() changeAction: ((query: string) => void) | undefined = undefined;
    @Attribute() selectAction: ((item: SearchListItem) => void) | undefined = undefined;
    @Attribute() closeAction: (() => void) | undefined = undefined;
    @Attribute() beforeCloseAction: (() => boolean | Promise<boolean>) | undefined = undefined;
    @Attribute() openChange = new EventEmitter<boolean>();

    private _open = false;
    private _closable = true;
    private _overlayEnabled = true;

    @Attribute()
    get open(): boolean { return this._open; }
    set open(value: boolean | string) {
        const next = normalizeBoolean(value);
        if (next === this._open) {
            return;
        }
        this._open = next;
        this.syncOverlay();
        if (next) {
            void Promise.resolve().then(() => this.wireList());
        }
        this.openChange.emit(next);
    }

    get openState(): boolean {
        return this._open;
    }

    @Attribute()
    get closable(): boolean { return this._closable; }
    set closable(value: boolean | string) { this._closable = normalizeBoolean(value, true); }

    /** Default on: a palette is an overlay; registration is a no-op without a manager. */
    @Attribute()
    get overlayEnabled(): boolean { return this._overlayEnabled; }
    set overlayEnabled(value: boolean | string) {
        const next = normalizeBoolean(value, true);
        if (next === this._overlayEnabled) {
            return;
        }
        this._overlayEnabled = next;
        this.syncOverlay();
    }

    protected syncOverlay(): void {
        if (this._open && this._overlayEnabled) {
            if (!this.overlayRegistered) {
                this.overlayRegistered = this.overlays?.register({
                    id: this.overlayId,
                    kind: 'palette',
                    beforeClose: () => this.beforeCloseAction?.() ?? true,
                    close: () => this.closeFromOverlay()
                }) ?? false;
            }
            return;
        }
        if (this.overlayRegistered) {
            this.overlayRegistered = false;
            this.overlays?.close(this.overlayId);
        }
    }

    protected closeFromOverlay(): void {
        this.overlayRegistered = false;
        this._open = false;
        this.openChange.emit(false);
        this.closeAction?.();
    }

    openPalette(): void {
        this.open = true;
    }

    close(): void {
        if (!this._open) {
            return;
        }
        if (this.overlayRegistered) {
            this.overlayRegistered = false;
            this.overlays?.close(this.overlayId);
        }
        this._open = false;
        this.openChange.emit(false);
        this.closeAction?.();
    }

    toggle(): void {
        if (this._open) {
            this.close();
        } else {
            this.openPalette();
        }
    }

    backdropClose(): void {
        if (this.closable) {
            this.close();
        }
    }

    onKeydown(event: any): void {
        if (String(event?.key || '') === 'Escape' && this.closable) {
            event.preventDefault?.();
            event.stopPropagation?.();
            this.close();
        }
    }

    /**
     * Child callback attributes are wired in code: a template binding whose
     * name matches a parent attribute (`selectAction`/`closeAction`) would also
     * write the expression onto the parent and recurse.
     */
    protected wireList(): void {
        const list = this.searchList;
        if (!list) {
            return;
        }
        list.selectAction = item => this.selectAction?.(item);
        list.closeAction = () => this.close();
        list.changeAction = query => this.changeAction?.(query);
    }
}
