(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('tslib'), require('@ts-ioc/core'), require('@ts-ioc/aop')) :
	typeof define === 'function' && define.amd ? define(['tslib', '@ts-ioc/core', '@ts-ioc/aop'], factory) :
	(global.logs = global.logs || {}, global.logs.umd = global.logs.umd || {}, global.logs.umd.js = factory(global.tslib_1,global['@ts-ioc/core'],global['@ts-ioc/aop']));
}(this, (function (tslib_1,core_1,aop_1) { 'use strict';

tslib_1 = tslib_1 && tslib_1.hasOwnProperty('default') ? tslib_1['default'] : tslib_1;
core_1 = core_1 && core_1.hasOwnProperty('default') ? core_1['default'] : core_1;
aop_1 = aop_1 && aop_1.hasOwnProperty('default') ? aop_1['default'] : aop_1;

function unwrapExports (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var Level_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * log level items.
 *
 * @export
 * @enum {number}
 */
var Level;
(function (Level) {
    Level["log"] = "log";
    Level["trace"] = "trace";
    Level["debug"] = "debug";
    Level["info"] = "info";
    Level["warn"] = "warn";
    Level["error"] = "error";
    Level["fatal"] = "fatal";
})(Level = exports.Level || (exports.Level = {}));
/**
 * log levels
 *
 * @export
 * @enum {number}
 */
var Levels;
(function (Levels) {
    Levels[Levels["trace"] = 0] = "trace";
    Levels[Levels["debug"] = 1] = "debug";
    Levels[Levels["info"] = 2] = "info";
    Levels[Levels["warn"] = 3] = "warn";
    Levels[Levels["error"] = 4] = "error";
    Levels[Levels["fatal"] = 5] = "fatal";
})(Levels = exports.Levels || (exports.Levels = {}));


});

unwrapExports(Level_1);
var Level_2 = Level_1.Level;
var Level_3 = Level_1.Levels;

var ILoggerManager = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

/**
 * LoggerManger interface token.
 * it is a token id, you can register yourself LoggerManger for this.
 */
exports.LoggerManagerToken = new core_1.InjectToken('DI_ILoggerManager');


});

unwrapExports(ILoggerManager);
var ILoggerManager_1 = ILoggerManager.LoggerManagerToken;

var IConfigureLoggerManager = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

/**
 * IConfigureLoggerManager interface token.
 * it is a token id, you can register yourself IConfigureLoggerManager for this.
 */
exports.ConfigureLoggerManagerToken = new core_1.InjectToken('DI_IConfigureLoggerManager');


});

unwrapExports(IConfigureLoggerManager);
var IConfigureLoggerManager_1 = IConfigureLoggerManager.ConfigureLoggerManagerToken;

var LogConfigure = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

/**
 * Log configure interface symbol.
 * it is a symbol id, you can register yourself LogConfigure for this.
 */
exports.LogConfigureToken = new core_1.InjectToken('DI_LogConfigure');


});

unwrapExports(LogConfigure);
var LogConfigure_1 = LogConfigure.LogConfigureToken;

var ConfigureLoggerManger_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });






/**
 * Configure logger manger. use to get configed logger manger.
 *
 * @export
 * @class LoggerManger
 * @implements {IConfigureLoggerManager}
 */
