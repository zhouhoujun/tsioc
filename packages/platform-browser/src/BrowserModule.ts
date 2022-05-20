import { Module, PROCESS_ROOT } from '@tsdi/core';
import { BrowserXhr } from './xhr';
import { XhrFactory, global, PLATFORM_ID, PLATFORM_BROWSER_ID, DOCUMENT } from '@tsdi/common';

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

