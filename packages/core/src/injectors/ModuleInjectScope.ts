import { IActionSetup } from '@tsdi/ioc';
import { InjectScope } from './InjectAction';
import { DecoratorInjectScope } from './DecoratorInjectScope';
import { TypesRegisterScope } from './TypesRegisterScope';
import { InjectCompleteCheckAction } from './InjectCompleteCheckAction';


export class ModuleInjectScope extends InjectScope implements IActionSetup {

    setup() {
        this.use(DecoratorInjectScope)
            .use(InjectCompleteCheckAction)
            .use(TypesRegisterScope);
    }
}
