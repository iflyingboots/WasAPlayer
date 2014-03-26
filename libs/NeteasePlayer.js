/*
 * @Author: Xin Wang
 * @Date:   2014-03-22 11:59:27
 */

var sdk = require('./sdk'),
    utils = require('./utils'),
    prompt = require('prompt'),
    Player = require('player'),
    c = require('colorful'),
    termList = require('./term');

var mainMenuKeys = {
    'return': 'mainMenuDispatch',
    'o': 'mainMenuDispatch',
    's': 'searchSongs',
    // 'a': 'searchArtists',
    'l': 'showPlaylistMenu',
    'q': 'quit',
};

var songlistMenuKeys = {
    'q': 'showMainMenu',
    'return': 'forcePlay',
    'o': 'forcePlay',
    'a': 'addToList',
    's': 'togglePlaying',
    'n': 'playNext',
    'i': 'addAllToList',
    'l': 'showPlaylistMenu',
    // debug
    'z': 'debugPlaylist',
    'x': 'isInPlaylist',
};

var playlistMenuKeys = {
    'l': 'showSonglistMenu',
    'q': 'showMainMenu',
};

var NeteasePlayer = function() {
    this.isShowLrc = false;
    this.mainMenuKeys = mainMenuKeys;
    this.songlistMenuKeys = songlistMenuKeys;
    this.playlistMenuKeys = playlistMenuKeys;
    this.prevState = 'showMainMenu';
    this.state = '';
    this.songs = {};
    this.player = new Player([], {
        cache: true
    });
}

NeteasePlayer.prototype.debugPlaylist = function() {
    console.log('player.list');
    console.log(this.player.list);
    console.log('player.playing');
    console.log(this.player.playing);
    console.log('player.stopAt');
    console.log(this.player.stopAt);
    console.log('player.status');
    console.log(this.player.status);
    console.log('isPlaying?');
    console.log(utils.isPlaying(this.player));
    console.log('isStopped?');
    console.log(utils.isStopped(this.player));
}

NeteasePlayer.prototype.init = function(callback) {
    return this.showMainMenu();
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
            self.menu.start();
            return self.showMainMenu();
        };
        utils.log(c.green('Searching for “' + res.keywords + '”'));
        sdk.searchSongs(res.keywords, 15, function(data) {
            self.songs = data;
            self.state = 'searchSongs';
            return self.showSonglistMenu();
        });
    });
}

/**
 * Process main menu events
 */
NeteasePlayer.prototype.mainMenuDispatch = function(item) {
    var self = this;
    if (item === 'searchSongs') {
        return self.searchSongs();
    } else if (item === 'searchArtists') {
        //@TODO
    };
}

/**
 * Add song to playlist
 * self.player.playlist = [{songId:Int, src:String, _id:Int}, ...]
 * @param {int} songId
 * @param {string} url
 */
NeteasePlayer.prototype.addPlaylist = function(songId, text, url) {
    var self = this;
    return self.player.add({
        songId: songId,
        text: text,
        src: url,
    });
}

/**
 * Update song list item
 * @param  {int} songId
 * @param  {string} state  Appdending text
 */
NeteasePlayer.prototype.updateSongList = function(songId, state) {
    var self = this;
    if (self.state === 'mainMenu') return;
    var menuItem = self.songs[songId];
    var item = self.menu.get(songId);
    if (!item) return;
    item.label = menuItem + c.yellow(' ' + state);
    self.menu.draw();
}


NeteasePlayer.prototype.showPlaylistMenu = function() {
    var self = this;
    self.state = 'playlistMenu';
    self.menu.removeAll();
    self.menu.setTopText(utils.playlistHelp());
    // empty playlist?
    if (self.player.list.length === 0) {
        self.menu.add(0, c.grey('Empty'));
        self.menu.draw();
        return;
    };
    // refill bullets
    self.player.list.forEach(function(item) {
        self.menu.add(item.songId, item.text);
    });
    self.updatePlayingState();
    self.menu.draw();
}

/**
 * Display song list and handle events
 */
NeteasePlayer.prototype.showSonglistMenu = function() {
    var self = this;
    self.menu.removeAll();
    self.menu.setTopText(utils.playHelp());
    // empty?
    if (utils.objEmpty(self.songs)) {
        self.menu.add(0, c.grey('Empty'));
        self.menu.draw();
        self.state = 'songlistMenu';
        return;
    };
    for (var songId in self.songs) {
        self.menu.add(songId, self.songs[songId]);
    };
    // deal with re-enter problem
    if (self.state === 'searchSongs') {
        self.menu.start();
    };
    self.state = 'songlistMenu';
    self.updatePlayingState();
    self.menu.draw();
}

NeteasePlayer.prototype.updatePlayingState = function() {
    var self = this;
    if (self.state === 'mainMenu') return;
    // redraw the list, have to deal with flags
    // well, bad algorithm, but node.js is fast ...
    for (var songId in self.songs) {
        // if the current playing songId
        if (self.player.status === 'playing' && songId === self.player.playing['songId']) {
            self.updateSongList(songId, 'Playing');
        } else {
            self.updateSongList(songId, '');
        };
    }
}

/**
 * Add song to the playing list
 * @param {int} songId
 */
