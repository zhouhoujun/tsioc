import { Module } from '@tsdi/ioc';
import { HeaderAdapter, Packet } from '@tsdi/common';
import { CodingsModule, getDecodeInterceptorsToken, getEncodeInterceptorsToken } from '@tsdi/common/codings';
import { PacketIdGenerator, PacketNumberIdGenerator } from './PacketId';
import { TransportDecodingsFactory, TransportEncodingsFactory } from './condings';
import { PackageDecodeInterceptor, PackageEncodeInterceptor } from './interceptors/buffer.package';
import { BindPacketIdEncodeInterceptor, PacketDecodeInterceptor, PacketEncodeInterceptor } from './interceptors/buffer.packet';
import { PacketCodingsHandlers } from './packet.codings';
import { DefaultHeaderAdapter } from './headers';
import { Serialization } from './packet';


const PACKET_DECODE_INTERCEPTORS = getDecodeInterceptorsToken(Serialization);
const PACKET_ENCODE_INTERCEPTORS = getEncodeInterceptorsToken(Packet);

@Module({
    imports: [
        CodingsModule
    ],
    providers: [
        TransportEncodingsFactory,
        TransportDecodingsFactory,
        PacketCodingsHandlers,
        { provide: PacketIdGenerator, useClass: PacketNumberIdGenerator },
        { provide: HeaderAdapter, useClass: DefaultHeaderAdapter, asDefault: true },
        { provide: PACKET_DECODE_INTERCEPTORS, useClass: PacketDecodeInterceptor, multi: true },

        { provide: PACKET_ENCODE_INTERCEPTORS, useClass: BindPacketIdEncodeInterceptor, multi: true },
        { provide: PACKET_ENCODE_INTERCEPTORS, useClass: PacketEncodeInterceptor, multi: true }
    ],
    exports: [
        CodingsModule
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

