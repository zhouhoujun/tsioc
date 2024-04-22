import { Module } from '@tsdi/ioc';
import { PACKET_DECODE_INTERCEPTORS, PACKET_ENCODE_INTERCEPTORS, PackageifyDecodeInterceptor, PackageifyEncodeInterceptor, PacketCodingsHandlers } from './codings';
import { BindPacketIdEncodeInterceptor, PacketDecodeInterceptor, PacketEncodeInterceptor } from '../interceptors/buffer.packet';
import { PackageDecodeInterceptor, PackageEncodeInterceptor } from '../interceptors/buffer.package';
import { DefaultEncodingsHandler } from '../encodings';
import { DefaultDecodingsHandler } from '../decodings';
import { PacketIdGenerator, PacketNumberIdGenerator } from '../PacketId';



@Module({
    providers: [
        PacketCodingsHandlers,
        { provide: PacketIdGenerator, useClass: PacketNumberIdGenerator, asDefault: true },
        { provide: DefaultEncodingsHandler, useClass: PackageifyEncodeInterceptor, asDefault: true },
        { provide: DefaultDecodingsHandler, useClass: PackageifyDecodeInterceptor, asDefault: true }

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