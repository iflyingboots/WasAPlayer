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
    't': 'searchArtists',
    'l': 'showPlaylistMenu',
    'q': 'quit',
    'r': 'setBitrate',
};

var songlistMenuKeys = {
    'q': 'showUpperScence',
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
    'q': 'showUpperScence',
    'return': 'getAlbumSongs',
    'o': 'getAlbumSongs',
    'i': 'addAlbumToList',
    'l': 'showPlaylistMenu',
    's': 'togglePlaying',
};

var artistlistMenuKeys = {
    'o': 'getArtistAlbums',
    'q': 'showMainMenu',
    'l': 'showPlaylistMenu',
};

var playlistMenuKeys = {
    'l': 'showPreviousScene',
    'q': 'showMainMenu',
    's': 'togglePlaying',
    'n': 'playNext',
    'o': 'playThis',
    'j': 'savePlayList',
    'k': 'loadPlayList'
};

var NeteasePlayer = function() {
    this.userhome = utils.home();
    this.rc = {};
    this.rc.profile = path.join(this.userhome, '.netease-player.profile');
    this.home = utils.jsonSync(this.rc.profile).home || path.join(this.userhome, 'netease-player-cache');
    this.searchLimit = utils.jsonSync(this.rc.profile).limit || 15;
    this.highRate = utils.jsonSync(this.rc.profile).highRate || false;
    this.mainMenuKeys = mainMenuKeys;
    this.songlistMenuKeys = songlistMenuKeys;
    this.playlistMenuKeys = playlistMenuKeys;
    this.albumlistMenuKeys = albumlistMenuKeys;
    this.artistlistMenuKeys = artistlistMenuKeys;
    this.state = '';
    this.songs = {};
    this.albums = {};
    this.artists = {};
    this.previousScence = '';
    this.upperScence = '';
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
    console.log('player.status');
    console.log(this.player.status);
    console.log('player.list');
    console.log(this.player.list);
    console.log('player.stopAt');
    console.log(this.player.stopAt);
    console.log('isPlaying?');
    console.log(this.isPlaying());
}

/**
 * Initialize program, incl. check cache dir
 */
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

/**
 * Config profile
 * @param  {String} limit Search limit
 * @param  {String} home  Cache directory
 */