var ConfigureLoggerManger = /** @class */ (function () {
    function ConfigureLoggerManger(container, config) {
        this.container = container;
        this.setLogConfigure(config);
    }
    Object.defineProperty(ConfigureLoggerManger.prototype, "config", {
        get: function () {
            if (!this._config) {
                if (this.container.has(LogConfigure.LogConfigureToken)) {
                    this._config = this.container.resolve(LogConfigure.LogConfigureToken);
                }
                else {
                    this._config = { adapter: 'console' };
                }
            }
            return this._config;
        },
        enumerable: true,
        configurable: true
    });
    ConfigureLoggerManger.prototype.setLogConfigure = function (config) {
        if (!config) {
            return;
        }
        if (core_1.isClass(config)) {
            if (!this.container.has(LogConfigure.LogConfigureToken)) {
                this.container.register(LogConfigure.LogConfigureToken, config);
                this._config = this.container.get(LogConfigure.LogConfigureToken);
            }
            else if (!this.container.has(config)) {
                this.container.register(config);
                this._config = this.container.get(config);
            }
        }
        else {
            this._config = config;
        }
        this._logManger = null;
    };
    Object.defineProperty(ConfigureLoggerManger.prototype, "logManger", {
        get: function () {
            if (!this._logManger) {
                var cfg = this.config || {};
                var adapter = cfg.adapter || 'console';
                var token = void 0;
                if (core_1.isString(adapter)) {
                    token = new core_1.Registration(ILoggerManager.LoggerManagerToken, adapter);
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
    ConfigureLoggerManger.classAnnations = { "name": "ConfigureLoggerManger", "params": { "constructor": ["container", "config"], "setLogConfigure": ["config"], "configure": ["config"], "getLogger": ["name"] } };
    ConfigureLoggerManger = tslib_1.__decorate([
        aop_1.NonePointcut(),
        core_1.Injectable(IConfigureLoggerManager.ConfigureLoggerManagerToken),
        tslib_1.__param(0, core_1.Inject(core_1.ContainerToken)),
        tslib_1.__metadata("design:paramtypes", [Object, Object])
    ], ConfigureLoggerManger);
    return ConfigureLoggerManger;
}());
exports.ConfigureLoggerManger = ConfigureLoggerManger;


});

unwrapExports(ConfigureLoggerManger_1);
var ConfigureLoggerManger_2 = ConfigureLoggerManger_1.ConfigureLoggerManger;

var ConsoleLogManager_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });





var ConsoleLogManager = /** @class */ (function () {
    function ConsoleLogManager() {
        this.logger = new ConsoleLog();
    }
    ConsoleLogManager.prototype.configure = function (config) {
        if (config && config.level) {
            this.logger.level = config.level;
        }
    };
    ConsoleLogManager.prototype.getLogger = function (name) {
        return this.logger;
    };
    ConsoleLogManager.classAnnations = { "name": "ConsoleLogManager", "params": { "constructor": [], "configure": ["config"], "getLogger": ["name"] } };
    ConsoleLogManager = tslib_1.__decorate([
        aop_1.NonePointcut(),
        core_1.Singleton(),
        core_1.Injectable(ILoggerManager.LoggerManagerToken, 'console'),
        tslib_1.__metadata("design:paramtypes", [])
    ], ConsoleLogManager);
    return ConsoleLogManager;
}());
exports.ConsoleLogManager = ConsoleLogManager;
var ConsoleLog = /** @class */ (function () {
    function ConsoleLog() {
    }
    ConsoleLog.prototype.log = function (message) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        console.log.apply(console, [message].concat(args));
    };
    ConsoleLog.prototype.trace = function (message) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        if (!this.level || Level_1.Levels[this.level] === 0) {
            console.debug.apply(console, [message].concat(args));
        }
    };
    ConsoleLog.prototype.debug = function (message) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        // console.debug in nuix will not console.
        if (!this.level || Level_1.Levels[this.level] <= 1) {
            console.debug.apply(console, [message].concat(args));
        }
    };
    ConsoleLog.prototype.info = function (message) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        if (!this.level || Level_1.Levels[this.level] <= 2) {
            console.info.apply(console, [message].concat(args));
        }
    };
    ConsoleLog.prototype.warn = function (message) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        if (!this.level || Level_1.Levels[this.level] <= 3) {
            console.warn.apply(console, [message].concat(args));
        }
    };
    ConsoleLog.prototype.error = function (message) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        if (!this.level || Level_1.Levels[this.level] <= 4) {
            console.error.apply(console, [message].concat(args));
        }
    };
    ConsoleLog.prototype.fatal = function (message) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        if (!this.level || Level_1.Levels[this.level] <= 5) {
            console.error.apply(console, [message].concat(args));
        }
    };
    ConsoleLog.classAnnations = { "name": "ConsoleLog", "params": { "constructor": [], "log": ["message", "args"], "trace": ["message", "args"], "debug": ["message", "args"], "info": ["message", "args"], "warn": ["message", "args"], "error": ["message", "args"], "fatal": ["message", "args"] } };
    return ConsoleLog;
}());


});

