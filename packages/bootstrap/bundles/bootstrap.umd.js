(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('tslib'), require('@ts-ioc/core'), require('reflect-metadata')) :
	typeof define === 'function' && define.amd ? define(['tslib', '@ts-ioc/core', 'reflect-metadata'], factory) :
	(global.bootstrap = global.bootstrap || {}, global.bootstrap.umd = global.bootstrap.umd || {}, global.bootstrap.umd.js = factory(global.tslib_1,global.core_1,global.Reflect));
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
    return core_1.createClassDecorator(name, function (args) {
        if (adapter) {
            adapter(args);
        }
    }, function (metadata) {
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
    return core_1.createClassDecorator(name, function (args) {
        if (adapter) {
            adapter(args);
        }
    }, function (metadata) {
        if (metadataExtends) {
            metadata = metadataExtends(metadata);
        }
        if (!metadata.name && core_1.isClass(metadata.token)) {
            var isuglify = /^[a-z]$/.test(metadata.token.name);
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
    return DIModule.createDIModuleDecorator(name, builder, annotationBuilder, adapter, function (metadata) {
        if (metadataExtends) {
            metadataExtends(metadata);
        }
        if (metadata.builder) {
            setTimeout(function () {
                var builderType = metadata.builder;
                var builder;
                if (core_1.isClass(builderType)) {
                    builder = core_1.isFunction(builderType['create']) ? builderType['create']() : new builderType();
                }
                else if (core_1.isObject(builderType)) {
                    builder = builderType;
                }
                if (builder) {
                    if (metadata.globals) {
                        builder.use.apply(builder, metadata.globals);
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
var DIModuelValidate = /** @class */ (function (_super) {
    tslib_1.__extends(DIModuelValidate, _super);
    function DIModuelValidate() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    DIModuelValidate.prototype.getDecorator = function () {
        return decorators.DIModule.toString();
    };
    DIModuelValidate.classAnnations = { "name": "DIModuelValidate", "params": { "getDecorator": [] } };
    DIModuelValidate = tslib_1.__decorate([
        core_1.Singleton(exports.DIModuelValidateToken)
    ], DIModuelValidate);
    return DIModuelValidate;
}(core_1.BaseModuelValidate));
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
var ContainerPool = /** @class */ (function () {
    function ContainerPool() {
        this.pools = new core_1.MapSet();
    }
    ContainerPool.prototype.getTokenKey = function (token) {
        if (token instanceof core_1.Registration) {
            return token.toString();
        }
        return token;
    };
    ContainerPool.prototype.isDefault = function (container) {
        return container === this.defaults;
    };
    ContainerPool.prototype.hasDefault = function () {
        return !!this.defaults;
    };
    ContainerPool.prototype.setDefault = function (container) {
        this.defaults = container;
    };
    ContainerPool.prototype.getDefault = function () {
        return this.defaults;
    };
    ContainerPool.prototype.set = function (token, container) {
        var key = this.getTokenKey(token);
        if (this.pools.has(token)) {
            console.log(token.toString() + " module has loaded");
        }
        this.pools.set(token, container);
    };
    ContainerPool.prototype.get = function (token) {
        var key = this.getTokenKey(token);
        if (!this.has(key)) {
            return null;
        }
        return this.pools.get(token);
    };
    ContainerPool.prototype.has = function (token) {
        return this.pools.has(this.getTokenKey(token));
    };
    ContainerPool.prototype.create = function (parent) {
        parent = parent || this.getDefault();
        var container = parent.getBuilder().create();
        this.setParent(container, parent);
        return container;
    };
    ContainerPool.prototype.setParent = function (container, parent) {
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
    };
    ContainerPool.classAnnations = { "name": "ContainerPool", "params": { "constructor": [], "getTokenKey": ["token"], "isDefault": ["container"], "hasDefault": [], "setDefault": ["container"], "getDefault": [], "set": ["token", "container"], "get": ["token"], "has": ["token"], "create": ["parent"], "setParent": ["container", "parent"] } };
    return ContainerPool;
}());
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
var Events = /** @class */ (function () {
    function Events() {
        this.eventsMap = {};
    }
    Events.prototype.on = function (name, event) {
        this.eventsMap[name] = this.eventsMap[name] || [];
        if (this.eventsMap[name].indexOf(event) < 0) {
            this.eventsMap[name].push(event);
        }
        return this;
    };
    Events.prototype.off = function (name, event) {
        if (this.eventsMap[name]) {
            if (event) {
                this.eventsMap[name].splice(this.eventsMap[name].indexOf(event), 1);
            }
            else {
                delete this.eventsMap[name];
            }
        }
        return this;
    };
    Events.prototype.emit = function (name) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        var events = this.eventsMap[name];
        if (core_1.isArray(events)) {
            events.forEach(function (ev) {
                ev.apply(void 0, args);
            });
        }
    };
    Events.classAnnations = { "name": "Events", "params": { "constructor": [], "on": ["name", "event"], "off": ["name", "event"], "emit": ["name", "args"] } };
    return Events;
}());
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
var InjectedModule = /** @class */ (function () {
    function InjectedModule(token, config, container, type, exports, providers) {
        this.token = token;
        this.config = config;
        this.container = container;
        this.type = type;
        this.exports = exports;
        this.providers = providers;
    }
    InjectedModule.classAnnations = { "name": "InjectedModule", "params": { "constructor": ["token", "config", "container", "type", "exports", "providers"] } };
    return InjectedModule;
}());
exports.InjectedModule = InjectedModule;
/**
 * Injected Module Token.
 *
 * @export
 * @class InjectModuleMetaConfigToken
 * @extends {Registration<Type<T>>}
 * @template T
 */
var InjectedModuleToken = /** @class */ (function (_super) {
    tslib_1.__extends(InjectedModuleToken, _super);
    function InjectedModuleToken(type) {
        return _super.call(this, type, 'InjectedModule') || this;
    }
    InjectedModuleToken.classAnnations = { "name": "InjectedModuleToken", "params": { "constructor": ["type"] } };
    return InjectedModuleToken;
}(core_1.Registration));
exports.InjectedModuleToken = InjectedModuleToken;


});

unwrapExports(InjectedModule_1);
var InjectedModule_2 = InjectedModule_1.InjectedModule;
var InjectedModule_3 = InjectedModule_1.InjectedModuleToken;

var DIModuleInjector_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });






var exportsProvidersFiled = '__exportProviders';
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
var DIModuleInjector = /** @class */ (function (_super) {
    tslib_1.__extends(DIModuleInjector, _super);
    function DIModuleInjector(validate) {
        return _super.call(this, validate) || this;
    }
    DIModuleInjector.prototype.setup = function (container, type) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.importModule(container, type)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    DIModuleInjector.prototype.import = function (container, type) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var injMd;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.validate.validate(type)) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.importModule(container, type)];
                    case 1:
                        injMd = _a.sent();
                        return [2 /*return*/, injMd];
                    case 2: return [2 /*return*/, null];
                }
            });
        });
    };
    DIModuleInjector.prototype.importByConfig = function (container, config) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.registerConfgureDepds(container, config)];
                    case 1:
                        _a.sent();
                        if (!(core_1.isArray(config.providers) && config.providers.length)) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.bindProvider(container, config.providers)];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3: return [2 /*return*/, null];
                }
            });
        });
    };
    DIModuleInjector.prototype.importModule = function (container, type) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var pools, newContainer, metaConfig, injMd;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        pools = container.get(utils.ContainerPoolToken);
                        newContainer = pools.create(container);
                        newContainer.register(type);
                        metaConfig = this.validate.getMetaConfig(type, newContainer);
                        return [4 /*yield*/, this.registerConfgureDepds(newContainer, metaConfig)];
                    case 1:
                        metaConfig = _a.sent();
                        injMd = new InjectedModule_1.InjectedModule(metaConfig.token || type, metaConfig, newContainer, type, metaConfig.exports || [], metaConfig[exportsProvidersFiled]);
                        container.bindProvider(new InjectedModule_1.InjectedModuleToken(type), injMd);
                        return [4 /*yield*/, this.importConfigExports(container, newContainer, injMd)];
                    case 2:
                        _a.sent();
                        return [2 /*return*/, injMd];
                }
            });
        });
    };
    DIModuleInjector.prototype.registerConfgureDepds = function (container, config) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(core_1.isArray(config.imports) && config.imports.length)) return [3 /*break*/, 2];
                        return [4 /*yield*/, container.loadModule.apply(container, config.imports)];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2:
                        if (core_1.isArray(config.providers) && config.providers.length) {
                            config[exportsProvidersFiled] = this.bindProvider(container, config.providers);
                        }
                        return [2 /*return*/, config];
                }
            });
        });
    };
    DIModuleInjector.prototype.importConfigExports = function (container, providerContainer, injMd) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var expchs;
            return tslib_1.__generator(this, function (_a) {
                if (container === providerContainer) {
                    return [2 /*return*/, container];
                }
                if (injMd) {
                    container.resolvers.next(injMd);
                    if (injMd.exports && injMd.exports.length) {
                        expchs = providerContainer.resolvers.toArray().filter(function (r) {
                            if (r instanceof core_1.Container) {
                                return false;
                            }
                            else {
                                return injMd.exports.indexOf(r.type) >= 0;
                            }
                        });
                        expchs.forEach(function (r) {
                            container.resolvers.next(r);
                        });
                    }
                }
                return [2 /*return*/, container];
            });
        });
    };
    DIModuleInjector.prototype.bindProvider = function (container, providers) {
        var tokens = [];
        providers.forEach(function (p, index) {
            if (core_1.isUndefined(p) || core_1.isNull(p)) {
                return;
            }
            if (core_1.isProviderMap(p)) {
                p.forEach(function (k, f) {
                    tokens.push(k);
                    container.bindProvider(k, f);
                });
            }
            else if (p instanceof core_1.Provider) {
                tokens.push(p.type);
                container.bindProvider(p.type, function () {
                    var providers = [];
                    for (var _i = 0; _i < arguments.length; _i++) {
                        providers[_i] = arguments[_i];
                    }
                    return p.resolve.apply(p, [container].concat(providers));
                });
            }
            else if (core_1.isClass(p)) {
                if (!container.has(p)) {
                    tokens.push(p);
                    container.register(p);
                }
            }
            else if (core_1.isBaseObject(p)) {
                var pr_1 = p;
                var isobjMap = false;
                if (core_1.isToken(pr_1.provide)) {
                    if (core_1.isArray(pr_1.deps) && pr_1.deps.length) {
                        pr_1.deps.forEach(function (d) {
                            if (core_1.isClass(d) && !container.has(d)) {
                                container.register(d);
                            }
                        });
                    }
                    if (!core_1.isUndefined(pr_1.useValue)) {
                        tokens.push(pr_1.provide);
                        container.bindProvider(pr_1.provide, function () { return pr_1.useValue; });
                    }
                    else if (core_1.isClass(pr_1.useClass)) {
                        if (!container.has(pr_1.useClass)) {
                            container.register(pr_1.useClass);
                        }
                        tokens.push(pr_1.provide);
                        container.bindProvider(pr_1.provide, pr_1.useClass);
                    }
                    else if (core_1.isFunction(pr_1.useFactory)) {
                        tokens.push(pr_1.provide);
                        container.bindProvider(pr_1.provide, function () {
                            var args = [];
                            if (core_1.isArray(pr_1.deps) && pr_1.deps.length) {
                                args = pr_1.deps.map(function (d) {
                                    if (core_1.isClass(d)) {
                                        return container.get(d);
                                    }
                                    else {
                                        return d;
                                    }
                                });
                            }
                            return pr_1.useFactory.apply(pr_1, args);
                        });
                    }
                    else if (core_1.isToken(pr_1.useExisting)) {
                        if (container.has(pr_1.useExisting)) {
                            tokens.push(pr_1.provide);
                            container.bindProvider(pr_1.provide, pr_1.useExisting);
                        }
                        else {
                            console.log('has not register:', pr_1.useExisting);
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
                    core_1.lang.forIn(p, function (val, name) {
                        if (!core_1.isUndefined(val)) {
                            if (core_1.isClass(val)) {
                                container.bindProvider(name, val);
                            }
                            else if (core_1.isFunction(val) || core_1.isString(val)) {
                                container.bindProvider(name, function () { return val; });
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
                container.bindProvider(name, function () { return p; });
            }
        });
        return tokens;
    };
    DIModuleInjector.classAnnations = { "name": "DIModuleInjector", "params": { "constructor": ["validate"], "setup": ["container", "type"], "import": ["container", "type"], "importByConfig": ["container", "config"], "importModule": ["container", "type"], "registerConfgureDepds": ["container", "config"], "importConfigExports": ["container", "providerContainer", "injMd"], "bindProvider": ["container", "providers"] } };
    DIModuleInjector = tslib_1.__decorate([
        core_1.Injectable(exports.DIModuleInjectorToken),
        tslib_1.__param(0, core_1.Inject(DIModuleValidate.DIModuelValidateToken)),
        tslib_1.__metadata("design:paramtypes", [Object])
    ], DIModuleInjector);
    return DIModuleInjector;
}(core_1.ModuleInjector));
exports.DIModuleInjector = DIModuleInjector;


});

unwrapExports(DIModuleInjector_1);
var DIModuleInjector_2 = DIModuleInjector_1.DIModuleInjectorToken;
var DIModuleInjector_3 = DIModuleInjector_1.DIModuleInjector;

var IModuleBuilder = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });


var moduleBuilderDesc = 'DI_ModuleBuilder';
/**
 * inject module builder token.
 *
 * @export
 * @class InjectModuleBuilder
 * @extends {Registration<T>}
 * @template T
 */
var InjectModuleBuilderToken = /** @class */ (function (_super) {
    tslib_1.__extends(InjectModuleBuilderToken, _super);
    function InjectModuleBuilderToken(type) {
        return _super.call(this, type, moduleBuilderDesc) || this;
    }
    InjectModuleBuilderToken.classAnnations = { "name": "InjectModuleBuilderToken", "params": { "constructor": ["type"] } };
    return InjectModuleBuilderToken;
}(core_1.Registration));
exports.InjectModuleBuilderToken = InjectModuleBuilderToken;
/**
 * default module builder token.
 */
exports.DefaultModuleBuilderToken = new InjectModuleBuilderToken(Object);
/**
 * module builder token.
 */
exports.ModuleBuilderToken = new core_1.Registration(Object, moduleBuilderDesc);


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
var Boot = /** @class */ (function () {
    function Boot() {
    }
    Boot.classAnnations = { "name": "Boot", "params": { "run": ["app"] } };
    return Boot;
}());
exports.Boot = Boot;
/**
 * application runner token.
 *
 * @export
 * @class InjectRunnerToken
 * @extends {Registration<IRunner<T>>}
 * @template T
 */
var InjectRunnerToken = /** @class */ (function (_super) {
    tslib_1.__extends(InjectRunnerToken, _super);
    function InjectRunnerToken(type) {
        return _super.call(this, type, 'boot__runner') || this;
    }
    InjectRunnerToken.classAnnations = { "name": "InjectRunnerToken", "params": { "constructor": ["type"] } };
    return InjectRunnerToken;
}(core_1.Registration));
exports.InjectRunnerToken = InjectRunnerToken;
/**
 * default runner token.
 */
exports.DefaultRunnerToken = new InjectRunnerToken('default');


});

