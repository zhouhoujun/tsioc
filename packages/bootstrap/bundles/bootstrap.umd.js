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
exports.Bootstrap = createBootstrapDecorator('bootstrap', IApplicationBuilder.ApplicationBuilderToken);


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

var IBootstrapBuilder = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });


/**
 * inject Bootstrap builder.
 *
 * @export
 * @class InjectBootstrapBuilder
 * @extends {Registration<T>}
 * @template T
 */
var InjectBootstrapBuilder = /** @class */ (function (_super) {
    tslib_1.__extends(InjectBootstrapBuilder, _super);
    function InjectBootstrapBuilder(desc) {
        return _super.call(this, 'DI_ModuleBootstrap', desc) || this;
    }
    InjectBootstrapBuilder.classAnnations = { "name": "InjectBootstrapBuilder", "params": { "constructor": ["desc"] } };
    return InjectBootstrapBuilder;
}(core_1.Registration));
exports.InjectBootstrapBuilder = InjectBootstrapBuilder;
/**
 * bootstrap builder token.
 */
exports.BootstrapBuilderToken = new InjectBootstrapBuilder('');


});

unwrapExports(IBootstrapBuilder);
var IBootstrapBuilder_1 = IBootstrapBuilder.InjectBootstrapBuilder;
var IBootstrapBuilder_2 = IBootstrapBuilder.BootstrapBuilderToken;

var BootstrapBuilder_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });



/**
 * bootstrap base builder.
 *
 * @export
 * @class BootstrapBuilder
 * @implements {IBootstrapBuilder<T>}
 * @template T
 */
var BootstrapBuilder = /** @class */ (function () {
    function BootstrapBuilder() {
    }
    BootstrapBuilder_1 = BootstrapBuilder;
    BootstrapBuilder.prototype.build = function (iocModule, data) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var builder, container, instance;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        builder = this.getBuilder(iocModule);
                        if (!iocModule.bootstrap) {
                            iocModule.bootstrap = builder.getBootstrapToken(iocModule);
                        }
                        if (!iocModule.bootstrap) {
                            throw new Error('cant not find bootstrap token.');
                        }
                        container = iocModule.container;
                        if (!container) {
                            throw new Error('cant not find container.');
                        }
                        instance = container.resolve(iocModule.bootstrap, data);
                        return [4 /*yield*/, builder.buildStrategy(instance, iocModule)];
                    case 1:
                        instance = _a.sent();
                        return [2 /*return*/, instance];
                }
            });
        });
    };
    BootstrapBuilder.prototype.getBootstrapToken = function (iocModule) {
        return iocModule.bootstrap || iocModule.moduleToken;
    };
    /**
     * bundle instance via config.
     *
     * @param {T} instance
     * @param {IocModule<T>} config
     * @returns {Promise<T>}
     * @memberof IModuleBuilder
     */
    BootstrapBuilder.prototype.buildStrategy = function (instance, iocModule) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            return tslib_1.__generator(this, function (_a) {
                return [2 /*return*/, instance];
            });
        });
    };
    BootstrapBuilder.prototype.getBuilder = function (iocModule) {
        if (!iocModule.bootBuilder) {
            var builder = void 0;
            if (iocModule.moduleConfig.bootBuilder) {
                builder = this.getBuilderViaConfig(iocModule.moduleConfig.bootBuilder, iocModule.container);
            }
            if (!builder) {
                builder = this;
            }
            iocModule.bootBuilder = builder;
        }
        return iocModule.bootBuilder;
    };
    BootstrapBuilder.prototype.getBuilderViaConfig = function (builder, container) {
        if (core_1.isToken(builder)) {
            return container.resolve(builder);
        }
        else if (builder instanceof BootstrapBuilder_1) {
            return builder;
        }
        return null;
    };
    // protected getBuilderViaToken(mdl: Token<T>, container: IContainer): IBootstrapBuilder<T> {
    //     if (isToken(mdl)) {
    //         let taskType = isClass(mdl) ? mdl : container.getTokenImpl(mdl);
    //         if (taskType) {
    //             let meta = lang.first(getTypeMetadata<ModuleConfiguration<T>>(this.getDecorator(), taskType));
    //             if (meta && meta.builder) {
    //                 return isToken(meta.builder) ? container.resolve(meta.builder) : meta.builder;
    //             }
    //         }
    //     }
    //     return null;
    // }
    BootstrapBuilder.classAnnations = { "name": "BootstrapBuilder", "params": { "constructor": [], "build": ["iocModule", "data"], "getBootstrapToken": ["iocModule"], "buildStrategy": ["instance", "iocModule"], "getBuilder": ["iocModule"], "getBuilderViaConfig": ["builder", "container"] } };
    BootstrapBuilder = BootstrapBuilder_1 = tslib_1.__decorate([
        core_1.Singleton(IBootstrapBuilder.BootstrapBuilderToken),
        tslib_1.__metadata("design:paramtypes", [])
    ], BootstrapBuilder);
    return BootstrapBuilder;
    var BootstrapBuilder_1;
}());
exports.BootstrapBuilder = BootstrapBuilder;


});

