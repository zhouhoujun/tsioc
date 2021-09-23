import { DIModule } from '@tsdi/core';
import { Http2StartupService } from './serv';


@DIModule({
    regIn: 'root',
    providers: [
        Http2StartupService
    ]
})
export class Http2Module { }