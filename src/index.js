process.env.SENTRY_DSN =
  process.env.SENTRY_DSN ||
  'https://5a6051872c6e4eefb1f056ac422ad4b2@sentry.cozycloud.cc/134'

const { BaseKonnector } = require('cozy-konnector-libs')
const { start } = require('./connector')

module.exports = new BaseKonnector(start)
