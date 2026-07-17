import { Directive } from '../decorators/directive';
import { TemplateRef } from '../refs/template';
import { ViewContainerRef } from '../refs/container';
import { EmbeddedViewRef } from '../refs/view';
import { Attribute } from '../decorators/atteribute';
import { noReact } from '../effect';
import { NodeInjector } from '../refs/injector';

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
    [noReact] = true;

    private _viewRef: EmbeddedViewRef<any> | null = null;
    private _templateRef: TemplateRef<any> | string | null = null;
    private _context: any = null;
    private updateVersion = 0;

    constructor(
        private viewContainer: ViewContainerRef
    ) { }

    /**
     * Set the template reference to render.
     * @param templateRef The template reference to render.
     */
    @Attribute()
    set templateOutlet(templateRef: TemplateRef<any> | string | null) {
        if (this._templateRef === templateRef && this._viewRef) {
            return;
        }
        this._templateRef = templateRef;
    }

    /**
     * Set the context object for the template.
     * @param context The context object for the template.
     */
    @Attribute()
    set templateOutletContext(context: TemplateOutletContext | null) {
        const normalized = this.normalizeContext(context);
        if (this.sameContext(this._context, normalized) && this._viewRef) {
            return;
        }
        this._context = normalized;
        if (!this.updateView()) {
            this.scheduleUpdate();
        }
    }

    private sameContext(left: TemplateOutletContext | null, right: TemplateOutletContext | null): boolean {
        if (left === right) {
            return true;
        }
        if (!left || !right) {
            return false;
        }
        return left.item === right.item
            && left.$implicit === right.$implicit;
    }

    private normalizeContext(context: TemplateOutletContext | null): TemplateOutletContext {
        if (context == null || typeof context !== 'object') {
            return { item: context, $implicit: context };
        }
        if ('item' in context) {
            return context;
        }
        return Object.assign({ item: context, $implicit: context }, context);
    }

    private scheduleUpdate() {
        const version = ++this.updateVersion;
        Promise.resolve().then(() => {
            if (version !== this.updateVersion) {
                return;
            }
            this.updateView();
        });
    }

    /**
     * Update the view based on current template reference and context.
     */
    private updateView(): boolean {
        const templateRef = this.resolveTemplateRef();
        if (!templateRef) {
            return false;
        }

        // Clear existing view if any
        if (this._viewRef) {
            this.viewContainer.clear();
            this._viewRef = null;
        }

        // Create new view if template reference is provided
        if (templateRef) {
            this._viewRef = this.viewContainer.createEmbeddedView(
                templateRef,
                this._context || {}
            );
        }
        return true;
    }

    private resolveTemplateRef(): TemplateRef<any> | null {
        if (this._templateRef && typeof this._templateRef !== 'string') {
            return this._templateRef;
        }
        if (typeof this._templateRef !== 'string') {
            return null;
        }

        const injector = this.viewContainer.injector as NodeInjector;
        const targetName = this._templateRef.trim().toLowerCase();
        const node = injector.getLocalRefNode(targetName);
        if (node) {
            const templateRef = injector.getTemplateRef(node);
            if (templateRef) {
                this._templateRef = templateRef;
                return templateRef;
            }
        }
        return null;
    }

    onDestroy() {
        // Clean up view when directive is destroyed
        this.updateVersion += 1;
        if (this._viewRef) {
            this.viewContainer.clear();
            this._viewRef = null;
        }
    }
}
