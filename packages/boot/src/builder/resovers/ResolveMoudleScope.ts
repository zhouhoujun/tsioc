import { CompositeHandle } from '../../core';
import { DecoratorBuildHandle } from './DecoratorBuildHandle';
import { ResolveModuleHandle } from './ResolveModuleHandle';
import { BuildContext } from './BuildContext';
import { BuildDecoratorRegisterer } from './BuildDecoratorRegisterer';
import { ParseScope } from '../parses';
import { InitResolveModuleHandle } from './InitResolveModuleHandle';
import { InitBindingParamHandle } from './InitBindingParamHandle';
import { ModuleBeforeInitHandle } from './ModuleBeforeInitHandle';
import { ModuleAfterInitHandle } from './ModuleAfterInitHandle';
import { ResolveTemplateScope } from './ResolveTemplateScope';
import { BindingComponentDecoratorRegisterer } from './BindingComponentDecoratorRegisterer';
import { BindingTemplateHandle } from './BindingTemplateHandle';
import { ModuleAfterContentInitHandle } from './ModuleAfterContentInitHandle';
import { BindingPropertyHandle } from './BindingPropertyHandle';


export class ResolveMoudleScope extends CompositeHandle<BuildContext> {

    setup() {
        if (!this.container.has(BuildDecoratorRegisterer)) {
            this.container.register(BuildDecoratorRegisterer);
        }
        if (!this.container.has(BindingComponentDecoratorRegisterer)) {
            this.container.register(BindingComponentDecoratorRegisterer);
        }
        this.registerHandle(ParseScope, true);

        this.use(InitResolveModuleHandle)
            .use(InitBindingParamHandle)
            .use(ResolveModuleHandle)
            .use(DecoratorBuildHandle)
            .use(ModuleBeforeInitHandle)
            .use(BindingPropertyHandle)
            .use(ModuleAfterInitHandle)
            .use(ResolveTemplateScope)
            .use(BindingTemplateHandle)
            .use(ModuleAfterContentInitHandle);
    }
}
