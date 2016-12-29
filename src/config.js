import {useRouterHistory} from 'react-router'
import {createHistory} from 'history'
import {defaults, isString} from 'lodash'

const path = location.pathname
const contextRegex = /sisaadm[^\/]*/i
export const CONTEXT = contextRegex.exec(path) || ''
export const API_URL = `${location.protocol}//${location.host}/${CONTEXT}/api`

export const history = useRouterHistory(createHistory)({
  basename: CONTEXT ? `/${CONTEXT}` : ''
})

let currentLocation
history.listen((location) => {
  currentLocation = location
})

const historyPush = history.push
const historyReplace = history.replace

history.push = (arg) => {
  arg = addHistoryParams(arg)
  historyPush(arg)
}

history.replace = (arg) => {
  arg = addHistoryParams(arg)
  historyReplace(arg)
}

function addHistoryParams(arg) {
  arg = isString(arg) ? {pathname: arg} : arg
  arg.query = addStandardQueryParams(arg.query)
  return arg
}

export const addStandardQueryParams = (params) => {
  params = params || {}
  const {backdoorId, role, srbackdoor, studentId, guest, career} = currentLocation.query
  defaults(params, {backdoorId: backdoorId || srbackdoor, role, studentId, guest, career})
  return params
}

export const updateLocation = (query) => {
  history.replace({...currentLocation, query})
}

export const getLocation = () => currentLocation

export default {CONTEXT, API_URL, history, getLocation}