NeteasePlayer.prototype.addToList = function(songId) {
    var self = this;;
    if (songId === 'searchSongs') return;
    if (self.isInPlaylist(songId)) return;
    utils.log('Adding ' + self.songs[songId] + ' ...');
    sdk.songDetail(songId, function(data) {
        if (data.length === 0) {
            utils.log('Error: adding unknown song url');
            return;
        };
        var songUrl = data[0]['mp3Url'];
        self.addPlaylist(songId, self.songs[songId], songUrl);
        utils.log('Added ' + self.songs[songId] + '.');
        if (self.player.status !== 'playing') {
            self.play();
        };
    });
}

/**
 * Add all songs shown in screen to the playlist
 */
NeteasePlayer.prototype.addAllToList = function() {
    var self = this;
    utils.log(c.cyan('Adding songs to playlist ...'));
    for (var songId in self.songs) {
        if (!self.isInPlaylist(songId)) {
            self.addToList(songId);
        };
    };
}


NeteasePlayer.prototype.isInPlaylist = function(songId) {
    var playlistSongIds = this.player.list.map(function(item) {
        return item.songId;
    });
    return (playlistSongIds.indexOf(songId) >= 0);
}

/**
 * Force to play the selected song, clean the queue
 * @param  {int} songId
 */
NeteasePlayer.prototype.forcePlay = function(songId) {
    var self = this;
    utils.log('Connecting server ... ');
    self.stopPlaying();
    self.player.list = [];
    return self.addToList(songId);
}

/**
 * The core function for playing songs
 */
NeteasePlayer.prototype.play = function() {
    var self = this;
    if (typeof(self.player) === 'undefined') return;
    if (self.player !== null && utils.isPlaying(self.player)) return;

    // if something in the playlist, continue playing from previous one
    if (typeof(self.player.stopAt) !== 'undefined') {
        self.player.play(null, self.player.list.slice(self.player.stopAt._id));
        self.player.stopAt = null;
    } else {
        self.player.play();
    };


    self.player.on('playing', function(playingItem) {
        var playingSongId = playingItem['songId'];
        self.updateSongList(playingSongId, 'Playing');
        self.setBarText('Now playing:', self.songs[playingSongId]);
        self.menu.draw();
    });

    self.player.on('playend', function(item) {
        var playedSongId = self.player.playing['songId'];
        self.updateSongList(playedSongId, '');
        self.setBarText('', '');
        self.menu.draw();
    });

    self.player.on('downloading', function(url) {
        utils.log('Buffering ... ' + url);
    })

    self.player.on('error', function(err) {
        utils.log('Playing error: ' + err);
    });
}

NeteasePlayer.prototype.playNext = function() {
    var self = this;
    // if not playing, do nothing
    if (utils.isStopped(self.player)) return false;
    // why i get 'stopped' when call next() twice??
    // black maggic to tackle this
    var playing = self.player.playing,
        list = self.player.list,
        next = list[playing._id + 1];
    if (!next) {
        // continue playing the current song
        return false;
    }
    // play next one
    self.player.stop();
    self.player.status = 'playing';
    self.player.playing = next;
    self.player.stopAt = null;
    self.player.play(null, list.slice(next._id));

    return self.updatePlayingState();
}

/**
 * Stop playing music
 */
NeteasePlayer.prototype.stopPlaying = function() {
    var self = this;
    if (utils.isStopped(self.player)) return false;
    // set up another object
    self.player.stopAt = self.player.playing;
    self.player.playing = null;
    self.player.stop();
    self.player.status = 'stopped';
    self.updatePlayingState();
    self.setBarText('', '');
    return self.menu.draw();
}

/**
 * Toggle play state
 */
NeteasePlayer.prototype.togglePlaying = function() {
    if (utils.isPlaying(this.player)) {
        return this.stopPlaying();
    } else if(utils.isStopped(this.player)) {
        return this.play();
    };
    // shouldn't reach here, right?
    return false;
}

/**
 * Set bar text for all menus
 * @param  {string} state Plain text
 * @param  {string} text Rendered text
 */
NeteasePlayer.prototype.setBarText = function(state, text) {
    var self = this;
    if (!self.menu) {
        return;
    };
    var renderedText = '';
    if (state !== '') {
        renderedText = c.cyan('» ' + state + ' ');
    };
    self.menu.setBarText(renderedText + text);
}

/**
 * Create main menu
 */
NeteasePlayer.prototype.showMainMenu = function() {
    var self = this;
    if (!self.menu) {
        self.menu = new termList();
    };
    self.menu.removeAll();
    self.menu.setTopText(utils.logo());
    // self.menu.add('discover', '发现音乐');
    self.menu.add('searchSongs', '搜索歌曲 ' + c.grey('[s]'));
    // self.menu.add('searchArtists', '搜索歌手 ' + c.grey('[a]'));
    self.menu.add('showPlaylistMenu', '播放列表 ' + c.grey('[l]'));
    self.menu.select('searchSongs');
    self.menu.draw();
    // only one menu policy
    // and only one key event listener
    if (self.state === '') {
        self.menu.start();
        self.menu.on('keypress', function(key, item) {
            if (self.state === 'mainMenu') {
                if (!self.mainMenuKeys[key.name]) return false;
                return self[self.mainMenuKeys[key.name]](item);
            } else if (self.state === 'playlistMenu') {
                if (!self.playlistMenuKeys[key.name]) return false;
                return self[self.playlistMenuKeys[key.name]](item);
            } else if (self.state === 'songlistMenu') {
                if (!self.songlistMenuKeys[key.name]) return false;
                return self[self.songlistMenuKeys[key.name]](item);
            };
            return false;
        });
    };
    self.state = 'mainMenu';

}

exports = module.exports = NeteasePlayer;
