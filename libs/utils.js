/*
* @Author: Xin Wang
* @Date:   2014-03-22 23:33:53
* @Last Modified by:   sutar
*/

var c = require('colorful');

exports.logo = function () {
    return c.yellow('Netease Music ') + c.grey('http://music.163.com');
}

exports.playHelp = function() {
    var text = c.yellow('[o] ');
    text += c.cyan('Play this ');
    text += c.yellow('[a] ');
    text += c.cyan('Add to list ');
    text += c.yellow('[q] ');
    text += c.cyan('Back ');
    text += c.yellow('[p] ');
    text += c.cyan('Play/Stext ');
    return text;
}
