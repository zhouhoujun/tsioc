import { NonePointcut, Provider, Injectable, Singleton, Inject } from '../../core/index';
import { Express } from '../../types';
import { Joinpoint, JoinpointState } from '../joinpoints/index';
import { symbols, isPromise, isArray, isObservable } from '../../utils/index';
import { IAdvisorChain } from './IAdvisorChain';

@NonePointcut()
@Injectable(symbols.IAdvisorChain)
export class AdvisorChain implements IAdvisorChain {

    protected actions: Express<Joinpoint, any>[];
    constructor(protected joinPoint: Joinpoint) {
        this.actions = [];
    }

    next(action: Express<Joinpoint, any>) {
        this.actions.push(action);
    }

    isAsync() {
        return isPromise(this.joinPoint.returning) || isObservable(this.joinPoint.returning);
    }


    process(): void {
        if (this.isAsync()) {
            this.asyncProcess();
        } else {
            this.syncProcess();
        }
    }


    protected asyncProcess() {
        if (isPromise(this.joinPoint.returning)) {
            this.promiseProcess();
        } else if (isObservable(this.joinPoint.returning)) {
            this.observableProcess();
        }
    }

    protected promiseProcess() {
        this.actions.forEach((action => {
            this.joinPoint.returning = this.joinPoint.returning.then((val) => {
                this.joinPoint.returningValue = val;
                return Promise.resolve(action(this.joinPoint))
                    .then(() => {
                        return this.joinPoint.returningValue !== val ? this.joinPoint.returningValue :
                            this.joinPoint.returning;
                    });
            });
        }));
    }

    protected observableProcess() {
        this.actions.forEach((action => {
            this.joinPoint.returning = this.joinPoint.returning.map((val) => {
                this.joinPoint.returningValue = val;
                action(this.joinPoint);
                return this.joinPoint.returningValue;
            });
        }));
    }

    protected syncProcess() {
        this.joinPoint.returningValue = this.joinPoint.returning;
        this.actions.forEach((action => {
            action(this.joinPoint);
        }))
    }
}
