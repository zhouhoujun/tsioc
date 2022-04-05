import { Singleton } from '@tsdi/ioc';
import { Aspect, Around, Joinpoint } from '@tsdi/aop';
import { LogAspect } from '../src';

@Singleton()
@Aspect()
export class DebugLogAspect extends LogAspect {

    @Around('execution(*.*)')
    logging(joinPoint: Joinpoint) {
        this.processLog(joinPoint);
    }
}
