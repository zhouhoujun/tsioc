import {
    BadRequestExecption, ExecptionHandler, ForbiddenExecption, InternalServerExecption, MessageExecption,
    NotFoundExecption, UnauthorizedExecption, UnsupportedMediaTypeExecption, HttpStatusCode
} from '@tsdi/core';
import { ArgumentExecption, Injectable, MissingParameterExecption } from '@tsdi/ioc';
import { MissingModelFieldExecption } from '@tsdi/repository';
import { ErrorRespondAdapter } from '@tsdi/transport';
import { MqttContext } from './context';
import { MQTT_SERV_OPTS } from './options';



@Injectable({ static: true })
export class MqttExecptionHandlers {

    constructor(private adpater: ErrorRespondAdapter) {

    }

    @ExecptionHandler(NotFoundExecption)
    notFoundExecption(ctx: MqttContext, execption: NotFoundExecption) {
        execption.status = HttpStatusCode.NotFound;
        this.adpater.respond(ctx, execption)
    }

    @ExecptionHandler(ForbiddenExecption)
    forbiddenExecption(ctx: MqttContext, execption: ForbiddenExecption) {
        execption.status = HttpStatusCode.Forbidden;
        this.adpater.respond(ctx, execption)
    }

    @ExecptionHandler(BadRequestExecption)
    badReqExecption(ctx: MqttContext, execption: BadRequestExecption) {
        execption.status = HttpStatusCode.BadRequest;
        this.adpater.respond(ctx, execption)
    }

    @ExecptionHandler(UnauthorizedExecption)
    unauthorized(ctx: MqttContext, execption: UnauthorizedExecption) {
        execption.status = HttpStatusCode.Unauthorized;
        this.adpater.respond(ctx, execption)
    }

    @ExecptionHandler(InternalServerExecption)
    internalServerError(ctx: MqttContext, execption: InternalServerExecption) {
        execption.status = HttpStatusCode.InternalServerError;
        this.adpater.respond(ctx, execption)
    }

    @ExecptionHandler(UnsupportedMediaTypeExecption)
    unsupported(ctx: MqttContext, execption: UnsupportedMediaTypeExecption) {
        execption = new MessageExecption(execption.message, HttpStatusCode.UnsupportedMediaType);
        this.adpater.respond(ctx, execption)
    }

    @ExecptionHandler(ArgumentExecption)
    anguExecption(ctx: MqttContext, err: ArgumentExecption) {
        const execption = new BadRequestExecption(ctx.get(MQTT_SERV_OPTS).detailError ? err.message : undefined, HttpStatusCode.BadRequest);
        this.adpater.respond(ctx, execption)
    }

    @ExecptionHandler(MissingModelFieldExecption)
    missFieldExecption(ctx: MqttContext, err: MissingModelFieldExecption) {
        const execption = new BadRequestExecption(ctx.get(MQTT_SERV_OPTS).detailError ? err.message : undefined, HttpStatusCode.BadRequest);
        this.adpater.respond(ctx, execption)
    }

    @ExecptionHandler(MissingParameterExecption)
    missExecption(ctx: MqttContext, err: MissingParameterExecption) {
        const execption = new BadRequestExecption(ctx.get(MQTT_SERV_OPTS).detailError ? err.message : undefined, HttpStatusCode.BadRequest);
        this.adpater.respond(ctx, execption)
    }

}
