import { Module } from '@tsdi/ioc';
import { StreamAdapter } from '@tsdi/common/transport';
import { ContentSendAdapter, FileAdapter, ResponseStatusFormater } from '@tsdi/endpoints';
import { CsrfTokensFactory } from '@tsdi/endpoints/assets'
import { NodeResponseStatusFormater } from './formater';
import { NodeFileAdapter } from './file';
import { NodeStreamAdapter } from './stream';
import { ContentSendAdapterImpl } from './send';
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
export class ServerEndpointModule {

}
