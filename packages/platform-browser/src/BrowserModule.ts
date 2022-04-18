import { Module, global, PROCESS_ROOT, PLATFORM_ID, PLATFORM_BROWSER_ID, XhrFactory, DOCUMENT } from '@tsdi/core';
import { BrowserXhr } from './xhr';


let processRoot = global.baseURL || '.';



@Module({
    providedIn: 'platform',
    providers: [
        { provide: PLATFORM_ID, useValue: PLATFORM_BROWSER_ID },
        { provide: DOCUMENT, useFactory: () => document },
        { provide: XhrFactory, useClass: BrowserXhr },
        { provide: PROCESS_ROOT, useValue: processRoot, asDefault: true }
    ]
})
export class BrowserModule { }

