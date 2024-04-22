import { Module } from '@tsdi/ioc';
import { JSON_DECODE_INTERCEPTORS, JSON_ENCODE_INTERCEPTORS, JsonCodingsHandlers, JsonifyDecodeInterceptor, JsonifyEncodeInterceptor } from './codings';
import { DefaultEncodingsHandler } from '../encodings';
import { DefaultDecodingsHandler } from '../decodings';
import { BindPacketIdEncodeInterceptor, PacketEncodeInterceptor, PacketDecodeInterceptor } from '../interceptors/buffer.packet';
import { PacketIdGenerator, PacketNumberIdGenerator } from '../PacketId';

@Module({
    providers: [
        JsonCodingsHandlers,
        { provide: PacketIdGenerator, useClass: PacketNumberIdGenerator, asDefault: true },
        { provide: DefaultEncodingsHandler, useClass: JsonifyEncodeInterceptor, asDefault: true },
        { provide: DefaultDecodingsHandler, useClass: JsonifyDecodeInterceptor, asDefault: true }
    ]
})
export class JsonCodingsModule {

}


@Module({
    providers: [
        { provide: JSON_DECODE_INTERCEPTORS, useClass: PacketDecodeInterceptor, multi: true },

        { provide: JSON_ENCODE_INTERCEPTORS, useClass: BindPacketIdEncodeInterceptor, multi: true },
        { provide: JSON_ENCODE_INTERCEPTORS, useClass: PacketEncodeInterceptor, multi: true }
    ]
})
export class JsonPacketCodingsModule {

}