import { Module, ProviderType, ModuleWithProviders } from '@tsdi/ioc';
import { Responder } from '@tsdi/endpoints';
import { ASSET_ENDPOINT_PROVIDERS } from './asset.pdr';





@Module({
    providers: [
        ...ASSET_ENDPOINT_PROVIDERS,
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

