import { IocDesignAction, DesignActionContext, ProviderTypes, getOwnTypeMetadata } from '@tsdi/ioc';
import { RootContainerToken } from '@tsdi/boot';
import { SelectorManager } from '../SelectorManager';
import { ActivityConfigure } from '../ActivityConfigure';


export class RegSelectorAction extends IocDesignAction {
    execute(ctx: DesignActionContext, next: () => void): void {
        let mgr = this.container.get(RootContainerToken).get(SelectorManager);
        let metas = getOwnTypeMetadata(ctx.currDecoractor, ctx.targetType) as ActivityConfigure[];
        metas.forEach(meta => {
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
