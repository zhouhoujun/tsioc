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

var Bootstrap = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

/**
 * Bootstrap Decorator, definde class as mvc bootstrap module.
 *
 * @Bootstrap
 */
exports.Bootstrap = core_1.createClassDecorator('Bootstrap');


});

unwrapExports(Bootstrap);
var Bootstrap_1 = Bootstrap.Bootstrap;

var DefModule = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

/**
 * Module decorator, define for class.  use to define the class. it can setting provider to some token, singleton or not.
 *
 * @DefModule
 */
exports.DefModule = core_1.createClassDecorator('DefModule');


});

unwrapExports(DefModule);
var DefModule_1 = DefModule.DefModule;

var decorators = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

tslib_1.__exportStar(Bootstrap, exports);
tslib_1.__exportStar(DefModule, exports);


});

unwrapExports(decorators);

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
        return _super.call(this, '_IOC_ModuleBuilder', desc) || this;
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

var ModuleBuilder_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });




/**
 * server app bootstrap
 *
 * @export
 * @class ModuleBuilder
 */
var ModuleBuilder = /** @class */ (function () {
    function ModuleBuilder() {
    }
    ModuleBuilder_1 = ModuleBuilder;
    /**
     * build module.
     *
     * @param {(Token<T>| ModuleConfiguration<T>)} [token]
     * @returns {Promise<any>}
     * @memberof ModuleBuilder
     */
    ModuleBuilder.prototype.build = function (token, data) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var cfg, buider, instacnce;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        cfg = this.getConfigure(token);
                        buider = this.getBuilder(cfg);
                        return [4 /*yield*/, buider.createInstance(core_1.isToken(token) ? token : null, cfg, data)];
                    case 1:
                        instacnce = _a.sent();
                        return [4 /*yield*/, buider.buildStrategy(instacnce, cfg)];
                    case 2:
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
    ModuleBuilder.prototype.buildStrategy = function (instance, config) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            return tslib_1.__generator(this, function (_a) {
                return [2 /*return*/, instance];
            });
        });
    };
    ModuleBuilder.prototype.getBuilder = function (config) {
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
        return builder || this;
    };
    ModuleBuilder.prototype.getDecorator = function () {
        return decorators.DefModule.toString();
    };
    /**
     * get configuration.
     *
     * @returns {ModuleConfiguration<T>}
     * @memberof ModuleBuilder
     */
    ModuleBuilder.prototype.getConfigure = function (token) {
        var cfg;
        if (core_1.isClass(token)) {
            cfg = this.getMetaConfig(token);
        }
        else if (core_1.isToken(token)) {
            var tokenType = this.container.getTokenImpl(token);
            if (core_1.isClass(tokenType)) {
                cfg = this.getMetaConfig(tokenType);
            }
        }
        else {
            cfg = token;
            var bootToken = this.getBootstrapToken(cfg);
            var typeTask = core_1.isClass(bootToken) ? bootToken : this.container.getTokenImpl(bootToken);
            if (core_1.isClass(typeTask)) {
                cfg = core_1.lang.assign({}, this.getMetaConfig(typeTask), cfg || {});
            }
        }
        return cfg || {};
    };
    ModuleBuilder.prototype.createInstance = function (token, cfg, data) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var bootToken;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        bootToken = this.getBootstrapToken(cfg, token);
                        if (!bootToken) {
                            throw new Error('not find bootstrap token.');
                        }
                        return [4 /*yield*/, this.registerDepdences(cfg)];
                    case 1:
                        _a.sent();
                        if (core_1.isClass(token)) {
                            if (!this.container.has(token)) {
                                this.container.register(token);
                            }
                            return [2 /*return*/, this.container.resolve(token)];
                        }
                        else {
                            return [2 /*return*/, this.container.resolve(token)];
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    ModuleBuilder.prototype.getBootstrapToken = function (cfg, token) {
        return cfg.bootstrap || token;
    };
    ModuleBuilder.prototype.getBuilderViaConfig = function (builder) {
        if (core_1.isToken(builder)) {
            return this.container.resolve(builder);
        }
        else if (builder instanceof ModuleBuilder_1) {
            return builder;
        }
        return null;
    };
    ModuleBuilder.prototype.getBuilderViaToken = function (mdl) {
        if (core_1.isToken(mdl)) {
            var taskType = core_1.isClass(mdl) ? mdl : this.container.getTokenImpl(mdl);
            if (taskType) {
                var meta = core_1.lang.first(core_1.getTypeMetadata(this.getDecorator(), taskType));
                if (meta && meta.builder) {
                    return core_1.isToken(meta.builder) ? this.container.resolve(meta.builder) : meta.builder;
                }
            }
        }
        return null;
    };
    ModuleBuilder.prototype.getMetaConfig = function (bootModule) {
        var decorator = this.getDecorator();
        if (core_1.hasClassMetadata(decorator, bootModule)) {
            var metas = core_1.getTypeMetadata(decorator, bootModule);
            if (metas && metas.length) {
                var meta = metas[0];
                meta.bootstrap = meta.bootstrap || bootModule;
                return core_1.lang.omit(meta, 'builder');
            }
        }
        return null;
    };
    ModuleBuilder.prototype.registerDepdences = function (config) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var _a;
            return tslib_1.__generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!(core_1.isArray(config.imports) && config.imports.length)) return [3 /*break*/, 2];
                        return [4 /*yield*/, (_a = this.container).loadModule.apply(_a, config.imports)];
                    case 1:
                        _b.sent();
                        _b.label = 2;
                    case 2:
                        if (core_1.isArray(config.providers) && config.providers.length) {
                            this.bindProvider(this.container, config.providers);
                        }
                        return [2 /*return*/, this.container];
                }
            });
        });
    };
    ModuleBuilder.prototype.bindProvider = function (container, providers) {
        providers.forEach(function (p, index) {
            if (core_1.isUndefined(p) || core_1.isNull(p)) {
                return;
            }
            if (core_1.isProviderMap(p)) {
                p.forEach(function (k, f) {
                    container.bindProvider(k, f);
                });
            }
            else if (p instanceof core_1.Provider) {
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
                        container.bindProvider(pr_1.provide, function () { return pr_1.useValue; });
                    }
                    else if (core_1.isClass(pr_1.useClass)) {
                        if (!container.has(pr_1.useClass)) {
                            container.register(pr_1.useClass);
                        }
                        container.bindProvider(pr_1.provide, pr_1.useClass);
                    }
                    else if (core_1.isFunction(pr_1.useFactory)) {
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
                        }
                    });
                }
            }
            else if (core_1.isFunction(p)) {
                container.bindProvider(name, function () { return p; });
            }
        });
    };
    ModuleBuilder.classAnnations = { "name": "ModuleBuilder", "params": { "constructor": [], "build": ["token", "data"], "buildStrategy": ["instance", "config"], "getBuilder": ["config"], "getDecorator": [], "getConfigure": ["token"], "createInstance": ["token", "cfg", "data"], "getBootstrapToken": ["cfg", "token"], "getBuilderViaConfig": ["builder"], "getBuilderViaToken": ["mdl"], "getMetaConfig": ["bootModule"], "registerDepdences": ["config"], "bindProvider": ["container", "providers"] } };
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
}());
exports.ModuleBuilder = ModuleBuilder;


});

