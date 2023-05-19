import { Module, ModuleWithProviders, ProvdierOf, ProviderType, toProvider } from '@tsdi/ioc';
import { SWAGGER_SETUP_OPTIONS, SwaggerJson, SwaggerSetupOptions } from './swagger.json';
import { SwaggerService } from './swagger.service';

@Module({
    providers: [
        SwaggerJson,
        SwaggerService
    ]
})
export class SwaggerModuel {

    static withOptions(options: ProvdierOf<SwaggerSetupOptions>): ModuleWithProviders<SwaggerModuel> {

        const providers: ProviderType[] = [
            toProvider(SWAGGER_SETUP_OPTIONS, options)
        ];
        
        return {
            providers,
            module: SwaggerModuel
        }
    }
}
