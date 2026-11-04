import { Attribute, Directive, ElementRef, Renderer } from '@tsdi/components';

/**
 * Publishes the active theme as CSS custom properties on the console root.
 * Component styling stays class-based; this directive only installs the
 * variables that those classes consume.
 */
@Directive({ selector: '[agentThemeVars]' })
export class AgentConsoleThemeVarsDirective {
    @Attribute()
    set agentThemeVars(value: string) {
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
