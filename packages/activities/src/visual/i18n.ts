import { Module } from '@tsdi/ioc';
import { I18nModule, TranslationBundle, Translator } from '@tsdi/i18n';

/**
 * Translation bundles for the visual workflow designer. Keys are grouped under
 * `workflow.*` so applications can merge or override a single string without
 * replacing the whole bundle.
 */
export const WORKFLOW_DESIGNER_TRANSLATIONS: Record<string, TranslationBundle> = {
    en: {
        locale: 'en',
        messages: {
            workflow: {
                category: {
                    trigger: 'Triggers',
                    flow: 'Flow control',
                    action: 'Actions',
                    data: 'Data',
                    error: 'Error handling',
                    advanced: 'Advanced'
                },
                status: {
                    idle: 'Idle',
                    pending: 'Pending',
                    running: 'Running',
                    completed: 'Completed',
                    failed: 'Failed',
                    cancelled: 'Cancelled',
                    success: 'Done',
                    skipped: 'Skipped'
                },
                ui: {
                    run: 'Run',
                    resume: 'Resume',
                    stop: 'Stop',
                    undo: 'Undo',
                    redo: 'Redo',
                    delete: 'Delete',
                    fit: 'Fit',
                    layout: 'Auto layout',
                    duplicate: 'Duplicate',
                    clear: 'Clear',
                    nodes: '{count} nodes',
                    nodeWord: 'nodes',
                    links: '{count} links',
                    inspectorTitle: 'Node inspector',
                    inspectorEmpty: 'Select a node on the canvas to edit its properties.',
                    name: 'Name',
                    namePlaceholder: 'Node name',
                    description: 'Description',
                    descriptionPlaceholder: 'Optional note for this node',
                    restoreDefaults: 'Reset',
                    resetField: 'Reset to default',
                    noProperties: 'This node has no editable properties.',
                    requiredMessage: 'Required',
                    numberMessage: 'Number out of range',
                    patternMessage: 'Invalid format',
                    jsonMessage: 'Invalid JSON',
                    invalidEmail: 'Invalid email address',
                    invalidUrl: 'Invalid URL',
                    integerMessage: 'Must be an integer',
                    latestOutput: 'Latest output',
                    jsonTitle: 'Workflow JSON (generated visually)',
                    apply: 'Apply',
                    close: 'Close',
                    logs: 'Logs',
                    logTitle: 'Execution log',
                    menu: 'Menu',
                    jsonMenu: 'Import / Export JSON',
                    themeMenu: 'Theme',
                    themeLight: 'Light',
                    themeDark: 'Dark',
                    themeSolarized: 'Solarized',
                    themeHighContrast: 'High contrast',
                    shortcuts: 'Keyboard shortcuts',
                    shortcutsTitle: 'Keyboard shortcuts',
                    zoomPan: 'Zoom / pan',
                    saveStateSaved: 'Saved',
                    saveStateDirty: 'Unsaved changes',
                    saveStateSaving: 'Saving…',
                    saveStateError: 'Save failed',
                    searchNodes: 'Search nodes…',
                    noMatches: 'No matching nodes',
                    save: 'Save',
                    saveAs: 'Save as copy',
                    library: 'Workflows',
                    libraryTitle: 'Workflow library',
                    libraryEmpty: 'No saved workflows yet.',
                    open: 'Open',
                    remove: 'Delete',
                    nodeCount: '{count} nodes',
                    noSelection: 'No node selected',
                    canvas: 'Workflow canvas'
                },
                message: {
                    added: 'Added {name}',
                    nodeRemoved: 'Node removed',
                    nodeUpdated: 'Node updated',
                    connected: 'Nodes connected',
                    connectionRemoved: 'Connection removed',
                    connectionCancelled: 'Connection cancelled',
                    connectHint: 'Drop on a node or port to connect',
                    dropHint: 'Drop "{name}" on the canvas',
                    cleared: 'Canvas cleared',
                    loaded: 'Workflow loaded',
                    running: 'Workflow running',
                    layout: 'Auto layout applied',
                    duplicated: 'Duplicated {name}',
                    saved: 'Saved "{name}"',
                    savedAs: 'Saved "{name}" as a new workflow',
                    completed: 'Workflow completed',
                    failed: 'Workflow failed',
                    cancelled: 'Workflow cancelled',
                    undo: 'Undo',
                    redo: 'Redo'
                },
                error: {
                    unknownType: 'Unknown node type: {type}',
                    singleton: 'Only one {label} node is allowed',
                    endpoints: 'Both connection endpoints must exist',
                    selfLink: 'A node cannot connect to itself',
                    unknownOutput: 'Unknown output port: {port}',
                    unknownInput: 'Unknown input port: {port}',
                    cycle: 'This connection would create a cycle',
                    noService: 'No VisualWorkflowService configured for this designer',
                    running: 'Workflow is already running',
                    invalidDocument: 'Invalid workflow document',
                    notFound: 'Workflow not found: {id}',
                    noCheckpoint: 'No checkpoint is available to resume'
                },
                node: {
                    start: { label: 'Start', description: 'Entry point of the workflow' },
                    end: { label: 'End', description: 'Finish the workflow' },
                    inject: { label: 'Inject', description: 'Start with a fixed payload' },
                    task: { label: 'Task', description: 'Run a named action or return a fixed result' },
                    function: { label: 'Function', description: 'Run trusted JavaScript against the workflow context' },
                    template: { label: 'Template', description: 'Render a message template' },
                    json: { label: 'JSON', description: 'Parse or stringify JSON' },
                    csv: { label: 'CSV', description: 'Parse or stringify CSV' },
                    change: { label: 'Change', description: 'Set, delete or append a context field' },
                    statistics: { label: 'Statistics', description: 'Aggregate an array (count/sum/avg/min/max)' },
                    merge: { label: 'Merge', description: 'Merge objects or concatenate arrays' },
                    'event-emit': { label: 'Emit event', description: 'Emit an event through the workflow event bus' },
                    'event-wait': { label: 'Wait event', description: 'Wait for a workflow event' },
                    command: { label: 'Command', description: 'Run a host-provided command executor' },
                    split: { label: 'Split', description: 'Split a string or array into items' },
                    map: { label: 'Map', description: 'Map each array item' },
                    filter: { label: 'Filter', description: 'Keep array items that match a condition' },
                    sort: { label: 'Sort', description: 'Sort an array by a field' },
                    range: { label: 'Range', description: 'Generate a numeric range' },
                    batch: { label: 'Batch', description: 'Split an array into chunks' },
                    trigger: { label: 'Trigger', description: 'Emit a payload after an optional delay' },
                    comment: { label: 'Comment', description: 'Canvas note; not executed' },
                    condition: { label: 'Condition', description: 'Branch on a context field' },
                    switch: { label: 'Switch', description: 'Route by a context value' },
                    parallel: { label: 'Parallel', description: 'Run all outgoing branches concurrently' },
                    join: { label: 'Join', description: 'Wait for all incoming branches before continuing' },
                    loop: { label: 'Loop', description: 'Repeat the node body' },
                    delay: { label: 'Delay', description: 'Wait before continuing' },
                    log: { label: 'Log', description: 'Record a message' },
                    'http-request': { label: 'HTTP request', description: 'Call an HTTP endpoint' },
                    assign: { label: 'Assign', description: 'Merge values into workflow variables' },
                    transform: { label: 'Transform', description: 'Map the previous result' },
                    trycatch: { label: 'Try / catch', description: 'Route failures to an error branch' },
                    subprocess: { label: 'Sub workflow', description: 'Execute another workflow' },
                    custom: { label: 'Custom', description: 'Run a custom activity or handler' }
                },
                field: {
                    task: {
                        action: 'Action',
                        result: 'Mock result',
                        fail: 'Fail this step',
                        retry: 'Retries',
                        retryDelay: 'Retry delay (ms)',
                        timeout: 'Timeout (ms)'
                    },
                    inject: { payload: 'Payload' },
                    trigger: { delay: 'Delay (ms)', payload: 'Payload' },
                    function: { code: 'Code', timeout: 'Timeout (ms)' },
                    template: { template: 'Template', target: 'Target field' },
                    json: { mode: 'Mode', field: 'Field', pretty: 'Pretty print' },
                    csv: { mode: 'Mode', field: 'Field', delimiter: 'Delimiter', header: 'First row is header' },
                    change: { action: 'Action', field: 'Field', value: 'Value' },
                    statistics: { field: 'Array field', path: 'Item path', operation: 'Operation', resultField: 'Result field' },
                    merge: { fields: 'Fields', mode: 'Mode', resultField: 'Result field' },
                    'event-emit': { event: 'Event', payload: 'Payload' },
                    'event-wait': { event: 'Event', timeout: 'Timeout (ms)' },
                    command: { command: 'Command', args: 'Args', timeout: 'Timeout (ms)' },
                    split: { field: 'Field', delimiter: 'Delimiter' },
                    map: { field: 'Array field', path: 'Item path' },
                    filter: { field: 'Array field', path: 'Item path', operator: 'Operator', value: 'Compare with' },
                    sort: { field: 'Array field', path: 'Sort path', order: 'Order' },
                    range: { from: 'From', to: 'To', step: 'Step' },
                    batch: { field: 'Array field', size: 'Batch size' },
                    comment: { text: 'Text' },
                    condition: {
                        field: 'Field',
                        operator: 'Operator',
                        value: 'Compare with'
                    },
                    switch: {
                        field: 'Value field',
                        value: 'Expected value'
                    },
                    loop: {
                        iterations: 'Iterations',
                        delay: 'Delay (ms)'
                    },
                    delay: { delay: 'Delay (ms)' },
                    log: { message: 'Message', level: 'Level' },
                    'http-request': {
                        url: 'URL',
                        method: 'Method',
                        headers: 'Headers',
                        body: 'Body',
                        retry: 'Retries',
                        retryDelay: 'Retry delay (ms)',
                        timeout: 'Timeout (ms)'
                    },
                    assign: { values: 'Values' },
                    transform: { mapping: 'Mapping', result: 'Fixed result' },
                    subprocess: { workflow: 'Workflow JSON' },
                    custom: { result: 'Result' }
                },
                option: {
                    truthy: 'is truthy',
                    equals: 'equals',
                    notEquals: 'not equals',
                    gt: 'greater than',
                    lt: 'less than',
                    parse: 'Parse',
                    stringify: 'Stringify',
                    asc: 'Ascending',
                    desc: 'Descending',
                    set: 'Set',
                    delete: 'Delete',
                    append: 'Append',
                    count: 'Count',
                    sum: 'Sum',
                    avg: 'Average',
                    min: 'Min',
                    max: 'Max',
                    object: 'Object merge',
                    array: 'Array concat'
                },
                log: {
                    info: 'INFO',
                    success: 'OK',
                    warning: 'WARN',
                    error: 'ERROR'
                },
                demo: {
                    name: 'Approval workflow',
                    description: 'Drag nodes, connect ports, run it, and inspect the live path.',
                    start: 'Start',
                    loadInput: 'Load input',
                    approved: 'Approved?',
                    approve: 'Approve',
                    reject: 'Reject',
                    end: 'End'
                }
            }
        }
    },
    'zh-CN': {
        locale: 'zh-CN',
        messages: {
            workflow: {
                category: {
                    trigger: '触发器',
                    flow: '流程控制',
                    action: '执行动作',
                    data: '数据处理',
                    error: '异常处理',
                    advanced: '高级'
                },
                status: {
                    idle: '空闲',
                    pending: '等待',
                    running: '运行中',
                    completed: '已完成',
                    failed: '失败',
                    cancelled: '已取消',
                    success: '成功',
                    skipped: '跳过'
                },
                ui: {
                    run: '运行',
                    resume: '继续运行',
                    stop: '停止',
                    undo: '撤销',
                    redo: '重做',
                    delete: '删除',
                    fit: '适应视图',
                    layout: '自动布局',
                    duplicate: '复制节点',
                    clear: '清空',
                    nodes: '{count} 个节点',
                    nodeWord: '个节点',
                    links: '{count} 条连接',
                    inspectorTitle: '节点属性',
                    inspectorEmpty: '在画布中选择一个节点查看并编辑属性。',
                    name: '名称',
                    namePlaceholder: '节点名称',
                    description: '描述',
                    descriptionPlaceholder: '该节点的可选说明',
                    restoreDefaults: '恢复默认',
                    resetField: '恢复默认值',
                    noProperties: '该节点没有可编辑属性。',
                    requiredMessage: '必填项',
                    numberMessage: '数值超出范围',
                    patternMessage: '格式不正确',
                    jsonMessage: 'JSON 格式不正确',
                    invalidEmail: '邮箱格式不正确',
                    invalidUrl: 'URL 格式不正确',
                    integerMessage: '请输入整数',
                    latestOutput: '最近一次输出',
                    jsonTitle: '工作流 JSON（可视化生成）',
                    apply: '应用',
                    close: '关闭',
                    logs: '日志',
                    logTitle: '执行日志',
                    menu: '菜单',
                    jsonMenu: '导入 / 导出 JSON',
                    themeMenu: '主题',
                    themeLight: '亮色',
                    themeDark: '暗色',
                    themeSolarized: 'Solarized',
                    themeHighContrast: '高对比度',
                    shortcuts: '键盘快捷键',
                    shortcutsTitle: '键盘快捷键',
                    zoomPan: '缩放 / 平移',
                    saveStateSaved: '已保存',
                    saveStateDirty: '有未保存修改',
                    saveStateSaving: '保存中…',
                    saveStateError: '保存失败',
                    searchNodes: '搜索节点…',
                    noMatches: '没有匹配的节点',
                    save: '保存',
                    saveAs: '另存为',
                    library: '工作流库',
                    libraryTitle: '工作流库',
                    libraryEmpty: '还没有保存的工作流。',
                    open: '打开',
                    remove: '删除',
                    nodeCount: '{count} 个节点',
                    noSelection: '未选择节点',
                    canvas: '工作流画布'
                },
                message: {
                    added: '已添加「{name}」',
                    nodeRemoved: '节点已删除',
                    nodeUpdated: '节点已更新',
                    connected: '节点已连接',
                    connectionRemoved: '连接已删除',
                    connectionCancelled: '已取消连接',
                    connectHint: '拖到目标节点或端口完成连接',
                    dropHint: '拖到画布放置「{name}」',
                    cleared: '画布已清空',
                    loaded: '工作流已加载',
                    running: '工作流运行中',
                    layout: '已自动布局',
                    duplicated: '已复制「{name}」',
                    saved: '已保存「{name}」',
                    savedAs: '已另存为「{name}」',
                    completed: '工作流已完成',
                    failed: '工作流失败',
                    cancelled: '工作流已取消',
                    undo: '撤销',
                    redo: '重做'
                },
                error: {
                    unknownType: '未知节点类型：{type}',
                    singleton: '只允许一个「{label}」节点',
                    endpoints: '连接的两端节点必须存在',
                    selfLink: '节点不能连接到自身',
                    unknownOutput: '未知输出端口：{port}',
                    unknownInput: '未知输入端口：{port}',
                    cycle: '该连接会造成循环',
                    noService: '设计器未配置 VisualWorkflowService',
                    running: '工作流已在运行',
                    invalidDocument: '无效的工作流文档',
                    notFound: '未找到工作流：{id}',
                    noCheckpoint: '没有可恢复的检查点'
                },
                node: {
                    start: { label: '开始', description: '工作流入口' },
                    end: { label: '结束', description: '结束工作流' },
                    inject: { label: '注入', description: '以固定数据触发流程' },
                    task: { label: '任务', description: '执行命名动作或返回固定结果' },
                    function: { label: '函数', description: '对工作流上下文执行受信任的 JavaScript' },
                    template: { label: '模板', description: '渲染消息模板' },
                    json: { label: 'JSON', description: '解析或序列化 JSON' },
                    csv: { label: 'CSV', description: '解析或序列化 CSV' },
                    change: { label: '修改属性', description: '设置、删除或追加上下文字段' },
                    statistics: { label: '统计', description: '聚合数组（计数/求和/平均/最小/最大）' },
                    merge: { label: '合并', description: '合并对象或拼接数组' },
                    'event-emit': { label: '发送事件', description: '通过工作流事件总线发送事件' },
                    'event-wait': { label: '等待事件', description: '等待工作流事件' },
                    command: { label: '命令', description: '调用宿主提供的命令执行器' },
                    split: { label: '拆分', description: '将字符串或数组拆分为元素' },
                    map: { label: '映射', description: '映射数组中的每个元素' },
                    filter: { label: '过滤', description: '保留满足条件的数组元素' },
                    sort: { label: '排序', description: '按字段排序数组' },
                    range: { label: '区间', description: '生成数值区间' },
                    batch: { label: '批处理', description: '将数组拆分为批次' },
                    trigger: { label: '触发', description: '延迟后输出一次数据' },
                    comment: { label: '注释', description: '画布注释，不参与执行' },
                    condition: { label: '条件', description: '根据上下文分支' },
                    switch: { label: '多路分支', description: '按上下文值选择分支' },
                    parallel: { label: '并行', description: '并发执行所有输出分支' },
                    join: { label: '汇聚', description: '等待所有输入分支完成后再继续' },
                    loop: { label: '循环', description: '重复执行节点体' },
                    delay: { label: '延迟', description: '等待后继续' },
                    log: { label: '日志', description: '记录一条消息' },
                    'http-request': { label: 'HTTP 请求', description: '调用 HTTP 接口' },
                    assign: { label: '赋值', description: '将值合并到工作流变量' },
                    transform: { label: '转换', description: '映射上一步结果' },
                    trycatch: { label: '异常捕获', description: '将失败路由到异常分支' },
                    subprocess: { label: '子流程', description: '执行另一个工作流' },
                    custom: { label: '自定义', description: '执行自定义活动或处理器' }
                },
                field: {
                    task: {
                        action: '动作',
                        result: '模拟结果',
                        fail: '使此步骤失败',
                        retry: '重试次数',
                        retryDelay: '重试间隔（毫秒）',
                        timeout: '超时（毫秒）'
                    },
                    inject: { payload: '数据' },
                    trigger: { delay: '延迟（毫秒）', payload: '数据' },
                    function: { code: '代码', timeout: '超时（毫秒）' },
                    template: { template: '模板', target: '目标字段' },
                    json: { mode: '模式', field: '字段', pretty: '格式化输出' },
                    csv: { mode: '模式', field: '字段', delimiter: '分隔符', header: '首行为表头' },
                    change: { action: '操作', field: '字段', value: '值' },
                    statistics: { field: '数组字段', path: '元素路径', operation: '操作', resultField: '结果字段' },
                    merge: { fields: '字段', mode: '模式', resultField: '结果字段' },
                    'event-emit': { event: '事件', payload: '数据' },
                    'event-wait': { event: '事件', timeout: '超时（毫秒）' },
                    command: { command: '命令', args: '参数', timeout: '超时（毫秒）' },
                    split: { field: '字段', delimiter: '分隔符' },
                    map: { field: '数组字段', path: '元素路径' },
                    filter: { field: '数组字段', path: '元素路径', operator: '运算符', value: '比较值' },
                    sort: { field: '数组字段', path: '排序路径', order: '顺序' },
                    range: { from: '起始', to: '结束', step: '步长' },
                    batch: { field: '数组字段', size: '批大小' },
                    comment: { text: '文本' },
                    condition: {
                        field: '字段',
                        operator: '运算符',
                        value: '比较值'
                    },
                    switch: {
                        field: '取值字段',
                        value: '期望值'
                    },
                    loop: {
                        iterations: '迭代次数',
                        delay: '延迟（毫秒）'
                    },
                    delay: { delay: '延迟（毫秒）' },
                    log: { message: '消息', level: '级别' },
                    'http-request': {
                        url: '地址',
                        method: '方法',
                        headers: '请求头',
                        body: '请求体',
                        retry: '重试次数',
                        retryDelay: '重试间隔（毫秒）',
                        timeout: '超时（毫秒）'
                    },
                    assign: { values: '值' },
                    transform: { mapping: '映射', result: '固定结果' },
                    subprocess: { workflow: '工作流 JSON' },
                    custom: { result: '结果' }
                },
                option: {
                    truthy: '为真',
                    equals: '等于',
                    notEquals: '不等于',
                    gt: '大于',
                    lt: '小于',
                    parse: '解析',
                    stringify: '序列化',
                    asc: '升序',
                    desc: '降序',
                    set: '设置',
                    delete: '删除',
                    append: '追加',
                    count: '计数',
                    sum: '求和',
                    avg: '平均',
                    min: '最小',
                    max: '最大',
                    object: '对象合并',
                    array: '数组拼接'
                },
                log: {
                    info: '信息',
                    success: '成功',
                    warning: '告警',
                    error: '错误'
                },
                demo: {
                    name: '审批流程示例',
                    description: '拖拽节点、连接端口并运行，实时查看执行路径。',
                    start: '开始',
                    loadInput: '读取输入',
                    approved: '是否通过',
                    approve: '通过处理',
                    reject: '拒绝处理',
                    end: '结束'
                }
            }
        }
    }
};

