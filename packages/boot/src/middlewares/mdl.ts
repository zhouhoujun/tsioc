import { CONTAINER, IContainer, Inject, IocExt } from '@tsdi/ioc';
import { ExtendBaseTypeMap } from './ModelParser';
import { RouteVaildator } from './route';
import { MessageRouter, RootMessageQueue } from './router';


/**
* ORM Core module.
*/
@IocExt()
export class MiddlewareModule {

   setup(@Inject(CONTAINER) container: IContainer) {
       container.use(RouteVaildator, ExtendBaseTypeMap, MessageRouter, RootMessageQueue)
   }
}
