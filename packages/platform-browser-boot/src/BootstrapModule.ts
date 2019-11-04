import { isDefined } from '@tsdi/ioc';
import { DIModule, ProcessRunRootToken, RegFor } from '@tsdi/boot';
import { BrowserModule } from '@tsdi/platform-browser';
declare let System: any;

let processRoot = isDefined(System) ? System.baseURL : '.';


@DIModule({
    regFor: RegFor.boot,
    imports: [
        BrowserModule
    ],
    providers: [
        { provide: ProcessRunRootToken, useValue: processRoot }
    ]
})
export class BrowserBootstrapModule {

}

