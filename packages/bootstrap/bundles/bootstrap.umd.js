(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('tslib'), require('@ts-ioc/core')) :
	typeof define === 'function' && define.amd ? define(['tslib', '@ts-ioc/core'], factory) :
	(global.bootstrap = global.bootstrap || {}, global.bootstrap.umd = global.bootstrap.umd || {}, global.bootstrap.umd.js = factory(global.tslib_1,global.core_1));
}(this, (function (tslib_1,core_1) { 'use strict';

tslib_1 = tslib_1 && tslib_1.hasOwnProperty('default') ? tslib_1['default'] : tslib_1;
core_1 = core_1 && core_1.hasOwnProperty('default') ? core_1['default'] : core_1;

function unwrapExports (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var IModuleBuilder = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });


/**
 * inject module builder.
 *
 * @export
 * @class InjectModuleBuilder
 * @extends {Registration<T>}
 * @template T
 */
var InjectModuleBuilder = /** @class */ (function (_super) {
    tslib_1.__extends(InjectModuleBuilder, _super);
    function InjectModuleBuilder(desc) {
        return _super.call(this, 'DI_ModuleBuilder', desc) || this;
    }
    InjectModuleBuilder.classAnnations = { "name": "InjectModuleBuilder", "params": { "constructor": ["desc"] } };
    return InjectModuleBuilder;
}(core_1.Registration));
exports.InjectModuleBuilder = InjectModuleBuilder;
/**
 * module builder token.
 */
exports.ModuleBuilderToken = new InjectModuleBuilder('');
/**
 * root module builder token.
 */
exports.RootModuleBuilderToken = new InjectModuleBuilder('RootModule');
/**
 * root container token.
 */
exports.RootContainerToken = new core_1.InjectToken('DI_RootContainer');


});

unwrapExports(IModuleBuilder);
var IModuleBuilder_1 = IModuleBuilder.InjectModuleBuilder;
var IModuleBuilder_2 = IModuleBuilder.ModuleBuilderToken;
var IModuleBuilder_3 = IModuleBuilder.RootModuleBuilderToken;
var IModuleBuilder_4 = IModuleBuilder.RootContainerToken;

var DIModule = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });


/**
 * create bootstrap decorator.
 *
 * @export
 * @template T
 * @param {string} decorType
 * @param {(Token<IModuleBuilder<T>> | IModuleBuilder<T>)} builder
 * @param {InjectToken<IApplication>} provideType default provide type.
 * @param {MetadataAdapter} [adapter]
 * @param {MetadataExtends<T>} [metadataExtends]
 * @returns {IDIModuleDecorator<T>}
 */
function createDIModuleDecorator(decorType, builder, provideType, adapter, metadataExtends) {
    return core_1.createClassDecorator('DIModule', function (args) {
        if (adapter) {
            adapter(args);
        }
    }, function (metadata) {
        if (metadataExtends) {
            metadata = metadataExtends(metadata);
        }
        if (!metadata.name && core_1.isClass(metadata.type)) {
            var isuglify = /^[a-z]$/.test(metadata.type.name);
            if (isuglify && metadata.type.classAnnations) {
                metadata.name = metadata.type.classAnnations.name;
            }
            else {
                metadata.name = metadata.type.name;
            }
        }
        metadata.provide = metadata.provide || provideType;
        metadata.alias = metadata.alias || metadata.name;
        metadata.decorType = decorType;
        if (!metadata.builder) {
            metadata.builder = builder;
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
exports.DIModule = createDIModuleDecorator('module', IModuleBuilder.ModuleBuilderToken);


});

unwrapExports(DIModule);
var DIModule_1 = DIModule.createDIModuleDecorator;
var DIModule_2 = DIModule.DIModule;

var IApplication = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });


/**
 * Inject ApplicationToken
 *
 * @export
 * @class InjectApplicationToken
 * @extends {Registration<T>}
 * @template T
 */
