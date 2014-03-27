/*
* @Author: Xin Wang
* @Date:   2014-03-22 23:33:53
* @Last Modified by:   sutar
*/

var c = require('colorful');

exports.blanks = function() {
    return '    ';
}

exports.logo = function () {
    return c.yellow('Netease Music ') + c.grey('http://music.163.com');
}

exports.playHelp = function() {
    var text = c.green('§ Songs\n');
    text += this.blanks();
    text += c.yellow('[o] ');
    text += c.cyan('Play this ');
    text += c.yellow('[a] ');
    text += c.cyan('Add ');
    text += c.yellow('[s] ');
    text += c.cyan('Play/Stop');
    text += c.yellow('[i] ');
    text += c.cyan('Add all ');
    text += c.yellow('[l] ');
    text += c.cyan('Playlist ');
    text += c.yellow('[n] ')
    text += c.cyan('Next ');
    text += c.yellow('[q] ');
    text += c.cyan('Back ');
    return text;
}

exports.albumlistHelp = function() {
    var text = c.green('§ Albums\n');
    text += this.blanks();
    text += c.yellow('[o] ');
    text += c.cyan('Show albums ');
    text += c.yellow('[i] ');
    text += c.cyan('Add this albums to playlist ');
    text += c.yellow('[l] ');
    text += c.cyan('Playlist ');
    text += c.yellow('[s] ');
    text += c.cyan('Play/Stop ');
    text += c.yellow('[q] ');
    text += c.cyan('Back ');
    return text;

}

exports.playlistHelp = function() {
    var text = c.green('§ Playlist\n');
    text += this.blanks();
    text += c.yellow('[l] ');
    text += c.cyan('Search list ');
    text += c.yellow('[n] ');
    text += c.cyan('Next ');
    text += c.yellow('[s] ');
    text += c.cyan('Play/Stop ');
    text += c.yellow('[o] ');
    text += c.cyan('Play this ');
    text += c.yellow('[q] ');
    text += c.cyan('Main menu ');
    return text;
}

exports.log = function(text) {
    console.log(this.blanks() + c.yellow(text));
}

exports.objEmpty = function(obj) {
    for (var prop in obj) if (obj.hasOwnProperty(prop)) return false;
    return true;
}
