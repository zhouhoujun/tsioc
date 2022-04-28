import { MiddlewareSet, Module, RouterModule, TransformModule, TransportContextFactory } from '@tsdi/core';
import { ModuleWithProviders, ProviderType } from '@tsdi/ioc';
import { Http } from './clinet';
import { HttpContextFactory } from './context';
import { HttpServer, HttpMiddlewareSet, HttpServerOptions, HTTP_SERVEROPTIONS } from './server';

@Module({
    imports: [
        TransformModule,
        RouterModule
    ],
    providers: [
        { provide: TransportContextFactory, useClass: HttpContextFactory },
        { provide: MiddlewareSet, useClass: HttpMiddlewareSet },
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


