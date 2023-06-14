import { RouterModule, TransformModule } from '@tsdi/core';
import { Module, ProviderType, ModuleWithProviders } from '@tsdi/ioc';
import { BodyContentInterceptor } from './client/body';
import { ASSET_SERVR_PROVIDERS } from './asset.pdr';
import { LogInterceptor } from './logger';
import {
    Bodyparser, Content, Json, Session, 
    CorsMiddleware, CsrfMiddleware, HelmetMiddleware,
    ExecptionFinalizeFilter, ServerFinalizeFilter, RespondAdapter, ErrorRespondAdapter
} from './server';
import { StreamTransportBackend, TransportBackend } from './client/backend';



@Module({
    imports: [
        TransformModule,
        RouterModule
    ],
    providers: [
        ...ASSET_SERVR_PROVIDERS,
        // TransportBackend,
        // StreamTransportBackend,
        // BodyContentInterceptor,

        // LogInterceptor,

        // Bodyparser,
        // Content,
        // Json,
        // Session,

        // CorsMiddleware,
        // CsrfMiddleware,
        // HelmetMiddleware,

        RespondAdapter,
        ErrorRespondAdapter,
        ServerFinalizeFilter,
        ExecptionFinalizeFilter
    ]
})
export class TransportModule {
    
    /**
     * import tcp micro service module with options.
     * @param options micro service module options.
     * @returns 
     */
    static withOptions(options: {
        providers: ProviderType[]
    }): ModuleWithProviders<TransportModule> {

        const providers: ProviderType[] = options.providers ?? [];

        return  {
            module: TransportModule,
            providers
        }
    }

}