var InjectApplicationToken = /** @class */ (function (_super) {
    tslib_1.__extends(InjectApplicationToken, _super);
    function InjectApplicationToken(desc) {
        return _super.call(this, 'DI_Application', desc) || this;
    }
    InjectApplicationToken.classAnnations = { "name": "InjectApplicationToken", "params": { "constructor": ["desc"] } };
    return InjectApplicationToken;
}(core_1.Registration));
exports.InjectApplicationToken = InjectApplicationToken;
/**
 * Default Application Token.
 */
exports.ApplicationToken = new InjectApplicationToken('');


});

unwrapExports(IApplication);
var IApplication_1 = IApplication.InjectApplicationToken;
var IApplication_2 = IApplication.ApplicationToken;

var IApplicationBuilder = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

exports.ApplicationBuilderToken = new core_1.InjectToken('DI_AppBuilder');


});

unwrapExports(IApplicationBuilder);
var IApplicationBuilder_1 = IApplicationBuilder.ApplicationBuilderToken;

var Bootstrap = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });



/**
 * create bootstrap decorator.
 *
 * @export
 * @template T
 * @param {string} decorType
 * @param {(Token<IModuleBuilder<T>> | IModuleBuilder<T>)} builder
 * @param {InjectToken<IApplication>} provideType default provide type.
 * @param {MetadataAdapter} [adapter]
 * @param {MetadataExtends<T>} [metadataExtends]
 * @returns {IBootstrapDecorator<T>}
 */
function createBootstrapDecorator(decorType, builder, provideType, adapter, metadataExtends) {
    return core_1.createClassDecorator('Bootstrap', function (args) {
        if (adapter) {
            adapter(args);
        }
    }, function (metadata) {
        if (metadataExtends) {
            metadata = metadataExtends(metadata);
        }
        if (!metadata.name && core_1.isClass(metadata.type)) {
            var isuglify = /^[a-z]$/.test(metadata.type.name);
            if (isuglify && metadata.type.classAnnations) {
                metadata.name = metadata.type.classAnnations.name;
            }
            else {
                metadata.name = metadata.type.name;
            }
        }
        metadata.provide = metadata.provide || provideType;
        metadata.alias = metadata.alias || metadata.name;
        metadata.decorType = decorType;
        if (!metadata.builder) {
            metadata.builder = builder;
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
exports.Bootstrap = createBootstrapDecorator('bootstrap', IApplicationBuilder.ApplicationBuilderToken, IApplication.ApplicationToken);


});

unwrapExports(Bootstrap);
var Bootstrap_1 = Bootstrap.createBootstrapDecorator;
var Bootstrap_2 = Bootstrap.Bootstrap;

var decorators = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

tslib_1.__exportStar(DIModule, exports);
tslib_1.__exportStar(Bootstrap, exports);


});

unwrapExports(decorators);

var AppConfiguration = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

/**
 * application configuration token.
 */
exports.AppConfigurationToken = new core_1.InjectToken('DI_APP_Configuration');


});

unwrapExports(AppConfiguration);
var AppConfiguration_1 = AppConfiguration.AppConfigurationToken;

var BootstrapModule_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });





/**
 * Bootstrap ext for ioc. auto run setup after registered.
 * with @IocExt('setup') decorator.
 * @export
 * @class BootstrapModule
 */
var BootstrapModule = /** @class */ (function () {
    function BootstrapModule(container) {
        this.container = container;
    }
    /**
     * register aop for container.
     *
     * @memberof AopModule
     */
    BootstrapModule.prototype.setup = function () {
        var container = this.container;
        var lifeScope = container.get(core_1.LifeScopeToken);
        lifeScope.registerDecorator(decorators.DIModule, core_1.CoreActions.bindProvider, core_1.CoreActions.cache, core_1.CoreActions.componentBeforeInit, core_1.CoreActions.componentInit, core_1.CoreActions.componentAfterInit);
        lifeScope.registerDecorator(decorators.Bootstrap, core_1.CoreActions.bindProvider, core_1.CoreActions.cache, core_1.CoreActions.componentBeforeInit, core_1.CoreActions.componentInit, core_1.CoreActions.componentAfterInit);
        container.register(ModuleBuilder_1.ModuleBuilder);
        container.register(ApplicationBuilder_1.ApplicationBuilder);
    };
    BootstrapModule.classAnnations = { "name": "BootstrapModule", "params": { "constructor": ["container"], "setup": [] } };
    BootstrapModule = tslib_1.__decorate([
        core_1.IocExt('setup'),
        tslib_1.__param(0, core_1.Inject(core_1.ContainerToken)),
        tslib_1.__metadata("design:paramtypes", [Object])
    ], BootstrapModule);
    return BootstrapModule;
}());
exports.BootstrapModule = BootstrapModule;


});

