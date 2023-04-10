import { HttpEvent, HttpRequest } from '@tsdi/common';
import { AbstractGuardHandler } from '@tsdi/core';
import { Abstract } from '@tsdi/ioc';


@Abstract()
export abstract class HttpGuardsHandler extends AbstractGuardHandler<HttpRequest, HttpEvent> {

}