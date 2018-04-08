import { IContainer, Provider, Injectable, Singleton, Inject, IRecognizer, Express,
    symbols, isPromise, isArray, isObservable, isFunction
} from '@tsioc/core';

import { Joinpoint, JoinpointState } from '../joinpoints/index';
import { IAdvisorChain } from './IAdvisorChain';
import { IAdvisorProceeding } from './IAdvisorProceeding';
import { NonePointcut } from '../decorators/index';

@NonePointcut()
@Injectable(symbols.IAdvisorChain)
export class AdvisorChain implements IAdvisorChain {

    @Inject(symbols.IContainer)
    container: IContainer;

    protected actions: Express<Joinpoint, any>[];

    constructor(protected joinPoint: Joinpoint) {
        this.actions = [];
    }

    next(action: Express<Joinpoint, any>) {
        this.actions.push(action);
    }

    getRecognizer(): IRecognizer {
        return this.container.get(symbols.IRecognizer, this.joinPoint.state);
    }

    process(): void {
        let alias = this.getRecognizer().recognize(this.joinPoint.returning);
        this.container.get<IAdvisorProceeding>(symbols.IAdvisorProceeding, alias)
            .proceeding(this.joinPoint, ...this.actions);
    }

}
