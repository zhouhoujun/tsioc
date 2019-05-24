import { BuildHandles, AnnoationContext } from '../core';
import { RegisterModuleScope } from './RegisterModuleScope';
import { ModuleBuildScope } from './ModuleBuildScope';


export class ModuleBuilderLifeScope extends BuildHandles<AnnoationContext> {

    setup() {
        this.use(RegisterModuleScope, true)
            .use(ModuleBuildScope, true);
    }
}
