import { Module, RouterModule, TransformModule, Client, Server } from '@tsdi/core';
import { ModuleWithProviders, ProviderType } from '@tsdi/ioc';
import { TransportBackend } from './client/backend';
import { NormlizePathInterceptor } from './client/path';
import { TransportClient } from './client/client';
import { DetectBodyInterceptor } from './client/body';
import { TransportServerOpts } from './server/options';
import { TransportServer } from './server/server';
import { ASSET_SERVR_PROVIDERS } from './asset.pdr';
import { CatchInterceptor, DefaultStatusFormater, LogInterceptor, RespondInterceptor } from './interceptors';
import { BodyparserMiddleware, ContentMiddleware, CorsMiddleware, CsrfMiddleware, EncodeJsonMiddleware, HelmetMiddleware, SessionMiddleware } from './middlewares';

import { ProtocolExecptionFilter, TransportFinalizeFilter } from './server/finalize-filter';


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
        
        TransportBackend,
        NormlizePathInterceptor,
        DetectBodyInterceptor,


        BodyparserMiddleware,
        ContentMiddleware,
        CorsMiddleware,
        CsrfMiddleware,
        HelmetMiddleware,
        EncodeJsonMiddleware,
        SessionMiddleware,

        TransportFinalizeFilter,
        ProtocolExecptionFilter,

        TransportClient,
        TransportServer,
        { provide: Client, useClass: TransportClient },
        { provide: Server, useClass: TransportServer }
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
