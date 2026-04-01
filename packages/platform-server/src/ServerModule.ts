import { Module } from '@tsdi/ioc';
import { ApplicationArguments, ModuleLoader, HrtimeFormatter } from '@tsdi/core';
import { HeaderFormater } from '@tsdi/logger';
import { DOCUMENT, PLATFORM_ID, PLATFORM_SERVER_ID } from '@tsdi/common';
import { runMainPath } from './toAbsolute';
import { NodeModuleLoader } from './NodeModuleLoader';
import { LogHeaderFormater } from './formater';
import { ServerApplicationArguments } from './args';
import { ApplicationExit } from './exit';
import { ServerHrtimeFormatter } from './hrtime';

@Module({
    providedIn: 'root',
    providers: [
        { 
            provide: ApplicationArguments, 
            useFactory: () => {
                const args = new ServerApplicationArguments(process.env, process.argv.slice(2));
                args.mergeEnvironment({ baseURL: runMainPath() });
                return args;
            }
        },
        { provide: ModuleLoader, useValue: new NodeModuleLoader() },
        { provide: HrtimeFormatter, useClass: ServerHrtimeFormatter },
        { provide: HeaderFormater, useClass: LogHeaderFormater, asDefault: true },
        { provide: PLATFORM_ID, useValue: PLATFORM_SERVER_ID },
        {
            provide: DOCUMENT,
            useFactory: () => {
                const { JSDOM } = require('jsdom');
                const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
                return dom.window.document;
            },
            asDefault: true
        },
        ApplicationExit
    ]
})
export class ServerModule { }
