

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
  // crawl options...
}, (response) => {
  const title = response.xpath('//*[@title="Google"]')[0].data;
  const heading = response.$('.heading').text();
  this.save({ title, heading );  
});

spider.start();
```


## License

Spidey is licensed under the [MIT License](https://opensource.org/licenses/MIT).
