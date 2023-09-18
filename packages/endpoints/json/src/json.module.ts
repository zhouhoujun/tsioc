import { Module } from '@tsdi/ioc';
import { Encoder, Decoder } from '@tsdi/common/client';
import { JsonEncoder } from './encoder';
import { JsonDecoder } from './decoder';


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
