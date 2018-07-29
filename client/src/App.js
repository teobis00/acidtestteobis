import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';
import Pusher from 'pusher-js';

class App extends Component {
  state = {
    response: ''
  };

  componentDidMount() {
    this.callApi()
      .then(res => this.setState({ response: JSON.stringify(res.citys) }))
      .catch(err => console.log(err));

    var pusher = new Pusher('6b37d05687f27a568c19', {
      cluster: 'us2',
      encrypted: true
    });
    
    let $this =this;
    var channel = pusher.subscribe('teobischannel');
    channel.bind('refresh', function(data) {
      console.log(data);
    });

  }

  callApi = async () => {
    const response = await fetch('/api/citys');
    const body = await response.json();

    if (response.status !== 200) throw Error(body.message);

    return body;
  };

  render() {
    return (
      <div className="App">
        <p className="App-intro">
          {this.state.response}
        </p>
      </div>
    );
  }
}

export default App;
