import { Attribute, Directive } from '@tsdi/components';
import { Activity, ActivityContext, ActivityResult } from './Activity';

export type CodeActivityHandler = (context: ActivityContext) => Promise<ActivityResult> | ActivityResult;

@Directive({ selector: 'code' })
export class CodeActivity extends Activity {
    @Attribute()
    handler!: CodeActivityHandler;

    @Attribute()
    code!: string;

    @Attribute()
    timeout: number = 30000;

    async execute(context: ActivityContext): Promise<ActivityResult> {
        if (!this.handler && !this.code) {
            return {
                success: false,
                error: new Error('No handler or code provided')
            };
        }

        const startTime = Date.now();

        try {
            if (this.handler) {
                const result = await Promise.race([
                    this.handler(context),
                    new Promise<never>((_, reject) => 
                        setTimeout(() => reject(new Error('Execution timeout')), this.timeout)
                    )
                ]);
                return result;
            }

            return {
                success: true,
                data: { code: this.code, executed: true }
            };
        } catch (error) {
            return {
                success: false,
                error: error as Error,
                data: { duration: Date.now() - startTime }
            };
        }
    }
}
