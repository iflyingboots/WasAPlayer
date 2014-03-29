/*
 * @Author: Xin Wang
 * @Date:   2014-03-22 11:59:27
 */

var sdk = require('./sdk'),
    utils = require('./utils'),
    termList = require('./term'),
    Lrc = require('./lrc'),
    prompt = require('prompt'),
    Player = require('player'),
    c = require('colorful'),
    path = require('path'),
    mkdirp = require('mkdirp'),
    fs = require('fs');

var mainMenuKeys = {
    'return': 'mainMenuDispatch',
    'o': 'mainMenuDispatch',
    's': 'searchSongs',
    'a': 'searchAlbums',
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

var albumlistMenuKeys = {
    'q': 'showMainMenu',
    'return': 'getAlbumSongs',
    'o': 'getAlbumSongs',
    'i': 'addAlbumToList',
    'l': 'showPlaylistMenu',
    's': 'togglePlaying',
};

var playlistMenuKeys = {
    'l': 'showPreviousScene',
    'q': 'showMainMenu',
    's': 'togglePlaying',
    'n': 'playNext',
    'o': 'playThis',
};

var NeteasePlayer = function() {
    this.userhome = utils.home();
    this.rc = {};
    this.rc.profile = path.join(this.userhome, '.netease-player.profile');
    this.home = utils.jsonSync(this.rc.profile).home || path.join(this.userhome, 'netease-player');
    this.searchLimit = utils.jsonSync(this.rc.profile).limit || 15;
    this.mainMenuKeys = mainMenuKeys;
    this.songlistMenuKeys = songlistMenuKeys;
    this.playlistMenuKeys = playlistMenuKeys;
    this.albumlistMenuKeys = albumlistMenuKeys;
    this.state = '';
    this.songs = {};
    this.albums = {};
    this.previousScence = '';
    this.lrc = null;
    this.player = new Player([], {
        cache: true,
        downloads: this.home
    });
    this.player.stopAt = null;
}

/**
 * Debug current states
 */
NeteasePlayer.prototype.debugPlaylist = function() {
    console.log('player.playing');
    console.log(this.player.playing);
    console.log('player.stopAt');
    console.log(this.player.stopAt);
    console.log('isPlaying?');
    console.log(this.isPlaying());
    console.log(this.lrc);
}

NeteasePlayer.prototype.init = function(callback) {
    var self = this;
    fs.exists(self.home, function(exist) {
        console.log(self.home);
        if (exist) return self.showMainMenu();
        mkdirp(self.home, function(err) {
            if (err) return console.log('Creating cache directory failed: ' + err);
            return self.showMainMenu();
        });
    });
}

NeteasePlayer.prototype.config = function(limit, home) {
    var self = this;
    var newLimit = parseInt(limit) || self.searchLimit;
    var newHome = home || self.home;

    var data = {
        home: newHome,
        limit: newLimit < 1 ? 1 : newLimit,
    };
    fs.writeFile(self.rc.profile, JSON.stringify(data), function(err) {
        if (err) {
            console.log('Error: ' + err);
        } else {
            console.log('Configuration updated');
            if (limit !== null) {
                console.log('The search limit is ' + self.searchLimit + ' now');
            };
        };
    });
}

/**
 * Is playing?
 * Some problems with player.status, use this method instead
 * @return {Boolean}
 */
NeteasePlayer.prototype.isPlaying = function() {
    if (typeof(this.player) === 'undefined') return false;
    return (this.player.status === 'playing' || (this.player.status === 'stopped' && this.player.playing !== null));
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
        sdk.searchSongs(res.keywords, self.searchLimit, function(data) {
            self.songs = data;
            self.state = 'searchSongs';
            return self.showSonglistMenu();
        });
    });
}

/**
 * Seach albums
 */
