import { AxiosResponse } from 'axios';

interface SpdieyProxy {
  host: string;
  port: number;
  auth?: {
    username: string;
    password: string;
  };
}

export interface SpideyOptions {
  concurrency?: number;
  delay?: number;
  retries?: number;
  retryStatusCode?: number[];
  itemConcurrency?: number;
  outputFormat?: OutputFormat;
  outputFileName?: string;
  logLevel?: 'info' | 'debug' | 'error';
  proxy?: SpdieyProxy;
  proxyUrl?: string;
  continuous?: boolean;
  pipelines?: ISpideyPipeline[];
  downloadDir?: string;
  headers?: any;
  [key: string]: any;
}

export interface RequestOptions {
  url: string;
  method?: string;
  headers?: any;
  body?: any;
  json?: boolean;
  timeout?: number;
  meta?: any;
  inline?: boolean;
  proxy?: SpdieyProxy;
  proxyUrl?: string;
  priority?: number;
  download?: boolean;
}

export interface SpideyResponse extends AxiosResponse {
  $: any;
  xpath: any;
  meta?: any;
  url: string;
}

export interface SpideyPipeline<T = any> {
  start?(): void | Promise<void>;
  process(data: T): T | Promise<T>;
  complete?(): void | Promise<void>;
}

export interface SpideyStatistics {
  items: number;
  requests: number;
  retries: number;
  success: number;
  failed: number;
  startTime?: Date;
  endTime?: Date;
}

export declare type OutputFormat = 'json' | 'csv' | 'tsv' | 'txt';
export declare type SpideyResponseCallback = (response: SpideyResponse) => void;
export declare type ISpideyPipeline = new (options?: SpideyOptions) => SpideyPipeline;
