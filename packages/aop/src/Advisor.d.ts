import { AbstractType, Invocation, OnDestroy, ClassRef } from '@tsdi/ioc';
import { Advicer, AroundProceeding, MatchOptions } from './Advicer';
import { AdviceMatcher } from './AdviceMatcher';
import { AdviceTypes } from './metadata/meta';
/**
 * for global aop advisor.
 *
 * @export
 * @class Advisor
 */
export declare class Advisor implements OnDestroy {
    private matcher;
    private advices;
    private proceedings;
    /**
     * aspects.
     */
    aspects: Invocation[];
    constructor(matcher: AdviceMatcher);
    /**
     * add aspect.
     *
     * @param {AbstractType} aspect
     * @param {Container} raiseContainer
     */
    add(aspect: Invocation): void;
    protected registerAspect(aspect: Invocation): void;
    protected unregisterAspect(aspect: Invocation): void;
    remove(aspect: Invocation): void;
    get(type: AbstractType): Invocation | undefined;
    match(name: string | symbol, fullName: string, targetRef: ClassRef, target?: object, options?: MatchOptions): boolean;
    hasCtor(tagref: ClassRef): boolean;
    hasPointcut(instance: object, typeRef: ClassRef, withConstructor?: boolean): boolean;
    protected getAdvicers(...types: AdviceTypes[]): Advicer[];
    getProceeding(name: string | symbol, fullName: string, targetRef: ClassRef, target?: object, options?: MatchOptions): AroundProceeding[];
    getBefore(name: string | symbol, fullName: string, targetRef: ClassRef, target?: object, options?: MatchOptions): Advicer[];
    getPointcut(name: string | symbol, fullName: string, targetRef: ClassRef, target?: object, options?: MatchOptions): Advicer[];
    getAfter(name: string | symbol, fullName: string, targetRef: ClassRef, target?: object, options?: MatchOptions): Advicer[];
    getAfterReturning(name: string | symbol, fullName: string, targetRef: ClassRef, target?: object, options?: MatchOptions): Advicer[];
    getAfterThrowing(name: string | symbol, fullName: string, targetRef: ClassRef, target?: object, options?: MatchOptions): Advicer[];
    onDestroy(): void;
}
