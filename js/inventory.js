function Inventory(canvas, game_data, sprites, profile, assets) {

  this.element = document.getElementById("inventory");
  this.canvas = canvas;
  this.assets = assets;

  this.entities = {
    artifacts: {},
    preview: {},
    controls: {},
    statusBar: {},
    shop: {},
    installed: {},
    stats: {},
    scrollbars: {
      artifactsList: {}
    }
  };

  var w = 450,
      h = 400,
      y = 100,
      x;

  this.dim = {
    tilesize: 32,
    padX: 10,
    padY: 40
  };

  this.dim.containerW = w / 2 - this.dim.padX * 2;
  this.dim.containerH = 350;
  this.dim.listOffsetTop = localStorage.getItem("artifactsListOffsetTop") || 0;
  this.dim.previewOffsetTop = localStorage.getItem("artifactsPreviewOffsetTop") || 0;
  this.dim.previewOffsetMin = 0;
  this.dim.previewOffsetMax = 1;
  this.dim.itemW = this.dim.containerW;
  this.dim.itemH = 30;

  this.artifactsList = {};
  this.artifactsPreview = {};

  this.mouseDragging = {
    artifactsList: false,
    artifactsPreview: false,
    delta: 0,
    x: 0,
    y: 0,
    oldX: 0,
    oldY: 0
  };

  var that = this,
      dim = that.dim;

  this.canvas.bind("mousemove", function (e) {
    var shiftY = ~~(that.mouseDragging.y - that.mouseDragging.oldY),
        contentHeight, visibleHeight, scrollbarSize,
        sb;

    if (that.mouseDragging.artifactsList) {
      sb = that.entities.scrollbars.artifactsList;
      count = Object.keys(that.entities.artifacts).length;
      contentHeight = count * dim.itemH;
      visibleHeight = dim.containerH;
      scrollbarSize = Math.max(visibleHeight * (visibleHeight / contentHeight), 20);
      dim.listOffsetTop += (shiftY * (contentHeight / visibleHeight));
      that.mouseDragging.delta += shiftY;
      dim.listOffsetTop = Math.min(Math.max(dim.listOffsetTop, 0), (dpi * (Math.abs(visibleHeight - contentHeight))));
      that.refreshArtifactsList();
      that.updateScrollbar(sb, contentHeight, visibleHeight, that.artifactsList, dim.listOffsetTop);
    }

    if (that.mouseDragging.artifactsPreview) {
      sb = that.entities.scrollbars.preview;
      contentHeight = (that.entities.preview.container.height / dpi);
      visibleHeight = dim.containerH;
      scrollbarSize = Math.max(visibleHeight * (visibleHeight / contentHeight), 20);
      dim.previewOffsetTop += (shiftY * (contentHeight / visibleHeight));
      that.mouseDragging.delta += shiftY;
      dim.previewOffsetTop = Math.min(Math.max(dim.previewOffsetTop, 0), (dpi * (Math.abs(visibleHeight - contentHeight))));
      that.entities.preview.container.y = -Math.min(Math.max(dim.previewOffsetTop, 0), (dpi * (Math.abs(visibleHeight - contentHeight))));
      that.updateScrollbar(sb, contentHeight, visibleHeight, that.artifactsPreviewWrapper, dim.previewOffsetTop);
      that.canvas.redraw();
    }

    that.mouseDragging.oldY = that.mouseDragging.y;
    that.mouseDragging.y = that.canvas.mouse.y;
  }).bind("mousedown", function () {
  }).bind("mouseup", function () {
    that.mouseDragging.artifactsList = false;
    that.mouseDragging.artifactsPreview = false;
    that.mouseDragging.delta = 0;
  });

  this.GAME_DATA = game_data;
  this.sprites = sprites;
  this.profile = profile;

  setCanvasSize(this.canvas);

  window.addEventListener("keydown", function (e) {
    var keyCode = e.keyCode;
    if (keyCode === 27) {
      that.profile.openedInventory = false;
      that.shrinkShopInventory();
      that.canvas.scenes.scenes.shop.unload();
      that.canvas.scenes.scenes.artifacts.unload();
    } else if (keyCode === 69) {
      that.entities.statusBar.shopButton.trigger("click");
      fireEvent(document.getElementById("container"), "click");
    } else if (keyCode === 81) {
      that.entities.statusBar.artifactsButton.trigger("click");
      fireEvent(document.getElementById("container"), "click");
    }

  });

  this.entities.noArtifacts = this.canvas.display.text({
    x: (dpi * dim.containerW) / 2,
    y: (dpi * dim.containerH) / 2,
    origin: {x: "center", y: "center"},
    text: "No artifacts found.",
    font: (dpi * 12) + "px Lato",
    fill: "black"
  });

  x = 650;
  this.createShop(w, h, x, y);

  x = 100;
  this.createArtifactsPreview(w, h, x, y);

  this.refreshArtifactsList();

  this.createControls();
  this.refreshStatusBar();

  this.shrinkShopInventory();

}

