import { Injectable, Singleton, ModuleLoader, Inject } from '@tsdi/ioc';
import { Module, ConfigureLoader, PROCESS_ROOT, Configuration, ApplicationExit, ApplicationContext, ApplicationArguments } from '@tsdi/core';
import * as path from 'path';
import * as fs from 'fs';
import { runMainPath } from './toAbsolute';
import { NodeModuleLoader } from './NodeModuleLoader';


/**
 * configure file loader.
 *
 * @export
 * @class ConfigureFileLoader
 */
@Injectable(ConfigureLoader)
export class ConfigureFileLoader implements ConfigureLoader {

    constructor(@Inject(PROCESS_ROOT, { defaultValue: '' }) private baseURL: string) {
        this.baseURL = this.baseURL || runMainPath();
    }

    async load<T extends Configuration>(uri?: string): Promise<T> {
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

export class ServerApplicationArguments extends ApplicationArguments {
    private _signls?: string[];
    private _options: Record<string, any>;

    constructor(private _args: string[]) {
        this._options = this.toRecord(_args);
        this._signls = this._options.signls || signls;
    }

    get args(): string[] {
        return this._args;
    }
    get options(): Record<string, string> {
        return this._options;
    }
    get signls(): string[] {
       return this._signls; 
    }

    reset(args: string[]): void {
        this._options = this.toRecord(args);
        this._signls = this._options.signls || signls;
    }

    protected toRecord(args: string[]): Record<string, string> {
        
    }


}

@Singleton()
export class ServerApplicationExit extends ApplicationExit {

    constructor(readonly context: ApplicationContext) {
        super();
    }

    override register(): void {
        const usedsignls = this.context.args.signls;
        const logger = this.context.getLogManager()?.getLogger();
        const callback = async (signal: string) => {
            try {
                usedsignls.forEach(si => process.removeListener(si, callback));
                await this.context.dispose();
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
        ConfigureFileLoader,
        {
            provide: APPLICATION_ARGS,
            useValue: process.argv
        },
        {
            provide: PROCESS_ROOT,
            useValue: runMainPath()
        },
        {
            provide: ModuleLoader,
            useValue: new NodeModuleLoader()
        },
        {
            provide: ApplicationExit,
            useClass: ServerApplicationExit
        }
    ]
})
export class ServerBootstrapModule { }
