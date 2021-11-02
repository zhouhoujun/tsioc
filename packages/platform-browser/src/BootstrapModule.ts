import { DIModule, global, PROCESS_ROOT } from '@tsdi/core';

let processRoot = global.baseURL || '.';


@DIModule({
    providedIn: 'root',
    providers: [
        { provide: PROCESS_ROOT, useValue: processRoot }
    ]
})
export class BrowserBootstrapModule { }

