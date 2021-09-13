import { DIModule, global, PROCESS_ROOT } from '@tsdi/boot';

let processRoot = global.baseURL || '.';


@DIModule({
    regIn: 'root',
    providers: [
        { provide: PROCESS_ROOT, useValue: processRoot }
    ]
})
export class BrowserBootstrapModule { }

