function Map (map_data, game_data, assets, sprites, canvas, profile, inventory, refreshProgress) {

  var that = this;

  this.MAP_DATA = map_data; // store map data
  this.GAME_DATA = game_data; // store game data
  this.assets = assets; // AssetManager() instance
  this.sprites = sprites; // sprite prototypes
  this.profile = profile;
  this.canvas = canvas;
  this.inventory = inventory;
  this.refreshProgress = refreshProgress;

  this.waitingToCloseInventory = false;

  this.canvasElem = {
    elem: canvas,
    w: canvas.canvasElement.clientWidth,
    h: canvas.canvasElement.clientHeight,
    cx: canvas.canvasElement.clientWidth / 2,
    cy: canvas.canvasElement.clientHeight / 2
  };

  this.player = {}; // Player()
  this.enemies = []; // added to canvas
  this.enemiesQueue = [];
  this.artifacts = [];
  this.artifactsTotal = 0;
  this.floor = {
    layer: {}, // layer data
    tiles: [] // sprites
  };
  this.walls = [];
  this.bullets = [];
  this.enemyBullets = [];

  this.pathFinder = new PF.AStarFinder({
    allowDiagonal: true,
    dontCrossCorners: true,
    heuristic: PF.Heuristic.chebyshev
  });

  this.moving = {
    up: false,
    down: false,
    left: false,
    right: false
  };

  this.gameover = {
    is: false,
    reason: ""
  };

  this.statusBar = {};
  this.menu = {
    container: {},
    caption: {},
    menuButton: {},
    restartButton: {},
    continueButton: {}
  };

  this.oneliner = {
    speaking: false,
    announcement: "",
    lastSpokenAt: Date.now(),
    delay: 5 * 1000,
    duration: 6 * 1000,
    bg: this.canvas.display.rectangle({
      height: (dpi * 12),
      fill: "black",
      stroke: (dpi * 6) + "px black",
      join: "round"
    }),
    triangle: this.canvas.display.polygon({
    	sides: 4,
    	radius: (dpi * 8),
    	rotation: 90,
    	fill: "black"
    }),
    msg: this.canvas.display.text({
      x: (dpi * 5),
      fill: "white",
      font: (dpi * 12) + "px Lato",
      lineHeight: (dpi * 10) + "px"
    })
  };

  this.oneliner.bg.addChild(this.oneliner.triangle);
  this.oneliner.bg.addChild(this.oneliner.msg);

  this.createStatusBar();
  this.createMenu();

  this.loadingNewData = false; // flag for loading new data
  this.refresh = {};
  this.refreshLoop = {};

  this.load();

}

Map.prototype.start = function () {

  var that = this;

  this.refresh = function () {
    that.update();
    that.refreshLoop = setTimeout(that.refresh, 0);
  };
  this.refresh();

  this.canvas.setLoop(function () {
    that.render();
  }).start();

};

Map.prototype.update = function() {

  if ((this.player.velocity.x !== 0 || this.player.velocity.y !== 0) && !this.gameover.is) {
    this.move();
  }

  if (this.profile.refresh) {
    this.refreshStatusBar();
    this.profile.refresh = false;
  }

  this.moveBullets(this.bullets);
  this.moveBullets(this.enemyBullets);
  this.moveEnemies();
  this.populateCollidersPool();
  this.checkCollisions();
  this.speaking();

  var vp = this.viewport;
  vp.oldX = vp.x;
  vp.oldY = vp.y;



};

Map.prototype.render = function () {
  this.canvas.redraw();
};

Map.prototype.load = function () {

  if (this.gameover.reason === "DEAD") {
    this.profile.hp = this.profile.getFullHP();
  }

  this.gameover = {
    is: false,
    reason: ""
  };

  // size of map in number of tiles
  this.numTiles = {
    x: this.MAP_DATA.width,
    y: this.MAP_DATA.height
  };

  // pixel size of tiles
  this.tileSize = {
    w: this.MAP_DATA.tilewidth,
    h: this.MAP_DATA.tileheight
  };

  // size of map in pixels
  this.pixelSize = {
    x: this.numTiles.x * this.tileSize.w,
    y: this.numTiles.y * this.tileSize.h
  };

  this.collidersPool = new Quadtree(0, new AABB(0, 0, (dpi * this.pixelSize.x), (dpi * this.pixelSize.y)));

  this.gridMap = new PF.Grid(this.numTiles.x, this.numTiles.y);

  this.calcNewPaths = false;

  // camera
  this.viewport = {
    x: 0,
    y: 0,
    oldX: 0,
    oldY: 0,
    minX: 0,
    minY: 0,
    maxX: this.pixelSize.x - this.canvasElem.w,
    maxY: this.pixelSize.y - this.canvasElem.h,
    w: this.canvasElem.w,
    h: this.canvasElem.h,
    tiles: {
      old: {
        startX: -1,
        endX: -1,
        startY: -1,
        endY: -1
      },
      new: {
        startX: -1,
        endX: -1,
        startY: -1,
        endY: -1
      }
    },
    padding: { // relative padding for map or player movement determination
      top: (dpi * 200),
      bottom: (dpi *(this.canvasElem.h - 200)),
      left: (dpi * 200),
      right: (dpi * (this.canvasElem.w - 200))
    }
  };

  this.tileSets = [];

  this.gameover = {
    is: false,
    reason: ""
  };

  this.paused = false;

  this.loadTilesets();
  this.loadTileLayer();

};

Map.prototype.restart = function () {

  this.player.sprite.scalingX = 1;
  this.player.sprite.scalingY = 1;

  if (this.gameover.reason === "DEAD") {
    this.profile.hp = this.profile.getFullHP();
  }

  this.gameover = {
    is: false,
    reason: ""
  };

  this.player.setSpriteXY((dpi * this.canvasElem.cx), (dpi * this.canvasElem.cy));
  this.adjustCamera();
  this.calculateVisibleTiles();
  this.removeVisibleTiles();
  this.addInitTiles();
  this.updateTilesPosition();
  this.updateArtifactsPosition();

  this.bullets.map(function (bullet) {
    bullet.sprite.remove(false);
  });

  this.enemyBullets.map(function (bullet) {
    bullet.sprite.remove(false);
  });

  this.enemies.map(function (enemy) {
    enemy.sprite.remove(false);
  });

  this.bullets = [];
  this.enemyBullets = [];
  this.enemiesQueue = this.enemies.concat(this.enemiesQueue);
  this.enemies = [];
  this.addEnemies();

  this.refreshStatusBar();
  this.pauseGame(true);
  this.resetMenu();

};

Map.prototype.pauseGame = function (withMenu, reason) {
  if (this.canvas.timeline.running) {
    this.paused = true;
    this.canvas.timeline.stop();
    clearTimeout(this.refreshLoop);
    if (withMenu) this.showMenu(reason);
  } else {
    if (!this.gameover.is) {
      this.canvas.timeline.start();
      this.refreshLoop = setTimeout(this.refresh, 100);
      var that = this;
      setTimeout(function () {
        that.paused = false;
      }, 100);
      if (withMenu) this.hideMenu();
    }
  }
};

