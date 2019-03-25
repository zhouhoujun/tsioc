import { IocPropertyScope } from '../IocPropertyScope';
import { DesignDecoratorAction } from './DesignDecoratorAction';

export class DesignMethodScope extends IocPropertyScope {
    setup() {
        this.use(DesignDecoratorAction);
    }
}
