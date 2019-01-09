import { IContainer, Injectable, Inject, IRecognizer, Express, ContainerToken, RecognizerToken } from '@ts-ioc/core';
import { Joinpoint } from '../joinpoints';
import { IAdvisorChain, AdvisorChainToken } from './IAdvisorChain';
import { AdvisorProceedingToken } from './IAdvisorProceeding';
import { NonePointcut } from '../decorators/NonePointcut';

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
    getRecognizer(): IRecognizer {
        return this.container.get(RecognizerToken, this.joinPoint.state);
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
