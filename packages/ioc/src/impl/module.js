"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultModuleRef = void 0;
exports.createModuleRef = createModuleRef;
const exception_1 = require("../exception");
const class_1 = require("../metadata/class");
const module_ref_1 = require("../module.ref");
const providers_1 = require("../providers");
const common_1 = require("./common");
const injector_1 = require("./injector");
/**
 * default modeuleRef implements {@link ModuleRef}
 */
class DefaultModuleRef extends injector_1.DefaultInjector {
    constructor(moduleType, parent, option = {}) {
        super(parent, undefined, option?.scope ?? moduleType.type, (moduleType.getAnnotation().static || option.isStatic) !== false);
        this._typeRefl = moduleType;
        this._type = moduleType.type;
        this.records.set(module_ref_1.ModuleRef, (0, common_1.createValueRecord)(this));
        this.initWithOptions(option);
    }
    initWithOptions(option) {
        const dedupStack = [];
        const runtime = this.getRuntime();
        runtime.getModules().set(this._type, this);
        let ps;
        if (option.deps?.length) {
            const deps = option.deps;
            ps = (0, common_1.mergePromise)(ps, () => (0, injector_1.processUse)(this, deps));
        }
        if (option.providers?.length) {
            const providers = option.providers;
            ps = (0, common_1.mergePromise)(ps, () => (0, injector_1.processProviders)(this, providers));
        }
        return (0, common_1.mergePromise)(ps, () => this.ininModule(dedupStack, option));
    }
    ininModule(dedupStack, option, ps) {
        ps = (0, common_1.mergePromise)(ps, () => (0, injector_1.processInjectType)(this, this._type, dedupStack, false, undefined, this.moduleReflect));
        return (0, common_1.mergePromise)(ps, () => {
            this._instance = this.get(this._type);
            this._readyDefer.resolve();
        });
    }
    get moduleType() {
        return this._type;
    }
    get moduleReflect() {
        return this._typeRefl;
    }
    get injector() {
        return this;
    }
    get instance() {
        return this._instance;
    }
    import(typeOrDef, children) {
        if (children) {
            const modeuleRef = createModuleRef(typeOrDef, this);
            return modeuleRef.ready;
        }
        else {
            return (0, injector_1.processInjectType)(this, typeOrDef, []);
        }
    }
    clear() {
        this.getRuntime().getModules().delete(this._type);
        super.clear();
        this._type = null;
        this._typeRefl = null;
        this._instance = null;
    }
}
exports.DefaultModuleRef = DefaultModuleRef;
/**
 * create module ref.
 */
function createModuleRef(module, parent, option) {
    if ((0, providers_1.isModuleProviders)(module)) {
        return new DefaultModuleRef((0, class_1.getClassRef)(module.module), parent, {
            ...option,
            providers: option?.providers?.length ? [module.providers ?? [], option?.providers] : module.providers
        });
    }
    const moduleDef = (0, class_1.getClassify)(module);
    if (!moduleDef.getAnnotation().module) {
        throw new exception_1.Exception(`module def must be module type.`);
    }
    return new DefaultModuleRef(moduleDef, parent, option);
}
//# sourceMappingURL=module.js.map