import { Module } from '@tsdi/ioc';
import { EmptyJsonDecodeInterceptor, JSON_DECODE_INTERCEPTORS, JsonDecodeHandler, JsonDecodeInterceptingHandler, JsonDecoder } from './json.decodings';
import { AysncJsonEncodeInterceptor, JSON_ENCODE_INTERCEPTORS, JsonEncodeHandler, JsonEncodeInterceptingHandler, JsonEncoder } from './json.encodings';
import { DefaultEncodingsHandler } from '../encodings';
import { DefaultDecodingsHandler } from '../decodings';

@Module({
    providers: [
        { provide: JSON_ENCODE_INTERCEPTORS, useClass: AysncJsonEncodeInterceptor, multi: true },
        { provide: JsonEncodeHandler, useClass: JsonEncodeInterceptingHandler },
        { provide: DefaultEncodingsHandler, useExisting: JsonEncodeHandler, asDefault: true },
        JsonEncoder,

        { provide: JSON_DECODE_INTERCEPTORS, useClass: EmptyJsonDecodeInterceptor, multi: true },
        { provide: JsonDecodeHandler, useClass: JsonDecodeInterceptingHandler },
        { provide: DefaultDecodingsHandler, useExisting: JsonDecodeHandler, asDefault: true },
        JsonDecoder,
    ]
})
export class JsonCodingsModule {

}