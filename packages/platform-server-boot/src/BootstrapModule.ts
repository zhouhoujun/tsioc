import { Injectable } from '@tsdi/ioc';
import { IContainer } from '@tsdi/core';
import { IConfigureLoader, CONFIG_LOADER, DIModule, PROCESS_ROOT, Configure } from '@tsdi/boot';
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
 * @implements {IConfigureLoader<Configure>}
 */
@Injectable(CONFIG_LOADER)
export class ConfigureFileLoader implements IConfigureLoader<Configure> {
    constructor(private baseURL: string, private container: IContainer) {
        this.baseURL = this.baseURL || runMainPath();
    }
    async load(uri?: string): Promise<Configure> {
        const fs = syncRequire('fs');
        if (uri) {
            if (fs.existsSync(uri)) {
                return syncRequire(uri) as Configure;
            } else if (fs.existsSync(path.join(this.baseURL, uri))) {
                return syncRequire(path.join(this.baseURL, uri)) as Configure;
            } else {
                console.log(`config file: ${uri} not exists.`)
                return null;
            }
        } else {
            let cfgmodeles: Configure;
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
        { provide: PROCESS_ROOT, useValue: runMainPath() }
    ]
})
export class ServerBootstrapModule { }
