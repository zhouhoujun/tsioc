import {
    Type, ObjectMap, ParamProviders, Inject, TypeReflectsToken, ITypeReflects
} from '@tsdi/ioc';
import { Advices } from './advices/Advices';
import { Advice } from './decorators/Advice';
import { AdviceMetadata } from './metadatas/AdviceMetadata';
import { IAdvisor } from './IAdvisor';

/**
 * for global aop advisor.
 *
 * @export
 * @class Advisor
 */
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
     * @type {Map<Type, Map<string, Advices>>}
     * @memberof AspectManager
     */
    advices: Map<Type, Map<string, Advices>>;

    constructor(@Inject(TypeReflectsToken) private reflects: ITypeReflects) {
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
    setAdvices(type: Type, key: string, advices: Advices) {
        if (!this.advices.has(type)) {
            this.advices.set(type, new Map());
        }
        this.advices.get(type).set(key, advices);
    }

    hasAdvices(type: Type): boolean {
        return this.advices.has(type);
    }

    /**
     * get advices.
     *
     * @param {string} key
     * @returns
     * @memberof Advisor
     */
    getAdvices(type: Type, key: string) {
        return this.advices.get(type)?.get(key) || null;
    }

    /**
     * get advices.
     *
     * @param {string} key
     * @returns {Advices}
     * @memberof IAdvisor
     */
    getAdviceMap(type: Type): Map<string, Advices> {
        return this.advices.get(type);
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
