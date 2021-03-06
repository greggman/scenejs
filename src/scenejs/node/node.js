/**
 * @class The basic scene node type, providing the ability to connect nodes into parent-child relationships to form scene graphs
 */
SceneJS.Node = function(cfg, scene) {

    /* Public properties are stored on the _attr map
     */
    this._attr = {};
    this._attr.nodeType = "node";
    this._attr.sid = null;
    this._attr.flags = null;     // Fast to detect that we have no flags and then bypass processing them
    this._attr.data = {};

    if (cfg) {
        this._attr.id = cfg.id;
        this._attr.layer = cfg.layer;
        this._attr.data = cfg.data;
        this._attr.flags = cfg.flags;
        this._attr.enabled = cfg.enabled === false ? false : true;
        this._attr.sid = cfg.sid;
        this._attr.info = cfg.info;
        this._scene = scene || this;
    }

    /* Rendering flag - set while this node is rendering - while it is true, it is legal
     * to make render-time queries on the node using SceneJS.withNode(xx).query(xx).
     */
    this._rendering = false;

    /* Child nodes
     */
    this._children = [];
    this._parent = null;
    this._listeners = {};
    this._numListeners = 0; // Useful for quick check whether node observes any events

    /* Used by many node types to track the level at which they can
     * memoise internal state. When rendered, a node increments
     * this each time it discovers that it can cache more state, so that
     * it knows not to recompute that state when next rendered.
     * Since internal state is usually dependent on the states of higher
     * nodes, this is reset whenever the node is attached to a new
     * parent.
     *
     * private
     */
    this._setDirty();

    /* Deregister default ID
     */
    if (this._attr.id) {
        //   SceneJS_sceneNodeMaps.removeItem(this._attr.id);
    }

    /* Register again by whatever ID we now have
     */
    if (this._attr.id) {
        SceneJS_sceneNodeMaps.addItem(this._attr.id, this);
    } else {
        this._attr.id = SceneJS_sceneNodeMaps.addItem(this);
    }

    if (cfg && this._init) {
        this._init(cfg);
    }
};

SceneJS.Node.prototype.constructor = SceneJS.Node;

/**
 * Flags state change on this node.
 * Resets memoisation level and schedules another scene render pass.
 * @private
 */
SceneJS.Node.prototype._setDirty = function() {
    this._memoLevel = 0;   // TODO: schedule another scene render pass
};

/**
 * Resets memoization level to zero - called when moving nodes around in graph or calling their setters
 * @private
 */
SceneJS.Node.prototype._resetMemoLevel = function() {
    this._setDirty();
    for (var i = 0; i < this._children.length; i++) {
        this._children[i]._resetMemoLevel();
    }
};

/** @private */
SceneJS.Node.prototype._compile = function(traversalContext) {
    this._compileNodes(traversalContext);
};

/** @private
 *
 * Recursively renders a node's child list. This is effectively rendering a subtree,
 * minus the root node, in depth-first, right-to-left order. As this function descends,
 * it tracks in traversalContext the location of each node in relation to the right
 * fringe of the subtree. As soon as the current node has zero children and no right
 * sibling, then it must be the last one in the subtree. If the nodes are part of the
 * subtree of an instanced node, then a callback will have been planted on the traversalContext
 * by the Instance node that is intiating it. The callback is then called to render the
 * Instance's child nodes as if they were children of the last node.
 */
