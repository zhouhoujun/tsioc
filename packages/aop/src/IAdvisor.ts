import { Type, ObjectMap, InjectToken, IIocContainer, ParamProviders, IInjector } from '@tsdi/ioc';
import { Advices } from './advices/Advices';
import { AdviceMetadata } from './metadatas/AdviceMetadata';


export const AOP_EXTEND_TARGET_TOKEN = new InjectToken<(target: any) => void>('AOP_EXTEND_TARGET_TOKEN')
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
     * @type {Map<Type, ObjectMap<AdviceMetadata[]>>}
     * @memberof IAdvisor
     */
    aspects: Map<Type, ObjectMap<AdviceMetadata[]>>;
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
     * @param {Type} targetType
     * @returns {boolean}
     * @memberof IAdvisor
     */
    hasRegisterAdvices(targetType: Type): boolean;
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
     * @param {Type} aspect
     * @param {IIocContainer} raiseContainer
     * @memberof IAdvisor
     */
    add(aspect: Type, raiseContainer: IIocContainer);

    /**
     * get aspect registered injector.
     *
     * @param {Type} aspect
     * @param {IInjector} [defaultInjector]
     * @returns {IInjector}
     * @memberof IAdvisor
     */
    getInjector(aspect: Type, defaultInjector?: IInjector): IInjector;

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