unwrapExports(IRunner);
var IRunner_1 = IRunner.Boot;
var IRunner_2 = IRunner.InjectRunnerToken;
var IRunner_3 = IRunner.DefaultRunnerToken;

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
var Service = /** @class */ (function () {
    function Service() {
    }
    Service.classAnnations = { "name": "Service", "params": { "start": [], "stop": [] } };
    return Service;
}());
exports.Service = Service;
/**
 * application service token.
 *
 * @export
 * @class InjectServiceToken
 * @extends {Registration<IService<T>>}
 * @template T
 */
var InjectServiceToken = /** @class */ (function (_super) {
    tslib_1.__extends(InjectServiceToken, _super);
    function InjectServiceToken(type) {
        return _super.call(this, type, 'boot__service') || this;
    }
    InjectServiceToken.classAnnations = { "name": "InjectServiceToken", "params": { "constructor": ["type"] } };
    return InjectServiceToken;
}(core_1.Registration));
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


var annoBuilderDesc = 'DI_AnnotationBuilder';
/**
 * inject Annotation class builder.
 *
 * @export
 * @class InjectBootstrapBuilder
 * @extends {Registration<T>}
 * @template T
 */
var InjectAnnotationBuilder = /** @class */ (function (_super) {
    tslib_1.__extends(InjectAnnotationBuilder, _super);
    function InjectAnnotationBuilder(type) {
        return _super.call(this, type, annoBuilderDesc) || this;
    }
    InjectAnnotationBuilder.classAnnations = { "name": "InjectAnnotationBuilder", "params": { "constructor": ["type"] } };
    return InjectAnnotationBuilder;
}(core_1.Registration));
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

