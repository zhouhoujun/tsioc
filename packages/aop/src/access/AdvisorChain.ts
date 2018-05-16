import { IContainer, Provider, Injectable, Singleton, Inject, IRecognizer, Express,
    isPromise, isArray, isObservable, isFunction, ContainerToken, RecognizerToken
} from '@ts-ioc/core';

import { Joinpoint, JoinpointState } from '../joinpoints/index';
import { IAdvisorChain, AdvisorChainToken } from './IAdvisorChain';
import { IAdvisorProceeding, AdvisorProceedingToken } from './IAdvisorProceeding';
import { NonePointcut } from '../decorators/index';

@NonePointcut()
@Injectable(AdvisorChainToken)
export class AdvisorChain implements IAdvisorChain {

    @Inject(ContainerToken)
    container: IContainer;

    protected actions: Express<Joinpoint, any>[];

    constructor(protected joinPoint: Joinpoint) {
        this.actions = [];
    }

    next(action: Express<Joinpoint, any>) {
        this.actions.push(action);
    }

    getRecognizer(): IRecognizer {
        return this.container.get(RecognizerToken, this.joinPoint.state);
    }

    process(): void {
        let alias = this.getRecognizer().recognize(this.joinPoint.returning);
        this.container.get(AdvisorProceedingToken, alias)
            .proceeding(this.joinPoint, ...this.actions);
    }

}
