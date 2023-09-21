import { Module } from '@tsdi/ioc';
import { JsonEncoder, SimpleJsonEncoderBackend, JsonInterceptingEncoder, JsonEncoderBackend } from './encoder';
import { JsonDecoder, SimpleJsonDecoderBackend, JsonInterceptingDecoder, JsonDecoderBackend } from './decoder';
import { JsonSender } from './sender';
import { JsonReceiver } from './receiver';


@Module({
    providers: [
        SimpleJsonEncoderBackend,
        JsonInterceptingEncoder,
        { provide: JsonEncoderBackend, useExisting: SimpleJsonEncoderBackend, asDefault: true },

        SimpleJsonDecoderBackend,
        JsonInterceptingDecoder,
        { provide: JsonDecoderBackend, useExisting: SimpleJsonDecoderBackend, asDefault: true },

        { provide: JsonEncoder, useExisting: JsonInterceptingEncoder },
        { provide: JsonDecoder, useExisting: JsonInterceptingDecoder },
        JsonReceiver,
        JsonSender,
    ]
})
export class JsonEndpointModule {

    static withOptions() {

    }

}
