import { AdviceMetadata } from './metadatas/index';
import { Type, ObjectMap, MapSet, InjectToken } from '@ts-ioc/core';
import { Advices } from './advices/index';

/**
 * Aop IAdvisor interface token.
 * it is a token id, you can register yourself IAdvisor for this.
 */
export const AdvisorToken = new InjectToken<IAdvisor>('__IOC_IAdvisor');

/**
 * aspect and advices manager.
 *
 * @export
 * @interface IAdvisor
 */
export interface IAdvisor {
    /**
     * aspects
     *
     * @type {MapSet<Type<any>, ObjectMap<AdviceMetadata[]>>}
     * @memberof IAdvisor
     */
    aspects: MapSet<Type<any>, ObjectMap<AdviceMetadata[]>>;
    /**
     * advices
     *
     * @type {MapSet<string, Advices>}
     * @memberof IAdvisor
     */
    advices: MapSet<string, Advices>;

    /**
     * has register advices or not.
     *
     * @param {Type<any>} targetType
     * @returns {boolean}
     * @memberof IAdvisor
     */
    hasRegisterAdvices(targetType: Type<any>): boolean;
    /**
     * set advices.
     *
     * @param {string} key
     * @param {Advices} advices
     * @memberof IAdvisor
     */
    setAdvices(key: string, advices: Advices);
    /**
     * get advices.
     *
     * @param {string} key
     * @returns {Advices}
     * @memberof IAdvisor
     */
    getAdvices(key: string): Advices;
    /**
     * add aspect.
     *
     * @param {Type<any>} aspect
     * @memberof IAdvisor
     */
    add(aspect: Type<any>);
}
