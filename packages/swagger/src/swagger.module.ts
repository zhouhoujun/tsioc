import { Module, ModuleWithProviders, ProvdierOf, ProviderType, toProvider } from '@tsdi/ioc';
import { SWAGGER_SETUP_OPTIONS, SwaggerSetupOptions } from './swagger.json';
import { SwaggerService } from './swagger.service';

@Module({
    providers: [
        // SwaggerJson,
        SwaggerService
    ]
})
export class SwaggerModule {

    static withOptions(options: ProvdierOf<SwaggerSetupOptions>): ModuleWithProviders<SwaggerModule> {

        const providers: ProviderType[] = [
            toProvider(SWAGGER_SETUP_OPTIONS, options)
        ];

        return {
            providers,
            module: SwaggerModule
        }
    }
}
