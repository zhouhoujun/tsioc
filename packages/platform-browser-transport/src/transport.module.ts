import { Module } from '@tsdi/ioc';
import { ResponseStatusFormater, StreamAdapter } from '@tsdi/transport';
import { BrowserResponseStatusFormater } from './formater';
import { BrowserStreamAdapter } from './adapter';



@Module({
    providers: [
        { provide: StreamAdapter, useClass: BrowserStreamAdapter },
        { provide: ResponseStatusFormater, useClass: BrowserResponseStatusFormater }
    ]
})
export class BrowserTransportModule { }

