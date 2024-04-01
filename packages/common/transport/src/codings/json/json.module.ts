import { Module } from '@tsdi/ioc';
import { EmptyJsonDecodeInterceptor, JSON_DECODE_INTERCEPTORS, JsonDecodeHandler, JsonDecodeInterceptingHandler, JsonDecoder } from './json.decodings';
import { AysncJsonEncodeInterceptor, JSON_ENCODE_INTERCEPTORS, JsonEncodeHandler, JsonEncodeInterceptingHandler, JsonEncoder } from './json.encodings';

@Module({
    providers: [
        { provide: JSON_ENCODE_INTERCEPTORS, useClass: AysncJsonEncodeInterceptor, multi: true },
        { provide: JsonEncodeHandler, useClass: JsonEncodeInterceptingHandler },
        JsonEncoder,

        { provide: JSON_DECODE_INTERCEPTORS, useClass: EmptyJsonDecodeInterceptor, multi: true },
        { provide: JsonDecodeHandler, useClass: JsonDecodeInterceptingHandler },
        JsonDecoder,
    ]
})
export class JsonCodingsModule {

}