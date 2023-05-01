import axios, { AxiosProxyConfig, AxiosResponse } from 'axios';
import * as cheerio from 'cheerio';
import { appendFileSync, existsSync, writeFileSync } from 'fs';
import Queue from './queue';
import { RequestOptions, SpideyOptions, SpideyPipeline, SpideyResponse, SpideyResponseCallback } from './interfaces';
import { Constants } from './constants';
import { createLogger, Logger, transports, format } from 'winston';
import { parse } from 'url';
import { select } from 'xpath';
import { DOMParser } from 'xmldom';
import { JsonPipeline } from './pipeline';

type ISpideyPipeline = new (options?: SpideyOptions) => SpideyPipeline;

export { SpideyOptions, RequestOptions, SpideyResponse, SpideyPipeline };

export class Spidey {
  startUrls: string[] = [];
  private requestPipeline: Queue;
  private dataPipeline: Queue;
  private logger: Logger;
  private pipelineRegistry: ISpideyPipeline[] = [];
  private pipeline: SpideyPipeline[] = [];

  constructor(private options?: SpideyOptions) {
    this.options = this.setDefaultOptions(options);

    this.requestPipeline = new Queue(this.options.concurrency as number);
    this.dataPipeline = new Queue(this.options.itemConcurrency as number);

    this.requestPipeline.on('start', this.onStart.bind(this));
    this.requestPipeline.on('complete', this.onComplete.bind(this));

    this.logger = createLogger({
      level: this.options.logLevel,
      format: format.combine(
        format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss',
        }),
        format.printf((info: any) => {
          return `${info.level.toUpperCase()}: ${info.timestamp} ${info.message}`;
        }),
      ),
      transports: [new transports.Console()],
    });
  }

  use(pipeline: ISpideyPipeline) {
    this.pipelineRegistry.push(pipeline);
  }

  start() {
    for (const url of this.startUrls) {
      this.request({ url, method: 'GET' }, this.parse?.bind(this));
    }
  }

  parse(_response: SpideyResponse) {
    return;
  }

  async request(options: RequestOptions, callback: SpideyResponseCallback): Promise<void | SpideyResponse> {
    options.method = options.method || 'GET';
    const result = await this.requestPipeline.task(async () => {
      try {
        const response = await this.processRequest(options);
        this.logger.debug(`${options.method}<${response.status}> ${options.url}`);
        return { success: true, response };
      } catch (error: any) {
        const statusCode = error?.response?.status;
        const retryCount = options.meta?.retryCount || 0;

        if (
          (!error?.response || this.options?.retryStatusCode?.includes(statusCode)) &&
          retryCount < (this.options?.retries as number)
        ) {
          if (statusCode) this.logger.debug(`Failed, retrying ${options.method}<${statusCode}> ${options.url}`);
          else this.logger.debug(`Failed, retrying ${options.method} ${options.url}`);
          options.meta = { ...options.meta, retryCount: retryCount + 1 };
          return { success: false, retry: true };
        } else {
          if (statusCode) this.logger.debug(`Failed ${options.method}<${statusCode}> ${options.url}`);
          else this.logger.debug(`Failed ${options.method} ${options.url}`);
          return { success: false, retry: false };
        }
      }
    });

    if (result?.retry) return this.request(options, callback);
    if (!result?.success) return;

    const spideyResponse = this.getSpideyResponse(options, result);
    if (options.inline) return spideyResponse;
    return callback(spideyResponse);
  }

  save(data: any) {
    this.dataPipeline.task(() => this.processData(data));
  }

  onStart() {
    switch (this.options?.outputFormat) {
      case 'json':
        this.use(JsonPipeline);
        break;
    }
    this.pipeline = this.pipelineRegistry.map((Pipeline: ISpideyPipeline) => new Pipeline(this.options));
  }

  onComplete() {
    for (const pipeline of this.pipeline) {
      if (pipeline.complete) pipeline.complete();
    }
  }

  private getSpideyResponse(options: RequestOptions, result: any) {
    const tree = new DOMParser({
      locator: {},
      errorHandler: {
        error: () => undefined,
        warning: () => undefined,
        fatalError: () => undefined,
      },
    }).parseFromString(result.response.data, 'text/html');

    return {
      ...result.response,
      meta: options?.meta,
      $: cheerio.load(result.response.data),
      xpath: (selector: string, node?: any) => select(selector, node ?? tree),
    };
  }

  private setDefaultOptions(options?: SpideyOptions) {
    options = options || {};
    options.concurrency = options?.concurrency || Constants.DEFAULT_CONCURRENCY;
    options.itemConcurrency = options?.itemConcurrency || options?.concurrency;
    options.delay = options?.delay || Constants.DEFAULT_DELAY;
    options.outputFormat = options?.outputFormat || Constants.DEFAULT_OUTPUT_FORMAT;
    options.outputFileName = options?.outputFileName || Constants.DEFAULT_OUTPUT_FILE_NAME;
    options.retries = options?.retries || 0;
    options.retryStatusCode = options?.retryStatusCode || [500, 502, 503, 504, 522, 524, 408, 429];
    options.logLevel = options?.logLevel || 'debug';
    if (!options?.outputFileName.endsWith(options.outputFormat)) options.outputFileName += `.${options.outputFormat}`;
    return options;
  }

  private async processRequest(options: RequestOptions): Promise<AxiosResponse> {
    return axios.request({
      url: options.url,
      method: options.method,
      headers: options.headers,
      data: options.body,
      timeout: options.timeout,
      withCredentials: true,
      responseType: options.json ? 'json' : 'document',
      validateStatus: (status) => status < 400,
      maxRedirects: 3,
      proxy: this.getProxy(options),
    });
  }

  private async processData(data: any) {
    for (const pipeline of this.pipeline) {
      data = pipeline.process(data, this.requestPipeline.length() === 1);
    }

    this.logger.debug(`Crawled ${JSON.stringify(data, null, 2)}`);
  }

  private getProxy(requestOptions?: RequestOptions) {
    const proxyUrl = requestOptions?.proxyUrl || this.options?.proxyUrl;
    const proxy = requestOptions?.proxy || this.options?.proxy;
    if (proxyUrl) return this.parseProxyUrl(proxyUrl);
    else if (proxy) return proxy;
    else return false;
  }

  private parseProxyUrl(proxyUrl: string): AxiosProxyConfig | false {
    try {
      const parsedUrl = parse(proxyUrl);
      const proxy: AxiosProxyConfig = {
        protocol: parsedUrl?.protocol?.replace(':', ''),
        host: parsedUrl.hostname as string,
        port: +(parsedUrl.port as string),
      };
      if (parsedUrl.auth) {
        const auth = parsedUrl.auth.split(':');
        proxy.auth = {
          username: auth[0],
          password: auth[1],
        };
      }
      return proxy;
    } catch (error) {
      return false;
    }
  }
}
