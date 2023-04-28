import axios, { AxiosResponse } from 'axios';
import Bottleneck from 'bottleneck';
import * as cheerio from 'cheerio';

class Constants {
  static readonly DEFAULT_CONCURRENCY = 2;
  static readonly DEFAULT_DELAY = 0;
}

export interface SpideyOptions {
  concurrency?: number;
  delay?: number;
}

export interface RequestOptions {
  url: string;
  method?: string;
  headers?: any;
  body?: any;
  json?: boolean;
  timeout?: number;
  metadata?: any;
}

export interface SpideyResponse extends AxiosResponse {
  $: any;
}

declare type SpideyResponseCallback = (response: SpideyResponse) => void;

export class Spidey {
  engine: Bottleneck;
  startUrls: string[] = [];

  constructor(private options?: SpideyOptions) {
    this.options = this.setDefaultOptions(options);
    this.engine = new Bottleneck({
      minTime: this.options.delay,
      maxConcurrent: this.options.concurrency,
    });
  }

  start() {
    for (const url of this.startUrls) {
      this.request({ url }, this.parse.bind(this));
    }
  }

  parse(response: SpideyResponse) {}

  async request(options: RequestOptions, callback: SpideyResponseCallback) {
    const result = await this.engine.schedule(() => this.processRequest(options));
    return callback({
      ...result,
      $: cheerio.load(result.data),
    });
  }

  private setDefaultOptions(options?: SpideyOptions) {
    options = options || {};
    options.concurrency = options?.concurrency || Constants.DEFAULT_CONCURRENCY;
    options.delay = options?.delay || Constants.DEFAULT_DELAY;
    return options;
  }

  private async processRequest(request: RequestOptions): Promise<AxiosResponse> {
    return axios.request({
      url: request.url,
      method: request.method || 'GET',
      headers: request.headers,
      data: request.body,
      timeout: request.timeout,
      responseType: request.json ? 'json' : 'text',
    });
  }
}
