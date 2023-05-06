import axios, { AxiosProxyConfig, AxiosResponse } from 'axios';
import * as cheerio from 'cheerio';
import Queue from './queue';
import {
  ISpideyPipeline,
  RequestOptions,
  SpideyOptions,
  SpideyPipeline,
  SpideyResponse,
  SpideyResponseCallback,
  SpideyStatistics,
} from './interfaces';
import { Constants } from './constants';
import { createLogger, Logger, transports, format } from 'winston';
import { parse } from 'url';
import { select } from 'xpath';
import { DOMParser } from 'xmldom';
import { JsonPipeline } from './pipeline';

class DiscardItemError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = 'DiscardItem';
  }
}

class Spidey {
  logger!: Logger;
  startUrls: string[] = [];

  private requestPipeline: Queue;
  private dataPipeline: Queue;
  private pipeline: SpideyPipeline[] = [];
  private statsInterval!: NodeJS.Timeout;
  private stateInterval!: NodeJS.Timeout;
  private totalStats: SpideyStatistics = {
    requests: 0,
    items: 0,
    retries: 0,
    success: 0,
    failed: 0,
  };
  private perMinuteStats: SpideyStatistics = {
    requests: 0,
    items: 0,
    retries: 0,
    success: 0,
    failed: 0,
  };

  constructor(private options?: SpideyOptions) {
    // setting default options
    this.options = this.setDefaultOptions(options);

    this.initializeLogger();

    this.requestPipeline = new Queue({
      concurrency: this.options.concurrency as number,
      delay: this.options.delay as number,
    });
    this.dataPipeline = new Queue({ concurrency: this.options.itemConcurrency as number });

    this.onStart();
    this.initializeIntervals();
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
    const taskOptions = { priority: options.priority };
    const result = await this.requestPipeline.task(taskOptions, async () => {
      if (!options?.meta?.retryCount) this.perMinuteStats.requests++;
      try {
        const response = await this.processRequest(options);
        this.logger.debug(`${options.method}<${response.status}> ${options.url}`);
        return { success: true, response };
      } catch (error: any) {
        const statusCode = error?.response?.status;
        let retryCount = options.meta?.retryCount || 0;

        if (
          (!error?.response || this.options?.retryStatusCode?.includes(statusCode)) &&
          retryCount < (this.options?.retries as number)
        ) {
          retryCount++;
          if (statusCode)
            this.logger.debug(
              `Failed: Retrying(Retry Times: ${retryCount}) ${options.method}<${statusCode}> ${options.url}`,
            );
          else this.logger.debug(`Failed: Retrying(Retry Times: ${retryCount}) ${options.method} ${options.url}`);
          options.meta = { ...options.meta, retryCount };
          this.perMinuteStats.retries++;
          return { success: false, retry: true };
        } else {
          if (statusCode) this.logger.error(`Failed ${options.method}<${statusCode}> ${options.url}`);
          else this.logger.error(`Failed ${options.method} ${options.url}`);
          this.perMinuteStats.failed++;
          return { success: false, retry: false };
        }
      }
    });

    if (result?.retry) return this.request(options, callback);
    if (!result?.success) return;

    const spideyResponse = this.getSpideyResponse(options, result);
    this.perMinuteStats.success++;
    if (options.inline) return spideyResponse;
    return callback(spideyResponse);
  }

  save(data: any) {
    this.dataPipeline.task({}, () => this.processData(data));
  }

  scheduledRequestsCount() {
    return this.requestPipeline.length();
  }

  getOptions() {
    return this.options as SpideyOptions;
  }

  private async onStart() {
    this.logger.info(`Spidey process started`);
    this.totalStats.startTime = new Date();

    switch (this.options?.outputFormat) {
      case 'json':
        this.options?.pipelines?.push(JsonPipeline);
        break;
    }
    this.pipeline = this.options?.pipelines?.map((Pipeline: ISpideyPipeline) => new Pipeline(this.options)) ?? [];

    // Call start functions in all pipelines
    for (const pipeline of this.pipeline) if (pipeline.start) await pipeline.start();
  }

