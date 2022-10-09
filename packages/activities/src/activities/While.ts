import { assertTemplate, Component, EmbeddedViewRef, Input, TemplateRef, ViewContainerRef } from '@tsdi/components';



/**
 * while control activity.
 *
 * @export
 * @class WhileActivity
 * @extends {ContentActivity}
 */
@Component('while,[while]')
export class WhileActivity<T> {

    private _context: DirWhileContext<T> = new DirWhileContext<T>();
    private _thenTemplateRef: TemplateRef<DirWhileContext<T>> | null = null;
    private _thenViewRef: EmbeddedViewRef<DirWhileContext<T>> | null = null;
    constructor(private _viewContainer: ViewContainerRef, templateRef: TemplateRef<DirWhileContext<T>>) {
        this._thenTemplateRef = templateRef;
    }

    @Input()
    set while(condition: T) {
        this._context.$implicit = this._context.dirDowhile = condition;
        this._updateView();
    }

    /**
     * A template to show if the condition expression evaluates to true.
     */
    @Input()
    set whileThen(templateRef: TemplateRef<DirWhileContext<T>> | null) {
        assertTemplate('whileConent', templateRef);
        this._thenTemplateRef = templateRef;
        this._thenViewRef = null;  // clear previous view if any.
        this._updateView();
    }

    private _updateView() {
        if (this._context.$implicit) {
            if (!this._thenViewRef) {
                this._viewContainer.clear();
                if (this._thenTemplateRef) {
                    this._thenViewRef =
                        this._viewContainer.createEmbeddedView(this._thenTemplateRef, this._context);
                }
            }
        }
    }

}


/**
 * while context
 */
export class DirWhileContext<T> {
    public $implicit: T = null!;
    public dirDowhile: T = null!;
}