unwrapExports(ModuleBuilder_1);
var ModuleBuilder_2 = ModuleBuilder_1.ModuleBuilder;

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
        lifeScope.registerDecorator(decorators.DefModule, core_1.CoreActions.bindProvider, core_1.CoreActions.cache, core_1.CoreActions.componentBeforeInit, core_1.CoreActions.componentInit, core_1.CoreActions.componentAfterInit);
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

var ApplicationBuilder_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });




/**
 * application builder.
 *
 * @export
 * @class ApplicationBuilder
 * @extends {ModuleBuilder<T>}
 * @template T
 */
var ApplicationBuilder = /** @class */ (function () {
    function ApplicationBuilder(baseURL) {
        this.baseURL = baseURL;
        this.usedModules = [];
        this.customRegs = [];
    }
    /**
     * get container
     *
     * @returns
     * @memberof ApplicationBuilder
     */
    ApplicationBuilder.prototype.getContainer = function () {
        if (!this.container) {
            this.container = this.getContainerBuilder().create();
        }
        return this.container;
    };
    /**
     * set container.
     *
     * @param {IContainer} container
     * @returns
     * @memberof ApplicationBuilder
     */
    ApplicationBuilder.prototype.setContainer = function (container) {
        if (container) {
            this.container = container;
            this.builder = container.get(core_1.ContainerBuilderToken);
        }
        return this;
    };
    /**
     * get container builder.
     *
     * @returns
     * @memberof ModuleBuilder
     */
    ApplicationBuilder.prototype.getContainerBuilder = function () {
        if (!this.builder) {
            this.builder = this.createContainerBuilder();
        }
        return this.builder;
    };
    /**
     * use container builder
     *
     * @param {IContainerBuilder} builder
     * @returns
     * @memberof ModuleBuilder
     */
    ApplicationBuilder.prototype.setContainerBuilder = function (builder) {
        this.builder = builder;
        this.container = null;
        return this;
    };
    /**
     * get module builer.
     *
     * @returns {IModuleBuilder<T>}
     * @memberof IApplicationBuilder
     */
    ApplicationBuilder.prototype.getModuleBuilder = function () {
        if (!this.moduleBuilder) {
            this.moduleBuilder = this.createModuleBuilder();
        }
        return this.moduleBuilder;
    };
    /**
     * set module builder.
     *
     * @param {IModuleBuilder<T>} builder
     * @returns {this}
     * @memberof ApplicationBuilder
     */
    ApplicationBuilder.prototype.setModuleBuilder = function (builder) {
        this.moduleBuilder = builder;
        return this;
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
            pcfg = builder.loader.load(config)
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
     * use module, custom module.
     *
     * @param {...(LoadType | CustomRegister<T>)[]} modules
     * @returns {this}
     * @memberof PlatformServer
     */
    ApplicationBuilder.prototype.use = function () {
        var modules = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            modules[_i] = arguments[_i];
        }
        this.usedModules = this.usedModules.concat(modules);
        return this;
    };
    /**
     * register modules via custom.
     *
     * @param {...CustomRegister<T>[]} moduleRegs
     * @returns {this}
     * @memberof ApplicationBuilder
     */
    ApplicationBuilder.prototype.registerModules = function () {
        var moduleRegs = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            moduleRegs[_i] = arguments[_i];
        }
        this.customRegs = this.customRegs.concat(moduleRegs);
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
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.build(token)];
                    case 1: return [2 /*return*/, _a.sent()];
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
    ApplicationBuilder.prototype.build = function (token) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var container, builder, cfg, app;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        container = this.getContainer();
                        return [4 /*yield*/, this.registerExts(container)];
                    case 1:
                        _a.sent();
                        builder = this.getModuleBuilder();
                        return [4 /*yield*/, this.mergeConfigure(builder.getConfigure(token))];
                    case 2:
                        cfg = _a.sent();
                        this.bindConfiguration(container, cfg);
                        return [4 /*yield*/, this.initContainer(cfg, container)];
                    case 3:
                        _a.sent();
                        if (!cfg.bootstrap) {
                            cfg.bootstrap = (core_1.isToken(token) ? token : null);
                        }
                        return [4 /*yield*/, this.createInstance(builder, cfg)];
                    case 4:
                        app = _a.sent();
                        return [2 /*return*/, app];
                }
            });
        });
    };
    ApplicationBuilder.prototype.createInstance = function (builder, config) {
        return builder.build(config);
    };
    /**
     * create default module builder.
     *
     * @protected
     * @returns
     * @memberof ApplicationBuilder
     */
    ApplicationBuilder.prototype.createModuleBuilder = function () {
        return this.getContainer().get(IModuleBuilder.ModuleBuilderToken);
    };
    /**
     * create default container builder.
     *
     * @protected
     * @returns
     * @memberof ApplicationBuilder
     */
    ApplicationBuilder.prototype.createContainerBuilder = function () {
        return new core_1.DefaultContainerBuilder();
    };
    /**
     * register ioc exts
     *
     * @protected
     * @param {IContainer} container
     * @returns {Promise<IContainer>}
     * @memberof ApplicationBuilder
     */
    ApplicationBuilder.prototype.registerExts = function (container) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var usedModules;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!container.has(BootstrapModule_1.BootstrapModule)) {
                            container.register(BootstrapModule_1.BootstrapModule);
                        }
                        if (!this.usedModules.length) return [3 /*break*/, 2];
                        usedModules = this.usedModules;
                        this.usedModules = [];
                        return [4 /*yield*/, container.loadModule.apply(container, [container].concat(usedModules))];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2: return [2 /*return*/, container];
                }
            });
        });
    };
    ApplicationBuilder.prototype.initContainer = function (config, container) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var _this = this;
            var customs;
            return tslib_1.__generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.customRegs.length) return [3 /*break*/, 2];
                        customs = this.customRegs;
                        this.customRegs = [];
                        return [4 /*yield*/, Promise.all(customs.map(function (cs) {
                                return cs(container, config, _this);
                            }))];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2: return [2 /*return*/, container];
                }
            });
        });
    };
    ApplicationBuilder.prototype.bindConfiguration = function (container, config) {
        if (this.baseURL) {
            config.baseURL = this.baseURL;
        }
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
                    case 0:
                        if (!this.globalConfig) {
                            this.useConfiguration();
                        }
                        return [4 /*yield*/, this.globalConfig];
                    case 1:
                        gcfg = _a.sent();
                        return [2 /*return*/, core_1.lang.assign({}, gcfg, cfg)];
                }
            });
        });
    };
    ApplicationBuilder.prototype.getDefaultConfig = function () {
        return { debug: false };
    };
    ApplicationBuilder.classAnnations = { "name": "ApplicationBuilder", "params": { "constructor": ["baseURL"], "getContainer": [], "setContainer": ["container"], "getContainerBuilder": [], "setContainerBuilder": ["builder"], "getModuleBuilder": [], "setModuleBuilder": ["builder"], "useConfiguration": ["config"], "use": ["modules"], "registerModules": ["moduleRegs"], "bootstrap": ["token"], "build": ["token"], "createInstance": ["builder", "config"], "createModuleBuilder": [], "createContainerBuilder": [], "registerExts": ["container"], "initContainer": ["config", "container"], "bindConfiguration": ["container", "config"], "mergeConfigure": ["cfg"], "getDefaultConfig": [] } };
    return ApplicationBuilder;
}());
exports.ApplicationBuilder = ApplicationBuilder;


});

unwrapExports(ApplicationBuilder_1);
var ApplicationBuilder_2 = ApplicationBuilder_1.ApplicationBuilder;

var D__workspace_github_tsioc_packages_bootstrap_lib = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

tslib_1.__exportStar(decorators, exports);
tslib_1.__exportStar(ApplicationBuilder_1, exports);
tslib_1.__exportStar(IModuleBuilder, exports);
tslib_1.__exportStar(ModuleBuilder_1, exports);
tslib_1.__exportStar(BootstrapModule_1, exports);


});

var index$1 = unwrapExports(D__workspace_github_tsioc_packages_bootstrap_lib);

return index$1;

})));
