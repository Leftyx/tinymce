var editor;

function getFunctionName(func) {
	if (func.name && func.name != "") {
		return func.name;
	} else if (typeof func == "function" || typeof func == "object") {
	  	var fName = ("" + func).match(/function\s*([\w\$]+)\s*\(/);
	  	if (fName !== null && fName != "") {
	  		return fName[1];
	  	} else {
			for (var v in window) {
				if (window[v] === func) {
					func.name = v;
					return v;
				}
			}
		}
	}
}

function assertState(expected, message) {
	equals(editor.getContent(), expected, message);
}

tinymce.create('dsl.Queue', {
	Queue: function() {
		this.queue = [];
	},
	
	add: function(task) {
		this.queue.push(task);
	},
	
	next: function() {
		if (this.queue.length > 0) {
			var task = this.queue.shift();
			task();
			return true;
		} else {
			QUnit.start();
			return false;
		}
	},
	
	done: function() {
		expect(this.queue.length);
		this.next();
		//QUnit.start();
	}
});

tinymce.create('dsl.Action', {
	Action: function(name, action) {
		this.name = name;
		this.a = this.curryPreposition('a');
		this.inA = this.curryPreposition('in a');
		if (tinymce.is(action, 'string')) {
			this.action = function(callback) {
				editor.execCommand(action);
				callback();
			};
		} else {
			this.action = action;
		}
	},
	
	curryPreposition: function(preposition) {
		return function(state) {
			return this.to(state, preposition);
		};
	},
	
	to: function(state, preposition) {
		if (!preposition) {
			preposition = 'to';
		}
		var message = this.name + " " + preposition + " " + getFunctionName(state);
		var action = this.action;
		var actionPerformed = false;
		function defer(callback) {
			return function() {
				var args = arguments;
				queue.add(function() {
					if (actionPerformed) {
						callback.apply(undefined, args);
						queue.next();
						return;
					}
					editor.focus();
					state();
					action(function() {
						actionPerformed = true;
						callback.apply(undefined, args);
						queue.next();
					});
				});
				return this;
			};
		}
		
		var dslState = {
			gives: defer(function(expected) {
				assertState(expected, message);
			}),

			enablesState: defer(function(state) {
				ok(editor.queryCommandState(state), message + " enables " + state + " command");
			}),
			
			disablesState: defer(function(state) {
				ok(!editor.queryCommandState(state), message + " disables " + state + " command");
			})
		};
		dslState.andGives = dslState.gives;
		return dslState;
	}
});