import { Injectable, Singleton, ModuleLoader, Inject, isString, EMPTY } from '@tsdi/ioc';
import {
    Module, ConfigureLoader, PROCESS_ROOT, ApplicationConfiguration, ApplicationExit,
    ApplicationContext, ApplicationArguments, PLATFORM_ID, PLATFORM_SERVER_ID, XhrFactory
} from '@tsdi/core';
import * as path from 'path';
import * as fs from 'fs';
import { runMainPath } from './toAbsolute';
import { NodeModuleLoader } from './NodeModuleLoader';
import { ServerXhr } from './xhr';


/**
 * configure file loader.
 *
 * @export
 * @class ConfigureFileLoader
 */
@Injectable(ConfigureLoader)
export class ConfigureFileLoader implements ConfigureLoader {

    constructor(@Inject(PROCESS_ROOT, { nullable: true }) private baseURL: string) {
        if (!baseURL) {
            this.baseURL = runMainPath();
        }
    }

    async load<T extends ApplicationConfiguration>(uri?: string): Promise<T> {
        if (uri) {
            if (fs.existsSync(uri)) {
                return await import(uri) as T;
            } else if (fs.existsSync(path.join(this.baseURL, uri))) {
                return await import(path.join(this.baseURL, uri)) as T;
            } else {
                console.log(`config file: ${uri} not exists.`)
                return null!;
            }
        } else {
            const cfgpath = path.join(this.baseURL, './config');
            const file = ['.js', '.ts', '.json'].map(ext => cfgpath + ext).find(f => fs.existsSync(f))!;
            return file ? await import(file) as T : null!;
        }
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

const isArg = /^--/;
const isNum = /^\d+(.\d+)?$/;
export class ServerApplicationArguments extends ApplicationArguments {
    private _signls: string[];
    private _args: Record<string, any>;
    private _cmds?: string[];

    constructor(private _env: Record<string, string | undefined>, private _source: string[]) {
        super()
        this._args = this.toRecord(_source);
        this._env = this._env || {};
        this._signls = this.tryGetSignls();
    }

    get env() {
        return this._env;
    }
    get argsSource(): string[] {
        return this._source;
    }
    get args(): Record<string, string> {
        return this._args;
    }

    get cmds() {
        return this._cmds || EMPTY;
    }

    get signls(): string[] {
        return this._signls;
    }

    reset(args: string[]): void {
        this._source = args;
        this._args = this.toRecord(args);
        this._signls = this.tryGetSignls();
    }

    protected toRecord(args: string[]): Record<string, string | boolean | number> {
        const argr = {} as Record<string, string | boolean | number>;
        const cmds: string[] = this._cmds = [];
        args.forEach(arg => {
            if (isArg.test(arg)) {
                const [k, val] = arg.slice(2).split('=');
                if (isNum.test(val)) {
                    argr[k] = val.indexOf('.') ? parseFloat(val) : parseInt(val);
                } else if (val) {
                    argr[k] = val;
                } else {
                    argr[k] = true;
                }
            } else {
                cmds.push(arg);
            }
        });
        return argr;
    }

    protected tryGetSignls() {
        const sigs = this.env.signls || this._args.signls;
        return sigs ? (isString(sigs) ? sigs.split(',') : signls) : EMPTY;
    }
}

@Singleton()
export class ServerApplicationExit extends ApplicationExit {

    constructor(readonly context: ApplicationContext) {
        super();
    }

    override register(): void {
        const usedsignls = this.context.arguments.signls;
        if (!usedsignls?.length) return;

        const logger = this.context.getLogManager()?.getLogger();
        const callback = async (signal: string) => {
            try {
                usedsignls.forEach(si => process.removeListener(si, callback));
                await this.context.destroy();
                process.kill(process.pid, signal);
            } catch (err) {
                logger?.error(err);
                process.exit(1);
            }
        }
        usedsignls.forEach(signl => {
            process.on(signl, callback);
        });
    }

}


/**
 * server boot module.
 */
@Module({
    providedIn: 'platform',
    providers: [
        { provide: PLATFORM_ID, useValue: PLATFORM_SERVER_ID },
        { provide: XhrFactory, useClass: ServerXhr },
        ConfigureFileLoader,
        { provide: ApplicationArguments, useValue: new ServerApplicationArguments(process.env, process.argv.slice(2)) },
        { provide: PROCESS_ROOT, useValue: runMainPath(), asDefault: true },
        { provide: ModuleLoader, useValue: new NodeModuleLoader() },
        { provide: ApplicationExit, useClass: ServerApplicationExit }
    ]
})
export class ServerBootstrapModule { }
