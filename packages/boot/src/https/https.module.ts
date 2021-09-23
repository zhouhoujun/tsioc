import { DIModule } from '@tsdi/core';
import { HttpsStartupService } from './serv';


@DIModule({
    regIn: 'root',
    providers: [
        HttpsStartupService
    ]
})
export class HttpsModule { }