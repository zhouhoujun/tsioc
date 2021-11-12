import { Type, ProviderType, Resolver } from '@tsdi/ioc';
import { Advices } from './advices/Advices';

/**
 * aspect and advices manager.
 *
 * @export
 * @interface IAdvisor
 */
export interface IAdvisor {
    /**
     * aspect types.
     */
    aspects: Resolver[];
    /**
     * advices
     *
     * @type {Map<Type, Map<string, Advices>>}
     */
    advices: Map<Type, Map<string, Advices>>;

    /**
     * set advices.
     *
     * @param {Type} type
     * @param {string} key
     * @param {Advices} advices
     */
    setAdvices(type: Type, key: string, advices: Advices): void;

    /**
     * the type has advices or not.
     * @param type
     */
    hasAdvices(type: Type): boolean;
    /**
     * get advices.
     *
     * @param {Type} type
     * @returns {Advices}
     */
    getAdviceMap(type: Type): Map<string, Advices>;
    /**
     * get advices.
     *
     * @param {Type} type
     * @param {string} key
     * @returns {Advices}
     */
    getAdvices(type: Type, key: string): Advices;
    /**
     * add aspect.
     *
     * @param {Type} aspect
     */
    add(aspect: Resolver): void;
    /**
     * get aspect resolver
     * @param type 
     */
    get(type: Type): Resolver | undefined;
    /**
     * resolve aspect.
     *
     * @template T
     * @param {Type<T>} aspect
     * @param {...ProviderType[]} providers
     * @returns {T}
     */
    resolve<T>(aspect: Type<T>, ...providers: ProviderType[]): T;
}