unwrapExports(ConsoleLogManager_1);
var ConsoleLogManager_2 = ConsoleLogManager_1.ConsoleLogManager;

var LogFormater_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });



/**
 * Log formater interface token.
 * it is a token id, you can register yourself formater for log.
 */
exports.LogFormaterToken = new core_1.InjectToken('DI_LogFormater');
var LogFormater = /** @class */ (function () {
    function LogFormater() {
    }
    LogFormater.prototype.format = function (joinPoint, message) {
        var pointMsg;
        switch (joinPoint.state) {
            case aop_1.JoinpointState.Before:
            case aop_1.JoinpointState.Pointcut:
                pointMsg = joinPoint.state + " invoke method \"" + joinPoint.fullName + "\" with args " + this.stringifyArgs(joinPoint.params, joinPoint.args) + ".";
                break;
            case aop_1.JoinpointState.After:
                pointMsg = joinPoint.state + "  invoke method \"" + joinPoint.fullName + "\".";
                break;
            case aop_1.JoinpointState.AfterReturning:
                pointMsg = "Invoke method \"" + joinPoint.fullName + "\" returning value " + this.stringify(joinPoint.returningValue) + ".";
                break;
            case aop_1.JoinpointState.AfterThrowing:
                pointMsg = "Invoke method \"" + joinPoint.fullName + "\" throw error " + this.stringify(joinPoint.throwing) + ".";
                break;
            default:
                pointMsg = '';
                break;
        }
        return this.joinMessage([pointMsg, message]);
    };
    LogFormater.prototype.stringifyArgs = function (params, args) {
        var _this = this;
        var argsStr = params.map(function (p, idx) {
            var arg = args.length >= idx ? args[idx] : null;
            return "<param name: \"" + (p.name || '') + "\", param type: \"" + _this.stringify(p.type) + "\"> " + _this.stringify(arg);
        }).join(', ');
        if (argsStr) {
            return this.joinMessage(['[', argsStr, ']'], ' ');
        }
        else {
            return '[]';
        }
    };
    LogFormater.prototype.joinMessage = function (messgs, separator) {
        if (separator === void 0) { separator = '; '; }
        return messgs.filter(function (a) { return a; }).map(function (a) { return core_1.isString(a) ? a : a.toString(); }).join(separator);
    };
    LogFormater.prototype.stringifyArray = function (args) {
        var _this = this;
        if (!args.length) {
            return '[]';
        }
        return '[ ' + args.map(function (arg) { return _this.stringify(arg); }).join(', ') + ' ]';
    };
    LogFormater.prototype.stringify = function (target) {
        if (core_1.isString(target)) {
            return target;
        }
        else if (core_1.isArray(target)) {
            return this.stringifyArray(target);
        }
        else if (core_1.isBaseType(target)) {
            return target;
        }
        else if (core_1.isClass(target)) {
            return "[class " + core_1.getClassName(target) + "]";
        }
        else if (core_1.isFunction(target) || core_1.isDate(target) || core_1.isSymbol(target)) {
            return target.toString();
        }
        else if (core_1.isObject(target)) {
            try {
                return JSON.stringify(target);
            }
            catch (_a) {
                if (core_1.isFunction(target.toString)) {
                    return target.toString();
                }
            }
        }
        return '';
    };
    LogFormater.classAnnations = { "name": "LogFormater", "params": { "constructor": [], "format": ["joinPoint", "message"], "stringifyArgs": ["params", "args"], "joinMessage": ["messgs", "separator"], "stringifyArray": ["args"], "stringify": ["target"] } };
    LogFormater = tslib_1.__decorate([
        aop_1.NonePointcut(),
        core_1.Singleton(exports.LogFormaterToken, 'default'),
        tslib_1.__metadata("design:paramtypes", [])
    ], LogFormater);
    return LogFormater;
}());
exports.LogFormater = LogFormater;


});

