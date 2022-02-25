import { Abstract } from "@tsdi/ioc";
import { TransportBackend, TransportHandler } from "../handler";



@Abstract()
export abstract class MqttHandler implements TransportHandler {
    /**
     * transport handler.
     * @param req request input.
     */
     abstract handle(req: TRequest): Observable<TResponse>;
}

@Abstract()
export abstract class MqttBackend implements TransportBackend {
    /**
     * transport handler.
     * @param req request input.
     */
     abstract handle(req: TRequest): Observable<TResponse>;

}