import Reflux from 'reflux'

const async = {
  children: [
    'completed',
    'failed'
  ]
}

const actions = Reflux.createActions({
  getFeature: async,
  getTaunts: async,
  clearTaunt: {},
  canAddTaunt: {},
  addTaunt: async,
  updateTask: async,
  assignTask: async,
  unassignTask: async,
  joinSession: {}
})

export default actions
