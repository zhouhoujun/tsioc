import { CodingMappings } from '@tsdi/common/codings';
import { Module } from '@tsdi/ioc';
import { PacketIdGenerator, PacketNumberIdGenerator } from './PacketId';
import { TransportDecodingsFactory, TransportEncodingsFactory } from './condings';
import { PackageDecodeInterceptor, PackageEncodeInterceptor } from './interceptors/buffer.package';
import { BindPacketIdEncodeInterceptor, PacketDecodeInterceptor, PacketEncodeInterceptor } from './interceptors/buffer.packet';
import { PACKET_DECODE_INTERCEPTORS, PACKET_ENCODE_INTERCEPTORS, PacketCodingsHandlers } from './packet.codings';




@Module({
    imports: [
        CodingMappings
    ],
    providers: [
        TransportEncodingsFactory,
        TransportDecodingsFactory,
        PacketCodingsHandlers,
        { provide: PacketIdGenerator, useClass: PacketNumberIdGenerator },
        { provide: PACKET_DECODE_INTERCEPTORS, useClass: PacketDecodeInterceptor, multi: true },

        { provide: PACKET_ENCODE_INTERCEPTORS, useClass: BindPacketIdEncodeInterceptor, multi: true },
        { provide: PACKET_ENCODE_INTERCEPTORS, useClass: PacketEncodeInterceptor, multi: true }
    ],
    exports: [
        CodingMappings
    ]
})
export class TransportPacketModule {

}

@Module({
    providers: [
        { provide: PACKET_DECODE_INTERCEPTORS, useClass: PackageDecodeInterceptor, multi: true },
        { provide: PACKET_ENCODE_INTERCEPTORS, useClass: PackageEncodeInterceptor, multi: true },
    ]
})
export class PackageBufferCodingsModule {

}

