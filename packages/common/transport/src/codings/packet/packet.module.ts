import { Module } from '@tsdi/ioc';
import { PACKET_DECODE_INTERCEPTORS, PACKET_ENCODE_INTERCEPTORS, PackageifyDecodeInterceptor, PackageifyEncodeInterceptor, PacketCodingsHandlers } from './codings';
import { BindPacketIdEncodeInterceptor, PacketDecodeInterceptor, PacketEncodeInterceptor } from '../interceptors/buffer.packet';
import { PackageDecodeInterceptor, PackageEncodeInterceptor } from '../interceptors/buffer.package';
import { BUFFER_ENCODE_INTERCEPTORS } from '../encodings';
import { BUFFER_DECODE_INTERCEPTORS } from '../decodings';
// import { ENCODINGS_INTERCEPTORS } from '../encodings';
// import { DECODINGS_INTERCEPTORS } from '../decodings';
// import { JSON_DECODE_INTERCEPTORS, JSON_ENCODE_INTERCEPTORS } from '../json/codings';




@Module({
    providers: [
        PacketCodingsHandlers,
        { provide: BUFFER_ENCODE_INTERCEPTORS, useClass: PackageifyEncodeInterceptor, multi: true, multiOrder: 0 },
        { provide: BUFFER_DECODE_INTERCEPTORS, useClass: PackageifyDecodeInterceptor, multi: true, multiOrder: 0 }
    ]
})
export class PacketCodingsModule {

}




@Module({
    providers: [

        { provide: PACKET_DECODE_INTERCEPTORS, useClass: PacketDecodeInterceptor, multi: true },
        { provide: PACKET_DECODE_INTERCEPTORS, useClass: PackageDecodeInterceptor, multi: true },

        { provide: PACKET_ENCODE_INTERCEPTORS, useClass: BindPacketIdEncodeInterceptor, multi: true },
        { provide: PACKET_ENCODE_INTERCEPTORS, useClass: PacketEncodeInterceptor, multi: true },
        { provide: PACKET_ENCODE_INTERCEPTORS, useClass: PackageEncodeInterceptor, multi: true },

    ]
})
export class PackageCodingsModule {

}