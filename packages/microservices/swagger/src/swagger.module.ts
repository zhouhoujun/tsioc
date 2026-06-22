import { Module, ModuleWithProviders, ProvdierOf, Provider, toProvider } from '@tsdi/ioc';
import { SWAGGER_SETUP_OPTIONS, SwaggerSetupOptions } from './swagger.config';
import { SwaggerService } from './swagger.service';

@Module({
    providedIn: 'root',
    providers: [
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
        return {
            module: SwaggerModule,
            providers: provideSwagger(options)
        };
    }
}

/**
 * provide swagger module with options.
 * @param options 
 * @returns 
 */
export function provideSwagger(options: ProvdierOf<SwaggerSetupOptions>): Provider[] {
    return [
        SwaggerService,
        toProvider(SWAGGER_SETUP_OPTIONS, options)
    ];
}
