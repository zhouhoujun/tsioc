import { Directive } from '../decorators/directive';
import { TemplateRef } from '../refs/template';
import { ViewContainerRef } from '../refs/container';
import { Attribute } from '../decorators/atteribute';
import { DirectiveType } from '../refs/directive';
import { ReactiveEffect } from '../effect';
import { reactive } from '../reactive';

/**
 * v-for directive component with enhanced iterator support and elegant variable naming.
 * Combines best practices from Angular and Vue.
 *
 * @export
 * @class VForDirective
 */
@Directive({
    selector: '[v-for],[*for]',
    dirType: DirectiveType.Iterable,
    priority: 20
})
export class VForDirective {
    private _viewRefs: any[] = [];
    private _collection: any = null;
    private _prevCollection: any = null;
    private _itemNames: string[] = []; // 保存循环变量名
    private _templateRef: TemplateRef<any>; // 模板引用
    private _effect: ReactiveEffect; // 响应式副作用
    private _context: any = null; // 模板上下文
    private _trackByFn: (item: any, index: number) => any = (item, index) => index; // 跟踪函数

    constructor(
        private viewContainer: ViewContainerRef,
        templateRef: TemplateRef<any>,
    ) {
        this._templateRef = templateRef;
        this._effect = viewContainer.environment.get(ReactiveEffect);
    }

    set itemNames(names: string[]) {
        this._itemNames = names;
    }

    // 设置模板引用（从编译器传递）
    @Attribute()
    set template(templateRef: TemplateRef<any>) {
        this._templateRef = templateRef;
    }

    // 增强的for属性，支持多种语法格式
    @Attribute()
    set for(value: any) {
        // 直接传入可迭代对象
        this._collection = value;
        this.updateView();

    }

    // 设置模板上下文
    @Attribute()
    set context(ctx: any) {
        this._context = ctx;
        this.updateView();
    }

    // 设置trackBy函数
    @Attribute()
    set trackBy(trackByExpr: string) {
        if (trackByExpr) {
            this._trackByFn = this.createTrackByFunction(trackByExpr);
        }
    }

    // 检查是否为可迭代对象
    private isIterable(obj: any): boolean {
        return obj != null && typeof obj[Symbol.iterator] === 'function';
    }

    // 创建trackBy函数
    private createTrackByFunction(expr: string): (item: any, index: number) => any {
        if (expr === '$index') {
            return (item, index) => index;
        }
        if (expr === '$item') {
            return (item) => item;
        }
        // 支持属性路径，如 'item.id'
        return (item, index) => {
            const props = expr.split('.');
            let value = item;
            for (const prop of props) {
                if (value == null) return undefined;
                value = value[prop];
            }
            return value !== undefined ? value : index;
        };
    }

    private updateView() {
        const collection = this._collection;

        // 检查集合是否真的发生了变化
        if (this.collectionEquals(collection, this._prevCollection)) {
            return;
        }

        this._prevCollection = collection;

        if (!collection) {
            this.clear();
            return;
        }

        // 根据集合类型进行不同的处理
        if (Array.isArray(collection)) {
            this.updateArrayView(collection);
        } else if (collection instanceof Map) {
            this.updateMapView(collection);
        } else if (collection instanceof Set) {
            this.updateSetView(collection);
        } else if (this.isIterable(collection)) {
            this.updateIterableView(collection);
        } else if (collection !== null && typeof collection === 'object') {
            this.updateObjectView(collection);
        } else {
            console.warn('VForDirective: Unsupported collection type', typeof collection);
            this.clear();
        }
    }

    // 处理可迭代对象（包括Generator、自定义迭代器等）
    private updateIterableView(collection: Iterable<any>) {
        const items = Array.from(collection);
        const contexts = items.map((item, index) => {
            const context = this.createContext(item, index);
            return context;
        });

        this.updateViewsWithTrackBy(contexts);
    }

    // 处理数组类型
    private updateArrayView(collection: any[]) {
        const contexts = collection.map((item, index) => {
            const context = this.createContext(item, index);
            return context;
        });

        this.updateViewsWithTrackBy(contexts);
    }

