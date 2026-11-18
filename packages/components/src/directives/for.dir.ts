import { Directive } from '../decorators/directive';
import { TemplateRef } from '../refs/template';
import { ViewContainerRef } from '../refs/container';
import { Attribute } from '../decorators/atteribute';
import { DirectiveType } from '../refs/directive';
import { ReactiveEffect, noReact } from '../effect';
import { reactive, unwrapReactive } from '../reactive';
import { ViewRef } from '../refs/view';

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
    [noReact] = true;

    private _viewRefs: ViewRef<any>[] = [];
    private _collection: any = null;
    private _prevCollection: any = null;
    private _itemNames: string[] = []; // 保存循环变量名
    private _templateRef: TemplateRef<any>; // 模板引用
    private _effect: ReactiveEffect; // 响应式副作用
    private _context: any = null; // 模板上下文
    private _trackByFn: (item: any, index: number) => any = (item, index) => index; // 跟踪函数
    private _useIndexTrackBy = true; // 默认按 index 跟踪，可走追加/截断快路径
    // 所有行共享一份 count/$last 依赖，追加时只更新这一次，避免 O(n) 写入。
    private _meta?: any;

    private get meta(): any {
        if (!this._meta) {
            this._meta = reactive({ count: 0 }, this._effect);
        }
        return this._meta;
    }

    constructor(
        private viewContainer: ViewContainerRef,
        templateRef: TemplateRef<any>,
    ) {
        this._templateRef = templateRef;
        this._effect = viewContainer.injector.get(ReactiveEffect);
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
            this._useIndexTrackBy = trackByExpr.trim() === '$index';
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
        // A page/view can be destroyed while a parent state array still notifies
        // a binding captured by the old view. The template injector is destroyed
        // with that view; stop before creating a row with it. The live view's
        // own binding continues in the same trigger pass.
        if (this.isStale()) {
            return;
        }
        const collection = this._collection;

        // 检查集合是否真的发生了变化
        if (this.collectionEquals(collection, this._prevCollection)) {
            return;
        }

        const previous = this._prevCollection;
        this._prevCollection = collection;

        if (!collection) {
            this.clear();
            return;
        }

        // 根据集合类型进行不同的处理
        if (Array.isArray(collection)) {
            this.updateArrayView(collection, previous);
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
    private updateArrayView(collection: any[], previous: any) {
        // 默认 trackBy(index) 时，纯追加/截断/中间连续插入删除只改动受影响范围；
        // 流式消息列表每来一条都会替换数组引用，全量重建会造成 O(n²)。
        if (this._useIndexTrackBy && Array.isArray(previous) && this.updateArrayRange(previous, collection)) {
            return;
        }

        // Same length but different content (reorder / scattered edits):
        // views map to positions by index already, so update their contexts in
        // place instead of allocating new contexts and re-binding views.
        if (this._useIndexTrackBy && Array.isArray(previous)) {
            const previousRaw = unwrapReactive<any[]>(previous);
            const collectionRaw = unwrapReactive<any[]>(collection);
            if (previousRaw.length === collectionRaw.length && this._viewRefs.length === collectionRaw.length) {
                for (let i = 0; i < collectionRaw.length; i++) {
                    this.updateContextItem(this._viewRefs[i]?.context, collection[i], i);
                }
                this.meta.count = collectionRaw.length;
                return;
            }
        }

        const contexts = collection.map((item, index) => {
            const context = this.createContext(item, index);
            return context;
        });

        this.updateViewsWithTrackBy(contexts);
    }

    /**
     * Replace the item/position of an existing row context without recreating
     * the context object or its reactive proxy.
     */
    private updateContextItem(context: any, item: any, index: number, key?: any): void {
        if (!context) {
            return;
        }
        if (context.$implicit !== item) {
            context.$implicit = item;
        }
        if (context.$item !== item) {
            context.$item = item;
        }
        if (context.$key !== key) {
            context.$key = key;
        }
        this.setUserDefinedVariables(context, item, index, key);
        this.updateContextIndex(context, index);
    }

    /**
     * Incremental path for a contiguous insertion or removal (the common
     * append/remove-tail case included). Reorders and scattered edits fall back
     * to the keyed update.
     */
    private updateArrayRange(previous: any[], collection: any[]): boolean {
        // Walk the raw arrays: indexing a reactive proxy array here costs a
        // full get-trap per element, which made append O(n) at ~1us/item.
        const previousRaw = unwrapReactive<any[]>(previous);
        const collectionRaw = unwrapReactive<any[]>(collection);
        const shared = Math.min(previousRaw.length, collectionRaw.length);

        let prefix = 0;
        while (prefix < shared && this.sameArrayItem(previousRaw[prefix], collectionRaw[prefix])) {
            prefix += 1;
        }

        const offset = collectionRaw.length - previousRaw.length;
        if (offset === 0) {
            return prefix === shared;
        }

        // The suffix must line up after the inserted/removed block.
        const suffixStart = offset > 0 ? prefix : prefix - offset;
        for (let i = suffixStart; i < previousRaw.length; i++) {
            if (!this.sameArrayItem(previousRaw[i], collectionRaw[i + offset])) {
                return false;
            }
        }

        if (offset > 0) {
            const inserted: ViewRef[] = [];
            for (let i = 0; i < offset; i++) {
                const position = prefix + i;
                const context = this.createContext(collection[position], position);
                const view = this.createView(context, position);
                if (view) {
                    inserted.push(view);
                }
            }
            if (inserted.length) {
                this._viewRefs.splice(prefix, 0, ...inserted);
            }
            // Existing rows after the insertion point shift their index.
            for (let i = prefix + offset; i < this._viewRefs.length; i++) {
                this.updateContextIndex(this._viewRefs[i]?.context, i);
            }
        } else {
            const removed = -offset;
            for (let i = 0; i < removed; i++) {
                this.viewContainer.remove(prefix);
            }
            this._viewRefs.splice(prefix, removed);
            for (let i = prefix; i < this._viewRefs.length; i++) {
                this.updateContextIndex(this._viewRefs[i]?.context, i);
            }
        }

        // One write for the shared count; $last derives from it on read.
        this.meta.count = collectionRaw.length;
        return true;
    }

    private sameArrayItem(left: any, right: any): boolean {
        if (left === right) {
            return true;
        }
        return unwrapReactive(left) === unwrapReactive(right);
    }

    /**
     * Update the index-derived fields of a row context that moved because rows
     * before it were inserted or removed.
     */
    private updateContextIndex(context: any, index: number): void {
        if (!context) {
            return;
        }
        if (context.$index !== index) {
            context.$index = index;
        }
        const first = index === 0;
        if (context.$first !== first) {
            context.$first = first;
        }
        const even = index % 2 === 0;
        if (context.$even !== even) {
            context.$even = even;
        }
        const odd = !even;
        if (context.$odd !== odd) {
            context.$odd = odd;
        }
        if (this._itemNames.length > 1) {
            context[this._itemNames[1]] = index;
        }
        if (this._itemNames.length > 2) {
            context[this._itemNames[2]] = index;
        }
        if (!this._itemNames.includes('index')) {
            context.index = index;
        }
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
            $even: index % 2 === 0, // 是否为偶数项
            $odd: index % 2 === 1,  // 是否为奇数项
            $key: key               // Map/Object的键
        };

        // $count/$last 是共享 meta 的派生值：追加/删除时只写一次 count，
        // 不再对每一行做 O(n) 赋值。
        const meta = this.meta;
        Object.defineProperties(context, {
            $meta: { value: meta, enumerable: false, writable: false, configurable: true },
            $count: {
                get() { return this.$meta.count; },
                enumerable: false,
                configurable: true
            },
            $last: {
                get() { return this.$index === this.$meta.count - 1; },
                enumerable: false,
                configurable: true
            }
        });

        // 设置用户定义的循环变量名
        this.setUserDefinedVariables(context, item, index, key);

        // 合并外部上下文
        if (this._context) {
            // Keep the caller context on the prototype chain instead of copying
            // its properties. Copying shadows reactive component state, so an
            // event handler writing `this.count` would update the loop scope
            // instead of the component.
            Object.setPrototypeOf(context, this._context);
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
    private isStale(): boolean {
        if (this.viewContainer.injector.destroyed) {
            return true;
        }
        const templateInjector = (this._templateRef as any)?.options?.injector as { destroyed?: boolean } | undefined;
        return templateInjector?.destroyed === true;
    }

    private updateViewsWithTrackBy(contexts: any[]) {
        if (this.isStale()) {
            return;
        }
        const newViewRefs: any[] = [];
        const oldViewRefs = new Map(this._viewRefs.map((ref, index) => [this._trackByFn(ref.context, index), ref]));

        // $count/$last derive from this single shared value.
        this.meta.count = contexts.length;

        for (let i = 0; i < contexts.length; i++) {
            const context = contexts[i];
            const trackByKey = this._trackByFn(context.$implicit, i);

            // 检查是否重用现有视图
            const existingView = oldViewRefs.get(trackByKey);
            if (existingView) {
                // Keep the original reactive context so existing bindings stay subscribed.
                Object.keys(existingView.context || {}).forEach(key => {
                    if (!(key in context)) {
                        delete existingView.context[key];
                    }
                });
                Object.assign(existingView.context, context);
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
            if (!oldView) {
                continue;
            }
            const index = this.viewContainer.indexOf(oldView);
            if (index >= 0) {
                this.viewContainer.remove(index);
            } else if (typeof oldView.destroy === 'function') {
                oldView.destroy();
            }
        }

        this._viewRefs = newViewRefs;

        // Reorder the container when a custom trackBy reuses views by identity.
        // Default index tracking already updates positionally.
        if (!this._useIndexTrackBy) {
            for (let i = 0; i < newViewRefs.length; i++) {
                const view = newViewRefs[i];
                if (!view || this.viewContainer.indexOf(view) === i) {
                    continue;
                }
                this.viewContainer.move(view, i);
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

    private createView(context: any, index?: number) {
        if (!this._templateRef) {
            // console.warn('VForDirective: templateRef is not set');
            return null;
        }

        // Let the embedded view create its reactive context with the same effect
        // instance used by its bindings so reused views can refresh correctly.
        const viewRef = this.viewContainer.createEmbeddedView(this._templateRef, context, {
            effect: this._effect,
            index
        });
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
        if (this._meta) {
            this._meta.count = 0;
        }
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
