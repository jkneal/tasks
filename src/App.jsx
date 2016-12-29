import React from 'react'
import Reflux from 'reflux'
import Sticky from 'react-sticky'
import {groupBy, map, filter, template} from 'lodash'

import 'normalize.css/normalize.css'
import styles from './App.less'
import appStore from './stores/app-store'
import appActions from './stores/app-actions'
import tauntImage from './assets/taunt.png'

export default React.createClass({

  mixins: [Reflux.connect(appStore, 'appData')],

  componentDidMount: function() {
    appActions.getFeature()
    appActions.getTaunts()
  },

  render: function() {
    if (!(this.state && this.state.appData)) {
      return null
    }

    const {user, feature, taunt, canAddTaunt} = this.state.appData
    const stories = groupBy(feature.tasks, 'story.label')

    let tauntMessage = taunt
    if (taunt) {
      tauntMessage = template(taunt)({user: `<b>${user}</b>`})
    }

    return (
      <div>
        <Sticky>
          <Feature feature={feature} user={user} tauntMessage={tauntMessage}/>
          {user && <div className={styles.Pad}>
            {feature.percentComplete != 100 && <h1 style={{margin: '.3em 0'}}>{feature.name} <span className="badge secondary" style={{fontSize: '.7em'}}>{feature.percentComplete}%</span> Complete</h1>}
            {feature.percentComplete == 100 && <h1 style={{margin: '.3em 0'}}>{feature.name} Complete</h1>}
          </div>}
        </Sticky>

        {user &&
          (
          <div className={styles.App}>
            {canAddTaunt && <AddTaunt/>}
            {map(stories, (t, s) => {
              return <Story key={s} story={s} tasks={t} user={user}/>
            })}
            <Completed tasks={feature.tasks}/>
          </div>
          )
        }
      </div>
    )
  }
})

const Story = ({story, tasks, user}) => {
  const fullStory = (tasks && tasks.length) ? tasks[0].story : {}
  return (
    <div style={{marginBottom: '3rem'}}>
      <h4>
        <a href={fullStory.link} target="_blank">{story}</a>
        <span className="warning label float-right" style={{fontSize: '.6em'}}>Branch: {fullStory.branch}</span>
      </h4>
      <hr style={{maxWidth: 'none', marginTop: 0}}/>
      <InProgress tasks={tasks} user={user}/>
      <Queue tasks={tasks}/>
      <Waiting tasks={tasks}/>
    </div>
  )
}

const Feature = React.createClass({
  getInitialState: function() {
    return {
      name: ''
    }
  },

  updateName: function(e) {
    this.setState({name: e.target.value})
  },

  render: function() {
    const {user, tauntMessage} = this.props
    return (
      <div className="top-bar">
  <div className="top-bar-left">
    <ul className="dropdown menu">
      <li className="menu-text" style={{fontSize: '1.2em'}}>Karma Team</li>
    </ul>
  </div>
  <div className="top-bar-right">
    {!user && (<ul className="menu">
      <li><input type="text" value={this.state.name} onChange={this.updateName}/></li>
      <li><button type="button" className="button" disabled={!this.state.name} onClick={() => appActions.joinSession(this.state.name)}>Join</button></li>
    </ul>)}
    {user && <div>
      {tauntMessage && <div className="callout" style={{border: 'none', margin: 0, backgroundColor: 'transparent', padding: '.5rem 0 0 0'}}>
        <p style={{marginBottom: 0, marginRight: '2rem'}}><img src={tauntImage} style={{width: '1.7rem', marginRight: '.8rem'}}/>
        <span dangerouslySetInnerHTML={{__html: tauntMessage}}></span></p>
      </div>}
      {!tauntMessage && <div className="menu" style={{marginRight: '1rem', padding: '.5rem 0 0 0'}}>{user}</div>}
      </div>
    }
  </div>
</div>
    )
  }
})

