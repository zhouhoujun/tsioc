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
