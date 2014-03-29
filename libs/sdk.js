/*
 * @Author: Xin Wang
 * @Date:   2014-03-22 11:56:10
 */

var request = require('request'),
    c = require('colorful'),
    utils = require('./utils');

exports.songDetail = function(songId, callback) {
    var url = 'http://music.163.com/api/song/detail?id=' + songId + '&ids=%5B' + songId + '%5D';
    request.get({
        url: url,
        headers: {
            Referer: 'http://music.163.com/'
        }
    }, function(err, res, body) {
        if (!err && res.statusCode == 200) {
            return callback(JSON.parse(body).songs);
        };
        return null;
    });
};

exports.albumDetail = function(albumId, callback) {
    var url = 'http://music.163.com/api/album/' + albumId;
    request.get({
        url: url,
        headers: {
            Referer: 'http://music.163.com/'
        }
    }, function(err, res, body) {
        if (!err && res.statusCode == 200) {
            var result = {};
            var jsonData = JSON.parse(body).album.songs;
            jsonData.forEach(function(item) {
                var text = utils.formatSongTitle(item);
                result[item.id] = text;
            });
            return callback(result);
        };
        return null;
    });
};

exports.searchAlbums = function(keyword, limit, callback) {
    var url = 'http://music.163.com/api/search/get/web';
    request.post({
        url: url,
        headers: {
            Referer: 'http://music.163.com/'
        },
        form: {
            s: keyword,
            type: 10,
            limit: limit,
            total: 'true',
            offset: 0,
        }
    }, function(err, res, body) {
        if (!err && res.statusCode == 200) {
            var result = {};
            var jsonData = JSON.parse(body).result.albums;
            if (jsonData === undefined || jsonData.length < 1) {
                return callback(jsonData);
            };
            jsonData.forEach(function(item) {
                var text = utils.formatAlbum(item);
                result[item.id] = text;
            });
            return callback(result);
        };
        return null;
    });
}

exports.searchSongs = function(keyword, limit, callback) {
    var url = 'http://music.163.com/api/search/get/web';
    request.post({
        url: url,
        headers: {
            Referer: 'http://music.163.com/'
        },
        form: {
            s: keyword,
            type: 1,
            limit: limit,
            total: 'true',
            offset: 0,
        }
    }, function(err, res, body) {
        if (!err && res.statusCode == 200) {
            var result = {};
            var jsonData = JSON.parse(body).result.songs;
            if (jsonData === undefined || jsonData.length < 1) {
                return callback(result);
            };
            jsonData.forEach(function(item) {
                var text = utils.formatSongTitle(item);
                result[item.id] = text;
            });
            return callback(result);
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
        return callback(null);
    });
}

exports.getLyric = function(songId, callback) {
    this.lyricInfo(songId, function(data) {
        if ('lyric' in data) {
            // var pattern = /\[[^\]].*?\]/g;
            // var text = data['lyric'].replace(pattern, '');
            return callback(data.lyric);
        };
        return callback(null);
    });
}
