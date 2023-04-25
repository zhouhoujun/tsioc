import { Module } from '@tsdi/ioc';
import { ContentSendAdapter, CsrfTokensFactory, FileAdapter, ResponseStatusFormater, StreamAdapter } from '@tsdi/transport';
import { NodeStreamAdapter } from './stream';
import { TransportSendAdapter } from './send';
import { NodeResponseStatusFormater } from './formater';
import { NodeFileAdapter } from './file';
import { NodeCsrfTokensFactory } from './csrf';
import { IncomingFactoryImpl } from './incoming';
import { IncomingFactory, OutgoingFactory } from '@tsdi/core';
import { OutgoingFactoryImpl } from './outgoing';

@Module({
    providers: [
        { provide: StreamAdapter, useClass: NodeStreamAdapter },
        { provide: ContentSendAdapter, useClass: TransportSendAdapter },
        { provide: FileAdapter, useClass: NodeFileAdapter },
        { provide: CsrfTokensFactory, useClass: NodeCsrfTokensFactory },
        { provide: ResponseStatusFormater, useClass: NodeResponseStatusFormater },
        { provide: IncomingFactory, useClass: IncomingFactoryImpl },
        { provide: OutgoingFactory, useClass: OutgoingFactoryImpl }
    ]
})
export class ServerTransportModule {

}
