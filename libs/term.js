/**
 * Derived from https://github.com/visionmedia/node-term-list
 * License: MIT
 * term-list author: visionmedia
 */

/**
 * Module dependencies.
 */

var Emitter = require('events').EventEmitter;
var Canvas = require('term-canvas');
var canvas = new Canvas(100, 200);
var ctx = canvas.getContext('2d');

/**
 * Stdin.
 */

var stdin = process.stdin;
require('keypress')(stdin);

/**
 * Expose `List`.
 */

module.exports = List;

/**
 * Initialize a new `List` with `opts`:
 *
 * - `marker` optional marker string defaulting to '› '
 * - `markerLength` optional marker length, otherwise marker.length is used
 *
 * @param {Object} opts
 * @api public
 */

function List(opts) {
  opts = opts || {};
  this.items = [];
  this.map = {};
  this.yOffset = 0;
  this.marker = opts.marker || '› ';
  this.markerLength = opts.markerLength || this.marker.length;
  this.onkeypress = this.onkeypress.bind(this);
  this.barText = '';
  this.topText= '';
}

/**
 * Inherit from `Emitter.prototype`.
 */

List.prototype.__proto__ = Emitter.prototype;

/**
 * Handle keypress.
 */

List.prototype.onkeypress = function(ch, key){
  if (!key) return;

  this.emit('keypress', key, this.selected);
  switch (key.name) {
    case 'k':
    case 'up':
      this.up();
      break;
    case 'j':
    case 'down':
      this.down();
      break;
    case 'c':
      key.ctrl && this.stop();
      break;
  }
};

/**
 * Add item `id` with `label`.
 *
 * @param {String} id
 * @param {String} label
 * @api public
 */

List.prototype.add = function(id, label) {
  if (!this.selected) this.select(id);
  this.items.push({ id: id, label: label, original: label});
};

/**
 * Update label
 * @param  {String} id
 * @param  {String} state
 * @api public
 */

List.prototype.update = function(id, state) {
  var item = this.get(id);
  if (item === undefined) return false;
  item.label = item.original + ' ' + state;
  this.draw();
};

/**
 * Remove item `id`.
 *
 * @param {String} id
 * @api public
 */

List.prototype.remove = function(id){
  this.emit('remove', id);
  var i = this.items.map(prop('id')).indexOf(id);
  this.items.splice(i, 1);
  if (!this.items.length) this.emit('empty');
  var item = this.at(i) || this.at(i - 1);
  if (item) this.select(item.id);
  else this.draw();
};

/**
 * Remove all items
 *
 * @api public
 */

List.prototype.removeAll = function() {
  this.items = [];
  this.draw();
}

/**
 * Return item at `i`.
 *
 * @param {Number} i
 * @return {Object}
 * @api public
 */

List.prototype.at = function(i){
  return this.items[i];
};

/**
 * Get item by `id`.
 *
 * @param {String} id
 * @return {Object}
 * @api public
 */

List.prototype.get = function(id){
  var i = this.items.map(prop('id')).indexOf(id);
  return this.at(i);
};

/**
 * Select item `id`.
 *
 * @param {String} id
 * @api public
 */

List.prototype.select = function(id){
  this.emit('select', id);
  this.selected = id;
  this.draw();
};

/**
 * Re-draw the list.
 *
 * @api public
 */

List.prototype.draw = function(){
  var self = this;
  var y = 0;
  ctx.clear();
  ctx.save();
  ctx.translate(3, 5);
  this.items.forEach(function(item){
    if (self.selected == item.id) {
      ctx.fillText(self.marker + item.label, 0, y++);
    } else {
      var pad = Array(self.markerLength + 1).join(' ');
      ctx.fillText(pad + item.label, 0, y++);
    }
  });
  self.yOffset = y;
  ctx.restore();
  self.drawTopBar();
  self.drawStatusBar();
};

/**
 * Draw bottom status bar
 *
 * @api public
 */

List.prototype.drawStatusBar = function() {
  var self = this;
  ctx.save();
  // 6: magic number
  ctx.translate(5, self.yOffset + 6);
  ctx.fillText(self.barText, 0, 0);
  ctx.write('\n\n')
  ctx.restore();
}

/**
 * Draw top bar
 *
 * @api public
 */

List.prototype.drawTopBar = function() {
  var self = this;
  ctx.save();
  ctx.translate(5, 2);
  ctx.fillText(self.topText, 0, 0);
  ctx.translate(0, 20);
  ctx.write('\n');
  ctx.restore();
}

/**
 * Set status bar text
 *
 * @api public
 */

List.prototype.setBarText = function(text) {
  this.barText = text;
}

/**
 * Set top bar text
 *
 * @api public
 */

List.prototype.setTopText = function(text) {
  this.topText = text;
}

/**
 * Select the previous item if any.
 *
 * @api public
 */

List.prototype.up = function(){
  var ids = this.items.map(prop('id'));
  var i = ids.indexOf(this.selected) - 1;
  var item = this.items[i];
  if (!item) return;
  this.select(item.id);
};

/**
 * Select the next item if any.
 *
 * @api public
 */

List.prototype.down = function(){
  var ids = this.items.map(prop('id'));
  var i = ids.indexOf(this.selected) + 1;
  var item = this.items[i];
  if (!item) return;
  this.select(item.id);
};

/**
 * Reset state and stop the list.
 *
 * @api public
 */

List.prototype.stop = function(){
  this.items = [];
  ctx.reset();
  process.stdin.pause();
  stdin.removeListener('keypress', this.onkeypress);
};

/**
 * Start the list.
 *
 * @api public
 */

List.prototype.start = function(){
  stdin.on('keypress', this.onkeypress);
  this.draw();
  ctx.hideCursor();
  stdin.setRawMode(true);
  stdin.resume();
};

/**
 * Prop helper.
 */

function prop(name) {
  return function(obj){
    return obj[name];
  }
}
