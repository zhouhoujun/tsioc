import { Injectable } from '@tsdi/ioc';
import { Activity, ActivityContext, ActivityResult } from './Activity';

@Injectable()
export class StartActivity extends Activity {
    name = 'start';
    
    async execute(context: ActivityContext): Promise<ActivityResult> {
        return {
            success: true,
            data: { startTime: Date.now() }
        };
    }
}

@Injectable()
export class EndActivity extends Activity {
    name = 'end';
    
    async execute(context: ActivityContext): Promise<ActivityResult> {
        return {
            success: true,
            data: { endTime: Date.now() }
        };
    }
}

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