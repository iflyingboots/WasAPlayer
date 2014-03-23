/*
 * @Author: Xin Wang
 * @Date:   2014-03-22 11:59:27
 */

var sdk = require('./sdk'),
    utils = require('./utils'),
    prompt = require('prompt'),
    Player = require('player'),
    c = require('colorful'),
    termList = require('term-list-bar');

var NeteasePlayer = function() {
    var self = this;
    self.isShowLrc = false;
    self.isPlaying = false;
    self.state = '';
    self.songs = {};
    self.player = new Player([], {
        cache: true
    });
    console.log(self.shorthands);
}

NeteasePlayer.prototype.init = function(callback) {
    this.setBarText('', '');
    return this.createMenu(callback);
}

/**
 * Quit program
 */
NeteasePlayer.prototype.quit = function() {
    this.menu.stop();
    return process.exit();
}

/**
 * Search songs by keywords
 */
NeteasePlayer.prototype.searchSongs = function() {
    var self = this;
    self.menu.stop();
    prompt.message = 'Please enter the ';
    prompt.delimiter = "*".grey;
    prompt.start();
    prompt.get(['keywords'], function(err, res) {
        if (err || res.keywords === '') {
            return self.createMenu();
        };
        console.log(c.green('Searching for “' + res.keywords + '”'));
        sdk.searchSongs(res.keywords, 15, function(data) {
            self.songs = data;
            return self.displaySongs();
        });
    });
}

/**
 * Process main menu events
 */
NeteasePlayer.prototype.menuDispatch = function(item) {
    var self = this;
    if (item === 'searchSongs') {
        return self.searchSongs();
    } else if (item === 'searchArtists') {
        //@TODO
    };
}

/**
 * Add song to playlist
 * self.playlist = [{songID:Int, src:String}, ...]
 * @param {int} songId
 * @param {string} url
 */
NeteasePlayer.prototype.addPlaylist = function(songId, url) {
    var self = this;
    return self.player.add({
        songId: songId,
        src: url,
    });
}

/**
 * Draw songs list menu
 */
NeteasePlayer.prototype.drawSongList = function() {
    var self = this;
    if (!self.songList) {
        self.songList = new termList();
    };
    self.songList.setTopText(utils.playHelp());
    for (var key in self.songs) {
        self.songList.add(key, self.songs[key]);
    };
    return self.songList.draw();
}

/**
 * Update song list item
 * @param  {int} songId
 * @param  {string} state  Appdending text
 */
NeteasePlayer.prototype.updateSongList = function(songId, state) {
    var self = this;
    var menuItem = self.songs[songId];
    self.songList.get(songId).label = menuItem + c.yellow(' ' + state);
    return self.songList.draw();
}

/**
 * Display song list and handle events
 */
NeteasePlayer.prototype.displaySongs = function() {
    var self = this;
    self.state = 'songList';
    self.drawSongList();
    self.songList.start();
    self.songList.on('keypress', function(key, item) {
        // item -> songId
        if (key.name === 'q') {
            self.songList.stop();
            self.createMenu();
            return self.menu.draw();
        };
        if (key.name === 'return' || key.name === 'o') {
            return self.forcePlay(item);
        };
        if (key.name === 'p') {
            return self.togglePlaying();
            // return self.stopPlaying();
        };
        if (key.name === 'a') {
            return self.addToList(item);
        };
    });
}

/**
 * Toggle play state
 */
NeteasePlayer.prototype.togglePlaying = function() {
    if (this.isPlaying) {
        this.stopPlaying();
    } else {
        this.play();
    };
}

/**
 * Stop playing music
 */
NeteasePlayer.prototype.stopPlaying = function() {
    var self = this;
    if (self.player.list.length > 0) {
        var playingSongId = self.player.list[0]['songId'];
        self.updateSongList(playingSongId, '');
    };
    self.isPlaying = false;
    return self.player.stop();
}

/**
 * Add song to the playing list
 * @param {int} songId
 */
NeteasePlayer.prototype.addToList = function(songId) {
    var self = this;
    console.log(c.cyan('Adding ' + self.songs[songId] + ' ...'));
    sdk.songDetail(songId, function(data) {
        var songUrl = data[0]['mp3Url'];
        self.addPlaylist(songId, songUrl);
        console.log(c.cyan('Added.'));
        // if only one song in the queue, play it
        if (self.player.list.length === 1) {
            self.play();
        };
    });
}


/**
 * Force to play the selected song, clean the queue
 * @param  {int} songId
 */
NeteasePlayer.prototype.forcePlay = function(songId) {
    var self = this;
    console.log(c.yellow('Connecting server ... '));
    if (self.player.list.length > 0) {
        // reset label
        if (self.player.list[0]['songid'] in self.songs) {
            var previousSongId = self.player.list.shift()['songId'];
            self.updateSongList(previousSongId, '');
        };
        // stop playing
        self.player.stop();
        // clean playlsit
        self.player.list = [];
    };
    sdk.songDetail(songId, function(data) {
        var songUrl = data[0]['mp3Url'];
        self.addPlaylist(songId, songUrl);
        self.play();
    });
}

/**
 * The core function for playing songs
 */
NeteasePlayer.prototype.play = function() {
    var self = this;
    console.log(c.yellow('Buffering ...'));
    self.player.play();
    self.isPlaying = true;
    // current playing song id
    var songId = self.player.list[0]['songId'];
    self.player.on('playing', function(playingItem) {
        self.updateSongList(songId, 'Playing');
        self.setBarText('Now playing:', self.songs[songId]);
        self.songList.draw();
    });

    self.player.on('playend', function(item) {
        // delete the played song
        var finished = self.player.list.shift()['songId'];
        self.setBarText('', '');
        if (self.state === 'songList' && (finished in self.songs)) {
            self.updateSongList(finished, '');
        };
        if (self.player.list.length > 0) {
            self.play();
        };
    });

    self.player.on('error', function(err) {
        console.log('Playing error: ' + err);
    });
}

/**
 * Set bar text for all menus
 * @param  {string} state Plain text
 * @param  {string} text Rendered text
 */
NeteasePlayer.prototype.setBarText = function(state, text) {
    var self = this;
    var renderedText = '';
    if(state !== '') {
        renderedText = c.cyan('» ' + state + ' ');
    };
    if (self.menu) {
        self.menu.setBarText(renderedText + text);
    };
    if (self.songList) {
        self.songList.setBarText(renderedText + text);
    };
}

/**
 * Create main menu
 * @param  {Function} callback
 */
NeteasePlayer.prototype.createMenu = function(callback) {
    var self = this;
    self.state = 'menu';
    self.menu = new termList();
    self.menu.setTopText(utils.logo());
    // self.menu.add('discover', '发现音乐');
    self.menu.add('searchSongs', '搜索歌曲 ' + c.grey('(s)'));
    // self.menu.add('searchArtists', '搜索歌手 ' + c.grey('(a)'));
    // self.menu.add('showPlaylist', '播放列表 ' + c.grey('(l)'));
    self.menu.start();
    self.menu.on('keypress', function(key, item) {
        if (key.name === 'return' || key.name === 'o') {
            return self.menuDispatch(item);
        };

        if (key.name === 's') {
            return self.searchSongs();
        };

        if (key.name === 'q') {
            return self.quit();
        };
    });

}

exports = module.exports = NeteasePlayer;