unwrapExports(BootstrapModule_1);
var BootstrapModule_2 = BootstrapModule_1.BootstrapModule;

var ModuleBuilder_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });






var exportsProvidersFiled = '__exportProviders';
/**
 * base module builder
 *
 * @export
 * @class ModuleBuilder
 */
var BaseModuleBuilder = /** @class */ (function () {
    function BaseModuleBuilder() {
    }
    /**
     * get container of the module.
     *
     * @returns {IContainer}
     * @memberof ModuleBuilder
     */
    BaseModuleBuilder.prototype.getContainer = function () {
        return this.container;
    };
    /**
     * reset new container.
     *
     * @memberof BaseModuleBuilder
     */
    BaseModuleBuilder.prototype.resetContainer = function () {
        this.container = this.getContainerBuilder().create();
    };
    /**
     * get container builder.
     *
     * @returns {IContainerBuilder}
     * @memberof IModuleBuilder
     */
    BaseModuleBuilder.prototype.getContainerBuilder = function () {
        return this.getContainer().resolve(core_1.ContainerBuilderToken);
    };
    /**
     * build module.
     *
     * @param {(Token<T>| ModuleConfiguration<T>)} [token]
     * @returns {Promise<any>}
     * @memberof ModuleBuilder
     */
    BaseModuleBuilder.prototype.build = function (token, data) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var cfg, builder, instacnce;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        cfg = this.getConfigure(token);
                        return [4 /*yield*/, this.mergeConfigure(cfg)];
                    case 1:
                        cfg = _a.sent();
                        builder = this.getBuilder(cfg);
                        return [4 /*yield*/, builder.createInstance(core_1.isToken(token) ? token : null, cfg, data)];
                    case 2:
                        instacnce = _a.sent();
                        return [4 /*yield*/, builder.buildStrategy(instacnce, cfg)];
                    case 3:
                        _a.sent();
                        return [2 /*return*/, instacnce];
                }
            });
        });
    };
    /**
     * bundle instance via config.
     *
     * @param {T} instance
     * @param {ModuleConfiguration<T>} config
     * @returns {Promise<T>}
     * @memberof IModuleBuilder
     */
    BaseModuleBuilder.prototype.buildStrategy = function (instance, config) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            return tslib_1.__generator(this, function (_a) {
                return [2 /*return*/, instance];
            });
        });
    };
    BaseModuleBuilder.prototype.importModule = function (token, forceNew) {
        if (forceNew === void 0) { forceNew = false; }
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var _this = this;
            var container, cfg, builder, importContainer, expProviders, bootToken;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        container = this.getContainer();
                        if (core_1.isClass(token) && !this.isDIModule(token)) {
                            container.register(token);
                            return [2 /*return*/, container];
                        }
                        cfg = this.getConfigure(token);
                        builder = this.getBuilder(cfg, forceNew);
                        forceNew && builder.resetContainer();
                        importContainer = builder.getContainer();
                        return [4 /*yield*/, builder.registerDepdences(importContainer, cfg)];
                    case 1:
                        _a.sent();
                        if (cfg.exports && cfg.exports.length) {
                            cfg.exports.forEach(function (tk) {
                                if (core_1.isClass(tk)) {
                                    if (_this.isDIModule(tk)) {
                                        return;
                                    }
                                    if (_this.isIocExt(tk)) {
                                        container.register(tk);
                                        return;
                                    }
                                }
                                container.bindProvider(tk, function () {
                                    var providers = [];
                                    for (var _i = 0; _i < arguments.length; _i++) {
                                        providers[_i] = arguments[_i];
                                    }
                                    return importContainer.resolve.apply(importContainer, [tk].concat(providers));
                                });
                            });
                        }
                        expProviders = cfg[exportsProvidersFiled];
                        if (expProviders && expProviders.length) {
                            expProviders.forEach(function (tk) {
                                container.bindProvider(tk, function () { return importContainer.get(tk); });
                            });
                        }
                        bootToken = this.getBootstrapToken(cfg, core_1.isClass(token) ? token : null);
                        if (core_1.isToken(bootToken)) {
                            container.bindProvider(bootToken, function () { return builder.createInstance(bootToken, cfg); });
                        }
                        return [2 /*return*/, container];
                }
            });
        });
    };
    BaseModuleBuilder.prototype.getBuilder = function (config, forceNew) {
        if (forceNew === void 0) { forceNew = false; }
        var builder;
        if (config.builder) {
            builder = this.getBuilderViaConfig(config.builder);
        }
        else {
            var token = this.getBootstrapToken(config);
            if (token) {
                builder = this.getBuilderViaToken(token);
            }
        }
        if (!builder) {
            builder = forceNew ? this.createBuilder() : this;
        }
        builder.rootContainer = this.rootContainer;
        return builder;
    };
    BaseModuleBuilder.prototype.getDecorator = function () {
        return decorators.DIModule.toString();
    };
    /**
     * get configuration.
     *
     * @returns {ModuleConfiguration<T>}
     * @memberof ModuleBuilder
     */
    BaseModuleBuilder.prototype.getConfigure = function (token) {
        var cfg;
        var container = this.getContainer();
        if (core_1.isClass(token)) {
            cfg = this.getMetaConfig(token);
        }
        else if (core_1.isToken(token)) {
            var tokenType = container.getTokenImpl(token);
            if (core_1.isClass(tokenType)) {
                cfg = this.getMetaConfig(tokenType);
            }
        }
        else {
            cfg = token;
            var bootToken = this.getBootstrapToken(cfg);
            var typeTask = core_1.isClass(bootToken) ? bootToken : container.getTokenImpl(bootToken);
            if (core_1.isClass(typeTask)) {
                cfg = core_1.lang.assign({}, this.getMetaConfig(typeTask), cfg || {});
            }
        }
        return cfg || {};
    };
    BaseModuleBuilder.prototype.createInstance = function (token, cfg, data) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var bootToken, container;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        bootToken = this.getBootstrapToken(cfg, token);
                        if (!bootToken) {
                            throw new Error('not find bootstrap token.');
                        }
                        container = this.getContainer();
                        return [4 /*yield*/, this.registerDepdences(container, cfg)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, this.resolveToken(container, token, cfg)];
                }
            });
        });
    };
    BaseModuleBuilder.prototype.registerDepdences = function (container, config) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.registerExts(container, config)];
                    case 1:
                        _a.sent();
                        if (!this.canRegRootDepds()) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.registerRootDepds(container, config)];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3: return [4 /*yield*/, this.registerConfgureDepds(container, config)];
                    case 4:
                        _a.sent();
                        return [2 /*return*/, container];
                }
            });
        });
    };
    BaseModuleBuilder.prototype.resolveToken = function (container, token, config) {
        if (core_1.isClass(token)) {
            if (!container.has(token)) {
                container.register(token);
            }
            return container.resolve(token);
        }
        else {
            return container.resolve(token);
        }
    };
    BaseModuleBuilder.prototype.registerRootDepds = function (container, config) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var appcfg;
            return tslib_1.__generator(this, function (_a) {
                if (!this.canRegRootDepds()) {
                    return [2 /*return*/, container];
                }
                appcfg = this.rootContainer.get(AppConfiguration.AppConfigurationToken);
                if (appcfg.exports && appcfg.exports.length || appcfg[exportsProvidersFiled]) {
                    this.importModule(appcfg);
                }
                return [2 /*return*/, container];
            });
        });
    };
    BaseModuleBuilder.prototype.canRegRootDepds = function () {
        return !!this.rootContainer;
    };
    BaseModuleBuilder.prototype.registerConfgureDepds = function (container, config) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var _this = this;
            var buider, mdls;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(core_1.isArray(config.imports) && config.imports.length)) return [3 /*break*/, 3];
                        buider = container.get(core_1.ContainerBuilderToken);
                        return [4 /*yield*/, buider.loader.loadTypes(config.imports, function (it) { return _this.isIocExt(it) || _this.isDIModule(it); })];
                    case 1:
                        mdls = _a.sent();
                        return [4 /*yield*/, Promise.all(mdls.map(function (md) { return _this.importModule(md); }))];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3:
                        if (core_1.isArray(config.providers) && config.providers.length) {
                            config[exportsProvidersFiled] = this.bindProvider(container, config.providers);
                        }
                        return [2 /*return*/, container];
                }
            });
        });
    };
    BaseModuleBuilder.prototype.createBuilder = function () {
        return new BaseModuleBuilder();
    };
    BaseModuleBuilder.prototype.getBootstrapToken = function (cfg, token) {
        return cfg.bootstrap || token;
    };
    BaseModuleBuilder.prototype.getBuilderViaConfig = function (builder) {
        if (core_1.isToken(builder)) {
            return this.getContainer().resolve(builder);
        }
        else if (builder instanceof ModuleBuilder) {
            return builder;
        }
        return null;
    };
    BaseModuleBuilder.prototype.getBuilderViaToken = function (mdl) {
        if (core_1.isToken(mdl)) {
            var taskType = core_1.isClass(mdl) ? mdl : this.getContainer().getTokenImpl(mdl);
            if (taskType) {
                var meta = core_1.lang.first(core_1.getTypeMetadata(this.getDecorator(), taskType));
                if (meta && meta.builder) {
                    return core_1.isToken(meta.builder) ? this.getContainer().resolve(meta.builder) : meta.builder;
                }
            }
        }
        return null;
    };
    BaseModuleBuilder.prototype.mergeConfigure = function (cfg) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            return tslib_1.__generator(this, function (_a) {
                return [2 /*return*/, cfg];
            });
        });
    };
    BaseModuleBuilder.prototype.getMetaConfig = function (bootModule) {
        var decorator = this.getDecorator();
        if (this.isDIModule(bootModule)) {
            var metas = core_1.getTypeMetadata(decorator, bootModule);
            if (metas && metas.length) {
                var meta = metas[0];
                meta.bootstrap = meta.bootstrap || bootModule;
                return core_1.lang.omit(meta, 'builder');
            }
        }
        return null;
    };
    BaseModuleBuilder.prototype.isIocExt = function (token) {
        return core_1.hasOwnClassMetadata(core_1.IocExt, token);
    };
    BaseModuleBuilder.prototype.isDIModule = function (token) {
        if (!core_1.isClass(token)) {
            return false;
        }
        if (core_1.hasOwnClassMetadata(this.getDecorator(), token)) {
            return true;
        }
        return core_1.hasOwnClassMetadata(decorators.DIModule, token);
    };
    BaseModuleBuilder.prototype.registerExts = function (container, config) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            return tslib_1.__generator(this, function (_a) {
                if (!container.has(BootstrapModule_1.BootstrapModule)) {
                    container.register(BootstrapModule_1.BootstrapModule);
                }
                return [2 /*return*/, container];
            });
        });
    };
    BaseModuleBuilder.prototype.bindProvider = function (container, providers) {
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
    BaseModuleBuilder.classAnnations = { "name": "BaseModuleBuilder", "params": { "constructor": [], "getContainer": [], "resetContainer": [], "getContainerBuilder": [], "build": ["token", "data"], "buildStrategy": ["instance", "config"], "importModule": ["token", "forceNew"], "getBuilder": ["config", "forceNew"], "getDecorator": [], "getConfigure": ["token"], "createInstance": ["token", "cfg", "data"], "registerDepdences": ["container", "config"], "resolveToken": ["container", "token", "config"], "registerRootDepds": ["container", "config"], "canRegRootDepds": [], "registerConfgureDepds": ["container", "config"], "createBuilder": [], "getBootstrapToken": ["cfg", "token"], "getBuilderViaConfig": ["builder"], "getBuilderViaToken": ["mdl"], "mergeConfigure": ["cfg"], "getMetaConfig": ["bootModule"], "isIocExt": ["token"], "isDIModule": ["token"], "registerExts": ["container", "config"], "bindProvider": ["container", "providers"] } };
    return BaseModuleBuilder;
}());
exports.BaseModuleBuilder = BaseModuleBuilder;
/**
 * default module builder
 *
 * @export
 * @class ModuleBuilder
 * @extends {BaseModuleBuilder<T>}
 * @implements {IModuleBuilder<T>}
 * @template T
 */
