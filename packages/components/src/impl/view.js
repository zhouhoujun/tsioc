"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmbeddedViewRefImpl = void 0;
exports.createEmbeddedViewRef = createEmbeddedViewRef;
const effect_1 = require("../effect");
/**
 * Embedded view ref implement.
 *
 * @export
 * @class EmbeddedViewRefImpl
 * @extends {ViewRefImpl}
 * @implements {EmbeddedViewRef<C>}
 * @template C
 */
class EmbeddedViewRefImpl {
    /**
     * Creates an instance of EmbeddedViewRefImpl.
     * @param {RNode[]} rootNodes
     * @param {C} context
     * @param {ReactiveEffect} effect
     * @memberof EmbeddedViewRefImpl
     */
    constructor(rootNodes, context, injector, effect) {
        this.rootNodes = rootNodes;
        this.context = context;
        this.injector = injector;
        this[_a] = true;
        this._isDestroyed = false;
        this._destroyCallbacks = [];
        // 添加计算属性缓存
        this.computedCache = new Map();
        this.effect = effect ?? injector.get(effect_1.ReactiveEffect);
        injector.onDestroy(this);
    }
    /**
     * has destoryed or not.
     *
     * @readonly
     * @type {boolean}
     * @memberof EmbeddedViewRefImpl
     */
    get destroyed() {
        return this._isDestroyed;
    }
    /**
     * destroy this.
     *
     * @memberof EmbeddedViewRefImpl
     */
    destroy() {
        if (this._isDestroyed)
            return;
        // 标记为已销毁
        this._isDestroyed = true;
        // 执行所有销毁回调
        this._destroyCallbacks.forEach(callback => callback());
        this._destroyCallbacks = [];
        // // 清理响应式副作用
        // if (this.effect) {
        //     this.effect.stop();
        // }
        // this.injector.destroy();
    }
    /**
     * register callback on destroy.
     * @param callback destroy callback
     */
    onDestroy(callback) {
        if (callback) {
            this._destroyCallbacks.push(callback);
            return;
        }
        this.destroy();
    }
    query(selector) {
        return this.injector.query(selector, this.rootNodes);
    }
    queryAll(selector) {
        return this.injector.queryAll(selector, this.rootNodes);
    }
}
exports.EmbeddedViewRefImpl = EmbeddedViewRefImpl;
_a = effect_1.noReact;
function createEmbeddedViewRef(rootNodes, context, injector, effect) {
    return new EmbeddedViewRefImpl(rootNodes, context, injector, effect);
}
//# sourceMappingURL=view.js.map