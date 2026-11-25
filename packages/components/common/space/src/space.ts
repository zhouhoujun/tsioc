import { Attribute, Component, ElementRef } from '@tsdi/components';
import { Optional } from '@tsdi/ioc';
import { markElementRefRaw } from '../../src/raw-element';
import { normalizeBoolean, normalizeSize, UiSize } from '../../src/ui';
import { installSpaceStyles } from './space.styles';

export interface SpaceItem {
    id?: string;
    label: string;
    icon?: string;
    iconGlyph?: string;
}

interface SpaceViewItem {
    key: string;
    index: number;
    label: string;
    icon: string;
    iconGlyph: string;
}

/**
 * Inline/stack layout primitive (Ant Design Space / MUI Stack).
 *
 * Vertical spaces stack children in both renderers. Horizontal data items are
 * joined with a configurable separator so the terminal shows the same content
 * as the browser flex row; projected children stay supported at the start.
 */
@Component({
    selector: 'ui-space',
    template: `
    <div class="ui-space {{spaceClass}}" role="group" aria-label="{{ariaLabel}}" [style]="rootStyle">
        <v-content></v-content>
        <span class="ui-space-inline" v-if="!vertical">
            <span class="ui-space-entry" v-for="entry in viewItems" trackBy="key">
                <span class="ui-space-sep" aria-hidden="true" v-if="entry.index > 0">{{separator}}</span>
                <span class="ui-space-item" role="{{itemRole}}"
                    tabindex="{{itemRole === 'button' ? 0 : -1}}"
                    focusable="{{itemRole === 'button'}}"
                    @click="pick(entry)" @keydown="onItemKeydown(entry, $event)">
                    <icon v-if="entry.icon || entry.iconGlyph" [name]="entry.icon" [glyph]="entry.iconGlyph || entry.icon" size="sm"></icon>
                    {{entry.label}}
                </span>
            </span>
        </span>
        <div class="ui-space-stack" v-else>
            <span class="ui-space-item" role="{{itemRole}}"
                tabindex="{{itemRole === 'button' ? 0 : -1}}"
                focusable="{{itemRole === 'button'}}"
                v-for="entry in viewItems" trackBy="key"
                @click="pick(entry)" @keydown="onItemKeydown(entry, $event)">
                <icon v-if="entry.icon || entry.iconGlyph" [name]="entry.icon" [glyph]="entry.iconGlyph || entry.icon" size="sm"></icon>
                {{entry.label}}
            </span>
        </div>
    </div>`
})
export class SpaceComponent {
    constructor(@Optional() protected elementRef?: ElementRef) {
        markElementRefRaw(elementRef);
    }

    onInit(): void {
        installSpaceStyles((this.elementRef?.nativeElement as { ownerDocument?: Document } | undefined)?.ownerDocument);
    }

    @Attribute() items: Array<SpaceItem | string> = [];
    @Attribute() itemsGap = '';
    @Attribute() direction: 'horizontal' | 'vertical' = 'horizontal';
    @Attribute() separator = ' ';
    @Attribute() ariaLabel = 'Space';
    @Attribute() className = '';
    @Attribute() action?: (item: SpaceItem | string, index: number) => void;

    private _size: UiSize = 'md';
    private _wrap = false;

    @Attribute()
    get size(): UiSize { return this._size; }
    set size(value: string) { this._size = normalizeSize(value); }

    @Attribute()
    get wrap(): boolean { return this._wrap; }
    set wrap(value: boolean | string) { this._wrap = normalizeBoolean(value); }

    get vertical(): boolean {
        return this.direction === 'vertical';
    }

    get itemRole(): 'button' | 'none' {
        return this.action ? 'button' : 'none';
    }

    get spaceClass(): string {
        return [
            `is-${this.direction}`,
            `is-${this._size}`,
            this._wrap ? 'is-wrap' : '',
            this.className
        ].filter(Boolean).join(' ');
    }

    get rootStyle(): Record<string, string> {
        return this.itemsGap ? { '--ui-space-gap': String(this.itemsGap) } : {};
    }

    get viewItems(): SpaceViewItem[] {
        return (Array.isArray(this.items) ? this.items : []).map((item, index) => {
            const value = typeof item === 'string' ? { label: item } : (item || { label: '' });
            return {
                key: String((value as SpaceItem).id ?? index),
                index,
                label: String((value as SpaceItem).label ?? ''),
                icon: String((value as SpaceItem).icon ?? ''),
                iconGlyph: String((value as SpaceItem).iconGlyph ?? '')
            };
        });
    }

    pick(entry: SpaceViewItem): void {
        if (!this.action) {
            return;
        }
        this.action(this.items[entry.index], entry.index);
    }

    onItemKeydown(entry: SpaceViewItem, event: any): void {
        if (!this.action) {
            return;
        }
        if (event?.key === 'Enter' || event?.key === ' ' || event?.key === 'Spacebar') {
            event.preventDefault?.();
            this.pick(entry);
        }
    }
}
