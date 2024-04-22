import { Module } from '@tsdi/ioc';
import { JsonCodingsHandlers, JsonifyDecodeInterceptor, JsonifyEncodeInterceptor } from './codings';
import { DefaultEncodingsHandler } from '../encodings';
import { DefaultDecodingsHandler } from '../decodings';

@Module({
    providers: [
        JsonCodingsHandlers,
        { provide: DefaultEncodingsHandler, useClass: JsonifyEncodeInterceptor, asDefault: true },
        { provide: DefaultDecodingsHandler, useClass: JsonifyDecodeInterceptor, asDefault: true }

    ]
})
export class JsonCodingsModule {

}