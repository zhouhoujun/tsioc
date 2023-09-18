import { Module, ProviderType, ModuleWithProviders } from '@tsdi/ioc';
import { ASSET_SERVR_PROVIDERS } from './asset.pdr';
import {
    Bodyparser, Content, Json, Session, 
    CorsMiddleware, CsrfMiddleware, HelmetMiddleware,
    ExecptionFinalizeFilter, ServerFinalizeFilter, RespondAdapter, ErrorRespondAdapter
} from './server';



@Module({
    providers: [
        ...ASSET_SERVR_PROVIDERS,

        Bodyparser,
        Content,
        Json,
        Session,

        CorsMiddleware,
        CsrfMiddleware,
        HelmetMiddleware,

        RespondAdapter,
        ErrorRespondAdapter,
        ServerFinalizeFilter,
        ExecptionFinalizeFilter
    ]
})
export class AssetEndpointModule {
    
    /**
     * import tcp micro service module with options.
     * @param options micro service module options.
     * @returns 
     */
    static withOptions(options: {
        providers: ProviderType[]
    }): ModuleWithProviders<AssetEndpointModule> {

        const providers: ProviderType[] = options.providers ?? [];

        return  {
            module: AssetEndpointModule,
            providers
        }
    }

}

