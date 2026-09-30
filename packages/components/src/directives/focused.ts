import { Attribute } from '../decorators/atteribute';
import { Directive } from '../decorators/directive';
import { ElementRef } from '../refs/element';
import { DirectiveType } from '../refs/directive';
import { FocusableElement, FocusMonitor } from '../focus';

@Directive({ selector: '[focused]', dirType: DirectiveType.Normal })
export class FocusedDirective {
    private initialized = false;
    private value = false;

    constructor(private elementRef: ElementRef<FocusableElement>, private focusMonitor: FocusMonitor) {}

    @Attribute()
    set focused(value: unknown) {
        this.update(value);
    }

    get focused(): boolean { return this.value; }

    onInit(): void {
        this.initialized = true;
        this.apply();
    }

    private apply(): void {
        const element = this.elementRef.nativeElement;
        if (this.value) {
            if (!element.ownerDocument || element.ownerDocument.activeElement !== element) {
                this.focusMonitor.focusVia(element, 'program');
            }
        } else if (!element.ownerDocument || element.ownerDocument.activeElement === element) {
            element.blur?.();
        }
    }

    private update(value: unknown): void {
        const next = value === true || value === '' || value === 'true';
        if (this.initialized && this.value === next) return;
        this.value = next;
        if (this.initialized) this.apply();
    }
}
