import { AbstractType, lang, Invocation, OnDestroy, ClassRef, getTypeName, ctorName, Context, HandlerFn, RunContext } from '@tsdi/ioc';
import { Advicer, AroundProceeding, MatchOptions } from './Advicer';
import { AdviceMatcher } from './AdviceMatcher';
import { AopDef } from './metadata/ref';
import { AdviceTypes } from './metadata/meta';
import { JoinPoint, ProceedingJoinPoint } from './joinpoints/JoinPoint';

const NO_ADVICERS: Advicer[] = [];
const NO_PROCEEDINGS: AroundProceeding[] = [];

const BEFORE_TYPES: readonly AdviceTypes[] = ['Around', 'Before'];
const POINTCUT_TYPES: readonly AdviceTypes[] = ['Pointcut'];
const AFTER_TYPES: readonly AdviceTypes[] = ['Around', 'After'];
const AFTER_RETURNING_TYPES: readonly AdviceTypes[] = ['Around', 'AfterReturning'];
const AFTER_THROWING_TYPES: readonly AdviceTypes[] = ['Around', 'AfterThrowing'];

/**
 * for global aop advisor.
 *
 * @export
 * @class Advisor
 */
export class Advisor implements OnDestroy {
    private advices: Map<AdviceTypes, Advicer[]>;

    /**
     * Flat view of {@link advices}, used by {@link match} and
     * {@link hasPointcut} so a property access does not have to walk the
     * nested per-type arrays.
     */
    private allAdvicers: Advicer[] = [];

    private _version = 0;

    /**
     * Monotonic counter bumped whenever registered advice changes. Consumers
     * that cache match results (e.g. the AOP proxy) must invalidate on change.
     */
    get version(): number {
        return this._version;
    }

    private proceedings: AroundProceeding[];
    private pendingActivator?: () => void;
    /**
     * aspects.
     */
    aspects: Invocation[];

    constructor(private matcher: AdviceMatcher) {
        this.advices = new Map();
        this.aspects = [];
        this.proceedings = [];
    }



    /**
     * add aspect.
     *
     * @param {AbstractType} aspect
     * @param {Container} raiseContainer
     */
    add(aspect: Invocation): void {
        if (this.aspects.some(a => a.type === aspect.type)) return;
        this.registerAspect(aspect)
    }

    protected registerAspect(aspect: Invocation): void {
        this.aspects.push(aspect);
        aspect.onDestroy(() => this.remove(aspect));
        aspect.classRef.getAnnotation<AopDef>().advices?.forEach(advice => {
            if (!advice.type) {
                advice.type = aspect.type;
            }
            const match = this.matcher.parse(advice);
            if (advice.propertyKey && advice.adviceName === 'Around' && aspect.classRef.getParameters(advice.propertyKey)?.some(r => r.type === ProceedingJoinPoint || r.provider === ProceedingJoinPoint)) {
                this.proceedings.push({
                    advice,
                    match,
                    aspect,
                    interceptor: (ctx: JoinPoint, next: HandlerFn, context: Context) => {
                        const proceeding = new ProceedingJoinPoint(ctx, next, context);
                        ctx.setValue(ProceedingJoinPoint, proceeding);
                        return aspect.invoke(advice.propertyKey!, ctx);
                    }
                });
                this.changed();
                return;
            }
            const adviceType = advice.adviceName!;
            let advices = this.advices.get(adviceType);
            if (!advices) {
                advices = [];
                this.advices.set(adviceType, advices);
            }

            if (!advices.some(r => r.advice.type == advice.type
                && r.advice.propertyKey === advice.propertyKey
                && r.advice.pointcut === advice.pointcut)) {
                const advicer: Advicer = {
                    advice,
                    match,
                    accessor: advice.accessor,
                    aspect
                };
                advices.push(advicer);
                this.allAdvicers.push(advicer);
                this.changed();
            }
        });

    }

    protected unregisterAspect(aspect: Invocation) {
        this.advices.forEach(advices => {
            advices.filter(a => a.aspect.type === aspect.type)
                .forEach(a => {
                    advices.splice(advices.indexOf(a), 1);
                    lang.remove(this.allAdvicers, a);
                })
        });
        this.proceedings = this.proceedings.filter(r => r.aspect !== aspect || r.aspect.type !== aspect.type);
        this.changed();
    }

    remove(aspect: Invocation) {
        lang.remove(this.aspects, aspect);
        this.unregisterAspect(aspect);
    }

    /**
     * Record an advice change so derived caches (the AOP proxy property match
     * cache) drop their resolved decisions.
     */
    private changed(): void {
        this._version++;
    }

