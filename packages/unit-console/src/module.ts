import { Module, ModuleWithProviders, Provider } from '@tsdi/ioc';
import { UNIT_REPORTES } from '@tsdi/unit';
import { ServerModule } from '@tsdi/platform-server';
import { ServerLog4Module } from '@tsdi/platform-server/log4js';
import { V8CoverageCollector } from './V8CoverageCollector';
import { ConsoleReporter } from './console';
import { V8CoverageReporter } from './coverage';
@Module({
    imports: [
        ServerModule,
        ServerLog4Module
    ],
    providers: [
        V8CoverageCollector,
        ConsoleReporter,
        V8CoverageReporter,
        { provide: UNIT_REPORTES, useExisting: ConsoleReporter, multi: true }
    ]
})
export class ConsoleModule {
 
    static withOptions(coverage?: boolean): ModuleWithProviders {
        const providers: Provider[] = coverage? [{provide: UNIT_REPORTES, useExisting: V8CoverageReporter, multi: true}] :[]
        return {
            providers,
            module: ConsoleModule
        }
    }
}