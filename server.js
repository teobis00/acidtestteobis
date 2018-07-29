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
});

redis.hgetall('citys', function(err, object) {
    console.log('citys.santiago',object.santiago);
});

app.get('/api/hello', (req, res) => {
  res.send({ express: 'Hello From Express' });
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