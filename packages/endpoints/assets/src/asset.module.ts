import { Module } from '@tsdi/ioc';
import { StatusVaildator } from '@tsdi/common';
import { GLOBAL_CLIENT_INTERCEPTORS } from '@tsdi/common/client';
import { AssetContextFactory, RequestHandler } from '@tsdi/endpoints';
import { ASSET_ENDPOINT_PROVIDERS } from './asset.pdr';
import { HttpStatusVaildator } from './impl/status';
import { AssetRequestHandler } from './handler';
import { InterceptorsModule } from './interceptors.module';
import { AssetContextFactoryImpl } from './impl/context';
import { BodyContentInterceptor } from './interceptors/body';



@Module({
    providers: [
        ...ASSET_ENDPOINT_PROVIDERS,
        HttpStatusVaildator
    ]
})
export class AssetModule {

}


@Module({
    imports: [
        AssetModule
    ],
    providers: [
        BodyContentInterceptor,
        { provide: GLOBAL_CLIENT_INTERCEPTORS, useExisting: BodyContentInterceptor, multi: true },
        
        AssetContextFactoryImpl,
        { provide: AssetContextFactory, useExisting: AssetContextFactoryImpl, asDefault: true },

        AssetRequestHandler,
        { provide: RequestHandler, useExisting: AssetRequestHandler, asDefault: true },

        { provide: StatusVaildator, useExisting: HttpStatusVaildator, asDefault: true }
    ],
    exports: [
        AssetModule,
        InterceptorsModule
    ]
})
export class AssetTransportModule {

}

