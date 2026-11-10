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
export type VisualNodeType = 
    | 'start'      // 开始节点
    | 'end'        // 结束节点
    | 'task'       // 任务节点
    | 'condition'  // 条件节点
    | 'parallel'   // 并行节点
    | 'join'       // 汇聚节点
    | 'sequence'   // 顺序节点
    | 'delay'      // 延迟节点
    | 'loop'       // 循环节点
    | 'switch'     // 开关节点
    | 'trycatch'   // 异常处理节点
    | 'subprocess' // 子流程节点
    | 'log'        // 日志节点
    | 'http-request' // HTTP 请求节点
    | 'inject'     // 注入/手动触发节点
    | 'function'   // 函数节点
    | 'template'   // 模板节点
    | 'json'       // JSON 解析/序列化节点
    | 'csv'        // CSV 解析/序列化节点
    | 'change'     // 属性修改/删除节点
    | 'statistics' // 统计节点
    | 'merge'      // 数据合并节点
    | 'event-emit' // 事件发送节点
    | 'event-wait' // 事件等待节点
    | 'command'    // 命令执行节点
    | 'split'      // 拆分节点
    | 'map'        // 数组映射节点
    | 'filter'     // 数组过滤节点
    | 'sort'       // 数组排序节点
    | 'range'      // 数值区间节点
    | 'batch'      // 批处理节点
    | 'trigger'    // 触发节点
    | 'comment'    // 画布注释节点
    | 'assign'     // 赋值节点
    | 'transform'  // 数据转换节点
    | 'custom'     // 自定义节点
    | (string & {}); // plugin-contributed node type

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
    /** Plugin that installed this node, if any. */
    pluginId?: string;
    /** The node can only execute on a host that has installed its plugin. */
    requiresServer?: boolean;
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
     * 节点执行状态（供可视化界面展示执行路径）
     * Per-node execution state for visual path rendering.
     */
    nodeStates?: Map<string, NodeExecutionState>;
    /**
     * 连接（边）执行状态
     * Per-edge execution state for visual path rendering.
     */
    edgeStates?: Map<string, EdgeExecutionState>;
    /**
     * 正在执行的节点（并行分支可能有多个）
     * Nodes currently running (parallel branches may have more than one).
     */
    activeNodeIds?: string[];
    /**
     * 执行日志
     * Execution log entries.
     */
    logs?: WorkflowExecutionLogEntry[];
    /**
     * 执行错误
     * Execution error
     */
    error?: Error;
}

/**
 * 节点执行状态
 * Node execution status.
 */
export type NodeExecutionStatus =
    | 'idle'
    | 'pending'
    | 'running'
    | 'success'
    | 'failed'
    | 'skipped'
    | 'cancelled';

/**
 * 节点执行记录
 * Node execution record.
 */
export interface NodeExecutionState {
    nodeId: string;
    status: NodeExecutionStatus;
    startedAt?: number;
    finishedAt?: number;
    durationMs?: number;
    result?: ActivityResult;
    error?: string;
}

/**
 * 连接执行状态
 * Edge execution status.
 */
export type EdgeExecutionStatus = 'idle' | 'active' | 'traversed' | 'skipped';

/**
 * 连接执行记录
 * Edge execution record.
 */
export interface EdgeExecutionState {
    connectionId: string;
    status: EdgeExecutionStatus;
    traversedAt?: number;
    count?: number;
}

/**
 * 执行日志级别
 * Workflow execution log level.
 */
export type WorkflowExecutionLogLevel = 'info' | 'success' | 'warning' | 'error';

/**
 * 执行日志
 * Workflow execution log entry.
 */
export interface WorkflowExecutionLogEntry {
    id: string;
    timestamp: number;
    level: WorkflowExecutionLogLevel;
    event: string;
    message: string;
    nodeId?: string;
    connectionId?: string;
}

/**
 * 工作流执行事件类型
 * Workflow execution event type.
 */
export type WorkflowExecutionEventType =
    | 'workflow-start'
    | 'workflow-end'
    | 'workflow-error'
    | 'workflow-cancelled'
    | 'node-start'
    | 'node-end'
    | 'node-skipped'
    | 'edge-traversed'
    | 'edge-skipped';

/**
 * 工作流执行事件（实时推送给可视化界面）
 * Execution event streamed to visual editors.
 */
export interface WorkflowExecutionEvent {
    type: WorkflowExecutionEventType;
    executionId: string;
    workflowId: string;
    timestamp: number;
    nodeId?: string;
    connectionId?: string;
    status?: NodeExecutionStatus | EdgeExecutionStatus | WorkflowExecutionState['status'];
    result?: ActivityResult;
    error?: Error;
    /**
     * 事件发生时的完整执行快照（纯对象，便于界面响应式渲染）
     * Plain-object snapshot of the execution at this event.
     */
    snapshot: WorkflowExecutionSnapshot;
}

