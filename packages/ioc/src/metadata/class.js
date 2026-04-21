"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClassRef = void 0;
exports.getClassRef = getClassRef;
exports.getClassify = getClassify;
const resolver_1 = require("../resolver");
const lang_1 = require("../utils/lang");
const chk_1 = require("../utils/chk");
const exps_1 = require("../utils/exps");
const exception_1 = require("../exception");
const invocation_1 = require("../invocation");
const type_def_1 = require("./type.def");
const type_1 = require("./type");
const define_1 = require("./define");
const contexts_1 = require("../handlers/contexts");
/**
 * type class reflective.
 *
 * 类反射
 */
class ClassRef {
    /**
     * class name.
     */
    get className() {
        return this.annotation.name;
    }
    get classDecors() {
        if (!this._classDecors) {
            this._classDecors = [];
        }
        return this._classDecors;
    }
    get propDecors() {
        if (!this._propDecors) {
            this._propDecors = this.parent ? [...this.parent.propDecors] : [];
        }
        return this._propDecors;
    }
    get methodDecors() {
        if (!this._methodDecors) {
            this._methodDecors = this.parent ? [...this.parent.methodDecors] : [];
        }
        return this._methodDecors;
    }
    get paramDecors() {
        if (!this._paramDecors) {
            this._paramDecors = this.parent ? [...this.parent.paramDecors] : [];
        }
        return this._paramDecors;
    }
    /**
     * class provides.
     */
    get provides() {
        return this.annotation.provides;
    }
    /**
     * class extends providers.
     */
    get providers() {
        return this.annotation.providers;
    }
    /**
     * class resolvers.
     *
     * @type {InstanceOf<ArgumentResolver>[]}
     */
    get resolvers() {
        return this.annotation.resolvers;
    }
    /**
     * runnable defines.
     */
    get runnables() {
        return this.annotation.runnables;
    }
    get exportProviders() {
        return this.annotation.exportProviders;
    }
    constructor(type, annotation, parent) {
        this.type = type;
        this.parent = parent;
        this.annotation = this.initAnnotation(annotation);
    }
    setInvocationFactory(factory) {
        this.invocationFactory = factory;
    }
    getInvocationFactory(injector) {
        if (!injector) {
            throw new exception_1.ArgumentException();
        }
        return this.invocationFactory?.(injector) ?? injector.get(invocation_1.InvocationFactory);
    }
    createInvocation(injector, options) {
        const factory = this.getInvocationFactory(injector);
        return factory.create(this, { ...options, injector, targetType: this.type });
    }
    initAnnotation(annotation) {
        if (!annotation.name) {
            annotation.name = this.type.name;
        }
        if (!annotation.decDefs) {
            annotation.decDefs = new Map();
        }
        if (!annotation.classDefs) {
            annotation.classDefs = [];
        }
        if (!annotation.propDefs) {
            annotation.propDefs = [];
        }
        if (!annotation.methodDefs) {
            annotation.methodDefs = [];
        }
        if (!annotation.paramDefs) {
            annotation.paramDefs = new Map();
        }
        if (!annotation.propMetadatas) {
            annotation.propMetadatas = new Map();
        }
        if (!annotation.methodMetadatas) {
            annotation.methodMetadatas = new Map();
        }
        if (!annotation.exportProviders) {
            annotation.exportProviders = [];
        }
        if (!annotation.provides) {
            annotation.provides = [];
        }
        annotation.providers = this.parent?.providers ? [...this.parent.providers, ...(annotation.providers ?? [])] : annotation.providers ?? [];
        annotation.resolvers = this.parent?.resolvers ? [...this.parent.resolvers, ...(annotation.resolvers ?? [])] : annotation.resolvers ?? [];
        annotation.runnables = this.parent?.runnables ? [...this.parent.runnables, ...(annotation.runnables ?? [])] : annotation.runnables ?? [];
        return annotation;
    }
    getAnnotation() {
        return this.annotation;
    }
    assignAnnotation(records) {
        if (!records)
            return;
        (0, lang_1.assign)(this.annotation, records, 'classDefs', 'resolvers', 'runnables', 'providers', 'propDefs', 'methodDefs', 'paramDefs', 'propMetadatas', 'methodMetadatas');
    }
    invoke(method, injector, instance, argsOrContext) {
        const type = this.type;
        let args;
        let context;
        if ((0, chk_1.isArray)(argsOrContext)) {
            args = argsOrContext;
        }
        else if (context instanceof contexts_1.RunContext) {
            context = argsOrContext;
        }
        const inst = instance ?? injector.resolve(type, context);
        if (!inst || !(0, chk_1.isFunction)(inst[method])) {
            throw new exception_1.Exception(`type: ${type} has no method ${method.toString()}.`);
        }
        if (!args) {
            args = this.resolveArguments(method, injector, context);
        }
        const hasPointcut = inst[type_def_1.proxyTag];
        if (hasPointcut) {
            args.push(injector);
        }
        return inst[method](...args);
    }
    storage(define) {
        const annotation = this.getAnnotation();
        switch (define.decorType) {
            case 'class':
                if (!this.classDecors.includes(define.decor)) {
                    this.classDecors.push(define.decor);
                }
                this.saveMetadata(annotation.classDefs, define, true);
                this.saveMetadata(annotation.decDefs, define, true, define.decor);
                break;
            case 'property':
                if (!this.propDecors.includes(define.decor)) {
                    this.propDecors.push(define.decor);
                }
                this.saveMetadata(annotation.propDefs, define);
                this.saveMetadata(annotation.decDefs, define, false, define.decor);
                break;
            case 'method':
                if (!this.methodDecors.includes(define.decor)) {
                    this.methodDecors.push(define.decor);
                }
                this.saveMetadata(annotation.methodDefs, define);
                this.saveMetadata(annotation.decDefs, define, false, define.decor);
                break;
            case 'parameter':
                if (!this.paramDecors.includes(define.decor)) {
                    this.paramDecors.push(define.decor);
                }
                this.saveMetadata(annotation.paramDefs, define, true, define.propertyKey);
                this.saveMetadata(annotation.decDefs, define, true, define.decor);
                break;
        }
    }
    saveMetadata(maps, define, unshift, key) {
        const defines = key ? maps.get(key) : maps;
        if (defines) {
            unshift ? defines.unshift(define) : defines.push(define);
        }
        else if (key) {
            maps.set(key, [define]);
        }
    }
    getDefines(decor) {
        return (this.annotation.decDefs?.get(decor) ?? []).concat(this.parent?.getDefines(decor) ?? []);
    }
    /**
     * resolve args.
     *
     * @param method invoke the method named with.
     * @param injector invocation injector.
     */
    resolveArguments(method, injector, context) {
        const parameters = this.getParameters(method) ?? [];
        const args = (0, resolver_1.getResolver)(injector).resolveParams(injector, parameters, context);
        return args;
    }
    hasOwnParameters(method) {
        return !!this.annotation.methodMetadatas?.get(method)?.params;
    }
    getParameters(method) {
        return this.annotation.methodMetadatas?.get(method)?.params ?? this.parent?.getParameters(method);
    }
    getReturnning(method) {
        return this.annotation.methodMetadatas?.get(method)?.returnType ?? this.parent?.getReturnning(method);
    }
    getMethodOptions(method) {
        return this.annotation.methodMetadatas.get(method)?.invokeEnv ?? this.parent?.getMethodOptions(method);
    }
    setMethodOptions(method, options) {
        let meta = this.annotation.methodMetadatas.get(method);
        if (!meta) {
            meta = { invokeEnv: {} };
            this.annotation.methodMetadatas.set(method, meta);
        }
        if (!meta.invokeEnv) {
            meta.invokeEnv = {};
        }
        const env = meta.invokeEnv;
        if ((0, lang_1.hasItem)(options.providers)) {
            if (!env.providers)
                env.providers = [];
            env.providers.push(options.providers);
        }
        if ((0, lang_1.hasItem)(options.resolvers)) {
            if (!env.resolvers)
                env.resolvers = [];
            env.resolvers.push(...options.resolvers);
        }
        if ((0, lang_1.hasItem)(options.values)) {
            if (!env.values)
                env.values = [];
            env.values.push(...options.values);
        }
    }
    hasDecor(decor) {
        if (typeof decor === 'string') {
            return this.hasSomeDecor(d => d.decorator === decor);
        }
        return this.hasSomeDecor(d => d === decor);
    }
    hasSomeDecor(predicate) {
        return this.classDecors.some(r => predicate(r))
            || this.methodDecors.some(r => predicate(r))
            || this.propDecors.some(r => predicate(r))
            || this.paramDecors.some(r => predicate(r));
    }
    findDecor(predicate, type) {
        if (type) {
            switch (type) {
                case 'class':
                    return this.classDecors.find(r => predicate(r));
                case 'method':
                    return this.methodDecors.find(r => predicate(r));
                case 'property':
                    return this.propDecors.find(r => predicate(r));
                case 'parameter':
                    return this.paramDecors.find(r => predicate(r));
                default:
                    break;
            }
        }
        return this.classDecors.find(r => predicate(r))
            ?? this.methodDecors.find(r => predicate(r))
            ?? this.propDecors.find(r => predicate(r))
            ?? this.paramDecors.find(r => predicate(r));
    }
    hasMetadata(decor, type, propertyKey) {
        type = (type === null) ? null : (type ?? define_1.Decors.CLASS);
        const decorator = this.findDecor((0, chk_1.isString)(decor) ? d => d.decorator === decor : d => d === decor, type);
        if (!decorator) {
            return false;
        }
        const defines = this.getDefines(decorator);
        return propertyKey ? defines.some(d => d.propertyKey == propertyKey) : defines.length > 0;
    }
    eachPropertyProviders(callback, excludes) {
        const upexc = excludes ? excludes.slice(0) : [];
        this.annotation.propMetadatas?.forEach((p, key) => {
            if (!excludes?.includes(key)) {
                callback(p, key);
            }
            if (!this.parent && !upexc.includes(key)) {
                upexc.push(key);
            }
        });
        this.parent?.eachPropertyProviders(callback, upexc);
    }
    /**
     * get class defines.
     * @param filter custom filter.
     */
    getClassdDefines(filter) {
        const defines = this.annotation.classDefs;
        return filter ? defines.filter(filter) : defines;
    }
    getMethodDefines(arg, filter) {
        let propertyKey;
        if ((0, chk_1.isFunction)(arg)) {
            filter = arg;
        }
        else if (arg) {
            propertyKey = arg;
        }
        let defines = this.annotation.methodDefs;
        if (defines.length) {
            if (filter && propertyKey) {
                defines = defines.filter(d => d.propertyKey === propertyKey && filter(d));
            }
            else if (propertyKey) {
                defines = defines.filter(d => d.propertyKey === propertyKey);
            }
            else if (filter) {
                defines = defines.filter(filter);
            }
        }
        if (this.parent) {
            defines = defines.concat(this.parent.getMethodDefines(propertyKey, filter && !propertyKey && defines.length ? (p => !defines.some(d => d.propertyKey === p.propertyKey) && filter(p)) : filter));
        }
        return defines;
    }
    getPropDefines(arg, filter) {
        let propertyKey;
        if ((0, chk_1.isFunction)(arg)) {
            filter = arg;
        }
        else if (arg) {
            propertyKey = arg;
        }
        let defines = this.annotation.propDefs;
        if (defines.length) {
            if (filter && propertyKey) {
                defines = defines.filter(d => d.propertyKey === propertyKey && filter(d));
            }
            else if (propertyKey) {
                defines = defines.filter(d => d.propertyKey === propertyKey);
            }
            else if (filter) {
                defines = defines.filter(filter);
            }
        }
        if (this.parent) {
            defines = defines.concat(this.parent.getPropDefines(propertyKey, filter && !propertyKey && defines.length ? (p => !defines.some(d => d.propertyKey === p.propertyKey) && filter(p)) : filter));
        }
        return defines;
    }
    getParamDefines(method) {
        return this.annotation.paramDefs.get(method) ?? this.parent?.getParamDefines(method) ?? [];
    }
    /**
     * get class metadata.
     * @param decor decoractor or decoractor name.
     */
    getMetadata(decor) {
        return this.getDefines(decor).find(d => d.decorType === 'class' && d.metadata)?.metadata;
    }
    get extendTypes() {
        if (!this._extends) {
            if (this.parent) {
                this._extends = this.parent.extendTypes.slice(0);
                this._extends.unshift(this.type);
            }
            else {
                this._extends = [this.type];
            }
        }
        return this._extends;
    }
    getParamName(method, idx) {
        const names = this.getParamNames(method);
        if (idx >= 0 && names.length > idx) {
            return names[idx];
        }
        return '';
    }
    getParamNames(method) {
        const prop = method ?? define_1.ctorName;
        return this.getParams().get(prop) || [];
    }
    getParams() {
        if (!this.params) {
            this.params = this.parent ? new Map(this.parent.getParams()) : new Map();
            this.setParam(this.params);
        }
        return this.params;
    }
    setParam(params) {
        const classAnnations = this.annotation;
        if (classAnnations && classAnnations.methods) {
            (0, lang_1.forIn)(classAnnations.methods, (p, n) => {
                params.set(n, p.params);
            });
        }
        else {
            const descriptors = Object.getOwnPropertyDescriptors(this.type.prototype);
            (0, lang_1.forIn)(descriptors, (item, n) => {
                if (item.value) {
                    params.set(n, getParamNames(item.value));
                }
                if (item.set) {
                    params.set(n, getParamNames(item.value));
                }
            });
        }
    }
    getPropertyName(descriptor) {
        if (!descriptor) {
            return '';
        }
        let pty = descriptor.__name;
        if (!pty) {
            const decs = this.getPropertyDescriptors();
            (0, lang_1.forIn)(decs, (dec, n) => {
                if (dec === descriptor) {
                    pty = n;
                    return false;
                }
            });
        }
        return pty;
    }
    hasMethod(...names) {
        const descs = this.getPropertyDescriptors();
        return !names.some(name => !(0, chk_1.isFunction)(descs[name]?.value));
    }
    getMethodName(method) {
        return (0, chk_1.isFunction)(method) ? this.getPropertyName(method(this.getPropertyDescriptors())) : method;
    }
    getDescriptor(name) {
        return this.getPropertyDescriptors()[name];
    }
    getPropertyDescriptors() {
        if (!this.descriptos) {
            const descriptos = {};
            if (this.parent) {
                const parentDescs = this.parent.getPropertyDescriptors();
                for (const n in parentDescs) {
                    descriptos[n] = parentDescs[n];
                }
            }
            const descs = Object.getOwnPropertyDescriptors(this.type.prototype);
            for (const n in descs) {
                descs[n].__name = n;
                descriptos[n] = descs[n];
            }
            this.descriptos = descriptos;
        }
        return this.descriptos;
    }
    isExtends(type) {
        return this.extendTypes.indexOf(type) >= 0;
    }
}
exports.ClassRef = ClassRef;
function getParamNames(func) {
    if (!(0, chk_1.isFunction)(func)) {
        return [];
    }
    const fnStr = func.toString().replace(exps_1.STRIP_COMMENTS, '');
    const result = fnStr.slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')')).match(exps_1.ARGUMENT_NAMES);
    return result ?? [];
}
const CLASS_REF_CACHE = new WeakMap();
function getClassRef(type) {
    if (!type || (0, type_1.isPrimitive)(type))
        return null;
    let tyRef = CLASS_REF_CACHE.get(type);
    if (!tyRef || tyRef.type !== type) {
        let prRef = tyRef;
        if (!prRef) {
            const parentType = (0, lang_1.getParentType)(type);
            if (parentType) {
                prRef = getClassRef(parentType);
            }
        }
        tyRef = new ClassRef(type, (0, type_def_1.getDef)(type), prRef);
        CLASS_REF_CACHE.set(type, tyRef);
    }
    return tyRef;
}
function getClassify(type) {
    return type instanceof ClassRef ? type : getClassRef((0, chk_1.isFunction)(type) ? type : (0, type_1.getType)(type));
}
//# sourceMappingURL=class.js.map