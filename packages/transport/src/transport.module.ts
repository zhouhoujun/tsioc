import { RouterModule, TransformModule } from '@tsdi/core';
import { Module } from '@tsdi/ioc';
import { BodyContentInterceptor } from './client/body';
import { StreamTransportBackend, TransportBackend } from './client/backend';
import { ASSET_SERVR_PROVIDERS } from './asset.pdr';
import { LogInterceptor } from './logger';
import {
    Bodyparser, StaticContent, Json, Session, 
    CorsMiddleware, CsrfMiddleware, HelmetMiddleware,
    ExecptionFinalizeFilter, ServerFinalizeFilter, RespondAdapter, ErrorRespondAdapter
} from './server';



@Module({
    imports: [
        TransformModule,
        RouterModule
    ],
    providers: [
        ...ASSET_SERVR_PROVIDERS,
        TransportBackend,
        StreamTransportBackend,
        BodyContentInterceptor,

        LogInterceptor,

        Bodyparser,
        StaticContent,
        Json,
        Session,

        CorsMiddleware,
        CsrfMiddleware,
        HelmetMiddleware,

        RespondAdapter,
        ErrorRespondAdapter,
        ServerFinalizeFilter,
        ExecptionFinalizeFilter
    ]
})
export class TransportModule {

}
