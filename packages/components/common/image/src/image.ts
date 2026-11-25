import { Attribute, Component, ElementRef } from '@tsdi/components';
import { Optional } from '@tsdi/ioc';
import { markElementRefRaw } from '../../src/raw-element';
import { installImageStyles } from './image.styles';

/**
 * Image with an accessible caption (Ant Design Image / MUI Image).
 *
 * Browser hosts render the actual `<img>`; terminal hosts render the same alt
 * text as a caption because terminal cells cannot display bitmaps.
 */
@Component({
    selector: 'ui-image',
    template: `
    <figure class="ui-image {{imageClass}}">
        <img class="ui-image-el" src="{{src}}" alt="{{alt}}" width="{{width}}" height="{{height}}"
            [style]="imageStyle" v-if="src" />
        <figcaption class="ui-image-caption">{{caption}}</figcaption>
        <v-content></v-content>
    </figure>`
})
export class ImageComponent {
    constructor(@Optional() protected elementRef?: ElementRef) {
        markElementRefRaw(elementRef);
    }

    onInit(): void {
        installImageStyles((this.elementRef?.nativeElement as { ownerDocument?: Document } | undefined)?.ownerDocument);
    }

    @Attribute() src = '';
    @Attribute() alt = '';
    @Attribute() fallback = '';
    @Attribute() width: number | string = '';
    @Attribute() height: number | string = '';
    @Attribute() fit: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down' = 'cover';
    @Attribute() className = '';

    get imageStyle(): Record<string, string> {
        return { 'object-fit': this.fit };
    }

    get imageClass(): string {
        return [this.className].filter(Boolean).join(' ');
    }

    get caption(): string {
        return String(this.alt || this.fallback || '');
    }
}
