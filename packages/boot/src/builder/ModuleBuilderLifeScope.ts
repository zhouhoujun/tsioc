import { IActionSetup } from '@tsdi/ioc';
import { BuildHandles, AnnoationContext } from '../core';
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
