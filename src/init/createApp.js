import { extendAppFactory } from 'app'
import createApp from './createApp.shared'
import routes from 'init/routes'
import { withRouter } from 'router'
import createHistory from 'history/createMemoryHistory'

export default extendAppFactory(
  createApp,
  withRouter(routes, createHistory, (app) => ({
    initialEntries: [app.__volatile.__ctx.path]
  })),
  app => app.router.refresh()
)
