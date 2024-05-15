import { Module } from '@tsdi/ioc';
import { PackageifyDecodeInterceptor, PackageifyEncodeInterceptor, PacketCodingsHandlers } from './packet.codings';
import { BindPacketIdEncodeInterceptor, PacketDecodeInterceptor, PacketEncodeInterceptor } from './interceptors/buffer.packet';
import { PackageDecodeInterceptor, PackageEncodeInterceptor } from './interceptors/buffer.package';
import { TypedDecodeInterceper, TypedEncodeInterceper } from './interceptors/typed';
import { ENCODINGS_INTERCEPTORS } from './encodings';
import { DECODINGS_INTERCEPTORS } from './decodings';


@Module({
    providers: [
        { provide: DECODINGS_INTERCEPTORS, useClass: TypedDecodeInterceper, multi: true },
        { provide: ENCODINGS_INTERCEPTORS, useClass: TypedEncodeInterceper, multi: true },
    ]
})
export class TypedCodingsModule {

}


@Module({
    providers: [
        { provide: DECODINGS_INTERCEPTORS, useClass: PacketDecodeInterceptor, multi: true },

        { provide: ENCODINGS_INTERCEPTORS, useClass: BindPacketIdEncodeInterceptor, multi: true },
        { provide: ENCODINGS_INTERCEPTORS, useClass: PacketEncodeInterceptor, multi: true }
    ]
})
export class BufferCodingsModule {

}

@Module({
    providers: [
        { provide: DECODINGS_INTERCEPTORS, useClass: PackageDecodeInterceptor, multi: true },
        { provide: ENCODINGS_INTERCEPTORS, useClass: PackageEncodeInterceptor, multi: true },
    ]
})
export class PackageBufferCodingsModule {

}


@Module({
    imports: [
        TypedCodingsModule,
        BufferCodingsModule,
        PackageBufferCodingsModule
    ],
    providers: [
        PacketCodingsHandlers,
        { provide: ENCODINGS_INTERCEPTORS, useClass: PackageifyEncodeInterceptor, multi: true },
        { provide: DECODINGS_INTERCEPTORS, useClass: PackageifyDecodeInterceptor, multi: true }
    ]
})
export class PacketCodingsModule {

}
