import { global, PROCESS_ROOT } from '@tsdi/core';
import { Module } from '@tsdi/ioc';

let processRoot = global.baseURL || '.';


@Module({
    providedIn: 'root',
    providers: [
        { provide: PROCESS_ROOT, useValue: processRoot }
    ]
})
export class BrowserBootstrapModule { }

