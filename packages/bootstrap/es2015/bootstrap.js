(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('tslib'), require('@ts-ioc/core'), require('reflect-metadata')) :
	typeof define === 'function' && define.amd ? define(['tslib', '@ts-ioc/core', 'reflect-metadata'], factory) :
	(global.bootstrap = global.bootstrap || {}, global.bootstrap.js = factory(global.tslib_1,global.core_1,global.Reflect));
}(this, (function (tslib_1,core_1,reflectMetadata) { 'use strict';

tslib_1 = tslib_1 && tslib_1.hasOwnProperty('default') ? tslib_1['default'] : tslib_1;
core_1 = core_1 && core_1.hasOwnProperty('default') ? core_1['default'] : core_1;
reflectMetadata = reflectMetadata && reflectMetadata.hasOwnProperty('default') ? reflectMetadata['default'] : reflectMetadata;

function unwrapExports (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var Annotation = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

/**
 * create type builder decorator
 *
 * @export
 * @template T
 * @param {string} name
 * @param {string} [decorType]
 * @param {(Token<IAnnotationBuilder<any>> | IAnnotationBuilder<any>)} [builder]
 * @param {MetadataAdapter} [adapter]
 * @param {MetadataExtends<T>} [metadataExtends]
 * @returns {IAnnotationDecorator<T>}
 */
function createAnnotationDecorator(name, builder, adapter, metadataExtends) {
    return core_1.createClassDecorator(name, args => {
        if (adapter) {
            adapter(args);
        }
    }, metadata => {
        if (metadataExtends) {
            metadata = metadataExtends(metadata);
        }
        if (builder && !metadata.annotationBuilder) {
            metadata.annotationBuilder = builder;
        }
        return metadata;
    });
}
exports.createAnnotationDecorator = createAnnotationDecorator;
/**
 * Annotation decorator, use to define class build way via config.
 *
 * @Annotation
 */
exports.Annotation = createAnnotationDecorator('Annotation');




});

unwrapExports(Annotation);
var Annotation_1 = Annotation.createAnnotationDecorator;
var Annotation_2 = Annotation.Annotation;

var DIModule = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

/**
 * create bootstrap decorator.
 *
 * @export
 * @template T
 * @param {string} name decorator name.
 * @param {(Token<IModuleBuilder> | IModuleBuilder)} [builder]
 * @param {(Token<IAnnotationBuilder<any>> | IAnnotationBuilder<any>)} [annotationBuilder]
 * @param {MetadataAdapter} [adapter]
 * @param {MetadataExtends<T>} [metadataExtends]
 * @returns {IDIModuleDecorator<T>}
 */
function createDIModuleDecorator(name, builder, annotationBuilder, adapter, metadataExtends) {
    return core_1.createClassDecorator(name, args => {
        if (adapter) {
            adapter(args);
        }
    }, metadata => {
        if (metadataExtends) {
            metadata = metadataExtends(metadata);
        }
        if (!metadata.name && core_1.isClass(metadata.token)) {
            let isuglify = /^[a-z]$/.test(metadata.token.name);
            if (isuglify && metadata.token.classAnnations) {
                metadata.name = metadata.token.classAnnations.name;
            }
            else {
                metadata.name = metadata.token.name;
            }
        }
        metadata.decorType = name;
        if (builder && !metadata.builder) {
            metadata.builder = builder;
        }
        if (annotationBuilder && !metadata.annotationBuilder) {
            metadata.annotationBuilder = annotationBuilder;
        }
        return metadata;
    });
}
exports.createDIModuleDecorator = createDIModuleDecorator;
/**
 * DIModule Decorator, definde class as DI module.
 *
 * @DIModule
 */
exports.DIModule = createDIModuleDecorator('DIModule');




});

unwrapExports(DIModule);
var DIModule_1 = DIModule.createDIModuleDecorator;
var DIModule_2 = DIModule.DIModule;

var Bootstrap = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });


/**
 * create bootstrap decorator.
 *
 * @export
 * @template T
 * @param {string} name
 * @param {(Token<IApplicationBuilder> | IApplicationBuilder)} [builder] default builder
 * @param {(Token<IAnnotationBuilder<any>> | IAnnotationBuilder<Tany>)} [annotationBuilder] default type builder.
 * @param {MetadataAdapter} [adapter]
 * @param {MetadataExtends<T>} [metadataExtends]
 * @returns {IBootstrapDecorator<T>}
 */
function createBootstrapDecorator(name, builder, annotationBuilder, adapter, metadataExtends) {
    return DIModule.createDIModuleDecorator(name, builder, annotationBuilder, adapter, (metadata) => {
        if (metadataExtends) {
            metadataExtends(metadata);
        }
        if (metadata.builder) {
            setTimeout(() => {
                let builderType = metadata.builder;
                let builder;
                if (core_1.isClass(builderType)) {
                    builder = core_1.isFunction(builderType['create']) ? builderType['create']() : new builderType();
                }
                else if (core_1.isObject(builderType)) {
                    builder = builderType;
                }
                if (builder) {
                    if (metadata.globals) {
                        builder.use(...metadata.globals);
                    }
                    builder.bootstrap(metadata.type);
                }
            }, 500);
        }
        return metadata;
    });
}
exports.createBootstrapDecorator = createBootstrapDecorator;
/**
 * Bootstrap Decorator, definde class as mvc bootstrap module.
 *
 * @Bootstrap
 */
exports.Bootstrap = createBootstrapDecorator('Bootstrap');




});

unwrapExports(Bootstrap);
var Bootstrap_1 = Bootstrap.createBootstrapDecorator;
var Bootstrap_2 = Bootstrap.Bootstrap;

var decorators = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

tslib_1.__exportStar(Annotation, exports);
tslib_1.__exportStar(DIModule, exports);
tslib_1.__exportStar(Bootstrap, exports);




});

unwrapExports(decorators);

var AppConfigure = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

/**
 * application configuration token.
 */
exports.AppConfigureToken = new core_1.InjectToken('DI_APP_Configuration');
/**
 * application default configuration token.
 */
exports.DefaultConfigureToken = new core_1.InjectToken('DI_Default_Configuration');
/**
 *  app configure loader token.
 */
exports.AppConfigureLoaderToken = new core_1.InjectToken('DI_Configure_Loader');




});

unwrapExports(AppConfigure);
var AppConfigure_1 = AppConfigure.AppConfigureToken;
var AppConfigure_2 = AppConfigure.DefaultConfigureToken;
var AppConfigure_3 = AppConfigure.AppConfigureLoaderToken;

