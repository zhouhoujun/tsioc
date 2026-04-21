"use strict";
var _a, _b, _c;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsoleLog = exports.ConsoleLogManager = exports.LoggerManagers = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const logger_1 = require("./logger");
const LogConfigure_1 = require("./LogConfigure");
const Level_1 = require("./Level");
const LoggerManager_1 = require("./LoggerManager");
/**
 * Configure logger manger. use to get configed logger manger.
 *
 * @export
 */
let LoggerManagers = class LoggerManagers {
    constructor(injector) {
        this.injector = injector;
        this.inited = false;
        this.maps = new Map();
        this.cfgs = new Map();
    }
    hasConfigure(adapter) {
        return adapter ? this.cfgs.has(adapter) : this.cfgs.size > 0;
    }
    getConfigure(adapter) {
        return adapter ? this.cfgs.get(adapter) : this._defaultCfg;
    }
    getLoggerManager(adapter) {
        this.init();
        if (!adapter) {
            this._defaultCfg.config && this._defaultLogMgr.configure(this._defaultCfg.config);
            return this._defaultLogMgr;
        }
        const mgr = this.maps.get(adapter);
        if (!mgr) {
            throw new ioc_1.ArgumentException(`has no provider for LoggerManager ${adapter.toString()}.`);
        }
        const cfg = this.cfgs.get(adapter);
        cfg?.config && mgr.configure(cfg.config);
        return mgr;
    }
    configure(config, adapter) {
        this.getLoggerManager(adapter).configure(config);
    }
    getLogger(name, adapter) {
        return this.getLoggerManager(adapter)?.getLogger(name);
    }
    init() {
        if (this.inited)
            return;
        if (!this.injector.has(LogConfigure_1.LOG_CONFIGURES)) {
            ioc_1.InjectUtil.provider(this.injector, { provide: LogConfigure_1.LOG_CONFIGURES, useValue: { adapter: 'console' }, multi: true });
        }
        this.inited = true;
        const configs = this.injector.get(LogConfigure_1.LOG_CONFIGURES);
        if (configs.length === 1 || !configs.some(v => v.asDefault)) {
            configs[0].asDefault = true;
        }
        configs.forEach(cfg => {
            let token;
            const adapter = cfg.adapter;
            if ((0, ioc_1.isString)(adapter)) {
                token = (0, ioc_1.getToken)(LoggerManager_1.LoggerManager, adapter);
            }
            else {
                token = adapter;
            }
            const manager = this.injector.get(token);
            if (!manager) {
                throw new ioc_1.ArgumentException(`has no provider for LoggerManager ${token.toString()}.`);
            }
            this.cfgs.set(adapter, cfg);
            cfg.config && manager.configure(cfg.config);
            if (cfg.asDefault) {
                this._defaultLogMgr = manager;
                this._defaultCfg = cfg;
            }
            this.maps.set(adapter, manager);
        });
    }
};
exports.LoggerManagers = LoggerManagers;
_a = ioc_1.noPointcut;
LoggerManagers[_a] = true;
exports.LoggerManagers = LoggerManagers = tslib_1.__decorate([
    (0, ioc_1.Injectable)({
        static: true,
        providedIn: 'root'
    }),
    tslib_1.__param(0, (0, ioc_1.Inject)()),
    tslib_1.__metadata("design:paramtypes", [ioc_1.Injector])
], LoggerManagers);
/**
 * console log manager.
 *
 * @export
 * @class ConsoleLogManager
 * @implements {ILoggerManager}
 */
let ConsoleLogManager = class ConsoleLogManager {
    constructor(headerFormater) {
        this.headerFormater = headerFormater;
    }
    configure(config) {
        this.config = config;
    }
    getLogger(name) {
        return new ConsoleLog(name, this.config?.level, this.headerFormater);
    }
};
exports.ConsoleLogManager = ConsoleLogManager;
_b = ioc_1.noPointcut;
ConsoleLogManager[_b] = true;
exports.ConsoleLogManager = ConsoleLogManager = tslib_1.__decorate([
    (0, ioc_1.Injectable)(LoggerManager_1.LoggerManager, 'console'),
    tslib_1.__param(0, (0, ioc_1.Nullable)()),
    tslib_1.__metadata("design:paramtypes", [logger_1.HeaderFormater])
], ConsoleLogManager);
/**
 * console log.
 *
 * @class ConsoleLog
 * @implements {Logger}
 */
class ConsoleLog {
    constructor(name, level = 'debug', headerFormater) {
        this.level = level;
        this.headerFormater = headerFormater;
        this.formatHeader = true;
        this.category = name || 'default';
    }
    machLevel(level) {
        return Level_1.Levels[this.level] <= level;
    }
    getHeader(level) {
        if (this.headerFormater) {
            return this.headerFormater.format(this.category ?? '', level.toUpperCase());
        }
        return [`[${new Date().toISOString()}]`, `[${level.toUpperCase()}]`, this.category ?? '', '-'];
    }
    log(...args) {
        console.log(...this.getHeader(Level_1.levels[0]), ...args);
    }
    trace(...args) {
        if (this.machLevel(Level_1.Levels.trace)) {
            console.trace(...this.getHeader(Level_1.levels[1]), ...args);
        }
    }
    debug(...args) {
        // console.debug in nuix will not console.
        if (this.machLevel(Level_1.Levels.debug)) {
            console.debug(...this.getHeader(Level_1.levels[2]), ...args);
        }
    }
    info(...args) {
        if (this.machLevel(Level_1.Levels.info)) {
            console.info(...this.getHeader(Level_1.levels[3]), ...args);
        }
    }
    warn(...args) {
        if (this.machLevel(Level_1.Levels.warn)) {
            console.warn(...this.getHeader(Level_1.levels[4]), ...args);
        }
    }
    error(...args) {
        if (this.machLevel(Level_1.Levels.error)) {
            console.error(...this.getHeader(Level_1.levels[5]), ...args);
        }
    }
    fatal(...args) {
        if (this.machLevel(Level_1.Levels.fatal)) {
            console.error(...this.getHeader(Level_1.levels[6]), ...args);
        }
    }
}
exports.ConsoleLog = ConsoleLog;
_c = ioc_1.noPointcut;
ConsoleLog[_c] = true;
//# sourceMappingURL=manager.js.map