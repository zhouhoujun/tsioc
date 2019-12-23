import { IocDesignAction, DesignActionContext, CTX_CURR_DECOR } from '@tsdi/ioc';
import { IComponentReflect } from '../IComponentReflect';
import { attrExp } from '../bindings/exps';
import { IComponentMetadata } from '../decorators/IComponentMetadata';


/**
 * component register action.
 *
 * @export
 * @class ComponentRegisterAction
 * @extends {IocDesignAction}
 */
export class ComponentRegisterAction extends IocDesignAction {
    execute(ctx: DesignActionContext, next: () => void): void {
        let currDecor = ctx.get(CTX_CURR_DECOR);
        let metas = ctx.reflects.getMetadata<IComponentMetadata>(currDecor, ctx.targetType);
        let reflects = ctx.targetReflect as IComponentReflect;
        reflects.decorator = currDecor;
        reflects.component = true;
        metas.forEach(meta => {
            if (!meta.selector) {
                return;
            }
            if (meta.selector.indexOf(',') > 0) {
                meta.selector.split(',').forEach(sel => {
                    sel = sel.trim();
                    if (attrExp.test(sel)) {
                        reflects.attrSelector = sel;
                    } else {
                        reflects.selector = sel;
                    }
                    // mgr.set(sel, ctx.targetType, (...providers: ProviderTypes[]) => this.container.get(ctx.targetType, ...providers));
                })
            } else {
                if (attrExp.test(meta.selector)) {
                    reflects.attrSelector = meta.selector;
                } else {
                    reflects.selector = meta.selector;
                }
                // mgr.set(meta.selector, ctx.targetType, (...providers: ProviderTypes[]) => this.container.get(ctx.targetType, ...providers));
            }
        });

        next();
    }
}
