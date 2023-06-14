import { Module } from '@tsdi/ioc';
import { StreamAdapter, FileAdapter } from '@tsdi/core';
import { ContentSendAdapter, CsrfTokensFactory, ResponseStatusFormater } from '@tsdi/transport';
import { NodeStreamAdapter } from './stream';
import { ContentSendAdapterImpl } from './send';
import { NodeResponseStatusFormater } from './formater';
import { NodeFileAdapter } from './file';
import { NodeCsrfTokensFactory } from './csrf';

@Module({
    providers: [
        { provide: StreamAdapter, useClass: NodeStreamAdapter },
        { provide: ContentSendAdapter, useClass: ContentSendAdapterImpl },
        { provide: FileAdapter, useClass: NodeFileAdapter },
        { provide: CsrfTokensFactory, useClass: NodeCsrfTokensFactory },
        { provide: ResponseStatusFormater, useClass: NodeResponseStatusFormater }
    ]
})
export class ServerTransportModule {

}