unwrapExports(BootstrapBuilder_1);
var BootstrapBuilder_2 = BootstrapBuilder_1.BootstrapBuilder;

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
        container.register(BootstrapBuilder_1.BootstrapBuilder);
        container.register(ApplicationBuilder.DefaultApplicationBuilder);
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
 * module builder
 *
 * @export
 * @class ModuleBuilderBase
 * @implements {IModuleBuilder<T>}
 * @template T
 */
var ModuleBuilder = /** @class */ (function () {
    function ModuleBuilder() {
    }
    /**
     * get container of the module.
     *
     * @param {(ModuleType<T> | ModuleConfiguration<T>)} token module type or module configuration.
     * @param {IContainer} [defaultContainer] set default container or not. not set will create new container.
     * @returns {IContainer}
     * @memberof BaseModuleBuilder
     */
    ModuleBuilder.prototype.getContainer = function (token, defaultContainer) {
        var container;
        if (core_1.isClass(token)) {
            if (token.__di) {
                return token.__di;
            }
            else {
                var cfg = this.getConfigure(token);
                if (cfg.container) {
                    token.__di = cfg.container;
                }
                else {
                    token.__di = defaultContainer || this.createContainer();
                }
                container = token.__di;
            }
        }
        else {
            if (token.container) {
                container = token.container;
            }
            else {
                container = token.container = defaultContainer || this.createContainer();
            }
        }
        return container;
    };
    ModuleBuilder.prototype.createContainer = function () {
        return this.getContainerBuilder().create();
    };
    ModuleBuilder.prototype.getContainerBuilder = function () {
        if (!this.containerBuilder) {
            this.containerBuilder = this.createContainerBuilder();
        }
        return this.containerBuilder;
    };
    ModuleBuilder.prototype.createContainerBuilder = function () {
        return new core_1.DefaultContainerBuilder();
    };
    /**
     * build module.
     *
     * @param {(ModuleType | ModuleConfiguration<any>)} [token]
     * @returns {Promise<any>}
     * @memberof ModuleBuilderBase
     */
    ModuleBuilder.prototype.build = function (token, defaultContainer) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var container, mdToken, cfg, boot, iocModule;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        container = this.getContainer(token, defaultContainer);
                        mdToken = core_1.isToken(token) ? token : token.name;
                        if (core_1.isToken(mdToken) && container.has(mdToken)) {
                            return [2 /*return*/, container.resolve(mdToken)];
                        }
                        cfg = this.getConfigure(token, container);
                        return [4 /*yield*/, this.registerDepdences(container, cfg)];
                    case 1:
                        cfg = _a.sent();
                        boot = this.getBootstrapToken(cfg, mdToken);
                        iocModule = this.createModuleInstance(mdToken, container);
                        iocModule.bootstrap = boot;
                        iocModule.container = container;
                        if (!iocModule.bootBuilder) {
                            iocModule.bootBuilder = this.getBootstrapBuilder(container, cfg);
                        }
                        iocModule.moduleConfig = cfg;
                        if (core_1.isClass(boot)) {
                            if (!container.has(boot)) {
                                container.register(boot);
                            }
                        }
                        if (core_1.isToken(mdToken)) {
                            iocModule.moduleToken = mdToken;
                            container.bindProvider(mdToken, iocModule);
                        }
                        if (core_1.isFunction(iocModule.mdOnLoaded)) {
                            iocModule.mdOnLoaded(iocModule);
                        }
                        return [2 /*return*/, iocModule];
                }
            });
        });
    };
    ModuleBuilder.prototype.createModuleInstance = function (token, container) {
        var iocModule;
        if (!token || core_1.isString(token)) {
            iocModule = container.resolve(token);
        }
        else {
            if (core_1.isClass(token) && !container.has(token)) {
                container.register(token);
            }
            iocModule = container.resolve(token);
        }
        return iocModule;
    };
    ModuleBuilder.prototype.getBootstrapBuilder = function (container, cfg) {
        var bootstrapBuilder;
        if (core_1.isClass(cfg.bootBuilder)) {
            if (!container.has(cfg.bootBuilder)) {
                container.register(cfg.bootBuilder);
            }
        }
        if (core_1.isToken(cfg.bootBuilder)) {
            bootstrapBuilder = container.resolve(cfg.bootBuilder);
        }
        else if (cfg.bootBuilder instanceof BootstrapBuilder_1.BootstrapBuilder) {
            bootstrapBuilder = cfg.bootBuilder;
        }
        return bootstrapBuilder;
    };
    /**
     * bootstrap module.
     *
     * @param {(ModuleType | ModuleConfiguration<any>)} token
     * @param {IContainer} [defaultContainer]
     * @memberof ModuleBuilderBase
     */
    ModuleBuilder.prototype.bootstrap = function (token, defaultContainer) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var md, instance;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.build(token, defaultContainer)];
                    case 1:
                        md = _a.sent();
                        if (core_1.isFunction(md.mdBeforeCreate)) {
                            md.mdBeforeCreate(md);
                        }
                        return [4 /*yield*/, this.createBootstrap(md)];
                    case 2:
                        instance = _a.sent();
                        if (core_1.isFunction(md.mdAfterCreate)) {
                            md.mdAfterCreate(instance);
                        }
                        if (!core_1.isFunction(md.mdOnStart)) return [3 /*break*/, 4];
                        return [4 /*yield*/, Promise.resolve(md.mdOnStart(instance))];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4:
                        if (core_1.isFunction(md.mdOnStarted)) {
                            md.mdOnStarted(instance);
                        }
                        return [2 /*return*/, md];
                }
            });
        });
    };
    ModuleBuilder.prototype.createBootstrap = function (iocModule) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var bootBuilder;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        bootBuilder = iocModule.bootBuilder || iocModule.container.resolve(IBootstrapBuilder.BootstrapBuilderToken);
                        return [4 /*yield*/, bootBuilder.build(iocModule)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    ModuleBuilder.prototype.importModule = function (token, container) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var imp;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (container && core_1.isClass(token) && !this.isDIModule(token)) {
                            container.register(token);
                            return [2 /*return*/, container];
                        }
                        return [4 /*yield*/, this.build(token)];
                    case 1:
                        imp = _a.sent();
                        if (!!container.has(imp.moduleToken)) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.importConfigExports(container, imp.container, imp.moduleConfig)];
                    case 2:
                        _a.sent();
                        imp.container.parent = container;
                        if (imp.moduleToken) {
                            container.bindProvider(imp.moduleToken, imp);
                        }
                        _a.label = 3;
                    case 3: return [2 /*return*/, container];
                }
            });
        });
    };
    ModuleBuilder.prototype.getDecorator = function () {
        return decorators.DIModule.toString();
    };
    /**
     * get configuration.
     *
     * @returns {ModuleConfiguration<T>}
     * @memberof ModuleBuilderBase
     */
    ModuleBuilder.prototype.getConfigure = function (token, container) {
        var cfg;
        if (core_1.isClass(token)) {
            cfg = this.getMetaConfig(token);
        }
        else if (core_1.isToken(token)) {
            var tokenType = container ? container.getTokenImpl(token) : token;
            if (core_1.isClass(tokenType)) {
                cfg = this.getMetaConfig(tokenType);
            }
        }
        else {
            cfg = token;
            var bootToken = this.getBootstrapToken(cfg);
            if (bootToken) {
                var typeTask = core_1.isClass(bootToken) ? bootToken : (container ? container.getTokenImpl(bootToken) : bootToken);
                if (core_1.isClass(typeTask)) {
                    cfg = core_1.lang.assign({}, this.getMetaConfig(typeTask), cfg || {});
                }
            }
        }
        return cfg || {};
    };
    ModuleBuilder.prototype.registerDepdences = function (container, config) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.registerExts(container, config)];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, this.registerConfgureDepds(container, config)];
                    case 2:
                        config = _a.sent();
                        return [2 /*return*/, config];
                }
            });
        });
    };
    ModuleBuilder.prototype.getBootstrapToken = function (cfg, token) {
        return cfg.bootstrap;
    };
    ModuleBuilder.prototype.importConfigExports = function (container, providerContainer, cfg) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var _this = this;
            var expProviders;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(cfg.exports && cfg.exports.length)) return [3 /*break*/, 2];
                        return [4 /*yield*/, Promise.all(cfg.exports.map(function (tk) { return tslib_1.__awaiter(_this, void 0, void 0, function () {
                                return tslib_1.__generator(this, function (_a) {
                                    container.bindProvider(tk, function () {
                                        var providers = [];
                                        for (var _i = 0; _i < arguments.length; _i++) {
                                            providers[_i] = arguments[_i];
                                        }
                                        return providerContainer.resolve.apply(providerContainer, [tk].concat(providers));
                                    });
                                    return [2 /*return*/, tk];
                                });
                            }); }))];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2:
                        expProviders = cfg[exportsProvidersFiled];
                        if (expProviders && expProviders.length) {
                            expProviders.forEach(function (tk) {
                                container.bindProvider(tk, function () { return providerContainer.get(tk); });
                            });
                        }
                        return [2 /*return*/, container];
                }
            });
        });
    };
    ModuleBuilder.prototype.registerConfgureDepds = function (container, config) {
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
                        return [4 /*yield*/, Promise.all(mdls.map(function (md) { return _this.importModule(md, container); }))];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3:
                        if (core_1.isArray(config.providers) && config.providers.length) {
                            config[exportsProvidersFiled] = this.bindProvider(container, config.providers);
                        }
                        return [2 /*return*/, config];
                }
            });
        });
    };
    ModuleBuilder.prototype.getMetaConfig = function (bootModule) {
        var decorator = this.getDecorator();
        if (this.isDIModule(bootModule)) {
            var metas = core_1.getTypeMetadata(decorator, bootModule);
            if (metas && metas.length) {
                var meta = metas[0];
                // meta.bootstrap = meta.bootstrap || bootModule;
                return core_1.lang.omit(meta, 'builder');
            }
        }
        return null;
    };
    ModuleBuilder.prototype.isIocExt = function (token) {
        return core_1.hasOwnClassMetadata(core_1.IocExt, token);
    };
    ModuleBuilder.prototype.isDIModule = function (token) {
        if (!core_1.isClass(token)) {
            return false;
        }
        if (core_1.hasOwnClassMetadata(this.getDecorator(), token)) {
            return true;
        }
        return core_1.hasOwnClassMetadata(decorators.DIModule, token);
    };
    ModuleBuilder.prototype.registerExts = function (container, config) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            return tslib_1.__generator(this, function (_a) {
                if (!container.has(BootstrapModule_1.BootstrapModule)) {
                    container.register(BootstrapModule_1.BootstrapModule);
                }
                return [2 /*return*/, container];
            });
        });
    };
    ModuleBuilder.prototype.bindProvider = function (container, providers) {
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
    ModuleBuilder.classAnnations = { "name": "ModuleBuilder", "params": { "constructor": [], "getContainer": ["token", "defaultContainer"], "createContainer": [], "getContainerBuilder": [], "createContainerBuilder": [], "build": ["token", "defaultContainer"], "createModuleInstance": ["token", "container"], "getBootstrapBuilder": ["container", "cfg"], "bootstrap": ["token", "defaultContainer"], "createBootstrap": ["iocModule"], "importModule": ["token", "container"], "getDecorator": [], "getConfigure": ["token", "container"], "registerDepdences": ["container", "config"], "getBootstrapToken": ["cfg", "token"], "importConfigExports": ["container", "providerContainer", "cfg"], "registerConfgureDepds": ["container", "config"], "getMetaConfig": ["bootModule"], "isIocExt": ["token"], "isDIModule": ["token"], "registerExts": ["container", "config"], "bindProvider": ["container", "providers"] } };
    tslib_1.__decorate([
        core_1.Inject(core_1.ContainerBuilderToken),
        tslib_1.__metadata("design:type", Object)
    ], ModuleBuilder.prototype, "containerBuilder", void 0);
    ModuleBuilder = tslib_1.__decorate([
        core_1.Singleton(IModuleBuilder.ModuleBuilderToken),
        tslib_1.__metadata("design:paramtypes", [])
    ], ModuleBuilder);
    return ModuleBuilder;
}());
exports.ModuleBuilder = ModuleBuilder;


});