Inventory.prototype.shrinkShopInventory = function () {
  document.getElementById("inventory").className = "";
  this.profile.openedInventory = false;
  this.canvas.canvasElement.height = (dpi * 32);
  this.canvas.canvasElement.style.height = 32 + "px";
  this.entities.controls.container.y = (dpi * 16);
  this.canvas.redraw();
};

Inventory.prototype.expandShopInventory = function () {
  document.getElementById("inventory").className = "faded";
  this.profile.openedInventory = true;
  this.canvas.canvasElement.height = (dpi * 600);
  this.canvas.canvasElement.style.height = 600 + "px";
  this.entities.controls.container.y = this.canvas.height - (dpi * 16);
  this.canvas.redraw();
};

Inventory.prototype.toggleInventory = function () {
  var scenes = this.canvas.scenes.scenes;
  if (scenes.artifacts.loaded || scenes.shop.loaded) {
    this.expandShopInventory();
  } else {
    this.shrinkShopInventory();
  }
};

Inventory.prototype.refreshStatusBar = function () {
  var emotionsText = "";
  for (var emotion in this.profile.emotions) {
    if (this.profile.emotions.hasOwnProperty(emotion)) {
      emotionsText += (emotion.capitalize() + ": " + ~~(this.profile.emotions[emotion] / this.profile.totalEmotions[emotion] * 100) + "%     ");
    }
  }
  this.entities.statusBar.emotions.text = emotionsText.slice(0, -5);
  // this.entities.statusBar.emotionsShadow.text = this.entities.statusBar.emotions.text;
  this.entities.statusBar.sp.text = "SP: " + this.profile.sp;
  // this.entities.statusBar.spShadow.text = this.entities.statusBar.sp.text;
  this.canvas.redraw();
};

Inventory.prototype.createControls = function () {

  var that = this;
  var controlsScene = this.canvas.scenes.create("controls", function () {
    that.entities.statusBar.artifactsButton = that.canvas.display.rectangle({
      x: (dpi * (-50)),
    	origin: { x: "center", y: "center" },
      width: (dpi * 85),
    	height: (dpi * 18),
    	fill: "white"
    });

    var artifactsButtonText = that.canvas.display.text({
    	origin: { x: "center", y: "center" },
    	font: (dpi * 10) + "px Lato",
      align: "center",
    	text: "ARTIFACTS (Q)",
    	fill: "black"
    });

    that.entities.statusBar.shopButton = that.entities.statusBar.artifactsButton.clone({
      x: (dpi * 50),
    });

    var shopButtonText = artifactsButtonText.clone({
      text: "ITEMS (E)"
    });

    var container = that.canvas.display.rectangle({
      x: that.canvas.width / 2,
      y: that.canvas.height - (dpi * 16),
    	origin: { x: "center", y: "center" }
    });

    that.entities.statusBar.artifactsButton.addChild(artifactsButtonText);
    that.entities.statusBar.shopButton.addChild(shopButtonText);

    that.entities.statusBar.artifactsButton.bind("click", function () {
      if (!that.canvas.scenes.scenes.artifacts.loaded) {
        that.canvas.scenes.scenes.artifacts.load();
      } else {
        that.canvas.scenes.scenes.artifacts.unload();
      }
      that.toggleInventory();
    }).bind("mouseenter", function () {
      this.fill = "#EEE";
      that.canvas.mouse.cursor("pointer");
      that.canvas.redraw();
    }).bind("mouseleave", function () {
      this.fill = "white";
      that.canvas.mouse.cursor("default");
      that.canvas.redraw();
    });

    that.entities.statusBar.shopButton.bind("click", function () {
      if (!that.canvas.scenes.scenes.shop.loaded) {
        that.canvas.scenes.scenes.shop.load();
      } else {
        that.canvas.scenes.scenes.shop.unload();
      }
      that.toggleInventory();
    }).bind("mouseenter", function () {
      this.fill = "#EEE";
      that.canvas.mouse.cursor("pointer");
      that.canvas.redraw();
    }).bind("mouseleave", function () {
      this.fill = "white";
      that.canvas.mouse.cursor("default");
      that.canvas.redraw();
    });

    that.entities.statusBar.emotions = that.canvas.display.text({
      x: -that.entities.statusBar.artifactsButton.width - (dpi * 20),
      font: (dpi * 10) + "px Lato",
      origin: {x: "right", y: "center"},
      fill: "black"
    });

    // that.entities.statusBar.emotionsShadow = that.entities.statusBar.emotions.clone({
    //   y: (dpi * 1),
    //   fill: "white"
    // });

    that.entities.statusBar.sp = that.canvas.display.text({
      x: that.entities.statusBar.shopButton.width + (dpi * 20),
      font: (dpi * 10) + "px Lato",
      origin: {x: "left", y: "center"},
      fill: "black"
    });

    // that.entities.statusBar.spShadow = that.entities.statusBar.sp.clone({
    //   y: (dpi * 1),
    //   fill: "white"
    // });

    // container.addChild(that.entities.statusBar.emotionsShadow);
    container.addChild(that.entities.statusBar.emotions);
    // container.addChild(that.entities.statusBar.spShadow);
    container.addChild(that.entities.statusBar.sp);
    container.addChild(that.entities.statusBar.artifactsButton);
    container.addChild(that.entities.statusBar.shopButton);

    that.entities.controls.container = container;
    this.add(container);
  });

  this.canvas.scenes.load("controls");

};

