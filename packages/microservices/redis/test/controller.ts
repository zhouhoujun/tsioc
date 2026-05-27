import { lang } from '@tsdi/ioc';
import { BadRequestException, Transport } from '@tsdi/common';
import { Handle, Payload, RedirectResult, RequestBody, RequestParam, RequestPath, RouteMapping } from '@tsdi/service';
import { of } from 'rxjs';

@RouteMapping('/device')
export class DeviceController {
    @RouteMapping('/', 'GET')
    list(@RequestParam({ nullable: true }) name: string) {
        return name ? [{ name: '1' }, { name: '2' }].filter(i => i.name === name) : [{ name: '1' }, { name: '2' }];
    }

    @RouteMapping('/init', 'POST')
    req(@RequestParam() name: string) {
        return { name };
    }

    @RouteMapping('/usage', 'POST')
    age(@RequestBody() id: string, @RequestBody('age', { pipe: 'int' }) year: number, @RequestBody({ pipe: 'date' }) createAt: Date) {
        return { id, year, createAt };
    }

    @RouteMapping('/usege/find', 'GET')
    agela(@RequestParam('age', { pipe: 'int' }) limit: number) {
        return limit;
    }

    @RouteMapping('/:age/used', 'GET')
    resfulquery(@RequestPath('age', { pipe: 'int' }) age1: number) {
        if (age1 <= 0) {
            throw new BadRequestException();
        }
        return age1;
    }

    @RouteMapping('/update', 'POST')
    async update(@RequestParam() version: string) {
        const defer = lang.defer<string>();
        setTimeout(() => defer.resolve(version), 10);
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

    @Handle({ cmd: 'xxx' }, Transport.Redis)
    async subMessage(@Payload() message: string) {
        return message;
    }

    @Handle('dd/*', Transport.Redis)
    async subMessage1(@Payload() message: string) {
        return message;
    }
}
