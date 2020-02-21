import {
    Type, isFunction, lang, IProviders, InvokedProviders, ITypeReflects, TypeReflectsToken, IocCompositeAction, IParameter, IActionSetup
} from '@tsdi/ioc';
import { Advices } from '../advices/Advices';
import { IPointcut } from '../joinpoints/IPointcut';
import { Joinpoint } from '../joinpoints/Joinpoint';
import { JoinpointState } from '../joinpoints/JoinpointState';
import { AdvisorToken } from '../IAdvisor';
import { MethodAdvicesScope } from './MethodAdvicesScope';

const proxyFlag = '_proxy';
/**
 * Proxy method.
 *
 * @export
 * @class ProxyMethod
 * @implements {IProxyMethod}
 */
export class ProceedingScope extends IocCompositeAction<Joinpoint> implements IActionSetup {

    execute(ctx: Joinpoint, next?: () => void) {
        ctx.providers.inject({ provide: Joinpoint, useValue: ctx });
        super.execute(ctx, next);
    }

    private _reflects: ITypeReflects;
    get reflects(): ITypeReflects {
        if (!this._reflects) {
            this._reflects = this.actInjector.getInstance(TypeReflectsToken);
        }
        return this._reflects;
    }

    beforeConstr(targetType: Type, params: IParameter[], args: any[], providers: IProviders) {
        let propertykey = 'constructor';
        let advices = this.actInjector.getInstance(AdvisorToken).getAdvices(targetType, propertykey);
        if (!advices) {
            return;
        }

        let className = lang.getClassName(targetType);
        let joinPoint = Joinpoint.parse(this.reflects.getInjector(targetType), {
            name: 'constructor',
            state: JoinpointState.Before,
            advices: advices,
            fullName: className + '.constructor',
            args: args,
            params: params,
            targetType: targetType,
            providers: providers
        });
        this.execute(joinPoint);
    }

    afterConstr(target: any, targetType: Type, params: IParameter[], args: any[], providers: IProviders) {
        let propertykey = 'constructor';
        let advices = this.actInjector.getInstance(AdvisorToken).getAdvices(targetType, propertykey);
        if (!advices) {
            return;
        }

        let className = lang.getClassName(targetType);
        let joinPoint = Joinpoint.parse(this.reflects.getInjector(targetType), {
            name: 'constructor',
            state: JoinpointState.After,
            advices: advices,
            fullName: className + '.constructor',
            args: args,
            params: params,
            target: target,
            targetType: targetType,
            providers: providers
        });
        this.execute(joinPoint);
    }

    /**
     * proceed the proxy method.
     *
     * @param {*} target
     * @param {Type} targetType
     * @param {IPointcut} pointcut
     * @param {Joinpoint} [provJoinpoint]
     * @memberof ProxyMethod
     */
    proceed(target: any, targetType: Type, advices: Advices, pointcut: IPointcut, provJoinpoint?: Joinpoint) {
        let methodName = pointcut.name;
        if (advices && pointcut) {
            if (pointcut.descriptor && (pointcut.descriptor.get || pointcut.descriptor.set)) {
                if (pointcut.descriptor.get && !pointcut.descriptor.get[proxyFlag]) {
                    let getMethod = pointcut.descriptor.get.bind(target);
                    pointcut.descriptor.get = this.proxy(getMethod, advices, target, targetType, pointcut, provJoinpoint);
                    pointcut.descriptor.get[proxyFlag] = true;
                }
                if (pointcut.descriptor.set && !pointcut.descriptor.set[proxyFlag]) {
                    let setMethod = pointcut.descriptor.set.bind(target);
                    pointcut.descriptor.set = this.proxy(setMethod, advices, target, targetType, pointcut, provJoinpoint);
                    pointcut.descriptor.set[proxyFlag] = true;
                }
                Reflect.defineProperty(target, methodName, pointcut.descriptor);
            } else if (isFunction(target[methodName]) && !target[methodName][proxyFlag]) {
                let propertyMethod = target[methodName].bind(target);
                target[methodName] = this.proxy(propertyMethod, advices, target, targetType, pointcut, provJoinpoint);
                target[methodName][proxyFlag] = true;
            }
        }
    }

    proxy(propertyMethod: Function, advices: Advices, target: any, targetType: Type, pointcut: IPointcut, provJoinpoint?: Joinpoint) {
        let fullName = pointcut.fullName;
        let methodName = pointcut.name;
        let reflects = this.reflects;
        let self = this;
        return (...args: any[]) => {
            let larg = lang.last(args);
            let cuurPrd: IProviders = null;
            if (larg instanceof InvokedProviders) {
                args = args.slice(0, args.length - 1);
                cuurPrd = larg;
            }
            let joinPoint = Joinpoint.parse(reflects.getInjector(targetType), {
                name: methodName,
                fullName: fullName,
                params: reflects.getParameters(targetType, target, methodName),
                args: args,
                target: target,
                targetType: targetType,
                advices: advices,
                originMethod: propertyMethod,
                provJoinpoint: provJoinpoint,
                annotations: reflects.getMetadatas(targetType, methodName, 'method'),
                providers: cuurPrd
            });

            self.execute(joinPoint);
            let returning = joinPoint.returning;
            return returning;
        }
    }

    setup() {
        this.use(ConstrBeforeAdviceAction)
            .use(ConstrAfterAdviceAction)
            .use(MethodAdvicesScope);
    }
}

export const ConstrBeforeAdviceAction = function (ctx: Joinpoint, next: () => void): void {
    if (ctx.name === 'constructor' && ctx.state === JoinpointState.Before) {
        let advices = ctx.advices;
        let injector = ctx.injector;
        let providers = ctx.providers;
        advices.Before.forEach(advicer => {
            injector.invoke(advicer.aspectType, advicer.advice.propertyKey, providers);
        });

        advices.Pointcut.forEach(advicer => {
            injector.invoke(advicer.aspectType, advicer.advice.propertyKey, providers);
        });

        advices.Around.forEach(advicer => {
            injector.invoke(advicer.aspectType, advicer.advice.propertyKey, providers);
        });
    } else {
        next();
    }
}


export const ConstrAfterAdviceAction = function (ctx: Joinpoint, next: () => void): void {
    if (ctx.name === 'constructor' && ctx.state === JoinpointState.After) {
        let advices = ctx.advices;
        let injector = ctx.injector;
        let providers = ctx.providers;
        advices.After.forEach(advicer => {
            injector.invoke(advicer.aspectType, advicer.advice.propertyKey, providers);
        });

        advices.Around.forEach(advicer => {
            injector.invoke(advicer.aspectType, advicer.advice.propertyKey, providers);
        });
    } else {
        next();
    }
}

