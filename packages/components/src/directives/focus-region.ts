import { Directive } from '../decorators/directive';
import { ElementRef } from '../refs/element';
import { DirectiveType } from '../refs/directive';
import { RElement, RNode } from '../renderer/Node';
import { FocusRegionManager } from '../focus';

@Directive({ selector: '[focus-region]', dirType: DirectiveType.Normal })
export class FocusRegionDirective {
    private unregister?: () => void;
    private regionId = '';
    private readonly focus = () => { if (this.regionId) this.manager.focus(this.regionId); };
    private readonly blur = () => { if (this.regionId) this.manager.blur(this.regionId); };

    constructor(private elementRef: ElementRef<RElement>, private manager: FocusRegionManager) {}

    onInit(): void {
        const node = this.elementRef.nativeElement;
        this.regionId = String(node.getAttribute('focus-region') || '').trim();
        if (!this.regionId) return;
        this.unregister = this.manager.register({
            id: this.regionId,
            contains: target => this.contains(node, target as RNode | undefined)
        });
        node.addEventListener('focus', this.focus as EventListener);
        node.addEventListener('blur', this.blur as EventListener);
        node.addEventListener('click', this.focus as EventListener);
    }

    onDestroy(): void {
        const node = this.elementRef.nativeElement;
        node.removeEventListener('focus', this.focus as EventListener);
        node.removeEventListener('blur', this.blur as EventListener);
        node.removeEventListener('click', this.focus as EventListener);
        this.unregister?.();
    }

    private contains(root: RNode, target?: RNode): boolean {
        for (let current = target; current; current = current.parentNode || undefined) {
            if (current === root) return true;
        }
        return false;
    }
}
