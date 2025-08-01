import { Atteribute, Component } from '@tsdi/components';
import { Activity, ActivityContext, ActivityResult } from './Activity';



@Component({
    selector: 'conditional'
})
export class ConditionalActivity extends Activity {


    @Atteribute()
    condition!: boolean;

    async execute(context: ActivityContext): Promise<ActivityResult> {
        return {
            success: Boolean(this.condition),
            data:this.condition
        };
    }

} 