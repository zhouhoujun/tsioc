
import { Directive, DoCheck, Host, Input, TemplateRef, ViewContainerRef } from '@tsdi/components';


/**
 * try catch activity.
 * 
 * ### Usage Examples
 *
 * The following example shows how to use more than one case to display the same view:
 *
 * ```
 * <container-element [tryCatch]="switch_expression">
 *   <!-- the same view can be shown in more than one case -->
 *   <some-element *try>...</some-element>
 *   <some-element *catch="match_expression_1">...</some-element>
 *   <some-element *catch="match_expression_2">...</some-element>
 *   <some-other-element *catch="match_expression_3">...</some-other-element>
 *   <!--default case when there are no matches -->
 * </container-element>
 * ```
 *
 * The following example shows how cases can be nested:
 * ```
 * <container-element [tryCatch]="switch_expression">
 *       <some-element *try>...</some-element>
 *       <some-element *try>...</some-element>
 *       <some-element *catch="match_expression_1">...</some-element>
 *       <some-element *catch="match_expression_2">...</some-element>
 *       <some-other-element *catch="match_expression_3">...</some-other-element>
 *       <ng-container *catch="match_expression_3">
 *         <!-- use a ng-container to group multiple root nodes -->
 *         <inner-element></inner-element>
 *         <inner-other-element></inner-other-element>
 *       </ng-container>
 *     </container-element>
 * ```
 * @export
 * @class TryCatchActivity
 * @extends {ControlActivity}
 */
@Directive('[tryCatch]')
export class TryCatchActivity<T = any> {
    private _defaultViews!: TryView[];
    private _defaultUsed = false;

    private _catchCount = 0;
    private _lastCatchCheckIndex = 0;
    private _lastCatchMatched = false;
    private _tryCatch: any;

    _addTry(view: TryView) {
        if (!this._defaultViews) {
            this._defaultViews = [];
        }
        this._defaultViews.push(view);
    }


    _addCatch() {
        this._catchCount++;
    }

    @Input()
    set tryCatch(newValue: any) {
        this._tryCatch = newValue;
        if (this._catchCount === 0) {
            this._updateTrys(true);
        }
    }


    _matchCatch(value: any): boolean {
        const matched = value === this._tryCatch;
        this._lastCatchMatched = this._lastCatchMatched || matched;
        this._lastCatchCheckIndex++;
        if (this._lastCatchCheckIndex === this._catchCount) {
            this._updateTrys(!this._lastCatchMatched);
            this._lastCatchCheckIndex = 0;
            this._lastCatchMatched = false;
        }
        return matched;
    }

    private _updateTrys(useDefault: boolean) {
        if (this._defaultViews && useDefault !== this._defaultUsed) {
            this._defaultUsed = useDefault;
            for (let i = 0; i < this._defaultViews.length; i++) {
                const defaultView = this._defaultViews[i];
                defaultView.enforceState(useDefault);
            }
        }
    }

}


@Directive({ selector: '[catch]' })
export class CatchActivity implements DoCheck {
    private _view: TryView;
    /**
     * Stores the HTML template to be selected on match.
     */
    @Input() execption: any;

    constructor(
        viewContainer: ViewContainerRef, templateRef: TemplateRef<Object>,
        @Host() private trys: TryCatchActivity) {
        trys._addCatch();
        this._view = new TryView(viewContainer, templateRef);
    }

    /**
     * Performs case matching. For internal use only.
     */
    onDoCheck() {
        this._view.enforceState(this.trys._matchCatch(this.execption));
    }
}

@Directive({ selector: '[try]' })
export class TryActivity {
    constructor(
        viewContainer: ViewContainerRef, templateRef: TemplateRef<Object>,
        @Host() trys: TryCatchActivity) {
        trys._addTry(new TryView(viewContainer, templateRef));
    }
}



/**
 * try view.
 */
export class TryView {
    private _created = false;

    constructor(
        private _viewContainerRef: ViewContainerRef, private _templateRef: TemplateRef<Object>) { }

    create(): void {
        this._created = true;
        this._viewContainerRef.createEmbeddedView(this._templateRef);
    }

    destroy(): void {
        this._created = false;
        this._viewContainerRef.clear();
    }

    enforceState(created: boolean) {
        if (created && !this._created) {
            this.create();
        } else if (!created && this._created) {
            this.destroy();
        }
    }
}

/**
 * try context
 */
export class DirTryContext<T> {
    public $implicit: T = null!;
    public dirCatch: T = null!;
}
