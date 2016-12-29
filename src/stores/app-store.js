import Reflux from 'reflux'
import * as firebase from 'firebase'
import {clone, compact, every, forOwn, findIndex, values, reject} from 'lodash'

import actions from './app-actions'

const config = {
  apiKey: '',
  authDomain: '',
  databaseURL: '',
  storageBucket: '',
  messagingSenderId: ''
}
firebase.initializeApp(config)

const featureRef = firebase.database().ref('feature')
const tasksRef = firebase.database().ref('feature/tasks')
const tauntRef = firebase.database().ref('taunts')

const data = {
  uses: '',
  feature: {
    tasks: []
  },
  dbTasks: {},
  taunts: [],
  firstTaunt: true,
  canAddTaunt: false,
  taunt: ''
}

const updateTaskList = () => {
  const tasks = compact(clone(data.feature.tasks))
  let completeCount = 0
  tasks.forEach(task => {
    if (task.dependencies && task.dependencies.length) {
      task.readyToWork = every(tasks, t => !task.dependencies.includes(t.taskId) || t.complete || t.assignee === data.user)
    } else {
      task.readyToWork = true
    }
    if (task.complete) {
      completeCount = completeCount + 1
    }
  })
  data.feature.percentComplete = Math.round((completeCount / tasks.length) * 100)
  data.feature.tasks = tasks
}

export default Reflux.createStore({
  listenables: actions,

  getInitialState: function() {
    return data
  },

  getFeature: function() {
    featureRef.on('value', (snapshot) => {
      data.feature = snapshot.val() || {}
      data.dbTasks = clone(data.feature.tasks)
      data.feature.tasks = values(data.feature.tasks)
      updateTaskList()
      this.output()
    })
  },

  getTaunts: function() {
    tauntRef.on('value', (snapshot) => {
      data.taunts = values(snapshot.val()) || []
      if (data.taunts.length) {
        const tauntIndex = data.firstTaunt ? 0 : data.taunts.length - 1
        data.firstTaunt = false
        this.setTaunt(tauntIndex)
      }
      this.output()
    })
  },

  setTaunt: function(index) {
    const taunts = reject(data.taunts, {creator: data.user})
    const tauntIndex = index || Math.floor(Math.random() * (taunts.length - 0 + 1))
    if (tauntIndex >= 0 && tauntIndex < taunts.length) {
      data.taunt = taunts[tauntIndex].text
      this.output()
    }
    setTimeout(() => this.clearTaunt(), 20000)
  },

  clearTaunt: function() {
    data.taunt = ''
    setTimeout(() => this.setTaunt(), 30000)
    this.output()
  },

  canAddTaunt: function() {
    data.canAddTaunt = true
    data.taunt = ''
    this.output()
  },

  addTaunt: function(taunt) {
    const newTaunt = {
      text: taunt,
      creator: data.user
    }
    const newTauntRef = tauntRef.push()
    newTauntRef.set(newTaunt)
    data.canAddTaunt = false
    this.output()
  },

  updateTask: function(task) {
    const taskIndex = findIndex(data.feature.tasks, {taskId: task.taskId})
    data.feature.tasks[taskIndex] = task
    updateTaskList()
    let dbKey = ''
    forOwn(data.dbTasks, (t, key) => {
      if (t && (t.taskId === task.taskId)) {
        dbKey = key
      }
    })
    data.dbTasks[dbKey] = task
    this.output()
    const updates = {}

    updates[`/${dbKey}`] = clone(task)
    tasksRef.update(updates)
  },

  assignTask: function(task) {
    task.assignee = data.user
    this.updateTask(task)
  },

  unassignTask: function(task) {
    task.assignee = ''
    this.updateTask(task)
  },

  joinSession: function(name) {
    data.user = name
    this.output()
  },

  output: function() {
    this.trigger(data)
  }
})
