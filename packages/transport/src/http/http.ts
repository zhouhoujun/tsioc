import { Module, RouterModule, TransformModule } from '@tsdi/core';
import { ModuleWithProviders, ProviderType } from '@tsdi/ioc';
import { BasicMimeDb, MimeDb } from '../mime';
import { ArgumentErrorFilter, HttpFinalizeFilter } from './server/finalize-filter';
import { HttpServer, HttpServerOptions, HTTP_EXECPTION_FILTERS, HTTP_SERVEROPTIONS } from './server/server';
import { Http } from './client/clinet';

/**
 * http module.
 */
@Module({
    imports: [
        TransformModule,
        RouterModule
    ],
    providers: [
        { provide: HTTP_EXECPTION_FILTERS, useClass: HttpFinalizeFilter, multi: true },
        { provide: HTTP_EXECPTION_FILTERS, useClass: ArgumentErrorFilter, multi: true },
        { provide: MimeDb, useClass: BasicMimeDb, asDefault: true },

        HttpServer,
        Http
    ]
})
export class HttpModule {

    static withOption(option: HttpServerOptions): ModuleWithProviders<HttpModule> {
        const providers: ProviderType[] = [{ provide: HTTP_SERVEROPTIONS, useValue: option }];
        return {
            module: HttpModule,
            providers
        }
    }
}
