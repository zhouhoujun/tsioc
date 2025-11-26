// import { Injectable, Injector, InvocationContext } from '@tsdi/ioc';
// import { ResponseEvent } from '@tsdi/common';
// import { ClientIncoming, HandlerTransfer, TransferFactory, TransferOpts } from '@tsdi/common/transport';



// export class ClientTransfer<TIn extends ClientIncoming = ClientIncoming, TOut extends ResponseEvent<any> = ResponseEvent<any>> extends HandlerTransfer<TIn, TOut> { }


// @Injectable()
// export abstract class ClientTransferFactory implements TransferFactory<ClientIncoming, ResponseEvent<any>> {
//     abstract create(context: Injector | InvocationContext, options?: TransferOpts<ClientIncoming>): ClientTransfer;
// }