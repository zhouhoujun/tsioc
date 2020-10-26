import { Injectable } from '@tsdi/ioc';
import { IContainer } from '@tsdi/core';
import { IConfigureLoader, CONFIG_LOADER, DIModule, PROCESS_ROOT, Configure } from '@tsdi/boot';
import { ServerModule, runMainPath, syncRequire } from '@tsdi/platform-server';
import * as path from 'path';

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
 * server boot module
 *
 * @export
 * @class ServerBootstrapModule
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
export class ServerBootstrapModule {

}

