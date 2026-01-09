import { Abstract } from '@tsdi/ioc';
import { RNode } from '../renderer/Node';
import { EnvironmentContext } from '../refs/environment';
import { noReact } from '../effect';

// 新增模板解析器接口
@Abstract()
export abstract class TemplateParser<T = string> {

    abstract [noReact]: boolean;
    /**
     * 解析模板字符串为节点列表
     * @param template 模板字符串
     * @returns 解析后的节点列表
     */
    abstract parse(template: T, environment: EnvironmentContext): RNode[];
}
