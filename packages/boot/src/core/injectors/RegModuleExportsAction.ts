import { AnnoationAction } from './AnnoationAction';
import { AnnoationActionContext } from './AnnoationActionContext';
import { ContainerPoolToken } from '../ContainerPoolToken';
import { DIModuleExports } from './DIModuleExports';
import { RegFor } from '../modules';

export class RegModuleExportsAction extends AnnoationAction {
    execute(ctx: AnnoationActionContext, next: () => void): void {
        if (ctx.moduleResolver && ctx.regScope === RegFor.child) {
            let pool = this.container.get(ContainerPoolToken);
            let parent = pool.getParent(ctx.getRaiseContainer());
            if (parent) {
                let diexports = parent.resolve(DIModuleExports);
                diexports.use(ctx.moduleResolver);
            }
        }
        next();
    }
}