SceneJS.Node.prototype._compileNodes = function(traversalContext, selectedChildren) { // Selected children - useful for Selector node

    SceneJS_pickingModule.preVisitNode(this);

    SceneJS_nodeEventsModule.preVisitNode(this);

    /* Fire "pre-rendered" event if observed
     */
    if (this._listeners["pre-rendered"]) {
        this._fireEvent("pre-rendered", { });
    }

    var children = selectedChildren || this._children;  // Set of child nodes we'll be rendering
    var numChildren = children.length;
    var child;
    var childId;
    var i;

    if (numChildren > 0) {
        var childTraversalContext;
        for (i = 0; i < numChildren; i++) {
            child = children[i];
            childId = child._attr.id;


            /* Compile module culls child traversal when child compilation not required.
             */
            if (SceneJS_compileModule.preVisitNode(child)) {

                SceneJS_flagsModule.preVisitNode(child);

                childTraversalContext = {

                    /* For instancing mechanism, track if we are traversing down right fringe
                     * and pass down the callback.
                     *
                     * DOCS: http://scenejs.wikispaces.com/Instancing+Algorithm
                     */
                    insideRightFringe: traversalContext.insideRightFringe || (i < numChildren - 1),
                    callback : traversalContext.callback
                };
                child._compileWithEvents.call(child, childTraversalContext);

                SceneJS_flagsModule.postVisitNode(child);

            }
            SceneJS_compileModule.postVisitNode(child);
        }
    }

    if (numChildren == 0) {
        if (! traversalContext.insideRightFringe) { // Last node in the subtree
            if (traversalContext.callback) { // Within subtree of instanced
                traversalContext.callback(traversalContext); // Visit instance's children as temp children of last node
            }
        }
    }

    SceneJS_pickingModule.postVisitNode(this);

    SceneJS_nodeEventsModule.postVisitNode(this);

    if (this._listeners["post-rendering"]) {
        this._fireEvent("post-rendering", { });
    }
};


/**
 * Wraps _compile to fire built-in events either side of rendering.
 * @private */
SceneJS.Node.prototype._compileWithEvents = function(traversalContext) {

    /* Track any user-defined explicit node layer attribute as we traverse the
     * the graph. This is used by state sorting to organise geometries into layers.
     */
    if (this._attr.layer) {

        /* Only render layers that are enabled
         */
        if (!SceneJS_layerModule.layerEnabled(this._attr.layer)) {
            return;
        }

        SceneJS_layerModule.pushLayer(this._attr.layer);
    }

    /* Flag this node as rendering - while this is true, it is legal
     * to make render-time queries on the node using SceneJS.withNode(xx).query(xx).
     */
    this._rendering = true;

    /*------------------------------------------------------------------------
     * Note we still fire events in a picking pass because scene may be
     * dependent on application code processing those and setting things on
     * scene nodes during the picking pass
     *-----------------------------------------------------------------------*/

    if (this._listeners["compiling"]) {         // DEPRECATED
        this._fireEvent("compiling", { });
    }
    if (this._listeners["pre-compiling"]) {
        this._fireEvent("pre-compiling", { });
    }

    /* As scene is traversed, SceneJS_loadStatusModule will track the counts
     * of nodes that are still initialising (ie. texture, instance nodes).
     *
     * If we are listening to "loading-status" events on this node, then we'll
     * get a snapshot of those stats, then report the difference from that
     * via the event once we have rendered this node.
     */
    var loadStatusSnapshot;
    if (this._listeners["loading-status"]) {
        loadStatusSnapshot = SceneJS_loadStatusModule.getStatusSnapshot();
    }

    this._compile(traversalContext);

    if (this._listeners["loading-status"]) {

        /* Report diff of loading stats that occurred while rending this node
         * and its sub-nodes
         */
        this._fireEvent("loading-status", SceneJS_loadStatusModule.diffStatus(loadStatusSnapshot));
    }

    if (this._listeners["post-compiled"]) {
        this._fireEvent("post-compiled", { });
    }

    /* Flag this node as no longer rendering - render-time queries are now illegal on this node
     */
    this._rendering = false;

    if (this._attr.layer) {
        SceneJS_layerModule.popLayer();
    }
};


/** @private */
SceneJS.Node.prototype._compileNodeAtIndex = function(index, traversalContext) {
    if (index >= 0 && index < this._children.length) {
        var child = this._children[index];
        child._compileWithEvents.call(child, traversalContext);
    }
};

/**
 * Returns the SceneJS-assigned ID of the node.
 * @returns {string} Node's ID
 */
SceneJS.Node.prototype.getID = function() {
    return this._attr.id;
};

/**
 * Alias for {@link #getID()} to assist resolution of the ID by JSON query API
 * @returns {string} Node's ID
 */
SceneJS.Node.prototype.getId = SceneJS.Node.prototype.getID;

/**
 * Returns the type ID of the node. For the SceneJS.Node base class, it is "node",
 * which is overriden in sub-classes.
 * @returns {string} Type ID
 */
SceneJS.Node.prototype.getType = function() {
    return this._attr.nodeType;
};

/**
 Sets the flags.
 @param {{String:Boolean}} flags Map of flag booleans
 @since Version 0.8
 */
