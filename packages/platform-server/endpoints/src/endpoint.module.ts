import { Module } from '@tsdi/ioc';
import { StreamAdapter } from '@tsdi/common';
import { FileAdapter, ResponseStatusFormater } from '@tsdi/endpoints';
import { NodeResponseStatusFormater } from './formater';
import { NodeFileAdapter } from './file';
import { NodeStreamAdapter } from './stream';



@Module({
    providers: [
        { provide: StreamAdapter, useClass: NodeStreamAdapter },
        { provide: FileAdapter, useClass: NodeFileAdapter },
        { provide: ResponseStatusFormater, useClass: NodeResponseStatusFormater }
    ]
})
export class ServerEndpointModule {

}