var DIModuleValidate = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });



/**
 * DIModuel Validate Token
 */
exports.DIModuelValidateToken = new core_1.InjectModuleValidateToken(decorators.DIModule.toString());
/**
 * DIModuel Validate
 *
 * @export
 * @class DIModuelValidate
 * @extends {BaseModuelValidate}
 */
let DIModuelValidate = class DIModuelValidate extends core_1.BaseModuelValidate {
    getDecorator() {
        return decorators.DIModule.toString();
    }
};
DIModuelValidate.classAnnations = { "name": "DIModuelValidate", "params": { "getDecorator": [] } };
DIModuelValidate = tslib_1.__decorate([
    core_1.Singleton(exports.DIModuelValidateToken)
], DIModuelValidate);
exports.DIModuelValidate = DIModuelValidate;




});

unwrapExports(DIModuleValidate);
var DIModuleValidate_1 = DIModuleValidate.DIModuelValidateToken;
var DIModuleValidate_2 = DIModuleValidate.DIModuelValidate;

var ContainerPool_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

/**
 * container pool
 *
 * @export
 * @class ContainerPool
 */
class ContainerPool {
    constructor(containerBuilder) {
        this.containerBuilder = containerBuilder;
        this.pools = new core_1.MapSet();
    }
    createContainer() {
        return this.containerBuilder.create();
    }
    getTokenKey(token) {
        if (token instanceof core_1.Registration) {
            return token.toString();
        }
        return token;
    }
    isDefault(container) {
        return container === this._default;
    }
    hasDefault() {
        return !!this._default;
    }
    getDefault() {
        if (!this._default) {
            this._default = this.createContainer();
        }
        return this._default;
    }
    set(token, container) {
        let key = this.getTokenKey(token);
        if (this.pools.has(token)) {
            console.log(`${token.toString()} module has loaded`);
        }
        this.pools.set(token, container);
    }
    get(token) {
        let key = this.getTokenKey(token);
        if (!this.has(key)) {
            return null;
        }
        return this.pools.get(token);
    }
    has(token) {
        return this.pools.has(this.getTokenKey(token));
    }
    create(parent) {
        parent = parent || this.getDefault();
        let container = parent.getBuilder().create();
        this.setParent(container, parent);
        return container;
    }
    setParent(container, parent) {
        if (this.isDefault(container)) {
            return;
        }
        // if (!container.parent) {
        if (parent && parent !== container) {
            container.parent = parent;
        }
        else {
            container.parent = this.getDefault();
        }
        // }
    }
}
ContainerPool.classAnnations = { "name": "ContainerPool", "params": { "constructor": ["containerBuilder"], "createContainer": [], "getTokenKey": ["token"], "isDefault": ["container"], "hasDefault": [], "getDefault": [], "set": ["token", "container"], "get": ["token"], "has": ["token"], "create": ["parent"], "setParent": ["container", "parent"] } };
exports.ContainerPool = ContainerPool;
exports.ContainerPoolToken = new core_1.InjectToken('ContainerPool');
// /**
//  *  global container pools.
//  */
// export const containerPools = new ContainerPool();




});

unwrapExports(ContainerPool_1);
var ContainerPool_2 = ContainerPool_1.ContainerPool;
var ContainerPool_3 = ContainerPool_1.ContainerPoolToken;

var Events_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

/**
 * custom events.
 *
 * @export
 * @class Events
 */
class Events {
    constructor() {
        this.eventsMap = {};
    }
    on(name, event) {
        this.eventsMap[name] = this.eventsMap[name] || [];
        if (this.eventsMap[name].indexOf(event) < 0) {
            this.eventsMap[name].push(event);
        }
        return this;
    }
    off(name, event) {
        if (this.eventsMap[name]) {
            if (event) {
                this.eventsMap[name].splice(this.eventsMap[name].indexOf(event), 1);
            }
            else {
                delete this.eventsMap[name];
            }
        }
        return this;
    }
    emit(name, ...args) {
        let events = this.eventsMap[name];
        if (core_1.isArray(events)) {
            events.forEach(ev => {
                ev(...args);
            });
        }
    }
}
Events.classAnnations = { "name": "Events", "params": { "constructor": [], "on": ["name", "event"], "off": ["name", "event"], "emit": ["name", "args"] } };
exports.Events = Events;




});

unwrapExports(Events_1);
var Events_2 = Events_1.Events;

var utils = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

tslib_1.__exportStar(ContainerPool_1, exports);
tslib_1.__exportStar(Events_1, exports);




});

unwrapExports(utils);

var InjectedModule_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

/**
 * injected module.
 *
 * @export
 * @class InjectedModule
 * @template T
 */
class InjectedModule {
    constructor(token, config, container, type, exports, providers) {
        this.token = token;
        this.config = config;
        this.container = container;
        this.type = type;
        this.exports = exports;
        this.providers = providers;
    }
}
InjectedModule.classAnnations = { "name": "InjectedModule", "params": { "constructor": ["token", "config", "container", "type", "exports", "providers"] } };
exports.InjectedModule = InjectedModule;
/**
 * Injected Module Token.
 *
 * @export
 * @class InjectModuleMetaConfigToken
 * @extends {Registration<Type<T>>}
 * @template T
 */
class InjectedModuleToken extends core_1.Registration {
    constructor(type) {
        super(type, 'InjectedModule');
    }
}
InjectedModuleToken.classAnnations = { "name": "InjectedModuleToken", "params": { "constructor": ["type"] } };
exports.InjectedModuleToken = InjectedModuleToken;




});

unwrapExports(InjectedModule_1);
var InjectedModule_2 = InjectedModule_1.InjectedModule;
var InjectedModule_3 = InjectedModule_1.InjectedModuleToken;

var DIModuleInjector_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });






const exportsProvidersFiled = '__exportProviders';
/**
 * DIModule injector token.
 */
exports.DIModuleInjectorToken = new core_1.InjectModuleInjectorToken(decorators.DIModule.toString());
/**
 * DIModule injector.
 *
 * @export
 * @class DIModuleInjector
 * @extends {ModuleInjector}
 */
