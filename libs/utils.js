/*
 * @Author: Xin Wang
 * @Date:   2014-03-22 23:33:53
 * @Last Modified by:   sutar
 */

var c = require('colorful'),
    fs = require('fs'),
    crypto = require('crypto'),
    sysInfo = require('../package');

exports.home = function() {
    return process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
}

exports.jsonSync = function(file) {
    try {
        var data = fs.readFileSync(file);
        return JSON.parse(data.toString());
    } catch (err) {
        return {};
    }
}

exports.formatDuration = function(data) {
    var duration = Math.floor(data / 1000);
    return Math.floor(duration / 60) + '′' + duration % 60 + '″';
}

exports.formatSongTitle = function(item) {
    var text = c.green(item.name) +
        c.cyan(' [' + item.album.name + ']') +
        ' ' + item.artists[0].name +
        ' ' + c.grey(this.formatDuration(item.duration));
    return text;
}

exports.formatAlbum = function(item) {
    var text = c.green(item.name) +
        ' ' + item.artist.name +
        c.grey(' (' + item.size + ')');
    return text;
}

exports.formatArtist = function(item) {
    var text = c.green(item.name);
    if (item.alias.length > 0) {
        text += c.grey(' (');
        text += c.grey(item.alias.join('/'));
        text += c.grey(')');
    };
    return text;
}

exports.getTrackURL = function(dfsId) {
    var byte1 = '3go8&$8*3*3h0k(2)2';
    var byte1Length = byte1.length;
    var byte2 = dfsId + '';
    var byte2Length = byte2.length;
    var byte3 = [];
    var md5sum = crypto.createHash('md5');
    for (var i = 0; i < byte2Length; i++) {
        byte3[i] = byte2.charCodeAt(i) ^ byte1.charCodeAt(i % byte1Length);
    };

    byte3 = byte3.map(function(i) {
        return String.fromCharCode(i)
    }).join('');

    md5sum.update(byte3);
    results = md5sum.digest('base64')
    results = results.replace(/\//g, '_').replace(/\+/g, '-');

    var url = 'http://m1.music.126.net/' + results + '/' + byte2 + '.mp3';
    return url;
}

exports.blanks = function() {
    return '    ';
}

exports.logo = function() {
    return c.yellow('Netease Player ') +
        c.cyan(sysInfo.version)
}

exports.playHelp = function() {
    var text = c.green('§ Songs\n') +
        this.blanks() +
        c.yellow('[o] ') +
        c.grey('Play this ') +
        c.yellow('[a] ') +
        c.grey('Add ') +
        c.yellow('[s] ') +
        c.grey('Play/Stop ') +
        c.yellow('[i] ') +
        c.grey('Add all ') +
        c.yellow('[l] ') +
        c.grey('Playlist ') +
        c.yellow('[n] ') +
        c.grey('Next ') +
        c.yellow('[q] ') +
        c.grey('Back ');
    return text;
}

exports.artistlistHelp = function() {
    var text = c.green('§ Arist\n') +
        this.blanks() +
        c.yellow('[o] ') +
        c.grey('Show albums ') +
        c.yellow('[l] ') +
        c.grey('Playlist ') +
        c.yellow('[q] ') +
        c.grey('Back ');
    return text
}

exports.albumlistHelp = function() {
    var text = c.green('§ Albums\n') +
        this.blanks() +
        c.yellow('[o] ') +
        c.grey('Show tracks ') +
        c.yellow('[i] ') +
        c.grey('Add this album to playlist ') +
        c.yellow('[l] ') +
        c.grey('Playlist ') +
        c.yellow('[s] ') +
        c.grey('Play/Stop ') +
        c.yellow('[q] ') +
        c.grey('Back ');
    return text;
}

exports.playlistHelp = function() {
    var text = c.green('§ Playlist\n') +
        this.blanks() +
        c.yellow('[l] ') +
        c.grey('Search list ') +
        c.yellow('[n] ') +
        c.grey('Next ') +
        c.yellow('[s] ') +
        c.grey('Play/Stop ') +
        c.yellow('[o] ') +
        c.grey('Play this ') +
        c.yellow('[w] ') +
        c.grey('Save Play List ') +
        c.yellow('[r] ') +
        c.grey('Load Play List ') +
        c.yellow('[q] ') +
        c.grey('Main menu ');
    return text;
}

exports.log = function(text) {
    console.log(this.blanks() + c.yellow(text));
}

exports.objEmpty = function(obj) {
    for (var prop in obj)
        if (obj.hasOwnProperty(prop)) return false;
    return true;
}
