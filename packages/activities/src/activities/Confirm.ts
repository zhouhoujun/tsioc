import { assertTemplate, Component, EmbeddedViewRef, EventEmitter, Input, Output, TemplateRef, ViewContainerRef } from '@tsdi/components';


/**
 * while control activity.
 *
 * @export
 * @class ConfirmActivity
 * @extends {ControlActivity}
 */
@Component('confirm,[confirm]')
export class ConfirmActivity<T> {

    private _context: DirConfirmContext<T> = new DirConfirmContext<T>();
    private _thenTemplateRef: TemplateRef<DirConfirmContext<T>> | null = null;
    private _thenViewRef: EmbeddedViewRef<DirConfirmContext<T>> | null = null;
    constructor(private _viewContainer: ViewContainerRef, templateRef: TemplateRef<DirConfirmContext<T>>) {
        this._thenTemplateRef = templateRef;
    }

    @Input()
    set confirm(condition: T) {
        this._context.$implicit = this._context.dirConfirm = condition;
        this._updateView();
    }

    /**
     * A template to show if the condition expression evaluates to true.
     */
    @Input()
    set confirmThen(templateRef: TemplateRef<DirConfirmContext<T>> | null) {
        assertTemplate('confirmConent', templateRef);
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
 * confirm context
 */
 export class DirConfirmContext<T> {
    public $implicit: T = null!;
    public dirConfirm: T = null!;
}
