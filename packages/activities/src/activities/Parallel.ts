import { assertTemplate, Component, EmbeddedViewRef, Input, TemplateRef, ViewContainerRef } from '@tsdi/components';

/**
 * parallel activity.
 *
 * @export
 * @class ParallelActivity
 * @extends {ControlActivity}
 */
@Component('parallel')
export class ParallelActivity<T> {

    private _context: DirParallelContext<T> = new DirParallelContext<T>();

    private _thenTemplateRef: TemplateRef<DirParallelContext<T>> | null = null;
    private _thenViewRef: EmbeddedViewRef<DirParallelContext<T>> | null = null;

    constructor(private _viewContainer: ViewContainerRef, templateRef: TemplateRef<DirParallelContext<T>>) {
        this._thenTemplateRef = templateRef;
    }

    /**
     * A template to show if the condition expression evaluates to true.
     */
    @Input()
    set content(templateRef: TemplateRef<DirParallelContext<T>> | null) {
        assertTemplate('sequence conent', templateRef);
        this._thenTemplateRef = templateRef;
        this._thenViewRef = null;  // clear previous view if any.
        this._updateView();
    }

    private _updateView() {
        if (!this._thenViewRef) {
            this._viewContainer.clear();
            if (this._thenTemplateRef) {
                this._thenViewRef =
                    this._viewContainer.createEmbeddedView(this._thenTemplateRef, this._context);
            }
        }

    }
}

/**
 *  parallel context
 */
export class DirParallelContext<T> {
    public $implicit: T = null!;
}
