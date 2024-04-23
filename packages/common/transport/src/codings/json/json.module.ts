import { Module } from '@tsdi/ioc';
import { JSON_DECODE_INTERCEPTORS, JSON_ENCODE_INTERCEPTORS } from './codings';
import { BindPacketIdEncodeInterceptor, PacketEncodeInterceptor, PacketDecodeInterceptor } from '../interceptors/buffer.packet';


@Module({
    providers: [
        { provide: JSON_DECODE_INTERCEPTORS, useClass: PacketDecodeInterceptor, multi: true },

        { provide: JSON_ENCODE_INTERCEPTORS, useClass: BindPacketIdEncodeInterceptor, multi: true },
        { provide: JSON_ENCODE_INTERCEPTORS, useClass: PacketEncodeInterceptor, multi: true }
    ]
})
export class JsonPacketCodingsModule {

}