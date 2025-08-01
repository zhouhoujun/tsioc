import { Component } from '@tsdi/components';
import { Activity, ActivityContext, ActivityResult } from './Activity';



@Component({ selector: 'end'})
export class EndActivity extends Activity {
    
    async execute(context: ActivityContext): Promise<ActivityResult> {
        return {
            success: true,
            data: { endTime: Date.now() }
        };
    }
}