import { IocRegisterAction } from './IocRegisterAction';
import { RegisterActionContext } from './RegisterActionContext';
import { ITypeReflect } from '../services';
import { isClass } from '../utils';
import { Singleton } from '../decorators';

/**
 * init class reflect action.
 *
 * @export
 * @class InitReflectAction
 * @extends {IocRegisterAction}
 */
export class InitReflectAction extends IocRegisterAction<RegisterActionContext> {

    execute(ctx: RegisterActionContext, next?: () => void): void {
        if (!isClass(ctx.targetType)) {
            return;
        }
        if (!ctx.reflects) {
            ctx.reflects = this.container.getTypeReflects();
        }
        if (!ctx.targetReflect && ctx.targetType) {
            let typeRefs = ctx.reflects;
            if (!typeRefs.has(ctx.targetType)) {
                let targetReflect: ITypeReflect = {
                    type: ctx.targetType,
                    classDecors: ctx.reflects.getDecorators(ctx.targetType, 'class').reduce((obj, dec) => {
                        obj[dec] = false;
                        return obj;
                    }, {}),
                    propsDecors: ctx.reflects.getDecorators(ctx.targetType, 'property').reduce((obj, dec) => {
                        obj[dec] = false;
                        return obj;
                    }, {}),
                    methodDecors: ctx.reflects.getDecorators(ctx.targetType, 'method').reduce((obj, dec) => {
                        obj[dec] = false;
                        return obj;
                    }, {}),
                    propProviders: new Map(),
                    methodParams: new Map(),
                    methodParamProviders: new Map(),
                    provides: []
                };
                targetReflect.singleton = ctx.reflects.hasMetadata(Singleton, ctx.targetType);
                typeRefs.set(ctx.targetType, targetReflect);
                ctx.targetReflect = targetReflect;
            } else {
                ctx.targetReflect = typeRefs.get(ctx.targetType);
            }
        }
        if (next) {
            return next();
        }
    }
}
