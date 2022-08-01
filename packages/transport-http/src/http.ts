import { Module, RouterModule, TransformModule } from '@tsdi/core';
import { ModuleWithProviders, ProviderType } from '@tsdi/ioc';
import { HttpServer } from './server/server';
import { Http } from './client/clinet';
import { HttpBodyInterceptor } from './client/body';
import { HttpPathInterceptor } from './client/path';
import { HttpServerOpts, HTTP_SERVEROPTIONS } from './server/options';
import { TransportModule } from '@tsdi/transport';
import { HttpBackend2 } from './client/backend';
import { HttpExecptionFilter, HttpFinalizeFilter } from './server/finalize-filter';
import { HttpStatus } from './status';
import { HttpRespondAdapter } from './server/respond';
import { HttpHandlerBinding } from './server/binding';
import { HttpProtocol } from './protocol';

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
        HttpFinalizeFilter,
        HttpExecptionFilter,
        HttpStatus,
        HttpBackend2,
        HttpProtocol,
        HttpRespondAdapter,
        HttpHandlerBinding,

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