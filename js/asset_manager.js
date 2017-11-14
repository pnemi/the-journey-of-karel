function AssetManager() {
  this.successCount = 0;
  this.errorCount = 0;
  this.cache = {};
  this.downloadQueue = [];
}

AssetManager.prototype.queueDownload = function(path, highres) {
  var src = (highres) ? getHighResImageSrc(path) : path;
  this.downloadQueue.push(src);
};

AssetManager.prototype.downloadAll = function(downloadCallback) {
  if (this.downloadQueue.length === 0) {
    downloadCallback();
    return;
  }

  function addLoadHandler(img) {
    img.addEventListener("load", function() {
      that.successCount += 1;
      if (that.isDone()) downloadCallback();
    }, false);
  }

  function addErrorHandler(img) {
    img.addEventListener("error", function() {
      that.errorCount += 1;
      console.log(this.src + " has encountered an error");
      if (that.isDone()) downloadCallback();
    }, false);
  }

  for (var i = 0; i < this.downloadQueue.length; i++) {
    var path = this.downloadQueue[i];
    var img = new Image();
    var that = this;
    addLoadHandler(img);
    addErrorHandler(img);
    img.src = path;
    this.cache[path] = img;
  }
};

AssetManager.prototype.getAsset = function(path, highres) {
  var src = (highres) ? getHighResImageSrc(path) : path;
  return this.cache[src];
};

AssetManager.prototype.isDone = function() {
  return (this.downloadQueue.length == this.successCount + this.errorCount);
};
