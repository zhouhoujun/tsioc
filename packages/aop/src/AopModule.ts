import { Inject, Container, runtimes, RuntimeLifeScope, IocExt } from '@tsdi/ioc';
import { BeforeCtorAdviceAction, AfterCtorAdviceAction, BindMthPointcutAction, MatchPointcutAction } from './actions/aop';
import { Advisor } from './Advisor';
import { AdviceMatcher } from './AdviceMatcher';
import { ProceedingScope } from './actions/proceed';
import { ADVISOR, ADVICE_MATCHER } from './metadata/tk';



/**
 * aop ext for ioc. auto run setup after registered.
 * @export
 * @class AopModule
 */
@IocExt()
export class AopModule {

    constructor() { }

    /**
     * register aop for container.
     */
    setup(@Inject() container: Container) {

        const prdr = container.action();

        prdr.setValue(ADVISOR, new Advisor(container), Advisor)
            .setValue(ADVICE_MATCHER, new AdviceMatcher(container), AdviceMatcher);

        prdr.regAction(ProceedingScope);

        prdr.get(runtimes.BeforeCtorScope)
            .useBefore(BeforeCtorAdviceAction);

        prdr.get(runtimes.AfterCtorScope)
            .use(AfterCtorAdviceAction);

        prdr.get(runtimes.RuntimeMthScope)
            .useBefore(BindMthPointcutAction);

        prdr.get(RuntimeLifeScope)
            .useBefore(MatchPointcutAction, runtimes.CtorArgsAction);

    }
}
