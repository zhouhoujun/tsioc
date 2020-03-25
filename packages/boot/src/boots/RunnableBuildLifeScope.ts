import { IActionSetup } from '@tsdi/ioc';
import { BuildHandles } from '../builder/BuildHandles';
import { IAnnoationContext } from '../AnnoationContext';
import { RegisterModuleScope, ModuleBuildScope, ResolveRunnableScope, StartupBootHandle } from './boot-handles';


export class RunnableBuildLifeScope extends BuildHandles<IAnnoationContext> implements IActionSetup {

    setup() {
        this.use(RegisterModuleScope)
            .use(ModuleBuildScope)
            .use(ResolveRunnableScope)
            .use(StartupBootHandle);
    }
}
