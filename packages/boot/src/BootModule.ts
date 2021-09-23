import { DIModule } from '@tsdi/core';
import { HttpRouter } from './router';

@DIModule({
    regIn: 'root',
    providers:[
        HttpRouter
    ]
})
export class BootModule {}