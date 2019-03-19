import { DIModule, ModuleScope } from '@ts-ioc/boot';
import { ServerLogFormater } from './ServerLogFormater';
import { Log4jsAdapter } from './Log4jsAdapter';

@DIModule({
    regScope: ModuleScope.all,
    imports: [
        ServerLogFormater,
        Log4jsAdapter
    ]
})
export class ServerLogsModule {

}
