import { PROCESS_ROOT } from '@tsdi/core';
import { Inject, Injectable } from '@tsdi/ioc';
import { runMainPath } from '@tsdi/platform-server';
import { ApplicationConfiguration, ConfigureLoader } from './config';

import * as path from 'path';
import * as fs from 'fs';

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
             this.baseURL = runMainPath()
         }
     }
 
     async load<T extends ApplicationConfiguration>(uri?: string): Promise<T> {
         if (uri) {
             if (fs.existsSync(uri)) {
                 return await import(uri) as T
             } else if (fs.existsSync(path.join(this.baseURL, uri))) {
                 return await import(path.join(this.baseURL, uri)) as T
             } else {
                 console.log(`config file: ${uri} not exists.`)
                 return null!
             }
         } else {
             const cfgpath = path.join(this.baseURL, './config');
             const file = ['.js', '.ts', '.json'].map(ext => cfgpath + ext).find(f => fs.existsSync(f))!;
             return file ? await import(file) as T : null!
         }
     }
 }
 