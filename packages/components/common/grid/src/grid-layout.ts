import {
    Attribute,
    Component,
    Computed,
    ElementRef
} from '@tsdi/components';
import { Optional } from '@tsdi/ioc';
import { markElementRefRaw } from '../../src/raw-element';

function toPixels(value: number | string | undefined, fallback: number): string {
    if (value === undefined || value === null || value === '') {
        return `${fallback}px`;
    }
    return typeof value === 'number' || /^\d+(\.\d+)?$/.test(String(value))
        ? `${value}px`
        : String(value);
}

function toCount(value: number | string | undefined, fallback = 1): number {
    const count = Number(value);
    return Number.isFinite(count) && count > 0 ? Math.floor(count) : fallback;
}

/**
 * Generic CSS grid layout for common pages and editors.
 *
 * ```html
 * <grid-layout columns="3" gap="16" autoFit>
 *   <grid-item span="2">Wide card</grid-item>
 *   <grid-item>Card</grid-item>
 * </grid-layout>
 * ```
 *
 * `columns` accepts either a count or any CSS `grid-template-columns` value.
 * Projected children are mounted into the grid container in declaration order.
 */
@Component({
    selector: 'grid-layout, ui-grid-layout',
    template: `
    <div class="grid-layout" [class]="layoutClass" [style]="gridStyle">
        <div class="grid-layout-items"><v-content></v-content></div>
    </div>`
})
export class GridLayoutComponent {
    @Attribute() columns: number | string = 1;
    @Attribute() rows?: number | string;
    @Attribute() gap: number | string = 12;
    @Attribute() rowGap?: number | string;
    @Attribute() columnGap?: number | string;
    /** Use `repeat(auto-fit, minmax(minItemWidth, 1fr))` instead of a fixed count. */
    @Attribute() autoFit = false;
    @Attribute() minItemWidth: number | string = 200;
    /** `|`-separated rows or a string[] of `grid-template-areas`. */
    @Attribute() areas?: string | string[];
    @Attribute() flow?: 'row' | 'column' | 'dense' | string;
    @Attribute() alignItems?: string;
    @Attribute() justifyItems?: string;
    /** Fill the parent height (useful inside workspace panes). */
    @Attribute() fill = false;

    constructor(@Optional() protected elementRef?: ElementRef) {
        markElementRefRaw(elementRef);
    }

    @Computed()
    get layoutClass(): Record<string, boolean> {
        return {
            'grid-layout': true,
            'is-fill': this.fill === true || (this.fill as any) === 'true' || (this.fill as any) === ''
        };
    }

    @Computed()
    get gridStyle(): Record<string, string> {
        const columns = this.autoFit === true || (this.autoFit as any) === 'true' || (this.autoFit as any) === ''
            ? `repeat(auto-fit, minmax(${toPixels(this.minItemWidth, 200)}, 1fr))`
            : typeof this.columns === 'string' && !/^\d+$/.test(this.columns.trim())
                ? this.columns
                : `repeat(${toCount(this.columns, 1)}, minmax(0, 1fr))`;
        const gap = toPixels(this.gap, 12);
        const style: Record<string, string> = {
            gridTemplateColumns: columns,
            gap,
            rowGap: toPixels(this.rowGap ?? this.gap, 12),
            columnGap: toPixels(this.columnGap ?? this.gap, 12)
        };
        if (this.rows !== undefined && this.rows !== null && this.rows !== '') {
            style.gridTemplateRows = typeof this.rows === 'string' && !/^\d+$/.test(this.rows)
                ? this.rows
                : `repeat(${toCount(this.rows, 1)}, minmax(0, auto))`;
        }
        if (this.areas) {
            const rows = Array.isArray(this.areas) ? this.areas : String(this.areas).split('|');
            style.gridTemplateAreas = rows
                .map(row => `"${String(row).trim()}"`)
                .join(' ');
        }
        if (this.flow) {
            style.gridAutoFlow = String(this.flow);
        }
        if (this.alignItems) {
            style.alignItems = String(this.alignItems);
        }
        if (this.justifyItems) {
            style.justifyItems = String(this.justifyItems);
        }
        return style;
    }

}

/**
 * Optional grid item wrapper with declarative span/area placement.
 */
@Component({
    selector: 'grid-item, ui-grid-item',
    template: `
    <div class="grid-item" [style]="itemStyle">
        <div class="grid-item-content"><v-content></v-content></div>
    </div>`
})
export class GridItemComponent {
    @Attribute() span?: number | string;
    @Attribute() rowSpan?: number | string;
    @Attribute() start?: number | string;
    @Attribute() end?: number | string;
    @Attribute() rowStart?: number | string;
    @Attribute() rowEnd?: number | string;
    @Attribute() area?: string;

    constructor(@Optional() protected elementRef?: ElementRef) {
        markElementRefRaw(elementRef);
    }

    @Computed()
    get itemStyle(): Record<string, string> {
        const style: Record<string, string> = {};
        if (this.span !== undefined && this.span !== null && this.span !== '') {
            style.gridColumn = this.start
                ? `${this.start} / span ${this.span}`
                : `span ${this.span}`;
        } else if (this.start || this.end) {
            style.gridColumn = `${this.start || 'auto'} / ${this.end || 'auto'}`;
        }
        if (this.rowSpan !== undefined && this.rowSpan !== null && this.rowSpan !== '') {
            style.gridRow = this.rowStart
                ? `${this.rowStart} / span ${this.rowSpan}`
                : `span ${this.rowSpan}`;
        } else if (this.rowStart || this.rowEnd) {
            style.gridRow = `${this.rowStart || 'auto'} / ${this.rowEnd || 'auto'}`;
        }
        if (this.area) {
            style.gridArea = String(this.area);
        }
        return style;
    }

}
