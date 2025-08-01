import { Atteribute, Component } from '@tsdi/components';
import { Activity, ActivityContext, ActivityResult } from './Activity';
import { ConditionalActivity } from './Conditional';


export interface IfActivityOptions {
    /**
     * 默认错误处理函数
     */
    defaultErrorHandler?: (error: Error) => Promise<ActivityResult>;
}

@Component({
    selector: 'if'
})
export class IfActivity extends ConditionalActivity implements Activity {

    @Atteribute('then')
    thenActivity!: Activity;

    @Atteribute('else')
    elseActivity?: Activity;

    @Atteribute()
    onError?: (error: Error) => Promise<ActivityResult>;


    override async execute(context: ActivityContext): Promise<ActivityResult> {

        if (!this.thenActivity) {
            return {
                success: false,
                error: new Error('No then activity provided for if activity')
            };
        }

        try {
            // 根据条件选择要执行的活动
            const activityToExecute = this.condition ? this.thenActivity : this.elseActivity;

            // 如果没有 else 活动且条件为 false，返回成功结果
            if (!activityToExecute) {
                return {
                    success: true,
                    data: { condition: false }
                };
            }

            // 执行选定的活动
            const result = await activityToExecute.execute(context);
            return {
                success: result.success,
                error: result.error,
                data: {
                    condition: this.condition,
                    result: result.data
                }
            };
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
        // 根据条件执行补偿操作
        const activityToCompensate = this.condition ? this.thenActivity : this.elseActivity;

        if (activityToCompensate?.compensate) {
            await activityToCompensate.compensate(context);
        }
    }
} 