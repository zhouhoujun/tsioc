import { Singleton, Inject } from '@tsdi/ioc';
import { IContainer, CONTAINER } from '@tsdi/core';
import { Aspect, Around, Joinpoint } from '@tsdi/aop';
import { LoggerAspect } from '../src';

@Singleton()
@Aspect()
export class DebugLogAspect extends LoggerAspect {

    @Around('execution(*.*)')
    logging(joinPoint: Joinpoint) {
        this.processLog(joinPoint);
    }
}
