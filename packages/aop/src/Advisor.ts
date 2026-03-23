import { AbstractType, lang, Invocation, OnDestroy, ClassRef, getTypeName, ctorName, Context, HandlerFn, RunContext } from '@tsdi/ioc';
import { Advicer, AroundProceeding, MatchOptions } from './Advicer';
import { AdviceMatcher } from './AdviceMatcher';
import { AopDef } from './metadata/ref';
import { AdviceTypes } from './metadata/meta';
import { JoinPoint, ProceedingJoinPoint } from './joinpoints/JoinPoint';

/**
 * for global aop advisor.
 *
 * @export
 * @class Advisor
 */
export class Advisor implements OnDestroy {
    private advices: Map<AdviceTypes, Advicer[]>;

    private proceedings: AroundProceeding[];
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
                advices.push({
                    advice,
                    match,
                    accessor: advice.accessor,
                    aspect
                });
            }
        });

    }

    protected unregisterAspect(aspect: Invocation) {
        this.advices.forEach(advices => {
            advices.filter(a => a.aspect.type === aspect.type)
                .forEach(a => {
                    advices.splice(advices.indexOf(a), 1);
                })
        });
        this.proceedings = this.proceedings.filter(r => r.aspect !== aspect || r.aspect.type !== aspect.type)
    }

    remove(aspect: Invocation) {
        lang.remove(this.aspects, aspect);
        this.unregisterAspect(aspect);
    }

    get(type: AbstractType): Invocation | undefined {
        return this.aspects.find(r => r.type === type)
    }


    match(name: string | symbol, fullName: string, targetRef: ClassRef, target?: object, options?: MatchOptions): boolean {
        if (!this.advices.size) return false;
        for (const r of this.advices.values()) {
            for (let i = 0, len = r.length; i < len; i++) {
                if (r[i].match(name, fullName, targetRef, target, options)) {
                    return true;
                }
            }
        }
        return false;
    }

    hasCtor(tagref: ClassRef): boolean {
        return this.match(ctorName, `${tagref.className}.${ctorName}`, tagref)
    }


    hasPointcut(instance: object, typeRef: ClassRef, withConstructor?: boolean): boolean {
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

        if (!this.advices.size) return false;
        for (const r of this.advices.values()) {
            for (let i = 0, len = names.length; i < len; i++) {
                const name = names[i];
                const fullName = `${className}.${name}`;
                for (let j = 0, alen = r.length; j < alen; j++) {
                    if (r[j].match(name, fullName, typeRef, instance, { way: 'root' })) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    protected getAdvicers(...types: AdviceTypes[]): Advicer[] {
        if (!types?.length) return [];
        if (types.length === 1) return this.advices.get(types[0]) ?? [];
        const result: Advicer[] = [];
        for (let i = 0, len = types.length; i < len; i++) {
            const advicers = this.advices.get(types[i]);
            if (advicers?.length) {
                result.push(...advicers);
            }
        }
        return result;
    }

    getProceeding(name: string | symbol, fullName: string, targetRef: ClassRef, target?: object, options?: MatchOptions) {
        return this.proceedings.filter(adv => adv.match(name, fullName, targetRef, target, options))
    }

    getBefore(name: string | symbol, fullName: string, targetRef: ClassRef, target?: object, options?: MatchOptions): Advicer[] {
        return this.getAdvicers('Around', 'Before')
            .filter(adv => adv.match(name, fullName, targetRef, target, options));
    }


    getPointcut(name: string | symbol, fullName: string, targetRef: ClassRef, target?: object, options?: MatchOptions): Advicer[] {
        return this.getAdvicers('Pointcut')
            .filter(adv => adv.match(name, fullName, targetRef, target, options));
    }

    getAfter(name: string | symbol, fullName: string, targetRef: ClassRef, target?: object, options?: MatchOptions): Advicer[] {
        return this.getAdvicers('Around', 'After')
            .filter(adv => adv.match(name, fullName, targetRef, target, options));
    }

    getAfterReturning(name: string | symbol, fullName: string, targetRef: ClassRef, target?: object, options?: MatchOptions): Advicer[] {
        return this.getAdvicers('Around', 'AfterReturning')
            .filter(adv => adv.match(name, fullName, targetRef, target, options));
    }

    getAfterThrowing(name: string | symbol, fullName: string, targetRef: ClassRef, target?: object, options?: MatchOptions): Advicer[] {
        return this.getAdvicers('Around', 'AfterThrowing')
            .filter(adv => adv.match(name, fullName, targetRef, target, options));
    }


    onDestroy(): void {
        this.aspects = [];
        this.advices.clear()
    }
}
