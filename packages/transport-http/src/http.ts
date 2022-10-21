import { Module, RouterModule, StatusFactory, TransformModule } from '@tsdi/core';
import { ModuleWithProviders, ProviderType } from '@tsdi/ioc';
import { HttpServer } from './server/server';
import { Http } from './client/clinet';
import { HttpBodyInterceptor } from './client/body';
import { HttpPathInterceptor } from './client/path';
import { HttpServerOpts, HTTP_SERVEROPTIONS } from './server/options';
import { TransportModule } from '@tsdi/transport';
import { HttpBackend2 } from './client/backend';
import { HttpExecptionFilter, HttpFinalizeFilter } from './server/finalize-filter';
import { HttpStatusFactory, HttpTransportStrategy } from './transport';
import { HttpHandlerBinding } from './server/binding';
import { HttpInterceptorFinalizeFilter } from './server/respond';

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
        HttpTransportStrategy,
        HttpBodyInterceptor,
        HttpPathInterceptor,
        HttpFinalizeFilter,
        HttpExecptionFilter,
        HttpBackend2,
        HttpInterceptorFinalizeFilter,
        HttpHandlerBinding,
        { provide: StatusFactory, useClass: HttpStatusFactory },
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
