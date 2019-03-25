import { IocPropertyScope } from '../IocPropertyScope';
import { RuntimeDecoratorAction } from './RuntimeDecoratorAction';

export class RuntimeMethodScope extends IocPropertyScope {
    setup() {
        this.use(RuntimeDecoratorAction);
    }
}