    get(type: AbstractType): Invocation | undefined {
        return this.aspects.find(r => r.type === type)
    }

    /**
     * Precompiled aspects are registered before module providers finish
     * loading. Defer activation until advice matching starts, when the app
     * graph is complete, and drop aspects that do not belong to it.
     */
    setPendingActivator(activator?: () => void): void {
        this.pendingActivator = activator;
    }

    private activatePending(): void {
        const activator = this.pendingActivator;
        if (activator) {
            this.pendingActivator = undefined;
            activator();
        }
    }


    match(name: string | symbol, fullName: string, targetRef: ClassRef, target?: object, options?: MatchOptions): boolean {
        this.activatePending();
        const advicers = this.allAdvicers;
        for (let i = 0, len = advicers.length; i < len; i++) {
            if (advicers[i].match(name, fullName, targetRef, target, options)) {
                return true;
            }
        }
        return false;
    }

    hasCtor(tagref: ClassRef): boolean {
        return this.match(ctorName, `${tagref.className}.${ctorName}`, tagref)
    }


    hasPointcut(instance: object, typeRef: ClassRef, withConstructor?: boolean): boolean {
        this.activatePending();
        const advicers = this.allAdvicers;
        if (!advicers.length) return false;

        const className = typeRef?.className ?? getTypeName(instance);
        const names = Object.keys(instance);
        const decorators = typeRef?.getPropertyDescriptors();
        if (decorators) {
            for (const name in decorators) {
                if (name !== ctorName || withConstructor) {
                    names.push(name);
                }
            }
        }

        for (let i = 0, len = names.length; i < len; i++) {
            const name = names[i];
            const fullName = `${className}.${name}`;
            for (let j = 0, alen = advicers.length; j < alen; j++) {
                if (advicers[j].match(name, fullName, typeRef, instance, { way: 'root' })) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Resolve advice of the given kinds matching `(name, fullName, options)`,
     * in registration order.
     *
     * Walks the per-kind lists directly and only allocates a result when an
     * advice actually matches: calls on non-advised properties (the common
     * case) stay allocation free.
     *
     * The returned array must be treated as read-only; when nothing matches a
     * shared empty array is returned.
     */
    private resolve(types: readonly AdviceTypes[], name: string | symbol, fullName: string, targetRef: ClassRef, target?: object, options?: MatchOptions): Advicer[] {
        let found: Advicer[] | undefined;
        for (let i = 0, len = types.length; i < len; i++) {
            const advicers = this.advices.get(types[i]);
            if (!advicers) continue;
            for (let j = 0, alen = advicers.length; j < alen; j++) {
                const advicer = advicers[j];
                if (advicer.match(name, fullName, targetRef, target, options)) {
                    if (found) {
                        found.push(advicer);
                    } else {
                        found = [advicer];
                    }
                }
            }
        }
        return found ?? NO_ADVICERS;
    }

    getProceeding(name: string | symbol, fullName: string, targetRef: ClassRef, target?: object, options?: MatchOptions): AroundProceeding[] {
        const proceedings = this.proceedings;
        if (!proceedings.length) return NO_PROCEEDINGS;
        return proceedings.filter(adv => adv.match(name, fullName, targetRef, target, options));
    }

    getBefore(name: string | symbol, fullName: string, targetRef: ClassRef, target?: object, options?: MatchOptions): Advicer[] {
        return this.resolve(BEFORE_TYPES, name, fullName, targetRef, target, options);
    }


    getPointcut(name: string | symbol, fullName: string, targetRef: ClassRef, target?: object, options?: MatchOptions): Advicer[] {
        return this.resolve(POINTCUT_TYPES, name, fullName, targetRef, target, options);
    }

    getAfter(name: string | symbol, fullName: string, targetRef: ClassRef, target?: object, options?: MatchOptions): Advicer[] {
        return this.resolve(AFTER_TYPES, name, fullName, targetRef, target, options);
    }

    getAfterReturning(name: string | symbol, fullName: string, targetRef: ClassRef, target?: object, options?: MatchOptions): Advicer[] {
        return this.resolve(AFTER_RETURNING_TYPES, name, fullName, targetRef, target, options);
    }

    getAfterThrowing(name: string | symbol, fullName: string, targetRef: ClassRef, target?: object, options?: MatchOptions): Advicer[] {
        return this.resolve(AFTER_THROWING_TYPES, name, fullName, targetRef, target, options);
    }


    onDestroy(): void {
        this.aspects = [];
        this.advices.clear();
        this.allAdvicers = [];
        this.proceedings = [];
        this.changed();
    }
}
