import { Module, ModuleWithProviders, ProvdierOf, Provider, toProvider } from '@tsdi/ioc';
import { SWAGGER_SETUP_OPTIONS, SwaggerSetupOptions } from './swagger.config';
import { SwaggerService } from './swagger.service';

export const SWAGGER_PROVIDERS: Provider[] = [
    SwaggerService
];

@Module({
    providedIn: 'root',
    providers: SWAGGER_PROVIDERS
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
            providers: createSwaggerOptionProviders(options)
        };
    }
}

/**
 * provide swagger module with options.
 * @param options 
 * @returns 
 */
function createSwaggerOptionProviders(options: ProvdierOf<SwaggerSetupOptions>): Provider[] {
    return [
        toProvider(SWAGGER_SETUP_OPTIONS, options)
    ];
}

export function provideSwagger(options: ProvdierOf<SwaggerSetupOptions>): Provider[] {
    return [
        ...SWAGGER_PROVIDERS,
        ...createSwaggerOptionProviders(options)
    ];
}
