import { Directive } from '@tsdi/components';
import { Activity, ActivityContext, ActivityResult } from './Activity';


@Directive({ selector: 'start'})
export class StartActivity extends Activity {
    
    async execute(context: ActivityContext): Promise<ActivityResult> {
        return {
            success: true,
            data: { startTime: Date.now() }
        };
    }
}
