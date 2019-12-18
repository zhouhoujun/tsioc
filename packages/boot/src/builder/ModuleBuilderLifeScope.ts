import { IActionSetup } from '@tsdi/ioc';
import { BuildHandles } from './BuildHandles';
import { AnnoationContext } from '../AnnoationContext';
import { RegisterModuleScope } from './RegisterModuleScope';
import { ModuleBuildScope } from './ModuleBuildScope';
/**
 * module build life scope.
 *
 * @export
 * @class ModuleBuilderLifeScope
 * @extends {BuildHandles<AnnoationContext>}
 */
export class ModuleBuilderLifeScope extends BuildHandles<AnnoationContext> implements IActionSetup {

    setup() {
        this.use(RegisterModuleScope)
            .use(ModuleBuildScope);
    }
}
