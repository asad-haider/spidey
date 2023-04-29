import axios, { AxiosResponse } from 'axios';
import * as cheerio from 'cheerio';
import { appendFileSync, existsSync, writeFileSync } from 'fs';
import Queue from './queue';
import { RequestOptions, SpideyOptions, SpideyResponse, SpideyResponseCallback } from './interfaces';
import { Constants } from './constants';

export class Spidey {
  startUrls: string[] = [];
  requestPipeline: Queue;
  dataPipeline: Queue;

  constructor(private options?: SpideyOptions) {
    this.options = this.setDefaultOptions(options);

    this.requestPipeline = new Queue(this.options.concurrency as number);
    this.dataPipeline = new Queue(this.options.itemConcurrency as number);

    this.requestPipeline.onStart = this.onStart.bind(this);
    this.requestPipeline.onComplete = this.onComplete.bind(this);
  }

  start() {
    for (const url of this.startUrls) {
      this.request({ url }, this.parse.bind(this));
    }
  }

  parse(response: SpideyResponse) {}

  async request(options: RequestOptions, callback: SpideyResponseCallback) {
    const result = await this.requestPipeline.task(() => this.processRequest(options));
    const response = {
      ...result,
      meta: options?.meta,
      $: cheerio.load(result.data),
    };
    if (options.inline) return response;
    return callback(response);
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
    if (!options?.outputFileName.endsWith(options.outputFormat)) options.outputFileName += `.${options.outputFormat}`;
    return options;
  }

  private async processRequest(options: RequestOptions): Promise<AxiosResponse> {
    return axios.request({
      url: options.url,
      method: options.method || 'GET',
      headers: options.headers,
      data: options.body,
      timeout: options.timeout,
      responseType: options.json ? 'json' : 'text',
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
}
