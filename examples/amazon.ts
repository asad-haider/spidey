import { Spidey, SpideyOptions, SpideyPipeline, SpideyResponse } from '../dist/index';

export class CustomPipeline implements SpideyPipeline {
  constructor(private options?: SpideyOptions) {}

  process(data: any, last?: boolean) {
    data.name = '123';
    return data;
  }

  complete() {}
}

class AmazonSpidey extends Spidey {
  constructor() {
    super({
      concurrency: 30,
      retries: 5,
    });

    this.use(CustomPipeline);
  }

  headers = {
    authority: 'www.amazon.de',
    accept:
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'accept-language': 'en-US,en;q=0.9',
    'cache-control': 'max-age=0',
    'device-memory': '8',
    downlink: '10',
    dpr: '2',
    ect: '4g',
    rtt: '50',
    'sec-ch-device-memory': '8',
    'sec-ch-dpr': '2',
    'sec-ch-ua': '"Chromium";v="112", "Google Chrome";v="112", "Not:A-Brand";v="99"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"macOS"',
    'sec-ch-ua-platform-version': '"13.2.1"',
    'sec-ch-viewport-width': '1680',
    'sec-fetch-dest': 'document',
    'sec-fetch-mode': 'navigate',
    'sec-fetch-site': 'same-origin',
    'sec-fetch-user': '?1',
    'upgrade-insecure-requests': '1',
    'user-agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36',
    'viewport-width': '1680',
    Cookie:
      'session-id=262-4533462-1317367; lc-acbde=en_GB; ubid-acbde=258-0843990-1657529; x-acbde=1DtJ5csSJ86HXqggRazmPWiL5wwRfPrJxPh3fysbUX3TSiyXf80pGAeXXBQSlb4P; at-acbde=Atza%7CIwEBICyb6CVVVCoVtdKt8UkX257NqahMZRXP5u55crA-mJSvRbL7tA1wWPBKKbB0nwM3S2odOpyEt1FMN7xniipEN6FLlSlRp7yJb86BfNH6XyQ4zwjml24AxZkV0UXEWVieLZqu_ZKXTxQ_XPjNqUCFwkzuSVViqy2K_CiMQ0DK9ixmcahWZgP85dxuwdlCEq2s9tXDIJZi7ZRbQ_rRxwoab-7o; sess-at-acbde=%221BTQB8BybS6rgKaA4tUwldrGvkpmQGtzKKQp7JSlRIQ%3D%22; sst-acbde=Sst1%7CPQGYgOjgMGwo3g7eL3wDWRbECWqDwjM8b0Kww7ZQE38D_Dg8fvxVpOpRmD_zZxVcyf7KWdRODPYhy6WN7sRyQglKCIm5UbyqxqrJ2DW4o9YjIbRCoc0otBzGBKZND03vGrNx_GsxhUOdvUA4P3dlj3oQ5PZ0m5I0YrJthrns3UzDuO38wICg5jEDMeEJFImCyWvzfteqYkUJ1AUyvmg-a6Yjtf9quXB_Qaw2HmJUkfkpujQxsxQDoGqrHu8vXMPcY_1cey7hIw6Z58LSylPegG5JKpCoF5JCJwcYL0E7pCX6Rn8; i18n-prefs=EUR; sp-cdn=%22L5Z9%3ANO%22; s_cc=true; s_vnum=2114440690276%2526vn%253D1; s_sq=%255B%255BB%255D%255D; s_ppv=45; s_nr=1682440696407-New; s_dslv=1682440696407; session-id-time=2082787201l; session-token=%22atnNEu8jexQ3ISvnw5%2FnIwV5gsrENo4EDt0okyBIO%2BO8Sfma2wP3vbjvae5i2GIOu5OMKKNC%2BC0HZIry8xqhFiwEsnuVom%2FAXBP0eGJUDvMI3qRCyxMR3TMAsrMPsGMQRZq0%2Fvo7bprKAmitT%2B0sjjh8lWwQ7hAy2QWGETKnb9iFYWD7gl3tPrugFBAHJrYE7l379TLbx8SOHkPfj2RzB8k4po3AY9E2Rk3xvuajkZ7piBtJcreh8A%3D%3D%22; csm-hit=tb%3As-K7HHPE2A3H9026F54XV8%7C1682775865496%26t%3A1682775868336%26adb%3Aadblk_yes',
  };

  startUrls = [
    'https://www.amazon.de/-/en/gp/bestsellers/beauty/64272031/ref=zg_bs_nav_beauty_1',
    // 'https://www.amazon.de/-/en/gp/bestsellers/beauty/122877031/ref=zg_bs_nav_beauty_1',
    // 'https://www.amazon.de/-/en/gp/bestsellers/beauty/64486031/ref=zg_bs_nav_beauty_1',
  ];

  start() {
    for (const url of this.startUrls) {
      this.request(
        {
          url,
          headers: this.headers,
        },
        this.parse.bind(this),
      );
    }
  }

  parse(response: SpideyResponse) {
    const productUrls = new Set();
    response.$('#gridItemRoot .p13n-sc-uncoverable-faceout > a').each((index: number, element: any) => {
      productUrls.add(response.$(element).attr('href'));
    });

    const urls = Array.from(productUrls);

    urls.slice(0, 5).forEach((url) => {
      this.request(
        {
          url: `https://www.amazon.de${url}`,
          headers: this.headers,
          meta: {
            url,
          },
        },
        this.parseProduct.bind(this),
      );
    });
  }

  parseProduct(response: SpideyResponse) {
    const url = response.meta.url;
    const title = response.xpath('//*[@id="productTitle"]/text()')[0].data.trim();
    const titleCss = response.$('#productTitle').text().trim();
    console.log(title, titleCss);
    this.save({ url, title });
  }
}

new AmazonSpidey().start();
