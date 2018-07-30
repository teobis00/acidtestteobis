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


app.get('/api/citys', (req, res) => {
	redis.hgetall('citys', function(err, object) {
		if(!object){
			res.send({ citys:0 });
		}else{
			relevantData = []; // reset Relevant Data on every Api Call
			console.log('Object from Redis',object);
			checkData(res,object); 

		}
	});
});

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



const checkData = (res,object,withretry) => {
			const promises   = [];
			const cityName   = [];
			console.log('OBJECT',object);
			const api = axios.create();
			let fake_key = '1'; // Wrong Key to simulate error
			let real_key = 'dc8ff4a0abdea23dae323485dd21fc64';

			let probability = 0.3; // Set here prob to fail the request by fake forecast key

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
			    		return {[cityName[index]]:{'temp':Math.floor(item.data.currently.temperature),'time':item.data.currently.time}}	
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
			    	checkData(res,newObject);
			    	return false;
			    }
			    

				returnData(res); 
			});
}

const returnData = (res)=>{
	res.send({ citys:relevantData });
}

const setRedisError = (city)=>{
	let ts = Date.now() / 1000 | 0 ;
	console.log('TimeStamp',ts);
	redis.hmset('api.errors', {
	    ts: `connection Error on ${ city }`
	});
}	



function checkFailed (then) {
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