    // 处理Map类型
    private updateMapView(collection: Map<any, any>) {
        const entries = Array.from(collection.entries());
        const contexts = entries.map(([key, value], index) => {
            const context = this.createContext(value, index, key);
            return context;
        });

        this.updateViewsWithTrackBy(contexts);
    }

    // 处理Set类型
    private updateSetView(collection: Set<any>) {
        const items = Array.from(collection);
        const contexts = items.map((item, index) => {
            const context = this.createContext(item, index);
            return context;
        });

        this.updateViewsWithTrackBy(contexts);
    }

    // 处理普通对象类型
    private updateObjectView(collection: Record<string, any>) {
        const entries = Object.entries(collection);
        const contexts = entries.map(([key, value], index) => {
            const context = this.createContext(value, index, key);
            return context;
        });

        this.updateViewsWithTrackBy(contexts);
    }


    // 创建统一的上下文对象
    private createContext(item: any, index: number, key?: any): any {
        const context: any = {
            $implicit: item,        // Angular风格：隐式变量
            $item: item,            // Vue风格：当前项
            $index: index,          // 当前索引
            $first: index === 0,    // 是否为第一项
            $last: false,           // 将在后续设置
            $even: index % 2 === 0, // 是否为偶数项
            $odd: index % 2 === 1,  // 是否为奇数项
            $key: key,              // Map/Object的键
            $count: 0               // 总数量（将在后续设置）
        };

        // 设置用户定义的循环变量名
        this.setUserDefinedVariables(context, item, index, key);

        // 合并外部上下文
        if (this._context) {
            Object.assign(context, this._context);
        }

        return context;
    }

    // 设置用户定义的循环变量名（支持多种语法）
    private setUserDefinedVariables(context: any, item: any, index: number, key?: any) {
        // 1. 设置用户定义的变量名
        if (this._itemNames.length > 0) {
            context[this._itemNames[0]] = item;
        }
        if (this._itemNames.length > 1) {
            context[this._itemNames[1]] = key !== undefined ? key : index;
        }
        if (this._itemNames.length > 2) {
            context[this._itemNames[2]] = index;
        }

        // 2. 自动设置常用别名
        if (!this._itemNames.includes('item')) {
            context.item = item;
        }
        if (!this._itemNames.includes('index')) {
            context.index = index;
        }
        if (key !== undefined && !this._itemNames.includes('key')) {
            context.key = key;
        }
    }

    // 通用的视图更新逻辑（支持trackBy）
    private updateViewsWithTrackBy(contexts: any[]) {
        const newViewRefs: any[] = [];
        const oldViewRefs = new Map(this._viewRefs.map(ref => [this._trackByFn(ref.context, ref.index), ref]));

        // 设置$last和$count属性
        const totalCount = contexts.length;
        contexts.forEach((context, index) => {
            context.$last = index === totalCount - 1;
            context.$count = totalCount;
        });

        for (let i = 0; i < contexts.length; i++) {
            const context = contexts[i];
            const trackByKey = this._trackByFn(context.$implicit, i);

            // 检查是否重用现有视图
            const existingView = oldViewRefs.get(trackByKey);
            if (existingView) {
                // 更新现有视图的上下文
                existingView.context = reactive(context, this._effect);
                newViewRefs.push(existingView);
                oldViewRefs.delete(trackByKey);
            } else {
                // 创建新视图
                const viewRef = this.createView(context);
                newViewRefs.push(viewRef);
            }
        }

        // 销毁不再需要的视图
        for (const oldView of oldViewRefs.values()) {
            if (oldView && typeof oldView.destroy === 'function') {
                oldView.destroy();
            }
        }

        this._viewRefs = newViewRefs;
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
            // 检查是否为相同的迭代器
            if (a[Symbol.iterator] && b[Symbol.iterator]) {
                return a === b; // 迭代器对象比较引用
            }

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
            return null;
        }

        // 创建响应式上下文
        const reactiveContext = reactive(context, this._effect);

        const viewRef = this.viewContainer.createEmbeddedView(this._templateRef, reactiveContext);
        return viewRef;
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

    onInit() {
        this.updateView();
    }

    onDestroy() {
        this.clear();
    }

    // 响应式更新方法
    onChanges() {
        this.updateView();
    }
}