var RectTileLayer = require('./RectTileLayer');

function CompositeRectTileLayer() {
    PIXI.Container.apply(this, arguments);
    this.initialize.apply(this, arguments);
}

CompositeRectTileLayer.prototype = Object.create(PIXI.Container.prototype);
CompositeRectTileLayer.prototype.constructor = RectTileLayer;
CompositeRectTileLayer.prototype.updateTransform = CompositeRectTileLayer.prototype.displayObjectUpdateTransform;

//can be initialized multiple times
CompositeRectTileLayer.prototype.initialize = function(zIndex, bitmaps, useSquare) {
    this.z = this.zIndex = zIndex;
    this.useSquare = useSquare;
    if (bitmaps) {
        this.setBitmaps(bitmaps);
    }
};

CompositeRectTileLayer.prototype.setBitmaps = function(bitmaps) {
    this.removeChildren();
    for (var i=0;i<bitmaps.length;i++)
        this.addChild(new RectTileLayer(this.zIndex, bitmaps[i]));
    this.modificationMarker = 0;
};

CompositeRectTileLayer.prototype.clear = function () {
    for (var i=0;i<this.children.length;i++)
        this.children[i].clear();
    this.modificationMarker = 0;
};

CompositeRectTileLayer.prototype.addRect = function (num, u, v, x, y, tileWidth, tileHeight) {
    if (this.children[num] && this.children[num].texture)
        this.children[num].addRect(u, v, x, y, tileWidth, tileHeight);
};

/**
 * "hello world!" of pixi-tilemap library. Pass it texture and it will be added
 * @param texture
 * @param x
 * @param y
 * @returns {boolean}
 */
CompositeRectTileLayer.prototype.addFrame = function (texture, x, y) {
    if (typeof texture === "string") {
        texture = PIXI.Texture.fromImage(texture);
    }
    var children = this.children;
    var layer = null;
    for (var i=0;i<children.length; i++) {
        if (children[i].texture.baseTexture == texture.baseTexture) {
            layer = children[i];
            break;
        }
    }
    if (!layer) {
        children.push(layer = new RectTileLayer(this.zIndex, texture));
    }
    layer.addRect(texture.frame.x, texture.frame.y, x, y, texture.frame.width, texture.frame.height);
    return true;
};

CompositeRectTileLayer.prototype.renderCanvas = function (renderer) {
    if (!renderer.dontUseTransform) {
        var wt = this.worldTransform;
        renderer.context.setTransform(
            wt.a,
            wt.b,
            wt.c,
            wt.d,
            wt.tx * renderer.resolution,
            wt.ty * renderer.resolution
        );
    }
    var layers = this.children;
    for (var i = 0; i < layers.length; i++)
        layers[i].renderCanvas(renderer);
};


CompositeRectTileLayer.prototype.renderWebGL = function(renderer) {
    var gl = renderer.gl;
    var shader = renderer.plugins.tile.getShader(this.useSquare);
    renderer.setObjectRenderer(renderer.plugins.tile);
    renderer.bindShader(shader);
    //TODO: dont create new array, please
    this._globalMat = this._globalMat || new PIXI.Matrix();
    renderer._activeRenderTarget.projectionMatrix.copy(this._globalMat).append(this.worldTransform);
    shader.uniforms.projectionMatrix = this._globalMat.toArray(true);
    if (this.useSquare) {
        var tempScale = this._tempScale = (this._tempScale || [0, 0]);
        tempScale[0] = this._globalMat.a >= 0?1:-1;
        tempScale[1] = this._globalMat.d < 0?1:-1;
        var ps = shader.uniforms.pointScale = tempScale;
        shader.uniforms.projectionScale = Math.abs(this.worldTransform.a) * renderer.resolution;
    }
    var af = shader.uniforms.animationFrame = renderer.plugins.tile.tileAnim;
    //shader.syncUniform(shader.uniforms.animationFrame);
    var layers = this.children;
    for (var i = 0; i < layers.length; i++)
        layers[i].renderWebGL(renderer, this.useSquare);
};


CompositeRectTileLayer.prototype.isModified = function(anim) {
    var layers = this.children;
    if (this.modificationMarker != layers.length) {
        return true;
    }
    for (var i=0;i<layers.length;i++) {
        if (layers[i].modificationMarker != layers[i].pointsBuf.length ||
            anim && layers[i].hasAnim) {
            return true;
        }
    }
    return false;
};

CompositeRectTileLayer.prototype.clearModify = function() {
    var layers = this.children;
    this.modificationMarker = layers.length;
    for (var i = 0; i < layers.length; i++) {
        layers[i].modificationMarker = layers[i].pointsBuf.length;
    }
};

module.exports = CompositeRectTileLayer;
