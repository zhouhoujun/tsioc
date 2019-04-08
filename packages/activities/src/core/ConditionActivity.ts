import { ActivityContext } from './ActivityContext';
import { Activity } from './Activity';
import { Task } from '../decorators';



@Task({
    selector: 'condition'
})
export class ConditionActivity<T extends ActivityContext> extends Activity<T> {

    async execute(ctx: T, next: () => Promise<void>): Promise<void> {
        let condition = await this.resolveSelector<boolean>(ctx);
        if (condition) {
            await next();
        }
    }
}