NeteasePlayer.prototype.config = function(limit, home, highRate) {
    var self = this;
    var newLimit = parseInt(limit) || self.searchLimit;
    var newHome = home || self.home;
    var newRate = highRate || self.highRate;

    var data = {
        home: newHome,
        limit: newLimit < 1 ? 1 : newLimit,
        highRate: newRate,
    };
    fs.writeFile(self.rc.profile, JSON.stringify(data), function(err) {
        if (err) {
            console.log('Error: ' + err);
        } else {
            console.log('Configuration updated');
            if (limit !== null) {
                console.log('The search limit is changed to ' + newLimit);
            };
            if (home !== null) {
                console.log('The cache direcotry is changed to ' + home);
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
    return this.player.status === 'playing';
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
    self.stopLyric();
    self.menu.stop();
    prompt.message = 'Please enter the ';
    prompt.delimiter = "*".grey;
    prompt.start();
    prompt.get(['keywords'], function(err, res) {
        if (err || res.keywords === '') {
            self.menu.start();
            self.resumeLyric();
            return self.showMainMenu();
        };
        utils.log(c.green('Searching for “' + res.keywords + '”'));
        sdk.searchSongs(res.keywords, self.searchLimit, function(data) {
            self.songs = data;
            self.state = 'searchSongs';
            self.resumeLyric();
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
 * Search artists
 */
NeteasePlayer.prototype.searchArtists = function() {
    var self = this;
    self.menu.stop();
    prompt.message = 'Please enter the ';
    prompt.delimiter = "*".grey;
    prompt.start();
    prompt.get(['artist'], function(err, res) {
        if (err || res.artist === '') {
            self.menu.start();
            return self.showMainMenu();
        };
        utils.log(c.green('Searching for “' + res.artist + '”'));
        sdk.searchArtists(res.artist, self.searchLimit, function(data) {
            self.artists = data;
            self.state = 'searchArtists';
            return self.showArtistlistMenu();
        });
    });
}

/**
 * Process main menu events
 */
NeteasePlayer.prototype.mainMenuDispatch = function(item) {
    var self = this;
    var menus = 'searchSongs searchAlbums searchArtists showPlaylistMenu setSearchLimit setHomeDir setBitrate'.split(' ');
    if (menus.indexOf(item) < 0) return;
    return self[menus[menus.indexOf(item)]]();
}

/**
 * Add song to playlist
 * self.player.playlist = [{songId:Int, src:String, _id:Int}, ...]
 * @param {String} songId
 * @param {String} url
 * @param {String} bitrate
 */
NeteasePlayer.prototype.addPlaylist = function(songId, text, url, bitrate) {
    var self = this;
    return self.player.add({
        songId: songId,
        text: text,
        src: url,
        bitrate: bitrate,
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
            self.updatePlayingIcon(item.songId);
        };
    });
    self.menu.draw();
}

NeteasePlayer.prototype.updatePlayingIcon = function(songId) {
    var rate = '';
    for (var i = 0; i < this.player.list.length; i++) {
        if (this.player.list[i].songId === songId) {
            rate = this.player.list[i].bitrate;
        };
    };
    this.menu.update(songId, c.magenta('➤ ' + rate));
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

NeteasePlayer.prototype.getArtistAlbums = function(artistId) {
    var self = this;
    utils.log('Loading albums ...');
    sdk.artistDetail(artistId, self.searchLimit, function(data) {
        self.albums = data;
        return self.showAlbumlistMenu();
    });
}

NeteasePlayer.prototype.showUpperScence = function() {
    this.upperScence ? this[this.upperScence]() : this.showMainMenu();
}

NeteasePlayer.prototype.showPreviousScene = function() {
    this[this.previousScence]();
}

NeteasePlayer.prototype.showArtistlistMenu = function() {
    var self = this;
    self.previousScence = 'showArtistlistMenu';
    self.menu.removeAll();
    self.menu.setTopText(utils.artistlistHelp());
    // empty?
    if (utils.objEmpty(self.artists)) {
        self.menu.add(0, c.grey('Empty'));
        self.state = 'artistlistMenu';
        self.menu.draw();
        self.menu.start();
        return;
    };
    for (var aritstId in self.artists) {
        self.menu.add(aritstId, self.artists[aritstId]);
    };
    // deal with re-enter problem
    if (self.state === 'searchArtists') {
        self.menu.start();
    };
    self.state = 'artistlistMenu';
    self.menu.draw();
}

/**
 * Display album list
 */
NeteasePlayer.prototype.showAlbumlistMenu = function() {
    var self = this;
    self.previousScence = 'showAlbumlistMenu';
    self.upperScence = self.state === 'artistlistMenu' || self.artists  ? 'showArtistlistMenu' : '';
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
 * Display song list
 */
NeteasePlayer.prototype.showSonglistMenu = function() {
    var self = this;
    self.previousScence = 'showSonglistMenu';
    self.upperScence = self.state === 'albumlistMenu' ? 'showAlbumlistMenu' : '';
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
            self.updatePlayingIcon(songId);
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
 * @param {String} songId
 */
NeteasePlayer.prototype.addToList = function(songId) {
    var self = this;;
    if (songId === 'searchSongs' || songId === 'searchAlbums') return;
    if (self.isInPlaylist(songId) >= 0) return;
    if (songId === 0) return;
    utils.log('Adding ' + self.songs[songId] + ' ...');
    sdk.songDetail(songId, function(data) {
        if (data.length === 0) {
            utils.log('Error: adding unknown song url');
            return;
        };
        var songData = data[0];
        var songUrl = utils.getTrackURL(songData.mMusic.dfsId) || songData.mp3Url;
        var bitrate = songData.mMusic.bitrate / 1000 + 'Kbps' || '';
        if (self.highRate) {
            try {
                var highDfsId = songData.hMusic.dfsId;
                songUrl = utils.getTrackURL(highDfsId);
                bitrate = songData.hMusic.bitrate / 1000 + 'Kbps';
            } catch(e) {
                utils.log('Error: no high bitrate track available');
            }
        };
        self.addPlaylist(songId, self.songs[songId], songUrl, bitrate);
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
    if (albumId === 0) return;
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
    self.stopLyric();
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
    // if something in the playlist, continue playing from previous one
    if (self.player.stopAt !== null) {
        var current = self.player.history[self.player.history.length - 1];
        self.player.play(null, current._id);
    } else {
        self.player.play();
    };
    self.player.stopAt = null;


    self.player.on('playing', function(item) {
        self.updatePlayingIcon(item.songId);
        self.player.stopAt = null;
        self.player.status = 'playing';
        self.setBarText('Now playing:', item.text);
        self.menu.draw();

        // Amend the latency from playing to getting lyric
        var playStart = Date.now();
        sdk.getLyric(item.songId, function(data) {
            var latency = Date.now() - playStart;;
            if (!data) return;
            self.stopLyric();
            self.lrc = new Lrc.Lrc(data, function(text, extra) {
                self.menu.setBarText(c.cyan('♪ ') + text);
                self.menu.draw();
            });
            self.lrc.play(latency);
        });
    });

    self.player.on('playend', function(item) {
        self.player.playing = null;
        self.player.stopAt = item;
        self.player.status = 'stopped';
        self.menu.update(item.songId, '');
        self.stopLyric();
    });

    self.player.on('downloading', function(url) {
        utils.log('Buffering ... ' + url);
    })

    self.player.on('error', function(err) {
        utils.log('Playing error: ' + err);
    });
}

/**
 * Play next song, if nothing's playing, do nothing
 */
NeteasePlayer.prototype.playNext = function() {
    var self = this;
    var playing = self.player.playing;
    // if not playing, do nothing
    if (!self.isPlaying()) return false;
    // if no track available, do nothing
    if (self.player.list.indexOf(playing) === self.player.list.length - 1) {
        return false;
    }
    var playingId = self.player.playing.songId;
    if (self.player.next()) {
        self.menu.update(playingId, '');
        self.player.status = 'playing';
        self.stopLyric();
    }
}

NeteasePlayer.prototype.savePlayList = function() {
  var fs = require('fs');
  fs.writeFile(this.home + '/play_list.json', JSON.stringify(this.player.list) , function() {
    utils.log('Play list Saved.');
  });
}

NeteasePlayer.prototype.loadPlayList = function() {
  try {
    this.player.list = require(this.home + '/play_list.json');
    this.showPlaylistMenu();
  } catch(e) {
    utils.log('No saved play list.')
  }
}

/**
 * Stop playing music
 */
NeteasePlayer.prototype.stopPlaying = function() {
    var self = this;
    if (!self.isPlaying()) return false;
    // set up another object
    self.player.stop();
    self.player.stopAt = self.player.playing;
    self.player.playing = null;
    self.player.status =
    // ensure there is only one entry can be played
    self.menu.update(self.player.stopAt.songId, '');
    self.stopLyric();
}

/**
 * Stop lrc
 */
NeteasePlayer.prototype.stopLyric = function() {
    if (this.lrc !== null) {
        this.lrc.stop();
    };
    this.setBarText('', '');
    if (this.menu.isStarted) {
        this.menu.draw();
    };
}


/**
 * Continue showing lyric
 */
NeteasePlayer.prototype.resumeLyric = function() {
    if (!this.lrc) return;
    var offset = Date.now() - this.lrc.startTime;
    this.lrc.state && this.lrc.play(offset);
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
        self.searchLimit = res.limit;
        self.config(res.limit, null, null);
        self.menu.start();
        return self.showMainMenu();
    });
}

NeteasePlayer.prototype.setHomeDir = function() {
    utils.log('Please go to the directory');
    utils.log('Enter this command: ' + c.cyan('netease-player home'));
}

NeteasePlayer.prototype.setBitrate = function() {
    this.highRate = !this.highRate;
    var rate = this.highRate ? c.grey('切换到 SD（普通音质） [r]') : c.grey('切换到 HD（高音质） [r]');
    this.config(null, null, this.highRate);
    this.showLogo();
    this.menu.update('setBitrate', rate);
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

NeteasePlayer.prototype.showLogo = function() {
    var showRate = this.highRate ? ' HD' : ' SD';
    this.menu.setTopText(utils.logo() + c.magenta(showRate));
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
    self.showLogo();
    // reset artists when back to main menu
    self.artists = null;
    // self.menu.add('discover', '发现音乐');
    self.menu.add('searchSongs', '歌曲 ' + c.grey('[s]'));
    self.menu.add('searchAlbums', '专辑 ' + c.grey('[a]'));
    self.menu.add('searchArtists', '歌手 ' + c.grey('[t]'));
    self.menu.add('showPlaylistMenu', '播放列表 ' + c.grey('[l]'));
    self.menu.add(0, '');
    self.menu.add('setBitrate', c.green('[音质]'));
    var rate = self.highRate ? c.grey('切换到 SD（普通音质） [r]') : c.grey('切换到 HD（高音质） [r]');
    self.menu.update('setBitrate', rate);
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
            };
            if (self.state === 'playlistMenu') {
                if (!self.playlistMenuKeys[key.name]) return false;
                return self[self.playlistMenuKeys[key.name]](item);
            };
            if (self.state === 'songlistMenu') {
                if (!self.songlistMenuKeys[key.name]) return false;
                return self[self.songlistMenuKeys[key.name]](item);
            };
            if (self.state === 'albumlistMenu') {
                if (!self.albumlistMenuKeys[key.name]) return false;
                return self[self.albumlistMenuKeys[key.name]](item);
            };
            if (self.state === 'artistlistMenu') {
                if (!self.artistlistMenuKeys[key.name]) return false;
                return self[self.artistlistMenuKeys[key.name]](item);
            };
            return false;
        });
    };
    self.state = 'mainMenu';

}

exports = module.exports = NeteasePlayer;
