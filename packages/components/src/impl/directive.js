"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DirectiveFactoryImpl = exports.DirectiveRefImpl = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const effect_1 = require("../effect");
const directive_1 = require("../refs/directive");
const reactive_1 = require("../reactive");
const injector_1 = require("../refs/injector");
class DirectiveRefImpl extends directive_1.DirectiveRef {
    constructor(_classRef, context, options) {
        super(_classRef, context, options);
        this._elementRef = options.elementRef;
        context.onDestroy(this);
    }
    get elementRef() {
        return this._elementRef;
    }
    get instance() {
        if (!this._inst) {
            this._inst = this.createInstance();
        }
        return this._inst;
    }
    clean() {
        this.instance?.onDestroy?.();
        super.clean();
    }
    process(option, resolveCtx) {
    }
    createInstance(context) {
        const ctx = context ?? (0, ioc_1.createRunContext)(this.injector);
        ctx.setInjector(this.injector);
        ctx.setPayload(this._elementRef);
        const instance = super.createInstance(ctx);
        const def = this.classRef.getAnnotation();
        return (0, reactive_1.reactive)(instance, this.injector.get(effect_1.ReactiveEffect), def.computeds);
    }
}
exports.DirectiveRefImpl = DirectiveRefImpl;
let DirectiveFactoryImpl = class DirectiveFactoryImpl extends ioc_1.AbstractInvocationFactory {
    constructor(runtime) {
        super(runtime);
    }
    getInjector(typeRef, options) {
        let injector = super.getInjector(typeRef, options);
        // 注入Renderer
        const def = typeRef.getAnnotation();
        if (def.imports?.length) {
            injector = (0, ioc_1.createInjector)(injector, options?.providers);
            ioc_1.InjectUtil.use(injector, def.imports);
        }
        return injector;
    }
    createInjector(typeRef, injector, options) {
        // console.log('[DirectiveFactoryImpl] createInjector options:', options, 'elementRef:', options?.elementRef);
        const context = new injector_1.NodeInjector(injector, options);
        if (options.elementRef) {
            context.setPayload(options.elementRef);
            // console.log('[DirectiveFactoryImpl] Payload set');
        }
        else {
            // console.log('[DirectiveFactoryImpl] No elementRef in options');
        }
        // if (!context.has(ReactiveEffect, InjectFlags.Self)) {
        //     context.setValue(ReactiveEffect, new DefaultReactiveEffect(options))
        // }
        return context;
    }
    createInstance(typeRef, context, options) {
        return new DirectiveRefImpl(typeRef, context, options);
    }
    create(type, options) {
        return super.create(type, options);
    }
};
exports.DirectiveFactoryImpl = DirectiveFactoryImpl;
exports.DirectiveFactoryImpl = DirectiveFactoryImpl = tslib_1.__decorate([
    (0, ioc_1.Injectable)(),
    tslib_1.__metadata("design:paramtypes", [ioc_1.Runtime])
], DirectiveFactoryImpl);
//# sourceMappingURL=directive.js.map