Map.prototype.speaking = function () {

  var update = function (that) {
    var offset = (dpi * 32);
    that.oneliner.bg.x = that.player.sprite.x - that.oneliner.bg.width / 2;
    that.oneliner.bg.y = that.player.sprite.y - offset;
    that.oneliner.triangle.x = that.oneliner.bg.width / 2;
    that.oneliner.triangle.y = (dpi * 12);

    if (that.oneliner.bg.y < 0) {
      that.oneliner.bg.y = that.player.sprite.y + offset - (that.oneliner.bg.height / dpi);
      that.oneliner.triangle.y = 0;
    }

    if (that.oneliner.bg.x + that.oneliner.bg.width > (dpi * that.canvasElem.w)) {
      that.oneliner.bg.y = that.player.sprite.y - that.oneliner.bg.height / 2;
      that.oneliner.bg.x = that.player.sprite.x - offset - that.oneliner.bg.width;
      that.oneliner.triangle.y = that.oneliner.bg.height / 2;
      that.oneliner.triangle.x = that.oneliner.bg.width;
    }

    if (that.oneliner.bg.x < 0) {
      that.oneliner.bg.y = that.player.sprite.y - that.oneliner.bg.height / 2;
      that.oneliner.bg.x = that.player.sprite.x + offset;
      that.oneliner.triangle.y = that.oneliner.bg.height / 2;
      that.oneliner.triangle.x = 0;
    }
  },
  speak = function (that, text) {
    that.oneliner.msg.text = text;
    if (that.oneliner.announcement !== "") {
      that.oneliner.msg.text = fittingString(that.canvas, text, (dpi * 250));
      that.oneliner.msg.fill = "yellow";
    } else {
      that.oneliner.msg.fill = "white";
    }
    that.oneliner.bg.width = that.oneliner.msg.width + (dpi * 10);
    that.oneliner.speaking = true;
    that.oneliner.lastSpokenAt = Date.now();
    that.oneliner.announcement = "";
    update(that);
    that.canvas.addChild(that.oneliner.bg, false);
  },
  shush = function (that) {
    that.oneliner.speaking = false;
    that.oneliner.bg.remove(false);
  };

  if (this.oneliner.speaking) {
    if (Date.now() - this.oneliner.lastSpokenAt > this.oneliner.duration) {
      shush(this);
    } else {
      update(this);
    }
  } else if (Date.now() - this.oneliner.lastSpokenAt > this.oneliner.delay * (~~(Math.random() * 10) + 1)) {

    if (this.oneliner.announcement !== "") {
      speak(this, this.oneliner.announcement);
      return;
    }

    var id, msg, text,
        found = false,
        tries = 3,
        attempts = 0;

    if (this.profile.hasSomethingToSay()) {
      while (!found && attempts < tries) {
         id = ~~(Math.random() * Object.keys(this.GAME_DATA.messages).length) + 1;
         if (!this.profile.saidThat(id) && this.profile.canSayThat(id)) {
           this.profile.messagesSpoken.push(id);
           msg = this.GAME_DATA.messages[id];
           text = msg.text;
           found = true;
         } else {
           attempts++;
         }
      }
    }

    if (found) {
      speak(this, text);
    }
  }
};

Map.prototype.new = function (map_data) {

  this.MAP_DATA = map_data;

  this.player.sprite.remove(false);
  this.player = null;
  this.player = {};

  this.enemies.map(function (enemy) {
    enemy.sprite.remove(false);
    enemy = null;
  });
  this.enemies = null;
  this.enemies = [];

  this.enemiesQueue.map(function (enemy) {
    enemy.sprite.remove(false);
    enemy = null;
  });
  this.enemiesQueue = null;
  this.enemiesQueue = [];

  this.artifacts.map(function (artifact) {
    artifact.sprite.remove(false);
    artifact = null;
  });

  this.artifacts = null;
  this.artifacts = [];
  this.artifactsTotal = 0;

  this.floor.layer = null;
  this.floor.tiles.map(function (tile) {
    if (tile !== null) {
      tile.sprite.remove(false);
    }
  });
  this.floor = {
    layer: {},
    tiles: []
  };

  this.walls.map(function (wall) {
    wall = null;
  });
  this.walls = null;
  this.walls = [];

  this.bullets.map(function (bullet) {
    bullet.sprite.remove(false);
    bullet = null;
  });
  this.bullets = null;
  this.bullets = [];

  this.enemyBullets.map(function (bullet) {
    bullet.sprite.remove(false);
    bullet = null;
  });
  this.enemyBullets = null;
  this.enemyBullets = [];

  this.statusBar.artifacts.fill.width = 0;

  this.loadingNewData = true;
  this.load();

};

Map.prototype.showMenu = function (reason) {

  if (this.gameover.reason !== "") {
    this.menu.continueButton.remove(false);
    this.menu.container.height = (dpi * 150);

    if (this.gameover.reason === "LEVELDONE") {
      this.menu.restartButton.remove(false);
      this.menu.container.height = (dpi * 100);
    }
  }

  this.menu.caption.text = reason;

  this.menu.container.zIndex = "front";
  this.canvas.addChild(this.menu.container);
};

Map.prototype.hideMenu = function () {
  this.menu.container.remove(false);
};

Map.prototype.resetMenu = function () {
  this.menu.container.addChild(this.menu.continueButton, false);
  this.menu.container.addChild(this.menu.restartButton, false);
  this.menu.container.height = (dpi * 200);
};

Map.prototype.createMenu = function () {

  var buttonText,
      w = 200,
      h = 200,
      that = this,
      canvas = this.canvas,
      onHover = function (entity) {
        entity.bind("mouseenter", function () {
          this.strokeColor = "#999";
          canvas.mouse.cursor("pointer");
          canvas.redraw();
        }).bind("mouseleave", function functionName() {
          this.strokeColor = "#404040";
          canvas.mouse.cursor("default");
          canvas.redraw();
        });
      };

  this.menu.container = canvas.display.rectangle({
  	x: this.canvas.width / 2 - (dpi * (w / 2)),
  	y: this.canvas.height / 2 - (dpi * (h / 2)),
  	width: (dpi * w),
  	height: (dpi * h),
  	fill: "#FEFEFE",
    stroke: (dpi * 1) + "px #404040",
    strokePosition: "inside"
  });

  this.menu.caption = canvas.display.text({
    x: this.menu.container.width / 2,
    y: (dpi * 30),
    origin: { x: "center", y: "center" },
    font: (dpi * 14) + "px Lato",
    text: "Paused",
  	fill: "#404040"
  });

  this.menu.menuButton = canvas.display.rectangle({
    x: (dpi * 25),
    y: (dpi * 50),
    width: (dpi * 150),
    height: (dpi * 25),
    fill: "#FEFEFE",
    stroke: (dpi * 1) + "px #404040",
    strokePosition: "inside"
  });

  buttonText = canvas.display.text({
  	x: this.menu.menuButton.width / 2,
  	y: this.menu.menuButton.height / 2,
  	origin: { x: "center", y: "center" },
  	font: (dpi * 12) + "px Lato",
  	text: "GO TO MENU",
  	fill: "#404040"
  });

  this.menu.restartButton = this.menu.menuButton.clone({
    y: (dpi * 100)
  });

  this.menu.restartButton.addChild(buttonText.clone({
    text: "RESTART LVL"
  }));

  this.menu.continueButton = this.menu.menuButton.clone({
    y: (dpi * 150)
  });

  this.menu.continueButton.addChild(buttonText.clone({
    text: "CONTINUE"
  }));

  onHover(this.menu.continueButton);
  onHover(this.menu.restartButton);
  onHover(this.menu.menuButton);

  this.menu.continueButton.bind("click", function () {
    that.pauseGame(true);
  });

  this.menu.restartButton.bind("click", function () {
    that.restart();
  });

  this.menu.menuButton.bind("click", function () {
    that.refreshProgress();
    document.getElementById("game").style.zIndex = "1";
    document.getElementById("menu").style.zIndex = "2";
  });

  this.menu.menuButton.addChild(buttonText, false);
  this.menu.container.addChild(this.menu.caption, false);
  this.menu.container.addChild(this.menu.continueButton, false);
  this.menu.container.addChild(this.menu.restartButton, false);
  this.menu.container.addChild(this.menu.menuButton, false);

};

