import { isString } from '@tsdi/ioc';
import { ApplicationArguments, AppMode, AppPlatform, EnvironmentConfig } from '@tsdi/core';
import * as os from 'os';


const isArg = /^--/;
const isNum = /^\d+(.\d+)?$/;

const DEFAULT_MODE: AppMode = 'development';
const DEFAULT_PLATFORM: AppPlatform = 'server';

export class ServerApplicationArguments extends ApplicationArguments {
    private _signls: string[];
    private _args: Record<string, any>;
    private _cmds?: string[];
    
    private _name!: string;
    private _version!: string;
    private _mode!: AppMode;
    private _platform!: AppPlatform;
    private _cwd!: string;
    private _hostname!: string;
    private _pid!: number;
    private _locale!: string;
    private _timezone!: string;
    private _debug!: boolean;
    private _logLevel!: string;
    private _baseURL!: string;
    private _extraConfig!: EnvironmentConfig;

    constructor(private _env: Record<string, string | undefined>, private _source: string[]) {
        super()
        this._args = this.toRecord(_source);
        this._env = this._env || {};
        this._signls = this.tryGetSignls();
        this._extraConfig = {};
        this.initEnvironment();
    }

    protected initEnvironment() {
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

    protected resolveEnv(key: string, defaultValue: string): string {
        const envVal = this._env[key] ?? this._args[key];
        return envVal ?? defaultValue;
    }

    protected resolveMode(): AppMode {
        const modeEnv = this._env.NODE_ENV ?? this._env.APP_MODE ?? this._args.mode;
        if (modeEnv) {
            const normalized = isString(modeEnv) ? modeEnv.toLowerCase().trim() : modeEnv;
            if (['development', 'dev'].includes(normalized)) return 'development';
            if (['production', 'prod'].includes(normalized)) return 'production';
            if (['test', 'testing'].includes(normalized)) return 'test';
            if (['staging', 'stage'].includes(normalized)) return 'staging';
        }
        return DEFAULT_MODE;
    }

    protected resolveDebug(): boolean {
        const debugEnv = this._env.DEBUG ?? this._env.NODE_DEBUG ?? this._args.debug;
        if (debugEnv === 'true' || debugEnv === '1' || debugEnv === true) return true;
        if (debugEnv === 'false' || debugEnv === '0' || debugEnv === false) return false;
        return this._mode === 'development';
    }

    // ==================== Original Properties ====================
    
    get env() {
        return this._env
    }
    get argsSource(): string[] {
        return this._source
    }
    get args(): Record<string, string> {
        return this._args
    }

    get cmds() {
        return this._cmds || []
    }

    get signls(): string[] {
        return this._signls
    }

    // ==================== New Environment Properties ====================
    
    get name(): string {
        return this._extraConfig.name ?? this._name;
    }
    
    get version(): string {
        return this._extraConfig.version ?? this._version;
    }
    
    get mode(): AppMode {
        return this._extraConfig.mode ?? this._mode;
    }
    
    get platform(): AppPlatform {
        return this._extraConfig.platform ?? this._platform;
    }
    
    get cwd(): string {
        return this._extraConfig.cwd ?? this._cwd;
    }
    
    get hostname(): string {
        return this._extraConfig.hostname ?? this._hostname;
    }
    
    get pid(): number {
        return this._extraConfig.pid ?? this._pid;
    }
    
    get locale(): string {
        return this._extraConfig.locale ?? this._locale;
    }
    
    get timezone(): string {
        return this._extraConfig.timezone ?? this._timezone;
    }
    
    get debug(): boolean {
        return this._extraConfig.debug ?? this._debug;
    }
    
    get logLevel(): string {
        return this._extraConfig.logLevel ?? this._logLevel;
    }
    
    get baseURL(): string {
        return this._extraConfig.baseURL ?? this._baseURL;
    }

    // ==================== Methods ====================

    reset(args: string[]): void {
        this._source = args;
        this._args = this.toRecord(args);
        this._signls = this.tryGetSignls();
        this.initEnvironment();
    }

    mergeConfig(config: EnvironmentConfig): void {
        this._extraConfig = { ...this._extraConfig, ...config };
    }

    protected toRecord(args: string[]): Record<string, string | boolean | number> {
        const argr = {} as Record<string, string | boolean | number>;
        const cmds: string[] = this._cmds = [];
        args.forEach(arg => {
            if (isArg.test(arg)) {
                const [k, val] = arg.slice(2).split('=');
                if (isNum.test(val)) {
                    argr[k] = val.indexOf('.') ? parseFloat(val) : parseInt(val)
                } else if (val) {
                    argr[k] = val
                } else {
                    argr[k] = true
                }
            } else {
                cmds.push(arg)
            }
        });
        return argr
    }

    protected tryGetSignls() {
        const sigs = this.env.signls || this._args.signls;
        return sigs ? (isString(sigs) ? sigs.split(',') : signls) : []
    }
}

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