unwrapExports(LogFormater_1);
var LogFormater_2 = LogFormater_1.LogFormaterToken;
var LogFormater_3 = LogFormater_1.LogFormater;

var LoggerAspect_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });





/**
 * base looger aspect. for extends your logger aspect.
 *
 * @export
 * @class LoggerAspect
 */
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
                this._logManger = this.container.resolve(IConfigureLoggerManager.ConfigureLoggerManagerToken, { config: this.config });
            }
            return this._logManger;
        },
        enumerable: true,
        configurable: true
    });
    LoggerAspect.prototype.processLog = function (joinPoint, annotation, message, level) {
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
                    _this.writeLog(logmeta.logname ? _this.logManger.getLogger(logmeta.logname) : _this.logger, joinPoint, _this.joinMessage(message, logmeta.message), logmeta.level || level);
                }
            });
        }
        else {
            this.writeLog(this.logger, joinPoint, message, level);
        }
    };
    LoggerAspect.prototype.formatMessage = function (joinPoint, message) {
        var config = this.logManger.config;
        if (core_1.isClass(config.format)) {
            if (!this.container.has(config.format)) {
                this.container.register(config.format);
            }
            return this.container.resolve(config.format).format(joinPoint, message);
        }
        else if (core_1.isFunction(config.format)) {
            return config.format(joinPoint, message);
        }
        else if (core_1.isObject(config.format) && core_1.isFunction(config.format)) {
            return config.format.format(joinPoint, message);
        }
        else {
            var token = core_1.isString(config.format) ? config.format : '';
            var foramter = this.container.resolve(new core_1.Registration(LogFormater_1.LogFormaterToken, token || 'default'));
            if (foramter) {
                return foramter.format(joinPoint, message);
            }
        }
        return '';
    };
    LoggerAspect.prototype.joinMessage = function () {
        var messgs = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            messgs[_i] = arguments[_i];
        }
        return messgs.filter(function (a) { return a; }).map(function (a) { return core_1.isString(a) ? a : a.toString(); }).join('; ');
    };
    LoggerAspect.prototype.writeLog = function (logger, joinPoint, message, level) {
        var formatStr = this.formatMessage(joinPoint, message);
        if (level) {
            logger[level](formatStr);
        }
        else {
            switch (joinPoint.state) {
                case aop_1.JoinpointState.Before:
                case aop_1.JoinpointState.After:
                case aop_1.JoinpointState.AfterReturning:
                    logger.debug(formatStr);
                    break;
                case aop_1.JoinpointState.Pointcut:
                    logger.info(formatStr);
                    break;
                case aop_1.JoinpointState.AfterThrowing:
                    logger.error(formatStr);
                    break;
            }
        }
    };
    LoggerAspect.classAnnations = { "name": "LoggerAspect", "params": { "constructor": ["container", "config"], "processLog": ["joinPoint", "annotation", "message", "level"], "formatMessage": ["joinPoint", "message"], "joinMessage": ["messgs"], "writeLog": ["logger", "joinPoint", "message", "level"] } };
    LoggerAspect = tslib_1.__decorate([
        core_1.Abstract(),
        tslib_1.__metadata("design:paramtypes", [Object, Object])
    ], LoggerAspect);
    return LoggerAspect;
}());
exports.LoggerAspect = LoggerAspect;


});

unwrapExports(LoggerAspect_1);
var LoggerAspect_2 = LoggerAspect_1.LoggerAspect;

var AnnotationLogerAspect_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });




/**
 * Annotation logger aspect. log for class or method with @Logger decorator.
 *
 * @export
 * @class AnnotationLogerAspect
 * @extends {LoggerAspect}
 */