let DIModuleInjector = class DIModuleInjector extends core_1.ModuleInjector {
    constructor(validate) {
        super(validate);
    }
    setup(container, type) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            yield this.importModule(container, type);
        });
    }
    import(container, type) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            if (this.validate.validate(type)) {
                let injMd = yield this.importModule(container, type);
                return injMd;
            }
            else {
                return null;
            }
        });
    }
    importByConfig(container, config) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            yield this.registerConfgureDepds(container, config);
            if (core_1.isArray(config.providers) && config.providers.length) {
                yield this.bindProvider(container, config.providers);
            }
            return null;
        });
    }
    importModule(container, type) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            let pools = container.get(utils.ContainerPoolToken);
            let newContainer = pools.create(container);
            newContainer.register(type);
            let metaConfig = this.validate.getMetaConfig(type, newContainer);
            metaConfig = yield this.registerConfgureDepds(newContainer, metaConfig);
            let injMd = new InjectedModule_1.InjectedModule(metaConfig.token || type, metaConfig, newContainer, type, metaConfig.exports || [], metaConfig[exportsProvidersFiled]);
            container.bindProvider(new InjectedModule_1.InjectedModuleToken(type), injMd);
            yield this.importConfigExports(container, newContainer, injMd);
            return injMd;
        });
    }
    registerConfgureDepds(container, config) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            if (core_1.isArray(config.imports) && config.imports.length) {
                yield container.loadModule(...config.imports);
            }
            if (core_1.isArray(config.providers) && config.providers.length) {
                config[exportsProvidersFiled] = this.bindProvider(container, config.providers);
            }
            return config;
        });
    }
    importConfigExports(container, providerContainer, injMd) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            if (container === providerContainer) {
                return container;
            }
            if (injMd) {
                container.resolvers.next(injMd);
                if (injMd.exports && injMd.exports.length) {
                    let expchs = providerContainer.resolvers.toArray().filter(r => {
                        if (r instanceof core_1.Container) {
                            return false;
                        }
                        else {
                            return injMd.exports.indexOf(r.type) >= 0;
                        }
                    });
                    expchs.forEach(r => {
                        container.resolvers.next(r);
                    });
                }
            }
            return container;
        });
    }
    bindProvider(container, providers) {
        let tokens = [];
        providers.forEach((p, index) => {
            if (core_1.isUndefined(p) || core_1.isNull(p)) {
                return;
            }
            if (core_1.isProviderMap(p)) {
                p.forEach((k, f) => {
                    tokens.push(k);
                    container.bindProvider(k, f);
                });
            }
            else if (p instanceof core_1.Provider) {
                tokens.push(p.type);
                container.bindProvider(p.type, (...providers) => p.resolve(container, ...providers));
            }
            else if (core_1.isClass(p)) {
                if (!container.has(p)) {
                    tokens.push(p);
                    container.register(p);
                }
            }
            else if (core_1.isBaseObject(p)) {
                let pr = p;
                let isobjMap = false;
                if (core_1.isToken(pr.provide)) {
                    if (core_1.isArray(pr.deps) && pr.deps.length) {
                        pr.deps.forEach(d => {
                            if (core_1.isClass(d) && !container.has(d)) {
                                container.register(d);
                            }
                        });
                    }
                    if (!core_1.isUndefined(pr.useValue)) {
                        tokens.push(pr.provide);
                        container.bindProvider(pr.provide, () => pr.useValue);
                    }
                    else if (core_1.isClass(pr.useClass)) {
                        if (!container.has(pr.useClass)) {
                            container.register(pr.useClass);
                        }
                        tokens.push(pr.provide);
                        container.bindProvider(pr.provide, pr.useClass);
                    }
                    else if (core_1.isFunction(pr.useFactory)) {
                        tokens.push(pr.provide);
                        container.bindProvider(pr.provide, () => {
                            let args = [];
                            if (core_1.isArray(pr.deps) && pr.deps.length) {
                                args = pr.deps.map(d => {
                                    if (core_1.isClass(d)) {
                                        return container.get(d);
                                    }
                                    else {
                                        return d;
                                    }
                                });
                            }
                            return pr.useFactory.apply(pr, args);
                        });
                    }
                    else if (core_1.isToken(pr.useExisting)) {
                        if (container.has(pr.useExisting)) {
                            tokens.push(pr.provide);
                            container.bindProvider(pr.provide, pr.useExisting);
                        }
                        else {
                            console.log('has not register:', pr.useExisting);
                        }
                    }
                    else {
                        isobjMap = true;
                    }
                }
                else {
                    isobjMap = true;
                }
                if (isobjMap) {
                    core_1.lang.forIn(p, (val, name) => {
                        if (!core_1.isUndefined(val)) {
                            if (core_1.isClass(val)) {
                                container.bindProvider(name, val);
                            }
                            else if (core_1.isFunction(val) || core_1.isString(val)) {
                                container.bindProvider(name, () => val);
                            }
                            else {
                                container.bindProvider(name, val);
                            }
                            tokens.push(name);
                        }
                    });
                }
            }
            else if (core_1.isFunction(p)) {
                tokens.push(name);
                container.bindProvider(name, () => p);
            }
        });
        return tokens;
    }
};
DIModuleInjector.classAnnations = { "name": "DIModuleInjector", "params": { "constructor": ["validate"], "setup": ["container", "type"], "import": ["container", "type"], "importByConfig": ["container", "config"], "importModule": ["container", "type"], "registerConfgureDepds": ["container", "config"], "importConfigExports": ["container", "providerContainer", "injMd"], "bindProvider": ["container", "providers"] } };
DIModuleInjector = tslib_1.__decorate([
    core_1.Injectable(exports.DIModuleInjectorToken),
    tslib_1.__param(0, core_1.Inject(DIModuleValidate.DIModuelValidateToken)),
    tslib_1.__metadata("design:paramtypes", [Object])
], DIModuleInjector);
exports.DIModuleInjector = DIModuleInjector;




});

unwrapExports(DIModuleInjector_1);
var DIModuleInjector_2 = DIModuleInjector_1.DIModuleInjectorToken;
var DIModuleInjector_3 = DIModuleInjector_1.DIModuleInjector;

var IModuleBuilder = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

const moduleBuilderDesc = 'DI_ModuleBuilder';
/**
 * inject module builder token.
 *
 * @export
 * @class InjectModuleBuilder
 * @extends {Registration<T>}
 * @template T
 */
class InjectModuleBuilderToken extends core_1.Registration {
    constructor(type) {
        super(type, moduleBuilderDesc);
    }
}
InjectModuleBuilderToken.classAnnations = { "name": "InjectModuleBuilderToken", "params": { "constructor": ["type"] } };
exports.InjectModuleBuilderToken = InjectModuleBuilderToken;
/**
 * default module builder token.
 */
