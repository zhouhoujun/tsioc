import { Module } from '@tsdi/ioc';
import { ApplicationArguments, ModuleLoader, HrtimeFormatter } from '@tsdi/core';
import { HeaderFormater } from '@tsdi/logger';
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
        ApplicationExit
    ]
})
export class ServerModule { }
