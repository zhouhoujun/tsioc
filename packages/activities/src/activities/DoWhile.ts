import { assertTemplate, Component, EmbeddedViewRef, Input, TemplateRef, ViewContainerRef } from '@tsdi/components';



/**
 * do while control activity.
 *
 * @export
 * @class DoWhileActivity
 * @extends {ContentActivity}
 */
@Component('dowhile,[dowhile]')
export class DoWhileActivity<T> {

    private _context: DirDowhileContext<T> = new DirDowhileContext<T>();
    private _thenTemplateRef: TemplateRef<DirDowhileContext<T>> | null = null;
    private _thenViewRef: EmbeddedViewRef<DirDowhileContext<T>> | null = null;
    constructor(private _viewContainer: ViewContainerRef, templateRef: TemplateRef<DirDowhileContext<T>>) {
        this._thenTemplateRef = templateRef;
    }

    @Input()
    set dowhile(condition: T) {
        this._context.$implicit = this._context.dirDowhile = condition;
        this._updateView();
    }

    /**
     * A template to show if the condition expression evaluates to true.
     */
    @Input()
    set dowhileThen(templateRef: TemplateRef<DirDowhileContext<T>> | null) {
        assertTemplate('dowhileConent', templateRef);
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
 * Do while context
 */
 export class DirDowhileContext<T> {
    public $implicit: T = null!;
    public dirDowhile: T = null!;
}
