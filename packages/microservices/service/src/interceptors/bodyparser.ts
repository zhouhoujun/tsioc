export abstract class BodyParserInterceptor {
    abstract intercept(input: any, next: any, context: any): any;
}
