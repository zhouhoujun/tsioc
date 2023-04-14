import { RouterModule, TransformModule } from '@tsdi/core';
import { Module, ModuleWithProviders, ProviderType } from '@tsdi/ioc';
import { HttpServer } from './server/server';
import { Http } from './client/clinet';
import { HttpPathInterceptor } from './client/path';
import { HttpServerOpts, HTTP_SERVEROPTIONS } from './server/options';
import { TransportModule } from '@tsdi/transport';
import { HttpExecptionHandlers } from './server/exception-filter';
// import { HttpBodyInterceptor } from './client/body';
// import { HttpBackend2 } from './client/backend';
// import { HttpFinalizeFilter } from './server/filter';
import { HttpStatusVaildator } from './status';
import { HttpRequestAdapter } from './client/request';

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
        HttpStatusVaildator,
        HttpRequestAdapter,

        // HttpBodyInterceptor,
        HttpPathInterceptor,
        // HttpExecptionFinalizeFilter,
        HttpExecptionHandlers,
        // HttpBackend2,
        // HttpFinalizeFilter,
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
