import { DIModule } from '../decorators';
import { ExtendBaseTypeMap } from './ModelParser';
import { MessageQueue } from './queue';
import { RootMessageQueue } from './root';
import { RouteVaildator } from './route';
import { RootRouter, Router } from './router';


/**
* router module.
*/
@DIModule({
    regIn: 'root',
    providers: [
        RouteVaildator,
        ExtendBaseTypeMap,
        MessageQueue,
        Router,
        RootRouter,
        RootMessageQueue
    ]
})
export class MiddlewareModule {

}
