
[![npm package](https://nodei.co/npm/spidey.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/spidey/)

[![NPM download][download-image]][download-url]
[![Package Quality][quality-image]][quality-url]

[quality-image]: https://packagequality.com/shield/spidey.svg
[quality-url]: https://packagequality.com/#?package=spidey
[download-image]: https://img.shields.io/npm/dm/spidey.svg?style=flat-square
[download-url]: https://npmjs.org/package/spidey

# Spidey - Robust Web Scraping Tool

Spidey is a powerful and reliable web scraping tool that allows users to crawl any website with multiple concurrency. With Spidey, you can easily extract data from websites and store it in a structured format using custom pipelines. The tool is designed to be highly scalable and can handle large amounts of data.

## Features

- Easy to use API
- Supports multiple concurrency
- Highly scalable
- Data parsing using XPath and CSS Selectors 
- Auto retries and error status code handling
- Built-in data pipeline and storage format
- Supports proxies
- Support custom data pipelines
- Support requests prioritization

## Installation

You can install Spidey using NPM:

```
npm install spidey
```

## Usage

Using Spidey is easy. Simply require the package and create a new instance of the `Spidey` class:

```javascript
const { Spidey } = require('spidey');

const spidey = new Spidey({
  concurrency: 5,
  outputFormat: 'json',
  outputFileName: 'output.json'
  // other options...
});

spidey.request({
  url: 'https://example.com',
  // spidey options...
}, (response) => {
  const title = response.xpath('//*[@title="Google"]')[0].data;
  const heading = response.$('.heading').text();
  this.save({ title, heading );  
});

spider.start();
```

Spidey can also be used by extending as Class

```typescript
class AmazonSpidey extends Spidey {
  constructor() {
    super({
      concurrency: 10,
      retries: 5,
      // spidey options...
    });
  }

  headers = {
    'user-agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36',
  };

  startUrls = [
    'https://www.amazon.de/-/en/Amazon-Liquid-Soap-Refill-Fragrance/dp/B0996J4VV2',
    'https://www.amazon.de/Dancing-Interactive-Educational-Children-Recording/dp/B0BLVKYXXQ',
  ];

  parse(response: SpideyResponse) {
    const url = response.url;
    const title = response.xpath('//*[@id="productTitle"]/text()')[0].data.trim();
    this.save({ url, title });
  }
}

new MySpidey().start();
```

## Request Options
When making a request using Spidey, you can pass multiple options to customize your request.

```typescript
this.request(
  { 
    url, 
    headers: this.headers, 
    // request options...
  }, 
  this.parse.bind(this)
);
```

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| url | string | Yes | - | Input URL for the request |
| method | string | No | `GET` | Request method |
| headers | any | No | `null` | Request headers |
| body | any | No | `null` | Request body |
| json | boolean | No | `false` | If `true`, the response will be converted into JSON |
| timeout | number | No | `0` | Request timeout in milliseconds. A value of `0` means no timeout |
| meta | any | No | `{}` | A meta object that can be used to pass metadata from the request to the response function |
| inline | boolean | No | `false` | If `true`, the response will be returned directly instead of being passed to a callback function |
| proxy | SpdieyProxy | No | `null` | Proxy configuration |
| proxyUrl | string | No | `null` | Proxy configuration as a URL |
| priority | number | No | `null` | Request priority. A number between 0-9, where 0 is highest priority and 9 is lowest priority. If not specified, no priority is assigned. |
| download | boolean | No | `false` | If `true`, the response will be saved to file at root directory or given `downloadDir`. This option is useful in downloading files |



## Spidey Options
You can pass Spidey options to a Spidey instance

```javascript
const spidey = new Spidey({
  // spidey options...
});

```
OR

```typescript
class MySpidey extends Spidey {
  constructor() {
    super({
      // spidey options...
    });
  }
}

```

| Configuration      | Type     | Description                                                                                                      | Default Value                                      |
|--------------------|----------|------------------------------------------------------------------------------------------------------------------|----------------------------------------------------|
| concurrency        | number   | The number of concurrent requests.                                                                               | `10`                                               |
| delay              | number   | The delay between each request.                                                                                  | `0`                                                |
| retries            | number   | The number of retries for each failed request.                                                                   | `0`                                                |
| retryStatusCode    | number[] | Spidey will retry if it encounters these status codes.                                                           | `[500, 502, 503, 504, 522, 524, 408, 429]`         |
| itemConcurrency    | number   | The number of concurrent crawled item processing.                                                                | Same as request concurrency                        |
| outputFormat       | string   | The output format such as json, csv, tsv.                                                                        | `null`                                             |
| outputFileName     | string   | The output format name.                                                                                          | `data`                                             |
| logLevel           | string   | The output log level.                                                                                            | `debug`                                            |
| proxy              | object   | The proxy configuration.                                                                                         | `null`                                             |
| proxyUrl           | string   | The proxy URL configuration.                                                                                     | `null`                                             |
| continuous         | boolean  | For long-running Spidey processes such as listening to new URLs from Redis or Kafka.                             | `false`                                            |
| pipelines          | SpideyPipeline[] | Item pipeline injection.                                                                                 | `[]`                                               |
| downloadDir        | boolean  | Download folder directory.                                                                                       | `.` Current directory                              |


## Data Pipeline

Spidey enables the creation of personalized data pipelines for storing, validating, and manipulating the data that has been crawled.

### Data Manipulation
```typescript
export class ASINPipeline implements SpideyPipeline {
  constructor(private options?: SpideyOptions) {}

  process(data: Data) {
    data.url = data.url.split('/ref').shift() as string;
    data.asin = data.url.split('/').pop() as string;
    return data;
  }
}
```

### Store Data to Mongodb
```typescript
export class MongoPipeline implements SpideyPipeline {
  client: MongoClient;
  collection!: Collection;

  constructor(private options?: SpideyOptions) {
    this.client = new MongoClient(this.options?.mongoUrl);
  }

  async start() {
    await this.client.connect();
    const db = this.client.db(this.options?.mongoDb);
    this.collection = db.collection(this.options?.mongoCollection);
  }

  async complete() {
    await this.client.close();
  }

  async process(data: Data) {
    await this.collection.findOneAndUpdate({ asin: data.asin }, { $set: data }, { upsert: true });

    // Always return data back in pipelines in process function
    return data;
  }
}
```

### Pipeline Usage
Pipelines can be injected to any spidey instance by passing in `pipelines` options.
```typescript

class AmazonSpidey extends Spidey {
  constructor() {
    super({
      // ...spidey options
      pipelines: [ASINPipeline, MongoPipeline]
    });
  }
}

```

## License

Spidey is licensed under the [MIT License](https://opensource.org/licenses/MIT).
