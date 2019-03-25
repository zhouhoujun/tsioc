import { Singleton } from '../decorators';
import { IocRegisterAction } from './IocRegisterAction';
import { RegisterActionContext } from './RegisterActionContext';
import { ITypeReflect, MetadataService } from '../services';
import { hasOwnClassMetadata } from '../factories';
import { isNumber, isClass } from '../utils';
import { PropertyMetadata } from '../metadatas';

/**
 * init class reflect action.
 *
 * @export
 * @class InitReflectAction
 * @extends {IocRegisterAction}
 */
export class InitReflectAction extends IocRegisterAction<RegisterActionContext> {

    execute(ctx: RegisterActionContext, next: () => void): void {
        if (!isClass(ctx.targetType)) {
            return;
        }
        if (!ctx.targetReflect && ctx.targetType) {
            let typeRefs = this.container.getTypeReflects();
            let metaSer = this.container.get(MetadataService);
            if (!typeRefs.has(ctx.targetType)) {
                let targetReflect: ITypeReflect = {
                    type: ctx.targetType,
                    props: new Map(),
                    methodParams: new Map(),
                    methodParamProviders: new Map(),
                    annotations: new Map(),
                    provides: []
                };
                let map = targetReflect.annotations;
                let singleton = false;
                metaSer.eachClassMetadata(ctx.targetType, (meta, decor) => {
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

                let propsMap = ctx.targetReflect.props;
                metaSer.eachPropMetadata(ctx.targetType, (meta, propertyKey, decor) => {
                    let map: Map<string, PropertyMetadata>;
                    if (propsMap.has(decor)) {
                        map = propsMap.get(decor);
                    } else {
                        map = new Map();
                        propsMap.set(decor, map);
                    }
                    if (map.has(propertyKey)) {
                        map.set(propertyKey, Object.assign(map.get(propertyKey), meta));
                    } else {
                        map.set(propertyKey, Object.assign({}, meta));
                    }
                });

            } else {
                ctx.targetReflect = typeRefs.get(ctx.targetType);
            }
        }
        return next();
    }
}
