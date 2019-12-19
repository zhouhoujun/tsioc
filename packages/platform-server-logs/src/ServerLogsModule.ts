import { DIModule } from '@tsdi/boot';
import { ServerLogFormater } from './ServerLogFormater';
import { Log4jsAdapter } from './Log4jsAdapter';

@DIModule({
    regFor: 'root',
    imports: [
        ServerLogFormater,
        Log4jsAdapter
    ]
})
export class ServerLogsModule {

}
