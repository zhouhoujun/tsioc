import { Activity, ActivityContext, ActivityResult } from '../activities/Activity';

/**
 * Activity interceptor type for intercepting activity execution.
 * 用于拦截活动执行的拦截器类型
 */
export type ActivityInterceptorType = 'before' | 'after' | 'around' | 'onError';

/**
 * Activity interceptor interface.
 * 活动拦截器接口
 */
export interface IActivityInterceptor {
    /**
     * Interceptor type
     * 拦截器类型
     */
    type: ActivityInterceptorType;
    /**
     * Interceptor priority (lower = earlier execution)
     * 拦截器优先级（越小越早执行）
     */
    priority?: number;
    /**
     * Filter for activity names (supports wildcards)
     * 活动名称过滤器（支持通配符）
     */
    activityFilter?: string | RegExp | ((activityName: string) => boolean);
    /**
     * Execute before activity runs
     * 在活动运行前执行
     */
    before?(context: ActivityContext, activity: Activity): Promise<ActivityContext> | ActivityContext;
    /**
     * Execute after activity completes successfully
     * 在活动成功完成后执行
     */
    after?(context: ActivityContext, activity: Activity, result: ActivityResult): Promise<ActivityResult> | ActivityResult;
    /**
     * Execute around activity (can control execution)
     * 环绕活动执行（可以控制执行）
     */
    around?(context: ActivityContext, activity: Activity, proceed: () => Promise<ActivityResult>): Promise<ActivityResult>;
    /**
     * Execute when activity fails
     * 活动失败时执行
     */
    onError?(context: ActivityContext, activity: Activity, error: Error): Promise<ActivityResult> | ActivityResult;
}

/**
 * Interceptor registration options.
 * 拦截器注册选项
 */
export interface InterceptorRegistration {
    /**
     * Interceptor instance
     * 拦截器实例
     */
    interceptor: IActivityInterceptor;
    /**
     * Whether interceptor is enabled
     * 拦截器是否启用
     */
    enabled?: boolean;
}

/**
 * Activity execution event for logging/debugging.
 * 活动执行事件，用于日志记录/调试
 */
export interface ActivityExecutionEvent {
    /**
     * Event type
     * 事件类型
     */
    eventType: 'before' | 'after' | 'error' | 'complete';
    /**
     * Activity name
     * 活动名称
     */
    activityName: string;
    /**
     * Activity instance
     * 活动实例
     */
    activity: Activity;
    /**
     * Execution context
     * 执行上下文
     */
    context: ActivityContext;
    /**
     * Activity result (for after events)
     * 活动结果（用于after事件）
     */
    result?: ActivityResult;
    /**
     * Error (for error events)
     * 错误（用于error事件）
     */
    error?: Error;
    /**
     * Timestamp
     * 时间戳
     */
    timestamp: number;
    /**
     * Execution duration in ms
     * 执行时长（毫秒）
     */
    duration?: number;
    /**
     * Execution ID
     * 执行ID
     */
    executionId?: string;
}

/**
 * Activity log entry.
 * 活动日志条目
 */
export interface ActivityLogEntry {
    /**
     * Log level
     * 日志级别
     */
    level: 'debug' | 'info' | 'warn' | 'error';
    /**
     * Activity name
     * 活动名称
     */
    activityName: string;
    /**
     * Message
     * 消息
     */
    message: string;
    /**
     * Context data
     * 上下文数据
     */
    context?: ActivityContext;
    /**
     * Result data
     * 结果数据
     */
    result?: ActivityResult;
    /**
     * Error
     * 错误
     */
    error?: Error;
    /**
     * Timestamp
     * 时间戳
     */
    timestamp: number;
    /**
     * Execution ID
     * 执行ID
     */
    executionId?: string;
}

/**
 * Log filter options.
 * 日志过滤器选项
 */
export interface LogFilterOptions {
    /**
     * Filter by activity name
     * 按活动名称过滤
     */
    activityName?: string | RegExp;
    /**
     * Filter by log level
     * 按日志级别过滤
     */
    level?: 'debug' | 'info' | 'warn' | 'error';
    /**
     * Filter by time range
     * 按时间范围过滤
     */
    timeRange?: {
        start?: number;
        end?: number;
    };
    /**
     * Filter by execution ID
     * 按执行ID过滤
     */
    executionId?: string;
    /**
     * Filter by success/failure
     * 按成功/失败过滤
     */
    success?: boolean;
    /**
     * Limit results
     * 限制结果数量
     */
    limit?: number;
    /**
     * Offset for pagination
     * 分页偏移量
     */
    offset?: number;
}

/**
 * Activity tracing information.
 * 活动追踪信息
 */
export interface ActivityTrace {
    /**
     * Trace ID
     * 追踪ID
     */
    traceId: string;
    /**
     * Execution ID
     * 执行ID
     */
    executionId: string;
    /**
     * Activity name
     * 活动名称
     */
    activityName: string;
    /**
     * Start time
     * 开始时间
     */
    startTime: number;
    /**
     * End time
     * 结束时间
     */
    endTime?: number;
    /**
     * Duration in ms
     * 执行时长（毫秒）
     */
    duration?: number;
    /**
     * Input context
     * 输入上下文
     */
    inputContext: ActivityContext;
    /**
     * Output result
     * 输出结果
     */
    outputResult?: ActivityResult;
    /**
     * Whether execution was successful
     * 执行是否成功
     */
    success: boolean;
    /**
     * Child traces (for nested activities)
     * 子追踪（用于嵌套活动）
     */
    children: ActivityTrace[];
}
