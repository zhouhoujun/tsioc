import { Module } from '@tsdi/ioc';
import { JsonEncoder } from './encoder';
import { JsonDecoder } from './decoder';
import { JsonSender } from './sender';
import { JsonReceiver } from './receiver';


@Module({
    providers: [
        JsonEncoder,
        JsonDecoder,
        JsonReceiver,
        JsonSender
    ]
})
export class JsonEndpointModule {

}
