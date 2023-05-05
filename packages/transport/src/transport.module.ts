import { RouterModule, TransformModule } from '@tsdi/core';
import { Module } from '@tsdi/ioc';
import { BodyContentInterceptor } from './client/body';
import { TransportBackend } from './client/backend';
import { ASSET_SERVR_PROVIDERS } from './asset.pdr';
import { LogInterceptor } from './logger';
import {
    BodyparserMiddleware, ContentMiddleware, CorsMiddleware, CsrfMiddleware,
    EncodeJsonMiddleware, HelmetMiddleware, SessionMiddleware
} from './middlewares';
import { ExecptionFinalizeFilter } from './server/execption-filter';
import { ServerFinalizeFilter } from './server/filter';
import { RespondAdapter } from './server/respond';
import { ErrorRespondAdapter } from './server/error.respond';


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

        RespondAdapter,
        ErrorRespondAdapter,
        ServerFinalizeFilter,
        ExecptionFinalizeFilter
    ]
})
export class TransportModule {

}
