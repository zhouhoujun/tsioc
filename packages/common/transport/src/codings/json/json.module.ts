import { Module } from '@tsdi/ioc';
// import { JSON_DECODE_INTERCEPTORS, JSON_ENCODE_INTERCEPTORS } from './codings';
import { BindPacketIdEncodeInterceptor, PacketEncodeInterceptor, PacketDecodeInterceptor } from '../interceptors/buffer.packet';
import { BUFFER_DECODE_INTERCEPTORS } from '../decodings';
import { BUFFER_ENCODE_INTERCEPTORS } from '../encodings';


@Module({
    providers: [
        { provide: BUFFER_DECODE_INTERCEPTORS, useClass: PacketDecodeInterceptor, multi: true },

        { provide: BUFFER_ENCODE_INTERCEPTORS, useClass: BindPacketIdEncodeInterceptor, multi: true },
        { provide: BUFFER_ENCODE_INTERCEPTORS, useClass: PacketEncodeInterceptor, multi: true }
    ]
})
export class JsonPacketCodingsModule {

}