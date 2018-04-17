(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('@ts-ioc/core'), require('@ts-ioc/aop')) :
	typeof define === 'function' && define.amd ? define(['@ts-ioc/core', '@ts-ioc/aop'], factory) :
	(global.logs = global.logs || {}, global.logs.umd = global.logs.umd || {}, global.logs.umd.js = factory(global['@ts-ioc/core'],global['@ts-ioc/aop']));
}(this, (function (core_1,aop_1) { 'use strict';

core_1 = core_1 && core_1.hasOwnProperty('default') ? core_1['default'] : core_1;
aop_1 = aop_1 && aop_1.hasOwnProperty('default') ? aop_1['default'] : aop_1;

var commonjsGlobal = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};



function unwrapExports (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var symbols = createCommonjsModule(function (module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * symbols of aop log module.
 */
exports.LogSymbols = {
    /**
     * Log configure interface symbol.
     * it is a symbol id, you can register yourself LogConfigure for this.
     */
    LogConfigure: Symbol('LogConfigure'),
    /**
     * LoggerManger interface symbol.
     * it is a symbol id, you can register yourself LoggerManger for this.
     */
    ILoggerManager: Symbol('ILoggerManager'),
    /**
     * IConfigureLoggerManager interface symbol.
     * it is a symbol id, you can register yourself IConfigureLoggerManager for this.
     */
    IConfigureLoggerManager: Symbol('IConfigureLoggerManager')
};


});

unwrapExports(symbols);

var DefaultLogConfigure_1 = createCommonjsModule(function (module, exports) {
"use strict";
var __decorate = (commonjsGlobal && commonjsGlobal.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (commonjsGlobal && commonjsGlobal.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });



var DefaultLogConfigure = /** @class */ (function () {
    function DefaultLogConfigure(adapter) {
        this.adapter = adapter || 'console';
    }
    DefaultLogConfigure.prototype.format = function (joinPoint, logger) {
        switch (joinPoint.state) {
            case aop_1.JoinpointState.Before:
            case aop_1.JoinpointState.Pointcut:
                return '%s invoke method "%s" with args %o.';
            case aop_1.JoinpointState.After:
                return '%s  invoke method "%s".';
            case aop_1.JoinpointState.AfterReturning:
                return 'Invoke method "%s" returning value %o.';
            case aop_1.JoinpointState.AfterThrowing:
                return 'Invoke method "%s" throw error %o.';
            default:
                return '';
        }
    };
    DefaultLogConfigure.prototype.formatArgs = function (joinPoint, logger) {
        switch (joinPoint.state) {
            case aop_1.JoinpointState.Before:
            case aop_1.JoinpointState.Pointcut:
                return [joinPoint.state, joinPoint.fullName, joinPoint.args];
            case aop_1.JoinpointState.After:
                return [joinPoint.state, joinPoint.fullName];
            case aop_1.JoinpointState.AfterReturning:
                return [joinPoint.fullName, joinPoint.returningValue || ''];
            case aop_1.JoinpointState.AfterThrowing:
                return [joinPoint.fullName, joinPoint.throwing || ''];
            default:
                return [];
        }
    };
    DefaultLogConfigure.classAnnations = { "name": "DefaultLogConfigure", "params": { "constructor": ["adapter"], "format": ["joinPoint", "logger"], "formatArgs": ["joinPoint", "logger"] } };
    DefaultLogConfigure = __decorate([
        aop_1.NonePointcut,
        core_1.Singleton(symbols.LogSymbols.LogConfigure),
        __metadata("design:paramtypes", [Object])
    ], DefaultLogConfigure);
    return DefaultLogConfigure;
}());
exports.DefaultLogConfigure = DefaultLogConfigure;


});

unwrapExports(DefaultLogConfigure_1);

var ConfigureLoggerManger_1 = createCommonjsModule(function (module, exports) {
"use strict";
var __decorate = (commonjsGlobal && commonjsGlobal.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (commonjsGlobal && commonjsGlobal.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (commonjsGlobal && commonjsGlobal.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });




/**
 * Configure logger manger.
 *
 * @export
 * @class LoggerManger
 * @implements {IConfigureLoggerManager}
 */
var ConfigureLoggerManger = /** @class */ (function () {
    function ConfigureLoggerManger(container, config) {
        this.container = container;
        if (config) {
            this._config = config;
        }
    }
    Object.defineProperty(ConfigureLoggerManger.prototype, "config", {
        get: function () {
            if (!this._config) {
                if (!this.container.has(symbols.LogSymbols.LogConfigure)) {
                    this.container.register(DefaultLogConfigure_1.DefaultLogConfigure);
                }
                this._config = this.container.resolve(symbols.LogSymbols.LogConfigure);
            }
            return this._config;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ConfigureLoggerManger.prototype, "logManger", {
        get: function () {
            if (!this._logManger) {
                var cfg = this.config || {};
                var adapter = cfg.adapter || 'console';
                var token = void 0;
                if (core_1.isString(adapter)) {
                    token = new core_1.Registration(symbols.LogSymbols.ILoggerManager, adapter);
                }
                else {
                    token = adapter;
                }
                this._logManger = this.container.get(token);
                if (cfg.config) {
                    this._logManger.configure(cfg.config);
                }
            }
            return this._logManger;
        },
        enumerable: true,
        configurable: true
    });
    ConfigureLoggerManger.prototype.configure = function (config) {
        this.logManger.configure(config);
    };
    ConfigureLoggerManger.prototype.getLogger = function (name) {
        return this.logManger.getLogger(name);
    };
    ConfigureLoggerManger.classAnnations = { "name": "ConfigureLoggerManger", "params": { "constructor": ["container", "config"], "configure": ["config"], "getLogger": ["name"] } };
    ConfigureLoggerManger = __decorate([
        core_1.Injectable(symbols.LogSymbols.IConfigureLoggerManager),
        aop_1.NonePointcut,
        __param(0, core_1.Inject(core_1.symbols.IContainer)),
        __metadata("design:paramtypes", [Object, Object])
    ], ConfigureLoggerManger);
    return ConfigureLoggerManger;
}());
exports.ConfigureLoggerManger = ConfigureLoggerManger;


});

unwrapExports(ConfigureLoggerManger_1);

var ConsoleLogManager_1 = createCommonjsModule(function (module, exports) {
"use strict";
var __decorate = (commonjsGlobal && commonjsGlobal.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (commonjsGlobal && commonjsGlobal.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });



var ConsoleLogManager = /** @class */ (function () {
    function ConsoleLogManager() {
        this.logger = new ConsoleLog();
    }
    ConsoleLogManager.prototype.configure = function (config) {
    };
    ConsoleLogManager.prototype.getLogger = function (name) {
        return this.logger;
    };
    ConsoleLogManager.classAnnations = { "name": "ConsoleLogManager", "params": { "constructor": [], "configure": ["config"], "getLogger": ["name"] } };
    ConsoleLogManager = __decorate([
        aop_1.NonePointcut,
        core_1.Singleton,
        core_1.Injectable(symbols.LogSymbols.ILoggerManager, 'console'),
        __metadata("design:paramtypes", [])
    ], ConsoleLogManager);
    return ConsoleLogManager;
}());
exports.ConsoleLogManager = ConsoleLogManager;
var ConsoleLog = /** @class */ (function () {
    function ConsoleLog() {
    }
    ConsoleLog.prototype.log = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        console.log.apply(console, args);
    };
    ConsoleLog.prototype.trace = function (message) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        console.trace.apply(console, [message].concat(args));
    };
    ConsoleLog.prototype.debug = function (message) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        // console.debug in nuix will not console.
        console.debug.apply(console, [message].concat(args));
    };
    ConsoleLog.prototype.info = function (message) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        console.info.apply(console, [message].concat(args));
    };
    ConsoleLog.prototype.warn = function (message) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        console.warn.apply(console, [message].concat(args));
    };
    ConsoleLog.prototype.error = function (message) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        console.error.apply(console, [message].concat(args));
    };
    ConsoleLog.prototype.fatal = function (message) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        console.error.apply(console, [message].concat(args));
    };
    ConsoleLog.classAnnations = { "name": "ConsoleLog", "params": { "log": ["args"], "trace": ["message", "args"], "debug": ["message", "args"], "info": ["message", "args"], "warn": ["message", "args"], "error": ["message", "args"], "fatal": ["message", "args"] } };
    return ConsoleLog;
}());
exports.ConsoleLog = ConsoleLog;


});

