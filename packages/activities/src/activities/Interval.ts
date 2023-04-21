import { assertTemplate, Component, EmbeddedViewRef, Input, TemplateRef, ViewContainerRef } from '@tsdi/components';

/**
 * while control activity.
 *
 * @export
 * @class IntervalActivity
 * @extends {ControlActivity}
 */
@Component('interval,[interval]')
export class IntervalActivity<T> {

    private _context: DirIntervalContext<T> = new DirIntervalContext<T>();
    private _thenTemplateRef: TemplateRef<DirIntervalContext<T>> | null = null;
    private _thenViewRef: EmbeddedViewRef<DirIntervalContext<T>> | null = null;
    constructor(private _viewContainer: ViewContainerRef, templateRef: TemplateRef<DirIntervalContext<T>>) {
        this._thenTemplateRef = templateRef;
    }

    @Input()
    set interval(condition: T) {
        this._context.$implicit = this._context.dirInterval = condition;
        this._updateView();
    }

    /**
     * A template to show if the condition expression evaluates to true.
     */
    @Input()
    set intervalThen(templateRef: TemplateRef<DirIntervalContext<T>> | null) {
        assertTemplate('intervalConent', templateRef);
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
 * interval context
 */
export class DirIntervalContext<T> {
    public $implicit: T = null!;
    public dirInterval: T = null!;
}