const AddTaunt = React.createClass({
  getInitialState: function() {
    return {
      taunt: ''
    }
  },

  updateTaunt: function(e) {
    this.setState({taunt: e.target.value})
  },

  render: function() {
    const userTmpl = '<%= user %>'
    return (
      <div className="callout success">
        <h5>Rock On!</h5>
        <div>
        You get to add a Taunt to your team members. Enter {userTmpl} to subsitute the users name.
        <div className="input-group">
          <input className="input-group-field" type="text" value={this.state.taunch} onChange={this.updateTaunt}/>
          <div className="input-group-button">
          <button type="button" className="button" disabled={!this.state.taunt} onClick={() => appActions.addTaunt(this.state.taunt)}>Taunt</button>
          </div>
        </div>
        </div>
      </div>
    )
  }
})

const InProgress = ({tasks, user}) => {
  const inProgressTasks = filter(tasks, t=> !t.complete && t.assignee)
  return (
    <div>
      <h5>In Progress</h5>
      {inProgressTasks.map((task, i) => <InProgressTask key={i} task={task} user={user}/>)}
    </div>
  )
}

const InProgressTask = ({task, user}) => {
  const completeTask = () => {
    task.complete = true
    appActions.updateTask(task)
    appActions.canAddTaunt()
  }
  return (
    <div className={styles.InProgressTask}>
      <div style={{width: '3rem'}}>
        <input type="checkbox" checked={task.complete} onClick={completeTask}/>
      </div>
      <div style={{width: '7rem'}}>
        {task.type}
      </div>
      <div style={{flex: 3}}>
        {task.summary}
      </div>
      <div style={{width: '5rem'}}>
        <span className={task.assignee === user ? 'secondary label' : ''}>{task.assignee}</span>
      </div>
      <div style={{flex: 1}}>
        {(task.assignee === user) && <button className="tiny alert button" style={{marginBottom: 0}} onClick={() => appActions.unassignTask(task)}>Runaway</button>}
      </div>
    </div>
  )
}

const Queue = ({tasks}) => {
  const queueTasks = filter(tasks, {complete: false, readyToWork: true, assignee: ''})
  return (
    <div>
      <h5 className="subheader">Queue</h5>
      {queueTasks.map((task, i) => <QueueTask key={i} task={task}/>)}
    </div>
  )
}

const QueueTask = ({task}) => {
  return (
    <div className={styles.QueueTask}>
      <div style={{width: '7rem'}}>
        {task.type}
      </div>
      <div>
        {task.summary}
      </div>
      <div style={{width: '15rem'}}>
        <button className="tiny button" style={{marginBottom: 0}} onClick={() => appActions.assignTask(task)}><i className="fa fa-hand-rock-o"></i> Grab</button>
      </div>
    </div>
  )
}

const Waiting = ({tasks}) => {
  const waitingTasks = filter(tasks, t => !t.complete && !t.readyToWork && !t.assignee)
  return (
    <div>
      <h5 className="subheader">Waiting</h5>
      {waitingTasks.map((task, i) => <WaitingTask key={i} task={task}/>)}
    </div>
  )
}

const WaitingTask = ({task}) => {
  return (
    <div className={styles.WaitingTask}>
      <div style={{width: '10%'}}>
        {task.type}
      </div>
      <div style={{flex: 1}}>
        {task.summary}
      </div>
    </div>
  )
}

const Completed = ({tasks}) => {
  const completedTasks = filter(tasks, {complete: true})
  return (
    <div>
      <h4>Completed</h4>
      {completedTasks.map((task, i) => <CompletedTask key={i} task={task}/>)}
    </div>
  )
}

const CompletedTask = ({task}) => {
  return (
    <div className={styles.CompletedTask}>
      <div style={{width: '7rem'}}>
        {task.type}
      </div>
      <div style={{flex: 1}}>
        {task.summary}
      </div>
      <div style={{width: '5rem'}}>
        {task.assignee}
      </div>
    </div>
  )
}
