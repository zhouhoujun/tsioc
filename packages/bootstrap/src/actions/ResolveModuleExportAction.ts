import { IocResolveAction, ResovleActionContext, Singleton } from '@ts-ioc/ioc';
import { DIModuleExports } from '../services';

@Singleton
export class ResolveModuleExportAction extends IocResolveAction {
    execute(ctx: ResovleActionContext, next: () => void): void {
        let curr = ctx.getRaiseContainer();
        ctx.resolve(DIModuleExports).getResolvers()
            .some(r => {
                r.execResolve(ctx);
                return !!ctx.instance;
            });

        if (!ctx.instance) {
            curr.bindActionContext(ctx);
            next();
        }
    }
}
