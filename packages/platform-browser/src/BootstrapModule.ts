import { Module, global, PROCESS_ROOT } from '@tsdi/core';


let processRoot = global.baseURL || '.';


@Module({
    providedIn: 'root',
    providers: [
        { provide: PROCESS_ROOT, useValue: processRoot }
    ]
})
export class BrowserBootstrapModule { }

