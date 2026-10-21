// Demo dataset for screenshots and UI development (?demo=1)
// Rows mirror a real crawl of the original Xenu homepage (home.snafu.de/tilman)
export const DEMO_ROOT = 'http://home.snafu.de/tilman/xenulink.html'

const rec = (url, status, type, size, title, date, level, lo, li, server, error, duration, charset, extra = {}) => ({
  id: 0, url, status, type, size, title, date, level,
  linksOut: lo, linksIn: li, server, error, duration, charset,
  isInternal: url.includes('snafu.de'), broken: status === 'broken', redirected: false,
  statusCode: status === 'ok' ? 200 : status === 'broken' ? 404 : null,
  statusText: '', ...extra,
})

export const DEMO_RECORDS = [
  rec('http://home.snafu.de/tilman/xenulink.html', 'ok', 'text/html', 64616, "Find broken links on your site with Xenu's Link Sleuth (TM)", '18/8/2019', 0, 174, 0, 'Apache', '', 170, ''),
  rec('http://home.snafu.de/tilman/xenu-1.3.8-screenshot.png', 'ok', 'image/png', 134531, '', '23/10/2010', 1, 0, 1, 'Apache', '', 117, ''),
  rec('http://home.snafu.de/tilman/XENU.ZIP', 'ok', 'application/zip', 437155, '', '4/9/2010', 1, 0, 1, 'Apache', '', 143, ''),
  rec('http://home.snafu.de/tilman/tmp/Xenu64.zip', 'ok', 'application/zip', 2306867, '', '6/12/2015', 1, 0, 1, 'Apache', '', 422, ''),
  rec('http://home.snafu.de/tilman/index.html', 'ok', 'text/html', 48237, 'The homepage of Tilman Hausherr', '21/5/2018', 1, 303, 1, 'Apache', '', 382, ''),
  rec('http://home.snafu.de/tilman/bookstore.html', 'ok', 'text/html', 23654, 'The Xenu bookstore', '7/8/2016', 1, 104, 1, 'Apache', '', 596, ''),
  rec('http://home.snafu.de/tilman/mozilla/index.html', 'ok', 'text/html', 9932, 'The Mozilla Museum', '21/8/2016', 1, 60, 1, 'Apache', '', 596, ''),
  rec('http://home.snafu.de/tilman/politics.html', 'ok', 'text/html', 113873, 'Clearwatergate: US politics and Scientology', '7/8/2016', 2, 563, 1, 'Apache', '', 482, ''),
  rec('http://home.snafu.de/tilman/mystory/index.html', 'ok', 'text/html', 42188, 'Testimonies of supporters and critics of Scientology and Dianetics', '21/8/2016', 2, 262, 1, 'Apache', '', 424, ''),
  rec('http://home.snafu.de/tilman/prolinks/scientology.exposes.itself.html', 'broken', 'text/html', 236, '', '', 2, 0, 1, 'Apache', '404 Not Found', 422, 'iso-8859-1'),
  rec('http://home.snafu.de/tilman/old-links.html', 'broken', '', null, '', '', 2, 0, 1, '', 'no such host', 60123, ''),
  rec('http://home.snafu.de/tilman/krasel/filter/index.html', 'ok', 'text/html', 8192, 'Filter program by CSI', '27/12/2011', 2, 10, 1, 'Apache', '', 208, ''),
  rec('http://home.snafu.de/tilman/faq-you/index.html', 'ok', 'text/html', 1331, 'FAQ you', '28/8/2016', 2, 10, 1, 'Apache', '', 207, ''),
  rec('http://en.wikipedia.org/wiki/Xenu%27s_Link_Sleuth', 'skip', '', null, '', '', 1, 0, 1, '', '', null, '', { statusText: 'skip external' }),
  rec('http://www.winehq.com/', 'skip', '', null, '', '', 1, 0, 1, '', '', null, '', { statusText: 'skip external' }),
  rec('https://web.archive.org/web/20050306025743/http://www.htmlbasis.de/tools/xenu.htm', 'skip', '', null, '', '', 1, 0, 1, '', '', null, '', { statusText: 'skip external' }),
  rec('http://www.ilsehruby.at/Xenu-cake.html', 'skip', '', null, '', '', 1, 0, 3, '', '', null, '', { statusText: 'skip external' }),
  rec('http://www.xenu.net/', 'skip', '', null, '', '', 2, 0, 3, '', '', null, '', { statusText: 'skip external' }),
].map((r, i) => ({ ...r, id: i + 1 }))