NeteasePlayer.prototype.searchAlbums = function() {
    var self = this;
    self.menu.stop();
    prompt.message = 'Please enter the ';
    prompt.delimiter = "*".grey;
    prompt.start();
    prompt.get(['album'], function(err, res) {
        if (err || res.album === '') {
            self.menu.start();
            return self.showMainMenu();
        };
        utils.log(c.green('Searching for “' + res.album + '”'));
        sdk.searchAlbums(res.album, self.searchLimit, function(data) {
            self.albums = data;
            self.state = 'searchAlbums';
            return self.showAlbumlistMenu();
        });
    });
}

/**
 * Process main menu events
 */
NeteasePlayer.prototype.mainMenuDispatch = function(item) {
    var self = this;
    var menus = 'searchSongs searchAlbums showPlaylistMenu setSearchLimit setHomeDir'.split(' ');
    if (menus.indexOf(item) < 0) return;
    return self[menus[menus.indexOf(item)]]();
}

/**
 * Add song to playlist
 * self.player.playlist = [{songId:Int, src:String, _id:Int}, ...]
 * @param {String} songId
 * @param {String} url
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
 * Display playlist
 */
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
 * Get album songs with albumId
 * @param  {String} albumId
 */
NeteasePlayer.prototype.getAlbumSongs = function(albumId) {
    var self = this;
    utils.log('Loading songs ...');
    sdk.albumDetail(albumId, function(data) {
        self.songs = data;
        return self.showSonglistMenu();
    });
}

/**
 * Display song list
 */
