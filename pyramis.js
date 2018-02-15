var EventEmitter = require('eventemitter3');

var mark = Symbol();

class Pyramis {
	constructor(options) {
		this._separator = options && options.separator || '.';
		this._ignoreSameValue = options && options.ignoreSameValue || false;
		this._root = this._create();
		this._changed = false;
		this._ee = new EventEmitter();
	}

	_create() {
		var node = new Map();
		node[mark] = true;
		return node;
	}

	_prepare(key) {
		return key == null ? undefined : String(key);
	}

	_parse(key) {
		var path,keys,subkeys;
		if(key === undefined) {
			path = [];
			keys = subkeys = [undefined];
		} else {			
			keys = [undefined];
			subkeys = [];
			path = [];
			var pos = 0;
			do {
				var end = key.indexOf(this._separator,pos);
				if(end == -1)
					end = key.length;
				path.push(key.substring(pos,end));
				keys.push(key.substring(0,end));
				subkeys.push(key.substring(pos));
				pos = end + 1;
			} while(pos < key.length);
			subkeys.push(undefined);
		}
		return { path, keys, subkeys };
	}

	_compact(node) {
		return node === null || typeof(node) != 'object' || !node[mark];
	}

	_node(key) {
		var node = this._root;
		key = this._prepare(key);
		if(key !== undefined) {
			var pos = 0;
			do {
				if(this._compact(node))
					return;
				var end = key.indexOf(this._separator,pos);
				if(end == -1)
					end = key.length;
				var part = key.substring(pos,end);
				var subnode = node.get(part);
				if(subnode === undefined)
					return;
				node = subnode;
				pos = end + 1;
			} while(pos < key.length);
		}
		return node;
	}

	_set(key,path,value) {
		this._changed = undefined;
		if(path.length == 0) {
			var oldValue = this._root.get(undefined);
			if(this._ignoreSameValue && oldValue === value)
				return false;
			this._root.set(undefined,value);
			this._changed = oldValue;
		} else {
			var node = this._root;
			for(var i=0; i<path.length; ++i) {
				var part = path[i];
				var subnode = node.get(part);
				if(i != path.length-1) {
					if(subnode === undefined) {
						subnode = this._create();
						node.set(part,subnode);
					} else if(this._compact(subnode)) {
						var subnodeValue = subnode;
						subnode = this._create();
						subnode.set(undefined,subnodeValue);
						node.set(part,subnode);
					}
					node = subnode;
				} else {
					if(subnode === undefined) {
						node.set(part,value);
					} else if(this._compact(subnode)) {
						if(this._ignoreSameValue && subnode === value)
							return false;
						node.set(part,value);
						this._changed = subnode;
					} else {
						var oldValue = subnode.get(undefined);
						if(this._ignoreSameValue &&  oldValue === value)
							return false;
						subnode.set(undefined,value);
						this._changed = oldValue;
					}
				}
			}
		}
		return true;
	}

	_deleteClean(node,path,index) {
		var part = path[index];
		if(this._compact(node)) {
			if(part !== undefined)
				return false;
			this._changed = node;
			return true;
		}
		if(part !== undefined) {
			var subnode = node.get(part);
			if(subnode !== undefined && this._deleteClean(subnode,path,index+1))
				node.delete(part);
		} else {
			this._changed = node.get(undefined);
			node.delete(undefined);
		}
		return node.size == 0;
	}
	                
	_delete(path) {
		this._changed = undefined;
		this._deleteClean(this._root,path,0);
		return this._changed !== undefined;
	}

	_enum(node,callback,prefix,context) {
		if(this._compact(node)) {
			callback.call(context,prefix,node);
		} else {
			if(prefix === undefined) {
				node.forEach(function(value,key) {
					if(key !== undefined)
						this._enum(value,callback,key,context);
				},this);
			} else {
				node.forEach(function(value,key) {
					if(key !== undefined) 
						this._enum(value,callback,prefix + this._separator + key,context);
				},this);
			}
			var value = node.get(undefined);
			if(value !== undefined)
				callback.call(context,prefix,value);
		}
	}

	set(key,value) {
		key = this._prepare(key);
		var parsed = this._parse(key);
		if(value !== undefined) {
			if(!this._set(key,parsed.path,value))
				return false;
		} else {
			if(!this._delete(parsed.path))
				return false;
		}
		for(var i=0; i<parsed.keys.length; ++i)
			this._ee.emit(parsed.keys[i],parsed.subkeys[i],value,this._changed);
		return true;
	}

	has(key) {
	        var node = this._node(key);
		if(node === undefined)
			return false;
		return this._compact(node) || node.has(undefined);
	}

	get(key) {
	        var node = this._node(key);
		if(node === undefined)
			return;
		return this._compact(node) ? node : node.get(undefined);
	}

	enum(key,callback,context) {
		var node = this._node(key);
		if(node !== undefined)
			this._enum(node,callback,undefined,context);
	}

	delete(key) {
		return this.set(key,undefined);
	}

	deleteTree(prefix,ignoreRootValue) {
		this.enum(prefix,function(subkey,value) {
			if(subkey === undefined) {
				if(!ignoreRootValue)
					this.delete(prefix);
			} else if(prefix == null) {
				this.delete(subkey);
			} else {
				this.delete(prefix + this._separator + subkey);
			}
		},this);
	}

	watch(key,callback,context) {
		this._ee.on(key,callback,context);
	}

	watchAndEnum(key,callback,context) {
		this.watch(key,callback,context);
		this.enum(key,callback,context);
	}

	unwatch(key,callback,context) {
		this._ee.removeListener(key,callback,context);
	}
};

exports = module.exports = Pyramis;