Map.prototype.createStatusBar = function () {
  var sb = this.statusBar,
      profile = this.profile;

  sb.life = {};
  sb.artifacts = {};

  sb.life.fill = this.canvas.display.rectangle({
    x: (dpi * 50),
    y: (dpi * 25),
    height: (dpi * 15),
    fill: "red"
  });

  sb.life.stroke = sb.life.fill.clone({
    width: (dpi * 250),
    fill: "rgba(255, 0, 0, 0.3)"
  });

  sb.life.hp = this.canvas.display.text({
    x: this.statusBar.life.stroke.width / 2,
    y: this.statusBar.life.stroke.height / 2,
    origin: {x: "center", y: "center"},
    fill: "white",
    font: (dpi * 9) + "px Lato"
  });

  sb.life.caption = sb.life.hp.clone({
    x: (dpi * 10),
    text: "HP",
    origin: {x: "left", y: "center"}
  });

  sb.artifacts.fill = sb.life.fill.clone({
    x: this.canvas.width - (dpi * 300),
    fill: "blue"
  });

  sb.artifacts.stroke = sb.artifacts.fill.clone({
    width: (dpi * 250),
    fill: "rgba(0, 0, 255, 0.3)"
  });

  sb.artifacts.no = sb.life.hp.clone({
  });

  sb.artifacts.caption = sb.artifacts.no.clone({
    x: (dpi * 10),
    text: "ARTIFACTS",
    origin: {x: "left", y: "center"}
  });

  sb.pause = sb.artifacts.caption.clone({
    x: this.canvas.width / 2,
    y: (dpi * 35),
    text: "Pause (P)",
    fill: "black",
    origin: {x: "center", y: "center"}
  });

  sb.life.stroke.addChild(sb.life.hp);
  sb.life.stroke.addChild(sb.life.caption);
  this.canvas.addChild(sb.life.fill);
  this.canvas.addChild(sb.life.stroke);

  sb.artifacts.stroke.addChild(sb.artifacts.no);
  sb.artifacts.stroke.addChild(sb.artifacts.caption);
  this.canvas.addChild(sb.artifacts.fill);
  this.canvas.addChild(sb.artifacts.stroke);

  this.canvas.addChild(sb.pause);

  this.refreshStatusBar();

};

Map.prototype.refreshStatusBar = function () {
  this.statusBar.life.hp.text = this.profile.getHP() + " / " + this.profile.getFullHP();
  this.statusBar.life.fill.stop().animate({
    width: (dpi * (this.profile.getHP() / this.profile.getFullHP() * 250))
  });
  this.statusBar.artifacts.no.text = this.artifactsTotal - this.artifacts.length + " / " + this.artifactsTotal;
  this.statusBar.artifacts.fill.stop().animate({
    width: (dpi * ((this.artifactsTotal - this.artifacts.length) / this.artifactsTotal * 250))
  });
};

Map.prototype.registerControls = function () {

  var that = this;

  document.getElementById("container").addEventListener("click", function () {
    if (that.profile.openedInventory && !that.paused) {
      that.waitingToCloseInventory = true;
      that.pauseGame(false);
    } else if (that.waitingToCloseInventory && that.paused) {
      that.waitingToCloseInventory = false;
      that.pauseGame(false);
    }
  });

  window.addEventListener("keydown", function (e) {
    var keyCode = e.keyCode;
    if (keyCode === 87) that.moving.up = true;
    if (keyCode === 83) that.moving.down = true;
    if (keyCode === 65) that.moving.left = true;
    if (keyCode === 68) that.moving.right = true;
    if (keyCode === 80) that.pauseGame(true, "Paused");
    if (keyCode === 27) if (that.paused) that.pauseGame(true);
    updateMovement();
  });

  window.addEventListener("keyup", function (e) {
    var keyCode = e.which;
    if (keyCode === 87) that.moving.up = false;
    if (keyCode === 83) that.moving.down = false;
    if (keyCode === 65) that.moving.left = false;
    if (keyCode === 68) that.moving.right = false;
    updateMovement();
  });

  var mousedown = false,
      shootingInterval,
      playerShooting = function () {
        if (!that.paused) {

          var mx = that.canvas.mouse.x,
              my = that.canvas.mouse.y,
              px = that.player.getSpriteX(),
              py = that.player.getSpriteY(),
              bullet = that.shoot(that.player, px, py, mx, my, "BULLET");

          if (bullet !== null) {
            that.bullets.push(bullet);
          }

        }
      };

  this.canvas.bind("mousemove", function () {
    if (!that.paused) that.rotatePlayer(that);
  }).bind("mousedown", function (e) {

    playerShooting();
    shootingInterval = setInterval(playerShooting, 1000 / that.player.attack_speed);

  }).bind("mouseup", function () {
    clearInterval(shootingInterval);
  });

  var updateMovement = function() {

    var dir = new Vector(0, 0);
    if (that.moving.left) dir = dir.add(new Vector (-1, 0));
    if (that.moving.right) dir = dir.add(new Vector (1, 0));
    if (that.moving.up) dir = dir.add(new Vector (0, -1));
    if (that.moving.down) dir = dir.add(new Vector (0, 1));

    // normalize vector to handle diagonal movement
    if (dir.length() > 0) dir = dir.unit();
    var velocity = that.player.speed;
    that.player.velocity.x = (dpi * (dir.x * velocity));
    that.player.velocity.y = (dpi * (dir.y * velocity));

  };

};

Map.prototype.rotatePlayer = function (_this) {
  // origin is set to center so take directly x, y coors
  var that = _this || this,
      objX = that.player.sprite.x,
      objY = that.player.sprite.y,
      mouseX = that.canvas.mouse.x,
      mouseY = that.canvas.mouse.y,
      radians = Math.atan2(mouseX - objX, mouseY - objY);

  that.rotation = (radians * (180 / Math.PI) * -1) + 90;

  that.player.sprite.rotateTo(that.rotation);
};

Map.prototype.moveBullets = function (bullets) {
  if (bullets.length === 0) return;

  var bullet, shiftX, shiftY,
      vp = this.viewport,
      shiftXDelta = (vp.x - vp.oldX),
      shiftYDelta = (vp.y - vp.oldY);

  for (var i = 0; i < bullets.length; i++) {
    bullet = bullets[i];
    shiftX = (dpi * bullet.velocity.x);
    shiftY = (dpi * bullet.velocity.y);
    bullet.sprite.move(shiftX - (dpi * shiftXDelta), shiftY - (dpi * shiftYDelta));
    bullet.collider.move(shiftX, shiftY);
    // TODO: should be removed if !isWithinMapBounds
    if (Date.now() - bullet.shotAt > bullet.ttl * 1000) {
      bullets.splice(i--, 1);
      bullet.sprite.remove(false);
    }
  }
};

