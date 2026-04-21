import { JoinPoint } from '@tsdi/aop';
import { Level, Logger, DefaultJoinPointFormater } from '@tsdi/logger';
export declare class ServerJoinpointLogFormater extends DefaultJoinPointFormater {
    format(joinPoint: JoinPoint, level: Level, logger: Logger, ...messages: any[]): any[];
}
