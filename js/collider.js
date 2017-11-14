var Collider = function(obj, type) {
  this.obj = obj || {};
  this.type = type || "";
  this.x = 0;
  this.y = 0;
};

Collider.prototype.getCollider = function () {
  return this.obj;
};

Collider.prototype.getX = function () {
  return this.x;
};

Collider.prototype.getY = function () {
  return this.y;
};

// Circle
// ======

function Circle(obj, type) {
  Collider.call(this, obj, type);
}

Circle.prototype = Object.create(Collider.prototype);
Circle.prototype.constructor = Circle;

Circle.prototype.setPosition = function (x, y) {
  this.obj.pos.x = x;
  this.obj.pos.y = y;
  this.x = x;
  this.y = y;
};

Circle.prototype.move = function (shiftX, shiftY) {
  this.obj.pos.x += shiftX;
  this.obj.pos.y += shiftY;
  this.x += shiftX;
  this.y += shiftY;
};

Circle.prototype.getAABB = function () {
  return new AABB(this.x - this.obj.r,
                  this.y - this.obj.r,
                  this.obj.r * 2,
                  this.obj.r * 2);
};

Circle.prototype.rotate = function () {
  console.log("nonsense rotation");
};

// Polygon
// =======

function Polygon(obj, type) {
  Collider.call(this, obj, type);

  this.rotationCenter = new SAT.Vector();

  var bounds = this.getAABB();
  this.obj.translate(-bounds.w / 2, -bounds.h / 2);
}

Polygon.prototype = Object.create(Collider.prototype);
Polygon.prototype.constructor = Polygon;

Polygon.prototype.getAABB = function () {
  var minX = Number.MAX_VALUE,
      maxX = -Number.MAX_VALUE,
      minY = Number.MAX_VALUE,
      maxY = -Number.MAX_VALUE,
      x, y, width, height, bx, by,
      points = this.obj.calcPoints;

  for (var i = 0; i < points.length; i++) {
      x = points[i].x;
      y = points[i].y;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
  }

  width = maxX - minX;
  height = maxY - minY;

  return new AABB(minX, minY, width, height);
};

Polygon.prototype.getMidpoint = function () {
  var midpoint = new SAT.Vector(),
      points = this.obj.calcPoints;

  for (var i = 0; i < points.length; i++) {
    midpoint.x += points[i].x;
    midpoint.y += points[i].y;
  }

  midpoint.x /= points.length;
  midpoint.y /= points.length;

  return midpoint;
};

/**
 * [rotateDeg description]
 * @param  {[type]} angle  degrees
 * @param  {[type]} offset left upper offset point
 */
Polygon.prototype.rotateDeg = function (deg) {
  this.rotate(deg * (Math.PI / 180));
};

Polygon.prototype.rotate = function (rad) {
  this.obj.translate(-this.x - this.rotationCenter.x, -this.y - this.rotationCenter.y);
  this.obj.rotate(rad);
  this.obj.translate(this.x + this.rotationCenter.x, this.y + this.rotationCenter.y);
};

Polygon.prototype.move = function (shiftX, shiftY) {
  this.obj.translate(shiftX, shiftY);
  this.x += shiftX;
  this.y += shiftY;
};

Polygon.prototype.setPosition = function (x, y) {
  this.obj.translate(x - this.x, y - this.y);
  this.x = x;
  this.y = y;
};

function createPolygon(x, y, points, type, setRotationCenter, tileSize) {
  var vertices = [],
      position = new SAT.Vector(),
      obj, polygon;

  for (var i = 0; i < points.length; i++) {
    vertices.push(new SAT.Vector((dpi * points[i][0]), (dpi * points[i][1])));
    position.x += points[i][0];
    position.y += points[i][1];
  }

  position.x /= points.length;
  position.y /= points.length;

  obj = new SAT.Polygon(new SAT.Vector(), vertices);
  polygon = new Polygon(obj, type);
  var b = polygon.getAABB();
  polygon.move(x + b.w / 2, y + b.h / 2);

  if (setRotationCenter) {
    var ts = (dpi * tileSize),
        tsx = ts / 2,
        cx = b.w / 2,
        cy = b.h / 2;
    polygon.rotationCenter = new SAT.Vector(tsx - cx, tsx - cy);
  }

  return polygon;
}

function createRectangle(w, h, x, y, type, setRotationCenter, tileSize) {
  var p = new Polygon((new SAT.Box(new SAT.Vector(), w, h).toPolygon()), type);
  p.setPosition(x, y);

  var b = p.getAABB();

  if (setRotationCenter) {
    var ts = (dpi * tileSize),
        tsx = ts / 2,
        cx = b.w / 2,
        cy = b.h / 2;
    p.rotationCenter = new SAT.Vector(tsx - cx, tsx - cy);
  }

  return p;
}