/**
 * Takes upper left corner coors.
 * @param  {[type]} collider [description]
 * @param  {[type]} x        [description]
 * @param  {[type]} y        [description]
 * @param  {[type]} w        [description]
 * @param  {[type]} h        [description]
 * @return {[type]}          [description]
 */
Map.prototype.createRobotCollider = function (collision, x, y, colliderType) {
  var b = collision.bounds;
  if (collision.type === "circle") {
    return createCircle((dpi * (x + b.x)), (dpi * (y + b.y)), (dpi * b.r), colliderType);
  } else if (collision.type === "rectangle") {
    return createRectangle((dpi * b.w), (dpi * b.h), (dpi * ((b.w / 2) + x + b.x)), (dpi * ((b.h / 2) + y + b.y)), colliderType, true, 32);
  } else if (collision.type === "polygon") {
    return createPolygon((dpi * x), (dpi * y), b.p, colliderType, true, 32);
  }
};

Map.prototype.updatePlayerColliders = function () {
  var x = this.player.getSpriteX() + (dpi * this.viewport.x),
      y = this.player.getSpriteY() + (dpi * this.viewport.y);
  this.player.collider.pickup.setPosition(x, y);
  this.player.collider.wall.setPosition(x, y);
  this.player.collider.attack.setPosition(x, y);
};

Map.prototype.populateCollidersPool = function () {
  var i, vp = this.viewport;
  this.collidersPool.clear();

  this.collidersPool.insert(this.player.collider.pickup);
  this.collidersPool.insert(this.player.collider.wall);
  this.collidersPool.insert(this.player.collider.attack);

  for (i = 0; i < this.bullets.length; i++) {
    this.collidersPool.insert(this.bullets[i].collider);
  }

  for (i = 0; i < this.enemyBullets.length; i++) {
    this.collidersPool.insert(this.enemyBullets[i].collider);
  }

  for (i = 0; i < this.walls.length; i++) {
    this.collidersPool.insert(this.walls[i].collider);
  }

  for (i = 0; i < this.enemies.length; i++) {
    this.collidersPool.insert(this.enemies[i].collider.attack);
    this.collidersPool.insert(this.enemies[i].collider.wall);
  }

  for (i = 0; i < this.artifacts.length; i++) {
    this.collidersPool.insert(this.artifacts[i].collider);
  }

};

Map.prototype.checkCollisions = function () {

  var returnObjects = [],
      response = new SAT.Response(),
      a, b, i, j, enemy, sprite,
      player = this.player,
      vp = this.viewport,
      canMove,
      mapX = ~~(((player.sprite.x / dpi) + vp.x) / this.tileSize.w),
      mapY = ~~(((player.sprite.y / dpi) + vp.y) / this.tileSize.h),
      standingOnTile = ~~((mapY * this.numTiles.x + mapX));


  if (!this.gameover.is && this.floor.layer[standingOnTile] === 0) {
    var that = this,
        cb = function () {
          that.pauseGame(true, "Ouch");
        };
    this.gameover.is = true;
    this.gameover.reason = "DEAD";
    player.sprite.stop().animate({
      scalingX: 0.01,
      scalingY: 0.01,
      x: player.sprite.x + player.velocity.x * 3,
      y: player.sprite.y + player.velocity.y * 3
    }, {
      easing: "ease-out-cubic",
      callback: cb
    });
  }

  // CAN ENEMIES SHOOT ?
  // ===================

  for (i = 0; i < this.enemies.length; i++) {
    enemy = this.enemies[i];
    sprite = enemy.sprite;
    a = createRay(sprite.x + (dpi * vp.x), sprite.y + (dpi * vp.y), player.sprite.x + (dpi * vp.x), player.sprite.y + (dpi * vp.y), "ENEMY_BULLET_RAY");
    returnObjects = this.collidersPool.retrieve(a);

    enemy.cannotShoot = false;
    for (j = 0; j < returnObjects.length; j++) {
      b = returnObjects[j];
      if (b.type === "WALL" && intersect(a, b)) {
        enemy.cannotShoot = true;
        break;
      }
    }
  }

  // (PLAYER) BULLETS vs. WALLS
  // ==========================

  for (i = 0; i < this.bullets.length; i++) {
    returnObjects = this.collidersPool.retrieve(this.bullets[i].collider);
    for (j = 0; j < returnObjects.length; j++) {
      a = this.bullets[i].collider;
      b = returnObjects[j];

      // TODO: indexOf .canCollideWith()
      if (a !== b) {
        if (b.type === "WALL" && intersect(a, b)) {
          this.bullets[i].sprite.remove(false);
          this.bullets.splice(i, 1);
          break;
        } else if (b.type === "ENEMY_ATTACK" && intersect(a, b)) {
          this.bullets[i].sprite.remove(false);
          this.bullets.splice(i, 1);
          break;
        }
      }
    }
  }

  for (i = 0; i < this.enemyBullets.length; i++) {
    returnObjects = this.collidersPool.retrieve(this.enemyBullets[i].collider);
    for (j = 0; j < returnObjects.length; j++) {
      a = this.enemyBullets[i].collider;
      b = returnObjects[j];

      // TODO: indexOf .canCollideWith()
      if (a !== b) {
        if (b.type === "WALL" && intersect(a, b)) {
          this.enemyBullets[i].sprite.remove(false);
          this.enemyBullets.splice(i, 1);
          break;
        } else if (b.type === "PLAYER_ATTACK" && intersect(a, b)) {
          if (Math.random() > this.profile.getDefense()) {
            this.gameover.is = this.profile.injured(this.enemyBullets[i].power);
            this.refreshStatusBar();
            if (this.gameover.is) {
              this.gameover.reason = "DEAD";
              this.pauseGame(true, "You were destroyed");
            }
          }
          this.enemyBullets[i].sprite.remove(false);
          this.enemyBullets.splice(i, 1);

          break;
        }
      }
    }
  }

  // ENEMIES vs. (PLAYER) BULLETS and PLAYER_WALL
  // ============================

  var allowMoveQueue = [],
      allowMove = function () {
        var _enemy = allowMoveQueue.pop();
        _enemy.bouncing = false;
        _enemy.collider.attack.setPosition(_enemy.sprite.x + (dpi * vp.x), _enemy.sprite.y + (dpi * vp.y));
        _enemy.collider.wall.setPosition(_enemy.sprite.x + (dpi * vp.x), _enemy.sprite.y + (dpi * vp.y));
      };

  for (i = 0; i < this.enemies.length; i++) {
    a = this.enemies[i].collider.attack;
    returnObjects = this.collidersPool.retrieve(a);
    for (j = 0; j < returnObjects.length; j++) {
      b = returnObjects[j];
      if (a !== b && b.type === "BULLET" && intersect(a, b)) {
        if (Math.random() > this.enemies[i].defense) {
          this.enemies[i].hp -= this.profile.getAttackPower();
          if (this.enemies[i].hp <= 0) {
            this.profile.addSP(this.enemies[i].sp);
            this.inventory.refreshStatusBar();
            this.enemies[i].sprite.remove(false);
            this.enemies.splice(i, 1);
          }
        }
      } else if (a !== b && b.type === "PLAYER_WALL" && intersect(a, b)) {
        enemy = this.enemies[i];
        if (true || !enemy.bouncing) {
          var dir = (new Vector(enemy.velocity.x, enemy.velocity.y)).unit(),
              shiftX = player.sprite.x + (dir.x * -1 * (dpi * (this.tileSize.w * 1.5))),
              shiftY = player.sprite.y + (dir.y * -1 * (dpi * (this.tileSize.h * 1.5)));
          enemy.bouncing = true;
          allowMoveQueue.push(enemy);
          if (Math.random() > this.profile.getDefense()) {
            this.gameover.is = this.profile.injured(enemy.attack);
            this.refreshStatusBar();
            if (this.gameover.is) {
              this.gameover.reason = "DEAD";
              this.pauseGame(true, "You were destroyed");
            }
          }
          enemy.sprite.stop().animate({
            x: shiftX,
            y: shiftY
          }, {
            easing: "ease-out-quart",
            duration: 500,
            callback: allowMove
          });
        }
      }
    }
  }

  for (i = 0; i < this.enemies.length; i++) {
    a = this.enemies[i].collider.wall;
    returnObjects = this.collidersPool.retrieve(a);
    for (j = 0; j < returnObjects.length; j++) {
      b = returnObjects[j];
       if (a !== b && b.type === "WALL") {

        intersect(a, b, response);

        enemy = this.enemies[i];
        if (response.overlapV.x > 0) enemy.canMove.left = false;
        else enemy.canMove.left = true;

        if (response.overlapV.x < 0) enemy.canMove.right = false;
        else enemy.canMove.right = true;

        if (response.overlapV.y > 0) enemy.canMove.up = false;
        else enemy.canMove.up = true;

        if (response.overlapV.y < 0) enemy.canMove.down = false;
        else enemy.canMove.down = true;

        response.clear();
      }
    }
  }

  // PLAYER vs. WALLS
  // ================

  a = this.player.collider.wall;
  canMove = this.player.canMove;
  returnObjects = this.collidersPool.retrieve(a);
  for (i = 0; i < returnObjects.length; i++) {
    b = returnObjects[i];

    if (a !== b && a.type === "PLAYER_WALL" && b.type === "WALL") {

      intersect(a, b, response);

      if (response.overlapV.x > 0) canMove.left = false;
      else canMove.left = true;

      if (response.overlapV.x < 0) canMove.right = false;
      else canMove.right = true;

      if (response.overlapV.y > 0) canMove.up = false;
      else canMove.up = true;

      if (response.overlapV.y < 0) canMove.down = false;
      else canMove.down = true;

      response.clear();

    }
  }

  // ARTIFACTS vs. PLAYER_PICKUP
  // ===========================

  a = this.player.collider.pickup;
  returnObjects = this.collidersPool.retrieve(a);
  var wait = function (that) {
    setTimeout(function () {
      that.pauseGame(true, "Artifacts collected");
    }, 1000);
  };

  for (i = 0; i < this.artifacts.length; i++) {
    b = this.artifacts[i];

    if (b.sprite.added && intersect(a, b.collider)) {
      this.profile.addArtifact(b.id);
      this.oneliner.announcement = "Artifact found: " + b.name;
      this.oneliner.lastSpokenAt = -1;
      this.inventory.refreshStatusBar();
      this.inventory.createArtifactEntity(b.id);
      this.artifacts[i].sprite.remove(false);
      this.artifacts.splice(i, 1);
      this.refreshStatusBar();
      if (this.artifacts.length === 0) {
        this.gameover.is = true;
        this.gameover.reason = "LEVELDONE";
        wait(this);
      }
    }
  }

};

