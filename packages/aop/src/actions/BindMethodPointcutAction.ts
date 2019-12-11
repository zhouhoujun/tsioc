import { RuntimeActionContext, lang, isUndefined, IocRuntimeAction } from '@tsdi/ioc';
import { IPointcut } from '../joinpoints/IPointcut';
import { isValideAspectTarget } from './isValideAspectTarget';
import { ProxyMethodToken } from '../access/IProxyMethod';



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
        if (!ctx.target || !isValideAspectTarget(ctx.targetType, ctx.reflects)) {
            return next();
        }
        let injector = ctx.injector;
        if (!injector.has(ProxyMethodToken)) {
            return next();
        }

        let proxy = injector.get(ProxyMethodToken);

        let target = ctx.target;
        let targetType = ctx.targetType;

        let className = lang.getClassName(targetType);
        let methods: IPointcut[] = [];
        let decorators = Object.getOwnPropertyDescriptors(targetType.prototype);

        lang.forIn(decorators, (item, name: string) => {
            if (name === 'constructor') {
                return;
            }
            methods.push({
                name: name,
                fullName: `${className}.${name}`,
                descriptor: item
            });
        });

        let allmethods = ctx.reflects.getParamerterNames(targetType);
        lang.forIn(allmethods, (item, name: string) => {
            if (name === 'constructor') {
                return;
            }
            if (isUndefined(decorators[name])) {
                methods.push({
                    name: name,
                    fullName: `${className}.${name}`
                });
            }
        });

        methods.forEach(pointcut => {
            proxy.proceed(target, targetType, pointcut, target['_cache_JoinPoint']);
        });

        next();
    }
}
