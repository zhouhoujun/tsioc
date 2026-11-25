import { Attribute, Component, ElementRef } from '@tsdi/components';
import { Optional } from '@tsdi/ioc';
import { markElementRefRaw } from '../../src/raw-element';
import { normalizeBoolean, normalizeSize, normalizeTone, UiSize, UiTone } from '../../src/ui';
import { installDescriptionsStyles } from './descriptions.styles';

export interface DescriptionItem {
    key?: string;
    label: string;
    value: string;
    hint?: string;
    /** Browser grid span; terminal hosts keep one row per item. */
    span?: number;
    tone?: UiTone;
}

export interface DescriptionGroup {
    title?: string;
    extra?: string;
    items: DescriptionItem[];
}

interface DescriptionEntry {
    kind: 'header' | 'separator' | 'item';
    key: string;
    text: string;
    label: string;
    value: string;
    hint: string;
    tone: UiTone;
    vertical: boolean;
    style?: Record<string, string>;
}

/**
 * Read-only key/value detail list (Ant Design Descriptions / MUI DescriptionList).
 *
 * Supports a flat `items` list or titled `groups`, `horizontal`/`vertical`
 * layouts, tones and grid spans. Both renderers paint the same headers, labels
 * and values in the same order; `columns` is a browser grid concern and the
 * terminal keeps one item per line.
 */
@Component({
    selector: 'ui-descriptions',
    template: `
    <div class="ui-descriptions {{descriptionsClass}}" role="list"
        aria-label="{{ariaLabel}}" [style]="rootStyle">
        <div class="ui-descriptions-entry" role="presentation" v-for="entry in entries" trackBy="key">
            <div class="ui-descriptions-header" role="presentation" v-if="entry.kind === 'header'">{{entry.text}}</div>
            <div class="ui-descriptions-separator" role="separator" aria-hidden="true" v-else-if="entry.kind === 'separator'">{{entry.text}}</div>
            <span class="ui-descriptions-item" role="listitem"
                data-tone="{{entry.tone}}" [style]="entry.style"
                v-else-if="!entry.vertical">
                <span class="ui-descriptions-label">{{entry.label}}</span><span class="ui-descriptions-sep" aria-hidden="true">: </span><span class="ui-descriptions-value">{{entry.value}}</span>
                <span class="ui-descriptions-hint" v-if="entry.hint">{{entry.hint}}</span>
            </span>
            <div class="ui-descriptions-item is-vertical" role="listitem"
                data-tone="{{entry.tone}}" [style]="entry.style" v-else>
                <span class="ui-descriptions-label">{{entry.label}}</span>
                <span class="ui-descriptions-value">{{entry.value}}</span>
                <span class="ui-descriptions-hint" v-if="entry.hint">{{entry.hint}}</span>
            </div>
        </div>
        <div class="ui-descriptions-empty" v-if="emptyLabel && !hasItems">{{emptyLabel}}</div>
    </div>`
})
export class DescriptionsComponent {
    constructor(@Optional() protected elementRef?: ElementRef) {
        markElementRefRaw(elementRef);
    }

    onInit(): void {
        installDescriptionsStyles((this.elementRef?.nativeElement as { ownerDocument?: Document } | undefined)?.ownerDocument);
    }

    @Attribute() items: DescriptionItem[] = [];
    @Attribute() groups: DescriptionGroup[] = [];
    @Attribute() title = '';
    @Attribute() extra = '';
    @Attribute() ariaLabel = 'Details';
    @Attribute() emptyLabel = '';
    @Attribute() className = '';
    @Attribute() separatorChar = '─';
    @Attribute() separatorWidth: number | string = 12;

    private _columns = 1;
    private _layout: 'horizontal' | 'vertical' = 'horizontal';
    private _size: UiSize = 'md';
    private _bordered = false;
    private _dense = false;

    @Attribute()
    get columns(): number { return this._columns; }
    set columns(value: number | string) {
        const next = Math.floor(Number(value));
        this._columns = Number.isFinite(next) ? Math.max(1, Math.min(6, next)) : 1;
    }

    @Attribute()
    get layout(): 'horizontal' | 'vertical' { return this._layout; }
    set layout(value: string) { this._layout = value === 'vertical' ? 'vertical' : 'horizontal'; }

    @Attribute()
    get size(): UiSize { return this._size; }
    set size(value: string) { this._size = normalizeSize(value); }

    @Attribute()
    get bordered(): boolean { return this._bordered; }
    set bordered(value: boolean | string) { this._bordered = normalizeBoolean(value); }

    @Attribute()
    get dense(): boolean { return this._dense; }
    set dense(value: boolean | string) { this._dense = normalizeBoolean(value); }

    get descriptionsClass(): string {
        return [
            `is-${this._size}`,
            this._layout === 'vertical' ? 'is-vertical' : '',
            this._bordered ? 'is-bordered' : '',
            this._dense ? 'is-dense' : '',
            this.className
        ].filter(Boolean).join(' ');
    }

    get rootStyle(): Record<string, string> {
        return { '--ui-descriptions-columns': String(this._columns) };
    }

    get separatorText(): string {
        const char = String(this.separatorChar || '─');
        const width = Math.max(1, Math.min(80, Math.floor(Number(this.separatorWidth) || 12)));
        return char.repeat(width);
    }

    get hasItems(): boolean {
        return this.entries.some(entry => entry.kind === 'item');
    }

    get entries(): DescriptionEntry[] {
        const groups: DescriptionGroup[] = Array.isArray(this.groups) && this.groups.length
            ? this.groups
            : [{ title: this.title, extra: this.extra, items: this.items }];
        const vertical = this._layout === 'vertical';
        const entries: DescriptionEntry[] = [];
        groups.forEach((group, groupIndex) => {
            const header = [group?.title, group?.extra].filter(Boolean).join(' · ');
            if (header) {
                entries.push(this.entry('header', `h-${groupIndex}`, header));
            }
            (Array.isArray(group?.items) ? group.items : []).forEach((item, index) => {
                if (!item) {
                    return;
                }
                const span = Math.floor(Number(item.span));
                entries.push({
                    ...this.entry('item', `i-${groupIndex}-${index}`, ''),
                    label: String(item.label ?? ''),
                    value: String(item.value ?? ''),
                    hint: String(item.hint ?? ''),
                    tone: normalizeTone(item.tone),
                    vertical,
                    style: Number.isFinite(span) && span > 1
                        ? { 'grid-column': `span ${span}` }
                        : undefined
                });
            });
            if (groupIndex < groups.length - 1) {
                entries.push(this.entry('separator', `s-${groupIndex}`, this.separatorText));
            }
        });
        return entries;
    }

    protected entry(kind: DescriptionEntry['kind'], key: string, text: string): DescriptionEntry {
        return {
            kind,
            key,
            text,
            label: '',
            value: '',
            hint: '',
            tone: 'default',
            vertical: false
        };
    }
}
