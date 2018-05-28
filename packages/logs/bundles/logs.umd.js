(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('@ts-ioc/core'), require('@ts-ioc/aop')) :
	typeof define === 'function' && define.amd ? define(['@ts-ioc/core', '@ts-ioc/aop'], factory) :
	(global.logs = global.logs || {}, global.logs.umd = global.logs.umd || {}, global.logs.umd.js = factory(global['@ts-ioc/core'],global['@ts-ioc/aop']));
}(this, (function (core_1,aop_1) { 'use strict';

core_1 = core_1 && core_1.hasOwnProperty('default') ? core_1['default'] : core_1;
aop_1 = aop_1 && aop_1.hasOwnProperty('default') ? aop_1['default'] : aop_1;

function unwrapExports (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

/*! *****************************************************************************
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the Apache License, Version 2.0 (the "License"); you may not use
this file except in compliance with the License. You may obtain a copy of the
License at http://www.apache.org/licenses/LICENSE-2.0

THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
MERCHANTABLITY OR NON-INFRINGEMENT.

See the Apache Version 2.0 License for specific language governing permissions
and limitations under the License.
***************************************************************************** */
/* global Reflect, Promise */

var extendStatics = Object.setPrototypeOf ||
    ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
    function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };

function __extends(d, b) {
    extendStatics(d, b);
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
}

var __assign = Object.assign || function __assign(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
    }
    return t;
};

function __rest(s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) if (e.indexOf(p[i]) < 0)
            t[p[i]] = s[p[i]];
    return t;
}

function __decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}

function __param(paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
}

function __metadata(metadataKey, metadataValue) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(metadataKey, metadataValue);
}

function __awaiter(thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

function __generator(thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
}

function __exportStar(m, exports) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}

function __values(o) {
    var m = typeof Symbol === "function" && o[Symbol.iterator], i = 0;
    if (m) return m.call(o);
    return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
}

function __read(o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
}

function __spread() {
    for (var ar = [], i = 0; i < arguments.length; i++)
        ar = ar.concat(__read(arguments[i]));
    return ar;
}

function __await(v) {
    return this instanceof __await ? (this.v = v, this) : new __await(v);
}

function __asyncGenerator(thisArg, _arguments, generator) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var g = generator.apply(thisArg, _arguments || []), i, q = [];
    return i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i;
    function verb(n) { if (g[n]) i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; }
    function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
    function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r);  }
    function fulfill(value) { resume("next", value); }
    function reject(value) { resume("throw", value); }
    function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
}

function __asyncDelegator(o) {
    var i, p;
    return i = {}, verb("next"), verb("throw", function (e) { throw e; }), verb("return"), i[Symbol.iterator] = function () { return this; }, i;
    function verb(n, f) { if (o[n]) i[n] = function (v) { return (p = !p) ? { value: __await(o[n](v)), done: n === "return" } : f ? f(v) : v; }; }
}

function __asyncValues(o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator];
    return m ? m.call(o) : typeof __values === "function" ? __values(o) : o[Symbol.iterator]();
}

function __makeTemplateObject(cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
}

function __importStar(mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result.default = mod;
    return result;
}

function __importDefault(mod) {
    return (mod && mod.__esModule) ? mod : { default: mod };
}


var tslib_1 = Object.freeze({
	__extends: __extends,
	__assign: __assign,
	__rest: __rest,
	__decorate: __decorate,
	__param: __param,
	__metadata: __metadata,
	__awaiter: __awaiter,
	__generator: __generator,
	__exportStar: __exportStar,
	__values: __values,
	__read: __read,
	__spread: __spread,
	__await: __await,
	__asyncGenerator: __asyncGenerator,
	__asyncDelegator: __asyncDelegator,
	__asyncValues: __asyncValues,
	__makeTemplateObject: __makeTemplateObject,
	__importStar: __importStar,
	__importDefault: __importDefault
});

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
exports.LoggerManagerToken = new core_1.InjectToken('__IOC_ILoggerManager');


});

unwrapExports(ILoggerManager);
var ILoggerManager_1 = ILoggerManager.LoggerManagerToken;

var IConfigureLoggerManager = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

/**
 * IConfigureLoggerManager interface token.
 * it is a token id, you can register yourself IConfigureLoggerManager for this.
 */
exports.ConfigureLoggerManagerToken = new core_1.InjectToken('__IOC_IConfigureLoggerManager');


});

unwrapExports(IConfigureLoggerManager);
var IConfigureLoggerManager_1 = IConfigureLoggerManager.ConfigureLoggerManagerToken;

var LogConfigure = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

/**
 * Log configure interface symbol.
 * it is a symbol id, you can register yourself LogConfigure for this.
 */
exports.LogConfigureToken = new core_1.InjectToken('__IOC_LogConfigure');


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
exports.LogFormaterToken = new core_1.InjectToken('__IOC_LogFormater');
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

var D__workspace_github_tsioc_packages_logs_lib = createCommonjsModule(function (module, exports) {
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

var index = unwrapExports(D__workspace_github_tsioc_packages_logs_lib);

return index;

})));
