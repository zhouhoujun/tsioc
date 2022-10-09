import { assertTemplate, Component, EmbeddedViewRef, Input, TemplateRef, ViewContainerRef } from '@tsdi/components';

/**
 * sequence activity.
 *
 * @export
 * @class SequenceActivity
 * @extends {ControlActivity}
 */
@Component('sequence')
export class SequenceActivity<T> {

    private _context: DirSequenceContext<T> = new DirSequenceContext<T>();

    private _thenTemplateRef: TemplateRef<DirSequenceContext<T>> | null = null;
    private _thenViewRef: EmbeddedViewRef<DirSequenceContext<T>> | null = null;

    constructor(private _viewContainer: ViewContainerRef, templateRef: TemplateRef<DirSequenceContext<T>>) {
        this._thenTemplateRef = templateRef;
    }

    /**
     * A template to show if the condition expression evaluates to true.
     */
    @Input()
    set content(templateRef: TemplateRef<DirSequenceContext<T>> | null) {
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
 * sequence context
 */
export class DirSequenceContext<T> {
    public $implicit: T = null!;
}
