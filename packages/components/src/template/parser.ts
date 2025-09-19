import { Abstract, InvocationContext } from '@tsdi/ioc';
import { RNode } from '../renderer/Node';

// 新增模板解析器接口
@Abstract()
export abstract class TemplateParser {
    /**
     * 解析模板字符串为节点列表
     * @param template 模板字符串
     * @returns 解析后的节点列表
     */
    abstract parse(template: string, environument: InvocationContext): RNode[];
}
