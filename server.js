const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 5000;
const axios = require('axios');
const Pusher = require('pusher');


const skey = 'dc8ff4a0abdea23dae323485dd21fc64';

if (process.env.REDISTOGO_URL) {

	var rtg   = require("url").parse(process.env.REDISTOGO_URL);
	var redis = require("redis").createClient(rtg.port, rtg.hostname);

	redis.auth(rtg.auth.split(":")[1]);
} else {
    var redis = require("redis").createClient();
}

redis.hmset('citys', {
    'santiago': '-33.447487|-70.673676',
    'zurich': '47.451542|8.564572',
    'auckland': '-36.848461|174.763336',
    'sydney': '-33.865143|151.209900',
    'londres': '51.509865|-0.118092',
    'georgia': '33.247875|-83.441162',
});



app.get('/api/citys', (req, res) => {
	redis.hgetall('citys', function(err, object) {
		if(!object){
			res.send({ citys:0 });
		}else{

			const promises = [];
			const cityName   = [];
			console.log('api call ',`https://api.darksky.net/forecast/${skey}/${o[0]},${o[1]}`);
			for (var k in object) {
				var o = object[k].split('|');
				            console.log('object K', object[k]);
				            promises.push(axios.get(`https://api.darksky.net/forecast/${skey}/${o[0]},${o[1]}`))
				            cityName.push(k);
			}

			const promisesResolved = promises.map(promise => promise.catch(error => ({ error })))

			function checkFailed (then) {
			  return function (responses) {
			    const someFailed = responses.some(response => response.error)

			    if (someFailed) {
			      throw responses
			    }

			    return then(responses)
			  }
			}

			async function getT(callback){
			  const llamada = await axios.all(promisesResolved)
			  .then(checkFailed(([...structures]) => {
			  	
				return {data:structures}
			  }))
			  .catch((err) => {
				return {data:err}
			  });
				 
			  return llamada;
			}

			getT().then(objTmp => {
				console.log('objTmp',objTmp);
			    let relevantData = objTmp.data.map(function(item,index){
					return {[cityName[index]]:{'temp':Math.floor(item.data.currently.temperature),'time':item.data.currently.time}}
				});
				
				res.send({ citys:relevantData });
			}); 

		}
	});
});

var pusher = new Pusher({
  appId: '568815',
  key: '6b37d05687f27a568c19',
  secret: '435db3e9a74bcdf0dd50',
  cluster: 'us2',
  encrypted: true
});

/*
setInterval(()=>{

		redis.hgetall('citys', function(err, object) {
	  		const promises = [];
			const cityName   = [];

			for (var k in object) {
				var o = object[k].split('|');
				            console.log('object K', object[k]);
				            promises.push(axios.get(`https://api.darksky.net/forecast/${skey}/${o[0]},${o[1]}`))
				            cityName.push(k);
			}

			const promisesResolved = promises.map(promise => promise.catch(error => ({ error })))

			function checkFailed (then) {
			  return function (responses) {
			    const someFailed = responses.some(response => response.error)

			    if (someFailed) {
			      throw responses
			    }

			    return then(responses)
			  }
			}

			async function getT(callback){
			  const llamada = await axios.all(promisesResolved)
			  .then(checkFailed(([...structures]) => {
			  	
				return {data:structures}
			  }))
			  .catch((err) => {
				return {data:err}
			  });
				 
			  return llamada;
			}

			getT().then(objTmp => {
				console.log('objTmp',objTmp);
			    let relevantData = objTmp.data.map(function(item,index){
					return {[cityName[index]]:{'temp':Math.floor(item.data.currently.temperature),'time':item.data.currently.time}}
				});
				
				pusher.trigger('teobischannel', 'refresh', {
					citys:relevantData
				});
			});	
	  	});
},10000);
*/




if (process.env.NODE_ENV === 'production') {
  // Serve any static files
  app.use(express.static(path.join(__dirname, 'client/build')));
  // Handle React routing, return all requests to React app
  app.get('*', function(req, res) {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
  });
}
app.listen(port, () => console.log(`Listening on port ${port}`));