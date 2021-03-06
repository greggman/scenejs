/*
 This example shows how to define and use a GeoStreamService to customize how geometry is loaded, along with a
 MorphGeoService to customize how morph targets are loaded for its animation. We'll just implement a stub of the
 services in this example, which should give you enough clues for define your own implementation.

 Wiki articles:

 http://scenejs.wikispaces.com/GeoLoaderService
 http://scenejs.wikispaces.com/MorphGeoLoaderService

 Lindsay S. Kay,
 lindsay.kay@xeolabs.com

 This example assumes that you have looked at a few of the other examples
 and now have an understanding of concepts such as basic SceneJS syntax,
 lighting, material, data flow etc.
 */

/* Define a stub geometry stream service that just provides a mock "stream" through which a simple cube geometry data
 * is available. We'll reference the stream with a geometry node within our scene graph, further below.
 */

var FIRST_MORPH_KEY = 0;
var LAST_MORPH_KEY = 6;

function MyGeoLoader() {

    this.loadGeometry = function(id, callback) {
        if (id == "my-geo-stream") {
            callback({
                primitive   : "triangles",
                uv          : new Float32Array([  5, 5,0, 5,0, 0, 5, 0,  0, 5,0, 0,5, 0,5, 5,5,0,5, 5,0, 5,0, 0,5,5,0, 5,0, 0,5, 0,0, 0,5,0,5,5,0,5,0,0,5,0,5,5,0,5]),
                uv2         : null,
                indices     : new Int32Array([ 0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 8, 9,10, 8,10,11,12,13,14, 12,14,15,16,17,18,16,18,19,20,21,22,20,22,23])
            });
        } else {
            throw "Can't find geometry stream: '" + id + "'";
        }
    };
}

/* Register the service implementation
 */
SceneJS.Services.addService(SceneJS.Services.GEO_LOADER_SERVICE_ID, new MyGeoLoader());

/* Define a stub morphGeometry stream service that just provides a mock stream through which a simple morph
 * targets data is available. We'll reference the stream with a morphGeometry node within our scene graph, further below.
 */
function MyMorphGeoLoader() {

    this.loadMorphGeometry = function(id, callback) {
        if (id == "my-morph-geo-stream") {
            callback({

                keys: [ FIRST_MORPH_KEY, 3, LAST_MORPH_KEY ], // One for each target

                targets: [

                    /* You can have as many targets as GPU memory will allow
                     */
                    {
                        positions   : new Float32Array(randomize([  5, 5, 5,-5, 5, 5,-5,-5, 5,5,-5, 5,5, 5, 5,5,-5, 5,5,-5,-5,5, 5,-5,5, 5, 5,5, 5,-5,-5, 5,-5,-5, 5, 5, -5, 5, 5,-5, 5,-5,-5,-5,-5,-5,-5, 5,-5,-5,-5,5,-5,-5,5,-5, 5,-5,-5, 5,5,-5,-5,-5,-5,-5,-5, 5,-5, 5, 5,-5])),
                        normals     : new Float32Array([ 0, 0, 1, 0, 0, 1,  0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, -1, 0, 0, -1, 0, 0,-1, 0, 0, -1, 0, 0,  0,-1, 0, 0,-1, 0,  0,-1, 0, 0,-1, 0, 0, 0,-1, 0, 0,-1, 0, 0,-1, 0, 0,-1])
                    },
                    {
                        positions   : new Float32Array(randomize([  15, 5, 5,-5, 5, 5,-5,-5, 15,5,-5, 5,5, 5, 5,5,-5, 5,5,-5,-5,5, 5,-5,5, 5, 5,5, 5,-5,-5, 5,-5,-5, 5, 5, -5, 5, 5,-5, 5,-5,-5,-5,-5,-5,-5, 5,-5,-5,-5,5,-5,-5,5,-5, 5,-5,-5, 5,5,-5,-5,-5,-5,-5,-5, 5,-5, 5, 5,-5])),
                        normals     : new Float32Array([  0, 0, 1, 0, 0, 1,  0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, -1, 0, 0, -1, 0, 0,-1, 0, 0, -1, 0, 0,  0,-1, 0, 0,-1, 0,  0,-1, 0, 0,-1, 0, 0, 0,-1, 0, 0,-1, 0, 0,-1, 0, 0,-1])
                    },
                    {
                        positions   : new Float32Array(randomize([  25, 5, 5,-5, 5, 5,-5,-5, 15,5,-5, 5,5, 5, 5,5,-5, 5,5,-5,-5,5, 5,-5,5, 5, 5,5, 5,-5,-5, 5,-5,-5, 5, 5, -5, 5, 5,-5, 5,-5,-5,-5,-5,-5,-5, 5,-5,-5,-5,5,-5,-5,5,-5, 5,-5,-5, 5,5,-5,-5,-5,-5,-5,-5, 5,-5, 5, 5,-5])),
                        normals     : new Float32Array([  0, 0, 1, 0, 0, 1,  0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, -1, 0, 0, -1, 0, 0,-1, 0, 0, -1, 0, 0,  0,-1, 0, 0,-1, 0,  0,-1, 0, 0,-1, 0, 0, 0,-1, 0, 0,-1, 0, 0,-1, 0, 0,-1])
                    }
                ]
            });
        } else {
            throw "Can't find morphGeometry stream: '" + id + "'";
        }
    };
}

