import { ExecDecoratorAtion } from '../ExecDecoratorAtion';
import { DecorsRegisterer, DesignRegisterer } from '../DecoratorsRegisterer';

export class DesignDecorAction extends ExecDecoratorAtion {
    protected getScopeRegisterer(): DecorsRegisterer {
        return this.actInjector.getInstance(DesignRegisterer);
    }
}
