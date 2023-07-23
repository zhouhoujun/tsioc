import { BadRequestExecption, Handle, Payload, RequestBody, RequestParam, RequestPath, RouteMapping, Subscribe } from '@tsdi/core';
import { lang } from '@tsdi/ioc';
import { RedirectResult } from '@tsdi/transport';
import {  of } from 'rxjs';
import { UdpClient } from '../src';


@RouteMapping('/device')
export class DeviceController {

    constructor(private client: UdpClient){

    }

    @RouteMapping('/', 'GET')
    list(@RequestParam({ nullable: true }) name: string) {
        return name ? [{ name: '1' }, { name: '2' }].filter(i => i.name === name) : [{ name: '1' }, { name: '2' }];
    }

    @RouteMapping('/init', 'POST')
    req(name: string) {
        console.log('DeviceController init:', name);
        return { name };
    }

    @RouteMapping('/usage', 'POST')
    age(@RequestBody() id: string, @RequestBody('age', { pipe: 'int' }) year: number, @RequestBody({ pipe: 'date' }) createAt: Date) {
        console.log('usage:', id, year, createAt);
        return { id, year, createAt };
    }

    @RouteMapping('/usege/find', 'GET')
    agela(@RequestParam('age', { pipe: 'int' }) limit: number) {
        console.log('limit:', limit);
        return limit;
    }

    @RouteMapping('/:age/used', 'GET')
    resfulquery(@RequestPath('age', { pipe: 'int' }) age1: number) {
        console.log('age1:', age1);
        if (age1 <= 0) {
            throw new BadRequestExecption();
        }
        return age1;
    }


    @RouteMapping('/update', 'POST')
    async update(version: string) {
        // do smth.
        console.log('update version:', version);
        const defer = lang.defer();

        setTimeout(() => {
            defer.resolve(version);
        }, 10);

        return await defer.promise;
    }

    @RouteMapping('/status', 'GET')
    getLastStatus(@RequestParam('redirect', { nullable: true }) redirect: string) {
        if (redirect === 'reload') {
            return new RedirectResult('/device/reload');
        }
        return of('working');
    }

    @RouteMapping('/reload', 'GET')
    redirect() {
        return 'reload';
    }


    @Handle({ cmd: 'xxx' }, 'udp')
    async subMessage(@Payload() message: string) {
        return message;
    }

    @Handle('dd/*')
    async subMessage1(@Payload() message: string) {
        return message;
    }

}
