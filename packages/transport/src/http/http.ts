import { ExecptionFilter, Module, RouterModule, TransformModule } from '@tsdi/core';
import { ModuleWithProviders, ProviderType } from '@tsdi/ioc';
import { BasicMimeDb, MimeAdapter, MimeDb } from '../mime';
import { Negotiator } from '../negotiator';
import { Http } from './clinet';
import { HttpExecptionFilter, HTTP_EXECPTION_FILTERS } from './filter';
import { HttpFinalizeFilter } from './finalize-filter';
import { HttpMimeAdapter } from './mime';
import { HttpNegotiator } from './negotiator';
import { HttpServer, HttpServerOptions, HTTP_SERVEROPTIONS } from './server';

@Module({
    imports: [
        TransformModule,
        RouterModule
    ],
    providers: [
        { provide: ExecptionFilter, useClass: HttpExecptionFilter },
        { provide: MimeAdapter, useClass: HttpMimeAdapter },
        { provide: Negotiator, useClass: HttpNegotiator },
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


