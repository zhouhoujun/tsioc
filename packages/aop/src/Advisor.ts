import {
    IContainer, Singleton, getOwnMethodMetadata,
    Type, ObjectMap, lang, ParamProviders
} from '@ts-ioc/core';
import { Advices } from './advices';
import { Advice, NonePointcut } from './decorators';
import { AdviceMetadata } from './metadatas';
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
     * @type {Map<Type<any>, ObjectMap<AdviceMetadata[]>>}
     * @memberof AspectManager
     */
    aspects: Map<Type<any>, ObjectMap<AdviceMetadata[]>>;

    /**
     * aspect ioc containers.
     *
     * @protected
     * @type {Map<Type<any>, IContainer>}
     * @memberof Advisor
     */
    protected aspectIocs: Map<Type<any>, IContainer>;
    /**
     * method advices.
     *
     * @type {Map<string, Advices>}
     * @memberof AspectManager
     */
    advices: Map<string, Advices>;


    constructor() {
        this.aspects = new Map();
        this.aspectIocs = new Map();
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
        if (!this.advices.has(key)) {
            return null;
        }
        return this.advices.get(key);
    }

    /**
     * has register advices or not.
     *
     * @param {Type<any>} targetType
     * @returns {boolean}
     * @memberof Advisor
     */
    hasRegisterAdvices(targetType: Type<any>): boolean {
        let methods = lang.keys(Object.getOwnPropertyDescriptors(targetType.prototype));
        let className = lang.getClassName(targetType);
        return methods.some(m => this.advices.has(`${className}.${m}`));
    }

    /**
     * add aspect.
     *
     * @param {Type<any>} aspect
     * @param {IContainer} raiseContainer
     * @memberof Advisor
     */
    add(aspect: Type<any>, raiseContainer: IContainer) {
        if (!this.aspects.has(aspect)) {
            let metas = getOwnMethodMetadata<AdviceMetadata>(Advice, aspect);
            this.aspects.set(aspect, metas);
            this.aspectIocs.set(aspect, raiseContainer);
        }
    }

    getContainer(aspect: Type<any>, defaultContainer?: IContainer): IContainer {
        if (this.aspectIocs.has(aspect)) {
            return this.aspectIocs.get(aspect) || defaultContainer;
        }
        return defaultContainer;
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
        if (this.aspectIocs.has(aspect)) {
            return this.aspectIocs.get(aspect).resolve(aspect, ...providers);
        }
        return null;
    }
}
