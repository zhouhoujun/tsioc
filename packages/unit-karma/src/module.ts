import { Module, ModuleWithProviders, Provider } from '@tsdi/ioc';
import { KarmaReporter } from './karma';
import { BrowserCoverageCollector } from './BrowserCoverageCollector';
import { KarmaCoverageReporter } from './coverage';
import { UNIT_REPORTES } from '@tsdi/unit';
import { BrowserTestCompiler } from './compiler/BrowserTestCompiler';
import { ChromeLauncher, JsdomLauncher, AutoBrowserLauncher, BrowserLauncher } from './launcher/BrowserLauncher';
import { TestServer } from './server/TestServer';
import { BrowserTestRunner } from './runner/BrowserTestRunner';


@Module({
    providers: [
        BrowserCoverageCollector,
        KarmaReporter,
        KarmaCoverageReporter,
        { provide: UNIT_REPORTES, useExisting: KarmaReporter, multi: true },
        // Browser test infrastructure
        BrowserTestCompiler,
        TestServer,
        ChromeLauncher,
        JsdomLauncher,
        { provide: BrowserLauncher, useClass: AutoBrowserLauncher },
        BrowserTestRunner
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
