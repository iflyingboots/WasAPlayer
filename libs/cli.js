/*
 * @Author: Xin Wang
 * @Date:   2014-03-22 19:44:09
 * @Last Modified time: 2014-03-23 16:25:08
 */

var NeteasePlayer = require('./NeteasePlayer');

exports = module.exports = function() {
    var command = process.argv[2],
        np = new NeteasePlayer();
    if (!command) {
        return np.init();
    }
};
