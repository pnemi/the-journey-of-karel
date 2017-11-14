function Quadtree(pLevel, pBounds) {

  this.MAX_OBJECTS = 5; // max objects a single node can hold
  this.MAX_LEVELS = 4; // deepest level subnode

  this.level = pLevel; // current node level
  this.objects = [];
  this.bounds = pBounds; // AABB() 2D space node occupies
  this.nodes = [];

}

Quadtree.prototype.clear = function () {
  this.objects = [];
  this.nodes = [];
};

/**
 * Splits the node into 4 subnodes
 */
Quadtree.prototype.split = function () {
  var subWidth = ~~(this.bounds.w / 2),
      subHeight = ~~(this.bounds.h / 2),
      x = ~~(this.bounds.x),
      y = ~~(this.bounds.y);

  this.nodes[0] = new Quadtree(this.level + 1, new AABB(x + subWidth, y, subWidth, subHeight));
  this.nodes[1] = new Quadtree(this.level + 1, new AABB(x, y, subWidth, subHeight));
  this.nodes[2] = new Quadtree(this.level + 1, new AABB(x, y + subHeight, subWidth, subHeight));
  this.nodes[3] = new Quadtree(this.level + 1, new AABB(x + subWidth, y + subHeight, subWidth, subHeight));
};

/**
 * Determine which node the object belongs to. -1 means
 * object cannot completely fit within a child node and is part
 * of the parent node
 * @param  {[type]} pRect [description]
 * @return {[type]}       [description]
 */
Quadtree.prototype.getIndex = function (collider) {
  var index = -1,
      colliderBounds = collider.getAABB(),
      verticalMidpoint = this.bounds.x + (this.bounds.w / 2),
      horizontalMidpoint = this.bounds.y + (this.bounds.h / 2),
      // completely fit within the top quadrants
      topQuadrant = (colliderBounds.y < horizontalMidpoint && colliderBounds.y + colliderBounds.h < horizontalMidpoint),
      // completely fit within the bottom quadrants
      bottomQuadrant = (colliderBounds.y > horizontalMidpoint);


  // completely fit within the left quadrants
  if (colliderBounds.x < verticalMidpoint && colliderBounds.x + colliderBounds.w < verticalMidpoint) {
    if (topQuadrant) {
      index = 1;
    }
    else if (bottomQuadrant) {
      index = 2;
    }
  }

  // completely fit within the right quadrants
  else if (colliderBounds.x > verticalMidpoint) {
    if (topQuadrant) {
      index = 0;
    }
    else if (bottomQuadrant) {
      index = 3;
    }
  }

  return index;
};

/**
* Insert the object into the quadtree. If the node
* exceeds the capacity, it will split and add all
* objects to their corresponding nodes.
* @param  {[type]} Rectangle pRect         [description]
* @return {[type]}           [description]
*/
Quadtree.prototype.insert = function (collider) {
  var index,
      i = 0;
  if (typeof this.nodes[0] !== "undefined") {
    index = this.getIndex(collider);

    if (index !== -1) {
      this.nodes[index].insert(collider);
      return;
    }
  }

  this.objects.push(collider);

  if (this.objects.length > this.MAX_OBJECTS && this.level < this.MAX_LEVELS) {
    if (typeof this.nodes[0] === "undefined") {
      this.split();
    }

    while (i < this.objects.length) {
      index = this.getIndex(this.objects[i]);
      if (index !== -1) {
        // this.nodes[index].insert(this.objects[i]);
        // this.objects.splice(i, 1);
        this.nodes[index].insert( this.objects.splice(i, 1)[0] );
      }

      else {
        i++;
      }
    }
  }
};

/*
* Return all objects that could collide with the given object
*/
Quadtree.prototype.retrieve = function (collider) {

  var index = this.getIndex(collider),
      returnObjects = this.objects;

  // check subnodes
  if (typeof this.nodes[0] !== "undefined") {

    // if collider fits into a subnode
    if (index !== -1) {
      returnObjects = returnObjects.concat(this.nodes[index].retrieve(collider));
    } else {
      // if collider does not fit into a subnode, check it against all subnodes
      for (var i = 0; i < this.nodes.length; i++) {
        returnObjects = returnObjects.concat(this.nodes[i].retrieve(collider));
      }
    }
  }

  return returnObjects;

};
