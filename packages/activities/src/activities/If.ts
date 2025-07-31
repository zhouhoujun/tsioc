import { Injectable, isFunction } from '@tsdi/ioc';
import { Activity, ActivityContext, ActivityResult } from './Activity';
import { Atteribute, Component } from '@tsdi/components';
import { lastValueFrom, Observable } from 'rxjs';


export interface IfActivityOptions {
    /**
     * 默认错误处理函数
     */
    defaultErrorHandler?: (error: Error) => Promise<ActivityResult>;
}

@Component({
    selector: 'if'
})
export class IfActivity implements Activity {

    @Atteribute()
    condition!: boolean | Promise<boolean> | Observable<boolean> | ((context: ActivityContext) => boolean | Promise<boolean> | Observable<boolean>);

    @Atteribute()
    thenActivity!: Activity;

    @Atteribute()
    elseActivity?: Activity;

    @Atteribute()
    errorHandler?: (error: Error) => Promise<ActivityResult>;


    protected async evaluateCondition(context: ActivityContext): Promise<boolean> {
        const condition = isFunction(this.condition) ? this.condition(context) : this.condition;
        if (condition instanceof Promise) {
            return await condition;
        } else if (condition instanceof Observable) {
            return await lastValueFrom(condition);
        } else {
            return condition;
        }
    }

    async execute(context: ActivityContext): Promise<ActivityResult> {

        if (!this.thenActivity) {
            return {
                success: false,
                error: new Error('No then activity provided for if activity')
            };
        }

        try {
            // 评估条件
            const conditionResult = await this.evaluateCondition(context);

            // 根据条件选择要执行的活动
            const activityToExecute = conditionResult ? this.thenActivity : this.elseActivity;

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
                    condition: conditionResult,
                    result: result.data
                }
            };
        } catch (error) {
            // 如果有自定义错误处理器，使用它
            if (this.errorHandler) {
                try {
                    return await this.errorHandler(error as Error);
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
        const conditionResult = await this.evaluateCondition(context);
        const activityToCompensate = conditionResult ? this.thenActivity : this.elseActivity;

        if (activityToCompensate?.compensate) {
            await activityToCompensate.compensate(context);
        }
    }
} 