import { Module } from '@tsdi/ioc';
import { CodingMappings } from '@tsdi/common/codings';
import { PacketCodingsHandlers } from './packet.codings';
import { BindPacketIdEncodeInterceptor, PacketDecodeInterceptor, PacketEncodeInterceptor } from './interceptors/buffer.packet';
import { PackageDecodeInterceptor, PackageEncodeInterceptor } from './interceptors/buffer.package';
import { PacketIdGenerator, PacketNumberIdGenerator } from './PacketId';
import { TRANSPORT_DECODINGS_INTERCEPTORS, TRANSPORT_ENCODINGS_INTERCEPTORS, TransportDecodingsFactory, TransportEncodingsFactory } from './condings';




@Module({
    imports: [
        CodingMappings
    ],
    providers: [
        TransportEncodingsFactory,
        TransportDecodingsFactory,
        PacketCodingsHandlers,
        { provide: PacketIdGenerator, useClass: PacketNumberIdGenerator },
        { provide: TRANSPORT_DECODINGS_INTERCEPTORS, useClass: PacketDecodeInterceptor, multi: true },

        { provide: TRANSPORT_ENCODINGS_INTERCEPTORS, useClass: BindPacketIdEncodeInterceptor, multi: true },
        { provide: TRANSPORT_ENCODINGS_INTERCEPTORS, useClass: PacketEncodeInterceptor, multi: true }
    ],
    exports: [
        CodingMappings
    ]
})
export class TransportPacketModule {

}

@Module({
    providers: [
        { provide: TRANSPORT_DECODINGS_INTERCEPTORS, useClass: PackageDecodeInterceptor, multi: true },
        { provide: TRANSPORT_ENCODINGS_INTERCEPTORS, useClass: PackageEncodeInterceptor, multi: true },
    ]
})
export class PackageBufferCodingsModule {

}

