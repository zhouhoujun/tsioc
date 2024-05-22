import { Module } from '@tsdi/ioc';
import { CodingsModule } from '@tsdi/common/codings';
import { IncomingDecodingsHandlers } from './incoming.decodings';
import { OutgoingEncodingsHandlers } from './outgoing.encodings';


@Module({
    imports: [
        CodingsModule
    ],
    providers: [
        IncomingDecodingsHandlers,
        OutgoingEncodingsHandlers
    ]
})
export class ServerCodingsModule {

}