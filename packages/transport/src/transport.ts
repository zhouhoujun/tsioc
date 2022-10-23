import { Module, RouterModule, TransformModule, Client, Server } from '@tsdi/core';
import { ModuleWithProviders, ProviderType } from '@tsdi/ioc';
import { TransportBackend } from './client/backend';
import { TransportClient } from './client/client';
import { BodyContentInterceptor } from './client/body';
import { TransportServerOpts } from './server/options';
import { TransportServer } from './server/server';
import { ASSET_SERVR_PROVIDERS } from './asset.pdr';
import { DefaultStatusFormater, LogInterceptor } from './interceptors';
import { BodyparserMiddleware, ContentMiddleware, CorsMiddleware, CsrfMiddleware, EncodeJsonMiddleware, HelmetMiddleware, SessionMiddleware } from './middlewares';
import { ExecptionFinalizeFilter } from './server/finalize-filter';
import { ServerInterceptorFinalizeFilter } from './server/respond';


@Module({
    imports: [
        TransformModule,
        RouterModule
    ],
    providers: [
        ...ASSET_SERVR_PROVIDERS,
        DefaultStatusFormater,
        LogInterceptor,

        TransportBackend,
        BodyContentInterceptor,


        BodyparserMiddleware,
        ContentMiddleware,
        CorsMiddleware,
        CsrfMiddleware,
        HelmetMiddleware,
        EncodeJsonMiddleware,
        SessionMiddleware,

        ServerInterceptorFinalizeFilter,
        ExecptionFinalizeFilter,
        
        { provide: Client, useExisting: TransportClient },
        { provide: Server, useExisting: TransportServer }
    ]
})
export class TransportModule {

    /**
     * Tcp Server options.
     * @param options 
     * @returns 
     */
    static withOptions(options: TransportServerOpts): ModuleWithProviders<TransportModule> {
        const providers: ProviderType[] = [{ provide: TransportServerOpts, useValue: options }];
        return {
            module: TransportModule,
            providers
        }
    }
}
