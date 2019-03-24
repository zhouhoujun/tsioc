import { Singleton } from '../decorators';
import { IocRegisterAction } from './IocRegisterAction';
import { RegisterActionContext } from './RegisterActionContext';
import { DecoratorRegisterer, ITypeReflect } from '../services';
import { hasOwnClassMetadata } from '../factories';
import { isNumber } from '../utils';

/**
 * init class reflect action.
 *
 * @export
 * @class InitReflectAction
 * @extends {IocRegisterAction}
 */
export class InitReflectAction extends IocRegisterAction<RegisterActionContext> {

    execute(ctx: RegisterActionContext, next: () => void): void {
        if (!ctx.targetType) {
            return;
        }
        if (!ctx.targetReflect && ctx.targetType) {
            let typeRefs = this.container.getTypeReflects();
            let dreg = this.container.resolve(DecoratorRegisterer);
            if (!typeRefs.has(ctx.targetType)) {
                let targetReflect: ITypeReflect = {
                    type: ctx.targetType,
                    props: new Map(),
                    methodParams: new Map(),
                    methodProviders: new Map(),
                    annotations: new Map(),
                    provides: []
                };
                let map = targetReflect.annotations;
                let singleton = false;
                let x;
                dreg.eachClassMetadata(ctx.targetType, (meta, decor) => {
                    if (meta) {
                        return;
                    }
                    if (!singleton) {
                        singleton = meta.singleton;
                    }
                    if (isNumber(meta.expires) && meta.expires > 0) {
                        targetReflect.expires = meta.expires;
                    }
                    if (map.has(decor)) {
                        map.set(decor, Object.assign(map.get(decor), meta));
                    } else {
                        map.set(decor, Object.assign({}, meta));
                    }
                });
                targetReflect.singleton = hasOwnClassMetadata(Singleton, ctx.targetType) || singleton;

                map = ctx.targetReflect.props;
                dreg.eachPropMetadata(ctx.targetType, (meta, propertyKey, decor) => {
                    let key = `${propertyKey}__${decor}`;
                    if (map.has(key)) {
                        map.set(key, Object.assign(map.get(key), meta));
                    } else {
                        map.set(key, Object.assign({}, meta));
                    }
                });

            } else {
                ctx.targetReflect = typeRefs.get(ctx.targetType);
            }
        }
        return next();
    }
}
