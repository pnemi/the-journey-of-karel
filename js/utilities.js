/**
 * Gives pixel ratio constant.
 *
 * @returns {Number} window pixel ratio
 */
var getPixelRatio = function() {
  var MAX_RATIO = 2;
  return Math.min((window.devicePixelRatio || 1), MAX_RATIO);
};

/**
 * Gives higher dpi dimensions by multiplying sizes with pixel ratio.
 *
 * @param {Number} normal size @1x resolution
 * @returns {Number} higher dpi size
 */
var _dpi = function(size) {
  return size * getPixelRatio();
};

var dpi = getPixelRatio();

/**
 * Gives higher dpi dimensions by multiplying sizes with pixel ratio.
 *
 * @param {Number} normal size @1x resolution
 * @returns {Number} higher dpi size
 */
var ipd = function(size) {
  return size / getPixelRatio();
};

/**
 * Adjusts canvas size to possible higher dpi resolutions.
 *
 * @param {Object} oCanvas
 */
var setCanvasSize = function(canvas) {
  var cw = canvas.width;
  var ch = canvas.height;
  canvas.width = cw * getPixelRatio();
  canvas.height = ch * getPixelRatio();
  canvas.canvasElement.style.width = cw + "px";
  canvas.canvasElement.style.height = ch + "px";
};

/**
 * Adds modifier for the high-resolution images.
 *
 * @param {String} image source
 * @returns {String} image source of higher resolution
 */
var getHighResImageSrc = function(src) {
  var ratio = getPixelRatio();
  if (ratio > 1) return src.replace(/\.(?=[^.]*$)/, "@" + ratio + "x.");
  else return src;
};

var wrapText = function(canvas, line_width, text) {
  var output = "";
  var line = "";
  var paragraphs = text.split("\n");
  var ctx = canvas.canvas;
  for (var i = 0; i < paragraphs.length; i++) {
    var words = paragraphs[i].split(" ");
    for (var n = 0; n < words.length; n++) {
      var testLine = line + words[n] + " ";
      var metrics = ctx.measureText(testLine);
      var testWidth = metrics.width;
      if (testWidth > line_width && n > 0) {
        output += (line + "\n");
        line = words[n] + " ";
      } else {
        line = testLine;
      }
    }
    output += (line + "\n");
    line = "";
  }
  return output.slice(0, -2);
};

function fittingString(canvas, str, maxWidth) {
  var ctx = canvas.canvas;
  var width = ctx.measureText(str).width;
  var ellipsis = "…";
  var ellipsisWidth = ctx.measureText(ellipsis).width;
  if (width <= maxWidth || width <= ellipsisWidth) {
    return str;
  } else {
    var len = str.length;
    while (width >= maxWidth - ellipsisWidth && (len--)>0) {
      str = str.substring(0, len);
      width = ctx.measureText(str).width;
    }
    return str + ellipsis;
  }
}

function randBetween(min, max) {
  return ~~((Math.random() * max) + min);
}


// var loadArtifactsEmotions = function(config) {
//   var artifacts = config.artifacts;
//   var emotions = {
//     "anger": 0,
//     "disgust": 0,
//     "fear": 0,
//     "happiness": 0,
//     "sadness": 0,
//     "surprise": 0,
//   };
//
//   for (var i = 0; i < artifacts.length; i++) {
//     for (var emotion in artifacts[i].emotions) {
//       if (artifacts[i].emotions[emotion]) {
//         emotions[emotion] += 1;
//       }
//     }
//   }
//
//   return emotions;
// };

var romanize = function(num) {
  var digits = String(+num).split(""),
    key = ["", "C", "CC", "CCC", "CD", "D", "DC", "DCC", "DCCC", "CM",
      "", "X", "XX", "XXX", "XL", "L", "LX", "LXX", "LXXX", "XC",
      "", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"],
    roman = "",
    i = 3;
  while (i--) roman = (key[+digits.pop() + (i * 10)] || "") + roman;
  return Array(+digits.join("") + 1).join("M") + roman;
};

function calculateAspectRatioMin(image, maxWidth, maxHeight) {
  var ratio = Math.min(maxWidth / image.width, maxHeight / image.height);
  return { width: image.width * ratio, height: image.height * ratio };
}

function calculateAspectRatioMax(image, maxWidth, maxHeight) {
  var ratio = Math.max(maxWidth / image.width, maxHeight / image.height);
  return { width: image.width * ratio, height: image.height * ratio };
}

function loadingStart() {
  var loader = document.getElementById("loading");
  loader.style.display = loader.style.display === 'none' ? '' : 'none';
  // console.log("start");
  loader.style.zIndex = "10";
}

function loadingDone() {
  var loader = document.getElementById("loading");
  loader.style.display = loader.style.display === 'none' ? '' : 'none';
}

function displayGame() {
  document.getElementById("game").style.zIndex = "2";
  document.getElementById("menu").style.zIndex = "1";
}

function displayMenu() {
  refreshProgress();
  document.getElementById("game").style.zIndex = "1";
  document.getElementById("menu").style.zIndex = "2";
}

function fireEvent(obj, evt){
  var fireOnThis = obj,
      evObj;
  if (document.createEvent) {
    evObj = document.createEvent('MouseEvents');
    evObj.initEvent( evt, true, false );
    fireOnThis.dispatchEvent( evObj );
  } else if( document.createEventObject ) { //IE
    evObj = document.createEventObject();
    fireOnThis.fireEvent( 'on' + evt, evObj );
  }
}

function uncompress(base64Data, mapWidth, mapHeight) {
  var compressData = atob(base64Data).split('').map(function(e) {
        return e.charCodeAt(0);
      }),
      binData = new Uint8Array(compressData),
      data = pako.inflate(binData),
      tileIndex = 0,
      globalTileIndex,
      csvData = [],
      global_tile_id,
      FLIPPED_HORIZONTALLY_FLAG = 0x80000000,
      FLIPPED_VERTICALLY_FLAG   = 0x40000000,
      FLIPPED_DIAGONALLY_FLAG   = 0x20000000,
      flipped_horizontally, flipped_vertically, flipped_diagonally;

  for (var y = 0; y < mapHeight; ++y) {
    for (var x = 0; x < mapWidth; ++x) {
      globalTileIndex = data[tileIndex] |
                        data[tileIndex + 1] << 8 |
                        data[tileIndex + 2] << 16 |
                        data[tileIndex + 3] << 24;
      tileIndex += 4;

      // read out the flags
      flipped_horizontally = (globalTileIndex & FLIPPED_HORIZONTALLY_FLAG);
      flipped_vertically = (globalTileIndex & FLIPPED_VERTICALLY_FLAG);
      flipped_diagonally = (globalTileIndex & FLIPPED_DIAGONALLY_FLAG);

       // clear the flags
       globalTileIndex &= ~(FLIPPED_HORIZONTALLY_FLAG |
                           FLIPPED_VERTICALLY_FLAG |
                           FLIPPED_DIAGONALLY_FLAG);

       csvData[y * mapWidth + x] = globalTileIndex;
    }
  }

  return csvData;
}

Storage.prototype.setObj = function(key, obj) {
    return this.setItem(key, JSON.stringify(obj));
};

Storage.prototype.getObj = function(key) {
    return JSON.parse(this.getItem(key));
};

String.prototype.capitalize = function() {
  return this.split("_").join(" ").toLowerCase().replace( /\b\w/g, function (m) {
    return m.toUpperCase();
  });
};
