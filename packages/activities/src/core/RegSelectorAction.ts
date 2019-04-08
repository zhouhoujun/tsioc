import { IocDesignAction, DesignActionContext, ProviderTypes, getOwnTypeMetadata } from '@tsdi/ioc';
import { RootContainerToken } from '@tsdi/boot';
import { SelectorManager } from './SelectorManager';
import { ActivityOption } from './ActivityContext';

export class RegSelectorAction extends IocDesignAction {
    execute(ctx: DesignActionContext, next: () => void): void {
        let mgr = this.container.get(RootContainerToken).get(SelectorManager);
        let metas = getOwnTypeMetadata(ctx.currDecoractor, ctx.targetType) as ActivityOption[];
        metas.forEach(meta => {
            mgr.set(meta.selector, (...providers: ProviderTypes[]) => this.container.get(ctx.targetType, ...providers));
        });

        next();
    }
}
