import React, { Component } from 'react';
import './App.css';
import Pusher from 'pusher-js';
import WeatherIcon from 'react-icons-weather';
import FaClockO from 'react-icons/lib/fa/clock-o';


class City extends React.Component {
  render() {
    return <div className="citi_item">
              <h1>{this.props.name}</h1>
              <p className="temp">
              <WeatherIcon name="darksky" iconId={this.props.icon} flip="horizontal" rotate="90" /> {this.props.temp}°
              </p>
              <p className="time">
              <FaClockO/>{this.props.time}
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
    const $this = this;
    var channel = pusher.subscribe('teobischannel');
    channel.bind('refresh', function(data) {
      console.log('DATA FROM PUSHER',data.citys);
      $this.setState({ response: data.citys })
    });

  }

  convertRetardtoCelcius = (retards)=>{
    let f = parseFloat(retards);
    return Math.floor((f-32) / 1.8);
  }

  convertBackTime = (unix_timestamp)=>{
    let date = new Date(unix_timestamp*1000);
    let hours = date.getHours();
    let minutes = "0" + date.getMinutes();
    let formattedTime = hours + ':' + minutes.substr(-2);
    return formattedTime;
  }

  callApi = async () => {
    const response = await fetch('/api/citys');
    const body = await response.json();

    if (response.status !== 200) throw Error(body.message);

    return body;
  };

  render() {
    
    let   cities = [];
    const $this  = this;
    this.state.response.forEach(function(item,index){

      let icon       =  item[Object.keys(item)[0]]['icon'];
      let hummantime = $this.convertBackTime( item[Object.keys(item)[0]]['time']);
      let celcius    = $this.convertRetardtoCelcius(item[Object.keys(item)[0]]['temp']);
      cities.push(<City key={index} name={Object.keys(item)[0]} temp={ celcius } time={hummantime} icon={icon}/>);

    });

    return (
      <div className="container">
        {cities}
      </div>
    );
  }
}

export default App;
