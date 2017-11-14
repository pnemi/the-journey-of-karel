(function() {

  var selector = "#game"; // canvas id selector name
  var canvas = {}; // oCanvas obj
  var GAME_DATA_PATH = "./js/data.json"; // path to JSON game data
  var GAME_DATA = {}; // JSON game data
  var assets = {}; // AssetManager() - where preloaded images are stored
   profile = {}; // current Profile() - game settings, progress and progress
  var player = {}; // Player()
  var sprites = {
    player: {},
    enemies: {},
    artifacts: {},
    items: {}
  };
  var items = {};
  var inventory = {};
  var map;
  var progressIndicators = [];

  /**
  * Generates frames for oCanvas sprite object.
  * @param {Object} sprite
  * @param {Object} spritesheet image
  * @return {Array} sprite's frames
  */
  function genSpriteFrames(sprite, spritesheet) {
    var frames = [], // frames container
    TILE_SIZE = (dpi * 32),
    rows = spritesheet.width / TILE_SIZE,
    x = sprite.offset_x,
    y = sprite.offset_y,
    spriteOffset = y * rows + x,
    frameOffset,
    frameX,
    frameY;

    for (var i = 0; i < sprite.frames.offset.length; i++) {
      frameOffset = spriteOffset + (sprite.frames.offset[i] - 1);
      frameX = frameOffset % rows;
      frameY = parseInt(frameOffset / rows);

      frames[i] = {
        x: frameX * TILE_SIZE,
        y: frameY  * TILE_SIZE
      };

      if (typeof sprite.frames.durations !== "undefined") {
        frames[i].d = sprite.frames.durations[i];
      }
    }

    return frames;

  }

  /**
  * Creates robot oCanvas sprite instances prototypes.
  * @param {Object} data
  * @param {Object} spritesheet - image
  */
  function loadSprites(data, spritesheet, canvas) {
    var _sprites = {}; // local sprites container
    for (var id in data) {
      _sprites[id] = {};

      _sprites[id].sprite = canvas.display.sprite({
        origin: { x: "center", y: "center" },
        image: spritesheet,
        frames: genSpriteFrames(data[id].sprite, spritesheet),
        width: (dpi * 32),
        height: (dpi * 32),
        direction: "x"
      });

    }

    return _sprites;
  }

  /**
  * Requests and loads JSON data files like game database and maps.
  * @param {Function} callback
  * @param {String} path
  */
  function loadJSON(callback, path) {
    var req = new XMLHttpRequest();
    req.open("GET", path, true);
    req.setRequestHeader("Content-type", "application/json");

    req.onreadystatechange = function() {
      if (req.readyState === 4 && req.status === 200) {
        var response = JSON.parse(req.responseText);
        callback(response);
      }
    };
    req.send();
  }

  /**
  * Prealoads all game assets via AssetManager()
  */
  function loadAssets() {
    assets = new AssetManager(); // new container for assets

    // tilesets
    for (var tileset in GAME_DATA.tileset_src) {
      assets.queueDownload(GAME_DATA.tileset_src[tileset], true);
    }

    // preload artifacts attachments
    var src, attachments;
    for (var id in GAME_DATA.artifacts) {
      if (GAME_DATA.artifacts[id].hasOwnProperty("attachments")) {
        attachments = GAME_DATA.artifacts[id].attachments;
        for (var i = 0; i < attachments.length; i++) {
          if (attachments[i].hasOwnProperty("src")) {
            src = attachments[i].src;
            assets.queueDownload(src, false);
          }
        }
      }
    }

    assets.downloadAll(init); // start downloading assets

  }

  /**
  * Description of what this does.
  *
  * @param {Object} loaded JSON map data
  */
  function createMap(MAP_DATA) {

    if (!map) {
      map = new Map(MAP_DATA, GAME_DATA, assets, sprites, canvas, profile, inventory, refreshProgress);
    } else {
      map.new(MAP_DATA);
    }

  }

  function renameProfile() {

  }

  function resetProfile() {
    profile.reset();
    inventory.refreshStatusBar();
  }

  function deleteProfile() {
    var current = document.querySelector(".dropdown button"),
        profiles = localStorage.getObj("profiles");

  }

  function createProfile() {
    var name = "",
        profiles = localStorage.getObj("profiles") || [],
        isAlphabetic = false,
        isTaken = false,
        canceled = false;

    while (!isAlphabetic || isTaken) {
      name = prompt("New Profile Name:", "");
      if (name === "" || name === null) {
        canceled = true;
        break;
      }
      isAlphabetic = /^[a-zA-Z]+$/.test(name);
      for (var i = 0; i < profiles.length; i++) {
        if (profiles[i] === name) isTaken = true;
      }
    }

    if (!canceled) {
      profiles.push(name);
      localStorage.setObj("profiles", profiles);
    }
  }

  function switchProfile() {
    var id = this.textContent,
        current = document.querySelector(".dropdown button"),
        profiles = localStorage.getObj("profiles"),
        nth = profiles.indexOf(id),
        swap;

    swap = this.textContent;
    this.textContent = current.textContent;
    profiles[nth] = profiles[0];
    current.textContent = swap;
    profiles[0] = swap;

    localStorage.setObj("profiles", profiles);

  }

  /**
   * Loads stored profiles.
   */
   function loadProfiles() {
     var profiles = localStorage.getObj("profiles") || [],
         profilesElem = document.getElementById("profiles"),
         item, link, i;

     if (profiles.length > 1) { // switch options
       document.getElementById("profiles").style.display = "block";
     }

     document.querySelector(".dropdown button").textContent = profiles[0];

     for (i = 1; i < profiles.length; i++) {
       item = document.createElement("li");
       link = document.createElement("a");
       link.setAttribute("role", "button");
       link.setAttribute("class", "profile");
       link.textContent = profiles[i];
       item.appendChild(link);
       profilesElem.appendChild(item);
       link.addEventListener("click", switchProfile, false);
     }

     document.getElementById("rename").addEventListener("click", renameProfile);
     document.getElementById("delete").addEventListener("click", deleteProfile);
     document.getElementById("create").addEventListener("click", createProfile);
   }

  function createLevelsMenu() {
    var item, name, annotation, i,
        container = document.getElementById("levels"),
        loadLevelHandler = function (src) {
          item.addEventListener("click", function() {
            setTimeout(function () {
              loadJSON(createMap, src);
            }, 10);
            loadingStart();


          });
        };
    for (i = 0; i < 10; i++) {
      item = document.createElement("div");
      item.setAttribute("class", "level");
      item.textContent = romanize(i + 1);

      progressIndicators[i] = radialIndicator(item, {
        radius: 24,
        barWidth : 2,
        initValue : 0,
        displayNumber: false,
        barColor: {
          0: '#E4E4E4',
          25: '#B6B4B4',
          50: '#2BAADE',
          75: '#0046AF',
          100: '#33CC33'
        }
      });

      name = document.createElement("div");
      name.setAttribute("class", "level-name");

      if (i % 2 === 0) name.className += " below";
      else name.className += " above";
      name.textContent = GAME_DATA.maps[i].name.toUpperCase();

      annotation = document.createElement("div");
      annotation.setAttribute("class", "level-annotation");
      annotation.textContent = GAME_DATA.maps[i].annotation;

      item.appendChild(name);
      container.appendChild(item);
      container.appendChild(annotation);

      loadLevelHandler(GAME_DATA.maps[i].src);

    }

    refreshProgress();
  }

  refreshProgress = function() {
    var total, collected, arts;
    for (var i = 0; i < 10; i++) {
      arts = GAME_DATA.maps[i].artifacts;
      total = arts.length;
      collected = 0;
      for (var j = 0; j < total; j++) {
        if (profile.hasArtifact(arts[j])) collected++;
      }
      progressIndicators[i].animate(collected / total * 100);
    }
  };

  /**
  * Initialization of game data structure.
  */
  function init() {

    canvas = oCanvas.create({
      canvas: selector,
      fps: 60,
      drawEachFrame: false
    });

    shopCanvas = oCanvas.create({
      canvas: "#inventory",
      fps: 60
    });

    setCanvasSize(canvas);

    profile = new Profile(GAME_DATA, "karel");

    // LOADING ROBOTS
    // ==============

    var robotsSpritesheet = assets.getAsset(GAME_DATA.tileset_src.robots, true),
        playerData = GAME_DATA.robots.player;
        enemiesData = GAME_DATA.robots.enemies;

    sprites.player = loadSprites(playerData, robotsSpritesheet, canvas).karel;
    sprites.enemies = loadSprites(enemiesData, robotsSpritesheet, canvas);

    // LOADING ITEMS
    // =============

    var itemsSpritesheet = assets.getAsset(GAME_DATA.tileset_src.items, true),
        itemsData = GAME_DATA.items;
    sprites.items = loadSprites(itemsData, itemsSpritesheet, shopCanvas);

    // LOADING ARTIFACTS
    // =================

    var artifactsSpritesheet = assets.getAsset(GAME_DATA.tileset_src.artifacts, true),
        artifactsData = GAME_DATA.artifacts;
    sprites.artifacts = loadSprites(artifactsData, artifactsSpritesheet, canvas);

    inventory = new Inventory(shopCanvas, GAME_DATA, sprites, profile, assets);

    window.addEventListener("beforeunload", function(e) {
      profile.save(); // save all data before leaving
    }, false);

    // loadProfiles();
    document.getElementById("delete").addEventListener("click", resetProfile);
    createLevelsMenu();
    loadingDone();


  }

  function storeGameData(response) {
    GAME_DATA = response; // requested game data
    loadAssets();
  }

  (function() {
    loadJSON(storeGameData, GAME_DATA_PATH);
  }());

}());
