"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComponentFactoryImpl = exports.ComponentRefImpl = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const effect_1 = require("../effect");
const component_1 = require("../refs/component");
const compiler_1 = require("../template/compiler");
const reactive_1 = require("../reactive");
const injector_1 = require("../refs/injector");
const Renderer_1 = require("../renderer/Renderer");
const template_1 = require("../refs/template");
const effect_2 = require("./effect");
const directive_1 = require("../decorators/directive");
const component_2 = require("../decorators/component");
class ComponentRefImpl extends component_1.ComponentRef {
    constructor(_classRef, context, options) {
        super(_classRef, context, options);
        this._elementRef = options?.elementRef;
        context.onDestroy(this);
    }
    get elementRef() {
        return this._elementRef;
    }
    get hostView() {
        return this._hostView;
    }
    get instance() {
        if (!this._inst) {
            this._inst = this.createInstance();
        }
        return this._inst;
    }
    async render(options) {
        const def = this.classRef.getAnnotation();
        if (!/\[\w+\]/.test(def.selector || '') && !def.template && !def.templateUrl)
            throw new ioc_1.Exception(this.classRef.className + ' template or templateUrl is required.');
        await this.instance.onInit?.();
        const directives = this.injector.get(directive_1.DIRECTIVES) || [];
        const customElements = this.injector.get(directive_1.CUSTOM_ELEMENTS) || [];
        // console.log('[Component.render] directives:', directives?.length, directives?.map((d: any) => d.type?.name));
        const components = this.injector.get(component_2.COMPONENTS) || [];
        if (!this._elementRef) {
            let renderer = this.injector.get(Renderer_1.Renderer, null);
            if (!renderer) {
                const templateCompiler = this.injector.get(compiler_1.TemplateCompiler, null);
                if (templateCompiler && templateCompiler.renderer) {
                    renderer = templateCompiler.renderer;
                }
            }
            if (!renderer) {
                throw new ioc_1.Exception('Template module renderer not initialized. Verify TemplateModule is properly configured with deps.');
            }
            this._elementRef = this.injector.getElementRef(renderer.createElement(def.selector ?? this.classRef.className));
        }
        if (!def.ƿtempFac) {
            const template = def.template || await fetchTemplate(def.templateUrl);
            const compiler = this.injector.get(compiler_1.TemplateCompiler);
            def.ƿtempFac = compiler.compile(template, { directives, components, customElements });
        }
        const host = this._elementRef;
        const templateRef = def.ƿtempFac(host, this.injector);
        this.injector.setValue(template_1.TemplateRef, templateRef);
        this._hostView = templateRef.createEmbeddedView(this.instance, this.injector);
        await this.instance.onAfterViewInit?.();
    }
    clean() {
        this.instance?.onDestroy?.();
        super.clean();
        this.hostView?.destroy();
    }
    process(option, resolveCtx) {
        return this.render(this.options);
    }
    createInstance(context) {
        const instance = super.createInstance(context ?? (0, ioc_1.createRunContext)(this.injector).setPayload(this._elementRef));
        const def = this.classRef.getAnnotation();
        return (0, reactive_1.reactive)(instance, this.injector.get(effect_1.ReactiveEffect), def.computeds);
    }
}
exports.ComponentRefImpl = ComponentRefImpl;
let ComponentFactoryImpl = class ComponentFactoryImpl extends ioc_1.AbstractInvocationFactory {
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
    createInstance(typeRef, context, options) {
        return new ComponentRefImpl(typeRef, context, options);
    }
    mergeProviders(typeRef, options) {
        const providers = super.mergeProviders(typeRef, options);
        if (options?.compiler) {
            providers.push((0, ioc_1.toProvider)(compiler_1.TemplateCompiler, options.compiler));
        }
        if (options?.renderer) {
            providers.push((0, ioc_1.toProvider)(Renderer_1.Renderer, options.renderer));
        }
        return providers;
    }
    createInjector(typeRef, injector, options) {
        const context = new injector_1.NodeInjector(injector, options);
        if (!context.has(effect_1.ReactiveEffect, ioc_1.InjectFlags.Self)) {
            context.setValue(effect_1.ReactiveEffect, new effect_2.DefaultReactiveEffect(options));
        }
        if (!context.has(Renderer_1.Renderer) && injector.has(Renderer_1.Renderer)) {
            const parentRenderer = injector.get(Renderer_1.Renderer);
            if (parentRenderer) {
                context.setValue(Renderer_1.Renderer, parentRenderer);
            }
        }
        return context;
    }
    create(type, options) {
        return super.create(type, options);
    }
};
exports.ComponentFactoryImpl = ComponentFactoryImpl;
exports.ComponentFactoryImpl = ComponentFactoryImpl = tslib_1.__decorate([
    (0, ioc_1.Injectable)(),
    tslib_1.__metadata("design:paramtypes", [ioc_1.Runtime])
], ComponentFactoryImpl);
async function fetchTemplate(url) {
    const response = await fetch(url);
    return await response.text();
}
//# sourceMappingURL=component.js.map