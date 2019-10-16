import { ExecDecoratorAtion } from '../ExecDecoratorAtion';
import { DecoratorScopeRegisterer, DesignRegisterer } from '../DecoratorRegisterer';

export class DesignDecoratorAction extends ExecDecoratorAtion {
    protected getScopeRegisterer(): DecoratorScopeRegisterer {
        return this.container.getInstance(DesignRegisterer);
    }
}
