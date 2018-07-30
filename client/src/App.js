import React, { Component } from 'react';
import './App.css';
import Pusher from 'pusher-js';

class City extends React.Component {
  render() {
    return <div className="citi_item">
              <h1>{this.props.name}</h1>
              <p>
              {this.props.temp}
              </p>
              <p>
              {this.props.time}
              </p>
           </div>;
  }
}

class App extends Component {
  state = {
    response: [],
    ran:0,
  };

  componentDidMount() {
    this.callApi()
      .then(res => this.setState({ response: res.citys }))
      .catch(err => console.log(err));

    var pusher = new Pusher('6b37d05687f27a568c19', {
      cluster: 'us2',
      encrypted: true
    });

    //let $this =this;
    var channel = pusher.subscribe('teobischannel');
    channel.bind('refresh', function(data) {
      console.log(data);
    });

  }

  convertBackTime = (unix_timestamp)=>{
    let date = new Date(unix_timestamp*1000);
    let hours = date.getHours();
    let minutes = "0" + date.getMinutes();
    let seconds = "0" + date.getSeconds();
    let formattedTime = hours + ':' + minutes.substr(-2) + ':' + seconds.substr(-2);
    return formattedTime;
  }

  callApi = async () => {
    const response = await fetch('/api/citys');
    const body = await response.json();

    if (response.status !== 200) throw Error(body.message);

    return body;
  };

  render() {
    
    var cities = [];
        //cities.push(<City key="1" name=":D"/>);

        this.state.response.forEach(function(item,index){
          console.log(item);
          cities.push(<City key={index} name={Object.keys(item)[0]} temp={ item[Object.keys(item)[0]]['temp']} time={item[Object.keys(item)[0]]['time']}/>)
        });

    return (
      <div className="container">
        {cities}
      </div>
    );
  }
}

export default App;
