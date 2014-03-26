/*
 * @Author: Xin Wang
 * @Date:   2014-03-22 11:56:10
 */

var request = require('request'),
    color = require('colorful');

exports.songDetail = function(songId, callback) {
    var url = 'http://music.163.com/api/song/detail?id=' + songId + '&ids=%5B' + songId + '%5D';
    request.get({
        url: url,
        headers: {
            Referer: 'http://music.163.com/'
        }
    }, function(err, res, body) {
        if (!err && res.statusCode == 200) {
            return callback(JSON.parse(body)['songs']);
        };
        return null;
    });
};

exports.searchArtist = function(keyword, callback) {
    var url = 'http://music.163.com/api/search/get/web';
    request.post({
        url: url,
        headers: {
            Referer: 'http://music.163.com/'
        },
        form: {
            s: keyword,
            type: 100,
            limit: 10,
            total: 'true',
            offset: 0,
        }
    }, function(err, res, body) {
        if (!err && res.statusCode == 200) {
            return callback(JSON.parse(body)['result']['artists']);
        };
        return null;
    });
}

exports.searchSongs = function(keyword, limit, callback) {
    var url = 'http://music.163.com/api/search/get/web';
    var num = 10;
    var cb = arguments[1];
    // limit is optional, the default value is 10
    if (arguments.length == 3) {
        num = arguments[1];
        cb = arguments[2];
    };
    request.post({
        url: url,
        headers: {
            Referer: 'http://music.163.com/'
        },
        form: {
            s: keyword,
            type: 1,
            limit: num,
            total: 'true',
            offset: 0,
        }
    }, function(err, res, body) {
        if (!err && res.statusCode == 200) {
            var result = {};
            var jsonData = JSON.parse(body)['result']['songs'];
            if (jsonData.length < 1) {
                return cb(result);
            };
            jsonData.forEach(function(item){
                var text = color.green(item['name']);
                text += color.grey(' [' + item['album']['name'] + ']');
                text += ' - ' + item['artists'][0]['name'];
                result[item['id']] = text;
            });
            return cb(result);
        };
        return null;
    });
};

exports.lyricInfo = function(songId, callback) {
    var url = 'http://music.163.com/api/song/media?id=' + songId;
    request.get({
        url: url,
        headers: {
            Referer: 'http://music.163.com/'
        }
    }, function(err, res, body) {
        if (!err && res.statusCode == 200) {
            return callback(JSON.parse(body));
        };
        return null;
    });
}

exports.lyricText = function(songId, callback) {
    this.lyricInfo(songId, function(data) {
        if ('lyric' in data) {
            var pattern = /\[[^\]].*?\]/g;
            var text = data['lyric'].replace(pattern, '');
            return callback(text);
        };
        return null;
    });
}
