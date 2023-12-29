const { BaseKonnector } = require('cozy-konnector-libs')
const { start } = require('./connector')

module.exports = new BaseKonnector(start)