SceneJS.Node.prototype.setFlags = function(flags) {
    this._attr.flags = SceneJS._shallowClone(flags);    // TODO: set flags map null when empty - helps avoid unneeded push/pop on render
};

/**
 Applies flag values where they are currently undefined or null on node
 @param {{String:Boolean}} flags Map of flag booleans
 @since Version 0.8
 */
SceneJS.Node.prototype.addFlags = function(flags) {
    if (this._attr.flags) {
        SceneJS._apply(flags, this._attr.flags);    // TODO: set flags map null when empty - helps avoid unneeded push/pop on render
    } else {
        this._attr.flags = SceneJS._shallowClone(flags);
    }
};

/**
 Returns the flags
 @param {{String:Boolean}} Map of flag booleans
 @since Version 0.8
 */
SceneJS.Node.prototype.getFlags = function() {
    return SceneJS._shallowClone(this._attr.flags || {});  // Flags map is null when none exist
};

/**
 * Returns the data object attached to this node.
 * @returns {Object} data object
 */
SceneJS.Node.prototype.getData = function() {
    return this._attr.data;
};

/**
 * Sets a data object on this node.
 * @param {Object} data Data object
 */
SceneJS.Node.prototype.setData = function(data) {
    this._attr.data = data;
    return this;
};

/**
 * Assigns this node to a layer, in order to control the order in which the geometries within it are rendered.
 * http://scenejs.wikispaces.com/Layers
 * @param {string} layer The layer name
 */
SceneJS.Node.prototype.setLayer = function(layer) {
    this._attr.layer = layer;
};

/**
 * Returns the name of the layer this node is assigned to.
 * http://scenejs.wikispaces.com/Layers
 * @return {string} layer The layer name
 */
SceneJS.Node.prototype.getLayer = function() {
    return this._attr.layer;
};

/**
 * Returns the node's optional subidentifier, which must be unique within the scope
 * of the parent node.
 * @returns {string} Node SID
 *  @deprecated
 */
SceneJS.Node.prototype.getSID = function() {
    return this._attr.sid;
};

/** Returns the SceneJS.Scene to which this node belongs.
 * Returns node if this is a SceneJS.Scene.
 * @returns {SceneJS.Scene} Scene node
 */
SceneJS.Node.prototype.getScene = function() {
    return this._scene;
};

/**
 * Returns the number of child nodes
 * @returns {int} Number of child nodes
 */
SceneJS.Node.prototype.getNumNodes = function() {
    return this._children.length;
};

/** Returns child nodes
 * @returns {Array} Child nodes
 */
SceneJS.Node.prototype.getNodes = function() {
    var list = new Array(this._children.length);
    var len = this._children.length;
    for (var i = 0; i < len; i++) {
        list[i] = this._children[i];
    }
    return list;
};

/** Returns child node at given index. Returns null if no node at that index.
 * @param {Number} index The child index
 * @returns {SceneJS.Node} Child node, or null if not found
 */
SceneJS.Node.prototype.getNodeAt = function(index) {
    if (index < 0 || index >= this._children.length) {
        return null;
    }
    return this._children[index];
};

/** Returns first child node. Returns null if no child nodes.
 * @returns {SceneJS.Node} First child node, or null if not found
 */
SceneJS.Node.prototype.getFirstNode = function() {
    if (this._children.length == 0) {
        return null;
    }
    return this._children[0];
};

/** Returns last child node. Returns null if no child nodes.
 * @returns {SceneJS.Node} Last child node, or null if not found
 */
SceneJS.Node.prototype.getLastNode = function() {
    if (this._children.length == 0) {
        return null;
    }
    return this._children[this._children.length - 1];
};

/** Returns child node with the given ID.
 * Returns null if no such child node found.
 * @param {String} sid The child's SID
 * @returns {SceneJS.Node} Child node, or null if not found
 */
SceneJS.Node.prototype.getNode = function(id) {
    for (var i = 0; i < this._children.length; i++) {
        if (this._children[i].getID() == id) {
            return this._children[i];
        }
    }
    return null;
};

/** Removes the child node at the given index
 * @param {int} index Child node index
 * @returns {SceneJS.Node} The removed child node if located, else null
 */
SceneJS.Node.prototype.removeNodeAt = function(index) {
    var r = this._children.splice(index, 1);
    this._setDirty();
    if (r.length > 0) {
        r[0]._parent = null;
        return r[0];
    } else {
        return null;
    }
};

