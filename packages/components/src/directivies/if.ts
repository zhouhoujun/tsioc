import { Directive, Input } from '../decorators';
import { ViewContainerRef } from '../refs/container';
import { TemplateRef } from '../refs/template';
import { EmbeddedViewRef } from '../refs/view';
import { stringify } from '../util/stringify';

/**
 * directive if.
 */
@Directive('[if]')
export class DirIf<T> {
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
    set ngIf(condition: T) {
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
