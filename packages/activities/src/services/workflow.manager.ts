import { Injectable } from '@tsdi/ioc';
import { WorkflowService, WorkflowExecutionContext } from './workflow.service';
import { ActivityContext, ActivityResult } from '../activities/Activity';
import { WorkflowDefinition } from '../Workflow';

export interface WorkflowStats {
    totalWorkflows: number;
    activeWorkflows: number;
    completedWorkflows: number;
    failedWorkflows: number;
    averageExecutionTime: number;
}

export interface WorkflowFilter {
    status?: 'active' | 'completed' | 'failed';
    startTime?: Date;
    endTime?: Date;
    workflowId?: string;
}

@Injectable()
export class WorkflowManager {
    private workflowHistory: Map<string, WorkflowExecutionContext> = new Map();
    private maxHistorySize = 1000;

    constructor(private workflowService: WorkflowService) {}

    /**
     * 启动工作流
     * @param workflowDefinition 工作流定义类
     * @param context 工作流上下文
     * @returns 工作流执行结果
     */
    async startWorkflow<T extends ActivityContext>(
        workflowDefinition: new () => any,
        context: T
    ): Promise<ActivityResult> {
        const result = await this.workflowService.startWorkflow(workflowDefinition, context);
        
        // 记录工作流历史
        if (result.data?.workflowId) {
            const executionContext = this.workflowService.getActiveWorkflow(result.data.workflowId);
            if (executionContext) {
                this.addToHistory(executionContext);
            }
        }

        return result;
    }

    /**
     * 获取工作流统计信息
     */
    getWorkflowStats(): WorkflowStats {
        const activeWorkflows = this.workflowService.getAllActiveWorkflows();
        const completedWorkflows = Array.from(this.workflowHistory.values())
            .filter(wf => wf.endTime && !wf.error);
        const failedWorkflows = Array.from(this.workflowHistory.values())
            .filter(wf => wf.endTime && wf.error);

        const totalExecutionTimes = completedWorkflows
            .map(wf => (wf.endTime! - wf.startTime!))
            .filter(time => time > 0);

        const averageExecutionTime = totalExecutionTimes.length > 0
            ? totalExecutionTimes.reduce((a, b) => a + b, 0) / totalExecutionTimes.length
            : 0;

        return {
            totalWorkflows: this.workflowHistory.size,
            activeWorkflows: activeWorkflows.length,
            completedWorkflows: completedWorkflows.length,
            failedWorkflows: failedWorkflows.length,
            averageExecutionTime
        };
    }

    /**
     * 查询工作流历史
     * @param filter 查询条件
     */
    queryWorkflows(filter: WorkflowFilter = {}): WorkflowExecutionContext[] {
        let workflows = Array.from(this.workflowHistory.values());

        if (filter.status) {
            workflows = workflows.filter(wf => {
                switch (filter.status) {
                    case 'active':
                        return !wf.endTime;
                    case 'completed':
                        return wf.endTime && !wf.error;
                    case 'failed':
                        return wf.endTime && wf.error;
                }
            });
        }

        if (filter.startTime) {
            workflows = workflows.filter(wf => 
                wf.startTime && wf.startTime >= filter.startTime!.getTime()
            );
        }

        if (filter.endTime) {
            workflows = workflows.filter(wf => 
                wf.endTime && wf.endTime <= filter.endTime!.getTime()
            );
        }

        if (filter.workflowId) {
            workflows = workflows.filter(wf => wf.workflowId === filter.workflowId);
        }

        return workflows;
    }

    /**
     * 获取工作流详情
     * @param workflowId 工作流ID
     */
    getWorkflowDetails(workflowId: string): WorkflowExecutionContext | undefined {
        return this.workflowHistory.get(workflowId) || 
               this.workflowService.getActiveWorkflow(workflowId);
    }

    /**
     * 取消工作流
     * @param workflowId 工作流ID
     */
    async cancelWorkflow(workflowId: string): Promise<void> {
        await this.workflowService.cancelWorkflow(workflowId);
    }

    /**
     * 重试失败的工作流
     * @param workflowId 工作流ID
     */
    async retryWorkflow(workflowId: string): Promise<ActivityResult> {
        const workflow = this.workflowHistory.get(workflowId);
        if (!workflow) {
            throw new Error(`Workflow ${workflowId} not found in history`);
        }

        if (!workflow.error) {
            throw new Error(`Workflow ${workflowId} did not fail`);
        }

        // 创建新的上下文，保留原始数据但重置状态
        const newContext: WorkflowExecutionContext = {
            ...workflow,
            workflowId: undefined, // 将生成新的ID
            startTime: undefined,
            endTime: undefined,
            error: undefined,
            currentState: undefined,
            states: new Map()
        };

        return this.startWorkflow(workflow.constructor as new () => any, newContext);
    }

    /**
     * 清理过期的工作流历史
     * @param maxAge 最大保留时间（毫秒）
     */
    cleanupHistory(maxAge: number = 24 * 60 * 60 * 1000): void {
        const now = Date.now();
        for (const [id, workflow] of this.workflowHistory.entries()) {
            if (workflow.endTime && (now - workflow.endTime > maxAge)) {
                this.workflowHistory.delete(id);
            }
        }
    }

    /**
     * 导出工作流历史
     * @param format 导出格式
     */
    exportHistory(format: 'json' | 'csv' = 'json'): string {
        const workflows = Array.from(this.workflowHistory.values());
        
        if (format === 'csv') {
            const headers = ['workflowId', 'startTime', 'endTime', 'status', 'error'];
            const rows = workflows.map(wf => [
                wf.workflowId,
                wf.startTime,
                wf.endTime,
                wf.error ? 'failed' : 'completed',
                wf.error?.message || ''
            ]);
            
            return [
                headers.join(','),
                ...rows.map(row => row.join(','))
            ].join('\n');
        }

        return JSON.stringify(workflows, null, 2);
    }

    private addToHistory(workflow: WorkflowExecutionContext): void {
        if (workflow.workflowId) {
            this.workflowHistory.set(workflow.workflowId, workflow);

            // 如果历史记录超过最大限制，删除最旧的记录
            if (this.workflowHistory.size > this.maxHistorySize) {
                const oldestWorkflow = Array.from(this.workflowHistory.entries())
                    .sort(([, a], [, b]) => (a.startTime || 0) - (b.startTime || 0))[0];
                if (oldestWorkflow) {
                    this.workflowHistory.delete(oldestWorkflow[0]);
                }
            }
        }
    }
} 