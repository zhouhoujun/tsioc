import { Abstract } from '@tsdi/ioc';


/** 
 * application arguments.  
 * 
 * 应用程序启动参数
 */
@Abstract()
export abstract class ApplicationArguments implements Record<string, any> {
    /** 
     * process args source
     * 
     * 应用程序启动参数源  
     */
    abstract get argsSource(): string[];
    /** 
     * process args map. 
     * 
     * 应用程序启动参数集
     */
    abstract get args(): Record<string, string>;
    /**
     * process args command.
     *  
     * 应用程序启动命令
     */
    abstract get cmds(): string[];

    /**
     * process env 
     * 
     * 应用程序启动环境变量
     */
    abstract get env(): Record<string, string | undefined>;

    /**
     * process exit signls. 
     * 
     * 应用程序退出信号
     */
    abstract get signls(): string[];

    /** 
     * reset args. 
     * 
     * 重置应用程序启动参数
     * @param args the args reset with. 
     */
    abstract reset(args: string[]): void;
}

