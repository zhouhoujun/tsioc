import { DIModule } from '@ts-ioc/bootstrap';
import { ServerLogFormater } from './ServerLogFormater';
import { Log4jsAdapter } from './Log4jsAdapter';

@DIModule({
    imports: [
        ServerLogFormater,
        Log4jsAdapter
    ],
    exports: [
        ServerLogFormater,
        Log4jsAdapter
    ]
})
export class ServerLogsModule {

}
