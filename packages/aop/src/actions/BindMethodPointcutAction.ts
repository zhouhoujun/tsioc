import { RuntimeActionContext, lang, isUndefined, IocRuntimeAction } from '@tsdi/ioc';
import { IPointcut } from '../joinpoints/IPointcut';
import { isValideAspectTarget } from './isValideAspectTarget';
import { ProxyMethodToken } from '../access/IProxyMethod';
import { AdvisorToken } from '../IAdvisor';



/**
 * bind method pointcut action.
 *
 * @export
 * @class BindMethodPointcutAction
 * @extends {IocRuntimeAction}
 */
export class BindMethodPointcutAction extends IocRuntimeAction {

    /**
     * execute bind method pointcut action.
     *
     * @param {RuntimeActionContext} ctx
     * @param {() => void} next
     * @returns {void}
     * @memberof BindMethodPointcutAction
     */
    execute(ctx: RuntimeActionContext, next: () => void): void {
        // aspect class do nothing.
        if (!ctx.target || !isValideAspectTarget(ctx.type, ctx.reflects)) {
            return next();
        }
        let injector = ctx.injector;

        let proxy = injector.get(ProxyMethodToken);
        if (!proxy) {
            return next();
        }

        let target = ctx.target;
        let targetType = ctx.type;

        let className = lang.getClassName(targetType);
        let decorators = Object.getOwnPropertyDescriptors(targetType.prototype);
        let advisor = injector.get(AdvisorToken);
        let advicesMap = advisor.getAdviceMap(targetType);

        if (advicesMap && advicesMap.size) {
            advicesMap.forEach((advices, name) => {
                if (name === 'constructor') {
                    return;
                }
                let pointcut = {
                    name: name,
                    fullName: `${className}.${name}`,
                    descriptor: decorators[name]
                }
                proxy.proceed(target, targetType, advices, pointcut, target['_cache_JoinPoint'])
            });
        }

        next();
    }
}
