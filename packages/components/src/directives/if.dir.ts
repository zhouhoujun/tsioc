import { Host } from '@tsdi/ioc';
import { Directive } from '../decorators/directive';
import { TemplateRef } from '../refs/template';
import { ViewContainerRef } from '../refs/container';
import { ElementRef } from '../refs/element';

/**
 * v-if directive component.
 *
 * @export
 * @class VIfDirective
 */
@Directive({
    selector: '[v-if],[*if]'
})
export class VIfDirective {
    private _hasView = false;

    constructor(
        @Host() private viewContainer: ViewContainerRef,
        @Host() private templateRef: TemplateRef<any>,
        @Host() private elementRef: ElementRef
    ) { }

    set if(condition: boolean) {
        if (condition && !this._hasView) {
            this.createView();
        } else if (!condition && this._hasView) {
            this.clearView();
        }
    }

    private createView() {
        this.viewContainer.createEmbeddedView(this.templateRef);
        this._hasView = true;
    }

    private clearView() {
        this.viewContainer.clear();
        this._hasView = false;
    }

    ngOnDestroy() {
        this.clearView();
    }
}
