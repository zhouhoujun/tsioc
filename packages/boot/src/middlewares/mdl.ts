import { CONTAINER, IContainer, Inject, IocExt } from '@tsdi/ioc';
import { ExtendBaseTypeMap } from './ModelParser';
import { MessageQueue, RootMessageQueue } from './queue';
import { RouteVaildator } from './route';
import { RootRouter, Router } from './router';


/**
* ORM Core module.  
*/
@IocExt()
export class MiddlewareModule {

   setup(@Inject(CONTAINER) container: IContainer) {
       container.use(RouteVaildator, ExtendBaseTypeMap, MessageQueue, RootMessageQueue, Router, RootRouter);
       container.get(RootMessageQueue).use(RootRouter);
   }
}
