import { Module } from '@tsdi/ioc';
import { JsonEncoder } from './encoder';
import { JsonDecoder } from './decoder';
import { Encoder, Decoder } from '@tsdi/common/client';


@Module({
    providers: [
        JsonEncoder,
        JsonDecoder,
        { provide: Encoder, useExisting: JsonEncoder },
        { provide: Decoder, useExisting: JsonDecoder }
    ]
})
export class JsonEndpointModule {

}
