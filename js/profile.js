/**
* Creates an instance of Profile.
*
* @constructor
* @this {Profile}
* @param {} x ...
*/

function Profile(game_data, name) {

  this.name = name; // profile name represented as id
  this.GAME_DATA = game_data;
  this.karel = this.GAME_DATA.robots.player.karel;
  this.MAX_INSTALLED = -1;
  this.refresh = false;
  this.openedInventory = false;

  this.reset();
  this.load();

}

Profile.prototype.install = function (id) {
  if (this.installed.length >= this.MAX_INSTALLED) {
    return "FULL";
  } else if (this.GAME_DATA.items[id].price > this.sp) {
    return "NOT_ENOUGH_MONEY";
  } else {
    if (this.installed.indexOf(id) === -1) {
      var type = this.GAME_DATA.items[id].type;
      for (var i = 0; i < this.installed.length; i++) {
        if (this.GAME_DATA.items[this.installed[i]].type === type) {
          return "TYPE_ALREADY_INSTALLED";
        }
      }
      this.installed.push(id);
      return "INSTALLED";
    } else {
      return "ALREADY_INSTALLED";
    }
  }
};

Profile.prototype.uninstall = function (id) {
  var index = this.installed.indexOf(id);
  if (index > -1) {
    this.installed.splice(index, 1);
    return true;
  } else {
    return false;
  }
};

Profile.prototype.hasArtifact = function (id) {
  var index = this.artifacts.indexOf(id);
  if (index > -1) {
    return true;
  } else {
    return false;
  }
};

Profile.prototype.addArtifact = function (id) {
  if (!this.hasArtifact(id)) {
    this.artifacts.push(id);
    var emotions = this.GAME_DATA.artifacts[id].emotions;
    for (var emotion in emotions) {
      if (emotions[emotion]) {
        this.emotions[emotion] += 1;
      }
    }
  }
};

Profile.prototype.saidThat = function (id) {
  if (this.messagesSpoken.indexOf(id) > -1) {
    return true;
  } else return false;
};

Profile.prototype.canSayThat = function (id) {
  var msg = this.GAME_DATA.messages[id],
      tolerance = 0.15;
  for (var emotion in msg.emotions) {
    if (msg.emotions.hasOwnProperty(emotion)) {
      if (msg.emotions[emotion] > (this.emotions[emotion] / this.totalEmotions[emotion]) + tolerance) {
        return false;
      }
    }
  }
  return true;
};

Profile.prototype.hasSomethingToSay = function () {
  if (this.messagesSpoken.length < Object.keys(this.GAME_DATA.messages).length) {
    return true;
  } else return false;
};

Profile.prototype.cheating = function () {
  for (var artifact in this.GAME_DATA.artifacts) {
    if (this.GAME_DATA.artifacts.hasOwnProperty(artifact) && !this.hasArtifact(artifact)) {
      this.artifacts.push(artifact);
    }
  }

  this.sp += 5000;
};

Profile.prototype.heal = function (hp) {
  this.hp = Math.min(this.getFullHP(), (this.hp += hp));
};

Profile.prototype.injured = function (hp) {
  this.hp -= hp;
  if (this.hp <= 0) {
    this.hp = 0;
    return true;
  } else { return false; }
};

Profile.prototype.addSP = function (sp) {
  this.sp += randBetween(sp[0], sp[1]);
};

Profile.prototype.getFullHP = function () {
  return this.karel.hp + this.bonuses.hp;
};

Profile.prototype.getHP = function () {
  return this.hp;
};

Profile.prototype.getAttackPower = function () {
  return this.karel.attack + this.bonuses.attack;
};

Profile.prototype.getDefense = function () {
  return this.karel.defense + this.bonuses.defense;
};

Profile.prototype.reset = function () {
  this.bonuses = {
    hp: 0,
    attack: 0,
    defense: 0,
    speed: 0,
    attack_speed: 0,
    bullet_speed: 0
  };
  this.hp = this.karel.hp;
  this.sp = 0;
  this.artifacts = [];
  this.emotions = {
    "anger": 0,
    "disgust": 0,
    "fear": 0,
    "happiness": 0,
    "sadness": 0,
    "surprise": 0,
  };
  this.messagesSpoken = [];
  this.installed = [];
  this.levelsCompleted = [];
};

Profile.prototype.load = function () {
  this.sp = localStorage.getObj(this.name + "_sp") || 0;
  this.artifacts = localStorage.getObj(this.name + "_artifacts") || [];
  this.messagesSpoken = localStorage.getObj(this.name + "_messagesSpoken") || [];
  this.installed = localStorage.getObj(this.name + "_installed") || [];
  this.levelsCompleted = localStorage.getObj(this.name + "_levelsCompleted") || [];

  this.refreshBonuses();
  this.calcEmotions();

  this.hp = localStorage.getObj(this.name + "_hp") || Math.min(this.hp, this.getFullHP());

  this.totalEmotions = {
    "anger": 0,
    "disgust": 0,
    "fear": 0,
    "happiness": 0,
    "sadness": 0,
    "surprise": 0,
  };

  var artifact;
  for (var id in this.GAME_DATA.artifacts) {
    artifact = this.GAME_DATA.artifacts[id];
    for (var emotion in artifact.emotions) {
      if (artifact.emotions[emotion]) {
        this.totalEmotions[emotion] += 1;
      }
    }
  }

};

Profile.prototype.refreshBonuses = function () {
  var bonuses = {
    hp: 0,
    attack: 0,
    defense: 0,
    speed: 0,
    attack_speed: 0,
    bullet_speed: 0
  }, itemBonuses;

  for (i = 0; i < this.installed.length; i++) {
    id = this.installed[i];
    itemBonuses = this.GAME_DATA.items[id].bonus;
    for (var b in itemBonuses) {
      if (itemBonuses.hasOwnProperty(b)) {
        bonuses[b] = itemBonuses[b];
      }
    }
  }

  this.bonuses = bonuses;
  this.hp = Math.min(this.hp, this.getFullHP());
};

Profile.prototype.calcEmotions = function () {
  var artifact;
  for (var i = 0; i < this.artifacts.length; i++) {
    artifact = this.GAME_DATA.artifacts[this.artifacts[i]];
    for (var emotion in artifact.emotions) {
      if (artifact.emotions[emotion]) {
        this.emotions[emotion] += 1;
      }
    }
  }
};

Profile.prototype.save = function () {
  localStorage.setObj(this.name + "_sp", this.sp);
  localStorage.setObj(this.name + "_artifacts", this.artifacts);
  localStorage.setObj(this.name + "_messagesSpoken", this.messagesSpoken);
  localStorage.setObj(this.name + "_installed", this.installed);
  localStorage.setObj(this.name + "_levelsCompleted", this.levelsCompleted);
  localStorage.setObj(this.name + "_hp", this.hp);
};
