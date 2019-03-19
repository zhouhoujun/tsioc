import { DIModule, ProcessRunRootToken, ModuleScope } from '@ts-ioc/boot';
import { BrowserModule } from '@ts-ioc/platform-browser';
import { isUndefined } from '@ts-ioc/ioc';
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

