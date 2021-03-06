const utils = require('./utils')
const formats = require('./formats')

const arrayPrefixGenerators = {
  brackets: function brackets(prefix) { // eslint-disable-line func-name-matching
    return prefix + '[]'
  },
  indices: function indices(prefix, key) { // eslint-disable-line func-name-matching
    return prefix + '[' + key + ']'
  },
  repeat: function repeat(prefix) { // eslint-disable-line func-name-matching
    return prefix
  }
}

const toISO = Date.prototype.toISOString

const defaults = {
  delimiter: '&',
  encode: true,
  encoder: utils.encode,
  encodeValuesOnly: false,
  serializeDate: function serializeDate(date) { // eslint-disable-line func-name-matching
    return toISO.call(date)
  },
  skipNulls: false,
  strictNullHandling: false
}

const stringify = function stringify( // eslint-disable-line func-name-matching
  object,
  prefix,
  generateArrayPrefix,
  strictNullHandling,
  skipNulls,
  encoder,
  filter,
  sort,
  allowDots,
  serializeDate,
  formatter,
  encodeValuesOnly
) {
  let obj = object
  if (typeof filter === 'function') {
    obj = filter(prefix, obj)
  } else if (obj instanceof Date) {
    obj = serializeDate(obj)
  } else if (obj === null) {
    if (strictNullHandling) {
      return encoder && !encodeValuesOnly ? encoder(prefix, defaults.encoder) : prefix
    }

    obj = ''
  }

  if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean' || utils.isBuffer(obj)) {
    if (encoder) {
      const keyValue = encodeValuesOnly ? prefix : encoder(prefix, defaults.encoder)
      return [formatter(keyValue) + '=' + formatter(encoder(obj, defaults.encoder))]
    }
    return [formatter(prefix) + '=' + formatter(String(obj))]
  }

  let values = []

  if (typeof obj === 'undefined') {
    return values
  }

  let objKeys
  if (Array.isArray(filter)) {
    objKeys = filter
  } else {
    const keys = Object.keys(obj)
    objKeys = sort ? keys.sort(sort) : keys
  }

  for (let i = 0; i < objKeys.length; ++i) {
    const key = objKeys[i]

    if (skipNulls && obj[key] === null) {
      continue
    }

    if (Array.isArray(obj)) {
      values = values.concat(stringify(
        obj[key],
        generateArrayPrefix(prefix, key),
        generateArrayPrefix,
        strictNullHandling,
        skipNulls,
        encoder,
        filter,
        sort,
        allowDots,
        serializeDate,
        formatter,
        encodeValuesOnly
      ))
    } else {
      values = values.concat(stringify(
        obj[key],
        prefix + (allowDots ? '.' + key : '[' + key + ']'),
        generateArrayPrefix,
        strictNullHandling,
        skipNulls,
        encoder,
        filter,
        sort,
        allowDots,
        serializeDate,
        formatter,
        encodeValuesOnly
      ))
    }
  }

  return values
}

export default function (object, opts) {
  let obj = object
  const options = opts ? utils.assign({}, opts) : {}

  if (options.encoder !== null && options.encoder !== undefined && typeof options.encoder !== 'function') {
    throw new TypeError('Encoder has to be a function.')
  }

  const delimiter = typeof options.delimiter === 'undefined' ? defaults.delimiter : options.delimiter
  const strictNullHandling = typeof options.strictNullHandling === 'boolean' ? options.strictNullHandling : defaults.strictNullHandling
  const skipNulls = typeof options.skipNulls === 'boolean' ? options.skipNulls : defaults.skipNulls
  const encode = typeof options.encode === 'boolean' ? options.encode : defaults.encode
  const encoder = typeof options.encoder === 'function' ? options.encoder : defaults.encoder
  const sort = typeof options.sort === 'function' ? options.sort : null
  const allowDots = typeof options.allowDots === 'undefined' ? false : options.allowDots
  const serializeDate = typeof options.serializeDate === 'function' ? options.serializeDate : defaults.serializeDate
  const encodeValuesOnly = typeof options.encodeValuesOnly === 'boolean' ? options.encodeValuesOnly : defaults.encodeValuesOnly
  if (typeof options.format === 'undefined') {
    options.format = formats['default']
  } else if (!Object.prototype.hasOwnProperty.call(formats.formatters, options.format)) {
    throw new TypeError('Unknown format option provided.')
  }
  const formatter = formats.formatters[options.format]
  let objKeys
  let filter

  if (typeof options.filter === 'function') {
    filter = options.filter
    obj = filter('', obj)
  } else if (Array.isArray(options.filter)) {
    filter = options.filter
    objKeys = filter
  }

  let keys = []

  if (typeof obj !== 'object' || obj === null) {
    return ''
  }

  let arrayFormat
  if (options.arrayFormat in arrayPrefixGenerators) {
    arrayFormat = options.arrayFormat
  } else if ('indices' in options) {
    arrayFormat = options.indices ? 'indices' : 'repeat'
  } else {
    arrayFormat = 'indices'
  }

  const generateArrayPrefix = arrayPrefixGenerators[arrayFormat]

  if (!objKeys) {
    objKeys = Object.keys(obj)
  }

  if (sort) {
    objKeys.sort(sort)
  }

  for (let i = 0; i < objKeys.length; ++i) {
    const key = objKeys[i]

    if (skipNulls && obj[key] === null) {
      continue
    }

    keys = keys.concat(stringify(
      obj[key],
      key,
      generateArrayPrefix,
      strictNullHandling,
      skipNulls,
      encode ? encoder : null,
      filter,
      sort,
      allowDots,
      serializeDate,
      formatter,
      encodeValuesOnly
    ))
  }

  const joined = keys.join(delimiter)
  const prefix = options.addQueryPrefix === true ? '?' : ''

  return joined.length > 0 ? prefix + joined : ''
}
