import { Module } from '@tsdi/ioc';
import { ContentSendAdapter, ResponseStatusFormater, StreamAdapter } from '@tsdi/transport';
import { NodeStreamAdapter } from './adapter';
import { TransportSendAdapter } from './send';
import { NodeResponseStatusFormater } from './formater';

@Module({
    providers: [
        { provide: StreamAdapter, useClass: NodeStreamAdapter },
        { provide: ContentSendAdapter, useClass: TransportSendAdapter },
        { provide: ResponseStatusFormater, useClass: NodeResponseStatusFormater }
    ]
})
export class ServerTransportModule {

}
