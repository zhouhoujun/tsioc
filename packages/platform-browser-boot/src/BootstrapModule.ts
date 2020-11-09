import { isDefined } from '@tsdi/ioc';
import { DIModule, PROCESS_ROOT } from '@tsdi/boot';
import { BrowserModule } from '@tsdi/platform-browser';
declare let System: any;

let processRoot = isDefined(System) ? System.baseURL : '.';


@DIModule({
    regIn: 'root',
    imports: [
        BrowserModule
    ],
    providers: [
        { provide: PROCESS_ROOT, useValue: processRoot }
    ]
})
export class BrowserBootstrapModule { }

