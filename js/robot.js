var Robot = function(data, sprite) {

  this.name = data.name;
  this.hp = data.hp;
  this.attack = data.attack;
  this.defense = data.defense;
  this.bullet_speed = data.bullet_speed;
  this.speed = data.speed;
  this.attack_speed = data.attack_speed;
  this.description = data.description;

  this.collision = data.sprite.collision;
  this.collider = {
    wall: {},
    attack: {}
  };
  this.rotation = 0;
  this.velocity = {
    x: 0,
    y: 0
  };
  this.direction = {
    x: 0,
    y: 0
  };
  this.canMove = {
    up: true,
    down: true,
    left: true,
    right: true
  };

  this.lastShot = 0; // fire delay
  this.bouncing = false;

  // real world coordinates
  this.mapX = 0;
  this.mapY = 0;

  this.norotation = data.sprite.norotation || false;

  this.sprite = sprite.clone({
    x: 0,
    y: 0
  });
};

Robot.prototype.getSprite = function () {
  return this.sprite;
};

Robot.prototype.getSpriteX = function () {
  return this.sprite.x;
};

Robot.prototype.getSpriteY = function () {
  return this.sprite.y;
};

Robot.prototype.setSpriteX = function (x) {
  this.sprite.x = x;
};

Robot.prototype.setSpriteY = function (y) {
  this.sprite.y = y;
};

Robot.prototype.setSpriteXY = function (x, y) {
  this.sprite.x = x;
  this.sprite.y = y;
};

Robot.prototype.moveSpriteXY = function (shiftX, shiftY) {
  this.sprite.move(shiftX, shiftY);
};

Robot.prototype.moveMapX = function (shiftX) {
  this.mapX += shiftX;
};

Robot.prototype.moveMapY = function (shiftY) {
  this.mapY += shiftY;
};

Robot.prototype.getMapX = function () {
  return this.mapX;
};

Robot.prototype.getMapY = function () {
  return this.mapY;
};

Robot.prototype.setMapXY = function (x, y) {
  this.mapX = x;
  this.mapY = y;
};

// Enemy
// =====

function Enemy(data, sprite) {
  Robot.call(this, data, sprite);

  this.sp = data.sp;
  this.cannotShoot = false;
  this.lastMovementDecision = 0; // timestamp
  this.path = [];

}

Enemy.prototype = Object.create(Robot.prototype);
Enemy.prototype.constructor = Enemy;

// Player
// ======

function Player(data, sprite) {
  Robot.call(this, data, sprite);

  this.collider.pickup = {};
}

Player.prototype = Object.create(Robot.prototype);
Player.prototype.constructor = Player;
