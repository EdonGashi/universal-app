import React from 'react'
import ReactDOM from 'react-dom/server'
import { serialize } from 'app'
import App from 'init/App'
import { Provider, useStaticRendering } from 'mobx-react'
import { ReportChunks } from 'react-universal-component'
import { HelmetProvider } from 'react-helmet-async'
import flushChunks, { filesFromChunks } from 'webpack-flush-chunks'
import fs from 'fs'
import path from 'path'

useStaticRendering(true)

function readBootstrap(manifestName) {
  const bootstrap = fs
    .readFileSync(path.join(__dirname, '../build-client', manifestName), 'utf8')
    .replace('//# sourceMappingURL=bootstrap.', '//# sourceMappingURL=/static/bootstrap.')
  return bootstrap
}

function stringify(value) {
  return JSON.stringify(value)
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
    .replace(/</g, '\\u003c')
}

function merge(array) {
  if (array) {
    return array.join('\n')
  }

  return ''
}

export default function render({ clientStats }) {
  const manifestName = filesFromChunks(['bootstrap'], clientStats.assetsByChunkName)[0]
  let bootstrap
  if (process.env.NODE_ENV === 'production') {
    bootstrap = '<script>' + readBootstrap(manifestName) + '</script>'
  } else {
    bootstrap = `<script src="/static/${manifestName}"></script>`
  }

  return function (ctx) {
    const app = ctx.app
    const helmetContext = {}
    let chunkNames = new Set()
    const domString = ReactDOM.renderToString(
      <ReportChunks report={chunkName => chunkNames.add(chunkName)}>
        <HelmetProvider context={helmetContext}>
          <Provider root={{ app }}>
            <App app={app} />
          </Provider>
        </HelmetProvider>
      </ReportChunks>
    )

    chunkNames = Array.from(chunkNames)
    const { js, styles, cssHash } = flushChunks(clientStats, { chunkNames, before: ['vendor'] })
    // console.log('PATH', ctx.path)
    // console.log('DYNAMIC CHUNK NAMES RENDERED', chunkNames)
    // console.log('SCRIPTS SERVED', scripts)
    // console.log('STYLESHEETS SERVED', stylesheets)
    const renderopts = ctx.render || {}
    const { helmet } = helmetContext

    const bodyString = `<!DOCTYPE html>
<html ${helmet.htmlAttributes.toString()}>
<head>
  ${helmet.meta.toString()}
  ${helmet.title.toString()}
  ${merge(renderopts.head)}
  ${styles}
  ${helmet.link.toString()}
</head>
<body ${helmet.bodyAttributes.toString()}>
<div id="root">${domString}</div>
${merge(renderopts.scripts)}
${bootstrap}
<script>window.__STATE__=${stringify(serialize(app))}</script>
${cssHash}
${js}
</body>
</html>`

    const status = app.__volatile.__status
    if (status && !isNaN(status) && isFinite(status)) {
      console.log(status)
      ctx.status = status
    }

    ctx.body = bodyString
  }
}
