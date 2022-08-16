import { assertTemplate, Component, EmbeddedViewRef, Input, TemplateRef, ViewContainerRef } from '@tsdi/components';


/**
 * delay control activity.
 *
 * @export
 * @class DelayActivity
 * @extends {ControlActivity}
 */
@Component('delay,[delay]')
export class DelayActivity<T> {

    private _context: DirDelayContext<T> = new DirDelayContext<T>();
    private _thenTemplateRef: TemplateRef<DirDelayContext<T>> | null = null;
    private _thenViewRef: EmbeddedViewRef<DirDelayContext<T>> | null = null;
    constructor(private _viewContainer: ViewContainerRef, templateRef: TemplateRef<DirDelayContext<T>>) {
        this._thenTemplateRef = templateRef;
    }

    @Input()
    set delay(condition: T) {
        this._context.$implicit = this._context.dirDelay = condition;
        this._updateView();
    }

    /**
     * A template to show if the condition expression evaluates to true.
     */
    @Input()
    set delayThen(templateRef: TemplateRef<DirDelayContext<T>> | null) {
        assertTemplate('delayConent', templateRef);
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
 * if context
 */
export class DirDelayContext<T> {
    public $implicit: T = null!;
    public dirDelay: T = null!;
}


