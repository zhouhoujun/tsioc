import { Module } from '@tsdi/ioc';
import { PACKET_DECODE_INTERCEPTORS, PACKET_ENCODE_INTERCEPTORS, PackageifyDecodeInterceptor, PackageifyEncodeInterceptor, PacketCodingsHandlers } from './codings';
import { BindPacketIdEncodeInterceptor, PacketDecodeInterceptor, PacketEncodeInterceptor } from '../interceptors/buffer.packet';
import { PackageDecodeInterceptor, PackageEncodeInterceptor } from '../interceptors/buffer.package';
// import { ENCODINGS_INTERCEPTORS } from '../encodings';
// import { DECODINGS_INTERCEPTORS } from '../decodings';
// import { CodingsModule } from '../codings.module';
import { JSON_DECODE_INTERCEPTORS, JSON_ENCODE_INTERCEPTORS } from '../json/codings';
// import { DefaultEncodingsHandler } from '../encodings';
// import { DefaultDecodingsHandler } from '../decodings';




@Module({
    providers: [
        PacketCodingsHandlers,
        { provide: JSON_ENCODE_INTERCEPTORS, useClass: PackageifyEncodeInterceptor, multi: true, multiOrder: 0 },
        { provide: JSON_DECODE_INTERCEPTORS, useClass: PackageifyDecodeInterceptor, multi: true, multiOrder: 0 }
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