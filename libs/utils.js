/*
 * @Author: Xin Wang
 * @Date:   2014-03-22 23:33:53
 * @Last Modified by:   sutar
 */

var c = require('colorful'),
    fs = require('fs'),
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
    c.yellow('[n] ')
    text += c.grey('Next ') +
    c.yellow('[q] ') +
    c.grey('Back ');
    return text;
}

exports.albumlistHelp = function() {
    var text = c.green('§ Albums\n') +
    this.blanks() +
    c.yellow('[o] ') +
    c.grey('Show albums ') +
    c.yellow('[i] ') +
    c.grey('Add this albums to playlist ') +
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
