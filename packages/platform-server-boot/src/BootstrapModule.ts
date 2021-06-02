import { Injectable } from '@tsdi/ioc';
import { IConfigureLoader, CONFIG_LOADER, DIModule, PROCESS_ROOT, Configuration, PROCESS_EXIT, IBootApplication } from '@tsdi/boot';
import { ServerModule, runMainPath, syncRequire } from '@tsdi/platform-server';
import * as path from 'path';


// to fix nodejs Date toJson bug.
Date.prototype.toJSON = function () {
    const timezoneOffsetInHours = -(this.getTimezoneOffset() / 60); // UTC minus local time

    // It's a bit unfortunate that we need to construct a new Date instance
    // (we don't want _this_ Date instance to be modified)
    const correctedDate = new Date(this.getFullYear(), this.getMonth(),
        this.getDate(), this.getHours(), this.getMinutes(), this.getSeconds(),
        this.getMilliseconds());
    correctedDate.setHours(this.getHours() + timezoneOffsetInHours);
    return correctedDate.toISOString();
}


/**
 * configure file loader.
 *
 * @export
 * @class ConfigureFileLoader
 * @implements {IConfigureLoader<Configuration>}
 */
@Injectable(CONFIG_LOADER)
export class ConfigureFileLoader implements IConfigureLoader<Configuration> {

    constructor(private baseURL: string) {
        this.baseURL = this.baseURL || runMainPath();
    }

    async load(uri?: string): Promise<Configuration> {
        const fs = syncRequire('fs');
        if (uri) {
            if (fs.existsSync(uri)) {
                return syncRequire(uri) as Configuration;
            } else if (fs.existsSync(path.join(this.baseURL, uri))) {
                return syncRequire(path.join(this.baseURL, uri)) as Configuration;
            } else {
                console.log(`config file: ${uri} not exists.`)
                return null;
            }
        } else {
            let cfgmodeles: Configuration;
            let cfgpath = path.join(this.baseURL, './config');
            ['.js', '.ts', '.json'].some(ext => {
                if (fs.existsSync(cfgpath + ext)) {
                    cfgmodeles = syncRequire(cfgpath + ext);
                }
                return !!cfgmodeles;
            });
            return cfgmodeles;
        }
    }
}


/**
 * server boot module.
 */
@DIModule({
    regIn: 'root',
    imports: [
        ServerModule
    ],
    providers: [
        ConfigureFileLoader,
        {
            provide: PROCESS_ROOT,
            useValue: runMainPath()
        },
        {
            provide: PROCESS_EXIT,
            useValue: (app: IBootApplication) => {
                process.once('beforeExit', () => {
                    app.destroy();
                });

                process.on('SIGINT', () => {
                    app.destroy();
                    console.log('SIGINT: app destoryed.')
                    process.exit();
                });

                process.on('SIGTERM', () => {
                    app.destroy();
                    console.log('SIGTERM: ctx destoryed.');
                });
            }
        }
    ]
})
export class ServerBootstrapModule { }
