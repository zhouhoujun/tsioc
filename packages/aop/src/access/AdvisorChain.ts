import { Injectable, Inject, Express, IocRecognizer } from '@ts-ioc/ioc';
import { Joinpoint } from '../joinpoints';
import { IAdvisorChain, AdvisorChainToken } from './IAdvisorChain';
import { AdvisorProceedingToken } from './IAdvisorProceeding';
import { NonePointcut } from '../decorators/NonePointcut';
import { ContainerToken, IContainer } from '@ts-ioc/core';

/**
 * advisor chain.
 *
 * @export
 * @class AdvisorChain
 * @implements {IAdvisorChain}
 */
@NonePointcut()
@Injectable(AdvisorChainToken)
export class AdvisorChain implements IAdvisorChain {

    @Inject(ContainerToken)
    container: IContainer;

    protected actions: Express<Joinpoint, any>[];

    constructor(protected joinPoint: Joinpoint) {
        this.actions = [];
    }

    /**
     * register next action.
     *
     * @param {Express<Joinpoint, any>} action
     * @memberof AdvisorChain
     */
    next(action: Express<Joinpoint, any>) {
        this.actions.push(action);
    }

    /**
     * get recognizer of this advisor.
     *
     * @returns {IRecognizer}
     * @memberof AdvisorChain
     */
    getRecognizer(): IocRecognizer {
        return this.container.get(IocRecognizer, this.joinPoint.state);
    }

    /**
     * process the advices.
     *
     * @memberof AdvisorChain
     */
    process(): void {
        let alias = this.getRecognizer().recognize(this.joinPoint.returning);
        this.container.get(AdvisorProceedingToken, alias)
            .proceeding(this.joinPoint, ...this.actions);
    }

}