unwrapExports(ModuleBuilder_1);
var ModuleBuilder_2 = ModuleBuilder_1.ModuleBuilder;

var ApplicationBuilder = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });



/**
 * application builder.
 *
 * @export
 * @class Default ApplicationBuilder
 * @extends {ModuleBuilder<T>}
 * @template T
 */
var DefaultApplicationBuilder = /** @class */ (function (_super) {
    tslib_1.__extends(DefaultApplicationBuilder, _super);
    function DefaultApplicationBuilder(baseURL) {
        var _this = _super.call(this) || this;
        _this.baseURL = baseURL;
        _this.globalModules = [];
        _this.customRegs = [];
        return _this;
    }
    /**
     * use configuration.
     *
     * @param {(string | AppConfiguration<T>)} [config]
     * @returns {this} global config for this application.
     * @memberof Bootstrap
     */
    DefaultApplicationBuilder.prototype.useConfiguration = function (config, container) {
        if (!this.globalConfig) {
            this.globalConfig = Promise.resolve(this.getDefaultConfig());
        }
        var pcfg;
        if (core_1.isString(config)) {
            if (container) {
                var builder = container.resolve(core_1.ContainerBuilderToken);
                pcfg = builder.loader.load([config])
                    .then(function (rs) {
                    return rs.length ? rs[0] : null;
                });
            }
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
    DefaultApplicationBuilder.prototype.use = function () {
        var modules = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            modules[_i] = arguments[_i];
        }
        this.globalModules = this.globalModules.concat(modules);
        return this;
    };
    DefaultApplicationBuilder.prototype.registerConfgureDepds = function (container, config) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var globalCfg;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.globalConfig) {
                            this.useConfiguration();
                        }
                        return [4 /*yield*/, this.globalConfig];
                    case 1:
                        globalCfg = _a.sent();
                        config = this.mergeGlobalConfig(globalCfg, config);
                        this.bindAppConfig(config);
                        return [4 /*yield*/, _super.prototype.registerConfgureDepds.call(this, container, config)];
                    case 2:
                        config = _a.sent();
                        return [2 /*return*/, config];
                }
            });
        });
    };
    DefaultApplicationBuilder.prototype.mergeGlobalConfig = function (globalCfg, moduleCfg) {
        return core_1.lang.assign({}, globalCfg, moduleCfg);
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
    DefaultApplicationBuilder.prototype.registerExts = function (container, config) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var _this = this;
            var usedModules;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, _super.prototype.registerExts.call(this, container, config)];
                    case 1:
                        _a.sent();
                        config.exports = config.exports || [];
                        if (!this.globalModules.length) return [3 /*break*/, 3];
                        usedModules = this.globalModules;
                        return [4 /*yield*/, container.loadModule.apply(container, usedModules)];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3:
                        if (!this.customRegs.length) return [3 /*break*/, 5];
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
                    case 4:
                        _a.sent();
                        _a.label = 5;
                    case 5: return [2 /*return*/, container];
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
    DefaultApplicationBuilder.prototype.getDefaultConfig = function () {
        return { debug: false };
    };
    DefaultApplicationBuilder.classAnnations = { "name": "DefaultApplicationBuilder", "params": { "constructor": ["baseURL"], "useConfiguration": ["config", "container"], "use": ["modules"], "registerConfgureDepds": ["container", "config"], "mergeGlobalConfig": ["globalCfg", "moduleCfg"], "registerExts": ["container", "config"], "bindAppConfig": ["config"], "getDefaultConfig": [] } };
    return DefaultApplicationBuilder;
}(ModuleBuilder_1.ModuleBuilder));
exports.DefaultApplicationBuilder = DefaultApplicationBuilder;


});

unwrapExports(ApplicationBuilder);
var ApplicationBuilder_1 = ApplicationBuilder.DefaultApplicationBuilder;

var D__Workspace_Projects_modules_tsioc_packages_bootstrap_lib = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

tslib_1.__exportStar(decorators, exports);
tslib_1.__exportStar(AppConfiguration, exports);
tslib_1.__exportStar(ApplicationBuilder, exports);
tslib_1.__exportStar(IApplicationBuilder, exports);
tslib_1.__exportStar(IModuleBuilder, exports);
tslib_1.__exportStar(ModuleBuilder_1, exports);
tslib_1.__exportStar(BootstrapModule_1, exports);
tslib_1.__exportStar(IBootstrapBuilder, exports);
tslib_1.__exportStar(BootstrapBuilder_1, exports);


});

var index$1 = unwrapExports(D__Workspace_Projects_modules_tsioc_packages_bootstrap_lib);

return index$1;

})));
