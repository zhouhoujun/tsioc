import { Component } from '@tsdi/components';
import { Activity, ActivityContext, ActivityResult } from './Activity';


@Component({ selector: 'start'})
export class StartActivity extends Activity {
    
    async execute(context: ActivityContext): Promise<ActivityResult> {
        return {
            success: true,
            data: { startTime: Date.now() }
        };
    }
}
