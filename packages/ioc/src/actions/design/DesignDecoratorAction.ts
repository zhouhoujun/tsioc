import { ExecDecoratorAtion } from '../ExecDecoratorAtion';
import { DecoratorScopeRegisterer } from '../DecoratorRegisterer';

export class DesignDecoratorAction extends ExecDecoratorAtion {
    protected getScopeRegisterer(): DecoratorScopeRegisterer {
        return this.container.getDesignRegisterer();
    }
}
