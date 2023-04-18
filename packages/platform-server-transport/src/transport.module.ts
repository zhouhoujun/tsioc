import { Module } from '@tsdi/ioc';
import { ContentSendAdapter, CsrfTokensFactory, FileAdapter, ResponseStatusFormater, StreamAdapter } from '@tsdi/transport';
import { NodeStreamAdapter } from './stream';
import { TransportSendAdapter } from './send';
import { NodeResponseStatusFormater } from './formater';
import { NodeFileAdapter } from './file';
import { NodeCsrfTokensFactory } from './csrf';

@Module({
    providers: [
        { provide: StreamAdapter, useClass: NodeStreamAdapter },
        { provide: ContentSendAdapter, useClass: TransportSendAdapter },
        { provide: FileAdapter, useClass: NodeFileAdapter },
        { provide: CsrfTokensFactory, useClass: NodeCsrfTokensFactory },
        { provide: ResponseStatusFormater, useClass: NodeResponseStatusFormater }
    ]
})
export class ServerTransportModule {

}
