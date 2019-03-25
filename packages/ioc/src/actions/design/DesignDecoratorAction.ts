import { ExecDecoratorAtion } from '../ExecDecoratorAtion';
import { DecoratorRegisterer, DesignDecoratorRegisterer } from '../../services';

export class DesignDecoratorAction extends ExecDecoratorAtion {
    protected getRegisterer(): DecoratorRegisterer {
        return this.container.resolve(DesignDecoratorRegisterer);
    }
}
