import { InjectService, IInjector, IActionInjector, Modules, Type } from '@tsdi/ioc';
import { InjectLifeScope } from '../injectors/InjectLifeScope';


export class InjectActionService extends InjectService {
    constructor(private acInjector: IActionInjector) {
        super();
    }

    inject(injector: IInjector, ...types: Modules[]): Type[] {
        return this.acInjector.get(InjectLifeScope).register(injector, ...types)
    }
}
