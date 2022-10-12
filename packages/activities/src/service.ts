import { ApplicationContext, BootstrapOption, RunnableFactory, RunnableFactoryResolver, RunnableRef } from '@tsdi/core';
import { Injectable, Injector, isFunction, Type } from '@tsdi/ioc';


export class ActivityRunnableFactoryResover extends RunnableFactoryResolver {

}

@Injectable()
export class WorkflowService {

    constructor(private injector: Injector) {

    }

    /**
     * run activity.
     *
     * @template T
     * @param {(Type<T> | RunnableFactory<T> )} target
     * @param option bootstrap option, instance of {@link BootstrapOption}
     * @returns {*}
     */
    run<T>(target: Type<T> | RunnableFactory<T>, option?: BootstrapOption): any {
        const factory = isFunction(target) ? this.injector.resolve({ token: RunnableFactoryResolver, target }).resolve(target) : target;
        return this.injector.get(ApplicationContext).bootstrap(target)
    }
}