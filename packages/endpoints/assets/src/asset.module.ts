import { Module, ProviderType, ModuleWithProviders } from '@tsdi/ioc';
import { ExecptionFinalizeFilter, FinalizeFilter } from '@tsdi/endpoints';
import { ASSET_SERVR_PROVIDERS } from './asset.pdr';
import {
    Bodyparser, Content, Json, Session, 
    CorsMiddleware, CsrfMiddleware, HelmetMiddleware,
    RespondAdapter, ErrorRespondAdapter
} from './interceptors';



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
        FinalizeFilter,
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

