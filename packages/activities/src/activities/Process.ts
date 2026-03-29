import { Attribute, Directive } from '@tsdi/components';
import { Activity, ActivityContext, ActivityResult } from './Activity';

export interface ProcessActivityOptions {
    batchSize?: number;
    timeout?: number;
    onProgress?: (progress: number, current: number, total: number) => void;
}

@Directive({ selector: 'process' })
export class ProcessActivity extends Activity {

    /**
     * 批处理大小
     */
    batchSize?: number;
    /**
     * 处理超时时间（毫秒）
     */
    timeout?: number;
    /**
     * 进度回调函数
     */
    @Attribute() onProgress?: (progress: number, current: number, total: number) => void;
    /**
     * 错误处理函数
     */
    @Attribute() onError?: (error: Error) => Promise<ActivityResult>;
    /**
     * 验证函数
     */
    @Attribute() validator?: (data: any) => Promise<boolean>;

    @Attribute() body!: Activity;


    async execute(context: ActivityContext): Promise<ActivityResult> {

        try {
            // 验证数据
            if (this.validator) {
                const isValid = await this.validator(context);
                if (!isValid) {
                    return {
                        success: false,
                        error: new Error('Data validation failed'),
                        data: { validationFailed: true }
                    };
                }
            }
            this.onProgress?.(0, 0, 1);
            // 处理数据
            const result = await this.body.execute(context);
            return {
                success: true,
                data: result
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
            }

            return {
                success: false,
                error: error as Error,
                data: {
                    processed: false,
                    error: error as Error
                }
            };
        }
    }

  
} 