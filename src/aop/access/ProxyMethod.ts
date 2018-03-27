import { NonePointcut, Provider, Injectable, Singleton, Inject } from '../../core/index';
import { Advicer, Advices } from '../advices/index';
import { JoinpointState, IPointcut } from '../joinpoints/index';
import { Joinpoint } from '../joinpoints/index';
import { IContainer } from '../../IContainer';
import { IAdvisor } from '../IAdvisor';
import { isFunction, isUndefined, isArray, isPromise, isObservable, symbols } from '../../utils/index';
import { Type } from '../../types';
import { LifeScope } from '../../LifeScope';
import { IProxyMethod } from './IProxyMethod';
import { IMethodAccessor } from '../../IMethodAccessor';
import { IAdvisorChainFactory } from './IAdvisorChainFactory';

@NonePointcut()
@Singleton(symbols.IProxyMethod)
export class ProxyMethod implements IProxyMethod {

    constructor(@Inject(symbols.IContainer) private container: IContainer) {

    }

    _aspectMgr: IAdvisor;
    get aspectMgr(): IAdvisor {
        if (!this._aspectMgr) {
            this._aspectMgr = this.container.get<IAdvisor>(symbols.IAdvisor);
        }
        return this._aspectMgr;
    }

    _liefScope: LifeScope;
    get liefScope(): LifeScope {
        if (!this._liefScope) {
            this._liefScope = this.container.getLifeScope();
        }
        return this._liefScope;
    }

    proceed(target: any, targetType: Type<any>, pointcut: IPointcut, provJoinpoint?: Joinpoint) {

        let aspectMgr = this.aspectMgr;
        let fullName = pointcut.fullName;
        let methodName = pointcut.name;

        let advices = aspectMgr.getAdvices(fullName);
        if (advices && pointcut) {
            if (pointcut.descriptor && (pointcut.descriptor.get || pointcut.descriptor.set)) {
                if (pointcut.descriptor.get) {
                    let getMethod = pointcut.descriptor.get.bind(target);
                    pointcut.descriptor.get = this.proxy(getMethod, advices, target, targetType, pointcut, provJoinpoint);
                }
                if (pointcut.descriptor.set) {
                    let setMethod = pointcut.descriptor.set.bind(target);
                    pointcut.descriptor.set = this.proxy(setMethod, advices, target, targetType, pointcut, provJoinpoint);
                }
                Object.defineProperty(target, methodName, pointcut.descriptor);
            } else if (isFunction(target[methodName])) {
                let propertyMethod = target[methodName].bind(target);
                target[methodName] = this.proxy(propertyMethod, advices, target, targetType, pointcut, provJoinpoint);
            }
        }
    }

    proxy(propertyMethod: Function, advices: Advices, target: any, targetType: Type<any>, pointcut: IPointcut, provJoinpoint?: Joinpoint) {
        let aspectMgr = this.aspectMgr;
        let fullName = pointcut.fullName;
        let methodName = pointcut.name;
        let liefScope = this.liefScope;
        let container = this.container;

        return (...args: any[]) => {
            let joinPoint = this.container.resolve(Joinpoint, Provider.create('options', {
                name: methodName,
                fullName: fullName,
                provJoinpoint: provJoinpoint,
                annotations: provJoinpoint ? null : liefScope.getMethodMetadatas(targetType, methodName),
                params: liefScope.getMethodParameters(targetType, target, methodName),
                args: args,
                target: target,
                targetType: targetType
            }));

            let adChain = container.resolve<IAdvisorChainFactory>(symbols.IAdvisorChainFactory, { container: container, advices: advices });
            adChain.invoaction(joinPoint, JoinpointState.Before);
            adChain.invoaction(joinPoint, JoinpointState.Pointcut);
            let val, exeErr;
            try {
                val = propertyMethod(...joinPoint.args);
            } catch (err) {
                exeErr = err;
            }

            adChain.invoaction(joinPoint, JoinpointState.After, val);
            if (exeErr) {
                adChain.invoaction(joinPoint, JoinpointState.AfterThrowing, exeErr);
            } else {
                adChain.invoaction(joinPoint, JoinpointState.AfterReturning, val);
                return joinPoint.returning;
            }
        }
    }
}