  private async onComplete() {
    this.totalStats.endTime = new Date();

    // Call complete functions in all pipelines
    for (const pipeline of this.pipeline) if (pipeline.complete) await pipeline.complete();

    // Clearing statistics interval
    if (this.statsInterval) clearInterval(this.statsInterval);
    if (this.stateInterval) clearInterval(this.stateInterval);

    this.savePerMinuteStats();
    this.printLogs();
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
      url: result.response.config.url,
      $: cheerio.load(result.response.data),
      xpath: (selector: string, node?: any) => select(selector, node ?? tree),
    };
  }

  private setDefaultOptions(options?: SpideyOptions) {
    options = options || {};
    options.concurrency = options?.concurrency || Constants.DEFAULT_CONCURRENCY;
    options.itemConcurrency = options?.itemConcurrency || options?.concurrency;
    options.delay = options?.delay || Constants.DEFAULT_DELAY;
    options.retries = options?.retries || Constants.DEFAULT_RETRIES;
    options.retryStatusCode = options?.retryStatusCode || Constants.DEFAULT_RETRY_STATUS_CODE;
    options.logLevel = options?.logLevel || Constants.DEFAULT_DEBUG_LEVEL;
    options.continuous = options.continuous ?? Constants.DEFAULT_SPIDEY_STATE;
    options.pipelines = options?.pipelines || [];

    if (options.outputFormat) {
      options.outputFileName = options?.outputFileName || Constants.DEFAULT_OUTPUT_FILE_NAME;
      if (!options?.outputFileName.endsWith(options.outputFormat)) options.outputFileName += `.${options.outputFormat}`;
    }

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
    try {
      for (const pipeline of this.pipeline) if (data) data = await pipeline.process(data);
      if (data) {
        this.perMinuteStats.items++;
        this.logger.debug(`Crawled ${JSON.stringify(data, null, 2)}`);
      }
    } catch (error: any) {
      if (error instanceof DiscardItemError) return this.logger.error(`Discard Item: ${error.message}`);
      return this.logger.error(`Error: ${error.message}`);
    }
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

  private savePerMinuteStats() {
    this.totalStats.requests += this.perMinuteStats.requests;
    this.totalStats.items += this.perMinuteStats.items;
    this.totalStats.success += this.perMinuteStats.success;
    this.totalStats.failed += this.perMinuteStats.failed;
    this.totalStats.retries += this.perMinuteStats.retries;
  }

  private resetStats() {
    this.perMinuteStats = {
      requests: 0,
      success: 0,
      failed: 0,
      retries: 0,
      items: 0,
    };
  }

  private initializeLogger() {
    this.logger = createLogger({
      level: this.options?.logLevel,
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

  private initializeIntervals() {
    this.statsInterval = setInterval(() => {
      this.logger.info(`Crawled ${this.perMinuteStats.requests} pages, ${this.perMinuteStats.items} items per minute`);

      this.savePerMinuteStats();
      this.resetStats();
    }, 60 * 1000);

    if (!this.options?.continuous) {
      this.stateInterval = setInterval(async () => {
        if (this.requestPipeline.length() === 0 && this.dataPipeline.length() === 0) await this.onComplete();
      }, 1000);
    }
  }

  private printLogs() {
    this.logger.info('Spidey process completed');
    this.logger.info(`Start: ${this.totalStats.startTime?.toISOString()}`);
    this.logger.info(`Complete: ${this.totalStats.endTime?.toISOString()}`);
    this.logger.info(`Total Requests: ${this.totalStats.requests}`);
    this.logger.info(`Total Items: ${this.totalStats.items}`);
    this.logger.info(`Total Success: ${this.totalStats.success}`);
    this.logger.info(`Total Failed: ${this.totalStats.failed}`);
    this.logger.info(`Total Retries: ${this.totalStats.retries}`);
  }
}

export { Spidey, SpideyOptions, RequestOptions, SpideyResponse, SpideyPipeline, DiscardItemError };
