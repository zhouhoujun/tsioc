import { Module } from '@tsdi/ioc';
import { MimeAdapter, MimeDb, MimeTypes } from '@tsdi/common';
import { TransportContextFactory } from '@tsdi/endpoints';
import { HttpstatusAdapter } from './impl/status';
import { AssetContextFactoryImpl } from './impl/context';
// import { BodyContentInterceptor } from './interceptors/body';
import { MimeTypesImpl, TrasportMimeAdapter } from './impl/mime';
import { BasicMimeDb } from './impl/mimedb';
import { Negotiator } from './Negotiator';
import { TransportNegotiator } from './impl/negotiator';



@Module({
    providers: [
        { provide: MimeTypes, useClass: MimeTypesImpl },
        { provide: MimeDb, useClass: BasicMimeDb },
        { provide: MimeAdapter, useClass: TrasportMimeAdapter },
        { provide: Negotiator, useClass: TransportNegotiator },

        // BodyContentInterceptor,
        HttpstatusAdapter,
        AssetContextFactoryImpl,
        { provide: TransportContextFactory, useExisting: AssetContextFactoryImpl }
    ]
})
export class AssetModule {

}

