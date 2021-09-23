import { DIModule } from '@tsdi/core';
import { HttpStartupService } from './serv';


@DIModule({
    regIn: 'root',
    providers: [
        HttpStartupService
    ]
})
export class HttpModule { }