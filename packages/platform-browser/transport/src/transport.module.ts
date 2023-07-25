import { Module } from '@tsdi/ioc';
import { FileAdapter, StreamAdapter, ContentSendAdapter, ResponseStatusFormater } from '@tsdi/transport';
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
export class BrowserTransportModule { }

