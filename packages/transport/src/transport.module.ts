import { RouterModule, TransformModule } from '@tsdi/core';
import { Module, ModuleWithProviders, ProviderType } from '@tsdi/ioc';
import { BodyContentInterceptor } from './client/body';
import { TransportServerOpts } from './server/options';
import { ASSET_SERVR_PROVIDERS } from './asset.pdr';
import { LogInterceptor } from './interceptors';
import {
    BodyparserMiddleware, ContentMiddleware, CorsMiddleware, CsrfMiddleware,
    EncodeJsonMiddleware, HelmetMiddleware, SessionMiddleware
} from './middlewares';
import { ExecptionFinalizeFilter } from './server/execption-filter';
import { ServerFinalizeFilter } from './server/filter';


@Module({
    imports: [
        TransformModule,
        RouterModule
    ],
    providers: [
        ...ASSET_SERVR_PROVIDERS,
        LogInterceptor,

        BodyContentInterceptor,

        BodyparserMiddleware,
        ContentMiddleware,
        CorsMiddleware,
        CsrfMiddleware,
        HelmetMiddleware,
        EncodeJsonMiddleware,
        SessionMiddleware,

        ServerFinalizeFilter,
        ExecptionFinalizeFilter
    ]
})
export class TransportModule {

    /**
     * Tcp Server options.
     * @param options 
     * @returns 
     */
    static withOptions(options: TransportServerOpts): ModuleWithProviders<TransportModule> {
        const providers: ProviderType[] = [{ provide: TransportServerOpts, useValue: options }];
        return {
            module: TransportModule,
            providers
        }
    }
}
