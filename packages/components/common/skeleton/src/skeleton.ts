import { Attribute, Component } from '@tsdi/components';

interface SkeletonLine {
    key: string;
    text: string;
}

/**
 * Static loading placeholder. Renders text blocks (`░`) so terminal hosts show
 * a useful skeleton; DOM hosts can style `.ui-skeleton-line` into blocks.
 */
@Component({
    selector: 'ui-skeleton',
    template: `
    <div class="ui-skeleton {{skeletonClass}}" role="status" aria-busy="true" aria-label="{{label}}">
        <span class="ui-skeleton-line" v-for="line in viewLines" trackBy="key">{{line.text}}</span>
    </div>`
})
export class SkeletonComponent {
    @Attribute() label = 'Loading';
    @Attribute() className = '';
    @Attribute() lines = 3;
    @Attribute() width = 24;
    @Attribute() lineWidths?: number[];

    get skeletonClass(): string {
        return this.className;
    }

    get viewLines(): SkeletonLine[] {
        const count = Math.max(1, Math.min(50, Math.floor(Number(this.lines) || 3)));
        const defaultWidth = Math.max(4, Math.min(120, Math.floor(Number(this.width) || 24)));
        const widths = Array.isArray(this.lineWidths) ? this.lineWidths : undefined;
        return Array.from({ length: count }, (_value, index) => {
            const width = Math.max(4, Math.min(120, Math.floor(Number(widths?.[index]) || defaultWidth)));
            return {
                key: String(index),
                text: '░'.repeat(width)
            };
        });
    }
}
