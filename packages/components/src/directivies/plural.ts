import { Localization, getPluralCategory } from '../i18n/tokens';
import { Attribute, Directive, Host, Input } from '../metadata/decor';
import { ViewContainerRef } from '../refs/container';
import { TemplateRef } from '../refs/template';
import { SwitchView } from './switch';

/**
 * @ngModule CommonModule
 *
 * @usageNotes
 * ```
 * <some-element [plural]="value">
 *   <v-template pluralCase="=0">there is nothing</v-template>
 *   <v-template pluralCase="=1">there is one</v-template>
 *   <v-template pluralCase="few">there are a few</v-template>
 * </some-element>
 * ```
 *
 * @description
 *
 * Adds / removes DOM sub-trees based on a numeric value. Tailored for pluralization.
 *
 * Displays DOM sub-trees that match the switch expression value, or failing that, DOM sub-trees
 * that match the switch expression's pluralization category.
 *
 * To use this directive you must provide a container element that sets the `[plural]` attribute
 * to a switch expression. Inner elements with a `[pluralCase]` will display based on their
 * expression:
 * - if `[pluralCase]` is set to a value starting with `=`, it will only display if the value
 *   matches the switch expression exactly,
 * - otherwise, the view will be treated as a "category match", and will only display if exact
 *   value matches aren't found and the value maps to its category for the defined locale.
 *
 * See http://cldr.unicode.org/index/cldr-spec/plural-rules
 *
 * @publicApi
 */
@Directive({ selector: '[plural]' })
export class Plural {
  private _switchValue!: number;
  private _activeView!: SwitchView;
  private _caseViews: { [k: string]: SwitchView } = {};

  constructor(private _localization: Localization) { }

  @Input()
  set ngPlural(value: number) {
    this._switchValue = value;
    this._updateView();
  }

  addCase(value: string, switchView: SwitchView): void {
    this._caseViews[value] = switchView;
  }

  private _updateView(): void {
    this._clearViews();

    const cases = Object.keys(this._caseViews);
    const key = getPluralCategory(this._switchValue, cases, this._localization);
    this._activateView(this._caseViews[key]);
  }

  private _clearViews() {
    if (this._activeView) this._activeView.destroy();
  }

  private _activateView(view: SwitchView) {
    if (view) {
      this._activeView = view;
      this._activeView.create();
    }
  }
}

/**
 * @ngModule CommonModule
 *
 * @description
 *
 * Creates a view that will be added/removed from the parent {@link Plural} when the
 * given expression matches the plural expression according to CLDR rules.
 *
 * @usageNotes
 * ```
 * <some-element [plural]="value">
 *   <v-template pluralCase="=0">...</v-template>
 *   <v-template pluralCase="other">...</v-template>
 * </some-element>
 *```
 *
 * See {@link Plural} for more details and example.
 *
 * @publicApi
 */
@Directive({ selector: '[pluralCase]' })
export class PluralCase {
  constructor(
    @Attribute('pluralCase') public value: string, template: TemplateRef<Object>,
    viewContainer: ViewContainerRef, @Host() plural: Plural) {
    const isANumber: boolean = !isNaN(Number(value));
    plural.addCase(isANumber ? `=${value}` : value, new SwitchView(viewContainer, template));
  }
}
