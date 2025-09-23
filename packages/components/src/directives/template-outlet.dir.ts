import { Directive } from '../decorators/directive';
import { TemplateRef } from '../refs/template';
import { ViewContainerRef } from '../refs/container';
import { EmbeddedViewRef } from '../refs/view';
import { Attribute } from '../decorators/atteribute';

/**
 * TemplateOutlet directive metadata interface.
 */
export interface TemplateOutletContext {
    $implicit?: any;
    [key: string]: any;
}

/**
 * v-template-outlet directive component.
 * Used to dynamically render a template in a view container.
 *
 * @export
 * @class TemplateOutletDirective
 */
@Directive({
    selector: '[v-templateOutlet],[*templateOutlet]'
})
export class TemplateOutletDirective {
    private _viewRef: EmbeddedViewRef<any> | null = null;
    private _templateRef: TemplateRef<any> | null = null;
    private _context: any = null;

    constructor(
        private viewContainer: ViewContainerRef
    ) { }

    /**
     * Set the template reference to render.
     * @param templateRef The template reference to render.
     */
    @Attribute()
    set templateOutlet(templateRef: TemplateRef<any> | null) {
        this._templateRef = templateRef;
        this.updateView();
    }

    /**
     * Set the context object for the template.
     * @param context The context object for the template.
     */
    @Attribute()
    set templateOutletContext(context: TemplateOutletContext | null) {
        this._context = context;
        this.updateView();
    }

    /**
     * Update the view based on current template reference and context.
     */
    private updateView() {
        // Clear existing view if any
        if (this._viewRef) {
            this.viewContainer.clear();
            this._viewRef = null;
        }

        // Create new view if template reference is provided
        if (this._templateRef) {
            this._viewRef = this.viewContainer.createEmbeddedView(
                this._templateRef,
                this._context || {}
            );
        }
    }

    ngOnDestroy() {
        // Clean up view when directive is destroyed
        if (this._viewRef) {
            this.viewContainer.clear();
            this._viewRef = null;
        }
    }
}