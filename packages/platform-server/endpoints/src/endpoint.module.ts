import { Module } from '@tsdi/ioc';
import { StreamAdapter, FileAdapter } from '@tsdi/common/transport';
import { ContentSendAdapter, ResponseStatusFormater } from '@tsdi/endpoints';
import { NodeResponseStatusFormater } from './formater';
import { NodeFileAdapter } from './file';
import { NodeStreamAdapter } from './stream';
import { ContentSendAdapterImpl } from './send';



@Module({
    providers: [
        { provide: StreamAdapter, useClass: NodeStreamAdapter },
        { provide: ContentSendAdapter, useClass: ContentSendAdapterImpl },
        { provide: FileAdapter, useClass: NodeFileAdapter },
        { provide: ResponseStatusFormater, useClass: NodeResponseStatusFormater }
    ]
})
export class ServerEndpointModule {

}
