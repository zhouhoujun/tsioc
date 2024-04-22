import { Module } from '@tsdi/ioc';
import { PACKET_DECODE_INTERCEPTORS, PACKET_ENCODE_INTERCEPTORS, PacketCodingsHandlers } from './codings';
import { ConcatPacketDecodeInterceptor } from './packet.decodings';
import { AysncPacketEncodeInterceptor, BindPacketIdEncodeInterceptor, LargePayloadEncodeInterceptor, SerializeHeaderEncodeInterceptor, SerializePayloadEncodeInterceptor } from './packet.encodings';



@Module({
    providers:[
        PacketCodingsHandlers,
        { provide: PACKET_DECODE_INTERCEPTORS, useClass: ConcatPacketDecodeInterceptor, multi: true },

        { provide: PACKET_ENCODE_INTERCEPTORS, useClass: AysncPacketEncodeInterceptor, multi: true },
        { provide: PACKET_ENCODE_INTERCEPTORS, useClass: BindPacketIdEncodeInterceptor, multi: true },
        { provide: PACKET_ENCODE_INTERCEPTORS, useClass: SerializePayloadEncodeInterceptor, multi: true },
        { provide: PACKET_ENCODE_INTERCEPTORS, useClass: SerializeHeaderEncodeInterceptor, multi: true },
        { provide: PACKET_ENCODE_INTERCEPTORS, useClass: LargePayloadEncodeInterceptor, multi: true },
    ]
})
export class PacketCodingsModule {

}