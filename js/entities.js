function AABB(x, y, w, h) {
  this.x = x;
  this.y = y;
  this.w = w;
  this.h = h;
}

function Obstacle(collider) {
  this.collider = collider || {};
}

function Artifact(id, data, sprite, collider) {

  this.id = id;
  this.name = data.name;
  this.year = data.year;
  this.emotions = data.emotions;
  this.message = data.message;
  this.source = data.source;
  this.attachments = data.attachments || [];

  // real world coordinates
  this.mapX = 0;
  this.mapY = 0;

  this.collider = collider || {};

  this.sprite = sprite.clone({
    x: 0,
    y: 0
  });
}

function Bullet(collider, velocity, sprite, power) {
  this.collider = collider || {};
  this.velocity = velocity || {};
  this.sprite = sprite || {};
  this.shotAt = Date.now(); // shot timestamp
  this.ttl = 10; // time to live in seconds
  this.power = power;
}

function Item(data, sprite) {

  this.name = data.name;
  this.id = data.id;
  this.type = data.type;
  this.bonus = data.bonus;
  this.price = data.price;
  this.description = data.description;

  this.sprite = sprite.clone({
    x: 0,
    y: 0,
    origin: {x: "top", y: "left"}
  });

}