/**
 * Loads map tilesets informations, relevant spritesheet and calculates dimensions.
 */
Map.prototype.loadTilesets = function() {
  var ts = this.MAP_DATA.tilesets;
  for (var i = 0; i < ts.length; i++) {
    this.tileSets.push({
      firstgid: ts[i].firstgid,
      image: this.assets.getAsset(this.GAME_DATA.tileset_src[ts[i].name], true),
      imageheight: ts[i].imageheight,
      imagewidth: ts[i].imagewidth,
      numTiles: {
        x: ~~(ts[i].imagewidth / this.tileSize.w),
        y: ~~(ts[i].imageheight / this.tileSize.h)
      }
    });
  }

};

Map.prototype.loadTileLayer = function () {

  var layer = {},
      that = this,
      process = function (tileID, i) {
        if (tileID !== 0) { // zero means there is no tile
          var tilePacket = that.getTilePacket(tileID);

          var tile = that.canvas.display.sprite({
            image: tilePacket.img,
            frames: [{
              x: (dpi * tilePacket.px),
              y: (dpi * tilePacket.py)
            }],
            width: (dpi * that.tileSize.w),
            height: (dpi * that.tileSize.h),
            frame: 1
          });

          that.floor.tiles[i] = {
            sprite: tile
          };

        } else {
          that.floor.tiles[i] = null;
        }
      },
      cb = function(results) {
        that.loadObjectLayers();
        if (that.loadingNewData) {
          that.resetMenu();
          that.pauseGame(true);
          that.loadingNewData = false;
        } else {
          that.registerControls();
          that.start();
        }
        setTimeout(function () {
          loadingDone();
          displayGame();
        }, 100);
        that.refreshStatusBar();
      };

  for (var i = 0; i < this.MAP_DATA.layers.length; i++) {

    layer = this.MAP_DATA.layers[i];


    if (layer.type === "tilelayer") {
      var layerData = uncompress(layer.data, this.numTiles.x, this.numTiles.y);
      this.floor.layer = layerData;

      var promise = asyncIterator(layerData, process, 5000);

      promise.done(cb);

      break;
    }
  }

};

Map.prototype.loadObjectLayers = function () {

  var layer = {},
      waiting;
  for (var i = 0; i < this.MAP_DATA.layers.length; i++) {

    layer = this.MAP_DATA.layers[i];

    if (layer.type === "objectgroup") {
      if (layer.name === "player") {
        this.loadPlayer(layer);
        this.adjustCamera();
        this.calculateVisibleTiles();
        this.addInitTiles();
        this.updateTilesPosition();
        this.updateArtifactsPosition();
        this.addEnemies();
        this.updateEnemiesPosition();
        this.updatePlayerColliders();
      } else if (layer.name === "enemies") {
        this.loadEnemies(layer);
      } else if (layer.name === "artifacts") {
        this.loadArtifacts(layer);
      } else if (layer.name === "walls") {
        this.loadWalls(layer);
      }
    }
  }

};

Map.prototype.loadArtifacts = function (layer) {
  var x, y, w, h, obj, id, data, sprite, collider, artifact;
  this.artifactsTotal = layer.objects.length;
  for (var i = 0; i < layer.objects.length; i++) {
    obj = layer.objects[i];
    id = obj.name;
    if (this.profile.hasArtifact(id)) continue;
    x = obj.x;
    y = obj.y;
    w = obj.width;
    h = obj.height;
    collider = createRectangle((dpi * w), (dpi * h), (dpi * (w / 2 + x)), (dpi * (h / 2 + y)), "ARTIFACT");
    data = this.GAME_DATA.artifacts[id];
    sprite = this.sprites.artifacts[id].sprite;
    sprite.x = (dpi * (x + this.tileSize.w / 2));
    sprite.y = (dpi * (y + this.tileSize.h / 2));
    artifact = new Artifact(id, data, sprite, collider);
    artifact.mapX = x;
    artifact.mapY = y;
    this.artifacts.push(artifact);
  }
};

