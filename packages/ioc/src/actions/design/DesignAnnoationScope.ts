import { IocAnnoationScope } from '../IocAnnotainScope';
import { DesignDecoratorAction } from './DesignDecoratorAction';

export class DesignAnnoationScope extends IocAnnoationScope {
    setup() {
        this.use(DesignDecoratorAction);
    }

}
