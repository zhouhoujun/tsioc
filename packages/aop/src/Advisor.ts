import {
    Singleton, Type, ObjectMap, lang, ParamProviders, Inject, TypeReflectsToken, ITypeReflects
} from '@tsdi/ioc';
import { Advices } from './advices/Advices';
import { Advice } from './decorators/Advice';
import { NonePointcut } from './decorators/NonePointcut';
import { AdviceMetadata } from './metadatas/AdviceMetadata';
import { IAdvisor, AdvisorToken } from './IAdvisor';

/**
 * for global aop advisor.
 *
 * @export
 * @class Advisor
 */
@NonePointcut()
@Singleton(AdvisorToken)
export class Advisor implements IAdvisor {
    /**
     * aspects.
     *
     * @type {Map<Type, ObjectMap<AdviceMetadata[]>>}
     * @memberof AspectManager
     */
    aspects: Map<Type, ObjectMap<AdviceMetadata[]>>;
    /**
     * method advices.
     *
     * @type {Map<string, Advices>}
     * @memberof AspectManager
     */
    advices: Map<string, Advices>;

    @Inject(TypeReflectsToken) reflects: ITypeReflects;

    constructor() {
        this.aspects = new Map();
        this.advices = new Map();
    }

    /**
     * set advices.
     *
     * @param {string} key
     * @param {Advices} advices
     * @memberof Advisor
     */
    setAdvices(key: string, advices: Advices) {
        if (!this.advices.has(key)) {
            this.advices.set(key, advices);
        }
    }

    /**
     * get advices.
     *
     * @param {string} key
     * @returns
     * @memberof Advisor
     */
    getAdvices(key: string) {
        return this.advices.get(key) || null;
    }

    /**
     * has register advices or not.
     *
     * @param {Type} targetType
     * @returns {boolean}
     * @memberof Advisor
     */
    hasRegisterAdvices(targetType: Type): boolean {
        let methods = Object.keys(Object.getOwnPropertyDescriptors(targetType.prototype));
        let className = lang.getClassName(targetType);
        return methods.some(m => this.advices.has(`${className}.${m}`));
    }

    /**
     * add aspect.
     *
     * @param {Type} aspect
     * @param {IInjector} injector
     * @memberof Advisor
     */
    add(aspect: Type) {
        if (!this.aspects.has(aspect)) {
            let metas = this.reflects.getMethodMetadata<AdviceMetadata>(Advice, aspect);
            this.aspects.set(aspect, metas);
        }
    }

    /**
     * resolve aspect.
     *
     * @template T
     * @param {Type<T>} aspect
     * @param {...ParamProviders[]} providers
     * @returns {T}
     * @memberof Advisor
     */
    resolve<T>(aspect: Type<T>, ...providers: ParamProviders[]): T {
        return this.reflects.getInjector(aspect).resolve(aspect, ...providers);
    }
}
