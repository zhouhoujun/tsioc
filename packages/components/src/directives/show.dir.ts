import { Directive } from '../decorators/directive';
import { ElementRef } from '../refs/element';
import { Renderer } from '../renderer/Renderer';
import { DirectiveType } from '../refs/directive';
import { Attribute } from '../decorators/atteribute';

/**
 * v-show directive.
 * Controls element visibility using CSS display property.
 *
 * @export
 * @class VShowDirective
 */
@Directive({
    selector: '[v-show]',
    dirType: DirectiveType.Normal,
    priority: 5
})
export class VShowDirective {
    private _hidden = false;
    private _displayValue = '';

    constructor(
        private elementRef: ElementRef,
        private renderer: Renderer
    ) { }

    @Attribute()
    set vShow(value: any) {
        const visible = !!value;
        this.updateVisibility(visible);
    }

    private updateVisibility(visible: boolean) {
        const el = this.elementRef.nativeElement;
        
        if (!visible) {
            if (!this._displayValue) {
                const style = el.getAttribute('style');
                if (style) {
                    const displayMatch = style.match(/display\s*:\s*([^;]+)/);
                    if (displayMatch) {
                        this._displayValue = displayMatch[1].trim();
                    }
                }
            }
            this.renderer.setStyle(el, 'display', 'none');
            this._hidden = true;
        } else {
            this.renderer.setStyle(el, 'display', this._displayValue || '');
            this._hidden = false;
        }
    }

    get isHidden(): boolean {
        return this._hidden;
    }
}
