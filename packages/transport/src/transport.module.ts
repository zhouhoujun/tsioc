import { RouterModule, TransformModule } from '@tsdi/core';
import { Module } from '@tsdi/ioc';
import { BodyContentInterceptor } from './client/body';
import { ASSET_SERVR_PROVIDERS } from './asset.pdr';
import { LogInterceptor } from './interceptors';
import {
    BodyparserMiddleware, ContentMiddleware, CorsMiddleware, CsrfMiddleware,
    EncodeJsonMiddleware, HelmetMiddleware, SessionMiddleware
} from './middlewares';
import { ExecptionFinalizeFilter } from './server/execption-filter';
import { ServerFinalizeFilter } from './server/filter';
import { TransportBackend } from './client';


@Module({
    imports: [
        TransformModule,
        RouterModule
    ],
    providers: [
        ...ASSET_SERVR_PROVIDERS,
        TransportBackend,
        BodyContentInterceptor,

        LogInterceptor,
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

}
