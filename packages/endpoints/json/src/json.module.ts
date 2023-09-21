import { Module } from '@tsdi/ioc';
import { JsonEncoder, JsonEncoderBackend, JsonInterceptingEncoder } from './encoder';
import { JsonDecoder, JsonDecoderBackend, JsonInterceptingDecoder } from './decoder';
import { JsonSender } from './sender';
import { JsonReceiver } from './receiver';


@Module({
    providers: [
        JsonEncoderBackend,
        JsonInterceptingEncoder,

        JsonDecoderBackend,
        JsonInterceptingDecoder,

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