Map.prototype.loadWalls = function (layer) {
  var w, h, x, y, obj, collider,
      tw = this.tileSize.w,
      th = this.tileSize.h;
  for (var i = 0; i < layer.objects.length; i++) {
    obj = layer.objects[i];
    w = obj.width;
    h = obj.height;
    x = obj.x;
    y = obj.y;
    this.walls.push(new Obstacle(createRectangle((dpi * w), (dpi * h), (dpi * (w / 2 + x)), (dpi * (h / 2 + y)), "WALL")));

    // set walkable and unwalkable grid cells
    for (var cy = 0; cy < h; cy += th) {
      for (var cx = 0; cx < w; cx += tw) {
        this.gridMap.setWalkableAt(~~((x + cx) / tw), ~~((y + cy) / th), false);
      }
    }

  }
};

Map.prototype.loadEnemies = function (layer) {
  var name, enemy, data, sprite, x, y;
  for (var i = 0; i < layer.objects.length; i++) {
    name = layer.objects[i].name; // enemy name from map
    x = layer.objects[i].x;
    y = layer.objects[i].y;
    data = this.GAME_DATA.robots.enemies[name]; // enemy data from database
    sprite = this.sprites.enemies[name].sprite; // oCanvas sprite prototype
    enemy = new Enemy(data, sprite);
    enemy.setMapXY(x, y);
    enemy.collider.attack = this.createRobotCollider(data.sprite.collision.attack, x, y, "ENEMY_ATTACK");
    enemy.collider.wall = this.createRobotCollider(data.sprite.collision.wall, x, y, "ENEMY_WALL");
    this.enemiesQueue.push(enemy);
  }
};

Map.prototype.removeVisibleTiles = function () {
  var i;
  for (var row = this.viewport.tiles.old.startY; row < this.viewport.tiles.old.endY; row++) {
    for (var col = this.viewport.tiles.old.startX; col < this.viewport.tiles.old.endX; col++) {
      i = row * this.numTiles.x + col;
      if (this.floor.tiles[i] !== null) {
        this.floor.tiles[i].sprite.remove(false);
      }
    }
  }
};

Map.prototype.addInitTiles = function () {
  var i;
  for (var row = this.viewport.tiles.new.startY; row < this.viewport.tiles.new.endY; row++) {
    for (var col = this.viewport.tiles.new.startX; col < this.viewport.tiles.new.endX; col++) {
      i = row * this.numTiles.x + col;
      if (this.floor.tiles[i] !== null) {
        this.canvas.addChild(this.floor.tiles[i].sprite, false);
        this.floor.tiles[i].sprite.zIndex = "back";
      }
    }
  }

  var tiles = this.viewport.tiles;
  tiles.old.startX = tiles.new.startX;
  tiles.old.endX = tiles.new.endX;
  tiles.old.startY = tiles.new.startY;
  tiles.old.endY = tiles.new.endY;

};

/**
 * Loads player and creates Player() for that.
 * @param {Object} layer
 */
Map.prototype.loadPlayer = function (layer) {

    for (var i = 0; i < layer.objects.length; i++) {
      if (layer.objects[i].type === "playerspawn") {

        var x = layer.objects[i].x,
            y = layer.objects[i].y;

        this.player = new Player(this.GAME_DATA.robots.player.karel, this.sprites.player.sprite);

        // player's absolute coors will be used to adjust camera
        this.player.mapX = x + this.tileSize.w / 2;
        this.player.mapY = y + this.tileSize.h / 2;

        this.player.collider.pickup = this.createRobotCollider(this.player.collision.pickup, x, y, "PLAYER_PICKUP");

        this.player.collider.wall = this.createRobotCollider(this.player.collision.wall, x, y, "PLAYER_WALL");

        this.player.collider.attack = this.createRobotCollider(this.player.collision.attack, x, y, "PLAYER_ATTACK");

        // player's sprite coors will be in the center of canvas
        this.player.setSpriteXY((dpi * this.canvasElem.cx), (dpi * this.canvasElem.cy));

        return; // player has been found, no need to loop further
      }
    }

};

/**
 * Sets game camera in terms of visible static tiles.
 */
Map.prototype.calculateVisibleTiles = function () {

  var vp = this.viewport,
      tiles = this.viewport.tiles;

  tiles.new.startX = ~~(vp.x / this.tileSize.w);
  tiles.new.startY = ~~(vp.y / this.tileSize.h);
  tiles.new.endX = ~~((vp.x + vp.w) / this.tileSize.w + 1);
  tiles.new.endY = ~~((vp.y + vp.h) / this.tileSize.h + 1);

  if(tiles.new.startX < 0) tiles.new.startX = 0;
  if(tiles.new.startY < 0) tiles.new.startY = 0;
  if(tiles.new.endX > this.numTiles.x) tiles.new.endX = this.numTiles.x;
  if(tiles.new.endY > this.numTiles.y) tiles.new.endY = this.numTiles.y;

};

/**
 * Initialize game camera viewport to prevent map overflowing.
 */
Map.prototype.adjustCamera = function () {

  var vp = this.viewport;


  vp.x = this.player.mapX - this.canvasElem.cx;

  if (vp.x < vp.minX) { // blank gap on the left
    this.player.moveSpriteXY((dpi * vp.x), 0);
    vp.x = vp.minX;
  } else if (vp.x > vp.maxX) {
    var shiftX = this.pixelSize.x - vp.x - vp.w;
    this.player.moveSpriteXY((dpi * -shiftX), 0);
    vp.x = vp.maxX;
  }

  vp.oldX = vp.x;

  vp.y = this.player.mapY - this.canvasElem.cy;

  if (vp.y < vp.minY) { // blank gap on the top
    this.player.moveSpriteXY(0, (dpi * vp.y));
    vp.y = vp.minY;
  } else if (vp.y > vp.maxY) {
    var shiftY = this.pixelSize.y - vp.y - vp.h;
    this.player.moveSpriteXY(0, (dpi * -shiftY));
    vp.y = vp.maxY;
  }

  vp.oldY = vp.y;

};

/**
 * Adds visible / Removes out-of-bounds sprites from oCanvas objects-to-draw container.
 * @param {Number} start index of row to be added or removed
 * @param {Number} end index of row to be added or removed
 * @param {Number} start index of col to be added or removed
 * @param {Number} end index of col to be added or removed
 */
Map.prototype.addTiles = function (startY, endY, startX, endX, action) {
  var row, col, i;
  for (row = startY; row < endY; row++) {
    for (col = startX; col < endX; col++) {
      i = row * this.numTiles.x + col;
      if (typeof this.floor.tiles[i] == "undefined" || this.floor.layer[i] === 0) continue;
      if (action === "DEL") {
        this.floor.tiles[i].sprite.remove(false);
      } else if (action === "ADD") {
        this.canvas.addChild(this.floor.tiles[i].sprite, false);
        this.floor.tiles[i].sprite.zIndex = "back";
      }
    }
  }
};

/**
 * [updateTiles description]
 * @return {[type]} [description]
 */
