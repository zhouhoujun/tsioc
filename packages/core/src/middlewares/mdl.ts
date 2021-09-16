import { ContextFactory, RouteVaildator } from './ctx';
import { DIModule } from '../metadata/decor';
import { ExtendBaseTypeMap } from './parser';
import { MessageQueue } from './queue';
import { RootMessageQueue } from './root';
import { MsgRouteVaildator, BASE_CONTEXT_FACTORY_IMPL } from './base';
import { RootRouter, Router } from './router';


/**
* router module.
*/
@DIModule({
    regIn: 'root',
    providers: [
        MsgRouteVaildator,
        {
            provide: RouteVaildator,
            useExisting: MsgRouteVaildator
        },
        ExtendBaseTypeMap,
        MessageQueue,
        Router,
        RootRouter,
        RootMessageQueue,
        {
            provide: ContextFactory,
            useValue: BASE_CONTEXT_FACTORY_IMPL
        }
    ]
})
export class MiddlewareModule {

}
