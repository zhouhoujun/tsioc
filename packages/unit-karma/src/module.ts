import { Module, ModuleWithProviders, Provider } from '@tsdi/ioc';
import { KarmaReporter } from './karma';
import { BrowserCoverageCollector } from './BrowserCoverageCollector';
import { KarmaCoverageReporter } from './coverage';
import { UNIT_REPORTES } from '@tsdi/unit';


@Module({
    providers: [
        BrowserCoverageCollector,
        KarmaReporter,
        KarmaCoverageReporter,
        { provide: UNIT_REPORTES, useExisting: KarmaReporter, multi: true }
    ]
})
export class KarmaModule {

    static withOptions(coverage?: boolean): ModuleWithProviders {
        const providers: Provider[] = coverage ? [{ provide: UNIT_REPORTES, useExisting: KarmaCoverageReporter, multi: true }] : []
        return {
            providers,
            module: KarmaModule
        }
    }
}
