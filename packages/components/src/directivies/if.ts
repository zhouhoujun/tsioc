import { Directive, Input } from '../metadata/decor';
import { stringify } from '../util/stringify';
import { ViewContainerRef } from '../refs/container';
import { TemplateRef } from '../refs/template';
import { EmbeddedViewRef } from '../refs/view';


/**
 * A structural directive that conditionally includes a template based on the value of
 * an expression coerced to Boolean.
 * When the expression evaluates to true, Angular renders the template
 * provided in a `then` clause, and when  false or null,
 * Angular renders the template provided in an optional `else` clause. The default
 * template for the `else` clause is blank.
 *
 * A [shorthand form](guide/structural-directives#asterisk) of the directive,
 * `*if="condition"`, is generally used, provided
 * as an attribute of the anchor element for the inserted template.
 * Angular expands this into a more explicit version, in which the anchor element
 * is contained in an `<v-template>` element.
 *
 * Simple form with shorthand syntax:
 *
 * ```
 * <div *if="condition">Content to render when condition is true.</div>
 * ```
 *
 * Simple form with expanded syntax:
 *
 * ```
 * <v-template [if]="condition"><div>Content to render when condition is
 * true.</div></v-template>
 * ```
 *
 * Form with an "else" block:
 *
 * ```
 * <div *if="condition; else elseBlock">Content to render when condition is true.</div>
 * <v-template #elseBlock>Content to render when condition is false.</v-template>
 * ```
 *
 * Shorthand form with "then" and "else" blocks:
 *
 * ```
 * <div *if="condition; then thenBlock else elseBlock"></div>
 * <v-template #thenBlock>Content to render when condition is true.</v-template>
 * <v-template #elseBlock>Content to render when condition is false.</v-template>
 * ```
 *
 * Form with storing the value locally:
 *
 * ```
 * <div *if="condition as value; else elseBlock">{{value}}</div>
 * <v-template #elseBlock>Content to render when value is null.</v-template>
 * ```
 *
 * @usageNotes
 *
 * The `*if` directive is most commonly used to conditionally show an inline template,
 * as seen in the following  example.
 * The default `else` template is blank.
 *
 * ### Showing an alternative template using `else`
 *
 * To display a template when `expression` evaluates to false, use an `else` template
 * binding as shown in the following example.
 * The `else` binding points to an `<v-template>`  element labeled `#elseBlock`.
 * The template can be defined anywhere in the component view, but is typically placed right after
 * `if` for readability.
 *
 * ### Using an external `then` template
 *
 * In the previous example, the then-clause template is specified inline, as the content of the
 * tag that contains the `if` directive. You can also specify a template that is defined
 * externally, by referencing a labeled `<v-template>` element. When you do this, you can
 * change which template to use at runtime, as shown in the following example.
 *
 * ### Storing a conditional result in a variable
 *
 * You might want to show a set of properties from the same object. If you are waiting
 * for asynchronous data, the object can be undefined.
 * In this case, you can use `if` and store the result of the condition in a local
 * variable as shown in the following example.
 *
 * This code uses only one `AsyncPipe`, so only one subscription is created.
 * The conditional statement stores the result of `userStream|async` in the local variable `user`.
 * You can then bind the local `user` repeatedly.
 *
 * The conditional displays the data only if `userStream` returns a value,
 * so you don't need to use the
 * safe-navigation-operator (`?.`)
 * to guard against null values when accessing properties.
 * You can display an alternative template while waiting for the data.
 *
 * ### Shorthand syntax
 *
 * The shorthand syntax `*if` expands into two separate template specifications
 * for the "then" and "else" clauses. For example, consider the following shorthand statement,
 * that is meant to show a loading page while waiting for data to be loaded.
 *
 * ```
 * <div class="hero-list" *if="heroes else loading">
 *  ...
 * </div>
 *
 * <v-template #loading>
 *  <div>Loading...</div>
 * </v-template>
 * ```
 *
 * You can see that the "else" clause references the `<v-template>`
 * with the `#loading` label, and the template for the "then" clause
 * is provided as the content of the anchor element.
 *
 * However, when Angular expands the shorthand syntax, it creates
 * another `<v-template>` tag, with `if` and `ngIfElse` directives.
 * The anchor element containing the template for the "then" clause becomes
 * the content of this unlabeled `<v-template>` tag.
 *
 * ```
 * <v-template [if]="heroes" [ifElse]="loading">
 *  <div class="hero-list">
 *   ...
 *  </div>
 * </v-template>
 *
 * <v-template #loading>
 *  <div>Loading...</div>
 * </v-template>
 * ```
 *
 * @publicApi
 */
@Directive('[if]')
export class IfDirective<T> {
    private _context: DirIfContext<T> = new DirIfContext<T>();
    private _thenTemplateRef: TemplateRef<DirIfContext<T>> | null = null;
    private _elseTemplateRef: TemplateRef<DirIfContext<T>> | null = null;
    private _thenViewRef: EmbeddedViewRef<DirIfContext<T>> | null = null;
    private _elseViewRef: EmbeddedViewRef<DirIfContext<T>> | null = null;

    constructor(private _viewContainer: ViewContainerRef, templateRef: TemplateRef<DirIfContext<T>>) {
        this._thenTemplateRef = templateRef;
    }

    /**
     * The Boolean expression to evaluate as the condition for showing a template.
     */
    @Input()
    set if(condition: T) {
        this._context.$implicit = this._context.dirIf = condition;
        this._updateView();
    }

    /**
     * A template to show if the condition expression evaluates to true.
     */
    @Input()
    set ifThen(templateRef: TemplateRef<DirIfContext<T>> | null) {
        assertTemplate('ifThen', templateRef);
        this._thenTemplateRef = templateRef;
        this._thenViewRef = null;  // clear previous view if any.
        this._updateView();
    }

    /**
     * A template to show if the condition expression evaluates to false.
     */
    @Input()
    set ifElse(templateRef: TemplateRef<DirIfContext<T>> | null) {
        assertTemplate('ifElse', templateRef);
        this._elseTemplateRef = templateRef;
        this._elseViewRef = null;  // clear previous view if any.
        this._updateView();
    }

    private _updateView() {
        if (this._context.$implicit) {
            if (!this._thenViewRef) {
                this._viewContainer.clear();
                this._elseViewRef = null;
                if (this._thenTemplateRef) {
                    this._thenViewRef =
                        this._viewContainer.createEmbeddedView(this._thenTemplateRef, this._context);
                }
            }
        } else {
            if (!this._elseViewRef) {
                this._viewContainer.clear();
                this._thenViewRef = null;
                if (this._elseTemplateRef) {
                    this._elseViewRef =
                        this._viewContainer.createEmbeddedView(this._elseTemplateRef, this._context);
                }
            }
        }
    }
}

/**
 * if context
 */
export class DirIfContext<T> {
    public $implicit: T = null;
    public dirIf: T = null;
}

function assertTemplate(property: string, templateRef: TemplateRef<any> | null): void {
    const isTemplateRefOrNull = !!(!templateRef || templateRef.createEmbeddedView);
    if (!isTemplateRefOrNull) {
        throw new Error(`${property} must be a TemplateRef, but received '${stringify(templateRef)}'.`);
    }
}
