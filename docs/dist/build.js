(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/* FileSaver.js
 * A saveAs() FileSaver implementation.
 * 1.3.2
 * 2016-06-16 18:25:19
 *
 * By Eli Grey, http://eligrey.com
 * License: MIT
 *   See https://github.com/eligrey/FileSaver.js/blob/master/LICENSE.md
 */

/*global self */
/*jslint bitwise: true, indent: 4, laxbreak: true, laxcomma: true, smarttabs: true, plusplus: true */

/*! @source http://purl.eligrey.com/github/FileSaver.js/blob/master/FileSaver.js */

var saveAs = saveAs || (function(view) {
	"use strict";
	// IE <10 is explicitly unsupported
	if (typeof view === "undefined" || typeof navigator !== "undefined" && /MSIE [1-9]\./.test(navigator.userAgent)) {
		return;
	}
	var
		  doc = view.document
		  // only get URL when necessary in case Blob.js hasn't overridden it yet
		, get_URL = function() {
			return view.URL || view.webkitURL || view;
		}
		, save_link = doc.createElementNS("http://www.w3.org/1999/xhtml", "a")
		, can_use_save_link = "download" in save_link
		, click = function(node) {
			var event = new MouseEvent("click");
			node.dispatchEvent(event);
		}
		, is_safari = /constructor/i.test(view.HTMLElement) || view.safari
		, is_chrome_ios =/CriOS\/[\d]+/.test(navigator.userAgent)
		, throw_outside = function(ex) {
			(view.setImmediate || view.setTimeout)(function() {
				throw ex;
			}, 0);
		}
		, force_saveable_type = "application/octet-stream"
		// the Blob API is fundamentally broken as there is no "downloadfinished" event to subscribe to
		, arbitrary_revoke_timeout = 1000 * 40 // in ms
		, revoke = function(file) {
			var revoker = function() {
				if (typeof file === "string") { // file is an object URL
					get_URL().revokeObjectURL(file);
				} else { // file is a File
					file.remove();
				}
			};
			setTimeout(revoker, arbitrary_revoke_timeout);
		}
		, dispatch = function(filesaver, event_types, event) {
			event_types = [].concat(event_types);
			var i = event_types.length;
			while (i--) {
				var listener = filesaver["on" + event_types[i]];
				if (typeof listener === "function") {
					try {
						listener.call(filesaver, event || filesaver);
					} catch (ex) {
						throw_outside(ex);
					}
				}
			}
		}
		, auto_bom = function(blob) {
			// prepend BOM for UTF-8 XML and text/* types (including HTML)
			// note: your browser will automatically convert UTF-16 U+FEFF to EF BB BF
			if (/^\s*(?:text\/\S*|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(blob.type)) {
				return new Blob([String.fromCharCode(0xFEFF), blob], {type: blob.type});
			}
			return blob;
		}
		, FileSaver = function(blob, name, no_auto_bom) {
			if (!no_auto_bom) {
				blob = auto_bom(blob);
			}
			// First try a.download, then web filesystem, then object URLs
			var
				  filesaver = this
				, type = blob.type
				, force = type === force_saveable_type
				, object_url
				, dispatch_all = function() {
					dispatch(filesaver, "writestart progress write writeend".split(" "));
				}
				// on any filesys errors revert to saving with object URLs
				, fs_error = function() {
					if ((is_chrome_ios || (force && is_safari)) && view.FileReader) {
						// Safari doesn't allow downloading of blob urls
						var reader = new FileReader();
						reader.onloadend = function() {
							var url = is_chrome_ios ? reader.result : reader.result.replace(/^data:[^;]*;/, 'data:attachment/file;');
							var popup = view.open(url, '_blank');
							if(!popup) view.location.href = url;
							url=undefined; // release reference before dispatching
							filesaver.readyState = filesaver.DONE;
							dispatch_all();
						};
						reader.readAsDataURL(blob);
						filesaver.readyState = filesaver.INIT;
						return;
					}
					// don't create more object URLs than needed
					if (!object_url) {
						object_url = get_URL().createObjectURL(blob);
					}
					if (force) {
						view.location.href = object_url;
					} else {
						var opened = view.open(object_url, "_blank");
						if (!opened) {
							// Apple does not allow window.open, see https://developer.apple.com/library/safari/documentation/Tools/Conceptual/SafariExtensionGuide/WorkingwithWindowsandTabs/WorkingwithWindowsandTabs.html
							view.location.href = object_url;
						}
					}
					filesaver.readyState = filesaver.DONE;
					dispatch_all();
					revoke(object_url);
				}
			;
			filesaver.readyState = filesaver.INIT;

			if (can_use_save_link) {
				object_url = get_URL().createObjectURL(blob);
				setTimeout(function() {
					save_link.href = object_url;
					save_link.download = name;
					click(save_link);
					dispatch_all();
					revoke(object_url);
					filesaver.readyState = filesaver.DONE;
				});
				return;
			}

			fs_error();
		}
		, FS_proto = FileSaver.prototype
		, saveAs = function(blob, name, no_auto_bom) {
			return new FileSaver(blob, name || blob.name || "download", no_auto_bom);
		}
	;
	// IE 10+ (native saveAs)
	if (typeof navigator !== "undefined" && navigator.msSaveOrOpenBlob) {
		return function(blob, name, no_auto_bom) {
			name = name || blob.name || "download";

			if (!no_auto_bom) {
				blob = auto_bom(blob);
			}
			return navigator.msSaveOrOpenBlob(blob, name);
		};
	}

	FS_proto.abort = function(){};
	FS_proto.readyState = FS_proto.INIT = 0;
	FS_proto.WRITING = 1;
	FS_proto.DONE = 2;

	FS_proto.error =
	FS_proto.onwritestart =
	FS_proto.onprogress =
	FS_proto.onwrite =
	FS_proto.onabort =
	FS_proto.onerror =
	FS_proto.onwriteend =
		null;

	return saveAs;
}(
	   typeof self !== "undefined" && self
	|| typeof window !== "undefined" && window
	|| this.content
));
// `self` is undefined in Firefox for Android content script context
// while `this` is nsIContentFrameMessageManager
// with an attribute `content` that corresponds to the window

if (typeof module !== "undefined" && module.exports) {
  module.exports.saveAs = saveAs;
} else if ((typeof define !== "undefined" && define !== null) && (define.amd !== null)) {
  define("FileSaver.js", function() {
    return saveAs;
  });
}

},{}],2:[function(require,module,exports){
// Copyright (c) 2013 Pieroxy <pieroxy@pieroxy.net>
// This work is free. You can redistribute it and/or modify it
// under the terms of the WTFPL, Version 2
// For more information see LICENSE.txt or http://www.wtfpl.net/
//
// For more information, the home page:
// http://pieroxy.net/blog/pages/lz-string/testing.html
//
// LZ-based compression algorithm, version 1.4.4
var LZString = (function() {

// private property
var f = String.fromCharCode;
var keyStrBase64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
var keyStrUriSafe = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$";
var baseReverseDic = {};

function getBaseValue(alphabet, character) {
  if (!baseReverseDic[alphabet]) {
    baseReverseDic[alphabet] = {};
    for (var i=0 ; i<alphabet.length ; i++) {
      baseReverseDic[alphabet][alphabet.charAt(i)] = i;
    }
  }
  return baseReverseDic[alphabet][character];
}

var LZString = {
  compressToBase64 : function (input) {
    if (input == null) return "";
    var res = LZString._compress(input, 6, function(a){return keyStrBase64.charAt(a);});
    switch (res.length % 4) { // To produce valid Base64
    default: // When could this happen ?
    case 0 : return res;
    case 1 : return res+"===";
    case 2 : return res+"==";
    case 3 : return res+"=";
    }
  },

  decompressFromBase64 : function (input) {
    if (input == null) return "";
    if (input == "") return null;
    return LZString._decompress(input.length, 32, function(index) { return getBaseValue(keyStrBase64, input.charAt(index)); });
  },

  compressToUTF16 : function (input) {
    if (input == null) return "";
    return LZString._compress(input, 15, function(a){return f(a+32);}) + " ";
  },

  decompressFromUTF16: function (compressed) {
    if (compressed == null) return "";
    if (compressed == "") return null;
    return LZString._decompress(compressed.length, 16384, function(index) { return compressed.charCodeAt(index) - 32; });
  },

  //compress into uint8array (UCS-2 big endian format)
  compressToUint8Array: function (uncompressed) {
    var compressed = LZString.compress(uncompressed);
    var buf=new Uint8Array(compressed.length*2); // 2 bytes per character

    for (var i=0, TotalLen=compressed.length; i<TotalLen; i++) {
      var current_value = compressed.charCodeAt(i);
      buf[i*2] = current_value >>> 8;
      buf[i*2+1] = current_value % 256;
    }
    return buf;
  },

  //decompress from uint8array (UCS-2 big endian format)
  decompressFromUint8Array:function (compressed) {
    if (compressed===null || compressed===undefined){
        return LZString.decompress(compressed);
    } else {
        var buf=new Array(compressed.length/2); // 2 bytes per character
        for (var i=0, TotalLen=buf.length; i<TotalLen; i++) {
          buf[i]=compressed[i*2]*256+compressed[i*2+1];
        }

        var result = [];
        buf.forEach(function (c) {
          result.push(f(c));
        });
        return LZString.decompress(result.join(''));

    }

  },


  //compress into a string that is already URI encoded
  compressToEncodedURIComponent: function (input) {
    if (input == null) return "";
    return LZString._compress(input, 6, function(a){return keyStrUriSafe.charAt(a);});
  },

  //decompress from an output of compressToEncodedURIComponent
  decompressFromEncodedURIComponent:function (input) {
    if (input == null) return "";
    if (input == "") return null;
    input = input.replace(/ /g, "+");
    return LZString._decompress(input.length, 32, function(index) { return getBaseValue(keyStrUriSafe, input.charAt(index)); });
  },

  compress: function (uncompressed) {
    return LZString._compress(uncompressed, 16, function(a){return f(a);});
  },
  _compress: function (uncompressed, bitsPerChar, getCharFromInt) {
    if (uncompressed == null) return "";
    var i, value,
        context_dictionary= {},
        context_dictionaryToCreate= {},
        context_c="",
        context_wc="",
        context_w="",
        context_enlargeIn= 2, // Compensate for the first entry which should not count
        context_dictSize= 3,
        context_numBits= 2,
        context_data=[],
        context_data_val=0,
        context_data_position=0,
        ii;

    for (ii = 0; ii < uncompressed.length; ii += 1) {
      context_c = uncompressed.charAt(ii);
      if (!Object.prototype.hasOwnProperty.call(context_dictionary,context_c)) {
        context_dictionary[context_c] = context_dictSize++;
        context_dictionaryToCreate[context_c] = true;
      }

      context_wc = context_w + context_c;
      if (Object.prototype.hasOwnProperty.call(context_dictionary,context_wc)) {
        context_w = context_wc;
      } else {
        if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate,context_w)) {
          if (context_w.charCodeAt(0)<256) {
            for (i=0 ; i<context_numBits ; i++) {
              context_data_val = (context_data_val << 1);
              if (context_data_position == bitsPerChar-1) {
                context_data_position = 0;
                context_data.push(getCharFromInt(context_data_val));
                context_data_val = 0;
              } else {
                context_data_position++;
              }
            }
            value = context_w.charCodeAt(0);
            for (i=0 ; i<8 ; i++) {
              context_data_val = (context_data_val << 1) | (value&1);
              if (context_data_position == bitsPerChar-1) {
                context_data_position = 0;
                context_data.push(getCharFromInt(context_data_val));
                context_data_val = 0;
              } else {
                context_data_position++;
              }
              value = value >> 1;
            }
          } else {
            value = 1;
            for (i=0 ; i<context_numBits ; i++) {
              context_data_val = (context_data_val << 1) | value;
              if (context_data_position ==bitsPerChar-1) {
                context_data_position = 0;
                context_data.push(getCharFromInt(context_data_val));
                context_data_val = 0;
              } else {
                context_data_position++;
              }
              value = 0;
            }
            value = context_w.charCodeAt(0);
            for (i=0 ; i<16 ; i++) {
              context_data_val = (context_data_val << 1) | (value&1);
              if (context_data_position == bitsPerChar-1) {
                context_data_position = 0;
                context_data.push(getCharFromInt(context_data_val));
                context_data_val = 0;
              } else {
                context_data_position++;
              }
              value = value >> 1;
            }
          }
          context_enlargeIn--;
          if (context_enlargeIn == 0) {
            context_enlargeIn = Math.pow(2, context_numBits);
            context_numBits++;
          }
          delete context_dictionaryToCreate[context_w];
        } else {
          value = context_dictionary[context_w];
          for (i=0 ; i<context_numBits ; i++) {
            context_data_val = (context_data_val << 1) | (value&1);
            if (context_data_position == bitsPerChar-1) {
              context_data_position = 0;
              context_data.push(getCharFromInt(context_data_val));
              context_data_val = 0;
            } else {
              context_data_position++;
            }
            value = value >> 1;
          }


        }
        context_enlargeIn--;
        if (context_enlargeIn == 0) {
          context_enlargeIn = Math.pow(2, context_numBits);
          context_numBits++;
        }
        // Add wc to the dictionary.
        context_dictionary[context_wc] = context_dictSize++;
        context_w = String(context_c);
      }
    }

    // Output the code for w.
    if (context_w !== "") {
      if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate,context_w)) {
        if (context_w.charCodeAt(0)<256) {
          for (i=0 ; i<context_numBits ; i++) {
            context_data_val = (context_data_val << 1);
            if (context_data_position == bitsPerChar-1) {
              context_data_position = 0;
              context_data.push(getCharFromInt(context_data_val));
              context_data_val = 0;
            } else {
              context_data_position++;
            }
          }
          value = context_w.charCodeAt(0);
          for (i=0 ; i<8 ; i++) {
            context_data_val = (context_data_val << 1) | (value&1);
            if (context_data_position == bitsPerChar-1) {
              context_data_position = 0;
              context_data.push(getCharFromInt(context_data_val));
              context_data_val = 0;
            } else {
              context_data_position++;
            }
            value = value >> 1;
          }
        } else {
          value = 1;
          for (i=0 ; i<context_numBits ; i++) {
            context_data_val = (context_data_val << 1) | value;
            if (context_data_position == bitsPerChar-1) {
              context_data_position = 0;
              context_data.push(getCharFromInt(context_data_val));
              context_data_val = 0;
            } else {
              context_data_position++;
            }
            value = 0;
          }
          value = context_w.charCodeAt(0);
          for (i=0 ; i<16 ; i++) {
            context_data_val = (context_data_val << 1) | (value&1);
            if (context_data_position == bitsPerChar-1) {
              context_data_position = 0;
              context_data.push(getCharFromInt(context_data_val));
              context_data_val = 0;
            } else {
              context_data_position++;
            }
            value = value >> 1;
          }
        }
        context_enlargeIn--;
        if (context_enlargeIn == 0) {
          context_enlargeIn = Math.pow(2, context_numBits);
          context_numBits++;
        }
        delete context_dictionaryToCreate[context_w];
      } else {
        value = context_dictionary[context_w];
        for (i=0 ; i<context_numBits ; i++) {
          context_data_val = (context_data_val << 1) | (value&1);
          if (context_data_position == bitsPerChar-1) {
            context_data_position = 0;
            context_data.push(getCharFromInt(context_data_val));
            context_data_val = 0;
          } else {
            context_data_position++;
          }
          value = value >> 1;
        }


      }
      context_enlargeIn--;
      if (context_enlargeIn == 0) {
        context_enlargeIn = Math.pow(2, context_numBits);
        context_numBits++;
      }
    }

    // Mark the end of the stream
    value = 2;
    for (i=0 ; i<context_numBits ; i++) {
      context_data_val = (context_data_val << 1) | (value&1);
      if (context_data_position == bitsPerChar-1) {
        context_data_position = 0;
        context_data.push(getCharFromInt(context_data_val));
        context_data_val = 0;
      } else {
        context_data_position++;
      }
      value = value >> 1;
    }

    // Flush the last char
    while (true) {
      context_data_val = (context_data_val << 1);
      if (context_data_position == bitsPerChar-1) {
        context_data.push(getCharFromInt(context_data_val));
        break;
      }
      else context_data_position++;
    }
    return context_data.join('');
  },

  decompress: function (compressed) {
    if (compressed == null) return "";
    if (compressed == "") return null;
    return LZString._decompress(compressed.length, 32768, function(index) { return compressed.charCodeAt(index); });
  },

  _decompress: function (length, resetValue, getNextValue) {
    var dictionary = [],
        next,
        enlargeIn = 4,
        dictSize = 4,
        numBits = 3,
        entry = "",
        result = [],
        i,
        w,
        bits, resb, maxpower, power,
        c,
        data = {val:getNextValue(0), position:resetValue, index:1};

    for (i = 0; i < 3; i += 1) {
      dictionary[i] = i;
    }

    bits = 0;
    maxpower = Math.pow(2,2);
    power=1;
    while (power!=maxpower) {
      resb = data.val & data.position;
      data.position >>= 1;
      if (data.position == 0) {
        data.position = resetValue;
        data.val = getNextValue(data.index++);
      }
      bits |= (resb>0 ? 1 : 0) * power;
      power <<= 1;
    }

    switch (next = bits) {
      case 0:
          bits = 0;
          maxpower = Math.pow(2,8);
          power=1;
          while (power!=maxpower) {
            resb = data.val & data.position;
            data.position >>= 1;
            if (data.position == 0) {
              data.position = resetValue;
              data.val = getNextValue(data.index++);
            }
            bits |= (resb>0 ? 1 : 0) * power;
            power <<= 1;
          }
        c = f(bits);
        break;
      case 1:
          bits = 0;
          maxpower = Math.pow(2,16);
          power=1;
          while (power!=maxpower) {
            resb = data.val & data.position;
            data.position >>= 1;
            if (data.position == 0) {
              data.position = resetValue;
              data.val = getNextValue(data.index++);
            }
            bits |= (resb>0 ? 1 : 0) * power;
            power <<= 1;
          }
        c = f(bits);
        break;
      case 2:
        return "";
    }
    dictionary[3] = c;
    w = c;
    result.push(c);
    while (true) {
      if (data.index > length) {
        return "";
      }

      bits = 0;
      maxpower = Math.pow(2,numBits);
      power=1;
      while (power!=maxpower) {
        resb = data.val & data.position;
        data.position >>= 1;
        if (data.position == 0) {
          data.position = resetValue;
          data.val = getNextValue(data.index++);
        }
        bits |= (resb>0 ? 1 : 0) * power;
        power <<= 1;
      }

      switch (c = bits) {
        case 0:
          bits = 0;
          maxpower = Math.pow(2,8);
          power=1;
          while (power!=maxpower) {
            resb = data.val & data.position;
            data.position >>= 1;
            if (data.position == 0) {
              data.position = resetValue;
              data.val = getNextValue(data.index++);
            }
            bits |= (resb>0 ? 1 : 0) * power;
            power <<= 1;
          }

          dictionary[dictSize++] = f(bits);
          c = dictSize-1;
          enlargeIn--;
          break;
        case 1:
          bits = 0;
          maxpower = Math.pow(2,16);
          power=1;
          while (power!=maxpower) {
            resb = data.val & data.position;
            data.position >>= 1;
            if (data.position == 0) {
              data.position = resetValue;
              data.val = getNextValue(data.index++);
            }
            bits |= (resb>0 ? 1 : 0) * power;
            power <<= 1;
          }
          dictionary[dictSize++] = f(bits);
          c = dictSize-1;
          enlargeIn--;
          break;
        case 2:
          return result.join('');
      }

      if (enlargeIn == 0) {
        enlargeIn = Math.pow(2, numBits);
        numBits++;
      }

      if (dictionary[c]) {
        entry = dictionary[c];
      } else {
        if (c === dictSize) {
          entry = w + w.charAt(0);
        } else {
          return null;
        }
      }
      result.push(entry);

      // Add w+entry[0] to the dictionary.
      dictionary[dictSize++] = w + entry.charAt(0);
      enlargeIn--;

      w = entry;

      if (enlargeIn == 0) {
        enlargeIn = Math.pow(2, numBits);
        numBits++;
      }

    }
  }
};
  return LZString;
})();

if (typeof define === 'function' && define.amd) {
  define(function () { return LZString; });
} else if( typeof module !== 'undefined' && module != null ) {
  module.exports = LZString
}

},{}],3:[function(require,module,exports){
!function() {
    'use strict';
    function VNode() {}
    function h(nodeName, attributes) {
        var lastSimple, child, simple, i, children = EMPTY_CHILDREN;
        for (i = arguments.length; i-- > 2; ) stack.push(arguments[i]);
        if (attributes && null != attributes.children) {
            if (!stack.length) stack.push(attributes.children);
            delete attributes.children;
        }
        while (stack.length) if ((child = stack.pop()) && void 0 !== child.pop) for (i = child.length; i--; ) stack.push(child[i]); else {
            if (child === !0 || child === !1) child = null;
            if (simple = 'function' != typeof nodeName) if (null == child) child = ''; else if ('number' == typeof child) child = String(child); else if ('string' != typeof child) simple = !1;
            if (simple && lastSimple) children[children.length - 1] += child; else if (children === EMPTY_CHILDREN) children = [ child ]; else children.push(child);
            lastSimple = simple;
        }
        var p = new VNode();
        p.nodeName = nodeName;
        p.children = children;
        p.attributes = null == attributes ? void 0 : attributes;
        p.key = null == attributes ? void 0 : attributes.key;
        if (void 0 !== options.vnode) options.vnode(p);
        return p;
    }
    function extend(obj, props) {
        for (var i in props) obj[i] = props[i];
        return obj;
    }
    function cloneElement(vnode, props) {
        return h(vnode.nodeName, extend(extend({}, vnode.attributes), props), arguments.length > 2 ? [].slice.call(arguments, 2) : vnode.children);
    }
    function enqueueRender(component) {
        if (!component.__d && (component.__d = !0) && 1 == items.push(component)) (options.debounceRendering || setTimeout)(rerender);
    }
    function rerender() {
        var p, list = items;
        items = [];
        while (p = list.pop()) if (p.__d) renderComponent(p);
    }
    function isSameNodeType(node, vnode, hydrating) {
        if ('string' == typeof vnode || 'number' == typeof vnode) return void 0 !== node.splitText;
        if ('string' == typeof vnode.nodeName) return !node._componentConstructor && isNamedNode(node, vnode.nodeName); else return hydrating || node._componentConstructor === vnode.nodeName;
    }
    function isNamedNode(node, nodeName) {
        return node.__n === nodeName || node.nodeName.toLowerCase() === nodeName.toLowerCase();
    }
    function getNodeProps(vnode) {
        var props = extend({}, vnode.attributes);
        props.children = vnode.children;
        var defaultProps = vnode.nodeName.defaultProps;
        if (void 0 !== defaultProps) for (var i in defaultProps) if (void 0 === props[i]) props[i] = defaultProps[i];
        return props;
    }
    function createNode(nodeName, isSvg) {
        var node = isSvg ? document.createElementNS('http://www.w3.org/2000/svg', nodeName) : document.createElement(nodeName);
        node.__n = nodeName;
        return node;
    }
    function removeNode(node) {
        if (node.parentNode) node.parentNode.removeChild(node);
    }
    function setAccessor(node, name, old, value, isSvg) {
        if ('className' === name) name = 'class';
        if ('key' === name) ; else if ('ref' === name) {
            if (old) old(null);
            if (value) value(node);
        } else if ('class' === name && !isSvg) node.className = value || ''; else if ('style' === name) {
            if (!value || 'string' == typeof value || 'string' == typeof old) node.style.cssText = value || '';
            if (value && 'object' == typeof value) {
                if ('string' != typeof old) for (var i in old) if (!(i in value)) node.style[i] = '';
                for (var i in value) node.style[i] = 'number' == typeof value[i] && IS_NON_DIMENSIONAL.test(i) === !1 ? value[i] + 'px' : value[i];
            }
        } else if ('dangerouslySetInnerHTML' === name) {
            if (value) node.innerHTML = value.__html || '';
        } else if ('o' == name[0] && 'n' == name[1]) {
            var useCapture = name !== (name = name.replace(/Capture$/, ''));
            name = name.toLowerCase().substring(2);
            if (value) {
                if (!old) node.addEventListener(name, eventProxy, useCapture);
            } else node.removeEventListener(name, eventProxy, useCapture);
            (node.__l || (node.__l = {}))[name] = value;
        } else if ('list' !== name && 'type' !== name && !isSvg && name in node) {
            setProperty(node, name, null == value ? '' : value);
            if (null == value || value === !1) node.removeAttribute(name);
        } else {
            var ns = isSvg && name !== (name = name.replace(/^xlink\:?/, ''));
            if (null == value || value === !1) if (ns) node.removeAttributeNS('http://www.w3.org/1999/xlink', name.toLowerCase()); else node.removeAttribute(name); else if ('function' != typeof value) if (ns) node.setAttributeNS('http://www.w3.org/1999/xlink', name.toLowerCase(), value); else node.setAttribute(name, value);
        }
    }
    function setProperty(node, name, value) {
        try {
            node[name] = value;
        } catch (e) {}
    }
    function eventProxy(e) {
        return this.__l[e.type](options.event && options.event(e) || e);
    }
    function flushMounts() {
        var c;
        while (c = mounts.pop()) {
            if (options.afterMount) options.afterMount(c);
            if (c.componentDidMount) c.componentDidMount();
        }
    }
    function diff(dom, vnode, context, mountAll, parent, componentRoot) {
        if (!diffLevel++) {
            isSvgMode = null != parent && void 0 !== parent.ownerSVGElement;
            hydrating = null != dom && !('__preactattr_' in dom);
        }
        var ret = idiff(dom, vnode, context, mountAll, componentRoot);
        if (parent && ret.parentNode !== parent) parent.appendChild(ret);
        if (!--diffLevel) {
            hydrating = !1;
            if (!componentRoot) flushMounts();
        }
        return ret;
    }
    function idiff(dom, vnode, context, mountAll, componentRoot) {
        var out = dom, prevSvgMode = isSvgMode;
        if (null == vnode) vnode = '';
        if ('string' == typeof vnode) {
            if (dom && void 0 !== dom.splitText && dom.parentNode && (!dom._component || componentRoot)) {
                if (dom.nodeValue != vnode) dom.nodeValue = vnode;
            } else {
                out = document.createTextNode(vnode);
                if (dom) {
                    if (dom.parentNode) dom.parentNode.replaceChild(out, dom);
                    recollectNodeTree(dom, !0);
                }
            }
            out.__preactattr_ = !0;
            return out;
        }
        if ('function' == typeof vnode.nodeName) return buildComponentFromVNode(dom, vnode, context, mountAll);
        isSvgMode = 'svg' === vnode.nodeName ? !0 : 'foreignObject' === vnode.nodeName ? !1 : isSvgMode;
        if (!dom || !isNamedNode(dom, String(vnode.nodeName))) {
            out = createNode(String(vnode.nodeName), isSvgMode);
            if (dom) {
                while (dom.firstChild) out.appendChild(dom.firstChild);
                if (dom.parentNode) dom.parentNode.replaceChild(out, dom);
                recollectNodeTree(dom, !0);
            }
        }
        var fc = out.firstChild, props = out.__preactattr_ || (out.__preactattr_ = {}), vchildren = vnode.children;
        if (!hydrating && vchildren && 1 === vchildren.length && 'string' == typeof vchildren[0] && null != fc && void 0 !== fc.splitText && null == fc.nextSibling) {
            if (fc.nodeValue != vchildren[0]) fc.nodeValue = vchildren[0];
        } else if (vchildren && vchildren.length || null != fc) innerDiffNode(out, vchildren, context, mountAll, hydrating || null != props.dangerouslySetInnerHTML);
        diffAttributes(out, vnode.attributes, props);
        isSvgMode = prevSvgMode;
        return out;
    }
    function innerDiffNode(dom, vchildren, context, mountAll, isHydrating) {
        var j, c, vchild, child, originalChildren = dom.childNodes, children = [], keyed = {}, keyedLen = 0, min = 0, len = originalChildren.length, childrenLen = 0, vlen = vchildren ? vchildren.length : 0;
        if (0 !== len) for (var i = 0; i < len; i++) {
            var _child = originalChildren[i], props = _child.__preactattr_, key = vlen && props ? _child._component ? _child._component.__k : props.key : null;
            if (null != key) {
                keyedLen++;
                keyed[key] = _child;
            } else if (props || (void 0 !== _child.splitText ? isHydrating ? _child.nodeValue.trim() : !0 : isHydrating)) children[childrenLen++] = _child;
        }
        if (0 !== vlen) for (var i = 0; i < vlen; i++) {
            vchild = vchildren[i];
            child = null;
            var key = vchild.key;
            if (null != key) {
                if (keyedLen && void 0 !== keyed[key]) {
                    child = keyed[key];
                    keyed[key] = void 0;
                    keyedLen--;
                }
            } else if (!child && min < childrenLen) for (j = min; j < childrenLen; j++) if (void 0 !== children[j] && isSameNodeType(c = children[j], vchild, isHydrating)) {
                child = c;
                children[j] = void 0;
                if (j === childrenLen - 1) childrenLen--;
                if (j === min) min++;
                break;
            }
            child = idiff(child, vchild, context, mountAll);
            if (child && child !== dom) if (i >= len) dom.appendChild(child); else if (child !== originalChildren[i]) if (child === originalChildren[i + 1]) removeNode(originalChildren[i]); else dom.insertBefore(child, originalChildren[i] || null);
        }
        if (keyedLen) for (var i in keyed) if (void 0 !== keyed[i]) recollectNodeTree(keyed[i], !1);
        while (min <= childrenLen) if (void 0 !== (child = children[childrenLen--])) recollectNodeTree(child, !1);
    }
    function recollectNodeTree(node, unmountOnly) {
        var component = node._component;
        if (component) unmountComponent(component); else {
            if (null != node.__preactattr_ && node.__preactattr_.ref) node.__preactattr_.ref(null);
            if (unmountOnly === !1 || null == node.__preactattr_) removeNode(node);
            removeChildren(node);
        }
    }
    function removeChildren(node) {
        node = node.lastChild;
        while (node) {
            var next = node.previousSibling;
            recollectNodeTree(node, !0);
            node = next;
        }
    }
    function diffAttributes(dom, attrs, old) {
        var name;
        for (name in old) if ((!attrs || null == attrs[name]) && null != old[name]) setAccessor(dom, name, old[name], old[name] = void 0, isSvgMode);
        for (name in attrs) if (!('children' === name || 'innerHTML' === name || name in old && attrs[name] === ('value' === name || 'checked' === name ? dom[name] : old[name]))) setAccessor(dom, name, old[name], old[name] = attrs[name], isSvgMode);
    }
    function collectComponent(component) {
        var name = component.constructor.name;
        (components[name] || (components[name] = [])).push(component);
    }
    function createComponent(Ctor, props, context) {
        var inst, list = components[Ctor.name];
        if (Ctor.prototype && Ctor.prototype.render) {
            inst = new Ctor(props, context);
            Component.call(inst, props, context);
        } else {
            inst = new Component(props, context);
            inst.constructor = Ctor;
            inst.render = doRender;
        }
        if (list) for (var i = list.length; i--; ) if (list[i].constructor === Ctor) {
            inst.__b = list[i].__b;
            list.splice(i, 1);
            break;
        }
        return inst;
    }
    function doRender(props, state, context) {
        return this.constructor(props, context);
    }
    function setComponentProps(component, props, opts, context, mountAll) {
        if (!component.__x) {
            component.__x = !0;
            if (component.__r = props.ref) delete props.ref;
            if (component.__k = props.key) delete props.key;
            if (!component.base || mountAll) {
                if (component.componentWillMount) component.componentWillMount();
            } else if (component.componentWillReceiveProps) component.componentWillReceiveProps(props, context);
            if (context && context !== component.context) {
                if (!component.__c) component.__c = component.context;
                component.context = context;
            }
            if (!component.__p) component.__p = component.props;
            component.props = props;
            component.__x = !1;
            if (0 !== opts) if (1 === opts || options.syncComponentUpdates !== !1 || !component.base) renderComponent(component, 1, mountAll); else enqueueRender(component);
            if (component.__r) component.__r(component);
        }
    }
    function renderComponent(component, opts, mountAll, isChild) {
        if (!component.__x) {
            var rendered, inst, cbase, props = component.props, state = component.state, context = component.context, previousProps = component.__p || props, previousState = component.__s || state, previousContext = component.__c || context, isUpdate = component.base, nextBase = component.__b, initialBase = isUpdate || nextBase, initialChildComponent = component._component, skip = !1;
            if (isUpdate) {
                component.props = previousProps;
                component.state = previousState;
                component.context = previousContext;
                if (2 !== opts && component.shouldComponentUpdate && component.shouldComponentUpdate(props, state, context) === !1) skip = !0; else if (component.componentWillUpdate) component.componentWillUpdate(props, state, context);
                component.props = props;
                component.state = state;
                component.context = context;
            }
            component.__p = component.__s = component.__c = component.__b = null;
            component.__d = !1;
            if (!skip) {
                rendered = component.render(props, state, context);
                if (component.getChildContext) context = extend(extend({}, context), component.getChildContext());
                var toUnmount, base, childComponent = rendered && rendered.nodeName;
                if ('function' == typeof childComponent) {
                    var childProps = getNodeProps(rendered);
                    inst = initialChildComponent;
                    if (inst && inst.constructor === childComponent && childProps.key == inst.__k) setComponentProps(inst, childProps, 1, context, !1); else {
                        toUnmount = inst;
                        component._component = inst = createComponent(childComponent, childProps, context);
                        inst.__b = inst.__b || nextBase;
                        inst.__u = component;
                        setComponentProps(inst, childProps, 0, context, !1);
                        renderComponent(inst, 1, mountAll, !0);
                    }
                    base = inst.base;
                } else {
                    cbase = initialBase;
                    toUnmount = initialChildComponent;
                    if (toUnmount) cbase = component._component = null;
                    if (initialBase || 1 === opts) {
                        if (cbase) cbase._component = null;
                        base = diff(cbase, rendered, context, mountAll || !isUpdate, initialBase && initialBase.parentNode, !0);
                    }
                }
                if (initialBase && base !== initialBase && inst !== initialChildComponent) {
                    var baseParent = initialBase.parentNode;
                    if (baseParent && base !== baseParent) {
                        baseParent.replaceChild(base, initialBase);
                        if (!toUnmount) {
                            initialBase._component = null;
                            recollectNodeTree(initialBase, !1);
                        }
                    }
                }
                if (toUnmount) unmountComponent(toUnmount);
                component.base = base;
                if (base && !isChild) {
                    var componentRef = component, t = component;
                    while (t = t.__u) (componentRef = t).base = base;
                    base._component = componentRef;
                    base._componentConstructor = componentRef.constructor;
                }
            }
            if (!isUpdate || mountAll) mounts.unshift(component); else if (!skip) {
                flushMounts();
                if (component.componentDidUpdate) component.componentDidUpdate(previousProps, previousState, previousContext);
                if (options.afterUpdate) options.afterUpdate(component);
            }
            if (null != component.__h) while (component.__h.length) component.__h.pop().call(component);
            if (!diffLevel && !isChild) flushMounts();
        }
    }
    function buildComponentFromVNode(dom, vnode, context, mountAll) {
        var c = dom && dom._component, originalComponent = c, oldDom = dom, isDirectOwner = c && dom._componentConstructor === vnode.nodeName, isOwner = isDirectOwner, props = getNodeProps(vnode);
        while (c && !isOwner && (c = c.__u)) isOwner = c.constructor === vnode.nodeName;
        if (c && isOwner && (!mountAll || c._component)) {
            setComponentProps(c, props, 3, context, mountAll);
            dom = c.base;
        } else {
            if (originalComponent && !isDirectOwner) {
                unmountComponent(originalComponent);
                dom = oldDom = null;
            }
            c = createComponent(vnode.nodeName, props, context);
            if (dom && !c.__b) {
                c.__b = dom;
                oldDom = null;
            }
            setComponentProps(c, props, 1, context, mountAll);
            dom = c.base;
            if (oldDom && dom !== oldDom) {
                oldDom._component = null;
                recollectNodeTree(oldDom, !1);
            }
        }
        return dom;
    }
    function unmountComponent(component) {
        if (options.beforeUnmount) options.beforeUnmount(component);
        var base = component.base;
        component.__x = !0;
        if (component.componentWillUnmount) component.componentWillUnmount();
        component.base = null;
        var inner = component._component;
        if (inner) unmountComponent(inner); else if (base) {
            if (base.__preactattr_ && base.__preactattr_.ref) base.__preactattr_.ref(null);
            component.__b = base;
            removeNode(base);
            collectComponent(component);
            removeChildren(base);
        }
        if (component.__r) component.__r(null);
    }
    function Component(props, context) {
        this.__d = !0;
        this.context = context;
        this.props = props;
        this.state = this.state || {};
    }
    function render(vnode, parent, merge) {
        return diff(merge, vnode, {}, !1, parent, !1);
    }
    var options = {};
    var stack = [];
    var EMPTY_CHILDREN = [];
    var IS_NON_DIMENSIONAL = /acit|ex(?:s|g|n|p|$)|rph|ows|mnc|ntw|ine[ch]|zoo|^ord/i;
    var items = [];
    var mounts = [];
    var diffLevel = 0;
    var isSvgMode = !1;
    var hydrating = !1;
    var components = {};
    extend(Component.prototype, {
        setState: function(state, callback) {
            var s = this.state;
            if (!this.__s) this.__s = extend({}, s);
            extend(s, 'function' == typeof state ? state(s, this.props) : state);
            if (callback) (this.__h = this.__h || []).push(callback);
            enqueueRender(this);
        },
        forceUpdate: function(callback) {
            if (callback) (this.__h = this.__h || []).push(callback);
            renderComponent(this, 2);
        },
        render: function() {}
    });
    var preact = {
        h: h,
        createElement: h,
        cloneElement: cloneElement,
        Component: Component,
        render: render,
        rerender: rerender,
        options: options
    };
    if ('undefined' != typeof module) module.exports = preact; else self.preact = preact;
}();

},{}],4:[function(require,module,exports){
'use strict';

var _createClass = function () {
	function defineProperties(target, props) {
		for (var i = 0; i < props.length; i++) {
			var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);
		}
	}return function (Constructor, protoProps, staticProps) {
		if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
	};
}();

function _classCallCheck(instance, Constructor) {
	if (!(instance instanceof Constructor)) {
		throw new TypeError("Cannot call a class as a function");
	}
}

function _possibleConstructorReturn(self, call) {
	if (!self) {
		throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
	}return call && (typeof call === "object" || typeof call === "function") ? call : self;
}

function _inherits(subClass, superClass) {
	if (typeof superClass !== "function" && superClass !== null) {
		throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
	}subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } });if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

require('./polyfills.js');
require('./assert.js').pollute(); // inject Assert and Test into window global object
var React = require('preact'),
    FileSaver = require('file-saver'),
    FileOpener = require('./components/FileOpener.js'),
    AppMenu = require('./components/AppMenu.js'),
    WeaveView = require('./components/WeaveView.js'),
    NoteEditor = require('./components/NoteEditor.js'),
    Bind = require('./bind.js'),
    LZW = require('lz-string'),
    Source = require('./Sourcery.js'),
    Actions = require('./actions.js'),
    Style = {
	app: 'width: 100vw;',
	menuButton: {
		zIndex: 22,
		minHeight: '2.5rem',
		padding: '0.5rem 0.75rem',
		width: '7rem',
		position: 'fixed',
		left: 0,

		outline: 'none',
		backgroundColor: '#000000',

		border: 'none',
		borderBottom: 'thin solid #777',

		color: '#fff',
		fontSize: '1.2rem',

		cursor: 'pointer'
	}
},
    THREADS = [{ name: '', color: '#000000' }, { name: '', color: '#333333' }, { name: '', color: '#666666' }, { name: '', color: '#999999' }, { name: '', color: '#b21f35' }, { name: '', color: '#d82735' }, { name: '', color: '#ff7435' }, { name: '', color: '#ffa135' }, { name: '', color: '#ffcb35' }, { name: '', color: '#00753a' }, { name: '', color: '#009e47' }, { name: '', color: '#16dd36' }, { name: '', color: '#0052a5' }, { name: '', color: '#0079e7' }, { name: '', color: '#06a9fc' }, { name: '', color: '#681e7e' }, { name: '', color: '#7d3cb5' }, { name: '', color: '#bd7af6' }];

var App = function (_React$Component) {
	_inherits(App, _React$Component);

	function App(props, context) {
		_classCallCheck(this, App);

		var _this = _possibleConstructorReturn(this, (App.__proto__ || Object.getPrototypeOf(App)).call(this, props, context));

		_this.state = {

			isEditing: false,
			targetNote: undefined,
			noteCoords: undefined,

			menuOpen: false,
			menuOffset: '0rem',
			menuGroups: [],
			menuButton: {},

			project: Source.getLocal('weave-project'),
			store: Source.getLocal('weave-store')
		};

		if (_this.state.project) _this.state.project = JSON.parse(_this.state.project);else _this.state.project = { title: 'Welcome to Weave', wordCount: 4, sceneCount: 1 };

		if (_this.state.store) _this.state.store = JSON.parse(LZW.decompressFromUTF16(_this.state.store));else _this.state.store = {
			scenes: [{ datetime: '1999-10-26', notes: [{ thread: 0, head: 'Welcome to Weave!', body: 'This is the place!', wc: 4 }] }],
			threads: Object.assign([], THREADS),
			locations: ['Star Labs']
		};

		Bind(_this);

		_this.state.project = Object.assign({ title: _this.state.project.title }, _this.countProject());
		_this.state.menuButton = _this.projectButton();
		_this.state.menuGroups = _this.projectMeta();
		return _this;
	}

	_createClass(App, [{
		key: 'countProject',
		value: function countProject() {
			return {
				wordCount: this.state.store.scenes.reduce(function (wc, slice) {
					return wc + slice.notes.reduce(function (wc, note) {
						return note ? wc + note.wc : wc;
					}, 0);
				}, 0),
				sceneCount: this.state.store.scenes.reduce(function (scenes, slice) {
					return scenes + slice.notes.reduce(function (scenes, note) {
						return note ? scenes + 1 : scenes;
					}, 0);
				}, 0)
			};
		}
	}, {
		key: 'componentDidMount',
		value: function componentDidMount() {
			window.addEventListener('resize', this.onResize);
		}
	}, {
		key: 'componentWillUnmount',
		value: function componentWillUnmount() {
			window.removeEventListener('resize', this.onResize);
		}
	}, {
		key: 'render',
		value: function render(props, state) {
			var _this2 = this;

			var children = [React.createElement(FileOpener, {
				ref: function ref(el) {
					return _this2.FileOpener = el.base;
				},
				onChange: this.openProject
			})];

			if (state.menuOpen) {
				children.push(React.createElement(AppMenu, {
					groups: state.menuGroups,
					ref: function ref(el) {
						if (el && el.base.clientHeight != _this2.state.menuOffset) _this2.setState({ menuOffset: el.base.clientHeight });
					}
				}));
				if (state.menuButton) children.push(React.createElement('button', {
					style: Object.assign({ top: state.menuOffset, marginTop: '1px' }, Style.menuButton),
					onClick: function onClick(e) {
						if (state.menuButton.onClick) state.menuButton.onClick(e);
						_this2.setState({ menuOpen: false, menuOffset: '0rem' });
					}
				}, state.menuButton.opened.value));
			} else children.push(React.createElement('button', {
				style: Object.assign({ top: '0rem' }, Style.menuButton),
				onClick: function onClick(e) {
					if (state.menuButton.closed.onClick) state.menuButton.closed.onClick(e);
					_this2.setState({ menuOpen: true, menuOffset: '2.5rem' });
				}
			}, state.menuButton.closed.value));

			children.push(state.isEditing ? React.createElement(NoteEditor, {
				menuOffset: state.menuOffset,
				note: state.targetNote,
				coords: state.noteCoords,
				thread: state.store.threads[state.targetNote.thread],
				menu: this.layoutMenu,
				onDone: this.onDone
			}) : React.createElement(WeaveView, {
				menuOffset: state.menuOffset,
				scenes: state.store.scenes,
				threads: state.store.threads,
				locations: state.store.locations,
				menu: this.layoutMenu,
				editNote: this.editNote,
				windowWidth: window.innerWidth
			}));

			return React.createElement('div', { id: 'app', style: Style.app }, children);
		}
	}, {
		key: 'editNote',
		value: function editNote(coords) {
			this.setState({
				isEditing: true,
				noteCoords: coords,
				targetNote: this.state.store.scenes[coords.sliceIndex].notes[coords.noteIndex],
				menuOpen: true
			});
		}
	}, {
		key: 'projectButton',
		value: function projectButton() {
			return AppMenu.main(AppMenu.text('done'), AppMenu.text(this.state.project.title.length ? this.state.project.title : 'Project'));
		}
	}, {
		key: 'projectMeta',
		value: function projectMeta() {
			var _this3 = this;

			return [[AppMenu.input('Project Title', this.state.project.title, function (event) {
				_this3.state.project.title = event.target.value;
				_this3.setState({ menuGroups: _this3.projectMeta(event.target.value), menuButton: _this3.projectButton() });
				_this3.saveProject();
			})], [AppMenu.text(this.state.project.sceneCount + ' scenes'), AppMenu.text(this.state.project.wordCount + ' words')], [AppMenu.btn('import', function (event) {
				return _this3.FileOpener.click();
			}), AppMenu.btn('export', function (event) {
				return FileSaver.saveAs(new Blob([JSON.stringify(Object.assign({}, _this3.state.project, _this3.state.store))], { type: "text/plain;charset=utf-8" }), _this3.state.project.title + '.weave');
			}), AppMenu.btn('print', function (event) {
				return console.log("TODO!");
			})], [AppMenu.deleteBtn(this.delete)]];
		}
	}, {
		key: 'onResize',
		value: function onResize() {
			this.forceUpdate();
		}
	}, {
		key: 'onDone',
		value: function onDone() {
			this.setState({
				targetNote: null,
				noteCoords: null,
				isEditing: false,
				menuOpen: false,
				menuButton: this.projectButton(),
				menuGroups: this.projectMeta(),
				menuOffset: '0rem'
			});
		}
	}, {
		key: 'do',
		value: function _do(action, data) {
			this.state.store = Actions[action](data, this.state.store);
			this.state.project = Object.assign({}, this.state.project, this.countProject());
			this.setState({
				menuGroups: this.state.menuGroups[0][0].onInput ? this.projectMeta() : this.state.menuGroups
			});
			this.save();
		}
	}, {
		key: 'delete',
		value: function _delete() {
			this.state.project = {
				title: 'Project Title',
				wordCount: 0,
				sceneCount: 0
			};
			this.setState({
				menuOpen: false,
				menuButton: this.projectButton(),
				menuGroups: this.projectMeta(),
				menuOffset: '0rem',
				store: {
					scenes: [{ datetime: '', notes: [null] }],
					threads: Object.assign([], THREADS),
					locations: ['']
				}
			});
			this.save();
		}
	}, {
		key: 'openProject',
		value: function openProject(data) {

			data = JSON.parse(data);
			this.state.project = { title: data.title, wordCount: data.wordCount, sceneCount: data.sceneCount };
			this.state.store = { scenes: data.scenes, threads: data.threads, locations: data.locations };
			this.setState({
				menuOpen: false,
				menuButton: this.projectButton(),
				menuGroups: this.projectMeta(),
				menuOffset: '0rem'
			});
			this.save();
		}
	}, {
		key: 'save',
		value: function save() {
			this.saveProject();
			this.saveStore();
		}
	}, {
		key: 'saveProject',
		value: function saveProject() {
			Source.setLocal('weave-project', JSON.stringify(this.state.project));
		}
	}, {
		key: 'saveStore',
		value: function saveStore() {
			Source.setLocal('weave-store', LZW.compressToUTF16(JSON.stringify(this.state.store)));
		}
	}, {
		key: 'getChildContext',
		value: function getChildContext() {
			var _this4 = this;

			return {
				do: this.do,
				useMenu: function useMenu(menuButton, menuGroups) {
					return _this4.setState({ menuOpen: true, menuButton: menuButton, menuGroups: menuGroups, menuOffset: '2.5rem' });
				},
				releaseMenu: function releaseMenu() {
					return _this4.setState({ menuOpen: false, menuButton: _this4.projectButton(), menuGroups: _this4.projectMeta(), menuOffset: '0rem' });
				},
				modal: function modal(contents) {
					return _this4.setState({ modal: contents });
				}
			};
		}
	}]);

	return App;
}(React.Component);

React.options.debounceRendering = window.requestAnimationFrame;

React.render(React.createElement(App, null), document.body);

},{"./Sourcery.js":5,"./actions.js":6,"./assert.js":7,"./bind.js":8,"./components/AppMenu.js":10,"./components/FileOpener.js":13,"./components/NoteEditor.js":15,"./components/WeaveView.js":22,"./polyfills.js":23,"file-saver":1,"lz-string":2,"preact":3}],5:[function(require,module,exports){
'use strict';

module.exports = {
	/*get: function(key) {
 	},
 set: function(key, value) {
 	},*/
	checkStatus: function checkStatus(serverURL) {
		var status = {
			local: false,
			online: false
		};
		// check if localStorage exists
		try {
			window.localStorage.setItem('checkStatus', 'a');
			window.localStorage.getItem('checkStatus');
			window.localStorage.removeItem('checkStatus');
			status.local = true;
		} catch (e) {}
		// check if online
		status.online = window.navigator.onLine;

		return status;
	},
	getLocal: function getLocal(key) {
		return window.localStorage.getItem(key);
	},
	setLocal: function setLocal(key, value) {
		var success = true;
		if (value === undefined) window.localStorage.removeItem(key);else try {
			window.localStorage.setItem(key, value);
		} catch (e) {
			// localStorage is full
			success = false;
		}
		return success;
	}
};

},{}],6:[function(require,module,exports){
'use strict';

module.exports = {
	// SLICE ACTIONS
	NEW_SLICE: function NEW_SLICE(action, store) {
		store.scenes = Object.assign([], store.scenes);
		store.scenes.splice(action.atIndex, 0, {
			datetime: '',
			notes: store.locations.map(function () {
				return null;
			})
		});
		return store;
	},
	DELETE_SLICE: function DELETE_SLICE(action, store) {
		store.scenes = Object.assign([], store.scenes);
		action.slice = store.scenes.splice(action.atIndex, 1);
		return store;
	},
	MODIFY_SLICE_DATE: function MODIFY_SLICE_DATE(action, store) {
		store.scenes = Object.assign([], store.scenes);
		store.scenes[action.atIndex].datetime = action.newDate;
		return store;
	},

	// NOTE ACTIONS
	NEW_NOTE: function NEW_NOTE(action, store) {
		store.scenes = Object.assign([], store.scenes);
		store.scenes[action.sliceIndex].notes.splice(action.noteIndex, 1, {
			thread: 0,
			head: '',
			body: '',
			wc: 0
		});
		return store;
	},
	DELETE_NOTE: function DELETE_NOTE(action, store) {
		store.scenes = Object.assign([], store.scenes);
		store.scenes[action.sliceIndex].notes[action.noteIndex] = null;
		return store;
	},
	MODIFY_NOTE_HEAD: function MODIFY_NOTE_HEAD(action, store) {
		store.scenes = Object.assign([], store.scenes);
		store.scenes[action.sliceIndex].notes[action.noteIndex].head = action.newHead;
		return store;
	},
	MODIFY_NOTE_BODY: function MODIFY_NOTE_BODY(action, store) {
		store.scenes = Object.assign([], store.scenes);
		var note = store.scenes[action.sliceIndex].notes[action.noteIndex];
		note.body = action.newBody;
		note.wc = action.wc;
		return store;
	},
	MODIFY_NOTE_THREAD: function MODIFY_NOTE_THREAD(action, store) {
		var note;
		store.slices = Object.assign([], store.slices);
		note = store.scenes[action.sliceIndex].notes[action.noteIndex];
		if (++note.thread === store.threads.length) note.thread = 0;
		return store;
	},

	// LOCATION ACTIONS
	NEW_LOCATION: function NEW_LOCATION(action, store) {
		var i = store.scenes.length;
		store.locations = Object.assign([], store.locations);
		store.scenes = Object.assign([], store.scenes);
		store.locations.push('');
		while (i--) {
			store.scenes[i].notes.push(null);
		}return store;
	},
	DELETE_LOCATION: function DELETE_LOCATION(action, store) {
		var i = store.scenes.length;
		store.locations = Object.assign([], store.locations);
		store.scenes = Object.assign([], store.scenes);
		action.location = store.locations.splice(action.atIndex, 1);
		while (i--) {
			store.scenes[i].notes.splice(action.atIndex, 1);
		}return store;
	},
	MOVE_LOCATION: function MOVE_LOCATION(action, store) {
		var i = store.scenes.length,
		    notes;
		store.locations = Object.assign([], store.locations);
		store.scenes = Object.assign([], store.scenes);
		store.locations.splice(action.toIndex, 0, store.locations.splice(action.fromIndex, 1));
		while (i--) {
			notes = store.scenes[i].notes;
			notes.splice(action.toIndex, 0, notes.splice(action.fromIndex, 1));
		}
		return store;
	},
	MODIFY_LOCATION_NAME: function MODIFY_LOCATION_NAME(action, store) {
		store.locations = Object.assign([], store.locations);
		store.locations[action.atIndex] = action.newName;
		return store;
	},

	// THREAD ACTIONS
	NEW_THREAD: function NEW_THREAD(action, store) {
		store.threads = Object.assign([], store.threads);
		store.threads.push({
			color: action.color,
			name: action.name
		});
		return store;
	},
	DELETE_THREAD: function DELETE_THREAD(action, store) {
		store.threads = Object.assign([], store.threads);
		store.splice(action.atIndex, 1);
		return store;
	},
	MODIFY_THREAD_NAME: function MODIFY_THREAD_NAME(action, store) {
		store.threads = Object.assign([], store.threads);
		store.threads[action.atIndex].name = action.newName;
		return store;
	}
};

},{}],7:[function(require,module,exports){
'use strict';

function AssertionError(message) {
	var e = new Error(message);
	e.name = 'AssertionError';
	return e;
}

function Assert(condition, message) {
	if (condition) return;else throw AssertionError(message);
}

function DeepEquals(a, b) {}

function Pollute() {
	window.Test = Assert;
	window.Assert = Assert;
}

if (module.exports) module.exports = {
	Test: Assert,
	Assert: Assert,
	pollute: Pollute
};

},{}],8:[function(require,module,exports){
'use strict';

// convenience method
// binds every function in instance's prototype to the instance itself

module.exports = function (instance) {
	var proto = instance.constructor.prototype,
	    keys = Object.getOwnPropertyNames(proto),
	    key;
	while (key = keys.pop()) {
		if (typeof proto[key] === 'function' && key !== 'constructor') instance[key] = instance[key].bind(instance);
	}
};

},{}],9:[function(require,module,exports){
'use strict';

var colors = ['#000000', '#333333', '#666666', '#999999', '#b21f35', '#d82735', '#ff7435', '#ffa135', '#ffcb35', '#fff735', '#00753a', '#009e47', '#16dd36', '#0052a5', '#0079e7', '#06a9fc', '#681e7e', '#7d3cb5', '#bd7af6'];

module.exports = function (old) {
	var i = colors.indexOf(old);

	return colors[++i === colors.length ? 0 : i];
};

},{}],10:[function(require,module,exports){
'use strict';

var React = require('preact'),
    Style = {
	toolbar: {
		zIndex: '20',
		position: 'fixed',
		top: '0',
		left: '0',
		right: '0',

		width: '100%',
		border: 'none',
		borderBottom: 'thin solid #777',

		backgroundColor: '#000000',

		color: '#fff'
	},
	menu: {
		width: '100%',

		display: 'flex',
		flexWrap: 'wrap',
		justifyContent: 'space-between'
	},
	ul: {
		display: 'flex',
		justifyContent: 'space-between',
		alignItems: 'center',

		listStyle: 'none'
	},
	li: {
		display: 'inline-flex',
		justifyContent: 'center',
		alignItems: 'center',
		margin: '0 0.5rem'
	},
	item: {
		height: '2.5rem',
		padding: '0 0.75rem',

		border: 'none',
		outline: 'none',
		backgroundColor: '#000000',

		color: '#fff',
		fontSize: '1.2rem',

		cursor: 'pointer'
	},
	img: {
		width: '1.2rem',
		height: '1.2rem'
	},
	span: {
		paddingTop: '1rem',
		height: '2rem'
	},
	text: {
		fontSize: '1rem'
	},
	input: {
		height: '2rem',
		maxWidth: '95vw',
		padding: '0 0.75rem',
		border: 'none',
		borderBottom: 'thin solid #fff',
		outline: 'none',
		backgroundColor: '#000',
		fontSize: '1.2rem',
		color: '#fff'
	}
};

function MeasureText(text) {
	var wide = text.match(/[WM]/g),
	    thin = text.match(/[Itrlij!. ]/g);

	wide = wide ? wide.length : 0;
	thin = thin ? thin.length : 0;

	return text.length + wide * 1.2 - thin * 0.3;
}

function AppMenu(props, state) {
	return React.createElement('div', {
		id: 'toolbar',
		style: Style.toolbar
	}, React.createElement('menu', {
		type: 'toolbar',
		style: Style.menu,
		ref: props.ref
	}, props.groups.map(function (group) {
		return React.createElement('ul', { style: Style.ul }, group.map(function (item) {
			// BUTTON ITEM
			if (item.onClick || item.onHold) return React.createElement('li', { style: Style.li }, React.createElement('button', {
				style: item.style ? Object.assign({}, Style.item, item.style) : Style.item,
				onClick: function onClick(e) {
					e.target.style.color = item.style ? item.style.color || "#fff" : '#fff';
					if (item.onClick) item.onClick(e);
					if (item.timer) {
						clearTimeout(item.timer);
						item.timer = undefined;
					}
				},
				onMouseDown: function onMouseDown(e) {
					e.target.style.color = "#777";
					if (item.onHold) item.timer = setTimeout(item.onHold, 1000, e);
				},
				name: item.name }, item.icon ? React.createElement('img', {
				style: Style.img,
				src: item.icon
			}) : item.value));
			// TEXT INPUT ITEM
			if (item.onInput) return React.createElement('li', { style: Style.li }, React.createElement('input', {
				style: item.style ? Object.assign({}, Style.input, item.style) : Style.input,
				type: 'text',
				placeholder: item.placeholder,
				maxLength: 40,
				size: Math.max(MeasureText(item.value.length ? item.value : props.placeholder || ''), 20),
				onInput: item.onInput,
				value: item.value
			}));
			// TEXT ITEM
			return React.createElement('li', { style: Object.assign({}, Style.li, Style.text, item.style ? item.style : {}) }, React.createElement('span', { style: Style.span }, item.value));
		}));
	})));
};

AppMenu.main = function (o, c) {
	return {
		opened: o,
		closed: c
	};
};

AppMenu.input = function (p, v, f, s) {
	return { placeholder: p, value: v, onInput: f, style: s ? s : undefined };
};

AppMenu.text = function (v, s) {
	return { value: v, style: s ? s : undefined };
};

AppMenu.btn = function (v, f, s) {
	return { value: v, onClick: f, style: s ? s : undefined };
};

AppMenu.deleteBtn = function (f) {
	return {
		value: 'delete',
		style: { color: '#f00', transition: 'color 1s' },
		onHold: f
	};
};

module.exports = AppMenu;

},{"preact":3}],11:[function(require,module,exports){
'use strict';

var _createClass = function () {
	function defineProperties(target, props) {
		for (var i = 0; i < props.length; i++) {
			var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);
		}
	}return function (Constructor, protoProps, staticProps) {
		if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
	};
}();

function _classCallCheck(instance, Constructor) {
	if (!(instance instanceof Constructor)) {
		throw new TypeError("Cannot call a class as a function");
	}
}

function _possibleConstructorReturn(self, call) {
	if (!self) {
		throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
	}return call && (typeof call === "object" || typeof call === "function") ? call : self;
}

function _inherits(subClass, superClass) {
	if (typeof superClass !== "function" && superClass !== null) {
		throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
	}subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } });if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

var React = require('preact'),
    Style = {
	btn: {
		width: '2rem',
		height: '2rem',
		borderRadius: '1rem',

		border: 'none',
		outline: 'none',
		backgroundColor: '#555',

		color: '#f00',
		fontSize: '1.2rem',
		transition: 'color 1s',

		cursor: 'pointer'
	}
};

var DeleteButton = function (_React$Component) {
	_inherits(DeleteButton, _React$Component);

	function DeleteButton(props, context) {
		_classCallCheck(this, DeleteButton);

		return _possibleConstructorReturn(this, (DeleteButton.__proto__ || Object.getPrototypeOf(DeleteButton)).call(this, props, context));
	}

	_createClass(DeleteButton, [{
		key: 'render',
		value: function render(props) {
			var _this2 = this;

			return React.createElement('button', {
				style: props.style ? Object.assign({}, Style.btn, props.style) : Style.btn,
				onClick: function onClick(e) {
					e.target.style.color = '#f00';
					if (_this2.timer) {
						clearTimeout(_this2.timer);
						_this2.timer = undefined;
					}
				},
				onMouseDown: function onMouseDown(e) {
					e.target.style.color = "#777";
					if (props.onHold) _this2.timer = setTimeout(props.onHold, 1000, e);
				}
			}, 'X');
		}
	}]);

	return DeleteButton;
}(React.Component);

module.exports = DeleteButton;

},{"preact":3}],12:[function(require,module,exports){
'use strict';

var _createClass = function () {
	function defineProperties(target, props) {
		for (var i = 0; i < props.length; i++) {
			var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);
		}
	}return function (Constructor, protoProps, staticProps) {
		if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
	};
}();

function _classCallCheck(instance, Constructor) {
	if (!(instance instanceof Constructor)) {
		throw new TypeError("Cannot call a class as a function");
	}
}

function _possibleConstructorReturn(self, call) {
	if (!self) {
		throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
	}return call && (typeof call === "object" || typeof call === "function") ? call : self;
}

function _inherits(subClass, superClass) {
	if (typeof superClass !== "function" && superClass !== null) {
		throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
	}subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } });if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

var React = require('preact'),
    Style = {
	editBox: {
		outline: 'none',
		border: 'none',
		overflow: 'hidden',
		resize: 'none'
	}
};

var ExpandingTextarea = function (_React$Component) {
	_inherits(ExpandingTextarea, _React$Component);

	function ExpandingTextarea(props, context) {
		_classCallCheck(this, ExpandingTextarea);

		var _this = _possibleConstructorReturn(this, (ExpandingTextarea.__proto__ || Object.getPrototypeOf(ExpandingTextarea)).call(this, props, context));

		_this.state = {
			style: Object.assign({}, Style.editBox, { height: props.baseHeight })
		};

		_this.onInput = _this.onInput.bind(_this);
		_this.doResize = _this.doResize.bind(_this);
		_this.resize = _this.resize.bind(_this);
		return _this;
	}

	_createClass(ExpandingTextarea, [{
		key: 'render',
		value: function render(props, state) {
			var style = Object.assign({}, props.style, state.style);
			return React.createElement('textarea', {
				style: style,
				maxlength: props.maxlength,
				placeholder: props.placeholder,
				onInput: this.onInput,
				onChange: props.change,
				onFocus: props.focus,
				onBlur: props.blur
			});
		}
	}, {
		key: 'componentDidMount',
		value: function componentDidMount() {
			this.base.value = this.props.value !== undefined ? this.props.value : "No default value set...";
			this.doResize();
			window.addEventListener('resize', this.doResize);
		}
	}, {
		key: 'componentWillUnmount',
		value: function componentWillUnmount() {
			window.removeEventListener('resize', this.doResize);
		}
	}, {
		key: 'onInput',
		value: function onInput(event) {
			if (this.props.input) this.props.input(event);
			this.doResize();
		}
	}, {
		key: 'doResize',
		value: function doResize() {
			this.state.style.height = this.props.baseHeight;
			this.forceUpdate(this.resize);
		}
	}, {
		key: 'resize',
		value: function resize() {
			this.state.style.height = this.base.scrollHeight + 'px';
			this.forceUpdate();
		}
	}]);

	return ExpandingTextarea;
}(React.Component);

module.exports = ExpandingTextarea;

},{"preact":3}],13:[function(require,module,exports){
"use strict";

var React = require('preact'),
    Reader = new FileReader();

module.exports = function (props) {
	return React.createElement("input", {
		type: "file",
		accept: ".weave",
		style: {
			position: 'absolute',
			visibility: 'hidden',
			top: '-50',
			left: '-50'
		},
		onchange: function onchange(e) {
			Reader.onloadend = function () {
				return props.onChange(Reader.result);
			};
			Reader.readAsText(e.target.files[0]);
		}
	});
};

},{"preact":3}],14:[function(require,module,exports){
'use strict';

var _createClass = function () {
	function defineProperties(target, props) {
		for (var i = 0; i < props.length; i++) {
			var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);
		}
	}return function (Constructor, protoProps, staticProps) {
		if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
	};
}();

function _classCallCheck(instance, Constructor) {
	if (!(instance instanceof Constructor)) {
		throw new TypeError("Cannot call a class as a function");
	}
}

function _possibleConstructorReturn(self, call) {
	if (!self) {
		throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
	}return call && (typeof call === "object" || typeof call === "function") ? call : self;
}

function _inherits(subClass, superClass) {
	if (typeof superClass !== "function" && superClass !== null) {
		throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
	}subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } });if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

var React = require('preact'),
    ExpandingTextarea = require('./ExpandingTextarea.js'),
    Bind = require('../bind.js'),
    Style = {
	locationHeader: {
		zIndex: '10',
		width: '7rem',
		color: '#fff',
		backgroundColor: '#777777',
		outline: 'none',
		fontSize: '0.9rem',
		border: 'none',
		textAlign: 'center',
		paddingTop: '0.5rem'
	}
};

var LocationHeader = function (_React$Component) {
	_inherits(LocationHeader, _React$Component);

	function LocationHeader(props, context) {
		_classCallCheck(this, LocationHeader);

		var _this = _possibleConstructorReturn(this, (LocationHeader.__proto__ || Object.getPrototypeOf(LocationHeader)).call(this, props, context));

		_this.state = {
			value: props.value
		};
		return _this;
	}

	_createClass(LocationHeader, [{
		key: 'shouldComponentUpdate',
		value: function shouldComponentUpdate(props, state, context) {
			return props.value !== this.props.value && state.value !== this.state.value;
		}
	}, {
		key: 'render',
		value: function render(props, state) {
			var _this2 = this;

			return React.createElement(ExpandingTextarea, {
				type: 'text',
				style: Style.locationHeader,
				maxLength: '24',
				baseHeight: '0.9rem',
				value: state.value,
				placeholder: 'place',
				input: function input(event) {
					return _this2.setState({ value: event.target.value });
				},
				change: function change(event) {
					return _this2.context.do('MODIFY_LOCATION_NAME', {
						atIndex: _this2.props.id,
						newName: event.target.value
					});
				}
			});
		}
	}]);

	return LocationHeader;
}(React.Component);

module.exports = LocationHeader;

},{"../bind.js":8,"./ExpandingTextarea.js":12,"preact":3}],15:[function(require,module,exports){
'use strict';

var _createClass = function () {
	function defineProperties(target, props) {
		for (var i = 0; i < props.length; i++) {
			var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);
		}
	}return function (Constructor, protoProps, staticProps) {
		if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
	};
}();

function _classCallCheck(instance, Constructor) {
	if (!(instance instanceof Constructor)) {
		throw new TypeError("Cannot call a class as a function");
	}
}

function _possibleConstructorReturn(self, call) {
	if (!self) {
		throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
	}return call && (typeof call === "object" || typeof call === "function") ? call : self;
}

function _inherits(subClass, superClass) {
	if (typeof superClass !== "function" && superClass !== null) {
		throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
	}subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } });if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

var React = require('preact'),
    ExpandingTextarea = require('./ExpandingTextarea.js'),
    AppMenu = require('./AppMenu.js'),
    ThreadLabel = require('./ThreadLabel.js'),
    Bind = require('../bind.js'),
    Style = {
	box: {
		zIndex: '0',

		maxWidth: '50rem',

		backgroundColor: '#fff',
		color: '#222',

		marginLeft: 'auto',
		marginRight: 'auto',
		paddingTop: '1.5rem',

		display: 'flex',
		flexDirection: 'column',
		justifyContent: 'space-around',
		alignItems: 'stretch'
	},
	top: {
		paddingLeft: '1.5rem',
		paddingRight: '1.5rem',

		display: 'flex',
		flexWrap: 'wrap',
		justifyContent: 'flex-start'
	},
	thread: {
		color: '#fff',
		fontSize: '0.75rem',
		height: '1rem',

		borderRadius: '1rem',

		marginBottom: '0.5rem',
		marginRight: '0.5rem',
		padding: '0.25rem 0.5rem 0.2rem 0.5rem'
	},
	noteHead: {
		color: '#222',
		fontSize: '1.7rem',

		margin: '0.5rem 1.5rem'
	},
	noteBody: {
		color: '#222',
		fontSize: '1.1rem',
		margin: '0.5rem 1.5rem'
	},
	stats: {
		backgroundColor: '#fff',
		color: '#555',
		fontSize: '1rem',

		margin: '0',
		padding: '0.75rem 1.5rem 0.75rem 1.5rem',

		display: 'flex',
		flexDirection: 'row',
		justifyContent: 'space-around'
	},
	wc: {
		textAlign: 'right',

		display: 'inline-block',
		float: 'right'
	},
	statSticky: {
		bottom: '0',
		position: 'sticky'
	},
	statFree: {
		bottom: 'auto',
		position: 'inherit'
	}
},
    testWords = /[\w'’]+(?!\w*>)/igm; // capture words and ignore html tags or special chars

function count(text) {
	var wc = 0;

	testWords.lastIndex = 0;
	while (testWords.test(text)) {
		wc++;
	}return wc;
}

var NoteEditor = function (_React$Component) {
	_inherits(NoteEditor, _React$Component);

	function NoteEditor(props, context) {
		_classCallCheck(this, NoteEditor);

		var _this = _possibleConstructorReturn(this, (NoteEditor.__proto__ || Object.getPrototypeOf(NoteEditor)).call(this, props, context));

		_this.state = {
			threadStyle: Object.assign({}, Style.thread, { backgroundColor: props.thread.color }),
			head: props.note.head,
			body: props.note.body,
			wc: props.note.wc,
			pages: 1,
			pageOf: 1,
			statStyle: {}
		};

		Bind(_this);
		return _this;
	}

	_createClass(NoteEditor, [{
		key: 'render',
		value: function render(props, state) {
			var _this2 = this;

			return React.createElement('div', {
				ref: this.mounted,
				style: Object.assign({ marginTop: props.menuOffset === '0rem' ? '1rem' : props.menuOffset }, Style.box)
			}, React.createElement('span', { style: Style.top }, React.createElement(ThreadLabel, {
				style: state.threadStyle,
				value: props.thread.name,
				onChange: function onChange(e) {
					return _this2.context.do('MODIFY_THREAD_NAME', {
						atIndex: props.note.thread,
						newName: e.target.value
					});
				}
			})), React.createElement(ExpandingTextarea, {
				style: Style.noteHead,
				maxLength: '250',
				input: function input(e) {
					return _this2.setState({ head: e.target.value });
				},
				change: function change() {
					return _this2.context.do('MODIFY_NOTE_HEAD', Object.assign({ newHead: _this2.state.head }, props.coords));
				},
				value: state.head,
				baseHeight: '1.7em',
				placeholder: 'Title/Summary'
			}), React.createElement(ExpandingTextarea, {
				ref: this.bodyMounted,
				style: Style.noteBody,
				input: this.onBody,
				change: function change() {
					return _this2.context.do('MODIFY_NOTE_BODY', Object.assign({ newBody: state.body, wc: state.wc }, props.coords));
				},
				value: state.body,
				baseHeight: '1.1em',
				placeholder: 'Body'
			}), React.createElement('span', { style: Object.assign({}, Style.stats, state.statStyle) }, React.createElement('span', null, state.pageOf + '/' + state.pages), React.createElement('span', { style: Style.wc }, state.wc + ' words')));
		}
	}, {
		key: 'componentDidMount',
		value: function componentDidMount() {
			var _this3 = this;

			this.onScroll();

			window.addEventListener('scroll', this.onScroll);
			window.addEventListener('resize', this.onResize);

			this.context.useMenu(null, [[{
				icon: './dist/img/undo.svg',
				onClick: function onClick(event) {
					return document.execCommand('undo');
				}
			}, {
				icon: './dist/img/redo.svg',
				onClick: function onClick(event) {
					return document.execCommand('redo');
				}
			}], [AppMenu.btn('done', function () {
				return _this3.props.onDone();
			})]]);
		}
	}, {
		key: 'componentWillUnmount',
		value: function componentWillUnmount() {
			window.removeEventListener('scroll', this.onScroll);
			window.removeEventListener('resize', this.onResize);
		}
	}, {
		key: 'onBody',
		value: function onBody(event) {
			this.setState({
				body: event.target.value,
				wc: count(event.target.value),
				pages: Math.round(this.state.wc / 275) || 1
			});
			this.onScroll();
		}
	}, {
		key: 'mounted',
		value: function mounted(element) {
			this.el = element;
		}
	}, {
		key: 'bodyMounted',
		value: function bodyMounted(element) {
			this.body = element;
		}
	}, {
		key: 'onScroll',
		value: function onScroll(event) {
			this.pageCount();
			this.stickyStats();
		}
	}, {
		key: 'pageCount',
		value: function pageCount() {
			var t;
			if (this.body.clientHeight > window.innerHeight) {
				t = Math.abs(this.body.getBoundingClientRect().top);
				t = t / this.body.clientHeight * (this.state.pages + 1);
				t = Math.ceil(t);
				if (t > this.state.pages) t = this.state.pages;
			} else t = 1;
			this.setState({ pageOf: t });
		}
	}, {
		key: 'stickyStats',
		value: function stickyStats() {
			if (this.el.clientHeight > window.innerHeight - 40) {
				this.setState({ statStyle: Style.statSticky });
			} else {
				this.setState({ statStyle: Style.statFree });
			}
		}
	}]);

	return NoteEditor;
}(React.Component);

module.exports = NoteEditor;

},{"../bind.js":8,"./AppMenu.js":10,"./ExpandingTextarea.js":12,"./ThreadLabel.js":19,"preact":3}],16:[function(require,module,exports){
'use strict';

var _createClass = function () {
	function defineProperties(target, props) {
		for (var i = 0; i < props.length; i++) {
			var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);
		}
	}return function (Constructor, protoProps, staticProps) {
		if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
	};
}();

function _classCallCheck(instance, Constructor) {
	if (!(instance instanceof Constructor)) {
		throw new TypeError("Cannot call a class as a function");
	}
}

function _possibleConstructorReturn(self, call) {
	if (!self) {
		throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
	}return call && (typeof call === "object" || typeof call === "function") ? call : self;
}

function _inherits(subClass, superClass) {
	if (typeof superClass !== "function" && superClass !== null) {
		throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
	}subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } });if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

var React = require('preact'),
    AppMenu = require('./AppMenu.js'),
    DeleteButton = require('./DeleteButton.js'),
    nextColor = require('../colors.js'),
    ThreadLabel = require('./ThreadLabel.js'),
    Bind = require('../bind.js'),
    ExpandingTextarea = require('./ExpandingTextarea.js'),
    Style = {
	box: {
		maxWidth: '50rem',
		backgroundColor: '#fff',
		color: '#222',
		display: 'flex',
		flexDirection: 'column',
		justifyContent: 'space-around',
		alignItems: 'stretch',
		width: '14rem',
		position: 'relative',
		top: '0.2rem',
		maxHeight: '13rem'
	},

	noteHead: {
		fontSize: '1.1rem',
		height: '1.3rem',
		margin: '0.25rem 0.75rem'
	},

	stats: {
		color: '#fff',
		display: 'flex',
		justifyContent: 'space-around',
		alignItems: 'center',
		fontSize: '0.9rem',
		height: '2rem'
	},

	wordcount: {
		fontSize: '0.9rem',
		padding: '0.5rem'
	},

	textarea: {
		fontSize: '1.1rem',
		margin: '0.75rem',
		maxHeight: '9rem'
	},

	button: {
		fontSize: '0.9rem',
		padding: '0.5rem',
		color: '#fff',
		backgroundColor: 'rgba(0,0,0,0)',
		border: 'none',
		outline: 'none',
		cursor: 'pointer'
	},
	colorButton: {
		width: '1rem',
		height: '1rem',
		border: 'thin solid #fff',
		borderRadius: '1rem',
		color: '#fff',
		backgroundColor: 'rgba(0,0,0,0)',
		outline: 'none',
		cursor: 'pointer'
	},
	moveButton: {
		zIndex: 25,
		fontSize: '0.9rem',
		position: 'absolute',
		padding: '0.5rem',
		bottom: '-2.5rem',
		left: '3rem',
		border: 'none',
		color: '#fff',
		backgroundColor: '#000',
		outline: 'none',
		cursor: 'pointer'
	},
	deleteButton: {
		zIndex: 25,
		fontSize: '0.9rem',
		position: 'absolute',
		top: '-1rem',
		right: '-1rem'
	}
};

var NoteView = function (_React$Component) {
	_inherits(NoteView, _React$Component);

	function NoteView(props, context) {
		_classCallCheck(this, NoteView);

		var _this = _possibleConstructorReturn(this, (NoteView.__proto__ || Object.getPrototypeOf(NoteView)).call(this, props, context));

		Bind(_this);
		return _this;
	}

	_createClass(NoteView, [{
		key: 'render',
		value: function render(props, state) {
			var _this2 = this;

			var argyle = Object.assign({}, Style.box, {
				border: props.selected ? '0.2rem solid ' + props.thread.color : '0 solid rgba(0,0,0,0)',
				margin: props.selected ? '0' : '0.2rem'
			});

			return React.createElement('div', {
				style: argyle,
				onclick: this.onClick
			}, React.createElement(ExpandingTextarea, {
				style: Style.textarea,
				maxLength: 250,
				oninput: this.onInput,
				baseHeight: '1.3rem',
				placeholder: 'Title/Summary',
				value: props.note.head,
				focus: this.onFocus,
				change: this.onChange,
				ref: function ref(el) {
					return _this2.el = el;
				}
			}), React.createElement('span', {
				style: Object.assign({}, Style.stats, { backgroundColor: props.thread.color })
			}, !props.selected ? [React.createElement('button', {
				onclick: function onclick() {
					return props.onEdit({ sliceIndex: props.sliceIndex, noteIndex: props.noteIndex });
				},
				style: Style.button
			}, 'edit'), React.createElement('span', { style: Style.wordcount }, props.note.wc, ' words')] : [React.createElement('button', {
				style: Style.colorButton,
				onClick: function onClick() {
					return _this2.context.do('MODIFY_NOTE_THREAD', {
						sliceIndex: props.sliceIndex,
						noteIndex: props.noteIndex
					});
				}
			}), React.createElement(ThreadLabel, {
				value: props.thread.name,
				onChange: function onChange(e) {
					return _this2.context.do('MODIFY_THREAD_NAME', {
						atIndex: props.note.thread,
						newName: e.target.value
					});
				}
			}),
			/*<button
   	style={Style.moveButton}
   	onClick={props.moveNote}
   >move</button>,*/
			React.createElement(DeleteButton, {
				style: Style.deleteButton,
				onHold: function onHold() {
					return _this2.context.do('DELETE_NOTE', {
						sliceIndex: props.sliceIndex,
						noteIndex: props.noteIndex
					});
				}
			})]));
		}
	}, {
		key: 'onCreateNote',
		value: function onCreateNote(event) {
			this.newNote(event);
		}
	}, {
		key: 'onFocus',
		value: function onFocus(event) {
			if (!this.props.selected) this.select();
		}
	}, {
		key: 'onChange',
		value: function onChange(event) {
			this.context.do('MODIFY_NOTE_HEAD', {
				sliceIndex: this.props.sliceIndex,
				noteIndex: this.props.noteIndex,
				newHead: event.target.value
			});
		}
	}, {
		key: 'onClick',
		value: function onClick(event) {
			event.stopPropagation();
			if (!this.props.selected) {
				this.select();
				this.el.base.focus();
			}
		}
	}, {
		key: 'select',
		value: function select() {
			this.props.onSelect({
				sliceIndex: this.props.sliceIndex,
				noteIndex: this.props.noteIndex
			});
		}
	}]);

	return NoteView;
}(React.Component);

module.exports = NoteView;

},{"../bind.js":8,"../colors.js":9,"./AppMenu.js":10,"./DeleteButton.js":11,"./ExpandingTextarea.js":12,"./ThreadLabel.js":19,"preact":3}],17:[function(require,module,exports){
'use strict';

var _createClass = function () {
	function defineProperties(target, props) {
		for (var i = 0; i < props.length; i++) {
			var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);
		}
	}return function (Constructor, protoProps, staticProps) {
		if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
	};
}();

function _classCallCheck(instance, Constructor) {
	if (!(instance instanceof Constructor)) {
		throw new TypeError("Cannot call a class as a function");
	}
}

function _possibleConstructorReturn(self, call) {
	if (!self) {
		throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
	}return call && (typeof call === "object" || typeof call === "function") ? call : self;
}

function _inherits(subClass, superClass) {
	if (typeof superClass !== "function" && superClass !== null) {
		throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
	}subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } });if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

var React = require('preact'),
    NoteView = require('./NoteView.js'),
    Bind = require('../bind.js'),
    Style = {
	sliceHeader: {
		zIndex: '11',
		height: '1.5rem',
		color: '#fff',
		maxWidth: '14rem',
		backgroundColor: '#777777',
		outline: 'none',
		fontSize: '0.9rem',
		margin: '0 auto',
		border: 'none',
		textAlign: 'center',
		padding: '0.25rem'
	},
	slice: {
		display: 'inline-flex',
		justifyContent: 'center',
		alignItems: 'center',
		width: '14rem',
		height: '100%'
	}
};

function MeasureText(text) {
	return text.length ? text.length * 1.1 : 5;
}

var SliceHeader = function (_React$Component) {
	_inherits(SliceHeader, _React$Component);

	function SliceHeader(props, context) {
		_classCallCheck(this, SliceHeader);

		var _this = _possibleConstructorReturn(this, (SliceHeader.__proto__ || Object.getPrototypeOf(SliceHeader)).call(this, props, context));

		_this.state = {
			value: props.value
		};

		Bind(_this);
		return _this;
	}

	_createClass(SliceHeader, [{
		key: 'componentWillReceiveProps',
		value: function componentWillReceiveProps(props) {
			this.setState({ value: props.value });
		}
	}, {
		key: 'shouldComponentUpdate',
		value: function shouldComponentUpdate(props, state, context) {
			return state !== this.state || props.value !== this.props.value;
		}
	}, {
		key: 'render',
		value: function render(props, state) {
			var _this2 = this;

			return React.createElement('div', { style: Style.slice }, React.createElement('input', {
				type: 'text',
				style: Style.sliceHeader,
				maxLength: '24',
				size: MeasureText(state.value),
				value: state.value,
				placeholder: 'time',
				oninput: function oninput(event) {
					return _this2.setState({ value: event.target.value });
				},
				onchange: this.onChange
			}));
		}
	}, {
		key: 'onChange',
		value: function onChange(event) {
			this.context.do('MODIFY_SLICE_DATE', {
				atIndex: this.props.id,
				newDate: event.target.value
			});
		}
	}]);

	return SliceHeader;
}(React.Component);

module.exports = SliceHeader;

},{"../bind.js":8,"./NoteView.js":16,"preact":3}],18:[function(require,module,exports){
'use strict';

var React = require('preact'),
    NoteView = require('./NoteView.js'),
    Style = {
	slice: {
		zIndex: 9,
		display: 'flex',
		flexDirection: 'column',
		justifyContent: 'flex-start',
		alignItems: 'center',
		margin: '0 2rem',
		width: '14rem'
	},

	space: {
		height: '14rem',
		display: 'flex',
		justifyContent: 'center',
		alignItems: 'flex-end'
	},

	button: {
		fontSize: '0.9rem',
		color: '#fff',
		border: 'none',
		outline: 'none',
		cursor: 'pointer',
		width: '1.3rem',
		height: '1.2rem',
		backgroundColor: 'rgba(0,0,0,0)',
		textAlign: 'center',
		margin: '0 1rem 0.4rem 1rem',
		borderRadius: '1rem'
	}
};

module.exports = function (props, state) {
	var _this = this;

	return React.createElement('div', { style: Style.slice }, props.slice.notes.map(function (note, i) {
		return React.createElement('div', { style: Style.space }, note ? React.createElement(NoteView, {
			sliceIndex: props.id,
			selected: props.selection && props.selection.noteIndex === i,
			noteIndex: i,
			note: note,
			thread: props.threads[note.thread],
			onSelect: props.onSelect,
			onDeselect: props.onDeselect,
			onEdit: props.editNote,
			moveNote: props.moveNote
		}) : React.createElement('button', {
			style: Style.button,
			onclick: function onclick() {
				return _this.context.do('NEW_NOTE', {
					sliceIndex: props.id,
					noteIndex: i
				});
			}
		}, '+'));
	}));
};

},{"./NoteView.js":16,"preact":3}],19:[function(require,module,exports){
'use strict';

var _createClass = function () {
	function defineProperties(target, props) {
		for (var i = 0; i < props.length; i++) {
			var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);
		}
	}return function (Constructor, protoProps, staticProps) {
		if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
	};
}();

function _classCallCheck(instance, Constructor) {
	if (!(instance instanceof Constructor)) {
		throw new TypeError("Cannot call a class as a function");
	}
}

function _possibleConstructorReturn(self, call) {
	if (!self) {
		throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
	}return call && (typeof call === "object" || typeof call === "function") ? call : self;
}

function _inherits(subClass, superClass) {
	if (typeof superClass !== "function" && superClass !== null) {
		throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
	}subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } });if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

var React = require('preact'),
    Style = {
	editor: {
		fontSize: '0.9rem',
		padding: '0.5rem',
		height: '1rem',
		border: 'none',
		outline: 'none',
		background: 'rgba(0,0,0,0)',
		color: '#fff'
	}
};

function MeasureText(text) {
	return text.length ? text.length * 1.1 : 5;
}

var ThreadLabel = function (_React$Component) {
	_inherits(ThreadLabel, _React$Component);

	function ThreadLabel(props, context) {
		_classCallCheck(this, ThreadLabel);

		var _this = _possibleConstructorReturn(this, (ThreadLabel.__proto__ || Object.getPrototypeOf(ThreadLabel)).call(this, props, context));

		_this.state = {
			value: props.value
		};
		return _this;
	}

	_createClass(ThreadLabel, [{
		key: 'componentWillReceiveProps',
		value: function componentWillReceiveProps(props) {
			this.setState({ value: props.value });
		}
	}, {
		key: 'render',
		value: function render(props, state, context) {
			var _this2 = this;

			return React.createElement('input', {
				type: 'text',
				style: props.style ? Object.assign({}, Style.editor, props.style) : Style.editor,
				maxLength: '50',
				size: 20,
				value: state.value,
				placeholder: 'thread',
				onInput: function onInput(event) {
					return _this2.setState({ value: event.target.value });
				},
				onChange: props.onChange
			});
		}
	}]);

	return ThreadLabel;
}(React.Component);

module.exports = ThreadLabel;

},{"preact":3}],20:[function(require,module,exports){
'use strict';

var _createClass = function () {
	function defineProperties(target, props) {
		for (var i = 0; i < props.length; i++) {
			var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);
		}
	}return function (Constructor, protoProps, staticProps) {
		if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
	};
}();

function _classCallCheck(instance, Constructor) {
	if (!(instance instanceof Constructor)) {
		throw new TypeError("Cannot call a class as a function");
	}
}

function _possibleConstructorReturn(self, call) {
	if (!self) {
		throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
	}return call && (typeof call === "object" || typeof call === "function") ? call : self;
}

function _inherits(subClass, superClass) {
	if (typeof superClass !== "function" && superClass !== null) {
		throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
	}subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } });if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

var React = require('preact'),
    Style = {
	outer: {
		zIndex: '-5',
		position: 'absolute',
		left: '7rem',
		top: '2.5rem',
		minWidth: '100vw',
		minHeight: '100vh'
	},
	inner: {
		position: 'absolute',
		top: '2rem',
		left: 0,
		width: '100%',
		height: '100%'
	},
	location: {
		margin: '12rem 0',
		height: '2rem',
		backgroundColor: '#444444'
	},
	slice: {
		display: 'inline-block',
		margin: '0 8.9375rem',
		width: '0.125rem',
		height: '100%',
		backgroundColor: '#444444'
	}
};

var WeaveBackground = function (_React$Component) {
	_inherits(WeaveBackground, _React$Component);

	function WeaveBackground(props, context) {
		_classCallCheck(this, WeaveBackground);

		return _possibleConstructorReturn(this, (WeaveBackground.__proto__ || Object.getPrototypeOf(WeaveBackground)).call(this, props, context));
	}

	_createClass(WeaveBackground, [{
		key: 'shouldComponentUpdate',
		value: function shouldComponentUpdate(props, state, context) {
			return props.menuOffset !== this.props.menuOffset || props.locations !== this.props.locations || props.scenes !== this.props.scenes;
		}
	}, {
		key: 'render',
		value: function render(props, state) {
			return React.createElement('div', {
				'data-is': 'WeaveBackground',
				style: Object.assign({}, Style.outer, {
					top: props.menuOffset,
					width: props.scenes * 18 + 2 + 'rem',
					height: props.locations * 14 + 16 + 'rem'
				})
			}, React.createElement('div', { style: Style.inner }, Array(props.locations).fill(0).map(function (v, i) {
				return React.createElement('div', { style: Style.location }, '\xA0');
			})), React.createElement('div', { style: Style.inner }, Array(props.scenes).fill(0).map(function (v, i) {
				return React.createElement('div', { style: Style.slice }, '\xA0');
			})));
		}
	}]);

	return WeaveBackground;
}(React.Component);

module.exports = WeaveBackground;

},{"preact":3}],21:[function(require,module,exports){
'use strict';

var _createClass = function () {
	function defineProperties(target, props) {
		for (var i = 0; i < props.length; i++) {
			var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);
		}
	}return function (Constructor, protoProps, staticProps) {
		if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
	};
}();

function _classCallCheck(instance, Constructor) {
	if (!(instance instanceof Constructor)) {
		throw new TypeError("Cannot call a class as a function");
	}
}

function _possibleConstructorReturn(self, call) {
	if (!self) {
		throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
	}return call && (typeof call === "object" || typeof call === "function") ? call : self;
}

function _inherits(subClass, superClass) {
	if (typeof superClass !== "function" && superClass !== null) {
		throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
	}subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } });if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

var React = require('preact'),
    LocationHeader = require('./LocationHeader.js'),
    SliceHeader = require('./SliceHeader.js'),
    Style = {
	outer: {
		position: 'absolute',
		left: 0,
		minWidth: '100vw',
		minHeight: '100vh'
	},
	locations: {
		position: 'absolute',
		top: 0,
		width: '7rem',
		minHeight: '100vh',
		paddingTop: '2rem'
	},
	scenes: {
		zIndex: '11',
		position: 'absolute',
		backgroundColor: "#111",
		left: 0,
		height: '2rem',
		paddingLeft: '7rem',
		minWidth: '100vw'
	},
	location: {
		display: 'flex',
		flexDirection: 'column',
		justifyContent: 'flex-end',
		height: '14rem'
	},
	sliceButton: {
		margin: '0 1.375rem',
		fontSize: '0.9rem',
		color: '#fff',
		border: 'none',
		outline: 'none',
		cursor: 'pointer',
		width: '1.25rem',
		height: '1.25rem',
		textAlign: 'center',
		borderRadius: '1rem',
		backgroundColor: 'rgba(0,0,0,0)'
	},
	firstSliceButton: {
		margin: '0 0.375rem',
		fontSize: '0.9rem',
		color: '#fff',
		border: 'none',
		outline: 'none',
		cursor: 'pointer',
		width: '1.25rem',
		height: '1.25rem',
		textAlign: 'center',
		borderRadius: '1rem',
		backgroundColor: 'rgba(0,0,0,0)'
	},
	threadBtn: {
		height: '2rem',
		fontSize: '0.9rem',
		color: '#fff',
		border: 'none',
		outline: 'none',
		cursor: 'pointer',
		textAlign: 'center',
		padding: '0.5rem 0.5rem',
		backgroundColor: 'rgba(0,0,0,0)',
		width: '100%'
	}
};

var WeaveHeaders = function (_React$Component) {
	_inherits(WeaveHeaders, _React$Component);

	function WeaveHeaders(props, context) {
		_classCallCheck(this, WeaveHeaders);

		var _this = _possibleConstructorReturn(this, (WeaveHeaders.__proto__ || Object.getPrototypeOf(WeaveHeaders)).call(this, props, context));

		_this.state = {
			x: 0,
			y: 0
		};

		_this.onScroll = _this.onScroll.bind(_this);
		return _this;
	}

	_createClass(WeaveHeaders, [{
		key: 'componentDidMount',
		value: function componentDidMount() {
			window.addEventListener('scroll', this.onScroll);
		}
	}, {
		key: 'componentWillUnmount',
		value: function componentWillUnmount() {
			window.removeEventListener('scroll', this.onScroll);
		}
	}, {
		key: 'shouldComponentUpdate',
		value: function shouldComponentUpdate(props, state, context) {
			return state.x !== this.state.x || state.y !== this.state.y || props.scenes !== this.props.scenes || props.locations !== this.props.locations || props.windowWidth !== this.props.windowWidth;
		}
	}, {
		key: 'render',
		value: function render(props, state) {
			var _this2 = this;

			return React.createElement('div', {
				'data-is': 'WeaveHeaders',
				style: Object.assign({}, Style.outer, state.style)
			}, React.createElement('div', {
				'data-is': 'SliceHeaders',
				style: Object.assign({}, Style.scenes, { top: state.y, width: props.scenes.length * 18 + 2 + 'rem' })
			}, [React.createElement('button', {
				onclick: function onclick(event) {
					return _this2.context.do('NEW_SLICE', { atIndex: 0 });
				},
				style: Style.firstSliceButton,
				onmouseenter: function onmouseenter(e) {
					return e.target.style.backgroundColor = 'rgba(255,255,255,0.2)';
				},
				onmouseleave: function onmouseleave(e) {
					return e.target.style.backgroundColor = 'rgba(0,0,0,0)';
				}
			}, '+')].concat(props.scenes.map(function (slice, i) {
				return React.createElement('div', { style: { display: 'inline', width: '18rem' } }, React.createElement(SliceHeader, {
					id: i,
					value: slice.datetime
				}), React.createElement('button', {
					onclick: function onclick(event) {
						return _this2.context.do('NEW_SLICE', { atIndex: i + 1 });
					},
					style: Style.sliceButton,
					onmouseenter: function onmouseenter(e) {
						return e.target.style.backgroundColor = 'rgba(255,255,255,0.2)';
					},
					onmouseleave: function onmouseleave(e) {
						return e.target.style.backgroundColor = 'rgba(0,0,0,0)';
					}
				}, '+'));
			}))), React.createElement('div', {
				'data-is': 'LocationHeaders',
				style: Object.assign({}, Style.locations, {
					left: state.x,
					height: props.locations.length * 14 + 16 + 'rem',
					backgroundColor: props.windowWidth < 700 ? 'rgba(0,0,0,0)' : '#111',
					zIndex: props.windowWidth < 700 ? 8 : 10 })
			}, props.locations.map(function (location, i) {
				return React.createElement('div', { style: Style.location }, React.createElement(LocationHeader, {
					id: i,
					value: location
				}));
			}).concat([React.createElement('div', { style: Style.location }, React.createElement('button', {
				onclick: function onclick(event) {
					return _this2.context.do('NEW_LOCATION');
				},
				style: Style.threadBtn,
				onmouseenter: function onmouseenter(e) {
					return e.target.style.backgroundColor = 'rgba(255,255,255,0.2)';
				},
				onmouseleave: function onmouseleave(e) {
					return e.target.style.backgroundColor = 'rgba(0,0,0,0)';
				}
			}, '+'))])));
		}
	}, {
		key: 'onScroll',
		value: function onScroll() {
			this.setState({
				x: document.body.scrollLeft,
				y: document.body.scrollTop
			});
		}
	}]);

	return WeaveHeaders;
}(React.Component);

module.exports = WeaveHeaders;

},{"./LocationHeader.js":14,"./SliceHeader.js":17,"preact":3}],22:[function(require,module,exports){
'use strict';

var _createClass = function () {
	function defineProperties(target, props) {
		for (var i = 0; i < props.length; i++) {
			var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);
		}
	}return function (Constructor, protoProps, staticProps) {
		if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
	};
}();

function _classCallCheck(instance, Constructor) {
	if (!(instance instanceof Constructor)) {
		throw new TypeError("Cannot call a class as a function");
	}
}

function _possibleConstructorReturn(self, call) {
	if (!self) {
		throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
	}return call && (typeof call === "object" || typeof call === "function") ? call : self;
}

function _inherits(subClass, superClass) {
	if (typeof superClass !== "function" && superClass !== null) {
		throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
	}subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } });if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

var React = require('preact'),
    Bind = require('../bind.js'),
    SliceView = require('./SliceView.js'),
    WeaveHeaders = require('./WeaveHeaders.js'),
    WeaveBackground = require('./WeaveBackground.js'),
    AppMenu = require('./AppMenu.js'),
    Style = {
	weave: {
		marginLeft: '7rem',
		display: 'inline-flex'
	},
	scenes: {
		marginTop: '2rem',
		display: 'flex',
		justifyContent: 'flex-start',
		alignItems: 'flex-start'
	}
};

var WeaveView = function (_React$Component) {
	_inherits(WeaveView, _React$Component);

	function WeaveView(props, context) {
		_classCallCheck(this, WeaveView);

		var _this = _possibleConstructorReturn(this, (WeaveView.__proto__ || Object.getPrototypeOf(WeaveView)).call(this, props, context));

		_this.state = {
			selection: null
		};

		_this.allowDeselect = true;

		Bind(_this);
		return _this;
	}

	_createClass(WeaveView, [{
		key: 'render',
		value: function render(props, state) {
			var _this2 = this;

			return React.createElement('div', {
				'data-is': 'WeaveView',
				style: Object.assign({ marginTop: props.menuOffset }, Style.weave),
				onclick: this.onDeselect
			}, React.createElement(WeaveHeaders, {
				scenes: props.scenes,
				locations: props.locations,
				windowWidth: props.windowWidth
			}), React.createElement(WeaveBackground, {
				scenes: props.scenes.length,
				locations: props.locations.length,
				menuOffset: props.menuOffset
			}), React.createElement('div', { 'data-is': 'Weave', style: Style.scenes }, props.scenes.map(function (slice, i) {
				return React.createElement(SliceView, {
					id: i,
					selection: state.selection && state.selection.sliceIndex === i ? state.selection : null,
					slice: slice,
					threads: props.threads,
					onSelect: _this2.onSelect,
					onDeselect: _this2.onDeselect,
					editNote: props.editNote,
					moveNote: _this2.moveNote
				});
			})));
		}
	}, {
		key: 'onSelect',
		value: function onSelect(coords, i) {
			this.setState({ selection: coords });
			//this.activeNoteMenu();
		}
	}, {
		key: 'onDeselect',
		value: function onDeselect(event) {
			this.noteDeselected();
		}
	}, {
		key: 'noteDeselected',
		value: function noteDeselected() {
			if (this.allowDeselect) {
				this.setState({ selection: null });
			}
		}
	}]);

	return WeaveView;
}(React.Component);

module.exports = WeaveView;

},{"../bind.js":8,"./AppMenu.js":10,"./SliceView.js":18,"./WeaveBackground.js":20,"./WeaveHeaders.js":21,"preact":3}],23:[function(require,module,exports){
'use strict';

// Object.assign POLYFILL
// source: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign#Polyfill
//

if (typeof Object.assign != 'function') {
	Object.assign = function (target, varArgs) {
		// .length of function is 2
		'use strict';

		if (target == null) {
			// TypeError if undefined or null
			throw new TypeError('Cannot convert undefined or null to object');
		}

		var to = Object(target);

		for (var index = 1; index < arguments.length; index++) {
			var nextSource = arguments[index];

			if (nextSource != null) {
				// Skip over if undefined or null
				for (var nextKey in nextSource) {
					// Avoid bugs when hasOwnProperty is shadowed
					if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
						to[nextKey] = nextSource[nextKey];
					}
				}
			}
		}
		return to;
	};
}

},{}]},{},[4])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvZmlsZS1zYXZlci9GaWxlU2F2ZXIuanMiLCJub2RlX21vZHVsZXMvbHotc3RyaW5nL2xpYnMvbHotc3RyaW5nLmpzIiwibm9kZV9tb2R1bGVzL3ByZWFjdC9kaXN0L3ByZWFjdC5qcyIsInNyYy9BcHAuanMiLCJzcmMvU291cmNlcnkuanMiLCJzcmMvYWN0aW9ucy5qcyIsInNyYy9hc3NlcnQuanMiLCJzcmMvYmluZC5qcyIsInNyYy9jb2xvcnMuanMiLCJzcmMvY29tcG9uZW50cy9BcHBNZW51LmpzIiwic3JjL2NvbXBvbmVudHMvRGVsZXRlQnV0dG9uLmpzIiwic3JjL2NvbXBvbmVudHMvRXhwYW5kaW5nVGV4dGFyZWEuanMiLCJzcmMvY29tcG9uZW50cy9GaWxlT3BlbmVyLmpzIiwic3JjL2NvbXBvbmVudHMvTG9jYXRpb25IZWFkZXIuanMiLCJzcmMvY29tcG9uZW50cy9Ob3RlRWRpdG9yLmpzIiwic3JjL2NvbXBvbmVudHMvTm90ZVZpZXcuanMiLCJzcmMvY29tcG9uZW50cy9TbGljZUhlYWRlci5qcyIsInNyYy9jb21wb25lbnRzL1NsaWNlVmlldy5qcyIsInNyYy9jb21wb25lbnRzL1RocmVhZExhYmVsLmpzIiwic3JjL2NvbXBvbmVudHMvV2VhdmVCYWNrZ3JvdW5kLmpzIiwic3JjL2NvbXBvbmVudHMvV2VhdmVIZWFkZXJzLmpzIiwic3JjL2NvbXBvbmVudHMvV2VhdmVWaWV3LmpzIiwic3JjL3BvbHlmaWxscy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcmZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQy9ZQSxRQUFBLEFBQVE7QUFDUixRQUFBLEFBQVEsZSxBQUFSLEFBQXVCLFdBQVc7QUFDbEMsSUFDQyxRQUFRLFFB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LEFBQ3ZCO1NBQUEsQUFBSyxTQUFTLEVBQUMsV0FBZixBQUFjLEFBQVksQUFDMUI7QUFDRDs7Ozs7RUE3RHNCLE0sQUFBTTs7QUFnRTlCLE9BQUEsQUFBTyxVQUFQLEFBQWlCOzs7OztBQ3ZGakI7QUFDQTtBQUNBOztBQUNBLElBQUksT0FBTyxPQUFQLEFBQWMsVUFBbEIsQUFBNEIsWUFBWSxBQUN2QztRQUFBLEFBQU8sU0FBUyxVQUFBLEFBQVMsUUFBVCxBQUFpQixTQUFTLEFBQUU7QUFDM0M7QUFDQTs7TUFBSSxVQUFKLEFBQWMsTUFBTSxBQUFFO0FBQ3JCO1NBQU0sSUFBQSxBQUFJLFVBQVYsQUFBTSxBQUFjLEFBQ3BCO0FBRUQ7O01BQUksS0FBSyxPQUFULEFBQVMsQUFBTyxBQUVoQjs7T0FBSyxJQUFJLFFBQVQsQUFBaUIsR0FBRyxRQUFRLFVBQTVCLEFBQXNDLFFBQXRDLEFBQThDLFNBQVMsQUFDdEQ7T0FBSSxhQUFhLFVBQWpCLEFBQWlCLEFBQVUsQUFFM0I7O09BQUksY0FBSixBQUFrQixNQUFNLEFBQUU7QUFDekI7U0FBSyxJQUFMLEFBQVMsV0FBVCxBQUFvQixZQUFZLEFBQy9CO0FBQ0E7U0FBSSxPQUFBLEFBQU8sVUFBUCxBQUFpQixlQUFqQixBQUFnQyxLQUFoQyxBQUFxQyxZQUF6QyxBQUFJLEFBQWlELFVBQVUsQUFDOUQ7U0FBQSxBQUFHLFdBQVcsV0FBZCxBQUFjLEFBQVcsQUFDekI7QUFDRDtBQUNEO0FBQ0Q7QUFDRDtTQUFBLEFBQU8sQUFDUDtBQXJCRCxBQXNCQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvKiBGaWxlU2F2ZXIuanNcbiAqIEEgc2F2ZUFzKCkgRmlsZVNhdmVyIGltcGxlbWVudGF0aW9uLlxuICogMS4zLjJcbiAqIDIwMTYtMDYtMTYgMTg6MjU6MTlcbiAqXG4gKiBCeSBFbGkgR3JleSwgaHR0cDovL2VsaWdyZXkuY29tXG4gKiBMaWNlbnNlOiBNSVRcbiAqICAgU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9lbGlncmV5L0ZpbGVTYXZlci5qcy9ibG9iL21hc3Rlci9MSUNFTlNFLm1kXG4gKi9cblxuLypnbG9iYWwgc2VsZiAqL1xuLypqc2xpbnQgYml0d2lzZTogdHJ1ZSwgaW5kZW50OiA0LCBsYXhicmVhazogdHJ1ZSwgbGF4Y29tbWE6IHRydWUsIHNtYXJ0dGFiczogdHJ1ZSwgcGx1c3BsdXM6IHRydWUgKi9cblxuLyohIEBzb3VyY2UgaHR0cDovL3B1cmwuZWxpZ3JleS5jb20vZ2l0aHViL0ZpbGVTYXZlci5qcy9ibG9iL21hc3Rlci9GaWxlU2F2ZXIuanMgKi9cblxudmFyIHNhdmVBcyA9IHNhdmVBcyB8fCAoZnVuY3Rpb24odmlldykge1xuXHRcInVzZSBzdHJpY3RcIjtcblx0Ly8gSUUgPDEwIGlzIGV4cGxpY2l0bHkgdW5zdXBwb3J0ZWRcblx0aWYgKHR5cGVvZiB2aWV3ID09PSBcInVuZGVmaW5lZFwiIHx8IHR5cGVvZiBuYXZpZ2F0b3IgIT09IFwidW5kZWZpbmVkXCIgJiYgL01TSUUgWzEtOV1cXC4vLnRlc3QobmF2aWdhdG9yLnVzZXJBZ2VudCkpIHtcblx0XHRyZXR1cm47XG5cdH1cblx0dmFyXG5cdFx0ICBkb2MgPSB2aWV3LmRvY3VtZW50XG5cdFx0ICAvLyBvbmx5IGdldCBVUkwgd2hlbiBuZWNlc3NhcnkgaW4gY2FzZSBCbG9iLmpzIGhhc24ndCBvdmVycmlkZGVuIGl0IHlldFxuXHRcdCwgZ2V0X1VSTCA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIHZpZXcuVVJMIHx8IHZpZXcud2Via2l0VVJMIHx8IHZpZXc7XG5cdFx0fVxuXHRcdCwgc2F2ZV9saW5rID0gZG9jLmNyZWF0ZUVsZW1lbnROUyhcImh0dHA6Ly93d3cudzMub3JnLzE5OTkveGh0bWxcIiwgXCJhXCIpXG5cdFx0LCBjYW5fdXNlX3NhdmVfbGluayA9IFwiZG93bmxvYWRcIiBpbiBzYXZlX2xpbmtcblx0XHQsIGNsaWNrID0gZnVuY3Rpb24obm9kZSkge1xuXHRcdFx0dmFyIGV2ZW50ID0gbmV3IE1vdXNlRXZlbnQoXCJjbGlja1wiKTtcblx0XHRcdG5vZGUuZGlzcGF0Y2hFdmVudChldmVudCk7XG5cdFx0fVxuXHRcdCwgaXNfc2FmYXJpID0gL2NvbnN0cnVjdG9yL2kudGVzdCh2aWV3LkhUTUxFbGVtZW50KSB8fCB2aWV3LnNhZmFyaVxuXHRcdCwgaXNfY2hyb21lX2lvcyA9L0NyaU9TXFwvW1xcZF0rLy50ZXN0KG5hdmlnYXRvci51c2VyQWdlbnQpXG5cdFx0LCB0aHJvd19vdXRzaWRlID0gZnVuY3Rpb24oZXgpIHtcblx0XHRcdCh2aWV3LnNldEltbWVkaWF0ZSB8fCB2aWV3LnNldFRpbWVvdXQpKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHR0aHJvdyBleDtcblx0XHRcdH0sIDApO1xuXHRcdH1cblx0XHQsIGZvcmNlX3NhdmVhYmxlX3R5cGUgPSBcImFwcGxpY2F0aW9uL29jdGV0LXN0cmVhbVwiXG5cdFx0Ly8gdGhlIEJsb2IgQVBJIGlzIGZ1bmRhbWVudGFsbHkgYnJva2VuIGFzIHRoZXJlIGlzIG5vIFwiZG93bmxvYWRmaW5pc2hlZFwiIGV2ZW50IHRvIHN1YnNjcmliZSB0b1xuXHRcdCwgYXJiaXRyYXJ5X3Jldm9rZV90aW1lb3V0ID0gMTAwMCAqIDQwIC8vIGluIG1zXG5cdFx0LCByZXZva2UgPSBmdW5jdGlvbihmaWxlKSB7XG5cdFx0XHR2YXIgcmV2b2tlciA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRpZiAodHlwZW9mIGZpbGUgPT09IFwic3RyaW5nXCIpIHsgLy8gZmlsZSBpcyBhbiBvYmplY3QgVVJMXG5cdFx0XHRcdFx0Z2V0X1VSTCgpLnJldm9rZU9iamVjdFVSTChmaWxlKTtcblx0XHRcdFx0fSBlbHNlIHsgLy8gZmlsZSBpcyBhIEZpbGVcblx0XHRcdFx0XHRmaWxlLnJlbW92ZSgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9O1xuXHRcdFx0c2V0VGltZW91dChyZXZva2VyLCBhcmJpdHJhcnlfcmV2b2tlX3RpbWVvdXQpO1xuXHRcdH1cblx0XHQsIGRpc3BhdGNoID0gZnVuY3Rpb24oZmlsZXNhdmVyLCBldmVudF90eXBlcywgZXZlbnQpIHtcblx0XHRcdGV2ZW50X3R5cGVzID0gW10uY29uY2F0KGV2ZW50X3R5cGVzKTtcblx0XHRcdHZhciBpID0gZXZlbnRfdHlwZXMubGVuZ3RoO1xuXHRcdFx0d2hpbGUgKGktLSkge1xuXHRcdFx0XHR2YXIgbGlzdGVuZXIgPSBmaWxlc2F2ZXJbXCJvblwiICsgZXZlbnRfdHlwZXNbaV1dO1xuXHRcdFx0XHRpZiAodHlwZW9mIGxpc3RlbmVyID09PSBcImZ1bmN0aW9uXCIpIHtcblx0XHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdFx0bGlzdGVuZXIuY2FsbChmaWxlc2F2ZXIsIGV2ZW50IHx8IGZpbGVzYXZlcik7XG5cdFx0XHRcdFx0fSBjYXRjaCAoZXgpIHtcblx0XHRcdFx0XHRcdHRocm93X291dHNpZGUoZXgpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0XHQsIGF1dG9fYm9tID0gZnVuY3Rpb24oYmxvYikge1xuXHRcdFx0Ly8gcHJlcGVuZCBCT00gZm9yIFVURi04IFhNTCBhbmQgdGV4dC8qIHR5cGVzIChpbmNsdWRpbmcgSFRNTClcblx0XHRcdC8vIG5vdGU6IHlvdXIgYnJvd3NlciB3aWxsIGF1dG9tYXRpY2FsbHkgY29udmVydCBVVEYtMTYgVStGRUZGIHRvIEVGIEJCIEJGXG5cdFx0XHRpZiAoL15cXHMqKD86dGV4dFxcL1xcUyp8YXBwbGljYXRpb25cXC94bWx8XFxTKlxcL1xcUypcXCt4bWwpXFxzKjsuKmNoYXJzZXRcXHMqPVxccyp1dGYtOC9pLnRlc3QoYmxvYi50eXBlKSkge1xuXHRcdFx0XHRyZXR1cm4gbmV3IEJsb2IoW1N0cmluZy5mcm9tQ2hhckNvZGUoMHhGRUZGKSwgYmxvYl0sIHt0eXBlOiBibG9iLnR5cGV9KTtcblx0XHRcdH1cblx0XHRcdHJldHVybiBibG9iO1xuXHRcdH1cblx0XHQsIEZpbGVTYXZlciA9IGZ1bmN0aW9uKGJsb2IsIG5hbWUsIG5vX2F1dG9fYm9tKSB7XG5cdFx0XHRpZiAoIW5vX2F1dG9fYm9tKSB7XG5cdFx0XHRcdGJsb2IgPSBhdXRvX2JvbShibG9iKTtcblx0XHRcdH1cblx0XHRcdC8vIEZpcnN0IHRyeSBhLmRvd25sb2FkLCB0aGVuIHdlYiBmaWxlc3lzdGVtLCB0aGVuIG9iamVjdCBVUkxzXG5cdFx0XHR2YXJcblx0XHRcdFx0ICBmaWxlc2F2ZXIgPSB0aGlzXG5cdFx0XHRcdCwgdHlwZSA9IGJsb2IudHlwZVxuXHRcdFx0XHQsIGZvcmNlID0gdHlwZSA9PT0gZm9yY2Vfc2F2ZWFibGVfdHlwZVxuXHRcdFx0XHQsIG9iamVjdF91cmxcblx0XHRcdFx0LCBkaXNwYXRjaF9hbGwgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRkaXNwYXRjaChmaWxlc2F2ZXIsIFwid3JpdGVzdGFydCBwcm9ncmVzcyB3cml0ZSB3cml0ZWVuZFwiLnNwbGl0KFwiIFwiKSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0Ly8gb24gYW55IGZpbGVzeXMgZXJyb3JzIHJldmVydCB0byBzYXZpbmcgd2l0aCBvYmplY3QgVVJMc1xuXHRcdFx0XHQsIGZzX2Vycm9yID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0aWYgKChpc19jaHJvbWVfaW9zIHx8IChmb3JjZSAmJiBpc19zYWZhcmkpKSAmJiB2aWV3LkZpbGVSZWFkZXIpIHtcblx0XHRcdFx0XHRcdC8vIFNhZmFyaSBkb2Vzbid0IGFsbG93IGRvd25sb2FkaW5nIG9mIGJsb2IgdXJsc1xuXHRcdFx0XHRcdFx0dmFyIHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKCk7XG5cdFx0XHRcdFx0XHRyZWFkZXIub25sb2FkZW5kID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRcdHZhciB1cmwgPSBpc19jaHJvbWVfaW9zID8gcmVhZGVyLnJlc3VsdCA6IHJlYWRlci5yZXN1bHQucmVwbGFjZSgvXmRhdGE6W147XSo7LywgJ2RhdGE6YXR0YWNobWVudC9maWxlOycpO1xuXHRcdFx0XHRcdFx0XHR2YXIgcG9wdXAgPSB2aWV3Lm9wZW4odXJsLCAnX2JsYW5rJyk7XG5cdFx0XHRcdFx0XHRcdGlmKCFwb3B1cCkgdmlldy5sb2NhdGlvbi5ocmVmID0gdXJsO1xuXHRcdFx0XHRcdFx0XHR1cmw9dW5kZWZpbmVkOyAvLyByZWxlYXNlIHJlZmVyZW5jZSBiZWZvcmUgZGlzcGF0Y2hpbmdcblx0XHRcdFx0XHRcdFx0ZmlsZXNhdmVyLnJlYWR5U3RhdGUgPSBmaWxlc2F2ZXIuRE9ORTtcblx0XHRcdFx0XHRcdFx0ZGlzcGF0Y2hfYWxsKCk7XG5cdFx0XHRcdFx0XHR9O1xuXHRcdFx0XHRcdFx0cmVhZGVyLnJlYWRBc0RhdGFVUkwoYmxvYik7XG5cdFx0XHRcdFx0XHRmaWxlc2F2ZXIucmVhZHlTdGF0ZSA9IGZpbGVzYXZlci5JTklUO1xuXHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHQvLyBkb24ndCBjcmVhdGUgbW9yZSBvYmplY3QgVVJMcyB0aGFuIG5lZWRlZFxuXHRcdFx0XHRcdGlmICghb2JqZWN0X3VybCkge1xuXHRcdFx0XHRcdFx0b2JqZWN0X3VybCA9IGdldF9VUkwoKS5jcmVhdGVPYmplY3RVUkwoYmxvYik7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmIChmb3JjZSkge1xuXHRcdFx0XHRcdFx0dmlldy5sb2NhdGlvbi5ocmVmID0gb2JqZWN0X3VybDtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0dmFyIG9wZW5lZCA9IHZpZXcub3BlbihvYmplY3RfdXJsLCBcIl9ibGFua1wiKTtcblx0XHRcdFx0XHRcdGlmICghb3BlbmVkKSB7XG5cdFx0XHRcdFx0XHRcdC8vIEFwcGxlIGRvZXMgbm90IGFsbG93IHdpbmRvdy5vcGVuLCBzZWUgaHR0cHM6Ly9kZXZlbG9wZXIuYXBwbGUuY29tL2xpYnJhcnkvc2FmYXJpL2RvY3VtZW50YXRpb24vVG9vbHMvQ29uY2VwdHVhbC9TYWZhcmlFeHRlbnNpb25HdWlkZS9Xb3JraW5nd2l0aFdpbmRvd3NhbmRUYWJzL1dvcmtpbmd3aXRoV2luZG93c2FuZFRhYnMuaHRtbFxuXHRcdFx0XHRcdFx0XHR2aWV3LmxvY2F0aW9uLmhyZWYgPSBvYmplY3RfdXJsO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRmaWxlc2F2ZXIucmVhZHlTdGF0ZSA9IGZpbGVzYXZlci5ET05FO1xuXHRcdFx0XHRcdGRpc3BhdGNoX2FsbCgpO1xuXHRcdFx0XHRcdHJldm9rZShvYmplY3RfdXJsKTtcblx0XHRcdFx0fVxuXHRcdFx0O1xuXHRcdFx0ZmlsZXNhdmVyLnJlYWR5U3RhdGUgPSBmaWxlc2F2ZXIuSU5JVDtcblxuXHRcdFx0aWYgKGNhbl91c2Vfc2F2ZV9saW5rKSB7XG5cdFx0XHRcdG9iamVjdF91cmwgPSBnZXRfVVJMKCkuY3JlYXRlT2JqZWN0VVJMKGJsb2IpO1xuXHRcdFx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHNhdmVfbGluay5ocmVmID0gb2JqZWN0X3VybDtcblx0XHRcdFx0XHRzYXZlX2xpbmsuZG93bmxvYWQgPSBuYW1lO1xuXHRcdFx0XHRcdGNsaWNrKHNhdmVfbGluayk7XG5cdFx0XHRcdFx0ZGlzcGF0Y2hfYWxsKCk7XG5cdFx0XHRcdFx0cmV2b2tlKG9iamVjdF91cmwpO1xuXHRcdFx0XHRcdGZpbGVzYXZlci5yZWFkeVN0YXRlID0gZmlsZXNhdmVyLkRPTkU7XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdGZzX2Vycm9yKCk7XG5cdFx0fVxuXHRcdCwgRlNfcHJvdG8gPSBGaWxlU2F2ZXIucHJvdG90eXBlXG5cdFx0LCBzYXZlQXMgPSBmdW5jdGlvbihibG9iLCBuYW1lLCBub19hdXRvX2JvbSkge1xuXHRcdFx0cmV0dXJuIG5ldyBGaWxlU2F2ZXIoYmxvYiwgbmFtZSB8fCBibG9iLm5hbWUgfHwgXCJkb3dubG9hZFwiLCBub19hdXRvX2JvbSk7XG5cdFx0fVxuXHQ7XG5cdC8vIElFIDEwKyAobmF0aXZlIHNhdmVBcylcblx0aWYgKHR5cGVvZiBuYXZpZ2F0b3IgIT09IFwidW5kZWZpbmVkXCIgJiYgbmF2aWdhdG9yLm1zU2F2ZU9yT3BlbkJsb2IpIHtcblx0XHRyZXR1cm4gZnVuY3Rpb24oYmxvYiwgbmFtZSwgbm9fYXV0b19ib20pIHtcblx0XHRcdG5hbWUgPSBuYW1lIHx8IGJsb2IubmFtZSB8fCBcImRvd25sb2FkXCI7XG5cblx0XHRcdGlmICghbm9fYXV0b19ib20pIHtcblx0XHRcdFx0YmxvYiA9IGF1dG9fYm9tKGJsb2IpO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIG5hdmlnYXRvci5tc1NhdmVPck9wZW5CbG9iKGJsb2IsIG5hbWUpO1xuXHRcdH07XG5cdH1cblxuXHRGU19wcm90by5hYm9ydCA9IGZ1bmN0aW9uKCl7fTtcblx0RlNfcHJvdG8ucmVhZHlTdGF0ZSA9IEZTX3Byb3RvLklOSVQgPSAwO1xuXHRGU19wcm90by5XUklUSU5HID0gMTtcblx0RlNfcHJvdG8uRE9ORSA9IDI7XG5cblx0RlNfcHJvdG8uZXJyb3IgPVxuXHRGU19wcm90by5vbndyaXRlc3RhcnQgPVxuXHRGU19wcm90by5vbnByb2dyZXNzID1cblx0RlNfcHJvdG8ub253cml0ZSA9XG5cdEZTX3Byb3RvLm9uYWJvcnQgPVxuXHRGU19wcm90by5vbmVycm9yID1cblx0RlNfcHJvdG8ub253cml0ZWVuZCA9XG5cdFx0bnVsbDtcblxuXHRyZXR1cm4gc2F2ZUFzO1xufShcblx0ICAgdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgJiYgc2VsZlxuXHR8fCB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiICYmIHdpbmRvd1xuXHR8fCB0aGlzLmNvbnRlbnRcbikpO1xuLy8gYHNlbGZgIGlzIHVuZGVmaW5lZCBpbiBGaXJlZm94IGZvciBBbmRyb2lkIGNvbnRlbnQgc2NyaXB0IGNvbnRleHRcbi8vIHdoaWxlIGB0aGlzYCBpcyBuc0lDb250ZW50RnJhbWVNZXNzYWdlTWFuYWdlclxuLy8gd2l0aCBhbiBhdHRyaWJ1dGUgYGNvbnRlbnRgIHRoYXQgY29ycmVzcG9uZHMgdG8gdGhlIHdpbmRvd1xuXG5pZiAodHlwZW9mIG1vZHVsZSAhPT0gXCJ1bmRlZmluZWRcIiAmJiBtb2R1bGUuZXhwb3J0cykge1xuICBtb2R1bGUuZXhwb3J0cy5zYXZlQXMgPSBzYXZlQXM7XG59IGVsc2UgaWYgKCh0eXBlb2YgZGVmaW5lICE9PSBcInVuZGVmaW5lZFwiICYmIGRlZmluZSAhPT0gbnVsbCkgJiYgKGRlZmluZS5hbWQgIT09IG51bGwpKSB7XG4gIGRlZmluZShcIkZpbGVTYXZlci5qc1wiLCBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gc2F2ZUFzO1xuICB9KTtcbn1cbiIsIi8vIENvcHlyaWdodCAoYykgMjAxMyBQaWVyb3h5IDxwaWVyb3h5QHBpZXJveHkubmV0PlxuLy8gVGhpcyB3b3JrIGlzIGZyZWUuIFlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnkgaXRcbi8vIHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgV1RGUEwsIFZlcnNpb24gMlxuLy8gRm9yIG1vcmUgaW5mb3JtYXRpb24gc2VlIExJQ0VOU0UudHh0IG9yIGh0dHA6Ly93d3cud3RmcGwubmV0L1xuLy9cbi8vIEZvciBtb3JlIGluZm9ybWF0aW9uLCB0aGUgaG9tZSBwYWdlOlxuLy8gaHR0cDovL3BpZXJveHkubmV0L2Jsb2cvcGFnZXMvbHotc3RyaW5nL3Rlc3RpbmcuaHRtbFxuLy9cbi8vIExaLWJhc2VkIGNvbXByZXNzaW9uIGFsZ29yaXRobSwgdmVyc2lvbiAxLjQuNFxudmFyIExaU3RyaW5nID0gKGZ1bmN0aW9uKCkge1xuXG4vLyBwcml2YXRlIHByb3BlcnR5XG52YXIgZiA9IFN0cmluZy5mcm9tQ2hhckNvZGU7XG52YXIga2V5U3RyQmFzZTY0ID0gXCJBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6MDEyMzQ1Njc4OSsvPVwiO1xudmFyIGtleVN0clVyaVNhZmUgPSBcIkFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXowMTIzNDU2Nzg5Ky0kXCI7XG52YXIgYmFzZVJldmVyc2VEaWMgPSB7fTtcblxuZnVuY3Rpb24gZ2V0QmFzZVZhbHVlKGFscGhhYmV0LCBjaGFyYWN0ZXIpIHtcbiAgaWYgKCFiYXNlUmV2ZXJzZURpY1thbHBoYWJldF0pIHtcbiAgICBiYXNlUmV2ZXJzZURpY1thbHBoYWJldF0gPSB7fTtcbiAgICBmb3IgKHZhciBpPTAgOyBpPGFscGhhYmV0Lmxlbmd0aCA7IGkrKykge1xuICAgICAgYmFzZVJldmVyc2VEaWNbYWxwaGFiZXRdW2FscGhhYmV0LmNoYXJBdChpKV0gPSBpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gYmFzZVJldmVyc2VEaWNbYWxwaGFiZXRdW2NoYXJhY3Rlcl07XG59XG5cbnZhciBMWlN0cmluZyA9IHtcbiAgY29tcHJlc3NUb0Jhc2U2NCA6IGZ1bmN0aW9uIChpbnB1dCkge1xuICAgIGlmIChpbnB1dCA9PSBudWxsKSByZXR1cm4gXCJcIjtcbiAgICB2YXIgcmVzID0gTFpTdHJpbmcuX2NvbXByZXNzKGlucHV0LCA2LCBmdW5jdGlvbihhKXtyZXR1cm4ga2V5U3RyQmFzZTY0LmNoYXJBdChhKTt9KTtcbiAgICBzd2l0Y2ggKHJlcy5sZW5ndGggJSA0KSB7IC8vIFRvIHByb2R1Y2UgdmFsaWQgQmFzZTY0XG4gICAgZGVmYXVsdDogLy8gV2hlbiBjb3VsZCB0aGlzIGhhcHBlbiA/XG4gICAgY2FzZSAwIDogcmV0dXJuIHJlcztcbiAgICBjYXNlIDEgOiByZXR1cm4gcmVzK1wiPT09XCI7XG4gICAgY2FzZSAyIDogcmV0dXJuIHJlcytcIj09XCI7XG4gICAgY2FzZSAzIDogcmV0dXJuIHJlcytcIj1cIjtcbiAgICB9XG4gIH0sXG5cbiAgZGVjb21wcmVzc0Zyb21CYXNlNjQgOiBmdW5jdGlvbiAoaW5wdXQpIHtcbiAgICBpZiAoaW5wdXQgPT0gbnVsbCkgcmV0dXJuIFwiXCI7XG4gICAgaWYgKGlucHV0ID09IFwiXCIpIHJldHVybiBudWxsO1xuICAgIHJldHVybiBMWlN0cmluZy5fZGVjb21wcmVzcyhpbnB1dC5sZW5ndGgsIDMyLCBmdW5jdGlvbihpbmRleCkgeyByZXR1cm4gZ2V0QmFzZVZhbHVlKGtleVN0ckJhc2U2NCwgaW5wdXQuY2hhckF0KGluZGV4KSk7IH0pO1xuICB9LFxuXG4gIGNvbXByZXNzVG9VVEYxNiA6IGZ1bmN0aW9uIChpbnB1dCkge1xuICAgIGlmIChpbnB1dCA9PSBudWxsKSByZXR1cm4gXCJcIjtcbiAgICByZXR1cm4gTFpTdHJpbmcuX2NvbXByZXNzKGlucHV0LCAxNSwgZnVuY3Rpb24oYSl7cmV0dXJuIGYoYSszMik7fSkgKyBcIiBcIjtcbiAgfSxcblxuICBkZWNvbXByZXNzRnJvbVVURjE2OiBmdW5jdGlvbiAoY29tcHJlc3NlZCkge1xuICAgIGlmIChjb21wcmVzc2VkID09IG51bGwpIHJldHVybiBcIlwiO1xuICAgIGlmIChjb21wcmVzc2VkID09IFwiXCIpIHJldHVybiBudWxsO1xuICAgIHJldHVybiBMWlN0cmluZy5fZGVjb21wcmVzcyhjb21wcmVzc2VkLmxlbmd0aCwgMTYzODQsIGZ1bmN0aW9uKGluZGV4KSB7IHJldHVybiBjb21wcmVzc2VkLmNoYXJDb2RlQXQoaW5kZXgpIC0gMzI7IH0pO1xuICB9LFxuXG4gIC8vY29tcHJlc3MgaW50byB1aW50OGFycmF5IChVQ1MtMiBiaWcgZW5kaWFuIGZvcm1hdClcbiAgY29tcHJlc3NUb1VpbnQ4QXJyYXk6IGZ1bmN0aW9uICh1bmNvbXByZXNzZWQpIHtcbiAgICB2YXIgY29tcHJlc3NlZCA9IExaU3RyaW5nLmNvbXByZXNzKHVuY29tcHJlc3NlZCk7XG4gICAgdmFyIGJ1Zj1uZXcgVWludDhBcnJheShjb21wcmVzc2VkLmxlbmd0aCoyKTsgLy8gMiBieXRlcyBwZXIgY2hhcmFjdGVyXG5cbiAgICBmb3IgKHZhciBpPTAsIFRvdGFsTGVuPWNvbXByZXNzZWQubGVuZ3RoOyBpPFRvdGFsTGVuOyBpKyspIHtcbiAgICAgIHZhciBjdXJyZW50X3ZhbHVlID0gY29tcHJlc3NlZC5jaGFyQ29kZUF0KGkpO1xuICAgICAgYnVmW2kqMl0gPSBjdXJyZW50X3ZhbHVlID4+PiA4O1xuICAgICAgYnVmW2kqMisxXSA9IGN1cnJlbnRfdmFsdWUgJSAyNTY7XG4gICAgfVxuICAgIHJldHVybiBidWY7XG4gIH0sXG5cbiAgLy9kZWNvbXByZXNzIGZyb20gdWludDhhcnJheSAoVUNTLTIgYmlnIGVuZGlhbiBmb3JtYXQpXG4gIGRlY29tcHJlc3NGcm9tVWludDhBcnJheTpmdW5jdGlvbiAoY29tcHJlc3NlZCkge1xuICAgIGlmIChjb21wcmVzc2VkPT09bnVsbCB8fCBjb21wcmVzc2VkPT09dW5kZWZpbmVkKXtcbiAgICAgICAgcmV0dXJuIExaU3RyaW5nLmRlY29tcHJlc3MoY29tcHJlc3NlZCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIGJ1Zj1uZXcgQXJyYXkoY29tcHJlc3NlZC5sZW5ndGgvMik7IC8vIDIgYnl0ZXMgcGVyIGNoYXJhY3RlclxuICAgICAgICBmb3IgKHZhciBpPTAsIFRvdGFsTGVuPWJ1Zi5sZW5ndGg7IGk8VG90YWxMZW47IGkrKykge1xuICAgICAgICAgIGJ1ZltpXT1jb21wcmVzc2VkW2kqMl0qMjU2K2NvbXByZXNzZWRbaSoyKzFdO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHJlc3VsdCA9IFtdO1xuICAgICAgICBidWYuZm9yRWFjaChmdW5jdGlvbiAoYykge1xuICAgICAgICAgIHJlc3VsdC5wdXNoKGYoYykpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIExaU3RyaW5nLmRlY29tcHJlc3MocmVzdWx0LmpvaW4oJycpKTtcblxuICAgIH1cblxuICB9LFxuXG5cbiAgLy9jb21wcmVzcyBpbnRvIGEgc3RyaW5nIHRoYXQgaXMgYWxyZWFkeSBVUkkgZW5jb2RlZFxuICBjb21wcmVzc1RvRW5jb2RlZFVSSUNvbXBvbmVudDogZnVuY3Rpb24gKGlucHV0KSB7XG4gICAgaWYgKGlucHV0ID09IG51bGwpIHJldHVybiBcIlwiO1xuICAgIHJldHVybiBMWlN0cmluZy5fY29tcHJlc3MoaW5wdXQsIDYsIGZ1bmN0aW9uKGEpe3JldHVybiBrZXlTdHJVcmlTYWZlLmNoYXJBdChhKTt9KTtcbiAgfSxcblxuICAvL2RlY29tcHJlc3MgZnJvbSBhbiBvdXRwdXQgb2YgY29tcHJlc3NUb0VuY29kZWRVUklDb21wb25lbnRcbiAgZGVjb21wcmVzc0Zyb21FbmNvZGVkVVJJQ29tcG9uZW50OmZ1bmN0aW9uIChpbnB1dCkge1xuICAgIGlmIChpbnB1dCA9PSBudWxsKSByZXR1cm4gXCJcIjtcbiAgICBpZiAoaW5wdXQgPT0gXCJcIikgcmV0dXJuIG51bGw7XG4gICAgaW5wdXQgPSBpbnB1dC5yZXBsYWNlKC8gL2csIFwiK1wiKTtcbiAgICByZXR1cm4gTFpTdHJpbmcuX2RlY29tcHJlc3MoaW5wdXQubGVuZ3RoLCAzMiwgZnVuY3Rpb24oaW5kZXgpIHsgcmV0dXJuIGdldEJhc2VWYWx1ZShrZXlTdHJVcmlTYWZlLCBpbnB1dC5jaGFyQXQoaW5kZXgpKTsgfSk7XG4gIH0sXG5cbiAgY29tcHJlc3M6IGZ1bmN0aW9uICh1bmNvbXByZXNzZWQpIHtcbiAgICByZXR1cm4gTFpTdHJpbmcuX2NvbXByZXNzKHVuY29tcHJlc3NlZCwgMTYsIGZ1bmN0aW9uKGEpe3JldHVybiBmKGEpO30pO1xuICB9LFxuICBfY29tcHJlc3M6IGZ1bmN0aW9uICh1bmNvbXByZXNzZWQsIGJpdHNQZXJDaGFyLCBnZXRDaGFyRnJvbUludCkge1xuICAgIGlmICh1bmNvbXByZXNzZWQgPT0gbnVsbCkgcmV0dXJuIFwiXCI7XG4gICAgdmFyIGksIHZhbHVlLFxuICAgICAgICBjb250ZXh0X2RpY3Rpb25hcnk9IHt9LFxuICAgICAgICBjb250ZXh0X2RpY3Rpb25hcnlUb0NyZWF0ZT0ge30sXG4gICAgICAgIGNvbnRleHRfYz1cIlwiLFxuICAgICAgICBjb250ZXh0X3djPVwiXCIsXG4gICAgICAgIGNvbnRleHRfdz1cIlwiLFxuICAgICAgICBjb250ZXh0X2VubGFyZ2VJbj0gMiwgLy8gQ29tcGVuc2F0ZSBmb3IgdGhlIGZpcnN0IGVudHJ5IHdoaWNoIHNob3VsZCBub3QgY291bnRcbiAgICAgICAgY29udGV4dF9kaWN0U2l6ZT0gMyxcbiAgICAgICAgY29udGV4dF9udW1CaXRzPSAyLFxuICAgICAgICBjb250ZXh0X2RhdGE9W10sXG4gICAgICAgIGNvbnRleHRfZGF0YV92YWw9MCxcbiAgICAgICAgY29udGV4dF9kYXRhX3Bvc2l0aW9uPTAsXG4gICAgICAgIGlpO1xuXG4gICAgZm9yIChpaSA9IDA7IGlpIDwgdW5jb21wcmVzc2VkLmxlbmd0aDsgaWkgKz0gMSkge1xuICAgICAgY29udGV4dF9jID0gdW5jb21wcmVzc2VkLmNoYXJBdChpaSk7XG4gICAgICBpZiAoIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChjb250ZXh0X2RpY3Rpb25hcnksY29udGV4dF9jKSkge1xuICAgICAgICBjb250ZXh0X2RpY3Rpb25hcnlbY29udGV4dF9jXSA9IGNvbnRleHRfZGljdFNpemUrKztcbiAgICAgICAgY29udGV4dF9kaWN0aW9uYXJ5VG9DcmVhdGVbY29udGV4dF9jXSA9IHRydWU7XG4gICAgICB9XG5cbiAgICAgIGNvbnRleHRfd2MgPSBjb250ZXh0X3cgKyBjb250ZXh0X2M7XG4gICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKGNvbnRleHRfZGljdGlvbmFyeSxjb250ZXh0X3djKSkge1xuICAgICAgICBjb250ZXh0X3cgPSBjb250ZXh0X3djO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChjb250ZXh0X2RpY3Rpb25hcnlUb0NyZWF0ZSxjb250ZXh0X3cpKSB7XG4gICAgICAgICAgaWYgKGNvbnRleHRfdy5jaGFyQ29kZUF0KDApPDI1Nikge1xuICAgICAgICAgICAgZm9yIChpPTAgOyBpPGNvbnRleHRfbnVtQml0cyA7IGkrKykge1xuICAgICAgICAgICAgICBjb250ZXh0X2RhdGFfdmFsID0gKGNvbnRleHRfZGF0YV92YWwgPDwgMSk7XG4gICAgICAgICAgICAgIGlmIChjb250ZXh0X2RhdGFfcG9zaXRpb24gPT0gYml0c1BlckNoYXItMSkge1xuICAgICAgICAgICAgICAgIGNvbnRleHRfZGF0YV9wb3NpdGlvbiA9IDA7XG4gICAgICAgICAgICAgICAgY29udGV4dF9kYXRhLnB1c2goZ2V0Q2hhckZyb21JbnQoY29udGV4dF9kYXRhX3ZhbCkpO1xuICAgICAgICAgICAgICAgIGNvbnRleHRfZGF0YV92YWwgPSAwO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnRleHRfZGF0YV9wb3NpdGlvbisrO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YWx1ZSA9IGNvbnRleHRfdy5jaGFyQ29kZUF0KDApO1xuICAgICAgICAgICAgZm9yIChpPTAgOyBpPDggOyBpKyspIHtcbiAgICAgICAgICAgICAgY29udGV4dF9kYXRhX3ZhbCA9IChjb250ZXh0X2RhdGFfdmFsIDw8IDEpIHwgKHZhbHVlJjEpO1xuICAgICAgICAgICAgICBpZiAoY29udGV4dF9kYXRhX3Bvc2l0aW9uID09IGJpdHNQZXJDaGFyLTEpIHtcbiAgICAgICAgICAgICAgICBjb250ZXh0X2RhdGFfcG9zaXRpb24gPSAwO1xuICAgICAgICAgICAgICAgIGNvbnRleHRfZGF0YS5wdXNoKGdldENoYXJGcm9tSW50KGNvbnRleHRfZGF0YV92YWwpKTtcbiAgICAgICAgICAgICAgICBjb250ZXh0X2RhdGFfdmFsID0gMDtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb250ZXh0X2RhdGFfcG9zaXRpb24rKztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB2YWx1ZSA9IHZhbHVlID4+IDE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhbHVlID0gMTtcbiAgICAgICAgICAgIGZvciAoaT0wIDsgaTxjb250ZXh0X251bUJpdHMgOyBpKyspIHtcbiAgICAgICAgICAgICAgY29udGV4dF9kYXRhX3ZhbCA9IChjb250ZXh0X2RhdGFfdmFsIDw8IDEpIHwgdmFsdWU7XG4gICAgICAgICAgICAgIGlmIChjb250ZXh0X2RhdGFfcG9zaXRpb24gPT1iaXRzUGVyQ2hhci0xKSB7XG4gICAgICAgICAgICAgICAgY29udGV4dF9kYXRhX3Bvc2l0aW9uID0gMDtcbiAgICAgICAgICAgICAgICBjb250ZXh0X2RhdGEucHVzaChnZXRDaGFyRnJvbUludChjb250ZXh0X2RhdGFfdmFsKSk7XG4gICAgICAgICAgICAgICAgY29udGV4dF9kYXRhX3ZhbCA9IDA7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29udGV4dF9kYXRhX3Bvc2l0aW9uKys7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgdmFsdWUgPSAwO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFsdWUgPSBjb250ZXh0X3cuY2hhckNvZGVBdCgwKTtcbiAgICAgICAgICAgIGZvciAoaT0wIDsgaTwxNiA7IGkrKykge1xuICAgICAgICAgICAgICBjb250ZXh0X2RhdGFfdmFsID0gKGNvbnRleHRfZGF0YV92YWwgPDwgMSkgfCAodmFsdWUmMSk7XG4gICAgICAgICAgICAgIGlmIChjb250ZXh0X2RhdGFfcG9zaXRpb24gPT0gYml0c1BlckNoYXItMSkge1xuICAgICAgICAgICAgICAgIGNvbnRleHRfZGF0YV9wb3NpdGlvbiA9IDA7XG4gICAgICAgICAgICAgICAgY29udGV4dF9kYXRhLnB1c2goZ2V0Q2hhckZyb21JbnQoY29udGV4dF9kYXRhX3ZhbCkpO1xuICAgICAgICAgICAgICAgIGNvbnRleHRfZGF0YV92YWwgPSAwO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnRleHRfZGF0YV9wb3NpdGlvbisrO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIHZhbHVlID0gdmFsdWUgPj4gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgY29udGV4dF9lbmxhcmdlSW4tLTtcbiAgICAgICAgICBpZiAoY29udGV4dF9lbmxhcmdlSW4gPT0gMCkge1xuICAgICAgICAgICAgY29udGV4dF9lbmxhcmdlSW4gPSBNYXRoLnBvdygyLCBjb250ZXh0X251bUJpdHMpO1xuICAgICAgICAgICAgY29udGV4dF9udW1CaXRzKys7XG4gICAgICAgICAgfVxuICAgICAgICAgIGRlbGV0ZSBjb250ZXh0X2RpY3Rpb25hcnlUb0NyZWF0ZVtjb250ZXh0X3ddO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHZhbHVlID0gY29udGV4dF9kaWN0aW9uYXJ5W2NvbnRleHRfd107XG4gICAgICAgICAgZm9yIChpPTAgOyBpPGNvbnRleHRfbnVtQml0cyA7IGkrKykge1xuICAgICAgICAgICAgY29udGV4dF9kYXRhX3ZhbCA9IChjb250ZXh0X2RhdGFfdmFsIDw8IDEpIHwgKHZhbHVlJjEpO1xuICAgICAgICAgICAgaWYgKGNvbnRleHRfZGF0YV9wb3NpdGlvbiA9PSBiaXRzUGVyQ2hhci0xKSB7XG4gICAgICAgICAgICAgIGNvbnRleHRfZGF0YV9wb3NpdGlvbiA9IDA7XG4gICAgICAgICAgICAgIGNvbnRleHRfZGF0YS5wdXNoKGdldENoYXJGcm9tSW50KGNvbnRleHRfZGF0YV92YWwpKTtcbiAgICAgICAgICAgICAgY29udGV4dF9kYXRhX3ZhbCA9IDA7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBjb250ZXh0X2RhdGFfcG9zaXRpb24rKztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhbHVlID0gdmFsdWUgPj4gMTtcbiAgICAgICAgICB9XG5cblxuICAgICAgICB9XG4gICAgICAgIGNvbnRleHRfZW5sYXJnZUluLS07XG4gICAgICAgIGlmIChjb250ZXh0X2VubGFyZ2VJbiA9PSAwKSB7XG4gICAgICAgICAgY29udGV4dF9lbmxhcmdlSW4gPSBNYXRoLnBvdygyLCBjb250ZXh0X251bUJpdHMpO1xuICAgICAgICAgIGNvbnRleHRfbnVtQml0cysrO1xuICAgICAgICB9XG4gICAgICAgIC8vIEFkZCB3YyB0byB0aGUgZGljdGlvbmFyeS5cbiAgICAgICAgY29udGV4dF9kaWN0aW9uYXJ5W2NvbnRleHRfd2NdID0gY29udGV4dF9kaWN0U2l6ZSsrO1xuICAgICAgICBjb250ZXh0X3cgPSBTdHJpbmcoY29udGV4dF9jKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBPdXRwdXQgdGhlIGNvZGUgZm9yIHcuXG4gICAgaWYgKGNvbnRleHRfdyAhPT0gXCJcIikge1xuICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChjb250ZXh0X2RpY3Rpb25hcnlUb0NyZWF0ZSxjb250ZXh0X3cpKSB7XG4gICAgICAgIGlmIChjb250ZXh0X3cuY2hhckNvZGVBdCgwKTwyNTYpIHtcbiAgICAgICAgICBmb3IgKGk9MCA7IGk8Y29udGV4dF9udW1CaXRzIDsgaSsrKSB7XG4gICAgICAgICAgICBjb250ZXh0X2RhdGFfdmFsID0gKGNvbnRleHRfZGF0YV92YWwgPDwgMSk7XG4gICAgICAgICAgICBpZiAoY29udGV4dF9kYXRhX3Bvc2l0aW9uID09IGJpdHNQZXJDaGFyLTEpIHtcbiAgICAgICAgICAgICAgY29udGV4dF9kYXRhX3Bvc2l0aW9uID0gMDtcbiAgICAgICAgICAgICAgY29udGV4dF9kYXRhLnB1c2goZ2V0Q2hhckZyb21JbnQoY29udGV4dF9kYXRhX3ZhbCkpO1xuICAgICAgICAgICAgICBjb250ZXh0X2RhdGFfdmFsID0gMDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGNvbnRleHRfZGF0YV9wb3NpdGlvbisrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICB2YWx1ZSA9IGNvbnRleHRfdy5jaGFyQ29kZUF0KDApO1xuICAgICAgICAgIGZvciAoaT0wIDsgaTw4IDsgaSsrKSB7XG4gICAgICAgICAgICBjb250ZXh0X2RhdGFfdmFsID0gKGNvbnRleHRfZGF0YV92YWwgPDwgMSkgfCAodmFsdWUmMSk7XG4gICAgICAgICAgICBpZiAoY29udGV4dF9kYXRhX3Bvc2l0aW9uID09IGJpdHNQZXJDaGFyLTEpIHtcbiAgICAgICAgICAgICAgY29udGV4dF9kYXRhX3Bvc2l0aW9uID0gMDtcbiAgICAgICAgICAgICAgY29udGV4dF9kYXRhLnB1c2goZ2V0Q2hhckZyb21JbnQoY29udGV4dF9kYXRhX3ZhbCkpO1xuICAgICAgICAgICAgICBjb250ZXh0X2RhdGFfdmFsID0gMDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGNvbnRleHRfZGF0YV9wb3NpdGlvbisrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZSA+PiAxO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB2YWx1ZSA9IDE7XG4gICAgICAgICAgZm9yIChpPTAgOyBpPGNvbnRleHRfbnVtQml0cyA7IGkrKykge1xuICAgICAgICAgICAgY29udGV4dF9kYXRhX3ZhbCA9IChjb250ZXh0X2RhdGFfdmFsIDw8IDEpIHwgdmFsdWU7XG4gICAgICAgICAgICBpZiAoY29udGV4dF9kYXRhX3Bvc2l0aW9uID09IGJpdHNQZXJDaGFyLTEpIHtcbiAgICAgICAgICAgICAgY29udGV4dF9kYXRhX3Bvc2l0aW9uID0gMDtcbiAgICAgICAgICAgICAgY29udGV4dF9kYXRhLnB1c2goZ2V0Q2hhckZyb21JbnQoY29udGV4dF9kYXRhX3ZhbCkpO1xuICAgICAgICAgICAgICBjb250ZXh0X2RhdGFfdmFsID0gMDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGNvbnRleHRfZGF0YV9wb3NpdGlvbisrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFsdWUgPSAwO1xuICAgICAgICAgIH1cbiAgICAgICAgICB2YWx1ZSA9IGNvbnRleHRfdy5jaGFyQ29kZUF0KDApO1xuICAgICAgICAgIGZvciAoaT0wIDsgaTwxNiA7IGkrKykge1xuICAgICAgICAgICAgY29udGV4dF9kYXRhX3ZhbCA9IChjb250ZXh0X2RhdGFfdmFsIDw8IDEpIHwgKHZhbHVlJjEpO1xuICAgICAgICAgICAgaWYgKGNvbnRleHRfZGF0YV9wb3NpdGlvbiA9PSBiaXRzUGVyQ2hhci0xKSB7XG4gICAgICAgICAgICAgIGNvbnRleHRfZGF0YV9wb3NpdGlvbiA9IDA7XG4gICAgICAgICAgICAgIGNvbnRleHRfZGF0YS5wdXNoKGdldENoYXJGcm9tSW50KGNvbnRleHRfZGF0YV92YWwpKTtcbiAgICAgICAgICAgICAgY29udGV4dF9kYXRhX3ZhbCA9IDA7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBjb250ZXh0X2RhdGFfcG9zaXRpb24rKztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhbHVlID0gdmFsdWUgPj4gMTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY29udGV4dF9lbmxhcmdlSW4tLTtcbiAgICAgICAgaWYgKGNvbnRleHRfZW5sYXJnZUluID09IDApIHtcbiAgICAgICAgICBjb250ZXh0X2VubGFyZ2VJbiA9IE1hdGgucG93KDIsIGNvbnRleHRfbnVtQml0cyk7XG4gICAgICAgICAgY29udGV4dF9udW1CaXRzKys7XG4gICAgICAgIH1cbiAgICAgICAgZGVsZXRlIGNvbnRleHRfZGljdGlvbmFyeVRvQ3JlYXRlW2NvbnRleHRfd107XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YWx1ZSA9IGNvbnRleHRfZGljdGlvbmFyeVtjb250ZXh0X3ddO1xuICAgICAgICBmb3IgKGk9MCA7IGk8Y29udGV4dF9udW1CaXRzIDsgaSsrKSB7XG4gICAgICAgICAgY29udGV4dF9kYXRhX3ZhbCA9IChjb250ZXh0X2RhdGFfdmFsIDw8IDEpIHwgKHZhbHVlJjEpO1xuICAgICAgICAgIGlmIChjb250ZXh0X2RhdGFfcG9zaXRpb24gPT0gYml0c1BlckNoYXItMSkge1xuICAgICAgICAgICAgY29udGV4dF9kYXRhX3Bvc2l0aW9uID0gMDtcbiAgICAgICAgICAgIGNvbnRleHRfZGF0YS5wdXNoKGdldENoYXJGcm9tSW50KGNvbnRleHRfZGF0YV92YWwpKTtcbiAgICAgICAgICAgIGNvbnRleHRfZGF0YV92YWwgPSAwO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb250ZXh0X2RhdGFfcG9zaXRpb24rKztcbiAgICAgICAgICB9XG4gICAgICAgICAgdmFsdWUgPSB2YWx1ZSA+PiAxO1xuICAgICAgICB9XG5cblxuICAgICAgfVxuICAgICAgY29udGV4dF9lbmxhcmdlSW4tLTtcbiAgICAgIGlmIChjb250ZXh0X2VubGFyZ2VJbiA9PSAwKSB7XG4gICAgICAgIGNvbnRleHRfZW5sYXJnZUluID0gTWF0aC5wb3coMiwgY29udGV4dF9udW1CaXRzKTtcbiAgICAgICAgY29udGV4dF9udW1CaXRzKys7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gTWFyayB0aGUgZW5kIG9mIHRoZSBzdHJlYW1cbiAgICB2YWx1ZSA9IDI7XG4gICAgZm9yIChpPTAgOyBpPGNvbnRleHRfbnVtQml0cyA7IGkrKykge1xuICAgICAgY29udGV4dF9kYXRhX3ZhbCA9IChjb250ZXh0X2RhdGFfdmFsIDw8IDEpIHwgKHZhbHVlJjEpO1xuICAgICAgaWYgKGNvbnRleHRfZGF0YV9wb3NpdGlvbiA9PSBiaXRzUGVyQ2hhci0xKSB7XG4gICAgICAgIGNvbnRleHRfZGF0YV9wb3NpdGlvbiA9IDA7XG4gICAgICAgIGNvbnRleHRfZGF0YS5wdXNoKGdldENoYXJGcm9tSW50KGNvbnRleHRfZGF0YV92YWwpKTtcbiAgICAgICAgY29udGV4dF9kYXRhX3ZhbCA9IDA7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb250ZXh0X2RhdGFfcG9zaXRpb24rKztcbiAgICAgIH1cbiAgICAgIHZhbHVlID0gdmFsdWUgPj4gMTtcbiAgICB9XG5cbiAgICAvLyBGbHVzaCB0aGUgbGFzdCBjaGFyXG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgIGNvbnRleHRfZGF0YV92YWwgPSAoY29udGV4dF9kYXRhX3ZhbCA8PCAxKTtcbiAgICAgIGlmIChjb250ZXh0X2RhdGFfcG9zaXRpb24gPT0gYml0c1BlckNoYXItMSkge1xuICAgICAgICBjb250ZXh0X2RhdGEucHVzaChnZXRDaGFyRnJvbUludChjb250ZXh0X2RhdGFfdmFsKSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgICAgZWxzZSBjb250ZXh0X2RhdGFfcG9zaXRpb24rKztcbiAgICB9XG4gICAgcmV0dXJuIGNvbnRleHRfZGF0YS5qb2luKCcnKTtcbiAgfSxcblxuICBkZWNvbXByZXNzOiBmdW5jdGlvbiAoY29tcHJlc3NlZCkge1xuICAgIGlmIChjb21wcmVzc2VkID09IG51bGwpIHJldHVybiBcIlwiO1xuICAgIGlmIChjb21wcmVzc2VkID09IFwiXCIpIHJldHVybiBudWxsO1xuICAgIHJldHVybiBMWlN0cmluZy5fZGVjb21wcmVzcyhjb21wcmVzc2VkLmxlbmd0aCwgMzI3NjgsIGZ1bmN0aW9uKGluZGV4KSB7IHJldHVybiBjb21wcmVzc2VkLmNoYXJDb2RlQXQoaW5kZXgpOyB9KTtcbiAgfSxcblxuICBfZGVjb21wcmVzczogZnVuY3Rpb24gKGxlbmd0aCwgcmVzZXRWYWx1ZSwgZ2V0TmV4dFZhbHVlKSB7XG4gICAgdmFyIGRpY3Rpb25hcnkgPSBbXSxcbiAgICAgICAgbmV4dCxcbiAgICAgICAgZW5sYXJnZUluID0gNCxcbiAgICAgICAgZGljdFNpemUgPSA0LFxuICAgICAgICBudW1CaXRzID0gMyxcbiAgICAgICAgZW50cnkgPSBcIlwiLFxuICAgICAgICByZXN1bHQgPSBbXSxcbiAgICAgICAgaSxcbiAgICAgICAgdyxcbiAgICAgICAgYml0cywgcmVzYiwgbWF4cG93ZXIsIHBvd2VyLFxuICAgICAgICBjLFxuICAgICAgICBkYXRhID0ge3ZhbDpnZXROZXh0VmFsdWUoMCksIHBvc2l0aW9uOnJlc2V0VmFsdWUsIGluZGV4OjF9O1xuXG4gICAgZm9yIChpID0gMDsgaSA8IDM7IGkgKz0gMSkge1xuICAgICAgZGljdGlvbmFyeVtpXSA9IGk7XG4gICAgfVxuXG4gICAgYml0cyA9IDA7XG4gICAgbWF4cG93ZXIgPSBNYXRoLnBvdygyLDIpO1xuICAgIHBvd2VyPTE7XG4gICAgd2hpbGUgKHBvd2VyIT1tYXhwb3dlcikge1xuICAgICAgcmVzYiA9IGRhdGEudmFsICYgZGF0YS5wb3NpdGlvbjtcbiAgICAgIGRhdGEucG9zaXRpb24gPj49IDE7XG4gICAgICBpZiAoZGF0YS5wb3NpdGlvbiA9PSAwKSB7XG4gICAgICAgIGRhdGEucG9zaXRpb24gPSByZXNldFZhbHVlO1xuICAgICAgICBkYXRhLnZhbCA9IGdldE5leHRWYWx1ZShkYXRhLmluZGV4KyspO1xuICAgICAgfVxuICAgICAgYml0cyB8PSAocmVzYj4wID8gMSA6IDApICogcG93ZXI7XG4gICAgICBwb3dlciA8PD0gMTtcbiAgICB9XG5cbiAgICBzd2l0Y2ggKG5leHQgPSBiaXRzKSB7XG4gICAgICBjYXNlIDA6XG4gICAgICAgICAgYml0cyA9IDA7XG4gICAgICAgICAgbWF4cG93ZXIgPSBNYXRoLnBvdygyLDgpO1xuICAgICAgICAgIHBvd2VyPTE7XG4gICAgICAgICAgd2hpbGUgKHBvd2VyIT1tYXhwb3dlcikge1xuICAgICAgICAgICAgcmVzYiA9IGRhdGEudmFsICYgZGF0YS5wb3NpdGlvbjtcbiAgICAgICAgICAgIGRhdGEucG9zaXRpb24gPj49IDE7XG4gICAgICAgICAgICBpZiAoZGF0YS5wb3NpdGlvbiA9PSAwKSB7XG4gICAgICAgICAgICAgIGRhdGEucG9zaXRpb24gPSByZXNldFZhbHVlO1xuICAgICAgICAgICAgICBkYXRhLnZhbCA9IGdldE5leHRWYWx1ZShkYXRhLmluZGV4KyspO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYml0cyB8PSAocmVzYj4wID8gMSA6IDApICogcG93ZXI7XG4gICAgICAgICAgICBwb3dlciA8PD0gMTtcbiAgICAgICAgICB9XG4gICAgICAgIGMgPSBmKGJpdHMpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMTpcbiAgICAgICAgICBiaXRzID0gMDtcbiAgICAgICAgICBtYXhwb3dlciA9IE1hdGgucG93KDIsMTYpO1xuICAgICAgICAgIHBvd2VyPTE7XG4gICAgICAgICAgd2hpbGUgKHBvd2VyIT1tYXhwb3dlcikge1xuICAgICAgICAgICAgcmVzYiA9IGRhdGEudmFsICYgZGF0YS5wb3NpdGlvbjtcbiAgICAgICAgICAgIGRhdGEucG9zaXRpb24gPj49IDE7XG4gICAgICAgICAgICBpZiAoZGF0YS5wb3NpdGlvbiA9PSAwKSB7XG4gICAgICAgICAgICAgIGRhdGEucG9zaXRpb24gPSByZXNldFZhbHVlO1xuICAgICAgICAgICAgICBkYXRhLnZhbCA9IGdldE5leHRWYWx1ZShkYXRhLmluZGV4KyspO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYml0cyB8PSAocmVzYj4wID8gMSA6IDApICogcG93ZXI7XG4gICAgICAgICAgICBwb3dlciA8PD0gMTtcbiAgICAgICAgICB9XG4gICAgICAgIGMgPSBmKGJpdHMpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMjpcbiAgICAgICAgcmV0dXJuIFwiXCI7XG4gICAgfVxuICAgIGRpY3Rpb25hcnlbM10gPSBjO1xuICAgIHcgPSBjO1xuICAgIHJlc3VsdC5wdXNoKGMpO1xuICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICBpZiAoZGF0YS5pbmRleCA+IGxlbmd0aCkge1xuICAgICAgICByZXR1cm4gXCJcIjtcbiAgICAgIH1cblxuICAgICAgYml0cyA9IDA7XG4gICAgICBtYXhwb3dlciA9IE1hdGgucG93KDIsbnVtQml0cyk7XG4gICAgICBwb3dlcj0xO1xuICAgICAgd2hpbGUgKHBvd2VyIT1tYXhwb3dlcikge1xuICAgICAgICByZXNiID0gZGF0YS52YWwgJiBkYXRhLnBvc2l0aW9uO1xuICAgICAgICBkYXRhLnBvc2l0aW9uID4+PSAxO1xuICAgICAgICBpZiAoZGF0YS5wb3NpdGlvbiA9PSAwKSB7XG4gICAgICAgICAgZGF0YS5wb3NpdGlvbiA9IHJlc2V0VmFsdWU7XG4gICAgICAgICAgZGF0YS52YWwgPSBnZXROZXh0VmFsdWUoZGF0YS5pbmRleCsrKTtcbiAgICAgICAgfVxuICAgICAgICBiaXRzIHw9IChyZXNiPjAgPyAxIDogMCkgKiBwb3dlcjtcbiAgICAgICAgcG93ZXIgPDw9IDE7XG4gICAgICB9XG5cbiAgICAgIHN3aXRjaCAoYyA9IGJpdHMpIHtcbiAgICAgICAgY2FzZSAwOlxuICAgICAgICAgIGJpdHMgPSAwO1xuICAgICAgICAgIG1heHBvd2VyID0gTWF0aC5wb3coMiw4KTtcbiAgICAgICAgICBwb3dlcj0xO1xuICAgICAgICAgIHdoaWxlIChwb3dlciE9bWF4cG93ZXIpIHtcbiAgICAgICAgICAgIHJlc2IgPSBkYXRhLnZhbCAmIGRhdGEucG9zaXRpb247XG4gICAgICAgICAgICBkYXRhLnBvc2l0aW9uID4+PSAxO1xuICAgICAgICAgICAgaWYgKGRhdGEucG9zaXRpb24gPT0gMCkge1xuICAgICAgICAgICAgICBkYXRhLnBvc2l0aW9uID0gcmVzZXRWYWx1ZTtcbiAgICAgICAgICAgICAgZGF0YS52YWwgPSBnZXROZXh0VmFsdWUoZGF0YS5pbmRleCsrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJpdHMgfD0gKHJlc2I+MCA/IDEgOiAwKSAqIHBvd2VyO1xuICAgICAgICAgICAgcG93ZXIgPDw9IDE7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgZGljdGlvbmFyeVtkaWN0U2l6ZSsrXSA9IGYoYml0cyk7XG4gICAgICAgICAgYyA9IGRpY3RTaXplLTE7XG4gICAgICAgICAgZW5sYXJnZUluLS07XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMTpcbiAgICAgICAgICBiaXRzID0gMDtcbiAgICAgICAgICBtYXhwb3dlciA9IE1hdGgucG93KDIsMTYpO1xuICAgICAgICAgIHBvd2VyPTE7XG4gICAgICAgICAgd2hpbGUgKHBvd2VyIT1tYXhwb3dlcikge1xuICAgICAgICAgICAgcmVzYiA9IGRhdGEudmFsICYgZGF0YS5wb3NpdGlvbjtcbiAgICAgICAgICAgIGRhdGEucG9zaXRpb24gPj49IDE7XG4gICAgICAgICAgICBpZiAoZGF0YS5wb3NpdGlvbiA9PSAwKSB7XG4gICAgICAgICAgICAgIGRhdGEucG9zaXRpb24gPSByZXNldFZhbHVlO1xuICAgICAgICAgICAgICBkYXRhLnZhbCA9IGdldE5leHRWYWx1ZShkYXRhLmluZGV4KyspO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYml0cyB8PSAocmVzYj4wID8gMSA6IDApICogcG93ZXI7XG4gICAgICAgICAgICBwb3dlciA8PD0gMTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZGljdGlvbmFyeVtkaWN0U2l6ZSsrXSA9IGYoYml0cyk7XG4gICAgICAgICAgYyA9IGRpY3RTaXplLTE7XG4gICAgICAgICAgZW5sYXJnZUluLS07XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMjpcbiAgICAgICAgICByZXR1cm4gcmVzdWx0LmpvaW4oJycpO1xuICAgICAgfVxuXG4gICAgICBpZiAoZW5sYXJnZUluID09IDApIHtcbiAgICAgICAgZW5sYXJnZUluID0gTWF0aC5wb3coMiwgbnVtQml0cyk7XG4gICAgICAgIG51bUJpdHMrKztcbiAgICAgIH1cblxuICAgICAgaWYgKGRpY3Rpb25hcnlbY10pIHtcbiAgICAgICAgZW50cnkgPSBkaWN0aW9uYXJ5W2NdO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKGMgPT09IGRpY3RTaXplKSB7XG4gICAgICAgICAgZW50cnkgPSB3ICsgdy5jaGFyQXQoMCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJlc3VsdC5wdXNoKGVudHJ5KTtcblxuICAgICAgLy8gQWRkIHcrZW50cnlbMF0gdG8gdGhlIGRpY3Rpb25hcnkuXG4gICAgICBkaWN0aW9uYXJ5W2RpY3RTaXplKytdID0gdyArIGVudHJ5LmNoYXJBdCgwKTtcbiAgICAgIGVubGFyZ2VJbi0tO1xuXG4gICAgICB3ID0gZW50cnk7XG5cbiAgICAgIGlmIChlbmxhcmdlSW4gPT0gMCkge1xuICAgICAgICBlbmxhcmdlSW4gPSBNYXRoLnBvdygyLCBudW1CaXRzKTtcbiAgICAgICAgbnVtQml0cysrO1xuICAgICAgfVxuXG4gICAgfVxuICB9XG59O1xuICByZXR1cm4gTFpTdHJpbmc7XG59KSgpO1xuXG5pZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gIGRlZmluZShmdW5jdGlvbiAoKSB7IHJldHVybiBMWlN0cmluZzsgfSk7XG59IGVsc2UgaWYoIHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZSAhPSBudWxsICkge1xuICBtb2R1bGUuZXhwb3J0cyA9IExaU3RyaW5nXG59XG4iLCIhZnVuY3Rpb24oKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuICAgIGZ1bmN0aW9uIFZOb2RlKCkge31cbiAgICBmdW5jdGlvbiBoKG5vZGVOYW1lLCBhdHRyaWJ1dGVzKSB7XG4gICAgICAgIHZhciBsYXN0U2ltcGxlLCBjaGlsZCwgc2ltcGxlLCBpLCBjaGlsZHJlbiA9IEVNUFRZX0NISUxEUkVOO1xuICAgICAgICBmb3IgKGkgPSBhcmd1bWVudHMubGVuZ3RoOyBpLS0gPiAyOyApIHN0YWNrLnB1c2goYXJndW1lbnRzW2ldKTtcbiAgICAgICAgaWYgKGF0dHJpYnV0ZXMgJiYgbnVsbCAhPSBhdHRyaWJ1dGVzLmNoaWxkcmVuKSB7XG4gICAgICAgICAgICBpZiAoIXN0YWNrLmxlbmd0aCkgc3RhY2sucHVzaChhdHRyaWJ1dGVzLmNoaWxkcmVuKTtcbiAgICAgICAgICAgIGRlbGV0ZSBhdHRyaWJ1dGVzLmNoaWxkcmVuO1xuICAgICAgICB9XG4gICAgICAgIHdoaWxlIChzdGFjay5sZW5ndGgpIGlmICgoY2hpbGQgPSBzdGFjay5wb3AoKSkgJiYgdm9pZCAwICE9PSBjaGlsZC5wb3ApIGZvciAoaSA9IGNoaWxkLmxlbmd0aDsgaS0tOyApIHN0YWNrLnB1c2goY2hpbGRbaV0pOyBlbHNlIHtcbiAgICAgICAgICAgIGlmIChjaGlsZCA9PT0gITAgfHwgY2hpbGQgPT09ICExKSBjaGlsZCA9IG51bGw7XG4gICAgICAgICAgICBpZiAoc2ltcGxlID0gJ2Z1bmN0aW9uJyAhPSB0eXBlb2Ygbm9kZU5hbWUpIGlmIChudWxsID09IGNoaWxkKSBjaGlsZCA9ICcnOyBlbHNlIGlmICgnbnVtYmVyJyA9PSB0eXBlb2YgY2hpbGQpIGNoaWxkID0gU3RyaW5nKGNoaWxkKTsgZWxzZSBpZiAoJ3N0cmluZycgIT0gdHlwZW9mIGNoaWxkKSBzaW1wbGUgPSAhMTtcbiAgICAgICAgICAgIGlmIChzaW1wbGUgJiYgbGFzdFNpbXBsZSkgY2hpbGRyZW5bY2hpbGRyZW4ubGVuZ3RoIC0gMV0gKz0gY2hpbGQ7IGVsc2UgaWYgKGNoaWxkcmVuID09PSBFTVBUWV9DSElMRFJFTikgY2hpbGRyZW4gPSBbIGNoaWxkIF07IGVsc2UgY2hpbGRyZW4ucHVzaChjaGlsZCk7XG4gICAgICAgICAgICBsYXN0U2ltcGxlID0gc2ltcGxlO1xuICAgICAgICB9XG4gICAgICAgIHZhciBwID0gbmV3IFZOb2RlKCk7XG4gICAgICAgIHAubm9kZU5hbWUgPSBub2RlTmFtZTtcbiAgICAgICAgcC5jaGlsZHJlbiA9IGNoaWxkcmVuO1xuICAgICAgICBwLmF0dHJpYnV0ZXMgPSBudWxsID09IGF0dHJpYnV0ZXMgPyB2b2lkIDAgOiBhdHRyaWJ1dGVzO1xuICAgICAgICBwLmtleSA9IG51bGwgPT0gYXR0cmlidXRlcyA/IHZvaWQgMCA6IGF0dHJpYnV0ZXMua2V5O1xuICAgICAgICBpZiAodm9pZCAwICE9PSBvcHRpb25zLnZub2RlKSBvcHRpb25zLnZub2RlKHApO1xuICAgICAgICByZXR1cm4gcDtcbiAgICB9XG4gICAgZnVuY3Rpb24gZXh0ZW5kKG9iaiwgcHJvcHMpIHtcbiAgICAgICAgZm9yICh2YXIgaSBpbiBwcm9wcykgb2JqW2ldID0gcHJvcHNbaV07XG4gICAgICAgIHJldHVybiBvYmo7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGNsb25lRWxlbWVudCh2bm9kZSwgcHJvcHMpIHtcbiAgICAgICAgcmV0dXJuIGgodm5vZGUubm9kZU5hbWUsIGV4dGVuZChleHRlbmQoe30sIHZub2RlLmF0dHJpYnV0ZXMpLCBwcm9wcyksIGFyZ3VtZW50cy5sZW5ndGggPiAyID8gW10uc2xpY2UuY2FsbChhcmd1bWVudHMsIDIpIDogdm5vZGUuY2hpbGRyZW4pO1xuICAgIH1cbiAgICBmdW5jdGlvbiBlbnF1ZXVlUmVuZGVyKGNvbXBvbmVudCkge1xuICAgICAgICBpZiAoIWNvbXBvbmVudC5fX2QgJiYgKGNvbXBvbmVudC5fX2QgPSAhMCkgJiYgMSA9PSBpdGVtcy5wdXNoKGNvbXBvbmVudCkpIChvcHRpb25zLmRlYm91bmNlUmVuZGVyaW5nIHx8IHNldFRpbWVvdXQpKHJlcmVuZGVyKTtcbiAgICB9XG4gICAgZnVuY3Rpb24gcmVyZW5kZXIoKSB7XG4gICAgICAgIHZhciBwLCBsaXN0ID0gaXRlbXM7XG4gICAgICAgIGl0ZW1zID0gW107XG4gICAgICAgIHdoaWxlIChwID0gbGlzdC5wb3AoKSkgaWYgKHAuX19kKSByZW5kZXJDb21wb25lbnQocCk7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGlzU2FtZU5vZGVUeXBlKG5vZGUsIHZub2RlLCBoeWRyYXRpbmcpIHtcbiAgICAgICAgaWYgKCdzdHJpbmcnID09IHR5cGVvZiB2bm9kZSB8fCAnbnVtYmVyJyA9PSB0eXBlb2Ygdm5vZGUpIHJldHVybiB2b2lkIDAgIT09IG5vZGUuc3BsaXRUZXh0O1xuICAgICAgICBpZiAoJ3N0cmluZycgPT0gdHlwZW9mIHZub2RlLm5vZGVOYW1lKSByZXR1cm4gIW5vZGUuX2NvbXBvbmVudENvbnN0cnVjdG9yICYmIGlzTmFtZWROb2RlKG5vZGUsIHZub2RlLm5vZGVOYW1lKTsgZWxzZSByZXR1cm4gaHlkcmF0aW5nIHx8IG5vZGUuX2NvbXBvbmVudENvbnN0cnVjdG9yID09PSB2bm9kZS5ub2RlTmFtZTtcbiAgICB9XG4gICAgZnVuY3Rpb24gaXNOYW1lZE5vZGUobm9kZSwgbm9kZU5hbWUpIHtcbiAgICAgICAgcmV0dXJuIG5vZGUuX19uID09PSBub2RlTmFtZSB8fCBub2RlLm5vZGVOYW1lLnRvTG93ZXJDYXNlKCkgPT09IG5vZGVOYW1lLnRvTG93ZXJDYXNlKCk7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGdldE5vZGVQcm9wcyh2bm9kZSkge1xuICAgICAgICB2YXIgcHJvcHMgPSBleHRlbmQoe30sIHZub2RlLmF0dHJpYnV0ZXMpO1xuICAgICAgICBwcm9wcy5jaGlsZHJlbiA9IHZub2RlLmNoaWxkcmVuO1xuICAgICAgICB2YXIgZGVmYXVsdFByb3BzID0gdm5vZGUubm9kZU5hbWUuZGVmYXVsdFByb3BzO1xuICAgICAgICBpZiAodm9pZCAwICE9PSBkZWZhdWx0UHJvcHMpIGZvciAodmFyIGkgaW4gZGVmYXVsdFByb3BzKSBpZiAodm9pZCAwID09PSBwcm9wc1tpXSkgcHJvcHNbaV0gPSBkZWZhdWx0UHJvcHNbaV07XG4gICAgICAgIHJldHVybiBwcm9wcztcbiAgICB9XG4gICAgZnVuY3Rpb24gY3JlYXRlTm9kZShub2RlTmFtZSwgaXNTdmcpIHtcbiAgICAgICAgdmFyIG5vZGUgPSBpc1N2ZyA/IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUygnaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnLCBub2RlTmFtZSkgOiBkb2N1bWVudC5jcmVhdGVFbGVtZW50KG5vZGVOYW1lKTtcbiAgICAgICAgbm9kZS5fX24gPSBub2RlTmFtZTtcbiAgICAgICAgcmV0dXJuIG5vZGU7XG4gICAgfVxuICAgIGZ1bmN0aW9uIHJlbW92ZU5vZGUobm9kZSkge1xuICAgICAgICBpZiAobm9kZS5wYXJlbnROb2RlKSBub2RlLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQobm9kZSk7XG4gICAgfVxuICAgIGZ1bmN0aW9uIHNldEFjY2Vzc29yKG5vZGUsIG5hbWUsIG9sZCwgdmFsdWUsIGlzU3ZnKSB7XG4gICAgICAgIGlmICgnY2xhc3NOYW1lJyA9PT0gbmFtZSkgbmFtZSA9ICdjbGFzcyc7XG4gICAgICAgIGlmICgna2V5JyA9PT0gbmFtZSkgOyBlbHNlIGlmICgncmVmJyA9PT0gbmFtZSkge1xuICAgICAgICAgICAgaWYgKG9sZCkgb2xkKG51bGwpO1xuICAgICAgICAgICAgaWYgKHZhbHVlKSB2YWx1ZShub2RlKTtcbiAgICAgICAgfSBlbHNlIGlmICgnY2xhc3MnID09PSBuYW1lICYmICFpc1N2Zykgbm9kZS5jbGFzc05hbWUgPSB2YWx1ZSB8fCAnJzsgZWxzZSBpZiAoJ3N0eWxlJyA9PT0gbmFtZSkge1xuICAgICAgICAgICAgaWYgKCF2YWx1ZSB8fCAnc3RyaW5nJyA9PSB0eXBlb2YgdmFsdWUgfHwgJ3N0cmluZycgPT0gdHlwZW9mIG9sZCkgbm9kZS5zdHlsZS5jc3NUZXh0ID0gdmFsdWUgfHwgJyc7XG4gICAgICAgICAgICBpZiAodmFsdWUgJiYgJ29iamVjdCcgPT0gdHlwZW9mIHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgaWYgKCdzdHJpbmcnICE9IHR5cGVvZiBvbGQpIGZvciAodmFyIGkgaW4gb2xkKSBpZiAoIShpIGluIHZhbHVlKSkgbm9kZS5zdHlsZVtpXSA9ICcnO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgaW4gdmFsdWUpIG5vZGUuc3R5bGVbaV0gPSAnbnVtYmVyJyA9PSB0eXBlb2YgdmFsdWVbaV0gJiYgSVNfTk9OX0RJTUVOU0lPTkFMLnRlc3QoaSkgPT09ICExID8gdmFsdWVbaV0gKyAncHgnIDogdmFsdWVbaV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoJ2Rhbmdlcm91c2x5U2V0SW5uZXJIVE1MJyA9PT0gbmFtZSkge1xuICAgICAgICAgICAgaWYgKHZhbHVlKSBub2RlLmlubmVySFRNTCA9IHZhbHVlLl9faHRtbCB8fCAnJztcbiAgICAgICAgfSBlbHNlIGlmICgnbycgPT0gbmFtZVswXSAmJiAnbicgPT0gbmFtZVsxXSkge1xuICAgICAgICAgICAgdmFyIHVzZUNhcHR1cmUgPSBuYW1lICE9PSAobmFtZSA9IG5hbWUucmVwbGFjZSgvQ2FwdHVyZSQvLCAnJykpO1xuICAgICAgICAgICAgbmFtZSA9IG5hbWUudG9Mb3dlckNhc2UoKS5zdWJzdHJpbmcoMik7XG4gICAgICAgICAgICBpZiAodmFsdWUpIHtcbiAgICAgICAgICAgICAgICBpZiAoIW9sZCkgbm9kZS5hZGRFdmVudExpc3RlbmVyKG5hbWUsIGV2ZW50UHJveHksIHVzZUNhcHR1cmUpO1xuICAgICAgICAgICAgfSBlbHNlIG5vZGUucmVtb3ZlRXZlbnRMaXN0ZW5lcihuYW1lLCBldmVudFByb3h5LCB1c2VDYXB0dXJlKTtcbiAgICAgICAgICAgIChub2RlLl9fbCB8fCAobm9kZS5fX2wgPSB7fSkpW25hbWVdID0gdmFsdWU7XG4gICAgICAgIH0gZWxzZSBpZiAoJ2xpc3QnICE9PSBuYW1lICYmICd0eXBlJyAhPT0gbmFtZSAmJiAhaXNTdmcgJiYgbmFtZSBpbiBub2RlKSB7XG4gICAgICAgICAgICBzZXRQcm9wZXJ0eShub2RlLCBuYW1lLCBudWxsID09IHZhbHVlID8gJycgOiB2YWx1ZSk7XG4gICAgICAgICAgICBpZiAobnVsbCA9PSB2YWx1ZSB8fCB2YWx1ZSA9PT0gITEpIG5vZGUucmVtb3ZlQXR0cmlidXRlKG5hbWUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFyIG5zID0gaXNTdmcgJiYgbmFtZSAhPT0gKG5hbWUgPSBuYW1lLnJlcGxhY2UoL154bGlua1xcOj8vLCAnJykpO1xuICAgICAgICAgICAgaWYgKG51bGwgPT0gdmFsdWUgfHwgdmFsdWUgPT09ICExKSBpZiAobnMpIG5vZGUucmVtb3ZlQXR0cmlidXRlTlMoJ2h0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsnLCBuYW1lLnRvTG93ZXJDYXNlKCkpOyBlbHNlIG5vZGUucmVtb3ZlQXR0cmlidXRlKG5hbWUpOyBlbHNlIGlmICgnZnVuY3Rpb24nICE9IHR5cGVvZiB2YWx1ZSkgaWYgKG5zKSBub2RlLnNldEF0dHJpYnV0ZU5TKCdodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rJywgbmFtZS50b0xvd2VyQ2FzZSgpLCB2YWx1ZSk7IGVsc2Ugbm9kZS5zZXRBdHRyaWJ1dGUobmFtZSwgdmFsdWUpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGZ1bmN0aW9uIHNldFByb3BlcnR5KG5vZGUsIG5hbWUsIHZhbHVlKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBub2RlW25hbWVdID0gdmFsdWU7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHt9XG4gICAgfVxuICAgIGZ1bmN0aW9uIGV2ZW50UHJveHkoZSkge1xuICAgICAgICByZXR1cm4gdGhpcy5fX2xbZS50eXBlXShvcHRpb25zLmV2ZW50ICYmIG9wdGlvbnMuZXZlbnQoZSkgfHwgZSk7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGZsdXNoTW91bnRzKCkge1xuICAgICAgICB2YXIgYztcbiAgICAgICAgd2hpbGUgKGMgPSBtb3VudHMucG9wKCkpIHtcbiAgICAgICAgICAgIGlmIChvcHRpb25zLmFmdGVyTW91bnQpIG9wdGlvbnMuYWZ0ZXJNb3VudChjKTtcbiAgICAgICAgICAgIGlmIChjLmNvbXBvbmVudERpZE1vdW50KSBjLmNvbXBvbmVudERpZE1vdW50KCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZnVuY3Rpb24gZGlmZihkb20sIHZub2RlLCBjb250ZXh0LCBtb3VudEFsbCwgcGFyZW50LCBjb21wb25lbnRSb290KSB7XG4gICAgICAgIGlmICghZGlmZkxldmVsKyspIHtcbiAgICAgICAgICAgIGlzU3ZnTW9kZSA9IG51bGwgIT0gcGFyZW50ICYmIHZvaWQgMCAhPT0gcGFyZW50Lm93bmVyU1ZHRWxlbWVudDtcbiAgICAgICAgICAgIGh5ZHJhdGluZyA9IG51bGwgIT0gZG9tICYmICEoJ19fcHJlYWN0YXR0cl8nIGluIGRvbSk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHJldCA9IGlkaWZmKGRvbSwgdm5vZGUsIGNvbnRleHQsIG1vdW50QWxsLCBjb21wb25lbnRSb290KTtcbiAgICAgICAgaWYgKHBhcmVudCAmJiByZXQucGFyZW50Tm9kZSAhPT0gcGFyZW50KSBwYXJlbnQuYXBwZW5kQ2hpbGQocmV0KTtcbiAgICAgICAgaWYgKCEtLWRpZmZMZXZlbCkge1xuICAgICAgICAgICAgaHlkcmF0aW5nID0gITE7XG4gICAgICAgICAgICBpZiAoIWNvbXBvbmVudFJvb3QpIGZsdXNoTW91bnRzKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICB9XG4gICAgZnVuY3Rpb24gaWRpZmYoZG9tLCB2bm9kZSwgY29udGV4dCwgbW91bnRBbGwsIGNvbXBvbmVudFJvb3QpIHtcbiAgICAgICAgdmFyIG91dCA9IGRvbSwgcHJldlN2Z01vZGUgPSBpc1N2Z01vZGU7XG4gICAgICAgIGlmIChudWxsID09IHZub2RlKSB2bm9kZSA9ICcnO1xuICAgICAgICBpZiAoJ3N0cmluZycgPT0gdHlwZW9mIHZub2RlKSB7XG4gICAgICAgICAgICBpZiAoZG9tICYmIHZvaWQgMCAhPT0gZG9tLnNwbGl0VGV4dCAmJiBkb20ucGFyZW50Tm9kZSAmJiAoIWRvbS5fY29tcG9uZW50IHx8IGNvbXBvbmVudFJvb3QpKSB7XG4gICAgICAgICAgICAgICAgaWYgKGRvbS5ub2RlVmFsdWUgIT0gdm5vZGUpIGRvbS5ub2RlVmFsdWUgPSB2bm9kZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgb3V0ID0gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUodm5vZGUpO1xuICAgICAgICAgICAgICAgIGlmIChkb20pIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRvbS5wYXJlbnROb2RlKSBkb20ucGFyZW50Tm9kZS5yZXBsYWNlQ2hpbGQob3V0LCBkb20pO1xuICAgICAgICAgICAgICAgICAgICByZWNvbGxlY3ROb2RlVHJlZShkb20sICEwKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBvdXQuX19wcmVhY3RhdHRyXyA9ICEwO1xuICAgICAgICAgICAgcmV0dXJuIG91dDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoJ2Z1bmN0aW9uJyA9PSB0eXBlb2Ygdm5vZGUubm9kZU5hbWUpIHJldHVybiBidWlsZENvbXBvbmVudEZyb21WTm9kZShkb20sIHZub2RlLCBjb250ZXh0LCBtb3VudEFsbCk7XG4gICAgICAgIGlzU3ZnTW9kZSA9ICdzdmcnID09PSB2bm9kZS5ub2RlTmFtZSA/ICEwIDogJ2ZvcmVpZ25PYmplY3QnID09PSB2bm9kZS5ub2RlTmFtZSA/ICExIDogaXNTdmdNb2RlO1xuICAgICAgICBpZiAoIWRvbSB8fCAhaXNOYW1lZE5vZGUoZG9tLCBTdHJpbmcodm5vZGUubm9kZU5hbWUpKSkge1xuICAgICAgICAgICAgb3V0ID0gY3JlYXRlTm9kZShTdHJpbmcodm5vZGUubm9kZU5hbWUpLCBpc1N2Z01vZGUpO1xuICAgICAgICAgICAgaWYgKGRvbSkge1xuICAgICAgICAgICAgICAgIHdoaWxlIChkb20uZmlyc3RDaGlsZCkgb3V0LmFwcGVuZENoaWxkKGRvbS5maXJzdENoaWxkKTtcbiAgICAgICAgICAgICAgICBpZiAoZG9tLnBhcmVudE5vZGUpIGRvbS5wYXJlbnROb2RlLnJlcGxhY2VDaGlsZChvdXQsIGRvbSk7XG4gICAgICAgICAgICAgICAgcmVjb2xsZWN0Tm9kZVRyZWUoZG9tLCAhMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGZjID0gb3V0LmZpcnN0Q2hpbGQsIHByb3BzID0gb3V0Ll9fcHJlYWN0YXR0cl8gfHwgKG91dC5fX3ByZWFjdGF0dHJfID0ge30pLCB2Y2hpbGRyZW4gPSB2bm9kZS5jaGlsZHJlbjtcbiAgICAgICAgaWYgKCFoeWRyYXRpbmcgJiYgdmNoaWxkcmVuICYmIDEgPT09IHZjaGlsZHJlbi5sZW5ndGggJiYgJ3N0cmluZycgPT0gdHlwZW9mIHZjaGlsZHJlblswXSAmJiBudWxsICE9IGZjICYmIHZvaWQgMCAhPT0gZmMuc3BsaXRUZXh0ICYmIG51bGwgPT0gZmMubmV4dFNpYmxpbmcpIHtcbiAgICAgICAgICAgIGlmIChmYy5ub2RlVmFsdWUgIT0gdmNoaWxkcmVuWzBdKSBmYy5ub2RlVmFsdWUgPSB2Y2hpbGRyZW5bMF07XG4gICAgICAgIH0gZWxzZSBpZiAodmNoaWxkcmVuICYmIHZjaGlsZHJlbi5sZW5ndGggfHwgbnVsbCAhPSBmYykgaW5uZXJEaWZmTm9kZShvdXQsIHZjaGlsZHJlbiwgY29udGV4dCwgbW91bnRBbGwsIGh5ZHJhdGluZyB8fCBudWxsICE9IHByb3BzLmRhbmdlcm91c2x5U2V0SW5uZXJIVE1MKTtcbiAgICAgICAgZGlmZkF0dHJpYnV0ZXMob3V0LCB2bm9kZS5hdHRyaWJ1dGVzLCBwcm9wcyk7XG4gICAgICAgIGlzU3ZnTW9kZSA9IHByZXZTdmdNb2RlO1xuICAgICAgICByZXR1cm4gb3V0O1xuICAgIH1cbiAgICBmdW5jdGlvbiBpbm5lckRpZmZOb2RlKGRvbSwgdmNoaWxkcmVuLCBjb250ZXh0LCBtb3VudEFsbCwgaXNIeWRyYXRpbmcpIHtcbiAgICAgICAgdmFyIGosIGMsIHZjaGlsZCwgY2hpbGQsIG9yaWdpbmFsQ2hpbGRyZW4gPSBkb20uY2hpbGROb2RlcywgY2hpbGRyZW4gPSBbXSwga2V5ZWQgPSB7fSwga2V5ZWRMZW4gPSAwLCBtaW4gPSAwLCBsZW4gPSBvcmlnaW5hbENoaWxkcmVuLmxlbmd0aCwgY2hpbGRyZW5MZW4gPSAwLCB2bGVuID0gdmNoaWxkcmVuID8gdmNoaWxkcmVuLmxlbmd0aCA6IDA7XG4gICAgICAgIGlmICgwICE9PSBsZW4pIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBfY2hpbGQgPSBvcmlnaW5hbENoaWxkcmVuW2ldLCBwcm9wcyA9IF9jaGlsZC5fX3ByZWFjdGF0dHJfLCBrZXkgPSB2bGVuICYmIHByb3BzID8gX2NoaWxkLl9jb21wb25lbnQgPyBfY2hpbGQuX2NvbXBvbmVudC5fX2sgOiBwcm9wcy5rZXkgOiBudWxsO1xuICAgICAgICAgICAgaWYgKG51bGwgIT0ga2V5KSB7XG4gICAgICAgICAgICAgICAga2V5ZWRMZW4rKztcbiAgICAgICAgICAgICAgICBrZXllZFtrZXldID0gX2NoaWxkO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwcm9wcyB8fCAodm9pZCAwICE9PSBfY2hpbGQuc3BsaXRUZXh0ID8gaXNIeWRyYXRpbmcgPyBfY2hpbGQubm9kZVZhbHVlLnRyaW0oKSA6ICEwIDogaXNIeWRyYXRpbmcpKSBjaGlsZHJlbltjaGlsZHJlbkxlbisrXSA9IF9jaGlsZDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoMCAhPT0gdmxlbikgZm9yICh2YXIgaSA9IDA7IGkgPCB2bGVuOyBpKyspIHtcbiAgICAgICAgICAgIHZjaGlsZCA9IHZjaGlsZHJlbltpXTtcbiAgICAgICAgICAgIGNoaWxkID0gbnVsbDtcbiAgICAgICAgICAgIHZhciBrZXkgPSB2Y2hpbGQua2V5O1xuICAgICAgICAgICAgaWYgKG51bGwgIT0ga2V5KSB7XG4gICAgICAgICAgICAgICAgaWYgKGtleWVkTGVuICYmIHZvaWQgMCAhPT0ga2V5ZWRba2V5XSkge1xuICAgICAgICAgICAgICAgICAgICBjaGlsZCA9IGtleWVkW2tleV07XG4gICAgICAgICAgICAgICAgICAgIGtleWVkW2tleV0gPSB2b2lkIDA7XG4gICAgICAgICAgICAgICAgICAgIGtleWVkTGVuLS07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmICghY2hpbGQgJiYgbWluIDwgY2hpbGRyZW5MZW4pIGZvciAoaiA9IG1pbjsgaiA8IGNoaWxkcmVuTGVuOyBqKyspIGlmICh2b2lkIDAgIT09IGNoaWxkcmVuW2pdICYmIGlzU2FtZU5vZGVUeXBlKGMgPSBjaGlsZHJlbltqXSwgdmNoaWxkLCBpc0h5ZHJhdGluZykpIHtcbiAgICAgICAgICAgICAgICBjaGlsZCA9IGM7XG4gICAgICAgICAgICAgICAgY2hpbGRyZW5bal0gPSB2b2lkIDA7XG4gICAgICAgICAgICAgICAgaWYgKGogPT09IGNoaWxkcmVuTGVuIC0gMSkgY2hpbGRyZW5MZW4tLTtcbiAgICAgICAgICAgICAgICBpZiAoaiA9PT0gbWluKSBtaW4rKztcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNoaWxkID0gaWRpZmYoY2hpbGQsIHZjaGlsZCwgY29udGV4dCwgbW91bnRBbGwpO1xuICAgICAgICAgICAgaWYgKGNoaWxkICYmIGNoaWxkICE9PSBkb20pIGlmIChpID49IGxlbikgZG9tLmFwcGVuZENoaWxkKGNoaWxkKTsgZWxzZSBpZiAoY2hpbGQgIT09IG9yaWdpbmFsQ2hpbGRyZW5baV0pIGlmIChjaGlsZCA9PT0gb3JpZ2luYWxDaGlsZHJlbltpICsgMV0pIHJlbW92ZU5vZGUob3JpZ2luYWxDaGlsZHJlbltpXSk7IGVsc2UgZG9tLmluc2VydEJlZm9yZShjaGlsZCwgb3JpZ2luYWxDaGlsZHJlbltpXSB8fCBudWxsKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoa2V5ZWRMZW4pIGZvciAodmFyIGkgaW4ga2V5ZWQpIGlmICh2b2lkIDAgIT09IGtleWVkW2ldKSByZWNvbGxlY3ROb2RlVHJlZShrZXllZFtpXSwgITEpO1xuICAgICAgICB3aGlsZSAobWluIDw9IGNoaWxkcmVuTGVuKSBpZiAodm9pZCAwICE9PSAoY2hpbGQgPSBjaGlsZHJlbltjaGlsZHJlbkxlbi0tXSkpIHJlY29sbGVjdE5vZGVUcmVlKGNoaWxkLCAhMSk7XG4gICAgfVxuICAgIGZ1bmN0aW9uIHJlY29sbGVjdE5vZGVUcmVlKG5vZGUsIHVubW91bnRPbmx5KSB7XG4gICAgICAgIHZhciBjb21wb25lbnQgPSBub2RlLl9jb21wb25lbnQ7XG4gICAgICAgIGlmIChjb21wb25lbnQpIHVubW91bnRDb21wb25lbnQoY29tcG9uZW50KTsgZWxzZSB7XG4gICAgICAgICAgICBpZiAobnVsbCAhPSBub2RlLl9fcHJlYWN0YXR0cl8gJiYgbm9kZS5fX3ByZWFjdGF0dHJfLnJlZikgbm9kZS5fX3ByZWFjdGF0dHJfLnJlZihudWxsKTtcbiAgICAgICAgICAgIGlmICh1bm1vdW50T25seSA9PT0gITEgfHwgbnVsbCA9PSBub2RlLl9fcHJlYWN0YXR0cl8pIHJlbW92ZU5vZGUobm9kZSk7XG4gICAgICAgICAgICByZW1vdmVDaGlsZHJlbihub2RlKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBmdW5jdGlvbiByZW1vdmVDaGlsZHJlbihub2RlKSB7XG4gICAgICAgIG5vZGUgPSBub2RlLmxhc3RDaGlsZDtcbiAgICAgICAgd2hpbGUgKG5vZGUpIHtcbiAgICAgICAgICAgIHZhciBuZXh0ID0gbm9kZS5wcmV2aW91c1NpYmxpbmc7XG4gICAgICAgICAgICByZWNvbGxlY3ROb2RlVHJlZShub2RlLCAhMCk7XG4gICAgICAgICAgICBub2RlID0gbmV4dDtcbiAgICAgICAgfVxuICAgIH1cbiAgICBmdW5jdGlvbiBkaWZmQXR0cmlidXRlcyhkb20sIGF0dHJzLCBvbGQpIHtcbiAgICAgICAgdmFyIG5hbWU7XG4gICAgICAgIGZvciAobmFtZSBpbiBvbGQpIGlmICgoIWF0dHJzIHx8IG51bGwgPT0gYXR0cnNbbmFtZV0pICYmIG51bGwgIT0gb2xkW25hbWVdKSBzZXRBY2Nlc3Nvcihkb20sIG5hbWUsIG9sZFtuYW1lXSwgb2xkW25hbWVdID0gdm9pZCAwLCBpc1N2Z01vZGUpO1xuICAgICAgICBmb3IgKG5hbWUgaW4gYXR0cnMpIGlmICghKCdjaGlsZHJlbicgPT09IG5hbWUgfHwgJ2lubmVySFRNTCcgPT09IG5hbWUgfHwgbmFtZSBpbiBvbGQgJiYgYXR0cnNbbmFtZV0gPT09ICgndmFsdWUnID09PSBuYW1lIHx8ICdjaGVja2VkJyA9PT0gbmFtZSA/IGRvbVtuYW1lXSA6IG9sZFtuYW1lXSkpKSBzZXRBY2Nlc3Nvcihkb20sIG5hbWUsIG9sZFtuYW1lXSwgb2xkW25hbWVdID0gYXR0cnNbbmFtZV0sIGlzU3ZnTW9kZSk7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGNvbGxlY3RDb21wb25lbnQoY29tcG9uZW50KSB7XG4gICAgICAgIHZhciBuYW1lID0gY29tcG9uZW50LmNvbnN0cnVjdG9yLm5hbWU7XG4gICAgICAgIChjb21wb25lbnRzW25hbWVdIHx8IChjb21wb25lbnRzW25hbWVdID0gW10pKS5wdXNoKGNvbXBvbmVudCk7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGNyZWF0ZUNvbXBvbmVudChDdG9yLCBwcm9wcywgY29udGV4dCkge1xuICAgICAgICB2YXIgaW5zdCwgbGlzdCA9IGNvbXBvbmVudHNbQ3Rvci5uYW1lXTtcbiAgICAgICAgaWYgKEN0b3IucHJvdG90eXBlICYmIEN0b3IucHJvdG90eXBlLnJlbmRlcikge1xuICAgICAgICAgICAgaW5zdCA9IG5ldyBDdG9yKHByb3BzLCBjb250ZXh0KTtcbiAgICAgICAgICAgIENvbXBvbmVudC5jYWxsKGluc3QsIHByb3BzLCBjb250ZXh0KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGluc3QgPSBuZXcgQ29tcG9uZW50KHByb3BzLCBjb250ZXh0KTtcbiAgICAgICAgICAgIGluc3QuY29uc3RydWN0b3IgPSBDdG9yO1xuICAgICAgICAgICAgaW5zdC5yZW5kZXIgPSBkb1JlbmRlcjtcbiAgICAgICAgfVxuICAgICAgICBpZiAobGlzdCkgZm9yICh2YXIgaSA9IGxpc3QubGVuZ3RoOyBpLS07ICkgaWYgKGxpc3RbaV0uY29uc3RydWN0b3IgPT09IEN0b3IpIHtcbiAgICAgICAgICAgIGluc3QuX19iID0gbGlzdFtpXS5fX2I7XG4gICAgICAgICAgICBsaXN0LnNwbGljZShpLCAxKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBpbnN0O1xuICAgIH1cbiAgICBmdW5jdGlvbiBkb1JlbmRlcihwcm9wcywgc3RhdGUsIGNvbnRleHQpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY29uc3RydWN0b3IocHJvcHMsIGNvbnRleHQpO1xuICAgIH1cbiAgICBmdW5jdGlvbiBzZXRDb21wb25lbnRQcm9wcyhjb21wb25lbnQsIHByb3BzLCBvcHRzLCBjb250ZXh0LCBtb3VudEFsbCkge1xuICAgICAgICBpZiAoIWNvbXBvbmVudC5fX3gpIHtcbiAgICAgICAgICAgIGNvbXBvbmVudC5fX3ggPSAhMDtcbiAgICAgICAgICAgIGlmIChjb21wb25lbnQuX19yID0gcHJvcHMucmVmKSBkZWxldGUgcHJvcHMucmVmO1xuICAgICAgICAgICAgaWYgKGNvbXBvbmVudC5fX2sgPSBwcm9wcy5rZXkpIGRlbGV0ZSBwcm9wcy5rZXk7XG4gICAgICAgICAgICBpZiAoIWNvbXBvbmVudC5iYXNlIHx8IG1vdW50QWxsKSB7XG4gICAgICAgICAgICAgICAgaWYgKGNvbXBvbmVudC5jb21wb25lbnRXaWxsTW91bnQpIGNvbXBvbmVudC5jb21wb25lbnRXaWxsTW91bnQoKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoY29tcG9uZW50LmNvbXBvbmVudFdpbGxSZWNlaXZlUHJvcHMpIGNvbXBvbmVudC5jb21wb25lbnRXaWxsUmVjZWl2ZVByb3BzKHByb3BzLCBjb250ZXh0KTtcbiAgICAgICAgICAgIGlmIChjb250ZXh0ICYmIGNvbnRleHQgIT09IGNvbXBvbmVudC5jb250ZXh0KSB7XG4gICAgICAgICAgICAgICAgaWYgKCFjb21wb25lbnQuX19jKSBjb21wb25lbnQuX19jID0gY29tcG9uZW50LmNvbnRleHQ7XG4gICAgICAgICAgICAgICAgY29tcG9uZW50LmNvbnRleHQgPSBjb250ZXh0O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCFjb21wb25lbnQuX19wKSBjb21wb25lbnQuX19wID0gY29tcG9uZW50LnByb3BzO1xuICAgICAgICAgICAgY29tcG9uZW50LnByb3BzID0gcHJvcHM7XG4gICAgICAgICAgICBjb21wb25lbnQuX194ID0gITE7XG4gICAgICAgICAgICBpZiAoMCAhPT0gb3B0cykgaWYgKDEgPT09IG9wdHMgfHwgb3B0aW9ucy5zeW5jQ29tcG9uZW50VXBkYXRlcyAhPT0gITEgfHwgIWNvbXBvbmVudC5iYXNlKSByZW5kZXJDb21wb25lbnQoY29tcG9uZW50LCAxLCBtb3VudEFsbCk7IGVsc2UgZW5xdWV1ZVJlbmRlcihjb21wb25lbnQpO1xuICAgICAgICAgICAgaWYgKGNvbXBvbmVudC5fX3IpIGNvbXBvbmVudC5fX3IoY29tcG9uZW50KTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBmdW5jdGlvbiByZW5kZXJDb21wb25lbnQoY29tcG9uZW50LCBvcHRzLCBtb3VudEFsbCwgaXNDaGlsZCkge1xuICAgICAgICBpZiAoIWNvbXBvbmVudC5fX3gpIHtcbiAgICAgICAgICAgIHZhciByZW5kZXJlZCwgaW5zdCwgY2Jhc2UsIHByb3BzID0gY29tcG9uZW50LnByb3BzLCBzdGF0ZSA9IGNvbXBvbmVudC5zdGF0ZSwgY29udGV4dCA9IGNvbXBvbmVudC5jb250ZXh0LCBwcmV2aW91c1Byb3BzID0gY29tcG9uZW50Ll9fcCB8fCBwcm9wcywgcHJldmlvdXNTdGF0ZSA9IGNvbXBvbmVudC5fX3MgfHwgc3RhdGUsIHByZXZpb3VzQ29udGV4dCA9IGNvbXBvbmVudC5fX2MgfHwgY29udGV4dCwgaXNVcGRhdGUgPSBjb21wb25lbnQuYmFzZSwgbmV4dEJhc2UgPSBjb21wb25lbnQuX19iLCBpbml0aWFsQmFzZSA9IGlzVXBkYXRlIHx8IG5leHRCYXNlLCBpbml0aWFsQ2hpbGRDb21wb25lbnQgPSBjb21wb25lbnQuX2NvbXBvbmVudCwgc2tpcCA9ICExO1xuICAgICAgICAgICAgaWYgKGlzVXBkYXRlKSB7XG4gICAgICAgICAgICAgICAgY29tcG9uZW50LnByb3BzID0gcHJldmlvdXNQcm9wcztcbiAgICAgICAgICAgICAgICBjb21wb25lbnQuc3RhdGUgPSBwcmV2aW91c1N0YXRlO1xuICAgICAgICAgICAgICAgIGNvbXBvbmVudC5jb250ZXh0ID0gcHJldmlvdXNDb250ZXh0O1xuICAgICAgICAgICAgICAgIGlmICgyICE9PSBvcHRzICYmIGNvbXBvbmVudC5zaG91bGRDb21wb25lbnRVcGRhdGUgJiYgY29tcG9uZW50LnNob3VsZENvbXBvbmVudFVwZGF0ZShwcm9wcywgc3RhdGUsIGNvbnRleHQpID09PSAhMSkgc2tpcCA9ICEwOyBlbHNlIGlmIChjb21wb25lbnQuY29tcG9uZW50V2lsbFVwZGF0ZSkgY29tcG9uZW50LmNvbXBvbmVudFdpbGxVcGRhdGUocHJvcHMsIHN0YXRlLCBjb250ZXh0KTtcbiAgICAgICAgICAgICAgICBjb21wb25lbnQucHJvcHMgPSBwcm9wcztcbiAgICAgICAgICAgICAgICBjb21wb25lbnQuc3RhdGUgPSBzdGF0ZTtcbiAgICAgICAgICAgICAgICBjb21wb25lbnQuY29udGV4dCA9IGNvbnRleHQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb21wb25lbnQuX19wID0gY29tcG9uZW50Ll9fcyA9IGNvbXBvbmVudC5fX2MgPSBjb21wb25lbnQuX19iID0gbnVsbDtcbiAgICAgICAgICAgIGNvbXBvbmVudC5fX2QgPSAhMTtcbiAgICAgICAgICAgIGlmICghc2tpcCkge1xuICAgICAgICAgICAgICAgIHJlbmRlcmVkID0gY29tcG9uZW50LnJlbmRlcihwcm9wcywgc3RhdGUsIGNvbnRleHQpO1xuICAgICAgICAgICAgICAgIGlmIChjb21wb25lbnQuZ2V0Q2hpbGRDb250ZXh0KSBjb250ZXh0ID0gZXh0ZW5kKGV4dGVuZCh7fSwgY29udGV4dCksIGNvbXBvbmVudC5nZXRDaGlsZENvbnRleHQoKSk7XG4gICAgICAgICAgICAgICAgdmFyIHRvVW5tb3VudCwgYmFzZSwgY2hpbGRDb21wb25lbnQgPSByZW5kZXJlZCAmJiByZW5kZXJlZC5ub2RlTmFtZTtcbiAgICAgICAgICAgICAgICBpZiAoJ2Z1bmN0aW9uJyA9PSB0eXBlb2YgY2hpbGRDb21wb25lbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGNoaWxkUHJvcHMgPSBnZXROb2RlUHJvcHMocmVuZGVyZWQpO1xuICAgICAgICAgICAgICAgICAgICBpbnN0ID0gaW5pdGlhbENoaWxkQ29tcG9uZW50O1xuICAgICAgICAgICAgICAgICAgICBpZiAoaW5zdCAmJiBpbnN0LmNvbnN0cnVjdG9yID09PSBjaGlsZENvbXBvbmVudCAmJiBjaGlsZFByb3BzLmtleSA9PSBpbnN0Ll9faykgc2V0Q29tcG9uZW50UHJvcHMoaW5zdCwgY2hpbGRQcm9wcywgMSwgY29udGV4dCwgITEpOyBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRvVW5tb3VudCA9IGluc3Q7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnQuX2NvbXBvbmVudCA9IGluc3QgPSBjcmVhdGVDb21wb25lbnQoY2hpbGRDb21wb25lbnQsIGNoaWxkUHJvcHMsIGNvbnRleHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaW5zdC5fX2IgPSBpbnN0Ll9fYiB8fCBuZXh0QmFzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGluc3QuX191ID0gY29tcG9uZW50O1xuICAgICAgICAgICAgICAgICAgICAgICAgc2V0Q29tcG9uZW50UHJvcHMoaW5zdCwgY2hpbGRQcm9wcywgMCwgY29udGV4dCwgITEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVuZGVyQ29tcG9uZW50KGluc3QsIDEsIG1vdW50QWxsLCAhMCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYmFzZSA9IGluc3QuYmFzZTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjYmFzZSA9IGluaXRpYWxCYXNlO1xuICAgICAgICAgICAgICAgICAgICB0b1VubW91bnQgPSBpbml0aWFsQ2hpbGRDb21wb25lbnQ7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0b1VubW91bnQpIGNiYXNlID0gY29tcG9uZW50Ll9jb21wb25lbnQgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaW5pdGlhbEJhc2UgfHwgMSA9PT0gb3B0cykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNiYXNlKSBjYmFzZS5fY29tcG9uZW50ID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJhc2UgPSBkaWZmKGNiYXNlLCByZW5kZXJlZCwgY29udGV4dCwgbW91bnRBbGwgfHwgIWlzVXBkYXRlLCBpbml0aWFsQmFzZSAmJiBpbml0aWFsQmFzZS5wYXJlbnROb2RlLCAhMCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGluaXRpYWxCYXNlICYmIGJhc2UgIT09IGluaXRpYWxCYXNlICYmIGluc3QgIT09IGluaXRpYWxDaGlsZENvbXBvbmVudCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgYmFzZVBhcmVudCA9IGluaXRpYWxCYXNlLnBhcmVudE5vZGU7XG4gICAgICAgICAgICAgICAgICAgIGlmIChiYXNlUGFyZW50ICYmIGJhc2UgIT09IGJhc2VQYXJlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJhc2VQYXJlbnQucmVwbGFjZUNoaWxkKGJhc2UsIGluaXRpYWxCYXNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghdG9Vbm1vdW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5pdGlhbEJhc2UuX2NvbXBvbmVudCA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVjb2xsZWN0Tm9kZVRyZWUoaW5pdGlhbEJhc2UsICExKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAodG9Vbm1vdW50KSB1bm1vdW50Q29tcG9uZW50KHRvVW5tb3VudCk7XG4gICAgICAgICAgICAgICAgY29tcG9uZW50LmJhc2UgPSBiYXNlO1xuICAgICAgICAgICAgICAgIGlmIChiYXNlICYmICFpc0NoaWxkKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBjb21wb25lbnRSZWYgPSBjb21wb25lbnQsIHQgPSBjb21wb25lbnQ7XG4gICAgICAgICAgICAgICAgICAgIHdoaWxlICh0ID0gdC5fX3UpIChjb21wb25lbnRSZWYgPSB0KS5iYXNlID0gYmFzZTtcbiAgICAgICAgICAgICAgICAgICAgYmFzZS5fY29tcG9uZW50ID0gY29tcG9uZW50UmVmO1xuICAgICAgICAgICAgICAgICAgICBiYXNlLl9jb21wb25lbnRDb25zdHJ1Y3RvciA9IGNvbXBvbmVudFJlZi5jb25zdHJ1Y3RvcjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIWlzVXBkYXRlIHx8IG1vdW50QWxsKSBtb3VudHMudW5zaGlmdChjb21wb25lbnQpOyBlbHNlIGlmICghc2tpcCkge1xuICAgICAgICAgICAgICAgIGZsdXNoTW91bnRzKCk7XG4gICAgICAgICAgICAgICAgaWYgKGNvbXBvbmVudC5jb21wb25lbnREaWRVcGRhdGUpIGNvbXBvbmVudC5jb21wb25lbnREaWRVcGRhdGUocHJldmlvdXNQcm9wcywgcHJldmlvdXNTdGF0ZSwgcHJldmlvdXNDb250ZXh0KTtcbiAgICAgICAgICAgICAgICBpZiAob3B0aW9ucy5hZnRlclVwZGF0ZSkgb3B0aW9ucy5hZnRlclVwZGF0ZShjb21wb25lbnQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG51bGwgIT0gY29tcG9uZW50Ll9faCkgd2hpbGUgKGNvbXBvbmVudC5fX2gubGVuZ3RoKSBjb21wb25lbnQuX19oLnBvcCgpLmNhbGwoY29tcG9uZW50KTtcbiAgICAgICAgICAgIGlmICghZGlmZkxldmVsICYmICFpc0NoaWxkKSBmbHVzaE1vdW50cygpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGZ1bmN0aW9uIGJ1aWxkQ29tcG9uZW50RnJvbVZOb2RlKGRvbSwgdm5vZGUsIGNvbnRleHQsIG1vdW50QWxsKSB7XG4gICAgICAgIHZhciBjID0gZG9tICYmIGRvbS5fY29tcG9uZW50LCBvcmlnaW5hbENvbXBvbmVudCA9IGMsIG9sZERvbSA9IGRvbSwgaXNEaXJlY3RPd25lciA9IGMgJiYgZG9tLl9jb21wb25lbnRDb25zdHJ1Y3RvciA9PT0gdm5vZGUubm9kZU5hbWUsIGlzT3duZXIgPSBpc0RpcmVjdE93bmVyLCBwcm9wcyA9IGdldE5vZGVQcm9wcyh2bm9kZSk7XG4gICAgICAgIHdoaWxlIChjICYmICFpc093bmVyICYmIChjID0gYy5fX3UpKSBpc093bmVyID0gYy5jb25zdHJ1Y3RvciA9PT0gdm5vZGUubm9kZU5hbWU7XG4gICAgICAgIGlmIChjICYmIGlzT3duZXIgJiYgKCFtb3VudEFsbCB8fCBjLl9jb21wb25lbnQpKSB7XG4gICAgICAgICAgICBzZXRDb21wb25lbnRQcm9wcyhjLCBwcm9wcywgMywgY29udGV4dCwgbW91bnRBbGwpO1xuICAgICAgICAgICAgZG9tID0gYy5iYXNlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKG9yaWdpbmFsQ29tcG9uZW50ICYmICFpc0RpcmVjdE93bmVyKSB7XG4gICAgICAgICAgICAgICAgdW5tb3VudENvbXBvbmVudChvcmlnaW5hbENvbXBvbmVudCk7XG4gICAgICAgICAgICAgICAgZG9tID0gb2xkRG9tID0gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGMgPSBjcmVhdGVDb21wb25lbnQodm5vZGUubm9kZU5hbWUsIHByb3BzLCBjb250ZXh0KTtcbiAgICAgICAgICAgIGlmIChkb20gJiYgIWMuX19iKSB7XG4gICAgICAgICAgICAgICAgYy5fX2IgPSBkb207XG4gICAgICAgICAgICAgICAgb2xkRG9tID0gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNldENvbXBvbmVudFByb3BzKGMsIHByb3BzLCAxLCBjb250ZXh0LCBtb3VudEFsbCk7XG4gICAgICAgICAgICBkb20gPSBjLmJhc2U7XG4gICAgICAgICAgICBpZiAob2xkRG9tICYmIGRvbSAhPT0gb2xkRG9tKSB7XG4gICAgICAgICAgICAgICAgb2xkRG9tLl9jb21wb25lbnQgPSBudWxsO1xuICAgICAgICAgICAgICAgIHJlY29sbGVjdE5vZGVUcmVlKG9sZERvbSwgITEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBkb207XG4gICAgfVxuICAgIGZ1bmN0aW9uIHVubW91bnRDb21wb25lbnQoY29tcG9uZW50KSB7XG4gICAgICAgIGlmIChvcHRpb25zLmJlZm9yZVVubW91bnQpIG9wdGlvbnMuYmVmb3JlVW5tb3VudChjb21wb25lbnQpO1xuICAgICAgICB2YXIgYmFzZSA9IGNvbXBvbmVudC5iYXNlO1xuICAgICAgICBjb21wb25lbnQuX194ID0gITA7XG4gICAgICAgIGlmIChjb21wb25lbnQuY29tcG9uZW50V2lsbFVubW91bnQpIGNvbXBvbmVudC5jb21wb25lbnRXaWxsVW5tb3VudCgpO1xuICAgICAgICBjb21wb25lbnQuYmFzZSA9IG51bGw7XG4gICAgICAgIHZhciBpbm5lciA9IGNvbXBvbmVudC5fY29tcG9uZW50O1xuICAgICAgICBpZiAoaW5uZXIpIHVubW91bnRDb21wb25lbnQoaW5uZXIpOyBlbHNlIGlmIChiYXNlKSB7XG4gICAgICAgICAgICBpZiAoYmFzZS5fX3ByZWFjdGF0dHJfICYmIGJhc2UuX19wcmVhY3RhdHRyXy5yZWYpIGJhc2UuX19wcmVhY3RhdHRyXy5yZWYobnVsbCk7XG4gICAgICAgICAgICBjb21wb25lbnQuX19iID0gYmFzZTtcbiAgICAgICAgICAgIHJlbW92ZU5vZGUoYmFzZSk7XG4gICAgICAgICAgICBjb2xsZWN0Q29tcG9uZW50KGNvbXBvbmVudCk7XG4gICAgICAgICAgICByZW1vdmVDaGlsZHJlbihiYXNlKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY29tcG9uZW50Ll9fcikgY29tcG9uZW50Ll9fcihudWxsKTtcbiAgICB9XG4gICAgZnVuY3Rpb24gQ29tcG9uZW50KHByb3BzLCBjb250ZXh0KSB7XG4gICAgICAgIHRoaXMuX19kID0gITA7XG4gICAgICAgIHRoaXMuY29udGV4dCA9IGNvbnRleHQ7XG4gICAgICAgIHRoaXMucHJvcHMgPSBwcm9wcztcbiAgICAgICAgdGhpcy5zdGF0ZSA9IHRoaXMuc3RhdGUgfHwge307XG4gICAgfVxuICAgIGZ1bmN0aW9uIHJlbmRlcih2bm9kZSwgcGFyZW50LCBtZXJnZSkge1xuICAgICAgICByZXR1cm4gZGlmZihtZXJnZSwgdm5vZGUsIHt9LCAhMSwgcGFyZW50LCAhMSk7XG4gICAgfVxuICAgIHZhciBvcHRpb25zID0ge307XG4gICAgdmFyIHN0YWNrID0gW107XG4gICAgdmFyIEVNUFRZX0NISUxEUkVOID0gW107XG4gICAgdmFyIElTX05PTl9ESU1FTlNJT05BTCA9IC9hY2l0fGV4KD86c3xnfG58cHwkKXxycGh8b3dzfG1uY3xudHd8aW5lW2NoXXx6b298Xm9yZC9pO1xuICAgIHZhciBpdGVtcyA9IFtdO1xuICAgIHZhciBtb3VudHMgPSBbXTtcbiAgICB2YXIgZGlmZkxldmVsID0gMDtcbiAgICB2YXIgaXNTdmdNb2RlID0gITE7XG4gICAgdmFyIGh5ZHJhdGluZyA9ICExO1xuICAgIHZhciBjb21wb25lbnRzID0ge307XG4gICAgZXh0ZW5kKENvbXBvbmVudC5wcm90b3R5cGUsIHtcbiAgICAgICAgc2V0U3RhdGU6IGZ1bmN0aW9uKHN0YXRlLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgdmFyIHMgPSB0aGlzLnN0YXRlO1xuICAgICAgICAgICAgaWYgKCF0aGlzLl9fcykgdGhpcy5fX3MgPSBleHRlbmQoe30sIHMpO1xuICAgICAgICAgICAgZXh0ZW5kKHMsICdmdW5jdGlvbicgPT0gdHlwZW9mIHN0YXRlID8gc3RhdGUocywgdGhpcy5wcm9wcykgOiBzdGF0ZSk7XG4gICAgICAgICAgICBpZiAoY2FsbGJhY2spICh0aGlzLl9faCA9IHRoaXMuX19oIHx8IFtdKS5wdXNoKGNhbGxiYWNrKTtcbiAgICAgICAgICAgIGVucXVldWVSZW5kZXIodGhpcyk7XG4gICAgICAgIH0sXG4gICAgICAgIGZvcmNlVXBkYXRlOiBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgICAgICAgICAgaWYgKGNhbGxiYWNrKSAodGhpcy5fX2ggPSB0aGlzLl9faCB8fCBbXSkucHVzaChjYWxsYmFjayk7XG4gICAgICAgICAgICByZW5kZXJDb21wb25lbnQodGhpcywgMik7XG4gICAgICAgIH0sXG4gICAgICAgIHJlbmRlcjogZnVuY3Rpb24oKSB7fVxuICAgIH0pO1xuICAgIHZhciBwcmVhY3QgPSB7XG4gICAgICAgIGg6IGgsXG4gICAgICAgIGNyZWF0ZUVsZW1lbnQ6IGgsXG4gICAgICAgIGNsb25lRWxlbWVudDogY2xvbmVFbGVtZW50LFxuICAgICAgICBDb21wb25lbnQ6IENvbXBvbmVudCxcbiAgICAgICAgcmVuZGVyOiByZW5kZXIsXG4gICAgICAgIHJlcmVuZGVyOiByZXJlbmRlcixcbiAgICAgICAgb3B0aW9uczogb3B0aW9uc1xuICAgIH07XG4gICAgaWYgKCd1bmRlZmluZWQnICE9IHR5cGVvZiBtb2R1bGUpIG1vZHVsZS5leHBvcnRzID0gcHJlYWN0OyBlbHNlIHNlbGYucHJlYWN0ID0gcHJlYWN0O1xufSgpO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9cHJlYWN0LmpzLm1hcCIsInJlcXVpcmUoJy4vcG9seWZpbGxzLmpzJyk7XG5yZXF1aXJlKCcuL2Fzc2VydC5qcycpLnBvbGx1dGUoKTsgLy8gaW5qZWN0IEFzc2VydCBhbmQgVGVzdCBpbnRvIHdpbmRvdyBnbG9iYWwgb2JqZWN0XG5jb25zdFxuXHRSZWFjdCA9IHJlcXVpcmUoJ3ByZWFjdCcpLFxuXHRGaWxlU2F2ZXIgPSByZXF1aXJlKCdmaWxlLXNhdmVyJyksXG5cdEZpbGVPcGVuZXIgPSByZXF1aXJlKCcuL2NvbXBvbmVudHMvRmlsZU9wZW5lci5qcycpLFxuXG5cdEFwcE1lbnUgPSByZXF1aXJlKCcuL2NvbXBvbmVudHMvQXBwTWVudS5qcycpLFxuXHRXZWF2ZVZpZXcgPSByZXF1aXJlKCcuL2NvbXBvbmVudHMvV2VhdmVWaWV3LmpzJyksXG5cdE5vdGVFZGl0b3IgPSByZXF1aXJlKCcuL2NvbXBvbmVudHMvTm90ZUVkaXRvci5qcycpLFxuXG5cdEJpbmQgPSByZXF1aXJlKCcuL2JpbmQuanMnKSxcblx0TFpXID0gcmVxdWlyZSgnbHotc3RyaW5nJyksXG5cdFNvdXJjZSA9IHJlcXVpcmUoJy4vU291cmNlcnkuanMnKSxcblx0QWN0aW9ucyA9IHJlcXVpcmUoJy4vYWN0aW9ucy5qcycpLFxuXHRTdHlsZSA9IHtcblx0XHRhcHA6ICd3aWR0aDogMTAwdnc7Jyxcblx0XHRtZW51QnV0dG9uOiB7XG5cdFx0XHR6SW5kZXg6IDIyLFxuXHRcdFx0bWluSGVpZ2h0OiAnMi41cmVtJyxcblx0XHRcdHBhZGRpbmc6ICcwLjVyZW0gMC43NXJlbScsXG5cdFx0XHR3aWR0aDogJzdyZW0nLFxuXHRcdFx0cG9zaXRpb246ICdmaXhlZCcsXG5cdFx0XHRsZWZ0OiAwLFxuXG5cdFx0XHRvdXRsaW5lOiAnbm9uZScsXG5cdFx0XHRiYWNrZ3JvdW5kQ29sb3I6ICcjMDAwMDAwJyxcblxuXHRcdFx0Ym9yZGVyOiAnbm9uZScsXG5cdFx0XHRib3JkZXJCb3R0b206ICd0aGluIHNvbGlkICM3NzcnLFxuXG5cdFx0XHRjb2xvcjogJyNmZmYnLFxuXHRcdFx0Zm9udFNpemU6ICcxLjJyZW0nLFxuXG5cdFx0XHRjdXJzb3I6ICdwb2ludGVyJ1xuXHRcdH1cblx0fSxcblx0VEhSRUFEUyA9IFtcblx0XHR7IG5hbWU6ICcnLCBjb2xvcjogJyMwMDAwMDAnIH0sXG5cdFx0eyBuYW1lOiAnJywgY29sb3I6ICcjMzMzMzMzJyB9LFxuXHRcdHsgbmFtZTogJycsIGNvbG9yOiAnIzY2NjY2NicgfSxcblx0XHR7IG5hbWU6ICcnLCBjb2xvcjogJyM5OTk5OTknIH0sXG5cdFx0eyBuYW1lOiAnJywgY29sb3I6ICcjYjIxZjM1JyB9LFxuXHRcdHsgbmFtZTogJycsIGNvbG9yOiAnI2Q4MjczNScgfSxcblx0XHR7IG5hbWU6ICcnLCBjb2xvcjogJyNmZjc0MzUnIH0sXG5cdFx0eyBuYW1lOiAnJywgY29sb3I6ICcjZmZhMTM1JyB9LFxuXHRcdHsgbmFtZTogJycsIGNvbG9yOiAnI2ZmY2IzNScgfSxcblx0XHR7IG5hbWU6ICcnLCBjb2xvcjogJyMwMDc1M2EnIH0sXG5cdFx0eyBuYW1lOiAnJywgY29sb3I6ICcjMDA5ZTQ3JyB9LFxuXHRcdHsgbmFtZTogJycsIGNvbG9yOiAnIzE2ZGQzNicgfSxcblx0XHR7IG5hbWU6ICcnLCBjb2xvcjogJyMwMDUyYTUnIH0sXG5cdFx0eyBuYW1lOiAnJywgY29sb3I6ICcjMDA3OWU3JyB9LFxuXHRcdHsgbmFtZTogJycsIGNvbG9yOiAnIzA2YTlmYycgfSxcblx0XHR7IG5hbWU6ICcnLCBjb2xvcjogJyM2ODFlN2UnIH0sXG5cdFx0eyBuYW1lOiAnJywgY29sb3I6ICcjN2QzY2I1JyB9LFxuXHRcdHsgbmFtZTogJycsIGNvbG9yOiAnI2JkN2FmNicgfVxuXHRdO1xuXG5jbGFzcyBBcHAgZXh0ZW5kcyBSZWFjdC5Db21wb25lbnQge1xuXHRjb25zdHJ1Y3Rvcihwcm9wcywgY29udGV4dCkge1xuXHRcdHN1cGVyKHByb3BzLCBjb250ZXh0KTtcblxuXHRcdHRoaXMuc3RhdGUgPSB7XG5cblx0XHRcdGlzRWRpdGluZzogZmFsc2UsXG5cdFx0XHR0YXJnZXROb3RlOiB1bmRlZmluZWQsXG5cdFx0XHRub3RlQ29vcmRzOiB1bmRlZmluZWQsXG5cblx0XHRcdG1lbnVPcGVuOiBmYWxzZSxcblx0XHRcdG1lbnVPZmZzZXQ6ICcwcmVtJyxcblx0XHRcdG1lbnVHcm91cHM6IFtdLFxuXHRcdFx0bWVudUJ1dHRvbjoge30sXG5cblx0XHRcdHByb2plY3Q6IFNvdXJjZS5nZXRMb2NhbCgnd2VhdmUtcHJvamVjdCcpLFxuXHRcdFx0c3RvcmU6IFNvdXJjZS5nZXRMb2NhbCgnd2VhdmUtc3RvcmUnKVxuXHRcdH1cblxuXHRcdGlmICh0aGlzLnN0YXRlLnByb2plY3QpIHRoaXMuc3RhdGUucHJvamVjdCA9IEpTT04ucGFyc2UodGhpcy5zdGF0ZS5wcm9qZWN0KTtcblx0XHRlbHNlIHRoaXMuc3RhdGUucHJvamVjdCA9IHsgdGl0bGU6ICdXZWxjb21lIHRvIFdlYXZlJywgd29yZENvdW50OiA0LCBzY2VuZUNvdW50OiAxfVxuXG5cdFx0aWYgKHRoaXMuc3RhdGUuc3RvcmUpIHRoaXMuc3RhdGUuc3RvcmUgPSBKU09OLnBhcnNlKExaVy5kZWNvbXByZXNzRnJvbVVURjE2KHRoaXMuc3RhdGUuc3RvcmUpKTtcblx0XHRlbHNlIHRoaXMuc3RhdGUuc3RvcmUgPSB7XG5cdFx0XHRzY2VuZXM6IFt7ZGF0ZXRpbWU6ICcxOTk5LTEwLTI2Jywgbm90ZXM6IFt7IHRocmVhZDogMCwgaGVhZDogJ1dlbGNvbWUgdG8gV2VhdmUhJywgYm9keTogJ1RoaXMgaXMgdGhlIHBsYWNlIScsIHdjOiA0IH1dIH1dLFxuXHRcdFx0dGhyZWFkczogT2JqZWN0LmFzc2lnbihbXSwgVEhSRUFEUyksXG5cdFx0XHRsb2NhdGlvbnM6IFsnU3RhciBMYWJzJ11cblx0XHR9O1xuXG5cdFx0QmluZCh0aGlzKTtcblxuXHRcdHRoaXMuc3RhdGUucHJvamVjdCA9IE9iamVjdC5hc3NpZ24oe3RpdGxlOiB0aGlzLnN0YXRlLnByb2plY3QudGl0bGV9LCB0aGlzLmNvdW50UHJvamVjdCgpKTtcblx0XHR0aGlzLnN0YXRlLm1lbnVCdXR0b24gPSB0aGlzLnByb2plY3RCdXR0b24oKTtcblx0XHR0aGlzLnN0YXRlLm1lbnVHcm91cHMgPSB0aGlzLnByb2plY3RNZXRhKCk7XG5cdH1cblxuXHRjb3VudFByb2plY3QoKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdHdvcmRDb3VudDogdGhpcy5zdGF0ZS5zdG9yZS5zY2VuZXMucmVkdWNlKCh3Yywgc2xpY2UpID0+IFxuXHRcdFx0XHQod2MgKyBzbGljZS5ub3Rlcy5yZWR1Y2UoKHdjLCBub3RlKSA9PiAoKG5vdGUpID8gKHdjICsgbm90ZS53YykgOiB3YyksIDApKVxuXHRcdFx0LCAwKSxcblx0XHRcdHNjZW5lQ291bnQ6IHRoaXMuc3RhdGUuc3RvcmUuc2NlbmVzLnJlZHVjZSgoc2NlbmVzLCBzbGljZSkgPT4gXG5cdFx0XHRcdChzY2VuZXMgKyBzbGljZS5ub3Rlcy5yZWR1Y2UoKHNjZW5lcywgbm90ZSkgPT4gKChub3RlKSA/IChzY2VuZXMgKyAxKSA6IHNjZW5lcyksIDApKVxuXHRcdFx0LCAwKVxuXHRcdH07XG5cdH1cblxuXHRjb21wb25lbnREaWRNb3VudCgpIHtcblx0XHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncmVzaXplJywgdGhpcy5vblJlc2l6ZSk7XG5cdH1cblxuXHRjb21wb25lbnRXaWxsVW5tb3VudCgpIHtcblx0XHR3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcigncmVzaXplJywgdGhpcy5vblJlc2l6ZSk7XG5cdH1cblxuXHRyZW5kZXIocHJvcHMsIHN0YXRlKSB7XG5cdFx0dmFyIGNoaWxkcmVuID0gW1xuXHRcdFx0PEZpbGVPcGVuZXJcblx0XHRcdFx0cmVmPXsoZWwpID0+ICh0aGlzLkZpbGVPcGVuZXIgPSBlbC5iYXNlKX1cblx0XHRcdFx0b25DaGFuZ2U9e3RoaXMub3BlblByb2plY3R9XG5cdFx0XHQvPlxuXHRcdF07XG5cblx0XHRpZiAoc3RhdGUubWVudU9wZW4pIHtcblx0XHRcdGNoaWxkcmVuLnB1c2goXG5cdFx0XHRcdDxBcHBNZW51XG5cdFx0XHRcdFx0Z3JvdXBzPXtzdGF0ZS5tZW51R3JvdXBzfVxuXHRcdFx0XHRcdHJlZj17KGVsKSA9PiB7XG5cdFx0XHRcdFx0XHRpZiAoZWwgJiYgZWwuYmFzZS5jbGllbnRIZWlnaHQgIT0gdGhpcy5zdGF0ZS5tZW51T2Zmc2V0KSB0aGlzLnNldFN0YXRlKHsgbWVudU9mZnNldDogZWwuYmFzZS5jbGllbnRIZWlnaHQgfSk7XG5cdFx0XHRcdFx0fX1cblx0XHRcdFx0Lz5cblx0XHRcdCk7XG5cdFx0XHRpZiAoc3RhdGUubWVudUJ1dHRvbikgY2hpbGRyZW4ucHVzaChcblx0XHRcdFx0PGJ1dHRvblxuXHRcdFx0XHRcdHN0eWxlPXtPYmplY3QuYXNzaWduKHt0b3A6IHN0YXRlLm1lbnVPZmZzZXQsIG1hcmdpblRvcDogJzFweCd9LCBTdHlsZS5tZW51QnV0dG9uKX1cblx0XHRcdFx0XHRvbkNsaWNrPXsoZSkgPT4ge1xuXHRcdFx0XHRcdFx0aWYgKHN0YXRlLm1lbnVCdXR0b24ub25DbGljaykgc3RhdGUubWVudUJ1dHRvbi5vbkNsaWNrKGUpXG5cdFx0XHRcdFx0XHR0aGlzLnNldFN0YXRlKHsgbWVudU9wZW46IGZhbHNlLCBtZW51T2Zmc2V0OiAnMHJlbScgfSk7XG5cdFx0XHRcdFx0fX1cblx0XHRcdFx0PlxuXHRcdFx0XHRcdHtzdGF0ZS5tZW51QnV0dG9uLm9wZW5lZC52YWx1ZX1cblx0XHRcdFx0PC9idXR0b24+XG5cdFx0XHQpO1xuXHRcdH0gZWxzZSBjaGlsZHJlbi5wdXNoKFxuXHRcdFx0PGJ1dHRvblxuXHRcdFx0XHRzdHlsZT17T2JqZWN0LmFzc2lnbih7dG9wOiAnMHJlbSd9LCBTdHlsZS5tZW51QnV0dG9uKX1cblx0XHRcdFx0b25DbGljaz17KGUpID0+IHtcblx0XHRcdFx0XHRpZiAoc3RhdGUubWVudUJ1dHRvbi5jbG9zZWQub25DbGljaykgc3RhdGUubWVudUJ1dHRvbi5jbG9zZWQub25DbGljayhlKVxuXHRcdFx0XHRcdHRoaXMuc2V0U3RhdGUoeyBtZW51T3BlbjogdHJ1ZSwgbWVudU9mZnNldDogJzIuNXJlbScgfSk7XG5cdFx0XHRcdH19XG5cdFx0XHQ+XG5cdFx0XHRcdHtzdGF0ZS5tZW51QnV0dG9uLmNsb3NlZC52YWx1ZX1cblx0XHRcdDwvYnV0dG9uPlxuXHRcdCk7XG5cblx0XHRjaGlsZHJlbi5wdXNoKHN0YXRlLmlzRWRpdGluZyA/XG5cdFx0XHQ8Tm90ZUVkaXRvclxuXHRcdFx0XHRtZW51T2Zmc2V0PXtzdGF0ZS5tZW51T2Zmc2V0fVxuXHRcdFx0XHRub3RlPXtzdGF0ZS50YXJnZXROb3RlfVxuXHRcdFx0XHRjb29yZHM9e3N0YXRlLm5vdGVDb29yZHN9XG5cdFx0XHRcdHRocmVhZD17c3RhdGUuc3RvcmUudGhyZWFkc1tzdGF0ZS50YXJnZXROb3RlLnRocmVhZF19XG5cdFx0XHRcdG1lbnU9e3RoaXMubGF5b3V0TWVudX1cblx0XHRcdFx0b25Eb25lPXt0aGlzLm9uRG9uZX1cblx0XHRcdC8+XG5cdFx0OlxuXHRcdFx0PFdlYXZlVmlld1xuXHRcdFx0XHRtZW51T2Zmc2V0PXtzdGF0ZS5tZW51T2Zmc2V0fVxuXHRcdFx0XHRzY2VuZXM9e3N0YXRlLnN0b3JlLnNjZW5lc31cblx0XHRcdFx0dGhyZWFkcz17c3RhdGUuc3RvcmUudGhyZWFkc31cblx0XHRcdFx0bG9jYXRpb25zPXtzdGF0ZS5zdG9yZS5sb2NhdGlvbnN9XG5cdFx0XHRcdG1lbnU9e3RoaXMubGF5b3V0TWVudX1cblx0XHRcdFx0ZWRpdE5vdGU9e3RoaXMuZWRpdE5vdGV9XG5cdFx0XHRcdHdpbmRvd1dpZHRoPXt3aW5kb3cuaW5uZXJXaWR0aH1cblx0XHRcdC8+XG5cdFx0KTtcblxuXHRcdHJldHVybiAoXG5cdFx0XHQ8ZGl2IGlkPVwiYXBwXCIgc3R5bGU9e1N0eWxlLmFwcH0+XG5cdFx0XHRcdHtjaGlsZHJlbn1cblx0XHRcdDwvZGl2PlxuXHRcdCk7XG5cdH1cblxuXHRlZGl0Tm90ZShjb29yZHMpIHtcblx0XHR0aGlzLnNldFN0YXRlKHtcblx0XHRcdGlzRWRpdGluZzogdHJ1ZSxcblx0XHRcdG5vdGVDb29yZHM6IGNvb3Jkcyxcblx0XHRcdHRhcmdldE5vdGU6IHRoaXMuc3RhdGUuc3RvcmUuc2NlbmVzW2Nvb3Jkcy5zbGljZUluZGV4XS5ub3Rlc1tjb29yZHMubm90ZUluZGV4XSxcblx0XHRcdG1lbnVPcGVuOiB0cnVlIFxuXHRcdH0pO1xuXHR9XG5cblx0cHJvamVjdEJ1dHRvbigpIHtcblx0XHRyZXR1cm4gQXBwTWVudS5tYWluKEFwcE1lbnUudGV4dCgnZG9uZScpLCBBcHBNZW51LnRleHQodGhpcy5zdGF0ZS5wcm9qZWN0LnRpdGxlLmxlbmd0aCA/IHRoaXMuc3RhdGUucHJvamVjdC50aXRsZSA6ICdQcm9qZWN0JykpO1xuXHR9XG5cblx0cHJvamVjdE1ldGEoKSB7XG5cdFx0cmV0dXJuIFtcblx0XHRcdFtcblx0XHRcdFx0QXBwTWVudS5pbnB1dCgnUHJvamVjdCBUaXRsZScsIHRoaXMuc3RhdGUucHJvamVjdC50aXRsZSwgKGV2ZW50KSA9PiB7XG5cdFx0XHRcdFx0dGhpcy5zdGF0ZS5wcm9qZWN0LnRpdGxlID0gZXZlbnQudGFyZ2V0LnZhbHVlO1xuXHRcdFx0XHRcdHRoaXMuc2V0U3RhdGUoeyBtZW51R3JvdXBzOiB0aGlzLnByb2plY3RNZXRhKGV2ZW50LnRhcmdldC52YWx1ZSksIG1lbnVCdXR0b246IHRoaXMucHJvamVjdEJ1dHRvbigpIH0pO1xuXHRcdFx0XHRcdHRoaXMuc2F2ZVByb2plY3QoKTtcblx0XHRcdFx0fSlcblx0XHRcdF0sW1xuXHRcdFx0XHRBcHBNZW51LnRleHQodGhpcy5zdGF0ZS5wcm9qZWN0LnNjZW5lQ291bnQgKyAnIHNjZW5lcycpLFxuXHRcdFx0XHRBcHBNZW51LnRleHQodGhpcy5zdGF0ZS5wcm9qZWN0LndvcmRDb3VudCArICcgd29yZHMnKVxuXHRcdFx0XSxbXG5cdFx0XHRcdEFwcE1lbnUuYnRuKCdpbXBvcnQnLCAoZXZlbnQpID0+IHRoaXMuRmlsZU9wZW5lci5jbGljaygpKSxcblx0XHRcdFx0QXBwTWVudS5idG4oJ2V4cG9ydCcsIChldmVudCkgPT4gRmlsZVNhdmVyLnNhdmVBcyhuZXcgQmxvYihbSlNPTi5zdHJpbmdpZnkoT2JqZWN0LmFzc2lnbih7fSwgdGhpcy5zdGF0ZS5wcm9qZWN0LCB0aGlzLnN0YXRlLnN0b3JlKSldLCB7dHlwZTogXCJ0ZXh0L3BsYWluO2NoYXJzZXQ9dXRmLThcIn0pLCB0aGlzLnN0YXRlLnByb2plY3QudGl0bGUgKyAnLndlYXZlJykpLFxuXHRcdFx0XHRBcHBNZW51LmJ0bigncHJpbnQnLCAoZXZlbnQpID0+IGNvbnNvbGUubG9nKFwiVE9ETyFcIikpXG5cdFx0XHRdLFxuXHRcdFx0W0FwcE1lbnUuZGVsZXRlQnRuKHRoaXMuZGVsZXRlKV1cblx0XHRdO1xuXHR9XG5cblx0b25SZXNpemUoKSB7XG5cdFx0dGhpcy5mb3JjZVVwZGF0ZSgpO1xuXHR9XG5cblx0b25Eb25lKCkge1xuXHRcdHRoaXMuc2V0U3RhdGUoe1xuXHRcdFx0dGFyZ2V0Tm90ZTogbnVsbCxcblx0XHRcdG5vdGVDb29yZHM6IG51bGwsXG5cdFx0XHRpc0VkaXRpbmc6IGZhbHNlLFxuXHRcdFx0bWVudU9wZW46IGZhbHNlLFxuXHRcdFx0bWVudUJ1dHRvbjogdGhpcy5wcm9qZWN0QnV0dG9uKCksXG5cdFx0XHRtZW51R3JvdXBzOiB0aGlzLnByb2plY3RNZXRhKCksXG5cdFx0XHRtZW51T2Zmc2V0OiAnMHJlbScgXG5cdFx0fSk7XG5cdH1cblxuXHRkbyhhY3Rpb24sIGRhdGEpIHtcblx0XHR0aGlzLnN0YXRlLnN0b3JlID0gQWN0aW9uc1thY3Rpb25dKGRhdGEsIHRoaXMuc3RhdGUuc3RvcmUpO1xuXHRcdHRoaXMuc3RhdGUucHJvamVjdCA9IE9iamVjdC5hc3NpZ24oe30sIHRoaXMuc3RhdGUucHJvamVjdCwgdGhpcy5jb3VudFByb2plY3QoKSk7XG5cdFx0dGhpcy5zZXRTdGF0ZSh7XG5cdFx0XHRtZW51R3JvdXBzOiAodGhpcy5zdGF0ZS5tZW51R3JvdXBzWzBdWzBdLm9uSW5wdXQpID8gdGhpcy5wcm9qZWN0TWV0YSgpIDogdGhpcy5zdGF0ZS5tZW51R3JvdXBzXG5cdFx0fSk7XG5cdFx0dGhpcy5zYXZlKCk7XG5cdH1cblxuXHRkZWxldGUoKSB7XG5cdFx0dGhpcy5zdGF0ZS5wcm9qZWN0ID0ge1xuXHRcdFx0dGl0bGU6ICdQcm9qZWN0IFRpdGxlJyxcblx0XHRcdHdvcmRDb3VudDogMCxcblx0XHRcdHNjZW5lQ291bnQ6IDBcblx0XHR9O1xuXHRcdHRoaXMuc2V0U3RhdGUoe1xuXHRcdFx0bWVudU9wZW46IGZhbHNlLFxuXHRcdFx0bWVudUJ1dHRvbjogdGhpcy5wcm9qZWN0QnV0dG9uKCksXG5cdFx0XHRtZW51R3JvdXBzOiB0aGlzLnByb2plY3RNZXRhKCksXG5cdFx0XHRtZW51T2Zmc2V0OiAnMHJlbScsXG5cdFx0XHRzdG9yZToge1xuXHRcdFx0XHRzY2VuZXM6IFt7ZGF0ZXRpbWU6ICcnLCBub3RlczogW251bGxdIH1dLFxuXHRcdFx0XHR0aHJlYWRzOiBPYmplY3QuYXNzaWduKFtdLCBUSFJFQURTKSxcblx0XHRcdFx0bG9jYXRpb25zOiBbJyddXG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0dGhpcy5zYXZlKCk7XG5cdH1cblxuXHRvcGVuUHJvamVjdChkYXRhKSB7XG5cblx0XHRkYXRhID0gSlNPTi5wYXJzZShkYXRhKTtcblx0XHR0aGlzLnN0YXRlLnByb2plY3QgPSB7IHRpdGxlOiBkYXRhLnRpdGxlLCB3b3JkQ291bnQ6IGRhdGEud29yZENvdW50LCBzY2VuZUNvdW50OiBkYXRhLnNjZW5lQ291bnQgfTtcblx0XHR0aGlzLnN0YXRlLnN0b3JlID0geyBzY2VuZXM6IGRhdGEuc2NlbmVzLCB0aHJlYWRzOiBkYXRhLnRocmVhZHMsIGxvY2F0aW9uczogZGF0YS5sb2NhdGlvbnMgfTtcblx0XHR0aGlzLnNldFN0YXRlKHtcblx0XHRcdG1lbnVPcGVuOiBmYWxzZSxcblx0XHRcdG1lbnVCdXR0b246IHRoaXMucHJvamVjdEJ1dHRvbigpLFxuXHRcdFx0bWVudUdyb3VwczogdGhpcy5wcm9qZWN0TWV0YSgpLFxuXHRcdFx0bWVudU9mZnNldDogJzByZW0nLFxuXHRcdH0pXG5cdFx0dGhpcy5zYXZlKCk7XG5cdH1cblxuXHRzYXZlKCkge1xuXHRcdHRoaXMuc2F2ZVByb2plY3QoKTtcblx0XHR0aGlzLnNhdmVTdG9yZSgpO1xuXHR9XG5cblx0c2F2ZVByb2plY3QoKSB7XG5cdFx0U291cmNlLnNldExvY2FsKCd3ZWF2ZS1wcm9qZWN0JywgSlNPTi5zdHJpbmdpZnkodGhpcy5zdGF0ZS5wcm9qZWN0KSk7XG5cdH1cblxuXHRzYXZlU3RvcmUoKSB7XG5cdFx0U291cmNlLnNldExvY2FsKCd3ZWF2ZS1zdG9yZScsIExaVy5jb21wcmVzc1RvVVRGMTYoSlNPTi5zdHJpbmdpZnkodGhpcy5zdGF0ZS5zdG9yZSkpKTtcblx0fVxuXG5cdGdldENoaWxkQ29udGV4dCgpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0ZG86IHRoaXMuZG8sXG5cdFx0XHR1c2VNZW51OiAobWVudUJ1dHRvbiwgbWVudUdyb3VwcykgPT4gdGhpcy5zZXRTdGF0ZSh7IG1lbnVPcGVuOiB0cnVlLCBtZW51QnV0dG9uOiBtZW51QnV0dG9uLCBtZW51R3JvdXBzOiBtZW51R3JvdXBzLCBtZW51T2Zmc2V0OiAnMi41cmVtJyB9KSxcblx0XHRcdHJlbGVhc2VNZW51OiAoKSA9PiB0aGlzLnNldFN0YXRlKHsgbWVudU9wZW46IGZhbHNlLCBtZW51QnV0dG9uOiB0aGlzLnByb2plY3RCdXR0b24oKSwgbWVudUdyb3VwczogdGhpcy5wcm9qZWN0TWV0YSgpLCBtZW51T2Zmc2V0OiAnMHJlbScgfSksXG5cdFx0XHRtb2RhbDogKGNvbnRlbnRzKSA9PiB0aGlzLnNldFN0YXRlKHsgbW9kYWw6IGNvbnRlbnRzIH0pXG5cdFx0fTtcblx0fVxufVxuXG5SZWFjdC5vcHRpb25zLmRlYm91bmNlUmVuZGVyaW5nID0gd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZTtcblxuUmVhY3QucmVuZGVyKDxBcHAvPiwgZG9jdW1lbnQuYm9keSk7IiwibW9kdWxlLmV4cG9ydHMgPSB7XG5cdC8qZ2V0OiBmdW5jdGlvbihrZXkpIHtcblxuXHR9LFxuXHRzZXQ6IGZ1bmN0aW9uKGtleSwgdmFsdWUpIHtcblxuXHR9LCovXG5cdGNoZWNrU3RhdHVzOiBmdW5jdGlvbihzZXJ2ZXJVUkwpIHtcblx0XHR2YXIgc3RhdHVzID0ge1xuXHRcdFx0bG9jYWw6IGZhbHNlLFxuXHRcdFx0b25saW5lOiBmYWxzZVxuXHRcdH1cblx0XHQvLyBjaGVjayBpZiBsb2NhbFN0b3JhZ2UgZXhpc3RzXG5cdFx0dHJ5IHtcblx0XHRcdHdpbmRvdy5sb2NhbFN0b3JhZ2Uuc2V0SXRlbSgnY2hlY2tTdGF0dXMnLCAnYScpO1xuXHRcdFx0d2luZG93LmxvY2FsU3RvcmFnZS5nZXRJdGVtKCdjaGVja1N0YXR1cycpO1xuXHRcdFx0d2luZG93LmxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKCdjaGVja1N0YXR1cycpO1xuXHRcdFx0c3RhdHVzLmxvY2FsID0gdHJ1ZTtcblx0XHR9IGNhdGNoKGUpIHt9XG5cdFx0Ly8gY2hlY2sgaWYgb25saW5lXG5cdFx0c3RhdHVzLm9ubGluZSA9IHdpbmRvdy5uYXZpZ2F0b3Iub25MaW5lO1xuXG5cdFx0cmV0dXJuIHN0YXR1cztcblx0fSxcblx0Z2V0TG9jYWw6IGZ1bmN0aW9uKGtleSkge1xuXHRcdHJldHVybiB3aW5kb3cubG9jYWxTdG9yYWdlLmdldEl0ZW0oa2V5KTtcblx0fSxcblx0c2V0TG9jYWw6IGZ1bmN0aW9uKGtleSwgdmFsdWUpIHtcblx0XHR2YXIgc3VjY2VzcyA9IHRydWU7XG5cdFx0aWYgKHZhbHVlID09PSB1bmRlZmluZWQpIHdpbmRvdy5sb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbShrZXkpO1xuXHRcdGVsc2UgdHJ5IHtcblx0XHRcdHdpbmRvdy5sb2NhbFN0b3JhZ2Uuc2V0SXRlbShrZXksIHZhbHVlKTtcblx0XHR9IGNhdGNoIChlKSB7IC8vIGxvY2FsU3RvcmFnZSBpcyBmdWxsXG5cdFx0XHRzdWNjZXNzID0gZmFsc2U7XG5cdFx0fVxuXHRcdHJldHVybiBzdWNjZXNzO1xuXHR9XG59OyIsIm1vZHVsZS5leHBvcnRzID0ge1xuLy8gU0xJQ0UgQUNUSU9OU1xuXHRORVdfU0xJQ0U6IGZ1bmN0aW9uKGFjdGlvbiwgc3RvcmUpIHtcblx0XHRzdG9yZS5zY2VuZXMgPSBPYmplY3QuYXNzaWduKFtdLCBzdG9yZS5zY2VuZXMpO1xuXHRcdHN0b3JlLnNjZW5lcy5zcGxpY2UoYWN0aW9uLmF0SW5kZXgsIDAsIHtcblx0XHRcdGRhdGV0aW1lOiAnJyxcblx0XHRcdG5vdGVzOiBzdG9yZS5sb2NhdGlvbnMubWFwKCgpPT5udWxsKVxuXHRcdH0pO1xuXHRcdHJldHVybiBzdG9yZTtcblx0fSxcblx0REVMRVRFX1NMSUNFOiBmdW5jdGlvbihhY3Rpb24sIHN0b3JlKSB7XG5cdFx0c3RvcmUuc2NlbmVzID0gT2JqZWN0LmFzc2lnbihbXSwgc3RvcmUuc2NlbmVzKTtcblx0XHRhY3Rpb24uc2xpY2UgPSBzdG9yZS5zY2VuZXMuc3BsaWNlKGFjdGlvbi5hdEluZGV4LCAxKTtcblx0XHRyZXR1cm4gc3RvcmU7XG5cdH0sXG5cdE1PRElGWV9TTElDRV9EQVRFOiBmdW5jdGlvbihhY3Rpb24sIHN0b3JlKSB7XG5cdFx0c3RvcmUuc2NlbmVzID0gT2JqZWN0LmFzc2lnbihbXSwgc3RvcmUuc2NlbmVzKTtcblx0XHRzdG9yZS5zY2VuZXNbYWN0aW9uLmF0SW5kZXhdLmRhdGV0aW1lID0gYWN0aW9uLm5ld0RhdGU7XG5cdFx0cmV0dXJuIHN0b3JlO1xuXHR9LFxuXG4vLyBOT1RFIEFDVElPTlNcblx0TkVXX05PVEU6IGZ1bmN0aW9uKGFjdGlvbiwgc3RvcmUpIHtcblx0XHRzdG9yZS5zY2VuZXMgPSBPYmplY3QuYXNzaWduKFtdLCBzdG9yZS5zY2VuZXMpO1xuXHRcdHN0b3JlLnNjZW5lc1thY3Rpb24uc2xpY2VJbmRleF0ubm90ZXMuc3BsaWNlKGFjdGlvbi5ub3RlSW5kZXgsIDEsIHtcblx0XHRcdHRocmVhZDogMCxcblx0XHRcdGhlYWQ6ICcnLFxuXHRcdFx0Ym9keTogJycsXG5cdFx0XHR3YzogMFxuXHRcdH0pO1xuXHRcdHJldHVybiBzdG9yZTtcblx0fSxcblx0REVMRVRFX05PVEU6IGZ1bmN0aW9uKGFjdGlvbiwgc3RvcmUpIHtcblx0XHRzdG9yZS5zY2VuZXMgPSBPYmplY3QuYXNzaWduKFtdLCBzdG9yZS5zY2VuZXMpO1xuXHRcdHN0b3JlLnNjZW5lc1thY3Rpb24uc2xpY2VJbmRleF0ubm90ZXNbYWN0aW9uLm5vdGVJbmRleF0gPSBudWxsO1xuXHRcdHJldHVybiBzdG9yZTtcblx0fSxcblx0TU9ESUZZX05PVEVfSEVBRDogZnVuY3Rpb24oYWN0aW9uLCBzdG9yZSkge1xuXHRcdHN0b3JlLnNjZW5lcyA9IE9iamVjdC5hc3NpZ24oW10sIHN0b3JlLnNjZW5lcyk7XG5cdFx0c3RvcmUuc2NlbmVzW2FjdGlvbi5zbGljZUluZGV4XS5ub3Rlc1thY3Rpb24ubm90ZUluZGV4XS5oZWFkID0gYWN0aW9uLm5ld0hlYWQ7XG5cdFx0cmV0dXJuIHN0b3JlO1xuXHR9LFxuXHRNT0RJRllfTk9URV9CT0RZOiBmdW5jdGlvbihhY3Rpb24sIHN0b3JlKSB7XG5cdFx0c3RvcmUuc2NlbmVzID0gT2JqZWN0LmFzc2lnbihbXSwgc3RvcmUuc2NlbmVzKTtcblx0XHR2YXIgbm90ZSA9IHN0b3JlLnNjZW5lc1thY3Rpb24uc2xpY2VJbmRleF0ubm90ZXNbYWN0aW9uLm5vdGVJbmRleF07XG5cdFx0bm90ZS5ib2R5ID0gYWN0aW9uLm5ld0JvZHk7XG5cdFx0bm90ZS53YyA9IGFjdGlvbi53Yztcblx0XHRyZXR1cm4gc3RvcmU7XG5cdH0sXG5cdE1PRElGWV9OT1RFX1RIUkVBRDogZnVuY3Rpb24oYWN0aW9uLCBzdG9yZSkge1xuXHRcdHZhciBub3RlO1xuXHRcdHN0b3JlLnNsaWNlcyA9IE9iamVjdC5hc3NpZ24oW10sIHN0b3JlLnNsaWNlcyk7XG5cdFx0bm90ZSA9IHN0b3JlLnNjZW5lc1thY3Rpb24uc2xpY2VJbmRleF0ubm90ZXNbYWN0aW9uLm5vdGVJbmRleF07XG5cdFx0aWYgKCsrbm90ZS50aHJlYWQgPT09IHN0b3JlLnRocmVhZHMubGVuZ3RoKSBub3RlLnRocmVhZCA9IDA7XG5cdFx0cmV0dXJuIHN0b3JlO1xuXHR9LFxuXG4vLyBMT0NBVElPTiBBQ1RJT05TXG5cdE5FV19MT0NBVElPTjogZnVuY3Rpb24oYWN0aW9uLCBzdG9yZSkge1xuXHRcdHZhciBpID0gc3RvcmUuc2NlbmVzLmxlbmd0aDtcblx0XHRzdG9yZS5sb2NhdGlvbnMgPSBPYmplY3QuYXNzaWduKFtdLCBzdG9yZS5sb2NhdGlvbnMpO1xuXHRcdHN0b3JlLnNjZW5lcyA9IE9iamVjdC5hc3NpZ24oW10sIHN0b3JlLnNjZW5lcyk7XG5cdFx0c3RvcmUubG9jYXRpb25zLnB1c2goJycpO1xuXHRcdHdoaWxlIChpLS0pIHN0b3JlLnNjZW5lc1tpXS5ub3Rlcy5wdXNoKG51bGwpO1xuXHRcdHJldHVybiBzdG9yZTtcblx0fSxcblx0REVMRVRFX0xPQ0FUSU9OOiBmdW5jdGlvbihhY3Rpb24sIHN0b3JlKSB7XG5cdFx0dmFyIGkgPSBzdG9yZS5zY2VuZXMubGVuZ3RoO1xuXHRcdHN0b3JlLmxvY2F0aW9ucyA9IE9iamVjdC5hc3NpZ24oW10sIHN0b3JlLmxvY2F0aW9ucyk7XG5cdFx0c3RvcmUuc2NlbmVzID0gT2JqZWN0LmFzc2lnbihbXSwgc3RvcmUuc2NlbmVzKTtcblx0XHRhY3Rpb24ubG9jYXRpb24gPSBzdG9yZS5sb2NhdGlvbnMuc3BsaWNlKGFjdGlvbi5hdEluZGV4LCAxKTtcblx0XHR3aGlsZSAoaS0tKSBzdG9yZS5zY2VuZXNbaV0ubm90ZXMuc3BsaWNlKGFjdGlvbi5hdEluZGV4LCAxKTtcblx0XHRyZXR1cm4gc3RvcmU7XG5cdH0sXG5cdE1PVkVfTE9DQVRJT046IGZ1bmN0aW9uKGFjdGlvbiwgc3RvcmUpIHtcblx0XHR2YXIgaSA9IHN0b3JlLnNjZW5lcy5sZW5ndGgsIG5vdGVzO1xuXHRcdHN0b3JlLmxvY2F0aW9ucyA9IE9iamVjdC5hc3NpZ24oW10sIHN0b3JlLmxvY2F0aW9ucyk7XG5cdFx0c3RvcmUuc2NlbmVzID0gT2JqZWN0LmFzc2lnbihbXSwgc3RvcmUuc2NlbmVzKTtcblx0XHRzdG9yZS5sb2NhdGlvbnMuc3BsaWNlKGFjdGlvbi50b0luZGV4LCAwLCBzdG9yZS5sb2NhdGlvbnMuc3BsaWNlKGFjdGlvbi5mcm9tSW5kZXgsIDEpKTtcblx0XHR3aGlsZSAoaS0tKSB7XG5cdFx0XHRub3RlcyA9IHN0b3JlLnNjZW5lc1tpXS5ub3Rlc1xuXHRcdFx0bm90ZXMuc3BsaWNlKGFjdGlvbi50b0luZGV4LCAwLCBub3Rlcy5zcGxpY2UoYWN0aW9uLmZyb21JbmRleCwgMSkpO1xuXHRcdH1cblx0XHRyZXR1cm4gc3RvcmU7XG5cdH0sXG5cdE1PRElGWV9MT0NBVElPTl9OQU1FOiBmdW5jdGlvbihhY3Rpb24sIHN0b3JlKSB7XG5cdFx0c3RvcmUubG9jYXRpb25zID0gT2JqZWN0LmFzc2lnbihbXSwgc3RvcmUubG9jYXRpb25zKTtcblx0XHRzdG9yZS5sb2NhdGlvbnNbYWN0aW9uLmF0SW5kZXhdID0gYWN0aW9uLm5ld05hbWU7XG5cdFx0cmV0dXJuIHN0b3JlO1xuXHR9LFxuXG4vLyBUSFJFQUQgQUNUSU9OU1xuXHRORVdfVEhSRUFEOiBmdW5jdGlvbihhY3Rpb24sIHN0b3JlKSB7XG5cdFx0c3RvcmUudGhyZWFkcyA9IE9iamVjdC5hc3NpZ24oW10sIHN0b3JlLnRocmVhZHMpO1xuXHRcdHN0b3JlLnRocmVhZHMucHVzaCh7XG5cdFx0XHRjb2xvcjogYWN0aW9uLmNvbG9yLFxuXHRcdFx0bmFtZTogYWN0aW9uLm5hbWVcblx0XHR9KTtcblx0XHRyZXR1cm4gc3RvcmU7XG5cdH0sXG5cdERFTEVURV9USFJFQUQ6IGZ1bmN0aW9uKGFjdGlvbiwgc3RvcmUpIHtcblx0XHRzdG9yZS50aHJlYWRzID0gT2JqZWN0LmFzc2lnbihbXSwgc3RvcmUudGhyZWFkcyk7XG5cdFx0c3RvcmUuc3BsaWNlKGFjdGlvbi5hdEluZGV4LCAxKTtcblx0XHRyZXR1cm4gc3RvcmU7XG5cdH0sXG5cdE1PRElGWV9USFJFQURfTkFNRTogZnVuY3Rpb24oYWN0aW9uLCBzdG9yZSkge1xuXHRcdHN0b3JlLnRocmVhZHMgPSBPYmplY3QuYXNzaWduKFtdLCBzdG9yZS50aHJlYWRzKTtcblx0XHRzdG9yZS50aHJlYWRzW2FjdGlvbi5hdEluZGV4XS5uYW1lID0gYWN0aW9uLm5ld05hbWU7XG5cdFx0cmV0dXJuIHN0b3JlO1xuXHR9XG59OyIsIlxuZnVuY3Rpb24gQXNzZXJ0aW9uRXJyb3IobWVzc2FnZSkge1xuXHR2YXIgZSA9IG5ldyBFcnJvcihtZXNzYWdlKTtcblx0ZS5uYW1lID0gJ0Fzc2VydGlvbkVycm9yJztcblx0cmV0dXJuIGU7XG59XG5cbmZ1bmN0aW9uIEFzc2VydChjb25kaXRpb24sIG1lc3NhZ2UpIHtcblx0aWYgKGNvbmRpdGlvbikgcmV0dXJuO1xuXHRlbHNlIHRocm93IEFzc2VydGlvbkVycm9yKG1lc3NhZ2UpO1xufVxuXG5mdW5jdGlvbiBEZWVwRXF1YWxzKGEsIGIpIHtcblxufVxuXG5mdW5jdGlvbiBQb2xsdXRlKCkge1xuXHRcdHdpbmRvdy5UZXN0ID0gQXNzZXJ0O1xuXHRcdHdpbmRvdy5Bc3NlcnQgPSBBc3NlcnQ7XG5cdH1cblxuaWYgKG1vZHVsZS5leHBvcnRzKSBtb2R1bGUuZXhwb3J0cyA9IHtcblx0VGVzdDogQXNzZXJ0LFxuXHRBc3NlcnQ6IEFzc2VydCxcblx0cG9sbHV0ZTogUG9sbHV0ZVxufTsiLCIvLyBjb252ZW5pZW5jZSBtZXRob2Rcbi8vIGJpbmRzIGV2ZXJ5IGZ1bmN0aW9uIGluIGluc3RhbmNlJ3MgcHJvdG90eXBlIHRvIHRoZSBpbnN0YW5jZSBpdHNlbGZcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oaW5zdGFuY2UpIHtcblx0dmFyIHByb3RvID0gaW5zdGFuY2UuY29uc3RydWN0b3IucHJvdG90eXBlLFxuXHRcdGtleXMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhwcm90byksXG5cdFx0a2V5O1xuXHR3aGlsZSAoa2V5ID0ga2V5cy5wb3AoKSkgaWYgKHR5cGVvZiBwcm90b1trZXldID09PSAnZnVuY3Rpb24nICYmIGtleSAhPT0gJ2NvbnN0cnVjdG9yJykgaW5zdGFuY2Vba2V5XSA9IGluc3RhbmNlW2tleV0uYmluZChpbnN0YW5jZSk7XG59IiwiY29uc3Rcblx0Y29sb3JzID0gW1xuXHRcdCcjMDAwMDAwJyxcblx0XHQnIzMzMzMzMycsXG5cdFx0JyM2NjY2NjYnLFxuXHRcdCcjOTk5OTk5Jyxcblx0XHQnI2IyMWYzNScsXG5cdFx0JyNkODI3MzUnLFxuXHRcdCcjZmY3NDM1Jyxcblx0XHQnI2ZmYTEzNScsXG5cdFx0JyNmZmNiMzUnLFxuXHRcdCcjZmZmNzM1Jyxcblx0XHQnIzAwNzUzYScsXG5cdFx0JyMwMDllNDcnLFxuXHRcdCcjMTZkZDM2Jyxcblx0XHQnIzAwNTJhNScsXG5cdFx0JyMwMDc5ZTcnLFxuXHRcdCcjMDZhOWZjJyxcblx0XHQnIzY4MWU3ZScsXG5cdFx0JyM3ZDNjYjUnLFxuXHRcdCcjYmQ3YWY2J1xuXHRdO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKG9sZCkge1xuXHR2YXIgaSA9IGNvbG9ycy5pbmRleE9mKG9sZCk7XG5cblx0cmV0dXJuIGNvbG9yc1srK2kgPT09IGNvbG9ycy5sZW5ndGggPyAwIDogaV07XG59IiwiY29uc3Rcblx0UmVhY3QgPSByZXF1aXJlKCdwcmVhY3QnKSxcblxuXHRTdHlsZSA9IHtcblx0XHR0b29sYmFyOiB7XG5cdFx0XHR6SW5kZXg6ICcyMCcsXG5cdFx0XHRwb3NpdGlvbjogJ2ZpeGVkJyxcblx0XHRcdHRvcDogJzAnLFxuXHRcdFx0bGVmdDogJzAnLFxuXHRcdFx0cmlnaHQ6ICcwJyxcblxuXHRcdFx0d2lkdGg6ICcxMDAlJyxcblx0XHRcdGJvcmRlcjogJ25vbmUnLFxuXHRcdFx0Ym9yZGVyQm90dG9tOiAndGhpbiBzb2xpZCAjNzc3JyxcblxuXHRcdFx0YmFja2dyb3VuZENvbG9yOiAnIzAwMDAwMCcsXG5cblx0XHRcdGNvbG9yOiAnI2ZmZidcblx0XHR9LFxuXHRcdG1lbnU6IHtcblx0XHRcdHdpZHRoOiAnMTAwJScsXG5cblx0XHRcdGRpc3BsYXk6ICdmbGV4Jyxcblx0XHRcdGZsZXhXcmFwOiAnd3JhcCcsXG5cdFx0XHRqdXN0aWZ5Q29udGVudDogJ3NwYWNlLWJldHdlZW4nXG5cdFx0fSxcblx0XHR1bDoge1xuXHRcdFx0ZGlzcGxheTogJ2ZsZXgnLFxuXHRcdFx0anVzdGlmeUNvbnRlbnQ6ICdzcGFjZS1iZXR3ZWVuJyxcblx0XHRcdGFsaWduSXRlbXM6ICdjZW50ZXInLFxuXG5cdFx0XHRsaXN0U3R5bGU6ICdub25lJ1xuXHRcdH0sXG5cdFx0bGk6IHtcblx0XHRcdGRpc3BsYXk6ICdpbmxpbmUtZmxleCcsXG5cdFx0XHRqdXN0aWZ5Q29udGVudDogJ2NlbnRlcicsXG5cdFx0XHRhbGlnbkl0ZW1zOiAnY2VudGVyJyxcblx0XHRcdG1hcmdpbjogJzAgMC41cmVtJ1xuXHRcdH0sXG5cdFx0aXRlbToge1xuXHRcdFx0aGVpZ2h0OiAnMi41cmVtJyxcblx0XHRcdHBhZGRpbmc6ICcwIDAuNzVyZW0nLFxuXG5cdFx0XHRib3JkZXI6ICdub25lJyxcblx0XHRcdG91dGxpbmU6ICdub25lJyxcblx0XHRcdGJhY2tncm91bmRDb2xvcjogJyMwMDAwMDAnLFxuXG5cdFx0XHRjb2xvcjogJyNmZmYnLFxuXHRcdFx0Zm9udFNpemU6ICcxLjJyZW0nLFxuXG5cdFx0XHRjdXJzb3I6ICdwb2ludGVyJ1xuXHRcdH0sXG5cdFx0aW1nOiB7XG5cdFx0XHR3aWR0aDogJzEuMnJlbScsXG5cdFx0XHRoZWlnaHQ6ICcxLjJyZW0nXG5cdFx0fSxcblx0XHRzcGFuOiB7XG5cdFx0XHRwYWRkaW5nVG9wOiAnMXJlbScsXG5cdFx0XHRoZWlnaHQ6ICcycmVtJ1xuXHRcdH0sXG5cdFx0dGV4dDoge1xuXHRcdFx0Zm9udFNpemU6ICcxcmVtJ1xuXHRcdH0sXG5cdFx0aW5wdXQ6IHtcblx0XHRcdGhlaWdodDogJzJyZW0nLFxuXHRcdFx0bWF4V2lkdGg6ICc5NXZ3Jyxcblx0XHRcdHBhZGRpbmc6ICcwIDAuNzVyZW0nLFxuXHRcdFx0Ym9yZGVyOiAnbm9uZScsXG5cdFx0XHRib3JkZXJCb3R0b206ICd0aGluIHNvbGlkICNmZmYnLFxuXHRcdFx0b3V0bGluZTogJ25vbmUnLFxuXHRcdFx0YmFja2dyb3VuZENvbG9yOiAnIzAwMCcsXG5cdFx0XHRmb250U2l6ZTogJzEuMnJlbScsXG5cdFx0XHRjb2xvcjogJyNmZmYnXG5cdFx0fVxuXHR9O1xuXG5mdW5jdGlvbiBNZWFzdXJlVGV4dCh0ZXh0KSB7XG5cdHZhciB3aWRlID0gdGV4dC5tYXRjaCgvW1dNXS9nKSxcblx0XHR0aGluID0gdGV4dC5tYXRjaCgvW0l0cmxpaiEuIF0vZyk7XG5cblx0XHR3aWRlID0gd2lkZSA/IHdpZGUubGVuZ3RoIDogMDtcblx0XHR0aGluID0gdGhpbiA/IHRoaW4ubGVuZ3RoIDogMDtcblxuXHRyZXR1cm4gKHRleHQubGVuZ3RoICsgd2lkZSAqIDEuMiAtIHRoaW4gKiAwLjMpO1xufVxuXG5mdW5jdGlvbiBBcHBNZW51KHByb3BzLCBzdGF0ZSkge1xuXHRyZXR1cm4gKFxuXHRcdDxkaXYgXG5cdFx0XHRpZD1cInRvb2xiYXJcIlxuXHRcdFx0c3R5bGU9e1N0eWxlLnRvb2xiYXJ9XG5cdFx0Plx0XG5cdFx0XHQ8bWVudSBcblx0XHRcdFx0dHlwZT1cInRvb2xiYXJcIlxuXHRcdFx0XHRzdHlsZT17U3R5bGUubWVudX1cblx0XHRcdFx0cmVmPXtwcm9wcy5yZWZ9XG5cdFx0XHQ+XG5cdFx0XHRcdHtwcm9wcy5ncm91cHMubWFwKChncm91cCkgPT5cblx0XHRcdFx0XHQ8dWwgc3R5bGU9e1N0eWxlLnVsfT5cblx0XHRcdFx0XHRcdHtncm91cC5tYXAoKGl0ZW0pID0+IHtcblx0XHRcdFx0XHRcdC8vIEJVVFRPTiBJVEVNXG5cdFx0XHRcdFx0XHRcdGlmIChpdGVtLm9uQ2xpY2sgfHwgaXRlbS5vbkhvbGQpIHJldHVybiAoXG5cdFx0XHRcdFx0XHRcdFx0PGxpIHN0eWxlPXtTdHlsZS5saX0+XG5cdFx0XHRcdFx0XHRcdFx0XHQ8YnV0dG9uXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHN0eWxlPXtpdGVtLnN0eWxlID8gT2JqZWN0LmFzc2lnbih7fSwgU3R5bGUuaXRlbSwgaXRlbS5zdHlsZSkgOiBTdHlsZS5pdGVtfVxuXHRcdFx0XHRcdFx0XHRcdFx0XHRvbkNsaWNrPXsoZSkgPT4ge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGUudGFyZ2V0LnN0eWxlLmNvbG9yID0gaXRlbS5zdHlsZSA/IGl0ZW0uc3R5bGUuY29sb3IgfHwgXCIjZmZmXCIgOiAnI2ZmZic7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0aWYgKGl0ZW0ub25DbGljaykgaXRlbS5vbkNsaWNrKGUpO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGlmIChpdGVtLnRpbWVyKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRjbGVhclRpbWVvdXQoaXRlbS50aW1lcik7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRpdGVtLnRpbWVyID0gdW5kZWZpbmVkO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHRcdFx0fX1cblx0XHRcdFx0XHRcdFx0XHRcdFx0b25Nb3VzZURvd249eyhlKSA9PiB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0ZS50YXJnZXQuc3R5bGUuY29sb3IgPSBcIiM3NzdcIjtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRpZiAoaXRlbS5vbkhvbGQpIGl0ZW0udGltZXIgPSBzZXRUaW1lb3V0KGl0ZW0ub25Ib2xkLCAxMDAwLCBlKTtcblx0XHRcdFx0XHRcdFx0XHRcdFx0fX1cblx0XHRcdFx0XHRcdFx0XHRcdFx0bmFtZT17aXRlbS5uYW1lfT5cblx0XHRcdFx0XHRcdFx0XHRcdFx0e2l0ZW0uaWNvbiA/XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0PGltZ1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0c3R5bGU9e1N0eWxlLmltZ31cblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdHNyYz17aXRlbS5pY29ufVxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdC8+XG5cdFx0XHRcdFx0XHRcdFx0XHRcdDpcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRpdGVtLnZhbHVlXG5cdFx0XHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHRcdDwvYnV0dG9uPlxuXHRcdFx0XHRcdFx0XHRcdDwvbGk+XG5cdFx0XHRcdFx0XHRcdCk7XG5cdFx0XHRcdFx0XHQvLyBURVhUIElOUFVUIElURU1cblx0XHRcdFx0XHRcdFx0aWYgKGl0ZW0ub25JbnB1dCkgcmV0dXJuIChcblx0XHRcdFx0XHRcdFx0XHQ8bGkgc3R5bGU9e1N0eWxlLmxpfT5cblx0XHRcdFx0XHRcdFx0XHRcdDxpbnB1dFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRzdHlsZT17aXRlbS5zdHlsZSA/IE9iamVjdC5hc3NpZ24oe30sIFN0eWxlLmlucHV0LCBpdGVtLnN0eWxlKSA6IFN0eWxlLmlucHV0fVxuXHRcdFx0XHRcdFx0XHRcdFx0XHR0eXBlPVwidGV4dFwiXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHBsYWNlaG9sZGVyPXtpdGVtLnBsYWNlaG9sZGVyfVxuXHRcdFx0XHRcdFx0XHRcdFx0XHRtYXhMZW5ndGg9ezQwfVxuXHRcdFx0XHRcdFx0XHRcdFx0XHRzaXplPXtNYXRoLm1heChNZWFzdXJlVGV4dChpdGVtLnZhbHVlLmxlbmd0aCA/IGl0ZW0udmFsdWUgOiAocHJvcHMucGxhY2Vob2xkZXIgfHwgJycpKSwgMjApfVxuXHRcdFx0XHRcdFx0XHRcdFx0XHRvbklucHV0PXtpdGVtLm9uSW5wdXR9XG5cdFx0XHRcdFx0XHRcdFx0XHRcdHZhbHVlPXtpdGVtLnZhbHVlfVxuXHRcdFx0XHRcdFx0XHRcdFx0Lz5cblx0XHRcdFx0XHRcdFx0XHQ8L2xpPlxuXG5cdFx0XHRcdFx0XHRcdCk7XG5cdFx0XHRcdFx0XHQvLyBURVhUIElURU1cblx0XHRcdFx0XHRcdFx0cmV0dXJuIChcblx0XHRcdFx0XHRcdFx0XHQ8bGkgc3R5bGU9e09iamVjdC5hc3NpZ24oe30sIFN0eWxlLmxpLCBTdHlsZS50ZXh0LCBpdGVtLnN0eWxlID8gaXRlbS5zdHlsZSA6IHt9KX0+XG5cdFx0XHRcdFx0XHRcdFx0XHQ8c3BhbiBzdHlsZT17U3R5bGUuc3Bhbn0+e2l0ZW0udmFsdWV9PC9zcGFuPlxuXHRcdFx0XHRcdFx0XHRcdDwvbGk+XG5cdFx0XHRcdFx0XHRcdCk7XG5cdFx0XHRcdFx0XHR9KX1cblx0XHRcdFx0XHQ8L3VsPlxuXHRcdFx0XHQpfVxuXHRcdFx0PC9tZW51PlxuXHRcdDwvZGl2PlxuXHQpXG59O1xuXG5BcHBNZW51Lm1haW4gPSAobywgYykgPT4gKHtcblx0b3BlbmVkOiBvLFxuXHRjbG9zZWQ6IGNcbn0pO1xuXG5BcHBNZW51LmlucHV0ID0gKHAsIHYsIGYsIHMpID0+ICh7IHBsYWNlaG9sZGVyOiBwLCB2YWx1ZTogdiwgb25JbnB1dDogZiwgc3R5bGU6IHMgPyBzIDogdW5kZWZpbmVkIH0pO1xuXG5BcHBNZW51LnRleHQgPSAodiwgcykgPT4gKHsgdmFsdWU6IHYsIHN0eWxlOiBzID8gcyA6IHVuZGVmaW5lZCB9KTtcblxuQXBwTWVudS5idG4gPSAodiwgZiwgcykgPT4gKHsgdmFsdWU6IHYsIG9uQ2xpY2s6IGYsIHN0eWxlOiBzID8gcyA6IHVuZGVmaW5lZCB9KTtcblxuQXBwTWVudS5kZWxldGVCdG4gPSAoZikgPT4gKHtcblx0dmFsdWU6ICdkZWxldGUnLFxuXHRzdHlsZToge2NvbG9yOiAnI2YwMCcsIHRyYW5zaXRpb246ICdjb2xvciAxcyd9LFxuXHRvbkhvbGQ6IGZcbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEFwcE1lbnU7IiwiY29uc3Rcblx0UmVhY3QgPSByZXF1aXJlKCdwcmVhY3QnKSxcblxuXHRTdHlsZSA9IHtcblx0XHRidG46IHtcblx0XHRcdHdpZHRoOiAnMnJlbScsXG5cdFx0XHRoZWlnaHQ6ICcycmVtJyxcblx0XHRcdGJvcmRlclJhZGl1czogJzFyZW0nLFxuXG5cdFx0XHRib3JkZXI6ICdub25lJyxcblx0XHRcdG91dGxpbmU6ICdub25lJyxcblx0XHRcdGJhY2tncm91bmRDb2xvcjogJyM1NTUnLFxuXG5cdFx0XHRjb2xvcjogJyNmMDAnLFxuXHRcdFx0Zm9udFNpemU6ICcxLjJyZW0nLFxuXHRcdFx0dHJhbnNpdGlvbjogJ2NvbG9yIDFzJyxcblxuXHRcdFx0Y3Vyc29yOiAncG9pbnRlcidcblx0XHR9XG5cdH07XG5cbmNsYXNzIERlbGV0ZUJ1dHRvbiBleHRlbmRzIFJlYWN0LkNvbXBvbmVudCB7XG5cdGNvbnN0cnVjdG9yKHByb3BzLCBjb250ZXh0KSB7XG5cdFx0c3VwZXIocHJvcHMsIGNvbnRleHQpO1xuXHR9XG5cdHJlbmRlcihwcm9wcykge1xuXHRcdHJldHVybiAoXG5cdFx0XHQ8YnV0dG9uXG5cdFx0XHRcdHN0eWxlPXtwcm9wcy5zdHlsZSA/IE9iamVjdC5hc3NpZ24oe30sIFN0eWxlLmJ0biwgcHJvcHMuc3R5bGUpIDogU3R5bGUuYnRufVxuXHRcdFx0XHRvbkNsaWNrPXsoZSkgPT4ge1xuXHRcdFx0XHRcdGUudGFyZ2V0LnN0eWxlLmNvbG9yID0gJyNmMDAnO1xuXHRcdFx0XHRcdGlmICh0aGlzLnRpbWVyKSB7XG5cdFx0XHRcdFx0XHRjbGVhclRpbWVvdXQodGhpcy50aW1lcik7XG5cdFx0XHRcdFx0XHR0aGlzLnRpbWVyID0gdW5kZWZpbmVkO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fX1cblx0XHRcdFx0b25Nb3VzZURvd249eyhlKSA9PiB7XG5cdFx0XHRcdFx0ZS50YXJnZXQuc3R5bGUuY29sb3IgPSBcIiM3NzdcIjtcblx0XHRcdFx0XHRpZiAocHJvcHMub25Ib2xkKSB0aGlzLnRpbWVyID0gc2V0VGltZW91dChwcm9wcy5vbkhvbGQsIDEwMDAsIGUpO1xuXHRcdFx0XHR9fVxuXHRcdFx0Plg8L2J1dHRvbj5cblx0XHQpO1xuXHR9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gRGVsZXRlQnV0dG9uOyIsImNvbnN0XG5cdFJlYWN0ID0gcmVxdWlyZSgncHJlYWN0JyksXG5cblx0U3R5bGUgPSB7XG5cdFx0ZWRpdEJveDoge1xuXHRcdFx0b3V0bGluZTogJ25vbmUnLFxuXHRcdFx0Ym9yZGVyOiAnbm9uZScsXG5cdFx0XHRvdmVyZmxvdzogJ2hpZGRlbicsXG5cdFx0XHRyZXNpemU6ICdub25lJ1xuXHRcdH1cblx0fTtcblxuY2xhc3MgRXhwYW5kaW5nVGV4dGFyZWEgZXh0ZW5kcyBSZWFjdC5Db21wb25lbnQge1xuXHRjb25zdHJ1Y3Rvcihwcm9wcywgY29udGV4dCkge1xuXHRcdHN1cGVyKHByb3BzLCBjb250ZXh0KTtcblx0XHR0aGlzLnN0YXRlID0ge1xuXHRcdFx0c3R5bGU6IE9iamVjdC5hc3NpZ24oe30sIFN0eWxlLmVkaXRCb3gsIHsgaGVpZ2h0OiBwcm9wcy5iYXNlSGVpZ2h0IH0pXG5cdFx0fTtcblxuXHRcdHRoaXMub25JbnB1dCA9IHRoaXMub25JbnB1dC5iaW5kKHRoaXMpO1xuXHRcdHRoaXMuZG9SZXNpemUgPSB0aGlzLmRvUmVzaXplLmJpbmQodGhpcyk7XG5cdFx0dGhpcy5yZXNpemUgPSB0aGlzLnJlc2l6ZS5iaW5kKHRoaXMpO1xuXHR9XG5cblx0cmVuZGVyKHByb3BzLCBzdGF0ZSkge1xuXHRcdHZhciBzdHlsZSA9IE9iamVjdC5hc3NpZ24oe30sIHByb3BzLnN0eWxlLCBzdGF0ZS5zdHlsZSk7XG5cdFx0cmV0dXJuIChcblx0XHRcdDx0ZXh0YXJlYVxuXHRcdFx0XHRzdHlsZT17c3R5bGV9XG5cdFx0XHRcdG1heGxlbmd0aD17cHJvcHMubWF4bGVuZ3RofVxuXHRcdFx0XHRwbGFjZWhvbGRlcj17cHJvcHMucGxhY2Vob2xkZXJ9XG5cdFx0XHRcdG9uSW5wdXQ9e3RoaXMub25JbnB1dH1cblx0XHRcdFx0b25DaGFuZ2U9e3Byb3BzLmNoYW5nZX1cblx0XHRcdFx0b25Gb2N1cz17cHJvcHMuZm9jdXN9XG5cdFx0XHRcdG9uQmx1cj17cHJvcHMuYmx1cn1cblx0XHRcdC8+XG5cdFx0KVxuXHR9XG5cblx0Y29tcG9uZW50RGlkTW91bnQoKSB7XG5cdFx0dGhpcy5iYXNlLnZhbHVlID0gKHRoaXMucHJvcHMudmFsdWUgIT09IHVuZGVmaW5lZCkgPyB0aGlzLnByb3BzLnZhbHVlIDogXCJObyBkZWZhdWx0IHZhbHVlIHNldC4uLlwiO1xuXHRcdHRoaXMuZG9SZXNpemUoKTtcblx0XHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncmVzaXplJywgdGhpcy5kb1Jlc2l6ZSk7XG5cdH1cblxuXHRjb21wb25lbnRXaWxsVW5tb3VudCgpIHtcblx0XHR3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcigncmVzaXplJywgdGhpcy5kb1Jlc2l6ZSk7XG5cdH1cblxuXHRvbklucHV0KGV2ZW50KSB7XG5cdFx0aWYgKHRoaXMucHJvcHMuaW5wdXQpIHRoaXMucHJvcHMuaW5wdXQoZXZlbnQpO1xuXHRcdHRoaXMuZG9SZXNpemUoKTtcblx0fVxuXG5cdGRvUmVzaXplKCkge1xuXHRcdHRoaXMuc3RhdGUuc3R5bGUuaGVpZ2h0ID0gdGhpcy5wcm9wcy5iYXNlSGVpZ2h0O1xuXHRcdHRoaXMuZm9yY2VVcGRhdGUodGhpcy5yZXNpemUpO1xuXHR9XG5cblx0cmVzaXplKCkge1xuXHRcdHRoaXMuc3RhdGUuc3R5bGUuaGVpZ2h0ID0gdGhpcy5iYXNlLnNjcm9sbEhlaWdodCArICdweCc7XG5cdFx0dGhpcy5mb3JjZVVwZGF0ZSgpO1xuXG5cdH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBFeHBhbmRpbmdUZXh0YXJlYTsiLCJjb25zdFxuXHRSZWFjdCA9IHJlcXVpcmUoJ3ByZWFjdCcpLFxuXHRSZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHByb3BzKSB7XG5cdHJldHVybiAoXG5cdFx0PGlucHV0XG5cdFx0XHR0eXBlPVwiZmlsZVwiXG5cdFx0XHRhY2NlcHQ9XCIud2VhdmVcIlxuXHRcdFx0c3R5bGU9e3tcblx0XHRcdFx0cG9zaXRpb246ICdhYnNvbHV0ZScsXG5cdFx0XHRcdHZpc2liaWxpdHk6ICdoaWRkZW4nLFxuXHRcdFx0XHR0b3A6ICctNTAnLFxuXHRcdFx0XHRsZWZ0OiAnLTUwJ1xuXHRcdFx0fX1cblx0XHRcdG9uY2hhbmdlPXsoZSkgPT4ge1xuXHRcdFx0XHRSZWFkZXIub25sb2FkZW5kID0gKCkgPT4gXG5cdFx0XHRcdFx0cHJvcHMub25DaGFuZ2UoUmVhZGVyLnJlc3VsdCk7XG5cdFx0XHRcdFJlYWRlci5yZWFkQXNUZXh0KGUudGFyZ2V0LmZpbGVzWzBdKTtcblx0XHRcdH19XG5cdFx0Lz5cblx0KTtcbn0iLCJjb25zdFxuXHRSZWFjdCA9IHJlcXVpcmUoJ3ByZWFjdCcpLFxuXG5cdEV4cGFuZGluZ1RleHRhcmVhID0gcmVxdWlyZSgnLi9FeHBhbmRpbmdUZXh0YXJlYS5qcycpLFxuXG5cdEJpbmQgPSByZXF1aXJlKCcuLi9iaW5kLmpzJyksXG5cdFN0eWxlID0ge1xuXHRcdGxvY2F0aW9uSGVhZGVyOiB7XG5cdFx0XHR6SW5kZXg6ICcxMCcsXG5cdFx0XHR3aWR0aDogJzdyZW0nLFxuXHRcdFx0Y29sb3I6ICcjZmZmJyxcblx0XHRcdGJhY2tncm91bmRDb2xvcjogJyM3Nzc3NzcnLFxuXHRcdFx0b3V0bGluZTogJ25vbmUnLFxuXHRcdFx0Zm9udFNpemU6ICcwLjlyZW0nLFxuXHRcdFx0Ym9yZGVyOiAnbm9uZScsXG5cdFx0XHR0ZXh0QWxpZ246ICdjZW50ZXInLFxuXHRcdFx0cGFkZGluZ1RvcDogJzAuNXJlbSdcblx0XHR9XG5cdH07XG5cbmNsYXNzIExvY2F0aW9uSGVhZGVyIGV4dGVuZHMgUmVhY3QuQ29tcG9uZW50IHtcblx0Y29uc3RydWN0b3IocHJvcHMsIGNvbnRleHQpIHtcblx0XHRzdXBlcihwcm9wcywgY29udGV4dCk7XG5cdFx0dGhpcy5zdGF0ZSA9IHtcblx0XHRcdHZhbHVlOiBwcm9wcy52YWx1ZVxuXHRcdH07XG5cdH1cblxuXHRzaG91bGRDb21wb25lbnRVcGRhdGUocHJvcHMsIHN0YXRlLCBjb250ZXh0KSB7XG5cdFx0cmV0dXJuICgocHJvcHMudmFsdWUgIT09IHRoaXMucHJvcHMudmFsdWUpICYmXG5cdFx0XHRcdChzdGF0ZS52YWx1ZSAhPT0gdGhpcy5zdGF0ZS52YWx1ZSkpO1xuXHR9XG5cblx0cmVuZGVyKHByb3BzLCBzdGF0ZSkge1xuXHRcdHJldHVybiAoXG5cdFx0XHQ8RXhwYW5kaW5nVGV4dGFyZWFcblx0XHRcdFx0dHlwZT1cInRleHRcIlxuXHRcdFx0XHRzdHlsZT17U3R5bGUubG9jYXRpb25IZWFkZXJ9XG5cdFx0XHRcdG1heExlbmd0aD1cIjI0XCJcblx0XHRcdFx0YmFzZUhlaWdodD1cIjAuOXJlbVwiXG5cdFx0XHRcdHZhbHVlPXtzdGF0ZS52YWx1ZX1cblx0XHRcdFx0cGxhY2Vob2xkZXI9XCJwbGFjZVwiXG5cdFx0XHRcdGlucHV0PXsoZXZlbnQpID0+IHRoaXMuc2V0U3RhdGUoe3ZhbHVlOiBldmVudC50YXJnZXQudmFsdWV9KX1cblx0XHRcdFx0Y2hhbmdlPXsoZXZlbnQpID0+IHRoaXMuY29udGV4dC5kbygnTU9ESUZZX0xPQ0FUSU9OX05BTUUnLCB7XG5cdFx0XHRcdFx0YXRJbmRleDogdGhpcy5wcm9wcy5pZCxcblx0XHRcdFx0XHRuZXdOYW1lOiBldmVudC50YXJnZXQudmFsdWVcblx0XHRcdFx0fSl9XG5cdFx0XHQvPlxuXHRcdClcblx0fVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IExvY2F0aW9uSGVhZGVyOyIsImNvbnN0XG5cdFJlYWN0ID0gcmVxdWlyZSgncHJlYWN0JyksXG5cblx0RXhwYW5kaW5nVGV4dGFyZWEgPSByZXF1aXJlKCcuL0V4cGFuZGluZ1RleHRhcmVhLmpzJyksXG5cdEFwcE1lbnUgPSByZXF1aXJlKCcuL0FwcE1lbnUuanMnKSxcblx0VGhyZWFkTGFiZWwgPSByZXF1aXJlKCcuL1RocmVhZExhYmVsLmpzJyksXG5cblx0QmluZCA9IHJlcXVpcmUoJy4uL2JpbmQuanMnKSxcblxuXHRTdHlsZSA9IHtcblx0XHRib3g6IHtcblx0XHRcdHpJbmRleDogJzAnLFxuXG5cdFx0XHRtYXhXaWR0aDogJzUwcmVtJyxcblxuXHRcdFx0YmFja2dyb3VuZENvbG9yOiAnI2ZmZicsXG5cdFx0XHRjb2xvcjogJyMyMjInLFxuXG5cdFx0XHRtYXJnaW5MZWZ0OiAnYXV0bycsXG5cdFx0XHRtYXJnaW5SaWdodDogJ2F1dG8nLFxuXHRcdFx0cGFkZGluZ1RvcDogJzEuNXJlbScsXG5cblx0XHRcdGRpc3BsYXk6ICdmbGV4Jyxcblx0XHRcdGZsZXhEaXJlY3Rpb246ICdjb2x1bW4nLFxuXHRcdFx0anVzdGlmeUNvbnRlbnQ6ICdzcGFjZS1hcm91bmQnLFxuXHRcdFx0YWxpZ25JdGVtczogJ3N0cmV0Y2gnXG5cdFx0fSxcblx0XHR0b3A6IHtcblx0XHRcdHBhZGRpbmdMZWZ0OiAnMS41cmVtJyxcblx0XHRcdHBhZGRpbmdSaWdodDogJzEuNXJlbScsXG5cblx0XHRcdGRpc3BsYXk6ICdmbGV4Jyxcblx0XHRcdGZsZXhXcmFwOiAnd3JhcCcsXG5cdFx0XHRqdXN0aWZ5Q29udGVudDogJ2ZsZXgtc3RhcnQnXG5cdFx0fSxcblx0XHR0aHJlYWQ6IHtcblx0XHRcdGNvbG9yOiAnI2ZmZicsXG5cdFx0XHRmb250U2l6ZTogJzAuNzVyZW0nLFxuXHRcdFx0aGVpZ2h0OiAnMXJlbScsXG5cblx0XHRcdGJvcmRlclJhZGl1czogJzFyZW0nLFxuXG5cdFx0XHRtYXJnaW5Cb3R0b206ICcwLjVyZW0nLFxuXHRcdFx0bWFyZ2luUmlnaHQ6ICcwLjVyZW0nLFxuXHRcdFx0cGFkZGluZzogJzAuMjVyZW0gMC41cmVtIDAuMnJlbSAwLjVyZW0nXG5cdFx0fSxcblx0XHRub3RlSGVhZDoge1xuXHRcdFx0Y29sb3I6ICcjMjIyJyxcblx0XHRcdGZvbnRTaXplOiAnMS43cmVtJyxcblxuXHRcdFx0bWFyZ2luOiAnMC41cmVtIDEuNXJlbSdcblx0XHR9LFxuXHRcdG5vdGVCb2R5OiB7XG5cdFx0XHRjb2xvcjogJyMyMjInLFxuXHRcdFx0Zm9udFNpemU6ICcxLjFyZW0nLFxuXHRcdFx0bWFyZ2luOiAnMC41cmVtIDEuNXJlbSdcblx0XHR9LFxuXHRcdHN0YXRzOiB7XG5cdFx0XHRiYWNrZ3JvdW5kQ29sb3I6ICcjZmZmJyxcblx0XHRcdGNvbG9yOiAnIzU1NScsXG5cdFx0XHRmb250U2l6ZTogJzFyZW0nLFxuXG5cdFx0XHRtYXJnaW46ICcwJyxcblx0XHRcdHBhZGRpbmc6ICcwLjc1cmVtIDEuNXJlbSAwLjc1cmVtIDEuNXJlbScsXG5cblx0XHRcdGRpc3BsYXk6ICdmbGV4Jyxcblx0XHRcdGZsZXhEaXJlY3Rpb246ICdyb3cnLFxuXHRcdFx0anVzdGlmeUNvbnRlbnQ6ICdzcGFjZS1hcm91bmQnXG5cdFx0fSxcblx0XHR3Yzoge1xuXHRcdFx0dGV4dEFsaWduOiAncmlnaHQnLFxuXG5cdFx0XHRkaXNwbGF5OiAnaW5saW5lLWJsb2NrJyxcblx0XHRcdGZsb2F0OiAncmlnaHQnXG5cdFx0fSxcblx0XHRzdGF0U3RpY2t5OiB7XG5cdFx0XHRib3R0b206ICcwJyxcblx0XHRcdHBvc2l0aW9uOiAnc3RpY2t5J1xuXHRcdH0sXG5cdFx0c3RhdEZyZWU6IHtcblx0XHRcdGJvdHRvbTogJ2F1dG8nLFxuXHRcdFx0cG9zaXRpb246ICdpbmhlcml0J1xuXHRcdH1cblx0fSxcblxuXHR0ZXN0V29yZHMgPSAvW1xcdyfigJldKyg/IVxcdyo+KS9pZ207IC8vIGNhcHR1cmUgd29yZHMgYW5kIGlnbm9yZSBodG1sIHRhZ3Mgb3Igc3BlY2lhbCBjaGFyc1xuXG5mdW5jdGlvbiBjb3VudCh0ZXh0KSB7XG5cdHZhciB3YyA9IDA7XG5cblx0dGVzdFdvcmRzLmxhc3RJbmRleCA9IDA7XG5cdHdoaWxlICh0ZXN0V29yZHMudGVzdCh0ZXh0KSkgd2MrKztcblx0cmV0dXJuIHdjO1xufVxuXG5jbGFzcyBOb3RlRWRpdG9yIGV4dGVuZHMgUmVhY3QuQ29tcG9uZW50IHtcblx0Y29uc3RydWN0b3IocHJvcHMsIGNvbnRleHQpIHtcblx0XHRzdXBlcihwcm9wcywgY29udGV4dCk7XG5cblx0XHR0aGlzLnN0YXRlID0ge1xuXHRcdFx0dGhyZWFkU3R5bGU6IE9iamVjdC5hc3NpZ24oe30sIFN0eWxlLnRocmVhZCwgeyBiYWNrZ3JvdW5kQ29sb3I6IHByb3BzLnRocmVhZC5jb2xvciB9KSxcblx0XHRcdGhlYWQ6IHByb3BzLm5vdGUuaGVhZCxcblx0XHRcdGJvZHk6IHByb3BzLm5vdGUuYm9keSxcblx0XHRcdHdjOiBwcm9wcy5ub3RlLndjLFxuXHRcdFx0cGFnZXM6IDEsXG5cdFx0XHRwYWdlT2Y6IDEsXG5cdFx0XHRzdGF0U3R5bGU6IHt9XG5cdFx0fVxuXG5cdFx0QmluZCh0aGlzKTtcblx0fVxuXG5cdHJlbmRlcihwcm9wcywgc3RhdGUpIHtcblx0XHRyZXR1cm4gKFxuXHRcdFx0PGRpdlxuXHRcdFx0XHRyZWY9e3RoaXMubW91bnRlZH1cblx0XHRcdFx0c3R5bGU9e09iamVjdC5hc3NpZ24oe21hcmdpblRvcDogcHJvcHMubWVudU9mZnNldCA9PT0gJzByZW0nID8gJzFyZW0nIDogcHJvcHMubWVudU9mZnNldH0sIFN0eWxlLmJveCl9XG5cdFx0XHQ+XG5cdFx0XHRcdDxzcGFuIHN0eWxlPXtTdHlsZS50b3B9PlxuXHRcdFx0XHRcdDxUaHJlYWRMYWJlbFxuXHRcdFx0XHRcdFx0c3R5bGU9e3N0YXRlLnRocmVhZFN0eWxlfVxuXHRcdFx0XHRcdFx0dmFsdWU9e3Byb3BzLnRocmVhZC5uYW1lfVxuXHRcdFx0XHRcdFx0b25DaGFuZ2U9eyhlKSA9PiB0aGlzLmNvbnRleHQuZG8oJ01PRElGWV9USFJFQURfTkFNRScsIHtcblx0XHRcdFx0XHRcdFx0YXRJbmRleDogcHJvcHMubm90ZS50aHJlYWQsXG5cdFx0XHRcdFx0XHRcdG5ld05hbWU6IGUudGFyZ2V0LnZhbHVlXG5cdFx0XHRcdFx0XHR9KX1cblx0XHRcdFx0XHQvPlxuXHRcdFx0XHRcdHsvKjxzcGFuIHN0eWxlPXtzdGF0ZS50aHJlYWRTdHlsZX0+XG5cdFx0XHRcdFx0XHR7JysnfVxuXHRcdFx0XHRcdDwvc3Bhbj4qL31cblx0XHRcdFx0PC9zcGFuPlxuXHRcdFx0XHQ8RXhwYW5kaW5nVGV4dGFyZWFcblx0XHRcdFx0XHRzdHlsZT17U3R5bGUubm90ZUhlYWR9XG5cdFx0XHRcdFx0bWF4TGVuZ3RoPVwiMjUwXCJcblx0XHRcdFx0XHRpbnB1dD17KGUpID0+IHRoaXMuc2V0U3RhdGUoe2hlYWQ6IGUudGFyZ2V0LnZhbHVlfSl9XG5cdFx0XHRcdFx0Y2hhbmdlPXsoKSA9PiB0aGlzLmNvbnRleHQuZG8oJ01PRElGWV9OT1RFX0hFQUQnLCBcblx0XHRcdFx0XHRcdE9iamVjdC5hc3NpZ24oe25ld0hlYWQ6IHRoaXMuc3RhdGUuaGVhZH0sIHByb3BzLmNvb3Jkcylcblx0XHRcdFx0XHQpfVxuXHRcdFx0XHRcdHZhbHVlPXtzdGF0ZS5oZWFkfVxuXHRcdFx0XHRcdGJhc2VIZWlnaHQ9XCIxLjdlbVwiXG5cdFx0XHRcdFx0cGxhY2Vob2xkZXI9XCJUaXRsZS9TdW1tYXJ5XCJcblx0XHRcdFx0Lz5cblx0XHRcdFx0PEV4cGFuZGluZ1RleHRhcmVhXG5cdFx0XHRcdFx0cmVmPXt0aGlzLmJvZHlNb3VudGVkfVxuXHRcdFx0XHRcdHN0eWxlPXtTdHlsZS5ub3RlQm9keX1cblx0XHRcdFx0XHRpbnB1dD17dGhpcy5vbkJvZHl9XG5cdFx0XHRcdFx0Y2hhbmdlPXsoKSA9PiB0aGlzLmNvbnRleHQuZG8oJ01PRElGWV9OT1RFX0JPRFknLCBcblx0XHRcdFx0XHRcdE9iamVjdC5hc3NpZ24oe25ld0JvZHk6IHN0YXRlLmJvZHksIHdjOiBzdGF0ZS53Y30sIHByb3BzLmNvb3Jkcylcblx0XHRcdFx0XHQpfVxuXHRcdFx0XHRcdHZhbHVlPXtzdGF0ZS5ib2R5fVxuXHRcdFx0XHRcdGJhc2VIZWlnaHQ9XCIxLjFlbVwiXG5cdFx0XHRcdFx0cGxhY2Vob2xkZXI9XCJCb2R5XCJcblx0XHRcdFx0Lz5cblx0XHRcdFx0PHNwYW4gc3R5bGU9e09iamVjdC5hc3NpZ24oe30sIFN0eWxlLnN0YXRzLCBzdGF0ZS5zdGF0U3R5bGUpfT5cblx0XHRcdFx0XHQ8c3Bhbj5cblx0XHRcdFx0XHRcdHtzdGF0ZS5wYWdlT2YgKyAnLycgKyBzdGF0ZS5wYWdlc31cblx0XHRcdFx0XHQ8L3NwYW4+XG5cdFx0XHRcdFx0PHNwYW4gc3R5bGU9e1N0eWxlLndjfT5cblx0XHRcdFx0XHRcdHtzdGF0ZS53YyArICcgd29yZHMnfVxuXHRcdFx0XHRcdDwvc3Bhbj5cblx0XHRcdFx0PC9zcGFuPlxuXHRcdFx0PC9kaXY+XG5cdFx0KVxuXHR9XG5cblx0Y29tcG9uZW50RGlkTW91bnQoKSB7XG5cdFx0dGhpcy5vblNjcm9sbCgpO1xuXG5cdFx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Njcm9sbCcsIHRoaXMub25TY3JvbGwpO1xuXHRcdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdyZXNpemUnLCB0aGlzLm9uUmVzaXplKTtcblxuXHRcdHRoaXMuY29udGV4dC51c2VNZW51KG51bGwsIFtcblx0XHRcdFtcblx0XHRcdFx0eyBcblx0XHRcdFx0XHRpY29uOiAnLi9kaXN0L2ltZy91bmRvLnN2ZycsXG5cdFx0XHRcdFx0b25DbGljazogKGV2ZW50KSA9PiBkb2N1bWVudC5leGVjQ29tbWFuZCgndW5kbycpXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHsgXG5cdFx0XHRcdFx0aWNvbjogJy4vZGlzdC9pbWcvcmVkby5zdmcnLFxuXHRcdFx0XHRcdG9uQ2xpY2s6IChldmVudCkgPT4gZG9jdW1lbnQuZXhlY0NvbW1hbmQoJ3JlZG8nKVxuXHRcdFx0XHR9XG5cblx0XHRcdF0sXG5cdFx0XHRbQXBwTWVudS5idG4oJ2RvbmUnLCAoKSA9PiB0aGlzLnByb3BzLm9uRG9uZSgpKV1cblx0XHRdKTtcblxuXHR9XG5cblx0Y29tcG9uZW50V2lsbFVubW91bnQoKSB7XG5cdFx0d2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3Njcm9sbCcsIHRoaXMub25TY3JvbGwpO1xuXHRcdHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdyZXNpemUnLCB0aGlzLm9uUmVzaXplKTtcblx0fVxuXG5cdG9uQm9keShldmVudCkge1xuXHRcdHRoaXMuc2V0U3RhdGUoe1xuXHRcdFx0Ym9keTogZXZlbnQudGFyZ2V0LnZhbHVlLFxuXHRcdFx0d2M6IGNvdW50KGV2ZW50LnRhcmdldC52YWx1ZSksXG5cdFx0XHRwYWdlczogTWF0aC5yb3VuZCh0aGlzLnN0YXRlLndjIC8gMjc1KSB8fCAxXG5cdFx0fSk7XG5cdFx0dGhpcy5vblNjcm9sbCgpO1xuXHR9XG5cblx0bW91bnRlZChlbGVtZW50KSB7XG5cdFx0dGhpcy5lbCA9IGVsZW1lbnQ7XG5cdH1cblxuXHRib2R5TW91bnRlZChlbGVtZW50KSB7XG5cdFx0dGhpcy5ib2R5ID0gZWxlbWVudDtcblx0fVxuXG5cdG9uU2Nyb2xsKGV2ZW50KSB7XG5cdFx0dGhpcy5wYWdlQ291bnQoKTtcblx0XHR0aGlzLnN0aWNreVN0YXRzKCk7XG5cdH1cblxuXHRwYWdlQ291bnQoKSB7XG5cdFx0dmFyIHQ7XG5cdFx0aWYgKHRoaXMuYm9keS5jbGllbnRIZWlnaHQgPiB3aW5kb3cuaW5uZXJIZWlnaHQpIHtcblx0XHRcdHQgPSBNYXRoLmFicyh0aGlzLmJvZHkuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkudG9wKTtcblx0XHRcdHQgPSAodCAvIHRoaXMuYm9keS5jbGllbnRIZWlnaHQpICogKHRoaXMuc3RhdGUucGFnZXMgKyAxKTtcblx0XHRcdHQgPSBNYXRoLmNlaWwodCk7XG5cdFx0XHRpZiAodCA+IHRoaXMuc3RhdGUucGFnZXMpIHQgPSB0aGlzLnN0YXRlLnBhZ2VzO1xuXHRcdH0gZWxzZSB0ID0gMTtcblx0XHR0aGlzLnNldFN0YXRlKHsgcGFnZU9mOiB0IH0pO1xuXHR9XG5cblx0c3RpY2t5U3RhdHMoKSB7XG5cdFx0aWYgKHRoaXMuZWwuY2xpZW50SGVpZ2h0ID4gKHdpbmRvdy5pbm5lckhlaWdodCAtIDQwKSkge1xuXHRcdFx0dGhpcy5zZXRTdGF0ZSh7IHN0YXRTdHlsZTogU3R5bGUuc3RhdFN0aWNreSB9KVxuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzLnNldFN0YXRlKHsgc3RhdFN0eWxlOiBTdHlsZS5zdGF0RnJlZSB9KVxuXHRcdH1cblx0fVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IE5vdGVFZGl0b3I7IiwiY29uc3Rcblx0UmVhY3QgPSByZXF1aXJlKCdwcmVhY3QnKSxcblxuXHRBcHBNZW51ID0gcmVxdWlyZSgnLi9BcHBNZW51LmpzJyksXG5cdERlbGV0ZUJ1dHRvbiA9IHJlcXVpcmUoJy4vRGVsZXRlQnV0dG9uLmpzJyksXG5cblx0bmV4dENvbG9yID0gcmVxdWlyZSgnLi4vY29sb3JzLmpzJyksXG5cblx0VGhyZWFkTGFiZWwgPSByZXF1aXJlKCcuL1RocmVhZExhYmVsLmpzJyksXG5cblx0QmluZCA9IHJlcXVpcmUoJy4uL2JpbmQuanMnKSxcblx0RXhwYW5kaW5nVGV4dGFyZWEgPSByZXF1aXJlKCcuL0V4cGFuZGluZ1RleHRhcmVhLmpzJyksXG5cblx0U3R5bGUgPSB7XG5cdFx0Ym94OiB7XG5cdFx0XHRtYXhXaWR0aDogJzUwcmVtJyxcblx0XHRcdGJhY2tncm91bmRDb2xvcjogJyNmZmYnLFxuXHRcdFx0Y29sb3I6ICcjMjIyJyxcblx0XHRcdGRpc3BsYXk6ICdmbGV4Jyxcblx0XHRcdGZsZXhEaXJlY3Rpb246ICdjb2x1bW4nLFxuXHRcdFx0anVzdGlmeUNvbnRlbnQ6ICdzcGFjZS1hcm91bmQnLFxuXHRcdFx0YWxpZ25JdGVtczogJ3N0cmV0Y2gnLFxuXHRcdFx0d2lkdGg6ICcxNHJlbScsXG5cdFx0XHRwb3NpdGlvbjogJ3JlbGF0aXZlJyxcblx0XHRcdHRvcDogJzAuMnJlbScsXG5cdFx0XHRtYXhIZWlnaHQ6ICcxM3JlbSdcblx0XHR9LFxuXG5cdFx0bm90ZUhlYWQ6IHtcblx0XHRcdGZvbnRTaXplOiAnMS4xcmVtJyxcblx0XHRcdGhlaWdodDogJzEuM3JlbScsXG5cdFx0XHRtYXJnaW46ICcwLjI1cmVtIDAuNzVyZW0nXG5cdFx0fSxcblxuXHRcdHN0YXRzOiB7XG5cdFx0XHRjb2xvcjogJyNmZmYnLFxuXHRcdFx0ZGlzcGxheTogJ2ZsZXgnLFxuXHRcdFx0anVzdGlmeUNvbnRlbnQ6ICdzcGFjZS1hcm91bmQnLFxuXHRcdFx0YWxpZ25JdGVtczogJ2NlbnRlcicsXG5cdFx0XHRmb250U2l6ZTogJzAuOXJlbScsXG5cdFx0XHRoZWlnaHQ6ICcycmVtJ1xuXHRcdH0sXG5cblx0XHR3b3JkY291bnQ6IHtcblx0XHRcdGZvbnRTaXplOiAnMC45cmVtJyxcblx0XHRcdHBhZGRpbmc6ICcwLjVyZW0nXG5cdFx0fSxcblxuXHRcdHRleHRhcmVhOiB7XG5cdFx0XHRmb250U2l6ZTogJzEuMXJlbScsXG5cdFx0XHRtYXJnaW46ICcwLjc1cmVtJyxcblx0XHRcdG1heEhlaWdodDogJzlyZW0nXG5cdFx0fSxcblxuXHRcdGJ1dHRvbjoge1xuXHRcdFx0Zm9udFNpemU6ICcwLjlyZW0nLFxuXHRcdFx0cGFkZGluZzogJzAuNXJlbScsXG5cdFx0XHRjb2xvcjogJyNmZmYnLFxuXHRcdFx0YmFja2dyb3VuZENvbG9yOiAncmdiYSgwLDAsMCwwKScsXG5cdFx0XHRib3JkZXI6ICdub25lJyxcblx0XHRcdG91dGxpbmU6ICdub25lJyxcblx0XHRcdGN1cnNvcjogJ3BvaW50ZXInXG5cdFx0fSxcblx0XHRjb2xvckJ1dHRvbjoge1xuXHRcdFx0d2lkdGg6ICcxcmVtJyxcblx0XHRcdGhlaWdodDogJzFyZW0nLFxuXHRcdFx0Ym9yZGVyOiAndGhpbiBzb2xpZCAjZmZmJyxcblx0XHRcdGJvcmRlclJhZGl1czogJzFyZW0nLFxuXHRcdFx0Y29sb3I6ICcjZmZmJyxcblx0XHRcdGJhY2tncm91bmRDb2xvcjogJ3JnYmEoMCwwLDAsMCknLFxuXHRcdFx0b3V0bGluZTogJ25vbmUnLFxuXHRcdFx0Y3Vyc29yOiAncG9pbnRlcidcblx0XHR9LFxuXHRcdG1vdmVCdXR0b246IHtcblx0XHRcdHpJbmRleDogMjUsXG5cdFx0XHRmb250U2l6ZTogJzAuOXJlbScsXG5cdFx0XHRwb3NpdGlvbjogJ2Fic29sdXRlJyxcblx0XHRcdHBhZGRpbmc6ICcwLjVyZW0nLFxuXHRcdFx0Ym90dG9tOiAnLTIuNXJlbScsXG5cdFx0XHRsZWZ0OiAnM3JlbScsXG5cdFx0XHRib3JkZXI6ICdub25lJyxcblx0XHRcdGNvbG9yOiAnI2ZmZicsXG5cdFx0XHRiYWNrZ3JvdW5kQ29sb3I6ICcjMDAwJyxcblx0XHRcdG91dGxpbmU6ICdub25lJyxcblx0XHRcdGN1cnNvcjogJ3BvaW50ZXInXG5cdFx0fSxcblx0XHRkZWxldGVCdXR0b246IHtcblx0XHRcdHpJbmRleDogMjUsXG5cdFx0XHRmb250U2l6ZTogJzAuOXJlbScsXG5cdFx0XHRwb3NpdGlvbjogJ2Fic29sdXRlJyxcblx0XHRcdHRvcDogJy0xcmVtJyxcblx0XHRcdHJpZ2h0OiAnLTFyZW0nXG5cdFx0fVxuXHR9O1xuXG5cbmNsYXNzIE5vdGVWaWV3IGV4dGVuZHMgUmVhY3QuQ29tcG9uZW50IHtcblx0Y29uc3RydWN0b3IocHJvcHMsIGNvbnRleHQpIHtcblx0XHRzdXBlcihwcm9wcywgY29udGV4dCk7XG5cblx0XHRCaW5kKHRoaXMpO1xuXHR9XG5cblx0cmVuZGVyKHByb3BzLCBzdGF0ZSkge1xuXHRcdHZhciBhcmd5bGUgPSBPYmplY3QuYXNzaWduKHt9LCBTdHlsZS5ib3gsIHtcblx0XHRcdGJvcmRlcjogKHByb3BzLnNlbGVjdGVkID8gKCcwLjJyZW0gc29saWQgJyArIHByb3BzLnRocmVhZC5jb2xvcikgOiAnMCBzb2xpZCByZ2JhKDAsMCwwLDApJyksXG5cdFx0XHRtYXJnaW46IHByb3BzLnNlbGVjdGVkID8gJzAnIDogJzAuMnJlbSdcblx0XHR9KTtcblxuXHRcdHJldHVybiAoXG5cdFx0XHQ8ZGl2XG5cdFx0XHRcdHN0eWxlPXthcmd5bGV9XG5cdFx0XHRcdG9uY2xpY2s9e3RoaXMub25DbGlja31cblx0XHRcdD5cblx0XHRcdFx0PEV4cGFuZGluZ1RleHRhcmVhXG5cdFx0XHRcdFx0c3R5bGU9e1N0eWxlLnRleHRhcmVhfVxuXHRcdFx0XHRcdG1heExlbmd0aD17MjUwfSBcblx0XHRcdFx0XHRvbmlucHV0PXt0aGlzLm9uSW5wdXR9IFxuXHRcdFx0XHRcdGJhc2VIZWlnaHQ9XCIxLjNyZW1cIlxuXHRcdFx0XHRcdHBsYWNlaG9sZGVyPVwiVGl0bGUvU3VtbWFyeVwiXG5cdFx0XHRcdFx0dmFsdWU9e3Byb3BzLm5vdGUuaGVhZH1cblx0XHRcdFx0XHRmb2N1cz17dGhpcy5vbkZvY3VzfVxuXHRcdFx0XHRcdGNoYW5nZT17dGhpcy5vbkNoYW5nZX1cblx0XHRcdFx0XHRyZWY9e2VsID0+IHRoaXMuZWwgPSBlbH1cblx0XHRcdFx0Lz5cblx0XHRcdFx0XHQ8c3BhbiBcblx0XHRcdFx0XHRcdHN0eWxlPXtPYmplY3QuYXNzaWduKHt9LCBTdHlsZS5zdGF0cywge2JhY2tncm91bmRDb2xvcjogcHJvcHMudGhyZWFkLmNvbG9yfSl9XG5cdFx0XHRcdFx0PlxuXHRcdFx0XHRcdFx0eyFwcm9wcy5zZWxlY3RlZCA/IFtcblx0XHRcdFx0XHRcdFx0PGJ1dHRvbiBcblx0XHRcdFx0XHRcdFx0XHRvbmNsaWNrPXsoKSA9PiBwcm9wcy5vbkVkaXQoe3NsaWNlSW5kZXg6IHByb3BzLnNsaWNlSW5kZXgsIG5vdGVJbmRleDogcHJvcHMubm90ZUluZGV4fSl9IFxuXHRcdFx0XHRcdFx0XHRcdHN0eWxlPXtTdHlsZS5idXR0b259XG5cdFx0XHRcdFx0XHRcdD5lZGl0PC9idXR0b24+LFxuXHRcdFx0XHRcdFx0XHQ8c3BhbiBzdHlsZT17U3R5bGUud29yZGNvdW50fT57cHJvcHMubm90ZS53Y30gd29yZHM8L3NwYW4+XG5cdFx0XHRcdFx0XHRdIDogW1xuXHRcdFx0XHRcdFx0XHQ8YnV0dG9uXG5cdFx0XHRcdFx0XHRcdFx0c3R5bGU9e1N0eWxlLmNvbG9yQnV0dG9ufVxuXHRcdFx0XHRcdFx0XHRcdG9uQ2xpY2s9eygpID0+IHRoaXMuY29udGV4dC5kbygnTU9ESUZZX05PVEVfVEhSRUFEJywge1xuXHRcdFx0XHRcdFx0XHRcdFx0c2xpY2VJbmRleDogcHJvcHMuc2xpY2VJbmRleCxcblx0XHRcdFx0XHRcdFx0XHRcdG5vdGVJbmRleDogcHJvcHMubm90ZUluZGV4XG5cdFx0XHRcdFx0XHRcdFx0fSl9XG5cdFx0XHRcdFx0XHRcdD48L2J1dHRvbj4sXG5cdFx0XHRcdFx0XHRcdDxUaHJlYWRMYWJlbFxuXHRcdFx0XHRcdFx0XHRcdHZhbHVlPXtwcm9wcy50aHJlYWQubmFtZX1cblx0XHRcdFx0XHRcdFx0XHRvbkNoYW5nZT17KGUpID0+IHRoaXMuY29udGV4dC5kbygnTU9ESUZZX1RIUkVBRF9OQU1FJywge1xuXHRcdFx0XHRcdFx0XHRcdFx0YXRJbmRleDogcHJvcHMubm90ZS50aHJlYWQsXG5cdFx0XHRcdFx0XHRcdFx0XHRuZXdOYW1lOiBlLnRhcmdldC52YWx1ZVxuXHRcdFx0XHRcdFx0XHRcdH0pfVxuXHRcdFx0XHRcdFx0XHQvPixcblx0XHRcdFx0XHRcdFx0Lyo8YnV0dG9uXG5cdFx0XHRcdFx0XHRcdFx0c3R5bGU9e1N0eWxlLm1vdmVCdXR0b259XG5cdFx0XHRcdFx0XHRcdFx0b25DbGljaz17cHJvcHMubW92ZU5vdGV9XG5cdFx0XHRcdFx0XHRcdD5tb3ZlPC9idXR0b24+LCovXG5cdFx0XHRcdFx0XHRcdDxEZWxldGVCdXR0b25cblx0XHRcdFx0XHRcdFx0XHRzdHlsZT17U3R5bGUuZGVsZXRlQnV0dG9ufVxuXHRcdFx0XHRcdFx0XHRcdG9uSG9sZD17KCkgPT4gdGhpcy5jb250ZXh0LmRvKCdERUxFVEVfTk9URScsIHtcblx0XHRcdFx0XHRcdFx0XHRcdHNsaWNlSW5kZXg6IHByb3BzLnNsaWNlSW5kZXgsXG5cdFx0XHRcdFx0XHRcdFx0XHRub3RlSW5kZXg6IHByb3BzLm5vdGVJbmRleFxuXHRcdFx0XHRcdFx0XHRcdH0pfVxuXHRcdFx0XHRcdFx0XHQvPlx0XHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHRdfVxuXHRcdFx0XHQ8L3NwYW4+XG5cdFx0XHQ8L2Rpdj5cblx0XHQpXG5cdH1cblxuXHRvbkNyZWF0ZU5vdGUoZXZlbnQpIHtcblx0XHR0aGlzLm5ld05vdGUoZXZlbnQpO1xuXHR9XG5cblx0b25Gb2N1cyhldmVudCkge1xuXHRcdGlmICghdGhpcy5wcm9wcy5zZWxlY3RlZCkgdGhpcy5zZWxlY3QoKTtcblx0fVxuXG5cdG9uQ2hhbmdlKGV2ZW50KSB7XG5cdFx0dGhpcy5jb250ZXh0LmRvKCdNT0RJRllfTk9URV9IRUFEJywge1xuXHRcdFx0c2xpY2VJbmRleDogdGhpcy5wcm9wcy5zbGljZUluZGV4LFxuXHRcdFx0bm90ZUluZGV4OiB0aGlzLnByb3BzLm5vdGVJbmRleCxcblx0XHRcdG5ld0hlYWQ6IGV2ZW50LnRhcmdldC52YWx1ZVxuXHRcdH0pO1xuXHR9XG5cblx0b25DbGljayhldmVudCkge1xuXHRcdGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuXHRcdGlmICghdGhpcy5wcm9wcy5zZWxlY3RlZCkge1xuXHRcdFx0dGhpcy5zZWxlY3QoKTtcblx0XHRcdHRoaXMuZWwuYmFzZS5mb2N1cygpO1xuXHRcdH1cblx0fVxuXG5cdHNlbGVjdCgpIHtcblx0XHR0aGlzLnByb3BzLm9uU2VsZWN0KHtcblx0XHRcdHNsaWNlSW5kZXg6IHRoaXMucHJvcHMuc2xpY2VJbmRleCxcblx0XHRcdG5vdGVJbmRleDogdGhpcy5wcm9wcy5ub3RlSW5kZXhcblx0XHR9KTtcblx0fVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IE5vdGVWaWV3OyIsImNvbnN0XG5cdFJlYWN0ID0gcmVxdWlyZSgncHJlYWN0JyksXG5cblx0Tm90ZVZpZXcgPSByZXF1aXJlKCcuL05vdGVWaWV3LmpzJyksXG5cblx0QmluZCA9IHJlcXVpcmUoJy4uL2JpbmQuanMnKSxcblx0U3R5bGUgPSB7XG5cdFx0c2xpY2VIZWFkZXI6IHtcblx0XHRcdHpJbmRleDogJzExJyxcblx0XHRcdGhlaWdodDogJzEuNXJlbScsXG5cdFx0XHRjb2xvcjogJyNmZmYnLFxuXHRcdFx0bWF4V2lkdGg6ICcxNHJlbScsXG5cdFx0XHRiYWNrZ3JvdW5kQ29sb3I6ICcjNzc3Nzc3Jyxcblx0XHRcdG91dGxpbmU6ICdub25lJyxcblx0XHRcdGZvbnRTaXplOiAnMC45cmVtJyxcblx0XHRcdG1hcmdpbjogJzAgYXV0bycsXG5cdFx0XHRib3JkZXI6ICdub25lJyxcblx0XHRcdHRleHRBbGlnbjogJ2NlbnRlcicsXG5cdFx0XHRwYWRkaW5nOiAnMC4yNXJlbSdcblx0XHR9LFxuXHRcdHNsaWNlOiB7XG5cdFx0XHRkaXNwbGF5OiAnaW5saW5lLWZsZXgnLFxuXHRcdFx0anVzdGlmeUNvbnRlbnQ6ICdjZW50ZXInLFxuXHRcdFx0YWxpZ25JdGVtczogJ2NlbnRlcicsXG5cdFx0XHR3aWR0aDogJzE0cmVtJyxcblx0XHRcdGhlaWdodDogJzEwMCUnXG5cdFx0fVxuXHR9O1xuXG5mdW5jdGlvbiBNZWFzdXJlVGV4dCh0ZXh0KSB7XG5cdHJldHVybiB0ZXh0Lmxlbmd0aCA/ICh0ZXh0Lmxlbmd0aCAqIDEuMSkgOiA1O1xufVxuXG5jbGFzcyBTbGljZUhlYWRlciBleHRlbmRzIFJlYWN0LkNvbXBvbmVudCB7XG5cdGNvbnN0cnVjdG9yKHByb3BzLCBjb250ZXh0KSB7XG5cdFx0c3VwZXIocHJvcHMsIGNvbnRleHQpO1xuXHRcdHRoaXMuc3RhdGUgPSB7XG5cdFx0XHR2YWx1ZTogcHJvcHMudmFsdWVcblx0XHR9O1xuXG5cdFx0QmluZCh0aGlzKTtcblx0fVxuXG5cdGNvbXBvbmVudFdpbGxSZWNlaXZlUHJvcHMocHJvcHMpIHtcblx0XHR0aGlzLnNldFN0YXRlKHt2YWx1ZTogcHJvcHMudmFsdWV9KTtcblx0fVxuXG5cdHNob3VsZENvbXBvbmVudFVwZGF0ZShwcm9wcywgc3RhdGUsIGNvbnRleHQpIHtcblx0XHRyZXR1cm4gKChzdGF0ZSAhPT0gdGhpcy5zdGF0ZSkgfHxcblx0XHRcdFx0KHByb3BzLnZhbHVlICE9PSB0aGlzLnByb3BzLnZhbHVlKSk7XG5cdH1cblxuXHRyZW5kZXIocHJvcHMsIHN0YXRlKSB7XG5cdFx0cmV0dXJuIChcblx0XHRcdDxkaXYgc3R5bGU9e1N0eWxlLnNsaWNlfT5cblx0XHRcdFx0PGlucHV0XG5cdFx0XHRcdFx0dHlwZT1cInRleHRcIlxuXHRcdFx0XHRcdHN0eWxlPXtTdHlsZS5zbGljZUhlYWRlcn1cblx0XHRcdFx0XHRtYXhMZW5ndGg9XCIyNFwiXG5cdFx0XHRcdFx0c2l6ZT17TWVhc3VyZVRleHQoc3RhdGUudmFsdWUpfVxuXHRcdFx0XHRcdHZhbHVlPXtzdGF0ZS52YWx1ZX1cblx0XHRcdFx0XHRwbGFjZWhvbGRlcj1cInRpbWVcIlxuXHRcdFx0XHRcdG9uaW5wdXQ9eyhldmVudCkgPT4gdGhpcy5zZXRTdGF0ZSh7dmFsdWU6IGV2ZW50LnRhcmdldC52YWx1ZX0pfVxuXHRcdFx0XHRcdG9uY2hhbmdlPXt0aGlzLm9uQ2hhbmdlfVxuXHRcdFx0XHQvPlxuXHRcdFx0PC9kaXY+XG5cdFx0KVxuXHR9XG5cblx0b25DaGFuZ2UoZXZlbnQpIHtcblx0XHR0aGlzLmNvbnRleHQuZG8oJ01PRElGWV9TTElDRV9EQVRFJywge1xuXHRcdFx0YXRJbmRleDogdGhpcy5wcm9wcy5pZCxcblx0XHRcdG5ld0RhdGU6IGV2ZW50LnRhcmdldC52YWx1ZVxuXHRcdH0pO1xuXHR9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gU2xpY2VIZWFkZXI7IiwiY29uc3Rcblx0UmVhY3QgPSByZXF1aXJlKCdwcmVhY3QnKSxcblxuXHROb3RlVmlldyA9IHJlcXVpcmUoJy4vTm90ZVZpZXcuanMnKSxcblxuXHRTdHlsZSA9IHtcblx0XHRzbGljZToge1xuXHRcdFx0ekluZGV4OiA5LFxuXHRcdFx0ZGlzcGxheTogJ2ZsZXgnLFxuXHRcdFx0ZmxleERpcmVjdGlvbjogJ2NvbHVtbicsXG5cdFx0XHRqdXN0aWZ5Q29udGVudDogJ2ZsZXgtc3RhcnQnLFxuXHRcdFx0YWxpZ25JdGVtczogJ2NlbnRlcicsXG5cdFx0XHRtYXJnaW46ICcwIDJyZW0nLFxuXHRcdFx0d2lkdGg6ICcxNHJlbSdcblx0XHR9LFxuXG5cdFx0c3BhY2U6IHtcblx0XHRcdGhlaWdodDogJzE0cmVtJyxcblx0XHRcdGRpc3BsYXk6ICdmbGV4Jyxcblx0XHRcdGp1c3RpZnlDb250ZW50OiAnY2VudGVyJyxcblx0XHRcdGFsaWduSXRlbXM6ICdmbGV4LWVuZCdcblx0XHR9LFxuXG5cdFx0YnV0dG9uOiB7XG5cdFx0XHRmb250U2l6ZTogJzAuOXJlbScsXG5cdFx0XHRjb2xvcjogJyNmZmYnLFxuXHRcdFx0Ym9yZGVyOiAnbm9uZScsXG5cdFx0XHRvdXRsaW5lOiAnbm9uZScsXG5cdFx0XHRjdXJzb3I6ICdwb2ludGVyJyxcblx0XHRcdHdpZHRoOiAnMS4zcmVtJyxcblx0XHRcdGhlaWdodDogJzEuMnJlbScsXG5cdFx0XHRiYWNrZ3JvdW5kQ29sb3I6ICdyZ2JhKDAsMCwwLDApJyxcblx0XHRcdHRleHRBbGlnbjogJ2NlbnRlcicsXG5cdFx0XHRtYXJnaW46ICcwIDFyZW0gMC40cmVtIDFyZW0nLFxuXHRcdFx0Ym9yZGVyUmFkaXVzOiAnMXJlbSdcblx0XHR9XG5cdH07XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24ocHJvcHMsIHN0YXRlKSB7XG5cdFxuXHRyZXR1cm4gKFxuXHRcdDxkaXYgc3R5bGU9e1N0eWxlLnNsaWNlfT5cblx0XHRcdHtwcm9wcy5zbGljZS5ub3Rlcy5tYXAoKG5vdGUsIGkpID0+IFxuXHRcdFx0XHQ8ZGl2IHN0eWxlPXtTdHlsZS5zcGFjZX0+XG5cdFx0XHRcdFx0eyhub3RlKSA/XG5cdFx0XHRcdFx0XHQ8Tm90ZVZpZXdcblx0XHRcdFx0XHRcdFx0c2xpY2VJbmRleD17cHJvcHMuaWR9XG5cdFx0XHRcdFx0XHRcdHNlbGVjdGVkPXsocHJvcHMuc2VsZWN0aW9uICYmIHByb3BzLnNlbGVjdGlvbi5ub3RlSW5kZXggPT09IGkpfVxuXHRcdFx0XHRcdFx0XHRub3RlSW5kZXg9e2l9XG5cdFx0XHRcdFx0XHRcdG5vdGU9e25vdGV9XG5cdFx0XHRcdFx0XHRcdHRocmVhZD17cHJvcHMudGhyZWFkc1tub3RlLnRocmVhZF19XG5cdFx0XHRcdFx0XHRcdG9uU2VsZWN0PXtwcm9wcy5vblNlbGVjdH1cblx0XHRcdFx0XHRcdFx0b25EZXNlbGVjdD17cHJvcHMub25EZXNlbGVjdH1cblx0XHRcdFx0XHRcdFx0b25FZGl0PXtwcm9wcy5lZGl0Tm90ZX1cblx0XHRcdFx0XHRcdFx0bW92ZU5vdGU9e3Byb3BzLm1vdmVOb3RlfVxuXHRcdFx0XHRcdFx0Lz5cblx0XHRcdFx0XHQ6XG5cdFx0XHRcdFx0XHQ8YnV0dG9uXG5cdFx0XHRcdFx0XHRcdHN0eWxlPXtTdHlsZS5idXR0b259XG5cdFx0XHRcdFx0XHRcdG9uY2xpY2s9eygpID0+IHRoaXMuY29udGV4dC5kbygnTkVXX05PVEUnLCB7XG5cdFx0XHRcdFx0XHRcdFx0c2xpY2VJbmRleDogcHJvcHMuaWQsXG5cdFx0XHRcdFx0XHRcdFx0bm90ZUluZGV4OiBpXG5cdFx0XHRcdFx0XHRcdH0pfVxuXHRcdFx0XHRcdFx0Pis8L2J1dHRvbj5cblx0XHRcdFx0XHR9XG5cdFx0XHRcdDwvZGl2PlxuXHRcdFx0KX1cblx0XHQ8L2Rpdj5cblx0KVxufVxuIiwiY29uc3Rcblx0UmVhY3QgPSByZXF1aXJlKCdwcmVhY3QnKSxcblxuXHRTdHlsZSA9IHtcblx0XHRlZGl0b3I6IHtcblx0XHRcdGZvbnRTaXplOiAnMC45cmVtJyxcblx0XHRcdHBhZGRpbmc6ICcwLjVyZW0nLFxuXHRcdFx0aGVpZ2h0OiAnMXJlbScsXG5cdFx0XHRib3JkZXI6ICdub25lJyxcblx0XHRcdG91dGxpbmU6ICdub25lJyxcblx0XHRcdGJhY2tncm91bmQ6ICdyZ2JhKDAsMCwwLDApJyxcblx0XHRcdGNvbG9yOiAnI2ZmZidcblx0XHR9XG5cdH07XG5cbmZ1bmN0aW9uIE1lYXN1cmVUZXh0KHRleHQpIHtcblx0cmV0dXJuIHRleHQubGVuZ3RoID8gKHRleHQubGVuZ3RoICogMS4xKSA6IDU7XG59XG5cbmNsYXNzIFRocmVhZExhYmVsIGV4dGVuZHMgUmVhY3QuQ29tcG9uZW50IHtcblx0Y29uc3RydWN0b3IocHJvcHMsIGNvbnRleHQpIHtcblx0XHRzdXBlcihwcm9wcywgY29udGV4dCk7XG5cblx0XHR0aGlzLnN0YXRlID0ge1xuXHRcdFx0dmFsdWU6IHByb3BzLnZhbHVlXG5cdFx0fVxuXHR9XG5cblx0Y29tcG9uZW50V2lsbFJlY2VpdmVQcm9wcyhwcm9wcykge1xuXHRcdHRoaXMuc2V0U3RhdGUoe3ZhbHVlOiBwcm9wcy52YWx1ZX0pO1xuXHR9XG5cblx0cmVuZGVyKHByb3BzLCBzdGF0ZSwgY29udGV4dCkge1xuXHRcdHJldHVybiAoXG5cdFx0XHQ8aW5wdXRcblx0XHRcdFx0dHlwZT1cInRleHRcIlxuXHRcdFx0XHRzdHlsZT17cHJvcHMuc3R5bGUgPyBPYmplY3QuYXNzaWduKHt9LCBTdHlsZS5lZGl0b3IsIHByb3BzLnN0eWxlKSA6IFN0eWxlLmVkaXRvcn1cblx0XHRcdFx0bWF4TGVuZ3RoPVwiNTBcIlxuXHRcdFx0XHRzaXplPXsyMH1cblx0XHRcdFx0dmFsdWU9e3N0YXRlLnZhbHVlfVxuXHRcdFx0XHRwbGFjZWhvbGRlcj1cInRocmVhZFwiXG5cdFx0XHRcdG9uSW5wdXQ9eyhldmVudCkgPT4gdGhpcy5zZXRTdGF0ZSh7dmFsdWU6IGV2ZW50LnRhcmdldC52YWx1ZX0pfVxuXHRcdFx0XHRvbkNoYW5nZT17cHJvcHMub25DaGFuZ2V9XG5cdFx0XHQvPlxuXHRcdCk7XG5cdH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBUaHJlYWRMYWJlbDsiLCJjb25zdFxuXHRSZWFjdCA9IHJlcXVpcmUoJ3ByZWFjdCcpLFxuXG5cdFN0eWxlID0ge1xuXHRcdG91dGVyOiB7XG5cdFx0XHR6SW5kZXg6ICctNScsXG5cdFx0XHRwb3NpdGlvbjogJ2Fic29sdXRlJyxcblx0XHRcdGxlZnQ6ICc3cmVtJyxcblx0XHRcdHRvcDogJzIuNXJlbScsXG5cdFx0XHRtaW5XaWR0aDogJzEwMHZ3Jyxcblx0XHRcdG1pbkhlaWdodDogJzEwMHZoJ1xuXHRcdH0sXG5cdFx0aW5uZXI6IHtcblx0XHRcdHBvc2l0aW9uOiAnYWJzb2x1dGUnLFxuXHRcdFx0dG9wOiAnMnJlbScsXG5cdFx0XHRsZWZ0OiAwLFxuXHRcdFx0d2lkdGg6ICcxMDAlJyxcblx0XHRcdGhlaWdodDogJzEwMCUnXG5cdFx0fSxcblx0XHRsb2NhdGlvbjoge1xuXHRcdFx0bWFyZ2luOiAnMTJyZW0gMCcsXG5cdFx0XHRoZWlnaHQ6ICcycmVtJyxcblx0XHRcdGJhY2tncm91bmRDb2xvcjogJyM0NDQ0NDQnXG5cdFx0fSxcblx0XHRzbGljZToge1xuXHRcdFx0ZGlzcGxheTogJ2lubGluZS1ibG9jaycsXG5cdFx0XHRtYXJnaW46ICcwIDguOTM3NXJlbScsXG5cdFx0XHR3aWR0aDogJzAuMTI1cmVtJyxcblx0XHRcdGhlaWdodDogJzEwMCUnLFxuXHRcdFx0YmFja2dyb3VuZENvbG9yOiAnIzQ0NDQ0NCdcblx0XHR9XG5cdH07XG5cblxuY2xhc3MgV2VhdmVCYWNrZ3JvdW5kIGV4dGVuZHMgUmVhY3QuQ29tcG9uZW50IHtcblx0Y29uc3RydWN0b3IocHJvcHMsIGNvbnRleHQpIHtcblx0XHRzdXBlcihwcm9wcywgY29udGV4dCk7XG5cdH1cblxuXHRzaG91bGRDb21wb25lbnRVcGRhdGUocHJvcHMsIHN0YXRlLCBjb250ZXh0KSB7XG5cdFx0cmV0dXJuICgocHJvcHMubWVudU9mZnNldCAhPT0gdGhpcy5wcm9wcy5tZW51T2Zmc2V0KSB8fFxuXHRcdFx0XHQocHJvcHMubG9jYXRpb25zICE9PSB0aGlzLnByb3BzLmxvY2F0aW9ucykgfHxcblx0XHRcdFx0KHByb3BzLnNjZW5lcyAhPT0gdGhpcy5wcm9wcy5zY2VuZXMpKTtcblx0fVxuXG5cdHJlbmRlcihwcm9wcywgc3RhdGUpIHtcblx0XHRyZXR1cm4gKFxuXHRcdFx0PGRpdlxuXHRcdFx0XHRkYXRhLWlzPVwiV2VhdmVCYWNrZ3JvdW5kXCJcblx0XHRcdFx0c3R5bGU9e09iamVjdC5hc3NpZ24oe30sIFN0eWxlLm91dGVyLCB7XG5cdFx0XHRcdFx0dG9wOiBwcm9wcy5tZW51T2Zmc2V0LFxuXHRcdFx0XHRcdHdpZHRoOiAocHJvcHMuc2NlbmVzICogMTggKyAyKSArICdyZW0nLFxuXHRcdFx0XHRcdGhlaWdodDogKHByb3BzLmxvY2F0aW9ucyAqIDE0ICsgMTYpICsgJ3JlbSdcblx0XHRcdFx0fSl9XG5cdFx0XHQ+XG5cdFx0XHRcdDxkaXYgc3R5bGU9e1N0eWxlLmlubmVyfT5cblx0XHRcdFx0XHR7QXJyYXkocHJvcHMubG9jYXRpb25zKS5maWxsKDApLm1hcCgodiwgaSkgPT4gPGRpdiBzdHlsZT17U3R5bGUubG9jYXRpb259PiZuYnNwOzwvZGl2Pil9XG5cdFx0XHRcdDwvZGl2PlxuXHRcdFx0XHQ8ZGl2IHN0eWxlPXtTdHlsZS5pbm5lcn0+XG5cdFx0XHRcdFx0e0FycmF5KHByb3BzLnNjZW5lcykuZmlsbCgwKS5tYXAoKHYsIGkpID0+IDxkaXYgc3R5bGU9e1N0eWxlLnNsaWNlfT4mbmJzcDs8L2Rpdj4pfVxuXHRcdFx0XHQ8L2Rpdj5cblx0XHRcdDwvZGl2PlxuXHRcdClcblx0fVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFdlYXZlQmFja2dyb3VuZDsiLCJjb25zdFxuXHRSZWFjdCA9IHJlcXVpcmUoJ3ByZWFjdCcpLFxuXG5cdExvY2F0aW9uSGVhZGVyID0gcmVxdWlyZSgnLi9Mb2NhdGlvbkhlYWRlci5qcycpLFxuXHRTbGljZUhlYWRlciA9IHJlcXVpcmUoJy4vU2xpY2VIZWFkZXIuanMnKSxcblxuXHRTdHlsZSA9IHtcblx0XHRvdXRlcjoge1xuXHRcdFx0cG9zaXRpb246ICdhYnNvbHV0ZScsXG5cdFx0XHRsZWZ0OiAwLFxuXHRcdFx0bWluV2lkdGg6ICcxMDB2dycsXG5cdFx0XHRtaW5IZWlnaHQ6ICcxMDB2aCdcblx0XHR9LFxuXHRcdGxvY2F0aW9uczoge1xuXHRcdFx0cG9zaXRpb246ICdhYnNvbHV0ZScsXG5cdFx0XHR0b3A6IDAsXG5cdFx0XHR3aWR0aDogJzdyZW0nLFxuXHRcdFx0bWluSGVpZ2h0OiAnMTAwdmgnLFxuXHRcdFx0cGFkZGluZ1RvcDogJzJyZW0nXG5cdFx0fSxcblx0XHRzY2VuZXM6IHtcblx0XHRcdHpJbmRleDogJzExJyxcblx0XHRcdHBvc2l0aW9uOiAnYWJzb2x1dGUnLFxuXHRcdFx0YmFja2dyb3VuZENvbG9yOiBcIiMxMTFcIixcblx0XHRcdGxlZnQ6IDAsXG5cdFx0XHRoZWlnaHQ6ICcycmVtJyxcblx0XHRcdHBhZGRpbmdMZWZ0OiAnN3JlbScsXG5cdFx0XHRtaW5XaWR0aDogJzEwMHZ3J1xuXHRcdH0sXG5cdFx0bG9jYXRpb246IHtcblx0XHRcdGRpc3BsYXk6ICdmbGV4Jyxcblx0XHRcdGZsZXhEaXJlY3Rpb246ICdjb2x1bW4nLFxuXHRcdFx0anVzdGlmeUNvbnRlbnQ6ICdmbGV4LWVuZCcsXG5cdFx0XHRoZWlnaHQ6ICcxNHJlbScsXG5cdFx0fSxcblx0XHRzbGljZUJ1dHRvbjoge1xuXHRcdFx0bWFyZ2luOiAnMCAxLjM3NXJlbScsXG5cdFx0XHRmb250U2l6ZTogJzAuOXJlbScsXG5cdFx0XHRjb2xvcjogJyNmZmYnLFxuXHRcdFx0Ym9yZGVyOiAnbm9uZScsXG5cdFx0XHRvdXRsaW5lOiAnbm9uZScsXG5cdFx0XHRjdXJzb3I6ICdwb2ludGVyJyxcblx0XHRcdHdpZHRoOiAnMS4yNXJlbScsXG5cdFx0XHRoZWlnaHQ6ICcxLjI1cmVtJyxcblx0XHRcdHRleHRBbGlnbjogJ2NlbnRlcicsXG5cdFx0XHRib3JkZXJSYWRpdXM6ICcxcmVtJyxcblx0XHRcdGJhY2tncm91bmRDb2xvcjogJ3JnYmEoMCwwLDAsMCknXG5cdFx0fSxcblx0XHRmaXJzdFNsaWNlQnV0dG9uOiB7XG5cdFx0XHRtYXJnaW46ICcwIDAuMzc1cmVtJyxcblx0XHRcdGZvbnRTaXplOiAnMC45cmVtJyxcblx0XHRcdGNvbG9yOiAnI2ZmZicsXG5cdFx0XHRib3JkZXI6ICdub25lJyxcblx0XHRcdG91dGxpbmU6ICdub25lJyxcblx0XHRcdGN1cnNvcjogJ3BvaW50ZXInLFxuXHRcdFx0d2lkdGg6ICcxLjI1cmVtJyxcblx0XHRcdGhlaWdodDogJzEuMjVyZW0nLFxuXHRcdFx0dGV4dEFsaWduOiAnY2VudGVyJyxcblx0XHRcdGJvcmRlclJhZGl1czogJzFyZW0nLFxuXHRcdFx0YmFja2dyb3VuZENvbG9yOiAncmdiYSgwLDAsMCwwKSdcblx0XHR9LFxuXHRcdHRocmVhZEJ0bjoge1xuXHRcdFx0aGVpZ2h0OiAnMnJlbScsXG5cdFx0XHRmb250U2l6ZTogJzAuOXJlbScsXG5cdFx0XHRjb2xvcjogJyNmZmYnLFxuXHRcdFx0Ym9yZGVyOiAnbm9uZScsXG5cdFx0XHRvdXRsaW5lOiAnbm9uZScsXG5cdFx0XHRjdXJzb3I6ICdwb2ludGVyJyxcblx0XHRcdHRleHRBbGlnbjogJ2NlbnRlcicsXG5cdFx0XHRwYWRkaW5nOiAnMC41cmVtIDAuNXJlbScsXG5cdFx0XHRiYWNrZ3JvdW5kQ29sb3I6ICdyZ2JhKDAsMCwwLDApJyxcblx0XHRcdHdpZHRoOiAnMTAwJSdcblx0XHR9XG5cdH07XG5cblxuY2xhc3MgV2VhdmVIZWFkZXJzIGV4dGVuZHMgUmVhY3QuQ29tcG9uZW50IHtcblx0Y29uc3RydWN0b3IocHJvcHMsIGNvbnRleHQpIHtcblx0XHRzdXBlcihwcm9wcywgY29udGV4dCk7XG5cblx0XHR0aGlzLnN0YXRlID0ge1xuXHRcdFx0eDogMCxcblx0XHRcdHk6IDBcblx0XHR9XG5cblx0XHR0aGlzLm9uU2Nyb2xsID0gdGhpcy5vblNjcm9sbC5iaW5kKHRoaXMpO1xuXHR9XG5cblx0Y29tcG9uZW50RGlkTW91bnQoKSB7XG5cdFx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Njcm9sbCcsIHRoaXMub25TY3JvbGwpO1xuXHR9XG5cblx0Y29tcG9uZW50V2lsbFVubW91bnQoKSB7XG5cdFx0d2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3Njcm9sbCcsIHRoaXMub25TY3JvbGwpO1xuXHR9XG5cblx0c2hvdWxkQ29tcG9uZW50VXBkYXRlKHByb3BzLCBzdGF0ZSwgY29udGV4dCkge1xuXHRcdHJldHVybiAoKHN0YXRlLnggIT09IHRoaXMuc3RhdGUueCkgfHxcblx0XHRcdFx0KHN0YXRlLnkgIT09IHRoaXMuc3RhdGUueSkgfHxcblx0XHRcdFx0KHByb3BzLnNjZW5lcyAhPT0gdGhpcy5wcm9wcy5zY2VuZXMpIHx8XG5cdFx0XHRcdChwcm9wcy5sb2NhdGlvbnMgIT09IHRoaXMucHJvcHMubG9jYXRpb25zKSB8fFxuXHRcdFx0XHQocHJvcHMud2luZG93V2lkdGggIT09IHRoaXMucHJvcHMud2luZG93V2lkdGgpKTtcblx0fVxuXG5cdHJlbmRlcihwcm9wcywgc3RhdGUpIHtcblx0XHRyZXR1cm4gKFxuXHRcdFx0PGRpdlxuXHRcdFx0XHRkYXRhLWlzPVwiV2VhdmVIZWFkZXJzXCJcblx0XHRcdFx0c3R5bGU9e09iamVjdC5hc3NpZ24oe30sIFN0eWxlLm91dGVyLCBzdGF0ZS5zdHlsZSl9XG5cdFx0XHQ+XG5cdFx0XHRcdDxkaXZcblx0XHRcdFx0XHRkYXRhLWlzPVwiU2xpY2VIZWFkZXJzXCJcblx0XHRcdFx0XHRzdHlsZT17T2JqZWN0LmFzc2lnbih7fSwgU3R5bGUuc2NlbmVzLCB7IHRvcDogc3RhdGUueSwgd2lkdGg6ICgocHJvcHMuc2NlbmVzLmxlbmd0aCoxOCArIDIpICsgJ3JlbScpICB9KX1cblx0XHRcdFx0PlxuXHRcdFx0XHRcdHtbXG5cdFx0XHRcdFx0XHQ8YnV0dG9uXG5cdFx0XHRcdFx0XHRcdG9uY2xpY2s9eyhldmVudCkgPT4gdGhpcy5jb250ZXh0LmRvKCdORVdfU0xJQ0UnLCB7YXRJbmRleDogMH0pfVxuXHRcdFx0XHRcdFx0XHRzdHlsZT17U3R5bGUuZmlyc3RTbGljZUJ1dHRvbn1cblx0XHRcdFx0XHRcdFx0b25tb3VzZWVudGVyPXtlID0+IGUudGFyZ2V0LnN0eWxlLmJhY2tncm91bmRDb2xvciA9ICdyZ2JhKDI1NSwyNTUsMjU1LDAuMiknfVxuXHRcdFx0XHRcdFx0XHRvbm1vdXNlbGVhdmU9e2UgPT4gZS50YXJnZXQuc3R5bGUuYmFja2dyb3VuZENvbG9yID0gJ3JnYmEoMCwwLDAsMCknfVxuXHRcdFx0XHRcdFx0Pis8L2J1dHRvbj5cblx0XHRcdFx0XHRdLmNvbmNhdChwcm9wcy5zY2VuZXMubWFwKChzbGljZSwgaSkgPT4gXG5cdFx0XHRcdFx0XHQ8ZGl2IHN0eWxlPXt7ZGlzcGxheTogJ2lubGluZScsIHdpZHRoOiAnMThyZW0nfX0+XG5cdFx0XHRcdFx0XHRcdDxTbGljZUhlYWRlclxuXHRcdFx0XHRcdFx0XHRcdGlkPXtpfVxuXHRcdFx0XHRcdFx0XHRcdHZhbHVlPXtzbGljZS5kYXRldGltZX1cblx0XHRcdFx0XHRcdFx0Lz5cblx0XHRcdFx0XHRcdFx0PGJ1dHRvblxuXHRcdFx0XHRcdFx0XHRcdG9uY2xpY2s9eyhldmVudCkgPT4gdGhpcy5jb250ZXh0LmRvKCdORVdfU0xJQ0UnLCB7YXRJbmRleDogaSsxfSl9XG5cdFx0XHRcdFx0XHRcdFx0c3R5bGU9e1N0eWxlLnNsaWNlQnV0dG9ufVxuXHRcdFx0XHRcdFx0XHRcdG9ubW91c2VlbnRlcj17ZSA9PiBlLnRhcmdldC5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSAncmdiYSgyNTUsMjU1LDI1NSwwLjIpJ31cblx0XHRcdFx0XHRcdFx0XHRvbm1vdXNlbGVhdmU9e2UgPT4gZS50YXJnZXQuc3R5bGUuYmFja2dyb3VuZENvbG9yID0gJ3JnYmEoMCwwLDAsMCknfVxuXHRcdFx0XHRcdFx0XHQ+KzwvYnV0dG9uPlxuXHRcdFx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcdFx0KSl9XG5cdFx0XHRcdDwvZGl2PlxuXHRcdFx0XHQ8ZGl2IFxuXHRcdFx0XHRcdGRhdGEtaXM9XCJMb2NhdGlvbkhlYWRlcnNcIlxuXHRcdFx0XHRcdHN0eWxlPXtPYmplY3QuYXNzaWduKHt9LCBTdHlsZS5sb2NhdGlvbnMsIHtcblx0XHRcdFx0XHRcdGxlZnQ6IHN0YXRlLngsXG5cdFx0XHRcdFx0XHRoZWlnaHQ6ICgocHJvcHMubG9jYXRpb25zLmxlbmd0aCoxNCArIDE2KSArICdyZW0nKSxcblx0XHRcdFx0XHRcdGJhY2tncm91bmRDb2xvcjogKHByb3BzLndpbmRvd1dpZHRoIDwgNzAwKSA/ICdyZ2JhKDAsMCwwLDApJyA6ICcjMTExJyxcblx0XHRcdFx0XHRcdHpJbmRleDogKHByb3BzLndpbmRvd1dpZHRoIDwgNzAwKSA/IDggOiAxMCB9KX1cblx0XHRcdFx0PlxuXHRcdFx0XHRcdHsoKHByb3BzLmxvY2F0aW9ucy5tYXAoKGxvY2F0aW9uLCBpKSA9PlxuXHRcdFx0XHRcdFx0PGRpdiBzdHlsZT17U3R5bGUubG9jYXRpb259PlxuXHRcdFx0XHRcdFx0XHQ8TG9jYXRpb25IZWFkZXJcblx0XHRcdFx0XHRcdFx0XHRpZD17aX1cblx0XHRcdFx0XHRcdFx0XHR2YWx1ZT17bG9jYXRpb259XG5cdFx0XHRcdFx0XHRcdC8+XG5cdFx0XHRcdFx0XHQ8L2Rpdj5cblx0XHRcdFx0XHQpKS5jb25jYXQoXG5cdFx0XHRcdFx0XHRbPGRpdiBzdHlsZT17U3R5bGUubG9jYXRpb259PlxuXHRcdFx0XHRcdFx0XHQ8YnV0dG9uXG5cdFx0XHRcdFx0XHRcdFx0b25jbGljaz17KGV2ZW50KSA9PiB0aGlzLmNvbnRleHQuZG8oJ05FV19MT0NBVElPTicpfVxuXHRcdFx0XHRcdFx0XHRcdHN0eWxlPXtTdHlsZS50aHJlYWRCdG59XG5cdFx0XHRcdFx0XHRcdFx0b25tb3VzZWVudGVyPXtlID0+IGUudGFyZ2V0LnN0eWxlLmJhY2tncm91bmRDb2xvciA9ICdyZ2JhKDI1NSwyNTUsMjU1LDAuMiknfVxuXHRcdFx0XHRcdFx0XHRcdG9ubW91c2VsZWF2ZT17ZSA9PiBlLnRhcmdldC5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSAncmdiYSgwLDAsMCwwKSd9XG5cdFx0XHRcdFx0XHRcdD4rPC9idXR0b24+XG5cdFx0XHRcdFx0XHQ8L2Rpdj5dXG5cdFx0XHRcdFx0KSl9XG5cdFx0XHRcdDwvZGl2PlxuXHRcdFx0PC9kaXY+XG5cdFx0KVxuXHR9XG5cblx0b25TY3JvbGwoKSB7XG5cdFx0dGhpcy5zZXRTdGF0ZSh7XG5cdFx0XHR4OiBkb2N1bWVudC5ib2R5LnNjcm9sbExlZnQsXG5cdFx0XHR5OiBkb2N1bWVudC5ib2R5LnNjcm9sbFRvcFxuXHRcdH0pO1xuXHR9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gV2VhdmVIZWFkZXJzOyIsImNvbnN0XG5cdFJlYWN0ID0gcmVxdWlyZSgncHJlYWN0JyksXG5cblx0QmluZCA9IHJlcXVpcmUoJy4uL2JpbmQuanMnKSxcblxuXHRTbGljZVZpZXcgPSByZXF1aXJlKCcuL1NsaWNlVmlldy5qcycpLFxuXHRXZWF2ZUhlYWRlcnMgPSByZXF1aXJlKCcuL1dlYXZlSGVhZGVycy5qcycpLFxuXHRXZWF2ZUJhY2tncm91bmQgPSByZXF1aXJlKCcuL1dlYXZlQmFja2dyb3VuZC5qcycpLFxuXHRBcHBNZW51ID0gcmVxdWlyZSgnLi9BcHBNZW51LmpzJyksXG5cblx0U3R5bGUgPSB7XG5cdFx0d2VhdmU6IHtcblx0XHRcdG1hcmdpbkxlZnQ6ICc3cmVtJyxcblx0XHRcdGRpc3BsYXk6ICdpbmxpbmUtZmxleCdcblx0XHR9LFxuXHRcdHNjZW5lczoge1xuXHRcdFx0bWFyZ2luVG9wOiAnMnJlbScsXG5cdFx0XHRkaXNwbGF5OiAnZmxleCcsXG5cdFx0XHRqdXN0aWZ5Q29udGVudDogJ2ZsZXgtc3RhcnQnLFxuXHRcdFx0YWxpZ25JdGVtczogJ2ZsZXgtc3RhcnQnXG5cdFx0fVxuXHR9O1xuIFxuY2xhc3MgV2VhdmVWaWV3IGV4dGVuZHMgUmVhY3QuQ29tcG9uZW50IHtcblx0Y29uc3RydWN0b3IocHJvcHMsIGNvbnRleHQpIHtcblx0XHRzdXBlcihwcm9wcywgY29udGV4dCk7XG5cblx0XHR0aGlzLnN0YXRlID0ge1xuXHRcdFx0c2VsZWN0aW9uOiBudWxsXG5cdFx0fVxuXG5cdFx0dGhpcy5hbGxvd0Rlc2VsZWN0ID0gdHJ1ZTtcblxuXHRcdEJpbmQodGhpcyk7XG5cdH1cblxuXHRyZW5kZXIocHJvcHMsIHN0YXRlKSB7XG5cdFx0cmV0dXJuIChcblx0XHRcdDxkaXZcblx0XHRcdFx0ZGF0YS1pcz1cIldlYXZlVmlld1wiXG5cdFx0XHRcdHN0eWxlPXtPYmplY3QuYXNzaWduKHttYXJnaW5Ub3A6IHByb3BzLm1lbnVPZmZzZXR9LCBTdHlsZS53ZWF2ZSl9XG5cdFx0XHRcdG9uY2xpY2s9e3RoaXMub25EZXNlbGVjdH1cblx0XHRcdD5cblx0XHRcdFx0PFdlYXZlSGVhZGVyc1xuXHRcdFx0XHRcdHNjZW5lcz17cHJvcHMuc2NlbmVzfVxuXHRcdFx0XHRcdGxvY2F0aW9ucz17cHJvcHMubG9jYXRpb25zfVxuXHRcdFx0XHRcdHdpbmRvd1dpZHRoPXtwcm9wcy53aW5kb3dXaWR0aH1cblx0XHRcdFx0Lz5cblx0XHRcdFx0PFdlYXZlQmFja2dyb3VuZFxuXHRcdFx0XHRcdHNjZW5lcz17cHJvcHMuc2NlbmVzLmxlbmd0aH1cblx0XHRcdFx0XHRsb2NhdGlvbnM9e3Byb3BzLmxvY2F0aW9ucy5sZW5ndGh9XG5cdFx0XHRcdFx0bWVudU9mZnNldD17cHJvcHMubWVudU9mZnNldH1cblx0XHRcdFx0Lz5cblx0XHRcdFx0PGRpdiBkYXRhLWlzPVwiV2VhdmVcIiBzdHlsZT17U3R5bGUuc2NlbmVzfT5cblx0XHRcdFx0XHR7cHJvcHMuc2NlbmVzLm1hcCgoc2xpY2UsIGkpID0+XG5cdFx0XHRcdFx0XHQ8U2xpY2VWaWV3XG5cdFx0XHRcdFx0XHRcdGlkPXtpfVxuXHRcdFx0XHRcdFx0XHRzZWxlY3Rpb249eyhzdGF0ZS5zZWxlY3Rpb24gJiYgc3RhdGUuc2VsZWN0aW9uLnNsaWNlSW5kZXggPT09IGkpID8gc3RhdGUuc2VsZWN0aW9uIDogbnVsbH1cblx0XHRcdFx0XHRcdFx0c2xpY2U9e3NsaWNlfVxuXHRcdFx0XHRcdFx0XHR0aHJlYWRzPXtwcm9wcy50aHJlYWRzfVxuXHRcdFx0XHRcdFx0XHRvblNlbGVjdD17dGhpcy5vblNlbGVjdH1cblx0XHRcdFx0XHRcdFx0b25EZXNlbGVjdD17dGhpcy5vbkRlc2VsZWN0fVxuXHRcdFx0XHRcdFx0XHRlZGl0Tm90ZT17cHJvcHMuZWRpdE5vdGV9XG5cdFx0XHRcdFx0XHRcdG1vdmVOb3RlPXt0aGlzLm1vdmVOb3RlfVxuXHRcdFx0XHRcdFx0Lz5cblx0XHRcdFx0XHQpfVxuXHRcdFx0XHQ8L2Rpdj5cblx0XHRcdDwvZGl2PlxuXHRcdClcblx0fVxuXG5cdG9uU2VsZWN0KGNvb3JkcywgaSkge1xuXHRcdHRoaXMuc2V0U3RhdGUoe3NlbGVjdGlvbjogY29vcmRzfSk7XG5cdFx0Ly90aGlzLmFjdGl2ZU5vdGVNZW51KCk7XG5cdH1cblxuXHRvbkRlc2VsZWN0KGV2ZW50KSB7XG5cdFx0dGhpcy5ub3RlRGVzZWxlY3RlZCgpO1xuXHR9XG5cblx0bm90ZURlc2VsZWN0ZWQoKSB7XG5cdFx0aWYgKHRoaXMuYWxsb3dEZXNlbGVjdCkge1xuXHRcdFx0dGhpcy5zZXRTdGF0ZSh7c2VsZWN0aW9uOiBudWxsfSk7XG5cdFx0fVxuXHR9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gV2VhdmVWaWV3OyIsIi8vIE9iamVjdC5hc3NpZ24gUE9MWUZJTExcbi8vIHNvdXJjZTogaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvSmF2YVNjcmlwdC9SZWZlcmVuY2UvR2xvYmFsX09iamVjdHMvT2JqZWN0L2Fzc2lnbiNQb2x5ZmlsbFxuLy9cbmlmICh0eXBlb2YgT2JqZWN0LmFzc2lnbiAhPSAnZnVuY3Rpb24nKSB7XG5cdE9iamVjdC5hc3NpZ24gPSBmdW5jdGlvbih0YXJnZXQsIHZhckFyZ3MpIHsgLy8gLmxlbmd0aCBvZiBmdW5jdGlvbiBpcyAyXG5cdFx0J3VzZSBzdHJpY3QnO1xuXHRcdGlmICh0YXJnZXQgPT0gbnVsbCkgeyAvLyBUeXBlRXJyb3IgaWYgdW5kZWZpbmVkIG9yIG51bGxcblx0XHRcdHRocm93IG5ldyBUeXBlRXJyb3IoJ0Nhbm5vdCBjb252ZXJ0IHVuZGVmaW5lZCBvciBudWxsIHRvIG9iamVjdCcpO1xuXHRcdH1cblxuXHRcdHZhciB0byA9IE9iamVjdCh0YXJnZXQpO1xuXG5cdFx0Zm9yICh2YXIgaW5kZXggPSAxOyBpbmRleCA8IGFyZ3VtZW50cy5sZW5ndGg7IGluZGV4KyspIHtcblx0XHRcdHZhciBuZXh0U291cmNlID0gYXJndW1lbnRzW2luZGV4XTtcblxuXHRcdFx0aWYgKG5leHRTb3VyY2UgIT0gbnVsbCkgeyAvLyBTa2lwIG92ZXIgaWYgdW5kZWZpbmVkIG9yIG51bGxcblx0XHRcdFx0Zm9yICh2YXIgbmV4dEtleSBpbiBuZXh0U291cmNlKSB7XG5cdFx0XHRcdFx0Ly8gQXZvaWQgYnVncyB3aGVuIGhhc093blByb3BlcnR5IGlzIHNoYWRvd2VkXG5cdFx0XHRcdFx0aWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChuZXh0U291cmNlLCBuZXh0S2V5KSkge1xuXHRcdFx0XHRcdFx0dG9bbmV4dEtleV0gPSBuZXh0U291cmNlW25leHRLZXldO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gdG87XG5cdH07XG59Il19
