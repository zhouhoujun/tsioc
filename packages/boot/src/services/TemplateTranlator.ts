import { Singleton, Inject, isBaseObject, isArray, isNullOrUndefined, Type, isObject, lang, isClass, isBaseType } from '@tsdi/ioc';
import { ContainerToken, IContainer } from '@tsdi/core';
import { BuilderService } from './BuilderService';
import { SelectorManager, IBinding } from '../core';

/**
 * template translator
 *
 * @export
 * @class TemplateTranlator
 */
@Singleton
export class TemplateTranlator {
    @Inject(ContainerToken)
    protected container: IContainer;

    constructor() {

    }

    getTagName() {
        return 'selector';
    }

    getSelector(template: any): string {
        if (isBaseObject(template)) {
            return template[this.getTagName()];
        }
        return '';
    }

    async resolve<T>(template: any, binding: IBinding<T>): Promise<T | T[]> {
        if (isArray(template) && binding.type === Array) {
            return await this.resolveTempArray(template, binding);
        } else if (isClass(template) && !isBaseType(template) && template !== Error) {

        } else if (isBaseObject(template)) {
            let selector = this.getSelector(template);
            let moduleType: Type<any>;
            if (selector) {
                moduleType = this.container.get(SelectorManager).get(selector);
            }
            if (!moduleType) {
                moduleType = this.container.getTokenProvider(binding.provider || binding.type);
            }
            let bindingName = binding.bindingName || binding.name;
            let subTeamplat = template[bindingName];
            if (!isNullOrUndefined(subTeamplat)) {
                return await this.container.get(BuilderService).create({ module: moduleType, template: subTeamplat });
            }
        } else if (isObject(template)) {
            let ttype = lang.getClass(template);
            if (ttype === binding.type) {
                return template as any;
            }
        }

        return binding.defaultValue;
    }

    protected async resolveTempArray(template: any[], binding: IBinding<any>): Promise<any[]> {
        return await Promise.all(template.map(it => this.resolve(it, binding)));
    }
}
