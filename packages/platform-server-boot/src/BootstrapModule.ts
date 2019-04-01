import { IContainer } from '@tsdi/core';
import { IConfigureLoader, ConfigureLoaderToken, DIModule, ProcessRunRootToken, RegScope } from '@tsdi/boot';
import * as path from 'path';
import { ServerModule } from '@tsdi/platform-server';
import { Injectable } from '@tsdi/ioc';
import { RunnableConfigure } from '@tsdi/boot';

declare let require: any;

@Injectable(ConfigureLoaderToken)
export class ConfigureFileLoader implements IConfigureLoader<RunnableConfigure> {
    constructor(private baseURL: string, private container: IContainer) {

    }
    async load(uri?: string): Promise<RunnableConfigure> {
        const fs = require('fs');
        if (uri) {
            if (fs.existsSync(uri)) {
                return require(uri) as RunnableConfigure;
            } else if (fs.existsSync(path.join(this.baseURL, uri))) {
                return require(path.join(this.baseURL, uri)) as RunnableConfigure;
            } else {
                console.log(`config file: ${uri} not exists.`)
                return null;
            }
        } else {
            let cfgmodeles: RunnableConfigure;
            let cfgpath = path.join(this.baseURL, './config');
            ['.js', '.ts', '.json'].forEach(ext => {
                if (cfgmodeles) {
                    return false;
                }
                if (fs.existsSync(cfgpath + ext)) {
                    cfgmodeles = require(cfgpath + ext);
                    return false;
                }
                return true;
            });
            return cfgmodeles;
        }
    }

}



let cwd = process.cwd();
let processRoot = path.join(path.dirname(cwd), path.basename(cwd));

/**
 * server boot module
 *
 * @export
 * @class ServerBootstrapModule
 */
@DIModule({
    regScope: RegScope.boot,
    imports: [
        ServerModule,
        ConfigureFileLoader
    ],
    providers: [
        { provide: ProcessRunRootToken, useValue: processRoot }
    ]
})
export class ServerBootstrapModule {

}

