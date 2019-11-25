import { AnnoationAction } from './AnnoationAction';
import { AnnoationContext } from '../AnnoationContext';
import { ContainerPoolToken } from '../ContainerPoolToken';
import { DIModuleExports } from './DIModuleExports';
import { RegFor } from '../modules';
import { CTX_MODULE_RESOLVER } from '../../context-tokens';

export class RegModuleExportsAction extends AnnoationAction {
    execute(ctx: AnnoationContext, next: () => void): void {
        if (ctx.has(CTX_MODULE_RESOLVER) && ctx.regFor === RegFor.child) {
            let pool = this.container.get(ContainerPoolToken);
            let parent = pool.getParent(ctx.getContainer());
            if (parent) {
                let diexports = parent.resolve(DIModuleExports);
                diexports.use(ctx.get(CTX_MODULE_RESOLVER));
            }
        }
        next();
    }
}
