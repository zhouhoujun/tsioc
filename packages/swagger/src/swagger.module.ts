import { Module, ModuleWithProviders, ProviderType } from '@tsdi/ioc';
import { SwaggerJson } from './swagger.json';

@Module({

    
    providers: [
        SwaggerJson
    ]
})
export class SwaggerModuel {

    static withOptions(options: {
        title: string;
        description?: string;
        version?: string;
        /**
         * document api prefix.
         */
        prefix?: string;
    }): ModuleWithProviders<SwaggerModuel> {

        const providers: ProviderType[] = []
        return {
            providers,
            module: SwaggerModuel
        }
    }
}