/** Removes the child node, given as either a node object or an ID string.
 * @param {String | SceneJS.Node} id The target child node, or its ID
 * @returns {SceneJS.Node} The removed child node if located
 */
SceneJS.Node.prototype.removeNode = function(node) {
    if (!node) {
        throw SceneJS_errorModule.fatalError(
                SceneJS.errors.ILLEGAL_NODE_CONFIG,
                "SceneJS.Node#removeNode - node argument undefined");
    }
    if (!node._compile) {
        if (typeof node == "string") {
            var gotNode = SceneJS_sceneNodeMaps.items[node];
            if (!gotNode) {
                throw SceneJS_errorModule.fatalError(
                        SceneJS.errors.NODE_NOT_FOUND,
                        "SceneJS.Node#removeNode - node not found anywhere: '" + node + "'");
            }
            node = gotNode;
        }
    }
    if (node._compile) { //  instance of node
        for (var i = 0; i < this._children.length; i++) {
            if (this._children[i]._attr.id == node._attr.id) {
                this._setDirty();
                return this.removeNodeAt(i);
            }
        }
    }
    throw SceneJS_errorModule.fatalError(
            SceneJS.errors.NODE_NOT_FOUND,
            "SceneJS.Node#removeNode - child node not found: " + (node._compile ? ": " + node._attr.id : node));
};

/** Removes all child nodes and returns them in an array.
 * @returns {Array[SceneJS.Node]} The removed child nodes
 */
SceneJS.Node.prototype.removeNodes = function() {
    for (var i = 0; i < this._children.length; i++) {  // Unlink children from this
        if (this._children[i]._parent = null) {
        }
    }
    var children = this._children;
    this._children = [];
    this._setDirty();
    return children;
};

/** Appends multiple child nodes
 * @param {Array[SceneJS.Node]} nodes Array of nodes
 * @return {SceneJS.Node} This node
 */
SceneJS.Node.prototype.addNodes = function(nodes) {
    if (!nodes) {
        throw SceneJS_errorModule.fatalError(
                SceneJS.errors.ILLEGAL_NODE_CONFIG,
                "SceneJS.Node#addNodes - nodes argument is undefined");
    }
    for (var i = nodes.length - 1; i >= 0; i--) {
        this.addNode(nodes[i]);
    }
    this._setDirty();
    return this;
};

/** Appends a child node
 * @param {SceneJS.Node} node Child node
 * @return {SceneJS.Node} The child node
 */
SceneJS.Node.prototype.addNode = function(node) {
    if (!node) {
        throw SceneJS_errorModule.fatalError(
                SceneJS.errors.ILLEGAL_NODE_CONFIG,
                "SceneJS.Node#addNode - node argument is undefined");
    }
    if (!node._compile) {
        if (typeof node == "string") {
            var gotNode = SceneJS_sceneNodeMaps.items[node];
            if (!gotNode) {
                throw SceneJS_errorModule.fatalError(
                        SceneJS.errors.ILLEGAL_NODE_CONFIG,
                        "SceneJS.Node#addNode - node not found: '" + node + "'");
            }
            node = gotNode;
        } else {
            node = SceneJS._parseNodeJSON(node, this._scene);
        }
    }
    if (!node._compile) {
        throw SceneJS_errorModule.fatalError(
                SceneJS.errors.ILLEGAL_NODE_CONFIG,
                "SceneJS.Node#addNode - node argument is not a SceneJS.Node or subclass!");
    }
    if (node._parent != null) {
        throw SceneJS_errorModule.fatalError(
                SceneJS.errors.ILLEGAL_NODE_CONFIG,
                "SceneJS.Node#addNode - node argument is still attached to another parent!");
    }
    this._children.push(node);
    node._parent = this;
    node._resetMemoLevel();
    this._setDirty();
    return node;
};

/** Inserts a subgraph into child nodes
 * @param {SceneJS.Node} node Child node
 * @param {int} i Index for new child node
 * @return {SceneJS.Node} The child node
 */
