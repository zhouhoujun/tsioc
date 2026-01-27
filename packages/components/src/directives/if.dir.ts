import { Abstract, SkipSelf } from '@tsdi/ioc';
import { Host, Optional } from '@tsdi/ioc';
import { Directive } from '../decorators/directive';
import { TemplateRef } from '../refs/template';
import { ViewContainerRef } from '../refs/container';
import { Attribute } from '../decorators/atteribute';
import { DirectiveType } from '../refs/directive';

/**
 * 条件指令基类
 * 
 * @class BaseIfDirective
 */
@Abstract()
abstract class BaseIfDirective {
    public _hasView = false;
    private _context: any = null; // 模板上下文
    protected _siblingDirectives: BaseIfDirective[] = [];
    protected _templateRef: TemplateRef<any>;
    protected _parentIfDirective: BaseIfDirective | null = null;

    constructor(
        protected viewContainer: ViewContainerRef,
        templateRef: TemplateRef<any>,
        parentIfDirective?: BaseIfDirective
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
        const changed = this._context !== ctx;
        this._context = ctx;
        if (changed) this.updateAllViews();
    }

    // 设置模板引用（从编译器传递）
    @Attribute()
    set template(templateRef: TemplateRef<any>) {
        const changed = this._templateRef !== templateRef;
        this._templateRef = templateRef;
        if (changed) this.updateAllViews();
    }

    // 注册兄弟指令
    protected registerSibling(directive: BaseIfDirective) {
        this._siblingDirectives.push(directive);
    }

    // 更新所有相关视图（当前指令及其兄弟指令）
    protected updateAllViews() {
        // 清除所有兄弟指令的视图
        this._siblingDirectives.forEach(dir => dir.clearView());

        // 清除当前指令的视图
        if (this._hasView) {
            this.clearView();
        }

        // 检查并创建当前指令的视图
        if (this.shouldCreateView()) {
            this.createView();
        } else {
            // 如果当前指令不满足条件，检查所有兄弟指令
            this._siblingDirectives.forEach(dir => {
                if (!dir._hasView && dir.shouldCreateView()) {
                    dir.createView();
                }
            });
        }
    }

    protected createView() {
        if (!this._templateRef) {
            console.warn('BaseIfDirective: templateRef is not set');
            return;
        }
        this.viewContainer.createEmbeddedView(this._templateRef, this._context);
        this._hasView = true;
    }

    protected updateView() {
        // 当条件变化时，更新所有相关视图
        this.updateAllViews();

        // 通知父级指令更新所有视图（处理嵌套情况）
        if (this._parentIfDirective) {
            this._parentIfDirective.updateAllViews();
        }
    }

    protected clearView() {
        this.viewContainer.clear();
        this._hasView = false;
    }

    // 检查是否应该创建视图（子类可以重写）
    protected shouldCreateView(): boolean {
        return false;
    }

    // 子类需要实现此方法来确定初始化时是否创建视图
    protected abstract shouldCreateViewOnInit(): boolean;

    onInit() {
        // 初始化时更新所有视图
        this.updateAllViews();
    }

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
        const changed = this._condition !== condition;
        this._condition = condition;
        if (changed) {
            this.updateView();
        }
    }

    protected shouldCreateView(): boolean {
        return this._condition;
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
    requires: ['[v-if],[*if]'],
    dirType: DirectiveType.Conditional,
    priority: 10
})
export class VElseIfDirective extends BaseIfDirective {
    private _condition?: boolean;

    constructor(
        viewContainer: ViewContainerRef,
        templateRef: TemplateRef<any>,
        @SkipSelf() @Host() parentIfDirective: BaseIfDirective
    ) {
        super(viewContainer, templateRef, parentIfDirective);
    }

    @Attribute()
    set elseIf(condition: boolean) {
        const changed = this._condition !== condition;
        this._condition = condition;
        if (changed) {
            this.updateView();
        }
    }

    protected shouldCreateView(): boolean {
        // v-else-if 只有在前面所有条件都不满足且自己条件为真时才显示
        if (this._condition !== true) {
            return false;
        }

        // 检查父级指令是否满足条件
        if (this._parentIfDirective && this._parentIfDirective._hasView) {
            return false;
        }

        // 检查所有前面的兄弟指令是否满足条件
        return !this._siblingDirectives.some(dir => dir._hasView);
    }

    protected shouldCreateViewOnInit(): boolean {
        return this.shouldCreateView();
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
    requires: ['[v-else-if],[*else-if]', '[v-if],[*if]'],
    dirType: DirectiveType.Conditional,
    priority: 10
})
export class VElseDirective extends BaseIfDirective {
    constructor(
        viewContainer: ViewContainerRef,
        templateRef: TemplateRef<any>,
        @SkipSelf() @Host() parentIfDirective?: BaseIfDirective
    ) {
        super(viewContainer, templateRef, parentIfDirective);
    }

    protected shouldCreateView(): boolean {
        // v-else 只有在前面所有条件都不满足时才显示

        // 检查父级指令是否满足条件
        if (this._parentIfDirective && this._parentIfDirective._hasView) {
            return false;
        }

        // 检查所有前面的兄弟指令是否满足条件
        return !this._siblingDirectives.some(dir => dir._hasView);
    }

    protected shouldCreateViewOnInit(): boolean {
        return this.shouldCreateView();
    }
}