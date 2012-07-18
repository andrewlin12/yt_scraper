var _ = require('underscore');
var async = require('async');
var fs = require('fs');
var querystring = require('querystring');
var request = require('request');
var url = require('url');

PLAYERCONFIG_PREFIX = 'yt.playerConfig = ';
PLAYERCONFIG_SUFFIX = '};';

if (process.argv.length < 1) {
  console.log('Usage: node scraper.js <youtube-id>');
  process.exit(1);
}

var ytId = process.argv[2];
var ytUrl = 'http://www.youtube.com/watch?v=' + ytId;
console.log('Fetching ' + ytUrl + '...');

request(ytUrl, function(err, resp, body) {
  if (err) {
    console.log(err);
    return process.exit(1);
  }
  var startIndex = body.indexOf(PLAYERCONFIG_PREFIX);
  if (startIndex == -1) {
    console.log("Couldn't find yt.playerConfig!");
    return process.exit(1);    
  }

  var endIndex = body.indexOf(PLAYERCONFIG_SUFFIX, startIndex);
  if (endIndex == -1) {
    console.log("Couldn't find end of yt.playerConfig!");
    return process.exit(1);
  }

  var playerConfig = JSON.parse(body.substring(
      startIndex + PLAYERCONFIG_PREFIX.length, endIndex + 1));
  var urls = playerConfig.args.url_encoded_fmt_stream_map.split(',');
  urls = _.map(urls, function(u) {
    return querystring.parse(u);
  });

  var toDownload = _.filter(urls, function(u) {
    return u.quality === 'medium' && u.type.indexOf('webm') !== -1;
  });

  _.each(toDownload, function(u) {
    var filename = ytId + '_' + u.quality + '.webm'
    console.log('Downloading ' + filename + '...');
    var stream = fs.createWriteStream(filename);
    var statusHandle = setInterval(function() {
      console.log(stream.bytesWritten + ' bytes written');
    }, 1000);
    stream.on('close', function() {
      clearInterval(statusHandle);
      console.log('Done!');
    });
    request(u.url).pipe(stream);
  });
});
