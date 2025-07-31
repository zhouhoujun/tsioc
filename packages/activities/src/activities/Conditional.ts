import { Injectable, isFunction } from '@tsdi/ioc';
import { Activity, ActivityContext, ActivityResult } from './Activity';
import { Atteribute, Component } from '@tsdi/components';
import { lastValueFrom, Observable } from 'rxjs';


@Component({
    selector: 'conditional'
})
export class ConditionalActivity extends Activity {


    @Atteribute()
    condition!: boolean | Promise<boolean> | Observable<boolean> | ((context: ActivityContext) => boolean | Promise<boolean> | Observable<boolean>);

    async execute(context: ActivityContext): Promise<ActivityResult> {
        const condition = this.evaluateCondition(context);
        return {
            success: Boolean(condition),
            data: condition
        };
    }

    protected async evaluateCondition(context: ActivityContext): Promise<boolean> {
        const condition = isFunction(this.condition) ? this.condition(context) : this.condition;
        if (condition instanceof Promise) {
            return await condition;
        } else if (condition instanceof Observable) {
            return await lastValueFrom(condition);
        } else {
            return condition;
        }
    }
} 