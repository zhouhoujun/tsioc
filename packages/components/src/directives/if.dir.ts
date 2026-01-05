import { Directive } from '../decorators/directive';
import { TemplateRef } from '../refs/template';
import { ViewContainerRef } from '../refs/container';
import { Attribute } from '../decorators/atteribute';
import { NodeType } from '../renderer/Node';
import { DirectiveType } from '../refs/directive';

/**
 * 条件指令基类
 * 
 * @class BaseIfDirective
 */
abstract class BaseIfDirective {
    protected _hasView = false;
    protected _siblingDirectives: BaseIfDirective[] = [];
    protected _templateRef: TemplateRef<any>; // 模板引用

    constructor(
        protected viewContainer: ViewContainerRef,
        templateRef: TemplateRef<any>,
    ) { 
        this._templateRef = templateRef;
    }

    // 设置模板引用（从编译器传递）
    set templateRef(templateRef: TemplateRef<any>) {
        this._templateRef = templateRef;
    }

    protected createView() {
        if (!this._templateRef) {
            console.warn('BaseIfDirective: templateRef is not set');
            return;
        }
        this.viewContainer.createEmbeddedView(this._templateRef);
        this._hasView = true;
        // 当当前指令显示时，隐藏所有兄弟指令
        this._siblingDirectives.forEach(dir => dir.clearView());
    }

    protected clearView() {
        this.viewContainer.clear();
        this._hasView = false;
    }

    protected registerSibling(directive: BaseIfDirective) {
        this._siblingDirectives.push(directive);
    }

    // 添加初始化方法，确保指令在创建后能正确渲染
    onInit() {
        // 初始化时检查是否需要创建视图
        if (this.shouldCreateViewOnInit()) {
            this.createView();
        }
    }

    // 子类需要实现此方法来确定初始化时是否创建视图
    protected abstract shouldCreateViewOnInit(): boolean;

    onDestroy() {
        this.clearView();
    }
}

/**
 * v-if directive component.
 *
 * @export
 * @class VIfDirective
 */
@Directive({
    selector: '[v-if],[*if]',
    dirType: DirectiveType.Conditional,
    priority: 10
})
export class VIfDirective extends BaseIfDirective {
    private _condition = false;

    @Attribute()
    set if(condition: boolean) {
        this._condition = condition;
        if (condition && !this._hasView) {
            this.createView();
        } else if (!condition && this._hasView) {
            this.clearView();
        }
    }

    protected shouldCreateViewOnInit(): boolean {
        return this._condition;
    }
}

/**
 * v-else-if directive component.
 *
 * @export
 * @class VElseIfDirective
 */
@Directive({
    selector: '[v-else-if],[*else-if]',
    requires:['[v-if],[*if]'],
    dirType: DirectiveType.Conditional,
    priority: 10
})
export class VElseIfDirective extends BaseIfDirective {
    private _condition = false;

    @Attribute()
    set elseIf(condition: boolean) {
        this._condition = condition;
        if (condition && !this._hasView) {
            this.createView();
        } else if (!condition && this._hasView) {
            this.clearView();
        }
    }

    protected shouldCreateViewOnInit(): boolean {
        return this._condition;
    }
}

/**
 * v-else directive component.
 *
 * @export
 * @class VElseDirective
 */
@Directive({
    selector: '[v-else],[*else]',
    requires:['[v-if],[*if]'],
    dirType: DirectiveType.Conditional,
    priority: 10
})
export class VElseDirective extends BaseIfDirective {
    private _show = true;

    @Attribute()
    set else(show: boolean) {
        this._show = show;
        // v-else不需要条件表达式，总是尝试显示
        // 但需要确保前面的所有条件都不满足
        if (show && !this._hasView) {
            this.createView();
        } else if (!show && this._hasView) {
            this.clearView();
        }
    }

    protected shouldCreateViewOnInit(): boolean {
        return this._show;
    }
}