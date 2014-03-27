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
};

var playlistMenuKeys = {
    'l': 'showSonglistMenu',
    'q': 'showMainMenu',
    's': 'togglePlaying',
    'n': 'playNext',
    'o': 'playThis',
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
    this.player.stopAt = null;
}

NeteasePlayer.prototype.debugPlaylist = function() {
    console.log('player.list');
    console.log(this.player.list);
    console.log('player.playing');
    console.log(this.player.playing);
    console.log('player.stopAt');
    console.log(this.player.stopAt);
    console.log('isPlaying?');
    console.log(this.isPlaying());
}

NeteasePlayer.prototype.init = function(callback) {
    return this.showMainMenu();
}

NeteasePlayer.prototype.isPlaying = function() {
    if (typeof(this.player) === 'undefined') return false;
    return (this.player.status === 'playing'
    || (this.player.status === 'stopped' && this.player.playing !== null));
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
        if (self.isPlaying() && self.player.playing.songId === item.songId) {
            self.menu.update(item.songId, c.yellow('Playing'));
        };
    });
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
        if (self.isPlaying() && self.player.playing.songId === songId) {
            self.menu.update(songId, c.yellow('Playing'));
        };
    };
    // deal with re-enter problem
    if (self.state === 'searchSongs') {
        self.menu.start();
    };
    self.state = 'songlistMenu';
    self.menu.draw();
}

/**
 * Add song to the playing list
 * @param {int} songId
 */
NeteasePlayer.prototype.addToList = function(songId) {
    var self = this;;
    if (songId === 'searchSongs' || songId === 'searchArtists') return;
    if (self.isInPlaylist(songId) >= 0) return;
    utils.log('Adding ' + self.songs[songId] + ' ...');
    sdk.songDetail(songId, function(data) {
        if (data.length === 0) {
            utils.log('Error: adding unknown song url');
            return;
        };
        var songUrl = data[0]['mp3Url'];
        self.addPlaylist(songId, self.songs[songId], songUrl);
        utils.log('Added ' + self.songs[songId] + '.');
        // only play if there is only one entry in the queue
        if (self.player.list.length === 1) {
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
        if (self.isInPlaylist(songId) < 0) {
            self.addToList(songId);
        };
    };
}


NeteasePlayer.prototype.isInPlaylist = function(songId) {
    var playlistSongIds = this.player.list.map(function(item) {
        return item.songId;
    });
    return playlistSongIds.indexOf(songId);
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

NeteasePlayer.prototype.playThis = function(songId) {
    var self = this;
    var songPos = self.isInPlaylist(songId);
    if (songPos < 0) return;
    self.stopPlaying();
    var _id = self.player.list[songPos]._id;
    self.player.play(null, self.player.list.slice(_id));
}

/**
 * The core function for playing songs
 */
NeteasePlayer.prototype.play = function() {
    var self = this;
    if (typeof(self.player) === 'undefined') return;
    if (self.isPlaying()) return;
    // ensure only one entry can be played
    if (self.player.speakers.length > 1) {
        return self.stopPlaying();
    }

    // if something in the playlist, continue playing from previous one
    if (self.player.stopAt !== null) {
        self.player.play(null, self.player.list.slice(self.player.stopAt._id));
    } else {
        self.player.play();
    };
    self.player.stopAt = null;


    self.player.on('playing', function(item) {
        self.menu.update(item.songId, c.yellow('Playing'));
        self.player.stopAt = null;
        self.setBarText('Now playing:', item.text);
        self.menu.draw();
    });

    self.player.on('playend', function(item) {
        self.player.playing = null;
        self.player.stopAt = item;
        self.menu.update(item.songId, '');
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
    if (!self.isPlaying()) return false;
    // why i get 'stopped' when call next() twice??
    // black maggic to tackle this
    self.player.status = 'playing';
    var playingId = self.player.playing.songId;
    if (self.player.next()) {
        self.menu.update(playingId, '');
    }
}

/**
 * Stop playing music
 */
NeteasePlayer.prototype.stopPlaying = function() {
    var self = this;
    if (!self.isPlaying()) return false;
    // set up another object
    self.player.stopAt = self.player.playing;
    self.player.playing = null;
    // ensure there is only one entry can be played
    for (var i = 0; i < self.player.speakers.length; i++) {
        self.player.stop();
        self.player.speakers.shift();
    }
    self.player.status = 'stopped';
    self.menu.update(self.player.stopAt.songId, '');
    self.setBarText('', '');
    return self.menu.draw();
}

/**
 * Toggle play state
 */
NeteasePlayer.prototype.togglePlaying = function() {
    if (this.isPlaying()) {
        return this.stopPlaying();
    };
    return this.play();
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
