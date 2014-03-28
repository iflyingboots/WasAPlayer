/*
 * @Author: Xin Wang
 * @Date:   2014-03-22 23:33:53
 * @Last Modified by:   sutar
 */

var c = require('colorful'),
    fs = require('fs');

exports.home = function() {
    return process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
}

exports.formatDuration = function(data) {
    var duration = Math.floor(data / 1000);
    return Math.floor(duration / 60) + '′' + duration % 60 + '″';
}

exports.formatSongTitle = function(item) {
    var text = c.green(item.name);
    text += c.cyan(' [' + item.album.name + ']');
    text += ' ' + item.artists[0].name;
    text += ' ' + c.grey(this.formatDuration(item.duration));
    return text;
}

exports.formatAlbum = function(item) {
    var text = c.green(item.name);
    text += ' ' + item.artist.name;
    text += c.grey(' (' + item.size + ')');
    return text;
}

exports.blanks = function() {
    return '    ';
}

exports.logo = function() {
    return c.yellow('Netease Music ') + c.grey('http://music.163.com');
}

exports.playHelp = function() {
    var text = c.green('§ Songs\n');
    text += this.blanks();
    text += c.yellow('[o] ');
    text += c.grey('Play this ');
    text += c.yellow('[a] ');
    text += c.grey('Add ');
    text += c.yellow('[s] ');
    text += c.grey('Play/Stop ');
    text += c.yellow('[i] ');
    text += c.grey('Add all ');
    text += c.yellow('[l] ');
    text += c.grey('Playlist ');
    text += c.yellow('[n] ')
    text += c.grey('Next ');
    text += c.yellow('[q] ');
    text += c.grey('Back ');
    return text;
}

exports.albumlistHelp = function() {
    var text = c.green('§ Albums\n');
    text += this.blanks();
    text += c.yellow('[o] ');
    text += c.grey('Show albums ');
    text += c.yellow('[i] ');
    text += c.grey('Add this albums to playlist ');
    text += c.yellow('[l] ');
    text += c.grey('Playlist ');
    text += c.yellow('[s] ');
    text += c.grey('Play/Stop ');
    text += c.yellow('[q] ');
    text += c.grey('Back ');
    return text;

}

exports.playlistHelp = function() {
    var text = c.green('§ Playlist\n');
    text += this.blanks();
    text += c.yellow('[l] ');
    text += c.grey('Search list ');
    text += c.yellow('[n] ');
    text += c.grey('Next ');
    text += c.yellow('[s] ');
    text += c.grey('Play/Stop ');
    text += c.yellow('[o] ');
    text += c.grey('Play this ');
    text += c.yellow('[q] ');
    text += c.grey('Main menu ');
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
