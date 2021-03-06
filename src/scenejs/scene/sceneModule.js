/**
 * Backend for a scene node.
 *  @private
 */
var SceneJS_sceneModule = new (function() {

    var initialised = false; // True as soon as first scene registered
    this.scenes = {};
    this.nScenes = 0;
    this.activeSceneId = null;

    SceneJS_eventModule.addListener(
            SceneJS_eventModule.RESET,
            function() {
                this.scenes = {};
                this.nScenes = 0;
                this.activeSceneId = null;
            });

    /** Locates element in DOM to write logging to
     * @private
     */
    function findLoggingElement(loggingElementId) {
        var element;
        if (!loggingElementId) {
            element = document.getElementById(SceneJS.Scene.DEFAULT_LOGGING_ELEMENT_ID);
            if (!element) {
                SceneJS_loggingModule.info("SceneJS.Scene config 'loggingElementId' omitted and failed to find default logging element with ID '"
                        + SceneJS.Scene.DEFAULT_LOGGING_ELEMENT_ID + "' - that's OK, logging to browser console instead");
            }
        } else {
            element = document.getElementById(loggingElementId);
            if (!element) {
                element = document.getElementById(SceneJS.Scene.DEFAULT_LOGGING_ELEMENT_ID);
                if (!element) {
                    SceneJS_loggingModule.info("SceneJS.Scene config 'loggingElementId' unresolved and failed to find default logging element with ID '"
                            + SceneJS.Scene.DEFAULT_LOGGING_ELEMENT_ID + "' - that's OK, logging to browser console instead");
                } else {
                    SceneJS_loggingModule.info("SceneJS.Scene config 'loggingElementId' unresolved - found default logging element with ID '"
                            + SceneJS.Scene.DEFAULT_LOGGING_ELEMENT_ID + "' - logging to browser console also");
                }
            } else {
                SceneJS_loggingModule.info("SceneJS.Scene logging to element with ID '"
                        + loggingElementId + "' - logging to browser console also");
            }
        }
        return element;
    }

    /** Locates canvas in DOM, finds WebGL context on it,
     *  sets some default state on the context, then returns
     *  canvas, canvas ID and context wrapped up in an object.
     *
     * If canvasId is null, will fall back on SceneJS.Scene.DEFAULT_CANVAS_ID
     * @private
     */
    function findCanvas(canvasId) {
        var canvas;
        if (!canvasId) {
            SceneJS_loggingModule.info("SceneJS.Scene config 'canvasId' omitted - looking for default canvas with ID '"
                    + SceneJS.Scene.DEFAULT_CANVAS_ID + "'");
            canvasId = SceneJS.Scene.DEFAULT_CANVAS_ID;
            canvas = document.getElementById(canvasId);
            if (!canvas) {
                throw SceneJS_errorModule.fatalError(
                        SceneJS.errors.CANVAS_NOT_FOUND,
                        "SceneJS.Scene failed to find default canvas with ID '"
                                + SceneJS.Scene.DEFAULT_CANVAS_ID + "'");
            }
        } else {
            canvas = document.getElementById(canvasId);
            if (!canvas) {
                SceneJS_loggingModule.warn("SceneJS.Scene config 'canvasId' unresolved - looking for default canvas with " +
                                            "ID '" + SceneJS.Scene.DEFAULT_CANVAS_ID + "'");
                canvasId = SceneJS.Scene.DEFAULT_CANVAS_ID;
                canvas = document.getElementById(canvasId);
                if (!canvas) {
                    throw SceneJS_errorModule.fatalError(SceneJS.errors.CANVAS_NOT_FOUND,
                            "SceneJS.Scene config 'canvasId' does not match any elements in the page and no " +
                             "default canvas found with ID '" + SceneJS.Scene.DEFAULT_CANVAS_ID + "'");
                }
            }
        }

        // If the canvas uses css styles to specify the sizes make sure the basic
        // width and height attributes match or the WebGL context will use 300 x 150
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;

        var context;
        var contextNames = SceneJS.SUPPORTED_WEBGL_CONTEXT_NAMES;
        for (var i = 0; (!context) && i < contextNames.length; i++) {
            try {
                if (SceneJS_debugModule.getConfigs("webgl.logTrace") == true) {

                    context = canvas.getContext(contextNames[i] /*, { antialias: true} */);
                    if (context) {
                        // context = WebGLDebugUtils.makeDebugContext(context);

                        context = WebGLDebugUtils.makeDebugContext(
                                context,
                                function(err, functionName, args) {
                                    SceneJS_loggingModule.error(
                                            "WebGL error calling " + functionName +
                                            " on WebGL canvas context - see console log for details");
                                });
                        context.setTracing(true);


                    }
                } else {
                    context = canvas.getContext(contextNames[i]);
                }
            } catch (e) {

            }
        }
        if (!context) {
            throw SceneJS_errorModule.fatalError(
                    SceneJS.errors.WEBGL_NOT_SUPPORTED,
                    'Canvas document element with ID \''
                            + canvasId
                            + '\' failed to provide a supported WebGL context');
        }
        context.clearColor(0.0, 0.0, 0.0, 1.0);
        context.clearDepth(1.0);             
        context.enable(context.DEPTH_TEST);
        context.disable(context.CULL_FACE);
        context.depthRange(0, 1);
        context.disable(context.SCISSOR_TEST);
        return {
            canvas: canvas,
            context: context,
            canvasId : canvasId
        };
    }

    this.createScene = function(scene, params) {
        if (!initialised) {
            SceneJS_loggingModule.info("SceneJS V" + SceneJS.VERSION + " initialised");
            SceneJS_eventModule.fireEvent(SceneJS_eventModule.INIT);
        }
        var canvas = findCanvas(params.canvasId); // canvasId can be null
        var loggingElement = findLoggingElement(params.loggingElementId); // loggingElementId can be null
        var sceneId = params.sceneId;
        var nodeMap = new SceneJS_Map();
        this.scenes[sceneId] = {
            sceneId: sceneId,
            scene:scene,
            canvas: canvas,
            loggingElement: loggingElement,
            nodeMap: nodeMap
        };
        nodeMap.addItem(sceneId, scene.scene);
        this.nScenes++;
        SceneJS_eventModule.fireEvent(SceneJS_eventModule.SCENE_CREATED, { sceneId : sceneId, canvas: canvas });
        SceneJS_loggingModule.info("Scene defined: " + sceneId);
        SceneJS_compileModule.nodeUpdated(scene, "created");
    };

    this.destroyScene = function(sceneId) {
        this.scenes[sceneId] = null;
        this.nScenes--;
        SceneJS_eventModule.fireEvent(SceneJS_eventModule.SCENE_DESTROYED, {sceneId : sceneId });
        if (this.activeSceneId == sceneId) {
            this.activeSceneId = null;
        }
        SceneJS_loggingModule.info("Scene destroyed: " + sceneId);
        if (this.nScenes == 0) {
            SceneJS_loggingModule.info("SceneJS reset");
            SceneJS_eventModule.fireEvent(SceneJS_eventModule.RESET);

        }
    };

    /** Specifies which registered scene is the currently active one
     * @private
     */
    this.activateScene = function(sceneId) {
        var scene = this.scenes[sceneId];
        if (!scene) {
            throw SceneJS_errorModule.fatalError(SceneJS.errors.NODE_NOT_FOUND, "Scene not defined: '" + sceneId + "'");
        }
        this.activeSceneId = sceneId;
        SceneJS_eventModule.fireEvent(SceneJS_eventModule.LOGGING_ELEMENT_ACTIVATED, { loggingElement: scene.loggingElement });
        SceneJS_eventModule.fireEvent(SceneJS_eventModule.SCENE_COMPILING, { sceneId: sceneId, nodeId: sceneId, canvas : scene.canvas });
        SceneJS_eventModule.fireEvent(SceneJS_eventModule.CANVAS_ACTIVATED, scene.canvas);
    };

    /**
     * Fast redraw of scene that has been previously rendered
     *
     * @param sceneId
     */
    this.redrawScene = function(sceneId) {
        var scene = this.scenes[sceneId];
        if (!scene) {
            throw SceneJS_errorModule.fatalError(SceneJS.errors.NODE_NOT_FOUND, "Scene not defined: '" + sceneId + "'");
        }
        SceneJS_eventModule.fireEvent(SceneJS_eventModule.CANVAS_ACTIVATED, scene.canvas);
        SceneJS_renderModule.redraw();
        SceneJS_eventModule.fireEvent(SceneJS_eventModule.CANVAS_DEACTIVATED, scene.canvas);
    };

    /** Returns the canvas element the given scene is bound to
     * @private
     */
    this.getSceneCanvas = function(sceneId) {
        var scene = this.scenes[sceneId];
        if (!scene) {
            throw SceneJS_errorModule.fatalError(SceneJS.errors.NODE_NOT_FOUND, "Scene not defined: '" + sceneId + "'");
        }
        return scene.canvas.canvas;
    };

    /** Returns the webgl context element the given scene is bound to
     * @private
     */
    this.getSceneContext = function(sceneId) {
        var scene = this.scenes[sceneId];
        if (!scene) {
            throw SceneJS_errorModule.fatalError("Scene not defined: '" + sceneId + "'");
        }
        return scene.canvas.context;
    };

    /** Returns all registered scenes
     * @private
     */
    this.getAllScenes = function() {
        var list = [];
        for (var id in this.scenes) {
            var scene = this.scenes[id];
            if (scene) {
                list.push(scene.scene);
            }
        }
        return list;
    };

    /** Finds a registered scene
     * @private
     */
    this.getScene = function(sceneId) {
        return this.scenes[sceneId].scene;
    };

    /** Deactivates the currently active scene and reaps destroyed and timed out processes
     * @private
     */
    this.deactivateScene = function() {
        if (!this.activeSceneId) {
            throw "Internal error: no scene active";
        }
        var sceneId = this.activeSceneId;
        this.activeSceneId = null;
        var scene = this.scenes[sceneId];
        if (!scene) {
            throw SceneJS_errorModule.fatalError(SceneJS.errors.NODE_NOT_FOUND, "Scene not defined: '" + sceneId + "'");
        }
        SceneJS_eventModule.fireEvent(SceneJS_eventModule.CANVAS_DEACTIVATED, scene.canvas);
        SceneJS_eventModule.fireEvent(SceneJS_eventModule.SCENE_COMPILED, {sceneId : sceneId });
    };
})();
