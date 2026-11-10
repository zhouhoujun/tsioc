import { getClassRef, Inject, Injector, Autorun, Module, ctorArgsInterceptor, methodInterceptor } from '@tsdi/ioc';
import { matchInterceptor, pointcutInterceptor } from './impl/aop';
import { Advisor } from './Advisor';
import { DefaultAdviceMatcher } from './impl/matcher';
import { ProceedingScope } from './impl/proceed';
import { Proceeding } from './Proceeding';
import { getPrecompiledAspects, onPrecompiledAspect } from './precompiled';
import { AdviceMatcher } from './AdviceMatcher';



@Autorun({
    providedIn: 'root',
    propertyKey: 'setup'
})
export class AopProvider {

    /**
     * register aop for container.
     */
    setup(@Inject() injector: Injector) {

        const runtime = injector.getRuntime();
        if (runtime.has(Advisor)) return;

        const proceeding = new ProceedingScope(runtime);
        const matcher = new DefaultAdviceMatcher(runtime);

        const advisor = new Advisor(matcher);
        runtime.set(Advisor, advisor)
            .set(AdviceMatcher, matcher)
            .set(Proceeding, proceeding)
            .set(ProceedingScope, proceeding);

        const pending = new Set<any>();
        const addPrecompiled = (target: any): boolean => {
            // Imported library aspects (for example the logger's debug aspect)
            // must not be activated unless their module belongs to this app;
            // otherwise their dependencies (LoggerModule, ...) would be
            // resolved for an application that never registered them.
            if (!injector.has(target)) {
                return false;
            }
            try {
                const invocation = getClassRef(target).createInvocation(injector);
                injector.onDestroy(() => invocation.destroy?.());
                advisor.add(invocation);
                return true;
            } catch {
                return false;
            }
        };
        const flushPending = () => {
            for (const target of [...pending]) {
                if (addPrecompiled(target)) {
                    pending.delete(target);
                }
            }
        };
        getPrecompiledAspects().forEach(entry => pending.add(entry.target));
        // Providers of imported modules may still be registering when AopModule
        // sets up. Retry once when matching starts (the app graph is complete
        // by then), then drop aspects that are not part of the application.
        advisor.setPendingActivator(() => {
            flushPending();
            pending.clear();
        });
        injector.onDestroy(onPrecompiledAspect(target => {
            if (!addPrecompiled(target)) {
                pending.add(target);
                advisor.setPendingActivator(() => {
                    flushPending();
                    pending.clear();
                });
            }
        }));

        const handler = runtime.getInstanceHandler();

        handler.use(matchInterceptor, handler.getIndexOf(methodInterceptor));
        handler.use(pointcutInterceptor, handler.getIndexOf(ctorArgsInterceptor) + 1);

    }
}

/**
 * aop ext for ioc. auto run setup after registered.
 * @export
 * @class AopModule
 */
@Module({
    providers: [
        AopProvider
    ]
})
export class AopModule {

}

export function provideAop() {
    return {
        providers: [
            AopProvider
        ]
    };
}