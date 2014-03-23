/*
* @Author: Xin Wang
* @Date:   2014-03-22 23:33:53
* @Last Modified by:   sutar
*/

var colorful = require('colorful');

exports.logo = function (user) {
    return colorful.yellow('Netease Music ') + colorful.grey('http://music.163.com');
}