/**
 * Drop-in i18n module for the workflow designer. Import it when your app does
 * not already configure `@tsdi/i18n`; otherwise merge the exported bundles into
 * your own `I18nModule.withLocales(...)` call.
 */
@Module({
    imports: [I18nModule.withLocales(WORKFLOW_DESIGNER_TRANSLATIONS, 'zh-CN')],
    exports: [I18nModule]
})
export class WorkflowDesignerI18nModule { }

/**
 * Translate a workflow key with a typed fallback. The fallback keeps the TUI
 * and custom hosts usable even when no i18n module is installed.
 */
export function translateWorkflow(
    translator: Translator | undefined,
    locale: string,
    key: string,
    fallback: string,
    params?: Record<string, any>
): string {
    if (!translator) {
        return fallback;
    }
    try {
        if (translator.has(key, locale)) {
            return translator.translate(key, locale, params);
        }
        const translated = translator.translate(key, locale, params);
        if (translated && translated !== key) {
            return translated;
        }
    } catch {
        // Fall through to the built-in copy.
    }
    return fallback;
}

/**
 * Translate dynamic designer messages/errors. Text that is already a
 * `workflow.*` key is translated; raw runtime errors are shown unchanged.
 */
export function resolveWorkflowText(
    translator: Translator | undefined,
    locale: string,
    value: string | undefined,
    fallback = '',
    params?: Record<string, any>
): string {
    if (!value) {
        return fallback;
    }
    if (!value.startsWith('workflow.')) {
        return value;
    }
    return translateWorkflow(translator, locale, value, fallback || value, params);
}