Inventory.prototype.createCaption = function (x, y, text) {

  return this.canvas.display.text({
    x: (dpi * x),
    y: (dpi * y),
    origin: { x: "center", y: "center" },
    font: (dpi * 12) +"px Lato",
    weight: "300",
    text: text,
    fill: "#AAA"
  });

};

Inventory.prototype.createContainer = function (x, y, w, h) {

  return this.canvas.display.rectangle({
    x: (dpi * x),
    y: (dpi * y),
    width: (dpi * w),
    height: (dpi * h),
    fill: "#FBFBFB"
  });

};

Inventory.prototype.updateScrollbar = function (sb, contentHeight, visibleHeight, container, offsetTop) {

  if (contentHeight <= visibleHeight) {
    sb.bg.remove();
  } else {
    var scrollbarSize = Math.max(visibleHeight * (visibleHeight / contentHeight), 20);
    sb.scrollbar.height = (dpi * scrollbarSize);
    sb.scrollbar.y = ((sb.bg.height - (dpi * scrollbarSize)) / (dpi * (contentHeight - visibleHeight))) * Math.abs(offsetTop);
    container.addChild(sb.bg);
  }

};

Inventory.prototype.createScrollbar = function () {
  var width = 10,
      height = this.dim.containerH,
      scrollbarSize = 25,
      max = 20,
      val = Math.min(Math.max(10, 0), max),
      bg, scrollbar;

  bg = this.canvas.display.rectangle({
    x: (dpi * this.dim.containerW),
    y: 0,
    origin: {x: "left", y: "top"},
    width: (dpi * width),
    height: (dpi * height),
    fill: "#DDD"
  });

  scrollbar = this.canvas.display.rectangle({
    y: ((height - scrollbarSize) / max) * val,
    width: (dpi * width),
    height: (dpi * scrollbarSize),
    fill: "#111"
  });

  bg.addChild(scrollbar);

  return { bg: bg, scrollbar: scrollbar };

};

Inventory.prototype.refreshStats = function () {
  var stats = "",
      karel = this.GAME_DATA.robots.player.karel,
      bonuses = {
        hp: 0,
        attack: 0,
        defense: 0,
        speed: 0,
        attack_speed: 0,
        bullet_speed: 0
      }, itemBonuses;

  for (i = 0; i < this.profile.installed.length; i++) {
    id = this.profile.installed[i];
    itemBonuses = this.GAME_DATA.items[id].bonus;
    for (var b in itemBonuses) {
      if (itemBonuses.hasOwnProperty(b)) {
        bonuses[b] = itemBonuses[b];
      }
    }
  }

  stats += ("HP : " + (karel.hp + bonuses.hp) + " p");
  stats += ("\nAttack : " + (karel.attack + bonuses.attack) + " dmg");
  stats += ("\nDefense : " + ((karel.defense + bonuses.defense) * 100) + " pct");
  stats += ("\nSpeed : " + (karel.speed + bonuses.speed) + " vel");
  stats += ("\nAttack Speed : " + (karel.attack_speed + bonuses.attack_speed) + " pwr");
  stats += ("\nBulet Speed : " + (karel.bullet_speed + bonuses.bullet_speed) + " vel");

  this.entities.stats.text = stats;
};

Inventory.prototype.createArtifactEntity = function (id, i) {
  var bg, text, artifact,
      dim = this.dim,
      that = this,
      onMouseEnterHandler = function (bg) {
        bg.bind("mouseenter", function () {
          if (!that.mouseDragging.artifactsList) {
            this.fill = "#D0D0D0";
            that.canvas.redraw();
          }
        });
      },
      onMouseLeaveHandler = function (bg) {
        bg.bind("mouseleave", function () {
            this.fill = "transparent";
            that.canvas.redraw();
        });
      },
      onMouseClickHandler = function (bg, artifact) {
        bg.bind("mouseup", function () {
          if (that.mouseDragging.delta === 0) {
            that.previewArtifact(artifact);
          }
          that.mouseDragging.delta = 0;
        });
      };

    artifact = this.GAME_DATA.artifacts[id];

    bg = this.canvas.display.rectangle({
      y: (dpi * dim.itemH),
      width: (dpi * dim.itemW),
      height: (dpi * dim.itemH)
    });

    text = this.canvas.display.text({
      y: (dpi * (dim.itemH / 2)),
      origin: {x: "left", y: "center"},
      font: (dpi * 12) + "px Lato",
      fill: "black"
    });

    text.text = wrapText(this.canvas, (dpi * (dim.itemW - dim.padX)), artifact.name).replace(/\n.*/, "...").split("\n")[0];

    artifactsList = this.artifactsList;
    sb = this.entities.scrollbars.artifactsList;
    count = this.profile.artifacts.length;
    contentHeight = count * this.dim.itemH;
    visibleHeight = this.dim.containerH;
    scrollbarSize = Math.max(visibleHeight * (visibleHeight / contentHeight), 20);

    for (var item in this.entities.artifacts) {
      if (this.entities.artifacts.hasOwnProperty(item)) {
        this.entities.artifacts[item].y += (dpi * dim.itemH);
      }
    }

    bg.addChild(text);
    onMouseEnterHandler(bg);
    onMouseLeaveHandler(bg);
    onMouseClickHandler(bg, artifact);
    this.entities.artifacts[id] = bg;

    this.refreshArtifactsList();
    this.updateScrollbar(sb, contentHeight, visibleHeight, artifactsList, 0);
};

