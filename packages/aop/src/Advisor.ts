import { Type, Provider, IIocContainer } from '@tsdi/ioc';
import { Advices } from './advices/Advices';
import { IAdvisor } from './IAdvisor';

/**
 * for global aop advisor.
 *
 * @export
 * @class Advisor
 */
export class Advisor implements IAdvisor {
    /**
     * method advices.
     *
     * @type {Map<Type, Map<string, Advices>>}
     * @memberof AspectManager
     */
    advices: Map<Type, Map<string, Advices>>;

    aspects: Type[];

    constructor(private readonly container: IIocContainer) {
        this.advices = new Map();
        this.aspects = [];
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
     * @param {IIocContainer} raiseContainer
     * @memberof IAdvisor
     */
    add(aspect: Type) {
        this.aspects.push(aspect);
    }

    /**
     * resolve aspect.
     *
     * @template T
     * @param {Type<T>} aspect
     * @param {...Provider[]} providers
     * @returns {T}
     * @memberof Advisor
     */
    resolve<T>(aspect: Type<T>, ...providers: Provider[]): T {
        return this.container.regedState.getInjector(aspect).resolve(aspect, ...providers);
    }
}
