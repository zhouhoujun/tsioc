import { Injectable, Singleton, ModuleLoader, Inject } from '@tsdi/ioc';
import { Module, ConfigureLoader, PROCESS_ROOT, Configuration, ApplicationExit, ApplicationContext } from '@tsdi/core';
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

@Singleton()
export class ServerApplicationExit extends ApplicationExit {

    private hdl!: () => void;

    constructor(readonly context: ApplicationContext) {
        super();
    }

    override register(): void {
        if (!this.hdl) {
            this.hdl = () => {
                const logger = this.context.getLogManager()?.getLogger();
                if (logger) {
                    logger.log('SIGINT: app destoryed.');
                } else {
                    console.log('SIGINT: app destoryed.');
                }
                this.exit();
            };
        }
        process.on('SIGINT', () => {
            this.exit();
        });
        this.context.onDestroy(() => {
            process.removeListener('SIGINT', this.hdl)
        });
    }

    override exit(err?: Error) {
        const logger = this.context.getLogManager()?.getLogger();
        if (err) {
            logger ? logger.error(err) : console.error(err);
        }
        this.context.destroy();
        if (this.context.exit) {
            process.exit(err ? 1 : 0);
        } else if (err) {
            throw err;
        }
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
