import { Directive } from '../decorators/directive';
import { TemplateRef } from '../refs/template';
import { ViewContainerRef } from '../refs/container';
import { Attribute } from '../decorators/atteribute';
import { DirectiveType } from '../refs/directive';
import { ReactiveEffect } from '../ReactiveEffect';
import { reactive } from '../impl/reactive';

/**
 * VFor directive metadata.
 *
 * @export
 * @interface VForDirectiveMetadata
 */
export interface VForDirectiveMetadata {
    /**
     * v-for expression.
     *
     * @type {*}
     * @memberof VForDirectiveMetadata
     */
    for?: any;
    /**
     * v-for of.
     *
     * @type {*}
     * @memberof VForDirectiveMetadata
     */
    of?: any;
}

/**
 * v-for directive component.
 *
 * @export
 * @class VForDirective
 */
@Directive({
    selector: '[v-for],[*for]',
    dirType: DirectiveType.List,
    priority: 20
})
export class VForDirective {
    private _viewRefs: any[] = [];
    private _prevCollection: any = null;
    private _itemNames: string[] = []; // 保存循环变量名
    private _collectionExpr = ''; // 保存集合表达式
    private _templateRef: TemplateRef<any>; // 模板引用
    private _effect: ReactiveEffect; // 响应式副作用
    private _context: any = null; // 模板上下文

    constructor(
        private viewContainer: ViewContainerRef,
        templateRef: TemplateRef<any>,
    ) { 
        this._templateRef = templateRef;
        this._effect = viewContainer.environment.get(ReactiveEffect);
    }

    // 设置模板引用（从编译器传递）
    @Attribute()
    set template(templateRef: TemplateRef<any>) {
        this._templateRef = templateRef;
    }

    @Attribute()
    set for(expr: string) {
        if (expr) {
            this.processForExpression(expr);
        }
    }

    @Attribute()
    set of(collection: any) {
        // 设置集合数据，但不立即更新视图
        this._prevCollection = collection;
        // 延迟更新，避免频繁重渲染
        this.scheduleUpdate();
    }

    // 设置模板上下文
    @Attribute()
    set context(ctx: any) {
        this._context = ctx;
        this.scheduleUpdate();
    }

    private processForExpression(expr: string) {
        // 解析v-for表达式，支持"item in items"和"(item, index) in items"格式
        const inMatch = expr.match(/^\s*((?:\([^)]+\)|[^)])+)\s+(?:in|of)\s+([^]+)$/);
        if (inMatch) {
            const [, itemPart, collectionPart] = inMatch;
            this._collectionExpr = collectionPart.trim();

            // 解析循环变量名
            if (itemPart.trim().startsWith('(')) {
                // 处理格式如 (item, index) 的情况
                const innerMatch = itemPart.trim().match(/^\(\s*([^,]+)\s*(?:,\s*([^)]+))?\s*\)$/);
                if (innerMatch) {
                    this._itemNames = [innerMatch[1].trim(), innerMatch[2]?.trim() || ''].filter(Boolean);
                }
            } else {
                // 处理格式如 item 的情况
                this._itemNames = [itemPart.trim()];
            }

        }
    }

    // 延迟更新，避免频繁重渲染
    private scheduleUpdate() {
        if (this._updateTimeout) {
            clearTimeout(this._updateTimeout);
        }
        this._updateTimeout = setTimeout(() => {
            this.updateView();
        }, 0);
    }

    private _updateTimeout: any = null;

    private updateView() {
        const collection = this._prevCollection;
        
        // 检查集合是否真的发生了变化
        if (this.collectionEquals(collection, this._prevCollection)) {
            return;
        }

        this._prevCollection = collection;
        this.clear();

        if (!collection) {
            return;
        }

        // 处理数组
        if (Array.isArray(collection)) {
            for (let i = 0; i < collection.length; i++) {
                // 创建上下文对象，确保item和index等变量正确设置
                const context: any = {
                    $implicit: collection[i],
                    index: i,
                    first: i === 0,
                    last: i === collection.length - 1,
                    even: i % 2 === 0,
                    odd: i % 2 === 1
                };

                // 设置用户定义的循环变量名
                if (this._itemNames.length > 0) {
                    context[this._itemNames[0]] = collection[i];
                }
                if (this._itemNames.length > 1) {
                    context[this._itemNames[1]] = i;
                }

                // 合并外部上下文
                if (this._context) {
                    Object.assign(context, this._context);
                }

                this.createView(context);
            }
        }
        // 处理对象
        else if (collection !== null && typeof collection === 'object') {
            let index = 0;
            const keys = Object.keys(collection);
            const len = keys.length;

            for (const key of keys) {
                // 创建上下文对象，确保key、value等变量正确设置
                const context: any = {
                    $implicit: collection[key],
                    key: key,
                    index: index,
                    first: index === 0,
                    last: index === len - 1,
                    even: index % 2 === 0,
                    odd: index % 2 === 1
                };

                // 设置用户定义的循环变量名
                if (this._itemNames.length > 0) {
                    context[this._itemNames[0]] = collection[key];
                }
                if (this._itemNames.length > 1) {
                    context[this._itemNames[1]] = key;
                }
                if (this._itemNames.length > 2) {
                    context[this._itemNames[2]] = index;
                }

                // 合并外部上下文
                if (this._context) {
                    Object.assign(context, this._context);
                }

                this.createView(context);
                index++;
            }
        }
    }

    // 深度比较两个集合是否相等
    private collectionEquals(a: any, b: any): boolean {
        if (a === b) return true;
        if (a === null || b === null) return false;
        if (typeof a !== typeof b) return false;

        if (Array.isArray(a) && Array.isArray(b)) {
            if (a.length !== b.length) return false;
            for (let i = 0; i < a.length; i++) {
                if (a[i] !== b[i]) return false;
            }
            return true;
        }

        if (typeof a === 'object' && typeof b === 'object') {
            const aKeys = Object.keys(a);
            const bKeys = Object.keys(b);
            if (aKeys.length !== bKeys.length) return false;
            
            for (const key of aKeys) {
                if (a[key] !== b[key]) return false;
            }
            return true;
        }

        return false;
    }

    private createView(context: any) {
        if (!this._templateRef) {
            console.warn('VForDirective: templateRef is not set');
            return;
        }
        
        // 创建响应式上下文
        const reactiveContext = reactive(context, this._effect);
        
        const viewRef = this.viewContainer.createEmbeddedView(this._templateRef, reactiveContext);
        this._viewRefs.push(viewRef);
    }

    private clear() {
        this.viewContainer.clear();
        this._viewRefs.forEach(view => {
            if (view && typeof view.destroy === 'function') {
                view.destroy();
            }
        });
        this._viewRefs = [];
    }

    // 添加初始化方法，确保指令在创建后能正确渲染
    onInit() {
        // 延迟初始化，确保所有属性都已设置
        setTimeout(() => {
            this.updateView();
        }, 0);
    }

    onDestroy() {
        if (this._updateTimeout) {
            clearTimeout(this._updateTimeout);
        }
        this.clear();
    }

    // 响应式更新方法
    onChanges() {
        this.scheduleUpdate();
    }
}