import { Provider, Injectable, Inject, isUndefined, isArray, IocContainerToken, IIocContainer, ProviderTypes } from '@tsdi/ioc';
import { Joinpoint, JoinpointState } from '../joinpoints';
import { Advicer, Advices } from '../advices';
import { IAdvisorChainFactory } from './IAdvisorChainFactory';
import { IAdvisorChain, AdvisorChainToken } from './IAdvisorChain';
import { NonePointcut } from '../decorators/NonePointcut';
import { IAdvisor, AdvisorToken } from '../IAdvisor';

/**
 * advisor chain factory.
 *
 * @export
 * @class AdvisorChainFactory
 * @implements {IAdvisorChainFactory}
 */
@NonePointcut()
@Injectable
export class AdvisorChainFactory implements IAdvisorChainFactory {

    constructor(@Inject(IocContainerToken) private container: IIocContainer, @Inject(AdvisorToken) private advisor: IAdvisor, private advices: Advices) {

    }

    getAdvicers(adviceType: string): Advicer[] {
        return (adviceType ? this.advices[adviceType] : null) || [];
    }

    invoaction(joinPoint: Joinpoint, state: JoinpointState, valueOrthrowing?: any): void {
        joinPoint.state = state;
        joinPoint.returning = undefined;
        joinPoint.throwing = undefined;

        switch (state) {
            case JoinpointState.Before:
                this.before(joinPoint);
                break;
            case JoinpointState.Pointcut:
                this.pointcut(joinPoint);
                break;

            case JoinpointState.After:
                joinPoint.returning = valueOrthrowing;
                this.after(joinPoint);
                break;

            case JoinpointState.AfterThrowing:
                joinPoint.throwing = valueOrthrowing;
                this.afterThrowing(joinPoint);
                break;

            case JoinpointState.AfterReturning:
                joinPoint.returning = valueOrthrowing;
                this.afterReturning(joinPoint);
                break;
        }
    }

    before(joinPoint: Joinpoint) {
        let cloneJp = Object.assign({}, joinPoint);
        this.getAdvicers('Around')
            .forEach(advicer => {
                this.invokeAdvice(cloneJp, advicer);
            });

        if (!isUndefined(cloneJp.args)) {
            joinPoint.args = cloneJp.args;
        }

        this.getAdvicers('Before')
            .forEach(advicer => {
                this.invokeAdvice(cloneJp, advicer);
            });

    }

    pointcut(joinPoint: Joinpoint) {
        let cloneJp = Object.assign({}, joinPoint);
        this.getAdvicers('Pointcut')
            .forEach(advicer => {
                this.invokeAdvice(cloneJp, advicer);
            });

        if (!isUndefined(cloneJp.args)) {
            joinPoint.args = cloneJp.args;
        }
    }

    after(joinPoint: Joinpoint) {
        let cloneJp = Object.assign({}, joinPoint);
        this.getAdvicers('Around')
            .forEach(async advicer => {
                this.invokeAdvice(cloneJp, advicer);
            });

        this.getAdvicers('After')
            .forEach(async advicer => {
                this.invokeAdvice(cloneJp, advicer);
            });
    }

    afterThrowing(joinPoint: Joinpoint) {
        let cloneJp = Object.assign({}, joinPoint);
        this.getAdvicers('Around')
            .forEach(advicer => {
                this.invokeAdvice(cloneJp, advicer);
            });

        this.getAdvicers('AfterThrowing')
            .forEach(advicer => {
                this.invokeAdvice(cloneJp, advicer);
            });

    }

    afterReturning(joinPoint: Joinpoint) {
        let cloneJp = Object.assign({}, joinPoint);
        let advChain = this.container.get<IAdvisorChain>(AdvisorChainToken, { provide: Joinpoint, useValue: cloneJp });
        this.getAdvicers('Around')
            .forEach(advicer => {
                advChain.next((jp) => {
                    return this.invokeAdvice(jp, advicer);
                });
            });

        this.getAdvicers('AfterReturning')
            .forEach(advicer => {
                advChain.next(jp => {
                    return this.invokeAdvice(jp, advicer);
                });
            });

        advChain.next((jp) => {
            if (!isUndefined(jp.returning)) {
                joinPoint.returning = jp.returning;
            }
            return joinPoint;
        });

        advChain.process();
    }

    invokeAdvice(joinPoint: Joinpoint, advicer: Advicer) {
        let providers: ProviderTypes[] = [];

        providers.push(Provider.createExtends(Joinpoint, joinPoint, (inst, provider) => {
            inst._cache_JoinPoint = provider.resolve(this.container);
        }));

        let metadata: any = advicer.advice;

        if (!isUndefined(joinPoint.args) && metadata.args) {
            providers.push({ provide: metadata.args, useValue: joinPoint.args })
        }

        if (metadata.annotationArgName) {
            providers.push({
                provide: metadata.annotationArgName,
                useFactory: () => {
                    let curj = joinPoint;
                    let annotations = curj.annotations;
                    while (!annotations && joinPoint.provJoinpoint) {
                        curj = joinPoint.provJoinpoint;
                        if (curj && curj.annotations) {
                            annotations = curj.annotations;
                            break;
                        }
                    }

                    if (isArray(annotations)) {
                        if (metadata.annotationName) {
                            let d: string = metadata.annotationName;
                            d = /^@/.test(d) ? d : `@${d}`;
                            return annotations.filter(a => a.decorator === d);
                        }
                        return annotations;
                    } else {
                        return [];
                    }
                }
            });
        }

        if (!isUndefined(joinPoint.returning) && metadata.returning) {
            providers.push({ provide: metadata.returning, useValue: joinPoint.returning })
        }

        if (!isUndefined(joinPoint.throwing) && metadata.throwing) {
            providers.push({ provide: metadata.throwing, useValue: joinPoint.throwing });
        }

        return this.advisor.getContainer(advicer.aspectType, this.container).invoke(advicer.aspectType, advicer.advice.propertyKey, ...providers);
    }
}