var AnnotationBuilder_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });




/**
 * Annotation class builder. build class with metadata and config.
 *
 * @export
 * @class AnnotationBuilder
 * @implements {implements IAnnotationBuilder<T>}
 * @template T
 */
var AnnotationBuilder = /** @class */ (function () {
    function AnnotationBuilder() {
    }
    AnnotationBuilder_1 = AnnotationBuilder;
    AnnotationBuilder.prototype.build = function (token, config, data) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var builder, instance;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (core_1.isClass(token) && !this.container.hasRegister(token)) {
                            this.container.register(token);
                        }
                        config = this.getTokenMetaConfig(token, config);
                        builder = this.getBuilder(token, config);
                        if (!!this.isEqual(builder)) return [3 /*break*/, 1];
                        return [2 /*return*/, builder.build(token, config, data)];
                    case 1: return [4 /*yield*/, this.registerExts(config)];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, this.createInstance(token, config, data)];
                    case 3:
                        instance = _a.sent();
                        if (!instance) {
                            return [2 /*return*/, null];
                        }
                        if (!core_1.isFunction(instance.anBeforeInit)) return [3 /*break*/, 5];
                        return [4 /*yield*/, Promise.resolve(instance.anBeforeInit(config))];
                    case 4:
                        _a.sent();
                        _a.label = 5;
                    case 5: return [4 /*yield*/, this.buildStrategy(instance, config)];
                    case 6:
                        instance = (_a.sent());
                        if (!core_1.isFunction(instance.anAfterInit)) return [3 /*break*/, 8];
                        return [4 /*yield*/, Promise.resolve(instance.anAfterInit(config))];
                    case 7:
                        _a.sent();
                        _a.label = 8;
                    case 8: return [2 /*return*/, instance];
                }
            });
        });
    };
    AnnotationBuilder.prototype.buildByConfig = function (config, data) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var token;
            return tslib_1.__generator(this, function (_a) {
                if (core_1.isToken(config)) {
                    token = config;
                    return [2 /*return*/, this.build(token, null, data)];
                }
                else {
                    token = this.getType(config);
                    return [2 /*return*/, this.build(token, config, data)];
                }
                return [2 /*return*/];
            });
        });
    };
    AnnotationBuilder.prototype.createInstance = function (token, config, data) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var instance;
            return tslib_1.__generator(this, function (_a) {
                if (!token) {
                    console.log('can not find annotation token.');
                    return [2 /*return*/, null];
                }
                if (!this.container.has(token)) {
                    console.log("can not find token " + (token ? token.toString() : null) + " in container.");
                    return [2 /*return*/, null];
                }
                instance = this.resolveToken(token, data);
                return [2 /*return*/, instance];
            });
        });
    };
    AnnotationBuilder.prototype.getBuilder = function (token, config) {
        var _this = this;
        var builder;
        if (config && config.annotationBuilder) {
            if (core_1.isClass(config.annotationBuilder)) {
                if (!this.container.has(config.annotationBuilder)) {
                    this.container.register(config.annotationBuilder);
                }
            }
            if (core_1.isToken(config.annotationBuilder)) {
                builder = this.container.resolve(config.annotationBuilder, { container: this.container });
            }
            else if (config.annotationBuilder instanceof AnnotationBuilder_1) {
                builder = config.annotationBuilder;
            }
        }
        if (!builder && token) {
            this.container.getTokenExtendsChain(token).forEach(function (tk) {
                if (builder) {
                    return false;
                }
                var buildToken = new IAnnotationBuilder.InjectAnnotationBuilder(tk);
                if (_this.container.has(buildToken)) {
                    builder = _this.container.resolve(buildToken, { container: _this.container });
                }
                return true;
            });
        }
        if (builder && !builder.container) {
            builder.container = this.container;
        }
        return builder || this;
    };
    /**
     * bundle instance via config.
     *
     * @param {T} instance
     * @param {AnnotationConfigure} config
     * @param {IContainer} [container]
     * @returns {Promise<T>}
     * @memberof BootBuilder
     */
    AnnotationBuilder.prototype.buildStrategy = function (instance, config) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            return tslib_1.__generator(this, function (_a) {
                return [2 /*return*/, instance];
            });
        });
    };
    AnnotationBuilder.prototype.getType = function (config) {
        return config.token || config.type;
    };
    /**
     * register extension before create instance.
     *
     * @protected
     * @param {AnnotationConfigure<T>} [config]
     * @memberof AnnotationBuilder
     */
    AnnotationBuilder.prototype.registerExts = function (config) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            return tslib_1.__generator(this, function (_a) {
                return [2 /*return*/];
            });
        });
    };
    AnnotationBuilder.prototype.getTokenMetaConfig = function (token, config) {
        var cfg;
        if (core_1.isClass(token)) {
            cfg = this.getMetaConfig(token);
        }
        else if (core_1.isToken(token)) {
            var tokenType = this.container ? this.container.getTokenImpl(token) : token;
            if (core_1.isClass(tokenType)) {
                cfg = this.getMetaConfig(tokenType);
            }
        }
        if (cfg) {
            return core_1.lang.assign({}, cfg, config || {});
        }
        else {
            return config || {};
        }
    };
    AnnotationBuilder.prototype.getDecorator = function () {
        return decorators.Annotation.toString();
    };
    AnnotationBuilder.prototype.getMetaConfig = function (token) {
        var accessor = this.container.resolve(core_1.AnnotationMetaAccessorToken, { decorator: this.getDecorator() });
        if (accessor) {
            return accessor.getMetadata(token, this.container);
        }
        return null;
    };
    AnnotationBuilder.prototype.isEqual = function (build) {
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
    };
    AnnotationBuilder.prototype.resolveToken = function (token, data) {
        return this.container.resolve(token, data);
    };
    var AnnotationBuilder_1;
    AnnotationBuilder.classAnnations = { "name": "AnnotationBuilder", "params": { "constructor": [], "build": ["token", "config", "data"], "buildByConfig": ["config", "data"], "createInstance": ["token", "config", "data"], "getBuilder": ["token", "config"], "buildStrategy": ["instance", "config"], "getType": ["config"], "registerExts": ["config"], "getTokenMetaConfig": ["token", "config"], "getDecorator": [], "getMetaConfig": ["token"], "isEqual": ["build"], "resolveToken": ["token", "data"] } };
    tslib_1.__decorate([
        core_1.Inject(core_1.ContainerToken),
        tslib_1.__metadata("design:type", Object)
    ], AnnotationBuilder.prototype, "container", void 0);
    AnnotationBuilder = AnnotationBuilder_1 = tslib_1.__decorate([
        core_1.Injectable(IAnnotationBuilder.AnnotationBuilderToken),
        tslib_1.__metadata("design:paramtypes", [])
    ], AnnotationBuilder);
    return AnnotationBuilder;
}());
exports.AnnotationBuilder = AnnotationBuilder;


});

