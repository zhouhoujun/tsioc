import { Attribute, Directive, ElementRef, Renderer } from '@tsdi/components';

/**
 * Installs a CSS-variable declaration string on the host element. This is the
 * renderer-neutral bridge between a theme model and class-based component
 * styles; components themselves never bind per-element style objects.
 */
@Directive({ selector: '[cssVariables]' })
export class CssVariablesDirective {
    @Attribute()
    set cssVariables(value: string) {
        const element = this.elementRef?.nativeElement;
        if (!element) return;
        const text = String(value || '').trim();
        if (text) {
            this.renderer.setAttribute(element, 'style', text);
        } else {
            this.renderer.removeAttribute(element, 'style');
        }
    }

    constructor(
        private elementRef: ElementRef,
        private renderer: Renderer
    ) { }
}
