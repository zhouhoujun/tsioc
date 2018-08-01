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

var DIModule = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

/**
 * create bootstrap decorator.
 *
 * @export
 * @template T
 * @param {string} decorType
 * @param {(Token<IModuleBuilder> | IModuleBuilder)} [builder]
 * @param {(Token<IModuleBuilder<any>> | IModuleBuilder<any>)} [bootBuilder]
 * @param {InjectToken<IApplication>} provideType default provide type.
 * @param {MetadataAdapter} [adapter]
 * @param {MetadataExtends<T>} [metadataExtends]
 * @returns {IDIModuleDecorator<T>}
 */
function createDIModuleDecorator(decorType, builder, bootBuilder, provideType, adapter, metadataExtends) {
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
        if (!metadata.bootBuilder) {
            metadata.bootBuilder = bootBuilder;
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
exports.DIModule = createDIModuleDecorator('module');


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
 * @param {(Token<IApplicationBuilder> | IApplicationBuilder)} [builder]
 * @param {(Token<IBootstrapBuilder<any>> | IBootstrapBuilder<Tany>)} [bootBuilder]
 * @param {InjectToken<IApplication>} provideType default provide type.
 * @param {MetadataAdapter} [adapter]
 * @param {MetadataExtends<T>} [metadataExtends]
 * @returns {IBootstrapDecorator<T>}
 */
function createBootstrapDecorator(decorType, builder, bootBuilder, provideType, adapter, metadataExtends) {
    return DIModule.createDIModuleDecorator(decorType, builder, bootBuilder, provideType, adapter, metadataExtends);
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


});

unwrapExports(IModuleBuilder);
var IModuleBuilder_1 = IModuleBuilder.InjectModuleBuilder;
var IModuleBuilder_2 = IModuleBuilder.ModuleBuilderToken;

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
 * @implements {IBootstrapBuilder}
 * @template T
 */
var BootstrapBuilder = /** @class */ (function () {
    function BootstrapBuilder() {
    }
    BootstrapBuilder_1 = BootstrapBuilder;
    BootstrapBuilder.prototype.build = function (token, config, data) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var instance;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        token = this.getBootstrapToken(token, config);
                        return [4 /*yield*/, this.createInstance(token, data)];
                    case 1:
                        instance = _a.sent();
                        return [4 /*yield*/, this.buildStrategy(instance, config)];
                    case 2:
                        instance = _a.sent();
                        return [2 /*return*/, instance];
                }
            });
        });
    };
    BootstrapBuilder.prototype.createInstance = function (token, config, data) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var instance;
            return tslib_1.__generator(this, function (_a) {
                if (!token) {
                    throw new Error('cant not find bootstrap token.');
                }
                if (!this.container.has(token)) {
                    throw new Error('cant not find container.');
                }
                instance = this.resolveToken(token, data);
                return [2 /*return*/, instance];
            });
        });
    };
    /**
     * bundle instance via config.
     *
     * @param {T} instance
     * @param {ModuleConfigure} config
     * @param {IContainer} [container]
     * @returns {Promise<T>}
     * @memberof BootstrapBuilder
     */
    BootstrapBuilder.prototype.buildStrategy = function (instance, config) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            return tslib_1.__generator(this, function (_a) {
                return [2 /*return*/, instance];
            });
        });
    };
    BootstrapBuilder.prototype.getBootstrapToken = function (token, config) {
        return token || config.bootstrap;
    };
    BootstrapBuilder.prototype.resolveToken = function (token, data) {
        return this.container.resolve(token, data);
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
    BootstrapBuilder.classAnnations = { "name": "BootstrapBuilder", "params": { "constructor": [], "build": ["token", "config", "data"], "createInstance": ["token", "config", "data"], "buildStrategy": ["instance", "config"], "getBootstrapToken": ["token", "config"], "resolveToken": ["token", "data"], "getBuilderViaConfig": ["builder", "container"] } };
    tslib_1.__decorate([
        core_1.Inject(core_1.ContainerToken),
        tslib_1.__metadata("design:type", Object)
    ], BootstrapBuilder.prototype, "container", void 0);
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
        container.register(ModuleBuilder_1.ModuleBuilder);
        container.register(BootstrapBuilder_1.BootstrapBuilder);
        container.register(ApplicationBuilder.DefaultApplicationBuilder);
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

var ModuleBuilder_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });







