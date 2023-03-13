import { Class, Injectable, Injector, OperationInvoker, ReflectiveFactory, ReflectiveRef, Token, Type, TypeDef, TypeOf, isPromise } from '@tsdi/ioc';
import { isObservable, mergeMap, Observable, of } from 'rxjs';
import { Endpoint, FnEndpoint } from '../Endpoint';
import { EndpointContext } from '../filters';
import { FilterEndpoint } from '../filters/endpoint';
import { EndpointFactory, EndpointFactoryResolver, EndpointOptions } from '../filters/endpoint.factory';
import { CanActivate } from '../guard';
import { Interceptor } from '../Interceptor';


export class OperationEndpoint<TInput = any, TOutput = any> extends FilterEndpoint<TInput, TOutput> {

    constructor(injector: Injector,
        token: Token<Interceptor<TInput, TOutput>[]>,
        private invoker: OperationInvoker,
        filteToken: Token<Interceptor<TInput, TOutput>[]>,
        guards?: TypeOf<CanActivate>[]) {
        super(injector, token, null!, filteToken, guards)
    }

    protected override getBackend(): Endpoint<TInput, TOutput> {
        return new FnEndpoint(this.invoke.bind(this))
    }

    protected invoke(input: TInput, context: EndpointContext): Observable<TOutput> {
        return of(input)
            .pipe(
                mergeMap(value => {
                    const result = this.invoker.invoke(context);

                    if (isPromise(result) || isObservable(result)) return result;

                    return of(result);

                })
            )
    }
}

@Injectable()
export class EndpointFactoryImpl<T = any> extends EndpointFactory<T> {

    constructor(readonly typeRef: ReflectiveRef<T>) {
        super()
    }

    create(propertyKey: string, options: EndpointOptions): Endpoint<any, any> {
        return new OperationEndpoint(this.typeRef.injector, '', this.typeRef.createInvoker(propertyKey), '',);
    }

}

export class EndpointFactoryResolverImpl extends EndpointFactoryResolver {
    resolve<T>(type: Type<T> | Class<T, TypeDef<T>>, injector: Injector, categare?: 'event' | 'filter' | 'route'): EndpointFactory<T> {
        const tyref = injector.get(ReflectiveFactory).create(type, injector);

        switch (categare) {
            case 'event':
                break;

            case 'filter':
                break;

            case 'route':
                break;

            default:
                break;
        }
        return new EndpointFactoryImpl(tyref);
    }

}