import { Injectable } from '@tsdi/ioc';
import { Activity, ActivityContext, ActivityResult } from './Activity';


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