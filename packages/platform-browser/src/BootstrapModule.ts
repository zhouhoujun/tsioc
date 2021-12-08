import { Module, global, PROCESS_ROOT } from '@tsdi/core';


let processRoot = global.baseURL || '.';


@Module({
    providedIn: 'platform',
    providers: [
        { provide: PROCESS_ROOT, useValue: processRoot, asDefault: true }
    ]
})
export class BrowserBootstrapModule { }