Inventory.prototype.refreshArtifactsList = function () {
  var entities = this.entities.artifacts,
      dim = this.dim,
      rm = function (bg) {
        bg.stop().fadeOut(500, "linear", function () {
          this.remove();
        });
      };

  if (this.profile.artifacts.length === 0) {
    this.entities.noArtifacts.zIndex = "back";
    this.artifactsList.addChild(this.entities.noArtifacts, false);
  } else {
    this.entities.noArtifacts.remove(false);
  }

  for (var count = this.profile.artifacts.length - 1, i = count; i >= 0; i--) {
    id = this.profile.artifacts[i];
    artifact = this.GAME_DATA.artifacts[id];
    bg = entities[id];
    bg.y = (dpi * dim.itemH) * (count - i) + -dim.listOffsetTop;
    if (bg.y + (dpi * dim.itemH) > (dpi * dim.containerH)) {
      rm(bg);
    } else if (bg.y < 0) {
      rm(bg);
    } else {
      this.artifactsList.addChild(bg);
      bg.stop().fadeIn(500, "linear");
    }
  }

  this.canvas.redraw();
};

Inventory.prototype.previewArtifact = function (artifact) {

  var art = artifact,
      that = this,
      dim = this.dim,
      height = (dpi * dim.padX),
      preview = this.entities.preview,
      presentColor = "#8E8E8E",
      notPresentColor = "#D1CECE",
      notPresentStrokeColor = "#EBE9E9",
      attachment,
      ratio, ratioFull,
      sb;

  if (typeof artifact === "string") {
    art = this.GAME_DATA.artifacts[artifact];
  }

  preview.title.font = (dpi * 12) + "px Lato";
  preview.title.y = height;
  preview.title.text = wrapText(this.canvas, (dpi * (dim.containerW - 2 * dim.padX)), art.name);

  height += preview.title.height + (dpi * dim.padX);

  preview.year.y = height;
  preview.year.text = "Year: " + wrapText(this.canvas, (dpi * (dim.containerW - 2 * dim.padX)), art.year.toString());

  height += preview.year.height + (dpi * dim.padX);

  preview.emotionsContainer.y = height;

  preview.anger.fill = (art.emotions.anger ? presentColor : notPresentColor);
  preview.disgust.fill = (art.emotions.disgust ? presentColor : notPresentColor);
  preview.fear.fill = (art.emotions.fear ? presentColor : notPresentColor);
  preview.happiness.fill = (art.emotions.happiness ? presentColor : notPresentColor);
  preview.sadness.fill = (art.emotions.sadness ? presentColor : notPresentColor);
  preview.surprise.fill = (art.emotions.surprise ? presentColor : notPresentColor);

  preview.angerBG.strokeColor = (art.emotions.anger ? presentColor : notPresentStrokeColor);
  preview.disgustBG.strokeColor = (art.emotions.disgust ? presentColor : notPresentStrokeColor);
  preview.fearBG.strokeColor = (art.emotions.fear ? presentColor : notPresentStrokeColor);
  preview.happinessBG.strokeColor = (art.emotions.happiness ? presentColor : notPresentStrokeColor);
  preview.sadnessBG.strokeColor = (art.emotions.sadness ? presentColor : notPresentStrokeColor);
  preview.surpriseBG.strokeColor = (art.emotions.surprise ? presentColor : notPresentStrokeColor);

  height += preview.emotionsContainer.height + (dpi * dim.padX);

  if (typeof preview.image !== "undefined") preview.image.remove();
  if (typeof preview.imageFull !== "undefined") preview.imageFull.remove();

  if (art.hasOwnProperty("attachments")) {

    attachment = this.assets.getAsset(art.attachments[0].src, false);
    ratio = calculateAspectRatioMax(attachment, dim.containerW - 2 * dim.padX, 100);
    ratioFull = calculateAspectRatioMin(attachment, 1000, 500);

    preview.image = this.canvas.display.image({
      x: (dpi * dim.padX),
      y: height,
      width: (dpi * ratio.width),
      height: (dpi * ratio.height),
      image: this.assets.getAsset(art.attachments[0].src, false)
    });

    preview.imageFull = this.canvas.display.image({
      x: this.canvas.width / 2,
      y: this.canvas.height / 2,
      origin: {x: "center", y: "center"},
      width: (dpi * ratioFull.width),
      height: (dpi * ratioFull.height),
      image: this.assets.getAsset(art.attachments[0].src, false)
    });

    preview.container.addChild(preview.image);

    preview.imageFull.bind("click", function () {
      this.remove();
    });

    preview.image.bind("mouseup", function () {
      if (that.mouseDragging.delta === 0) {
        that.canvas.addChild(that.entities.preview.imageFull);
        that.canvas.redraw();
      }
      that.mouseDragging.delta = 0;
    });

    height += preview.image.height + (dpi * dim.padX);

  }

  preview.message.y = height;
  preview.message.text = wrapText(this.canvas, (dpi * (dim.containerW - 2 * dim.padX)), art.message);

  height += preview.message.height + (dpi * dim.padX);

  preview.container.height = height;
  dim.previewOffsetMin = (dpi * dim.containerH) - height;

  dim.previewOffsetTop = 0;
  sb = that.entities.scrollbars.preview;
  this.updateScrollbar(sb, (height / dpi), dim.containerH, that.artifactsPreviewWrapper, 0);
  that.entities.preview.container.y = 0;

  preview.container.zIndex = "front";

  this.canvas.redraw();

};