exports.DefaultModuleBuilderToken = new InjectModuleBuilderToken(Object);
/**
 * module builder token.
 */
exports.ModuleBuilderToken = new core_1.Registration('any', moduleBuilderDesc);




});

unwrapExports(IModuleBuilder);
var IModuleBuilder_1 = IModuleBuilder.InjectModuleBuilderToken;
var IModuleBuilder_2 = IModuleBuilder.DefaultModuleBuilderToken;
var IModuleBuilder_3 = IModuleBuilder.ModuleBuilderToken;

var IRunner = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

/**
 * boot element.
 *
 * @export
 * @abstract
 * @class Boot
 * @implements {IBoot}
 */
class Runner {
    constructor(token, instance, config) {
        this.token = token;
        this.instance = instance;
        this.config = config;
    }
}
Runner.classAnnations = { "name": "Runner", "params": { "constructor": ["token", "instance", "config"], "run": ["data"] } };
exports.Runner = Runner;
/**
 * boot element
 *
 * @export
 * @class Boot
 * @extends {Runner<any>}
 */
class Boot extends Runner {
    constructor(token, instance, config) {
        super(token, instance, config);
        this.token = token;
        this.instance = instance;
        this.config = config;
    }
}
Boot.classAnnations = { "name": "Boot", "params": { "constructor": ["token", "instance", "config"] } };
exports.Boot = Boot;
/**
 * application runner token.
 *
 * @export
 * @class InjectRunnerToken
 * @extends {Registration<IRunner<T>>}
 * @template T
 */
class InjectRunnerToken extends core_1.Registration {
    constructor(type) {
        super(type, 'boot__runner');
    }
}
InjectRunnerToken.classAnnations = { "name": "InjectRunnerToken", "params": { "constructor": ["type"] } };
exports.InjectRunnerToken = InjectRunnerToken;
/**
 * default runner token.
 */
exports.DefaultRunnerToken = new InjectRunnerToken('default');




});

unwrapExports(IRunner);
var IRunner_1 = IRunner.Runner;
var IRunner_2 = IRunner.Boot;
var IRunner_3 = IRunner.InjectRunnerToken;
var IRunner_4 = IRunner.DefaultRunnerToken;

var Service_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

/**
 * base service.
 *
 * @export
 * @abstract
 * @class Service
 * @implements {IService}
 */
class Service {
    constructor(token, instance, config) {
        this.token = token;
        this.instance = instance;
        this.config = config;
    }
}
Service.classAnnations = { "name": "Service", "params": { "constructor": ["token", "instance", "config"], "start": ["data"], "stop": [] } };
exports.Service = Service;
/**
 * application service token.
 *
 * @export
 * @class InjectServiceToken
 * @extends {Registration<IService<T>>}
 * @template T
 */
class InjectServiceToken extends core_1.Registration {
    constructor(type) {
        super(type, 'boot__service');
    }
}
InjectServiceToken.classAnnations = { "name": "InjectServiceToken", "params": { "constructor": ["type"] } };
exports.InjectServiceToken = InjectServiceToken;
/**
 * default service token.
 */
exports.DefaultServiceToken = new InjectServiceToken('default');




});

unwrapExports(Service_1);
var Service_2 = Service_1.Service;
var Service_3 = Service_1.InjectServiceToken;
var Service_4 = Service_1.DefaultServiceToken;

var runnable = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

tslib_1.__exportStar(IRunner, exports);
tslib_1.__exportStar(Service_1, exports);




});

unwrapExports(runnable);

var IAnnotationBuilder = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

const annoBuilderDesc = 'DI_AnnotationBuilder';
/**
 * inject Annotation class builder.
 *
 * @export
 * @class InjectBootstrapBuilder
 * @extends {Registration<T>}
 * @template T
 */
class InjectAnnotationBuilder extends core_1.Registration {
    constructor(type) {
        super(type, annoBuilderDesc);
    }
}
InjectAnnotationBuilder.classAnnations = { "name": "InjectAnnotationBuilder", "params": { "constructor": ["type"] } };
exports.InjectAnnotationBuilder = InjectAnnotationBuilder;
/**
 * Annotation class builder token.
 */
exports.AnnotationBuilderToken = new core_1.Registration(Object, annoBuilderDesc);
/**
 * Default Annotation class builder token.
 */
exports.DefaultAnnotationBuilderToken = new InjectAnnotationBuilder('default');




});

unwrapExports(IAnnotationBuilder);
var IAnnotationBuilder_1 = IAnnotationBuilder.InjectAnnotationBuilder;
var IAnnotationBuilder_2 = IAnnotationBuilder.AnnotationBuilderToken;
var IAnnotationBuilder_3 = IAnnotationBuilder.DefaultAnnotationBuilderToken;

var AnnotationBuilder_2 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

var AnnotationBuilder_1;



/**
 * Annotation class builder. build class with metadata and config.
 *
 * @export
 * @class AnnotationBuilder
 * @implements {implements IAnnotationBuilder<T>}
 * @template T
 */