/**
 * 可序列化的执行快照
 * Serializable execution snapshot used by the visual editor.
 */
export interface WorkflowExecutionSnapshot {
    executionId: string;
    workflowId: string;
    status: WorkflowExecutionState['status'];
    currentNodeId?: string;
    startTime?: number;
    endTime?: number;
    error?: string;
    nodeStates: Record<string, NodeExecutionState>;
    edgeStates: Record<string, EdgeExecutionState>;
    activeNodeIds: string[];
    logs: WorkflowExecutionLogEntry[];
}

/**
 * 工作流执行选项
 * Workflow execution options.
 */
export interface WorkflowExecutionOptions {
    executionId?: string;
    /**
     * 实时事件监听，用于在可视化界面展示执行路径。
     * Real-time listener used by visual editors.
     */
    onEvent?: (event: WorkflowExecutionEvent) => void;
    /**
     * 保留的历史执行数量，便于执行结束后继续查看路径。
     * Number of finished executions kept for inspection.
     */
    maxHistory?: number;
    /**
     * 每个节点结束后推送可序列化检查点，供持久化/断点恢复使用。
     * Called after every node with a serializable checkpoint.
     */
    onCheckpoint?: (snapshot: WorkflowExecutionSnapshot) => void;
    /**
     * 从检查点恢复执行：已完成节点只重放路径，不会再次执行。
     * Resume from a checkpoint; completed nodes are replayed, not re-executed.
     */
    resumeFrom?: WorkflowExecutionSnapshot;
}

/**
 * 节点配置字段类型
 * Node config field type used by the visual inspector.
 */
export type WorkflowConfigFieldType =
    | 'text'
    | 'textarea'
    | 'number'
    | 'boolean'
    | 'select'
    | 'json'
    | 'code';

/**
 * 节点配置字段定义
 * Node config field definition.
 */
export interface WorkflowConfigFieldCondition {
    /** Field that controls this field's visibility. */
    key: string;
    equals?: any;
    notEquals?: any;
    in?: any[];
    truthy?: boolean;
    falsy?: boolean;
}

export interface WorkflowConfigField {
    key: string;
    label: string;
    labelZh?: string;
    type: WorkflowConfigFieldType;
    defaultValue?: any;
    placeholder?: string;
    placeholderZh?: string;
    description?: string;
    descriptionZh?: string;
    options?: Array<{ label: string; labelZh?: string; value: string }>;
    min?: number;
    max?: number;
    step?: number;
    rows?: number;
    required?: boolean;
    readonly?: boolean;
    pattern?: string;
    language?: string;
    /** Group header shown above this field in the inspector. */
    group?: string;
    groupZh?: string;
    /** Only render the field when the referenced config value matches. */
    visibleWhen?: WorkflowConfigFieldCondition;
}

/**
 * 节点分类
 * Node palette category.
 */
export type WorkflowNodeCategory = 'trigger' | 'flow' | 'action' | 'data' | 'error' | 'advanced';

/**
 * 通用流程节点定义（可视化组件库）
 * Generic workflow node definition used by the palette, inspector and runtime.
 */
export interface WorkflowNodeDefinition {
    /**
     * 节点类型
     * Node type.
     */
    type: VisualNodeType;
    /**
     * 显示名称
     * Display label.
     */
    label: string;
    labelZh?: string;
    description?: string;
    descriptionZh?: string;
    /**
     * 分类
     * Palette category.
     */
    category: WorkflowNodeCategory;
    /**
     * 图标（单字符或 emoji）
     * Icon glyph.
     */
    icon: string;
    /**
     * 主题色
     * Accent colour.
     */
    color: string;
    textColor?: string;
    /**
     * 输入端口
     * Input ports.
     */
    inputs: NodePort[];
    /**
     * 输出端口
     * Output ports.
     */
    outputs: NodePort[];
    /**
     * 配置字段
     * Config fields.
     */
    fields?: WorkflowConfigField[];
    /**
     * 默认配置
     * Default config.
     */
    defaultConfig?: Record<string, any>;
    /**
     * 是否只允许出现一次（例如 start/end）
     * Whether only one instance may exist.
     */
    singleton?: boolean;
    /**
     * 关联的活动类型
     * Associated activity type.
     */
    activityType?: Type<Activity>;
    /** Plugin that installed this node, if any. */
    pluginId?: string;
    /** The node can only execute on a host that has installed its plugin. */
    requiresServer?: boolean;
    /** Executor supplied by a workflow plugin. */
    execute?: (node: IVisualWorkflowNode, context: ActivityContext) => Promise<ActivityResult> | ActivityResult;
}

/**
 * 节点面板条目
 * Palette entry.
 */
export interface WorkflowPaletteItem {
    type: VisualNodeType;
    label: string;
    description: string;
    icon: string;
    color: string;
    category: WorkflowNodeCategory;
}

/**
 * 节点面板分组
 * Palette group.
 */
