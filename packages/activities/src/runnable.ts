import { DefaultRunnableFactory, RunnableFactory, RunnableFactoryResolver, RunnableRef } from '@tsdi/core';
import { Injectable, Injector, InvokeArguments, isFunction, Type, TypeDef } from '@tsdi/ioc';




class ActivityRunnableFactory<T> extends DefaultRunnableFactory<T> {
    protected override createInstance(def: TypeDef<T>, injector: Injector, options?: InvokeArguments, invokeMethod?: string): RunnableRef<T> {
        const runnableRef = new SuiteRunner(def, injector, options, invokeMethod);
        injector.platform().getAction(Advisor).attach(refl.get(SuiteRunner, true), runnableRef)
        return runnableRef;
    }
}

@Injectable()
export class ActivityRunnableFactoryResolver extends RunnableFactoryResolver {

    resolve<T>(type: Type<T> | TypeDef<T>): RunnableFactory<T> {
        return new ActivityRunnableFactory(isFunction(type) ? refl.get(type) : type)
    }
}
