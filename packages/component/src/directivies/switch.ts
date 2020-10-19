import { Directive, Host, Input } from '../decorators';
import { DoCheck } from '../lifecycle';
import { ViewContainerRef } from '../refs/container';
import { TemplateRef } from '../refs/template';


export class SwitchView {
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
 * @ngModule CommonModule
 *
 * @description
 * The `[switch]` directive on a container specifies an expression to match against.
 * The expressions to match are provided by `switchCase` directives on views within the container.
 * - Every view that matches is rendered.
 * - If there are no matches, a view with the `switchDefault` directive is rendered.
 * - Elements within the `[DirSwitch]` statement but outside of any `DirSwitchCase`
 * or `switchDefault` directive are preserved at the location.
 *
 * @usageNotes
 * Define a container element for the directive, and specify the switch expression
 * to match against as an attribute:
 *
 * ```
 * <container-element [switch]="switch_expression">
 * ```
 *
 * Within the container, `*switchCase` statements specify the match expressions
 * as attributes. Include `*switchDefault` as the final case.
 *
 * ```
 * <container-element [switch]="switch_expression">
 *    <some-element *switchCase="match_expression_1">...</some-element>
 * ...
 *    <some-element *switchDefault>...</some-element>
 * </container-element>
 * ```
 *
 * ### Usage Examples
 *
 * The following example shows how to use more than one case to display the same view:
 *
 * ```
 * <container-element [switch]="switch_expression">
 *   <!-- the same view can be shown in more than one case -->
 *   <some-element *switchCase="match_expression_1">...</some-element>
 *   <some-element *switchCase="match_expression_2">...</some-element>
 *   <some-other-element *switchCase="match_expression_3">...</some-other-element>
 *   <!--default case when there are no matches -->
 *   <some-element *switchDefault>...</some-element>
 * </container-element>
 * ```
 *
 * The following example shows how cases can be nested:
 * ```
 * <container-element [switch]="switch_expression">
 *       <some-element *switchCase="match_expression_1">...</some-element>
 *       <some-element *switchCase="match_expression_2">...</some-element>
 *       <some-other-element *switchCase="match_expression_3">...</some-other-element>
 *       <ng-container *switchCase="match_expression_3">
 *         <!-- use a ng-container to group multiple root nodes -->
 *         <inner-element></inner-element>
 *         <inner-other-element></inner-other-element>
 *       </ng-container>
 *       <some-element *switchDefault>...</some-element>
 *     </container-element>
 * ```
 *
 * @publicApi
 * @see `DirSwitchCase`
 * @see `DirSwitchDefault`
 * @see [Structural Directives](guide/structural-directives)
 *
 */
@Directive({ selector: '[switch]' })
export class DirSwitch {
  // TODO(issue/24571): remove '!'.
  private _defaultViews!: SwitchView[];
  private _defaultUsed = false;
  private _caseCount = 0;
  private _lastCaseCheckIndex = 0;
  private _lastCasesMatched = false;
  private _ngSwitch: any;

  @Input()
  set switch(newValue: any) {
    this._ngSwitch = newValue;
    if (this._caseCount === 0) {
      this._updateDefaultCases(true);
    }
  }

  /** @internal */
  _addCase(): number {
    return this._caseCount++;
  }

  /** @internal */
  _addDefault(view: SwitchView) {
    if (!this._defaultViews) {
      this._defaultViews = [];
    }
    this._defaultViews.push(view);
  }

  /** @internal */
  _matchCase(value: any): boolean {
    const matched = value === this._ngSwitch;
    this._lastCasesMatched = this._lastCasesMatched || matched;
    this._lastCaseCheckIndex++;
    if (this._lastCaseCheckIndex === this._caseCount) {
      this._updateDefaultCases(!this._lastCasesMatched);
      this._lastCaseCheckIndex = 0;
      this._lastCasesMatched = false;
    }
    return matched;
  }

  private _updateDefaultCases(useDefault: boolean) {
    if (this._defaultViews && useDefault !== this._defaultUsed) {
      this._defaultUsed = useDefault;
      for (let i = 0; i < this._defaultViews.length; i++) {
        const defaultView = this._defaultViews[i];
        defaultView.enforceState(useDefault);
      }
    }
  }
}

/**
 * @ngModule CommonModule
 *
 * @description
 * Provides a switch case expression to match against an enclosing `switch` expression.
 * When the expressions match, the given `DirSwitchCase` template is rendered.
 * If multiple match expressions match the switch expression value, all of them are displayed.
 *
 * @usageNotes
 *
 * Within a switch container, `*switchCase` statements specify the match expressions
 * as attributes. Include `*switchDefault` as the final case.
 *
 * ```
 * <container-element [switch]="switch_expression">
 *   <some-element *switchCase="match_expression_1">...</some-element>
 *   ...
 *   <some-element *switchDefault>...</some-element>
 * </container-element>
 * ```
 *
 * Each switch-case statement contains an in-line HTML template or template reference
 * that defines the subtree to be selected if the value of the match expression
 * matches the value of the switch expression.
 *
 * Unlike JavaScript, which uses strict equality, Angular uses loose equality.
 * This means that the empty string, `""` matches 0.
 *
 * @publicApi
 * @see `DirSwitch`
 * @see `DirSwitchDefault`
 *
 */
@Directive({ selector: '[switchCase]' })
export class DirSwitchCase implements DoCheck {
  private _view: SwitchView;
  /**
   * Stores the HTML template to be selected on match.
   */
  @Input() switchCase: any;

  constructor(
    viewContainer: ViewContainerRef, templateRef: TemplateRef<Object>,
    @Host() private dswitch: DirSwitch) {
    dswitch._addCase();
    this._view = new SwitchView(viewContainer, templateRef);
  }

  /**
   * Performs case matching. For internal use only.
   */
  onDoCheck() {
    this._view.enforceState(this.dswitch._matchCase(this.switchCase));
  }
}

/**
 * @ngModule CommonModule
 *
 * @description
 *
 * Creates a view that is rendered when no `DirSwitchCase` expressions
 * match the `DirSwitch` expression.
 * This statement should be the final case in an `DirSwitch`.
 *
 * @publicApi
 * @see `DirSwitch`
 * @see `DirSwitchCase`
 *
 */
@Directive({ selector: '[switchDefault]' })
export class DirSwitchDefault {
  constructor(
    viewContainer: ViewContainerRef, templateRef: TemplateRef<Object>,
    @Host() dswitch: DirSwitch) {
    dswitch._addDefault(new SwitchView(viewContainer, templateRef));
  }
}