function randomize(arry) {
    for (var i = 0, len = arry.length; i < len; i++) {
        arry[i] += (Math.random() * 4.0) - 2;
    }
    return arry;
}

/* Register the service implementation
 */
SceneJS.Services.addService(SceneJS.Services.MORPH_GEO_LOADER_SERVICE_ID, new MyMorphGeoLoader());


/* Scene graph containing geometry that pulls in the stream
 */
SceneJS.createNode({
    type: "scene",
    id: "the-scene",
    canvasId: "theCanvas",
    loggingElementId: "theLoggingDiv",

    nodes: [
        {
            type: "lookAt",
            eye : { x: 0.0, y: 10.0, z: 55 },
            look : { y:1.0 },
            up : { y: 1.0 },

            nodes: [
                {
                    type: "camera",
                    optics: {
                        type: "perspective",
                        fovy : 25.0,
                        aspect : 1.47,
                        near : 0.10,
                        far : 300.0
                    },

                    nodes: [
                        {
                            type: "light",
                            mode:                   "dir",
                            color:                  { r: 1.0, g: 1.0, b: 1.0 },
                            diffuse:                true,
                            specular:               false,
                            dir:                    { x: 1.0, y: -0.5, z: -1.0 }
                        },
                        {
                            type: "light",
                            mode:                   "dir",
                            color:                  { r: 1.0, g: 1.0, b: 1.0 },
                            diffuse:                true,
                            specular:               false,
                            dir:                    { x: 1.0, y: -1.0, z: -1.0 }
                        },

                        /* Next, modelling transforms to orient our geometry
                         * by a given angles. The rotate nodes have IDs that we'll locate them with below.
                         */
                        {
                            type: "rotate",
                            id: "pitch",
                            angle: 0.0,
                            x : 1.0,

                            nodes: [
                                {
                                    type: "rotate",
                                    id: "yaw",
                                    angle: 0.0,
                                    y : 1.0,

                                    nodes: [
                                        {
                                            type: "material",
                                            baseColor:      { r: 1.0, g: 1.0, b: 1.0 },
                                            
                                            nodes: [
                                                {
                                                    type: "texture",
                                                    layers: [
                                                        {
                                                            uri:"images/BrickWall.jpg",
                                                            blendMode: "multiply",
                                                            scale : {
                                                                x: .1,
                                                                y: .05
                                                            }
                                                        }
                                                    ],

                                                    nodes: [
                                                        {
                                                            type: "morphGeometry",
                                                            id: "my-morph-geometry",

                                                            /* Our MorphGeoLoaderService resolves this to the
                                                             * available stream
                                                             */
                                                            stream: "my-morph-geo-stream",

                                                            nodes: [
                                                                {
                                                                    type: "geometry",

                                                                    /* Our GeoLoaderService resolves this to the
                                                                     * available stream
                                                                     */
                                                                    stream: "my-geo-stream"
                                                                }
                                                            ]
                                                        }
                                                    ]
                                                }
                                            ]
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ]
        }
    ]
});


var yaw = 30;
var pitch = -30;
var lastX;
var lastY;
var dragging = false;

var canvas = document.getElementById("theCanvas");

function mouseDown(event) {
    lastX = event.clientX;
    lastY = event.clientY;
    dragging = true;
}

function mouseUp() {
    dragging = false;
}

/* On a mouse drag, we'll re-render the scene, passing in
 * incremented angles in each time.
 */
function mouseMove(event) {
    if (dragging) {
        yaw += (event.clientX - lastX) * 0.5;
        pitch += (event.clientY - lastY) * -0.5;

        lastX = event.clientX;
        lastY = event.clientY;
    }
}

canvas.addEventListener('mousedown', mouseDown, true);
canvas.addEventListener('mousemove', mouseMove, true);
canvas.addEventListener('mouseup', mouseUp, true);


/* On a mouse drag, we'll re-render the scene, passing in
 * incremented angles in each time.
 */
function mouseMove(event) {
    if (dragging) {
        yaw += (event.clientX - lastX) * 0.5;
        pitch += (event.clientY - lastY) * -0.5;

        lastX = event.clientX;
        lastY = event.clientY;

        SceneJS.withNode("pitch").set("angle", pitch);
        SceneJS.withNode("yaw").set("angle", yaw);
    }
}

canvas.addEventListener('mousedown', mouseDown, true);
canvas.addEventListener('mousemove', mouseMove, true);
canvas.addEventListener('mouseup', mouseUp, true);


/* Run the scene, cycling the morphGeometry through it's keys:
 */
var factor = FIRST_MORPH_KEY;

SceneJS.withNode("the-scene").start({
    idleFunc: function() {
        if (SceneJS.nodeExists("my-morph-geometry")) {
            SceneJS.withNode("my-morph-geometry").set("factor", factor);
            factor += 0.1;
            if (factor > LAST_MORPH_KEY) {
                factor = FIRST_MORPH_KEY;
            }
        }
    }
});










