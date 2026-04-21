"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerApplicationArguments = void 0;
const ioc_1 = require("@tsdi/ioc");
const core_1 = require("@tsdi/core");
const os = require("os");
const isArg = /^--/;
const isNum = /^\d+(.\d+)?$/;
const DEFAULT_MODE = 'development';
const DEFAULT_PLATFORM = 'server';
class ServerApplicationArguments extends core_1.ApplicationArguments {
    constructor(_env, _source) {
        super();
        this._env = _env;
        this._source = _source;
        this._args = this.toRecord(_source);
        this._env = this._env || {};
        this._signls = this.tryGetSignls();
        this._envOverride = {};
        this.initEnvironment();
    }
    initEnvironment() {
        this._name = this.resolveEnv('APP_NAME', 'tsdi-app');
        this._version = this.resolveEnv('APP_VERSION', '1.0.0');
        this._mode = this.resolveMode();
        this._platform = DEFAULT_PLATFORM;
        this._cwd = process.cwd();
        this._hostname = this.resolveEnv('HOSTNAME', os.hostname() || 'localhost');
        this._pid = process.pid;
        this._locale = this.resolveEnv('LANG', 'en-US');
        this._timezone = this.resolveEnv('TZ', Intl.DateTimeFormat().resolvedOptions().timeZone);
        this._debug = this.resolveDebug();
        this._logLevel = this.resolveEnv('LOG_LEVEL', this._debug ? 'debug' : 'info');
        this._baseURL = this.resolveEnv('BASE_URL', this._cwd);
    }
    resolveEnv(key, defaultValue) {
        const envVal = this._env[key] ?? this._args[key];
        return envVal ?? defaultValue;
    }
    resolveMode() {
        const modeEnv = this._env.NODE_ENV ?? this._env.APP_MODE ?? this._args.mode;
        if (modeEnv) {
            const normalized = (0, ioc_1.isString)(modeEnv) ? modeEnv.toLowerCase().trim() : modeEnv;
            if (['development', 'dev'].includes(normalized))
                return 'development';
            if (['production', 'prod'].includes(normalized))
                return 'production';
            if (['test', 'testing'].includes(normalized))
                return 'test';
            if (['staging', 'stage'].includes(normalized))
                return 'staging';
        }
        return DEFAULT_MODE;
    }
    resolveDebug() {
        const debugEnv = this._env.DEBUG ?? this._env.NODE_DEBUG ?? this._args.debug;
        if (debugEnv === 'true' || debugEnv === '1' || debugEnv === true)
            return true;
        if (debugEnv === 'false' || debugEnv === '0' || debugEnv === false)
            return false;
        return this._mode === 'development';
    }
    get env() {
        return this._env;
    }
    get argsSource() {
        return this._source;
    }
    get args() {
        return this._args;
    }
    get cmds() {
        return this._cmds || [];
    }
    get signls() {
        return this._signls;
    }
    get name() {
        return this._envOverride.name ?? this._name;
    }
    get version() {
        return this._envOverride.version ?? this._version;
    }
    get mode() {
        return this._envOverride.mode ?? this._mode;
    }
    get platform() {
        return this._envOverride.platform ?? this._platform;
    }
    get cwd() {
        return this._envOverride.cwd ?? this._cwd;
    }
    get hostname() {
        return this._envOverride.hostname ?? this._hostname;
    }
    get pid() {
        return this._envOverride.pid ?? this._pid;
    }
    get locale() {
        return this._envOverride.locale ?? this._locale;
    }
    get timezone() {
        return this._envOverride.timezone ?? this._timezone;
    }
    get debug() {
        return this._envOverride.debug ?? this._debug;
    }
    get logLevel() {
        return this._envOverride.logLevel ?? this._logLevel;
    }
    get baseURL() {
        return this._envOverride.baseURL ?? this._baseURL;
    }
    reset(args) {
        this._source = args;
        this._args = this.toRecord(args);
        this._signls = this.tryGetSignls();
        this.initEnvironment();
    }
    mergeEnvironment(env) {
        this._envOverride = { ...this._envOverride, ...env };
    }
    toRecord(args) {
        const argr = {};
        const cmds = this._cmds = [];
        args.forEach(arg => {
            if (isArg.test(arg)) {
                const [k, val] = arg.slice(2).split('=');
                if (isNum.test(val)) {
                    argr[k] = val.indexOf('.') ? parseFloat(val) : parseInt(val);
                }
                else if (val) {
                    argr[k] = val;
                }
                else {
                    argr[k] = true;
                }
            }
            else {
                cmds.push(arg);
            }
        });
        return argr;
    }
    tryGetSignls() {
        const sigs = this.env.signls || this._args.signls;
        return sigs ? ((0, ioc_1.isString)(sigs) ? sigs.split(',') : signls) : [];
    }
}
exports.ServerApplicationArguments = ServerApplicationArguments;
const signls = [
    'SIGHUP',
    'SIGINT',
    'SIGQUIT',
    'SIGILL',
    'SIGTRAP',
    'SIGABRT',
    'SIGBUS',
    'SIGFPE',
    'SIGSEGV',
    'SIGUSR2',
    'SIGTERM',
];
//# sourceMappingURL=args.js.map