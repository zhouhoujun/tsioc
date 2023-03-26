import { Module } from '@tsdi/ioc';
import { PROCESS_ROOT, ApplicationArguments, ModuleLoader } from '@tsdi/core';
import { HeaderFormater } from '@tsdi/logs';
import { runMainPath } from './toAbsolute';
import { NodeModuleLoader } from './NodeModuleLoader';
import { LogHeaderFormater } from './formater';
import { ServerApplicationArguments } from './args';
import { ApplicationExit } from './exit';


/**
 * server boot module.
 */
@Module({
    providedIn: 'root',
    providers: [
        { provide: ApplicationArguments, useValue: new ServerApplicationArguments(process.env, process.argv.slice(2)) },
        { provide: PROCESS_ROOT, useValue: runMainPath(), asDefault: true },
        { provide: ModuleLoader, useValue: new NodeModuleLoader() },
        { provide: HeaderFormater, useClass: LogHeaderFormater, asDefault: true },
        ApplicationExit
    ]
})
export class ServerModule { }