function createCircle(x, y, r, type) {
  var c = new Circle(new SAT.Circle(new SAT.Vector(x, y), r), type);
  c.x = x;
  c.y = y;
  return c;
}

function createRay(sx, sy, ex, ey, type) {
  // console.log([sx, sy, ex, ey]);
  // [176, 336, 464, 272]
  // return createPolygon(sx, sy, [[ex - 10, ey], [sx - 10, sy], [sx + 10, sy], [ex + 10, ey]], type);
  var obj = new SAT.Polygon(new SAT.Vector(), [
    new SAT.Vector(sx - 10, sy),
    new SAT.Vector(sx + 10, sy),
    new SAT.Vector(ex + 10, ey),
    new SAT.Vector(ex - 10, ey)
    ]);
  var p = new Polygon(obj, type);
  var b = p.getAABB();
  // p.move(sx - 10 + b.w / 2, sy + b.h / 2);
  // var p = new Polygon(new SAT.Polygon(new SAT.Vector((ex - sx) / 2, (ey - sy) / 2), [
  //   new SAT.Vector(sx - 10, sy),
  //   new SAT.Vector(sx + 10, sy),
  //   new SAT.Vector(ex + 10, ey),
  //   new SAT.Vector(ex - 10, ey)]), type);
  //   var b = p.getAABB();
    p.obj.translate(b.w / 2, b.h / 2);
  //   p.move(sx + b.w / 2, sy + b.h / 2);

    return p;
}

function intersect(shape1, shape2, _response) {

  response = _response || new SAT.Response();

  if (shape1 instanceof Circle && shape2 instanceof Circle) {
    return SAT.testCircleCircle(shape1.obj, shape2.obj, response);
  }

  if (shape1 instanceof Polygon && shape2 instanceof Polygon) {
    return SAT.testPolygonPolygon(shape1.obj, shape2.obj, response);
  }

  if (shape1 instanceof Circle) {
    return SAT.testPolygonCircle(shape2.obj, shape1.obj, response);
  }

  if (shape2 instanceof Circle) {
    return SAT.testPolygonCircle(shape1.obj, shape2.obj, response);
  }

  return null;

}

function testCollisions() {
  var drawPolygon = function (polygon) {
    var v = polygon.calcPoints;
    canvas.canvas.beginPath();
    canvas.canvas.strokeStyle = "red";
    canvas.canvas.lineWidth = (dpi * 1);
    canvas.canvas.moveTo(dpi(v[0].x), dpi(v[0].y));
    for (var i = 0; i < v.length; i++) {
      canvas.canvas.lineTo(dpi(v[i].x), dpi(v[i].y));
    }
    canvas.canvas.lineTo(dpi(v[0].x), dpi(v[0].y));
    canvas.canvas.stroke();
  };

  var drawCircle = function (circle) {
    canvas.canvas.beginPath();
    canvas.canvas.strokeStyle = "red";
    canvas.canvas.lineWidth = (dpi * 2);
    canvas.canvas.arc((dpi * circle.pos.x), (dpi * circle.pos.y), (dpi * circle.r), 0, 2 * Math.PI);
    canvas.canvas.stroke();
  };

  //

  var rotatePolygon = function (p, angle) {
    p.translate(-100, -50);
    var radians = angle * (Math.PI / 180);
    p.rotate(radians);
    p.translate(100, 50);
  };

  c = createCircle(30, 30, 8, "");
  // drawCircle(c.obj);

  r = createRectangle(32, 32, 0 + 16, 0 + 16);
  // drawPolygon(r.obj);

  var t1 = [[8, 24], [8, 8], [24, 16]]; // WORKS !
  var t2 = [[20, 22], [20, 10], [28, 16]]; // WORKS !
  var t3 = [[7, 23], [7, 9], [20, 16]]; // WORKS !

  p = createPolygon(0, 0, t2); //createRectangle(6, 12, 26 + 6 / 2, 10 + 12 / 2); //
  // var b = p.getAABB();
  // p.move(b.w / 2, b.h / 2);
  // setInterval(function () {
  //   p.rotateDeg(10);
  //
  // }, 300);
  // drawPolygon(p.obj);

  var ray = createRay(176, 336, 464, 272, "");
  drawPolygon(ray.obj);


  // p.setPosition(0 + b.w / 2, 0 + b.h / 2);

  // console.log(intersect(p, c));

}