var ModuleBuilder = /** @class */ (function (_super) {
    tslib_1.__extends(ModuleBuilder, _super);
    function ModuleBuilder() {
        return _super.call(this) || this;
    }
    ModuleBuilder_1 = ModuleBuilder;
    ModuleBuilder.prototype.createBuilder = function () {
        return new ModuleBuilder_1();
    };
    ModuleBuilder.classAnnations = { "name": "ModuleBuilder", "params": { "constructor": [], "createBuilder": [] } };
    tslib_1.__decorate([
        core_1.Inject(core_1.ContainerToken),
        tslib_1.__metadata("design:type", Object)
    ], ModuleBuilder.prototype, "container", void 0);
    ModuleBuilder = ModuleBuilder_1 = tslib_1.__decorate([
        core_1.Injectable(IModuleBuilder.ModuleBuilderToken),
        tslib_1.__metadata("design:paramtypes", [])
    ], ModuleBuilder);
    return ModuleBuilder;
    var ModuleBuilder_1;
}(BaseModuleBuilder));
exports.ModuleBuilder = ModuleBuilder;


});

unwrapExports(ModuleBuilder_1);
var ModuleBuilder_2 = ModuleBuilder_1.BaseModuleBuilder;
var ModuleBuilder_3 = ModuleBuilder_1.ModuleBuilder;

