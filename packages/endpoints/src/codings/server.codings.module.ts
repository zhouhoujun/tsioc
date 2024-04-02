import { Module } from '@tsdi/ioc';
import { IncomingDecodingsModule } from './incoming.decodings';
import { OutgoingEncodingsModule } from './outgoing.encodings';


@Module({
    imports: [
        OutgoingEncodingsModule,
        IncomingDecodingsModule
    ],
    providers: [
    ],
    exports:[
        OutgoingEncodingsModule,
        IncomingDecodingsModule
    ]
})
export class ServerCodingsModule {

}