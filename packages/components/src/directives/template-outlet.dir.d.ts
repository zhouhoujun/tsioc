import { TemplateRef } from '../refs/template';
import { ViewContainerRef } from '../refs/container';
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
export declare class TemplateOutletDirective {
    private viewContainer;
    private _viewRef;
    private _templateRef;
    private _context;
    constructor(viewContainer: ViewContainerRef);
    /**
     * Set the template reference to render.
     * @param templateRef The template reference to render.
     */
    set templateOutlet(templateRef: TemplateRef<any> | null);
    /**
     * Set the context object for the template.
     * @param context The context object for the template.
     */
    set templateOutletContext(context: TemplateOutletContext | null);
    /**
     * Update the view based on current template reference and context.
     */
    private updateView;
    onDestroy(): void;
}
