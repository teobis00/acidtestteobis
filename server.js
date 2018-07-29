const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 5000;
// API calls



console.log(' ______----____________ process.env.NODE_ENV',process.env.NODE_ENV,' ______----____________', process.env.REDISTOGO_URL);

if (process.env.REDISTOGO_URL) {

	var rtg   = require("url").parse(process.env.REDISTOGO_URL);
	var redis = require("redis").createClient(rtg.port, rtg.hostname);

	redis.auth(rtg.auth.split(":")[1]);
} else {
    var redis = require("redis").createClient();
}

redis.hmset('citys', {
    'santiago': '-33.447487|-70.673676.',
    'zurich': '47.451542|8.564572',
    'auckland': '-36.848461|174.763336',
    'sydney': '-33.865143|151.209900.',
    'londres': '51.509865|-0.118092.',
    'georgia': '33.247875|-83.441162',

});

console.log('con arrow',
	redis.hgetall('citys',(err, object)=> { return object })
	);

app.get('/api/hello', (req, res) => {
  res.send({ express: 'Hello From Express',citys:'' });
});

if (process.env.NODE_ENV === 'production') {
  // Serve any static files
  app.use(express.static(path.join(__dirname, 'client/build')));
  // Handle React routing, return all requests to React app
  app.get('*', function(req, res) {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
  });
}
app.listen(port, () => console.log(`Listening on port ${port}`));