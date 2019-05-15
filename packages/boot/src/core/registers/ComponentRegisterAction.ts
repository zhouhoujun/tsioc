import { IocDesignAction, DesignActionContext, ProviderTypes, getOwnTypeMetadata } from '@tsdi/ioc';
import { SelectorManager } from '../SelectorManager';
import { ModuleConfigure } from '../modules';
import { RootContainerToken } from '../ContainerPoolToken';


export class ComponentRegisterAction extends IocDesignAction {
    execute(ctx: DesignActionContext, next: () => void): void {
        let mgr = this.container.get(RootContainerToken).get(SelectorManager);
        let metas = getOwnTypeMetadata<ModuleConfigure>(ctx.currDecoractor, ctx.targetType);
        metas.forEach(meta => {
            if (!meta.selector) {
                return;
            }
            if (meta.selector.indexOf(',') > 0) {
                meta.selector.split(',').forEach(sel => {
                    mgr.set(sel.trim(), ctx.targetType, (...providers: ProviderTypes[]) => this.container.get(ctx.targetType, ...providers));
                })
            } else {
                mgr.set(meta.selector, ctx.targetType, (...providers: ProviderTypes[]) => this.container.get(ctx.targetType, ...providers));
            }
        });

        next();
    }
}
