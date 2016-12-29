import React from 'react'
import ReactDOM from 'react-dom'
import {Router, Route, useRouterHistory} from 'react-router'
import {createHistory} from 'history'
import EsPromise from 'es6-promise'
EsPromise.polyfill()

import App from './App'
import NotFound from './routes/404'

const history = useRouterHistory(createHistory)()

ReactDOM.render((
  <Router history={history}>
    <Route path="/" component={App}/>
    <Route path="*" component={NotFound}/>
  </Router>
), document.getElementById('app'))
