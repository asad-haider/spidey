import axios, { AxiosProxyConfig, AxiosResponse } from 'axios';
import * as cheerio from 'cheerio';
import { appendFileSync, existsSync, writeFileSync } from 'fs';
import Queue from './queue';
import { RequestOptions, SpideyOptions, SpideyResponse, SpideyResponseCallback } from './interfaces';
import { Constants } from './constants';
import { createLogger, Logger, transports, format } from 'winston';

export { SpideyOptions, RequestOptions, SpideyResponse };

export class Spidey {
  startUrls: string[] = [];
  requestPipeline: Queue;
  dataPipeline: Queue;
  logger: Logger;

  constructor(public options?: SpideyOptions) {
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

  start() {
    for (const url of this.startUrls) {
      this.request({ url, method: 'GET' }, this.parse?.bind(this));
    }
  }

  parse(_response: SpideyResponse) {
    return;
  }

  async request(options: RequestOptions, callback: SpideyResponseCallback) {
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
          return this.request(options, callback);
        } else {
          if (statusCode) this.logger.debug(`Failed ${options.method}<${statusCode}> ${options.url}`);
          else this.logger.debug(`Failed ${options.method} ${options.url}`);
          return { success: false, response: error.response };
        }
      }
    });

    if (result && result.success) {
      const response = {
        ...result.response,
        meta: options?.meta,
        $: cheerio.load(result.response.data),
      };
      if (options.inline) return response;
      return callback(response);
    }
  }

  save(data: any) {
    this.dataPipeline.task(() => this.processData(data));
  }

  onStart() {
    const fileName = this.options?.outputFileName as string;
    switch (this.options?.outputFormat) {
      case 'json':
        writeFileSync(fileName, '[');
        break;
    }
  }

  onComplete() {
    const fileName = this.options?.outputFileName as string;
    switch (this.options?.outputFormat) {
      case 'json':
        appendFileSync(fileName, ']');
        break;
    }
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
    const fileName = this.options?.outputFileName as string;
    switch (this.options?.outputFormat) {
      case 'json':
        if (!existsSync(fileName)) {
          appendFileSync(fileName, '[');
        } else {
          if (this.requestPipeline.length() === 1) {
            appendFileSync(fileName, JSON.stringify(data));
          } else {
            appendFileSync(fileName, JSON.stringify(data) + ',');
          }
        }
        break;
    }
  }

  private getProxy(requestOptions?: RequestOptions) {
    const proxyUrl = requestOptions?.proxyUrl || this.options?.proxyUrl;
    const proxy = requestOptions?.proxy || this.options?.proxy;
    if (proxyUrl) return this.parseProxyUrl(proxyUrl);
    else if (proxy) return proxy;
    else return false;
  }

  private parseProxyUrl(proxyUrl: string): AxiosProxyConfig {
    const authRegex = /\/\/(.+):(.+)@/;
    const [match, username, password] = proxyUrl.match(authRegex) || [null, null, null];
    const { protocol, hostname, port } = new URL(proxyUrl);
    const proxy: AxiosProxyConfig = {
      protocol: protocol.replace(':', ''),
      host: hostname,
      port: parseInt(port),
    };
    if (username && password) {
      proxy.auth = {
        username,
        password,
      };
    }
    return proxy;
  }
}
