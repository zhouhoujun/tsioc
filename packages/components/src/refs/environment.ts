import { Abstract, InvocationContext } from '@tsdi/ioc';
import { ElementRef } from './element';
import { TemplateRef } from './template';
import { ViewRef } from './view';

@Abstract()
export abstract class EnvironmentContext extends InvocationContext {

    /**
     * get template ref.
     * @param element template element.
     */
    abstract getViewRef<C>(context?: C): ViewRef<C>;

    /**
     * get template ref.
     * @param element template element.
     */
    abstract getTemplateRef<T>(element?: T): TemplateRef<T>;
    /**
     * get element ref.
     *
     * @template T
     * @param {T} element
     * @return {*}  {ElementRef<T>}
     * @memberof EnvironmentContext
     */
    abstract getElementRef<T>(element?: T): ElementRef<T>;
}
