import { IocDesignAction, DesignActionContext, ProviderTypes, getOwnTypeMetadata, Singleton } from '@tsdi/ioc';
import { RootContainerToken } from '@tsdi/boot';
import { SelectorManager } from './SelectorManager';
import { ActivityConfigure } from './ActivityConfigure';

@Singleton
export class RegSelectorAction extends IocDesignAction {
    execute(ctx: DesignActionContext, next: () => void): void {
        let mgr = this.container.get(RootContainerToken).get(SelectorManager);
        let metas = getOwnTypeMetadata(ctx.currDecoractor, ctx.targetType) as ActivityConfigure<any>[];
        metas.forEach(meta => {
            mgr.set(meta.selector, ctx.targetType, (...providers: ProviderTypes[]) => this.container.get(ctx.targetType, ...providers));
        });

        next();
    }
}
