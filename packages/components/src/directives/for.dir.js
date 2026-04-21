"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VForDirective = void 0;
const tslib_1 = require("tslib");
const directive_1 = require("../decorators/directive");
const template_1 = require("../refs/template");
const container_1 = require("../refs/container");
const atteribute_1 = require("../decorators/atteribute");
const directive_2 = require("../refs/directive");
const effect_1 = require("../effect");
const reactive_1 = require("../reactive");
/**
 * v-for directive component with enhanced iterator support and elegant variable naming.
 * Combines best practices from Angular and Vue.
 *
 * @export
 * @class VForDirective
 */
let VForDirective = class VForDirective {
    constructor(viewContainer, templateRef) {
        this.viewContainer = viewContainer;
        this._viewRefs = [];
        this._collection = null;
        this._prevCollection = null;
        this._itemNames = []; // 保存循环变量名
        this._context = null; // 模板上下文
        this._trackByFn = (item, index) => index; // 跟踪函数
        this._templateRef = templateRef;
        this._effect = viewContainer.injector.get(effect_1.ReactiveEffect);
    }
    set itemNames(names) {
        this._itemNames = names;
    }
    // 设置模板引用（从编译器传递）
    set template(templateRef) {
        this._templateRef = templateRef;
    }
    // 增强的for属性，支持多种语法格式
    set for(value) {
        // console.log('[VForDirective] for setter called, value:', value);
        // 直接传入可迭代对象
        this._collection = value;
        this.updateView();
    }
    // 设置模板上下文
    set context(ctx) {
        this._context = ctx;
        this.updateView();
    }
    // 设置trackBy函数
    set trackBy(trackByExpr) {
        if (trackByExpr) {
            this._trackByFn = this.createTrackByFunction(trackByExpr);
        }
    }
    // 检查是否为可迭代对象
    isIterable(obj) {
        return obj != null && typeof obj[Symbol.iterator] === 'function';
    }
    // 创建trackBy函数
    createTrackByFunction(expr) {
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
                if (value == null)
                    return undefined;
                value = value[prop];
            }
            return value !== undefined ? value : index;
        };
    }
    updateView() {
        // console.log('[VForDirective] updateView called, collection:', this._collection?.length);
        const collection = this._collection;
        // 检查集合是否真的发生了变化
        // console.log('[VForDirective] collectionEquals:', this.collectionEquals(collection, this._prevCollection), 'prev:', this._prevCollection?.length);
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
        }
        else if (collection instanceof Map) {
            this.updateMapView(collection);
        }
        else if (collection instanceof Set) {
            this.updateSetView(collection);
        }
        else if (this.isIterable(collection)) {
            this.updateIterableView(collection);
        }
        else if (collection !== null && typeof collection === 'object') {
            this.updateObjectView(collection);
        }
        else {
            console.warn('VForDirective: Unsupported collection type', typeof collection);
            this.clear();
        }
    }
    // 处理可迭代对象（包括Generator、自定义迭代器等）
    updateIterableView(collection) {
        const items = Array.from(collection);
        const contexts = items.map((item, index) => {
            const context = this.createContext(item, index);
            return context;
        });
        this.updateViewsWithTrackBy(contexts);
    }
    // 处理数组类型
    updateArrayView(collection) {
        const contexts = collection.map((item, index) => {
            const context = this.createContext(item, index);
            return context;
        });
        this.updateViewsWithTrackBy(contexts);
    }
    // 处理Map类型
    updateMapView(collection) {
        const entries = Array.from(collection.entries());
        const contexts = entries.map(([key, value], index) => {
            const context = this.createContext(value, index, key);
            return context;
        });
        this.updateViewsWithTrackBy(contexts);
    }
    // 处理Set类型
    updateSetView(collection) {
        const items = Array.from(collection);
        const contexts = items.map((item, index) => {
            const context = this.createContext(item, index);
            return context;
        });
        this.updateViewsWithTrackBy(contexts);
    }
    // 处理普通对象类型
    updateObjectView(collection) {
        const entries = Object.entries(collection);
        const contexts = entries.map(([key, value], index) => {
            const context = this.createContext(value, index, key);
            return context;
        });
        this.updateViewsWithTrackBy(contexts);
    }
    // 创建统一的上下文对象
    createContext(item, index, key) {
        const context = {
            $implicit: item, // Angular风格：隐式变量
            $item: item, // Vue风格：当前项
            $index: index, // 当前索引
            $first: index === 0, // 是否为第一项
            $last: false, // 将在后续设置
            $even: index % 2 === 0, // 是否为偶数项
            $odd: index % 2 === 1, // 是否为奇数项
            $key: key, // Map/Object的键
            $count: 0 // 总数量（将在后续设置）
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
    setUserDefinedVariables(context, item, index, key) {
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
    updateViewsWithTrackBy(contexts) {
        const newViewRefs = [];
        const oldViewRefs = new Map(this._viewRefs.map((ref, index) => [this._trackByFn(ref.context, index), ref]));
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
                existingView.context = (0, reactive_1.reactive)(context, this._effect);
                newViewRefs.push(existingView);
                oldViewRefs.delete(trackByKey);
            }
            else {
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
    collectionEquals(a, b) {
        if (a === b)
            return true;
        if (a === null || b === null)
            return false;
        if (typeof a !== typeof b)
            return false;
        if (Array.isArray(a) && Array.isArray(b)) {
            if (a.length !== b.length)
                return false;
            for (let i = 0; i < a.length; i++) {
                if (a[i] !== b[i])
                    return false;
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
            if (aKeys.length !== bKeys.length)
                return false;
            for (const key of aKeys) {
                if (a[key] !== b[key])
                    return false;
            }
            return true;
        }
        return false;
    }
    createView(context) {
        // console.log('[VForDirective] createView called, templateRef:', !!this._templateRef);
        if (!this._templateRef) {
            // console.warn('VForDirective: templateRef is not set');
            return null;
        }
        // 创建响应式上下文
        const reactiveContext = (0, reactive_1.reactive)(context, this._effect);
        const viewRef = this.viewContainer.createEmbeddedView(this._templateRef, reactiveContext);
        // console.log('[VForDirective] createView created view');
        return viewRef;
    }
    clear() {
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
};
exports.VForDirective = VForDirective;
tslib_1.__decorate([
    (0, atteribute_1.Attribute)(),
    tslib_1.__metadata("design:type", template_1.TemplateRef),
    tslib_1.__metadata("design:paramtypes", [template_1.TemplateRef])
], VForDirective.prototype, "template", null);
tslib_1.__decorate([
    (0, atteribute_1.Attribute)(),
    tslib_1.__metadata("design:type", Object),
    tslib_1.__metadata("design:paramtypes", [Object])
], VForDirective.prototype, "for", null);
tslib_1.__decorate([
    (0, atteribute_1.Attribute)(),
    tslib_1.__metadata("design:type", Object),
    tslib_1.__metadata("design:paramtypes", [Object])
], VForDirective.prototype, "context", null);
tslib_1.__decorate([
    (0, atteribute_1.Attribute)(),
    tslib_1.__metadata("design:type", String),
    tslib_1.__metadata("design:paramtypes", [String])
], VForDirective.prototype, "trackBy", null);
exports.VForDirective = VForDirective = tslib_1.__decorate([
    (0, directive_1.Directive)({
        selector: '[v-for],[*for]',
        dirType: directive_2.DirectiveType.Iterable,
        priority: 20
    }),
    tslib_1.__metadata("design:paramtypes", [container_1.ViewContainerRef,
        template_1.TemplateRef])
], VForDirective);
//# sourceMappingURL=for.dir.js.map