NeteasePlayer.prototype.showSonglistMenu = function() {
    var self = this;
    self.previousScence = 'showSonglistMenu';
    self.menu.removeAll();
    self.menu.setTopText(utils.playHelp());
    // empty?
    if (utils.objEmpty(self.songs)) {
        self.menu.add(0, c.grey('Empty'));
        self.state = 'songlistMenu';
        self.menu.draw();
        self.menu.start();
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

NeteasePlayer.prototype.showPreviousScene = function() {
    this[this.previousScence]();
}

/**
 * Display album list
 */
NeteasePlayer.prototype.showAlbumlistMenu = function() {
    var self = this;
    self.previousScence = 'showAlbumlistMenu';
    self.menu.removeAll();
    self.menu.setTopText(utils.albumlistHelp());
    // empty?
    if (utils.objEmpty(self.albums)) {
        self.menu.add(0, c.grey('Empty'));
        self.state = 'albumlistMenu';
        self.menu.draw();
        self.menu.start();
        return;
    };
    for (var albumId in self.albums) {
        self.menu.add(albumId, self.albums[albumId]);
    };
    // deal with re-enter problem
    if (self.state === 'searchAlbums') {
        self.menu.start();
    };
    self.state = 'albumlistMenu';
    self.menu.draw();
}

/**
 * Add song to the playing list
 * @param {String} songId
 */
NeteasePlayer.prototype.addToList = function(songId) {
    var self = this;;
    if (songId === 'searchSongs' || songId === 'searchAlbums') return;
    if (self.isInPlaylist(songId) >= 0) return;
    utils.log('Adding ' + self.songs[songId] + ' ...');
    sdk.songDetail(songId, function(data) {
        if (data.length === 0) {
            utils.log('Error: adding unknown song url');
            return;
        };
        var songUrl = data[0]['mp3Url'];
        self.addPlaylist(songId, self.songs[songId], songUrl);
        utils.log('Added ' + self.songs[songId]);
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

/**
 * Add all songs in the album to the playlist
 */
NeteasePlayer.prototype.addAlbumToList = function(albumId) {
    var self = this;
    if (albumId === 'searchSongs' || albumId === 'searchAlbums') return;
    utils.log(c.cyan('Loading songs ...'));
    sdk.albumDetail(albumId, function(data) {
        self.songs = data;
        self.addAllToList();
    });
}

/**
 * Is the given songId in the playlist
 * @param  {String}  songId
 * @return {Boolean}
 */
NeteasePlayer.prototype.isInPlaylist = function(songId) {
    var playlistSongIds = this.player.list.map(function(item) {
        return item.songId;
    });
    return playlistSongIds.indexOf(songId);
}

/**
 * Force to play the selected song, clean the queue
 * @param  {String} songId
 */
NeteasePlayer.prototype.forcePlay = function(songId) {
    var self = this;
    if (self.player.status === 'downloading') {
        utils.log('Buffering now, try it later');
        return false;
    };
    utils.log('Connecting server ... ');
    self.stopPlaying();
    self.player.list = [];
    if (self.lrc !== null) {
        self.lrc.stop();
        self.lrc = null;
    };
    return self.addToList(songId);
}

/**
 * In playlist scence, play the selected song
 * @param  {String} songId
 */
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
        for (var i = 0; i < self.player.speakers.length - 1; i++) {
            self.player.speakers.shift();
        }
        // self.stopPlaying();
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

        sdk.getLyric(item.songId, function(data) {
            if (data !== null) {
                self.setBarText('Now playing:', item.text);
                self.menu.draw();
                self.lrc = new Lrc.Lrc(data, function(text, extra) {
                    self.menu.setBarText(c.cyan('♪ ') + text);
                    self.menu.draw();
                });
                self.lrc.play();
            };
        });
    });

    self.player.on('playend', function(item) {
        self.player.playing = null;
        self.player.stopAt = item;
        self.menu.update(item.songId, '');
        if (self.lrc !== null) {
            self.lrc.stop();
            self.lrc = null;
        };
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

/**
 * Play next song, if nothing playing, play nothing
 * Some problems in using player.next(), and this functions
 */
NeteasePlayer.prototype.playNext = function() {
    var self = this;
    // if not playing, do nothing
    if (!self.isPlaying()) return false;
    // why i get 'stopped' when call next() twice??
    // black maggic to tackle this
    self.player.status = 'playing';
    self.lrc.stop();
    self.lrc = null;
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
    if (self.lrc !== null) {
        self.lrc.stop;
        self.lrc = null;
    };
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

NeteasePlayer.prototype.setSearchLimit = function() {
    var self = this;
    self.menu.stop();
    var schema = {
        properties: {
            limit: {
                pattern: /^[0-9]+$/,
                message: '“Limit” must be positive integer',
                required: false
            }
        }
    };
    prompt.message = 'Please enter the ';
    prompt.delimiter = "*".grey;
    prompt.start();
    prompt.get(schema, function(err, res) {
        if (err || res.limit === '') {
            self.menu.start();
            return self.showMainMenu();
        };
        self.config(res.limit, null);
        self.menu.start();
        return self.showMainMenu();
    });
}

NeteasePlayer.prototype.setHomeDir = function() {
    utils.log('Please go to the directory');
    utils.log('Enter this command: ' + c.cyan('netease-player home'));
}

/**
 * Set bar text for all menus
 * @param  {String} state Plain text
 * @param  {String} text Rendered text
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
    self.previousScence = 'showMainMenu';
    self.menu.removeAll();
    self.menu.setTopText(utils.logo());
    // self.menu.add('discover', '发现音乐');
    self.menu.add('searchSongs', '搜索歌曲 ' + c.grey('[s]'));
    self.menu.add('searchAlbums', '搜索专辑 ' + c.grey('[a]'));
    self.menu.add('showPlaylistMenu', '播放列表 ' + c.grey('[l]'));
    self.menu.add(0, '');
    self.menu.add('setSearchLimit', c.green('[设置]') + c.grey(' 搜索数量'));
    self.menu.add('setHomeDir', c.green('[设置]') + c.grey(' 缓存文件夹'));
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
            } else if (self.state === 'albumlistMenu') {
                if (!self.albumlistMenuKeys[key.name]) return false;
                return self[self.albumlistMenuKeys[key.name]](item);
            };
            return false;
        });
    };
    self.state = 'mainMenu';

}

exports = module.exports = NeteasePlayer;
