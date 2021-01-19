import { Singleton } from '@tsdi/ioc';
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
