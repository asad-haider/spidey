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
}

export interface SpideyResponse extends AxiosResponse {
  $: any;
  xpath: any;
  meta?: any;
}

export interface SpideyPipeline {
  process(data: any, last?: boolean): any;
  complete(): any;
}

export declare type OutputFormat = 'json' | 'csv' | 'tsv' | 'txt';
export declare type SpideyResponseCallback = (response: SpideyResponse) => void;
