import { Module, RouterModule, TransformModule } from '@tsdi/core';
import { ModuleWithProviders, ProviderType } from '@tsdi/ioc';
import { HttpServer } from './server/server';
import { Http } from './client/clinet';
import { HttpServerOpts, HTTP_SERVEROPTIONS } from './server/options';
import { TransportModule } from '../transport';
import { HttpBodyInterceptor } from './client/body';
import { HttpPathInterceptor } from './client/path';
import { HttpExecptionFilter, HttpFinalizeFilter } from './server/finalize-filter';
import { HttpStatus } from './status';
import { HttpRespondAdapter } from './server/respond';
import { HttpHandlerBinding } from './server/binding';

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
