import { ExecDecoratorAtion } from '../ExecDecoratorAtion';
import { DecoratorsRegisterer, DesignRegisterer } from '../DecoratorsRegisterer';

export class DesignDecoratorAction extends ExecDecoratorAtion {
    protected getScopeRegisterer(): DecoratorsRegisterer {
        return this.actInjector.getInstance(DesignRegisterer);
    }
}
