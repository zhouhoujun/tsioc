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
 * @param {(Token<IModuleBuilder<any>> | IModuleBuilder<any>)} [moduleBuilder]
 * @param {(Token<IModuleBuilder<any>> | IModuleBuilder<any>)} [bootstrapBuilder]
 * @param {InjectToken<IApplication>} provideType default provide type.
 * @param {MetadataAdapter} [adapter]
 * @param {MetadataExtends<T>} [metadataExtends]
 * @returns {IDIModuleDecorator<T>}
 */
function createDIModuleDecorator(decorType, builder, moduleBuilder, bootstrapBuilder, provideType, adapter, metadataExtends) {
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
        if (builder && !metadata.builder) {
            metadata.builder = builder;
        }
        if (moduleBuilder && !metadata.moduleBuilder) {
            metadata.moduleBuilder = moduleBuilder;
        }
        if (bootstrapBuilder && !metadata.bootstrapBuilder) {
            metadata.bootstrapBuilder = bootstrapBuilder;
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
 * @param {(Token<IBootBuilder<any>> | IBootBuilder<Tany>)} [moduleBuilder]
 * @param {(Token<IBootBuilder<any>> | IBootBuilder<Tany>)} [bootstrapBuilder]
 * @param {InjectToken<IApplication>} provideType default provide type.
 * @param {MetadataAdapter} [adapter]
 * @param {MetadataExtends<T>} [metadataExtends]
 * @returns {IBootstrapDecorator<T>}
 */
function createBootstrapDecorator(decorType, builder, moduleBuilder, bootstrapBuilder, provideType, adapter, metadataExtends) {
    return DIModule.createDIModuleDecorator(decorType, builder, moduleBuilder, bootstrapBuilder, provideType, adapter, metadataExtends);
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

var AppConfigure = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

/**
 * application configuration token.
 */
exports.AppConfigureToken = new core_1.InjectToken('DI_APP_Configuration');


});

unwrapExports(AppConfigure);
var AppConfigure_1 = AppConfigure.AppConfigureToken;

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

var IBootBuilder = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });


/**
 * inject token Bootstrap builder.
 *
 * @export
 * @class InjectBootstrapBuilder
 * @extends {Registration<T>}
 * @template T
 */
var InjectBootBuilder = /** @class */ (function (_super) {
    tslib_1.__extends(InjectBootBuilder, _super);
    function InjectBootBuilder(desc) {
        return _super.call(this, 'DI_ModuleBootstrap', desc) || this;
    }
    InjectBootBuilder.classAnnations = { "name": "InjectBootBuilder", "params": { "constructor": ["desc"] } };
    return InjectBootBuilder;
}(core_1.Registration));
exports.InjectBootBuilder = InjectBootBuilder;
/**
 * token bootstrap builder token.
 */
exports.BootBuilderToken = new InjectBootBuilder('');


});

unwrapExports(IBootBuilder);
var IBootBuilder_1 = IBootBuilder.InjectBootBuilder;
var IBootBuilder_2 = IBootBuilder.BootBuilderToken;

var BootBuilder_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });



/**
 * token bootstrap builder. build class with metadata and config.
 *
 * @export
 * @class BootBuilder
 * @implements {implements IBootBuilder<T>}
 * @template T
 */
