import { Directive } from '../decorators/directive';
import { Host } from '@tsdi/ioc';
import { ElementRef } from '../refs/element';
import { isObject } from '@tsdi/ioc';
import { Renderer } from '../renderer/Renderer';
import { Attribute } from '../decorators/atteribute';

/**
 * Style directive metadata.
 *
 * @export
 * @interface StyleDirectiveMetadata
 */
export interface StyleDirectiveMetadata {
    /**
     * style expression.
     *
     * @type {*}
     * @memberof StyleDirectiveMetadata
     */
    style?: any;
}

/**
 * style directive component.
 *
 * @export
 * @class StyleDirective
 */
@Directive({
    selector: '[style]'
})
export class StyleDirective {
    /** Inline declarations last written by this binding, used to skip no-op DOM writes. */
    private applied: Record<string, string> = {};
    private appliedText?: string;
    private initialized = false;

    constructor(
        private elementRef: ElementRef, 
        private renderer: Renderer
    ) { }

    @Attribute()
    set style(value: any) {
        if (value !== undefined) {
            this.updateStyle(value);
        }
    }

    private updateStyle(value: any) {
        const el = this.elementRef.nativeElement;        
        // Handle object style bindings by diffing against the values this
        // binding wrote last time. Re-applying every declaration mutates the
        // style attribute on each parent render and forces style recalculation.
        if (isObject(value)) {
            const next: Record<string, string> = {};
            Object.keys(value).forEach(key => {
                const styleValue = (value as any)[key];
                if (styleValue !== undefined && styleValue !== null) {
                    next[this.camelToKebab(key)] = String(styleValue);
                }
            });
            if (!this.initialized || this.appliedText !== undefined) {
                // First application replaces static inline styles, matching the
                // previous clear-then-set contract.
                this.renderer.removeAttribute(el, 'style');
                this.applied = {};
                this.appliedText = undefined;
                this.initialized = true;
            }
            Object.keys(this.applied).forEach(key => {
                if (!(key in next)) {
                    this.renderer.removeStyle(el, key);
                    delete this.applied[key];
                }
            });
            Object.keys(next).forEach(key => {
                if (this.applied[key] !== next[key]) {
                    this.renderer.setStyle(el, key, next[key]);
                    this.applied[key] = next[key];
                }
            });
        }
        // Handle string style bindings.
        else if (typeof value === 'string') {
            if (!this.initialized) {
                this.renderer.removeAttribute(el, 'style');
                this.initialized = true;
            }
            Object.keys(this.applied).forEach(key => this.renderer.removeStyle(el, key));
            this.applied = {};
            if (this.appliedText !== value) {
                this.renderer.setAttribute(el, 'style', value);
                this.appliedText = value;
            }
        }
        // Handle empty values.
        else if (value === null || value === undefined) {
            this.clearStyles();
        }
    }

    private clearStyles() {
        const el = this.elementRef.nativeElement;
        Object.keys(this.applied).forEach(key => this.renderer.removeStyle(el, key));
        this.applied = {};
        this.appliedText = undefined;
        this.renderer.removeAttribute(el, 'style');
    }

    private camelToKebab(camelCase: string): string {
        return camelCase.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
    }
}
