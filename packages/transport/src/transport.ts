import { Module, RouterModule, TransformModule, TransportClient, TransportServer } from '@tsdi/core';
import { ModuleWithProviders, ProviderType } from '@tsdi/ioc';
import { ProtocolClient } from './client/client';
import { ProtocolServerOpts } from './server/options';
import { ProtocolServer } from './server/server';
import { ASSET_SERVR_PROVIDERS } from './asset.pdr';
import { CatchInterceptor, DefaultStatusFormater, LogInterceptor, RespondInterceptor } from './interceptors';
import { BodyparserMiddleware, ContentMiddleware, CorsMiddleware, CsrfMiddleware, EncodeJsonMiddleware, HelmetMiddleware, SessionMiddleware } from './middlewares';

@Module({
    imports: [
        TransformModule,
        RouterModule
    ],
    providers: [
        ...ASSET_SERVR_PROVIDERS,
        CatchInterceptor,
        DefaultStatusFormater,
        LogInterceptor,
        RespondInterceptor,

        BodyparserMiddleware,
        ContentMiddleware,
        CorsMiddleware,
        CsrfMiddleware,
        HelmetMiddleware,
        EncodeJsonMiddleware,
        SessionMiddleware,

        ProtocolClient,
        ProtocolServer,
        { provide: TransportClient, useClass: ProtocolClient },
        { provide: TransportServer, useClass: ProtocolServer }
    ]
})
export class TransportModule {

    /**
     * Tcp Server options.
     * @param options 
     * @returns 
     */
    static withOptions(options: ProtocolServerOpts): ModuleWithProviders<TransportModule> {
        const providers: ProviderType[] = [{ provide: ProtocolServerOpts, useValue: options }];
        return {
            module: TransportModule,
            providers
        }
    }
}
