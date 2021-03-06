const cheerio = require('cheerio')
const fs = require('fs')
const path = require('path')

// CONNECTOR SETUP

process.env.COZY_CREDENTIALS = ''
process.env.COZY_URL = ''
const connector = require('../src/connector')

// FIXTURES

const loadFixtureSync = filename =>
  cheerio.load(
    fs.readFileSync(path.join(__dirname, '..', 'fixtures', filename), {
      encoding: 'utf8'
    })
  )

const $ = loadFixtureSync('dashboard.html')
const $whatever = cheerio.load('<html><body></body></html>')

const products = [
  {
    downloadSelector: '#zipDownloadModal-meapbook1',
    externalId: 'meapbook1',
    lastUpdated: '2020-03-10',
    title: 'MEAP Book 1'
  },
  {
    downloadSelector: '#zipDownloadModal-mrsmith',
    externalId: 'mrsmith',
    lastUpdated: undefined,
    title: 'Downloadable Product 2'
  }
]

// TESTS

describe('connector', () => {
  describe('.validateLogin()', () => {
    const statusCode = 200

    test('is true when the response href is the homepage', () => {
      const fullResponse = {
        request: { uri: { href: 'https://www.manning.com/' } }
      }
      expect(
        connector.validateLogin(statusCode, $whatever, fullResponse)
      ).toEqual(true)
    })

    test('is false otherwise', () => {
      const fullResponse = {
        request: { uri: { href: 'https://login.manning.com/login' } }
      }
      expect(
        connector.validateLogin(statusCode, $whatever, fullResponse)
      ).toEqual(false)
    })
  })

  describe('.loginErrorMessage()', () => {
    test('is the message string if any', () => {
      const $ = cheerio.load(`
        <html>
          <body>
            <div id="msg" class="errors">
              The credentials you provided cannot be determined to be authentic.
            </div>
          </body>
        </html>
      `)
      expect(connector.loginErrorMessage($)).toEqual(
        'The credentials you provided cannot be determined to be authentic.'
      )
    })

    test('is an empty string otherwise', () => {
      expect(connector.loginErrorMessage($whatever)).toEqual('')
    })
  })

  describe('.scrapeProducts()', () => {
    test('returns the list of products', () => {
      expect(connector.scrapeProducts($)).toEqual(products)
    })
  })

  describe('.parseLastUpdated()', () => {
    test('returns a valid date string', () => {
      expect(connector.parseLastUpdated('last update: 2020-03-10')).toEqual(
        '2020-03-10'
      )
    })

    test('ignores a broken date string', () => {
      expect(connector.parseLastUpdated('last update: 2020-13-32')).toEqual(
        undefined
      )
    })

    test('ignores a completely broken input', () => {
      expect(connector.parseLastUpdated('invalid')).toEqual(undefined)
    })

    test('ignores an empty input', () => {
      expect(connector.parseLastUpdated('')).toEqual(undefined)
    })
  })

  describe('.scrapeDownloads()', () => {
    test('returns the list of downloads in a format compatible with saveFiles()', () => {
      expect(connector.scrapeDownloads($, products)).toEqual([
        {
          filename: 'MEAP Book 1.2020-03-10.pdf',
          fileurl:
            'https://www.manning.com/dashboard/download?id=downloadForm-meapbook1',
          requestOptions: {
            method: 'post',
            form: {
              dropbox: 'false',
              'meapbook1-restrictedDownloadIds': '1111',
              '1111': '1111111',
              productExternalId: 'meapbook1'
            }
          }
        },
        {
          filename: 'Downloadable Product 2.pdf',
          fileurl:
            'https://www.manning.com/dashboard/download?id=downloadForm-mrsmith',
          requestOptions: {
            method: 'post',
            form: {
              dropbox: 'false',
              'mrsmith-restrictedDownloadIds': '2222',
              '2222': '2222222',
              '3333': '3333333',
              '4444': '4444444',
              productExternalId: 'mrsmith'
            }
          }
        },
        {
          filename: 'Downloadable Product 2.epub',
          fileurl:
            'https://www.manning.com/dashboard/download?id=downloadForm-mrsmith',
          requestOptions: {
            method: 'post',
            form: {
              dropbox: 'false',
              'mrsmith-restrictedDownloadIds': '3333',
              '2222': '2222222',
              '3333': '3333333',
              '4444': '4444444',
              productExternalId: 'mrsmith'
            }
          }
        },
        {
          filename: 'Downloadable Product 2.mobi',
          fileurl:
            'https://www.manning.com/dashboard/download?id=downloadForm-mrsmith',
          requestOptions: {
            method: 'post',
            form: {
              dropbox: 'false',
              'mrsmith-restrictedDownloadIds': '4444',
              '2222': '2222222',
              '3333': '3333333',
              '4444': '4444444',
              productExternalId: 'mrsmith'
            }
          }
        }
      ])
    })
  })

  describe('.scrapeDownloadsByProduct()', () => {
    test('returns a list for a single download', () => {
      expect(connector.scrapeDownloadsByProduct($, products[0])).toEqual([
        {
          filename: 'MEAP Book 1.2020-03-10.pdf',
          fileurl:
            'https://www.manning.com/dashboard/download?id=downloadForm-meapbook1',
          requestOptions: {
            method: 'post',
            form: {
              dropbox: 'false',
              'meapbook1-restrictedDownloadIds': '1111',
              '1111': '1111111',
              productExternalId: 'meapbook1'
            }
          }
        }
      ])
    })
  })

  describe('.scrapeDownloadById()()', () => {
    test('returns a single download object', () => {
      const $form = $('#zipDownloadModal-mrsmith form')
      const download = connector.scrapeDownloadById($form, products[1])('2222')

      expect(download).toEqual({
        filename: 'Downloadable Product 2.pdf',
        fileurl:
          'https://www.manning.com/dashboard/download?id=downloadForm-mrsmith',
        requestOptions: {
          method: 'post',
          form: {
            dropbox: 'false',
            'mrsmith-restrictedDownloadIds': '2222',
            '2222': '2222222',
            '3333': '3333333',
            '4444': '4444444',
            productExternalId: 'mrsmith'
          }
        }
      })
    })
  })

  describe('.downloadExt()', () => {
    const $form = $('#zipDownloadModal-mrsmith form')

    test('is "mobi" for a kindle download', () => {
      expect(connector.downloadExt($form, '4444')).toEqual('mobi')
    })

    test('defaults to the format label', () => {
      expect(connector.downloadExt($form, '2222')).toEqual('pdf')
      expect(connector.downloadExt($form, '3333')).toEqual('epub')
    })
  })

  describe('.formData()', () => {
    test('aggregates the form input names & values into an object', () => {
      const $form = $('#zipDownloadModal-mrsmith form')

      expect(connector.formData($form)).toEqual({
        dropbox: 'false',
        // XXX: 'mrsmith-restrictedDownloadIds': '2222',
        '2222': '2222222',
        '3333': '3333333',
        '4444': '4444444',
        productExternalId: 'mrsmith'
      })
    })
  })

  describe('.scrapeDownloadIds()', () => {
    test('lists an id when the product has a single download', () => {
      expect(connector.scrapeDownloadIds($, products[0])).toEqual(['1111'])
    })

    test('lists many ids when the product has multiple downloads', () => {
      expect(connector.scrapeDownloadIds($, products[1])).toEqual([
        '2222',
        '3333',
        '4444'
      ])
    })
  })

  describe('.downloadIdsKey()', () => {
    test('is the external id with some suffix', () => {
      expect(connector.downloadIdsKey(products[0])).toEqual(
        'meapbook1-restrictedDownloadIds'
      )
      expect(connector.downloadIdsKey(products[1])).toEqual(
        'mrsmith-restrictedDownloadIds'
      )
    })
  })
})
