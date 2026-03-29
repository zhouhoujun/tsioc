import { Attribute, Directive } from '@tsdi/components';
import { Activity, ActivityContext, ActivityResult } from './Activity';



@Directive({
    selector: 'conditional'
})
export class ConditionalActivity extends Activity {


    @Attribute()
    condition!: boolean;

    async execute(context: ActivityContext): Promise<ActivityResult> {
        return {
            success: Boolean(this.condition),
            data:this.condition
        };
    }

} 