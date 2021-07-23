import { Injectable } from '@tsdi/ioc';
import { IConfigureLoader, CONFIG_LOADER, DIModule, PROCESS_ROOT, Configuration, ApplicationExit, ApplicationContext } from '@tsdi/boot';
import { ServerModule, runMainPath } from '@tsdi/platform-server';
import * as path from 'path';
import * as fs from 'fs';


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
        if (uri) {
            if (fs.existsSync(uri)) {
                return await import(uri) as Configuration;
            } else if (fs.existsSync(path.join(this.baseURL, uri))) {
                return await import(path.join(this.baseURL, uri)) as Configuration;
            } else {
                console.log(`config file: ${uri} not exists.`)
                return null;
            }
        } else {
            const cfgpath = path.join(this.baseURL, './config');
            const file = ['.js', '.ts', '.json'].map(ext => cfgpath + ext).find(f => fs.existsSync(f));
            return await import(file) as Configuration;
        }
    }
}


class ServerApplicationExit extends ApplicationExit {

    register(context: ApplicationContext): void {
        process.on('SIGINT', () => {
            this.exit(context);
        });
    }

    exit(context: ApplicationContext) {
        context.destroy();
        console.log('SIGINT: app destoryed.')
        process.exit();
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
            provide: ApplicationExit,
            useValue: new ServerApplicationExit()
        }
    ]
})
export class ServerBootstrapModule { }
