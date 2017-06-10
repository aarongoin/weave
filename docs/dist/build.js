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
    PrintModal = require('./components/PrintModal.js'),
    WeaveView = require('./components/WeaveView.js'),
    SceneWriter = require('./components/SceneWriter.js'),
    Colors = require('./colors.js'),
    Bind = require('./bind.js'),
    LZW = require('lz-string'),
    Source = require('./Sourcery.js'),
    Actions = require('./actions.js'),
    Style = {
	app: 'width: 100vw;'
};

var App = function (_React$Component) {
	_inherits(App, _React$Component);

	function App(props, context) {
		_classCallCheck(this, App);

		var _this = _possibleConstructorReturn(this, (App.__proto__ || Object.getPrototypeOf(App)).call(this, props, context));

		_this.state = {

			isEditing: false,
			isPrinting: false,
			targetNote: undefined,
			sceneCoords: undefined,

			project: Source.getLocal('weave-project')
		};

		if (_this.state.project) _this.state.project = JSON.parse(LZW.decompressFromUTF16(_this.state.project));else _this.state.project = {
			title: 'Welcome to Weave',
			author: 'Aaron Goin',
			wordCount: 4,
			sceneCount: 1,
			slices: [{ datetime: '1999-10-26', scenes: [{ head: 'Introduction to Weave', body: 'Welcome to Weave!', wc: 4, location: 'Bedroom' }] }],
			threads: [{ name: 'Harry Potter', color: Colors.random() }],
			headers: ['']
		};

		Bind(_this);
		return _this;
	}

	_createClass(App, [{
		key: 'countProject',
		value: function countProject() {
			return {
				wordCount: this.state.project.slices.reduce(function (wc, slice) {
					return wc + slice.scenes.reduce(function (wc, scene) {
						return scene ? wc + scene.wc : wc;
					}, 0);
				}, 0),
				sceneCount: this.state.project.slices.reduce(function (scenes, slice) {
					return scenes + slice.scenes.reduce(function (scenes, scene) {
						return scene ? scenes + 1 : scenes;
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

			return React.createElement('div', { id: 'app', style: Style.app }, React.createElement(FileOpener, {
				ref: function ref(el) {
					return _this2.FileOpener = el.base;
				},
				onChange: this.openProject
			}), state.isEditing ? React.createElement(SceneWriter, {
				scene: state.targetNote,
				coords: state.sceneCoords,
				thread: state.project.threads[state.sceneCoords.sceneIndex],
				onDone: this.onDone
			}) : React.createElement(WeaveView, {
				project: this.state.project,
				editNote: this.editNote,
				windowWidth: window.innerWidth,
				projectFuncs: {
					onTitleChange: function onTitleChange(event) {
						_this2.state.project.title = event.target.value;
						_this2.forceUpdate();
						_this2.saveProject();
					},
					onAuthorChange: function onAuthorChange(event) {
						_this2.state.project.author = event.target.value;
						_this2.forceUpdate();
						_this2.saveProject();
					},
					import: this.importProject,
					export: this.exportProject,
					print: function print() {
						return _this2.setState({ isPrinting: true });
					},
					delete: this.delete
				}
			}), state.isPrinting ? React.createElement(PrintModal, {
				slices: state.project.slices,
				threads: state.project.threads,
				headers: state.project.headers,
				cancel: function cancel() {
					return _this2.setState({ isPrinting: false });
				},
				print: this.print
			}) : '');
		}
	}, {
		key: 'editNote',
		value: function editNote(coords) {
			this.setState({
				isEditing: true,
				sceneCoords: coords,
				targetNote: this.state.project.slices[coords.sliceIndex].scenes[coords.sceneIndex]
			});
		}
	}, {
		key: 'importProject',
		value: function importProject() {
			this.FileOpener.click();
		}
	}, {
		key: 'exportProject',
		value: function exportProject() {
			FileSaver.saveAs(new Blob([JSON.stringify(this.state.project)], { type: "text/plain;charset=utf-8" }), this.state.project.title + '.weave');
		}
	}, {
		key: 'print',
		value: function print(printList) {
			var text,
			    slices = this.state.project.slices;
			this.setState({ printing: false });

			text = printList.reduce(function (body, item) {
				if (item.body) return body + '\n\n' + item.body + '\n';else return body + '\n\n\n' + item.values[0] + '\n';
			}, this.state.project.title + '\n');

			FileSaver.saveAs(new Blob([text], { type: "text/plain;charset=utf-8" }), this.state.project.title + '_' + new Date().toString() + '.txt');
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
				sceneCoords: null,
				isEditing: false
			});
		}
	}, {
		key: 'do',
		value: function _do(action, data) {
			this.state.project = Actions[action](data, this.state.project);
			this.state.project = Object.assign({}, this.state.project, this.countProject());
			this.forceUpdate();
			this.save();
		}
	}, {
		key: 'delete',
		value: function _delete() {
			this.setState({
				project: {
					title: '',
					author: '',
					wordCount: 0,
					sceneCount: 0,
					slices: [],
					threads: [],
					headers: []
				}
			});
			this.save();
		}
	}, {
		key: 'openProject',
		value: function openProject(data) {
			data = JSON.parse(data);
			this.setState(data);
			this.save();
		}
	}, {
		key: 'save',
		value: function save() {
			this.saveProject();
		}
	}, {
		key: 'saveProject',
		value: function saveProject() {
			Source.setLocal('weave-project', LZW.compressToUTF16(JSON.stringify(this.state.project)));
		}
	}, {
		key: 'getChildContext',
		value: function getChildContext() {
			var _this3 = this;

			return {
				thread: function thread(index) {
					return _this3.state.project.threads[index];
				},
				do: this.do
			};
		}
	}]);

	return App;
}(React.Component);

React.options.debounceRendering = window.requestAnimationFrame;

React.render(React.createElement(App, null), document.body);

},{"./Sourcery.js":5,"./actions.js":6,"./assert.js":7,"./bind.js":8,"./colors.js":9,"./components/FileOpener.js":13,"./components/PrintModal.js":17,"./components/SceneWriter.js":20,"./components/WeaveView.js":27,"./polyfills.js":28,"file-saver":1,"lz-string":2,"preact":3}],5:[function(require,module,exports){
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
		store.slices = Object.assign([], store.slices);
		store.headers = Object.assign([], store.headers);
		store.slices.splice(action.atIndex, 0, {
			datetime: '',
			scenes: store.threads.map(function () {
				return null;
			})
		});
		store.headers.splice(action.atIndex, 0, '');
		return store;
	},
	DELETE_SLICE: function DELETE_SLICE(action, store) {
		store.slices = Object.assign([], store.slices);
		store.headers = Object.assign([], store.headers);
		action.slice = store.slices.splice(action.atIndex, 1);
		action.header = store.headers.splice(action.atIndex, 1);
		return store;
	},
	MODIFY_SLICE_DATE: function MODIFY_SLICE_DATE(action, store) {
		store.slices = Object.assign([], store.slices);
		store.slices[action.atIndex].datetime = action.newDate;
		return store;
	},

	// NOTE ACTIONS
	NEW_NOTE: function NEW_NOTE(action, store) {
		store.slices = Object.assign([], store.slices);
		store.slices[action.sliceIndex].scenes.splice(action.sceneIndex, 1, {
			thread: 0,
			head: '',
			body: '',
			wc: 0
		});
		return store;
	},
	DELETE_NOTE: function DELETE_NOTE(action, store) {
		store.slices = Object.assign([], store.slices);
		store.slices[action.sliceIndex].scenes[action.sceneIndex] = null;
		return store;
	},
	MODIFY_NOTE_HEAD: function MODIFY_NOTE_HEAD(action, store) {
		store.slices = Object.assign([], store.slices);
		store.slices[action.sliceIndex].scenes[action.sceneIndex].head = action.newHead;
		return store;
	},
	MODIFY_NOTE_BODY: function MODIFY_NOTE_BODY(action, store) {
		store.slices = Object.assign([], store.slices);
		var scene = store.slices[action.sliceIndex].scenes[action.sceneIndex];
		scene.body = action.newBody;
		scene.wc = action.wc;
		return store;
	},
	MODIFY_NOTE_LOCATION: function MODIFY_NOTE_LOCATION(action, store) {
		var scene;
		store.slices = Object.assign([], store.slices);
		scene = store.slices[action.sliceIndex].scenes[action.sceneIndex];
		scene.location = action.newLocation;
		return store;
	},
	MOVE_NOTE: function MOVE_NOTE(action, store) {
		store.slices = Object.assign([], store.slices);
		store.slices[action.to.sliceIndex].scenes[action.to.sceneIndex] = store.slices[action.from.sliceIndex].scenes[action.from.sceneIndex];
		store.slices[action.from.sliceIndex].scenes[action.from.sceneIndex] = null;
		return store;
	},

	// THREAD ACTIONS
	NEW_THREAD: function NEW_THREAD(action, store) {
		var i = store.slices.length;
		store.threads = Object.assign([], store.threads);
		store.slices = Object.assign([], store.slices);
		store.threads.push({
			color: action.color,
			name: ''
		});
		while (i--) {
			store.slices[i].scenes.push(null);
		}return store;
	},
	DELETE_THREAD: function DELETE_THREAD(action, store) {
		var i = store.slices.length;
		store.threads = Object.assign([], store.threads);
		store.slices = Object.assign([], store.slices);
		action.thread = store.threads.splice(action.atIndex, 1);
		while (i--) {
			store.slices[i].scenes.splice(action.atIndex, 1);
		}return store;
	},
	MOVE_THREAD: function MOVE_THREAD(action, store) {
		var i = store.slices.length,
		    scenes;
		store.threads = Object.assign([], store.threads);
		store.slices = Object.assign([], store.slices);
		store.threads.splice(action.toIndex, 0, store.threads.splice(action.fromIndex, 1)[0]);
		while (i--) {
			scenes = store.slices[i].scenes;
			scenes.splice(action.toIndex, 0, scenes.splice(action.fromIndex, 1)[0]);
		}
		return store;
	},
	MODIFY_THREAD_NAME: function MODIFY_THREAD_NAME(action, store) {
		store.threads = Object.assign([], store.threads);
		store.threads[action.atIndex].name = action.newName;
		return store;
	},
	MODIFY_THREAD_COLOR: function MODIFY_THREAD_COLOR(action, store) {
		store.threads = Object.assign([], store.threads);
		store.threads[action.atIndex].color = action.color;
		return store;
	},

	MODIFY_HEADER: function MODIFY_HEADER(action, store) {
		store.headers = Object.assign([], store.headers);
		store.headers[action.atIndex] = action.newValue;
		return store;
	} };

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

var colors = ['#333333', '#666666', '#999999', '#b21f35', '#d82735', '#ff7435', '#ffa135', '#ffcb35', '#fff735', '#00753a', '#009e47', '#16dd36', '#0052a5', '#0079e7', '#06a9fc', '#681e7e', '#7d3cb5', '#bd7af6'];

module.exports = {
	palette: colors,
	random: function random(old, color) {
		color = colors[Math.random() * colors.length >> 0];
		if (old) while (old === color) {
			color = colors[Math.random() * colors.length >> 0];
		}
		return color;
	}
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

		width: '100vw',
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
			// CUSTOM ITEM
			if (item.custom) return item.custom;
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
		key: 'shouldComponentUpdate',
		value: function shouldComponentUpdate() {
			return false;
		}
	}, {
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
    Bind = require('../bind.js'),
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
			value: props.value,
			style: Object.assign({}, Style.editBox, { height: props.baseHeight })
		};

		Bind(_this);
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
				onBlur: props.blur,
				value: state.value
			});
		}
	}, {
		key: 'shouldComponentUpdate',
		value: function shouldComponentUpdate(props, state) {
			return props.value !== this.props.value || state.value !== this.state.value || props.style.backgroundColor !== this.props.style.backgroundColor;
		}
	}, {
		key: 'componentDidMount',
		value: function componentDidMount() {
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
			this.state.value = event.target.value;
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

},{"../bind.js":8,"preact":3}],13:[function(require,module,exports){
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
    DeleteButton = require('./DeleteButton.js'),
    LocationLabel = require('./LocationLabel.js'),
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
		maxHeight: '13rem',
		margin: '0.2rem',
		border: '0 solid rgba(0,0,0,0)'
	},
	textarea: {
		fontSize: '1.1rem',
		margin: '0.75rem',
		maxHeight: '9rem'
	}
};

var HeaderEditor = function (_React$Component) {
	_inherits(HeaderEditor, _React$Component);

	function HeaderEditor(props, context) {
		_classCallCheck(this, HeaderEditor);

		var _this = _possibleConstructorReturn(this, (HeaderEditor.__proto__ || Object.getPrototypeOf(HeaderEditor)).call(this, props, context));

		Bind(_this);
		return _this;
	}

	_createClass(HeaderEditor, [{
		key: 'render',
		value: function render(props, state) {
			var _this2 = this;

			return React.createElement('div', {
				style: Style.box
			}, React.createElement(ExpandingTextarea, {
				style: Style.textarea,
				maxLength: 250,
				baseHeight: '1.3rem',
				placeholder: 'Chapter/Scene Header',
				value: props.header,
				input: function input(e) {
					return _this2.context.do('MODIFY_HEADER', { atIndex: props.id, newValue: e.target.value });
				},
				ref: function ref(el) {
					return _this2.el = el;
				}
			}));
		}
	}]);

	return HeaderEditor;
}(React.Component);

module.exports = HeaderEditor;

},{"../bind.js":8,"./DeleteButton.js":11,"./ExpandingTextarea.js":12,"./LocationLabel.js":15,"preact":3}],15:[function(require,module,exports){
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

var LocationLabel = function (_React$Component) {
	_inherits(LocationLabel, _React$Component);

	function LocationLabel(props, context) {
		_classCallCheck(this, LocationLabel);

		var _this = _possibleConstructorReturn(this, (LocationLabel.__proto__ || Object.getPrototypeOf(LocationLabel)).call(this, props, context));

		_this.state = {
			value: props.value
		};
		return _this;
	}

	_createClass(LocationLabel, [{
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
				placeholder: 'location',
				onInput: function onInput(event) {
					return _this2.setState({ value: event.target.value });
				},
				onChange: props.onChange
			});
		}
	}]);

	return LocationLabel;
}(React.Component);

module.exports = LocationLabel;

},{"preact":3}],16:[function(require,module,exports){
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
		zIndex: 30,
		position: 'fixed',
		top: 0,
		left: 0,
		width: '100vw',
		height: '100vh',
		backgroundColor: 'rgba(0,0,0,0.5)',
		display: 'flex',
		justifyContent: 'center',
		alignItems: 'center'
	},
	inner: {
		backgroundColor: '#000',
		display: 'flex',
		flexDirection: 'column',
		justifyContent: 'flex-start',
		alignItems: 'center',
		padding: '1rem'
	}
};

var ModalView = function (_React$Component) {
	_inherits(ModalView, _React$Component);

	function ModalView(props, context) {
		_classCallCheck(this, ModalView);

		return _possibleConstructorReturn(this, (ModalView.__proto__ || Object.getPrototypeOf(ModalView)).call(this, props, context));
	}

	_createClass(ModalView, [{
		key: 'render',
		value: function render(props, state) {
			return React.createElement('div', {
				style: Style.outer,
				onClick: props.dismiss
			}, React.createElement('div', {
				style: Style.inner,
				onClick: function onClick(e) {
					return e.stopPropagation();
				}
			}, props.children));
		}
	}]);

	return ModalView;
}(React.Component);

module.exports = ModalView;

},{"preact":3}],17:[function(require,module,exports){
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
    ModalView = require('./ModalView.js'),
    Bind = require('../bind.js'),
    Style = {
	scene: {
		display: 'flex',
		justifyContent: 'space-around',
		fontSize: '0.9rem',
		alignItems: 'center',
		padding: '0.5rem',
		margin: '0.5rem 0.5rem',
		width: '20rem'
	},
	span: {
		minWidth: '5rem',
		marginRight: '1rem',
		whiteSpace: 'nowrap',
		overflow: 'hidden',
		textOverflow: 'ellipsis'
	},
	row: {
		display: 'flex',
		justifyContent: 'space-around',
		alignItems: 'center',
		width: '100%'
	},
	input: {
		zIndex: '11',
		color: '#000',
		maxWidth: '14rem',
		outline: 'none',
		fontSize: '1rem',
		border: 'none',
		textAlign: 'center',
		padding: '0.25rem',
		marginTop: '0.5rem'
	},
	thread: {
		height: '2rem',
		padding: '0 0.75rem',

		border: 'none',
		outline: 'none',
		backgroundColor: '#000000',

		color: '#fff',
		fontSize: '1rem',

		cursor: 'pointer',
		borderRadius: '1rem'
	},
	sliceSection: {
		minWidth: '20rem'
	},
	threadSection: {
		marginBottom: '1rem'
	},
	date: {
		color: '#fff',
		fontSize: '0.9rem'
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
	}
};

var PrintModal = function (_React$Component) {
	_inherits(PrintModal, _React$Component);

	function PrintModal(props, context) {
		_classCallCheck(this, PrintModal);

		var _this = _possibleConstructorReturn(this, (PrintModal.__proto__ || Object.getPrototypeOf(PrintModal)).call(this, props, context));

		_this.state = {
			threads: [],
			filtered: [],
			deselected: []
		};

		Bind(_this);
		return _this;
	}

	_createClass(PrintModal, [{
		key: 'render',
		value: function render(props, state) {
			var _this2 = this;

			var select = this.select;

			return React.createElement(ModalView, {
				dismiss: props.cancel
			}, React.createElement('div', {
				'data-is': 'threads',
				style: Style.threadSection
			}, props.threads.reduce(function (threads, t, i) {
				if (t.name.length) {
					return threads.concat([React.createElement('button', {
						'data-id': i,
						style: Object.assign({}, Style.thread, {
							backgroundColor: state.threads.indexOf(i) !== -1 ? t.color : '#777'
						}),
						onClick: _this2.filter
					}, t.name)]);
				} else return threads;
			}, [])), React.createElement('div', {
				'data-is': 'slices',
				style: Style.sliceSection
			}, state.filtered.map(function (item, i) {
				return React.createElement('div', {
					style: Object.assign({ opacity: state.deselected.indexOf(i) !== -1 ? '0.5' : '1' }, Style.scene, item.style),
					onClick: function onClick() {
						return select(i);
					}
				}, item.values.map(function (value) {
					return React.createElement('span', { style: Style.span }, value);
				}));
			})), React.createElement('div', { style: Style.row }, React.createElement('button', {
				style: Style.item,
				onClick: function onClick() {
					props.cancel();
				}
			}, 'cancel'), React.createElement('button', {
				style: Style.item,
				onClick: this.print
			}, 'print')));
		}
	}, {
		key: 'filter',
		value: function filter(event) {
			var _this3 = this;

			var filtered,
			    id = Number(event.target.dataset.id),
			    i = this.state.threads.indexOf(id);

			if (i === -1) this.state.threads.push(id);else this.state.threads.splice(i, 1);

			filtered = this.props.slices.reduce(function (slices, slice, i) {
				var scenes = _this3.props.headers[i] ? [{
					values: [_this3.props.headers[i]],
					style: {
						color: '#000',
						backgroundColor: '#fff'
					}
				}] : [];

				scenes = scenes.concat(slice.scenes.reduce(function (scenes, scene, i) {
					if (scene && _this3.state.threads.indexOf(i) !== -1 && scene.wc !== 0) {
						scenes.push({
							values: [scene.head, scene.wc + ' words'],
							body: scene.body,
							style: {
								color: '#fff',
								backgroundColor: _this3.props.threads[i].color
							}
						});
					}
					return scenes;
				}, []));

				if (scenes.length) return slices.concat(scenes);else return slices;
			}, []);

			this.setState({ filtered: filtered, deselected: [] });
		}
	}, {
		key: 'select',
		value: function select(index, i) {
			i = this.state.deselected.indexOf(index);

			if (i === -1) this.state.deselected.push(index);else this.state.deselected.splice(i, 1);

			this.forceUpdate();
		}
	}, {
		key: 'print',
		value: function print() {
			var _this4 = this;

			this.props.print(this.state.filtered.reduce(function (list, item, i) {
				if (_this4.state.deselected.indexOf(i) === -1) list.push(item);
				return list;
			}, []));
			this.props.cancel();
		}
	}]);

	return PrintModal;
}(React.Component);

module.exports = PrintModal;

},{"../bind.js":8,"./ModalView.js":16,"preact":3}],18:[function(require,module,exports){
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
    ModalView = require('./ModalView.js'),
    Style = {
	scene: {
		display: 'flex',
		justifyContent: 'space-around',
		alignItems: 'center',
		padding: '0.25rem',
		marginTop: '0.5rem'
	},
	title: {
		height: '2rem',
		maxWidth: '95vw',
		padding: '0 0.75rem',
		border: 'none',
		borderBottom: 'thin solid #fff',
		outline: 'none',
		backgroundColor: '#000',
		fontSize: '1.2rem',
		color: '#fff'
	},
	author: {
		height: '2rem',
		maxWidth: '95vw',
		padding: '0 0.75rem',
		border: 'none',
		borderBottom: 'thin solid #fff',
		outline: 'none',
		backgroundColor: '#000',
		fontSize: '1rem',
		color: '#fff'
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
	row: {
		display: 'flex',
		justifyContent: 'space-around',
		alignItems: 'center',
		marginTop: '1rem'
	}

};

function MeasureText(text) {
	var wide = text.match(/[WM]/g),
	    thin = text.match(/[Itrlij!. ]/g);

	wide = wide ? wide.length : 0;
	thin = thin ? thin.length : 0;

	return text.length + wide * 1.2 - thin * 0.3;
}

var ProjectModal = function (_React$Component) {
	_inherits(ProjectModal, _React$Component);

	function ProjectModal(props, context) {
		_classCallCheck(this, ProjectModal);

		return _possibleConstructorReturn(this, (ProjectModal.__proto__ || Object.getPrototypeOf(ProjectModal)).call(this, props, context));
	}

	_createClass(ProjectModal, [{
		key: 'render',
		value: function render(props, state) {
			var _this2 = this;

			return React.createElement(ModalView, {
				dismiss: props.onDone
			}, React.createElement('div', { style: Style.row }, React.createElement('input', {
				style: Style.title,
				type: 'text',
				placeholder: 'Project Title',
				maxLength: 40,
				size: Math.max(MeasureText(props.title.length ? props.title : props.placeholder || ''), 20),
				onInput: props.functions.onTitleChange,
				value: props.title
			})), React.createElement('div', { style: Style.row }, React.createElement('input', {
				style: Style.author,
				type: 'text',
				placeholder: 'Author',
				maxLength: 40,
				size: Math.max(MeasureText(props.author.length ? props.author : props.placeholder || ''), 20),
				onInput: props.functions.onAuthorChange,
				value: props.author
			})), React.createElement('div', { style: Style.row }, React.createElement('button', {
				style: Style.item,
				onClick: function onClick() {
					props.onDone();
					props.functions.import();
				}
			}, 'import'), React.createElement('button', {
				style: Style.item,
				onClick: function onClick() {
					props.onDone();
					props.functions.export();
				}
			}, 'export'), React.createElement('button', {
				style: Style.item,
				onClick: function onClick() {
					props.onDone();
					props.functions.print();
				}
			}, 'print')), React.createElement('div', { style: Style.row }, React.createElement('button', {
				style: Object.assign({}, Style.item, { color: '#f00', transition: 'color 1s' }),
				onClick: function onClick(e) {
					e.target.style.color = '#f00';
					if (_this2.timer) {
						clearTimeout(_this2.timer);
						_this2.timer = undefined;
					}
				},
				onMouseDown: function onMouseDown(e) {
					e.target.style.color = "#777";
					_this2.timer = setTimeout(props.functions.delete, 1000, e);
				}
			}, 'delete')));
		}
	}]);

	return ProjectModal;
}(React.Component);

module.exports = ProjectModal;

},{"./ModalView.js":16,"preact":3}],19:[function(require,module,exports){
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
    DeleteButton = require('./DeleteButton.js'),
    LocationLabel = require('./LocationLabel.js'),
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

	sceneHead: {
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
		bottom: '-1.4rem',
		right: '-1.4rem',
		cursor: 'pointer'
	}
};

var SceneEditor = function (_React$Component) {
	_inherits(SceneEditor, _React$Component);

	function SceneEditor(props, context) {
		_classCallCheck(this, SceneEditor);

		var _this = _possibleConstructorReturn(this, (SceneEditor.__proto__ || Object.getPrototypeOf(SceneEditor)).call(this, props, context));

		Bind(_this);
		return _this;
	}

	_createClass(SceneEditor, [{
		key: 'render',
		value: function render(props, state) {
			var _this2 = this;

			var argyle = Object.assign({}, Style.box, {
				border: props.selected ? '0.2rem solid ' + props.thread.color : '0 solid rgba(0,0,0,0)',
				margin: props.selected ? '0' : '0.2rem'
			});

			return React.createElement('div', {
				style: argyle,
				onClick: this.onClick,
				draggable: true,
				onDragStart: function onDragStart() {
					return props.onDrag({ sliceIndex: props.sliceIndex, sceneIndex: props.sceneIndex });
				}
			}, React.createElement(ExpandingTextarea, {
				style: Style.textarea,
				maxLength: 250,
				input: this.onInput,
				baseHeight: '1.3rem',
				placeholder: 'Title/Summary',
				value: props.scene.head,
				focus: this.onFocus,
				change: this.onChange,
				ref: function ref(el) {
					return _this2.el = el;
				}
			}), React.createElement('span', {
				style: Object.assign({}, Style.stats, { backgroundColor: props.thread.color })
			}, !props.selected ? [React.createElement('button', {
				onclick: function onclick() {
					return props.onEdit({ sliceIndex: props.sliceIndex, sceneIndex: props.sceneIndex });
				},
				style: Style.button
			}, 'edit'), React.createElement('span', { style: Style.wordcount }, props.scene.wc, ' words')] : [React.createElement(LocationLabel, {
				value: props.scene.location,
				onChange: function onChange(e) {
					return _this2.context.do('MODIFY_NOTE_LOCATION', {
						sliceIndex: props.sliceIndex,
						sceneIndex: props.sceneIndex,
						newLocation: e.target.value
					});
				}
			}), React.createElement(DeleteButton, {
				style: Style.deleteButton,
				onHold: function onHold() {
					return _this2.context.do('DELETE_NOTE', {
						sliceIndex: props.sliceIndex,
						sceneIndex: props.sceneIndex
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
				sceneIndex: this.props.sceneIndex,
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
				sceneIndex: this.props.sceneIndex
			});
		}
	}]);

	return SceneEditor;
}(React.Component);

module.exports = SceneEditor;

},{"../bind.js":8,"./DeleteButton.js":11,"./ExpandingTextarea.js":12,"./LocationLabel.js":15,"preact":3}],20:[function(require,module,exports){
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
	sceneHead: {
		color: '#222',
		fontSize: '1.7rem',

		margin: '0.5rem 1.5rem'
	},
	sceneBody: {
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
	},
	doneButton: {
		fontSize: '1rem',
		fontWeight: 'bold',
		border: 'none',
		outline: 'none',
		backgroundColor: 'rgba(0,0,0,0)',
		cursor: 'pointer'
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

var SceneWriter = function (_React$Component) {
	_inherits(SceneWriter, _React$Component);

	function SceneWriter(props, context) {
		_classCallCheck(this, SceneWriter);

		var _this = _possibleConstructorReturn(this, (SceneWriter.__proto__ || Object.getPrototypeOf(SceneWriter)).call(this, props, context));

		_this.state = {
			threadStyle: Object.assign({}, Style.thread, { backgroundColor: props.thread.color }),
			head: props.scene.head,
			body: props.scene.body,
			wc: props.scene.wc,
			pages: 1,
			pageOf: 1,
			statStyle: Style.statSticky
		};

		Bind(_this);
		return _this;
	}

	_createClass(SceneWriter, [{
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
						atIndex: props.scene.thread,
						newName: e.target.value
					});
				}
			})), React.createElement(ExpandingTextarea, {
				style: Style.sceneHead,
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
				style: Style.sceneBody,
				input: this.onBody,
				change: function change() {
					return _this2.context.do('MODIFY_NOTE_BODY', Object.assign({ newBody: state.body, wc: state.wc }, props.coords));
				},
				value: state.body,
				baseHeight: '1.1em',
				placeholder: 'Body'
			}), React.createElement('span', { style: Object.assign({}, Style.stats, state.statStyle) }, React.createElement('span', { style: Style.wc }, state.wc + ' words'), React.createElement('span', null, state.pageOf + '/' + state.pages), React.createElement('button', {
				style: Style.doneButton,
				onClick: props.onDone
			}, 'done')));
		}
	}, {
		key: 'componentDidMount',
		value: function componentDidMount() {
			window.addEventListener('scroll', this.onScroll);
			window.addEventListener('resize', this.onResize);

			window.scrollTo(0, 0);
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

	return SceneWriter;
}(React.Component);

module.exports = SceneWriter;

},{"../bind.js":8,"./AppMenu.js":10,"./ExpandingTextarea.js":12,"./ThreadLabel.js":24,"preact":3}],21:[function(require,module,exports){
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
    DeleteButton = require('./DeleteButton.js'),
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
		position: 'relative',
		display: 'inline-flex',
		justifyContent: 'center',
		alignItems: 'center',
		width: '14rem',
		height: '100%'
	},
	deleteButton: {
		zIndex: 25,
		fontSize: '0.9rem',
		position: 'absolute',
		bottom: '-1.2rem',
		right: '-1.2rem',
		cursor: 'pointer'
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
			value: props.value,
			selected: false
		};

		Bind(_this);
		return _this;
	}

	_createClass(SliceHeader, [{
		key: 'componentWillReceiveProps',
		value: function componentWillReceiveProps(props) {
			this.setState({ value: props.value, selected: false });
		}
	}, {
		key: 'render',
		value: function render(props, state) {
			var _this2 = this;

			return React.createElement('div', { style: Style.slice }, React.createElement('div', { style: { position: 'relative' } }, React.createElement('input', {
				type: 'text',
				style: Style.sliceHeader,
				maxLength: '24',
				size: MeasureText(state.value),
				value: state.value,
				placeholder: 'time',
				onFocus: function onFocus() {
					return _this2.setState({ selected: true });
				},
				onBlur: this.onBlur,
				onInput: function onInput(event) {
					return _this2.setState({ value: event.target.value });
				},
				onChange: this.onChange

			}), state.selected ? React.createElement(DeleteButton, {
				ref: function ref(c) {
					return _this2.delBtn = c;
				},
				style: Style.deleteButton,
				onHold: function onHold() {
					return _this2.context.do('DELETE_SLICE', { atIndex: props.id });
				}
			}) : ''));
		}
	}, {
		key: 'onChange',
		value: function onChange(event) {
			this.context.do('MODIFY_SLICE_DATE', {
				atIndex: this.props.id,
				newDate: event.target.value
			});
		}
	}, {
		key: 'onBlur',
		value: function onBlur(e) {
			var _this3 = this;

			setTimeout(function () {
				if (_this3.delBtn && !_this3.delBtn.timer) _this3.setState({ selected: false });
			}, 100);
		}
	}]);

	return SliceHeader;
}(React.Component);

module.exports = SliceHeader;

},{"../bind.js":8,"./DeleteButton.js":11,"preact":3}],22:[function(require,module,exports){
'use strict';

var React = require('preact'),
    SceneEditor = require('./SceneEditor.js'),
    HeaderEditor = require('./HeaderEditor.js'),
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
		width: '14rem',
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

	return React.createElement('div', { style: Style.slice }, [React.createElement('div', { style: Style.space }, React.createElement(HeaderEditor, {
		id: props.id,
		onEdit: props.editHeader,
		header: props.header
	}))].concat(props.slice.scenes.map(function (scene, i) {
		if (scene) return React.createElement('div', { style: Style.space }, React.createElement(SceneEditor, {
			sliceIndex: props.id,
			selected: props.selection && props.selection.sceneIndex === i,
			sceneIndex: i,
			scene: scene,
			thread: props.threads[i],
			onSelect: props.onSelect,
			onDeselect: props.onDeselect,
			onEdit: props.editNote,
			onDrag: props.onDrag
		}));else return React.createElement('div', {
			style: Style.space,
			onDragOver: function onDragOver(e) {
				return e.preventDefault();
			},
			onDrop: function onDrop() {
				return props.onDrop({ sliceIndex: props.id, sceneIndex: i });
			}
		}, React.createElement('button', {
			style: Style.button,
			onclick: function onclick() {
				return _this.context.do('NEW_NOTE', {
					sliceIndex: props.id,
					sceneIndex: i
				});
			}
		}, '+'));
	})));
};

},{"./HeaderEditor.js":14,"./SceneEditor.js":19,"preact":3}],23:[function(require,module,exports){
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
    DeleteButton = require('./DeleteButton.js'),
    ExpandingTextarea = require('./ExpandingTextarea.js'),
    Colors = require('../colors.js'),
    Bind = require('../bind.js'),
    Style = {
	threadHeader: {
		zIndex: '10',
		width: '7rem',
		color: '#fff',
		outline: 'none',
		fontSize: '0.9rem',
		border: 'none',
		textAlign: 'center',
		paddingTop: '0.5rem'
	},
	draggable: {
		minHeight: '0.9rem'
	},
	box: {
		position: 'relative',
		display: 'flex',
		flexDirection: 'column',
		justifyContent: 'flex-end',
		height: '14rem'
	},
	deleteButton: {
		zIndex: 25,
		fontSize: '0.9rem',
		position: 'absolute',
		bottom: '-1.2rem',
		right: '-1.2rem',
		cursor: 'pointer'
	}
};

var ThreadHeader = function (_React$Component) {
	_inherits(ThreadHeader, _React$Component);

	function ThreadHeader(props, context) {
		_classCallCheck(this, ThreadHeader);

		var _this = _possibleConstructorReturn(this, (ThreadHeader.__proto__ || Object.getPrototypeOf(ThreadHeader)).call(this, props, context));

		_this.state = {
			value: props.thread.name,
			selected: false
		};

		Bind(_this);
		return _this;
	}

	_createClass(ThreadHeader, [{
		key: 'shouldComponentUpdate',
		value: function shouldComponentUpdate(props, state) {
			return props.thread.name !== this.props.thread.name || props.thread.color !== this.props.thread.color || state.value !== this.state.value || state.selected !== this.state.selected;
		}
	}, {
		key: 'componentWillReceiveProps',
		value: function componentWillReceiveProps(props) {
			this.setState({ value: props.thread.name, selected: false });
		}
	}, {
		key: 'render',
		value: function render(props, state) {
			var _this2 = this;

			return React.createElement('div', {
				style: Style.box,
				onDragOver: function onDragOver(e) {
					return e.preventDefault();
				},
				onDrop: function onDrop() {
					return props.onDrop(props.id);
				}
			}, React.createElement('div', {
				style: Style.draggable,
				draggable: true,
				onDragStart: function onDragStart(e) {
					_this2.timer = undefined;
					props.onDrag(props.id);
				},
				onMouseDown: function onMouseDown() {
					return _this2.timer = setTimeout(_this2.colorToggle, 1000);
				},
				onMouseUp: function onMouseUp() {
					return _this2.timer = undefined;
				}
			}, React.createElement(ExpandingTextarea, {
				ref: function ref(c) {
					return _this2.input = c;
				},
				type: 'text',
				style: Object.assign({}, Style.threadHeader, { backgroundColor: props.thread.color }),
				maxLength: '24',
				baseHeight: '0.9rem',
				value: state.value,
				placeholder: 'Name',
				focus: this.onFocus,
				blur: this.onBlur,
				input: function input(event) {
					return _this2.setState({ value: event.target.value });
				},
				change: function change(event) {
					return _this2.context.do('MODIFY_THREAD_NAME', {
						atIndex: _this2.props.id,
						newName: event.target.value
					});
				}
			})), state.selected ? React.createElement(DeleteButton, {
				ref: function ref(c) {
					return _this2.delBtn = c;
				},
				style: Style.deleteButton,
				onHold: function onHold() {
					return _this2.context.do('DELETE_THREAD', { atIndex: props.id });
				}
			}) : '');
		}
	}, {
		key: 'colorToggle',
		value: function colorToggle() {
			if (this.timer) {
				this.context.do('MODIFY_THREAD_COLOR', {
					atIndex: this.props.id,
					color: Colors.random(this.props.thread.color)
				});
				this.timer = undefined;
				this.input.base.blur();
			}
		}
	}, {
		key: 'onFocus',
		value: function onFocus(e) {
			this.setState({ selected: true });
		}
	}, {
		key: 'onBlur',
		value: function onBlur(e) {
			var _this3 = this;

			setTimeout(function () {
				if (_this3.delBtn && !_this3.delBtn.timer) _this3.setState({ selected: false });
			}, 100);
		}
	}]);

	return ThreadHeader;
}(React.Component);

module.exports = ThreadHeader;

},{"../bind.js":8,"../colors.js":9,"./DeleteButton.js":11,"./ExpandingTextarea.js":12,"preact":3}],24:[function(require,module,exports){
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

var LocationLabel = function (_React$Component) {
	_inherits(LocationLabel, _React$Component);

	function LocationLabel(props, context) {
		_classCallCheck(this, LocationLabel);

		var _this = _possibleConstructorReturn(this, (LocationLabel.__proto__ || Object.getPrototypeOf(LocationLabel)).call(this, props, context));

		_this.state = {
			value: props.value
		};
		return _this;
	}

	_createClass(LocationLabel, [{
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
				placeholder: 'location',
				onInput: function onInput(event) {
					return _this2.setState({ value: event.target.value });
				},
				onChange: props.onChange
			});
		}
	}]);

	return LocationLabel;
}(React.Component);

module.exports = LocationLabel;

},{"preact":3}],25:[function(require,module,exports){
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
	thread: {
		margin: '12rem 0',
		height: '2rem',
		opacity: '0.3'
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
			return props.menuOffset !== this.props.menuOffset || props.threads !== this.props.threads || props.slices !== this.props.slices;
		}
	}, {
		key: 'render',
		value: function render(props, state) {
			return React.createElement('div', {
				'data-is': 'WeaveBackground',
				style: Object.assign({}, Style.outer, {
					top: props.menuOffset,
					width: props.slices * 18 + 2 + 'rem',
					height: (props.threads.length + 1) * 14 + 16 + 'rem'
				})
			}, React.createElement('div', { style: Style.inner }, [React.createElement('div', {
				style: Object.assign({}, Style.thread, {
					backgroundColor: '#000'
				})
			}, '\xA0')].concat(props.threads.map(function (thread, i) {
				return React.createElement('div', {
					style: Object.assign({}, Style.thread, {
						backgroundColor: thread.color
					})
				}, '\xA0');
			}))), React.createElement('div', { style: Style.inner }, Array(props.slices).fill(0).map(function (v, i) {
				return React.createElement('div', { style: Style.slice }, '\xA0');
			})));
		}
	}]);

	return WeaveBackground;
}(React.Component);

module.exports = WeaveBackground;

},{"preact":3}],26:[function(require,module,exports){
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

function _defineProperty(obj, key, value) {
	if (key in obj) {
		Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true });
	} else {
		obj[key] = value;
	}return obj;
}

var React = require('preact'),
    ThreadHeader = require('./ThreadHeader.js'),
    SliceHeader = require('./SliceHeader.js'),
    Colors = require('../colors.js'),
    Bind = require('../bind.js'),
    Style = {
	outer: {
		position: 'absolute',
		left: 0,
		minWidth: '100vw',
		minHeight: '100vh'
	},
	threads: {
		position: 'absolute',
		top: '0.25rem',
		width: '7rem',
		minHeight: '100vh',
		paddingTop: '2rem'
	},
	thread: {
		display: 'flex',
		flexDirection: 'column',
		justifyContent: 'flex-end',
		position: 'relative',
		height: '13.75rem'
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
	},
	header: _defineProperty({
		display: 'flex',
		justifyContent: 'center',
		alignItems: 'center',
		height: '2rem',
		fontSize: '0.9rem',
		color: '#fff',
		border: 'none',
		backgroundColor: '#000',
		width: '100%'
	}, 'border', 'none')
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

		Bind(_this);
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
		value: function shouldComponentUpdate(props, state) {
			return props.windowWidth !== this.props.windowWidth || props.threads !== this.props.threads || props.slices !== this.props.slices || state !== this.state;
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
				style: Object.assign({}, Style.scenes, { top: state.y, width: props.slices.length * 18 + 2 + 'rem' })
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
			}, '+')].concat(props.slices.map(function (slice, i) {
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
				'data-is': 'ThreadHeaders',
				style: Object.assign({}, Style.threads, {
					left: state.x,
					height: (props.threads.length + 1) * 14 + 16 + 'rem',
					backgroundColor: props.windowWidth < 700 ? 'rgba(0,0,0,0)' : '#111',
					zIndex: props.windowWidth < 700 ? 8 : 10 })
			}, [React.createElement('div', { style: Object.assign({ marginBottom: '0.25rem' }, Style.thread) }, React.createElement('span', {
				style: Style.header
			}, 'Header'))].concat(props.threads.map(function (thread, i) {
				return React.createElement(ThreadHeader, {
					id: i,
					thread: thread,
					onDrag: function onDrag(id) {
						return _this2.dragging = id;
					},
					onDrop: _this2.onThreadDrop
				});
			}).concat([React.createElement('div', { style: Style.thread }, React.createElement('button', {
				onclick: function onclick(event) {
					return _this2.context.do('NEW_THREAD', { color: Colors.random() });
				},
				style: Style.threadBtn,
				onmouseenter: function onmouseenter(e) {
					return e.target.style.backgroundColor = 'rgba(255,255,255,0.2)';
				},
				onmouseleave: function onmouseleave(e) {
					return e.target.style.backgroundColor = 'rgba(0,0,0,0)';
				}
			}, '+'))]))));
		}
	}, {
		key: 'onScroll',
		value: function onScroll() {
			this.setState({
				x: document.body.scrollLeft,
				y: document.body.scrollTop
			});
		}
	}, {
		key: 'onThreadDrop',
		value: function onThreadDrop(toIndex) {
			this.context.do('MOVE_THREAD', {
				fromIndex: this.dragging,
				toIndex: toIndex
			});
		}
	}]);

	return WeaveHeaders;
}(React.Component);

module.exports = WeaveHeaders;

},{"../bind.js":8,"../colors.js":9,"./SliceHeader.js":21,"./ThreadHeader.js":23,"preact":3}],27:[function(require,module,exports){
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
    ProjectModal = require('./ProjectModal.js'),
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
	},
	projectButton: {
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
};

var WeaveView = function (_React$Component) {
	_inherits(WeaveView, _React$Component);

	function WeaveView(props, context) {
		_classCallCheck(this, WeaveView);

		var _this = _possibleConstructorReturn(this, (WeaveView.__proto__ || Object.getPrototypeOf(WeaveView)).call(this, props, context));

		_this.state = {
			selection: null,
			projectModal: false
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
				style: Style.weave,
				onclick: this.onDeselect
			}, React.createElement(WeaveHeaders, {
				slices: props.project.slices,
				threads: props.project.threads,
				windowWidth: props.windowWidth
			}), React.createElement(WeaveBackground, {
				slices: props.project.slices.length,
				threads: props.project.threads
			}), React.createElement('div', { 'data-is': 'Weave', style: Style.scenes }, props.project.slices.map(function (slice, i) {
				return React.createElement(SliceView, {
					id: i,
					selection: state.selection && state.selection.sliceIndex === i ? state.selection : null,
					slice: slice,
					threads: props.project.threads,
					onSelect: _this2.onSelect,
					onDeselect: _this2.onDeselect,
					editNote: props.editNote,
					onDrag: _this2.onNoteDrag,
					onDrop: _this2.onNoteDrop,
					header: props.project.headers[i]
				});
			})), !state.projectModal ? React.createElement('button', {
				style: Style.projectButton,
				onClick: function onClick() {
					return _this2.setState({ projectModal: true });
				}
			}, props.project.title.length ? props.project.title : 'Project Title') : React.createElement(ProjectModal, {
				title: props.project.title,
				author: props.project.author,
				functions: props.projectFuncs,
				onDone: function onDone() {
					return _this2.setState({ projectModal: false });
				}
			}));
		}
	}, {
		key: 'onSelect',
		value: function onSelect(coords, i) {
			this.setState({ selection: coords });
		}
	}, {
		key: 'onDeselect',
		value: function onDeselect(event) {
			this.sceneDeselected();
		}
	}, {
		key: 'sceneDeselected',
		value: function sceneDeselected() {
			if (this.allowDeselect) {
				this.setState({ selection: null });
			}
		}
	}, {
		key: 'onNoteDrag',
		value: function onNoteDrag(coords) {
			this.dragging = coords;
		}
	}, {
		key: 'onNoteDrop',
		value: function onNoteDrop(coords) {
			if (this.dragging) this.context.do('MOVE_NOTE', {
				from: this.dragging,
				to: coords
			});
		}
	}]);

	return WeaveView;
}(React.Component);

module.exports = WeaveView;

},{"../bind.js":8,"./ProjectModal.js":18,"./SliceView.js":22,"./WeaveBackground.js":25,"./WeaveHeaders.js":26,"preact":3}],28:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvZmlsZS1zYXZlci9GaWxlU2F2ZXIuanMiLCJub2RlX21vZHVsZXMvbHotc3RyaW5nL2xpYnMvbHotc3RyaW5nLmpzIiwibm9kZV9tb2R1bGVzL3ByZWFjdC9kaXN0L3ByZWFjdC5qcyIsInNyYy9BcHAuanMiLCJzcmMvU291cmNlcnkuanMiLCJzcmMvYWN0aW9ucy5qcyIsInNyYy9hc3NlcnQuanMiLCJzcmMvYmluZC5qcyIsInNyYy9jb2xvcnMuanMiLCJzcmMvY29tcG9uZW50cy9BcHBNZW51LmpzIiwic3JjL2NvbXBvbmVudHMvRGVsZXRlQnV0dG9uLmpzIiwic3JjL2NvbXBvbmVudHMvRXhwYW5kaW5nVGV4dGFyZWEuanMiLCJzcmMvY29tcG9uZW50cy9GaWxlT3BlbmVyLmpzIiwic3JjL2NvbXBvbmVudHMvSGVhZGVyRWRpdG9yLmpzIiwic3JjL2NvbXBvbmVudHMvTG9jYXRpb25MYWJlbC5qcyIsInNyYy9jb21wb25lbnRzL01vZGFsVmlldy5qcyIsInNyYy9jb21wb25lbnRzL1ByaW50TW9kYWwuanMiLCJzcmMvY29tcG9uZW50cy9Qcm9qZWN0TW9kYWwuanMiLCJzcmMvY29tcG9uZW50cy9TY2VuZUVkaXRvci5qcyIsInNyYy9jb21wb25lbnRzL1NjZW5lV3JpdGVyLmpzIiwic3JjL2NvbXBvbmVudHMvU2xpY2VIZWFkZXIuanMiLCJzcmMvY29tcG9uZW50cy9TbGljZVZpZXcuanMiLCJzcmMvY29tcG9uZW50cy9UaHJlYWRIZWFkZXIuanMiLCJzcmMvY29tcG9uZW50cy9UaHJlYWRMYWJlbC5qcyIsInNyYy9jb21wb25lbnRzL1dlYXZlQmFja2dyb3VuZC5qcyIsInNyYy9jb21wb25lbnRzL1dlYXZlSGVhZGVycy5qcyIsInNyYy9jb21wb25lbnRzL1dlYXZlVmlldy5qcyIsInNyYy9wb2x5ZmlsbHMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7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UyxFQUFDLFdBQWYsQUFBYyxBQUFZLEFBQzFCO0FBQ0Q7Ozs7NkIsQUFFVSxRQUFRLEFBQ2xCO1FBQUEsQUFBSyxXQUFMLEFBQWdCLEFBQ2hCOzs7OzZCLEFBRVUsUUFBUSxBQUNsQjtPQUFJLEtBQUosQUFBUyxlQUFVLEFBQUssUUFBTCxBQUFhLEdBQWIsQUFBZ0I7VUFDNUIsS0FEeUMsQUFDcEMsQUFDWDtRQUZrQixBQUE2QixBQUUzQyxBQUVMO0FBSmdELEFBQy9DLElBRGtCOzs7OztFQXBGRyxNLEFBQU07O0FBNEY5QixPQUFBLEFBQU8sVUFBUCxBQUFpQjs7Ozs7QUN0SWpCO0FBQ0E7QUFDQTs7QUFDQSxJQUFJLE9BQU8sT0FBUCxBQUFjLFVBQWxCLEFBQTRCLFlBQVksQUFDdkM7UUFBQSxBQUFPLFNBQVMsVUFBQSxBQUFTLFFBQVQsQUFBaUIsU0FBUyxBQUFFO0FBQzNDO0FBQ0E7O01BQUksVUFBSixBQUFjLE1BQU0sQUFBRTtBQUNyQjtTQUFNLElBQUEsQUFBSSxVQUFWLEFBQU0sQUFBYyxBQUNwQjtBQUVEOztNQUFJLEtBQUssT0FBVCxBQUFTLEFBQU8sQUFFaEI7O09BQUssSUFBSSxRQUFULEFBQWlCLEdBQUcsUUFBUSxVQUE1QixBQUFzQyxRQUF0QyxBQUE4QyxTQUFTLEFBQ3REO09BQUksYUFBYSxVQUFqQixBQUFpQixBQUFVLEFBRTNCOztPQUFJLGNBQUosQUFBa0IsTUFBTSxBQUFFO0FBQ3pCO1NBQUssSUFBTCxBQUFTLFdBQVQsQUFBb0IsWUFBWSxBQUMvQjtBQUNBO1NBQUksT0FBQSxBQUFPLFVBQVAsQUFBaUIsZUFBakIsQUFBZ0MsS0FBaEMsQUFBcUMsWUFBekMsQUFBSSxBQUFpRCxVQUFVLEFBQzlEO1NBQUEsQUFBRyxXQUFXLFdBQWQsQUFBYyxBQUFXLEFBQ3pCO0FBQ0Q7QUFDRDtBQUNEO0FBQ0Q7U0FBQSxBQUFPLEFBQ1A7QUFyQkQsQUFzQkEiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLyogRmlsZVNhdmVyLmpzXG4gKiBBIHNhdmVBcygpIEZpbGVTYXZlciBpbXBsZW1lbnRhdGlvbi5cbiAqIDEuMy4yXG4gKiAyMDE2LTA2LTE2IDE4OjI1OjE5XG4gKlxuICogQnkgRWxpIEdyZXksIGh0dHA6Ly9lbGlncmV5LmNvbVxuICogTGljZW5zZTogTUlUXG4gKiAgIFNlZSBodHRwczovL2dpdGh1Yi5jb20vZWxpZ3JleS9GaWxlU2F2ZXIuanMvYmxvYi9tYXN0ZXIvTElDRU5TRS5tZFxuICovXG5cbi8qZ2xvYmFsIHNlbGYgKi9cbi8qanNsaW50IGJpdHdpc2U6IHRydWUsIGluZGVudDogNCwgbGF4YnJlYWs6IHRydWUsIGxheGNvbW1hOiB0cnVlLCBzbWFydHRhYnM6IHRydWUsIHBsdXNwbHVzOiB0cnVlICovXG5cbi8qISBAc291cmNlIGh0dHA6Ly9wdXJsLmVsaWdyZXkuY29tL2dpdGh1Yi9GaWxlU2F2ZXIuanMvYmxvYi9tYXN0ZXIvRmlsZVNhdmVyLmpzICovXG5cbnZhciBzYXZlQXMgPSBzYXZlQXMgfHwgKGZ1bmN0aW9uKHZpZXcpIHtcblx0XCJ1c2Ugc3RyaWN0XCI7XG5cdC8vIElFIDwxMCBpcyBleHBsaWNpdGx5IHVuc3VwcG9ydGVkXG5cdGlmICh0eXBlb2YgdmlldyA9PT0gXCJ1bmRlZmluZWRcIiB8fCB0eXBlb2YgbmF2aWdhdG9yICE9PSBcInVuZGVmaW5lZFwiICYmIC9NU0lFIFsxLTldXFwuLy50ZXN0KG5hdmlnYXRvci51c2VyQWdlbnQpKSB7XG5cdFx0cmV0dXJuO1xuXHR9XG5cdHZhclxuXHRcdCAgZG9jID0gdmlldy5kb2N1bWVudFxuXHRcdCAgLy8gb25seSBnZXQgVVJMIHdoZW4gbmVjZXNzYXJ5IGluIGNhc2UgQmxvYi5qcyBoYXNuJ3Qgb3ZlcnJpZGRlbiBpdCB5ZXRcblx0XHQsIGdldF9VUkwgPSBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiB2aWV3LlVSTCB8fCB2aWV3LndlYmtpdFVSTCB8fCB2aWV3O1xuXHRcdH1cblx0XHQsIHNhdmVfbGluayA9IGRvYy5jcmVhdGVFbGVtZW50TlMoXCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hodG1sXCIsIFwiYVwiKVxuXHRcdCwgY2FuX3VzZV9zYXZlX2xpbmsgPSBcImRvd25sb2FkXCIgaW4gc2F2ZV9saW5rXG5cdFx0LCBjbGljayA9IGZ1bmN0aW9uKG5vZGUpIHtcblx0XHRcdHZhciBldmVudCA9IG5ldyBNb3VzZUV2ZW50KFwiY2xpY2tcIik7XG5cdFx0XHRub2RlLmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuXHRcdH1cblx0XHQsIGlzX3NhZmFyaSA9IC9jb25zdHJ1Y3Rvci9pLnRlc3Qodmlldy5IVE1MRWxlbWVudCkgfHwgdmlldy5zYWZhcmlcblx0XHQsIGlzX2Nocm9tZV9pb3MgPS9DcmlPU1xcL1tcXGRdKy8udGVzdChuYXZpZ2F0b3IudXNlckFnZW50KVxuXHRcdCwgdGhyb3dfb3V0c2lkZSA9IGZ1bmN0aW9uKGV4KSB7XG5cdFx0XHQodmlldy5zZXRJbW1lZGlhdGUgfHwgdmlldy5zZXRUaW1lb3V0KShmdW5jdGlvbigpIHtcblx0XHRcdFx0dGhyb3cgZXg7XG5cdFx0XHR9LCAwKTtcblx0XHR9XG5cdFx0LCBmb3JjZV9zYXZlYWJsZV90eXBlID0gXCJhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW1cIlxuXHRcdC8vIHRoZSBCbG9iIEFQSSBpcyBmdW5kYW1lbnRhbGx5IGJyb2tlbiBhcyB0aGVyZSBpcyBubyBcImRvd25sb2FkZmluaXNoZWRcIiBldmVudCB0byBzdWJzY3JpYmUgdG9cblx0XHQsIGFyYml0cmFyeV9yZXZva2VfdGltZW91dCA9IDEwMDAgKiA0MCAvLyBpbiBtc1xuXHRcdCwgcmV2b2tlID0gZnVuY3Rpb24oZmlsZSkge1xuXHRcdFx0dmFyIHJldm9rZXIgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0aWYgKHR5cGVvZiBmaWxlID09PSBcInN0cmluZ1wiKSB7IC8vIGZpbGUgaXMgYW4gb2JqZWN0IFVSTFxuXHRcdFx0XHRcdGdldF9VUkwoKS5yZXZva2VPYmplY3RVUkwoZmlsZSk7XG5cdFx0XHRcdH0gZWxzZSB7IC8vIGZpbGUgaXMgYSBGaWxlXG5cdFx0XHRcdFx0ZmlsZS5yZW1vdmUoKTtcblx0XHRcdFx0fVxuXHRcdFx0fTtcblx0XHRcdHNldFRpbWVvdXQocmV2b2tlciwgYXJiaXRyYXJ5X3Jldm9rZV90aW1lb3V0KTtcblx0XHR9XG5cdFx0LCBkaXNwYXRjaCA9IGZ1bmN0aW9uKGZpbGVzYXZlciwgZXZlbnRfdHlwZXMsIGV2ZW50KSB7XG5cdFx0XHRldmVudF90eXBlcyA9IFtdLmNvbmNhdChldmVudF90eXBlcyk7XG5cdFx0XHR2YXIgaSA9IGV2ZW50X3R5cGVzLmxlbmd0aDtcblx0XHRcdHdoaWxlIChpLS0pIHtcblx0XHRcdFx0dmFyIGxpc3RlbmVyID0gZmlsZXNhdmVyW1wib25cIiArIGV2ZW50X3R5cGVzW2ldXTtcblx0XHRcdFx0aWYgKHR5cGVvZiBsaXN0ZW5lciA9PT0gXCJmdW5jdGlvblwiKSB7XG5cdFx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRcdGxpc3RlbmVyLmNhbGwoZmlsZXNhdmVyLCBldmVudCB8fCBmaWxlc2F2ZXIpO1xuXHRcdFx0XHRcdH0gY2F0Y2ggKGV4KSB7XG5cdFx0XHRcdFx0XHR0aHJvd19vdXRzaWRlKGV4KTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdFx0LCBhdXRvX2JvbSA9IGZ1bmN0aW9uKGJsb2IpIHtcblx0XHRcdC8vIHByZXBlbmQgQk9NIGZvciBVVEYtOCBYTUwgYW5kIHRleHQvKiB0eXBlcyAoaW5jbHVkaW5nIEhUTUwpXG5cdFx0XHQvLyBub3RlOiB5b3VyIGJyb3dzZXIgd2lsbCBhdXRvbWF0aWNhbGx5IGNvbnZlcnQgVVRGLTE2IFUrRkVGRiB0byBFRiBCQiBCRlxuXHRcdFx0aWYgKC9eXFxzKig/OnRleHRcXC9cXFMqfGFwcGxpY2F0aW9uXFwveG1sfFxcUypcXC9cXFMqXFwreG1sKVxccyo7LipjaGFyc2V0XFxzKj1cXHMqdXRmLTgvaS50ZXN0KGJsb2IudHlwZSkpIHtcblx0XHRcdFx0cmV0dXJuIG5ldyBCbG9iKFtTdHJpbmcuZnJvbUNoYXJDb2RlKDB4RkVGRiksIGJsb2JdLCB7dHlwZTogYmxvYi50eXBlfSk7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gYmxvYjtcblx0XHR9XG5cdFx0LCBGaWxlU2F2ZXIgPSBmdW5jdGlvbihibG9iLCBuYW1lLCBub19hdXRvX2JvbSkge1xuXHRcdFx0aWYgKCFub19hdXRvX2JvbSkge1xuXHRcdFx0XHRibG9iID0gYXV0b19ib20oYmxvYik7XG5cdFx0XHR9XG5cdFx0XHQvLyBGaXJzdCB0cnkgYS5kb3dubG9hZCwgdGhlbiB3ZWIgZmlsZXN5c3RlbSwgdGhlbiBvYmplY3QgVVJMc1xuXHRcdFx0dmFyXG5cdFx0XHRcdCAgZmlsZXNhdmVyID0gdGhpc1xuXHRcdFx0XHQsIHR5cGUgPSBibG9iLnR5cGVcblx0XHRcdFx0LCBmb3JjZSA9IHR5cGUgPT09IGZvcmNlX3NhdmVhYmxlX3R5cGVcblx0XHRcdFx0LCBvYmplY3RfdXJsXG5cdFx0XHRcdCwgZGlzcGF0Y2hfYWxsID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0ZGlzcGF0Y2goZmlsZXNhdmVyLCBcIndyaXRlc3RhcnQgcHJvZ3Jlc3Mgd3JpdGUgd3JpdGVlbmRcIi5zcGxpdChcIiBcIikpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdC8vIG9uIGFueSBmaWxlc3lzIGVycm9ycyByZXZlcnQgdG8gc2F2aW5nIHdpdGggb2JqZWN0IFVSTHNcblx0XHRcdFx0LCBmc19lcnJvciA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGlmICgoaXNfY2hyb21lX2lvcyB8fCAoZm9yY2UgJiYgaXNfc2FmYXJpKSkgJiYgdmlldy5GaWxlUmVhZGVyKSB7XG5cdFx0XHRcdFx0XHQvLyBTYWZhcmkgZG9lc24ndCBhbGxvdyBkb3dubG9hZGluZyBvZiBibG9iIHVybHNcblx0XHRcdFx0XHRcdHZhciByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpO1xuXHRcdFx0XHRcdFx0cmVhZGVyLm9ubG9hZGVuZCA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0XHR2YXIgdXJsID0gaXNfY2hyb21lX2lvcyA/IHJlYWRlci5yZXN1bHQgOiByZWFkZXIucmVzdWx0LnJlcGxhY2UoL15kYXRhOlteO10qOy8sICdkYXRhOmF0dGFjaG1lbnQvZmlsZTsnKTtcblx0XHRcdFx0XHRcdFx0dmFyIHBvcHVwID0gdmlldy5vcGVuKHVybCwgJ19ibGFuaycpO1xuXHRcdFx0XHRcdFx0XHRpZighcG9wdXApIHZpZXcubG9jYXRpb24uaHJlZiA9IHVybDtcblx0XHRcdFx0XHRcdFx0dXJsPXVuZGVmaW5lZDsgLy8gcmVsZWFzZSByZWZlcmVuY2UgYmVmb3JlIGRpc3BhdGNoaW5nXG5cdFx0XHRcdFx0XHRcdGZpbGVzYXZlci5yZWFkeVN0YXRlID0gZmlsZXNhdmVyLkRPTkU7XG5cdFx0XHRcdFx0XHRcdGRpc3BhdGNoX2FsbCgpO1xuXHRcdFx0XHRcdFx0fTtcblx0XHRcdFx0XHRcdHJlYWRlci5yZWFkQXNEYXRhVVJMKGJsb2IpO1xuXHRcdFx0XHRcdFx0ZmlsZXNhdmVyLnJlYWR5U3RhdGUgPSBmaWxlc2F2ZXIuSU5JVDtcblx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0Ly8gZG9uJ3QgY3JlYXRlIG1vcmUgb2JqZWN0IFVSTHMgdGhhbiBuZWVkZWRcblx0XHRcdFx0XHRpZiAoIW9iamVjdF91cmwpIHtcblx0XHRcdFx0XHRcdG9iamVjdF91cmwgPSBnZXRfVVJMKCkuY3JlYXRlT2JqZWN0VVJMKGJsb2IpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAoZm9yY2UpIHtcblx0XHRcdFx0XHRcdHZpZXcubG9jYXRpb24uaHJlZiA9IG9iamVjdF91cmw7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdHZhciBvcGVuZWQgPSB2aWV3Lm9wZW4ob2JqZWN0X3VybCwgXCJfYmxhbmtcIik7XG5cdFx0XHRcdFx0XHRpZiAoIW9wZW5lZCkge1xuXHRcdFx0XHRcdFx0XHQvLyBBcHBsZSBkb2VzIG5vdCBhbGxvdyB3aW5kb3cub3Blbiwgc2VlIGh0dHBzOi8vZGV2ZWxvcGVyLmFwcGxlLmNvbS9saWJyYXJ5L3NhZmFyaS9kb2N1bWVudGF0aW9uL1Rvb2xzL0NvbmNlcHR1YWwvU2FmYXJpRXh0ZW5zaW9uR3VpZGUvV29ya2luZ3dpdGhXaW5kb3dzYW5kVGFicy9Xb3JraW5nd2l0aFdpbmRvd3NhbmRUYWJzLmh0bWxcblx0XHRcdFx0XHRcdFx0dmlldy5sb2NhdGlvbi5ocmVmID0gb2JqZWN0X3VybDtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZmlsZXNhdmVyLnJlYWR5U3RhdGUgPSBmaWxlc2F2ZXIuRE9ORTtcblx0XHRcdFx0XHRkaXNwYXRjaF9hbGwoKTtcblx0XHRcdFx0XHRyZXZva2Uob2JqZWN0X3VybCk7XG5cdFx0XHRcdH1cblx0XHRcdDtcblx0XHRcdGZpbGVzYXZlci5yZWFkeVN0YXRlID0gZmlsZXNhdmVyLklOSVQ7XG5cblx0XHRcdGlmIChjYW5fdXNlX3NhdmVfbGluaykge1xuXHRcdFx0XHRvYmplY3RfdXJsID0gZ2V0X1VSTCgpLmNyZWF0ZU9iamVjdFVSTChibG9iKTtcblx0XHRcdFx0c2V0VGltZW91dChmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRzYXZlX2xpbmsuaHJlZiA9IG9iamVjdF91cmw7XG5cdFx0XHRcdFx0c2F2ZV9saW5rLmRvd25sb2FkID0gbmFtZTtcblx0XHRcdFx0XHRjbGljayhzYXZlX2xpbmspO1xuXHRcdFx0XHRcdGRpc3BhdGNoX2FsbCgpO1xuXHRcdFx0XHRcdHJldm9rZShvYmplY3RfdXJsKTtcblx0XHRcdFx0XHRmaWxlc2F2ZXIucmVhZHlTdGF0ZSA9IGZpbGVzYXZlci5ET05FO1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHRmc19lcnJvcigpO1xuXHRcdH1cblx0XHQsIEZTX3Byb3RvID0gRmlsZVNhdmVyLnByb3RvdHlwZVxuXHRcdCwgc2F2ZUFzID0gZnVuY3Rpb24oYmxvYiwgbmFtZSwgbm9fYXV0b19ib20pIHtcblx0XHRcdHJldHVybiBuZXcgRmlsZVNhdmVyKGJsb2IsIG5hbWUgfHwgYmxvYi5uYW1lIHx8IFwiZG93bmxvYWRcIiwgbm9fYXV0b19ib20pO1xuXHRcdH1cblx0O1xuXHQvLyBJRSAxMCsgKG5hdGl2ZSBzYXZlQXMpXG5cdGlmICh0eXBlb2YgbmF2aWdhdG9yICE9PSBcInVuZGVmaW5lZFwiICYmIG5hdmlnYXRvci5tc1NhdmVPck9wZW5CbG9iKSB7XG5cdFx0cmV0dXJuIGZ1bmN0aW9uKGJsb2IsIG5hbWUsIG5vX2F1dG9fYm9tKSB7XG5cdFx0XHRuYW1lID0gbmFtZSB8fCBibG9iLm5hbWUgfHwgXCJkb3dubG9hZFwiO1xuXG5cdFx0XHRpZiAoIW5vX2F1dG9fYm9tKSB7XG5cdFx0XHRcdGJsb2IgPSBhdXRvX2JvbShibG9iKTtcblx0XHRcdH1cblx0XHRcdHJldHVybiBuYXZpZ2F0b3IubXNTYXZlT3JPcGVuQmxvYihibG9iLCBuYW1lKTtcblx0XHR9O1xuXHR9XG5cblx0RlNfcHJvdG8uYWJvcnQgPSBmdW5jdGlvbigpe307XG5cdEZTX3Byb3RvLnJlYWR5U3RhdGUgPSBGU19wcm90by5JTklUID0gMDtcblx0RlNfcHJvdG8uV1JJVElORyA9IDE7XG5cdEZTX3Byb3RvLkRPTkUgPSAyO1xuXG5cdEZTX3Byb3RvLmVycm9yID1cblx0RlNfcHJvdG8ub253cml0ZXN0YXJ0ID1cblx0RlNfcHJvdG8ub25wcm9ncmVzcyA9XG5cdEZTX3Byb3RvLm9ud3JpdGUgPVxuXHRGU19wcm90by5vbmFib3J0ID1cblx0RlNfcHJvdG8ub25lcnJvciA9XG5cdEZTX3Byb3RvLm9ud3JpdGVlbmQgPVxuXHRcdG51bGw7XG5cblx0cmV0dXJuIHNhdmVBcztcbn0oXG5cdCAgIHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiICYmIHNlbGZcblx0fHwgdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiAmJiB3aW5kb3dcblx0fHwgdGhpcy5jb250ZW50XG4pKTtcbi8vIGBzZWxmYCBpcyB1bmRlZmluZWQgaW4gRmlyZWZveCBmb3IgQW5kcm9pZCBjb250ZW50IHNjcmlwdCBjb250ZXh0XG4vLyB3aGlsZSBgdGhpc2AgaXMgbnNJQ29udGVudEZyYW1lTWVzc2FnZU1hbmFnZXJcbi8vIHdpdGggYW4gYXR0cmlidXRlIGBjb250ZW50YCB0aGF0IGNvcnJlc3BvbmRzIHRvIHRoZSB3aW5kb3dcblxuaWYgKHR5cGVvZiBtb2R1bGUgIT09IFwidW5kZWZpbmVkXCIgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgbW9kdWxlLmV4cG9ydHMuc2F2ZUFzID0gc2F2ZUFzO1xufSBlbHNlIGlmICgodHlwZW9mIGRlZmluZSAhPT0gXCJ1bmRlZmluZWRcIiAmJiBkZWZpbmUgIT09IG51bGwpICYmIChkZWZpbmUuYW1kICE9PSBudWxsKSkge1xuICBkZWZpbmUoXCJGaWxlU2F2ZXIuanNcIiwgZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHNhdmVBcztcbiAgfSk7XG59XG4iLCIvLyBDb3B5cmlnaHQgKGMpIDIwMTMgUGllcm94eSA8cGllcm94eUBwaWVyb3h5Lm5ldD5cbi8vIFRoaXMgd29yayBpcyBmcmVlLiBZb3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5IGl0XG4vLyB1bmRlciB0aGUgdGVybXMgb2YgdGhlIFdURlBMLCBWZXJzaW9uIDJcbi8vIEZvciBtb3JlIGluZm9ybWF0aW9uIHNlZSBMSUNFTlNFLnR4dCBvciBodHRwOi8vd3d3Lnd0ZnBsLm5ldC9cbi8vXG4vLyBGb3IgbW9yZSBpbmZvcm1hdGlvbiwgdGhlIGhvbWUgcGFnZTpcbi8vIGh0dHA6Ly9waWVyb3h5Lm5ldC9ibG9nL3BhZ2VzL2x6LXN0cmluZy90ZXN0aW5nLmh0bWxcbi8vXG4vLyBMWi1iYXNlZCBjb21wcmVzc2lvbiBhbGdvcml0aG0sIHZlcnNpb24gMS40LjRcbnZhciBMWlN0cmluZyA9IChmdW5jdGlvbigpIHtcblxuLy8gcHJpdmF0ZSBwcm9wZXJ0eVxudmFyIGYgPSBTdHJpbmcuZnJvbUNoYXJDb2RlO1xudmFyIGtleVN0ckJhc2U2NCA9IFwiQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0NTY3ODkrLz1cIjtcbnZhciBrZXlTdHJVcmlTYWZlID0gXCJBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6MDEyMzQ1Njc4OSstJFwiO1xudmFyIGJhc2VSZXZlcnNlRGljID0ge307XG5cbmZ1bmN0aW9uIGdldEJhc2VWYWx1ZShhbHBoYWJldCwgY2hhcmFjdGVyKSB7XG4gIGlmICghYmFzZVJldmVyc2VEaWNbYWxwaGFiZXRdKSB7XG4gICAgYmFzZVJldmVyc2VEaWNbYWxwaGFiZXRdID0ge307XG4gICAgZm9yICh2YXIgaT0wIDsgaTxhbHBoYWJldC5sZW5ndGggOyBpKyspIHtcbiAgICAgIGJhc2VSZXZlcnNlRGljW2FscGhhYmV0XVthbHBoYWJldC5jaGFyQXQoaSldID0gaTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGJhc2VSZXZlcnNlRGljW2FscGhhYmV0XVtjaGFyYWN0ZXJdO1xufVxuXG52YXIgTFpTdHJpbmcgPSB7XG4gIGNvbXByZXNzVG9CYXNlNjQgOiBmdW5jdGlvbiAoaW5wdXQpIHtcbiAgICBpZiAoaW5wdXQgPT0gbnVsbCkgcmV0dXJuIFwiXCI7XG4gICAgdmFyIHJlcyA9IExaU3RyaW5nLl9jb21wcmVzcyhpbnB1dCwgNiwgZnVuY3Rpb24oYSl7cmV0dXJuIGtleVN0ckJhc2U2NC5jaGFyQXQoYSk7fSk7XG4gICAgc3dpdGNoIChyZXMubGVuZ3RoICUgNCkgeyAvLyBUbyBwcm9kdWNlIHZhbGlkIEJhc2U2NFxuICAgIGRlZmF1bHQ6IC8vIFdoZW4gY291bGQgdGhpcyBoYXBwZW4gP1xuICAgIGNhc2UgMCA6IHJldHVybiByZXM7XG4gICAgY2FzZSAxIDogcmV0dXJuIHJlcytcIj09PVwiO1xuICAgIGNhc2UgMiA6IHJldHVybiByZXMrXCI9PVwiO1xuICAgIGNhc2UgMyA6IHJldHVybiByZXMrXCI9XCI7XG4gICAgfVxuICB9LFxuXG4gIGRlY29tcHJlc3NGcm9tQmFzZTY0IDogZnVuY3Rpb24gKGlucHV0KSB7XG4gICAgaWYgKGlucHV0ID09IG51bGwpIHJldHVybiBcIlwiO1xuICAgIGlmIChpbnB1dCA9PSBcIlwiKSByZXR1cm4gbnVsbDtcbiAgICByZXR1cm4gTFpTdHJpbmcuX2RlY29tcHJlc3MoaW5wdXQubGVuZ3RoLCAzMiwgZnVuY3Rpb24oaW5kZXgpIHsgcmV0dXJuIGdldEJhc2VWYWx1ZShrZXlTdHJCYXNlNjQsIGlucHV0LmNoYXJBdChpbmRleCkpOyB9KTtcbiAgfSxcblxuICBjb21wcmVzc1RvVVRGMTYgOiBmdW5jdGlvbiAoaW5wdXQpIHtcbiAgICBpZiAoaW5wdXQgPT0gbnVsbCkgcmV0dXJuIFwiXCI7XG4gICAgcmV0dXJuIExaU3RyaW5nLl9jb21wcmVzcyhpbnB1dCwgMTUsIGZ1bmN0aW9uKGEpe3JldHVybiBmKGErMzIpO30pICsgXCIgXCI7XG4gIH0sXG5cbiAgZGVjb21wcmVzc0Zyb21VVEYxNjogZnVuY3Rpb24gKGNvbXByZXNzZWQpIHtcbiAgICBpZiAoY29tcHJlc3NlZCA9PSBudWxsKSByZXR1cm4gXCJcIjtcbiAgICBpZiAoY29tcHJlc3NlZCA9PSBcIlwiKSByZXR1cm4gbnVsbDtcbiAgICByZXR1cm4gTFpTdHJpbmcuX2RlY29tcHJlc3MoY29tcHJlc3NlZC5sZW5ndGgsIDE2Mzg0LCBmdW5jdGlvbihpbmRleCkgeyByZXR1cm4gY29tcHJlc3NlZC5jaGFyQ29kZUF0KGluZGV4KSAtIDMyOyB9KTtcbiAgfSxcblxuICAvL2NvbXByZXNzIGludG8gdWludDhhcnJheSAoVUNTLTIgYmlnIGVuZGlhbiBmb3JtYXQpXG4gIGNvbXByZXNzVG9VaW50OEFycmF5OiBmdW5jdGlvbiAodW5jb21wcmVzc2VkKSB7XG4gICAgdmFyIGNvbXByZXNzZWQgPSBMWlN0cmluZy5jb21wcmVzcyh1bmNvbXByZXNzZWQpO1xuICAgIHZhciBidWY9bmV3IFVpbnQ4QXJyYXkoY29tcHJlc3NlZC5sZW5ndGgqMik7IC8vIDIgYnl0ZXMgcGVyIGNoYXJhY3RlclxuXG4gICAgZm9yICh2YXIgaT0wLCBUb3RhbExlbj1jb21wcmVzc2VkLmxlbmd0aDsgaTxUb3RhbExlbjsgaSsrKSB7XG4gICAgICB2YXIgY3VycmVudF92YWx1ZSA9IGNvbXByZXNzZWQuY2hhckNvZGVBdChpKTtcbiAgICAgIGJ1ZltpKjJdID0gY3VycmVudF92YWx1ZSA+Pj4gODtcbiAgICAgIGJ1ZltpKjIrMV0gPSBjdXJyZW50X3ZhbHVlICUgMjU2O1xuICAgIH1cbiAgICByZXR1cm4gYnVmO1xuICB9LFxuXG4gIC8vZGVjb21wcmVzcyBmcm9tIHVpbnQ4YXJyYXkgKFVDUy0yIGJpZyBlbmRpYW4gZm9ybWF0KVxuICBkZWNvbXByZXNzRnJvbVVpbnQ4QXJyYXk6ZnVuY3Rpb24gKGNvbXByZXNzZWQpIHtcbiAgICBpZiAoY29tcHJlc3NlZD09PW51bGwgfHwgY29tcHJlc3NlZD09PXVuZGVmaW5lZCl7XG4gICAgICAgIHJldHVybiBMWlN0cmluZy5kZWNvbXByZXNzKGNvbXByZXNzZWQpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBidWY9bmV3IEFycmF5KGNvbXByZXNzZWQubGVuZ3RoLzIpOyAvLyAyIGJ5dGVzIHBlciBjaGFyYWN0ZXJcbiAgICAgICAgZm9yICh2YXIgaT0wLCBUb3RhbExlbj1idWYubGVuZ3RoOyBpPFRvdGFsTGVuOyBpKyspIHtcbiAgICAgICAgICBidWZbaV09Y29tcHJlc3NlZFtpKjJdKjI1Nitjb21wcmVzc2VkW2kqMisxXTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciByZXN1bHQgPSBbXTtcbiAgICAgICAgYnVmLmZvckVhY2goZnVuY3Rpb24gKGMpIHtcbiAgICAgICAgICByZXN1bHQucHVzaChmKGMpKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBMWlN0cmluZy5kZWNvbXByZXNzKHJlc3VsdC5qb2luKCcnKSk7XG5cbiAgICB9XG5cbiAgfSxcblxuXG4gIC8vY29tcHJlc3MgaW50byBhIHN0cmluZyB0aGF0IGlzIGFscmVhZHkgVVJJIGVuY29kZWRcbiAgY29tcHJlc3NUb0VuY29kZWRVUklDb21wb25lbnQ6IGZ1bmN0aW9uIChpbnB1dCkge1xuICAgIGlmIChpbnB1dCA9PSBudWxsKSByZXR1cm4gXCJcIjtcbiAgICByZXR1cm4gTFpTdHJpbmcuX2NvbXByZXNzKGlucHV0LCA2LCBmdW5jdGlvbihhKXtyZXR1cm4ga2V5U3RyVXJpU2FmZS5jaGFyQXQoYSk7fSk7XG4gIH0sXG5cbiAgLy9kZWNvbXByZXNzIGZyb20gYW4gb3V0cHV0IG9mIGNvbXByZXNzVG9FbmNvZGVkVVJJQ29tcG9uZW50XG4gIGRlY29tcHJlc3NGcm9tRW5jb2RlZFVSSUNvbXBvbmVudDpmdW5jdGlvbiAoaW5wdXQpIHtcbiAgICBpZiAoaW5wdXQgPT0gbnVsbCkgcmV0dXJuIFwiXCI7XG4gICAgaWYgKGlucHV0ID09IFwiXCIpIHJldHVybiBudWxsO1xuICAgIGlucHV0ID0gaW5wdXQucmVwbGFjZSgvIC9nLCBcIitcIik7XG4gICAgcmV0dXJuIExaU3RyaW5nLl9kZWNvbXByZXNzKGlucHV0Lmxlbmd0aCwgMzIsIGZ1bmN0aW9uKGluZGV4KSB7IHJldHVybiBnZXRCYXNlVmFsdWUoa2V5U3RyVXJpU2FmZSwgaW5wdXQuY2hhckF0KGluZGV4KSk7IH0pO1xuICB9LFxuXG4gIGNvbXByZXNzOiBmdW5jdGlvbiAodW5jb21wcmVzc2VkKSB7XG4gICAgcmV0dXJuIExaU3RyaW5nLl9jb21wcmVzcyh1bmNvbXByZXNzZWQsIDE2LCBmdW5jdGlvbihhKXtyZXR1cm4gZihhKTt9KTtcbiAgfSxcbiAgX2NvbXByZXNzOiBmdW5jdGlvbiAodW5jb21wcmVzc2VkLCBiaXRzUGVyQ2hhciwgZ2V0Q2hhckZyb21JbnQpIHtcbiAgICBpZiAodW5jb21wcmVzc2VkID09IG51bGwpIHJldHVybiBcIlwiO1xuICAgIHZhciBpLCB2YWx1ZSxcbiAgICAgICAgY29udGV4dF9kaWN0aW9uYXJ5PSB7fSxcbiAgICAgICAgY29udGV4dF9kaWN0aW9uYXJ5VG9DcmVhdGU9IHt9LFxuICAgICAgICBjb250ZXh0X2M9XCJcIixcbiAgICAgICAgY29udGV4dF93Yz1cIlwiLFxuICAgICAgICBjb250ZXh0X3c9XCJcIixcbiAgICAgICAgY29udGV4dF9lbmxhcmdlSW49IDIsIC8vIENvbXBlbnNhdGUgZm9yIHRoZSBmaXJzdCBlbnRyeSB3aGljaCBzaG91bGQgbm90IGNvdW50XG4gICAgICAgIGNvbnRleHRfZGljdFNpemU9IDMsXG4gICAgICAgIGNvbnRleHRfbnVtQml0cz0gMixcbiAgICAgICAgY29udGV4dF9kYXRhPVtdLFxuICAgICAgICBjb250ZXh0X2RhdGFfdmFsPTAsXG4gICAgICAgIGNvbnRleHRfZGF0YV9wb3NpdGlvbj0wLFxuICAgICAgICBpaTtcblxuICAgIGZvciAoaWkgPSAwOyBpaSA8IHVuY29tcHJlc3NlZC5sZW5ndGg7IGlpICs9IDEpIHtcbiAgICAgIGNvbnRleHRfYyA9IHVuY29tcHJlc3NlZC5jaGFyQXQoaWkpO1xuICAgICAgaWYgKCFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoY29udGV4dF9kaWN0aW9uYXJ5LGNvbnRleHRfYykpIHtcbiAgICAgICAgY29udGV4dF9kaWN0aW9uYXJ5W2NvbnRleHRfY10gPSBjb250ZXh0X2RpY3RTaXplKys7XG4gICAgICAgIGNvbnRleHRfZGljdGlvbmFyeVRvQ3JlYXRlW2NvbnRleHRfY10gPSB0cnVlO1xuICAgICAgfVxuXG4gICAgICBjb250ZXh0X3djID0gY29udGV4dF93ICsgY29udGV4dF9jO1xuICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChjb250ZXh0X2RpY3Rpb25hcnksY29udGV4dF93YykpIHtcbiAgICAgICAgY29udGV4dF93ID0gY29udGV4dF93YztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoY29udGV4dF9kaWN0aW9uYXJ5VG9DcmVhdGUsY29udGV4dF93KSkge1xuICAgICAgICAgIGlmIChjb250ZXh0X3cuY2hhckNvZGVBdCgwKTwyNTYpIHtcbiAgICAgICAgICAgIGZvciAoaT0wIDsgaTxjb250ZXh0X251bUJpdHMgOyBpKyspIHtcbiAgICAgICAgICAgICAgY29udGV4dF9kYXRhX3ZhbCA9IChjb250ZXh0X2RhdGFfdmFsIDw8IDEpO1xuICAgICAgICAgICAgICBpZiAoY29udGV4dF9kYXRhX3Bvc2l0aW9uID09IGJpdHNQZXJDaGFyLTEpIHtcbiAgICAgICAgICAgICAgICBjb250ZXh0X2RhdGFfcG9zaXRpb24gPSAwO1xuICAgICAgICAgICAgICAgIGNvbnRleHRfZGF0YS5wdXNoKGdldENoYXJGcm9tSW50KGNvbnRleHRfZGF0YV92YWwpKTtcbiAgICAgICAgICAgICAgICBjb250ZXh0X2RhdGFfdmFsID0gMDtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb250ZXh0X2RhdGFfcG9zaXRpb24rKztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFsdWUgPSBjb250ZXh0X3cuY2hhckNvZGVBdCgwKTtcbiAgICAgICAgICAgIGZvciAoaT0wIDsgaTw4IDsgaSsrKSB7XG4gICAgICAgICAgICAgIGNvbnRleHRfZGF0YV92YWwgPSAoY29udGV4dF9kYXRhX3ZhbCA8PCAxKSB8ICh2YWx1ZSYxKTtcbiAgICAgICAgICAgICAgaWYgKGNvbnRleHRfZGF0YV9wb3NpdGlvbiA9PSBiaXRzUGVyQ2hhci0xKSB7XG4gICAgICAgICAgICAgICAgY29udGV4dF9kYXRhX3Bvc2l0aW9uID0gMDtcbiAgICAgICAgICAgICAgICBjb250ZXh0X2RhdGEucHVzaChnZXRDaGFyRnJvbUludChjb250ZXh0X2RhdGFfdmFsKSk7XG4gICAgICAgICAgICAgICAgY29udGV4dF9kYXRhX3ZhbCA9IDA7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29udGV4dF9kYXRhX3Bvc2l0aW9uKys7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZSA+PiAxO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YWx1ZSA9IDE7XG4gICAgICAgICAgICBmb3IgKGk9MCA7IGk8Y29udGV4dF9udW1CaXRzIDsgaSsrKSB7XG4gICAgICAgICAgICAgIGNvbnRleHRfZGF0YV92YWwgPSAoY29udGV4dF9kYXRhX3ZhbCA8PCAxKSB8IHZhbHVlO1xuICAgICAgICAgICAgICBpZiAoY29udGV4dF9kYXRhX3Bvc2l0aW9uID09Yml0c1BlckNoYXItMSkge1xuICAgICAgICAgICAgICAgIGNvbnRleHRfZGF0YV9wb3NpdGlvbiA9IDA7XG4gICAgICAgICAgICAgICAgY29udGV4dF9kYXRhLnB1c2goZ2V0Q2hhckZyb21JbnQoY29udGV4dF9kYXRhX3ZhbCkpO1xuICAgICAgICAgICAgICAgIGNvbnRleHRfZGF0YV92YWwgPSAwO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnRleHRfZGF0YV9wb3NpdGlvbisrO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIHZhbHVlID0gMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhbHVlID0gY29udGV4dF93LmNoYXJDb2RlQXQoMCk7XG4gICAgICAgICAgICBmb3IgKGk9MCA7IGk8MTYgOyBpKyspIHtcbiAgICAgICAgICAgICAgY29udGV4dF9kYXRhX3ZhbCA9IChjb250ZXh0X2RhdGFfdmFsIDw8IDEpIHwgKHZhbHVlJjEpO1xuICAgICAgICAgICAgICBpZiAoY29udGV4dF9kYXRhX3Bvc2l0aW9uID09IGJpdHNQZXJDaGFyLTEpIHtcbiAgICAgICAgICAgICAgICBjb250ZXh0X2RhdGFfcG9zaXRpb24gPSAwO1xuICAgICAgICAgICAgICAgIGNvbnRleHRfZGF0YS5wdXNoKGdldENoYXJGcm9tSW50KGNvbnRleHRfZGF0YV92YWwpKTtcbiAgICAgICAgICAgICAgICBjb250ZXh0X2RhdGFfdmFsID0gMDtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb250ZXh0X2RhdGFfcG9zaXRpb24rKztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB2YWx1ZSA9IHZhbHVlID4+IDE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnRleHRfZW5sYXJnZUluLS07XG4gICAgICAgICAgaWYgKGNvbnRleHRfZW5sYXJnZUluID09IDApIHtcbiAgICAgICAgICAgIGNvbnRleHRfZW5sYXJnZUluID0gTWF0aC5wb3coMiwgY29udGV4dF9udW1CaXRzKTtcbiAgICAgICAgICAgIGNvbnRleHRfbnVtQml0cysrO1xuICAgICAgICAgIH1cbiAgICAgICAgICBkZWxldGUgY29udGV4dF9kaWN0aW9uYXJ5VG9DcmVhdGVbY29udGV4dF93XTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB2YWx1ZSA9IGNvbnRleHRfZGljdGlvbmFyeVtjb250ZXh0X3ddO1xuICAgICAgICAgIGZvciAoaT0wIDsgaTxjb250ZXh0X251bUJpdHMgOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnRleHRfZGF0YV92YWwgPSAoY29udGV4dF9kYXRhX3ZhbCA8PCAxKSB8ICh2YWx1ZSYxKTtcbiAgICAgICAgICAgIGlmIChjb250ZXh0X2RhdGFfcG9zaXRpb24gPT0gYml0c1BlckNoYXItMSkge1xuICAgICAgICAgICAgICBjb250ZXh0X2RhdGFfcG9zaXRpb24gPSAwO1xuICAgICAgICAgICAgICBjb250ZXh0X2RhdGEucHVzaChnZXRDaGFyRnJvbUludChjb250ZXh0X2RhdGFfdmFsKSk7XG4gICAgICAgICAgICAgIGNvbnRleHRfZGF0YV92YWwgPSAwO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgY29udGV4dF9kYXRhX3Bvc2l0aW9uKys7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YWx1ZSA9IHZhbHVlID4+IDE7XG4gICAgICAgICAgfVxuXG5cbiAgICAgICAgfVxuICAgICAgICBjb250ZXh0X2VubGFyZ2VJbi0tO1xuICAgICAgICBpZiAoY29udGV4dF9lbmxhcmdlSW4gPT0gMCkge1xuICAgICAgICAgIGNvbnRleHRfZW5sYXJnZUluID0gTWF0aC5wb3coMiwgY29udGV4dF9udW1CaXRzKTtcbiAgICAgICAgICBjb250ZXh0X251bUJpdHMrKztcbiAgICAgICAgfVxuICAgICAgICAvLyBBZGQgd2MgdG8gdGhlIGRpY3Rpb25hcnkuXG4gICAgICAgIGNvbnRleHRfZGljdGlvbmFyeVtjb250ZXh0X3djXSA9IGNvbnRleHRfZGljdFNpemUrKztcbiAgICAgICAgY29udGV4dF93ID0gU3RyaW5nKGNvbnRleHRfYyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gT3V0cHV0IHRoZSBjb2RlIGZvciB3LlxuICAgIGlmIChjb250ZXh0X3cgIT09IFwiXCIpIHtcbiAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoY29udGV4dF9kaWN0aW9uYXJ5VG9DcmVhdGUsY29udGV4dF93KSkge1xuICAgICAgICBpZiAoY29udGV4dF93LmNoYXJDb2RlQXQoMCk8MjU2KSB7XG4gICAgICAgICAgZm9yIChpPTAgOyBpPGNvbnRleHRfbnVtQml0cyA7IGkrKykge1xuICAgICAgICAgICAgY29udGV4dF9kYXRhX3ZhbCA9IChjb250ZXh0X2RhdGFfdmFsIDw8IDEpO1xuICAgICAgICAgICAgaWYgKGNvbnRleHRfZGF0YV9wb3NpdGlvbiA9PSBiaXRzUGVyQ2hhci0xKSB7XG4gICAgICAgICAgICAgIGNvbnRleHRfZGF0YV9wb3NpdGlvbiA9IDA7XG4gICAgICAgICAgICAgIGNvbnRleHRfZGF0YS5wdXNoKGdldENoYXJGcm9tSW50KGNvbnRleHRfZGF0YV92YWwpKTtcbiAgICAgICAgICAgICAgY29udGV4dF9kYXRhX3ZhbCA9IDA7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBjb250ZXh0X2RhdGFfcG9zaXRpb24rKztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgdmFsdWUgPSBjb250ZXh0X3cuY2hhckNvZGVBdCgwKTtcbiAgICAgICAgICBmb3IgKGk9MCA7IGk8OCA7IGkrKykge1xuICAgICAgICAgICAgY29udGV4dF9kYXRhX3ZhbCA9IChjb250ZXh0X2RhdGFfdmFsIDw8IDEpIHwgKHZhbHVlJjEpO1xuICAgICAgICAgICAgaWYgKGNvbnRleHRfZGF0YV9wb3NpdGlvbiA9PSBiaXRzUGVyQ2hhci0xKSB7XG4gICAgICAgICAgICAgIGNvbnRleHRfZGF0YV9wb3NpdGlvbiA9IDA7XG4gICAgICAgICAgICAgIGNvbnRleHRfZGF0YS5wdXNoKGdldENoYXJGcm9tSW50KGNvbnRleHRfZGF0YV92YWwpKTtcbiAgICAgICAgICAgICAgY29udGV4dF9kYXRhX3ZhbCA9IDA7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBjb250ZXh0X2RhdGFfcG9zaXRpb24rKztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhbHVlID0gdmFsdWUgPj4gMTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdmFsdWUgPSAxO1xuICAgICAgICAgIGZvciAoaT0wIDsgaTxjb250ZXh0X251bUJpdHMgOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnRleHRfZGF0YV92YWwgPSAoY29udGV4dF9kYXRhX3ZhbCA8PCAxKSB8IHZhbHVlO1xuICAgICAgICAgICAgaWYgKGNvbnRleHRfZGF0YV9wb3NpdGlvbiA9PSBiaXRzUGVyQ2hhci0xKSB7XG4gICAgICAgICAgICAgIGNvbnRleHRfZGF0YV9wb3NpdGlvbiA9IDA7XG4gICAgICAgICAgICAgIGNvbnRleHRfZGF0YS5wdXNoKGdldENoYXJGcm9tSW50KGNvbnRleHRfZGF0YV92YWwpKTtcbiAgICAgICAgICAgICAgY29udGV4dF9kYXRhX3ZhbCA9IDA7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBjb250ZXh0X2RhdGFfcG9zaXRpb24rKztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhbHVlID0gMDtcbiAgICAgICAgICB9XG4gICAgICAgICAgdmFsdWUgPSBjb250ZXh0X3cuY2hhckNvZGVBdCgwKTtcbiAgICAgICAgICBmb3IgKGk9MCA7IGk8MTYgOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnRleHRfZGF0YV92YWwgPSAoY29udGV4dF9kYXRhX3ZhbCA8PCAxKSB8ICh2YWx1ZSYxKTtcbiAgICAgICAgICAgIGlmIChjb250ZXh0X2RhdGFfcG9zaXRpb24gPT0gYml0c1BlckNoYXItMSkge1xuICAgICAgICAgICAgICBjb250ZXh0X2RhdGFfcG9zaXRpb24gPSAwO1xuICAgICAgICAgICAgICBjb250ZXh0X2RhdGEucHVzaChnZXRDaGFyRnJvbUludChjb250ZXh0X2RhdGFfdmFsKSk7XG4gICAgICAgICAgICAgIGNvbnRleHRfZGF0YV92YWwgPSAwO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgY29udGV4dF9kYXRhX3Bvc2l0aW9uKys7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YWx1ZSA9IHZhbHVlID4+IDE7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGNvbnRleHRfZW5sYXJnZUluLS07XG4gICAgICAgIGlmIChjb250ZXh0X2VubGFyZ2VJbiA9PSAwKSB7XG4gICAgICAgICAgY29udGV4dF9lbmxhcmdlSW4gPSBNYXRoLnBvdygyLCBjb250ZXh0X251bUJpdHMpO1xuICAgICAgICAgIGNvbnRleHRfbnVtQml0cysrO1xuICAgICAgICB9XG4gICAgICAgIGRlbGV0ZSBjb250ZXh0X2RpY3Rpb25hcnlUb0NyZWF0ZVtjb250ZXh0X3ddO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFsdWUgPSBjb250ZXh0X2RpY3Rpb25hcnlbY29udGV4dF93XTtcbiAgICAgICAgZm9yIChpPTAgOyBpPGNvbnRleHRfbnVtQml0cyA7IGkrKykge1xuICAgICAgICAgIGNvbnRleHRfZGF0YV92YWwgPSAoY29udGV4dF9kYXRhX3ZhbCA8PCAxKSB8ICh2YWx1ZSYxKTtcbiAgICAgICAgICBpZiAoY29udGV4dF9kYXRhX3Bvc2l0aW9uID09IGJpdHNQZXJDaGFyLTEpIHtcbiAgICAgICAgICAgIGNvbnRleHRfZGF0YV9wb3NpdGlvbiA9IDA7XG4gICAgICAgICAgICBjb250ZXh0X2RhdGEucHVzaChnZXRDaGFyRnJvbUludChjb250ZXh0X2RhdGFfdmFsKSk7XG4gICAgICAgICAgICBjb250ZXh0X2RhdGFfdmFsID0gMDtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29udGV4dF9kYXRhX3Bvc2l0aW9uKys7XG4gICAgICAgICAgfVxuICAgICAgICAgIHZhbHVlID0gdmFsdWUgPj4gMTtcbiAgICAgICAgfVxuXG5cbiAgICAgIH1cbiAgICAgIGNvbnRleHRfZW5sYXJnZUluLS07XG4gICAgICBpZiAoY29udGV4dF9lbmxhcmdlSW4gPT0gMCkge1xuICAgICAgICBjb250ZXh0X2VubGFyZ2VJbiA9IE1hdGgucG93KDIsIGNvbnRleHRfbnVtQml0cyk7XG4gICAgICAgIGNvbnRleHRfbnVtQml0cysrO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIE1hcmsgdGhlIGVuZCBvZiB0aGUgc3RyZWFtXG4gICAgdmFsdWUgPSAyO1xuICAgIGZvciAoaT0wIDsgaTxjb250ZXh0X251bUJpdHMgOyBpKyspIHtcbiAgICAgIGNvbnRleHRfZGF0YV92YWwgPSAoY29udGV4dF9kYXRhX3ZhbCA8PCAxKSB8ICh2YWx1ZSYxKTtcbiAgICAgIGlmIChjb250ZXh0X2RhdGFfcG9zaXRpb24gPT0gYml0c1BlckNoYXItMSkge1xuICAgICAgICBjb250ZXh0X2RhdGFfcG9zaXRpb24gPSAwO1xuICAgICAgICBjb250ZXh0X2RhdGEucHVzaChnZXRDaGFyRnJvbUludChjb250ZXh0X2RhdGFfdmFsKSk7XG4gICAgICAgIGNvbnRleHRfZGF0YV92YWwgPSAwO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29udGV4dF9kYXRhX3Bvc2l0aW9uKys7XG4gICAgICB9XG4gICAgICB2YWx1ZSA9IHZhbHVlID4+IDE7XG4gICAgfVxuXG4gICAgLy8gRmx1c2ggdGhlIGxhc3QgY2hhclxuICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICBjb250ZXh0X2RhdGFfdmFsID0gKGNvbnRleHRfZGF0YV92YWwgPDwgMSk7XG4gICAgICBpZiAoY29udGV4dF9kYXRhX3Bvc2l0aW9uID09IGJpdHNQZXJDaGFyLTEpIHtcbiAgICAgICAgY29udGV4dF9kYXRhLnB1c2goZ2V0Q2hhckZyb21JbnQoY29udGV4dF9kYXRhX3ZhbCkpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIGVsc2UgY29udGV4dF9kYXRhX3Bvc2l0aW9uKys7XG4gICAgfVxuICAgIHJldHVybiBjb250ZXh0X2RhdGEuam9pbignJyk7XG4gIH0sXG5cbiAgZGVjb21wcmVzczogZnVuY3Rpb24gKGNvbXByZXNzZWQpIHtcbiAgICBpZiAoY29tcHJlc3NlZCA9PSBudWxsKSByZXR1cm4gXCJcIjtcbiAgICBpZiAoY29tcHJlc3NlZCA9PSBcIlwiKSByZXR1cm4gbnVsbDtcbiAgICByZXR1cm4gTFpTdHJpbmcuX2RlY29tcHJlc3MoY29tcHJlc3NlZC5sZW5ndGgsIDMyNzY4LCBmdW5jdGlvbihpbmRleCkgeyByZXR1cm4gY29tcHJlc3NlZC5jaGFyQ29kZUF0KGluZGV4KTsgfSk7XG4gIH0sXG5cbiAgX2RlY29tcHJlc3M6IGZ1bmN0aW9uIChsZW5ndGgsIHJlc2V0VmFsdWUsIGdldE5leHRWYWx1ZSkge1xuICAgIHZhciBkaWN0aW9uYXJ5ID0gW10sXG4gICAgICAgIG5leHQsXG4gICAgICAgIGVubGFyZ2VJbiA9IDQsXG4gICAgICAgIGRpY3RTaXplID0gNCxcbiAgICAgICAgbnVtQml0cyA9IDMsXG4gICAgICAgIGVudHJ5ID0gXCJcIixcbiAgICAgICAgcmVzdWx0ID0gW10sXG4gICAgICAgIGksXG4gICAgICAgIHcsXG4gICAgICAgIGJpdHMsIHJlc2IsIG1heHBvd2VyLCBwb3dlcixcbiAgICAgICAgYyxcbiAgICAgICAgZGF0YSA9IHt2YWw6Z2V0TmV4dFZhbHVlKDApLCBwb3NpdGlvbjpyZXNldFZhbHVlLCBpbmRleDoxfTtcblxuICAgIGZvciAoaSA9IDA7IGkgPCAzOyBpICs9IDEpIHtcbiAgICAgIGRpY3Rpb25hcnlbaV0gPSBpO1xuICAgIH1cblxuICAgIGJpdHMgPSAwO1xuICAgIG1heHBvd2VyID0gTWF0aC5wb3coMiwyKTtcbiAgICBwb3dlcj0xO1xuICAgIHdoaWxlIChwb3dlciE9bWF4cG93ZXIpIHtcbiAgICAgIHJlc2IgPSBkYXRhLnZhbCAmIGRhdGEucG9zaXRpb247XG4gICAgICBkYXRhLnBvc2l0aW9uID4+PSAxO1xuICAgICAgaWYgKGRhdGEucG9zaXRpb24gPT0gMCkge1xuICAgICAgICBkYXRhLnBvc2l0aW9uID0gcmVzZXRWYWx1ZTtcbiAgICAgICAgZGF0YS52YWwgPSBnZXROZXh0VmFsdWUoZGF0YS5pbmRleCsrKTtcbiAgICAgIH1cbiAgICAgIGJpdHMgfD0gKHJlc2I+MCA/IDEgOiAwKSAqIHBvd2VyO1xuICAgICAgcG93ZXIgPDw9IDE7XG4gICAgfVxuXG4gICAgc3dpdGNoIChuZXh0ID0gYml0cykge1xuICAgICAgY2FzZSAwOlxuICAgICAgICAgIGJpdHMgPSAwO1xuICAgICAgICAgIG1heHBvd2VyID0gTWF0aC5wb3coMiw4KTtcbiAgICAgICAgICBwb3dlcj0xO1xuICAgICAgICAgIHdoaWxlIChwb3dlciE9bWF4cG93ZXIpIHtcbiAgICAgICAgICAgIHJlc2IgPSBkYXRhLnZhbCAmIGRhdGEucG9zaXRpb247XG4gICAgICAgICAgICBkYXRhLnBvc2l0aW9uID4+PSAxO1xuICAgICAgICAgICAgaWYgKGRhdGEucG9zaXRpb24gPT0gMCkge1xuICAgICAgICAgICAgICBkYXRhLnBvc2l0aW9uID0gcmVzZXRWYWx1ZTtcbiAgICAgICAgICAgICAgZGF0YS52YWwgPSBnZXROZXh0VmFsdWUoZGF0YS5pbmRleCsrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJpdHMgfD0gKHJlc2I+MCA/IDEgOiAwKSAqIHBvd2VyO1xuICAgICAgICAgICAgcG93ZXIgPDw9IDE7XG4gICAgICAgICAgfVxuICAgICAgICBjID0gZihiaXRzKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDE6XG4gICAgICAgICAgYml0cyA9IDA7XG4gICAgICAgICAgbWF4cG93ZXIgPSBNYXRoLnBvdygyLDE2KTtcbiAgICAgICAgICBwb3dlcj0xO1xuICAgICAgICAgIHdoaWxlIChwb3dlciE9bWF4cG93ZXIpIHtcbiAgICAgICAgICAgIHJlc2IgPSBkYXRhLnZhbCAmIGRhdGEucG9zaXRpb247XG4gICAgICAgICAgICBkYXRhLnBvc2l0aW9uID4+PSAxO1xuICAgICAgICAgICAgaWYgKGRhdGEucG9zaXRpb24gPT0gMCkge1xuICAgICAgICAgICAgICBkYXRhLnBvc2l0aW9uID0gcmVzZXRWYWx1ZTtcbiAgICAgICAgICAgICAgZGF0YS52YWwgPSBnZXROZXh0VmFsdWUoZGF0YS5pbmRleCsrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJpdHMgfD0gKHJlc2I+MCA/IDEgOiAwKSAqIHBvd2VyO1xuICAgICAgICAgICAgcG93ZXIgPDw9IDE7XG4gICAgICAgICAgfVxuICAgICAgICBjID0gZihiaXRzKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDI6XG4gICAgICAgIHJldHVybiBcIlwiO1xuICAgIH1cbiAgICBkaWN0aW9uYXJ5WzNdID0gYztcbiAgICB3ID0gYztcbiAgICByZXN1bHQucHVzaChjKTtcbiAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgaWYgKGRhdGEuaW5kZXggPiBsZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIFwiXCI7XG4gICAgICB9XG5cbiAgICAgIGJpdHMgPSAwO1xuICAgICAgbWF4cG93ZXIgPSBNYXRoLnBvdygyLG51bUJpdHMpO1xuICAgICAgcG93ZXI9MTtcbiAgICAgIHdoaWxlIChwb3dlciE9bWF4cG93ZXIpIHtcbiAgICAgICAgcmVzYiA9IGRhdGEudmFsICYgZGF0YS5wb3NpdGlvbjtcbiAgICAgICAgZGF0YS5wb3NpdGlvbiA+Pj0gMTtcbiAgICAgICAgaWYgKGRhdGEucG9zaXRpb24gPT0gMCkge1xuICAgICAgICAgIGRhdGEucG9zaXRpb24gPSByZXNldFZhbHVlO1xuICAgICAgICAgIGRhdGEudmFsID0gZ2V0TmV4dFZhbHVlKGRhdGEuaW5kZXgrKyk7XG4gICAgICAgIH1cbiAgICAgICAgYml0cyB8PSAocmVzYj4wID8gMSA6IDApICogcG93ZXI7XG4gICAgICAgIHBvd2VyIDw8PSAxO1xuICAgICAgfVxuXG4gICAgICBzd2l0Y2ggKGMgPSBiaXRzKSB7XG4gICAgICAgIGNhc2UgMDpcbiAgICAgICAgICBiaXRzID0gMDtcbiAgICAgICAgICBtYXhwb3dlciA9IE1hdGgucG93KDIsOCk7XG4gICAgICAgICAgcG93ZXI9MTtcbiAgICAgICAgICB3aGlsZSAocG93ZXIhPW1heHBvd2VyKSB7XG4gICAgICAgICAgICByZXNiID0gZGF0YS52YWwgJiBkYXRhLnBvc2l0aW9uO1xuICAgICAgICAgICAgZGF0YS5wb3NpdGlvbiA+Pj0gMTtcbiAgICAgICAgICAgIGlmIChkYXRhLnBvc2l0aW9uID09IDApIHtcbiAgICAgICAgICAgICAgZGF0YS5wb3NpdGlvbiA9IHJlc2V0VmFsdWU7XG4gICAgICAgICAgICAgIGRhdGEudmFsID0gZ2V0TmV4dFZhbHVlKGRhdGEuaW5kZXgrKyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBiaXRzIHw9IChyZXNiPjAgPyAxIDogMCkgKiBwb3dlcjtcbiAgICAgICAgICAgIHBvd2VyIDw8PSAxO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGRpY3Rpb25hcnlbZGljdFNpemUrK10gPSBmKGJpdHMpO1xuICAgICAgICAgIGMgPSBkaWN0U2l6ZS0xO1xuICAgICAgICAgIGVubGFyZ2VJbi0tO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDE6XG4gICAgICAgICAgYml0cyA9IDA7XG4gICAgICAgICAgbWF4cG93ZXIgPSBNYXRoLnBvdygyLDE2KTtcbiAgICAgICAgICBwb3dlcj0xO1xuICAgICAgICAgIHdoaWxlIChwb3dlciE9bWF4cG93ZXIpIHtcbiAgICAgICAgICAgIHJlc2IgPSBkYXRhLnZhbCAmIGRhdGEucG9zaXRpb247XG4gICAgICAgICAgICBkYXRhLnBvc2l0aW9uID4+PSAxO1xuICAgICAgICAgICAgaWYgKGRhdGEucG9zaXRpb24gPT0gMCkge1xuICAgICAgICAgICAgICBkYXRhLnBvc2l0aW9uID0gcmVzZXRWYWx1ZTtcbiAgICAgICAgICAgICAgZGF0YS52YWwgPSBnZXROZXh0VmFsdWUoZGF0YS5pbmRleCsrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJpdHMgfD0gKHJlc2I+MCA/IDEgOiAwKSAqIHBvd2VyO1xuICAgICAgICAgICAgcG93ZXIgPDw9IDE7XG4gICAgICAgICAgfVxuICAgICAgICAgIGRpY3Rpb25hcnlbZGljdFNpemUrK10gPSBmKGJpdHMpO1xuICAgICAgICAgIGMgPSBkaWN0U2l6ZS0xO1xuICAgICAgICAgIGVubGFyZ2VJbi0tO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgcmV0dXJuIHJlc3VsdC5qb2luKCcnKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGVubGFyZ2VJbiA9PSAwKSB7XG4gICAgICAgIGVubGFyZ2VJbiA9IE1hdGgucG93KDIsIG51bUJpdHMpO1xuICAgICAgICBudW1CaXRzKys7XG4gICAgICB9XG5cbiAgICAgIGlmIChkaWN0aW9uYXJ5W2NdKSB7XG4gICAgICAgIGVudHJ5ID0gZGljdGlvbmFyeVtjXTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChjID09PSBkaWN0U2l6ZSkge1xuICAgICAgICAgIGVudHJ5ID0gdyArIHcuY2hhckF0KDApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXN1bHQucHVzaChlbnRyeSk7XG5cbiAgICAgIC8vIEFkZCB3K2VudHJ5WzBdIHRvIHRoZSBkaWN0aW9uYXJ5LlxuICAgICAgZGljdGlvbmFyeVtkaWN0U2l6ZSsrXSA9IHcgKyBlbnRyeS5jaGFyQXQoMCk7XG4gICAgICBlbmxhcmdlSW4tLTtcblxuICAgICAgdyA9IGVudHJ5O1xuXG4gICAgICBpZiAoZW5sYXJnZUluID09IDApIHtcbiAgICAgICAgZW5sYXJnZUluID0gTWF0aC5wb3coMiwgbnVtQml0cyk7XG4gICAgICAgIG51bUJpdHMrKztcbiAgICAgIH1cblxuICAgIH1cbiAgfVxufTtcbiAgcmV0dXJuIExaU3RyaW5nO1xufSkoKTtcblxuaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICBkZWZpbmUoZnVuY3Rpb24gKCkgeyByZXR1cm4gTFpTdHJpbmc7IH0pO1xufSBlbHNlIGlmKCB0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiBtb2R1bGUgIT0gbnVsbCApIHtcbiAgbW9kdWxlLmV4cG9ydHMgPSBMWlN0cmluZ1xufVxuIiwiIWZ1bmN0aW9uKCkge1xuICAgICd1c2Ugc3RyaWN0JztcbiAgICBmdW5jdGlvbiBWTm9kZSgpIHt9XG4gICAgZnVuY3Rpb24gaChub2RlTmFtZSwgYXR0cmlidXRlcykge1xuICAgICAgICB2YXIgbGFzdFNpbXBsZSwgY2hpbGQsIHNpbXBsZSwgaSwgY2hpbGRyZW4gPSBFTVBUWV9DSElMRFJFTjtcbiAgICAgICAgZm9yIChpID0gYXJndW1lbnRzLmxlbmd0aDsgaS0tID4gMjsgKSBzdGFjay5wdXNoKGFyZ3VtZW50c1tpXSk7XG4gICAgICAgIGlmIChhdHRyaWJ1dGVzICYmIG51bGwgIT0gYXR0cmlidXRlcy5jaGlsZHJlbikge1xuICAgICAgICAgICAgaWYgKCFzdGFjay5sZW5ndGgpIHN0YWNrLnB1c2goYXR0cmlidXRlcy5jaGlsZHJlbik7XG4gICAgICAgICAgICBkZWxldGUgYXR0cmlidXRlcy5jaGlsZHJlbjtcbiAgICAgICAgfVxuICAgICAgICB3aGlsZSAoc3RhY2subGVuZ3RoKSBpZiAoKGNoaWxkID0gc3RhY2sucG9wKCkpICYmIHZvaWQgMCAhPT0gY2hpbGQucG9wKSBmb3IgKGkgPSBjaGlsZC5sZW5ndGg7IGktLTsgKSBzdGFjay5wdXNoKGNoaWxkW2ldKTsgZWxzZSB7XG4gICAgICAgICAgICBpZiAoY2hpbGQgPT09ICEwIHx8IGNoaWxkID09PSAhMSkgY2hpbGQgPSBudWxsO1xuICAgICAgICAgICAgaWYgKHNpbXBsZSA9ICdmdW5jdGlvbicgIT0gdHlwZW9mIG5vZGVOYW1lKSBpZiAobnVsbCA9PSBjaGlsZCkgY2hpbGQgPSAnJzsgZWxzZSBpZiAoJ251bWJlcicgPT0gdHlwZW9mIGNoaWxkKSBjaGlsZCA9IFN0cmluZyhjaGlsZCk7IGVsc2UgaWYgKCdzdHJpbmcnICE9IHR5cGVvZiBjaGlsZCkgc2ltcGxlID0gITE7XG4gICAgICAgICAgICBpZiAoc2ltcGxlICYmIGxhc3RTaW1wbGUpIGNoaWxkcmVuW2NoaWxkcmVuLmxlbmd0aCAtIDFdICs9IGNoaWxkOyBlbHNlIGlmIChjaGlsZHJlbiA9PT0gRU1QVFlfQ0hJTERSRU4pIGNoaWxkcmVuID0gWyBjaGlsZCBdOyBlbHNlIGNoaWxkcmVuLnB1c2goY2hpbGQpO1xuICAgICAgICAgICAgbGFzdFNpbXBsZSA9IHNpbXBsZTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgcCA9IG5ldyBWTm9kZSgpO1xuICAgICAgICBwLm5vZGVOYW1lID0gbm9kZU5hbWU7XG4gICAgICAgIHAuY2hpbGRyZW4gPSBjaGlsZHJlbjtcbiAgICAgICAgcC5hdHRyaWJ1dGVzID0gbnVsbCA9PSBhdHRyaWJ1dGVzID8gdm9pZCAwIDogYXR0cmlidXRlcztcbiAgICAgICAgcC5rZXkgPSBudWxsID09IGF0dHJpYnV0ZXMgPyB2b2lkIDAgOiBhdHRyaWJ1dGVzLmtleTtcbiAgICAgICAgaWYgKHZvaWQgMCAhPT0gb3B0aW9ucy52bm9kZSkgb3B0aW9ucy52bm9kZShwKTtcbiAgICAgICAgcmV0dXJuIHA7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGV4dGVuZChvYmosIHByb3BzKSB7XG4gICAgICAgIGZvciAodmFyIGkgaW4gcHJvcHMpIG9ialtpXSA9IHByb3BzW2ldO1xuICAgICAgICByZXR1cm4gb2JqO1xuICAgIH1cbiAgICBmdW5jdGlvbiBjbG9uZUVsZW1lbnQodm5vZGUsIHByb3BzKSB7XG4gICAgICAgIHJldHVybiBoKHZub2RlLm5vZGVOYW1lLCBleHRlbmQoZXh0ZW5kKHt9LCB2bm9kZS5hdHRyaWJ1dGVzKSwgcHJvcHMpLCBhcmd1bWVudHMubGVuZ3RoID4gMiA/IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAyKSA6IHZub2RlLmNoaWxkcmVuKTtcbiAgICB9XG4gICAgZnVuY3Rpb24gZW5xdWV1ZVJlbmRlcihjb21wb25lbnQpIHtcbiAgICAgICAgaWYgKCFjb21wb25lbnQuX19kICYmIChjb21wb25lbnQuX19kID0gITApICYmIDEgPT0gaXRlbXMucHVzaChjb21wb25lbnQpKSAob3B0aW9ucy5kZWJvdW5jZVJlbmRlcmluZyB8fCBzZXRUaW1lb3V0KShyZXJlbmRlcik7XG4gICAgfVxuICAgIGZ1bmN0aW9uIHJlcmVuZGVyKCkge1xuICAgICAgICB2YXIgcCwgbGlzdCA9IGl0ZW1zO1xuICAgICAgICBpdGVtcyA9IFtdO1xuICAgICAgICB3aGlsZSAocCA9IGxpc3QucG9wKCkpIGlmIChwLl9fZCkgcmVuZGVyQ29tcG9uZW50KHApO1xuICAgIH1cbiAgICBmdW5jdGlvbiBpc1NhbWVOb2RlVHlwZShub2RlLCB2bm9kZSwgaHlkcmF0aW5nKSB7XG4gICAgICAgIGlmICgnc3RyaW5nJyA9PSB0eXBlb2Ygdm5vZGUgfHwgJ251bWJlcicgPT0gdHlwZW9mIHZub2RlKSByZXR1cm4gdm9pZCAwICE9PSBub2RlLnNwbGl0VGV4dDtcbiAgICAgICAgaWYgKCdzdHJpbmcnID09IHR5cGVvZiB2bm9kZS5ub2RlTmFtZSkgcmV0dXJuICFub2RlLl9jb21wb25lbnRDb25zdHJ1Y3RvciAmJiBpc05hbWVkTm9kZShub2RlLCB2bm9kZS5ub2RlTmFtZSk7IGVsc2UgcmV0dXJuIGh5ZHJhdGluZyB8fCBub2RlLl9jb21wb25lbnRDb25zdHJ1Y3RvciA9PT0gdm5vZGUubm9kZU5hbWU7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGlzTmFtZWROb2RlKG5vZGUsIG5vZGVOYW1lKSB7XG4gICAgICAgIHJldHVybiBub2RlLl9fbiA9PT0gbm9kZU5hbWUgfHwgbm9kZS5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpID09PSBub2RlTmFtZS50b0xvd2VyQ2FzZSgpO1xuICAgIH1cbiAgICBmdW5jdGlvbiBnZXROb2RlUHJvcHModm5vZGUpIHtcbiAgICAgICAgdmFyIHByb3BzID0gZXh0ZW5kKHt9LCB2bm9kZS5hdHRyaWJ1dGVzKTtcbiAgICAgICAgcHJvcHMuY2hpbGRyZW4gPSB2bm9kZS5jaGlsZHJlbjtcbiAgICAgICAgdmFyIGRlZmF1bHRQcm9wcyA9IHZub2RlLm5vZGVOYW1lLmRlZmF1bHRQcm9wcztcbiAgICAgICAgaWYgKHZvaWQgMCAhPT0gZGVmYXVsdFByb3BzKSBmb3IgKHZhciBpIGluIGRlZmF1bHRQcm9wcykgaWYgKHZvaWQgMCA9PT0gcHJvcHNbaV0pIHByb3BzW2ldID0gZGVmYXVsdFByb3BzW2ldO1xuICAgICAgICByZXR1cm4gcHJvcHM7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGNyZWF0ZU5vZGUobm9kZU5hbWUsIGlzU3ZnKSB7XG4gICAgICAgIHZhciBub2RlID0gaXNTdmcgPyBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoJ2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJywgbm9kZU5hbWUpIDogZG9jdW1lbnQuY3JlYXRlRWxlbWVudChub2RlTmFtZSk7XG4gICAgICAgIG5vZGUuX19uID0gbm9kZU5hbWU7XG4gICAgICAgIHJldHVybiBub2RlO1xuICAgIH1cbiAgICBmdW5jdGlvbiByZW1vdmVOb2RlKG5vZGUpIHtcbiAgICAgICAgaWYgKG5vZGUucGFyZW50Tm9kZSkgbm9kZS5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKG5vZGUpO1xuICAgIH1cbiAgICBmdW5jdGlvbiBzZXRBY2Nlc3Nvcihub2RlLCBuYW1lLCBvbGQsIHZhbHVlLCBpc1N2Zykge1xuICAgICAgICBpZiAoJ2NsYXNzTmFtZScgPT09IG5hbWUpIG5hbWUgPSAnY2xhc3MnO1xuICAgICAgICBpZiAoJ2tleScgPT09IG5hbWUpIDsgZWxzZSBpZiAoJ3JlZicgPT09IG5hbWUpIHtcbiAgICAgICAgICAgIGlmIChvbGQpIG9sZChudWxsKTtcbiAgICAgICAgICAgIGlmICh2YWx1ZSkgdmFsdWUobm9kZSk7XG4gICAgICAgIH0gZWxzZSBpZiAoJ2NsYXNzJyA9PT0gbmFtZSAmJiAhaXNTdmcpIG5vZGUuY2xhc3NOYW1lID0gdmFsdWUgfHwgJyc7IGVsc2UgaWYgKCdzdHlsZScgPT09IG5hbWUpIHtcbiAgICAgICAgICAgIGlmICghdmFsdWUgfHwgJ3N0cmluZycgPT0gdHlwZW9mIHZhbHVlIHx8ICdzdHJpbmcnID09IHR5cGVvZiBvbGQpIG5vZGUuc3R5bGUuY3NzVGV4dCA9IHZhbHVlIHx8ICcnO1xuICAgICAgICAgICAgaWYgKHZhbHVlICYmICdvYmplY3QnID09IHR5cGVvZiB2YWx1ZSkge1xuICAgICAgICAgICAgICAgIGlmICgnc3RyaW5nJyAhPSB0eXBlb2Ygb2xkKSBmb3IgKHZhciBpIGluIG9sZCkgaWYgKCEoaSBpbiB2YWx1ZSkpIG5vZGUuc3R5bGVbaV0gPSAnJztcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpIGluIHZhbHVlKSBub2RlLnN0eWxlW2ldID0gJ251bWJlcicgPT0gdHlwZW9mIHZhbHVlW2ldICYmIElTX05PTl9ESU1FTlNJT05BTC50ZXN0KGkpID09PSAhMSA/IHZhbHVlW2ldICsgJ3B4JyA6IHZhbHVlW2ldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKCdkYW5nZXJvdXNseVNldElubmVySFRNTCcgPT09IG5hbWUpIHtcbiAgICAgICAgICAgIGlmICh2YWx1ZSkgbm9kZS5pbm5lckhUTUwgPSB2YWx1ZS5fX2h0bWwgfHwgJyc7XG4gICAgICAgIH0gZWxzZSBpZiAoJ28nID09IG5hbWVbMF0gJiYgJ24nID09IG5hbWVbMV0pIHtcbiAgICAgICAgICAgIHZhciB1c2VDYXB0dXJlID0gbmFtZSAhPT0gKG5hbWUgPSBuYW1lLnJlcGxhY2UoL0NhcHR1cmUkLywgJycpKTtcbiAgICAgICAgICAgIG5hbWUgPSBuYW1lLnRvTG93ZXJDYXNlKCkuc3Vic3RyaW5nKDIpO1xuICAgICAgICAgICAgaWYgKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFvbGQpIG5vZGUuYWRkRXZlbnRMaXN0ZW5lcihuYW1lLCBldmVudFByb3h5LCB1c2VDYXB0dXJlKTtcbiAgICAgICAgICAgIH0gZWxzZSBub2RlLnJlbW92ZUV2ZW50TGlzdGVuZXIobmFtZSwgZXZlbnRQcm94eSwgdXNlQ2FwdHVyZSk7XG4gICAgICAgICAgICAobm9kZS5fX2wgfHwgKG5vZGUuX19sID0ge30pKVtuYW1lXSA9IHZhbHVlO1xuICAgICAgICB9IGVsc2UgaWYgKCdsaXN0JyAhPT0gbmFtZSAmJiAndHlwZScgIT09IG5hbWUgJiYgIWlzU3ZnICYmIG5hbWUgaW4gbm9kZSkge1xuICAgICAgICAgICAgc2V0UHJvcGVydHkobm9kZSwgbmFtZSwgbnVsbCA9PSB2YWx1ZSA/ICcnIDogdmFsdWUpO1xuICAgICAgICAgICAgaWYgKG51bGwgPT0gdmFsdWUgfHwgdmFsdWUgPT09ICExKSBub2RlLnJlbW92ZUF0dHJpYnV0ZShuYW1lKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBucyA9IGlzU3ZnICYmIG5hbWUgIT09IChuYW1lID0gbmFtZS5yZXBsYWNlKC9eeGxpbmtcXDo/LywgJycpKTtcbiAgICAgICAgICAgIGlmIChudWxsID09IHZhbHVlIHx8IHZhbHVlID09PSAhMSkgaWYgKG5zKSBub2RlLnJlbW92ZUF0dHJpYnV0ZU5TKCdodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rJywgbmFtZS50b0xvd2VyQ2FzZSgpKTsgZWxzZSBub2RlLnJlbW92ZUF0dHJpYnV0ZShuYW1lKTsgZWxzZSBpZiAoJ2Z1bmN0aW9uJyAhPSB0eXBlb2YgdmFsdWUpIGlmIChucykgbm9kZS5zZXRBdHRyaWJ1dGVOUygnaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluaycsIG5hbWUudG9Mb3dlckNhc2UoKSwgdmFsdWUpOyBlbHNlIG5vZGUuc2V0QXR0cmlidXRlKG5hbWUsIHZhbHVlKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBmdW5jdGlvbiBzZXRQcm9wZXJ0eShub2RlLCBuYW1lLCB2YWx1ZSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgbm9kZVtuYW1lXSA9IHZhbHVlO1xuICAgICAgICB9IGNhdGNoIChlKSB7fVxuICAgIH1cbiAgICBmdW5jdGlvbiBldmVudFByb3h5KGUpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX19sW2UudHlwZV0ob3B0aW9ucy5ldmVudCAmJiBvcHRpb25zLmV2ZW50KGUpIHx8IGUpO1xuICAgIH1cbiAgICBmdW5jdGlvbiBmbHVzaE1vdW50cygpIHtcbiAgICAgICAgdmFyIGM7XG4gICAgICAgIHdoaWxlIChjID0gbW91bnRzLnBvcCgpKSB7XG4gICAgICAgICAgICBpZiAob3B0aW9ucy5hZnRlck1vdW50KSBvcHRpb25zLmFmdGVyTW91bnQoYyk7XG4gICAgICAgICAgICBpZiAoYy5jb21wb25lbnREaWRNb3VudCkgYy5jb21wb25lbnREaWRNb3VudCgpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGZ1bmN0aW9uIGRpZmYoZG9tLCB2bm9kZSwgY29udGV4dCwgbW91bnRBbGwsIHBhcmVudCwgY29tcG9uZW50Um9vdCkge1xuICAgICAgICBpZiAoIWRpZmZMZXZlbCsrKSB7XG4gICAgICAgICAgICBpc1N2Z01vZGUgPSBudWxsICE9IHBhcmVudCAmJiB2b2lkIDAgIT09IHBhcmVudC5vd25lclNWR0VsZW1lbnQ7XG4gICAgICAgICAgICBoeWRyYXRpbmcgPSBudWxsICE9IGRvbSAmJiAhKCdfX3ByZWFjdGF0dHJfJyBpbiBkb20pO1xuICAgICAgICB9XG4gICAgICAgIHZhciByZXQgPSBpZGlmZihkb20sIHZub2RlLCBjb250ZXh0LCBtb3VudEFsbCwgY29tcG9uZW50Um9vdCk7XG4gICAgICAgIGlmIChwYXJlbnQgJiYgcmV0LnBhcmVudE5vZGUgIT09IHBhcmVudCkgcGFyZW50LmFwcGVuZENoaWxkKHJldCk7XG4gICAgICAgIGlmICghLS1kaWZmTGV2ZWwpIHtcbiAgICAgICAgICAgIGh5ZHJhdGluZyA9ICExO1xuICAgICAgICAgICAgaWYgKCFjb21wb25lbnRSb290KSBmbHVzaE1vdW50cygpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGlkaWZmKGRvbSwgdm5vZGUsIGNvbnRleHQsIG1vdW50QWxsLCBjb21wb25lbnRSb290KSB7XG4gICAgICAgIHZhciBvdXQgPSBkb20sIHByZXZTdmdNb2RlID0gaXNTdmdNb2RlO1xuICAgICAgICBpZiAobnVsbCA9PSB2bm9kZSkgdm5vZGUgPSAnJztcbiAgICAgICAgaWYgKCdzdHJpbmcnID09IHR5cGVvZiB2bm9kZSkge1xuICAgICAgICAgICAgaWYgKGRvbSAmJiB2b2lkIDAgIT09IGRvbS5zcGxpdFRleHQgJiYgZG9tLnBhcmVudE5vZGUgJiYgKCFkb20uX2NvbXBvbmVudCB8fCBjb21wb25lbnRSb290KSkge1xuICAgICAgICAgICAgICAgIGlmIChkb20ubm9kZVZhbHVlICE9IHZub2RlKSBkb20ubm9kZVZhbHVlID0gdm5vZGU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG91dCA9IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKHZub2RlKTtcbiAgICAgICAgICAgICAgICBpZiAoZG9tKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChkb20ucGFyZW50Tm9kZSkgZG9tLnBhcmVudE5vZGUucmVwbGFjZUNoaWxkKG91dCwgZG9tKTtcbiAgICAgICAgICAgICAgICAgICAgcmVjb2xsZWN0Tm9kZVRyZWUoZG9tLCAhMCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb3V0Ll9fcHJlYWN0YXR0cl8gPSAhMDtcbiAgICAgICAgICAgIHJldHVybiBvdXQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCdmdW5jdGlvbicgPT0gdHlwZW9mIHZub2RlLm5vZGVOYW1lKSByZXR1cm4gYnVpbGRDb21wb25lbnRGcm9tVk5vZGUoZG9tLCB2bm9kZSwgY29udGV4dCwgbW91bnRBbGwpO1xuICAgICAgICBpc1N2Z01vZGUgPSAnc3ZnJyA9PT0gdm5vZGUubm9kZU5hbWUgPyAhMCA6ICdmb3JlaWduT2JqZWN0JyA9PT0gdm5vZGUubm9kZU5hbWUgPyAhMSA6IGlzU3ZnTW9kZTtcbiAgICAgICAgaWYgKCFkb20gfHwgIWlzTmFtZWROb2RlKGRvbSwgU3RyaW5nKHZub2RlLm5vZGVOYW1lKSkpIHtcbiAgICAgICAgICAgIG91dCA9IGNyZWF0ZU5vZGUoU3RyaW5nKHZub2RlLm5vZGVOYW1lKSwgaXNTdmdNb2RlKTtcbiAgICAgICAgICAgIGlmIChkb20pIHtcbiAgICAgICAgICAgICAgICB3aGlsZSAoZG9tLmZpcnN0Q2hpbGQpIG91dC5hcHBlbmRDaGlsZChkb20uZmlyc3RDaGlsZCk7XG4gICAgICAgICAgICAgICAgaWYgKGRvbS5wYXJlbnROb2RlKSBkb20ucGFyZW50Tm9kZS5yZXBsYWNlQ2hpbGQob3V0LCBkb20pO1xuICAgICAgICAgICAgICAgIHJlY29sbGVjdE5vZGVUcmVlKGRvbSwgITApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHZhciBmYyA9IG91dC5maXJzdENoaWxkLCBwcm9wcyA9IG91dC5fX3ByZWFjdGF0dHJfIHx8IChvdXQuX19wcmVhY3RhdHRyXyA9IHt9KSwgdmNoaWxkcmVuID0gdm5vZGUuY2hpbGRyZW47XG4gICAgICAgIGlmICghaHlkcmF0aW5nICYmIHZjaGlsZHJlbiAmJiAxID09PSB2Y2hpbGRyZW4ubGVuZ3RoICYmICdzdHJpbmcnID09IHR5cGVvZiB2Y2hpbGRyZW5bMF0gJiYgbnVsbCAhPSBmYyAmJiB2b2lkIDAgIT09IGZjLnNwbGl0VGV4dCAmJiBudWxsID09IGZjLm5leHRTaWJsaW5nKSB7XG4gICAgICAgICAgICBpZiAoZmMubm9kZVZhbHVlICE9IHZjaGlsZHJlblswXSkgZmMubm9kZVZhbHVlID0gdmNoaWxkcmVuWzBdO1xuICAgICAgICB9IGVsc2UgaWYgKHZjaGlsZHJlbiAmJiB2Y2hpbGRyZW4ubGVuZ3RoIHx8IG51bGwgIT0gZmMpIGlubmVyRGlmZk5vZGUob3V0LCB2Y2hpbGRyZW4sIGNvbnRleHQsIG1vdW50QWxsLCBoeWRyYXRpbmcgfHwgbnVsbCAhPSBwcm9wcy5kYW5nZXJvdXNseVNldElubmVySFRNTCk7XG4gICAgICAgIGRpZmZBdHRyaWJ1dGVzKG91dCwgdm5vZGUuYXR0cmlidXRlcywgcHJvcHMpO1xuICAgICAgICBpc1N2Z01vZGUgPSBwcmV2U3ZnTW9kZTtcbiAgICAgICAgcmV0dXJuIG91dDtcbiAgICB9XG4gICAgZnVuY3Rpb24gaW5uZXJEaWZmTm9kZShkb20sIHZjaGlsZHJlbiwgY29udGV4dCwgbW91bnRBbGwsIGlzSHlkcmF0aW5nKSB7XG4gICAgICAgIHZhciBqLCBjLCB2Y2hpbGQsIGNoaWxkLCBvcmlnaW5hbENoaWxkcmVuID0gZG9tLmNoaWxkTm9kZXMsIGNoaWxkcmVuID0gW10sIGtleWVkID0ge30sIGtleWVkTGVuID0gMCwgbWluID0gMCwgbGVuID0gb3JpZ2luYWxDaGlsZHJlbi5sZW5ndGgsIGNoaWxkcmVuTGVuID0gMCwgdmxlbiA9IHZjaGlsZHJlbiA/IHZjaGlsZHJlbi5sZW5ndGggOiAwO1xuICAgICAgICBpZiAoMCAhPT0gbGVuKSBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgX2NoaWxkID0gb3JpZ2luYWxDaGlsZHJlbltpXSwgcHJvcHMgPSBfY2hpbGQuX19wcmVhY3RhdHRyXywga2V5ID0gdmxlbiAmJiBwcm9wcyA/IF9jaGlsZC5fY29tcG9uZW50ID8gX2NoaWxkLl9jb21wb25lbnQuX19rIDogcHJvcHMua2V5IDogbnVsbDtcbiAgICAgICAgICAgIGlmIChudWxsICE9IGtleSkge1xuICAgICAgICAgICAgICAgIGtleWVkTGVuKys7XG4gICAgICAgICAgICAgICAga2V5ZWRba2V5XSA9IF9jaGlsZDtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvcHMgfHwgKHZvaWQgMCAhPT0gX2NoaWxkLnNwbGl0VGV4dCA/IGlzSHlkcmF0aW5nID8gX2NoaWxkLm5vZGVWYWx1ZS50cmltKCkgOiAhMCA6IGlzSHlkcmF0aW5nKSkgY2hpbGRyZW5bY2hpbGRyZW5MZW4rK10gPSBfY2hpbGQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKDAgIT09IHZsZW4pIGZvciAodmFyIGkgPSAwOyBpIDwgdmxlbjsgaSsrKSB7XG4gICAgICAgICAgICB2Y2hpbGQgPSB2Y2hpbGRyZW5baV07XG4gICAgICAgICAgICBjaGlsZCA9IG51bGw7XG4gICAgICAgICAgICB2YXIga2V5ID0gdmNoaWxkLmtleTtcbiAgICAgICAgICAgIGlmIChudWxsICE9IGtleSkge1xuICAgICAgICAgICAgICAgIGlmIChrZXllZExlbiAmJiB2b2lkIDAgIT09IGtleWVkW2tleV0pIHtcbiAgICAgICAgICAgICAgICAgICAgY2hpbGQgPSBrZXllZFtrZXldO1xuICAgICAgICAgICAgICAgICAgICBrZXllZFtrZXldID0gdm9pZCAwO1xuICAgICAgICAgICAgICAgICAgICBrZXllZExlbi0tO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoIWNoaWxkICYmIG1pbiA8IGNoaWxkcmVuTGVuKSBmb3IgKGogPSBtaW47IGogPCBjaGlsZHJlbkxlbjsgaisrKSBpZiAodm9pZCAwICE9PSBjaGlsZHJlbltqXSAmJiBpc1NhbWVOb2RlVHlwZShjID0gY2hpbGRyZW5bal0sIHZjaGlsZCwgaXNIeWRyYXRpbmcpKSB7XG4gICAgICAgICAgICAgICAgY2hpbGQgPSBjO1xuICAgICAgICAgICAgICAgIGNoaWxkcmVuW2pdID0gdm9pZCAwO1xuICAgICAgICAgICAgICAgIGlmIChqID09PSBjaGlsZHJlbkxlbiAtIDEpIGNoaWxkcmVuTGVuLS07XG4gICAgICAgICAgICAgICAgaWYgKGogPT09IG1pbikgbWluKys7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjaGlsZCA9IGlkaWZmKGNoaWxkLCB2Y2hpbGQsIGNvbnRleHQsIG1vdW50QWxsKTtcbiAgICAgICAgICAgIGlmIChjaGlsZCAmJiBjaGlsZCAhPT0gZG9tKSBpZiAoaSA+PSBsZW4pIGRvbS5hcHBlbmRDaGlsZChjaGlsZCk7IGVsc2UgaWYgKGNoaWxkICE9PSBvcmlnaW5hbENoaWxkcmVuW2ldKSBpZiAoY2hpbGQgPT09IG9yaWdpbmFsQ2hpbGRyZW5baSArIDFdKSByZW1vdmVOb2RlKG9yaWdpbmFsQ2hpbGRyZW5baV0pOyBlbHNlIGRvbS5pbnNlcnRCZWZvcmUoY2hpbGQsIG9yaWdpbmFsQ2hpbGRyZW5baV0gfHwgbnVsbCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGtleWVkTGVuKSBmb3IgKHZhciBpIGluIGtleWVkKSBpZiAodm9pZCAwICE9PSBrZXllZFtpXSkgcmVjb2xsZWN0Tm9kZVRyZWUoa2V5ZWRbaV0sICExKTtcbiAgICAgICAgd2hpbGUgKG1pbiA8PSBjaGlsZHJlbkxlbikgaWYgKHZvaWQgMCAhPT0gKGNoaWxkID0gY2hpbGRyZW5bY2hpbGRyZW5MZW4tLV0pKSByZWNvbGxlY3ROb2RlVHJlZShjaGlsZCwgITEpO1xuICAgIH1cbiAgICBmdW5jdGlvbiByZWNvbGxlY3ROb2RlVHJlZShub2RlLCB1bm1vdW50T25seSkge1xuICAgICAgICB2YXIgY29tcG9uZW50ID0gbm9kZS5fY29tcG9uZW50O1xuICAgICAgICBpZiAoY29tcG9uZW50KSB1bm1vdW50Q29tcG9uZW50KGNvbXBvbmVudCk7IGVsc2Uge1xuICAgICAgICAgICAgaWYgKG51bGwgIT0gbm9kZS5fX3ByZWFjdGF0dHJfICYmIG5vZGUuX19wcmVhY3RhdHRyXy5yZWYpIG5vZGUuX19wcmVhY3RhdHRyXy5yZWYobnVsbCk7XG4gICAgICAgICAgICBpZiAodW5tb3VudE9ubHkgPT09ICExIHx8IG51bGwgPT0gbm9kZS5fX3ByZWFjdGF0dHJfKSByZW1vdmVOb2RlKG5vZGUpO1xuICAgICAgICAgICAgcmVtb3ZlQ2hpbGRyZW4obm9kZSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZnVuY3Rpb24gcmVtb3ZlQ2hpbGRyZW4obm9kZSkge1xuICAgICAgICBub2RlID0gbm9kZS5sYXN0Q2hpbGQ7XG4gICAgICAgIHdoaWxlIChub2RlKSB7XG4gICAgICAgICAgICB2YXIgbmV4dCA9IG5vZGUucHJldmlvdXNTaWJsaW5nO1xuICAgICAgICAgICAgcmVjb2xsZWN0Tm9kZVRyZWUobm9kZSwgITApO1xuICAgICAgICAgICAgbm9kZSA9IG5leHQ7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZnVuY3Rpb24gZGlmZkF0dHJpYnV0ZXMoZG9tLCBhdHRycywgb2xkKSB7XG4gICAgICAgIHZhciBuYW1lO1xuICAgICAgICBmb3IgKG5hbWUgaW4gb2xkKSBpZiAoKCFhdHRycyB8fCBudWxsID09IGF0dHJzW25hbWVdKSAmJiBudWxsICE9IG9sZFtuYW1lXSkgc2V0QWNjZXNzb3IoZG9tLCBuYW1lLCBvbGRbbmFtZV0sIG9sZFtuYW1lXSA9IHZvaWQgMCwgaXNTdmdNb2RlKTtcbiAgICAgICAgZm9yIChuYW1lIGluIGF0dHJzKSBpZiAoISgnY2hpbGRyZW4nID09PSBuYW1lIHx8ICdpbm5lckhUTUwnID09PSBuYW1lIHx8IG5hbWUgaW4gb2xkICYmIGF0dHJzW25hbWVdID09PSAoJ3ZhbHVlJyA9PT0gbmFtZSB8fCAnY2hlY2tlZCcgPT09IG5hbWUgPyBkb21bbmFtZV0gOiBvbGRbbmFtZV0pKSkgc2V0QWNjZXNzb3IoZG9tLCBuYW1lLCBvbGRbbmFtZV0sIG9sZFtuYW1lXSA9IGF0dHJzW25hbWVdLCBpc1N2Z01vZGUpO1xuICAgIH1cbiAgICBmdW5jdGlvbiBjb2xsZWN0Q29tcG9uZW50KGNvbXBvbmVudCkge1xuICAgICAgICB2YXIgbmFtZSA9IGNvbXBvbmVudC5jb25zdHJ1Y3Rvci5uYW1lO1xuICAgICAgICAoY29tcG9uZW50c1tuYW1lXSB8fCAoY29tcG9uZW50c1tuYW1lXSA9IFtdKSkucHVzaChjb21wb25lbnQpO1xuICAgIH1cbiAgICBmdW5jdGlvbiBjcmVhdGVDb21wb25lbnQoQ3RvciwgcHJvcHMsIGNvbnRleHQpIHtcbiAgICAgICAgdmFyIGluc3QsIGxpc3QgPSBjb21wb25lbnRzW0N0b3IubmFtZV07XG4gICAgICAgIGlmIChDdG9yLnByb3RvdHlwZSAmJiBDdG9yLnByb3RvdHlwZS5yZW5kZXIpIHtcbiAgICAgICAgICAgIGluc3QgPSBuZXcgQ3Rvcihwcm9wcywgY29udGV4dCk7XG4gICAgICAgICAgICBDb21wb25lbnQuY2FsbChpbnN0LCBwcm9wcywgY29udGV4dCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpbnN0ID0gbmV3IENvbXBvbmVudChwcm9wcywgY29udGV4dCk7XG4gICAgICAgICAgICBpbnN0LmNvbnN0cnVjdG9yID0gQ3RvcjtcbiAgICAgICAgICAgIGluc3QucmVuZGVyID0gZG9SZW5kZXI7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGxpc3QpIGZvciAodmFyIGkgPSBsaXN0Lmxlbmd0aDsgaS0tOyApIGlmIChsaXN0W2ldLmNvbnN0cnVjdG9yID09PSBDdG9yKSB7XG4gICAgICAgICAgICBpbnN0Ll9fYiA9IGxpc3RbaV0uX19iO1xuICAgICAgICAgICAgbGlzdC5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gaW5zdDtcbiAgICB9XG4gICAgZnVuY3Rpb24gZG9SZW5kZXIocHJvcHMsIHN0YXRlLCBjb250ZXh0KSB7XG4gICAgICAgIHJldHVybiB0aGlzLmNvbnN0cnVjdG9yKHByb3BzLCBjb250ZXh0KTtcbiAgICB9XG4gICAgZnVuY3Rpb24gc2V0Q29tcG9uZW50UHJvcHMoY29tcG9uZW50LCBwcm9wcywgb3B0cywgY29udGV4dCwgbW91bnRBbGwpIHtcbiAgICAgICAgaWYgKCFjb21wb25lbnQuX194KSB7XG4gICAgICAgICAgICBjb21wb25lbnQuX194ID0gITA7XG4gICAgICAgICAgICBpZiAoY29tcG9uZW50Ll9fciA9IHByb3BzLnJlZikgZGVsZXRlIHByb3BzLnJlZjtcbiAgICAgICAgICAgIGlmIChjb21wb25lbnQuX19rID0gcHJvcHMua2V5KSBkZWxldGUgcHJvcHMua2V5O1xuICAgICAgICAgICAgaWYgKCFjb21wb25lbnQuYmFzZSB8fCBtb3VudEFsbCkge1xuICAgICAgICAgICAgICAgIGlmIChjb21wb25lbnQuY29tcG9uZW50V2lsbE1vdW50KSBjb21wb25lbnQuY29tcG9uZW50V2lsbE1vdW50KCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGNvbXBvbmVudC5jb21wb25lbnRXaWxsUmVjZWl2ZVByb3BzKSBjb21wb25lbnQuY29tcG9uZW50V2lsbFJlY2VpdmVQcm9wcyhwcm9wcywgY29udGV4dCk7XG4gICAgICAgICAgICBpZiAoY29udGV4dCAmJiBjb250ZXh0ICE9PSBjb21wb25lbnQuY29udGV4dCkge1xuICAgICAgICAgICAgICAgIGlmICghY29tcG9uZW50Ll9fYykgY29tcG9uZW50Ll9fYyA9IGNvbXBvbmVudC5jb250ZXh0O1xuICAgICAgICAgICAgICAgIGNvbXBvbmVudC5jb250ZXh0ID0gY29udGV4dDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghY29tcG9uZW50Ll9fcCkgY29tcG9uZW50Ll9fcCA9IGNvbXBvbmVudC5wcm9wcztcbiAgICAgICAgICAgIGNvbXBvbmVudC5wcm9wcyA9IHByb3BzO1xuICAgICAgICAgICAgY29tcG9uZW50Ll9feCA9ICExO1xuICAgICAgICAgICAgaWYgKDAgIT09IG9wdHMpIGlmICgxID09PSBvcHRzIHx8IG9wdGlvbnMuc3luY0NvbXBvbmVudFVwZGF0ZXMgIT09ICExIHx8ICFjb21wb25lbnQuYmFzZSkgcmVuZGVyQ29tcG9uZW50KGNvbXBvbmVudCwgMSwgbW91bnRBbGwpOyBlbHNlIGVucXVldWVSZW5kZXIoY29tcG9uZW50KTtcbiAgICAgICAgICAgIGlmIChjb21wb25lbnQuX19yKSBjb21wb25lbnQuX19yKGNvbXBvbmVudCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZnVuY3Rpb24gcmVuZGVyQ29tcG9uZW50KGNvbXBvbmVudCwgb3B0cywgbW91bnRBbGwsIGlzQ2hpbGQpIHtcbiAgICAgICAgaWYgKCFjb21wb25lbnQuX194KSB7XG4gICAgICAgICAgICB2YXIgcmVuZGVyZWQsIGluc3QsIGNiYXNlLCBwcm9wcyA9IGNvbXBvbmVudC5wcm9wcywgc3RhdGUgPSBjb21wb25lbnQuc3RhdGUsIGNvbnRleHQgPSBjb21wb25lbnQuY29udGV4dCwgcHJldmlvdXNQcm9wcyA9IGNvbXBvbmVudC5fX3AgfHwgcHJvcHMsIHByZXZpb3VzU3RhdGUgPSBjb21wb25lbnQuX19zIHx8IHN0YXRlLCBwcmV2aW91c0NvbnRleHQgPSBjb21wb25lbnQuX19jIHx8IGNvbnRleHQsIGlzVXBkYXRlID0gY29tcG9uZW50LmJhc2UsIG5leHRCYXNlID0gY29tcG9uZW50Ll9fYiwgaW5pdGlhbEJhc2UgPSBpc1VwZGF0ZSB8fCBuZXh0QmFzZSwgaW5pdGlhbENoaWxkQ29tcG9uZW50ID0gY29tcG9uZW50Ll9jb21wb25lbnQsIHNraXAgPSAhMTtcbiAgICAgICAgICAgIGlmIChpc1VwZGF0ZSkge1xuICAgICAgICAgICAgICAgIGNvbXBvbmVudC5wcm9wcyA9IHByZXZpb3VzUHJvcHM7XG4gICAgICAgICAgICAgICAgY29tcG9uZW50LnN0YXRlID0gcHJldmlvdXNTdGF0ZTtcbiAgICAgICAgICAgICAgICBjb21wb25lbnQuY29udGV4dCA9IHByZXZpb3VzQ29udGV4dDtcbiAgICAgICAgICAgICAgICBpZiAoMiAhPT0gb3B0cyAmJiBjb21wb25lbnQuc2hvdWxkQ29tcG9uZW50VXBkYXRlICYmIGNvbXBvbmVudC5zaG91bGRDb21wb25lbnRVcGRhdGUocHJvcHMsIHN0YXRlLCBjb250ZXh0KSA9PT0gITEpIHNraXAgPSAhMDsgZWxzZSBpZiAoY29tcG9uZW50LmNvbXBvbmVudFdpbGxVcGRhdGUpIGNvbXBvbmVudC5jb21wb25lbnRXaWxsVXBkYXRlKHByb3BzLCBzdGF0ZSwgY29udGV4dCk7XG4gICAgICAgICAgICAgICAgY29tcG9uZW50LnByb3BzID0gcHJvcHM7XG4gICAgICAgICAgICAgICAgY29tcG9uZW50LnN0YXRlID0gc3RhdGU7XG4gICAgICAgICAgICAgICAgY29tcG9uZW50LmNvbnRleHQgPSBjb250ZXh0O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29tcG9uZW50Ll9fcCA9IGNvbXBvbmVudC5fX3MgPSBjb21wb25lbnQuX19jID0gY29tcG9uZW50Ll9fYiA9IG51bGw7XG4gICAgICAgICAgICBjb21wb25lbnQuX19kID0gITE7XG4gICAgICAgICAgICBpZiAoIXNraXApIHtcbiAgICAgICAgICAgICAgICByZW5kZXJlZCA9IGNvbXBvbmVudC5yZW5kZXIocHJvcHMsIHN0YXRlLCBjb250ZXh0KTtcbiAgICAgICAgICAgICAgICBpZiAoY29tcG9uZW50LmdldENoaWxkQ29udGV4dCkgY29udGV4dCA9IGV4dGVuZChleHRlbmQoe30sIGNvbnRleHQpLCBjb21wb25lbnQuZ2V0Q2hpbGRDb250ZXh0KCkpO1xuICAgICAgICAgICAgICAgIHZhciB0b1VubW91bnQsIGJhc2UsIGNoaWxkQ29tcG9uZW50ID0gcmVuZGVyZWQgJiYgcmVuZGVyZWQubm9kZU5hbWU7XG4gICAgICAgICAgICAgICAgaWYgKCdmdW5jdGlvbicgPT0gdHlwZW9mIGNoaWxkQ29tcG9uZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBjaGlsZFByb3BzID0gZ2V0Tm9kZVByb3BzKHJlbmRlcmVkKTtcbiAgICAgICAgICAgICAgICAgICAgaW5zdCA9IGluaXRpYWxDaGlsZENvbXBvbmVudDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGluc3QgJiYgaW5zdC5jb25zdHJ1Y3RvciA9PT0gY2hpbGRDb21wb25lbnQgJiYgY2hpbGRQcm9wcy5rZXkgPT0gaW5zdC5fX2spIHNldENvbXBvbmVudFByb3BzKGluc3QsIGNoaWxkUHJvcHMsIDEsIGNvbnRleHQsICExKTsgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0b1VubW91bnQgPSBpbnN0O1xuICAgICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50Ll9jb21wb25lbnQgPSBpbnN0ID0gY3JlYXRlQ29tcG9uZW50KGNoaWxkQ29tcG9uZW50LCBjaGlsZFByb3BzLCBjb250ZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGluc3QuX19iID0gaW5zdC5fX2IgfHwgbmV4dEJhc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICBpbnN0Ll9fdSA9IGNvbXBvbmVudDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNldENvbXBvbmVudFByb3BzKGluc3QsIGNoaWxkUHJvcHMsIDAsIGNvbnRleHQsICExKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlbmRlckNvbXBvbmVudChpbnN0LCAxLCBtb3VudEFsbCwgITApO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJhc2UgPSBpbnN0LmJhc2U7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY2Jhc2UgPSBpbml0aWFsQmFzZTtcbiAgICAgICAgICAgICAgICAgICAgdG9Vbm1vdW50ID0gaW5pdGlhbENoaWxkQ29tcG9uZW50O1xuICAgICAgICAgICAgICAgICAgICBpZiAodG9Vbm1vdW50KSBjYmFzZSA9IGNvbXBvbmVudC5fY29tcG9uZW50ID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGluaXRpYWxCYXNlIHx8IDEgPT09IG9wdHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjYmFzZSkgY2Jhc2UuX2NvbXBvbmVudCA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgICAgICBiYXNlID0gZGlmZihjYmFzZSwgcmVuZGVyZWQsIGNvbnRleHQsIG1vdW50QWxsIHx8ICFpc1VwZGF0ZSwgaW5pdGlhbEJhc2UgJiYgaW5pdGlhbEJhc2UucGFyZW50Tm9kZSwgITApO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChpbml0aWFsQmFzZSAmJiBiYXNlICE9PSBpbml0aWFsQmFzZSAmJiBpbnN0ICE9PSBpbml0aWFsQ2hpbGRDb21wb25lbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGJhc2VQYXJlbnQgPSBpbml0aWFsQmFzZS5wYXJlbnROb2RlO1xuICAgICAgICAgICAgICAgICAgICBpZiAoYmFzZVBhcmVudCAmJiBiYXNlICE9PSBiYXNlUGFyZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBiYXNlUGFyZW50LnJlcGxhY2VDaGlsZChiYXNlLCBpbml0aWFsQmFzZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXRvVW5tb3VudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluaXRpYWxCYXNlLl9jb21wb25lbnQgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlY29sbGVjdE5vZGVUcmVlKGluaXRpYWxCYXNlLCAhMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHRvVW5tb3VudCkgdW5tb3VudENvbXBvbmVudCh0b1VubW91bnQpO1xuICAgICAgICAgICAgICAgIGNvbXBvbmVudC5iYXNlID0gYmFzZTtcbiAgICAgICAgICAgICAgICBpZiAoYmFzZSAmJiAhaXNDaGlsZCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgY29tcG9uZW50UmVmID0gY29tcG9uZW50LCB0ID0gY29tcG9uZW50O1xuICAgICAgICAgICAgICAgICAgICB3aGlsZSAodCA9IHQuX191KSAoY29tcG9uZW50UmVmID0gdCkuYmFzZSA9IGJhc2U7XG4gICAgICAgICAgICAgICAgICAgIGJhc2UuX2NvbXBvbmVudCA9IGNvbXBvbmVudFJlZjtcbiAgICAgICAgICAgICAgICAgICAgYmFzZS5fY29tcG9uZW50Q29uc3RydWN0b3IgPSBjb21wb25lbnRSZWYuY29uc3RydWN0b3I7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCFpc1VwZGF0ZSB8fCBtb3VudEFsbCkgbW91bnRzLnVuc2hpZnQoY29tcG9uZW50KTsgZWxzZSBpZiAoIXNraXApIHtcbiAgICAgICAgICAgICAgICBmbHVzaE1vdW50cygpO1xuICAgICAgICAgICAgICAgIGlmIChjb21wb25lbnQuY29tcG9uZW50RGlkVXBkYXRlKSBjb21wb25lbnQuY29tcG9uZW50RGlkVXBkYXRlKHByZXZpb3VzUHJvcHMsIHByZXZpb3VzU3RhdGUsIHByZXZpb3VzQ29udGV4dCk7XG4gICAgICAgICAgICAgICAgaWYgKG9wdGlvbnMuYWZ0ZXJVcGRhdGUpIG9wdGlvbnMuYWZ0ZXJVcGRhdGUoY29tcG9uZW50KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChudWxsICE9IGNvbXBvbmVudC5fX2gpIHdoaWxlIChjb21wb25lbnQuX19oLmxlbmd0aCkgY29tcG9uZW50Ll9faC5wb3AoKS5jYWxsKGNvbXBvbmVudCk7XG4gICAgICAgICAgICBpZiAoIWRpZmZMZXZlbCAmJiAhaXNDaGlsZCkgZmx1c2hNb3VudHMoKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBmdW5jdGlvbiBidWlsZENvbXBvbmVudEZyb21WTm9kZShkb20sIHZub2RlLCBjb250ZXh0LCBtb3VudEFsbCkge1xuICAgICAgICB2YXIgYyA9IGRvbSAmJiBkb20uX2NvbXBvbmVudCwgb3JpZ2luYWxDb21wb25lbnQgPSBjLCBvbGREb20gPSBkb20sIGlzRGlyZWN0T3duZXIgPSBjICYmIGRvbS5fY29tcG9uZW50Q29uc3RydWN0b3IgPT09IHZub2RlLm5vZGVOYW1lLCBpc093bmVyID0gaXNEaXJlY3RPd25lciwgcHJvcHMgPSBnZXROb2RlUHJvcHModm5vZGUpO1xuICAgICAgICB3aGlsZSAoYyAmJiAhaXNPd25lciAmJiAoYyA9IGMuX191KSkgaXNPd25lciA9IGMuY29uc3RydWN0b3IgPT09IHZub2RlLm5vZGVOYW1lO1xuICAgICAgICBpZiAoYyAmJiBpc093bmVyICYmICghbW91bnRBbGwgfHwgYy5fY29tcG9uZW50KSkge1xuICAgICAgICAgICAgc2V0Q29tcG9uZW50UHJvcHMoYywgcHJvcHMsIDMsIGNvbnRleHQsIG1vdW50QWxsKTtcbiAgICAgICAgICAgIGRvbSA9IGMuYmFzZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmIChvcmlnaW5hbENvbXBvbmVudCAmJiAhaXNEaXJlY3RPd25lcikge1xuICAgICAgICAgICAgICAgIHVubW91bnRDb21wb25lbnQob3JpZ2luYWxDb21wb25lbnQpO1xuICAgICAgICAgICAgICAgIGRvbSA9IG9sZERvbSA9IG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjID0gY3JlYXRlQ29tcG9uZW50KHZub2RlLm5vZGVOYW1lLCBwcm9wcywgY29udGV4dCk7XG4gICAgICAgICAgICBpZiAoZG9tICYmICFjLl9fYikge1xuICAgICAgICAgICAgICAgIGMuX19iID0gZG9tO1xuICAgICAgICAgICAgICAgIG9sZERvbSA9IG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzZXRDb21wb25lbnRQcm9wcyhjLCBwcm9wcywgMSwgY29udGV4dCwgbW91bnRBbGwpO1xuICAgICAgICAgICAgZG9tID0gYy5iYXNlO1xuICAgICAgICAgICAgaWYgKG9sZERvbSAmJiBkb20gIT09IG9sZERvbSkge1xuICAgICAgICAgICAgICAgIG9sZERvbS5fY29tcG9uZW50ID0gbnVsbDtcbiAgICAgICAgICAgICAgICByZWNvbGxlY3ROb2RlVHJlZShvbGREb20sICExKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZG9tO1xuICAgIH1cbiAgICBmdW5jdGlvbiB1bm1vdW50Q29tcG9uZW50KGNvbXBvbmVudCkge1xuICAgICAgICBpZiAob3B0aW9ucy5iZWZvcmVVbm1vdW50KSBvcHRpb25zLmJlZm9yZVVubW91bnQoY29tcG9uZW50KTtcbiAgICAgICAgdmFyIGJhc2UgPSBjb21wb25lbnQuYmFzZTtcbiAgICAgICAgY29tcG9uZW50Ll9feCA9ICEwO1xuICAgICAgICBpZiAoY29tcG9uZW50LmNvbXBvbmVudFdpbGxVbm1vdW50KSBjb21wb25lbnQuY29tcG9uZW50V2lsbFVubW91bnQoKTtcbiAgICAgICAgY29tcG9uZW50LmJhc2UgPSBudWxsO1xuICAgICAgICB2YXIgaW5uZXIgPSBjb21wb25lbnQuX2NvbXBvbmVudDtcbiAgICAgICAgaWYgKGlubmVyKSB1bm1vdW50Q29tcG9uZW50KGlubmVyKTsgZWxzZSBpZiAoYmFzZSkge1xuICAgICAgICAgICAgaWYgKGJhc2UuX19wcmVhY3RhdHRyXyAmJiBiYXNlLl9fcHJlYWN0YXR0cl8ucmVmKSBiYXNlLl9fcHJlYWN0YXR0cl8ucmVmKG51bGwpO1xuICAgICAgICAgICAgY29tcG9uZW50Ll9fYiA9IGJhc2U7XG4gICAgICAgICAgICByZW1vdmVOb2RlKGJhc2UpO1xuICAgICAgICAgICAgY29sbGVjdENvbXBvbmVudChjb21wb25lbnQpO1xuICAgICAgICAgICAgcmVtb3ZlQ2hpbGRyZW4oYmFzZSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNvbXBvbmVudC5fX3IpIGNvbXBvbmVudC5fX3IobnVsbCk7XG4gICAgfVxuICAgIGZ1bmN0aW9uIENvbXBvbmVudChwcm9wcywgY29udGV4dCkge1xuICAgICAgICB0aGlzLl9fZCA9ICEwO1xuICAgICAgICB0aGlzLmNvbnRleHQgPSBjb250ZXh0O1xuICAgICAgICB0aGlzLnByb3BzID0gcHJvcHM7XG4gICAgICAgIHRoaXMuc3RhdGUgPSB0aGlzLnN0YXRlIHx8IHt9O1xuICAgIH1cbiAgICBmdW5jdGlvbiByZW5kZXIodm5vZGUsIHBhcmVudCwgbWVyZ2UpIHtcbiAgICAgICAgcmV0dXJuIGRpZmYobWVyZ2UsIHZub2RlLCB7fSwgITEsIHBhcmVudCwgITEpO1xuICAgIH1cbiAgICB2YXIgb3B0aW9ucyA9IHt9O1xuICAgIHZhciBzdGFjayA9IFtdO1xuICAgIHZhciBFTVBUWV9DSElMRFJFTiA9IFtdO1xuICAgIHZhciBJU19OT05fRElNRU5TSU9OQUwgPSAvYWNpdHxleCg/OnN8Z3xufHB8JCl8cnBofG93c3xtbmN8bnR3fGluZVtjaF18em9vfF5vcmQvaTtcbiAgICB2YXIgaXRlbXMgPSBbXTtcbiAgICB2YXIgbW91bnRzID0gW107XG4gICAgdmFyIGRpZmZMZXZlbCA9IDA7XG4gICAgdmFyIGlzU3ZnTW9kZSA9ICExO1xuICAgIHZhciBoeWRyYXRpbmcgPSAhMTtcbiAgICB2YXIgY29tcG9uZW50cyA9IHt9O1xuICAgIGV4dGVuZChDb21wb25lbnQucHJvdG90eXBlLCB7XG4gICAgICAgIHNldFN0YXRlOiBmdW5jdGlvbihzdGF0ZSwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIHZhciBzID0gdGhpcy5zdGF0ZTtcbiAgICAgICAgICAgIGlmICghdGhpcy5fX3MpIHRoaXMuX19zID0gZXh0ZW5kKHt9LCBzKTtcbiAgICAgICAgICAgIGV4dGVuZChzLCAnZnVuY3Rpb24nID09IHR5cGVvZiBzdGF0ZSA/IHN0YXRlKHMsIHRoaXMucHJvcHMpIDogc3RhdGUpO1xuICAgICAgICAgICAgaWYgKGNhbGxiYWNrKSAodGhpcy5fX2ggPSB0aGlzLl9faCB8fCBbXSkucHVzaChjYWxsYmFjayk7XG4gICAgICAgICAgICBlbnF1ZXVlUmVuZGVyKHRoaXMpO1xuICAgICAgICB9LFxuICAgICAgICBmb3JjZVVwZGF0ZTogZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICAgICAgICAgIGlmIChjYWxsYmFjaykgKHRoaXMuX19oID0gdGhpcy5fX2ggfHwgW10pLnB1c2goY2FsbGJhY2spO1xuICAgICAgICAgICAgcmVuZGVyQ29tcG9uZW50KHRoaXMsIDIpO1xuICAgICAgICB9LFxuICAgICAgICByZW5kZXI6IGZ1bmN0aW9uKCkge31cbiAgICB9KTtcbiAgICB2YXIgcHJlYWN0ID0ge1xuICAgICAgICBoOiBoLFxuICAgICAgICBjcmVhdGVFbGVtZW50OiBoLFxuICAgICAgICBjbG9uZUVsZW1lbnQ6IGNsb25lRWxlbWVudCxcbiAgICAgICAgQ29tcG9uZW50OiBDb21wb25lbnQsXG4gICAgICAgIHJlbmRlcjogcmVuZGVyLFxuICAgICAgICByZXJlbmRlcjogcmVyZW5kZXIsXG4gICAgICAgIG9wdGlvbnM6IG9wdGlvbnNcbiAgICB9O1xuICAgIGlmICgndW5kZWZpbmVkJyAhPSB0eXBlb2YgbW9kdWxlKSBtb2R1bGUuZXhwb3J0cyA9IHByZWFjdDsgZWxzZSBzZWxmLnByZWFjdCA9IHByZWFjdDtcbn0oKTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPXByZWFjdC5qcy5tYXAiLCJyZXF1aXJlKCcuL3BvbHlmaWxscy5qcycpO1xucmVxdWlyZSgnLi9hc3NlcnQuanMnKS5wb2xsdXRlKCk7IC8vIGluamVjdCBBc3NlcnQgYW5kIFRlc3QgaW50byB3aW5kb3cgZ2xvYmFsIG9iamVjdFxuY29uc3Rcblx0UmVhY3QgPSByZXF1aXJlKCdwcmVhY3QnKSxcblx0RmlsZVNhdmVyID0gcmVxdWlyZSgnZmlsZS1zYXZlcicpLFxuXHRGaWxlT3BlbmVyID0gcmVxdWlyZSgnLi9jb21wb25lbnRzL0ZpbGVPcGVuZXIuanMnKSxcblxuXHRQcmludE1vZGFsID0gcmVxdWlyZSgnLi9jb21wb25lbnRzL1ByaW50TW9kYWwuanMnKSxcblxuXHRXZWF2ZVZpZXcgPSByZXF1aXJlKCcuL2NvbXBvbmVudHMvV2VhdmVWaWV3LmpzJyksXG5cdFNjZW5lV3JpdGVyID0gcmVxdWlyZSgnLi9jb21wb25lbnRzL1NjZW5lV3JpdGVyLmpzJyksXG5cblx0Q29sb3JzID0gcmVxdWlyZSgnLi9jb2xvcnMuanMnKSxcblxuXHRCaW5kID0gcmVxdWlyZSgnLi9iaW5kLmpzJyksXG5cdExaVyA9IHJlcXVpcmUoJ2x6LXN0cmluZycpLFxuXHRTb3VyY2UgPSByZXF1aXJlKCcuL1NvdXJjZXJ5LmpzJyksXG5cdEFjdGlvbnMgPSByZXF1aXJlKCcuL2FjdGlvbnMuanMnKSxcblx0U3R5bGUgPSB7XG5cdFx0YXBwOiAnd2lkdGg6IDEwMHZ3Oydcblx0fTtcblxuY2xhc3MgQXBwIGV4dGVuZHMgUmVhY3QuQ29tcG9uZW50IHtcblx0Y29uc3RydWN0b3IocHJvcHMsIGNvbnRleHQpIHtcblx0XHRzdXBlcihwcm9wcywgY29udGV4dCk7XG5cblx0XHR0aGlzLnN0YXRlID0ge1xuXG5cdFx0XHRpc0VkaXRpbmc6IGZhbHNlLFxuXHRcdFx0aXNQcmludGluZzogZmFsc2UsXG5cdFx0XHR0YXJnZXROb3RlOiB1bmRlZmluZWQsXG5cdFx0XHRzY2VuZUNvb3JkczogdW5kZWZpbmVkLFxuXG5cdFx0XHRwcm9qZWN0OiBTb3VyY2UuZ2V0TG9jYWwoJ3dlYXZlLXByb2plY3QnKSxcblx0XHR9XG5cblx0XHRpZiAodGhpcy5zdGF0ZS5wcm9qZWN0KSB0aGlzLnN0YXRlLnByb2plY3QgPSBKU09OLnBhcnNlKExaVy5kZWNvbXByZXNzRnJvbVVURjE2KHRoaXMuc3RhdGUucHJvamVjdCkpO1xuXHRcdGVsc2UgdGhpcy5zdGF0ZS5wcm9qZWN0ID0ge1xuXHRcdFx0dGl0bGU6ICdXZWxjb21lIHRvIFdlYXZlJyxcblx0XHRcdGF1dGhvcjogJ0Fhcm9uIEdvaW4nLFxuXHRcdFx0d29yZENvdW50OiA0LFxuXHRcdFx0c2NlbmVDb3VudDogMSxcblx0XHRcdHNsaWNlczogW3tkYXRldGltZTogJzE5OTktMTAtMjYnLCBzY2VuZXM6IFt7IGhlYWQ6ICdJbnRyb2R1Y3Rpb24gdG8gV2VhdmUnLCBib2R5OiAnV2VsY29tZSB0byBXZWF2ZSEnLCB3YzogNCAsIGxvY2F0aW9uOiAnQmVkcm9vbSd9XSB9XSxcblx0XHRcdHRocmVhZHM6IFt7IG5hbWU6ICdIYXJyeSBQb3R0ZXInLCBjb2xvcjogQ29sb3JzLnJhbmRvbSgpIH1dLFxuXHRcdFx0aGVhZGVyczogWycnXVxuXHRcdH07XG5cblx0XHRCaW5kKHRoaXMpO1xuXHR9XG5cblx0Y291bnRQcm9qZWN0KCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHR3b3JkQ291bnQ6IHRoaXMuc3RhdGUucHJvamVjdC5zbGljZXMucmVkdWNlKCh3Yywgc2xpY2UpID0+IFxuXHRcdFx0XHQod2MgKyBzbGljZS5zY2VuZXMucmVkdWNlKCh3Yywgc2NlbmUpID0+ICgoc2NlbmUpID8gKHdjICsgc2NlbmUud2MpIDogd2MpLCAwKSlcblx0XHRcdCwgMCksXG5cdFx0XHRzY2VuZUNvdW50OiB0aGlzLnN0YXRlLnByb2plY3Quc2xpY2VzLnJlZHVjZSgoc2NlbmVzLCBzbGljZSkgPT4gXG5cdFx0XHRcdChzY2VuZXMgKyBzbGljZS5zY2VuZXMucmVkdWNlKChzY2VuZXMsIHNjZW5lKSA9PiAoKHNjZW5lKSA/IChzY2VuZXMgKyAxKSA6IHNjZW5lcyksIDApKVxuXHRcdFx0LCAwKVxuXHRcdH07XG5cdH1cblxuXHRjb21wb25lbnREaWRNb3VudCgpIHtcblx0XHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncmVzaXplJywgdGhpcy5vblJlc2l6ZSk7XG5cdH1cblxuXHRjb21wb25lbnRXaWxsVW5tb3VudCgpIHtcblx0XHR3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcigncmVzaXplJywgdGhpcy5vblJlc2l6ZSk7XG5cdH1cblxuXHRyZW5kZXIocHJvcHMsIHN0YXRlKSB7XG5cdFx0cmV0dXJuIChcblx0XHRcdDxkaXYgaWQ9XCJhcHBcIiBzdHlsZT17U3R5bGUuYXBwfT5cblx0XHRcdFx0PEZpbGVPcGVuZXJcblx0XHRcdFx0XHRyZWY9eyhlbCkgPT4gKHRoaXMuRmlsZU9wZW5lciA9IGVsLmJhc2UpfVxuXHRcdFx0XHRcdG9uQ2hhbmdlPXt0aGlzLm9wZW5Qcm9qZWN0fVxuXHRcdFx0XHQvPlxuXHRcdFx0XHR7KHN0YXRlLmlzRWRpdGluZyA/XG5cdFx0XHRcdFx0PFNjZW5lV3JpdGVyXG5cdFx0XHRcdFx0XHRzY2VuZT17c3RhdGUudGFyZ2V0Tm90ZX1cblx0XHRcdFx0XHRcdGNvb3Jkcz17c3RhdGUuc2NlbmVDb29yZHN9XG5cdFx0XHRcdFx0XHR0aHJlYWQ9e3N0YXRlLnByb2plY3QudGhyZWFkc1tzdGF0ZS5zY2VuZUNvb3Jkcy5zY2VuZUluZGV4XX1cblx0XHRcdFx0XHRcdG9uRG9uZT17dGhpcy5vbkRvbmV9XG5cdFx0XHRcdFx0Lz5cblx0XHRcdFx0OlxuXHRcdFx0XHRcdDxXZWF2ZVZpZXdcblx0XHRcdFx0XHRcdHByb2plY3Q9e3RoaXMuc3RhdGUucHJvamVjdH1cblx0XHRcdFx0XHRcdGVkaXROb3RlPXt0aGlzLmVkaXROb3RlfVxuXHRcdFx0XHRcdFx0d2luZG93V2lkdGg9e3dpbmRvdy5pbm5lcldpZHRofVxuXHRcdFx0XHRcdFx0cHJvamVjdEZ1bmNzPXt7XG5cdFx0XHRcdFx0XHRcdG9uVGl0bGVDaGFuZ2U6IChldmVudCkgPT4ge1xuXHRcdFx0XHRcdFx0XHRcdHRoaXMuc3RhdGUucHJvamVjdC50aXRsZSA9IGV2ZW50LnRhcmdldC52YWx1ZTtcblx0XHRcdFx0XHRcdFx0XHR0aGlzLmZvcmNlVXBkYXRlKCk7XG5cdFx0XHRcdFx0XHRcdFx0dGhpcy5zYXZlUHJvamVjdCgpO1xuXHRcdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0XHRvbkF1dGhvckNoYW5nZTogKGV2ZW50KSA9PiB7XG5cdFx0XHRcdFx0XHRcdFx0dGhpcy5zdGF0ZS5wcm9qZWN0LmF1dGhvciA9IGV2ZW50LnRhcmdldC52YWx1ZTtcblx0XHRcdFx0XHRcdFx0XHR0aGlzLmZvcmNlVXBkYXRlKCk7XG5cdFx0XHRcdFx0XHRcdFx0dGhpcy5zYXZlUHJvamVjdCgpO1xuXHRcdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0XHRpbXBvcnQ6IHRoaXMuaW1wb3J0UHJvamVjdCxcblx0XHRcdFx0XHRcdFx0ZXhwb3J0OiB0aGlzLmV4cG9ydFByb2plY3QsXG5cdFx0XHRcdFx0XHRcdHByaW50OiAoKSA9PiB0aGlzLnNldFN0YXRlKHsgaXNQcmludGluZzogdHJ1ZSB9KSxcblx0XHRcdFx0XHRcdFx0ZGVsZXRlOiB0aGlzLmRlbGV0ZVxuXHRcdFx0XHRcdFx0fX1cblx0XHRcdFx0XHQvPlxuXHRcdFx0XHQpfVxuXHRcdFx0XHR7c3RhdGUuaXNQcmludGluZyA/XG5cdFx0XHRcdFx0PFByaW50TW9kYWxcblx0XHRcdFx0XHRcdHNsaWNlcz17c3RhdGUucHJvamVjdC5zbGljZXN9XG5cdFx0XHRcdFx0XHR0aHJlYWRzPXtzdGF0ZS5wcm9qZWN0LnRocmVhZHN9XG5cdFx0XHRcdFx0XHRoZWFkZXJzPXtzdGF0ZS5wcm9qZWN0LmhlYWRlcnN9XG5cdFx0XHRcdFx0XHRjYW5jZWw9eygpID0+IHRoaXMuc2V0U3RhdGUoeyBpc1ByaW50aW5nOiBmYWxzZSB9KX1cblx0XHRcdFx0XHRcdHByaW50PXt0aGlzLnByaW50fVxuXHRcdFx0XHRcdC8+XG5cdFx0XHRcdDpcblx0XHRcdFx0XHQnJ1xuXHRcdFx0XHR9XG5cdFx0XHQ8L2Rpdj5cblx0XHQpO1xuXHR9XG5cblx0ZWRpdE5vdGUoY29vcmRzKSB7XG5cdFx0dGhpcy5zZXRTdGF0ZSh7XG5cdFx0XHRpc0VkaXRpbmc6IHRydWUsXG5cdFx0XHRzY2VuZUNvb3JkczogY29vcmRzLFxuXHRcdFx0dGFyZ2V0Tm90ZTogdGhpcy5zdGF0ZS5wcm9qZWN0LnNsaWNlc1tjb29yZHMuc2xpY2VJbmRleF0uc2NlbmVzW2Nvb3Jkcy5zY2VuZUluZGV4XSxcblx0XHR9KTtcblx0fVxuXG5cdGltcG9ydFByb2plY3QoKSB7XG5cdFx0dGhpcy5GaWxlT3BlbmVyLmNsaWNrKCk7XG5cdH1cblxuXHRleHBvcnRQcm9qZWN0KCkge1xuXHRcdEZpbGVTYXZlci5zYXZlQXMobmV3IEJsb2IoW0pTT04uc3RyaW5naWZ5KHRoaXMuc3RhdGUucHJvamVjdCldLCB7dHlwZTogXCJ0ZXh0L3BsYWluO2NoYXJzZXQ9dXRmLThcIn0pLCB0aGlzLnN0YXRlLnByb2plY3QudGl0bGUgKyAnLndlYXZlJyk7XG5cdH1cblxuXHRwcmludChwcmludExpc3QpIHtcblx0XHR2YXIgdGV4dCwgc2xpY2VzID0gdGhpcy5zdGF0ZS5wcm9qZWN0LnNsaWNlcztcblx0XHR0aGlzLnNldFN0YXRlKHtwcmludGluZzogZmFsc2V9KTtcblxuXHRcdHRleHQgPSBwcmludExpc3QucmVkdWNlKChib2R5LCBpdGVtKSA9PiB7XG5cdFx0XHRpZiAoaXRlbS5ib2R5KSByZXR1cm4gYm9keSArICdcXG5cXG4nICsgaXRlbS5ib2R5ICsgJ1xcbic7XG5cdFx0XHRlbHNlIHJldHVybiBib2R5ICsgJ1xcblxcblxcbicgKyBpdGVtLnZhbHVlc1swXSArICdcXG4nO1xuXHRcdH0sIHRoaXMuc3RhdGUucHJvamVjdC50aXRsZSArICdcXG4nKTtcblxuXHRcdEZpbGVTYXZlci5zYXZlQXMobmV3IEJsb2IoW3RleHRdLCB7dHlwZTogXCJ0ZXh0L3BsYWluO2NoYXJzZXQ9dXRmLThcIn0pLCB0aGlzLnN0YXRlLnByb2plY3QudGl0bGUgKyAnXycgKyAobmV3IERhdGUoKS50b1N0cmluZygpKSArICcudHh0Jylcblx0fVxuXG5cdG9uUmVzaXplKCkge1xuXHRcdHRoaXMuZm9yY2VVcGRhdGUoKTtcblx0fVxuXG5cdG9uRG9uZSgpIHtcblx0XHR0aGlzLnNldFN0YXRlKHtcblx0XHRcdHRhcmdldE5vdGU6IG51bGwsXG5cdFx0XHRzY2VuZUNvb3JkczogbnVsbCxcblx0XHRcdGlzRWRpdGluZzogZmFsc2Vcblx0XHR9KTtcblx0fVxuXG5cdGRvKGFjdGlvbiwgZGF0YSkge1xuXHRcdHRoaXMuc3RhdGUucHJvamVjdCA9IEFjdGlvbnNbYWN0aW9uXShkYXRhLCB0aGlzLnN0YXRlLnByb2plY3QpO1xuXHRcdHRoaXMuc3RhdGUucHJvamVjdCA9IE9iamVjdC5hc3NpZ24oe30sIHRoaXMuc3RhdGUucHJvamVjdCwgdGhpcy5jb3VudFByb2plY3QoKSk7XG5cdFx0dGhpcy5mb3JjZVVwZGF0ZSgpO1xuXHRcdHRoaXMuc2F2ZSgpO1xuXHR9XG5cblx0ZGVsZXRlKCkge1xuXHRcdHRoaXMuc2V0U3RhdGUoe1xuXHRcdFx0cHJvamVjdDoge1xuXHRcdFx0XHR0aXRsZTogJycsXG5cdFx0XHRcdGF1dGhvcjogJycsXG5cdFx0XHRcdHdvcmRDb3VudDogMCxcblx0XHRcdFx0c2NlbmVDb3VudDogMCxcblx0XHRcdFx0c2xpY2VzOiBbXSxcblx0XHRcdFx0dGhyZWFkczogW10sXG5cdFx0XHRcdGhlYWRlcnM6IFtdXG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0dGhpcy5zYXZlKCk7XG5cdH1cblxuXHRvcGVuUHJvamVjdChkYXRhKSB7XG5cdFx0ZGF0YSA9IEpTT04ucGFyc2UoZGF0YSk7XG5cdFx0dGhpcy5zZXRTdGF0ZShkYXRhKVxuXHRcdHRoaXMuc2F2ZSgpO1xuXHR9XG5cblx0c2F2ZSgpIHtcblx0XHR0aGlzLnNhdmVQcm9qZWN0KCk7XG5cdH1cblxuXHRzYXZlUHJvamVjdCgpIHtcblx0XHRTb3VyY2Uuc2V0TG9jYWwoJ3dlYXZlLXByb2plY3QnLCBMWlcuY29tcHJlc3NUb1VURjE2KEpTT04uc3RyaW5naWZ5KHRoaXMuc3RhdGUucHJvamVjdCkpKTtcblx0fVxuXG5cdGdldENoaWxkQ29udGV4dCgpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0dGhyZWFkOiAoaW5kZXgpID0+IHtcblx0XHRcdFx0cmV0dXJuIHRoaXMuc3RhdGUucHJvamVjdC50aHJlYWRzW2luZGV4XTtcblx0XHRcdH0sXG5cdFx0XHRkbzogdGhpcy5kbyxcblx0XHR9O1xuXHR9XG59XG5cblJlYWN0Lm9wdGlvbnMuZGVib3VuY2VSZW5kZXJpbmcgPSB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lO1xuXG5SZWFjdC5yZW5kZXIoPEFwcC8+LCBkb2N1bWVudC5ib2R5KTsiLCJtb2R1bGUuZXhwb3J0cyA9IHtcblx0LypnZXQ6IGZ1bmN0aW9uKGtleSkge1xuXG5cdH0sXG5cdHNldDogZnVuY3Rpb24oa2V5LCB2YWx1ZSkge1xuXG5cdH0sKi9cblx0Y2hlY2tTdGF0dXM6IGZ1bmN0aW9uKHNlcnZlclVSTCkge1xuXHRcdHZhciBzdGF0dXMgPSB7XG5cdFx0XHRsb2NhbDogZmFsc2UsXG5cdFx0XHRvbmxpbmU6IGZhbHNlXG5cdFx0fVxuXHRcdC8vIGNoZWNrIGlmIGxvY2FsU3RvcmFnZSBleGlzdHNcblx0XHR0cnkge1xuXHRcdFx0d2luZG93LmxvY2FsU3RvcmFnZS5zZXRJdGVtKCdjaGVja1N0YXR1cycsICdhJyk7XG5cdFx0XHR3aW5kb3cubG9jYWxTdG9yYWdlLmdldEl0ZW0oJ2NoZWNrU3RhdHVzJyk7XG5cdFx0XHR3aW5kb3cubG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oJ2NoZWNrU3RhdHVzJyk7XG5cdFx0XHRzdGF0dXMubG9jYWwgPSB0cnVlO1xuXHRcdH0gY2F0Y2goZSkge31cblx0XHQvLyBjaGVjayBpZiBvbmxpbmVcblx0XHRzdGF0dXMub25saW5lID0gd2luZG93Lm5hdmlnYXRvci5vbkxpbmU7XG5cblx0XHRyZXR1cm4gc3RhdHVzO1xuXHR9LFxuXHRnZXRMb2NhbDogZnVuY3Rpb24oa2V5KSB7XG5cdFx0cmV0dXJuIHdpbmRvdy5sb2NhbFN0b3JhZ2UuZ2V0SXRlbShrZXkpO1xuXHR9LFxuXHRzZXRMb2NhbDogZnVuY3Rpb24oa2V5LCB2YWx1ZSkge1xuXHRcdHZhciBzdWNjZXNzID0gdHJ1ZTtcblx0XHRpZiAodmFsdWUgPT09IHVuZGVmaW5lZCkgd2luZG93LmxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKGtleSk7XG5cdFx0ZWxzZSB0cnkge1xuXHRcdFx0d2luZG93LmxvY2FsU3RvcmFnZS5zZXRJdGVtKGtleSwgdmFsdWUpO1xuXHRcdH0gY2F0Y2ggKGUpIHsgLy8gbG9jYWxTdG9yYWdlIGlzIGZ1bGxcblx0XHRcdHN1Y2Nlc3MgPSBmYWxzZTtcblx0XHR9XG5cdFx0cmV0dXJuIHN1Y2Nlc3M7XG5cdH1cbn07IiwibW9kdWxlLmV4cG9ydHMgPSB7XG4vLyBTTElDRSBBQ1RJT05TXG5cdE5FV19TTElDRTogZnVuY3Rpb24oYWN0aW9uLCBzdG9yZSkge1xuXHRcdHN0b3JlLnNsaWNlcyA9IE9iamVjdC5hc3NpZ24oW10sIHN0b3JlLnNsaWNlcyk7XG5cdFx0c3RvcmUuaGVhZGVycyA9IE9iamVjdC5hc3NpZ24oW10sIHN0b3JlLmhlYWRlcnMpO1xuXHRcdHN0b3JlLnNsaWNlcy5zcGxpY2UoYWN0aW9uLmF0SW5kZXgsIDAsIHtcblx0XHRcdGRhdGV0aW1lOiAnJyxcblx0XHRcdHNjZW5lczogc3RvcmUudGhyZWFkcy5tYXAoKCk9Pm51bGwpXG5cdFx0fSk7XG5cdFx0c3RvcmUuaGVhZGVycy5zcGxpY2UoYWN0aW9uLmF0SW5kZXgsIDAsICcnKTtcblx0XHRyZXR1cm4gc3RvcmU7XG5cdH0sXG5cdERFTEVURV9TTElDRTogZnVuY3Rpb24oYWN0aW9uLCBzdG9yZSkge1xuXHRcdHN0b3JlLnNsaWNlcyA9IE9iamVjdC5hc3NpZ24oW10sIHN0b3JlLnNsaWNlcyk7XG5cdFx0c3RvcmUuaGVhZGVycyA9IE9iamVjdC5hc3NpZ24oW10sIHN0b3JlLmhlYWRlcnMpO1xuXHRcdGFjdGlvbi5zbGljZSA9IHN0b3JlLnNsaWNlcy5zcGxpY2UoYWN0aW9uLmF0SW5kZXgsIDEpO1xuXHRcdGFjdGlvbi5oZWFkZXIgPSBzdG9yZS5oZWFkZXJzLnNwbGljZShhY3Rpb24uYXRJbmRleCwgMSk7XG5cdFx0cmV0dXJuIHN0b3JlO1xuXHR9LFxuXHRNT0RJRllfU0xJQ0VfREFURTogZnVuY3Rpb24oYWN0aW9uLCBzdG9yZSkge1xuXHRcdHN0b3JlLnNsaWNlcyA9IE9iamVjdC5hc3NpZ24oW10sIHN0b3JlLnNsaWNlcyk7XG5cdFx0c3RvcmUuc2xpY2VzW2FjdGlvbi5hdEluZGV4XS5kYXRldGltZSA9IGFjdGlvbi5uZXdEYXRlO1xuXHRcdHJldHVybiBzdG9yZTtcblx0fSxcblxuLy8gTk9URSBBQ1RJT05TXG5cdE5FV19OT1RFOiBmdW5jdGlvbihhY3Rpb24sIHN0b3JlKSB7XG5cdFx0c3RvcmUuc2xpY2VzID0gT2JqZWN0LmFzc2lnbihbXSwgc3RvcmUuc2xpY2VzKTtcblx0XHRzdG9yZS5zbGljZXNbYWN0aW9uLnNsaWNlSW5kZXhdLnNjZW5lcy5zcGxpY2UoYWN0aW9uLnNjZW5lSW5kZXgsIDEsIHtcblx0XHRcdHRocmVhZDogMCxcblx0XHRcdGhlYWQ6ICcnLFxuXHRcdFx0Ym9keTogJycsXG5cdFx0XHR3YzogMFxuXHRcdH0pO1xuXHRcdHJldHVybiBzdG9yZTtcblx0fSxcblx0REVMRVRFX05PVEU6IGZ1bmN0aW9uKGFjdGlvbiwgc3RvcmUpIHtcblx0XHRzdG9yZS5zbGljZXMgPSBPYmplY3QuYXNzaWduKFtdLCBzdG9yZS5zbGljZXMpO1xuXHRcdHN0b3JlLnNsaWNlc1thY3Rpb24uc2xpY2VJbmRleF0uc2NlbmVzW2FjdGlvbi5zY2VuZUluZGV4XSA9IG51bGw7XG5cdFx0cmV0dXJuIHN0b3JlO1xuXHR9LFxuXHRNT0RJRllfTk9URV9IRUFEOiBmdW5jdGlvbihhY3Rpb24sIHN0b3JlKSB7XG5cdFx0c3RvcmUuc2xpY2VzID0gT2JqZWN0LmFzc2lnbihbXSwgc3RvcmUuc2xpY2VzKTtcblx0XHRzdG9yZS5zbGljZXNbYWN0aW9uLnNsaWNlSW5kZXhdLnNjZW5lc1thY3Rpb24uc2NlbmVJbmRleF0uaGVhZCA9IGFjdGlvbi5uZXdIZWFkO1xuXHRcdHJldHVybiBzdG9yZTtcblx0fSxcblx0TU9ESUZZX05PVEVfQk9EWTogZnVuY3Rpb24oYWN0aW9uLCBzdG9yZSkge1xuXHRcdHN0b3JlLnNsaWNlcyA9IE9iamVjdC5hc3NpZ24oW10sIHN0b3JlLnNsaWNlcyk7XG5cdFx0dmFyIHNjZW5lID0gc3RvcmUuc2xpY2VzW2FjdGlvbi5zbGljZUluZGV4XS5zY2VuZXNbYWN0aW9uLnNjZW5lSW5kZXhdO1xuXHRcdHNjZW5lLmJvZHkgPSBhY3Rpb24ubmV3Qm9keTtcblx0XHRzY2VuZS53YyA9IGFjdGlvbi53Yztcblx0XHRyZXR1cm4gc3RvcmU7XG5cdH0sXG5cdE1PRElGWV9OT1RFX0xPQ0FUSU9OOiBmdW5jdGlvbihhY3Rpb24sIHN0b3JlKSB7XG5cdFx0dmFyIHNjZW5lO1xuXHRcdHN0b3JlLnNsaWNlcyA9IE9iamVjdC5hc3NpZ24oW10sIHN0b3JlLnNsaWNlcyk7XG5cdFx0c2NlbmUgPSBzdG9yZS5zbGljZXNbYWN0aW9uLnNsaWNlSW5kZXhdLnNjZW5lc1thY3Rpb24uc2NlbmVJbmRleF07XG5cdFx0c2NlbmUubG9jYXRpb24gPSBhY3Rpb24ubmV3TG9jYXRpb247XG5cdFx0cmV0dXJuIHN0b3JlO1xuXHR9LFxuXHRNT1ZFX05PVEU6IGZ1bmN0aW9uKGFjdGlvbiwgc3RvcmUpIHtcblx0XHRzdG9yZS5zbGljZXMgPSBPYmplY3QuYXNzaWduKFtdLCBzdG9yZS5zbGljZXMpO1xuXHRcdHN0b3JlLnNsaWNlc1thY3Rpb24udG8uc2xpY2VJbmRleF0uc2NlbmVzW2FjdGlvbi50by5zY2VuZUluZGV4XSA9IHN0b3JlLnNsaWNlc1thY3Rpb24uZnJvbS5zbGljZUluZGV4XS5zY2VuZXNbYWN0aW9uLmZyb20uc2NlbmVJbmRleF07XG5cdFx0c3RvcmUuc2xpY2VzW2FjdGlvbi5mcm9tLnNsaWNlSW5kZXhdLnNjZW5lc1thY3Rpb24uZnJvbS5zY2VuZUluZGV4XSA9IG51bGw7XG5cdFx0cmV0dXJuIHN0b3JlO1xuXHR9LFxuXG4vLyBUSFJFQUQgQUNUSU9OU1xuXHRORVdfVEhSRUFEOiBmdW5jdGlvbihhY3Rpb24sIHN0b3JlKSB7XG5cdFx0dmFyIGkgPSBzdG9yZS5zbGljZXMubGVuZ3RoO1xuXHRcdHN0b3JlLnRocmVhZHMgPSBPYmplY3QuYXNzaWduKFtdLCBzdG9yZS50aHJlYWRzKTtcblx0XHRzdG9yZS5zbGljZXMgPSBPYmplY3QuYXNzaWduKFtdLCBzdG9yZS5zbGljZXMpO1xuXHRcdHN0b3JlLnRocmVhZHMucHVzaCh7XG5cdFx0XHRjb2xvcjogYWN0aW9uLmNvbG9yLFxuXHRcdFx0bmFtZTogJydcblx0XHR9KTtcblx0XHR3aGlsZSAoaS0tKSBzdG9yZS5zbGljZXNbaV0uc2NlbmVzLnB1c2gobnVsbCk7XG5cdFx0cmV0dXJuIHN0b3JlO1xuXHR9LFxuXHRERUxFVEVfVEhSRUFEOiBmdW5jdGlvbihhY3Rpb24sIHN0b3JlKSB7XG5cdFx0dmFyIGkgPSBzdG9yZS5zbGljZXMubGVuZ3RoO1xuXHRcdHN0b3JlLnRocmVhZHMgPSBPYmplY3QuYXNzaWduKFtdLCBzdG9yZS50aHJlYWRzKTtcblx0XHRzdG9yZS5zbGljZXMgPSBPYmplY3QuYXNzaWduKFtdLCBzdG9yZS5zbGljZXMpO1xuXHRcdGFjdGlvbi50aHJlYWQgPSBzdG9yZS50aHJlYWRzLnNwbGljZShhY3Rpb24uYXRJbmRleCwgMSk7XG5cdFx0d2hpbGUgKGktLSkgc3RvcmUuc2xpY2VzW2ldLnNjZW5lcy5zcGxpY2UoYWN0aW9uLmF0SW5kZXgsIDEpO1xuXHRcdHJldHVybiBzdG9yZTtcblx0fSxcblx0TU9WRV9USFJFQUQ6IGZ1bmN0aW9uKGFjdGlvbiwgc3RvcmUpIHtcblx0XHR2YXIgaSA9IHN0b3JlLnNsaWNlcy5sZW5ndGgsIHNjZW5lcztcblx0XHRzdG9yZS50aHJlYWRzID0gT2JqZWN0LmFzc2lnbihbXSwgc3RvcmUudGhyZWFkcyk7XG5cdFx0c3RvcmUuc2xpY2VzID0gT2JqZWN0LmFzc2lnbihbXSwgc3RvcmUuc2xpY2VzKTtcblx0XHRzdG9yZS50aHJlYWRzLnNwbGljZShhY3Rpb24udG9JbmRleCwgMCwgc3RvcmUudGhyZWFkcy5zcGxpY2UoYWN0aW9uLmZyb21JbmRleCwgMSlbMF0pO1xuXHRcdHdoaWxlIChpLS0pIHtcblx0XHRcdHNjZW5lcyA9IHN0b3JlLnNsaWNlc1tpXS5zY2VuZXM7XG5cdFx0XHRzY2VuZXMuc3BsaWNlKGFjdGlvbi50b0luZGV4LCAwLCBzY2VuZXMuc3BsaWNlKGFjdGlvbi5mcm9tSW5kZXgsIDEpWzBdKTtcblx0XHR9XG5cdFx0cmV0dXJuIHN0b3JlO1xuXHR9LFxuXHRNT0RJRllfVEhSRUFEX05BTUU6IGZ1bmN0aW9uKGFjdGlvbiwgc3RvcmUpIHtcblx0XHRzdG9yZS50aHJlYWRzID0gT2JqZWN0LmFzc2lnbihbXSwgc3RvcmUudGhyZWFkcyk7XG5cdFx0c3RvcmUudGhyZWFkc1thY3Rpb24uYXRJbmRleF0ubmFtZSA9IGFjdGlvbi5uZXdOYW1lO1xuXHRcdHJldHVybiBzdG9yZTtcblx0fSxcblx0TU9ESUZZX1RIUkVBRF9DT0xPUjogZnVuY3Rpb24oYWN0aW9uLCBzdG9yZSkge1xuXHRcdHN0b3JlLnRocmVhZHMgPSBPYmplY3QuYXNzaWduKFtdLCBzdG9yZS50aHJlYWRzKTtcblx0XHRzdG9yZS50aHJlYWRzW2FjdGlvbi5hdEluZGV4XS5jb2xvciA9IGFjdGlvbi5jb2xvcjtcblx0XHRyZXR1cm4gc3RvcmU7XG5cdH0sXG5cblx0TU9ESUZZX0hFQURFUjogZnVuY3Rpb24oYWN0aW9uLCBzdG9yZSkge1xuXHRcdHN0b3JlLmhlYWRlcnMgPSBPYmplY3QuYXNzaWduKFtdLCBzdG9yZS5oZWFkZXJzKTtcblx0XHRzdG9yZS5oZWFkZXJzW2FjdGlvbi5hdEluZGV4XSA9IGFjdGlvbi5uZXdWYWx1ZTtcblx0XHRyZXR1cm4gc3RvcmU7XG5cdH0sLyosXG5cbi8vIExPQ0FUSU9OIEFDVElPTlNcblx0TkVXX0xPQ0FUSU9OOiBmdW5jdGlvbihhY3Rpb24sIHN0b3JlKSB7XG5cdFx0c3RvcmUudGhyZWFkcyA9IE9iamVjdC5hc3NpZ24oW10sIHN0b3JlLnRocmVhZHMpO1xuXHRcdHN0b3JlLnRocmVhZHMucHVzaCgnJyk7XG5cdFx0cmV0dXJuIHN0b3JlO1xuXHR9LFxuXHRERUxFVEVfTE9DQVRJT046IGZ1bmN0aW9uKGFjdGlvbiwgc3RvcmUpIHtcblx0XHRzdG9yZS50aHJlYWRzID0gT2JqZWN0LmFzc2lnbihbXSwgc3RvcmUudGhyZWFkcyk7XG5cdFx0c3RvcmUuc3BsaWNlKGFjdGlvbi5hdEluZGV4LCAxKTtcblx0XHRyZXR1cm4gc3RvcmU7XG5cdH0sXG5cdE1PRElGWV9MT0NBVElPTjogZnVuY3Rpb24oYWN0aW9uLCBzdG9yZSkge1xuXHRcdHN0b3JlLnRocmVhZHMgPSBPYmplY3QuYXNzaWduKFtdLCBzdG9yZS50aHJlYWRzKTtcblx0XHRzdG9yZS50aHJlYWRzW2FjdGlvbi5hdEluZGV4XSA9IGFjdGlvbi5uZXdOYW1lO1xuXHRcdHJldHVybiBzdG9yZTtcblx0fSovXG59OyIsIlxuZnVuY3Rpb24gQXNzZXJ0aW9uRXJyb3IobWVzc2FnZSkge1xuXHR2YXIgZSA9IG5ldyBFcnJvcihtZXNzYWdlKTtcblx0ZS5uYW1lID0gJ0Fzc2VydGlvbkVycm9yJztcblx0cmV0dXJuIGU7XG59XG5cbmZ1bmN0aW9uIEFzc2VydChjb25kaXRpb24sIG1lc3NhZ2UpIHtcblx0aWYgKGNvbmRpdGlvbikgcmV0dXJuO1xuXHRlbHNlIHRocm93IEFzc2VydGlvbkVycm9yKG1lc3NhZ2UpO1xufVxuXG5mdW5jdGlvbiBEZWVwRXF1YWxzKGEsIGIpIHtcblxufVxuXG5mdW5jdGlvbiBQb2xsdXRlKCkge1xuXHRcdHdpbmRvdy5UZXN0ID0gQXNzZXJ0O1xuXHRcdHdpbmRvdy5Bc3NlcnQgPSBBc3NlcnQ7XG5cdH1cblxuaWYgKG1vZHVsZS5leHBvcnRzKSBtb2R1bGUuZXhwb3J0cyA9IHtcblx0VGVzdDogQXNzZXJ0LFxuXHRBc3NlcnQ6IEFzc2VydCxcblx0cG9sbHV0ZTogUG9sbHV0ZVxufTsiLCIvLyBjb252ZW5pZW5jZSBtZXRob2Rcbi8vIGJpbmRzIGV2ZXJ5IGZ1bmN0aW9uIGluIGluc3RhbmNlJ3MgcHJvdG90eXBlIHRvIHRoZSBpbnN0YW5jZSBpdHNlbGZcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oaW5zdGFuY2UpIHtcblx0dmFyIHByb3RvID0gaW5zdGFuY2UuY29uc3RydWN0b3IucHJvdG90eXBlLFxuXHRcdGtleXMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhwcm90byksXG5cdFx0a2V5O1xuXHR3aGlsZSAoa2V5ID0ga2V5cy5wb3AoKSkgaWYgKHR5cGVvZiBwcm90b1trZXldID09PSAnZnVuY3Rpb24nICYmIGtleSAhPT0gJ2NvbnN0cnVjdG9yJykgaW5zdGFuY2Vba2V5XSA9IGluc3RhbmNlW2tleV0uYmluZChpbnN0YW5jZSk7XG59IiwiY29uc3Rcblx0Y29sb3JzID0gW1xuXHRcdCcjMzMzMzMzJyxcblx0XHQnIzY2NjY2NicsXG5cdFx0JyM5OTk5OTknLFxuXHRcdCcjYjIxZjM1Jyxcblx0XHQnI2Q4MjczNScsXG5cdFx0JyNmZjc0MzUnLFxuXHRcdCcjZmZhMTM1Jyxcblx0XHQnI2ZmY2IzNScsXG5cdFx0JyNmZmY3MzUnLFxuXHRcdCcjMDA3NTNhJyxcblx0XHQnIzAwOWU0NycsXG5cdFx0JyMxNmRkMzYnLFxuXHRcdCcjMDA1MmE1Jyxcblx0XHQnIzAwNzllNycsXG5cdFx0JyMwNmE5ZmMnLFxuXHRcdCcjNjgxZTdlJyxcblx0XHQnIzdkM2NiNScsXG5cdFx0JyNiZDdhZjYnXG5cdF07XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXHRwYWxldHRlOiBjb2xvcnMsXG5cdHJhbmRvbTogZnVuY3Rpb24ob2xkLCBjb2xvcikge1xuXHRcdGNvbG9yID0gY29sb3JzWyhNYXRoLnJhbmRvbSgpICogY29sb3JzLmxlbmd0aCkgPj4gMF07XG5cdFx0aWYgKG9sZCkgd2hpbGUgKG9sZCA9PT0gY29sb3IpIHsgY29sb3IgPSBjb2xvcnNbKE1hdGgucmFuZG9tKCkgKiBjb2xvcnMubGVuZ3RoKSA+PiAwXSB9XG5cdFx0cmV0dXJuIGNvbG9yO1xuXHR9XG59OyIsImNvbnN0XG5cdFJlYWN0ID0gcmVxdWlyZSgncHJlYWN0JyksXG5cblx0U3R5bGUgPSB7XG5cdFx0dG9vbGJhcjoge1xuXHRcdFx0ekluZGV4OiAnMjAnLFxuXHRcdFx0cG9zaXRpb246ICdmaXhlZCcsXG5cdFx0XHR0b3A6ICcwJyxcblx0XHRcdGxlZnQ6ICcwJyxcblx0XHRcdHJpZ2h0OiAnMCcsXG5cblx0XHRcdHdpZHRoOiAnMTAwdncnLFxuXHRcdFx0Ym9yZGVyOiAnbm9uZScsXG5cdFx0XHRib3JkZXJCb3R0b206ICd0aGluIHNvbGlkICM3NzcnLFxuXG5cdFx0XHRiYWNrZ3JvdW5kQ29sb3I6ICcjMDAwMDAwJyxcblxuXHRcdFx0Y29sb3I6ICcjZmZmJ1xuXHRcdH0sXG5cdFx0bWVudToge1xuXHRcdFx0d2lkdGg6ICcxMDAlJyxcblxuXHRcdFx0ZGlzcGxheTogJ2ZsZXgnLFxuXHRcdFx0ZmxleFdyYXA6ICd3cmFwJyxcblx0XHRcdGp1c3RpZnlDb250ZW50OiAnc3BhY2UtYmV0d2Vlbidcblx0XHR9LFxuXHRcdHVsOiB7XG5cdFx0XHRkaXNwbGF5OiAnZmxleCcsXG5cdFx0XHRqdXN0aWZ5Q29udGVudDogJ3NwYWNlLWJldHdlZW4nLFxuXHRcdFx0YWxpZ25JdGVtczogJ2NlbnRlcicsXG5cblx0XHRcdGxpc3RTdHlsZTogJ25vbmUnXG5cdFx0fSxcblx0XHRsaToge1xuXHRcdFx0ZGlzcGxheTogJ2lubGluZS1mbGV4Jyxcblx0XHRcdGp1c3RpZnlDb250ZW50OiAnY2VudGVyJyxcblx0XHRcdGFsaWduSXRlbXM6ICdjZW50ZXInLFxuXHRcdFx0bWFyZ2luOiAnMCAwLjVyZW0nXG5cdFx0fSxcblx0XHRpdGVtOiB7XG5cdFx0XHRoZWlnaHQ6ICcyLjVyZW0nLFxuXHRcdFx0cGFkZGluZzogJzAgMC43NXJlbScsXG5cblx0XHRcdGJvcmRlcjogJ25vbmUnLFxuXHRcdFx0b3V0bGluZTogJ25vbmUnLFxuXHRcdFx0YmFja2dyb3VuZENvbG9yOiAnIzAwMDAwMCcsXG5cblx0XHRcdGNvbG9yOiAnI2ZmZicsXG5cdFx0XHRmb250U2l6ZTogJzEuMnJlbScsXG5cblx0XHRcdGN1cnNvcjogJ3BvaW50ZXInXG5cdFx0fSxcblx0XHRpbWc6IHtcblx0XHRcdHdpZHRoOiAnMS4ycmVtJyxcblx0XHRcdGhlaWdodDogJzEuMnJlbSdcblx0XHR9LFxuXHRcdHNwYW46IHtcblx0XHRcdHBhZGRpbmdUb3A6ICcxcmVtJyxcblx0XHRcdGhlaWdodDogJzJyZW0nXG5cdFx0fSxcblx0XHR0ZXh0OiB7XG5cdFx0XHRmb250U2l6ZTogJzFyZW0nXG5cdFx0fSxcblx0XHRpbnB1dDoge1xuXHRcdFx0aGVpZ2h0OiAnMnJlbScsXG5cdFx0XHRtYXhXaWR0aDogJzk1dncnLFxuXHRcdFx0cGFkZGluZzogJzAgMC43NXJlbScsXG5cdFx0XHRib3JkZXI6ICdub25lJyxcblx0XHRcdGJvcmRlckJvdHRvbTogJ3RoaW4gc29saWQgI2ZmZicsXG5cdFx0XHRvdXRsaW5lOiAnbm9uZScsXG5cdFx0XHRiYWNrZ3JvdW5kQ29sb3I6ICcjMDAwJyxcblx0XHRcdGZvbnRTaXplOiAnMS4ycmVtJyxcblx0XHRcdGNvbG9yOiAnI2ZmZidcblx0XHR9XG5cdH07XG5cbmZ1bmN0aW9uIE1lYXN1cmVUZXh0KHRleHQpIHtcblx0dmFyIHdpZGUgPSB0ZXh0Lm1hdGNoKC9bV01dL2cpLFxuXHRcdHRoaW4gPSB0ZXh0Lm1hdGNoKC9bSXRybGlqIS4gXS9nKTtcblxuXHRcdHdpZGUgPSB3aWRlID8gd2lkZS5sZW5ndGggOiAwO1xuXHRcdHRoaW4gPSB0aGluID8gdGhpbi5sZW5ndGggOiAwO1xuXG5cdHJldHVybiAodGV4dC5sZW5ndGggKyB3aWRlICogMS4yIC0gdGhpbiAqIDAuMyk7XG59XG5cbmZ1bmN0aW9uIEFwcE1lbnUocHJvcHMsIHN0YXRlKSB7XG5cdHJldHVybiAoXG5cdFx0PGRpdiBcblx0XHRcdGlkPVwidG9vbGJhclwiXG5cdFx0XHRzdHlsZT17U3R5bGUudG9vbGJhcn1cblx0XHQ+XHRcblx0XHRcdDxtZW51IFxuXHRcdFx0XHR0eXBlPVwidG9vbGJhclwiXG5cdFx0XHRcdHN0eWxlPXtTdHlsZS5tZW51fVxuXHRcdFx0XHRyZWY9e3Byb3BzLnJlZn1cblx0XHRcdD5cblx0XHRcdFx0e3Byb3BzLmdyb3Vwcy5tYXAoKGdyb3VwKSA9PlxuXHRcdFx0XHRcdDx1bCBzdHlsZT17U3R5bGUudWx9PlxuXHRcdFx0XHRcdFx0e2dyb3VwLm1hcCgoaXRlbSkgPT4ge1xuXHRcdFx0XHRcdFx0Ly8gQ1VTVE9NIElURU1cblx0XHRcdFx0XHRcdFx0aWYgKGl0ZW0uY3VzdG9tKSByZXR1cm4gaXRlbS5jdXN0b207XG5cdFx0XHRcdFx0XHQvLyBCVVRUT04gSVRFTVxuXHRcdFx0XHRcdFx0XHRpZiAoaXRlbS5vbkNsaWNrIHx8IGl0ZW0ub25Ib2xkKSByZXR1cm4gKFxuXHRcdFx0XHRcdFx0XHRcdDxsaSBzdHlsZT17U3R5bGUubGl9PlxuXHRcdFx0XHRcdFx0XHRcdFx0PGJ1dHRvblxuXHRcdFx0XHRcdFx0XHRcdFx0XHRzdHlsZT17aXRlbS5zdHlsZSA/IE9iamVjdC5hc3NpZ24oe30sIFN0eWxlLml0ZW0sIGl0ZW0uc3R5bGUpIDogU3R5bGUuaXRlbX1cblx0XHRcdFx0XHRcdFx0XHRcdFx0b25DbGljaz17KGUpID0+IHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRlLnRhcmdldC5zdHlsZS5jb2xvciA9IGl0ZW0uc3R5bGUgPyBpdGVtLnN0eWxlLmNvbG9yIHx8IFwiI2ZmZlwiIDogJyNmZmYnO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGlmIChpdGVtLm9uQ2xpY2spIGl0ZW0ub25DbGljayhlKTtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRpZiAoaXRlbS50aW1lcikge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0Y2xlYXJUaW1lb3V0KGl0ZW0udGltZXIpO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0aXRlbS50aW1lciA9IHVuZGVmaW5lZDtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0XHRcdH19XG5cdFx0XHRcdFx0XHRcdFx0XHRcdG9uTW91c2VEb3duPXsoZSkgPT4ge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGUudGFyZ2V0LnN0eWxlLmNvbG9yID0gXCIjNzc3XCI7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0aWYgKGl0ZW0ub25Ib2xkKSBpdGVtLnRpbWVyID0gc2V0VGltZW91dChpdGVtLm9uSG9sZCwgMTAwMCwgZSk7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdH19XG5cdFx0XHRcdFx0XHRcdFx0XHRcdG5hbWU9e2l0ZW0ubmFtZX0+XG5cdFx0XHRcdFx0XHRcdFx0XHRcdHtpdGVtLmljb24gP1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdDxpbWdcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdHN0eWxlPXtTdHlsZS5pbWd9XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRzcmM9e2l0ZW0uaWNvbn1cblx0XHRcdFx0XHRcdFx0XHRcdFx0XHQvPlxuXHRcdFx0XHRcdFx0XHRcdFx0XHQ6XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0aXRlbS52YWx1ZVxuXHRcdFx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0XHQ8L2J1dHRvbj5cblx0XHRcdFx0XHRcdFx0XHQ8L2xpPlxuXHRcdFx0XHRcdFx0XHQpO1xuXHRcdFx0XHRcdFx0Ly8gVEVYVCBJTlBVVCBJVEVNXG5cdFx0XHRcdFx0XHRcdGlmIChpdGVtLm9uSW5wdXQpIHJldHVybiAoXG5cdFx0XHRcdFx0XHRcdFx0PGxpIHN0eWxlPXtTdHlsZS5saX0+XG5cdFx0XHRcdFx0XHRcdFx0XHQ8aW5wdXRcblx0XHRcdFx0XHRcdFx0XHRcdFx0c3R5bGU9e2l0ZW0uc3R5bGUgPyBPYmplY3QuYXNzaWduKHt9LCBTdHlsZS5pbnB1dCwgaXRlbS5zdHlsZSkgOiBTdHlsZS5pbnB1dH1cblx0XHRcdFx0XHRcdFx0XHRcdFx0dHlwZT1cInRleHRcIlxuXHRcdFx0XHRcdFx0XHRcdFx0XHRwbGFjZWhvbGRlcj17aXRlbS5wbGFjZWhvbGRlcn1cblx0XHRcdFx0XHRcdFx0XHRcdFx0bWF4TGVuZ3RoPXs0MH1cblx0XHRcdFx0XHRcdFx0XHRcdFx0c2l6ZT17TWF0aC5tYXgoTWVhc3VyZVRleHQoaXRlbS52YWx1ZS5sZW5ndGggPyBpdGVtLnZhbHVlIDogKHByb3BzLnBsYWNlaG9sZGVyIHx8ICcnKSksIDIwKX1cblx0XHRcdFx0XHRcdFx0XHRcdFx0b25JbnB1dD17aXRlbS5vbklucHV0fVxuXHRcdFx0XHRcdFx0XHRcdFx0XHR2YWx1ZT17aXRlbS52YWx1ZX1cblx0XHRcdFx0XHRcdFx0XHRcdC8+XG5cdFx0XHRcdFx0XHRcdFx0PC9saT5cblxuXHRcdFx0XHRcdFx0XHQpO1xuXHRcdFx0XHRcdFx0Ly8gVEVYVCBJVEVNXG5cdFx0XHRcdFx0XHRcdHJldHVybiAoXG5cdFx0XHRcdFx0XHRcdFx0PGxpIHN0eWxlPXtPYmplY3QuYXNzaWduKHt9LCBTdHlsZS5saSwgU3R5bGUudGV4dCwgaXRlbS5zdHlsZSA/IGl0ZW0uc3R5bGUgOiB7fSl9PlxuXHRcdFx0XHRcdFx0XHRcdFx0PHNwYW4gc3R5bGU9e1N0eWxlLnNwYW59PntpdGVtLnZhbHVlfTwvc3Bhbj5cblx0XHRcdFx0XHRcdFx0XHQ8L2xpPlxuXHRcdFx0XHRcdFx0XHQpO1xuXHRcdFx0XHRcdFx0fSl9XG5cdFx0XHRcdFx0PC91bD5cblx0XHRcdFx0KX1cblx0XHRcdDwvbWVudT5cblx0XHQ8L2Rpdj5cblx0KVxufTtcblxuQXBwTWVudS5tYWluID0gKG8sIGMpID0+ICh7XG5cdG9wZW5lZDogbyxcblx0Y2xvc2VkOiBjXG59KTtcblxuQXBwTWVudS5pbnB1dCA9IChwLCB2LCBmLCBzKSA9PiAoeyBwbGFjZWhvbGRlcjogcCwgdmFsdWU6IHYsIG9uSW5wdXQ6IGYsIHN0eWxlOiBzID8gcyA6IHVuZGVmaW5lZCB9KTtcblxuQXBwTWVudS50ZXh0ID0gKHYsIHMpID0+ICh7IHZhbHVlOiB2LCBzdHlsZTogcyA/IHMgOiB1bmRlZmluZWQgfSk7XG5cbkFwcE1lbnUuYnRuID0gKHYsIGYsIHMpID0+ICh7IHZhbHVlOiB2LCBvbkNsaWNrOiBmLCBzdHlsZTogcyA/IHMgOiB1bmRlZmluZWQgfSk7XG5cbkFwcE1lbnUuZGVsZXRlQnRuID0gKGYpID0+ICh7XG5cdHZhbHVlOiAnZGVsZXRlJyxcblx0c3R5bGU6IHtjb2xvcjogJyNmMDAnLCB0cmFuc2l0aW9uOiAnY29sb3IgMXMnfSxcblx0b25Ib2xkOiBmXG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBBcHBNZW51OyIsImNvbnN0XG5cdFJlYWN0ID0gcmVxdWlyZSgncHJlYWN0JyksXG5cblx0U3R5bGUgPSB7XG5cdFx0YnRuOiB7XG5cdFx0XHR3aWR0aDogJzJyZW0nLFxuXHRcdFx0aGVpZ2h0OiAnMnJlbScsXG5cdFx0XHRib3JkZXJSYWRpdXM6ICcxcmVtJyxcblxuXHRcdFx0Ym9yZGVyOiAnbm9uZScsXG5cdFx0XHRvdXRsaW5lOiAnbm9uZScsXG5cdFx0XHRiYWNrZ3JvdW5kQ29sb3I6ICcjNTU1JyxcblxuXHRcdFx0Y29sb3I6ICcjZjAwJyxcblx0XHRcdGZvbnRTaXplOiAnMS4ycmVtJyxcblx0XHRcdHRyYW5zaXRpb246ICdjb2xvciAxcycsXG5cblx0XHRcdGN1cnNvcjogJ3BvaW50ZXInXG5cdFx0fVxuXHR9O1xuXG5jbGFzcyBEZWxldGVCdXR0b24gZXh0ZW5kcyBSZWFjdC5Db21wb25lbnQge1xuXHRjb25zdHJ1Y3Rvcihwcm9wcywgY29udGV4dCkge1xuXHRcdHN1cGVyKHByb3BzLCBjb250ZXh0KTtcblx0fVxuXG5cdHNob3VsZENvbXBvbmVudFVwZGF0ZSgpIHtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblxuXHRyZW5kZXIocHJvcHMpIHtcblx0XHRyZXR1cm4gKFxuXHRcdFx0PGJ1dHRvblxuXHRcdFx0XHRzdHlsZT17cHJvcHMuc3R5bGUgPyBPYmplY3QuYXNzaWduKHt9LCBTdHlsZS5idG4sIHByb3BzLnN0eWxlKSA6IFN0eWxlLmJ0bn1cblx0XHRcdFx0b25DbGljaz17KGUpID0+IHtcblx0XHRcdFx0XHRlLnRhcmdldC5zdHlsZS5jb2xvciA9ICcjZjAwJztcblx0XHRcdFx0XHRpZiAodGhpcy50aW1lcikge1xuXHRcdFx0XHRcdFx0Y2xlYXJUaW1lb3V0KHRoaXMudGltZXIpO1xuXHRcdFx0XHRcdFx0dGhpcy50aW1lciA9IHVuZGVmaW5lZDtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH19XG5cdFx0XHRcdG9uTW91c2VEb3duPXsoZSkgPT4ge1xuXHRcdFx0XHRcdGUudGFyZ2V0LnN0eWxlLmNvbG9yID0gXCIjNzc3XCI7XG5cdFx0XHRcdFx0aWYgKHByb3BzLm9uSG9sZCkgdGhpcy50aW1lciA9IHNldFRpbWVvdXQocHJvcHMub25Ib2xkLCAxMDAwLCBlKTtcblx0XHRcdFx0fX1cblx0XHRcdD5YPC9idXR0b24+XG5cdFx0KTtcblx0fVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IERlbGV0ZUJ1dHRvbjsiLCJjb25zdFxuXHRSZWFjdCA9IHJlcXVpcmUoJ3ByZWFjdCcpLFxuXG5cdEJpbmQgPSByZXF1aXJlKCcuLi9iaW5kLmpzJyksXG5cblx0U3R5bGUgPSB7XG5cdFx0ZWRpdEJveDoge1xuXHRcdFx0b3V0bGluZTogJ25vbmUnLFxuXHRcdFx0Ym9yZGVyOiAnbm9uZScsXG5cdFx0XHRvdmVyZmxvdzogJ2hpZGRlbicsXG5cdFx0XHRyZXNpemU6ICdub25lJ1xuXHRcdH1cblx0fTtcblxuY2xhc3MgRXhwYW5kaW5nVGV4dGFyZWEgZXh0ZW5kcyBSZWFjdC5Db21wb25lbnQge1xuXHRjb25zdHJ1Y3Rvcihwcm9wcywgY29udGV4dCkge1xuXHRcdHN1cGVyKHByb3BzLCBjb250ZXh0KTtcblx0XHR0aGlzLnN0YXRlID0ge1xuXHRcdFx0dmFsdWU6IHByb3BzLnZhbHVlLFxuXHRcdFx0c3R5bGU6IE9iamVjdC5hc3NpZ24oe30sIFN0eWxlLmVkaXRCb3gsIHsgaGVpZ2h0OiBwcm9wcy5iYXNlSGVpZ2h0IH0pXG5cdFx0fTtcblxuXHRcdEJpbmQodGhpcyk7XG5cdH1cblxuXHRyZW5kZXIocHJvcHMsIHN0YXRlKSB7XG5cdFx0dmFyIHN0eWxlID0gT2JqZWN0LmFzc2lnbih7fSwgcHJvcHMuc3R5bGUsIHN0YXRlLnN0eWxlKTtcblx0XHRyZXR1cm4gKFxuXHRcdFx0PHRleHRhcmVhXG5cdFx0XHRcdHN0eWxlPXtzdHlsZX1cblx0XHRcdFx0bWF4bGVuZ3RoPXtwcm9wcy5tYXhsZW5ndGh9XG5cdFx0XHRcdHBsYWNlaG9sZGVyPXtwcm9wcy5wbGFjZWhvbGRlcn1cblx0XHRcdFx0b25JbnB1dD17dGhpcy5vbklucHV0fVxuXHRcdFx0XHRvbkNoYW5nZT17cHJvcHMuY2hhbmdlfVxuXHRcdFx0XHRvbkZvY3VzPXtwcm9wcy5mb2N1c31cblx0XHRcdFx0b25CbHVyPXtwcm9wcy5ibHVyfVxuXHRcdFx0XHR2YWx1ZT17c3RhdGUudmFsdWV9XG5cdFx0XHQvPlxuXHRcdClcblx0fVxuXG5cdHNob3VsZENvbXBvbmVudFVwZGF0ZShwcm9wcywgc3RhdGUpIHtcblx0XHRyZXR1cm4gKChwcm9wcy52YWx1ZSAhPT0gdGhpcy5wcm9wcy52YWx1ZSkgfHxcblx0XHRcdFx0KHN0YXRlLnZhbHVlICE9PSB0aGlzLnN0YXRlLnZhbHVlKSB8fFxuXHRcdFx0XHQocHJvcHMuc3R5bGUuYmFja2dyb3VuZENvbG9yICE9PSB0aGlzLnByb3BzLnN0eWxlLmJhY2tncm91bmRDb2xvcikpO1xuXHR9XG5cblx0Y29tcG9uZW50RGlkTW91bnQoKSB7XG5cdFx0dGhpcy5kb1Jlc2l6ZSgpO1xuXHRcdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdyZXNpemUnLCB0aGlzLmRvUmVzaXplKTtcblx0fVxuXG5cdGNvbXBvbmVudFdpbGxVbm1vdW50KCkge1xuXHRcdHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdyZXNpemUnLCB0aGlzLmRvUmVzaXplKTtcblx0fVxuXG5cdG9uSW5wdXQoZXZlbnQpIHtcblx0XHR0aGlzLnN0YXRlLnZhbHVlID0gZXZlbnQudGFyZ2V0LnZhbHVlO1xuXHRcdGlmICh0aGlzLnByb3BzLmlucHV0KSB0aGlzLnByb3BzLmlucHV0KGV2ZW50KTtcblx0XHR0aGlzLmRvUmVzaXplKCk7XG5cdH1cblxuXHRkb1Jlc2l6ZSgpIHtcblx0XHR0aGlzLnN0YXRlLnN0eWxlLmhlaWdodCA9IHRoaXMucHJvcHMuYmFzZUhlaWdodDtcblx0XHR0aGlzLmZvcmNlVXBkYXRlKHRoaXMucmVzaXplKTtcblx0fVxuXG5cdHJlc2l6ZSgpIHtcblx0XHR0aGlzLnN0YXRlLnN0eWxlLmhlaWdodCA9IHRoaXMuYmFzZS5zY3JvbGxIZWlnaHQgKyAncHgnO1xuXHRcdHRoaXMuZm9yY2VVcGRhdGUoKTtcblxuXHR9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gRXhwYW5kaW5nVGV4dGFyZWE7IiwiY29uc3Rcblx0UmVhY3QgPSByZXF1aXJlKCdwcmVhY3QnKSxcblx0UmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihwcm9wcykge1xuXHRyZXR1cm4gKFxuXHRcdDxpbnB1dFxuXHRcdFx0dHlwZT1cImZpbGVcIlxuXHRcdFx0YWNjZXB0PVwiLndlYXZlXCJcblx0XHRcdHN0eWxlPXt7XG5cdFx0XHRcdHBvc2l0aW9uOiAnYWJzb2x1dGUnLFxuXHRcdFx0XHR2aXNpYmlsaXR5OiAnaGlkZGVuJyxcblx0XHRcdFx0dG9wOiAnLTUwJyxcblx0XHRcdFx0bGVmdDogJy01MCdcblx0XHRcdH19XG5cdFx0XHRvbmNoYW5nZT17KGUpID0+IHtcblx0XHRcdFx0UmVhZGVyLm9ubG9hZGVuZCA9ICgpID0+IFxuXHRcdFx0XHRcdHByb3BzLm9uQ2hhbmdlKFJlYWRlci5yZXN1bHQpO1xuXHRcdFx0XHRSZWFkZXIucmVhZEFzVGV4dChlLnRhcmdldC5maWxlc1swXSk7XG5cdFx0XHR9fVxuXHRcdC8+XG5cdCk7XG59IiwiY29uc3Rcblx0UmVhY3QgPSByZXF1aXJlKCdwcmVhY3QnKSxcblxuXHREZWxldGVCdXR0b24gPSByZXF1aXJlKCcuL0RlbGV0ZUJ1dHRvbi5qcycpLFxuXG5cdExvY2F0aW9uTGFiZWwgPSByZXF1aXJlKCcuL0xvY2F0aW9uTGFiZWwuanMnKSxcblxuXHRCaW5kID0gcmVxdWlyZSgnLi4vYmluZC5qcycpLFxuXHRFeHBhbmRpbmdUZXh0YXJlYSA9IHJlcXVpcmUoJy4vRXhwYW5kaW5nVGV4dGFyZWEuanMnKSxcblxuXHRTdHlsZSA9IHtcblx0XHRib3g6IHtcblx0XHRcdG1heFdpZHRoOiAnNTByZW0nLFxuXHRcdFx0YmFja2dyb3VuZENvbG9yOiAnI2ZmZicsXG5cdFx0XHRjb2xvcjogJyMyMjInLFxuXHRcdFx0ZGlzcGxheTogJ2ZsZXgnLFxuXHRcdFx0ZmxleERpcmVjdGlvbjogJ2NvbHVtbicsXG5cdFx0XHRqdXN0aWZ5Q29udGVudDogJ3NwYWNlLWFyb3VuZCcsXG5cdFx0XHRhbGlnbkl0ZW1zOiAnc3RyZXRjaCcsXG5cdFx0XHR3aWR0aDogJzE0cmVtJyxcblx0XHRcdHBvc2l0aW9uOiAncmVsYXRpdmUnLFxuXHRcdFx0dG9wOiAnMC4ycmVtJyxcblx0XHRcdG1heEhlaWdodDogJzEzcmVtJyxcblx0XHRcdG1hcmdpbjogJzAuMnJlbScsXG5cdFx0XHRib3JkZXI6ICcwIHNvbGlkIHJnYmEoMCwwLDAsMCknXG5cdFx0fSxcblx0XHR0ZXh0YXJlYToge1xuXHRcdFx0Zm9udFNpemU6ICcxLjFyZW0nLFxuXHRcdFx0bWFyZ2luOiAnMC43NXJlbScsXG5cdFx0XHRtYXhIZWlnaHQ6ICc5cmVtJ1xuXHRcdH1cblx0fTtcblxuXG5jbGFzcyBIZWFkZXJFZGl0b3IgZXh0ZW5kcyBSZWFjdC5Db21wb25lbnQge1xuXHRjb25zdHJ1Y3Rvcihwcm9wcywgY29udGV4dCkge1xuXHRcdHN1cGVyKHByb3BzLCBjb250ZXh0KTtcblxuXHRcdEJpbmQodGhpcyk7XG5cdH1cblxuXHRyZW5kZXIocHJvcHMsIHN0YXRlKSB7XG5cdFx0cmV0dXJuIChcblx0XHRcdDxkaXZcblx0XHRcdFx0c3R5bGU9e1N0eWxlLmJveH1cblx0XHRcdD5cblx0XHRcdFx0PEV4cGFuZGluZ1RleHRhcmVhXG5cdFx0XHRcdFx0c3R5bGU9e1N0eWxlLnRleHRhcmVhfVxuXHRcdFx0XHRcdG1heExlbmd0aD17MjUwfSBcblx0XHRcdFx0XHRiYXNlSGVpZ2h0PVwiMS4zcmVtXCJcblx0XHRcdFx0XHRwbGFjZWhvbGRlcj1cIkNoYXB0ZXIvU2NlbmUgSGVhZGVyXCJcblx0XHRcdFx0XHR2YWx1ZT17cHJvcHMuaGVhZGVyfVxuXHRcdFx0XHRcdGlucHV0PXsoZSkgPT4gdGhpcy5jb250ZXh0LmRvKCdNT0RJRllfSEVBREVSJywge2F0SW5kZXg6IHByb3BzLmlkLCBuZXdWYWx1ZTogZS50YXJnZXQudmFsdWV9KX1cblx0XHRcdFx0XHRyZWY9e2VsID0+IHRoaXMuZWwgPSBlbH1cblx0XHRcdFx0Lz5cblx0XHRcdDwvZGl2PlxuXHRcdClcblx0fVxuXG59XG5cbm1vZHVsZS5leHBvcnRzID0gSGVhZGVyRWRpdG9yOyIsImNvbnN0XG5cdFJlYWN0ID0gcmVxdWlyZSgncHJlYWN0JyksXG5cblx0U3R5bGUgPSB7XG5cdFx0ZWRpdG9yOiB7XG5cdFx0XHRmb250U2l6ZTogJzAuOXJlbScsXG5cdFx0XHRwYWRkaW5nOiAnMC41cmVtJyxcblx0XHRcdGhlaWdodDogJzFyZW0nLFxuXHRcdFx0Ym9yZGVyOiAnbm9uZScsXG5cdFx0XHRvdXRsaW5lOiAnbm9uZScsXG5cdFx0XHRiYWNrZ3JvdW5kOiAncmdiYSgwLDAsMCwwKScsXG5cdFx0XHRjb2xvcjogJyNmZmYnXG5cdFx0fVxuXHR9O1xuXG5mdW5jdGlvbiBNZWFzdXJlVGV4dCh0ZXh0KSB7XG5cdHJldHVybiB0ZXh0Lmxlbmd0aCA/ICh0ZXh0Lmxlbmd0aCAqIDEuMSkgOiA1O1xufVxuXG5jbGFzcyBMb2NhdGlvbkxhYmVsIGV4dGVuZHMgUmVhY3QuQ29tcG9uZW50IHtcblx0Y29uc3RydWN0b3IocHJvcHMsIGNvbnRleHQpIHtcblx0XHRzdXBlcihwcm9wcywgY29udGV4dCk7XG5cblx0XHR0aGlzLnN0YXRlID0ge1xuXHRcdFx0dmFsdWU6IHByb3BzLnZhbHVlXG5cdFx0fVxuXHR9XG5cblx0Y29tcG9uZW50V2lsbFJlY2VpdmVQcm9wcyhwcm9wcykge1xuXHRcdHRoaXMuc2V0U3RhdGUoe3ZhbHVlOiBwcm9wcy52YWx1ZX0pO1xuXHR9XG5cblx0cmVuZGVyKHByb3BzLCBzdGF0ZSwgY29udGV4dCkge1xuXHRcdHJldHVybiAoXG5cdFx0XHQ8aW5wdXRcblx0XHRcdFx0dHlwZT1cInRleHRcIlxuXHRcdFx0XHRzdHlsZT17cHJvcHMuc3R5bGUgPyBPYmplY3QuYXNzaWduKHt9LCBTdHlsZS5lZGl0b3IsIHByb3BzLnN0eWxlKSA6IFN0eWxlLmVkaXRvcn1cblx0XHRcdFx0bWF4TGVuZ3RoPVwiNTBcIlxuXHRcdFx0XHRzaXplPXsyMH1cblx0XHRcdFx0dmFsdWU9e3N0YXRlLnZhbHVlfVxuXHRcdFx0XHRwbGFjZWhvbGRlcj1cImxvY2F0aW9uXCJcblx0XHRcdFx0b25JbnB1dD17KGV2ZW50KSA9PiB0aGlzLnNldFN0YXRlKHt2YWx1ZTogZXZlbnQudGFyZ2V0LnZhbHVlfSl9XG5cdFx0XHRcdG9uQ2hhbmdlPXtwcm9wcy5vbkNoYW5nZX1cblx0XHRcdC8+XG5cdFx0KTtcblx0fVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IExvY2F0aW9uTGFiZWw7IiwiY29uc3Rcblx0UmVhY3QgPSByZXF1aXJlKCdwcmVhY3QnKSxcblxuXHRTdHlsZSA9IHtcblx0XHRvdXRlcjoge1xuXHRcdFx0ekluZGV4OiAzMCxcblx0XHRcdHBvc2l0aW9uOiAnZml4ZWQnLFxuXHRcdFx0dG9wOiAwLFxuXHRcdFx0bGVmdDogMCxcblx0XHRcdHdpZHRoOiAnMTAwdncnLFxuXHRcdFx0aGVpZ2h0OiAnMTAwdmgnLFxuXHRcdFx0YmFja2dyb3VuZENvbG9yOiAncmdiYSgwLDAsMCwwLjUpJyxcblx0XHRcdGRpc3BsYXk6ICdmbGV4Jyxcblx0XHRcdGp1c3RpZnlDb250ZW50OiAnY2VudGVyJyxcblx0XHRcdGFsaWduSXRlbXM6ICdjZW50ZXInXG5cdFx0fSxcblx0XHRpbm5lcjoge1xuXHRcdFx0YmFja2dyb3VuZENvbG9yOiAnIzAwMCcsXG5cdFx0XHRkaXNwbGF5OiAnZmxleCcsXG5cdFx0XHRmbGV4RGlyZWN0aW9uOiAnY29sdW1uJyxcblx0XHRcdGp1c3RpZnlDb250ZW50OiAnZmxleC1zdGFydCcsXG5cdFx0XHRhbGlnbkl0ZW1zOiAnY2VudGVyJyxcblx0XHRcdHBhZGRpbmc6ICcxcmVtJ1xuXHRcdH1cblx0fTtcblxuY2xhc3MgTW9kYWxWaWV3IGV4dGVuZHMgUmVhY3QuQ29tcG9uZW50IHtcblx0Y29uc3RydWN0b3IocHJvcHMsIGNvbnRleHQpIHsgXG5cdFx0c3VwZXIocHJvcHMsIGNvbnRleHQpO1xuXHR9XG5cblx0cmVuZGVyKHByb3BzLCBzdGF0ZSkge1xuXHRcdHJldHVybiAoXG5cdFx0XHQ8ZGl2XG5cdFx0XHRcdHN0eWxlPXtTdHlsZS5vdXRlcn1cblx0XHRcdFx0b25DbGljaz17cHJvcHMuZGlzbWlzc31cblx0XHRcdD5cblx0XHRcdFx0PGRpdlxuXHRcdFx0XHRcdHN0eWxlPXtTdHlsZS5pbm5lcn1cblx0XHRcdFx0XHRvbkNsaWNrPXsoZSkgPT4gZS5zdG9wUHJvcGFnYXRpb24oKX1cblx0XHRcdFx0PlxuXHRcdFx0XHRcdHtwcm9wcy5jaGlsZHJlbn1cblx0XHRcdFx0PC9kaXY+XG5cdFx0XHQ8L2Rpdj5cblx0XHQpO1xuXHR9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gTW9kYWxWaWV3OyIsImNvbnN0XG5cdFJlYWN0ID0gcmVxdWlyZSgncHJlYWN0JyksXG5cblx0TW9kYWxWaWV3ID0gcmVxdWlyZSgnLi9Nb2RhbFZpZXcuanMnKSxcblxuXHRCaW5kID0gcmVxdWlyZSgnLi4vYmluZC5qcycpLFxuXG5cdFN0eWxlID0ge1xuXHRcdHNjZW5lOiB7XG5cdFx0XHRkaXNwbGF5OiAnZmxleCcsXG5cdFx0XHRqdXN0aWZ5Q29udGVudDogJ3NwYWNlLWFyb3VuZCcsXG5cdFx0XHRmb250U2l6ZTogJzAuOXJlbScsXG5cdFx0XHRhbGlnbkl0ZW1zOiAnY2VudGVyJyxcblx0XHRcdHBhZGRpbmc6ICcwLjVyZW0nLFxuXHRcdFx0bWFyZ2luOiAnMC41cmVtIDAuNXJlbScsXG5cdFx0XHR3aWR0aDogJzIwcmVtJ1xuXHRcdH0sXG5cdFx0c3Bhbjoge1xuXHRcdFx0bWluV2lkdGg6ICc1cmVtJyxcblx0XHRcdG1hcmdpblJpZ2h0OiAnMXJlbScsXG5cdFx0XHR3aGl0ZVNwYWNlOiAnbm93cmFwJyxcblx0XHRcdG92ZXJmbG93OiAnaGlkZGVuJyxcblx0XHRcdHRleHRPdmVyZmxvdzogJ2VsbGlwc2lzJ1xuXHRcdH0sXG5cdFx0cm93OiB7XG5cdFx0XHRkaXNwbGF5OiAnZmxleCcsXG5cdFx0XHRqdXN0aWZ5Q29udGVudDogJ3NwYWNlLWFyb3VuZCcsXG5cdFx0XHRhbGlnbkl0ZW1zOiAnY2VudGVyJyxcblx0XHRcdHdpZHRoOiAnMTAwJSdcblx0XHR9LFxuXHRcdGlucHV0OiB7XG5cdFx0XHR6SW5kZXg6ICcxMScsXG5cdFx0XHRjb2xvcjogJyMwMDAnLFxuXHRcdFx0bWF4V2lkdGg6ICcxNHJlbScsXG5cdFx0XHRvdXRsaW5lOiAnbm9uZScsXG5cdFx0XHRmb250U2l6ZTogJzFyZW0nLFxuXHRcdFx0Ym9yZGVyOiAnbm9uZScsXG5cdFx0XHR0ZXh0QWxpZ246ICdjZW50ZXInLFxuXHRcdFx0cGFkZGluZzogJzAuMjVyZW0nLFxuXHRcdFx0bWFyZ2luVG9wOiAnMC41cmVtJ1xuXHRcdH0sXG5cdFx0dGhyZWFkOiB7XG5cdFx0XHRoZWlnaHQ6ICcycmVtJyxcblx0XHRcdHBhZGRpbmc6ICcwIDAuNzVyZW0nLFxuXG5cdFx0XHRib3JkZXI6ICdub25lJyxcblx0XHRcdG91dGxpbmU6ICdub25lJyxcblx0XHRcdGJhY2tncm91bmRDb2xvcjogJyMwMDAwMDAnLFxuXG5cdFx0XHRjb2xvcjogJyNmZmYnLFxuXHRcdFx0Zm9udFNpemU6ICcxcmVtJyxcblxuXHRcdFx0Y3Vyc29yOiAncG9pbnRlcicsXG5cdFx0XHRib3JkZXJSYWRpdXM6ICcxcmVtJ1xuXHRcdH0sXG5cdFx0c2xpY2VTZWN0aW9uOiB7XG5cdFx0XHRtaW5XaWR0aDogJzIwcmVtJ1xuXHRcdH0sXG5cdFx0dGhyZWFkU2VjdGlvbjoge1xuXHRcdFx0bWFyZ2luQm90dG9tOiAnMXJlbSdcblx0XHR9LFxuXHRcdGRhdGU6IHtcblx0XHRcdGNvbG9yOiAnI2ZmZicsXG5cdFx0XHRmb250U2l6ZTogJzAuOXJlbSdcblx0XHR9LFxuXHRcdGl0ZW06IHtcblx0XHRcdGhlaWdodDogJzIuNXJlbScsXG5cdFx0XHRwYWRkaW5nOiAnMCAwLjc1cmVtJyxcblxuXHRcdFx0Ym9yZGVyOiAnbm9uZScsXG5cdFx0XHRvdXRsaW5lOiAnbm9uZScsXG5cdFx0XHRiYWNrZ3JvdW5kQ29sb3I6ICcjMDAwMDAwJyxcblxuXHRcdFx0Y29sb3I6ICcjZmZmJyxcblx0XHRcdGZvbnRTaXplOiAnMS4ycmVtJyxcblxuXHRcdFx0Y3Vyc29yOiAncG9pbnRlcidcblx0XHR9LFxuXHR9O1xuXG5jbGFzcyBQcmludE1vZGFsIGV4dGVuZHMgUmVhY3QuQ29tcG9uZW50IHtcblx0Y29uc3RydWN0b3IocHJvcHMsIGNvbnRleHQpIHsgXG5cdFx0c3VwZXIocHJvcHMsIGNvbnRleHQpO1xuXG5cdFx0dGhpcy5zdGF0ZSA9IHtcblx0XHRcdHRocmVhZHM6IFtdLFxuXHRcdFx0ZmlsdGVyZWQ6IFtdLFxuXHRcdFx0ZGVzZWxlY3RlZDogW11cblx0XHR9XG5cblx0XHRCaW5kKHRoaXMpO1xuXHR9XG5cblx0cmVuZGVyKHByb3BzLCBzdGF0ZSkge1xuXHRcdGNvbnN0IHNlbGVjdCA9IHRoaXMuc2VsZWN0O1xuXG5cdFx0cmV0dXJuIChcblx0XHRcdDxNb2RhbFZpZXdcblx0XHRcdFx0ZGlzbWlzcz17cHJvcHMuY2FuY2VsfVxuXHRcdFx0PlxuXHRcdFx0XHQ8ZGl2XG5cdFx0XHRcdFx0ZGF0YS1pcz1cInRocmVhZHNcIlxuXHRcdFx0XHRcdHN0eWxlPXtTdHlsZS50aHJlYWRTZWN0aW9ufVxuXHRcdFx0XHQ+XG5cdFx0XHRcdFx0e3Byb3BzLnRocmVhZHMucmVkdWNlKCh0aHJlYWRzLCB0LCBpKSA9PiB7XG5cdFx0XHRcdFx0XHRpZiAodC5uYW1lLmxlbmd0aCkge1xuXHRcdFx0XHRcdFx0XHRyZXR1cm4gdGhyZWFkcy5jb25jYXQoW1xuXHRcdFx0XHRcdFx0XHRcdDxidXR0b25cblx0XHRcdFx0XHRcdFx0XHRcdGRhdGEtaWQ9e2l9XG5cdFx0XHRcdFx0XHRcdFx0XHRzdHlsZT17T2JqZWN0LmFzc2lnbih7fSwgU3R5bGUudGhyZWFkLCB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdGJhY2tncm91bmRDb2xvcjogKHN0YXRlLnRocmVhZHMuaW5kZXhPZihpKSAhPT0gLTEpID8gdC5jb2xvciA6ICcjNzc3J1xuXHRcdFx0XHRcdFx0XHRcdFx0fSl9XG5cdFx0XHRcdFx0XHRcdFx0XHRvbkNsaWNrPXt0aGlzLmZpbHRlcn1cblx0XHRcdFx0XHRcdFx0XHQ+XG5cdFx0XHRcdFx0XHRcdFx0XHR7dC5uYW1lfVxuXHRcdFx0XHRcdFx0XHRcdDwvYnV0dG9uPlxuXHRcdFx0XHRcdFx0XHRdKTtcblx0XHRcdFx0XHRcdH0gZWxzZSByZXR1cm4gdGhyZWFkcztcblx0XHRcdFx0XHR9LCBbXSl9XG5cdFx0XHRcdDwvZGl2PlxuXHRcdFx0XHQ8ZGl2XG5cdFx0XHRcdFx0ZGF0YS1pcz1cInNsaWNlc1wiXG5cdFx0XHRcdFx0c3R5bGU9e1N0eWxlLnNsaWNlU2VjdGlvbn1cblx0XHRcdFx0PlxuXHRcdFx0XHRcdHtzdGF0ZS5maWx0ZXJlZC5tYXAoKGl0ZW0sIGkpID0+IChcblx0XHRcdFx0XHRcdDxkaXZcblx0XHRcdFx0XHRcdFx0c3R5bGU9e09iamVjdC5hc3NpZ24oe29wYWNpdHk6IChzdGF0ZS5kZXNlbGVjdGVkLmluZGV4T2YoaSkgIT09IC0xKSA/ICcwLjUnIDogJzEnIH0sIFN0eWxlLnNjZW5lLCBpdGVtLnN0eWxlKX1cblx0XHRcdFx0XHRcdFx0b25DbGljaz17KCkgPT4gc2VsZWN0KGkpfVxuXHRcdFx0XHRcdFx0PlxuXHRcdFx0XHRcdFx0XHR7aXRlbS52YWx1ZXMubWFwKCh2YWx1ZSkgPT4gKFxuXHRcdFx0XHRcdFx0XHRcdDxzcGFuIHN0eWxlPXtTdHlsZS5zcGFufT57dmFsdWV9PC9zcGFuPlxuXHRcdFx0XHRcdFx0XHQpKX1cblx0XHRcdFx0XHRcdDwvZGl2PlxuXHRcdFx0XHRcdCkpfVxuXHRcdFx0XHQ8L2Rpdj5cblx0XHRcdFx0PGRpdiBzdHlsZT17U3R5bGUucm93fT5cblx0XHRcdFx0XHQ8YnV0dG9uXG5cdFx0XHRcdFx0XHRzdHlsZT17U3R5bGUuaXRlbX1cblx0XHRcdFx0XHRcdG9uQ2xpY2s9eygpID0+IHtcblx0XHRcdFx0XHRcdFx0cHJvcHMuY2FuY2VsKCk7XG5cdFx0XHRcdFx0XHR9fVxuXHRcdFx0XHRcdD5cblx0XHRcdFx0XHRcdGNhbmNlbFxuXHRcdFx0XHRcdDwvYnV0dG9uPlxuXHRcdFx0XHRcdDxidXR0b25cblx0XHRcdFx0XHRcdHN0eWxlPXtTdHlsZS5pdGVtfVxuXHRcdFx0XHRcdFx0b25DbGljaz17dGhpcy5wcmludH1cblx0XHRcdFx0XHQ+XG5cdFx0XHRcdFx0XHRwcmludFxuXHRcdFx0XHRcdDwvYnV0dG9uPlxuXHRcdFx0XHQ8L2Rpdj5cblx0XHRcdDwvTW9kYWxWaWV3PlxuXHRcdCk7XG5cdH1cblxuXHRmaWx0ZXIoZXZlbnQpIHtcblx0XHR2YXIgZmlsdGVyZWQsXG5cdFx0XHRpZCA9IE51bWJlcihldmVudC50YXJnZXQuZGF0YXNldC5pZCksXG5cdFx0XHRpID0gdGhpcy5zdGF0ZS50aHJlYWRzLmluZGV4T2YoaWQpO1xuXG5cdFx0aWYgKGkgPT09IC0xKSB0aGlzLnN0YXRlLnRocmVhZHMucHVzaChpZCk7XG5cdFx0ZWxzZSB0aGlzLnN0YXRlLnRocmVhZHMuc3BsaWNlKGksIDEpO1xuXG5cdFx0ZmlsdGVyZWQgPSB0aGlzLnByb3BzLnNsaWNlcy5yZWR1Y2UoKHNsaWNlcywgc2xpY2UsIGkpID0+IHtcblx0XHRcdHZhciBzY2VuZXMgPSB0aGlzLnByb3BzLmhlYWRlcnNbaV0gP1xuXHRcdFx0XHRbXG5cdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0dmFsdWVzOiBbdGhpcy5wcm9wcy5oZWFkZXJzW2ldXSxcblx0XHRcdFx0XHRcdHN0eWxlOiB7XG5cdFx0XHRcdFx0XHRcdGNvbG9yOiAnIzAwMCcsXG5cdFx0XHRcdFx0XHRcdGJhY2tncm91bmRDb2xvcjogJyNmZmYnXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRdXG5cdFx0XHQ6XG5cdFx0XHRcdFtdO1xuXG5cdFx0XHRzY2VuZXMgPSBzY2VuZXMuY29uY2F0KFxuXHRcdFx0XHRzbGljZS5zY2VuZXMucmVkdWNlKChzY2VuZXMsIHNjZW5lLCBpKSA9PiB7XG5cdFx0XHRcdFx0aWYgKHNjZW5lICYmICh0aGlzLnN0YXRlLnRocmVhZHMuaW5kZXhPZihpKSAhPT0gLTEpICYmIHNjZW5lLndjICE9PSAwKSB7XG5cdFx0XHRcdFx0XHRzY2VuZXMucHVzaCh7XG5cdFx0XHRcdFx0XHRcdHZhbHVlczogW3NjZW5lLmhlYWQsIHNjZW5lLndjICsgJyB3b3JkcyddLFxuXHRcdFx0XHRcdFx0XHRib2R5OiBzY2VuZS5ib2R5LFxuXHRcdFx0XHRcdFx0XHRzdHlsZToge1xuXHRcdFx0XHRcdFx0XHRcdGNvbG9yOiAnI2ZmZicsXG5cdFx0XHRcdFx0XHRcdFx0YmFja2dyb3VuZENvbG9yOiB0aGlzLnByb3BzLnRocmVhZHNbaV0uY29sb3Jcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHJldHVybiBzY2VuZXM7XG5cdFx0XHRcdH0sIFtdKVxuXHRcdFx0KTtcblxuXHRcdFx0aWYgKHNjZW5lcy5sZW5ndGgpIHJldHVybiBzbGljZXMuY29uY2F0KHNjZW5lcyk7XG5cdFx0XHRlbHNlIHJldHVybiBzbGljZXM7XG5cblx0XHR9LCBbXSk7XG5cblx0XHR0aGlzLnNldFN0YXRlKHsgZmlsdGVyZWQ6IGZpbHRlcmVkLCBkZXNlbGVjdGVkOiBbXSB9KTtcblx0fVxuXG5cdHNlbGVjdChpbmRleCwgaSkge1xuXHRcdGkgPSB0aGlzLnN0YXRlLmRlc2VsZWN0ZWQuaW5kZXhPZihpbmRleCk7XG5cblx0XHRpZiAoaSA9PT0gLTEpIHRoaXMuc3RhdGUuZGVzZWxlY3RlZC5wdXNoKGluZGV4KTtcblx0XHRlbHNlIHRoaXMuc3RhdGUuZGVzZWxlY3RlZC5zcGxpY2UoaSwgMSk7XG5cblx0XHR0aGlzLmZvcmNlVXBkYXRlKCk7XG5cdH1cblxuXHRwcmludCgpIHtcblx0XHR0aGlzLnByb3BzLnByaW50KHRoaXMuc3RhdGUuZmlsdGVyZWQucmVkdWNlKChsaXN0LCBpdGVtLCBpKSA9PiB7XG5cdFx0XHRpZiAodGhpcy5zdGF0ZS5kZXNlbGVjdGVkLmluZGV4T2YoaSkgPT09IC0xKSBsaXN0LnB1c2goaXRlbSk7XG5cdFx0XHRyZXR1cm4gbGlzdDtcblx0XHR9LCBbXSkpXG5cdFx0dGhpcy5wcm9wcy5jYW5jZWwoKTtcblx0fVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFByaW50TW9kYWw7IiwiY29uc3Rcblx0UmVhY3QgPSByZXF1aXJlKCdwcmVhY3QnKSxcblxuXHRNb2RhbFZpZXcgPSByZXF1aXJlKCcuL01vZGFsVmlldy5qcycpLFxuXG5cdFN0eWxlID0ge1xuXHRcdHNjZW5lOiB7XG5cdFx0XHRkaXNwbGF5OiAnZmxleCcsXG5cdFx0XHRqdXN0aWZ5Q29udGVudDogJ3NwYWNlLWFyb3VuZCcsXG5cdFx0XHRhbGlnbkl0ZW1zOiAnY2VudGVyJyxcblx0XHRcdHBhZGRpbmc6ICcwLjI1cmVtJyxcblx0XHRcdG1hcmdpblRvcDogJzAuNXJlbSdcblx0XHR9LFxuXHRcdHRpdGxlOiB7XG5cdFx0XHRoZWlnaHQ6ICcycmVtJyxcblx0XHRcdG1heFdpZHRoOiAnOTV2dycsXG5cdFx0XHRwYWRkaW5nOiAnMCAwLjc1cmVtJyxcblx0XHRcdGJvcmRlcjogJ25vbmUnLFxuXHRcdFx0Ym9yZGVyQm90dG9tOiAndGhpbiBzb2xpZCAjZmZmJyxcblx0XHRcdG91dGxpbmU6ICdub25lJyxcblx0XHRcdGJhY2tncm91bmRDb2xvcjogJyMwMDAnLFxuXHRcdFx0Zm9udFNpemU6ICcxLjJyZW0nLFxuXHRcdFx0Y29sb3I6ICcjZmZmJ1xuXHRcdH0sXG5cdFx0YXV0aG9yOiB7XG5cdFx0XHRoZWlnaHQ6ICcycmVtJyxcblx0XHRcdG1heFdpZHRoOiAnOTV2dycsXG5cdFx0XHRwYWRkaW5nOiAnMCAwLjc1cmVtJyxcblx0XHRcdGJvcmRlcjogJ25vbmUnLFxuXHRcdFx0Ym9yZGVyQm90dG9tOiAndGhpbiBzb2xpZCAjZmZmJyxcblx0XHRcdG91dGxpbmU6ICdub25lJyxcblx0XHRcdGJhY2tncm91bmRDb2xvcjogJyMwMDAnLFxuXHRcdFx0Zm9udFNpemU6ICcxcmVtJyxcblx0XHRcdGNvbG9yOiAnI2ZmZidcblx0XHR9LFxuXHRcdGl0ZW06IHtcblx0XHRcdGhlaWdodDogJzIuNXJlbScsXG5cdFx0XHRwYWRkaW5nOiAnMCAwLjc1cmVtJyxcblxuXHRcdFx0Ym9yZGVyOiAnbm9uZScsXG5cdFx0XHRvdXRsaW5lOiAnbm9uZScsXG5cdFx0XHRiYWNrZ3JvdW5kQ29sb3I6ICcjMDAwMDAwJyxcblxuXHRcdFx0Y29sb3I6ICcjZmZmJyxcblx0XHRcdGZvbnRTaXplOiAnMS4ycmVtJyxcblxuXHRcdFx0Y3Vyc29yOiAncG9pbnRlcidcblx0XHR9LFxuXHRcdHJvdzoge1xuXHRcdFx0ZGlzcGxheTogJ2ZsZXgnLFxuXHRcdFx0anVzdGlmeUNvbnRlbnQ6ICdzcGFjZS1hcm91bmQnLFxuXHRcdFx0YWxpZ25JdGVtczogJ2NlbnRlcicsXG5cdFx0XHRtYXJnaW5Ub3A6ICcxcmVtJ1xuXHRcdH1cblxuXHR9O1xuXG5mdW5jdGlvbiBNZWFzdXJlVGV4dCh0ZXh0KSB7XG5cdHZhciB3aWRlID0gdGV4dC5tYXRjaCgvW1dNXS9nKSxcblx0XHR0aGluID0gdGV4dC5tYXRjaCgvW0l0cmxpaiEuIF0vZyk7XG5cblx0XHR3aWRlID0gd2lkZSA/IHdpZGUubGVuZ3RoIDogMDtcblx0XHR0aGluID0gdGhpbiA/IHRoaW4ubGVuZ3RoIDogMDtcblxuXHRyZXR1cm4gKHRleHQubGVuZ3RoICsgd2lkZSAqIDEuMiAtIHRoaW4gKiAwLjMpO1xufVxuXG5jbGFzcyBQcm9qZWN0TW9kYWwgZXh0ZW5kcyBSZWFjdC5Db21wb25lbnQge1xuXHRjb25zdHJ1Y3Rvcihwcm9wcywgY29udGV4dCkgeyBcblx0XHRzdXBlcihwcm9wcywgY29udGV4dCk7XG5cdH1cblxuXHRyZW5kZXIocHJvcHMsIHN0YXRlKSB7XG5cdFx0cmV0dXJuIChcblx0XHRcdDxNb2RhbFZpZXdcblx0XHRcdFx0ZGlzbWlzcz17cHJvcHMub25Eb25lfVxuXHRcdFx0PlxuXHRcdFx0XHQ8ZGl2IHN0eWxlPXtTdHlsZS5yb3d9PlxuXHRcdFx0XHRcdDxpbnB1dFxuXHRcdFx0XHRcdFx0c3R5bGU9e1N0eWxlLnRpdGxlfVxuXHRcdFx0XHRcdFx0dHlwZT1cInRleHRcIlxuXHRcdFx0XHRcdFx0cGxhY2Vob2xkZXI9XCJQcm9qZWN0IFRpdGxlXCJcblx0XHRcdFx0XHRcdG1heExlbmd0aD17NDB9XG5cdFx0XHRcdFx0XHRzaXplPXtNYXRoLm1heChNZWFzdXJlVGV4dChwcm9wcy50aXRsZS5sZW5ndGggPyBwcm9wcy50aXRsZSA6IChwcm9wcy5wbGFjZWhvbGRlciB8fCAnJykpLCAyMCl9XG5cdFx0XHRcdFx0XHRvbklucHV0PXtwcm9wcy5mdW5jdGlvbnMub25UaXRsZUNoYW5nZX1cblx0XHRcdFx0XHRcdHZhbHVlPXtwcm9wcy50aXRsZX1cblx0XHRcdFx0XHQvPlxuXHRcdFx0XHQ8L2Rpdj5cblx0XHRcdFx0PGRpdiBzdHlsZT17U3R5bGUucm93fT5cblx0XHRcdFx0XHQ8aW5wdXRcblx0XHRcdFx0XHRcdHN0eWxlPXtTdHlsZS5hdXRob3J9XG5cdFx0XHRcdFx0XHR0eXBlPVwidGV4dFwiXG5cdFx0XHRcdFx0XHRwbGFjZWhvbGRlcj1cIkF1dGhvclwiXG5cdFx0XHRcdFx0XHRtYXhMZW5ndGg9ezQwfVxuXHRcdFx0XHRcdFx0c2l6ZT17TWF0aC5tYXgoTWVhc3VyZVRleHQocHJvcHMuYXV0aG9yLmxlbmd0aCA/IHByb3BzLmF1dGhvciA6IChwcm9wcy5wbGFjZWhvbGRlciB8fCAnJykpLCAyMCl9XG5cdFx0XHRcdFx0XHRvbklucHV0PXtwcm9wcy5mdW5jdGlvbnMub25BdXRob3JDaGFuZ2V9XG5cdFx0XHRcdFx0XHR2YWx1ZT17cHJvcHMuYXV0aG9yfVxuXHRcdFx0XHRcdC8+XG5cdFx0XHRcdDwvZGl2PlxuXG5cdFx0XHRcdDxkaXYgc3R5bGU9e1N0eWxlLnJvd30+XG5cdFx0XHRcdFx0PGJ1dHRvblxuXHRcdFx0XHRcdFx0c3R5bGU9e1N0eWxlLml0ZW19XG5cdFx0XHRcdFx0XHRvbkNsaWNrPXsoKSA9PiB7XG5cdFx0XHRcdFx0XHRcdHByb3BzLm9uRG9uZSgpO1xuXHRcdFx0XHRcdFx0XHRwcm9wcy5mdW5jdGlvbnMuaW1wb3J0KClcblx0XHRcdFx0XHRcdH19XG5cdFx0XHRcdFx0PlxuXHRcdFx0XHRcdFx0aW1wb3J0XG5cdFx0XHRcdFx0PC9idXR0b24+XG5cdFx0XHRcdFx0PGJ1dHRvblxuXHRcdFx0XHRcdFx0c3R5bGU9e1N0eWxlLml0ZW19XG5cdFx0XHRcdFx0XHRvbkNsaWNrPXsoKSA9PiB7XG5cdFx0XHRcdFx0XHRcdHByb3BzLm9uRG9uZSgpO1xuXHRcdFx0XHRcdFx0XHRwcm9wcy5mdW5jdGlvbnMuZXhwb3J0KClcblx0XHRcdFx0XHRcdH19XG5cdFx0XHRcdFx0PlxuXHRcdFx0XHRcdFx0ZXhwb3J0XG5cdFx0XHRcdFx0PC9idXR0b24+XG5cdFx0XHRcdFx0PGJ1dHRvblxuXHRcdFx0XHRcdFx0c3R5bGU9e1N0eWxlLml0ZW19XG5cdFx0XHRcdFx0XHRvbkNsaWNrPXsoKSA9PiB7XG5cdFx0XHRcdFx0XHRcdHByb3BzLm9uRG9uZSgpO1xuXHRcdFx0XHRcdFx0XHRwcm9wcy5mdW5jdGlvbnMucHJpbnQoKVxuXHRcdFx0XHRcdFx0fX1cblx0XHRcdFx0XHQ+XG5cdFx0XHRcdFx0XHRwcmludFxuXHRcdFx0XHRcdDwvYnV0dG9uPlxuXHRcdFx0XHQ8L2Rpdj5cblx0XHRcdFx0PGRpdiBzdHlsZT17U3R5bGUucm93fT5cblx0XHRcdFx0XHQ8YnV0dG9uXG5cdFx0XHRcdFx0XHRzdHlsZT17T2JqZWN0LmFzc2lnbih7fSwgU3R5bGUuaXRlbSwgeyBjb2xvcjogJyNmMDAnLCB0cmFuc2l0aW9uOiAnY29sb3IgMXMnIH0pfVxuXHRcdFx0XHRcdFx0b25DbGljaz17KGUpID0+IHtcblx0XHRcdFx0XHRcdFx0ZS50YXJnZXQuc3R5bGUuY29sb3IgPSAnI2YwMCc7XG5cdFx0XHRcdFx0XHRcdGlmICh0aGlzLnRpbWVyKSB7XG5cdFx0XHRcdFx0XHRcdFx0Y2xlYXJUaW1lb3V0KHRoaXMudGltZXIpO1xuXHRcdFx0XHRcdFx0XHRcdHRoaXMudGltZXIgPSB1bmRlZmluZWQ7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH19XG5cdFx0XHRcdFx0XHRvbk1vdXNlRG93bj17KGUpID0+IHtcblx0XHRcdFx0XHRcdFx0ZS50YXJnZXQuc3R5bGUuY29sb3IgPSBcIiM3NzdcIjtcblx0XHRcdFx0XHRcdFx0dGhpcy50aW1lciA9IHNldFRpbWVvdXQocHJvcHMuZnVuY3Rpb25zLmRlbGV0ZSwgMTAwMCwgZSk7XG5cdFx0XHRcdFx0XHR9fVxuXHRcdFx0XHRcdD5kZWxldGU8L2J1dHRvbj5cblx0XHRcdFx0PC9kaXY+XG5cblx0XHRcdDwvTW9kYWxWaWV3PlxuXHRcdCk7XG5cdH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBQcm9qZWN0TW9kYWw7IiwiY29uc3Rcblx0UmVhY3QgPSByZXF1aXJlKCdwcmVhY3QnKSxcblxuXHREZWxldGVCdXR0b24gPSByZXF1aXJlKCcuL0RlbGV0ZUJ1dHRvbi5qcycpLFxuXG5cdExvY2F0aW9uTGFiZWwgPSByZXF1aXJlKCcuL0xvY2F0aW9uTGFiZWwuanMnKSxcblxuXHRCaW5kID0gcmVxdWlyZSgnLi4vYmluZC5qcycpLFxuXHRFeHBhbmRpbmdUZXh0YXJlYSA9IHJlcXVpcmUoJy4vRXhwYW5kaW5nVGV4dGFyZWEuanMnKSxcblxuXHRTdHlsZSA9IHtcblx0XHRib3g6IHtcblx0XHRcdG1heFdpZHRoOiAnNTByZW0nLFxuXHRcdFx0YmFja2dyb3VuZENvbG9yOiAnI2ZmZicsXG5cdFx0XHRjb2xvcjogJyMyMjInLFxuXHRcdFx0ZGlzcGxheTogJ2ZsZXgnLFxuXHRcdFx0ZmxleERpcmVjdGlvbjogJ2NvbHVtbicsXG5cdFx0XHRqdXN0aWZ5Q29udGVudDogJ3NwYWNlLWFyb3VuZCcsXG5cdFx0XHRhbGlnbkl0ZW1zOiAnc3RyZXRjaCcsXG5cdFx0XHR3aWR0aDogJzE0cmVtJyxcblx0XHRcdHBvc2l0aW9uOiAncmVsYXRpdmUnLFxuXHRcdFx0dG9wOiAnMC4ycmVtJyxcblx0XHRcdG1heEhlaWdodDogJzEzcmVtJ1xuXHRcdH0sXG5cblx0XHRzY2VuZUhlYWQ6IHtcblx0XHRcdGZvbnRTaXplOiAnMS4xcmVtJyxcblx0XHRcdGhlaWdodDogJzEuM3JlbScsXG5cdFx0XHRtYXJnaW46ICcwLjI1cmVtIDAuNzVyZW0nXG5cdFx0fSxcblxuXHRcdHN0YXRzOiB7XG5cdFx0XHRjb2xvcjogJyNmZmYnLFxuXHRcdFx0ZGlzcGxheTogJ2ZsZXgnLFxuXHRcdFx0anVzdGlmeUNvbnRlbnQ6ICdzcGFjZS1hcm91bmQnLFxuXHRcdFx0YWxpZ25JdGVtczogJ2NlbnRlcicsXG5cdFx0XHRmb250U2l6ZTogJzAuOXJlbScsXG5cdFx0XHRoZWlnaHQ6ICcycmVtJ1xuXHRcdH0sXG5cblx0XHR3b3JkY291bnQ6IHtcblx0XHRcdGZvbnRTaXplOiAnMC45cmVtJyxcblx0XHRcdHBhZGRpbmc6ICcwLjVyZW0nXG5cdFx0fSxcblxuXHRcdHRleHRhcmVhOiB7XG5cdFx0XHRmb250U2l6ZTogJzEuMXJlbScsXG5cdFx0XHRtYXJnaW46ICcwLjc1cmVtJyxcblx0XHRcdG1heEhlaWdodDogJzlyZW0nXG5cdFx0fSxcblxuXHRcdGJ1dHRvbjoge1xuXHRcdFx0Zm9udFNpemU6ICcwLjlyZW0nLFxuXHRcdFx0cGFkZGluZzogJzAuNXJlbScsXG5cdFx0XHRjb2xvcjogJyNmZmYnLFxuXHRcdFx0YmFja2dyb3VuZENvbG9yOiAncmdiYSgwLDAsMCwwKScsXG5cdFx0XHRib3JkZXI6ICdub25lJyxcblx0XHRcdG91dGxpbmU6ICdub25lJyxcblx0XHRcdGN1cnNvcjogJ3BvaW50ZXInXG5cdFx0fSxcblx0XHRjb2xvckJ1dHRvbjoge1xuXHRcdFx0d2lkdGg6ICcxcmVtJyxcblx0XHRcdGhlaWdodDogJzFyZW0nLFxuXHRcdFx0Ym9yZGVyOiAndGhpbiBzb2xpZCAjZmZmJyxcblx0XHRcdGJvcmRlclJhZGl1czogJzFyZW0nLFxuXHRcdFx0Y29sb3I6ICcjZmZmJyxcblx0XHRcdGJhY2tncm91bmRDb2xvcjogJ3JnYmEoMCwwLDAsMCknLFxuXHRcdFx0b3V0bGluZTogJ25vbmUnLFxuXHRcdFx0Y3Vyc29yOiAncG9pbnRlcidcblx0XHR9LFxuXHRcdG1vdmVCdXR0b246IHtcblx0XHRcdHpJbmRleDogMjUsXG5cdFx0XHRmb250U2l6ZTogJzAuOXJlbScsXG5cdFx0XHRwb3NpdGlvbjogJ2Fic29sdXRlJyxcblx0XHRcdHBhZGRpbmc6ICcwLjVyZW0nLFxuXHRcdFx0Ym90dG9tOiAnLTIuNXJlbScsXG5cdFx0XHRsZWZ0OiAnM3JlbScsXG5cdFx0XHRib3JkZXI6ICdub25lJyxcblx0XHRcdGNvbG9yOiAnI2ZmZicsXG5cdFx0XHRiYWNrZ3JvdW5kQ29sb3I6ICcjMDAwJyxcblx0XHRcdG91dGxpbmU6ICdub25lJyxcblx0XHRcdGN1cnNvcjogJ3BvaW50ZXInXG5cdFx0fSxcblx0XHRkZWxldGVCdXR0b246IHtcblx0XHRcdHpJbmRleDogMjUsXG5cdFx0XHRmb250U2l6ZTogJzAuOXJlbScsXG5cdFx0XHRwb3NpdGlvbjogJ2Fic29sdXRlJyxcblx0XHRcdGJvdHRvbTogJy0xLjRyZW0nLFxuXHRcdFx0cmlnaHQ6ICctMS40cmVtJyxcblx0XHRcdGN1cnNvcjogJ3BvaW50ZXInXG5cdFx0fVxuXHR9O1xuXG5cbmNsYXNzIFNjZW5lRWRpdG9yIGV4dGVuZHMgUmVhY3QuQ29tcG9uZW50IHtcblx0Y29uc3RydWN0b3IocHJvcHMsIGNvbnRleHQpIHtcblx0XHRzdXBlcihwcm9wcywgY29udGV4dCk7XG5cblx0XHRCaW5kKHRoaXMpO1xuXHR9XG5cblx0cmVuZGVyKHByb3BzLCBzdGF0ZSkge1xuXHRcdHZhciBhcmd5bGUgPSBPYmplY3QuYXNzaWduKHt9LCBTdHlsZS5ib3gsIHtcblx0XHRcdGJvcmRlcjogKHByb3BzLnNlbGVjdGVkID8gKCcwLjJyZW0gc29saWQgJyArIHByb3BzLnRocmVhZC5jb2xvcikgOiAnMCBzb2xpZCByZ2JhKDAsMCwwLDApJyksXG5cdFx0XHRtYXJnaW46IHByb3BzLnNlbGVjdGVkID8gJzAnIDogJzAuMnJlbSdcblx0XHR9KTtcblxuXHRcdHJldHVybiAoXG5cdFx0XHQ8ZGl2XG5cdFx0XHRcdHN0eWxlPXthcmd5bGV9XG5cdFx0XHRcdG9uQ2xpY2s9e3RoaXMub25DbGlja31cblx0XHRcdFx0ZHJhZ2dhYmxlXG5cdFx0XHRcdG9uRHJhZ1N0YXJ0PXsoKSA9PiBwcm9wcy5vbkRyYWcoe3NsaWNlSW5kZXg6IHByb3BzLnNsaWNlSW5kZXgsIHNjZW5lSW5kZXg6IHByb3BzLnNjZW5lSW5kZXh9KX1cblx0XHRcdD5cblx0XHRcdFx0PEV4cGFuZGluZ1RleHRhcmVhXG5cdFx0XHRcdFx0c3R5bGU9e1N0eWxlLnRleHRhcmVhfVxuXHRcdFx0XHRcdG1heExlbmd0aD17MjUwfSBcblx0XHRcdFx0XHRpbnB1dD17dGhpcy5vbklucHV0fSBcblx0XHRcdFx0XHRiYXNlSGVpZ2h0PVwiMS4zcmVtXCJcblx0XHRcdFx0XHRwbGFjZWhvbGRlcj1cIlRpdGxlL1N1bW1hcnlcIlxuXHRcdFx0XHRcdHZhbHVlPXtwcm9wcy5zY2VuZS5oZWFkfVxuXHRcdFx0XHRcdGZvY3VzPXt0aGlzLm9uRm9jdXN9XG5cdFx0XHRcdFx0Y2hhbmdlPXt0aGlzLm9uQ2hhbmdlfVxuXHRcdFx0XHRcdHJlZj17ZWwgPT4gdGhpcy5lbCA9IGVsfVxuXHRcdFx0XHQvPlxuXHRcdFx0XHRcdDxzcGFuIFxuXHRcdFx0XHRcdFx0c3R5bGU9e09iamVjdC5hc3NpZ24oe30sIFN0eWxlLnN0YXRzLCB7YmFja2dyb3VuZENvbG9yOiBwcm9wcy50aHJlYWQuY29sb3J9KX1cblx0XHRcdFx0XHQ+XG5cdFx0XHRcdFx0XHR7IXByb3BzLnNlbGVjdGVkID8gW1xuXHRcdFx0XHRcdFx0XHQ8YnV0dG9uIFxuXHRcdFx0XHRcdFx0XHRcdG9uY2xpY2s9eygpID0+IHByb3BzLm9uRWRpdCh7c2xpY2VJbmRleDogcHJvcHMuc2xpY2VJbmRleCwgc2NlbmVJbmRleDogcHJvcHMuc2NlbmVJbmRleH0pfSBcblx0XHRcdFx0XHRcdFx0XHRzdHlsZT17U3R5bGUuYnV0dG9ufVxuXHRcdFx0XHRcdFx0XHQ+ZWRpdDwvYnV0dG9uPixcblx0XHRcdFx0XHRcdFx0PHNwYW4gc3R5bGU9e1N0eWxlLndvcmRjb3VudH0+e3Byb3BzLnNjZW5lLndjfSB3b3Jkczwvc3Bhbj5cblx0XHRcdFx0XHRcdF0gOiBbXG5cdFx0XHRcdFx0XHRcdDxMb2NhdGlvbkxhYmVsXG5cdFx0XHRcdFx0XHRcdFx0dmFsdWU9e3Byb3BzLnNjZW5lLmxvY2F0aW9ufVxuXHRcdFx0XHRcdFx0XHRcdG9uQ2hhbmdlPXsoZSkgPT4gdGhpcy5jb250ZXh0LmRvKCdNT0RJRllfTk9URV9MT0NBVElPTicsIHtcblx0XHRcdFx0XHRcdFx0XHRcdHNsaWNlSW5kZXg6IHByb3BzLnNsaWNlSW5kZXgsXG5cdFx0XHRcdFx0XHRcdFx0XHRzY2VuZUluZGV4OiBwcm9wcy5zY2VuZUluZGV4LFxuXHRcdFx0XHRcdFx0XHRcdFx0bmV3TG9jYXRpb246IGUudGFyZ2V0LnZhbHVlXG5cdFx0XHRcdFx0XHRcdFx0fSl9XG5cdFx0XHRcdFx0XHRcdC8+LFxuXHRcdFx0XHRcdFx0XHQ8RGVsZXRlQnV0dG9uXG5cdFx0XHRcdFx0XHRcdFx0c3R5bGU9e1N0eWxlLmRlbGV0ZUJ1dHRvbn1cblx0XHRcdFx0XHRcdFx0XHRvbkhvbGQ9eygpID0+IHRoaXMuY29udGV4dC5kbygnREVMRVRFX05PVEUnLCB7XG5cdFx0XHRcdFx0XHRcdFx0XHRzbGljZUluZGV4OiBwcm9wcy5zbGljZUluZGV4LFxuXHRcdFx0XHRcdFx0XHRcdFx0c2NlbmVJbmRleDogcHJvcHMuc2NlbmVJbmRleFxuXHRcdFx0XHRcdFx0XHRcdH0pfVxuXHRcdFx0XHRcdFx0XHQvPlx0XHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHRdfVxuXHRcdFx0XHQ8L3NwYW4+XG5cdFx0XHQ8L2Rpdj5cblx0XHQpXG5cdH1cblxuXHRvbkNyZWF0ZU5vdGUoZXZlbnQpIHtcblx0XHR0aGlzLm5ld05vdGUoZXZlbnQpO1xuXHR9XG5cblx0b25Gb2N1cyhldmVudCkge1xuXHRcdGlmICghdGhpcy5wcm9wcy5zZWxlY3RlZCkgdGhpcy5zZWxlY3QoKTtcblx0fVxuXG5cdG9uQ2hhbmdlKGV2ZW50KSB7XG5cdFx0dGhpcy5jb250ZXh0LmRvKCdNT0RJRllfTk9URV9IRUFEJywge1xuXHRcdFx0c2xpY2VJbmRleDogdGhpcy5wcm9wcy5zbGljZUluZGV4LFxuXHRcdFx0c2NlbmVJbmRleDogdGhpcy5wcm9wcy5zY2VuZUluZGV4LFxuXHRcdFx0bmV3SGVhZDogZXZlbnQudGFyZ2V0LnZhbHVlXG5cdFx0fSk7XG5cdH1cblxuXHRvbkNsaWNrKGV2ZW50KSB7XG5cdFx0ZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG5cdFx0aWYgKCF0aGlzLnByb3BzLnNlbGVjdGVkKSB7XG5cdFx0XHR0aGlzLnNlbGVjdCgpO1xuXHRcdFx0dGhpcy5lbC5iYXNlLmZvY3VzKCk7XG5cdFx0fVxuXHR9XG5cblx0c2VsZWN0KCkge1xuXHRcdHRoaXMucHJvcHMub25TZWxlY3Qoe1xuXHRcdFx0c2xpY2VJbmRleDogdGhpcy5wcm9wcy5zbGljZUluZGV4LFxuXHRcdFx0c2NlbmVJbmRleDogdGhpcy5wcm9wcy5zY2VuZUluZGV4XG5cdFx0fSk7XG5cdH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTY2VuZUVkaXRvcjsiLCJjb25zdFxuXHRSZWFjdCA9IHJlcXVpcmUoJ3ByZWFjdCcpLFxuXG5cdEV4cGFuZGluZ1RleHRhcmVhID0gcmVxdWlyZSgnLi9FeHBhbmRpbmdUZXh0YXJlYS5qcycpLFxuXHRBcHBNZW51ID0gcmVxdWlyZSgnLi9BcHBNZW51LmpzJyksXG5cdFRocmVhZExhYmVsID0gcmVxdWlyZSgnLi9UaHJlYWRMYWJlbC5qcycpLFxuXG5cdEJpbmQgPSByZXF1aXJlKCcuLi9iaW5kLmpzJyksXG5cblx0U3R5bGUgPSB7XG5cdFx0Ym94OiB7XG5cdFx0XHR6SW5kZXg6ICcwJyxcblxuXHRcdFx0bWF4V2lkdGg6ICc1MHJlbScsXG5cblx0XHRcdGJhY2tncm91bmRDb2xvcjogJyNmZmYnLFxuXHRcdFx0Y29sb3I6ICcjMjIyJyxcblxuXHRcdFx0bWFyZ2luTGVmdDogJ2F1dG8nLFxuXHRcdFx0bWFyZ2luUmlnaHQ6ICdhdXRvJyxcblx0XHRcdHBhZGRpbmdUb3A6ICcxLjVyZW0nLFxuXG5cdFx0XHRkaXNwbGF5OiAnZmxleCcsXG5cdFx0XHRmbGV4RGlyZWN0aW9uOiAnY29sdW1uJyxcblx0XHRcdGp1c3RpZnlDb250ZW50OiAnc3BhY2UtYXJvdW5kJyxcblx0XHRcdGFsaWduSXRlbXM6ICdzdHJldGNoJ1xuXHRcdH0sXG5cdFx0dG9wOiB7XG5cdFx0XHRwYWRkaW5nTGVmdDogJzEuNXJlbScsXG5cdFx0XHRwYWRkaW5nUmlnaHQ6ICcxLjVyZW0nLFxuXG5cdFx0XHRkaXNwbGF5OiAnZmxleCcsXG5cdFx0XHRmbGV4V3JhcDogJ3dyYXAnLFxuXHRcdFx0anVzdGlmeUNvbnRlbnQ6ICdmbGV4LXN0YXJ0J1xuXHRcdH0sXG5cdFx0dGhyZWFkOiB7XG5cdFx0XHRjb2xvcjogJyNmZmYnLFxuXHRcdFx0Zm9udFNpemU6ICcwLjc1cmVtJyxcblx0XHRcdGhlaWdodDogJzFyZW0nLFxuXG5cdFx0XHRib3JkZXJSYWRpdXM6ICcxcmVtJyxcblxuXHRcdFx0bWFyZ2luQm90dG9tOiAnMC41cmVtJyxcblx0XHRcdG1hcmdpblJpZ2h0OiAnMC41cmVtJyxcblx0XHRcdHBhZGRpbmc6ICcwLjI1cmVtIDAuNXJlbSAwLjJyZW0gMC41cmVtJ1xuXHRcdH0sXG5cdFx0c2NlbmVIZWFkOiB7XG5cdFx0XHRjb2xvcjogJyMyMjInLFxuXHRcdFx0Zm9udFNpemU6ICcxLjdyZW0nLFxuXG5cdFx0XHRtYXJnaW46ICcwLjVyZW0gMS41cmVtJ1xuXHRcdH0sXG5cdFx0c2NlbmVCb2R5OiB7XG5cdFx0XHRjb2xvcjogJyMyMjInLFxuXHRcdFx0Zm9udFNpemU6ICcxLjFyZW0nLFxuXHRcdFx0bWFyZ2luOiAnMC41cmVtIDEuNXJlbSdcblx0XHR9LFxuXHRcdHN0YXRzOiB7XG5cdFx0XHRiYWNrZ3JvdW5kQ29sb3I6ICcjZmZmJyxcblx0XHRcdGNvbG9yOiAnIzU1NScsXG5cdFx0XHRmb250U2l6ZTogJzFyZW0nLFxuXG5cdFx0XHRtYXJnaW46ICcwJyxcblx0XHRcdHBhZGRpbmc6ICcwLjc1cmVtIDEuNXJlbSAwLjc1cmVtIDEuNXJlbScsXG5cblx0XHRcdGRpc3BsYXk6ICdmbGV4Jyxcblx0XHRcdGZsZXhEaXJlY3Rpb246ICdyb3cnLFxuXHRcdFx0anVzdGlmeUNvbnRlbnQ6ICdzcGFjZS1hcm91bmQnXG5cdFx0fSxcblx0XHR3Yzoge1xuXHRcdFx0dGV4dEFsaWduOiAncmlnaHQnLFxuXG5cdFx0XHRkaXNwbGF5OiAnaW5saW5lLWJsb2NrJyxcblx0XHRcdGZsb2F0OiAncmlnaHQnXG5cdFx0fSxcblx0XHRzdGF0U3RpY2t5OiB7XG5cdFx0XHRib3R0b206ICcwJyxcblx0XHRcdHBvc2l0aW9uOiAnc3RpY2t5J1xuXHRcdH0sXG5cdFx0c3RhdEZyZWU6IHtcblx0XHRcdGJvdHRvbTogJ2F1dG8nLFxuXHRcdFx0cG9zaXRpb246ICdpbmhlcml0J1xuXHRcdH0sXG5cdFx0ZG9uZUJ1dHRvbjoge1xuXHRcdFx0Zm9udFNpemU6ICcxcmVtJyxcblx0XHRcdGZvbnRXZWlnaHQ6ICdib2xkJyxcblx0XHRcdGJvcmRlcjogJ25vbmUnLFxuXHRcdFx0b3V0bGluZTogJ25vbmUnLFxuXHRcdFx0YmFja2dyb3VuZENvbG9yOiAncmdiYSgwLDAsMCwwKScsXG5cdFx0XHRjdXJzb3I6ICdwb2ludGVyJ1xuXHRcdH1cblx0fSxcblxuXHR0ZXN0V29yZHMgPSAvW1xcdyfigJldKyg/IVxcdyo+KS9pZ207IC8vIGNhcHR1cmUgd29yZHMgYW5kIGlnbm9yZSBodG1sIHRhZ3Mgb3Igc3BlY2lhbCBjaGFyc1xuXG5mdW5jdGlvbiBjb3VudCh0ZXh0KSB7XG5cdHZhciB3YyA9IDA7XG5cblx0dGVzdFdvcmRzLmxhc3RJbmRleCA9IDA7XG5cdHdoaWxlICh0ZXN0V29yZHMudGVzdCh0ZXh0KSkgd2MrKztcblx0cmV0dXJuIHdjO1xufVxuXG5jbGFzcyBTY2VuZVdyaXRlciBleHRlbmRzIFJlYWN0LkNvbXBvbmVudCB7XG5cdGNvbnN0cnVjdG9yKHByb3BzLCBjb250ZXh0KSB7XG5cdFx0c3VwZXIocHJvcHMsIGNvbnRleHQpO1xuXG5cdFx0dGhpcy5zdGF0ZSA9IHtcblx0XHRcdHRocmVhZFN0eWxlOiBPYmplY3QuYXNzaWduKHt9LCBTdHlsZS50aHJlYWQsIHsgYmFja2dyb3VuZENvbG9yOiBwcm9wcy50aHJlYWQuY29sb3IgfSksXG5cdFx0XHRoZWFkOiBwcm9wcy5zY2VuZS5oZWFkLFxuXHRcdFx0Ym9keTogcHJvcHMuc2NlbmUuYm9keSxcblx0XHRcdHdjOiBwcm9wcy5zY2VuZS53Yyxcblx0XHRcdHBhZ2VzOiAxLFxuXHRcdFx0cGFnZU9mOiAxLFxuXHRcdFx0c3RhdFN0eWxlOiBTdHlsZS5zdGF0U3RpY2t5XG5cdFx0fVxuXG5cdFx0QmluZCh0aGlzKTtcblx0fVxuXG5cdHJlbmRlcihwcm9wcywgc3RhdGUpIHtcblx0XHRyZXR1cm4gKFxuXHRcdFx0PGRpdlxuXHRcdFx0XHRyZWY9e3RoaXMubW91bnRlZH1cblx0XHRcdFx0c3R5bGU9e09iamVjdC5hc3NpZ24oe21hcmdpblRvcDogcHJvcHMubWVudU9mZnNldCA9PT0gJzByZW0nID8gJzFyZW0nIDogcHJvcHMubWVudU9mZnNldH0sIFN0eWxlLmJveCl9XG5cdFx0XHQ+XG5cdFx0XHRcdDxzcGFuIHN0eWxlPXtTdHlsZS50b3B9PlxuXHRcdFx0XHRcdDxUaHJlYWRMYWJlbFxuXHRcdFx0XHRcdFx0c3R5bGU9e3N0YXRlLnRocmVhZFN0eWxlfVxuXHRcdFx0XHRcdFx0dmFsdWU9e3Byb3BzLnRocmVhZC5uYW1lfVxuXHRcdFx0XHRcdFx0b25DaGFuZ2U9eyhlKSA9PiB0aGlzLmNvbnRleHQuZG8oJ01PRElGWV9USFJFQURfTkFNRScsIHtcblx0XHRcdFx0XHRcdFx0YXRJbmRleDogcHJvcHMuc2NlbmUudGhyZWFkLFxuXHRcdFx0XHRcdFx0XHRuZXdOYW1lOiBlLnRhcmdldC52YWx1ZVxuXHRcdFx0XHRcdFx0fSl9XG5cdFx0XHRcdFx0Lz5cblx0XHRcdFx0XHR7Lyo8c3BhbiBzdHlsZT17c3RhdGUudGhyZWFkU3R5bGV9PlxuXHRcdFx0XHRcdFx0eycrJ31cblx0XHRcdFx0XHQ8L3NwYW4+Ki99XG5cdFx0XHRcdDwvc3Bhbj5cblx0XHRcdFx0PEV4cGFuZGluZ1RleHRhcmVhXG5cdFx0XHRcdFx0c3R5bGU9e1N0eWxlLnNjZW5lSGVhZH1cblx0XHRcdFx0XHRtYXhMZW5ndGg9XCIyNTBcIlxuXHRcdFx0XHRcdGlucHV0PXsoZSkgPT4gdGhpcy5zZXRTdGF0ZSh7aGVhZDogZS50YXJnZXQudmFsdWV9KX1cblx0XHRcdFx0XHRjaGFuZ2U9eygpID0+IHRoaXMuY29udGV4dC5kbygnTU9ESUZZX05PVEVfSEVBRCcsIFxuXHRcdFx0XHRcdFx0T2JqZWN0LmFzc2lnbih7bmV3SGVhZDogdGhpcy5zdGF0ZS5oZWFkfSwgcHJvcHMuY29vcmRzKVxuXHRcdFx0XHRcdCl9XG5cdFx0XHRcdFx0dmFsdWU9e3N0YXRlLmhlYWR9XG5cdFx0XHRcdFx0YmFzZUhlaWdodD1cIjEuN2VtXCJcblx0XHRcdFx0XHRwbGFjZWhvbGRlcj1cIlRpdGxlL1N1bW1hcnlcIlxuXHRcdFx0XHQvPlxuXHRcdFx0XHQ8RXhwYW5kaW5nVGV4dGFyZWFcblx0XHRcdFx0XHRyZWY9e3RoaXMuYm9keU1vdW50ZWR9XG5cdFx0XHRcdFx0c3R5bGU9e1N0eWxlLnNjZW5lQm9keX1cblx0XHRcdFx0XHRpbnB1dD17dGhpcy5vbkJvZHl9XG5cdFx0XHRcdFx0Y2hhbmdlPXsoKSA9PiB0aGlzLmNvbnRleHQuZG8oJ01PRElGWV9OT1RFX0JPRFknLCBcblx0XHRcdFx0XHRcdE9iamVjdC5hc3NpZ24oe25ld0JvZHk6IHN0YXRlLmJvZHksIHdjOiBzdGF0ZS53Y30sIHByb3BzLmNvb3Jkcylcblx0XHRcdFx0XHQpfVxuXHRcdFx0XHRcdHZhbHVlPXtzdGF0ZS5ib2R5fVxuXHRcdFx0XHRcdGJhc2VIZWlnaHQ9XCIxLjFlbVwiXG5cdFx0XHRcdFx0cGxhY2Vob2xkZXI9XCJCb2R5XCJcblx0XHRcdFx0Lz5cblx0XHRcdFx0PHNwYW4gc3R5bGU9e09iamVjdC5hc3NpZ24oe30sIFN0eWxlLnN0YXRzLCBzdGF0ZS5zdGF0U3R5bGUpfT5cblx0XHRcdFx0XHQ8c3BhbiBzdHlsZT17U3R5bGUud2N9PlxuXHRcdFx0XHRcdFx0e3N0YXRlLndjICsgJyB3b3Jkcyd9XG5cdFx0XHRcdFx0PC9zcGFuPlxuXHRcdFx0XHRcdDxzcGFuPlxuXHRcdFx0XHRcdFx0e3N0YXRlLnBhZ2VPZiArICcvJyArIHN0YXRlLnBhZ2VzfVxuXHRcdFx0XHRcdDwvc3Bhbj5cblx0XHRcdFx0XHQ8YnV0dG9uXG5cdFx0XHRcdFx0XHRzdHlsZT17U3R5bGUuZG9uZUJ1dHRvbn1cblx0XHRcdFx0XHRcdG9uQ2xpY2s9e3Byb3BzLm9uRG9uZX1cblx0XHRcdFx0XHQ+ZG9uZTwvYnV0dG9uPlxuXHRcdFx0XHQ8L3NwYW4+XG5cdFx0XHQ8L2Rpdj5cblx0XHQpXG5cdH1cblxuXHRjb21wb25lbnREaWRNb3VudCgpIHtcblx0XHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignc2Nyb2xsJywgdGhpcy5vblNjcm9sbCk7XG5cdFx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIHRoaXMub25SZXNpemUpO1xuXG5cdFx0d2luZG93LnNjcm9sbFRvKDAsIDApO1xuXHR9XG5cblx0Y29tcG9uZW50V2lsbFVubW91bnQoKSB7XG5cdFx0d2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3Njcm9sbCcsIHRoaXMub25TY3JvbGwpO1xuXHRcdHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdyZXNpemUnLCB0aGlzLm9uUmVzaXplKTtcblx0fVxuXG5cdG9uQm9keShldmVudCkge1xuXHRcdHRoaXMuc2V0U3RhdGUoe1xuXHRcdFx0Ym9keTogZXZlbnQudGFyZ2V0LnZhbHVlLFxuXHRcdFx0d2M6IGNvdW50KGV2ZW50LnRhcmdldC52YWx1ZSksXG5cdFx0XHRwYWdlczogTWF0aC5yb3VuZCh0aGlzLnN0YXRlLndjIC8gMjc1KSB8fCAxXG5cdFx0fSk7XG5cdFx0dGhpcy5vblNjcm9sbCgpO1xuXHR9XG5cblx0bW91bnRlZChlbGVtZW50KSB7XG5cdFx0dGhpcy5lbCA9IGVsZW1lbnQ7XG5cdH1cblxuXHRib2R5TW91bnRlZChlbGVtZW50KSB7XG5cdFx0dGhpcy5ib2R5ID0gZWxlbWVudDtcblx0fVxuXG5cdG9uU2Nyb2xsKGV2ZW50KSB7XG5cdFx0dGhpcy5wYWdlQ291bnQoKTtcblx0XHR0aGlzLnN0aWNreVN0YXRzKCk7XG5cdH1cblxuXHRwYWdlQ291bnQoKSB7XG5cdFx0dmFyIHQ7XG5cdFx0aWYgKHRoaXMuYm9keS5jbGllbnRIZWlnaHQgPiB3aW5kb3cuaW5uZXJIZWlnaHQpIHtcblx0XHRcdHQgPSBNYXRoLmFicyh0aGlzLmJvZHkuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkudG9wKTtcblx0XHRcdHQgPSAodCAvIHRoaXMuYm9keS5jbGllbnRIZWlnaHQpICogKHRoaXMuc3RhdGUucGFnZXMgKyAxKTtcblx0XHRcdHQgPSBNYXRoLmNlaWwodCk7XG5cdFx0XHRpZiAodCA+IHRoaXMuc3RhdGUucGFnZXMpIHQgPSB0aGlzLnN0YXRlLnBhZ2VzO1xuXHRcdH0gZWxzZSB0ID0gMTtcblx0XHR0aGlzLnNldFN0YXRlKHsgcGFnZU9mOiB0IH0pO1xuXHR9XG5cblx0c3RpY2t5U3RhdHMoKSB7XG5cdFx0aWYgKHRoaXMuZWwuY2xpZW50SGVpZ2h0ID4gKHdpbmRvdy5pbm5lckhlaWdodCAtIDQwKSkge1xuXHRcdFx0dGhpcy5zZXRTdGF0ZSh7IHN0YXRTdHlsZTogU3R5bGUuc3RhdFN0aWNreSB9KVxuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzLnNldFN0YXRlKHsgc3RhdFN0eWxlOiBTdHlsZS5zdGF0RnJlZSB9KVxuXHRcdH1cblx0fVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNjZW5lV3JpdGVyOyIsImNvbnN0XG5cdFJlYWN0ID0gcmVxdWlyZSgncHJlYWN0JyksXG5cblx0RGVsZXRlQnV0dG9uID0gcmVxdWlyZSgnLi9EZWxldGVCdXR0b24uanMnKSxcblxuXHRCaW5kID0gcmVxdWlyZSgnLi4vYmluZC5qcycpLFxuXG5cdFN0eWxlID0ge1xuXHRcdHNsaWNlSGVhZGVyOiB7XG5cdFx0XHR6SW5kZXg6ICcxMScsXG5cdFx0XHRoZWlnaHQ6ICcxLjVyZW0nLFxuXHRcdFx0Y29sb3I6ICcjZmZmJyxcblx0XHRcdG1heFdpZHRoOiAnMTRyZW0nLFxuXHRcdFx0YmFja2dyb3VuZENvbG9yOiAnIzc3Nzc3NycsXG5cdFx0XHRvdXRsaW5lOiAnbm9uZScsXG5cdFx0XHRmb250U2l6ZTogJzAuOXJlbScsXG5cdFx0XHRtYXJnaW46ICcwIGF1dG8nLFxuXHRcdFx0Ym9yZGVyOiAnbm9uZScsXG5cdFx0XHR0ZXh0QWxpZ246ICdjZW50ZXInLFxuXHRcdFx0cGFkZGluZzogJzAuMjVyZW0nXG5cdFx0fSxcblx0XHRzbGljZToge1xuXHRcdFx0cG9zaXRpb246ICdyZWxhdGl2ZScsXG5cdFx0XHRkaXNwbGF5OiAnaW5saW5lLWZsZXgnLFxuXHRcdFx0anVzdGlmeUNvbnRlbnQ6ICdjZW50ZXInLFxuXHRcdFx0YWxpZ25JdGVtczogJ2NlbnRlcicsXG5cdFx0XHR3aWR0aDogJzE0cmVtJyxcblx0XHRcdGhlaWdodDogJzEwMCUnXG5cdFx0fSxcblx0XHRkZWxldGVCdXR0b246IHtcblx0XHRcdHpJbmRleDogMjUsXG5cdFx0XHRmb250U2l6ZTogJzAuOXJlbScsXG5cdFx0XHRwb3NpdGlvbjogJ2Fic29sdXRlJyxcblx0XHRcdGJvdHRvbTogJy0xLjJyZW0nLFxuXHRcdFx0cmlnaHQ6ICctMS4ycmVtJyxcblx0XHRcdGN1cnNvcjogJ3BvaW50ZXInXG5cdFx0fVxuXHR9O1xuXG5mdW5jdGlvbiBNZWFzdXJlVGV4dCh0ZXh0KSB7XG5cdHJldHVybiB0ZXh0Lmxlbmd0aCA/ICh0ZXh0Lmxlbmd0aCAqIDEuMSkgOiA1O1xufVxuXG5jbGFzcyBTbGljZUhlYWRlciBleHRlbmRzIFJlYWN0LkNvbXBvbmVudCB7XG5cdGNvbnN0cnVjdG9yKHByb3BzLCBjb250ZXh0KSB7XG5cdFx0c3VwZXIocHJvcHMsIGNvbnRleHQpO1xuXHRcdHRoaXMuc3RhdGUgPSB7XG5cdFx0XHR2YWx1ZTogcHJvcHMudmFsdWUsXG5cdFx0XHRzZWxlY3RlZDogZmFsc2Vcblx0XHR9O1xuXG5cdFx0QmluZCh0aGlzKTtcblx0fVxuXG5cdGNvbXBvbmVudFdpbGxSZWNlaXZlUHJvcHMocHJvcHMpIHtcblx0XHR0aGlzLnNldFN0YXRlKHt2YWx1ZTogcHJvcHMudmFsdWUsIHNlbGVjdGVkOiBmYWxzZX0pO1xuXHR9XG5cblx0cmVuZGVyKHByb3BzLCBzdGF0ZSkge1xuXHRcdHJldHVybiAoXG5cdFx0XHQ8ZGl2IHN0eWxlPXtTdHlsZS5zbGljZX0+XG5cdFx0XHRcdDxkaXYgc3R5bGU9e3twb3NpdGlvbjogJ3JlbGF0aXZlJ319PlxuXHRcdFx0XHRcdDxpbnB1dFxuXHRcdFx0XHRcdFx0dHlwZT1cInRleHRcIlxuXHRcdFx0XHRcdFx0c3R5bGU9e1N0eWxlLnNsaWNlSGVhZGVyfVxuXHRcdFx0XHRcdFx0bWF4TGVuZ3RoPVwiMjRcIlxuXHRcdFx0XHRcdFx0c2l6ZT17TWVhc3VyZVRleHQoc3RhdGUudmFsdWUpfVxuXHRcdFx0XHRcdFx0dmFsdWU9e3N0YXRlLnZhbHVlfVxuXHRcdFx0XHRcdFx0cGxhY2Vob2xkZXI9XCJ0aW1lXCJcblx0XHRcdFx0XHRcdG9uRm9jdXM9eygpID0+IHRoaXMuc2V0U3RhdGUoeyBzZWxlY3RlZDogdHJ1ZSB9KX1cblx0XHRcdFx0XHRcdG9uQmx1cj17dGhpcy5vbkJsdXJ9XG5cdFx0XHRcdFx0XHRvbklucHV0PXsoZXZlbnQpID0+IHRoaXMuc2V0U3RhdGUoe3ZhbHVlOiBldmVudC50YXJnZXQudmFsdWV9KX1cblx0XHRcdFx0XHRcdG9uQ2hhbmdlPXt0aGlzLm9uQ2hhbmdlfVxuXHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0Lz5cblx0XHRcdFx0XHR7c3RhdGUuc2VsZWN0ZWQgP1xuXHRcdFx0XHRcdFx0PERlbGV0ZUJ1dHRvblxuXHRcdFx0XHRcdFx0XHRyZWY9eyhjKSA9PiB0aGlzLmRlbEJ0biA9IGN9XG5cdFx0XHRcdFx0XHRcdHN0eWxlPXtTdHlsZS5kZWxldGVCdXR0b259XG5cdFx0XHRcdFx0XHRcdG9uSG9sZD17KCkgPT4gdGhpcy5jb250ZXh0LmRvKCdERUxFVEVfU0xJQ0UnLCB7IGF0SW5kZXg6IHByb3BzLmlkIH0pfVxuXHRcdFx0XHRcdFx0Lz5cblx0XHRcdFx0XHQ6XG5cdFx0XHRcdFx0XHQnJ1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0PC9kaXY+XG5cdFx0XHQ8L2Rpdj5cblx0XHQpXG5cdH1cblxuXHRvbkNoYW5nZShldmVudCkge1xuXHRcdHRoaXMuY29udGV4dC5kbygnTU9ESUZZX1NMSUNFX0RBVEUnLCB7XG5cdFx0XHRhdEluZGV4OiB0aGlzLnByb3BzLmlkLFxuXHRcdFx0bmV3RGF0ZTogZXZlbnQudGFyZ2V0LnZhbHVlXG5cdFx0fSk7XG5cdH1cblxuXHRvbkJsdXIoZSkge1xuXHRcdHNldFRpbWVvdXQoKCkgPT4ge1xuXHRcdFx0aWYgKHRoaXMuZGVsQnRuICYmICF0aGlzLmRlbEJ0bi50aW1lcikgdGhpcy5zZXRTdGF0ZSh7c2VsZWN0ZWQ6IGZhbHNlfSk7XG5cdFx0fSwgMTAwKTtcblx0fVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNsaWNlSGVhZGVyOyIsImNvbnN0XG5cdFJlYWN0ID0gcmVxdWlyZSgncHJlYWN0JyksXG5cblx0U2NlbmVFZGl0b3IgPSByZXF1aXJlKCcuL1NjZW5lRWRpdG9yLmpzJyksXG5cdEhlYWRlckVkaXRvciA9IHJlcXVpcmUoJy4vSGVhZGVyRWRpdG9yLmpzJyksXG5cblx0U3R5bGUgPSB7XG5cdFx0c2xpY2U6IHtcblx0XHRcdHpJbmRleDogOSxcblx0XHRcdGRpc3BsYXk6ICdmbGV4Jyxcblx0XHRcdGZsZXhEaXJlY3Rpb246ICdjb2x1bW4nLFxuXHRcdFx0anVzdGlmeUNvbnRlbnQ6ICdmbGV4LXN0YXJ0Jyxcblx0XHRcdGFsaWduSXRlbXM6ICdjZW50ZXInLFxuXHRcdFx0bWFyZ2luOiAnMCAycmVtJyxcblx0XHRcdHdpZHRoOiAnMTRyZW0nXG5cdFx0fSxcblxuXHRcdHNwYWNlOiB7XG5cdFx0XHRoZWlnaHQ6ICcxNHJlbScsXG5cdFx0XHR3aWR0aDogJzE0cmVtJyxcblx0XHRcdGRpc3BsYXk6ICdmbGV4Jyxcblx0XHRcdGp1c3RpZnlDb250ZW50OiAnY2VudGVyJyxcblx0XHRcdGFsaWduSXRlbXM6ICdmbGV4LWVuZCdcblx0XHR9LFxuXG5cdFx0YnV0dG9uOiB7XG5cdFx0XHRmb250U2l6ZTogJzAuOXJlbScsXG5cdFx0XHRjb2xvcjogJyNmZmYnLFxuXHRcdFx0Ym9yZGVyOiAnbm9uZScsXG5cdFx0XHRvdXRsaW5lOiAnbm9uZScsXG5cdFx0XHRjdXJzb3I6ICdwb2ludGVyJyxcblx0XHRcdHdpZHRoOiAnMS4zcmVtJyxcblx0XHRcdGhlaWdodDogJzEuMnJlbScsXG5cdFx0XHRiYWNrZ3JvdW5kQ29sb3I6ICdyZ2JhKDAsMCwwLDApJyxcblx0XHRcdHRleHRBbGlnbjogJ2NlbnRlcicsXG5cdFx0XHRtYXJnaW46ICcwIDFyZW0gMC40cmVtIDFyZW0nLFxuXHRcdFx0Ym9yZGVyUmFkaXVzOiAnMXJlbSdcblx0XHR9XG5cdH07XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24ocHJvcHMsIHN0YXRlKSB7XG5cdFxuXHRyZXR1cm4gKFxuXHRcdDxkaXYgc3R5bGU9e1N0eWxlLnNsaWNlfT5cblx0XHRcdHtbXG5cdFx0XHRcdDxkaXYgc3R5bGU9e1N0eWxlLnNwYWNlfT5cblx0XHRcdFx0XHQ8SGVhZGVyRWRpdG9yXG5cdFx0XHRcdFx0XHRpZD17cHJvcHMuaWR9XG5cdFx0XHRcdFx0XHRvbkVkaXQ9e3Byb3BzLmVkaXRIZWFkZXJ9XG5cdFx0XHRcdFx0XHRoZWFkZXI9e3Byb3BzLmhlYWRlcn1cblx0XHRcdFx0XHQvPlxuXHRcdFx0XHQ8L2Rpdj5cblx0XHRcdF0uY29uY2F0KHByb3BzLnNsaWNlLnNjZW5lcy5tYXAoKHNjZW5lLCBpKSA9PiB7XG5cdFx0XHRcdGlmIChzY2VuZSkgcmV0dXJuIChcblx0XHRcdFx0XHQ8ZGl2IHN0eWxlPXtTdHlsZS5zcGFjZX0+XG5cdFx0XHRcdFx0XHQ8U2NlbmVFZGl0b3Jcblx0XHRcdFx0XHRcdFx0c2xpY2VJbmRleD17cHJvcHMuaWR9XG5cdFx0XHRcdFx0XHRcdHNlbGVjdGVkPXsocHJvcHMuc2VsZWN0aW9uICYmIHByb3BzLnNlbGVjdGlvbi5zY2VuZUluZGV4ID09PSBpKX1cblx0XHRcdFx0XHRcdFx0c2NlbmVJbmRleD17aX1cblx0XHRcdFx0XHRcdFx0c2NlbmU9e3NjZW5lfVxuXHRcdFx0XHRcdFx0XHR0aHJlYWQ9e3Byb3BzLnRocmVhZHNbaV19XG5cdFx0XHRcdFx0XHRcdG9uU2VsZWN0PXtwcm9wcy5vblNlbGVjdH1cblx0XHRcdFx0XHRcdFx0b25EZXNlbGVjdD17cHJvcHMub25EZXNlbGVjdH1cblx0XHRcdFx0XHRcdFx0b25FZGl0PXtwcm9wcy5lZGl0Tm90ZX1cblx0XHRcdFx0XHRcdFx0b25EcmFnPXtwcm9wcy5vbkRyYWd9XG5cdFx0XHRcdFx0XHQvPlxuXHRcdFx0XHRcdDwvZGl2PlxuXHRcdFx0XHQpO1xuXHRcdFx0XHRlbHNlIHJldHVybiAoXG5cdFx0XHRcdFx0PGRpdlxuXHRcdFx0XHRcdFx0c3R5bGU9e1N0eWxlLnNwYWNlfVxuXHRcdFx0XHRcdFx0b25EcmFnT3Zlcj17KGUpID0+IGUucHJldmVudERlZmF1bHQoKX1cblx0XHRcdFx0XHRcdG9uRHJvcD17KCkgPT4gcHJvcHMub25Ecm9wKHsgc2xpY2VJbmRleDogcHJvcHMuaWQsIHNjZW5lSW5kZXg6IGkgfSl9XG5cdFx0XHRcdFx0PlxuXHRcdFx0XHRcdFx0PGJ1dHRvblxuXHRcdFx0XHRcdFx0XHRzdHlsZT17U3R5bGUuYnV0dG9ufVxuXHRcdFx0XHRcdFx0XHRvbmNsaWNrPXsoKSA9PiB0aGlzLmNvbnRleHQuZG8oJ05FV19OT1RFJywge1xuXHRcdFx0XHRcdFx0XHRcdHNsaWNlSW5kZXg6IHByb3BzLmlkLFxuXHRcdFx0XHRcdFx0XHRcdHNjZW5lSW5kZXg6IGlcblx0XHRcdFx0XHRcdFx0fSl9XG5cdFx0XHRcdFx0XHQ+KzwvYnV0dG9uPlxuXHRcdFx0XHRcdDwvZGl2PlxuXHRcdFx0XHQpO1xuXHRcdFx0fSkpfVxuXHRcdDwvZGl2PlxuXHQpXG59XG4iLCJjb25zdFxuXHRSZWFjdCA9IHJlcXVpcmUoJ3ByZWFjdCcpLFxuXG5cdERlbGV0ZUJ1dHRvbiA9IHJlcXVpcmUoJy4vRGVsZXRlQnV0dG9uLmpzJyksXG5cdEV4cGFuZGluZ1RleHRhcmVhID0gcmVxdWlyZSgnLi9FeHBhbmRpbmdUZXh0YXJlYS5qcycpLFxuXG5cdENvbG9ycyA9IHJlcXVpcmUoJy4uL2NvbG9ycy5qcycpLFxuXHRCaW5kID0gcmVxdWlyZSgnLi4vYmluZC5qcycpLFxuXHRTdHlsZSA9IHtcblx0XHR0aHJlYWRIZWFkZXI6IHtcblx0XHRcdHpJbmRleDogJzEwJyxcblx0XHRcdHdpZHRoOiAnN3JlbScsXG5cdFx0XHRjb2xvcjogJyNmZmYnLFxuXHRcdFx0b3V0bGluZTogJ25vbmUnLFxuXHRcdFx0Zm9udFNpemU6ICcwLjlyZW0nLFxuXHRcdFx0Ym9yZGVyOiAnbm9uZScsXG5cdFx0XHR0ZXh0QWxpZ246ICdjZW50ZXInLFxuXHRcdFx0cGFkZGluZ1RvcDogJzAuNXJlbSdcblx0XHR9LFxuXHRcdGRyYWdnYWJsZToge1xuXHRcdFx0bWluSGVpZ2h0OiAnMC45cmVtJ1xuXHRcdH0sXG5cdFx0Ym94OiB7XG5cdFx0XHRwb3NpdGlvbjogJ3JlbGF0aXZlJyxcblx0XHRcdGRpc3BsYXk6ICdmbGV4Jyxcblx0XHRcdGZsZXhEaXJlY3Rpb246ICdjb2x1bW4nLFxuXHRcdFx0anVzdGlmeUNvbnRlbnQ6ICdmbGV4LWVuZCcsXG5cdFx0XHRoZWlnaHQ6ICcxNHJlbScsXG5cdFx0fSxcblx0XHRkZWxldGVCdXR0b246IHtcblx0XHRcdHpJbmRleDogMjUsXG5cdFx0XHRmb250U2l6ZTogJzAuOXJlbScsXG5cdFx0XHRwb3NpdGlvbjogJ2Fic29sdXRlJyxcblx0XHRcdGJvdHRvbTogJy0xLjJyZW0nLFxuXHRcdFx0cmlnaHQ6ICctMS4ycmVtJyxcblx0XHRcdGN1cnNvcjogJ3BvaW50ZXInXG5cdFx0fVxuXHR9O1xuXG5jbGFzcyBUaHJlYWRIZWFkZXIgZXh0ZW5kcyBSZWFjdC5Db21wb25lbnQge1xuXHRjb25zdHJ1Y3Rvcihwcm9wcywgY29udGV4dCkge1xuXHRcdHN1cGVyKHByb3BzLCBjb250ZXh0KTtcblx0XHR0aGlzLnN0YXRlID0ge1xuXHRcdFx0dmFsdWU6IHByb3BzLnRocmVhZC5uYW1lLFxuXHRcdFx0c2VsZWN0ZWQ6IGZhbHNlXG5cdFx0fTtcblxuXHRcdEJpbmQodGhpcyk7XG5cdH1cblxuXHRzaG91bGRDb21wb25lbnRVcGRhdGUocHJvcHMsIHN0YXRlKSB7XG5cdFx0cmV0dXJuICgocHJvcHMudGhyZWFkLm5hbWUgIT09IHRoaXMucHJvcHMudGhyZWFkLm5hbWUpIHx8XG5cdFx0XHRcdChwcm9wcy50aHJlYWQuY29sb3IgIT09IHRoaXMucHJvcHMudGhyZWFkLmNvbG9yKSB8fFxuXHRcdFx0XHQoc3RhdGUudmFsdWUgIT09IHRoaXMuc3RhdGUudmFsdWUpIHx8XG5cdFx0XHRcdChzdGF0ZS5zZWxlY3RlZCAhPT0gdGhpcy5zdGF0ZS5zZWxlY3RlZCkpO1xuXHR9XG5cblx0Y29tcG9uZW50V2lsbFJlY2VpdmVQcm9wcyhwcm9wcykge1xuXHRcdHRoaXMuc2V0U3RhdGUoe3ZhbHVlOiBwcm9wcy50aHJlYWQubmFtZSwgc2VsZWN0ZWQ6IGZhbHNlfSk7XG5cdH1cblxuXHRyZW5kZXIocHJvcHMsIHN0YXRlKSB7XG5cdFx0cmV0dXJuIChcblx0XHRcdDxkaXZcblx0XHRcdFx0c3R5bGU9e1N0eWxlLmJveH1cblx0XHRcdFx0b25EcmFnT3Zlcj17KGUpID0+IGUucHJldmVudERlZmF1bHQoKX1cblx0XHRcdFx0b25Ecm9wPXsoKSA9PiBwcm9wcy5vbkRyb3AocHJvcHMuaWQpfVxuXHRcdFx0PlxuXHRcdFx0XHQ8ZGl2XG5cdFx0XHRcdFx0c3R5bGU9e1N0eWxlLmRyYWdnYWJsZX1cblx0XHRcdFx0XHRkcmFnZ2FibGVcblx0XHRcdFx0XHRvbkRyYWdTdGFydD17KGUpID0+IHtcblx0XHRcdFx0XHRcdHRoaXMudGltZXIgPSB1bmRlZmluZWQ7XG5cdFx0XHRcdFx0XHRwcm9wcy5vbkRyYWcocHJvcHMuaWQpO1xuXHRcdFx0XHRcdH19XG5cdFx0XHRcdFx0b25Nb3VzZURvd249eygpID0+ICh0aGlzLnRpbWVyID0gc2V0VGltZW91dCh0aGlzLmNvbG9yVG9nZ2xlLCAxMDAwKSl9XG5cdFx0XHRcdFx0b25Nb3VzZVVwPXsoKSA9PiAodGhpcy50aW1lciA9IHVuZGVmaW5lZCl9XG5cdFx0XHRcdD5cblx0XHRcdFx0XHQ8RXhwYW5kaW5nVGV4dGFyZWFcblx0XHRcdFx0XHRcdHJlZj17KGMpID0+IHRoaXMuaW5wdXQgPSBjfVxuXHRcdFx0XHRcdFx0dHlwZT1cInRleHRcIlxuXHRcdFx0XHRcdFx0c3R5bGU9e09iamVjdC5hc3NpZ24oe30sIFN0eWxlLnRocmVhZEhlYWRlciwge2JhY2tncm91bmRDb2xvcjogcHJvcHMudGhyZWFkLmNvbG9yfSl9XG5cdFx0XHRcdFx0XHRtYXhMZW5ndGg9XCIyNFwiXG5cdFx0XHRcdFx0XHRiYXNlSGVpZ2h0PVwiMC45cmVtXCJcblx0XHRcdFx0XHRcdHZhbHVlPXtzdGF0ZS52YWx1ZX1cblx0XHRcdFx0XHRcdHBsYWNlaG9sZGVyPVwiTmFtZVwiXG5cdFx0XHRcdFx0XHRmb2N1cz17dGhpcy5vbkZvY3VzfVxuXHRcdFx0XHRcdFx0Ymx1cj17dGhpcy5vbkJsdXJ9XG5cdFx0XHRcdFx0XHRpbnB1dD17KGV2ZW50KSA9PiB0aGlzLnNldFN0YXRlKHt2YWx1ZTogZXZlbnQudGFyZ2V0LnZhbHVlfSl9XG5cdFx0XHRcdFx0XHRjaGFuZ2U9eyhldmVudCkgPT4gdGhpcy5jb250ZXh0LmRvKCdNT0RJRllfVEhSRUFEX05BTUUnLCB7XG5cdFx0XHRcdFx0XHRcdGF0SW5kZXg6IHRoaXMucHJvcHMuaWQsXG5cdFx0XHRcdFx0XHRcdG5ld05hbWU6IGV2ZW50LnRhcmdldC52YWx1ZVxuXHRcdFx0XHRcdFx0fSl9XG5cdFx0XHRcdFx0Lz5cblx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcdHtzdGF0ZS5zZWxlY3RlZCA/XG5cdFx0XHRcdFx0PERlbGV0ZUJ1dHRvblxuXHRcdFx0XHRcdFx0cmVmPXsoYykgPT4gdGhpcy5kZWxCdG4gPSBjfVxuXHRcdFx0XHRcdFx0c3R5bGU9e1N0eWxlLmRlbGV0ZUJ1dHRvbn1cblx0XHRcdFx0XHRcdG9uSG9sZD17KCkgPT4gdGhpcy5jb250ZXh0LmRvKCdERUxFVEVfVEhSRUFEJywgeyBhdEluZGV4OiBwcm9wcy5pZCB9KX1cblx0XHRcdFx0XHQvPlxuXHRcdFx0XHQ6XG5cdFx0XHRcdFx0Jydcblx0XHRcdFx0fVxuXHRcdFx0PC9kaXY+XG5cdFx0KVxuXHR9XG5cblx0Y29sb3JUb2dnbGUoKSB7XG5cdFx0aWYgKHRoaXMudGltZXIpIHtcblx0XHRcdHRoaXMuY29udGV4dC5kbygnTU9ESUZZX1RIUkVBRF9DT0xPUicsIHtcblx0XHRcdFx0YXRJbmRleDogdGhpcy5wcm9wcy5pZCxcblx0XHRcdFx0Y29sb3I6IENvbG9ycy5yYW5kb20odGhpcy5wcm9wcy50aHJlYWQuY29sb3IpXG5cdFx0XHR9KVxuXHRcdFx0dGhpcy50aW1lciA9IHVuZGVmaW5lZDtcblx0XHRcdHRoaXMuaW5wdXQuYmFzZS5ibHVyKCk7XG5cdFx0fVxuXHR9XG5cblx0b25Gb2N1cyhlKSB7XG5cdFx0dGhpcy5zZXRTdGF0ZSh7IHNlbGVjdGVkOiB0cnVlIH0pO1xuXHR9XG5cblx0b25CbHVyKGUpIHtcblx0XHRzZXRUaW1lb3V0KCgpID0+IHtcblx0XHRcdGlmICh0aGlzLmRlbEJ0biAmJiAhdGhpcy5kZWxCdG4udGltZXIpIHRoaXMuc2V0U3RhdGUoe3NlbGVjdGVkOiBmYWxzZX0pO1xuXHRcdH0sIDEwMCk7XG5cdH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBUaHJlYWRIZWFkZXI7IiwiY29uc3Rcblx0UmVhY3QgPSByZXF1aXJlKCdwcmVhY3QnKSxcblxuXHRTdHlsZSA9IHtcblx0XHRlZGl0b3I6IHtcblx0XHRcdGZvbnRTaXplOiAnMC45cmVtJyxcblx0XHRcdHBhZGRpbmc6ICcwLjVyZW0nLFxuXHRcdFx0aGVpZ2h0OiAnMXJlbScsXG5cdFx0XHRib3JkZXI6ICdub25lJyxcblx0XHRcdG91dGxpbmU6ICdub25lJyxcblx0XHRcdGJhY2tncm91bmQ6ICdyZ2JhKDAsMCwwLDApJyxcblx0XHRcdGNvbG9yOiAnI2ZmZidcblx0XHR9XG5cdH07XG5cbmZ1bmN0aW9uIE1lYXN1cmVUZXh0KHRleHQpIHtcblx0cmV0dXJuIHRleHQubGVuZ3RoID8gKHRleHQubGVuZ3RoICogMS4xKSA6IDU7XG59XG5cbmNsYXNzIExvY2F0aW9uTGFiZWwgZXh0ZW5kcyBSZWFjdC5Db21wb25lbnQge1xuXHRjb25zdHJ1Y3Rvcihwcm9wcywgY29udGV4dCkge1xuXHRcdHN1cGVyKHByb3BzLCBjb250ZXh0KTtcblxuXHRcdHRoaXMuc3RhdGUgPSB7XG5cdFx0XHR2YWx1ZTogcHJvcHMudmFsdWVcblx0XHR9XG5cdH1cblxuXHRjb21wb25lbnRXaWxsUmVjZWl2ZVByb3BzKHByb3BzKSB7XG5cdFx0dGhpcy5zZXRTdGF0ZSh7dmFsdWU6IHByb3BzLnZhbHVlfSk7XG5cdH1cblxuXHRyZW5kZXIocHJvcHMsIHN0YXRlLCBjb250ZXh0KSB7XG5cdFx0cmV0dXJuIChcblx0XHRcdDxpbnB1dFxuXHRcdFx0XHR0eXBlPVwidGV4dFwiXG5cdFx0XHRcdHN0eWxlPXtwcm9wcy5zdHlsZSA/IE9iamVjdC5hc3NpZ24oe30sIFN0eWxlLmVkaXRvciwgcHJvcHMuc3R5bGUpIDogU3R5bGUuZWRpdG9yfVxuXHRcdFx0XHRtYXhMZW5ndGg9XCI1MFwiXG5cdFx0XHRcdHNpemU9ezIwfVxuXHRcdFx0XHR2YWx1ZT17c3RhdGUudmFsdWV9XG5cdFx0XHRcdHBsYWNlaG9sZGVyPVwibG9jYXRpb25cIlxuXHRcdFx0XHRvbklucHV0PXsoZXZlbnQpID0+IHRoaXMuc2V0U3RhdGUoe3ZhbHVlOiBldmVudC50YXJnZXQudmFsdWV9KX1cblx0XHRcdFx0b25DaGFuZ2U9e3Byb3BzLm9uQ2hhbmdlfVxuXHRcdFx0Lz5cblx0XHQpO1xuXHR9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gTG9jYXRpb25MYWJlbDsiLCJjb25zdFxuXHRSZWFjdCA9IHJlcXVpcmUoJ3ByZWFjdCcpLFxuXG5cdFN0eWxlID0ge1xuXHRcdG91dGVyOiB7XG5cdFx0XHR6SW5kZXg6ICctNScsXG5cdFx0XHRwb3NpdGlvbjogJ2Fic29sdXRlJyxcblx0XHRcdGxlZnQ6ICc3cmVtJyxcblx0XHRcdHRvcDogJzIuNXJlbScsXG5cdFx0XHRtaW5XaWR0aDogJzEwMHZ3Jyxcblx0XHRcdG1pbkhlaWdodDogJzEwMHZoJ1xuXHRcdH0sXG5cdFx0aW5uZXI6IHtcblx0XHRcdHBvc2l0aW9uOiAnYWJzb2x1dGUnLFxuXHRcdFx0dG9wOiAnMnJlbScsXG5cdFx0XHRsZWZ0OiAwLFxuXHRcdFx0d2lkdGg6ICcxMDAlJyxcblx0XHRcdGhlaWdodDogJzEwMCUnXG5cdFx0fSxcblx0XHR0aHJlYWQ6IHtcblx0XHRcdG1hcmdpbjogJzEycmVtIDAnLFxuXHRcdFx0aGVpZ2h0OiAnMnJlbScsXG5cdFx0XHRvcGFjaXR5OiAnMC4zJ1xuXHRcdH0sXG5cdFx0c2xpY2U6IHtcblx0XHRcdGRpc3BsYXk6ICdpbmxpbmUtYmxvY2snLFxuXHRcdFx0bWFyZ2luOiAnMCA4LjkzNzVyZW0nLFxuXHRcdFx0d2lkdGg6ICcwLjEyNXJlbScsXG5cdFx0XHRoZWlnaHQ6ICcxMDAlJyxcblx0XHRcdGJhY2tncm91bmRDb2xvcjogJyM0NDQ0NDQnXG5cdFx0fVxuXHR9O1xuXG5cbmNsYXNzIFdlYXZlQmFja2dyb3VuZCBleHRlbmRzIFJlYWN0LkNvbXBvbmVudCB7XG5cdGNvbnN0cnVjdG9yKHByb3BzLCBjb250ZXh0KSB7XG5cdFx0c3VwZXIocHJvcHMsIGNvbnRleHQpO1xuXHR9XG5cblx0c2hvdWxkQ29tcG9uZW50VXBkYXRlKHByb3BzLCBzdGF0ZSwgY29udGV4dCkge1xuXHRcdHJldHVybiAoKHByb3BzLm1lbnVPZmZzZXQgIT09IHRoaXMucHJvcHMubWVudU9mZnNldCkgfHxcblx0XHRcdFx0KHByb3BzLnRocmVhZHMgIT09IHRoaXMucHJvcHMudGhyZWFkcykgfHxcblx0XHRcdFx0KHByb3BzLnNsaWNlcyAhPT0gdGhpcy5wcm9wcy5zbGljZXMpKTtcblx0fVxuXG5cdHJlbmRlcihwcm9wcywgc3RhdGUpIHtcblx0XHRyZXR1cm4gKFxuXHRcdFx0PGRpdlxuXHRcdFx0XHRkYXRhLWlzPVwiV2VhdmVCYWNrZ3JvdW5kXCJcblx0XHRcdFx0c3R5bGU9e09iamVjdC5hc3NpZ24oe30sIFN0eWxlLm91dGVyLCB7XG5cdFx0XHRcdFx0dG9wOiBwcm9wcy5tZW51T2Zmc2V0LFxuXHRcdFx0XHRcdHdpZHRoOiAocHJvcHMuc2xpY2VzICogMTggKyAyKSArICdyZW0nLFxuXHRcdFx0XHRcdGhlaWdodDogKChwcm9wcy50aHJlYWRzLmxlbmd0aCArIDEpICogMTQgKyAxNikgKyAncmVtJ1xuXHRcdFx0XHR9KX1cblx0XHRcdD5cblx0XHRcdFx0PGRpdiBzdHlsZT17U3R5bGUuaW5uZXJ9PlxuXHRcdFx0XHRcdHtbXG5cdFx0XHRcdFx0XHQ8ZGl2XG5cdFx0XHRcdFx0XHRcdHN0eWxlPXtPYmplY3QuYXNzaWduKHt9LCBTdHlsZS50aHJlYWQsIHtcblx0XHRcdFx0XHRcdFx0XHRiYWNrZ3JvdW5kQ29sb3I6ICcjMDAwJ1xuXHRcdFx0XHRcdFx0XHR9KX1cblx0XHRcdFx0XHRcdD4mbmJzcDs8L2Rpdj5cblx0XHRcdFx0XHRdLmNvbmNhdChwcm9wcy50aHJlYWRzLm1hcCgodGhyZWFkLCBpKSA9PiAoXG5cdFx0XHRcdFx0XHQ8ZGl2XG5cdFx0XHRcdFx0XHRcdHN0eWxlPXtPYmplY3QuYXNzaWduKHt9LCBTdHlsZS50aHJlYWQsIHtcblx0XHRcdFx0XHRcdFx0XHRiYWNrZ3JvdW5kQ29sb3I6IHRocmVhZC5jb2xvclxuXHRcdFx0XHRcdFx0XHR9KX1cblx0XHRcdFx0XHRcdD4mbmJzcDs8L2Rpdj4pXG5cdFx0XHRcdFx0KSl9XG5cdFx0XHRcdDwvZGl2PlxuXHRcdFx0XHQ8ZGl2IHN0eWxlPXtTdHlsZS5pbm5lcn0+XG5cdFx0XHRcdFx0e0FycmF5KHByb3BzLnNsaWNlcykuZmlsbCgwKS5tYXAoKHYsIGkpID0+IDxkaXYgc3R5bGU9e1N0eWxlLnNsaWNlfT4mbmJzcDs8L2Rpdj4pfVxuXHRcdFx0XHQ8L2Rpdj5cblx0XHRcdDwvZGl2PlxuXHRcdClcblx0fVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFdlYXZlQmFja2dyb3VuZDsiLCJjb25zdFxuXHRSZWFjdCA9IHJlcXVpcmUoJ3ByZWFjdCcpLFxuXG5cdFRocmVhZEhlYWRlciA9IHJlcXVpcmUoJy4vVGhyZWFkSGVhZGVyLmpzJyksXG5cdFNsaWNlSGVhZGVyID0gcmVxdWlyZSgnLi9TbGljZUhlYWRlci5qcycpLFxuXG5cdENvbG9ycyA9IHJlcXVpcmUoJy4uL2NvbG9ycy5qcycpLFxuXHRCaW5kID0gcmVxdWlyZSgnLi4vYmluZC5qcycpLFxuXG5cdFN0eWxlID0ge1xuXHRcdG91dGVyOiB7XG5cdFx0XHRwb3NpdGlvbjogJ2Fic29sdXRlJyxcblx0XHRcdGxlZnQ6IDAsXG5cdFx0XHRtaW5XaWR0aDogJzEwMHZ3Jyxcblx0XHRcdG1pbkhlaWdodDogJzEwMHZoJ1xuXHRcdH0sXG5cdFx0dGhyZWFkczoge1xuXHRcdFx0cG9zaXRpb246ICdhYnNvbHV0ZScsXG5cdFx0XHR0b3A6ICcwLjI1cmVtJyxcblx0XHRcdHdpZHRoOiAnN3JlbScsXG5cdFx0XHRtaW5IZWlnaHQ6ICcxMDB2aCcsXG5cdFx0XHRwYWRkaW5nVG9wOiAnMnJlbSdcblx0XHR9LFxuXHRcdHRocmVhZDoge1xuXHRcdFx0ZGlzcGxheTogJ2ZsZXgnLFxuXHRcdFx0ZmxleERpcmVjdGlvbjogJ2NvbHVtbicsXG5cdFx0XHRqdXN0aWZ5Q29udGVudDogJ2ZsZXgtZW5kJyxcblx0XHRcdHBvc2l0aW9uOiAncmVsYXRpdmUnLFxuXHRcdFx0aGVpZ2h0OiAnMTMuNzVyZW0nLFxuXHRcdH0sXG5cdFx0c2NlbmVzOiB7XG5cdFx0XHR6SW5kZXg6ICcxMScsXG5cdFx0XHRwb3NpdGlvbjogJ2Fic29sdXRlJyxcblx0XHRcdGJhY2tncm91bmRDb2xvcjogXCIjMTExXCIsXG5cdFx0XHRsZWZ0OiAwLFxuXHRcdFx0aGVpZ2h0OiAnMnJlbScsXG5cdFx0XHRwYWRkaW5nTGVmdDogJzdyZW0nLFxuXHRcdFx0bWluV2lkdGg6ICcxMDB2dydcblx0XHR9LFxuXHRcdHNsaWNlQnV0dG9uOiB7XG5cdFx0XHRtYXJnaW46ICcwIDEuMzc1cmVtJyxcblx0XHRcdGZvbnRTaXplOiAnMC45cmVtJyxcblx0XHRcdGNvbG9yOiAnI2ZmZicsXG5cdFx0XHRib3JkZXI6ICdub25lJyxcblx0XHRcdG91dGxpbmU6ICdub25lJyxcblx0XHRcdGN1cnNvcjogJ3BvaW50ZXInLFxuXHRcdFx0d2lkdGg6ICcxLjI1cmVtJyxcblx0XHRcdGhlaWdodDogJzEuMjVyZW0nLFxuXHRcdFx0dGV4dEFsaWduOiAnY2VudGVyJyxcblx0XHRcdGJvcmRlclJhZGl1czogJzFyZW0nLFxuXHRcdFx0YmFja2dyb3VuZENvbG9yOiAncmdiYSgwLDAsMCwwKSdcblx0XHR9LFxuXHRcdGZpcnN0U2xpY2VCdXR0b246IHtcblx0XHRcdG1hcmdpbjogJzAgMC4zNzVyZW0nLFxuXHRcdFx0Zm9udFNpemU6ICcwLjlyZW0nLFxuXHRcdFx0Y29sb3I6ICcjZmZmJyxcblx0XHRcdGJvcmRlcjogJ25vbmUnLFxuXHRcdFx0b3V0bGluZTogJ25vbmUnLFxuXHRcdFx0Y3Vyc29yOiAncG9pbnRlcicsXG5cdFx0XHR3aWR0aDogJzEuMjVyZW0nLFxuXHRcdFx0aGVpZ2h0OiAnMS4yNXJlbScsXG5cdFx0XHR0ZXh0QWxpZ246ICdjZW50ZXInLFxuXHRcdFx0Ym9yZGVyUmFkaXVzOiAnMXJlbScsXG5cdFx0XHRiYWNrZ3JvdW5kQ29sb3I6ICdyZ2JhKDAsMCwwLDApJ1xuXHRcdH0sXG5cdFx0dGhyZWFkQnRuOiB7XG5cdFx0XHRoZWlnaHQ6ICcycmVtJyxcblx0XHRcdGZvbnRTaXplOiAnMC45cmVtJyxcblx0XHRcdGNvbG9yOiAnI2ZmZicsXG5cdFx0XHRib3JkZXI6ICdub25lJyxcblx0XHRcdG91dGxpbmU6ICdub25lJyxcblx0XHRcdGN1cnNvcjogJ3BvaW50ZXInLFxuXHRcdFx0dGV4dEFsaWduOiAnY2VudGVyJyxcblx0XHRcdHBhZGRpbmc6ICcwLjVyZW0gMC41cmVtJyxcblx0XHRcdGJhY2tncm91bmRDb2xvcjogJ3JnYmEoMCwwLDAsMCknLFxuXHRcdFx0d2lkdGg6ICcxMDAlJ1xuXHRcdH0sXG5cdFx0aGVhZGVyOiB7XG5cdFx0XHRkaXNwbGF5OiAnZmxleCcsXG5cdFx0XHRqdXN0aWZ5Q29udGVudDogJ2NlbnRlcicsXG5cdFx0XHRhbGlnbkl0ZW1zOiAnY2VudGVyJyxcblx0XHRcdGhlaWdodDogJzJyZW0nLFxuXHRcdFx0Zm9udFNpemU6ICcwLjlyZW0nLFxuXHRcdFx0Y29sb3I6ICcjZmZmJyxcblx0XHRcdGJvcmRlcjogJ25vbmUnLFxuXHRcdFx0YmFja2dyb3VuZENvbG9yOiAnIzAwMCcsXG5cdFx0XHR3aWR0aDogJzEwMCUnLFxuXHRcdFx0Ym9yZGVyOiAnbm9uZSdcblx0XHR9XG5cdH07XG5cblxuY2xhc3MgV2VhdmVIZWFkZXJzIGV4dGVuZHMgUmVhY3QuQ29tcG9uZW50IHtcblx0Y29uc3RydWN0b3IocHJvcHMsIGNvbnRleHQpIHtcblx0XHRzdXBlcihwcm9wcywgY29udGV4dCk7XG5cblx0XHR0aGlzLnN0YXRlID0ge1xuXHRcdFx0eDogMCxcblx0XHRcdHk6IDBcblx0XHR9XG5cblx0XHRCaW5kKHRoaXMpO1xuXHR9XG5cblx0Y29tcG9uZW50RGlkTW91bnQoKSB7XG5cdFx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Njcm9sbCcsIHRoaXMub25TY3JvbGwpO1xuXHR9XG5cblx0Y29tcG9uZW50V2lsbFVubW91bnQoKSB7XG5cdFx0d2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3Njcm9sbCcsIHRoaXMub25TY3JvbGwpO1xuXHR9XG5cblx0c2hvdWxkQ29tcG9uZW50VXBkYXRlKHByb3BzLCBzdGF0ZSkge1xuXHRcdHJldHVybiAoKHByb3BzLndpbmRvd1dpZHRoICE9PSB0aGlzLnByb3BzLndpbmRvd1dpZHRoKSB8fFxuXHRcdFx0XHQocHJvcHMudGhyZWFkcyAhPT0gdGhpcy5wcm9wcy50aHJlYWRzKSB8fFxuXHRcdFx0XHQocHJvcHMuc2xpY2VzICE9PSB0aGlzLnByb3BzLnNsaWNlcykgfHxcblx0XHRcdFx0KHN0YXRlICE9PSB0aGlzLnN0YXRlKSlcblx0fVxuXG5cdHJlbmRlcihwcm9wcywgc3RhdGUpIHtcblx0XHRyZXR1cm4gKFxuXHRcdFx0PGRpdlxuXHRcdFx0XHRkYXRhLWlzPVwiV2VhdmVIZWFkZXJzXCJcblx0XHRcdFx0c3R5bGU9e09iamVjdC5hc3NpZ24oe30sIFN0eWxlLm91dGVyLCBzdGF0ZS5zdHlsZSl9XG5cdFx0XHQ+XG5cdFx0XHRcdDxkaXZcblx0XHRcdFx0XHRkYXRhLWlzPVwiU2xpY2VIZWFkZXJzXCJcblx0XHRcdFx0XHRzdHlsZT17T2JqZWN0LmFzc2lnbih7fSwgU3R5bGUuc2NlbmVzLCB7IHRvcDogc3RhdGUueSwgd2lkdGg6ICgocHJvcHMuc2xpY2VzLmxlbmd0aCoxOCArIDIpICsgJ3JlbScpICB9KX1cblx0XHRcdFx0PlxuXHRcdFx0XHRcdHtbXG5cdFx0XHRcdFx0XHQ8YnV0dG9uXG5cdFx0XHRcdFx0XHRcdG9uY2xpY2s9eyhldmVudCkgPT4gdGhpcy5jb250ZXh0LmRvKCdORVdfU0xJQ0UnLCB7YXRJbmRleDogMH0pfVxuXHRcdFx0XHRcdFx0XHRzdHlsZT17U3R5bGUuZmlyc3RTbGljZUJ1dHRvbn1cblx0XHRcdFx0XHRcdFx0b25tb3VzZWVudGVyPXtlID0+IGUudGFyZ2V0LnN0eWxlLmJhY2tncm91bmRDb2xvciA9ICdyZ2JhKDI1NSwyNTUsMjU1LDAuMiknfVxuXHRcdFx0XHRcdFx0XHRvbm1vdXNlbGVhdmU9e2UgPT4gZS50YXJnZXQuc3R5bGUuYmFja2dyb3VuZENvbG9yID0gJ3JnYmEoMCwwLDAsMCknfVxuXHRcdFx0XHRcdFx0Pis8L2J1dHRvbj5cblx0XHRcdFx0XHRdLmNvbmNhdChwcm9wcy5zbGljZXMubWFwKChzbGljZSwgaSkgPT4gXG5cdFx0XHRcdFx0XHQ8ZGl2IHN0eWxlPXt7ZGlzcGxheTogJ2lubGluZScsIHdpZHRoOiAnMThyZW0nfX0+XG5cdFx0XHRcdFx0XHRcdDxTbGljZUhlYWRlclxuXHRcdFx0XHRcdFx0XHRcdGlkPXtpfVxuXHRcdFx0XHRcdFx0XHRcdHZhbHVlPXtzbGljZS5kYXRldGltZX1cblx0XHRcdFx0XHRcdFx0Lz5cblx0XHRcdFx0XHRcdFx0PGJ1dHRvblxuXHRcdFx0XHRcdFx0XHRcdG9uY2xpY2s9eyhldmVudCkgPT4gdGhpcy5jb250ZXh0LmRvKCdORVdfU0xJQ0UnLCB7YXRJbmRleDogaSsxfSl9XG5cdFx0XHRcdFx0XHRcdFx0c3R5bGU9e1N0eWxlLnNsaWNlQnV0dG9ufVxuXHRcdFx0XHRcdFx0XHRcdG9ubW91c2VlbnRlcj17ZSA9PiBlLnRhcmdldC5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSAncmdiYSgyNTUsMjU1LDI1NSwwLjIpJ31cblx0XHRcdFx0XHRcdFx0XHRvbm1vdXNlbGVhdmU9e2UgPT4gZS50YXJnZXQuc3R5bGUuYmFja2dyb3VuZENvbG9yID0gJ3JnYmEoMCwwLDAsMCknfVxuXHRcdFx0XHRcdFx0XHQ+KzwvYnV0dG9uPlxuXHRcdFx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcdFx0KSl9XG5cdFx0XHRcdDwvZGl2PlxuXHRcdFx0XHQ8ZGl2IFxuXHRcdFx0XHRcdGRhdGEtaXM9XCJUaHJlYWRIZWFkZXJzXCJcblx0XHRcdFx0XHRzdHlsZT17T2JqZWN0LmFzc2lnbih7fSwgU3R5bGUudGhyZWFkcywge1xuXHRcdFx0XHRcdFx0bGVmdDogc3RhdGUueCxcblx0XHRcdFx0XHRcdGhlaWdodDogKCgocHJvcHMudGhyZWFkcy5sZW5ndGgrMSkqMTQgKyAxNikgKyAncmVtJyksXG5cdFx0XHRcdFx0XHRiYWNrZ3JvdW5kQ29sb3I6IChwcm9wcy53aW5kb3dXaWR0aCA8IDcwMCkgPyAncmdiYSgwLDAsMCwwKScgOiAnIzExMScsXG5cdFx0XHRcdFx0XHR6SW5kZXg6IChwcm9wcy53aW5kb3dXaWR0aCA8IDcwMCkgPyA4IDogMTAgfSl9XG5cdFx0XHRcdD5cblx0XHRcdFx0XHR7KFtcblx0XHRcdFx0XHRcdDxkaXYgc3R5bGU9e09iamVjdC5hc3NpZ24oe21hcmdpbkJvdHRvbTogJzAuMjVyZW0nfSwgU3R5bGUudGhyZWFkKX0+XG5cdFx0XHRcdFx0XHRcdDxzcGFuXG5cdFx0XHRcdFx0XHRcdFx0c3R5bGU9e1N0eWxlLmhlYWRlcn1cblx0XHRcdFx0XHRcdFx0PkhlYWRlcjwvc3Bhbj5cblx0XHRcdFx0XHRcdDwvZGl2PlxuXHRcdFx0XHRcdF0uY29uY2F0KChwcm9wcy50aHJlYWRzLm1hcCgodGhyZWFkLCBpKSA9PlxuXHRcdFx0XHRcdFx0PFRocmVhZEhlYWRlclxuXHRcdFx0XHRcdFx0XHRpZD17aX1cblx0XHRcdFx0XHRcdFx0dGhyZWFkPXt0aHJlYWR9XG5cdFx0XHRcdFx0XHRcdG9uRHJhZz17KGlkKSA9PiB0aGlzLmRyYWdnaW5nID0gaWR9XG5cdFx0XHRcdFx0XHRcdG9uRHJvcD17dGhpcy5vblRocmVhZERyb3B9XG5cdFx0XHRcdFx0XHQvPlxuXHRcdFx0XHRcdCkpLmNvbmNhdChcblx0XHRcdFx0XHRcdFs8ZGl2IHN0eWxlPXtTdHlsZS50aHJlYWR9PlxuXHRcdFx0XHRcdFx0XHQ8YnV0dG9uXG5cdFx0XHRcdFx0XHRcdFx0b25jbGljaz17KGV2ZW50KSA9PiB0aGlzLmNvbnRleHQuZG8oJ05FV19USFJFQUQnLCB7Y29sb3I6IENvbG9ycy5yYW5kb20oKX0pfVxuXHRcdFx0XHRcdFx0XHRcdHN0eWxlPXtTdHlsZS50aHJlYWRCdG59XG5cdFx0XHRcdFx0XHRcdFx0b25tb3VzZWVudGVyPXtlID0+IGUudGFyZ2V0LnN0eWxlLmJhY2tncm91bmRDb2xvciA9ICdyZ2JhKDI1NSwyNTUsMjU1LDAuMiknfVxuXHRcdFx0XHRcdFx0XHRcdG9ubW91c2VsZWF2ZT17ZSA9PiBlLnRhcmdldC5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSAncmdiYSgwLDAsMCwwKSd9XG5cdFx0XHRcdFx0XHRcdD4rPC9idXR0b24+XG5cdFx0XHRcdFx0XHQ8L2Rpdj5dXG5cdFx0XHRcdFx0KSkpfVxuXHRcdFx0XHQ8L2Rpdj5cblx0XHRcdDwvZGl2PlxuXHRcdClcblx0fVxuXG5cdG9uU2Nyb2xsKCkge1xuXHRcdHRoaXMuc2V0U3RhdGUoe1xuXHRcdFx0eDogZG9jdW1lbnQuYm9keS5zY3JvbGxMZWZ0LFxuXHRcdFx0eTogZG9jdW1lbnQuYm9keS5zY3JvbGxUb3Bcblx0XHR9KTtcblx0fVxuXG5cdG9uVGhyZWFkRHJvcCh0b0luZGV4KSB7XG5cdFx0dGhpcy5jb250ZXh0LmRvKCdNT1ZFX1RIUkVBRCcsIHtcblx0XHRcdGZyb21JbmRleDogdGhpcy5kcmFnZ2luZyxcblx0XHRcdHRvSW5kZXg6IHRvSW5kZXhcblx0XHR9KTtcblx0fVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFdlYXZlSGVhZGVyczsiLCJjb25zdFxuXHRSZWFjdCA9IHJlcXVpcmUoJ3ByZWFjdCcpLFxuXG5cdEJpbmQgPSByZXF1aXJlKCcuLi9iaW5kLmpzJyksXG5cblx0U2xpY2VWaWV3ID0gcmVxdWlyZSgnLi9TbGljZVZpZXcuanMnKSxcblx0V2VhdmVIZWFkZXJzID0gcmVxdWlyZSgnLi9XZWF2ZUhlYWRlcnMuanMnKSxcblx0V2VhdmVCYWNrZ3JvdW5kID0gcmVxdWlyZSgnLi9XZWF2ZUJhY2tncm91bmQuanMnKSxcblx0UHJvamVjdE1vZGFsID0gcmVxdWlyZSgnLi9Qcm9qZWN0TW9kYWwuanMnKSxcblxuXHRTdHlsZSA9IHtcblx0XHR3ZWF2ZToge1xuXHRcdFx0bWFyZ2luTGVmdDogJzdyZW0nLFxuXHRcdFx0ZGlzcGxheTogJ2lubGluZS1mbGV4J1xuXHRcdH0sXG5cdFx0c2NlbmVzOiB7XG5cdFx0XHRtYXJnaW5Ub3A6ICcycmVtJyxcblx0XHRcdGRpc3BsYXk6ICdmbGV4Jyxcblx0XHRcdGp1c3RpZnlDb250ZW50OiAnZmxleC1zdGFydCcsXG5cdFx0XHRhbGlnbkl0ZW1zOiAnZmxleC1zdGFydCdcblx0XHR9LFxuXHRcdHByb2plY3RCdXR0b246IHtcblx0XHRcdHpJbmRleDogMjIsXG5cdFx0XHRtaW5IZWlnaHQ6ICcyLjVyZW0nLFxuXHRcdFx0cGFkZGluZzogJzAuNXJlbSAwLjc1cmVtJyxcblx0XHRcdHdpZHRoOiAnN3JlbScsXG5cdFx0XHRwb3NpdGlvbjogJ2ZpeGVkJyxcblx0XHRcdGxlZnQ6IDAsXG5cblx0XHRcdG91dGxpbmU6ICdub25lJyxcblx0XHRcdGJhY2tncm91bmRDb2xvcjogJyMwMDAwMDAnLFxuXG5cdFx0XHRib3JkZXI6ICdub25lJyxcblx0XHRcdGJvcmRlckJvdHRvbTogJ3RoaW4gc29saWQgIzc3NycsXG5cblx0XHRcdGNvbG9yOiAnI2ZmZicsXG5cdFx0XHRmb250U2l6ZTogJzEuMnJlbScsXG5cblx0XHRcdGN1cnNvcjogJ3BvaW50ZXInXG5cdFx0fVxuXHR9O1xuIFxuY2xhc3MgV2VhdmVWaWV3IGV4dGVuZHMgUmVhY3QuQ29tcG9uZW50IHtcblx0Y29uc3RydWN0b3IocHJvcHMsIGNvbnRleHQpIHtcblx0XHRzdXBlcihwcm9wcywgY29udGV4dCk7XG5cblx0XHR0aGlzLnN0YXRlID0ge1xuXHRcdFx0c2VsZWN0aW9uOiBudWxsLFxuXHRcdFx0cHJvamVjdE1vZGFsOiBmYWxzZVxuXHRcdH1cblxuXHRcdHRoaXMuYWxsb3dEZXNlbGVjdCA9IHRydWU7XG5cblx0XHRCaW5kKHRoaXMpO1xuXHR9XG5cblx0cmVuZGVyKHByb3BzLCBzdGF0ZSkge1xuXHRcdHJldHVybiAoXG5cdFx0XHQ8ZGl2XG5cdFx0XHRcdGRhdGEtaXM9XCJXZWF2ZVZpZXdcIlxuXHRcdFx0XHRzdHlsZT17U3R5bGUud2VhdmV9XG5cdFx0XHRcdG9uY2xpY2s9e3RoaXMub25EZXNlbGVjdH1cblx0XHRcdD5cblx0XHRcdFx0PFdlYXZlSGVhZGVyc1xuXHRcdFx0XHRcdHNsaWNlcz17cHJvcHMucHJvamVjdC5zbGljZXN9XG5cdFx0XHRcdFx0dGhyZWFkcz17cHJvcHMucHJvamVjdC50aHJlYWRzfVxuXHRcdFx0XHRcdHdpbmRvd1dpZHRoPXtwcm9wcy53aW5kb3dXaWR0aH1cblx0XHRcdFx0Lz5cblx0XHRcdFx0PFdlYXZlQmFja2dyb3VuZFxuXHRcdFx0XHRcdHNsaWNlcz17cHJvcHMucHJvamVjdC5zbGljZXMubGVuZ3RofVxuXHRcdFx0XHRcdHRocmVhZHM9e3Byb3BzLnByb2plY3QudGhyZWFkc31cblx0XHRcdFx0Lz5cblx0XHRcdFx0PGRpdiBkYXRhLWlzPVwiV2VhdmVcIiBzdHlsZT17U3R5bGUuc2NlbmVzfT5cblx0XHRcdFx0XHR7cHJvcHMucHJvamVjdC5zbGljZXMubWFwKChzbGljZSwgaSkgPT5cblx0XHRcdFx0XHRcdDxTbGljZVZpZXdcblx0XHRcdFx0XHRcdFx0aWQ9e2l9XG5cdFx0XHRcdFx0XHRcdHNlbGVjdGlvbj17KHN0YXRlLnNlbGVjdGlvbiAmJiBzdGF0ZS5zZWxlY3Rpb24uc2xpY2VJbmRleCA9PT0gaSkgPyBzdGF0ZS5zZWxlY3Rpb24gOiBudWxsfVxuXHRcdFx0XHRcdFx0XHRzbGljZT17c2xpY2V9XG5cdFx0XHRcdFx0XHRcdHRocmVhZHM9e3Byb3BzLnByb2plY3QudGhyZWFkc31cblx0XHRcdFx0XHRcdFx0b25TZWxlY3Q9e3RoaXMub25TZWxlY3R9XG5cdFx0XHRcdFx0XHRcdG9uRGVzZWxlY3Q9e3RoaXMub25EZXNlbGVjdH1cblx0XHRcdFx0XHRcdFx0ZWRpdE5vdGU9e3Byb3BzLmVkaXROb3RlfVxuXHRcdFx0XHRcdFx0XHRvbkRyYWc9e3RoaXMub25Ob3RlRHJhZ31cblx0XHRcdFx0XHRcdFx0b25Ecm9wPXt0aGlzLm9uTm90ZURyb3B9XG5cdFx0XHRcdFx0XHRcdGhlYWRlcj17cHJvcHMucHJvamVjdC5oZWFkZXJzW2ldfVxuXHRcdFx0XHRcdFx0Lz5cblx0XHRcdFx0XHQpfVxuXHRcdFx0XHQ8L2Rpdj5cblx0XHRcdFx0eyghc3RhdGUucHJvamVjdE1vZGFsID9cblx0XHRcdFx0XHQ8YnV0dG9uXG5cdFx0XHRcdFx0XHRzdHlsZT17U3R5bGUucHJvamVjdEJ1dHRvbn1cblx0XHRcdFx0XHRcdG9uQ2xpY2s9eygpID0+IHRoaXMuc2V0U3RhdGUoeyBwcm9qZWN0TW9kYWw6IHRydWUgfSl9XG5cdFx0XHRcdFx0PlxuXHRcdFx0XHRcdFx0e3Byb3BzLnByb2plY3QudGl0bGUubGVuZ3RoID8gcHJvcHMucHJvamVjdC50aXRsZSA6ICdQcm9qZWN0IFRpdGxlJ31cblx0XHRcdFx0XHQ8L2J1dHRvbj5cblx0XHRcdFx0OlxuXHRcdFx0XHRcdDxQcm9qZWN0TW9kYWxcblx0XHRcdFx0XHRcdHRpdGxlPXtwcm9wcy5wcm9qZWN0LnRpdGxlfVxuXHRcdFx0XHRcdFx0YXV0aG9yPXtwcm9wcy5wcm9qZWN0LmF1dGhvcn1cblx0XHRcdFx0XHRcdGZ1bmN0aW9ucz17cHJvcHMucHJvamVjdEZ1bmNzfVxuXHRcdFx0XHRcdFx0b25Eb25lPXsoKSA9PiB0aGlzLnNldFN0YXRlKHsgcHJvamVjdE1vZGFsOiBmYWxzZSB9KX1cblx0XHRcdFx0XHQvPlxuXHRcdFx0XHQpfVxuXHRcdFx0PC9kaXY+XG5cdFx0KVxuXHR9XG5cblx0b25TZWxlY3QoY29vcmRzLCBpKSB7XG5cdFx0dGhpcy5zZXRTdGF0ZSh7c2VsZWN0aW9uOiBjb29yZHN9KTtcblx0fVxuXG5cdG9uRGVzZWxlY3QoZXZlbnQpIHtcblx0XHR0aGlzLnNjZW5lRGVzZWxlY3RlZCgpO1xuXHR9XG5cblx0c2NlbmVEZXNlbGVjdGVkKCkge1xuXHRcdGlmICh0aGlzLmFsbG93RGVzZWxlY3QpIHtcblx0XHRcdHRoaXMuc2V0U3RhdGUoe3NlbGVjdGlvbjogbnVsbH0pO1xuXHRcdH1cblx0fVxuXG5cdG9uTm90ZURyYWcoY29vcmRzKSB7XG5cdFx0dGhpcy5kcmFnZ2luZyA9IGNvb3Jkcztcblx0fVxuXG5cdG9uTm90ZURyb3AoY29vcmRzKSB7XG5cdFx0aWYgKHRoaXMuZHJhZ2dpbmcpIHRoaXMuY29udGV4dC5kbygnTU9WRV9OT1RFJywge1xuXHRcdFx0ZnJvbTogdGhpcy5kcmFnZ2luZyxcblx0XHRcdHRvOiBjb29yZHNcblx0XHR9KTtcblx0fVxuXG59XG5cbm1vZHVsZS5leHBvcnRzID0gV2VhdmVWaWV3OyIsIi8vIE9iamVjdC5hc3NpZ24gUE9MWUZJTExcbi8vIHNvdXJjZTogaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvSmF2YVNjcmlwdC9SZWZlcmVuY2UvR2xvYmFsX09iamVjdHMvT2JqZWN0L2Fzc2lnbiNQb2x5ZmlsbFxuLy9cbmlmICh0eXBlb2YgT2JqZWN0LmFzc2lnbiAhPSAnZnVuY3Rpb24nKSB7XG5cdE9iamVjdC5hc3NpZ24gPSBmdW5jdGlvbih0YXJnZXQsIHZhckFyZ3MpIHsgLy8gLmxlbmd0aCBvZiBmdW5jdGlvbiBpcyAyXG5cdFx0J3VzZSBzdHJpY3QnO1xuXHRcdGlmICh0YXJnZXQgPT0gbnVsbCkgeyAvLyBUeXBlRXJyb3IgaWYgdW5kZWZpbmVkIG9yIG51bGxcblx0XHRcdHRocm93IG5ldyBUeXBlRXJyb3IoJ0Nhbm5vdCBjb252ZXJ0IHVuZGVmaW5lZCBvciBudWxsIHRvIG9iamVjdCcpO1xuXHRcdH1cblxuXHRcdHZhciB0byA9IE9iamVjdCh0YXJnZXQpO1xuXG5cdFx0Zm9yICh2YXIgaW5kZXggPSAxOyBpbmRleCA8IGFyZ3VtZW50cy5sZW5ndGg7IGluZGV4KyspIHtcblx0XHRcdHZhciBuZXh0U291cmNlID0gYXJndW1lbnRzW2luZGV4XTtcblxuXHRcdFx0aWYgKG5leHRTb3VyY2UgIT0gbnVsbCkgeyAvLyBTa2lwIG92ZXIgaWYgdW5kZWZpbmVkIG9yIG51bGxcblx0XHRcdFx0Zm9yICh2YXIgbmV4dEtleSBpbiBuZXh0U291cmNlKSB7XG5cdFx0XHRcdFx0Ly8gQXZvaWQgYnVncyB3aGVuIGhhc093blByb3BlcnR5IGlzIHNoYWRvd2VkXG5cdFx0XHRcdFx0aWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChuZXh0U291cmNlLCBuZXh0S2V5KSkge1xuXHRcdFx0XHRcdFx0dG9bbmV4dEtleV0gPSBuZXh0U291cmNlW25leHRLZXldO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gdG87XG5cdH07XG59Il19
