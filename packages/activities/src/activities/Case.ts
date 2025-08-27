import { Attribute, Component } from '@tsdi/components';
import { Activity, ActivityContext, ActivityResult } from './Activity';



@Component({ selector: 'case' })
export class CaseActivity<T> extends Activity {

    @Attribute('case') caseFlag!: T;
    @Attribute() body!: Activity;

    @Attribute() onError?: (context: ActivityContext) => Promise<ActivityResult>

    async execute(context: ActivityContext): Promise<ActivityResult> {

        if (!this.body) {
            return {
                success: false,
                error: new Error('No activity provided for case activity')
            };
        }

        try {
            // 执行活动
            return await this.body.execute(context);
        } catch (error) {
            // 如果有自定义错误处理器，使用它
            if (this.onError) {
                try {
                    return await this.onError(error as Error);
                } catch (handlerError) {
                    return {
                        success: false,
                        error: handlerError as Error,
                        data: {
                            originalError: error,
                            handlerError: handlerError
                        }
                    };
                }
            } else {
                return {
                    success: false,
                    error: error as Error
                }
            }

        }
    }

    async compensate(context: ActivityContext): Promise<void> {
        // 如果条件匹配，执行补偿操作
        if (this.body.compensate) {
            await this.body.compensate(context);
        }
    }
} 