Inventory.prototype.createArtifactsPreview = function (w, h, x, y) {

  var that = this,
      dim = this.dim;
  var artifactsScene = this.canvas.scenes.create("artifacts", function () {

    var caption = that.createCaption(w / 4, 20, "ARTIFACTS"),
        container = that.createContainer(x, y, w, h),
        preview, previewContainer;

    container.addChild(caption);
    this.add(container);

    var tilesize = 32,
        artifactsList, bg, text, id, artifact,
        sb,
        onMouseEnterHandler = function (bg) {
          bg.bind("mouseenter", function () {
            if (!that.mouseDragging.artifactsList) {
              this.fill = "#D0D0D0";
              that.canvas.redraw();
            }
          });
        },
        onMouseLeaveHandler = function (bg) {
          bg.bind("mouseleave", function () {
              this.fill = "transparent";
              that.canvas.redraw();
          });
        },
        onMouseClickHandler = function (bg, artifact) {
          bg.bind("mouseup", function () {
            if (that.mouseDragging.delta === 0) {
              that.previewArtifact(artifact);
            }
            that.mouseDragging.delta = 0;
          });
        };

    that.artifactsList = that.createContainer(dim.padX, dim.padY, dim.containerW, dim.containerH);
    that.entities.preview.container = that.createContainer(0, 0, dim.containerW, dim.containerH);
    that.artifactsPreviewWrapper = that.createContainer(dim.containerW + dim.padX * 2, dim.padY, dim.containerW + dim.padX, dim.containerH);
    dim.previewOffsetMax = dim.padY;
    preview = that.entities.preview;
    artifactsList = that.artifactsList;
    previewContainer = preview.container;
    artifactsList.strokePosition = "outside";

    that.entities.scrollbars.artifactsList = that.createScrollbar();
    sb = that.entities.scrollbars.artifactsList;

    count = that.profile.artifacts.length;
    contentHeight = count * that.dim.itemH;
    visibleHeight = that.dim.containerH;
    scrollbarSize = Math.max(visibleHeight * (visibleHeight / contentHeight), 20);

    artifactsList.addChild(that.entities.scrollbars.artifactsList.bg);
    artifactsList.addChild(that.entities.scrollbars.artifactsList.scrollbar);

    that.updateScrollbar(sb, contentHeight, visibleHeight, artifactsList, 0);

    that.entities.scrollbars.artifactsList.scrollbar.bind("mouseenter", function () {
    	that.canvas.mouse.cursor("all-scroll");
    }).bind("mouseleave", function () {
    	that.canvas.mouse.cursor("default");
    }).bind("mousedown", function () {
      that.mouseDragging.artifactsList = true;
    });

    for (var i = that.profile.artifacts.length - 1; i >= 0; i--) {
      id = that.profile.artifacts[i];
      artifact = that.GAME_DATA.artifacts[id];
      bg = that.canvas.display.rectangle({
        width: (dpi * dim.itemW),
        height: (dpi * dim.itemH)
      });
      text = that.canvas.display.text({
        y: (dpi * (dim.itemH / 2)),
        origin: {x: "left", y: "center"},
        font: (dpi * 12) + "px Lato",
        fill: "black",
        text: wrapText(that.canvas, (dpi * (dim.itemW - dim.padX)), artifact.name).replace(/\n.*/, "...").split("\n")[0]
      });

      bg.addChild(text);
      onMouseEnterHandler(bg);
      onMouseLeaveHandler(bg);
      onMouseClickHandler(bg, artifact);
      that.entities.artifacts[id] = bg;
    }

    // ARTIFACTS PREVIEW
    // =================

    that.entities.scrollbars.preview = that.createScrollbar();
    sb = that.entities.scrollbars.preview;

    that.artifactsPreviewWrapper.addChild(sb.bg);
    that.artifactsPreviewWrapper.addChild(sb.scrollbar);

    that.entities.scrollbars.preview.scrollbar.bind("mouseenter", function () {
      that.canvas.mouse.cursor("all-scroll");
    }).bind("mouseleave", function () {
      that.canvas.mouse.cursor("default");
    }).bind("mousedown", function () {
      that.mouseDragging.artifactsPreview = true;
    });

    preview.title = that.canvas.display.text({
      x: (dpi * dim.padX),
      font: (dpi * 12) + "px Lato",
      fill: "black"
    });

    preview.year = preview.title.clone();

    preview.emotionsContainer = that.canvas.display.rectangle({
      x: (dpi * dim.padX),
      width: (dpi * (dim.containerW - 2 * dim.padX)),
      height: (dpi * 35),
      origin: {x: "left", y: "center"}
    });

    var labelW = preview.emotionsContainer.width / 3 - (dpi * 2),
        labelH = (dpi * 15);

    preview.angerBG = that.canvas.display.rectangle({
      width: labelW,
      height: labelH,
      stroke: (dpi * 1) + "px transparent",
      strokePosition: "inside",
    	join: "round"
    });

    preview.disgustBG = preview.angerBG.clone({
      x: preview.emotionsContainer.width / 2 - labelW / 2,
    });
    preview.fearBG = preview.angerBG.clone({
      x: preview.emotionsContainer.width - labelW,
    });
    preview.happinessBG = preview.angerBG.clone({
      y: labelH + (dpi * 5),

    });
    preview.sadnessBG = preview.disgustBG.clone({
      y: labelH + (dpi * 5),

    });
    preview.surpriseBG = preview.fearBG.clone({
      y: labelH + (dpi * 5),

    });

    preview.anger = that.canvas.display.text({
      x: preview.angerBG.width / 2,
      y: preview.angerBG.height / 2,
      font: (dpi * 9) + "px Lato",
      text: "ANGER",
      origin: {x: "center", y: "center"}
    });

    preview.angerBG.addChild(preview.anger);

    preview.disgust = preview.anger.clone({
      text: "DISGUST"
    });

    preview.disgustBG.addChild(preview.disgust);


    preview.fear = preview.anger.clone({
      text: "FEAR"
    });

    preview.fearBG.addChild(preview.fear);

    preview.happiness = preview.anger.clone({
      text: "HAPPINESS",
    });

    preview.happinessBG.addChild(preview.happiness);

    preview.sadness = preview.anger.clone({
      text: "SADNESS"
    });

    preview.sadnessBG.addChild(preview.sadness);

    preview.surprise = preview.anger.clone({
      text: "SURPRISE"
    });

    preview.surpriseBG.addChild(preview.surprise);

    preview.emotionsContainer.addChild(preview.angerBG);
    preview.emotionsContainer.addChild(preview.disgustBG);
    preview.emotionsContainer.addChild(preview.fearBG);
    preview.emotionsContainer.addChild(preview.happinessBG);
    preview.emotionsContainer.addChild(preview.sadnessBG);
    preview.emotionsContainer.addChild(preview.surpriseBG);



    preview.message = preview.title.clone({
      font: (dpi * 12) + "px Lato",
      lineHeight: (dpi * 16) + "px",
      fill: "#777"
    });

    var selectText = that.canvas.display.text({
      x: (dpi * dim.containerW) / 2,
      y: (dpi * dim.containerH) / 2,
      origin: {x: "center", y: "center"},
      text: "Select an artifact for preview.",
      font: (dpi * 12) + "px Lato",
      fill: "black"
    });

    previewContainer.addChild(preview.title);
    previewContainer.addChild(preview.year);
    previewContainer.addChild(preview.emotionsContainer);
    previewContainer.addChild(preview.message);

    that.updateScrollbar(sb, 0, dim.containerH, that.artifactsPreviewWrapper, 0);

    that.artifactsPreviewWrapper.clipChildren = true;
    selectText.zIndex = "front";
    that.artifactsPreviewWrapper.addChild(preview.container);
    that.artifactsPreviewWrapper.addChild(selectText);

    container.addChild(artifactsList);
    container.addChild(that.artifactsPreviewWrapper);

  });

};

