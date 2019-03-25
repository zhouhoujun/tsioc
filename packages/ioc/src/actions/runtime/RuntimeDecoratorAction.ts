import { ExecDecoratorAtion } from '../ExecDecoratorAtion';
import { DecoratorRegisterer, RuntimeDecoratorRegisterer } from '../../services';

export class RuntimeDecoratorAction extends ExecDecoratorAtion {
    protected getRegisterer(): DecoratorRegisterer {
        return this.container.resolve(RuntimeDecoratorRegisterer);
    }
}
