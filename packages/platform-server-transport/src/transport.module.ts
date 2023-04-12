import { Module } from '@tsdi/ioc';
import { ContentSendAdapter, FileAdapter, ResponseStatusFormater, StreamAdapter } from '@tsdi/transport';
import { NodeStreamAdapter } from './stream';
import { TransportSendAdapter } from './send';
import { NodeResponseStatusFormater } from './formater';
import { NodeFileAdapter } from './file';

@Module({
    providers: [
        { provide: StreamAdapter, useClass: NodeStreamAdapter },
        { provide: ContentSendAdapter, useClass: TransportSendAdapter },
        { provide: FileAdapter, useClass: NodeFileAdapter },
        { provide: ResponseStatusFormater, useClass: NodeResponseStatusFormater }
    ]
})
export class ServerTransportModule {

}
