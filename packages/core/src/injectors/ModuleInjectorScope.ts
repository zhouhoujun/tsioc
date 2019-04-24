import { InjectorScope } from './InjectorAction';
import { DecoratorInjectorScope } from './DecoratorInjectorScope';
import { TypesRegisterScope } from './TypesRegisterScope';
import { InjectCompleteCheckAction } from './InjectCompleteCheckAction';

export class ModuleInjectorScope extends InjectorScope {

    setup() {
        this.use(DecoratorInjectorScope)
            .use(InjectCompleteCheckAction)
            .use(TypesRegisterScope);
    }
}
