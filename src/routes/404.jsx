import React from 'react'

export default React.createClass({

  displayName: '404Page',

  render() {
    return (
      <div style={{textAlign: 'center'}}>
        <div style={{fontSize: 64, marginTop: 100}}>404</div>
        <div>Invalid Location</div>
      </div>
    )
  }
})
