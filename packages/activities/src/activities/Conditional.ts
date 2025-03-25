import { Injectable } from '@tsdi/ioc';
import { Activity, ActivityContext, ActivityResult } from './Activity';

@Injectable()
export class ConditionalActivity extends Activity {
    name = 'conditional';
    
    async execute(context: ActivityContext): Promise<ActivityResult> {
        const condition = context.condition;
        return {
            success: Boolean(condition),
            data: { evaluated: condition }
        };
    }
} 