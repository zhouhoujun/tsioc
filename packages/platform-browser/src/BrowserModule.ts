import { Module } from '@tsdi/ioc';
import { PROCESS_ROOT } from '@tsdi/core';
import { PLATFORM_ID, PLATFORM_BROWSER_ID, DOCUMENT, global } from '@tsdi/common';
import { XhrFactory } from '@tsdi/common/http';
import { BrowserXhr } from './xhr';



const processRoot = global.baseURL || '.';



@Module({
    providedIn: 'root',
    providers: [
        { provide: PLATFORM_ID, useValue: PLATFORM_BROWSER_ID },
        { provide: DOCUMENT, useFactory: () => document },
        { provide: XhrFactory, useClass: BrowserXhr },
        { provide: PROCESS_ROOT, useValue: processRoot, asDefault: true }
    ]
})
export class BrowserModule { }

