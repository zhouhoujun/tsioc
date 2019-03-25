import { IocAnnoationScope } from '../IocAnnotainScope';
import { RuntimeDecoratorAction } from './RuntimeDecoratorAction';

export class RuntimeAnnoationScope extends IocAnnoationScope {
    setup() {
        this.use(RuntimeDecoratorAction);
    }
}