var exportsProvidersFiled = '__exportProviders';
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
    ModuleBuilder_1 = ModuleBuilder;
    /**
     * get container of the module.
     *
     * @param {(ModuleType | ModuleConfigure)} token module type or module configuration.
     * @param {IContainer} [defaultContainer] set default container or not. not set will create new container.
     * @returns {IContainer}
     * @memberof ModuleBuilder
     */
    ModuleBuilder.prototype.getContainer = function (token, defaultContainer) {
        var container;
        if (core_1.isToken(token)) {
            if (core_1.isClass(token)) {
                var mdToken = token;
                if (mdToken.__di) {
                    return mdToken.__di;
                }
                else {
                    var cfg = this.getConfigure(mdToken);
                    if (cfg.container) {
                        mdToken.__di = cfg.container;
                    }
                    else {
                        mdToken.__di = defaultContainer || this.createContainer();
                    }
                    container = mdToken.__di;
                }
            }
            else {
                return defaultContainer || this.createContainer();
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
     * @param {(Token<T> | ModuleConfigure)} [token]
     * @returns {Promise<MdlInstance<T>>}
     * @memberof ModuleBuilder
     */
    ModuleBuilder.prototype.build = function (token, defaultContainer) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var container, mdToken, cfg, builder, boot, iocModule;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        container = this.getContainer(token, defaultContainer);
                        mdToken = core_1.isToken(token) ? token : token.name;
                        if (core_1.isToken(mdToken) && container.has(mdToken)) {
                            return [2 /*return*/, container.resolve(mdToken)];
                        }
                        cfg = this.getConfigure(token, container);
                        builder = this.getBuilder(container, cfg);
                        if (!(builder && builder !== this)) return [3 /*break*/, 2];
                        return [4 /*yield*/, builder.build(token, container)];
                    case 1: return [2 /*return*/, _a.sent()];
                    case 2: return [4 /*yield*/, this.registerDepdences(container, cfg)];
                    case 3:
                        cfg = _a.sent();
                        boot = this.getBootstrapToken(cfg, mdToken);
                        iocModule = this.createModuleInstance(mdToken, container);
                        iocModule.bootstrap = boot;
                        iocModule.container = container;
                        iocModule.bootBuilder = iocModule.bootBuilder || cfg.bootBuilder;
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
    ModuleBuilder.prototype.getBuilder = function (container, cfg) {
        var builder;
        if (core_1.isClass(cfg.builder)) {
            if (!container.has(cfg.builder)) {
                container.register(cfg.builder);
            }
        }
        if (core_1.isToken(cfg.builder)) {
            builder = container.resolve(cfg.builder);
        }
        else if (cfg.builder instanceof ModuleBuilder_1) {
            builder = cfg.builder;
        }
        return builder;
    };
    /**
     * bootstrap module's main.
     *
     * @param {(Token<T> | ModuleConfigure)} token
     * @param {*} [data]
     * @param {IContainer} [defaultContainer]
     * @returns {Promise<MdlInstance<T>>}
     * @memberof ModuleBuilder
     */
    ModuleBuilder.prototype.bootstrap = function (token, data, defaultContainer) {
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
                        return [4 /*yield*/, this.createBootstrap(md, data)];
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
    ModuleBuilder.prototype.createBootstrap = function (iocModule, data) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var bootBuilder;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        bootBuilder = this.getBootstrapBuilder(iocModule.container, iocModule.bootBuilder);
                        iocModule.bootstrap = bootBuilder.getBootstrapToken(iocModule.bootstrap, iocModule.moduleConfig);
                        if (!iocModule.bootstrap) return [3 /*break*/, 2];
                        return [4 /*yield*/, bootBuilder.build(iocModule.bootstrap, iocModule.moduleConfig, data)];
                    case 1: return [2 /*return*/, _a.sent()];
                    case 2: return [2 /*return*/, null];
                }
            });
        });
    };
    ModuleBuilder.prototype.getBootstrapBuilder = function (container, bootBuilder) {
        var builder;
        if (core_1.isClass(bootBuilder)) {
            if (!container.has(bootBuilder)) {
                container.register(bootBuilder);
            }
        }
        if (core_1.isToken(bootBuilder)) {
            builder = container.resolve(bootBuilder);
        }
        else if (bootBuilder instanceof BootstrapBuilder_1.BootstrapBuilder) {
            builder = bootBuilder;
        }
        if (!builder) {
            builder = container.resolve(IBootstrapBuilder.BootstrapBuilderToken);
        }
        return builder;
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
     * @returns {ModuleConfigure}
     * @memberof ModuleBuilder
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
                if (!container.has(BootModule_1.BootModule)) {
                    container.register(BootModule_1.BootModule);
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
    ModuleBuilder.classAnnations = { "name": "ModuleBuilder", "params": { "constructor": [], "getContainer": ["token", "defaultContainer"], "createContainer": [], "getContainerBuilder": [], "createContainerBuilder": [], "build": ["token", "defaultContainer"], "createModuleInstance": ["token", "container"], "getBuilder": ["container", "cfg"], "bootstrap": ["token", "data", "defaultContainer"], "createBootstrap": ["iocModule", "data"], "getBootstrapBuilder": ["container", "bootBuilder"], "importModule": ["token", "container"], "getDecorator": [], "getConfigure": ["token", "container"], "registerDepdences": ["container", "config"], "getBootstrapToken": ["cfg", "token"], "importConfigExports": ["container", "providerContainer", "cfg"], "registerConfgureDepds": ["container", "config"], "getMetaConfig": ["bootModule"], "isIocExt": ["token"], "isDIModule": ["token"], "registerExts": ["container", "config"], "bindProvider": ["container", "providers"] } };
    tslib_1.__decorate([
        core_1.Inject(core_1.ContainerBuilderToken),
        tslib_1.__metadata("design:type", Object)
    ], ModuleBuilder.prototype, "containerBuilder", void 0);
    ModuleBuilder = ModuleBuilder_1 = tslib_1.__decorate([
        core_1.Singleton(IModuleBuilder.ModuleBuilderToken),
        tslib_1.__metadata("design:paramtypes", [])
    ], ModuleBuilder);
    return ModuleBuilder;
    var ModuleBuilder_1;
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
 * @extends {ModuleBuilder}
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
    DefaultApplicationBuilder.create = function (baseURL) {
        return new DefaultApplicationBuilder(baseURL);
    };
    /**
     * use configuration.
     *
     * @param {(string | AppConfiguration)} [config]
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
     * @param {AppConfiguration} config
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
    DefaultApplicationBuilder.classAnnations = { "name": "DefaultApplicationBuilder", "params": { "constructor": ["baseURL"], "create": ["baseURL"], "useConfiguration": ["config", "container"], "use": ["modules"], "registerConfgureDepds": ["container", "config"], "mergeGlobalConfig": ["globalCfg", "moduleCfg"], "registerExts": ["container", "config"], "bindAppConfig": ["config"], "getDefaultConfig": [] } };
    return DefaultApplicationBuilder;
}(ModuleBuilder_1.ModuleBuilder));
exports.DefaultApplicationBuilder = DefaultApplicationBuilder;


});

unwrapExports(ApplicationBuilder);
var ApplicationBuilder_1 = ApplicationBuilder.DefaultApplicationBuilder;

var D__workspace_github_tsioc_packages_bootstrap_lib = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

tslib_1.__exportStar(decorators, exports);
tslib_1.__exportStar(AppConfiguration, exports);
tslib_1.__exportStar(ApplicationBuilder, exports);
tslib_1.__exportStar(IApplicationBuilder, exports);
tslib_1.__exportStar(IModuleBuilder, exports);
tslib_1.__exportStar(ModuleBuilder_1, exports);
tslib_1.__exportStar(BootModule_1, exports);
tslib_1.__exportStar(IBootstrapBuilder, exports);
tslib_1.__exportStar(BootstrapBuilder_1, exports);


});

var index$1 = unwrapExports(D__workspace_github_tsioc_packages_bootstrap_lib);

return index$1;

})));