unwrapExports(ConsoleLogManager_1);

var LoggerAspect_1 = createCommonjsModule(function (module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });



var LoggerAspect = /** @class */ (function () {
    function LoggerAspect(container, config) {
        this.container = container;
        this.config = config;
    }
    Object.defineProperty(LoggerAspect.prototype, "logger", {
        get: function () {
            if (!this._logger) {
                this._logger = this.logManger.getLogger();
            }
            return this._logger;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(LoggerAspect.prototype, "logManger", {
        get: function () {
            if (!this._logManger) {
                this._logManger = this.container.resolve(symbols.LogSymbols.IConfigureLoggerManager, { config: this.config });
            }
            return this._logManger;
        },
        enumerable: true,
        configurable: true
    });
    LoggerAspect.prototype.processLog = function (joinPoint, annotation) {
        var _this = this;
        if (annotation && annotation.length) {
            annotation.forEach(function (logmeta) {
                var canlog = false;
                if (logmeta.express && logmeta.express(joinPoint)) {
                    canlog = true;
                }
                else if (!logmeta.express) {
                    canlog = true;
                }
                if (canlog) {
                    _this.writeLog(logmeta.logname ? _this.logManger.getLogger(logmeta.logname) : _this.logger, joinPoint, logmeta.message);
                }
            });
        }
        else {
            this.writeLog(this.logger, joinPoint);
        }
    };
    LoggerAspect.prototype.writeLog = function (logger, joinPoint, message) {
        var config = this.logManger.config;
        var isCustom = core_1.isFunction(config.customFormat);
        if (message) {
            logger.info(message);
        }
        if (isCustom) {
            config.customFormat(joinPoint, logger);
        }
        else if (config.format) {
            var formatStr = core_1.isFunction(config.format) ? config.format(joinPoint, logger) : '';
            if (!formatStr) {
                return;
            }
            var formatArgs = core_1.isFunction(config.formatArgs) ? config.formatArgs(joinPoint, logger) : [];
            switch (joinPoint.state) {
                case aop_1.JoinpointState.Before:
                case aop_1.JoinpointState.After:
                case aop_1.JoinpointState.AfterReturning:
                    logger.debug.apply(logger, [formatStr].concat(formatArgs));
                    break;
                case aop_1.JoinpointState.Pointcut:
                    logger.info.apply(logger, [formatStr].concat(formatArgs));
                    break;
                case aop_1.JoinpointState.AfterThrowing:
                    logger.error.apply(logger, [formatStr].concat(formatArgs));
                    break;
            }
        }
    };
    LoggerAspect.classAnnations = { "name": "LoggerAspect", "params": { "constructor": ["container", "config"], "processLog": ["joinPoint", "annotation"], "writeLog": ["logger", "joinPoint", "message"] } };
    return LoggerAspect;
}());
exports.LoggerAspect = LoggerAspect;


});

unwrapExports(LoggerAspect_1);

var AnnotationLogerAspect_1 = createCommonjsModule(function (module, exports) {
"use strict";
var __extends = (commonjsGlobal && commonjsGlobal.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __decorate = (commonjsGlobal && commonjsGlobal.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (commonjsGlobal && commonjsGlobal.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (commonjsGlobal && commonjsGlobal.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });



var AnnotationLogerAspect = /** @class */ (function (_super) {
    __extends(AnnotationLogerAspect, _super);
    function AnnotationLogerAspect(container) {
        return _super.call(this, container) || this;
    }
    AnnotationLogerAspect.prototype.logging = function (joinPoint, annotation) {
        this.processLog(joinPoint, annotation);
    };
    AnnotationLogerAspect.classAnnations = { "name": "AnnotationLogerAspect", "params": { "constructor": ["container"], "logging": ["joinPoint", "annotation"] } };
    __decorate([
        aop_1.Pointcut('@annotation(Logger)', 'annotation'),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [aop_1.Joinpoint, Array]),
        __metadata("design:returntype", void 0)
    ], AnnotationLogerAspect.prototype, "logging", null);
    AnnotationLogerAspect = __decorate([
        core_1.Singleton,
        aop_1.Aspect,
        __param(0, core_1.Inject(core_1.symbols.IContainer)),
        __metadata("design:paramtypes", [Object])
    ], AnnotationLogerAspect);
    return AnnotationLogerAspect;
}(LoggerAspect_1.LoggerAspect));
exports.AnnotationLogerAspect = AnnotationLogerAspect;


});

unwrapExports(AnnotationLogerAspect_1);

var Logger = createCommonjsModule(function (module, exports) {
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

exports.Logger = core_1.createClassMethodDecorator('Logger', function (adapter) {
    adapter.next({
        isMetadata: function (arg) { return core_1.isClassMetadata(arg, ['logname']); },
        match: function (arg) { return core_1.isString(arg); },
        setMetadata: function (metadata, arg) {
            metadata.logname = arg;
        }
    });
    adapter.next({
        match: function (arg) { return core_1.isFunction(arg); },
        setMetadata: function (metadata, arg) {
            metadata.express = arg;
        }
    });
    adapter.next({
        match: function (arg) { return core_1.isString(arg); },
        setMetadata: function (metadata, arg) {
            metadata.message = arg;
        }
    });
});


});

unwrapExports(Logger);

var LogModule_1 = createCommonjsModule(function (module, exports) {
"use strict";
var __decorate = (commonjsGlobal && commonjsGlobal.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (commonjsGlobal && commonjsGlobal.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (commonjsGlobal && commonjsGlobal.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });







/**
 * aop logs bootstrap main. auto run setup after registered.
 * with @IocModule('setup') decorator.
 * @export
 * @class LogModule
 */
var LogModule = /** @class */ (function () {
    function LogModule(container) {
        this.container = container;
    }
    /**
     * register aop for container.
     *
     * @memberof AopModule
     */
    LogModule.prototype.setup = function () {
        var container = this.container;
        if (!container.has(aop_1.AopModule)) {
            container.register(aop_1.AopModule);
        }
        var lifeScope = container.get(core_1.symbols.LifeScope);
        lifeScope.registerDecorator(Logger.Logger, core_1.LifeState.onInit, core_1.CoreActions.bindParameterProviders);
        container.register(ConfigureLoggerManger_1.ConfigureLoggerManger);
        container.register(AnnotationLogerAspect_1.AnnotationLogerAspect);
        container.register(ConsoleLogManager_1.ConsoleLogManager);
    };
    LogModule.symbols = symbols.LogSymbols;
    LogModule.classAnnations = { "name": "LogModule", "params": { "constructor": ["container"], "setup": [] } };
    LogModule = __decorate([
        core_1.IocModule('setup'),
        __param(0, core_1.Inject(core_1.symbols.IContainer)),
        __metadata("design:paramtypes", [Object])
    ], LogModule);
    return LogModule;
}());
exports.LogModule = LogModule;


});

unwrapExports(LogModule_1);

var D__Workspace_Projects_modules_tsioc_packages_logs_lib = createCommonjsModule(function (module, exports) {
"use strict";
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
__export(symbols);
__export(ConfigureLoggerManger_1);
__export(ConsoleLogManager_1);
__export(DefaultLogConfigure_1);
__export(LoggerAspect_1);
__export(AnnotationLogerAspect_1);
__export(Logger);
__export(LogModule_1);


});

var index = unwrapExports(D__Workspace_Projects_modules_tsioc_packages_logs_lib);

return index;

})));
