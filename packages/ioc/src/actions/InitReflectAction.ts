import { IocRegisterAction } from './IocRegisterAction';
import { RegisterActionContext } from './RegisterActionContext';
import { ITypeReflect } from '../services';
import { isClass } from '../utils';
import { Singleton } from '../decorators';
import { hasOwnClassMetadata, getClassDecorators, getPropDecorators, getMethodDecorators } from '../factories/DecoratorFactory';

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
        if (!ctx.targetReflect && ctx.targetType) {
            let typeRefs = this.container.getTypeReflects();
            if (!typeRefs.has(ctx.targetType)) {
                let targetReflect: ITypeReflect = {
                    type: ctx.targetType,
                    classDecors: getClassDecorators(ctx.targetType).reduce((obj, dec) => {
                        obj[dec] = false;
                        return obj;
                    }, {}),
                    propsDecors: getPropDecorators(ctx.targetType).reduce((obj, dec) => {
                        obj[dec] = false;
                        return obj;
                    }, {}),
                    methodDecors: getMethodDecorators(ctx.targetType).reduce((obj, dec) => {
                        obj[dec] = false;
                        return obj;
                    }, {}),
                    propProviders: new Map(),
                    methodParams: new Map(),
                    methodParamProviders: new Map(),
                    provides: []
                };
                targetReflect.singleton = hasOwnClassMetadata(Singleton, ctx.targetType);
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
