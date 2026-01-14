import { Abstract } from '@tsdi/ioc';
import { Host, Optional, Self } from '@tsdi/ioc';
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
@Abstract()
abstract class BaseIfDirective {
    protected _hasView = false;
    private _context: any = null; // 模板上下文
    protected _siblingDirectives: BaseIfDirective[] = [];
    protected _templateRef: TemplateRef<any>;
    protected _parentIfDirective: BaseIfDirective | null = null;

    constructor(
        protected viewContainer: ViewContainerRef,
        templateRef: TemplateRef<any>,
        @Optional() @Host() parentIfDirective?: BaseIfDirective
    ) { 
        this._templateRef = templateRef;
        if (parentIfDirective) {
            this._parentIfDirective = parentIfDirective;
            this._parentIfDirective.registerSibling(this);
        }
    }

    // 设置模板上下文
    @Attribute()
    set context(ctx: any) {
        this._context = ctx;
        this.updateView();
    }

    // 设置模板引用（从编译器传递）
    @Attribute()
    set template(templateRef: TemplateRef<any>) {
        this._templateRef = templateRef;
        this.updateView();
    }

    protected createView() {
        if (!this._templateRef) {
            console.warn('BaseIfDirective: templateRef is not set');
            return;
        }
        this.viewContainer.createEmbeddedView(this._templateRef, this._context);
        this._hasView = true;
        // 当当前指令显示时，隐藏所有兄弟指令
        this._siblingDirectives.forEach(dir => dir.clearView());
    }

    protected updateView() {
        if (this._hasView) {
            this.clearView();
            this.createView();
        }
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
        if (this._parentIfDirective) {
            // 从父指令中移除自己
            const index = this._parentIfDirective._siblingDirectives.indexOf(this);
            if (index > -1) {
                this._parentIfDirective._siblingDirectives.splice(index, 1);
            }
        }
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

    constructor(
        viewContainer: ViewContainerRef,
        templateRef: TemplateRef<any>
    ) {
        super(viewContainer, templateRef);
    }

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

    constructor(
        viewContainer: ViewContainerRef,
        templateRef: TemplateRef<any>,
        @Optional() @Host() parentIfDirective?: VIfDirective
    ) {
        super(viewContainer, templateRef, parentIfDirective);
    }

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

    constructor(
        viewContainer: ViewContainerRef,
        templateRef: TemplateRef<any>,
        @Optional() @Host() parentIfDirective?: VIfDirective
    ) {
        super(viewContainer, templateRef, parentIfDirective);
    }

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