import { TContainerNode, TNode, TNodeType } from '../interfaces/node';
import { DECLARATION_LCONTAINER, LView, QUERIES } from '../interfaces/view';
import { ElementRef } from '../refs/element';
import { TemplateRef } from '../refs/template';
import { EmbeddedViewRef } from '../refs/view';
import { createElementRef } from './element';
import { ViewRefImpl } from './view_ref';



// in g3 depends on them being separate.
class TemplateRefImpl<T> extends TemplateRef<T> {
    constructor(
        private _declarationLView: LView, private _declarationTContainer: TContainerNode,
        public override elementRef: ElementRef) {
        super();
    }

    override createEmbeddedView(context: T): EmbeddedViewRef<T> {
        const embeddedTView = this._declarationTContainer.tViews as TView;
        const embeddedLView = createLView(
            this._declarationLView, embeddedTView, context, LViewFlags.CheckAlways, null,
            embeddedTView.declTNode, null, null, null, null);

        const declarationLContainer = this._declarationLView[this._declarationTContainer.index];
        //   ngDevMode && assertLContainer(declarationLContainer);
        embeddedLView[DECLARATION_LCONTAINER] = declarationLContainer;

        const declarationViewLQueries = this._declarationLView[QUERIES];
        if (declarationViewLQueries !== null) {
            embeddedLView[QUERIES] = declarationViewLQueries.createEmbeddedView(embeddedTView);
        }

        renderView(embeddedTView, embeddedLView, context);

        return new ViewRefImpl<T>(embeddedLView);
    }
}

/**
 * Creates a TemplateRef given a node.
 *
 * @returns The TemplateRef instance to use
 */
export function injectTemplateRef<T>(): TemplateRef<T> | null {
    return createTemplateRef<T>(getCurrentTNode()!, getLView());
}



/**
 * Creates a TemplateRef and stores it on the injector.
 *
 * @param hostTNode The node on which a TemplateRef is requested
 * @param hostLView The `LView` to which the node belongs
 * @returns The TemplateRef instance or null if we can't create a TemplateRef on a given node type
 */
export function createTemplateRef<T>(hostTNode: TNode, hostLView: LView): TemplateRef<T> | null {
    if (hostTNode.type & TNodeType.Container) {
        // ngDevMode && assertDefined(hostTNode.tViews, 'TView must be allocated');
        return new TemplateRefImpl(
            hostLView, hostTNode as TContainerNode, createElementRef(hostTNode, hostLView));
    }
    return null;
}
