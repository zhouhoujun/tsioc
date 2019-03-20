import { DIModule, RegScope } from '@ts-ioc/boot';
import { ServerLogFormater } from './ServerLogFormater';
import { Log4jsAdapter } from './Log4jsAdapter';

@DIModule({
    regScope: RegScope.all,
    imports: [
        ServerLogFormater,
        Log4jsAdapter
    ]
})
export class ServerLogsModule {

}
