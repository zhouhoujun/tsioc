import { Module, ProviderType, ModuleWithProviders } from '@tsdi/ioc';
import { EndpointModule } from '@tsdi/endpoints';
import { ASSET_SERVR_PROVIDERS } from './asset.pdr';
import {
    Bodyparser, Content, Json, Session,
    CorsMiddleware, CsrfMiddleware, HelmetMiddleware
} from './interceptors';



@Module({
    imports: [
        EndpointModule
    ],
    providers: [
        ...ASSET_SERVR_PROVIDERS,

        Bodyparser,
        Content,
        Json,
        Session,

        CorsMiddleware,
        CsrfMiddleware,
        HelmetMiddleware,

        // RespondAdapter,
        // ErrorRespondAdapter
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

        return {
            module: AssetEndpointModule,
            providers
        }
    }

}

