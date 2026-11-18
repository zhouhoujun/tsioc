import { Attribute, Component } from '@tsdi/components';
import { resolveScrollbarThumb } from '../../src/scrollbar';

type ScrollbarOrientation = 'vertical' | 'horizontal';

interface ScrollbarCell {
    key: string;
    char: string;
    className: string;
}

/**
 * Renderer-neutral scrollbar track. Vertical mode emits one cell per line for
 * terminal hosts; horizontal mode emits a single text track (`███░░░`). Both
 * share the same thumb math as the DOM scrollbar.
 */
@Component({
    selector: 'ui-scrollbar',
    template: `
    <div class="ui-scrollbar {{scrollbarClass}}" role="scrollbar"
        aria-orientation="{{orientation}}"
        aria-valuemin="0"
        aria-valuemax="{{valueMax}}"
        aria-valuenow="{{offset}}"
        aria-label="{{ariaLabel}}">
        <div class="ui-scrollbar-rail" v-if="orientation === 'vertical'">
            <label class="{{cell.className}}" v-for="cell in cells" trackBy="key">{{cell.char}}</label>
        </div>
        <div class="ui-scrollbar-track" v-if="orientation === 'horizontal'">
            <span class="{{cell.className}}" v-for="cell in cells" trackBy="key">{{cell.char}}</span>
        </div>
    </div>`
})
export class ScrollbarComponent {
    @Attribute() offset = 0;
    @Attribute() visible = 0;
    @Attribute() total = 0;
    @Attribute() length = 10;
    @Attribute() orientation: ScrollbarOrientation = 'vertical';
    @Attribute() trackChar = '░';
    @Attribute() thumbChar = '█';
    @Attribute() ariaLabel = 'Scrollbar';
    @Attribute() className = '';

    get valueMax(): number {
        return Math.max(0, Math.floor(Number(this.total) || 0) - Math.floor(Number(this.visible) || 0));
    }

    get scrollbarClass(): string {
        return [`is-${this.orientation}`, this.className].filter(Boolean).join(' ');
    }

    get cells(): ScrollbarCell[] {
        const thumb = resolveScrollbarThumb(
            Number(this.offset),
            Number(this.visible),
            Number(this.total),
            Number(this.length)
        );
        const count = Math.max(1, Math.floor(Number(this.length) || 1));
        return Array.from({ length: count }, (_value, index) => {
            const active = index >= thumb.start && index < thumb.start + thumb.size;
            return {
                key: String(index),
                char: active ? this.thumbChar : this.trackChar,
                className: active ? 'ui-scrollbar-thumb' : 'ui-scrollbar-track-cell'
            };
        });
    }
}
