import { Type } from '@tsdi/ioc';
import { Activity, ActivityContext, ActivityResult } from '../activities/Activity';
/**
 * 节点位置信息，用于可视化渲染
 * Node position information for visual rendering
 */
export interface NodePosition {
    /**
     * X 坐标
     * X coordinate
     */
    x: number;
    /**
     * Y 坐标
     * Y coordinate
     */
    y: number;
}
/**
 * 节点尺寸信息
 * Node dimension information
 */
export interface NodeDimension {
    /**
     * 宽度
     * Width
     */
    width: number;
    /**
     * 高度
     * Height
     */
    height: number;
}
/**
 * 节点端口类型
 * Node port type
 */
export type PortType = 'input' | 'output' | 'both';
/**
 * 节点端口定义
 * Node port definition
 */
export interface NodePort {
    /**
     * 端口ID
     * Port ID
     */
    id: string;
    /**
     * 端口名称
     * Port name
     */
    name: string;
    /**
     * 端口类型
     * Port type
     */
    type: PortType;
    /**
     * 端口标签
     * Port label
     */
    label?: string;
    /**
     * 是否必填
     * Is required
     */
    required?: boolean;
    /**
     * 数据类型
     * Data type
     */
    dataType?: string;
}
/**
 * 节点连接定义
 * Node connection definition
 */
export interface NodeConnection {
    /**
     * 连接ID
     * Connection ID
     */
    id: string;
    /**
     * 源节点ID
     * Source node ID
     */
    sourceNodeId: string;
    /**
     * 源端口ID
     * Source port ID
     */
    sourcePort: string;
    /**
     * 目标节点ID
     * Target node ID
     */
    targetNodeId: string;
    /**
     * 目标端口ID
     * Target port ID
     */
    targetPort: string;
    /**
     * 连接标签
     * Connection label
     */
    label?: string;
    /**
     * 条件表达式（用于条件分支）
     * Condition expression (for conditional branches)
     */
    condition?: string | ((context: ActivityContext) => boolean);
}
/**
 * 可视化工作流节点类型
 * Visual workflow node type
 */
export type VisualNodeType = 'start' | 'end' | 'task' | 'condition' | 'parallel' | 'sequence' | 'delay' | 'loop' | 'switch' | 'trycatch' | 'subprocess' | 'custom';
/**
 * 可视化工作流节点接口
 * Visual workflow node interface
 */
export interface IVisualWorkflowNode {
    /**
     * 节点ID
     * Node ID
     */
    id: string;
    /**
     * 节点名称
     * Node name
     */
    name: string;
    /**
     * 节点类型
     * Node type
     */
    type: VisualNodeType;
    /**
     * 节点位置
     * Node position
     */
    position: NodePosition;
    /**
     * 节点尺寸
     * Node dimension
     */
    dimension?: NodeDimension;
    /**
     * 节点描述
     * Node description
     */
    description?: string;
    /**
     * 输入端口
     * Input ports
     */
    inputs?: NodePort[];
    /**
     * 输出端口
     * Output ports
     */
    outputs?: NodePort[];
    /**
     * 节点配置
     * Node configuration
     */
    config?: Record<string, any>;
    /**
     * 节点样式
     * Node style
     */
    style?: NodeStyle;
    /**
     * 关联的活动类型
     * Associated activity type
     */
    activityType?: Type<Activity>;
}
/**
 * 节点样式定义
 * Node style definition
 */
export interface NodeStyle {
    /**
     * 背景色
     * Background color
     */
    backgroundColor?: string;
    /**
     * 边框颜色
     * Border color
     */
    borderColor?: string;
    /**
     * 边框宽度
     * Border width
     */
    borderWidth?: number;
    /**
     * 文字颜色
     * Text color
     */
    textColor?: string;
    /**
     * 图标
     * Icon
     */
    icon?: string;
    /**
     * 圆角
     * Border radius
     */
    borderRadius?: number;
}
/**
 * 可视化工作流定义
 * Visual workflow definition
 */
export interface VisualWorkflowDefinition {
    /**
     * 工作流ID
     * Workflow ID
     */
    id: string;
    /**
     * 工作流名称
     * Workflow name
     */
    name: string;
    /**
     * 工作流描述
     * Workflow description
     */
    description?: string;
    /**
     * 工作流版本
     * Workflow version
     */
    version?: string;
    /**
     * 工作流节点列表
     * Workflow nodes
     */
    nodes: IVisualWorkflowNode[];
    /**
     * 工作流连接列表
     * Workflow connections
     */
    connections: NodeConnection[];
    /**
     * 工作流元数据
     * Workflow metadata
     */
    metadata?: VisualWorkflowMetadata;
}
/**
 * 可视化工作流元数据
 * Visual workflow metadata
 */
export interface VisualWorkflowMetadata {
    /**
     * 创建时间
     * Creation time
     */
    createdAt?: string;
    /**
     * 更新时间
     * Update time
     */
    updatedAt?: string;
    /**
     * 创建者
     * Creator
     */
    createdBy?: string;
    /**
     * 标签
     * Tags
     */
    tags?: string[];
    /**
     * 分类
     * Category
     */
    category?: string;
    /**
     * 自定义属性
     * Custom properties
     */
    customProperties?: Record<string, any>;
}
/**
 * 工作流执行状态
 * Workflow execution state
 */
export interface WorkflowExecutionState {
    /**
     * 执行ID
     * Execution ID
     */
    executionId: string;
    /**
     * 工作流ID
     * Workflow ID
     */
    workflowId: string;
    /**
     * 当前节点ID
     * Current node ID
     */
    currentNodeId?: string;
    /**
     * 执行状态
     * Execution status
     */
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
    /**
     * 开始时间
     * Start time
     */
    startTime?: number;
    /**
     * 结束时间
     * End time
     */
    endTime?: number;
    /**
     * 节点执行结果
     * Node execution results
     */
    nodeResults: Map<string, ActivityResult>;
    /**
     * 执行错误
     * Execution error
     */
    error?: Error;
}
/**
 * 节点模板定义
 * Node template definition
 */
export interface NodeTemplate {
    /**
     * 模板ID
     * Template ID
     */
    id: string;
    /**
     * 模板名称
     * Template name
     */
    name: string;
    /**
     * 节点类型
     * Node type
     */
    type: VisualNodeType;
    /**
     * 默认配置
     * Default configuration
     */
    defaultConfig?: Record<string, any>;
    /**
     * 默认样式
     * Default style
     */
    defaultStyle?: NodeStyle;
    /**
     * 输入端口模板
     * Input port templates
     */
    inputs?: Omit<NodePort, 'id'>[];
    /**
     * 输出端口模板
     * Output port templates
     */
    outputs?: Omit<NodePort, 'id'>[];
    /**
     * 关联的活动类型
     * Associated activity type
     */
    activityType?: Type<Activity>;
}
