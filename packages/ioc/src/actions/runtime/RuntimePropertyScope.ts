import { IocPropertyScope } from '../IocPropertyScope';
import { RuntimeDecoratorAction } from './RuntimeDecoratorAction';

export class RuntimePropertyScope extends IocPropertyScope {
    setup() {
        this.use(RuntimeDecoratorAction);
    }
}
