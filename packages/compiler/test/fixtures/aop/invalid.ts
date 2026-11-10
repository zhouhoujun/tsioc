import { Aspect, Before } from '@tsdi/aop';

@Aspect()
export class BrokenAspect {
    @Before()
    beforeAnything() {
        return undefined;
    }
}
