import { DIModule, ProcessRunRootToken, ModuleScope } from '@tsdi/boot';
import { BrowserModule } from '@tsdi/platform-browser';
import { isUndefined } from '@tsdi/ioc';
declare let System: any;

let processRoot = !isUndefined(System) ? System.baseURL : '.';


@DIModule({
    regScope: ModuleScope.all,
    imports: [
        BrowserModule
    ],
    providers: [
        { provide: ProcessRunRootToken, useValue: processRoot }
    ]
})
export class BrowserBootstrapModule {

}

