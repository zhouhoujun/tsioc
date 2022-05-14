import { Module, global, PROCESS_ROOT, PLATFORM_ID, PLATFORM_BROWSER_ID, XhrFactory, DOCUMENT } from '@tsdi/core';
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

