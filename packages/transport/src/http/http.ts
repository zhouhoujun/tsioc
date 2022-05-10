import { Module, RouterModule, TransformModule } from '@tsdi/core';
import { ModuleWithProviders, ProviderType } from '@tsdi/ioc';
import { BasicMimeDb, MimeDb } from '../mime';
import { Http } from './clinet';
import { HTTP_EXECPTION_FILTERS } from './filter';
import { HttpFinalizeFilter } from './finalize-filter';
import { HttpServer, HttpServerOptions, HTTP_SERVEROPTIONS } from './server';

@Module({
    imports: [
        TransformModule,
        RouterModule
    ],
    providers: [
        { provide: HTTP_EXECPTION_FILTERS, useClass: HttpFinalizeFilter, multi: true },
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
