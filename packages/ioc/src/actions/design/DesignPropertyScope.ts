import { IocPropertyScope } from '../IocPropertyScope';
import { DesignDecoratorAction } from './DesignDecoratorAction';

export class DesignPropertyScope extends IocPropertyScope {
    setup() {
        this.use(DesignDecoratorAction);
    }
}