Map.prototype.updateTiles = function () {

  var vp = this.viewport,
      tiles = vp.tiles,
      nsx = tiles.new.startX,
      osx = tiles.old.startX,
      nex = tiles.new.endX,
      oex = tiles.old.endX,
      nsy = tiles.new.startY,
      osy = tiles.old.startY,
      ney = tiles.new.endY,
      oey = tiles.old.endY,
      left = nsx - osx,
      right = nex - oex,
      top = nsy - osy,
      bottom = ney - oey;

  // REMOVING COLS ON LEFT
  if (left > 0) this.addTiles(osy, oey, osx - 1, nsx, "DEL");
  // ADDING COLS ON LEFT
  if (left < 0) this.addTiles(nsy, ney, nsx, osx + 1, "ADD");
  // REMOVING COLS ON RIGHT
  if (right < 0) this.addTiles(osy, oey, nex, oex, "DEL");
  // ADDDING COLS ON RIGHT
  if (right > 0) this.addTiles(nsy, ney, oex - 1, nex, "ADD");
  // REMOVING ROWS ON TOP
  if (top > 0) this.addTiles(osy, nsy, osx, nex, "DEL");
  // ADDING ROWS ON TOP
  if (top < 0) this.addTiles(nsy, osy, nsx, nex, "ADD");
  // REMOVING COLS ON BOTTOM
  if (bottom < 0) this.addTiles(ney, oey, osx, oex, "DEL");
  // ADDDING COLS ON BOTTOM
  if (bottom > 0) this.addTiles(ney - 1, ney, nsx, nex, "ADD");

  tiles.old.startX = tiles.new.startX;
  tiles.old.endX = tiles.new.endX;
  tiles.old.startY = tiles.new.startY;
  tiles.old.endY = tiles.new.endY;

};

Map.prototype.updateArtifactsPosition = function () {
  var artifact, sprite, x, y;
  for (var i = 0; i < this.artifacts.length; i++) {
    artifact = this.artifacts[i];
    sprite = artifact.sprite;

    x = (dpi * (artifact.mapX + this.tileSize.w / 2 - this.viewport.x));
    y = (dpi * (artifact.mapY + this.tileSize.h / 2 - this.viewport.y));

    if (!sprite.added && this.isWithinBounds(artifact.mapX, artifact.mapY)) {
      sprite.x = x;
      sprite.y = y;
      this.canvas.addChild(artifact.sprite, false);
      artifact.sprite.zIndex = "front";
    } else if (sprite.added) {
      sprite.x = x;
      sprite.y = y;
        if (!this.isWithinBounds(artifact.mapX, artifact.mapY)) {
          sprite.remove(false);
        }
    }
  }
};

Map.prototype.updateTilesPosition = function () {
  var vp = this.viewport,
      tiles = vp.tiles,
      gap = 0,
      i;

  for (var row = tiles.new.startY; row < tiles.new.endY; row++) {
    for (var col = tiles.new.startX; col < tiles.new.endX; col++) {

      i = row * this.numTiles.x + col;

      if (this.floor.layer[i] === 0) {
        gap++;
      } else {

        // i -= gap;

        var worldX = (dpi * ((i % this.numTiles.x) * this.tileSize.w)),
            worldY = (dpi * (~~(i / this.numTiles.x) * this.tileSize.h));

        // sprites will have these coors relative to the canvas
        worldX -= (dpi * this.viewport.x);
        worldY -= (dpi * this.viewport.y);

        this.floor.tiles[i].sprite.x = ~~worldX;
        this.floor.tiles[i].sprite.y = ~~worldY;

      }
    }
  }

  // add player again to fix his z-index
  this.canvas.addChild(this.player.getSprite(), false);
  this.player.getSprite().zIndex = "front";

};

Map.prototype.updateEnemiesPosition = function () {
  var enemy, sprite;
  for (var i = 0; i < this.enemies.length; i++) {
    enemy = this.enemies[i];
    sprite = enemy.getSprite();
    sprite.x = (dpi * (enemy.mapX - this.viewport.x + this.tileSize.w / 2));
    sprite.y = (dpi * (enemy.mapY - this.viewport.y + this.tileSize.h / 2));
  }
};

Map.prototype.isWithinBounds = function (mapX, mapY) {
  if ((mapX + this.tileSize.w) < this.viewport.x || (mapY + this.tileSize.h) < this.viewport.y || mapX > this.viewport.x + this.viewport.w || mapY > this.viewport.y + this.viewport.h) return false;
  else return true;
};

Map.prototype.addEnemies = function () {
  var enemy, sprite, mapX, mapY, x, y;
  for (var i = 0; i < this.enemiesQueue.length; i++) {
    enemy = this.enemiesQueue[i];
    sprite = enemy.getSprite();
    mapX = enemy.getMapX();
    mapY = enemy.getMapY();
    if (!sprite.added && this.isWithinBounds(mapX, mapY)) {
      x = enemy.mapX - this.viewport.x + this.tileSize.w / 2;
      y = enemy.mapY - this.viewport.y + this.tileSize.h / 2;
      sprite.x = (dpi * x);
      sprite.y = (dpi * y);
      this.canvas.addChild(sprite, false);
      sprite.zIndex = "front";
      sprite.startAnimation();
      this.enemies.push(enemy);
      this.enemiesQueue.splice(i--, 1);
    }
  }

};

Map.prototype.moveEnemies = function () {
  var enemy, bullet, ex, ey, px, py, velX, velY, direction, angle,
      vp = this.viewport,
      shiftXDelta = (vp.x - vp.oldX),
      shiftYDelta = (vp.y - vp.oldY),
      tw = this.tileSize.w,
      th = this.tileSize.h,
      that = this,
      sx, sy,
      path,
      finder = this.pathFinder,
      prevPosX = 0, prevPosY = 0,
      moving = function (_enemy) {
        if (that.paused) {
          _enemy.sprite.stop();
          return;
        }
        if (_enemy.path.length > 1 ) {
          var vp = that.viewport,
              shiftXDelta = (vp.x - vp.oldX),
              shiftYDelta = (vp.y - vp.oldY);
          _enemy.path.shift();
          sx = (dpi * (_enemy.path[0][0] * tw - vp.x + tw / 2));
          sy = (dpi * (_enemy.path[0][1] * th - vp.y + th / 2));
          _enemy.direction.x = Math.sign(_enemy.sprite.x - prevPosX);
          _enemy.direction.y = Math.sign(_enemy.sprite.y - prevPosY);
          prevPosX = _enemy.sprite.x;
          prevPosY = _enemy.sprite.y;
          _enemy.sprite.animate({
            x: sx,
            y: sy
          }, {
            easing: "linear",
            duration: 500,
            callback: function () {
              if (_enemy.path.length === 1) {
                _enemy.direction.x = 0;
                _enemy.direction.y = 0;
              }
              moving(_enemy);
            }
          });
        }
      },
      newMovement = function (_enemy, delay) {
        if (that.calcNewPaths || Date.now() - _enemy.lastMovementDecision >= delay) {

          px = (that.player.sprite.x / dpi) + vp.x;
          py = (that.player.sprite.y / dpi) + vp.y;
          ex = (_enemy.sprite.x / dpi) + vp.x;
          ey = (_enemy.sprite.y / dpi) + vp.y;

          _enemy.path = finder.findPath(~~(ex / tw), ~~(ey / th), ~~(px / tw), ~~(py / th), that.gridMap.clone());
          _enemy.sprite.stop();

          _enemy.lastMovementDecision = Date.now();
          moving(_enemy);
        }
      },
      shoot = function (_enemy) {

        if (!that.gameover.is && !_enemy.cannotShoot && Math.random() < 0.05) {
          px = that.player.sprite.x;
          py = that.player.sprite.y;
          ex = _enemy.sprite.x;
          ey = _enemy.sprite.y;
          bullet = that.shoot(_enemy, ex, ey, px, py, "ENEMY_BULLET");

          if (bullet !== null) {
            that.enemyBullets.push(bullet);
          }
        }

      };

  for (var i = 0; i < this.enemies.length; i++) {
    enemy = this.enemies[i];
    ex = enemy.getSpriteX();
    ey = enemy.getSpriteY();
    px = this.player.getSpriteX();
    py = this.player.getSpriteY();
    direction = Math.atan2(py - ey, px - ex);
    angle = direction * (180 / Math.PI);
    enemy.velocity.x = (dpi * (enemy.speed * Math.cos(direction)));
    enemy.velocity.y = (dpi * (enemy.speed * Math.sin(direction)));
    enemy.sprite.move(-(dpi * shiftXDelta), -(dpi * shiftYDelta));
    newMovement(enemy, 2000);
    shoot(enemy);
    enemy.collider.attack.setPosition(enemy.sprite.x + (dpi * this.viewport.x), enemy.sprite.y + (dpi * this.viewport.y));
    enemy.collider.wall.setPosition(enemy.sprite.x + (dpi * this.viewport.x), enemy.sprite.y + (dpi * this.viewport.y));
    if (!enemy.norotation) {
      enemy.sprite.rotateTo(angle);
      if (!(enemy.collider.attack instanceof Circle)) {
        enemy.collider.attack.rotate(angle);
      }
    }
  }

  this.calcNewPaths = false;
};

