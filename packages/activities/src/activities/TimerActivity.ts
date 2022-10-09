import { assertTemplate, Directive, EmbeddedViewRef, Input, TemplateRef, ViewContainerRef } from '@tsdi/components';



@Directive('[timer]')
export class TimerActivity<T> {

    private _context: DirTimerContext<T> = new DirTimerContext<T>();
    private _thenTemplateRef: TemplateRef<DirTimerContext<T>> | null = null;
    private _thenViewRef: EmbeddedViewRef<DirTimerContext<T>> | null = null;
    constructor(private _viewContainer: ViewContainerRef, templateRef: TemplateRef<DirTimerContext<T>>) {
        this._thenTemplateRef = templateRef;
    }

    @Input()
    set timer(condition: T) {
        this._context.$implicit = this._context.dirTimer = condition;
        this._updateView();
    }

    /**
     * A template to show if the condition expression evaluates to true.
     */
    @Input()
    set timerThen(templateRef: TemplateRef<DirTimerContext<T>> | null) {
        assertTemplate('timerConent', templateRef);
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
 * timer context
 */
 export class DirTimerContext<T> {
    public $implicit: T = null!;
    public dirTimer: T = null!;
}
