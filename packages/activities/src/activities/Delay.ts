import { Attribute, Component } from '@tsdi/components';
import { Activity, ActivityContext, ActivityResult } from './Activity';

export interface DelayActivityOptions {
    duration?: number;
    body?: Activity;
}

@Component({ selector: 'delay' })
export class DelayActivity extends Activity {

    /**
     * 延迟时间（毫秒）
     */
    @Attribute() duration!: number;

    @Attribute() body: Activity | undefined;


    private abortController: AbortController | null = null;


    execute(context: ActivityContext): Promise<ActivityResult> {

        return new Promise((resolve, reject) => {
            // 设置中断处理
            if (this.abortController) {
                this.abortController.signal.addEventListener('abort', () => {
                    reject(new DOMException('Delay aborted', 'AbortError'));
                });
            }
            setTimeout(resolve, this.duration);
        })
            .then(() => this.body ? this.body.execute(context) : ({ success: true, data: { completed: true } }))
            .catch(error => {
                return {
                    success: false,
                    data: { interrupted: true },
                    error
                };
            })
            .finally(() => [
                this.abortController = null
            ]);
    }

    async compensate(context: ActivityContext): Promise<void> {
        // 中断当前延迟
        if (this.abortController) {
            this.abortController.abort();
        }
    }
    
}