Map.prototype.shoot = function (robot, sx, sy, ex, ey, type) {

  if (Date.now() - robot.lastShot >= 1000 / robot.attack_speed) {
    var sprite, velocity, collider,
        bulletW = 20,
        bulletH = 2,
        direction = Math.atan2(ey - sy, ex - sx),
        angle = direction * (180 / Math.PI);

    velocity = {
      x: robot.bullet_speed * Math.cos(direction),
      y: robot.bullet_speed * Math.sin(direction)
    };

    var red;
    if (type !== "BULLET") {
      red = 255 + (robot.attack / 15) * (128 - 255);
    }

    sprite = this.canvas.display.rectangle({
      x: sx,
      y: sy,
      width: (dpi * bulletW),
      height: (dpi * bulletH),
      fill: (type === "BULLET" ? "black" : "rgb(" + ~~red + ", 0, 0)")
    });

    collider = createRectangle((dpi * bulletW), (dpi * bulletH), sx + (dpi * this.viewport.x), sy + (dpi * this.viewport.y), type);

    collider.rotate(angle);
    sprite.rotateTo(angle);

    this.canvas.addChild(sprite, false);
    sprite.zIndex = 999;

    robot.lastShot = Date.now();
    return new Bullet(collider, velocity, sprite, robot.attack);

  } else {
    return null;
  }
};

Map.prototype.move = function () {

  var player = this.player,
      playerX = player.getSpriteX(),
      playerY = player.getSpriteY(),
      velX = player.velocity.x,
      velY = player.velocity.y,
      playerWallBounds = player.collider.wall,
      vp = this.viewport,
      mapHasMoved = false;

  var playerLimit = playerWallBounds.obj.r,
      playerCollisionBounds = {
        top: playerY - playerLimit,
        right: playerX + playerLimit,
        bottom: playerY + playerLimit,
        left: playerX - playerLimit
      },
      worldBounds = {
        top: 0,
        right: (dpi * this.canvasElem.w),
        bottom: (dpi * this.canvasElem.h),
        left: 0
      };

  if (!player.canMove.left && velX < 0) velX = 0;
  if (!player.canMove.right && velX > 0) velX = 0;
  if (!player.canMove.up && velY < 0) velY = 0;
  if (!player.canMove.down && velY > 0) velY = 0;

  // HORIZONTAL MOVEMENT
  // ===================

  if (velX !== 0) {

    if ((velX > 0 && (playerX <= vp.padding.right)) || (velX < 0 && (playerX >= vp.padding.left))) {
      player.moveSpriteXY(velX, 0);
    } else if ((velX > 0 && (playerX > vp.padding.right)) || (velX < 0 && (playerX < vp.padding.left))) {
      if ((velX > 0 && (vp.x < vp.maxX)) || (velX < 0 && (vp.x > vp.minX))) {
        vp.oldX = vp.x;
        if (vp.x + velX > vp.maxX) vp.x = vp.maxX;
        else if (vp.x + velX < vp.minX) vp.x = vp.minX;
        else vp.x += velX;
        mapHasMoved = true;
      } else if (vp.x >= vp.maxX || vp.x <= vp.minX) {
        if (playerCollisionBounds.right + velX > worldBounds.right) {
          player.sprite.x = worldBounds.right - playerLimit;
        } else if (playerCollisionBounds.left + velX < worldBounds.left) {
          player.sprite.x = worldBounds.left + playerLimit;
        } else player.moveSpriteXY(velX, 0);
      }
    }

  }

  // VERTICAL MOVEMENT
  // ===================

  if (velY !== 0) {

    if ((velY > 0 && (playerY <= vp.padding.bottom)) || (velY < 0 && (playerY >= vp.padding.top))) {
      player.moveSpriteXY(0, velY);
    } else if ((velY > 0 && (playerY > vp.padding.bottom)) || (velY < 0 && (playerY < vp.padding.top))) {
      if ((velY > 0 && (vp.y < vp.maxY)) || (velY < 0 && (vp.y > vp.minY))) {
        vp.oldY = vp.y;
        if (vp.y + velY > vp.maxY) vp.y = vp.maxY;
        else if (vp.y + velY < vp.minY) vp.y = vp.minY;
        else vp.y += velY;
        mapHasMoved = true;
      } else if (vp.y >= vp.maxY || vp.y <= vp.minY) {
        if (playerCollisionBounds.bottom + velY > worldBounds.bottom) {
          player.sprite.y = worldBounds.bottom - playerLimit;
        } else if (playerCollisionBounds.top + velY < worldBounds.top) {
          player.sprite.y = worldBounds.top + playerLimit;
        } else player.moveSpriteXY(0, velY);
      }
    }

  }

  if (mapHasMoved) {
    this.calculateVisibleTiles();
    this.updateTiles();
    this.updateTilesPosition();
    this.addEnemies();
    this.updateArtifactsPosition();
    this.calcNewPaths = true;
  }

  if (velX !== 0 || velY !== 0) {
    this.rotatePlayer();
    this.updatePlayerColliders();
    this.player.sprite.zIndex = "front";
  }

};

Map.prototype.getTilePacket = function(tileIndex) {

  // packet data
  var pkt = {
    img: null,
    px: 0,
    py: 0
  };

  // loop through tileSets and determine which one we’re looking for
  var i = 0;
  for (i = this.tileSets.length - 1; i >= 0; i--) {
    if (this.tileSets[i].firstgid <= tileIndex) break;
  }

  //pkt.img = this.assets.getAsset(this.GAME_DATA.tileset_src[this.MAP_DATA.tilesets[i].name], true);
  pkt.img = this.tileSets[i].image;

  // determine coordinates for the given tileIndex
  var localIdx = tileIndex - this.tileSets[i].firstgid;
  var lTileX = ~~(localIdx % this.tileSets[i].numTiles.x);
  var lTileY = ~~(localIdx / this.tileSets[i].numTiles.x);
  pkt.px = (lTileX * this.tileSize.w);
  pkt.py = (lTileY * this.tileSize.h);

  return pkt;

};
