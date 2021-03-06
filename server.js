const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 5000;
const axios = require('axios');
const Pusher = require('pusher');


//const skey = 'dc8ff4a0abdea23dae323485dd21fc64';

if (process.env.REDISTOGO_URL) {

	var rtg   = require("url").parse(process.env.REDISTOGO_URL);
	var redis = require("redis").createClient(rtg.port, rtg.hostname);

	redis.auth(rtg.auth.split(":")[1]);
} else {
    var redis = require("redis").createClient();
}

/* Set Cities on Redis */
redis.hmset('citys', {
    'santiago': '-33.447487|-70.673676',
    'zurich': '47.451542|8.564572',
    'auckland': '-36.848461|174.763336',
    'sydney': '-33.865143|151.209900',
    'londres': '51.509865|-0.118092',
    'georgia': '33.247875|-83.441162',
});
let relevantData = [];

let timmer = false;

app.get('/api/errors',(req, res)=>{
	redis.hgetall('api.errors', function(err, object) {
		res.send({errors:object});
	});
})

app.get('/api/citys', (req, res) => {
	if(timmer){
		clearInterval(timmer);
		timmer = setInterval(execInterval,10000);
	}
	redis.hgetall('citys', function(err, object) {
		if(!object){
			res.send({ citys:0 });
		}else{
			relevantData = []; // reset Relevant Data on every Api Call
			console.log('Object from Redis',object);
			checkData(res,object,false); 

		}
	});
});

/*Pusher API from pusher.com */
/*Who wants to deal with socket.io */
const pusher = new Pusher({
  appId: '568815',
  key: '6b37d05687f27a568c19',
  secret: '435db3e9a74bcdf0dd50',
  cluster: 'us2',
  encrypted: true
});

/* Update the Front Every Ten Seconds from the redis keys citys */

const execInterval = ()=>{
	console.log('Start Interval for 10 seconds');
	redis.hgetall('citys', function(err, object) {
		if(!object){
			return false;
		}else{
			relevantData = []; // reset Relevant Data on every Api Call
			console.log('Object from Redis for Socket',object);
			checkData('',object,true); 
		}
	});
}

/*Start the Timer !!*/
/*This consume to many request to the Free API !!*/
timmer = setInterval(execInterval,10000);

const instance = axios.create()
instance.interceptors.response.use(
  response => response.data,
  err => {
    const error = new Error(err.response.statusText)
    error.statusCode = err.response.status
    error.data = err.response.data
    return Promise.reject(error)
  }
);

const getForecastKey = ()=>{

	let secret = ['1937bbf1fe34f45e2d69b9949dd83843','5c70c6d423547de85e5b3bab5cdc08f6','e405304bf29f3547ee05a72cb5bca1de','b8cff59106173db136f8a23214c255cd']

	return secret[Math.floor(Math.random()*secret.length)];
}


const checkData = (res,object,forsocket) => {
			const promises   = [];
			const cityName   = [];
			console.log('Object From Redis',object);
			const api = axios.create();
			let fake_key = '1'; // Wrong Key to simulate error
			let real_key = getForecastKey();

			let probability = 0.1; // Set here prob to fail the request by fake forecast key

			for (var k in object) {
				var o = object[k].split('|');
						let skey = (Math.random(0, 1) < probability) ? fake_key:real_key;
				        promises.push(api.get(`https://api.darksky.net/forecast/${skey}/${o[0]},${o[1]}`))
				        cityName.push(k);
			}

			const promisesResolved = promises.map(promise => promise.catch(error => ({ error })))

			
			getT(promisesResolved).then(objTmp => {
				
			    let resultObject = objTmp.data.map(function(item,index){
			    	if(item.hasOwnProperty('error')){
			    		return {[cityName[index]]:{}}
			    	}else{
			    		return {[cityName[index]]:
			    			{'temp':Math.floor(item.data.currently.temperature),
			    			 'time':item.data.currently.time,
			    			 'icon':item.data.currently.icon}}	
			    	}
				});				

			    let resolved = resultObject.filter((item)=>{ 
						if(item[Object.keys(item)[0]].hasOwnProperty('temp')){
							return item;
						}
					});

			    let unresolved = resultObject.filter((item)=>{ 
						if(!item[Object.keys(item)[0]].hasOwnProperty('temp')){
							return item;
						}
					});

			    console.log('resolved',resolved);
			    console.log('unresolved',unresolved);

			    resolved.forEach((item)=>{
			    	relevantData.push(item);
			    });

			    if(unresolved.length > 0){
			    	let newObject = {};
			    	unresolved.forEach((item)=>{
			    		console.log('_____________unresolved item____________',Object.keys(item)[0]);

			    		newObject[Object.keys(item)[0]] = object[Object.keys(item)[0]];
			    		setRedisError(Object.keys(item)[0]);
			    	});
			    	checkData(res,newObject,forsocket);
			    	return false;
			    }

			    if(forsocket){
			    	callSocked();
			    }else{
			    	returnData(res); 	
			    }
				
			});
}

const callSocked = ()=>{
	relevantData.sort(function(a, b){
	    var keyA = Object.keys(a)[0],
	        keyB = Object.keys(b)[0];
	    // Compare the 2 dates
	    if(keyA < keyB) return -1;
	    if(keyA > keyB) return 1;
	    return 0;
	});
	pusher.trigger('teobischannel', 'refresh', {
		citys:relevantData
	});
}

const returnData = (res)=>{
	relevantData.sort(function(a, b){
	    var keyA = Object.keys(a)[0],
	        keyB = Object.keys(b)[0];
	    // Compare the 2 dates
	    if(keyA < keyB) return -1;
	    if(keyA > keyB) return 1;
	    return 0;
	});
	res.send({ citys:relevantData });
}

const setRedisError = async (city)=>{
	let ts = Date.now() / 1000 | 0 ;
	console.log('TimeStamp',ts);
	redis.hmset('api.errors', {
	    [ts]: `connection Error on ${ city }`
	});
}	



const checkFailed = (then) => {
  return function (responses) {
    const someFailed = responses.some(response => response.error)

    if (someFailed) {
      throw responses
    }

    return then(responses)
  }
}

async function getT(promisesResolved){
  const llamada = await axios.all(promisesResolved)
  .then(checkFailed(([...structures]) => {
	return {data:structures}
  }))
  .catch((err) => {
	return {data:err}
  });
  /* Return Every Call to Forecast */
  return llamada;
}



if (process.env.NODE_ENV === 'production') {
  // Serve any static files
  app.use(express.static(path.join(__dirname, 'client/build')));
  // Handle React routing, return all requests to React app
  app.get('*', function(req, res) {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
  });
}
app.listen(port, () => console.log(`Listening on port ${port}`));