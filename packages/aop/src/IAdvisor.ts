import { AdviceMetadata } from './metadatas';
import { Type, ObjectMap, InjectToken, IContainer, ParamProviders } from '@ts-ioc/core';
import { Advices } from './advices';

/**
 * Aop IAdvisor interface token.
 * it is a token id, you can register yourself IAdvisor for this.
 */
export const AdvisorToken = new InjectToken<IAdvisor>('DI_IAdvisor');

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
     * @type {Map<Type<any>, ObjectMap<AdviceMetadata[]>>}
     * @memberof IAdvisor
     */
    aspects: Map<Type<any>, ObjectMap<AdviceMetadata[]>>;
    /**
     * advices
     *
     * @type {Map<string, Advices>}
     * @memberof IAdvisor
     */
    advices: Map<string, Advices>;

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
     * @param {IContainer} raiseContainer
     * @memberof IAdvisor
     */
    add(aspect: Type<any>, raiseContainer: IContainer);

    /**
     * get aspect registered container.
     *
     * @param {Type<any>} aspect
     * @param {IContainer} [defaultContainer]
     * @returns {IContainer}
     * @memberof IAdvisor
     */
    getContainer(aspect: Type<any>, defaultContainer?: IContainer): IContainer;

    /**
     * resolve aspect.
     *
     * @template T
     * @param {Type<T>} aspect
     * @param {...ParamProviders[]} providers
     * @returns {T}
     * @memberof IAdvisor
     */
    resolve<T>(aspect: Type<T>, ...providers: ParamProviders[]): T;
}