SceneJS.Node.prototype.insertNode = function(node, i) {
    if (!node) {
        throw SceneJS_errorModule.fatalError(
                SceneJS.errors.ILLEGAL_NODE_CONFIG,
                "SceneJS.Node#insertNode - node argument is undefined");
    }
    if (!node._compile) {
        node = SceneJS._parseNodeJSON(node, this._scene);
    }
    if (!node._compile) {
        throw SceneJS_errorModule.fatalError(
                SceneJS.errors.ILLEGAL_NODE_CONFIG,
                "SceneJS.Node#insertNode - node argument is not a SceneJS.Node or subclass!");
    }
    if (node._parent != null) {
        throw SceneJS_errorModule.fatalError(
                SceneJS.errors.ILLEGAL_NODE_CONFIG,
                "SceneJS.Node#insertNode - node argument is still attached to another parent!");
    }

    if (i == undefined || i == null) {

        /* Insert node above children when no index given
         */
        var children = this.removeNodes();

        /* Move children to right-most leaf of inserted graph
         */
        var leaf = node;
        while (leaf.getNumNodes() > 0) {
            leaf = leaf.getLastNode();
        }
        leaf.addNodes(children);
        this.addNode(node);

    } else if (i < 0) {
        throw SceneJS_errorModule.fatalError(
                SceneJS.errors.ILLEGAL_NODE_CONFIG,
                "SceneJS.Node#insertNode - node index out of range: -1");

    } else if (i >= this._children.length) {
        this._children.push(node);

    } else {
        this._children.splice(i, 0, node);
    }
    node._parent = this;
    node._resetMemoLevel();
    this._setDirty();
    return node;
};

/** Calls the given function on each node in the subgraph rooted by this node, including this node.
 * The callback takes each node as it's sole argument and traversal stops as soon as the function returns
 * true and returns the node.
 * @param {function(SceneJS.Node)} func The function
 */
SceneJS.Node.prototype.mapNodes = function(func) {
    if (func(this)) {
        return this;
    }
    var result;
    for (var i = 0; i < this._children.length; i++) {
        result = this._children[i].mapNodes(func);
        if (result) {
            return result;
        }
    }
    return null;
};

/**
 * Registers a listener for a given event on this node. If the event type
 * is not supported by this node type, then the listener will never be called.
 * <p><b>Example:</b>
 * <pre><code>
 * var node = new SceneJS.Node();
 *
 * node.addListener(
 *
 *              // eventName
 *              "some-event",
 *
 *              // handler
 *              function(node,      // Node we are listening to
 *                       params) {  // Whatever params accompany the event type
 *
 *                     // ...
 *              }
 * );
 *
 *
 * </code></pre>
 *
 * @param {String} eventName One of the event types supported by this node
 * @param {Function} fn - Handler function that be called as specified
 * @param options - Optional options for the handler as specified
 * @return {SceneJS.Node} this
 */
SceneJS.Node.prototype.addListener = function(eventName, fn, options) {
    var list = this._listeners[eventName];
    if (!list) {
        list = [];
        this._listeners[eventName] = list;
    }
    list.push({
        eventName : eventName,
        fn: fn,
        options : options || {}
    });
    this._numListeners++;
    this._setDirty();  // Need re-render - potentially more state changes
    return this;
};


/**
 * Specifies whether or not this node and its subtree will be rendered when next visited during traversal
 * @param {Boolean} enabled Will only be rendered when true
 * @deprecated - Use setFlags instead
 */
SceneJS.Node.prototype.setEnabled = function(enabled) {
    throw "node 'enabled' attribute no longer supported - use 'enabled' property on 'flags' attribute instead";
};

/**
 * Returns whether or not this node and its subtree will be rendered when next visited during traversal, as earlier
 * specified with {@link SceneJS.Node#setEnabled}.
 * @return {boolean} Whether or not this subtree is rendered
 * @deprecated - Use getFlags instead
 */
SceneJS.Node.prototype.getEnabled = function() {
    throw "node 'enabled' attribute no longer supported - use 'enabled' property on 'flags' attribute instead";
};

/**
 * Destroys this node. It is marked for destruction; when the next scene traversal begins (or the current one ends)
 * it will be destroyed and removed from it's parent.
 * @return {SceneJS.Node} this
 */
SceneJS.Node.prototype.destroy = function() {
    if (!this._destroyed) {
        this._destroyed = true;
        this._scheduleNodeDestroy(this);
    }
    return this;
};

/** Schedule the destruction of this node
 */