let AnnotationBuilder = AnnotationBuilder_1 = class AnnotationBuilder {
    constructor() {
    }
    build(token, config, data) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            if (core_1.isClass(token) && !this.container.hasRegister(token)) {
                this.container.register(token);
            }
            config = this.getTokenMetaConfig(token, config);
            let builder = this.getBuilder(token, config);
            if (!this.isEqual(builder)) {
                return builder.build(token, config, data);
            }
            else {
                yield this.registerExts(config);
                let instance = yield this.createInstance(token, config, data);
                if (!instance) {
                    return null;
                }
                if (core_1.isFunction(instance.anBeforeInit)) {
                    yield Promise.resolve(instance.anBeforeInit(config));
                }
                instance = (yield this.buildStrategy(instance, config, data));
                if (core_1.isFunction(instance.anAfterInit)) {
                    yield Promise.resolve(instance.anAfterInit(config));
                }
                return instance;
            }
        });
    }
    buildByConfig(config, data) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            let token;
            if (core_1.isToken(config)) {
                token = config;
                return this.build(token, null, data);
            }
            else {
                token = this.getType(config);
                return this.build(token, config, data);
            }
        });
    }
    createInstance(token, config, data) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            if (!token) {
                console.log('can not find annotation token.');
                return null;
            }
            if (!this.container.has(token)) {
                console.log(`can not find token ${token ? token.toString() : null} in container.`);
                return null;
            }
            let instance = this.resolveToken(token, data);
            return instance;
        });
    }
    getBuilder(token, config) {
        let builder;
        let providers = [{ provide: core_1.ContainerToken, useValue: this.container }, { provide: core_1.Container, useValue: this.container }];
        if (config && config.annotationBuilder) {
            if (core_1.isClass(config.annotationBuilder)) {
                if (!this.container.has(config.annotationBuilder)) {
                    this.container.register(config.annotationBuilder);
                }
            }
            if (core_1.isToken(config.annotationBuilder)) {
                builder = this.container.resolve(config.annotationBuilder, ...providers);
            }
            else if (config.annotationBuilder instanceof AnnotationBuilder_1) {
                builder = config.annotationBuilder;
            }
        }
        if (!builder && token) {
            builder = this.container.getRefService(IAnnotationBuilder.InjectAnnotationBuilder, token, null, ...providers);
        }
        if (builder && !builder.container) {
            builder.container = this.container;
        }
        return builder || this;
    }
    /**
     * bundle instance via config.
     *
     * @param {T} instance
     * @param {AnnotationConfigure} config
     * @param {IContainer} [container]
     * @returns {Promise<T>}
     * @memberof BootBuilder
     */
    buildStrategy(instance, config, data) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            return instance;
        });
    }
    getType(config) {
        return config.token || config.type;
    }
    /**
     * register extension before create instance.
     *
     * @protected
     * @param {AnnotationConfigure<T>} [config]
     * @memberof AnnotationBuilder
     */
    registerExts(config) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
        });
    }
    getTokenMetaConfig(token, config) {
        let cfg;
        let decorator = config ? config.decorator : null;
        if (core_1.isClass(token)) {
            cfg = this.getMetaConfig(token, decorator);
        }
        else if (core_1.isToken(token)) {
            let tokenType = this.container ? this.container.getTokenImpl(token) : token;
            if (core_1.isClass(tokenType)) {
                cfg = this.getMetaConfig(tokenType, decorator);
            }
        }
        if (cfg) {
            return core_1.lang.assign({}, cfg, config || {});
        }
        else {
            return config || {};
        }
    }
    /**
     * get default decorator.
     *
     * @returns
     * @memberof AnnotationBuilder
     */
    getDecorator() {
        return decorators.Annotation.toString();
    }
    getMetaConfig(token, decorator) {
        let defDecorator = this.getDecorator();
        let accessor = this.container.resolve(core_1.AnnotationMetaAccessorToken, { decorator: decorator ? [decorator, defDecorator] : defDecorator });
        if (accessor) {
            return accessor.getMetadata(token, this.container);
        }
        return null;
    }
    isEqual(build) {
        if (!build) {
            return false;
        }
        if (build === this) {
            return true;
        }
        if (build.constructor === this.constructor) {
            return true;
        }
        return false;
    }
    resolveToken(token, data) {
        return this.container.resolve(token);
    }
};
AnnotationBuilder.classAnnations = { "name": "AnnotationBuilder", "params": { "constructor": [], "build": ["token", "config", "data"], "buildByConfig": ["config", "data"], "createInstance": ["token", "config", "data"], "getBuilder": ["token", "config"], "buildStrategy": ["instance", "config", "data"], "getType": ["config"], "registerExts": ["config"], "getTokenMetaConfig": ["token", "config"], "getDecorator": [], "getMetaConfig": ["token", "decorator"], "isEqual": ["build"], "resolveToken": ["token", "data"] } };
tslib_1.__decorate([
    core_1.Inject(core_1.ContainerToken),
    tslib_1.__metadata("design:type", Object)
], AnnotationBuilder.prototype, "container", void 0);
AnnotationBuilder = AnnotationBuilder_1 = tslib_1.__decorate([
    core_1.Injectable(IAnnotationBuilder.AnnotationBuilderToken),
    tslib_1.__metadata("design:paramtypes", [])
], AnnotationBuilder);
exports.AnnotationBuilder = AnnotationBuilder;




});

unwrapExports(AnnotationBuilder_2);
var AnnotationBuilder_3 = AnnotationBuilder_2.AnnotationBuilder;

var annotations = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

tslib_1.__exportStar(AnnotationBuilder_2, exports);
tslib_1.__exportStar(IAnnotationBuilder, exports);




});

unwrapExports(annotations);

var ModuleBuilder_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });









/**
 * inject module load token.
 *
 * @export
 * @class InjectModuleLoadToken
 * @extends {Registration<T>}
 * @template T
 */
class InjectModuleLoadToken extends core_1.Registration {
    constructor(token) {
        super(token, 'module_loader');
    }
}
InjectModuleLoadToken.classAnnations = { "name": "InjectModuleLoadToken", "params": { "constructor": ["token"] } };
exports.InjectModuleLoadToken = InjectModuleLoadToken;
/**
 * module builder
 *
 * @export
 * @class ModuleBuilder
 * @implements {IModuleBuilder}
 * @template T
 */