var ApplicationBuilder_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });






/**
 * application builder.
 *
 * @export
 * @class ApplicationBuilder
 * @extends {BaseModuleBuilder<T>}
 * @template T
 */
var ApplicationBuilder = /** @class */ (function (_super) {
    tslib_1.__extends(ApplicationBuilder, _super);
    function ApplicationBuilder(baseURL) {
        var _this = _super.call(this) || this;
        _this.baseURL = baseURL;
        _this.globalModules = [];
        _this.customRegs = [];
        return _this;
    }
    ApplicationBuilder_1 = ApplicationBuilder;
    ApplicationBuilder.prototype.getContainer = function () {
        if (!this.container) {
            var builder = this.getContainerBuilder();
            this.container = builder.create();
        }
        return this.container;
    };
    ApplicationBuilder.prototype.getContainerBuilder = function () {
        if (!this.containerBuilder) {
            this.containerBuilder = this.createContainerBuilder();
        }
        return this.containerBuilder;
    };
    ApplicationBuilder.prototype.createContainerBuilder = function () {
        return new core_1.DefaultContainerBuilder();
    };
    /**
     * use configuration.
     *
     * @param {(string | AppConfiguration<T>)} [config]
     * @returns {this} global config for this application.
     * @memberof Bootstrap
     */
    ApplicationBuilder.prototype.useConfiguration = function (config) {
        if (!this.globalConfig) {
            this.globalConfig = Promise.resolve(this.getDefaultConfig());
        }
        var pcfg;
        var builder = this.getContainerBuilder();
        if (core_1.isString(config)) {
            pcfg = builder.loader.load([config])
                .then(function (rs) {
                return rs.length ? rs[0] : null;
            });
        }
        else if (config) {
            pcfg = Promise.resolve(config);
        }
        if (pcfg) {
            this.globalConfig = this.globalConfig
                .then(function (cfg) {
                return pcfg.then(function (rcfg) {
                    var excfg = (rcfg['default'] ? rcfg['default'] : rcfg);
                    cfg = core_1.lang.assign(cfg || {}, excfg || {});
                    return cfg;
                });
            });
        }
        return this;
    };
    /**
     * use module as global Depdences module.
     *
     * @param {...LoadType[]} modules
     * @returns {this}
     * @memberof PlatformServer
     */
    ApplicationBuilder.prototype.use = function () {
        var modules = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            modules[_i] = arguments[_i];
        }
        this.globalModules = this.globalModules.concat(modules);
        return this;
    };
    /**
     * build and bootstrap application.
     *
     * @param {(Token<T> | Type<any> | AppConfiguration<T>)} token
     * @returns {Promise<T>}
     * @memberof ApplicationBuilder
     */
    ApplicationBuilder.prototype.bootstrap = function (token) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var app, bootMd, container;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.build(token)];
                    case 1:
                        app = _a.sent();
                        container = app.container || this.getContainer();
                        if (app.config && core_1.isToken(token)) {
                            if (app.config.bootstrap !== token) {
                                if (!container.has(token) && core_1.isClass(token)) {
                                    container.register(token);
                                }
                                if (container.has(token)) {
                                    bootMd = container.resolve(token);
                                }
                            }
                        }
                        bootMd = bootMd || app;
                        if (!core_1.isFunction(bootMd.onStart)) return [3 /*break*/, 3];
                        return [4 /*yield*/, Promise.resolve(bootMd.onStart(app))];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3:
                        if (core_1.isFunction(bootMd.onStarted)) {
                            bootMd.onStarted(app);
                        }
                        return [2 /*return*/, app];
                }
            });
        });
    };
    /**
     * build application.
     *
     * @param {IModuleBuilder<T>} builder
     * @param {(Token<T> | Type<any> | AppConfiguration<T>)} token
     * @returns {Promise<any>}
     * @memberof ApplicationBuilder
     */
    ApplicationBuilder.prototype.build = function (token, data) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var builder;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!!this.rootContainer) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.registerRoot()];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2:
                        this.resetContainer();
                        this.container.bindProvider(IModuleBuilder.RootContainerToken, this.rootContainer);
                        if (!this.rootContainer.has(IModuleBuilder.RootModuleBuilderToken)) return [3 /*break*/, 4];
                        builder = this.rootContainer.get(IModuleBuilder.RootModuleBuilderToken);
                        return [4 /*yield*/, builder.build(token, data)];
                    case 3: return [2 /*return*/, _a.sent()];
                    case 4: return [4 /*yield*/, _super.prototype.build.call(this, token, data)];
                    case 5: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    ApplicationBuilder.prototype.registerRoot = function () {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var cfg;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!!this.rootContainer) return [3 /*break*/, 3];
                        this.rootContainer = this.getContainerBuilder().create();
                        return [4 /*yield*/, this.useConfiguration()];
                    case 1:
                        cfg = _a.sent();
                        this.bindAppConfig(cfg);
                        return [4 /*yield*/, this.registerDepdences(this.rootContainer, cfg)];
                    case 2:
                        _a.sent();
                        this.rootContainer.bindProvider(AppConfiguration.AppConfigurationToken, cfg);
                        _a.label = 3;
                    case 3: return [2 /*return*/, this.rootContainer];
                }
            });
        });
    };
    ApplicationBuilder.prototype.canRegRootDepds = function () {
        return false;
    };
    /**
     * create default container builder.
     *
     * @protected
     * @returns
     * @memberof ApplicationBuilder
     */
    ApplicationBuilder.prototype.createBuilder = function (baseURL) {
        return new ApplicationBuilder_1(baseURL);
    };
    /**
     * register ioc exts
     *
     * @protected
     * @param {IContainer} container
     * @param {AppConfiguration<T>} config
     * @returns {Promise<IContainer>}
     * @memberof ApplicationBuilder
     */
    ApplicationBuilder.prototype.registerExts = function (container, config) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var _this = this;
            var usedModules, tokens;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, _super.prototype.registerExts.call(this, container, config)];
                    case 1:
                        _a.sent();
                        config.exports = config.exports || [];
                        if (!this.customRegs.length) return [3 /*break*/, 3];
                        return [4 /*yield*/, Promise.all(this.customRegs.map(function (cs) { return tslib_1.__awaiter(_this, void 0, void 0, function () {
                                var tokens;
                                return tslib_1.__generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, cs(container, config, this)];
                                        case 1:
                                            tokens = _a.sent();
                                            if (core_1.isArray(tokens) && tokens.length) {
                                                config.exports = config.exports.concat(tokens);
                                            }
                                            return [2 /*return*/];
                                    }
                                });
                            }); }))];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3:
                        if (!this.globalModules.length) return [3 /*break*/, 5];
                        usedModules = this.globalModules;
                        return [4 /*yield*/, container.loadModule.apply(container, usedModules)];
                    case 4:
                        tokens = _a.sent();
                        if (tokens.length) {
                            config.exports = config.exports.concat(tokens);
                        }
                        _a.label = 5;
                    case 5: return [2 /*return*/, container];
                }
            });
        });
    };
    /**
     * meger config configuration with global config.
     *
     * @protected
     * @param {AppConfiguration<T>} cfg
     * @returns {Promise<AppConfiguration<T>>}
     * @memberof ApplicationBuilder
     */
    ApplicationBuilder.prototype.mergeConfigure = function (cfg) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var gcfg;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, _super.prototype.mergeConfigure.call(this, cfg)];
                    case 1:
                        cfg = _a.sent();
                        gcfg = this.rootContainer.get(AppConfiguration.AppConfigurationToken);
                        return [2 /*return*/, core_1.lang.assign({}, core_1.lang.omit(gcfg || {}, 'imports', 'providers', 'bootstrap', 'builder', 'exports'), cfg)];
                }
            });
        });
    };
    ApplicationBuilder.prototype.bindAppConfig = function (config) {
        if (this.baseURL) {
            config.baseURL = this.baseURL;
        }
        return config;
    };
    ApplicationBuilder.prototype.getDefaultConfig = function () {
        return { debug: false };
    };
    ApplicationBuilder.classAnnations = { "name": "ApplicationBuilder", "params": { "constructor": ["baseURL"], "getContainer": [], "getContainerBuilder": [], "createContainerBuilder": [], "useConfiguration": ["config"], "use": ["modules"], "bootstrap": ["token"], "build": ["token", "data"], "registerRoot": [], "canRegRootDepds": [], "createBuilder": ["baseURL"], "registerExts": ["container", "config"], "mergeConfigure": ["cfg"], "bindAppConfig": ["config"], "getDefaultConfig": [] } };
    ApplicationBuilder = ApplicationBuilder_1 = tslib_1.__decorate([
        core_1.Injectable(IApplicationBuilder.ApplicationBuilderToken),
        tslib_1.__metadata("design:paramtypes", [String])
    ], ApplicationBuilder);
    return ApplicationBuilder;
    var ApplicationBuilder_1;
}(ModuleBuilder_1.BaseModuleBuilder));
exports.ApplicationBuilder = ApplicationBuilder;


});

unwrapExports(ApplicationBuilder_1);
var ApplicationBuilder_2 = ApplicationBuilder_1.ApplicationBuilder;

var D__workspace_github_tsioc_packages_bootstrap_lib = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

tslib_1.__exportStar(decorators, exports);
tslib_1.__exportStar(AppConfiguration, exports);
tslib_1.__exportStar(ApplicationBuilder_1, exports);
tslib_1.__exportStar(IApplication, exports);
tslib_1.__exportStar(IApplicationBuilder, exports);
tslib_1.__exportStar(IModuleBuilder, exports);
tslib_1.__exportStar(ModuleBuilder_1, exports);
tslib_1.__exportStar(BootstrapModule_1, exports);


});

var index$1 = unwrapExports(D__workspace_github_tsioc_packages_bootstrap_lib);

return index$1;

})));
