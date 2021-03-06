SceneJS.ImageBuf = SceneJS.createNodeType("imageBuf");

// @private
SceneJS.ImageBuf.prototype._init = function(params) {
};

// @private
SceneJS.ImageBuf.prototype._compile = function(traversalContext) {
    this._preCompile(traversalContext);
    this._compileNodes(traversalContext);
    this._postCompile(traversalContext);
};

// @private
SceneJS.ImageBuf.prototype._preCompile = function(traversalContext) {
    if (!this._bufId) {
        this._bufId = SceneJS_imageBufModule.createImageBuffer(this._attr.id);
    }
    SceneJS_imageBufModule.pushImageBuffer(this._attr.id, this._bufId);
};

// @private
SceneJS.ImageBuf.prototype._postCompile = function(traversalContext) {
    SceneJS_imageBufModule.popImageBuffer();
};

/**
 * Destroys image buffer when this node is destroyed
 * @private
 */
SceneJS.ImageBuf.prototype._destroy = function() {
    if (this._bufId) {
        SceneJS_imageBufModule.destroyImageBuffer(this._bufId);
        this._bufId = null;
    }
};