let ModuleBuilder = class ModuleBuilder {
    constructor() {
    }
    getPools() {
        return this.pools;
    }
    /**
     * build module.
     *
     * @param {(Token<T> | ModuleConfig<T>)} token
     * @param {ModuleEnv} [env]
     * @param {*} [data] bootstrap data, build data, Runnable data.
     * @returns {Promise<T>}
     * @memberof ModuleBuilder
     */
    build(token, env, data) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            let injmdl = yield this.load(token, env);
            let container = injmdl.container;
            let cfg = injmdl.config;
            let annBuilder = this.getAnnoBuilder(container, injmdl.token, cfg.annotationBuilder);
            if (!injmdl.token) {
                let instance = yield annBuilder.buildByConfig(cfg, data);
                return instance;
            }
            else {
                let instance = yield annBuilder.build(injmdl.token, cfg, data);
                let mdlInst = instance;
                if (mdlInst && core_1.isFunction(mdlInst.mdOnInit)) {
                    mdlInst.mdOnInit(injmdl);
                }
                return instance;
            }
        });
    }
    /**
    * bootstrap module's main.
    *
    * @param {(Token<T> | ModuleConfig<T>)} token
    * @param {ModuleEnv} [env]
    * @param {*} [data] bootstrap data, build data, Runnable data.
    * @returns {Promise<MdInstance<T>>}
    * @memberof ModuleBuilder
    */
    bootstrap(token, env, data) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            let injmdl = yield this.load(token, env);
            let cfg = injmdl.config;
            let container = injmdl.container;
            let md = yield this.build(token, injmdl, data);
            let bootToken = this.getBootType(cfg);
            let anBuilder = this.getAnnoBuilder(container, bootToken, cfg.annotationBuilder);
            let bootInstance = yield (bootToken ? anBuilder.build(bootToken, cfg, data) : anBuilder.buildByConfig(cfg, data));
            let runable;
            if (bootInstance) {
                runable = yield this.autoRun(container, bootToken ? bootToken : anBuilder.getType(cfg), cfg, bootInstance, data);
                if (md && core_1.isFunction(md.mdOnStart)) {
                    yield Promise.resolve(md.mdOnStart(bootInstance));
                }
            }
            else {
                runable = yield this.autoRun(container, injmdl.token, cfg, md, data);
            }
            return runable;
        });
    }
    import(token, parent) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            if (!parent) {
                parent = yield this.getParentContainer();
            }
            let type = core_1.isClass(token) ? token : parent.getTokenImpl(token);
            if (core_1.isClass(type)) {
                let key = new InjectedModule_1.InjectedModuleToken(type);
                if (parent.hasRegister(key.toString())) {
                    return parent.get(key);
                }
                else {
                    yield parent.loadModule(type);
                    if (parent.has(key)) {
                        return parent.get(key);
                    }
                }
            }
            return null;
        });
    }
    load(token, env) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            if (env instanceof InjectedModule_1.InjectedModule) {
                return env;
            }
            let injmdl = null;
            let parent = yield this.getParentContainer(env);
            if (core_1.isToken(token)) {
                injmdl = yield this.import(token, parent);
                if (!injmdl) {
                    let cfg = parent.get(core_1.AnnotationMetaAccessorToken).getMetadata(token, parent);
                    injmdl = new InjectedModule_1.InjectedModule(token, cfg, parent);
                }
            }
            else {
                let mdtype = this.getType(token);
                if (core_1.isToken(mdtype)) {
                    injmdl = yield this.import(mdtype, parent);
                    if (injmdl instanceof InjectedModule_1.InjectedModule) {
                        let container = injmdl.container;
                        let injector = container.get(DIModuleInjector_1.DIModuleInjectorToken);
                        yield injector.importByConfig(container, token);
                        injmdl.config = core_1.lang.assign(injmdl.config, token);
                    }
                }
                else {
                    mdtype = null;
                }
                if (!injmdl) {
                    let injector = parent.get(DIModuleInjector_1.DIModuleInjectorToken);
                    yield injector.importByConfig(parent, token);
                    injmdl = new InjectedModule_1.InjectedModule(mdtype, token, parent);
                }
            }
            return injmdl;
        });
    }
    getParentContainer(env) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            let parent;
            if (env) {
                if (env instanceof core_1.Container) {
                    parent = env;
                }
                else if (env instanceof InjectedModule_1.InjectedModule) {
                    parent = env.container.parent;
                }
            }
            if (!parent) {
                parent = this.getPools().getDefault();
            }
            return parent;
        });
    }
    autoRun(container, token, cfg, instance, data) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            if (!instance) {
                return null;
            }
            if (instance instanceof runnable.Runner) {
                yield instance.run(data);
                return instance;
            }
            else if (instance instanceof runnable.Service) {
                yield instance.start(data);
                return instance;
            }
            else {
                let providers = [{ provide: token, useValue: instance }, { token: token, instance: instance, config: cfg }];
                let runner = container.getRefService(runnable.InjectRunnerToken, token, runnable.DefaultRunnerToken, ...providers);
                let service;
                if (!runner) {
                    service = container.getRefService(runnable.InjectServiceToken, token, runnable.DefaultServiceToken, ...providers);
                    if (!service) {
                        runner = this.getDefaultRunner(container, ...providers);
                    }
                }
                if (!runner && !service) {
                    this.getDefaultService(container, ...providers);
                }
                if (runner) {
                    yield runner.run(data);
                    return runner;
                }
                else if (service) {
                    yield service.start(data);
                    return service;
                }
                else if (token && cfg.autorun) {
                    yield container.invoke(token, cfg.autorun, instance, { data: data });
                    return instance;
                }
                else {
                    return instance;
                }
            }
        });
    }
    getDefaultRunner(container, ...providers) {
        return null;
    }
    getDefaultService(container, ...providers) {
        return null;
    }
    getAnnoBuilder(container, token, annBuilder) {
        let builder;
        if (!builder && token) {
            builder = container.getRefService(annotations.InjectAnnotationBuilder, token, annotations.DefaultAnnotationBuilderToken);
        }
        if (core_1.isClass(annBuilder)) {
            if (!container.has(annBuilder)) {
                container.register(annBuilder);
            }
        }
        if (core_1.isToken(annBuilder)) {
            builder = container.resolve(annBuilder);
        }
        else if (annBuilder instanceof annotations.AnnotationBuilder) {
            builder = annBuilder;
        }
        if (!builder) {
            builder = this.getDefaultAnnBuilder(container);
        }
        if (builder) {
            builder.container = container;
        }
        return builder;
    }
    getDefaultAnnBuilder(container) {
        return container.resolve(annotations.AnnotationBuilderToken);
    }
    /**
     * get module type
     *
     * @protected
     * @param {ModuleConfigure} cfg
     * @returns {Token<T>}
     * @memberof ModuleBuilder
     */
    getType(cfg) {
        return cfg.token || cfg.type;
    }
    /**
     * get boot type.
     *
     * @protected
     * @param {ModuleConfigure} cfg
     * @returns {Token<T>}
     * @memberof ModuleBuilder
     */
    getBootType(cfg) {
        return cfg.bootstrap;
    }
};
ModuleBuilder.classAnnations = { "name": "ModuleBuilder", "params": { "constructor": [], "getPools": [], "build": ["token", "env", "data"], "bootstrap": ["token", "env", "data"], "import": ["token", "parent"], "load": ["token", "env"], "getParentContainer": ["env"], "autoRun": ["container", "token", "cfg", "instance", "data"], "getDefaultRunner": ["container", "providers"], "getDefaultService": ["container", "providers"], "getAnnoBuilder": ["container", "token", "annBuilder"], "getDefaultAnnBuilder": ["container"], "getType": ["cfg"], "getBootType": ["cfg"] } };
tslib_1.__decorate([
    core_1.Inject(utils.ContainerPoolToken),
    tslib_1.__metadata("design:type", utils.ContainerPool)
], ModuleBuilder.prototype, "pools", void 0);
ModuleBuilder = tslib_1.__decorate([
    core_1.Singleton(IModuleBuilder.ModuleBuilderToken),
    tslib_1.__metadata("design:paramtypes", [])
], ModuleBuilder);
exports.ModuleBuilder = ModuleBuilder;




});