export interface WorkflowPaletteGroup {
    id: WorkflowNodeCategory;
    label: string;
    items: WorkflowPaletteItem[];
}

/**
 * 设计器选择状态
 * Designer selection.
 */
export interface WorkflowSelection {
    nodeId?: string;
    connectionId?: string;
}

/**
 * 设计器连接草稿
 * Connection draft while dragging from an input or output port.
 */
export interface WorkflowConnectionDraft {
    sourceNodeId: string;
    sourcePort: string;
    /**
     * Port side the wire starts from. Output is the default so older callers
     * keep their output-to-input semantics; input starts create a reverse wire.
     */
    sourceSide?: 'input' | 'output';
    x: number;
    y: number;
}

/**
 * 设计器节点拖拽状态
 * Node drag state.
 */
export interface WorkflowNodeDragState {
    nodeId: string;
    startX: number;
    startY: number;
    offsetX: number;
    offsetY: number;
    moved: boolean;
}

/**
 * 画布节点视图
 * Canvas node view model.
 */
export interface WorkflowCanvasNodeView {
    id: string;
    name: string;
    type: VisualNodeType;
    typeLabel: string;
    description: string;
    x: number;
    y: number;
    width: number;
    height: number;
    icon: string;
    color: string;
    textColor: string;
    selected: boolean;
    status: NodeExecutionStatus;
    statusLabel: string;
    inputs: WorkflowCanvasPortView[];
    outputs: WorkflowCanvasPortView[];
    attrs: Record<string, string>;
}

/**
 * 画布端口视图
 * Canvas port view model.
 */
export interface WorkflowCanvasPortView {
    id: string;
    label: string;
    type: PortType;
    x: number;
    y: number;
}

/**
 * 画布连接视图
 * Canvas edge view model.
 */
export interface WorkflowCanvasEdgeView {
    id: string;
    sourceNodeId: string;
    targetNodeId: string;
    sourcePort: string;
    targetPort: string;
    label: string;
    d: string;
    status: EdgeExecutionStatus;
    selected: boolean;
    attrs: Record<string, string>;
    hitAttrs: Record<string, string>;
    labelAttrs: Record<string, string>;
}

/**
 * 画布渲染模型
 * Canvas render model consumed by renderer-neutral canvas components.
 */
export interface WorkflowCanvasModel {
    nodes: WorkflowCanvasNodeView[];
    edges: WorkflowCanvasEdgeView[];
    draft?: {
        d: string;
        attrs: Record<string, string>;
    };
    /** True while a wire is being dragged or waiting for a second click. */
    connecting?: boolean;
    /** Side the active wire starts from; the opposite ports are valid targets. */
    connectingSide?: 'input' | 'output';
    width: number;
    height: number;
    zoom: number;
    pan: NodePosition;
    gridStyle: Record<string, string>;
}

/**
 * 检查器字段视图
 * Inspector field view model.
 */
export interface WorkflowInspectorFieldView {
    key: string;
    label: string;
    type: WorkflowConfigFieldType;
    value: any;
    displayValue: string;
    checked: boolean;
    options: Array<{ label: string; value: string }>;
    placeholder: string;
    description: string;
    group: string;
    visible: boolean;
    min?: number;
    max?: number;
    step?: number;
    rows: number;
    required: boolean;
    readonly: boolean;
    pattern?: string;
    language?: string;
    hasDefault: boolean;
    /** Value written back when the field is reset (already formatted for the control). */
    resetValue: any;
}

/**
 * 检查器模型
 * Inspector view model.
 */
export interface WorkflowInspectorModel {
    hasSelection: boolean;
    nodeId: string;
    name: string;
    description: string;
    typeLabel: string;
    status: NodeExecutionStatus;
    statusLabel: string;
    durationLabel: string;
    fields: WorkflowInspectorFieldView[];
    resultText: string;
    errorText: string;
}

/**
 * 工具栏模型
 * Toolbar view model.
 */
export interface WorkflowToolbarModel {
    name: string;
    nodeCount: number;
    connectionCount: number;
    hasSelection: boolean;
    canUndo: boolean;
    canRedo: boolean;
    canResume: boolean;
    running: boolean;
    zoomLabel: string;
    statusLabel: string;
}

/**
 * 运行历史条目视图
 * Run-history chip view model.
 */
export interface WorkflowRunHistoryItem {
    executionId: string;
    label: string;
    status: WorkflowExecutionState['status'];
    statusLabel: string;
    timeLabel: string;
    durationLabel: string;
    nodeCount: number;
    tone: 'idle' | 'running' | 'success' | 'failed' | 'cancelled';
    active: boolean;
}

/**
 * 状态栏模型
 * Status bar view model.
 */
export interface WorkflowStatusModel {
    message: string;
    error: string;
    running: boolean;
    nodeCount: number;
    selectedLabel: string;
    zoomLabel: string;
    executionLabel: string;
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