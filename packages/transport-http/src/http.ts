import { Module, RouterModule, TransformModule } from '@tsdi/core';
import { ModuleWithProviders, ProviderType } from '@tsdi/ioc';
import { HttpServer } from './server/server';
import { Http } from './client/clinet';
import { HttpBodyInterceptor } from './client/body';
import { HttpPathInterceptor } from './client/path';
import { HttpServerOpts, HTTP_SERVEROPTIONS } from './server/options';
import { TransportModule } from '@tsdi/transport';
import { HttpBackend2 } from './client/backend';
import { HttpExecptionHandlers, HttpExecptionFinalizeFilter } from './server/exception-filter';
import { HttpFinalizeFilter } from './server/filter';
import { HttpStatusFactory } from './status';

/**
 * http module.
 */
@Module({
    imports: [
        TransformModule,
        RouterModule,
        TransportModule
    ],
    providers: [
        HttpBodyInterceptor,
        HttpPathInterceptor,
        HttpExecptionFinalizeFilter,
        HttpExecptionHandlers,
        HttpBackend2,
        HttpFinalizeFilter,
        HttpStatusFactory,
        HttpServer,
        Http
    ]
})
export class HttpModule {

    static withOption(option: HttpServerOpts): ModuleWithProviders<HttpModule> {
        const providers: ProviderType[] = [{ provide: HTTP_SERVEROPTIONS, useValue: option }];
        return {
            module: HttpModule,
            providers
        }
    }
}