SceneJS.Node.prototype._scheduleNodeDestroy = function(node) {
    if (this._parent) {
        this._parent.removeNode(this);
    }
    SceneJS_sceneNodeMaps.removeItem(this._attr.id);
    if (this._children.length > 0) {
        var children = this._children.slice(0);      // destruction will modify this._children
        for (var i = 0; i < children.length; i++) {
            children[i]._scheduleNodeDestroy();
        }
    }
    SceneJS._destroyedNodes.push(this);
};

/**
 * Performs the actual destruction of this node, calling the node's optional template destroy method
 */
SceneJS.Node.prototype._doDestroy = function() {
    if (this._destroy) {
        this._destroy();
    }
    return this;
};

/**
 * Fires an event at this node, immediately calling listeners registered for the event
 * @param {String} eventName Event name
 * @param {Object} params Event parameters
 * @param {Object} options Event options
 */
SceneJS.Node.prototype._fireEvent = function(eventName, params, options) {
    var list = this._listeners[eventName];
    if (list) {
        if (!params) {
            params = {};
        }
        var event = {
            name: eventName,
            params : params,
            options: options || {}
        };
        var listener;
        for (var i = 0, len = list.length; i < len; i++) {
            listener = list[i];
            if (listener.options.scope) {
                listener.fn.call(listener.options.scope, event);
            } else {
                listener.fn.call(this, event);
            }
        }
    }
};

/**
 * Removes a handler that is registered for the given event on this node.
 * Does nothing if no such handler registered.
 *
 * @param {String} eventName Event type that handler is registered for
 * @param {function} fn - Handler function that is registered for the event
 * @return {function} The handler, or null if not registered
 */
SceneJS.Node.prototype.removeListener = function(eventName, fn) {
    var list = this._listeners[eventName];
    if (!list) {
        return null;
    }
    for (var i = 0; i < list.length; i++) {
        if (list[i].fn == fn) {
            list.splice(i, 1);
            return fn;
        }
    }
    this._numListeners--;
    return null;
};

/**
 * Returns true if this node has any listeners for the given event .
 *
 * @param {String} eventName Event type
 * @return {boolean} True if listener present
 */
SceneJS.Node.prototype.hasListener = function(eventName) {
    return this._listeners[eventName];
};

/**
 * Returns true if this node has any listeners at all.
 *
 * @return {boolean} True if any listener present
 */
SceneJS.Node.prototype.hasListeners = function() {
    return (this._numListeners > 0);
};

/** Removes all listeners registered on this node.
 * @return {SceneJS.Node} this
 */
SceneJS.Node.prototype.removeListeners = function() {
    this._listeners = {};
    this._numListeners = 0;
    return this;
};

/** Returns the parent node
 * @return {SceneJS.Node} The parent node
 */
SceneJS.Node.prototype.getParent = function() {
    return this._parent;
};

/** Returns either all child or all sub-nodes of the given type, depending on whether search is recursive or not.
 * @param {string} type Node type
 * @param {boolean} [recursive=false] When true, will return all matching nodes in subgraph, otherwise returns just children (default)
 * @return {SceneJS.node[]} Array of matching nodes
 */
SceneJS.Node.prototype.findNodesByType = function(type, recursive) {
    return this._findNodesByType(type, [], recursive);
};

/** @private */
SceneJS.Node.prototype._findNodesByType = function(type, list, recursive) {
    for (var i = 0; i < this._children; i++) {
        var node = this._children[i];
        if (node.nodeType == type) {
            list.add(node);
        }
    }
    if (recursive) {
        for (var i = 0; i < this._children; i++) {
            this._children[i]._findNodesByType(type, list, recursive);
        }
    }
    return list;
};


/**
 * Returns an object containing the attributes that were given when creating the node. Obviously, the map will have
 * the current values, plus any attributes that were later added through set/add methods on the node
 *
 */
SceneJS.Node.prototype.getJSON = function() {
    return this._attr;
};

/** Factory function that returns a new {@link SceneJS.Node} instance
 * @param {Object} [cfg] Static configuration object
 * @param {SceneJS.node, ...} arguments Zero or more child nodes
 * @returns {SceneJS.Node}
 */
SceneJS.node = function() {
    var n = new SceneJS.Node();
    SceneJS.Node.prototype.constructor.apply(n, arguments);
    return n;
};

SceneJS._registerNode("node", SceneJS.Node, SceneJS.node);


