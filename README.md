## pyramis

Directory-like data storage with subtree changes listening capabilities.

## Concept

Pyramis basically is a tree with every node having string key and value of any type.
Undefined value is considered to be absent, so if you want to delete some value, you should set it to undefined or use special delete function.
Values for any subtree inner nodes does not affect values of subtree root. So you can have subtree with no subtree root value, but having children nodes with values.

## Usage

### Create Pyramis
```js
var Pyramis = require('pyramis');

// this is the default options
var options = {
	separator: '.',
	ignoreSameValue: false,	
};

var storage = new Pyramis(options);
```
If `options` object is not specified, defaults is used.
Every node in the tree can be referenced with the corresponding string path. 'separator' option is used to set path separator (single character only).
If 'ignoreSameValue' is true, there will be no events generated if the value being set to some node is the same as current value for that node.

### Set 
Use `set` to insert or update value for specified path:
```js
// path: (root) -> 'entities' -> 'bushed' -> '535'
storage.set('entities.bushes.535','this is bush 535');
```

Empty string ('') is treated as normal part of path. Root node is referenced by `undefined` path.
```js
storage.set(undefined,'this is the root element'); // Path: (root)
storage.set('.a..b.',100); // Path: (root) => '' -> 'a' -> '' -> 'b' -> ''
```

### Remove

Use `delete` to remove value for node. It is the same as setting it to `undefined`.
```js
storage.delete(path);
// equivalent way:
storage.set(path,undefined);
```js
You can also remove the whole subtree.
```js
// removes all values for nodes starting with 'entities.bushes.', including 'entities.bushed'
storage.deleteTree('entities.bushes');
```
You can optionally save value for root node of the subtree, passing `true` as second parameter to `deleteTree`:
```js
// removes all values for nodes starting with 'tables.', but preserves value for 'tables' node
storage.deleteTree('tables',true);
// removes all values from whole tree (undefined is (root) path)
storage.deleteTree(undefined);
```

### Get / Has
Use `get` to retrieve values of some node, or `has` to check the existance of that value:
```js
var path = 'some.path';
storage.set(path,10);
var v = storage.get(path); // v === 10
var h = storage.has(path); // h === true
storage.delete(path);
h = storage.has(path); // now, h === false
```
### Enumeration
You can get all values for subtree with `enum`. The order of enumeration is from bottom to top(children first, than parent), but the order of children nodes is undetermined.
Callback receives subpath (not the whole path!) and value. Also, the calling context of the callback can be set with third parameter of 'enum'.
```js
var storage = new Pyramis();
storage.set('entities.animals','animals root');
storage.set('entities.animals.bear','animal bear');
storage.set('entities.animals.fox','animal fox');
storage.set('things.colors.black','color black');
storage.set('things.colors.red','color red');
storage.set('things.colors.green','color green');
storage.set(undefined,'root');
storage.set('things.numbers.1','number 1');
storage.set('things.numbers.2','number 2');
storage.set('things.numbers.3','number 3');

var callback = function(subpath,value) {
	console.log(subpath+' "'+value+'"');
};

storage.enum('entities.animals',callback);
// bear "animal bear"
// fox "animal fox"
// undefined "animals root"

storage.enum('things',callback);
// colors.black "color black"
// colors.red "color red"
// colors.green "color green"
// numbers.1 "number 1"
// numbers.2 "number 2"
// numbers.3 "number 3"

// to enumerate whole tree, pass undefined as path:
storage.enum(undefined,callback);
// entities.animals.bear "animal bear"
// entities.animals.fox "animal fox"
// entities.animals "animals root"
// things.colors.black "color black"
// things.colors.red "color red"
// things.colors.green "color green"
// things.numbers.1 "number 1"
// things.numbers.2 "number 2"
// things.numbers.3 "number 3"
// undefined "root"
```

### Watch
The whole purpose of that tree is to provide the ability to listen for changes in any subtree. You can use three functions for that:
`watch`,`watchAndEnum` and `unwatch`. `watch` subscribes for changes at some path, `watchAndEnum` is same as `watch`, but calls listener for the specified path immediately after adding
it to listeners list (passing `undefined` to `oldValue`). If root value of subtree is changed, `undefined` is passed to the `subpath` parameter of listener.
`unwatch` is used to cancel the subscription (use the same parameters you called `watch` or `watchOrEnum` with).
```js
var storage = ... (see Enumeration example);

var listener = function(subpath,newValue,oldValue) {
	console.log(subpath+' "'+newValue+'" "'+oldValue+'"');
}

// watches for changes at 'things.numbers' and all descedants of it
storage.watchAndEnum('things.numbers',listener);
// 1 "number 1" "undefined"
// 2 "number 2" "undefined"
// 3 "number 3" "undefined"

storage.set('things.numbers.2','new number 2');
// 2 "new number 2" "number 2"

storage.delete('things.numbers.2');
// 2 "undefined" "new number 2"

storage.set('things.numbers','numbers root');
// undefined "numbers root" "undefined"

storage.deleteTree('things');
// 1 "undefined" "number 1"
// 3 "undefined" "number 3"
// undefined "undefined" "numbers root"

storage.unwatch('things.numbers',listener);
// removes the listener from listeners list at 'things.numbers'
// it will not be called again

// this watches the whole tree, so any change will be detected
storage.watch(undefined,listener);

```