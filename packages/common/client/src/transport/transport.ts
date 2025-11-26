// import { Abstract, getType, Injector } from '@tsdi/ioc';
// import { AbstractRequest, RequestContext, ResponseEvent, ResponseFactory } from '@tsdi/common';
// import { ClientIncoming, ClientIncomingFactory, Redirector, Transfer } from '@tsdi/common/transport';
// import { Observable, first, merge, mergeMap, takeUntil } from 'rxjs';
// import { ClientConfig } from '../options';


// /**
//  * transport for client.
//  */
// @Abstract()
// export abstract class ClientTransport<
//     TSocket = any,
//     TRequest extends AbstractRequest<any> = AbstractRequest<any>,
//     TMsg = any,
//     TOptions extends ClientConfig = ClientConfig> extends AbstractTransport<TSocket, ClientIncoming, TRequest, TMsg> {

//     readonly client = true;
//     /**
//      * client options
//      */
//     abstract get clientOptions(): TOptions;
//     /**
//      * client incoming message factory.
//      */
//     abstract get incomingFactory(): ClientIncomingFactory;
//     /**
//      * response factory.
//      */
//     abstract get responseFactory(): ResponseFactory;
//     /**
//      * incoming transfer
//      */
//     abstract get transfer(): Transfer<ClientIncoming, ResponseEvent<any>>;
//     /**
//      * redirector.
//      */
//     abstract get redirector(): Redirector | null;

//     get options() {
//         if (!this.clientOptions.transportOptions) {
//             this.clientOptions.transportOptions = {};
//         }
//         return this.clientOptions.transportOptions
//     }

//     get protocol(): string {
//         return this.clientOptions.protocol ?? '';
//     }

//     protected override initSendContext(context: RequestContext, request: TRequest): void {
//         context.set(AbstractRequest, request);
//         context.set(getType(request), request);
//     }

//     request(req: TRequest, context: RequestContext, destroy$?: Observable<any>): Observable<ResponseEvent<any>> {

//         context.set(Transport, this)
//             .set(ClientTransport, this);

//         return this.send(req, context)
//             .pipe(
//                 mergeMap((chl) => this.receive(context)),
//                 mergeMap(incoming => this.transfer.transform(incoming, context!)),
//                 takeUntil(destroy$ ? merge(this.destroy$, destroy$).pipe(first()) : this.destroy$)
//             )
//     }
// }

// /**
//  * client transport session factory.
//  */
// @Abstract()
// export abstract class ClientTransportFactory<TSocket = any, TOptions = ClientConfig> {
//     /**
//      * the options to create transport session.
//      * @param options 
//      */
//     abstract create(injector: Injector, socket: TSocket, options: TOptions): ClientTransport<TSocket>;
// }

