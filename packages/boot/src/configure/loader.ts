import { ApplicationArguments } from '@tsdi/core';
import { Inject, Injectable } from '@tsdi/ioc';
import { runMainPath } from '@tsdi/platform-server';
import { ApplicationConfiguration, ConfigureLoader } from './config';

import * as path from 'path';
import * as fs from 'fs';

@Injectable(ConfigureLoader)
export class ConfigureFileLoader implements ConfigureLoader {

    constructor(@Inject(ApplicationArguments, { nullable: true }) private appArgs: ApplicationArguments) {
        if (!this.appArgs) {
            this.appArgs = { baseURL: runMainPath() } as ApplicationArguments;
        }
    }

    async load<T extends ApplicationConfiguration>(uri?: string): Promise<T> {
        const baseURL = this.appArgs.baseURL;
        if (uri) {
            if (fs.existsSync(uri)) {
                return await import(uri) as T
            } else if (fs.existsSync(path.join(baseURL, uri))) {
                return await import(path.join(baseURL, uri)) as T
            } else {
                console.log(`config file: ${uri} not exists.`)
                return null!
            }
        } else {
            const cfgpath = path.join(baseURL, './config');
            const file = ['.js', '.ts', '.json'].map(ext => cfgpath + ext).find(f => fs.existsSync(f))!;
            return file ? await import(file) as T : null!
        }
    }
}
