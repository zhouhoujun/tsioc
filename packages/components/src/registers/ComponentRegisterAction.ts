import { IocDesignAction, DesignActionContext, ProviderTypes } from '@tsdi/ioc';
import { SelectorManager } from '../SelectorManager';
import { ModuleConfigure } from '@tsdi/boot';
import { IBindingTypeReflect } from '../bindings';

const attrExp = /^\[\w+\]$/;
/**
 * component register action.
 *
 * @export
 * @class ComponentRegisterAction
 * @extends {IocDesignAction}
 */
export class ComponentRegisterAction extends IocDesignAction {
    execute(ctx: DesignActionContext, next: () => void): void {
        let mgr = ctx.getRaiseContainer().resolve(SelectorManager);
        let metas = ctx.reflects.getMetadata<ModuleConfigure>(ctx.currDecoractor, ctx.targetType);
        let reflects = ctx.targetReflect as IBindingTypeReflect;
        reflects.componentDecorator = ctx.currDecoractor;
        metas.forEach(meta => {
            if (!meta.selector) {
                return;
            }

            reflects.componentSelector = meta.selector;
            if (meta.selector.indexOf(',') > 0) {
                meta.selector.split(',').forEach(sel => {
                    sel = sel.trim();
                    if (attrExp.test(sel)) {
                        reflects.componentSelector = sel;
                    } else {
                        reflects.attrSelector = sel;
                    }
                    mgr.set(sel, ctx.targetType, (...providers: ProviderTypes[]) => this.container.get(ctx.targetType, ...providers));
                })
            } else {
                if (attrExp.test(meta.selector)) {
                    reflects.componentSelector = meta.selector;
                } else {
                    reflects.attrSelector = meta.selector;
                }
                mgr.set(meta.selector, ctx.targetType, (...providers: ProviderTypes[]) => this.container.get(ctx.targetType, ...providers));
            }
        });

        next();
    }
}