unwrapExports(ModuleBuilder_1);
var ModuleBuilder_2 = ModuleBuilder_1.InjectModuleLoadToken;
var ModuleBuilder_3 = ModuleBuilder_1.ModuleBuilder;

var modules = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

tslib_1.__exportStar(DIModuleInjector_1, exports);
tslib_1.__exportStar(DIModuleValidate, exports);
tslib_1.__exportStar(InjectedModule_1, exports);
tslib_1.__exportStar(IModuleBuilder, exports);
tslib_1.__exportStar(ModuleBuilder_1, exports);




});

unwrapExports(modules);

var BootModule_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });






/**
 * Bootstrap ext for ioc. auto run setup after registered.
 * with @IocExt('setup') decorator.
 * @export
 * @class BootModule
 */
let BootModule = class BootModule {
    constructor(container) {
        this.container = container;
    }
    /**
     * register aop for container.
     *
     * @memberof AopModule
     */
    setup() {
        let container = this.container;
        let lifeScope = container.get(core_1.LifeScopeToken);
        lifeScope.registerDecorator(decorators.DIModule, core_1.CoreActions.bindProvider, core_1.CoreActions.cache, core_1.CoreActions.componentBeforeInit, core_1.CoreActions.componentInit, core_1.CoreActions.componentAfterInit);
        lifeScope.registerDecorator(decorators.Bootstrap, core_1.CoreActions.bindProvider, core_1.CoreActions.cache, core_1.CoreActions.componentBeforeInit, core_1.CoreActions.componentInit, core_1.CoreActions.componentAfterInit);
        container.use(annotations, modules, boot);
    }
};
BootModule.classAnnations = { "name": "BootModule", "params": { "constructor": ["container"], "setup": [] } };
BootModule = tslib_1.__decorate([
    core_1.IocExt('setup'),
    tslib_1.__param(0, core_1.Inject(core_1.ContainerToken)),
    tslib_1.__metadata("design:paramtypes", [Object])
], BootModule);
exports.BootModule = BootModule;




});

unwrapExports(BootModule_1);
var BootModule_2 = BootModule_1.BootModule;

var ApplicationBuilder = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });






var ApplicationEvents;
(function (ApplicationEvents) {
    ApplicationEvents["onRootContainerCreated"] = "onRootContainerCreated";
    ApplicationEvents["onRootContainerInited"] = "onRooConatianerInited";
})(ApplicationEvents = exports.ApplicationEvents || (exports.ApplicationEvents = {}));
/**
 * application builder.
 *
 * @export
 * @class Default ApplicationBuilder
 * @extends {ModuleBuilder}
 * @template T
 */
