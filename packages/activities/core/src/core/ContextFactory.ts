import { IActivity } from './IActivity';
import { Token, IContainer, Inject, ContainerToken, Injectable } from '@ts-ioc/core';
import { ActivityContextToken } from './ActivityContext';
import { InjectActivityContextToken, InputDataToken, IActivityContext } from './IActivityContext';

/**
 * context factory.
 *
 * @export
 * @class ContextFactory
 */
@Injectable
export class ContextFactory {

    @Inject(ContainerToken)
    container: IContainer;
    private type: Token<IActivity>;
    private ctxType: Token<IActivityContext>;

    constructor() {

    }

    setDefaultActivityType(type: Token<IActivity>) {
        this.type = type;
    }

    setDefaultContextType(type: Token<IActivityContext>) {
        this.ctxType = type;
    }

    /**
     * create activity context.
     *
     * @template T
     * @param {*} [data]
     * @param {Token<IActivity>} [type]
     * @param {Token<T>} [defCtx]
     * @returns {T}
     * @memberof ContextFactory
     */
    create<T extends IActivityContext>(data?: any, type?: Token<IActivity>, defCtx?: Token<T>): T {
        if (!type && this.ctxType) {
            return this.container.resolve(this.ctxType, { provide: InputDataToken, useValue: data }) as T;
        }
        type = type || this.type;
        return this.container.getRefService(InjectActivityContextToken, type, defCtx || ActivityContextToken, { provide: InputDataToken, useValue: data }) as T;
    }
}
