import { Inject, runtimes, RuntimeLifeScope, IocExt, Injector, ROOT_INJECTOR } from '@tsdi/ioc';
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
    setup(@Inject(ROOT_INJECTOR) root: Injector) {

        const prdr = root.action();

        prdr.setValue(ADVISOR, new Advisor(root), Advisor)
            .setValue(ADVICE_MATCHER, new AdviceMatcher(root), AdviceMatcher);

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