unwrapExports(AnnotationBuilder_1);
var AnnotationBuilder_2 = AnnotationBuilder_1.AnnotationBuilder;

var annotations = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

tslib_1.__exportStar(AnnotationBuilder_1, exports);
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
var InjectModuleLoadToken = /** @class */ (function (_super) {
    tslib_1.__extends(InjectModuleLoadToken, _super);
    function InjectModuleLoadToken(token) {
        return _super.call(this, token, 'module_loader') || this;
    }
    InjectModuleLoadToken.classAnnations = { "name": "InjectModuleLoadToken", "params": { "constructor": ["token"] } };
    return InjectModuleLoadToken;
}(core_1.Registration));
exports.InjectModuleLoadToken = InjectModuleLoadToken;
/**
 * module builder
 *
 * @export
 * @class ModuleBuilder
 * @implements {IModuleBuilder}
 * @template T
 */
var ModuleBuilder = /** @class */ (function () {
    function ModuleBuilder() {
    }
    ModuleBuilder.prototype.getPools = function () {
        return this.pools;
    };
    /**
     * build module.
     *
     * @param {(Token<T> | ModuleConfig<T>)} token
     * @param {ModuleEnv} [env]
     * @param {*} [data]
     * @returns {Promise<T>}
     * @memberof ModuleBuilder
     */
    ModuleBuilder.prototype.build = function (token, env, data) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var injmdl, container, cfg, annBuilder, instance, instance, mdlInst;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.load(token, env)];
                    case 1:
                        injmdl = _a.sent();
                        container = injmdl.container;
                        cfg = injmdl.config;
                        annBuilder = this.getAnnoBuilder(container, injmdl.token, cfg.annotationBuilder);
                        if (!!injmdl.token) return [3 /*break*/, 3];
                        return [4 /*yield*/, annBuilder.buildByConfig(cfg, data)];
                    case 2:
                        instance = _a.sent();
                        return [2 /*return*/, instance];
                    case 3: return [4 /*yield*/, annBuilder.build(injmdl.token, cfg, data)];
                    case 4:
                        instance = _a.sent();
                        mdlInst = instance;
                        if (mdlInst && core_1.isFunction(mdlInst.mdOnInit)) {
                            mdlInst.mdOnInit(injmdl);
                        }
                        return [2 /*return*/, instance];
                }
            });
        });
    };
    /**
    * bootstrap module's main.
    *
    * @param {(Token<T> | ModuleConfig<T>)} token
    * @param {ModuleEnv} [env]
    * @param {*} [data]
    * @returns {Promise<MdInstance<T>>}
    * @memberof ModuleBuilder
    */
    ModuleBuilder.prototype.bootstrap = function (token, env, data) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var injmdl, cfg, container, md, bootToken, anBuilder, bootInstance, runable;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.load(token, env)];
                    case 1:
                        injmdl = _a.sent();
                        cfg = injmdl.config;
                        container = injmdl.container;
                        return [4 /*yield*/, this.build(token, injmdl, data)];
                    case 2:
                        md = _a.sent();
                        bootToken = this.getBootType(cfg);
                        anBuilder = this.getAnnoBuilder(container, bootToken, cfg.annotationBuilder);
                        return [4 /*yield*/, (bootToken ? anBuilder.build(bootToken, cfg, data) : anBuilder.buildByConfig(cfg, data))];
                    case 3:
                        bootInstance = _a.sent();
                        if (!bootInstance) return [3 /*break*/, 7];
                        return [4 /*yield*/, this.autoRun(container, bootToken ? bootToken : anBuilder.getType(cfg), cfg, bootInstance)];
                    case 4:
                        runable = _a.sent();
                        if (!(md && core_1.isFunction(md.mdOnStart))) return [3 /*break*/, 6];
                        return [4 /*yield*/, Promise.resolve(md.mdOnStart(bootInstance))];
                    case 5:
                        _a.sent();
                        _a.label = 6;
                    case 6: return [3 /*break*/, 9];
                    case 7: return [4 /*yield*/, this.autoRun(container, injmdl.token, cfg, md)];
                    case 8:
                        runable = _a.sent();
                        _a.label = 9;
                    case 9: return [2 /*return*/, runable];
                }
            });
        });
    };
    ModuleBuilder.prototype.import = function (token, parent) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var type, key;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!!parent) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.getParentContainer()];
                    case 1:
                        parent = _a.sent();
                        _a.label = 2;
                    case 2:
                        type = core_1.isClass(token) ? token : parent.getTokenImpl(token);
                        if (!core_1.isClass(type)) return [3 /*break*/, 5];
                        key = new InjectedModule_1.InjectedModuleToken(type);
                        if (!parent.hasRegister(key.toString())) return [3 /*break*/, 3];
                        return [2 /*return*/, parent.get(key)];
                    case 3: return [4 /*yield*/, parent.loadModule(type)];
                    case 4:
                        _a.sent();
                        if (parent.has(key)) {
                            return [2 /*return*/, parent.get(key)];
                        }
                        _a.label = 5;
                    case 5: return [2 /*return*/, null];
                }
            });
        });
    };
    ModuleBuilder.prototype.load = function (token, env) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var injmdl, parent, cfg, mdtype, container, injector, injector;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (env instanceof InjectedModule_1.InjectedModule) {
                            return [2 /*return*/, env];
                        }
                        injmdl = null;
                        return [4 /*yield*/, this.getParentContainer(env)];
                    case 1:
                        parent = _a.sent();
                        if (!core_1.isToken(token)) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.import(token, parent)];
                    case 2:
                        injmdl = _a.sent();
                        if (!injmdl) {
                            cfg = parent.get(core_1.AnnotationMetaAccessorToken).getMetadata(token, parent);
                            injmdl = new InjectedModule_1.InjectedModule(token, cfg, parent);
                        }
                        return [3 /*break*/, 10];
                    case 3:
                        mdtype = this.getType(token);
                        if (!core_1.isToken(mdtype)) return [3 /*break*/, 7];
                        return [4 /*yield*/, this.import(mdtype, parent)];
                    case 4:
                        injmdl = _a.sent();
                        if (!(injmdl instanceof InjectedModule_1.InjectedModule)) return [3 /*break*/, 6];
                        container = injmdl.container;
                        injector = container.get(DIModuleInjector_1.DIModuleInjectorToken);
                        return [4 /*yield*/, injector.importByConfig(container, token)];
                    case 5:
                        _a.sent();
                        injmdl.config = core_1.lang.assign(injmdl.config, token);
                        _a.label = 6;
                    case 6: return [3 /*break*/, 8];
                    case 7:
                        mdtype = null;
                        _a.label = 8;
                    case 8:
                        if (!!injmdl) return [3 /*break*/, 10];
                        injector = parent.get(DIModuleInjector_1.DIModuleInjectorToken);
                        return [4 /*yield*/, injector.importByConfig(parent, token)];
                    case 9:
                        _a.sent();
                        injmdl = new InjectedModule_1.InjectedModule(mdtype, token, parent);
                        _a.label = 10;
                    case 10: return [2 /*return*/, injmdl];
                }
            });
        });
    };
    ModuleBuilder.prototype.getParentContainer = function (env) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var parent;
            return tslib_1.__generator(this, function (_a) {
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
                return [2 /*return*/, parent];
            });
        });
    };
    ModuleBuilder.prototype.autoRun = function (container, token, cfg, instance) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var runner_1, service_1, provider_1;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!instance) {
                            return [2 /*return*/, null];
                        }
                        if (!(instance instanceof runnable.Boot)) return [3 /*break*/, 2];
                        return [4 /*yield*/, instance.run()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, instance];
                    case 2:
                        if (!(instance instanceof runnable.Service)) return [3 /*break*/, 4];
                        return [4 /*yield*/, instance.start()];
                    case 3:
                        _a.sent();
                        return [2 /*return*/, instance];
                    case 4:
                        provider_1 = { token: token, instance: instance, config: cfg };
                        container.getTokenExtendsChain(token).forEach(function (tk) {
                            if (runner_1 || service_1) {
                                return false;
                            }
                            var runnerToken = new runnable.InjectRunnerToken(tk);
                            if (container.has(runnerToken)) {
                                runner_1 = container.resolve(runnerToken, provider_1);
                            }
                            var serviceToken = new runnable.InjectServiceToken(tk);
                            if (container.has(serviceToken)) {
                                service_1 = container.resolve(serviceToken, provider_1);
                            }
                            return true;
                        });
                        if (!runner_1) {
                            this.getDefaultRunner(container, provider_1);
                        }
                        if (!runner_1 && !service_1) {
                            this.getDefaultService(container, provider_1);
                        }
                        if (!runner_1) return [3 /*break*/, 6];
                        return [4 /*yield*/, runner_1.run(instance)];
                    case 5:
                        _a.sent();
                        return [2 /*return*/, runner_1];
                    case 6:
                        if (!service_1) return [3 /*break*/, 8];
                        return [4 /*yield*/, service_1.start()];
                    case 7:
                        _a.sent();
                        return [2 /*return*/, service_1];
                    case 8:
                        if (!(token && cfg.autorun)) return [3 /*break*/, 10];
                        return [4 /*yield*/, container.invoke(token, cfg.autorun, instance)];
                    case 9:
                        _a.sent();
                        return [2 /*return*/, instance];
                    case 10: return [2 /*return*/, instance];
                }
            });
        });
    };
    ModuleBuilder.prototype.getDefaultRunner = function (container) {
        var providers = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            providers[_i - 1] = arguments[_i];
        }
        if (container.has(runnable.DefaultRunnerToken)) {
            return container.resolve.apply(container, [runnable.DefaultRunnerToken].concat(providers));
        }
        return null;
    };
    ModuleBuilder.prototype.getDefaultService = function (container) {
        var providers = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            providers[_i - 1] = arguments[_i];
        }
        if (container.has(runnable.DefaultServiceToken)) {
            return container.resolve.apply(container, [runnable.DefaultServiceToken].concat(providers));
        }
        return null;
    };
    ModuleBuilder.prototype.getAnnoBuilder = function (container, token, annBuilder) {
        var builder;
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
        if (!builder && token) {
            container.getTokenExtendsChain(token).forEach(function (tk) {
                if (builder) {
                    return false;
                }
                var buildToken = new annotations.InjectAnnotationBuilder(tk);
                if (container.has(buildToken)) {
                    builder = container.resolve(buildToken);
                }
                return true;
            });
        }
        if (!builder) {
            builder = this.getDefaultAnnBuilder(container);
        }
        if (builder) {
            builder.container = container;
        }
        return builder;
    };
    ModuleBuilder.prototype.getDefaultAnnBuilder = function (container) {
        if (container.has(annotations.DefaultAnnotationBuilderToken)) {
            return container.resolve(annotations.DefaultAnnotationBuilderToken);
        }
        return container.resolve(annotations.AnnotationBuilderToken);
    };
    /**
     * get module type
     *
     * @protected
     * @param {ModuleConfigure} cfg
     * @returns {Token<T>}
     * @memberof ModuleBuilder
     */
    ModuleBuilder.prototype.getType = function (cfg) {
        return cfg.token || cfg.type;
    };
    /**
     * get boot type.
     *
     * @protected
     * @param {ModuleConfigure} cfg
     * @returns {Token<T>}
     * @memberof ModuleBuilder
     */
    ModuleBuilder.prototype.getBootType = function (cfg) {
        return cfg.bootstrap;
    };
    ModuleBuilder.classAnnations = { "name": "ModuleBuilder", "params": { "constructor": [], "getPools": [], "build": ["token", "env", "data"], "bootstrap": ["token", "env", "data"], "import": ["token", "parent"], "load": ["token", "env"], "getParentContainer": ["env"], "autoRun": ["container", "token", "cfg", "instance"], "getDefaultRunner": ["container", "providers"], "getDefaultService": ["container", "providers"], "getAnnoBuilder": ["container", "token", "annBuilder"], "getDefaultAnnBuilder": ["container"], "getType": ["cfg"], "getBootType": ["cfg"] } };
    tslib_1.__decorate([
        core_1.Inject(utils.ContainerPoolToken),
        tslib_1.__metadata("design:type", utils.ContainerPool)
    ], ModuleBuilder.prototype, "pools", void 0);
    ModuleBuilder = tslib_1.__decorate([
        core_1.Singleton(IModuleBuilder.ModuleBuilderToken),
        tslib_1.__metadata("design:paramtypes", [])
    ], ModuleBuilder);
    return ModuleBuilder;
}());
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
var BootModule = /** @class */ (function () {
    function BootModule(container) {
        this.container = container;
    }
    /**
     * register aop for container.
     *
     * @memberof AopModule
     */
    BootModule.prototype.setup = function () {
        var container = this.container;
        var lifeScope = container.get(core_1.LifeScopeToken);
        lifeScope.registerDecorator(decorators.DIModule, core_1.CoreActions.bindProvider, core_1.CoreActions.cache, core_1.CoreActions.componentBeforeInit, core_1.CoreActions.componentInit, core_1.CoreActions.componentAfterInit);
        lifeScope.registerDecorator(decorators.Bootstrap, core_1.CoreActions.bindProvider, core_1.CoreActions.cache, core_1.CoreActions.componentBeforeInit, core_1.CoreActions.componentInit, core_1.CoreActions.componentAfterInit);
        container.use(annotations, modules, boot);
    };
    BootModule.classAnnations = { "name": "BootModule", "params": { "constructor": ["container"], "setup": [] } };
    BootModule = tslib_1.__decorate([
        core_1.IocExt('setup'),
        tslib_1.__param(0, core_1.Inject(core_1.ContainerToken)),
        tslib_1.__metadata("design:paramtypes", [Object])
    ], BootModule);
    return BootModule;
}());
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
var DefaultApplicationBuilder = /** @class */ (function (_super) {
    tslib_1.__extends(DefaultApplicationBuilder, _super);
    function DefaultApplicationBuilder(baseURL) {
        var _this = _super.call(this) || this;
        _this.baseURL = baseURL;
        _this.inited = false;
        _this.customRegs = [];
        _this.globalModules = [];
        _this.configs = [];
        _this.beforeInitPds = new core_1.MapSet();
        _this.afterInitPds = new core_1.MapSet();
        _this.events = new utils.Events();
        _this.initEvents();
        return _this;
    }
    DefaultApplicationBuilder.prototype.initEvents = function () {
        var _this = this;
        this.events.on('onRooConatianerInited', function (container) {
            _this.afterInitPds.forEach(function (val, key) {
                container.bindProvider(key, val);
            });
        });
    };
    DefaultApplicationBuilder.create = function (baseURL) {
        return new DefaultApplicationBuilder(baseURL);
    };
    DefaultApplicationBuilder.prototype.on = function (name, event) {
        this.events.on(name, event);
        return this;
    };
    DefaultApplicationBuilder.prototype.off = function (name, event) {
        this.events.off(name, event);
        return this;
    };
    DefaultApplicationBuilder.prototype.emit = function (name) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        var _a;
        (_a = this.events).emit.apply(_a, [name].concat(args));
    };
    DefaultApplicationBuilder.prototype.getPools = function () {
        if (!this.pools) {
            this.pools = new utils.ContainerPool();
            this.createDefaultContainer();
        }
        return this.pools;
    };
    DefaultApplicationBuilder.prototype.createContainer = function () {
        return this.getContainerBuilder().create();
    };
    DefaultApplicationBuilder.prototype.getContainerBuilder = function () {
        if (!this.containerBuilder) {
            this.containerBuilder = this.createContainerBuilder();
        }
        return this.containerBuilder;
    };
    DefaultApplicationBuilder.prototype.createContainerBuilder = function () {
        return new core_1.DefaultContainerBuilder();
    };
    /**
     * use configuration.
     *
     * @param {(string | AppConfigure)} [config]
     * @returns {this} global config for this application.
     * @memberof Bootstrap
     */
    DefaultApplicationBuilder.prototype.useConfiguration = function (config) {
        if (core_1.isUndefined(config)) {
            config = '';
        }
        // clean cached config.
        this.globalConfig = null;
        var idx = this.configs.indexOf(config);
        if (idx >= 0) {
            this.configs.splice(idx, 1);
        }
        this.configs.push(config);
        return this;
    };
    DefaultApplicationBuilder.prototype.loadConfig = function (container, src) {
        if (container.has(AppConfigure.AppConfigureLoaderToken)) {
            var loader = container.resolve(AppConfigure.AppConfigureLoaderToken, { baseURL: this.baseURL, container: container });
            return loader.load(src);
        }
        else if (src) {
            var builder = container.getBuilder();
            return builder.loader.load([src])
                .then(function (rs) {
                return rs.length ? rs[0] : null;
            });
        }
        else {
            return Promise.resolve(null);
        }
    };
    /**
     * use module as global Depdences module.
     *
     * @param {...LoadType[]} modules
     * @returns {this}
     * @memberof PlatformServer
     */
    DefaultApplicationBuilder.prototype.use = function () {
        var modules$$1 = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            modules$$1[_i] = arguments[_i];
        }
        this.globalModules = this.globalModules.concat(modules$$1);
        this.inited = false;
        return this;
    };
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
    DefaultApplicationBuilder.prototype.provider = function (provide, provider, beforRootInit) {
        if (beforRootInit) {
            this.beforeInitPds.set(provide, provider);
        }
        else {
            this.afterInitPds.set(provide, provider);
        }
        return this;
    };
    DefaultApplicationBuilder.prototype.build = function (token, env, data) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var injmdl, builder;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.load(token, env)];
                    case 1:
                        injmdl = _a.sent();
                        builder = this.getBuilder(injmdl);
                        if (!builder) return [3 /*break*/, 3];
                        return [4 /*yield*/, builder.build(token, env, data)];
                    case 2: return [2 /*return*/, _a.sent()];
                    case 3: return [4 /*yield*/, _super.prototype.build.call(this, token, env, data)];
                    case 4: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    DefaultApplicationBuilder.prototype.bootstrap = function (token, env, data) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var injmdl, builder;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.load(token, env)];
                    case 1:
                        injmdl = _a.sent();
                        builder = this.getBuilder(injmdl);
                        if (!builder) return [3 /*break*/, 3];
                        return [4 /*yield*/, builder.bootstrap(token, injmdl, data)];
                    case 2: return [2 /*return*/, _a.sent()];
                    case 3: return [4 /*yield*/, _super.prototype.bootstrap.call(this, token, injmdl, data)];
                    case 4: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    DefaultApplicationBuilder.prototype.getBuilder = function (injmdl) {
        var cfg = injmdl.config;
        var container = injmdl.container;
        var builder;
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
        var tko = injmdl.token;
        if (!builder && tko) {
            container.getTokenExtendsChain(tko).forEach(function (tk) {
                if (builder) {
                    return false;
                }
                var buildToken = new modules.InjectModuleBuilderToken(tk);
                if (container.has(buildToken)) {
                    builder = container.get(buildToken);
                }
                return true;
            });
        }
        if (!builder) {
            builder = this.getDefaultBuilder(container);
        }
        return builder || this;
    };
    DefaultApplicationBuilder.prototype.getDefaultBuilder = function (container) {
        if (container.has(modules.DefaultModuleBuilderToken)) {
            return container.resolve(modules.DefaultModuleBuilderToken);
        }
        return null;
    };
    DefaultApplicationBuilder.prototype.getParentContainer = function (env) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var container;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        container = this.getPools().getDefault();
                        if (!!this.inited) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.initRootContainer(container)];
                    case 1:
                        _a.sent();
                        this.inited = true;
                        _a.label = 2;
                    case 2: return [4 /*yield*/, _super.prototype.getParentContainer.call(this, env)];
                    case 3: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    DefaultApplicationBuilder.prototype.getGlobalConfig = function (container) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var globCfg_1, exts;
            var _this = this;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!!this.globalConfig) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.getDefaultConfig(container)];
                    case 1:
                        globCfg_1 = _a.sent();
                        if (this.configs.length < 1) {
                            this.configs.push(''); // load default loader config.
                        }
                        return [4 /*yield*/, Promise.all(this.configs.map(function (cfg) {
                                if (core_1.isString(cfg)) {
                                    return _this.loadConfig(container, cfg);
                                }
                                else {
                                    return cfg;
                                }
                            }))];
                    case 2:
                        exts = _a.sent();
                        exts.forEach(function (exCfg) {
                            if (exCfg) {
                                core_1.lang.assign(globCfg_1, exCfg);
                            }
                        });
                        this.globalConfig = globCfg_1;
                        _a.label = 3;
                    case 3: return [2 /*return*/, this.globalConfig];
                }
            });
        });
    };
    DefaultApplicationBuilder.prototype.createDefaultContainer = function () {
        var _this = this;
        var container = this.createContainer();
        container.register(BootModule_1.BootModule);
        this.pools.setDefault(container);
        var chain = container.getBuilder().getInjectorChain(container);
        chain.first(container.resolve(modules.DIModuleInjectorToken));
        container.bindProvider(utils.ContainerPoolToken, function () { return _this.getPools(); });
        this.beforeInitPds.forEach(function (val, key) {
            container.bindProvider(key, val);
        });
        this.events.emit(ApplicationEvents.onRootContainerCreated, container);
        return container;
    };
    DefaultApplicationBuilder.prototype.initRootContainer = function (container) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var globCfg;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getGlobalConfig(container)];
                    case 1:
                        globCfg = _a.sent();
                        this.registerExts(container, globCfg);
                        this.bindAppConfig(globCfg);
                        container.bindProvider(AppConfigure.AppConfigureToken, globCfg);
                        this.events.emit(ApplicationEvents.onRootContainerInited, container);
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * register ioc exts
     *
     * @protected
     * @param {IContainer} container
     * @param {AppConfigure} config
     * @returns {Promise<IContainer>}
     * @memberof ApplicationBuilder
     */
    DefaultApplicationBuilder.prototype.registerExts = function (container, config) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var usedModules;
            var _this = this;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.globalModules.length) return [3 /*break*/, 2];
                        usedModules = this.globalModules;
                        return [4 /*yield*/, container.loadModule.apply(container, usedModules)];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2:
                        if (!this.customRegs.length) return [3 /*break*/, 4];
                        return [4 /*yield*/, Promise.all(this.customRegs.map(function (cs) { return tslib_1.__awaiter(_this, void 0, void 0, function () {
                                var tokens;
                                return tslib_1.__generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, cs(container, config, this)];
                                        case 1:
                                            tokens = _a.sent();
                                            return [2 /*return*/, tokens];
                                    }
                                });
                            }); }))];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4: return [2 /*return*/, container];
                }
            });
        });
    };
    DefaultApplicationBuilder.prototype.bindAppConfig = function (config) {
        if (this.baseURL) {
            config.baseURL = this.baseURL;
        }
        return config;
    };
    DefaultApplicationBuilder.prototype.getDefaultConfig = function (container) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            return tslib_1.__generator(this, function (_a) {
                if (container.has(AppConfigure.DefaultConfigureToken)) {
                    return [2 /*return*/, container.resolve(AppConfigure.DefaultConfigureToken)];
                }
                else {
                    return [2 /*return*/, {}];
                }
                return [2 /*return*/];
            });
        });
    };
    DefaultApplicationBuilder.classAnnations = { "name": "DefaultApplicationBuilder", "params": { "constructor": ["baseURL"], "initEvents": [], "create": ["baseURL"], "on": ["name", "event"], "off": ["name", "event"], "emit": ["name", "args"], "getPools": [], "createContainer": [], "getContainerBuilder": [], "createContainerBuilder": [], "useConfiguration": ["config"], "loadConfig": ["container", "src"], "use": ["modules"], "provider": ["provide", "provider", "beforRootInit"], "build": ["token", "env", "data"], "bootstrap": ["token", "env", "data"], "getBuilder": ["injmdl"], "getDefaultBuilder": ["container"], "getParentContainer": ["env"], "getGlobalConfig": ["container"], "createDefaultContainer": [], "initRootContainer": ["container"], "registerExts": ["container", "config"], "bindAppConfig": ["config"], "getDefaultConfig": ["container"] } };
    return DefaultApplicationBuilder;
}(modules.ModuleBuilder));
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

var D__workspace_github_tsioc_packages_bootstrap_lib = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

tslib_1.__exportStar(decorators, exports);
tslib_1.__exportStar(boot, exports);
tslib_1.__exportStar(annotations, exports);
tslib_1.__exportStar(modules, exports);
tslib_1.__exportStar(runnable, exports);
tslib_1.__exportStar(utils, exports);
tslib_1.__exportStar(BootModule_1, exports);


});

var index$6 = unwrapExports(D__workspace_github_tsioc_packages_bootstrap_lib);

return index$6;

})));
