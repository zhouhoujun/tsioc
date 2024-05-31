import { Module } from '@tsdi/ioc';
import { ENCODINGS_INTERCEPTORS, DECODINGS_INTERCEPTORS, CodingMappings } from '@tsdi/common/codings';
import { PacketCodingsHandlers } from './packet.codings';
import { BindPacketIdEncodeInterceptor, PacketDecodeInterceptor, PacketEncodeInterceptor } from './interceptors/buffer.packet';
import { PackageDecodeInterceptor, PackageEncodeInterceptor } from './interceptors/buffer.package';
import { PacketIdGenerator, PacketNumberIdGenerator } from './PacketId';
import { TransportDecodingsFactory, TransportEncodingsFactory } from './condings';




@Module({
    imports: [
        CodingMappings
    ],
    providers: [
        TransportEncodingsFactory,
        TransportDecodingsFactory,
        PacketCodingsHandlers,
        { provide: PacketIdGenerator, useClass: PacketNumberIdGenerator },
        { provide: DECODINGS_INTERCEPTORS, useClass: PacketDecodeInterceptor, multi: true },

        { provide: ENCODINGS_INTERCEPTORS, useClass: BindPacketIdEncodeInterceptor, multi: true },
        { provide: ENCODINGS_INTERCEPTORS, useClass: PacketEncodeInterceptor, multi: true }
    ],
    exports: [
        CodingMappings
    ]
})
export class TransportPacketModule {

}

@Module({
    providers: [
        { provide: DECODINGS_INTERCEPTORS, useClass: PackageDecodeInterceptor, multi: true },
        { provide: ENCODINGS_INTERCEPTORS, useClass: PackageEncodeInterceptor, multi: true },
    ]
})
export class PackageBufferCodingsModule {

}


// @Module({
//     imports: [
//         // TypedCodingsModule,
//         BufferCodingsModule,
//         PackageBufferCodingsModule
//     ],
//     providers: [
//         { provide: ENCODINGS_INTERCEPTORS, useClass: PackageifyEncodeInterceptor, multi: true },
//         { provide: DECODINGS_INTERCEPTORS, useClass: PackageifyDecodeInterceptor, multi: true }
//     ]
// })
// export class PacketCodingsModule {

// }
