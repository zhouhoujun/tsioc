import { Module, ModuleWithProviders, ProvdierOf, Provider, toProvider } from '@tsdi/ioc';
import { SWAGGER_SETUP_OPTIONS, SwaggerSetupOptions } from './swagger.config';
import { SwaggerService } from './swagger.service';

@Module({
    declarations: [
        // SwaggerJson,
        SwaggerService
    ]
})
export class SwaggerModule {

    /**
     * provide swagger module with options.
     * @param options 
     * @returns 
     */
    static withOptions(options: ProvdierOf<SwaggerSetupOptions>): ModuleWithProviders<SwaggerModule> {
        return provideSwagger(options);
    }
}

/**
 * provide swagger module with options.
 * @param options 
 * @returns 
 */
export function provideSwagger(options: ProvdierOf<SwaggerSetupOptions>): ModuleWithProviders<SwaggerModule> {

    const providers: Provider[] = [
        toProvider(SWAGGER_SETUP_OPTIONS, options)
    ];

    return {
        providers,
        module: SwaggerModule
    }
}