var AnnotationLogerAspect = /** @class */ (function (_super) {
    tslib_1.__extends(AnnotationLogerAspect, _super);
    function AnnotationLogerAspect(container) {
        return _super.call(this, container) || this;
    }
    AnnotationLogerAspect.prototype.logging = function (joinPoint, annotation) {
        this.processLog(joinPoint, annotation);
    };
    AnnotationLogerAspect.classAnnations = { "name": "AnnotationLogerAspect", "params": { "constructor": ["container"], "logging": ["joinPoint", "annotation"] } };
    tslib_1.__decorate([
        aop_1.Pointcut('@annotation(Logger)', 'annotation'),
        tslib_1.__metadata("design:type", Function),
        tslib_1.__metadata("design:paramtypes", [aop_1.Joinpoint, Array]),
        tslib_1.__metadata("design:returntype", void 0)
    ], AnnotationLogerAspect.prototype, "logging", null);
    AnnotationLogerAspect = tslib_1.__decorate([
        core_1.Singleton(),
        aop_1.Aspect(),
        tslib_1.__param(0, core_1.Inject(core_1.ContainerToken)),
        tslib_1.__metadata("design:paramtypes", [Object])
    ], AnnotationLogerAspect);
    return AnnotationLogerAspect;
}(LoggerAspect_1.LoggerAspect));
exports.AnnotationLogerAspect = AnnotationLogerAspect;


});

unwrapExports(AnnotationLogerAspect_1);
var AnnotationLogerAspect_2 = AnnotationLogerAspect_1.AnnotationLogerAspect;

var Logger = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });


/**
 * Logger decorator, for method or class.
 *
 * @Logger
 */
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
    adapter.next({
        match: function (arg) { return core_1.isString(arg); },
        setMetadata: function (metadata, arg) {
            metadata.level = Level_1.Level[arg];
        }
    });
});


});

unwrapExports(Logger);
var Logger_1 = Logger.Logger;

var LogModule_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });








/**
 * aop logs ext for Ioc. auto run setup after registered.
 * with @IocExt('setup') decorator.
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
        var lifeScope = container.get(core_1.LifeScopeToken);
        lifeScope.registerDecorator(Logger.Logger, core_1.LifeState.onInit, core_1.CoreActions.bindParameterProviders);
        container.register(ConfigureLoggerManger_1.ConfigureLoggerManger);
        container.register(AnnotationLogerAspect_1.AnnotationLogerAspect);
        container.register(LogFormater_1.LogFormater);
        container.register(ConsoleLogManager_1.ConsoleLogManager);
    };
    LogModule.classAnnations = { "name": "LogModule", "params": { "constructor": ["container"], "setup": [] } };
    LogModule = tslib_1.__decorate([
        core_1.IocExt('setup'),
        tslib_1.__param(0, core_1.Inject(core_1.ContainerToken)),
        tslib_1.__metadata("design:paramtypes", [Object])
    ], LogModule);
    return LogModule;
}());
exports.LogModule = LogModule;


});

unwrapExports(LogModule_1);
var LogModule_2 = LogModule_1.LogModule;

var D__Workspace_Projects_modules_tsioc_packages_logs_lib = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

// export * from './tokens';
tslib_1.__exportStar(Level_1, exports);
tslib_1.__exportStar(ILoggerManager, exports);
tslib_1.__exportStar(IConfigureLoggerManager, exports);
tslib_1.__exportStar(ConfigureLoggerManger_1, exports);
tslib_1.__exportStar(ConsoleLogManager_1, exports);
tslib_1.__exportStar(LogConfigure, exports);
tslib_1.__exportStar(LogFormater_1, exports);
tslib_1.__exportStar(LoggerAspect_1, exports);
tslib_1.__exportStar(AnnotationLogerAspect_1, exports);
tslib_1.__exportStar(Logger, exports);
tslib_1.__exportStar(LogModule_1, exports);


});

var index = unwrapExports(D__Workspace_Projects_modules_tsioc_packages_logs_lib);

return index;

})));
