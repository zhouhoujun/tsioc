import { Module } from '@tsdi/ioc';
import { StreamAdapter, FileAdapter, ResponseStatusFormater } from '@tsdi/common';
// import { ContentSendAdapter  } from '@tsdi/endpoints';
import { NodeResponseStatusFormater } from './formater';
// import { ContentSendAdapterImpl } from './send';

import { NodeFileAdapter } from './file';
import { NodeStreamAdapter } from './stream';



@Module({
    providers: [
        { provide: StreamAdapter, useClass: NodeStreamAdapter },
        { provide: FileAdapter, useClass: NodeFileAdapter },
        // { provide: ContentSendAdapter, useClass: ContentSendAdapterImpl },
        { provide: ResponseStatusFormater, useClass: NodeResponseStatusFormater }
    ]
})
export class ServerCommonModule {

}

export class ServerEndpointModule extends ServerCommonModule {
}