var BootBuilder = /** @class */ (function () {
    // /**
    //  * ioc container.
    //  *
    //  * @type {IContainer}
    //  * @memberof BootBuilder
    //  */
    // @Inject(ContainerToken)
    // container: IContainer;
    function BootBuilder(container) {
        this.container = container;
    }
    BootBuilder_1 = BootBuilder;
    BootBuilder.prototype.build = function (token, config, data) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var instance;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.createInstance(token, data)];
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
    BootBuilder.prototype.buildByConfig = function (config, data) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var token;
            return tslib_1.__generator(this, function (_a) {
                if (core_1.isToken(config)) {
                    return [2 /*return*/, this.build(config, null, data)];
                }
                else {
                    token = this.getBootstrapToken(config);
                    return [2 /*return*/, this.build(token, config, data)];
                }
                return [2 /*return*/];
            });
        });
    };
    BootBuilder.prototype.createInstance = function (token, config, data) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var instance;
            return tslib_1.__generator(this, function (_a) {
                if (!token) {
                    throw new Error('cant not find bootstrap token.');
                }
                if (!this.container.has(token)) {
                    if (core_1.isClass(token)) {
                        console.log('boot builder', token);
                        this.container.register(token);
                    }
                    else {
                        throw new Error("cant not find token " + token.toString() + " in container.");
                    }
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
     * @memberof BootBuilder
     */
    BootBuilder.prototype.buildStrategy = function (instance, config) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            return tslib_1.__generator(this, function (_a) {
                return [2 /*return*/, instance];
            });
        });
    };
    BootBuilder.prototype.getBootstrapToken = function (config) {
        return config.bootstrap;
    };
    BootBuilder.prototype.resolveToken = function (token, data) {
        return this.container.resolve(token, data);
    };
    BootBuilder.prototype.getBuilderViaConfig = function (builder, container) {
        if (core_1.isToken(builder)) {
            return container.resolve(builder);
        }
        else if (builder instanceof BootBuilder_1) {
            return builder;
        }
        return null;
    };
    var BootBuilder_1;
    BootBuilder.classAnnations = { "name": "BootBuilder", "params": { "constructor": ["container"], "build": ["token", "config", "data"], "buildByConfig": ["config", "data"], "createInstance": ["token", "config", "data"], "buildStrategy": ["instance", "config"], "getBootstrapToken": ["config"], "resolveToken": ["token", "data"], "getBuilderViaConfig": ["builder", "container"] } };
    BootBuilder = BootBuilder_1 = tslib_1.__decorate([
        core_1.Singleton(IBootBuilder.BootBuilderToken),
        tslib_1.__param(0, core_1.Inject(core_1.ContainerToken)),
        tslib_1.__metadata("design:paramtypes", [Object])
    ], BootBuilder);
    return BootBuilder;
}());
exports.BootBuilder = BootBuilder;


});

unwrapExports(BootBuilder_1);
var BootBuilder_2 = BootBuilder_1.BootBuilder;

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
        container.register(BootBuilder_1.BootBuilder);
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

var ModuleType = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * ioc DI loaded modules.
 *
 * @export
 * @interface IocModule
 * @template T
 */
var LoadedModule = /** @class */ (function () {
    function LoadedModule() {
    }
    LoadedModule.classAnnations = { "name": "LoadedModule", "params": {} };
    return LoadedModule;
}());
exports.LoadedModule = LoadedModule;


});

unwrapExports(ModuleType);
var ModuleType_1 = ModuleType.LoadedModule;

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
    ContainerPool.classAnnations = { "name": "ContainerPool", "params": { "constructor": [], "getTokenKey": ["token"], "isDefault": ["container"], "hasDefault": [], "setDefault": ["container"], "getDefault": [], "set": ["token", "container"], "get": ["token"], "has": ["token"] } };
    return ContainerPool;
}());
exports.ContainerPool = ContainerPool;
exports.ContainerPoolToken = new core_1.InjectToken('ContainerPool');
/**
 *  global container pools.
 */
exports.containerPools = new ContainerPool();


});

unwrapExports(ContainerPool_1);
var ContainerPool_2 = ContainerPool_1.ContainerPool;
var ContainerPool_3 = ContainerPool_1.ContainerPoolToken;
var ContainerPool_4 = ContainerPool_1.containerPools;

var ModuleBuilder_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });









