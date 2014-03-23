/*
 * @Author: Xin Wang
 * @Date:   2014-03-22 19:44:09
 */

var NeteasePlayer = require('./NeteasePlayer');

exports = module.exports = function() {
    var command = process.argv[2],
        np = new NeteasePlayer();
    if (!command) {
        return np.init();
    }
};
