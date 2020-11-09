import { DIModule } from '@tsdi/boot';
import { ServerLogFormater } from './ServerLogFormater';
import { Log4jsAdapter } from './Log4jsAdapter';

@DIModule({
    regIn: 'root',
    providers: [
        ServerLogFormater,
        Log4jsAdapter
    ]
})
export class ServerLogsModule { }
