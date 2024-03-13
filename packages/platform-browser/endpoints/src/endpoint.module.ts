import { Module } from '@tsdi/ioc';
import { StreamAdapter, FileAdapter } from '@tsdi/common/transport';
import { ContentSendAdapter, ResponseStatusFormater } from '@tsdi/endpoints';
import { BrowserResponseStatusFormater } from './formater';
import { BrowserStreamAdapter } from './stream';
import { BrowserContentSendAdapter } from './send';
import { BrowserFileAdapter } from './file';



@Module({
    providers: [
        { provide: StreamAdapter, useClass: BrowserStreamAdapter },
        { provide: ContentSendAdapter, useClass: BrowserContentSendAdapter },
        { provide: FileAdapter, useClass: BrowserFileAdapter },
        { provide: ResponseStatusFormater, useClass: BrowserResponseStatusFormater }
    ]
})
export class BrowserEndpointModule { }