Inventory.prototype.createTileFrame = function (x, y) {
  return this.canvas.display.rectangle({
    x: (dpi * x),
    y: (dpi * y),
    width: (dpi * 32),
    height: (dpi * 32),
    fill: "rgba(0, 0, 0, 0.1)",
    stroke: (dpi * 1) + "px #CCC",
    strokePosition: "inside",
    zIndex: 3
  });
};

Inventory.prototype.createShop = function (w, h, x, y) {
  var that = this,
      dim = this.dim;
  var shopScene = this.canvas.scenes.create("shop", function () {

    var caption = that.createCaption(w / 4, 20, "SHOP"),
        statsCaption = that.createCaption(w - w / 4 , 20, "STATS"),
        installedCaption = that.createCaption(w - w / 4, -1, "INSTALLED"),
        container = that.createContainer(x, y, w, h);

    var tilesize = 32,
        i = 0,
        row, col, tx, ty, _item, frame, framesContainer = [],
        itemsCols = 6,
        itemsRows = 10,
        pad = 3,
        ch = 0,
        cw = 0,
        shopContainer, installedContainer,
        mouseOverInstalled = false,
        bg, name, price, bonusCaption, bonus, description, dragging = false,
        setDblClick = function (sprite, item, action) {
          sprite.bind("dblclick", function () {
            var id = item.id;
            if (action === "INSTALL") {

              var msg = that.profile.install(id);
              if (msg === "INSTALLED") {

                var i = that.profile.installed.length - 1,
                    col = i % itemsCols,
                    row = ~~(i / itemsCols),
                    x = col * (dpi * dim.tilesize) + col * (dpi * pad),
                    y = row * (dpi * dim.tilesize) + row * (dpi * pad),
                    _item;

                _item = new Item(that.GAME_DATA.items[id], that.sprites.items[id].sprite);
                _item.sprite.x = this.abs_x - installedContainer.abs_x - 10;
                _item.sprite.y = this.abs_y - installedContainer.abs_y;
                setDblClick(_item.sprite, _item, "UNINSTALL");
                onMouseEnterHandler(_item, framesContainer[i], installedContainer, "INSTALLED");
                onMouseLeaveHandler(_item, framesContainer[i]);
                installedContainer.addChild(_item.sprite);

                _item.sprite.animate({
                  x: x,
                  y: y
                }, {
                  easing: "ease-out-quart",
                  duration: 1500,
                  callback: function () {
                    that.refreshStats();
                  }
                });

                that.profile.refresh = true;
                that.profile.refreshBonuses();
                that.profile.sp -= item.price;
                that.refreshStatusBar();

              } else {
                var text, obj;
                if (msg === "FULL") {
                  text = "No more space for a new gear.";
                } else if (msg === "ALREADY_INSTALLED") {
                  text = "Already copped that.";
                } else if (msg === "NOT_ENOUGH_MONEY") {
                  text = "Too pricey.";
                } else if (msg === "TYPE_ALREADY_INSTALLED") {
                  text = "This item type is already installed.";
                }

                obj = that.canvas.display.text({
                  x: that.canvas.width / 2,
                  y: (dpi * 50),
                  origin: {x: "center", y: "center"},
                  font: (dpi * 16) + "px Lato",
                  text: text,
                  fill: "#2D2D2D"
                });

                that.canvas.addChild(obj);
                obj.fadeOut("slow", "ease-in-quint", function () {
                  this.remove();
                });
              }

            } else if (action === "UNINSTALL") {
              if (that.profile.uninstall(id)) {
                if (item.type === "repair") {
                  that.profile.heal(item.bonus.repair);
                }
                that.profile.refresh = true;
                that.profile.refreshBonuses();
                this.fadeOut(1000, "linear", function () {
                  this.remove();
                  this.trigger("mouseleave");
                  that.refreshStats();
                });
                that.canvas.redraw();
              }
            }
          });
        },
        setDragAndDrop = function (sprite, prevX, prevY, id) {
          sprite.dragAndDrop({
            bubble: false,
            changeZindex: true,
            start: function () {
              frame.strokeColor = "#CCC";
              bg.remove();
              dragging = true;
            },
            end: function () {
              dragging = false;
              this.stop().animate({
                x: prevX,
                y: prevY
              }, {
                easing: "ease-out-quart",
                duration: 1000
              });
            }
          });
        },
        onMouseEnterHandler = function (item, frame, container, type) {
          item.sprite.bind("mouseenter", function () {
            if (!dragging) {
              var bonuses = "",
                  bgHeight = 0, bgWidth = 0;

              frame.strokeColor = "#777";

              name.text = item.name + " (" + item.type.capitalize() + ")";
              name.y = (dpi * pad);
              bgWidth = Math.max(bgWidth, name.width);
              bgHeight += name.height + (dpi * pad);

              if (type === "SHOP") {
                price.text = "Price : " + item.price;
                price.y = bgHeight + (dpi * pad);
                price.fill = "white";
                bgWidth = Math.max(bgWidth, price.width);
                bgHeight += price.height + (dpi * pad);
              } else if (type === "INSTALLED") {
                price.fill = "transparent";
              }

              bonusCaption.y = bgHeight + (dpi * pad);
              bgWidth = Math.max(bgWidth, bonusCaption.width);
              bgHeight += bonusCaption.height + (dpi * pad);

              for (var prop in item.bonus) {
                if (item.bonus.hasOwnProperty(prop)) {
                  bonuses += prop.capitalize() + " : " + item.bonus[prop] + "\n";
                }
              }

              bonus.text = bonuses.slice(0, -1); // get rid of last \n
              bonus.y = bgHeight + (dpi * pad);
              bgWidth = Math.max(bgWidth, bonus.width);
              bgHeight += bonus.height + (dpi * pad);

              description.text = wrapText(that.canvas, Math.max(bgWidth, (dpi * 200)), item.description);
              description.y = bgHeight + (dpi * pad);
              bgWidth = Math.max(bgWidth, description.width);
              bgHeight += description.height + (dpi * (pad * 2));

              bg.width = bgWidth + (dpi * (pad * 4));
              bg.height = bgHeight;
              bg.x = item.sprite.x;
              bg.y = item.sprite.y - (dpi * 1) - bgHeight;

              bg.zIndex = "front";
              container.addChild(bg);

              if (bg.abs_y < 0) {
                bg.y = item.sprite.y + (dpi * (tilesize + 1));
              }

              if (bg.abs_x + bg.width > that.canvas.width) {
                bg.x -= (bg.width - (dpi * dim.tilesize));
              }

              that.canvas.redraw();
            }
          });
        },
        onMouseLeaveHandler = function (item, frame) {
          item.sprite.bind("mouseleave", function () {
            frame.strokeColor = "#CCC";
            bg.remove();
          });
        };

    shopContainer = that.createContainer(dim.padX, dim.padY, itemsCols * dim.tilesize + (itemsCols - 1) * pad, itemsRows * dim.tilesize + (itemsRows - 1) * pad);

    bg = that.canvas.display.rectangle({
      x: (dpi * dim.offsetX),
      origin: { x: "left", y: "top" },
      fill: "rgba(0, 0, 0, 0.9)"
    });

    name = that.canvas.display.text({
      x: (dpi * 6),
      y: (dpi * pad),
    	origin: { x: "left", y: "top" },
    	font: (dpi * 12) + "px Lato",
      lineHeight: 1,
    	fill: "white"
    });

    price = name.clone({
    });

    bonusCaption = name.clone({
      text: "<Bonus>"
    });

    bonus = name.clone({
      lineHeight: (dpi * (12 + pad)) + "px",
      fill: "#FFF000"
    });

    description = name.clone({
      lineHeight: (dpi * 14) + "px",
    });

    bg.addChild(description);
    bg.addChild(bonus);
    bg.addChild(bonusCaption);
    bg.addChild(price);
    bg.addChild(name);

    // SHOP
    // ====

    for (var id in that.GAME_DATA.items) {
      row = ~~(i / itemsCols);
      col = i % itemsCols;
      x = col * tilesize + (col * pad);
      y = row * tilesize + (row * pad);
      frame = that.createTileFrame(x, y);
      _item = new Item(that.GAME_DATA.items[id], that.sprites.items[id].sprite);
      _item.sprite.x = (dpi * x);
      _item.sprite.y = (dpi * y);
      setDragAndDrop(_item.sprite, (dpi * x), (dpi * y), id);
      setDblClick(_item.sprite, _item, "INSTALL");
      onMouseEnterHandler(_item, frame, shopContainer, "SHOP");
      onMouseLeaveHandler(_item, frame);
      shopContainer.addChild(frame);
      shopContainer.addChild(_item.sprite);
      i += 1;
    }

    for (; i < itemsCols * itemsRows; i++) {
      row = ~~(i / itemsCols);
      col = i % itemsCols;
      x = col * tilesize + (col * pad);
      y = row * tilesize + (row * pad);
      frame = that.createTileFrame(x, y);
      shopContainer.addChild(frame);
    }

    // STATS
    // =====

    statsContainer = that.createContainer(w / 2 + dim.padX, dim.padY, dim.containerW, dim.containerH / 2);

    that.entities.stats = that.canvas.display.text({
      x: statsContainer.width / 2,
      y: 0,
      font: (dpi * 12) + "px Lato",
      lineHeight: (dpi * 22) + "px",
      align: "center",
      fill: "#404040",
      origin: {x: "center", y: "top"}
    });

    that.refreshStats();

    statsContainer.addChild(that.entities.stats);

    // INSTALLED
    // =========

    itemsRows = 3;
    installedContainer = that.createContainer(w / 2 + dim.padX, h / 2 + dim.padY, itemsCols * dim.tilesize + (itemsCols - 1) * pad, itemsRows * dim.tilesize + (itemsRows - 1) * pad);

    installedContainer.bind("mousemove", function () {
      mouseOverInstalled = true;
    }).bind("mouseleave", function () {
      mouseOverInstalled = false;
    });

    for (i = 0; i < that.profile.installed.length; i++) {
      id = that.profile.installed[i];
      row = ~~(i / itemsCols);
      col = i % itemsCols;
      x = col * tilesize + (col * pad);
      y = row * tilesize + (row * pad);
      frame = that.createTileFrame(x, y);
      framesContainer.push(frame);
      _item = new Item(that.GAME_DATA.items[id], that.sprites.items[id].sprite);
      _item.sprite.x = (dpi * x);
      _item.sprite.y = (dpi * y);
      setDblClick(_item.sprite, _item, "UNINSTALL");
      onMouseEnterHandler(_item, frame, installedContainer, "INSTALLED");
      onMouseLeaveHandler(_item, frame);
      installedContainer.addChild(frame);
      installedContainer.addChild(_item.sprite);
    }

    for (; i < itemsCols * itemsRows; i++) {
      row = ~~(i / itemsCols);
      col = i % itemsCols;
      x = col * tilesize + (col * pad);
      y = row * tilesize + (row * pad);
      frame = that.createTileFrame(x, y);
      framesContainer.push(frame);
      installedContainer.addChild(frame);
    }

    that.profile.MAX_INSTALLED = i;

    installedContainer.y = shopContainer.height + (dpi * dim.padY) - installedContainer.height;
    installedCaption.y = installedContainer.y - 20;

    container.addChild(caption);
    container.addChild(statsCaption);
    container.addChild(installedCaption);
    container.addChild(statsContainer);
    container.addChild(shopContainer);
    container.addChild(installedContainer);
    this.add(container);

  });

};
