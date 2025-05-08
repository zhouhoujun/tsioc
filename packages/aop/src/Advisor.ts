import { Type, lang, ReflectiveRef, OnDestroy, Class, getClassName, ctorName, Empty } from '@tsdi/ioc';
import { Advicer, MatchOptions } from './Advicer';
import { AdviceMatcher } from './AdviceMatcher';
import { AopDef } from './metadata/ref';
import { AdviceTypes } from './metadata/meta';

/**
 * for global aop advisor.
 *
 * @export
 * @class Advisor
 */
export class Advisor implements OnDestroy {
    private advices: Map<AdviceTypes, Advicer[]>;
    /**
     * aspects.
     */
    aspects: ReflectiveRef[];

    constructor(private matcher: AdviceMatcher) {
        this.advices = new Map();
        this.aspects = []
    }



    /**
     * add aspect.
     *
     * @param {Type} aspect
     * @param {Container} raiseContainer
     */
    add(aspect: ReflectiveRef): void {
        if (this.aspects.some(a => a.type === aspect.type)) return;
        this.registerAspect(aspect)
    }

    protected registerAspect(aspect: ReflectiveRef): void {
        this.aspects.push(aspect);
        aspect.onDestroy(() => this.remove(aspect));
        aspect.class.getAnnotation<AopDef>().advices?.forEach(advice => {
            if (!advice.type) {
                advice.type = aspect.type;
            }
            const match = this.matcher.parse(advice);
            const adviceType = advice.adviceName!;
            let advices = this.advices.get(adviceType);
            if (!advices) {
                advices = [];
                this.advices.set(adviceType, advices);
            }

            if (!advices.some(r => r.advice.type == advice.type
                && r.advice.name === advice.name
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

    protected unregisterAspect(aspect: ReflectiveRef) {
        this.advices.forEach(advices => {
            advices.filter(a => a.aspect.type === aspect.type)
                .forEach(a => {
                    advices.splice(advices.indexOf(a), 1);
                })
        })
    }

    remove(aspect: ReflectiveRef) {
        lang.remove(this.aspects, aspect);
        this.unregisterAspect(aspect);
    }

    get(type: Type): ReflectiveRef | undefined {
        return this.aspects.find(r => r.type === type)
    }


    match(name: string | symbol, fullName: string, targetRef: Class, target?: any, options?: MatchOptions): boolean {
        return Array.from(this.advices.values()).some(r => {
            return r.some(a => a.match(name, fullName, targetRef, target, options))
        })
    }

    hasCtor(tagref: Class): boolean {
        return this.match(ctorName, `${tagref.className}.${ctorName}`, tagref)
    }


    hasPointcut(instance: any, typeRef: Class, withConstructor?: boolean): boolean {
        const names = Object.keys(instance);

        const decorators = typeRef?.getPropertyDescriptors()
        // match method or property.
        if (decorators) {
            for (const name in decorators) {
                if (!withConstructor || (withConstructor && name != ctorName)) {
                    names.push(name);
                }
            }
        }

        return Array.from(this.advices.values()).some(r => {
            return names.some(name => r.some(a => a.match(name, `${typeRef?.className ?? getClassName(instance)}.${name}`, typeRef, instance, { way: 'root' })))
        })
    }

    protected getAdvicers(...types: AdviceTypes[]): Advicer[] {
        if (types?.length === 1) return this.advices.get(types[0]) ?? Empty;
        return types.reduce((pre, cur) => {
            const advicers = this.advices.get(cur);
            return advicers?.length ? pre.concat(advicers) : pre;
        }, [] as Advicer[]);
    }



    getBefore(name: string | symbol, fullName: string, targetRef: Class, target?: any, options?: MatchOptions): Advicer[] {
        return this.getAdvicers('Around', 'Before')
            .filter(adv => adv.match(name, fullName, targetRef, target, options));
    }


    getPointcut(name: string | symbol, fullName: string, targetRef: Class, target?: any, options?: MatchOptions): Advicer[] {
        return this.getAdvicers('Pointcut')
            .filter(adv => adv.match(name, fullName, targetRef, target, options));
    }

    getAfter(name: string | symbol, fullName: string, targetRef: Class, target?: any, options?: MatchOptions): Advicer[] {
        return this.getAdvicers('Around', 'After')
            .filter(adv => adv.match(name, fullName, targetRef, target, options));
    }

    getAfterReturning(name: string | symbol, fullName: string, targetRef: Class, target?: any, options?: MatchOptions): Advicer[] {
        return this.getAdvicers('Around', 'AfterReturning')
            .filter(adv => adv.match(name, fullName, targetRef, target, options));
    }

    getAfterThrowing(name: string | symbol, fullName: string, targetRef: Class, target?: any, options?: MatchOptions): Advicer[] {
        return this.getAdvicers('Around', 'AfterThrowing')
            .filter(adv => adv.match(name, fullName, targetRef, target, options));
    }


    onDestroy(): void {
        this.aspects = [];
        this.advices.clear()
    }
}
