import { Module } from '@tsdi/ioc';
import { PackageifyDecodeInterceptor, PackageifyEncodeInterceptor, PacketCodingsHandlers } from './codings';
import { BindPacketIdEncodeInterceptor, PacketDecodeInterceptor, PacketEncodeInterceptor } from '../interceptors/buffer.packet';
import { PackageDecodeInterceptor, PackageEncodeInterceptor } from '../interceptors/buffer.package';
import { TypedDecodeInterceper, TypedEncodeInterceper } from '../interceptors/typed';
import { BUFFER_ENCODE_INTERCEPTORS } from '../encodings';
import { BUFFER_DECODE_INTERCEPTORS } from '../decodings';


@Module({
    providers: [
        { provide: BUFFER_DECODE_INTERCEPTORS, useClass: TypedDecodeInterceper, multi: true },
        { provide: BUFFER_ENCODE_INTERCEPTORS, useClass: TypedEncodeInterceper, multi: true },
    ]
})
export class TypedCodingsModule {

}


@Module({
    providers: [
        { provide: BUFFER_DECODE_INTERCEPTORS, useClass: PacketDecodeInterceptor, multi: true },

        { provide: BUFFER_ENCODE_INTERCEPTORS, useClass: BindPacketIdEncodeInterceptor, multi: true },
        { provide: BUFFER_ENCODE_INTERCEPTORS, useClass: PacketEncodeInterceptor, multi: true }
    ]
})
export class BufferCodingsModule {

}

@Module({
    providers: [
        { provide: BUFFER_DECODE_INTERCEPTORS, useClass: PackageDecodeInterceptor, multi: true },
        { provide: BUFFER_ENCODE_INTERCEPTORS, useClass: PackageEncodeInterceptor, multi: true },
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
        { provide: BUFFER_ENCODE_INTERCEPTORS, useClass: PackageifyEncodeInterceptor, multi: true },
        { provide: BUFFER_DECODE_INTERCEPTORS, useClass: PackageifyDecodeInterceptor, multi: true }
    ]
})
export class PacketCodingsModule {

}