class DefaultApplicationBuilder extends modules.ModuleBuilder {
    constructor(baseURL) {
        super();
        this.baseURL = baseURL;
        this.inited = false;
        this.customRegs = [];
        this.globalModules = [];
        this.configs = [];
        this.beforeInitPds = new core_1.MapSet();
        this.afterInitPds = new core_1.MapSet();
        this.events = new utils.Events();
        this.initEvents();
    }
    initEvents() {
        this.events.on('onRooConatianerInited', (container) => {
            this.afterInitPds.forEach((val, key) => {
                container.bindProvider(key, val);
            });
        });
    }
    static create(baseURL) {
        return new DefaultApplicationBuilder(baseURL);
    }
    on(name, event) {
        this.events.on(name, event);
        return this;
    }
    off(name, event) {
        this.events.off(name, event);
        return this;
    }
    emit(name, ...args) {
        this.events.emit(name, ...args);
    }
    getPools() {
        if (!this.pools) {
            this.pools = new utils.ContainerPool(this.createContainerBuilder());
            this.createDefaultContainer();
        }
        return this.pools;
    }
    createContainerBuilder() {
        return new core_1.DefaultContainerBuilder();
    }
    /**
     * use configuration.
     *
     * @param {(string | AppConfigure)} [config]
     * @returns {this} global config for this application.
     * @memberof Bootstrap
     */
    useConfiguration(config) {
        if (core_1.isUndefined(config)) {
            config = '';
        }
        // clean cached config.
        this.globalConfig = null;
        let idx = this.configs.indexOf(config);
        if (idx >= 0) {
            this.configs.splice(idx, 1);
        }
        this.configs.push(config);
        return this;
    }
    loadConfig(container, src) {
        if (container.has(AppConfigure.AppConfigureLoaderToken)) {
            let loader = container.resolve(AppConfigure.AppConfigureLoaderToken, { baseURL: this.baseURL, container: container });
            return loader.load(src);
        }
        else if (src) {
            let builder = container.getBuilder();
            return builder.loader.load([src])
                .then(rs => {
                return rs.length ? rs[0] : null;
            });
        }
        else {
            return Promise.resolve(null);
        }
    }
    /**
     * use module as global Depdences module.
     *
     * @param {...LoadType[]} modules
     * @returns {this}
     * @memberof PlatformServer
     */
    use(...modules$$1) {
        this.globalModules = this.globalModules.concat(modules$$1);
        this.inited = false;
        return this;
    }
    /**
     * bind provider
     *
     * @template T
     * @param {Token<T>} provide
     * @param {Token<T> | Factory<T>} provider
     * @param {boolean} [beforRootInit]
     * @returns {this}
     * @memberof IContainer
     */
    provider(provide, provider, beforRootInit) {
        if (beforRootInit) {
            this.beforeInitPds.set(provide, provider);
        }
        else {
            this.afterInitPds.set(provide, provider);
        }
        return this;
    }
    load(token, env) {
        const _super = name => super[name];
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            yield this.initRootContainer();
            return _super("load").call(this, token, env);
        });
    }
    build(token, env, data) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            let injmdl = yield this.load(token, env);
            let builder = this.getBuilder(injmdl);
            return yield builder.build(token, injmdl, data);
        });
    }
    bootstrap(token, env, data) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            let injmdl = yield this.load(token, env);
            let builder = this.getBuilder(injmdl);
            return yield builder.bootstrap(token, injmdl, data);
        });
    }
    /**
     * get module builder
     *
     * @param {(Token<T> | ModuleConfig<T>)} token
     * @param {ModuleEnv} [env]
     * @returns {IModuleBuilder<T>}
     * @memberof IApplicationBuilder
     */
    getBuilderByConfig(token, env) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            let injmdl = yield this.load(token, env);
            return this.getBuilder(injmdl);
        });
    }
    getBuilder(injmdl) {
        let cfg = injmdl.config;
        let container = injmdl.container;
        let builder;
        if (cfg) {
            if (core_1.isClass(cfg.builder)) {
                if (!container.has(cfg.builder)) {
                    container.register(cfg.builder);
                }
            }
            if (core_1.isToken(cfg.builder)) {
                builder = container.resolve(cfg.builder);
            }
            else if (cfg.builder instanceof modules.ModuleBuilder) {
                builder = cfg.builder;
            }
        }
        let tko = injmdl.token;
        if (!builder && tko) {
            builder = container.getRefService(modules.InjectModuleBuilderToken, tko, modules.DefaultModuleBuilderToken);
        }
        if (!builder) {
            builder = this.getDefaultBuilder(container);
        }
        return builder || this;
    }
    getDefaultBuilder(container) {
        return container.resolve(modules.ModuleBuilderToken);
    }
    getGlobalConfig(container) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            if (!this.globalConfig) {
                let globCfg = yield this.getDefaultConfig(container);
                if (this.configs.length < 1) {
                    this.configs.push(''); // load default loader config.
                }
                let exts = yield Promise.all(this.configs.map(cfg => {
                    if (core_1.isString(cfg)) {
                        return this.loadConfig(container, cfg);
                    }
                    else {
                        return cfg;
                    }
                }));
                exts.forEach(exCfg => {
                    if (exCfg) {
                        core_1.lang.assign(globCfg, exCfg);
                    }
                });
                this.globalConfig = globCfg;
            }
            return this.globalConfig;
        });
    }
    createDefaultContainer() {
        let container = this.pools.getDefault();
        container.register(BootModule_1.BootModule);
        let chain = container.getBuilder().getInjectorChain(container);
        chain.first(container.resolve(modules.DIModuleInjectorToken));
        container.bindProvider(utils.ContainerPoolToken, () => this.getPools());
        this.beforeInitPds.forEach((val, key) => {
            container.bindProvider(key, val);
        });
        this.events.emit(ApplicationEvents.onRootContainerCreated, container);
        return container;
    }
    initRootContainer(container) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            if (this.inited) {
                return;
            }
            container = container || this.getPools().getDefault();
            let globCfg = yield this.getGlobalConfig(container);
            yield this.registerExts(container, globCfg);
            this.bindAppConfig(globCfg);
            container.bindProvider(AppConfigure.AppConfigureToken, globCfg);
            this.inited = true;
            this.events.emit(ApplicationEvents.onRootContainerInited, container);
        });
    }
    /**
     * register ioc exts
     *
     * @protected
     * @param {IContainer} container
     * @param {AppConfigure} config
     * @returns {Promise<IContainer>}
     * @memberof ApplicationBuilder
     */
    registerExts(container, config) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            if (this.globalModules.length) {
                let usedModules = this.globalModules;
                yield container.loadModule(...usedModules);
            }
            if (this.customRegs.length) {
                yield Promise.all(this.customRegs.map((cs) => tslib_1.__awaiter(this, void 0, void 0, function* () {
                    let tokens = yield cs(container, config, this);
                    return tokens;
                })));
            }
            return container;
        });
    }
    bindAppConfig(config) {
        if (this.baseURL) {
            config.baseURL = this.baseURL;
        }
        return config;
    }
    getDefaultConfig(container) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            if (container.has(AppConfigure.DefaultConfigureToken)) {
                return container.resolve(AppConfigure.DefaultConfigureToken);
            }
            else {
                return {};
            }
        });
    }
}
DefaultApplicationBuilder.classAnnations = { "name": "DefaultApplicationBuilder", "params": { "constructor": ["baseURL"], "initEvents": [], "create": ["baseURL"], "on": ["name", "event"], "off": ["name", "event"], "emit": ["name", "args"], "getPools": [], "createContainerBuilder": [], "useConfiguration": ["config"], "loadConfig": ["container", "src"], "use": ["modules"], "provider": ["provide", "provider", "beforRootInit"], "load": ["token", "env"], "build": ["token", "env", "data"], "bootstrap": ["token", "env", "data"], "getBuilderByConfig": ["token", "env"], "getBuilder": ["injmdl"], "getDefaultBuilder": ["container"], "getGlobalConfig": ["container"], "createDefaultContainer": [], "initRootContainer": ["container"], "registerExts": ["container", "config"], "bindAppConfig": ["config"], "getDefaultConfig": ["container"] } };
exports.DefaultApplicationBuilder = DefaultApplicationBuilder;




});

unwrapExports(ApplicationBuilder);
var ApplicationBuilder_1 = ApplicationBuilder.ApplicationEvents;
var ApplicationBuilder_2 = ApplicationBuilder.DefaultApplicationBuilder;

var IApplicationBuilder = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

exports.ApplicationBuilderToken = new core_1.InjectToken('DI_AppBuilder');




});

unwrapExports(IApplicationBuilder);
var IApplicationBuilder_1 = IApplicationBuilder.ApplicationBuilderToken;

var boot = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

tslib_1.__exportStar(AppConfigure, exports);
tslib_1.__exportStar(ApplicationBuilder, exports);
tslib_1.__exportStar(IApplicationBuilder, exports);




});

unwrapExports(boot);

var D__workspace_github_tsioc_packages_bootstrap_esnext = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

tslib_1.__exportStar(decorators, exports);
tslib_1.__exportStar(boot, exports);
tslib_1.__exportStar(annotations, exports);
tslib_1.__exportStar(modules, exports);
tslib_1.__exportStar(runnable, exports);
tslib_1.__exportStar(utils, exports);
tslib_1.__exportStar(BootModule_1, exports);




});

var index$6 = unwrapExports(D__workspace_github_tsioc_packages_bootstrap_esnext);

return index$6;

})));

//# sourceMappingURL=sourcemaps/bootstrap.js.map

//# sourceMappingURL=sourcemaps/bootstrap.js.map
