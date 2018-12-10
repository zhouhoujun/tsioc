import { IContainer, Injectable } from '@ts-ioc/core';
import { AppConfigure, ApplicationBuilder, IApplicationBuilder, IConfigureLoader, ConfigureLoaderToken, DIModule } from '@ts-ioc/bootstrap';
import * as path from 'path';
import { ServerModule } from '@ts-ioc/platform-server';

declare let require: any;

@Injectable(ConfigureLoaderToken)
export class ConfigureFileLoader implements IConfigureLoader<AppConfigure> {
    constructor(private baseURL: string, private container: IContainer) {

    }
    async load(uri?: string): Promise<AppConfigure> {
        const fs = require('fs');
        if (uri) {
            if (fs.existsSync(uri)) {
                return require(uri) as AppConfigure;
            } else if (fs.existsSync(path.join(this.baseURL, uri))) {
                return require(path.join(this.baseURL, uri)) as AppConfigure;
            } else {
                console.log(`config file: ${uri} not exists.`)
                return null;
            }
        } else {
            let cfgmodeles: AppConfigure;
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


/**
 * server app.
 *
 * @export
 * @template T
 * @param {string} [baseURL]
 * @returns {IApplicationBuilderServer<T>}
 */
export function serverApp<T>(baseURL?: string): IApplicationBuilder<T> {
    return new ApplicationBuilder<T>(baseURL).use(ServerBootstrapModule);
}


/**
 * server boot module
 *
 * @export
 * @class ServerBootstrapModule
 */
@DIModule({
    imports: [
        ServerModule,
        ConfigureFileLoader
    ],
    exports: [
        ConfigureFileLoader
    ]
})
export class ServerBootstrapModule {

}