var exportsProvidersFiled = '__exportProviders';
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
    ModuleBuilder_1 = ModuleBuilder;
    ModuleBuilder.prototype.getPools = function () {
        if (!this.pools) {
            this.pools = ContainerPool_1.containerPools;
        }
        if (!this.pools.hasDefault()) {
            this.regDefaultContainer();
        }
        return this.pools;
    };
    ModuleBuilder.prototype.setPools = function (pools) {
        this.pools = pools;
    };
    ModuleBuilder.prototype.regDefaultContainer = function () {
        var container = this.createContainer();
        container.register(BootModule_1.BootModule);
        this.pools.setDefault(container);
        return container;
    };
    /**
     * get container of the module.
     *
     * @param {(ModuleType | ModuleConfigure)} token module type or module configuration.
     * @param {IContainer} [defaultContainer] set default container or not. not set will create new container.
     * @param {IContainer} [parent] set the container parent, default will set root default container.
     * @returns {IContainer}
     * @memberof ModuleBuilder
     */
    ModuleBuilder.prototype.getContainer = function (token, defaultContainer, parent) {
        var container;
        var pools = this.getPools();
        if (core_1.isToken(token)) {
            if (pools.has(token)) {
                return pools.get(token);
            }
            else {
                var cfg = this.getConfigure(token, defaultContainer);
                container = cfg.container || defaultContainer;
                if (!container) {
                    container = this.isDIModule(token) ? this.createContainer() : pools.getDefault();
                }
                this.setParent(container, parent);
                pools.set(token, container);
                return container;
            }
        }
        else {
            if (token.name && pools.has(token.name)) {
                return pools.get(token.name);
            }
            if (token.container) {
                container = token.container;
            }
            else {
                container = token.container = defaultContainer || pools.getDefault();
            }
            if (token.name) {
                pools.set(token.name, container);
            }
            this.setParent(container, parent);
            return container;
        }
    };
    ModuleBuilder.prototype.setParent = function (container, parent) {
        var pools = this.getPools();
        if (pools.isDefault(container)) {
            return;
        }
        if (!container.parent) {
            if (parent && parent !== container) {
                container.parent = parent;
            }
            else {
                container.parent = pools.getDefault();
            }
        }
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
    ModuleBuilder.prototype.load = function (token, defaultContainer, parent) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var container, tk, mdToken, cfg, loadmdl;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        container = this.getContainer(token, defaultContainer, parent);
                        tk = core_1.isToken(token) ? token : token.name;
                        mdToken = new InjectModuleLoadToken(tk);
                        if (core_1.isToken(mdToken) && container.has(mdToken)) {
                            return [2 /*return*/, container.resolve(mdToken)];
                        }
                        cfg = this.getConfigure(token, container);
                        return [4 /*yield*/, this.registerDepdences(container, cfg)];
                    case 1:
                        cfg = _a.sent();
                        loadmdl = {
                            moduleToken: core_1.isToken(token) ? token : null,
                            container: container,
                            moduleConfig: cfg
                        };
                        if (tk) {
                            container.bindProvider(mdToken, function () { return loadmdl; });
                        }
                        return [2 /*return*/, loadmdl];
                }
            });
        });
    };
    /**
     * build module.
     *
     * @param {(Token<T> | ModuleConfig<T>)} token
     * @param {(IContainer | LoadedModule)} [defaults]
     * @returns {Promise<T>}
     * @memberof ModuleBuilder
     */
    ModuleBuilder.prototype.build = function (token, defaults) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var loadmdl, container, cfg, builder, boot, bootBuilder, instance, bootbuilder, instance, mdlInst;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(defaults instanceof ModuleType.LoadedModule)) return [3 /*break*/, 1];
                        loadmdl = defaults;
                        return [3 /*break*/, 3];
                    case 1: return [4 /*yield*/, this.load(token, defaults)];
                    case 2:
                        loadmdl = _a.sent();
                        _a.label = 3;
                    case 3:
                        container = loadmdl.container;
                        cfg = loadmdl.moduleConfig;
                        builder = this.getBuilder(container, cfg);
                        if (!(builder && builder !== this)) return [3 /*break*/, 5];
                        return [4 /*yield*/, builder.build(token, container)];
                    case 4: return [2 /*return*/, _a.sent()];
                    case 5:
                        boot = loadmdl.moduleToken;
                        if (!!boot) return [3 /*break*/, 7];
                        bootBuilder = this.getBootstrapBuilder(container, cfg.bootstrapBuilder);
                        return [4 /*yield*/, bootBuilder.buildByConfig(cfg)];
                    case 6:
                        instance = _a.sent();
                        return [2 /*return*/, instance];
                    case 7:
                        bootbuilder = this.getBootstrapBuilder(container, cfg.moduleBuilder);
                        return [4 /*yield*/, bootbuilder.build(boot, cfg)];
                    case 8:
                        instance = _a.sent();
                        mdlInst = instance;
                        if (core_1.isFunction(mdlInst.mdOnInit)) {
                            mdlInst.mdOnInit(loadmdl);
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
    * @param {*} [data]
    * @param {IContainer} [defaultContainer]
    * @returns {Promise<MdlInstance<T>>}
    * @memberof ModuleBuilder
    */
    ModuleBuilder.prototype.bootstrap = function (token, data, defaultContainer) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var iocMd, md, bootInstance, builder;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.load(token, defaultContainer)];
                    case 1:
                        iocMd = _a.sent();
                        return [4 /*yield*/, this.build(token, iocMd)];
                    case 2:
                        md = _a.sent();
                        if (!iocMd.moduleToken) return [3 /*break*/, 6];
                        if (md && core_1.isFunction(md.btBeforeCreate)) {
                            md.btBeforeCreate(iocMd);
                        }
                        builder = this.getBootstrapBuilder(iocMd.container, iocMd.moduleConfig.bootstrapBuilder);
                        return [4 /*yield*/, builder.buildByConfig(iocMd.moduleConfig, data)];
                    case 3:
                        bootInstance = _a.sent();
                        if (core_1.isFunction(md.btAfterCreate)) {
                            md.btAfterCreate(bootInstance);
                        }
                        if (!core_1.isFunction(md.mdOnStart)) return [3 /*break*/, 5];
                        return [4 /*yield*/, Promise.resolve(md.mdOnStart(bootInstance))];
                    case 4:
                        _a.sent();
                        _a.label = 5;
                    case 5:
                        if (core_1.isFunction(md.mdOnStarted)) {
                            md.mdOnStarted(bootInstance);
                        }
                        return [3 /*break*/, 7];
                    case 6:
                        bootInstance = md;
                        _a.label = 7;
                    case 7: return [2 /*return*/, bootInstance];
                }
            });
        });
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
    ModuleBuilder.prototype.getBootstrapBuilder = function (container, bootBuilder) {
        var builder;
        if (core_1.isClass(bootBuilder)) {
            if (!container.has(bootBuilder)) {
                container.register(bootBuilder);
            }
        }
        if (core_1.isToken(bootBuilder)) {
            builder = container.resolve(bootBuilder, { container: container });
        }
        else if (bootBuilder instanceof BootBuilder_1.BootBuilder) {
            builder = bootBuilder;
        }
        if (!builder) {
            builder = this.getDefaultBootBuilder(container);
        }
        return builder;
    };
    ModuleBuilder.prototype.getDefaultBootBuilder = function (container) {
        return container.resolve(IBootBuilder.BootBuilderToken, { container: container });
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
                        return [4 /*yield*/, this.load(token, null, container)];
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
    ModuleBuilder.prototype.getBootstrapToken = function (cfg) {
        return cfg.bootstrap;
    };
    ModuleBuilder.prototype.importConfigExports = function (container, providerContainer, cfg) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var expProviders;
            var _this = this;
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
            var buider, mdls;
            var _this = this;
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
                // if (!container.has(BootModule)) {
                //     container.register(BootModule);
                // }
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
    var ModuleBuilder_1;
    ModuleBuilder.classAnnations = { "name": "ModuleBuilder", "params": { "constructor": [], "getPools": [], "setPools": ["pools"], "regDefaultContainer": [], "getContainer": ["token", "defaultContainer", "parent"], "setParent": ["container", "parent"], "createContainer": [], "getContainerBuilder": [], "createContainerBuilder": [], "load": ["token", "defaultContainer", "parent"], "build": ["token", "defaults"], "bootstrap": ["token", "data", "defaultContainer"], "getBuilder": ["container", "cfg"], "getBootstrapBuilder": ["container", "bootBuilder"], "getDefaultBootBuilder": ["container"], "importModule": ["token", "container"], "getDecorator": [], "getConfigure": ["token", "container"], "registerDepdences": ["container", "config"], "getBootstrapToken": ["cfg"], "importConfigExports": ["container", "providerContainer", "cfg"], "registerConfgureDepds": ["container", "config"], "getMetaConfig": ["bootModule"], "isIocExt": ["token"], "isDIModule": ["token"], "registerExts": ["container", "config"], "bindProvider": ["container", "providers"] } };
    tslib_1.__decorate([
        core_1.Inject(core_1.ContainerBuilderToken),
        tslib_1.__metadata("design:type", Object)
    ], ModuleBuilder.prototype, "containerBuilder", void 0);
    ModuleBuilder = ModuleBuilder_1 = tslib_1.__decorate([
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
        _this.pools = new ContainerPool_1.ContainerPool();
        return _this;
    }
    DefaultApplicationBuilder.create = function (baseURL) {
        return new DefaultApplicationBuilder(baseURL);
    };
    /**
     * use configuration.
     *
     * @param {(string | AppConfigure)} [config]
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
    DefaultApplicationBuilder.prototype.regDefaultContainer = function () {
        var _this = this;
        var container = _super.prototype.regDefaultContainer.call(this);
        container.bindProvider(ContainerPool_1.ContainerPoolToken, function () { return _this.getPools(); });
        container.resolve(IModuleBuilder.ModuleBuilderToken).setPools(this.getPools());
        return container;
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
                    case 0: return [4 /*yield*/, _super.prototype.registerExts.call(this, container, config)];
                    case 1:
                        _a.sent();
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
    DefaultApplicationBuilder.classAnnations = { "name": "DefaultApplicationBuilder", "params": { "constructor": ["baseURL"], "create": ["baseURL"], "useConfiguration": ["config", "container"], "use": ["modules"], "registerConfgureDepds": ["container", "config"], "mergeGlobalConfig": ["globalCfg", "moduleCfg"], "regDefaultContainer": [], "registerExts": ["container", "config"], "bindAppConfig": ["config"], "getDefaultConfig": [] } };
    return DefaultApplicationBuilder;
}(ModuleBuilder_1.ModuleBuilder));
exports.DefaultApplicationBuilder = DefaultApplicationBuilder;


});

unwrapExports(ApplicationBuilder);
var ApplicationBuilder_1 = ApplicationBuilder.DefaultApplicationBuilder;

var D__workspace_github_tsioc_packages_bootstrap_lib = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

tslib_1.__exportStar(decorators, exports);
tslib_1.__exportStar(AppConfigure, exports);
tslib_1.__exportStar(ApplicationBuilder, exports);
tslib_1.__exportStar(IApplicationBuilder, exports);
tslib_1.__exportStar(IModuleBuilder, exports);
tslib_1.__exportStar(ModuleBuilder_1, exports);
tslib_1.__exportStar(ContainerPool_1, exports);
tslib_1.__exportStar(BootModule_1, exports);
tslib_1.__exportStar(IBootBuilder, exports);
tslib_1.__exportStar(BootBuilder_1, exports);
tslib_1.__exportStar(ModuleType, exports);


});

var index$1 = unwrapExports(D__workspace_github_tsioc_packages_bootstrap_lib);

return index$1;

})));
