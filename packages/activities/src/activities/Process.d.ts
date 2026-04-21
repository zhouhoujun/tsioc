import { Activity, ActivityContext, ActivityResult } from './Activity';
export interface ProcessActivityOptions {
    batchSize?: number;
    timeout?: number;
    onProgress?: (progress: number, current: number, total: number) => void;
}
export declare class ProcessActivity extends Activity {
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
    onProgress?: (progress: number, current: number, total: number) => void;
    /**
     * 错误处理函数
     */
    onError?: (error: Error) => Promise<ActivityResult>;
    /**
     * 验证函数
     */
    validator?: (data: any) => Promise<boolean>;
    body: Activity;
    execute(context: ActivityContext): Promise<ActivityResult>;
}
