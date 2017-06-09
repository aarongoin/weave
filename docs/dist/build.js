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
    Bind = require('./bind.js'),
    LZW = require('lz-string'),
    Source = require('./Sourcery.js'),
    Actions = require('./actions.js'),
    Style = {
	app: 'width: 100vw;'
},
    THREADS = [{ name: '', color: '#333333' }, { name: '', color: '#666666' }, { name: '', color: '#999999' }, { name: '', color: '#b21f35' }, { name: '', color: '#d82735' }, { name: '', color: '#ff7435' }, { name: '', color: '#ffa135' }, { name: '', color: '#ffcb35' }, { name: '', color: '#00753a' }, { name: '', color: '#009e47' }, { name: '', color: '#16dd36' }, { name: '', color: '#0052a5' }, { name: '', color: '#0079e7' }, { name: '', color: '#06a9fc' }, { name: '', color: '#681e7e' }, { name: '', color: '#7d3cb5' }, { name: '', color: '#bd7af6' }];

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

			project: Source.getLocal('weave-project'),
			store: Source.getLocal('weave-store')
		};

		if (_this.state.project) _this.state.project = JSON.parse(_this.state.project);else _this.state.project = {
			title: 'Welcome to Weave',
			wordCount: 4,
			sceneCount: 1,
			author: 'Aaron Goin'
		};

		if (_this.state.store) _this.state.store = JSON.parse(LZW.decompressFromUTF16(_this.state.store));else _this.state.store = {
			slices: [{ datetime: '1999-10-26', scenes: [{ thread: 0, head: 'Welcome to Weave!', body: 'This is the place!', wc: 4 }] }],
			threads: Object.assign([], THREADS),
			locations: ['Star Labs'],
			layout: [['Chapter One'], [0, 0]]
		};

		Bind(_this);

		_this.state.project = Object.assign(_this.state.project, _this.countProject());
		return _this;
	}

	_createClass(App, [{
		key: 'countProject',
		value: function countProject() {
			return {
				wordCount: this.state.store.slices.reduce(function (wc, slice) {
					return wc + slice.scenes.reduce(function (wc, scene) {
						return scene ? wc + scene.wc : wc;
					}, 0);
				}, 0),
				sceneCount: this.state.store.slices.reduce(function (scenes, slice) {
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
				thread: state.store.threads[state.targetNote.thread],
				onDone: this.onDone
			}) : React.createElement(WeaveView, {
				title: state.project.title,
				author: state.project.author,
				slices: state.store.slices,
				threads: state.store.threads,
				locations: state.store.locations,
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
				slices: state.store.slices,
				threads: state.store.threads,
				cancel: function cancel() {
					return _this2.setState({ isPrinting: false });
				}
			}) : '');
		}
	}, {
		key: 'editNote',
		value: function editNote(coords) {
			this.setState({
				isEditing: true,
				sceneCoords: coords,
				targetNote: this.state.store.slices[coords.sliceIndex].scenes[coords.sceneIndex]
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
			FileSaver.saveAs(new Blob([JSON.stringify(Object.assign({}, this.state.project, this.state.store))], { type: "text/plain;charset=utf-8" }), this.state.project.title + '.weave');
		}
	}, {
		key: 'print',
		value: function print(sceneList) {
			var text,
			    slices = this.state.store.slices;
			this.setState({ printing: false });

			text = sceneList.reduce(function (text, coords, i) {
				return text + '\n\n\n' + i + '\n\n' + slices[coords.sliceIndex].scenes[coords.sceneIndex].body;
			}, this.state.project.title);

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
			this.state.store = Actions[action](data, this.state.store);
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
					sceneCount: 0
				},
				store: {
					slices: [{ datetime: '', scenes: [null] }],
					threads: Object.assign([], THREADS),
					locations: [''],
					layout: [['Chapter One'], [0, 0]]
				}
			});
			this.save();
		}
	}, {
		key: 'openProject',
		value: function openProject(data) {
			data = JSON.parse(data);
			this.setState({
				project: { title: data.title, wordCount: data.wordCount, sceneCount: data.sceneCount, author: data.author },
				store: { slices: data.scenes, threads: data.threads, locations: data.locations }
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
			var _this3 = this;

			return {
				thread: function thread(index) {
					return _this3.state.store.threads[index];
				},
				do: this.do
			};
		}
	}]);

	return App;
}(React.Component);

React.options.debounceRendering = window.requestAnimationFrame;

React.render(React.createElement(App, null), document.body);

},{"./Sourcery.js":5,"./actions.js":6,"./assert.js":7,"./bind.js":8,"./components/FileOpener.js":13,"./components/PrintModal.js":16,"./components/SceneWriter.js":19,"./components/WeaveView.js":25,"./polyfills.js":26,"file-saver":1,"lz-string":2,"preact":3}],5:[function(require,module,exports){
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
		store.slices.splice(action.atIndex, 0, {
			datetime: '',
			scenes: store.locations.map(function () {
				return null;
			})
		});
		return store;
	},
	DELETE_SLICE: function DELETE_SLICE(action, store) {
		store.slices = Object.assign([], store.slices);
		action.slice = store.slices.splice(action.atIndex, 1);
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
	MODIFY_NOTE_THREAD: function MODIFY_NOTE_THREAD(action, store) {
		var scene;
		store.slices = Object.assign([], store.slices);
		scene = store.slices[action.sliceIndex].scenes[action.sceneIndex];
		if (++scene.thread === store.threads.length) scene.thread = 0;
		return store;
	},
	MOVE_NOTE: function MOVE_NOTE(action, store) {
		store.slices = Object.assign([], store.slices);
		store.slices[action.to.sliceIndex].scenes[action.to.sceneIndex] = store.slices[action.from.sliceIndex].scenes[action.from.sceneIndex];
		store.slices[action.from.sliceIndex].scenes[action.from.sceneIndex] = null;
		return store;
	},

	// LOCATION ACTIONS
	NEW_LOCATION: function NEW_LOCATION(action, store) {
		var i = store.slices.length;
		store.locations = Object.assign([], store.locations);
		store.slices = Object.assign([], store.slices);
		store.locations.push('');
		while (i--) {
			store.slices[i].scenes.push(null);
		}return store;
	},
	DELETE_LOCATION: function DELETE_LOCATION(action, store) {
		var i = store.slices.length;
		store.locations = Object.assign([], store.locations);
		store.slices = Object.assign([], store.slices);
		action.location = store.locations.splice(action.atIndex, 1);
		while (i--) {
			store.slices[i].scenes.splice(action.atIndex, 1);
		}return store;
	},
	MOVE_LOCATION: function MOVE_LOCATION(action, store) {
		var i = store.slices.length,
		    scenes;
		store.locations = Object.assign([], store.locations);
		store.slices = Object.assign([], store.slices);
		store.locations.splice(action.toIndex, 0, store.locations.splice(action.fromIndex, 1)[0]);
		while (i--) {
			scenes = store.slices[i].scenes;
			scenes.splice(action.toIndex, 0, scenes.splice(action.fromIndex, 1)[0]);
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
			return props.value !== this.props.value || state.value !== this.state.value;
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

var LocationHeader = function (_React$Component) {
	_inherits(LocationHeader, _React$Component);

	function LocationHeader(props, context) {
		_classCallCheck(this, LocationHeader);

		var _this = _possibleConstructorReturn(this, (LocationHeader.__proto__ || Object.getPrototypeOf(LocationHeader)).call(this, props, context));

		_this.state = {
			value: props.value,
			selected: false
		};

		Bind(_this);
		return _this;
	}

	_createClass(LocationHeader, [{
		key: 'shouldComponentUpdate',
		value: function shouldComponentUpdate(props, state) {
			return props.value !== this.props.value || state.value !== this.state.value || state.selected !== this.state.selected;
		}
	}, {
		key: 'componentWillReceiveProps',
		value: function componentWillReceiveProps(props) {
			this.setState({ value: props.value, selected: false });
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
					return props.onDrag(props.id);
				}
			}, React.createElement(ExpandingTextarea, {
				type: 'text',
				style: Style.locationHeader,
				maxLength: '24',
				baseHeight: '0.9rem',
				value: state.value,
				placeholder: 'place',
				focus: this.onFocus,
				blur: this.onBlur,
				input: function input(event) {
					return _this2.setState({ value: event.target.value });
				},
				change: function change(event) {
					return _this2.context.do('MODIFY_LOCATION_NAME', {
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
					return _this2.context.do('DELETE_LOCATION', { atIndex: props.id });
				}
			}) : '');
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
				if (!_this3.delBtn.timer) _this3.setState({ selected: false });
			}, 100);
		}
	}]);

	return LocationHeader;
}(React.Component);

module.exports = LocationHeader;

},{"../bind.js":8,"./DeleteButton.js":11,"./ExpandingTextarea.js":12,"preact":3}],15:[function(require,module,exports){
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
    ModalView = require('./ModalView.js'),
    Bind = require('../bind.js'),
    Style = {
	scene: {
		display: 'flex',
		justifyContent: 'flex-start',
		fontSize: '0.9rem',
		alignItems: 'center',
		padding: '0.5rem',
		margin: '0.5rem 0.5rem'
	},
	span: {
		width: '9rem',
		marginRight: '1rem',
		whiteSpace: 'nowrap',
		overflow: 'hidden',
		textOverflow: 'ellipsis'
	},
	row: {
		display: 'flex',
		justifyContent: 'flex-start',
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
			printList: []
		};

		Bind(_this);
		return _this;
	}

	_createClass(PrintModal, [{
		key: 'render',
		value: function render(props, state) {
			var _this2 = this;

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
			}, props.slices.reduce(function (slices, slice) {
				var scenes = slice.scenes.reduce(function (scenes, scene) {
					if (scene && state.threads.indexOf(scene.thread) !== -1) {
						return scenes.concat([React.createElement('div', {
							style: Object.assign({}, Style.scene, {
								color: '#fff',
								backgroundColor: props.threads[scene.thread].color
							})
						}, React.createElement('span', {
							style: Style.span
						}, scene.head), React.createElement('span', null, scene.wc + ' words'))]);
					} else return scenes;
				}, []);

				if (scenes.length) {
					scenes.unshift(React.createElement('span', { style: Style.date }, slice.datetime));
					return slices.concat([React.createElement('div', {
						style: Style.row
					}, scenes)]);
				} else return slices;
			}, [])), React.createElement('button', {
				style: Style.item,
				onClick: function onClick() {
					props.cancel();
				}
			}, 'print'));
		}
	}, {
		key: 'filter',
		value: function filter(event) {
			var id = Number(event.target.dataset.id),
			    i = this.state.threads.indexOf(id);

			if (i === -1) this.state.threads.push(id);else this.state.threads.splice(i, 1);

			this.setState({ filtered: [] });
		}
	}]);

	return PrintModal;
}(React.Component);

module.exports = PrintModal;

},{"../bind.js":8,"./ModalView.js":15,"preact":3}],17:[function(require,module,exports){
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

},{"./ModalView.js":15,"preact":3}],18:[function(require,module,exports){
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
				oninput: this.onInput,
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
			}, 'edit'), React.createElement('span', { style: Style.wordcount }, props.scene.wc, ' words')] : [React.createElement('button', {
				style: Style.colorButton,
				onClick: function onClick() {
					return _this2.context.do('MODIFY_NOTE_THREAD', {
						sliceIndex: props.sliceIndex,
						sceneIndex: props.sceneIndex
					});
				}
			}), React.createElement(ThreadLabel, {
				value: props.thread.name,
				onChange: function onChange(e) {
					return _this2.context.do('MODIFY_THREAD_NAME', {
						atIndex: props.scene.thread,
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

},{"../bind.js":8,"../colors.js":9,"./DeleteButton.js":11,"./ExpandingTextarea.js":12,"./ThreadLabel.js":22,"preact":3}],19:[function(require,module,exports){
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

},{"../bind.js":8,"./AppMenu.js":10,"./ExpandingTextarea.js":12,"./ThreadLabel.js":22,"preact":3}],20:[function(require,module,exports){
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
				if (!_this3.delBtn.timer) _this3.setState({ selected: false });
			}, 100);
		}
	}]);

	return SliceHeader;
}(React.Component);

module.exports = SliceHeader;

},{"../bind.js":8,"./DeleteButton.js":11,"preact":3}],21:[function(require,module,exports){
'use strict';

var React = require('preact'),
    SceneEditor = require('./SceneEditor.js'),
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

	return React.createElement('div', { style: Style.slice }, props.slice.scenes.map(function (scene, i) {
		if (scene) return React.createElement('div', { style: Style.space }, React.createElement(SceneEditor, {
			sliceIndex: props.id,
			selected: props.selection && props.selection.sceneIndex === i,
			sceneIndex: i,
			scene: scene,
			thread: props.threads[scene.thread],
			onSelect: props.onSelect,
			onDeselect: props.onDeselect,
			onEdit: props.editNote,
			moveNote: props.moveNote,
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
	}));
};

},{"./SceneEditor.js":18,"preact":3}],22:[function(require,module,exports){
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

},{"preact":3}],23:[function(require,module,exports){
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
			return props.menuOffset !== this.props.menuOffset || props.locations !== this.props.locations || props.slices !== this.props.slices;
		}
	}, {
		key: 'render',
		value: function render(props, state) {
			return React.createElement('div', {
				'data-is': 'WeaveBackground',
				style: Object.assign({}, Style.outer, {
					top: props.menuOffset,
					width: props.slices * 18 + 2 + 'rem',
					height: props.locations * 14 + 16 + 'rem'
				})
			}, React.createElement('div', { style: Style.inner }, Array(props.locations).fill(0).map(function (v, i) {
				return React.createElement('div', { style: Style.location }, '\xA0');
			})), React.createElement('div', { style: Style.inner }, Array(props.slices).fill(0).map(function (v, i) {
				return React.createElement('div', { style: Style.slice }, '\xA0');
			})));
		}
	}]);

	return WeaveBackground;
}(React.Component);

module.exports = WeaveBackground;

},{"preact":3}],24:[function(require,module,exports){
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
    Bind = require('../bind.js'),
    Style = {
	outer: {
		position: 'absolute',
		left: 0,
		minWidth: '100vw',
		minHeight: '100vh'
	},
	locations: {
		position: 'absolute',
		top: '0.25rem',
		width: '7rem',
		minHeight: '100vh',
		paddingTop: '2rem'
	},
	location: {
		display: 'flex',
		flexDirection: 'column',
		justifyContent: 'flex-end',
		position: 'relative',
		height: '14rem'
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
			return props.windowWidth !== this.props.windowWidth || props.locations !== this.props.locations || props.slices !== this.props.slices || state !== this.state;
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
				'data-is': 'LocationHeaders',
				style: Object.assign({}, Style.locations, {
					left: state.x,
					height: props.locations.length * 14 + 16 + 'rem',
					backgroundColor: props.windowWidth < 700 ? 'rgba(0,0,0,0)' : '#111',
					zIndex: props.windowWidth < 700 ? 8 : 10 })
			}, props.locations.map(function (location, i) {
				return React.createElement(LocationHeader, {
					id: i,
					value: location,
					onDrag: function onDrag(id) {
						return _this2.dragging = id;
					},
					onDrop: _this2.onLocationDrop
				});
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
	}, {
		key: 'onLocationDrop',
		value: function onLocationDrop(toIndex) {
			this.context.do('MOVE_LOCATION', {
				fromIndex: this.dragging,
				toIndex: toIndex
			});
		}
	}]);

	return WeaveHeaders;
}(React.Component);

module.exports = WeaveHeaders;

},{"../bind.js":8,"./LocationHeader.js":14,"./SliceHeader.js":20,"preact":3}],25:[function(require,module,exports){
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
				slices: props.slices,
				locations: props.locations,
				windowWidth: props.windowWidth
			}), React.createElement(WeaveBackground, {
				slices: props.slices.length,
				locations: props.locations.length
			}), React.createElement('div', { 'data-is': 'Weave', style: Style.scenes }, props.slices.map(function (slice, i) {
				return React.createElement(SliceView, {
					id: i,
					selection: state.selection && state.selection.sliceIndex === i ? state.selection : null,
					slice: slice,
					threads: props.threads,
					onSelect: _this2.onSelect,
					onDeselect: _this2.onDeselect,
					editNote: props.editNote,
					onDrag: _this2.onNoteDrag,
					onDrop: _this2.onNoteDrop
				});
			})), !state.projectModal ? React.createElement('button', {
				style: Style.projectButton,
				onClick: function onClick() {
					return _this2.setState({ projectModal: true });
				}
			}, props.title) : React.createElement(ProjectModal, {
				title: props.title,
				author: props.author,
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

},{"../bind.js":8,"./ProjectModal.js":17,"./SliceView.js":21,"./WeaveBackground.js":23,"./WeaveHeaders.js":24,"preact":3}],26:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvZmlsZS1zYXZlci9GaWxlU2F2ZXIuanMiLCJub2RlX21vZHVsZXMvbHotc3RyaW5nL2xpYnMvbHotc3RyaW5nLmpzIiwibm9kZV9tb2R1bGVzL3ByZWFjdC9kaXN0L3ByZWFjdC5qcyIsInNyYy9BcHAuanMiLCJzcmMvU291cmNlcnkuanMiLCJzcmMvYWN0aW9ucy5qcyIsInNyYy9hc3NlcnQuanMiLCJzcmMvYmluZC5qcyIsInNyYy9jb2xvcnMuanMiLCJzcmMvY29tcG9uZW50cy9BcHBNZW51LmpzIiwic3JjL2NvbXBvbmVudHMvRGVsZXRlQnV0dG9uLmpzIiwic3JjL2NvbXBvbmVudHMvRXhwYW5kaW5nVGV4dGFyZWEuanMiLCJzcmMvY29tcG9uZW50cy9GaWxlT3BlbmVyLmpzIiwic3JjL2NvbXBvbmVudHMvTG9jYXRpb25IZWFkZXIuanMiLCJzcmMvY29tcG9uZW50cy9Nb2RhbFZpZXcuanMiLCJzcmMvY29tcG9uZW50cy9QcmludE1vZGFsLmpzIiwic3JjL2NvbXBvbmVudHMvUHJvamVjdE1vZGFsLmpzIiwic3JjL2NvbXBvbmVudHMvU2NlbmVFZGl0b3IuanMiLCJzcmMvY29tcG9uZW50cy9TY2VuZVdyaXRlci5qcyIsInNyYy9jb21wb25lbnRzL1NsaWNlSGVhZGVyLmpzIiwic3JjL2NvbXBvbmVudHMvU2xpY2VWaWV3LmpzIiwic3JjL2NvbXBvbmVudHMvVGhyZWFkTGFiZWwuanMiLCJzcmMvY29tcG9uZW50cy9XZWF2ZUJhY2tncm91bmQuanMiLCJzcmMvY29tcG9uZW50cy9XZWF2ZUhlYWRlcnMuanMiLCJzcmMvY29tcG9uZW50cy9XZWF2ZVZpZXcuanMiLCJzcmMvcG9seWZpbGxzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7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O0FBRUQ7O01BQUksS0FBSyxPQUFULEFBQVMsQUFBTyxBQUVoQjs7T0FBSyxJQUFJLFFBQVQsQUFBaUIsR0FBRyxRQUFRLFVBQTVCLEFBQXNDLFFBQXRDLEFBQThDLFNBQVMsQUFDdEQ7T0FBSSxhQUFhLFVBQWpCLEFBQWlCLEFBQVUsQUFFM0I7O09BQUksY0FBSixBQUFrQixNQUFNLEFBQUU7QUFDekI7U0FBSyxJQUFMLEFBQVMsV0FBVCxBQUFvQixZQUFZLEFBQy9CO0FBQ0E7U0FBSSxPQUFBLEFBQU8sVUFBUCxBQUFpQixlQUFqQixBQUFnQyxLQUFoQyxBQUFxQyxZQUF6QyxBQUFJLEFBQWlELFVBQVUsQUFDOUQ7U0FBQSxBQUFHLFdBQVcsV0FBZCxBQUFjLEFBQVcsQUFDekI7QUFDRDtBQUNEO0FBQ0Q7QUFDRDtTQUFBLEFBQU8sQUFDUDtBQXJCRCxBQXNCQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvKiBGaWxlU2F2ZXIuanNcbiAqIEEgc2F2ZUFzKCkgRmlsZVNhdmVyIGltcGxlbWVudGF0aW9uLlxuICogMS4zLjJcbiAqIDIwMTYtMDYtMTYgMTg6MjU6MTlcbiAqXG4gKiBCeSBFbGkgR3JleSwgaHR0cDovL2VsaWdyZXkuY29tXG4gKiBMaWNlbnNlOiBNSVRcbiAqICAgU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9lbGlncmV5L0ZpbGVTYXZlci5qcy9ibG9iL21hc3Rlci9MSUNFTlNFLm1kXG4gKi9cblxuLypnbG9iYWwgc2VsZiAqL1xuLypqc2xpbnQgYml0d2lzZTogdHJ1ZSwgaW5kZW50OiA0LCBsYXhicmVhazogdHJ1ZSwgbGF4Y29tbWE6IHRydWUsIHNtYXJ0dGFiczogdHJ1ZSwgcGx1c3BsdXM6IHRydWUgKi9cblxuLyohIEBzb3VyY2UgaHR0cDovL3B1cmwuZWxpZ3JleS5jb20vZ2l0aHViL0ZpbGVTYXZlci5qcy9ibG9iL21hc3Rlci9GaWxlU2F2ZXIuanMgKi9cblxudmFyIHNhdmVBcyA9IHNhdmVBcyB8fCAoZnVuY3Rpb24odmlldykge1xuXHRcInVzZSBzdHJpY3RcIjtcblx0Ly8gSUUgPDEwIGlzIGV4cGxpY2l0bHkgdW5zdXBwb3J0ZWRcblx0aWYgKHR5cGVvZiB2aWV3ID09PSBcInVuZGVmaW5lZFwiIHx8IHR5cGVvZiBuYXZpZ2F0b3IgIT09IFwidW5kZWZpbmVkXCIgJiYgL01TSUUgWzEtOV1cXC4vLnRlc3QobmF2aWdhdG9yLnVzZXJBZ2VudCkpIHtcblx0XHRyZXR1cm47XG5cdH1cblx0dmFyXG5cdFx0ICBkb2MgPSB2aWV3LmRvY3VtZW50XG5cdFx0ICAvLyBvbmx5IGdldCBVUkwgd2hlbiBuZWNlc3NhcnkgaW4gY2FzZSBCbG9iLmpzIGhhc24ndCBvdmVycmlkZGVuIGl0IHlldFxuXHRcdCwgZ2V0X1VSTCA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIHZpZXcuVVJMIHx8IHZpZXcud2Via2l0VVJMIHx8IHZpZXc7XG5cdFx0fVxuXHRcdCwgc2F2ZV9saW5rID0gZG9jLmNyZWF0ZUVsZW1lbnROUyhcImh0dHA6Ly93d3cudzMub3JnLzE5OTkveGh0bWxcIiwgXCJhXCIpXG5cdFx0LCBjYW5fdXNlX3NhdmVfbGluayA9IFwiZG93bmxvYWRcIiBpbiBzYXZlX2xpbmtcblx0XHQsIGNsaWNrID0gZnVuY3Rpb24obm9kZSkge1xuXHRcdFx0dmFyIGV2ZW50ID0gbmV3IE1vdXNlRXZlbnQoXCJjbGlja1wiKTtcblx0XHRcdG5vZGUuZGlzcGF0Y2hFdmVudChldmVudCk7XG5cdFx0fVxuXHRcdCwgaXNfc2FmYXJpID0gL2NvbnN0cnVjdG9yL2kudGVzdCh2aWV3LkhUTUxFbGVtZW50KSB8fCB2aWV3LnNhZmFyaVxuXHRcdCwgaXNfY2hyb21lX2lvcyA9L0NyaU9TXFwvW1xcZF0rLy50ZXN0KG5hdmlnYXRvci51c2VyQWdlbnQpXG5cdFx0LCB0aHJvd19vdXRzaWRlID0gZnVuY3Rpb24oZXgpIHtcblx0XHRcdCh2aWV3LnNldEltbWVkaWF0ZSB8fCB2aWV3LnNldFRpbWVvdXQpKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHR0aHJvdyBleDtcblx0XHRcdH0sIDApO1xuXHRcdH1cblx0XHQsIGZvcmNlX3NhdmVhYmxlX3R5cGUgPSBcImFwcGxpY2F0aW9uL29jdGV0LXN0cmVhbVwiXG5cdFx0Ly8gdGhlIEJsb2IgQVBJIGlzIGZ1bmRhbWVudGFsbHkgYnJva2VuIGFzIHRoZXJlIGlzIG5vIFwiZG93bmxvYWRmaW5pc2hlZFwiIGV2ZW50IHRvIHN1YnNjcmliZSB0b1xuXHRcdCwgYXJiaXRyYXJ5X3Jldm9rZV90aW1lb3V0ID0gMTAwMCAqIDQwIC8vIGluIG1zXG5cdFx0LCByZXZva2UgPSBmdW5jdGlvbihmaWxlKSB7XG5cdFx0XHR2YXIgcmV2b2tlciA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRpZiAodHlwZW9mIGZpbGUgPT09IFwic3RyaW5nXCIpIHsgLy8gZmlsZSBpcyBhbiBvYmplY3QgVVJMXG5cdFx0XHRcdFx0Z2V0X1VSTCgpLnJldm9rZU9iamVjdFVSTChmaWxlKTtcblx0XHRcdFx0fSBlbHNlIHsgLy8gZmlsZSBpcyBhIEZpbGVcblx0XHRcdFx0XHRmaWxlLnJlbW92ZSgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9O1xuXHRcdFx0c2V0VGltZW91dChyZXZva2VyLCBhcmJpdHJhcnlfcmV2b2tlX3RpbWVvdXQpO1xuXHRcdH1cblx0XHQsIGRpc3BhdGNoID0gZnVuY3Rpb24oZmlsZXNhdmVyLCBldmVudF90eXBlcywgZXZlbnQpIHtcblx0XHRcdGV2ZW50X3R5cGVzID0gW10uY29uY2F0KGV2ZW50X3R5cGVzKTtcblx0XHRcdHZhciBpID0gZXZlbnRfdHlwZXMubGVuZ3RoO1xuXHRcdFx0d2hpbGUgKGktLSkge1xuXHRcdFx0XHR2YXIgbGlzdGVuZXIgPSBmaWxlc2F2ZXJbXCJvblwiICsgZXZlbnRfdHlwZXNbaV1dO1xuXHRcdFx0XHRpZiAodHlwZW9mIGxpc3RlbmVyID09PSBcImZ1bmN0aW9uXCIpIHtcblx0XHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdFx0bGlzdGVuZXIuY2FsbChmaWxlc2F2ZXIsIGV2ZW50IHx8IGZpbGVzYXZlcik7XG5cdFx0XHRcdFx0fSBjYXRjaCAoZXgpIHtcblx0XHRcdFx0XHRcdHRocm93X291dHNpZGUoZXgpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0XHQsIGF1dG9fYm9tID0gZnVuY3Rpb24oYmxvYikge1xuXHRcdFx0Ly8gcHJlcGVuZCBCT00gZm9yIFVURi04IFhNTCBhbmQgdGV4dC8qIHR5cGVzIChpbmNsdWRpbmcgSFRNTClcblx0XHRcdC8vIG5vdGU6IHlvdXIgYnJvd3NlciB3aWxsIGF1dG9tYXRpY2FsbHkgY29udmVydCBVVEYtMTYgVStGRUZGIHRvIEVGIEJCIEJGXG5cdFx0XHRpZiAoL15cXHMqKD86dGV4dFxcL1xcUyp8YXBwbGljYXRpb25cXC94bWx8XFxTKlxcL1xcUypcXCt4bWwpXFxzKjsuKmNoYXJzZXRcXHMqPVxccyp1dGYtOC9pLnRlc3QoYmxvYi50eXBlKSkge1xuXHRcdFx0XHRyZXR1cm4gbmV3IEJsb2IoW1N0cmluZy5mcm9tQ2hhckNvZGUoMHhGRUZGKSwgYmxvYl0sIHt0eXBlOiBibG9iLnR5cGV9KTtcblx0XHRcdH1cblx0XHRcdHJldHVybiBibG9iO1xuXHRcdH1cblx0XHQsIEZpbGVTYXZlciA9IGZ1bmN0aW9uKGJsb2IsIG5hbWUsIG5vX2F1dG9fYm9tKSB7XG5cdFx0XHRpZiAoIW5vX2F1dG9fYm9tKSB7XG5cdFx0XHRcdGJsb2IgPSBhdXRvX2JvbShibG9iKTtcblx0XHRcdH1cblx0XHRcdC8vIEZpcnN0IHRyeSBhLmRvd25sb2FkLCB0aGVuIHdlYiBmaWxlc3lzdGVtLCB0aGVuIG9iamVjdCBVUkxzXG5cdFx0XHR2YXJcblx0XHRcdFx0ICBmaWxlc2F2ZXIgPSB0aGlzXG5cdFx0XHRcdCwgdHlwZSA9IGJsb2IudHlwZVxuXHRcdFx0XHQsIGZvcmNlID0gdHlwZSA9PT0gZm9yY2Vfc2F2ZWFibGVfdHlwZVxuXHRcdFx0XHQsIG9iamVjdF91cmxcblx0XHRcdFx0LCBkaXNwYXRjaF9hbGwgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRkaXNwYXRjaChmaWxlc2F2ZXIsIFwid3JpdGVzdGFydCBwcm9ncmVzcyB3cml0ZSB3cml0ZWVuZFwiLnNwbGl0KFwiIFwiKSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0Ly8gb24gYW55IGZpbGVzeXMgZXJyb3JzIHJldmVydCB0byBzYXZpbmcgd2l0aCBvYmplY3QgVVJMc1xuXHRcdFx0XHQsIGZzX2Vycm9yID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0aWYgKChpc19jaHJvbWVfaW9zIHx8IChmb3JjZSAmJiBpc19zYWZhcmkpKSAmJiB2aWV3LkZpbGVSZWFkZXIpIHtcblx0XHRcdFx0XHRcdC8vIFNhZmFyaSBkb2Vzbid0IGFsbG93IGRvd25sb2FkaW5nIG9mIGJsb2IgdXJsc1xuXHRcdFx0XHRcdFx0dmFyIHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKCk7XG5cdFx0XHRcdFx0XHRyZWFkZXIub25sb2FkZW5kID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRcdHZhciB1cmwgPSBpc19jaHJvbWVfaW9zID8gcmVhZGVyLnJlc3VsdCA6IHJlYWRlci5yZXN1bHQucmVwbGFjZSgvXmRhdGE6W147XSo7LywgJ2RhdGE6YXR0YWNobWVudC9maWxlOycpO1xuXHRcdFx0XHRcdFx0XHR2YXIgcG9wdXAgPSB2aWV3Lm9wZW4odXJsLCAnX2JsYW5rJyk7XG5cdFx0XHRcdFx0XHRcdGlmKCFwb3B1cCkgdmlldy5sb2NhdGlvbi5ocmVmID0gdXJsO1xuXHRcdFx0XHRcdFx0XHR1cmw9dW5kZWZpbmVkOyAvLyByZWxlYXNlIHJlZmVyZW5jZSBiZWZvcmUgZGlzcGF0Y2hpbmdcblx0XHRcdFx0XHRcdFx0ZmlsZXNhdmVyLnJlYWR5U3RhdGUgPSBmaWxlc2F2ZXIuRE9ORTtcblx0XHRcdFx0XHRcdFx0ZGlzcGF0Y2hfYWxsKCk7XG5cdFx0XHRcdFx0XHR9O1xuXHRcdFx0XHRcdFx0cmVhZGVyLnJlYWRBc0RhdGFVUkwoYmxvYik7XG5cdFx0XHRcdFx0XHRmaWxlc2F2ZXIucmVhZHlTdGF0ZSA9IGZpbGVzYXZlci5JTklUO1xuXHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHQvLyBkb24ndCBjcmVhdGUgbW9yZSBvYmplY3QgVVJMcyB0aGFuIG5lZWRlZFxuXHRcdFx0XHRcdGlmICghb2JqZWN0X3VybCkge1xuXHRcdFx0XHRcdFx0b2JqZWN0X3VybCA9IGdldF9VUkwoKS5jcmVhdGVPYmplY3RVUkwoYmxvYik7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmIChmb3JjZSkge1xuXHRcdFx0XHRcdFx0dmlldy5sb2NhdGlvbi5ocmVmID0gb2JqZWN0X3VybDtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0dmFyIG9wZW5lZCA9IHZpZXcub3BlbihvYmplY3RfdXJsLCBcIl9ibGFua1wiKTtcblx0XHRcdFx0XHRcdGlmICghb3BlbmVkKSB7XG5cdFx0XHRcdFx0XHRcdC8vIEFwcGxlIGRvZXMgbm90IGFsbG93IHdpbmRvdy5vcGVuLCBzZWUgaHR0cHM6Ly9kZXZlbG9wZXIuYXBwbGUuY29tL2xpYnJhcnkvc2FmYXJpL2RvY3VtZW50YXRpb24vVG9vbHMvQ29uY2VwdHVhbC9TYWZhcmlFeHRlbnNpb25HdWlkZS9Xb3JraW5nd2l0aFdpbmRvd3NhbmRUYWJzL1dvcmtpbmd3aXRoV2luZG93c2FuZFRhYnMuaHRtbFxuXHRcdFx0XHRcdFx0XHR2aWV3LmxvY2F0aW9uLmhyZWYgPSBvYmplY3RfdXJsO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRmaWxlc2F2ZXIucmVhZHlTdGF0ZSA9IGZpbGVzYXZlci5ET05FO1xuXHRcdFx0XHRcdGRpc3BhdGNoX2FsbCgpO1xuXHRcdFx0XHRcdHJldm9rZShvYmplY3RfdXJsKTtcblx0XHRcdFx0fVxuXHRcdFx0O1xuXHRcdFx0ZmlsZXNhdmVyLnJlYWR5U3RhdGUgPSBmaWxlc2F2ZXIuSU5JVDtcblxuXHRcdFx0aWYgKGNhbl91c2Vfc2F2ZV9saW5rKSB7XG5cdFx0XHRcdG9iamVjdF91cmwgPSBnZXRfVVJMKCkuY3JlYXRlT2JqZWN0VVJMKGJsb2IpO1xuXHRcdFx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHNhdmVfbGluay5ocmVmID0gb2JqZWN0X3VybDtcblx0XHRcdFx0XHRzYXZlX2xpbmsuZG93bmxvYWQgPSBuYW1lO1xuXHRcdFx0XHRcdGNsaWNrKHNhdmVfbGluayk7XG5cdFx0XHRcdFx0ZGlzcGF0Y2hfYWxsKCk7XG5cdFx0XHRcdFx0cmV2b2tlKG9iamVjdF91cmwpO1xuXHRcdFx0XHRcdGZpbGVzYXZlci5yZWFkeVN0YXRlID0gZmlsZXNhdmVyLkRPTkU7XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdGZzX2Vycm9yKCk7XG5cdFx0fVxuXHRcdCwgRlNfcHJvdG8gPSBGaWxlU2F2ZXIucHJvdG90eXBlXG5cdFx0LCBzYXZlQXMgPSBmdW5jdGlvbihibG9iLCBuYW1lLCBub19hdXRvX2JvbSkge1xuXHRcdFx0cmV0dXJuIG5ldyBGaWxlU2F2ZXIoYmxvYiwgbmFtZSB8fCBibG9iLm5hbWUgfHwgXCJkb3dubG9hZFwiLCBub19hdXRvX2JvbSk7XG5cdFx0fVxuXHQ7XG5cdC8vIElFIDEwKyAobmF0aXZlIHNhdmVBcylcblx0aWYgKHR5cGVvZiBuYXZpZ2F0b3IgIT09IFwidW5kZWZpbmVkXCIgJiYgbmF2aWdhdG9yLm1zU2F2ZU9yT3BlbkJsb2IpIHtcblx0XHRyZXR1cm4gZnVuY3Rpb24oYmxvYiwgbmFtZSwgbm9fYXV0b19ib20pIHtcblx0XHRcdG5hbWUgPSBuYW1lIHx8IGJsb2IubmFtZSB8fCBcImRvd25sb2FkXCI7XG5cblx0XHRcdGlmICghbm9fYXV0b19ib20pIHtcblx0XHRcdFx0YmxvYiA9IGF1dG9fYm9tKGJsb2IpO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIG5hdmlnYXRvci5tc1NhdmVPck9wZW5CbG9iKGJsb2IsIG5hbWUpO1xuXHRcdH07XG5cdH1cblxuXHRGU19wcm90by5hYm9ydCA9IGZ1bmN0aW9uKCl7fTtcblx0RlNfcHJvdG8ucmVhZHlTdGF0ZSA9IEZTX3Byb3RvLklOSVQgPSAwO1xuXHRGU19wcm90by5XUklUSU5HID0gMTtcblx0RlNfcHJvdG8uRE9ORSA9IDI7XG5cblx0RlNfcHJvdG8uZXJyb3IgPVxuXHRGU19wcm90by5vbndyaXRlc3RhcnQgPVxuXHRGU19wcm90by5vbnByb2dyZXNzID1cblx0RlNfcHJvdG8ub253cml0ZSA9XG5cdEZTX3Byb3RvLm9uYWJvcnQgPVxuXHRGU19wcm90by5vbmVycm9yID1cblx0RlNfcHJvdG8ub253cml0ZWVuZCA9XG5cdFx0bnVsbDtcblxuXHRyZXR1cm4gc2F2ZUFzO1xufShcblx0ICAgdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgJiYgc2VsZlxuXHR8fCB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiICYmIHdpbmRvd1xuXHR8fCB0aGlzLmNvbnRlbnRcbikpO1xuLy8gYHNlbGZgIGlzIHVuZGVmaW5lZCBpbiBGaXJlZm94IGZvciBBbmRyb2lkIGNvbnRlbnQgc2NyaXB0IGNvbnRleHRcbi8vIHdoaWxlIGB0aGlzYCBpcyBuc0lDb250ZW50RnJhbWVNZXNzYWdlTWFuYWdlclxuLy8gd2l0aCBhbiBhdHRyaWJ1dGUgYGNvbnRlbnRgIHRoYXQgY29ycmVzcG9uZHMgdG8gdGhlIHdpbmRvd1xuXG5pZiAodHlwZW9mIG1vZHVsZSAhPT0gXCJ1bmRlZmluZWRcIiAmJiBtb2R1bGUuZXhwb3J0cykge1xuICBtb2R1bGUuZXhwb3J0cy5zYXZlQXMgPSBzYXZlQXM7XG59IGVsc2UgaWYgKCh0eXBlb2YgZGVmaW5lICE9PSBcInVuZGVmaW5lZFwiICYmIGRlZmluZSAhPT0gbnVsbCkgJiYgKGRlZmluZS5hbWQgIT09IG51bGwpKSB7XG4gIGRlZmluZShcIkZpbGVTYXZlci5qc1wiLCBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gc2F2ZUFzO1xuICB9KTtcbn1cbiIsIi8vIENvcHlyaWdodCAoYykgMjAxMyBQaWVyb3h5IDxwaWVyb3h5QHBpZXJveHkubmV0PlxuLy8gVGhpcyB3b3JrIGlzIGZyZWUuIFlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnkgaXRcbi8vIHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgV1RGUEwsIFZlcnNpb24gMlxuLy8gRm9yIG1vcmUgaW5mb3JtYXRpb24gc2VlIExJQ0VOU0UudHh0IG9yIGh0dHA6Ly93d3cud3RmcGwubmV0L1xuLy9cbi8vIEZvciBtb3JlIGluZm9ybWF0aW9uLCB0aGUgaG9tZSBwYWdlOlxuLy8gaHR0cDovL3BpZXJveHkubmV0L2Jsb2cvcGFnZXMvbHotc3RyaW5nL3Rlc3RpbmcuaHRtbFxuLy9cbi8vIExaLWJhc2VkIGNvbXByZXNzaW9uIGFsZ29yaXRobSwgdmVyc2lvbiAxLjQuNFxudmFyIExaU3RyaW5nID0gKGZ1bmN0aW9uKCkge1xuXG4vLyBwcml2YXRlIHByb3BlcnR5XG52YXIgZiA9IFN0cmluZy5mcm9tQ2hhckNvZGU7XG52YXIga2V5U3RyQmFzZTY0ID0gXCJBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6MDEyMzQ1Njc4OSsvPVwiO1xudmFyIGtleVN0clVyaVNhZmUgPSBcIkFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXowMTIzNDU2Nzg5Ky0kXCI7XG52YXIgYmFzZVJldmVyc2VEaWMgPSB7fTtcblxuZnVuY3Rpb24gZ2V0QmFzZVZhbHVlKGFscGhhYmV0LCBjaGFyYWN0ZXIpIHtcbiAgaWYgKCFiYXNlUmV2ZXJzZURpY1thbHBoYWJldF0pIHtcbiAgICBiYXNlUmV2ZXJzZURpY1thbHBoYWJldF0gPSB7fTtcbiAgICBmb3IgKHZhciBpPTAgOyBpPGFscGhhYmV0Lmxlbmd0aCA7IGkrKykge1xuICAgICAgYmFzZVJldmVyc2VEaWNbYWxwaGFiZXRdW2FscGhhYmV0LmNoYXJBdChpKV0gPSBpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gYmFzZVJldmVyc2VEaWNbYWxwaGFiZXRdW2NoYXJhY3Rlcl07XG59XG5cbnZhciBMWlN0cmluZyA9IHtcbiAgY29tcHJlc3NUb0Jhc2U2NCA6IGZ1bmN0aW9uIChpbnB1dCkge1xuICAgIGlmIChpbnB1dCA9PSBudWxsKSByZXR1cm4gXCJcIjtcbiAgICB2YXIgcmVzID0gTFpTdHJpbmcuX2NvbXByZXNzKGlucHV0LCA2LCBmdW5jdGlvbihhKXtyZXR1cm4ga2V5U3RyQmFzZTY0LmNoYXJBdChhKTt9KTtcbiAgICBzd2l0Y2ggKHJlcy5sZW5ndGggJSA0KSB7IC8vIFRvIHByb2R1Y2UgdmFsaWQgQmFzZTY0XG4gICAgZGVmYXVsdDogLy8gV2hlbiBjb3VsZCB0aGlzIGhhcHBlbiA/XG4gICAgY2FzZSAwIDogcmV0dXJuIHJlcztcbiAgICBjYXNlIDEgOiByZXR1cm4gcmVzK1wiPT09XCI7XG4gICAgY2FzZSAyIDogcmV0dXJuIHJlcytcIj09XCI7XG4gICAgY2FzZSAzIDogcmV0dXJuIHJlcytcIj1cIjtcbiAgICB9XG4gIH0sXG5cbiAgZGVjb21wcmVzc0Zyb21CYXNlNjQgOiBmdW5jdGlvbiAoaW5wdXQpIHtcbiAgICBpZiAoaW5wdXQgPT0gbnVsbCkgcmV0dXJuIFwiXCI7XG4gICAgaWYgKGlucHV0ID09IFwiXCIpIHJldHVybiBudWxsO1xuICAgIHJldHVybiBMWlN0cmluZy5fZGVjb21wcmVzcyhpbnB1dC5sZW5ndGgsIDMyLCBmdW5jdGlvbihpbmRleCkgeyByZXR1cm4gZ2V0QmFzZVZhbHVlKGtleVN0ckJhc2U2NCwgaW5wdXQuY2hhckF0KGluZGV4KSk7IH0pO1xuICB9LFxuXG4gIGNvbXByZXNzVG9VVEYxNiA6IGZ1bmN0aW9uIChpbnB1dCkge1xuICAgIGlmIChpbnB1dCA9PSBudWxsKSByZXR1cm4gXCJcIjtcbiAgICByZXR1cm4gTFpTdHJpbmcuX2NvbXByZXNzKGlucHV0LCAxNSwgZnVuY3Rpb24oYSl7cmV0dXJuIGYoYSszMik7fSkgKyBcIiBcIjtcbiAgfSxcblxuICBkZWNvbXByZXNzRnJvbVVURjE2OiBmdW5jdGlvbiAoY29tcHJlc3NlZCkge1xuICAgIGlmIChjb21wcmVzc2VkID09IG51bGwpIHJldHVybiBcIlwiO1xuICAgIGlmIChjb21wcmVzc2VkID09IFwiXCIpIHJldHVybiBudWxsO1xuICAgIHJldHVybiBMWlN0cmluZy5fZGVjb21wcmVzcyhjb21wcmVzc2VkLmxlbmd0aCwgMTYzODQsIGZ1bmN0aW9uKGluZGV4KSB7IHJldHVybiBjb21wcmVzc2VkLmNoYXJDb2RlQXQoaW5kZXgpIC0gMzI7IH0pO1xuICB9LFxuXG4gIC8vY29tcHJlc3MgaW50byB1aW50OGFycmF5IChVQ1MtMiBiaWcgZW5kaWFuIGZvcm1hdClcbiAgY29tcHJlc3NUb1VpbnQ4QXJyYXk6IGZ1bmN0aW9uICh1bmNvbXByZXNzZWQpIHtcbiAgICB2YXIgY29tcHJlc3NlZCA9IExaU3RyaW5nLmNvbXByZXNzKHVuY29tcHJlc3NlZCk7XG4gICAgdmFyIGJ1Zj1uZXcgVWludDhBcnJheShjb21wcmVzc2VkLmxlbmd0aCoyKTsgLy8gMiBieXRlcyBwZXIgY2hhcmFjdGVyXG5cbiAgICBmb3IgKHZhciBpPTAsIFRvdGFsTGVuPWNvbXByZXNzZWQubGVuZ3RoOyBpPFRvdGFsTGVuOyBpKyspIHtcbiAgICAgIHZhciBjdXJyZW50X3ZhbHVlID0gY29tcHJlc3NlZC5jaGFyQ29kZUF0KGkpO1xuICAgICAgYnVmW2kqMl0gPSBjdXJyZW50X3ZhbHVlID4+PiA4O1xuICAgICAgYnVmW2kqMisxXSA9IGN1cnJlbnRfdmFsdWUgJSAyNTY7XG4gICAgfVxuICAgIHJldHVybiBidWY7XG4gIH0sXG5cbiAgLy9kZWNvbXByZXNzIGZyb20gdWludDhhcnJheSAoVUNTLTIgYmlnIGVuZGlhbiBmb3JtYXQpXG4gIGRlY29tcHJlc3NGcm9tVWludDhBcnJheTpmdW5jdGlvbiAoY29tcHJlc3NlZCkge1xuICAgIGlmIChjb21wcmVzc2VkPT09bnVsbCB8fCBjb21wcmVzc2VkPT09dW5kZWZpbmVkKXtcbiAgICAgICAgcmV0dXJuIExaU3RyaW5nLmRlY29tcHJlc3MoY29tcHJlc3NlZCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIGJ1Zj1uZXcgQXJyYXkoY29tcHJlc3NlZC5sZW5ndGgvMik7IC8vIDIgYnl0ZXMgcGVyIGNoYXJhY3RlclxuICAgICAgICBmb3IgKHZhciBpPTAsIFRvdGFsTGVuPWJ1Zi5sZW5ndGg7IGk8VG90YWxMZW47IGkrKykge1xuICAgICAgICAgIGJ1ZltpXT1jb21wcmVzc2VkW2kqMl0qMjU2K2NvbXByZXNzZWRbaSoyKzFdO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHJlc3VsdCA9IFtdO1xuICAgICAgICBidWYuZm9yRWFjaChmdW5jdGlvbiAoYykge1xuICAgICAgICAgIHJlc3VsdC5wdXNoKGYoYykpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIExaU3RyaW5nLmRlY29tcHJlc3MocmVzdWx0LmpvaW4oJycpKTtcblxuICAgIH1cblxuICB9LFxuXG5cbiAgLy9jb21wcmVzcyBpbnRvIGEgc3RyaW5nIHRoYXQgaXMgYWxyZWFkeSBVUkkgZW5jb2RlZFxuICBjb21wcmVzc1RvRW5jb2RlZFVSSUNvbXBvbmVudDogZnVuY3Rpb24gKGlucHV0KSB7XG4gICAgaWYgKGlucHV0ID09IG51bGwpIHJldHVybiBcIlwiO1xuICAgIHJldHVybiBMWlN0cmluZy5fY29tcHJlc3MoaW5wdXQsIDYsIGZ1bmN0aW9uKGEpe3JldHVybiBrZXlTdHJVcmlTYWZlLmNoYXJBdChhKTt9KTtcbiAgfSxcblxuICAvL2RlY29tcHJlc3MgZnJvbSBhbiBvdXRwdXQgb2YgY29tcHJlc3NUb0VuY29kZWRVUklDb21wb25lbnRcbiAgZGVjb21wcmVzc0Zyb21FbmNvZGVkVVJJQ29tcG9uZW50OmZ1bmN0aW9uIChpbnB1dCkge1xuICAgIGlmIChpbnB1dCA9PSBudWxsKSByZXR1cm4gXCJcIjtcbiAgICBpZiAoaW5wdXQgPT0gXCJcIikgcmV0dXJuIG51bGw7XG4gICAgaW5wdXQgPSBpbnB1dC5yZXBsYWNlKC8gL2csIFwiK1wiKTtcbiAgICByZXR1cm4gTFpTdHJpbmcuX2RlY29tcHJlc3MoaW5wdXQubGVuZ3RoLCAzMiwgZnVuY3Rpb24oaW5kZXgpIHsgcmV0dXJuIGdldEJhc2VWYWx1ZShrZXlTdHJVcmlTYWZlLCBpbnB1dC5jaGFyQXQoaW5kZXgpKTsgfSk7XG4gIH0sXG5cbiAgY29tcHJlc3M6IGZ1bmN0aW9uICh1bmNvbXByZXNzZWQpIHtcbiAgICByZXR1cm4gTFpTdHJpbmcuX2NvbXByZXNzKHVuY29tcHJlc3NlZCwgMTYsIGZ1bmN0aW9uKGEpe3JldHVybiBmKGEpO30pO1xuICB9LFxuICBfY29tcHJlc3M6IGZ1bmN0aW9uICh1bmNvbXByZXNzZWQsIGJpdHNQZXJDaGFyLCBnZXRDaGFyRnJvbUludCkge1xuICAgIGlmICh1bmNvbXByZXNzZWQgPT0gbnVsbCkgcmV0dXJuIFwiXCI7XG4gICAgdmFyIGksIHZhbHVlLFxuICAgICAgICBjb250ZXh0X2RpY3Rpb25hcnk9IHt9LFxuICAgICAgICBjb250ZXh0X2RpY3Rpb25hcnlUb0NyZWF0ZT0ge30sXG4gICAgICAgIGNvbnRleHRfYz1cIlwiLFxuICAgICAgICBjb250ZXh0X3djPVwiXCIsXG4gICAgICAgIGNvbnRleHRfdz1cIlwiLFxuICAgICAgICBjb250ZXh0X2VubGFyZ2VJbj0gMiwgLy8gQ29tcGVuc2F0ZSBmb3IgdGhlIGZpcnN0IGVudHJ5IHdoaWNoIHNob3VsZCBub3QgY291bnRcbiAgICAgICAgY29udGV4dF9kaWN0U2l6ZT0gMyxcbiAgICAgICAgY29udGV4dF9udW1CaXRzPSAyLFxuICAgICAgICBjb250ZXh0X2RhdGE9W10sXG4gICAgICAgIGNvbnRleHRfZGF0YV92YWw9MCxcbiAgICAgICAgY29udGV4dF9kYXRhX3Bvc2l0aW9uPTAsXG4gICAgICAgIGlpO1xuXG4gICAgZm9yIChpaSA9IDA7IGlpIDwgdW5jb21wcmVzc2VkLmxlbmd0aDsgaWkgKz0gMSkge1xuICAgICAgY29udGV4dF9jID0gdW5jb21wcmVzc2VkLmNoYXJBdChpaSk7XG4gICAgICBpZiAoIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChjb250ZXh0X2RpY3Rpb25hcnksY29udGV4dF9jKSkge1xuICAgICAgICBjb250ZXh0X2RpY3Rpb25hcnlbY29udGV4dF9jXSA9IGNvbnRleHRfZGljdFNpemUrKztcbiAgICAgICAgY29udGV4dF9kaWN0aW9uYXJ5VG9DcmVhdGVbY29udGV4dF9jXSA9IHRydWU7XG4gICAgICB9XG5cbiAgICAgIGNvbnRleHRfd2MgPSBjb250ZXh0X3cgKyBjb250ZXh0X2M7XG4gICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKGNvbnRleHRfZGljdGlvbmFyeSxjb250ZXh0X3djKSkge1xuICAgICAgICBjb250ZXh0X3cgPSBjb250ZXh0X3djO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChjb250ZXh0X2RpY3Rpb25hcnlUb0NyZWF0ZSxjb250ZXh0X3cpKSB7XG4gICAgICAgICAgaWYgKGNvbnRleHRfdy5jaGFyQ29kZUF0KDApPDI1Nikge1xuICAgICAgICAgICAgZm9yIChpPTAgOyBpPGNvbnRleHRfbnVtQml0cyA7IGkrKykge1xuICAgICAgICAgICAgICBjb250ZXh0X2RhdGFfdmFsID0gKGNvbnRleHRfZGF0YV92YWwgPDwgMSk7XG4gICAgICAgICAgICAgIGlmIChjb250ZXh0X2RhdGFfcG9zaXRpb24gPT0gYml0c1BlckNoYXItMSkge1xuICAgICAgICAgICAgICAgIGNvbnRleHRfZGF0YV9wb3NpdGlvbiA9IDA7XG4gICAgICAgICAgICAgICAgY29udGV4dF9kYXRhLnB1c2goZ2V0Q2hhckZyb21JbnQoY29udGV4dF9kYXRhX3ZhbCkpO1xuICAgICAgICAgICAgICAgIGNvbnRleHRfZGF0YV92YWwgPSAwO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnRleHRfZGF0YV9wb3NpdGlvbisrO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YWx1ZSA9IGNvbnRleHRfdy5jaGFyQ29kZUF0KDApO1xuICAgICAgICAgICAgZm9yIChpPTAgOyBpPDggOyBpKyspIHtcbiAgICAgICAgICAgICAgY29udGV4dF9kYXRhX3ZhbCA9IChjb250ZXh0X2RhdGFfdmFsIDw8IDEpIHwgKHZhbHVlJjEpO1xuICAgICAgICAgICAgICBpZiAoY29udGV4dF9kYXRhX3Bvc2l0aW9uID09IGJpdHNQZXJDaGFyLTEpIHtcbiAgICAgICAgICAgICAgICBjb250ZXh0X2RhdGFfcG9zaXRpb24gPSAwO1xuICAgICAgICAgICAgICAgIGNvbnRleHRfZGF0YS5wdXNoKGdldENoYXJGcm9tSW50KGNvbnRleHRfZGF0YV92YWwpKTtcbiAgICAgICAgICAgICAgICBjb250ZXh0X2RhdGFfdmFsID0gMDtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb250ZXh0X2RhdGFfcG9zaXRpb24rKztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB2YWx1ZSA9IHZhbHVlID4+IDE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhbHVlID0gMTtcbiAgICAgICAgICAgIGZvciAoaT0wIDsgaTxjb250ZXh0X251bUJpdHMgOyBpKyspIHtcbiAgICAgICAgICAgICAgY29udGV4dF9kYXRhX3ZhbCA9IChjb250ZXh0X2RhdGFfdmFsIDw8IDEpIHwgdmFsdWU7XG4gICAgICAgICAgICAgIGlmIChjb250ZXh0X2RhdGFfcG9zaXRpb24gPT1iaXRzUGVyQ2hhci0xKSB7XG4gICAgICAgICAgICAgICAgY29udGV4dF9kYXRhX3Bvc2l0aW9uID0gMDtcbiAgICAgICAgICAgICAgICBjb250ZXh0X2RhdGEucHVzaChnZXRDaGFyRnJvbUludChjb250ZXh0X2RhdGFfdmFsKSk7XG4gICAgICAgICAgICAgICAgY29udGV4dF9kYXRhX3ZhbCA9IDA7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29udGV4dF9kYXRhX3Bvc2l0aW9uKys7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgdmFsdWUgPSAwO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFsdWUgPSBjb250ZXh0X3cuY2hhckNvZGVBdCgwKTtcbiAgICAgICAgICAgIGZvciAoaT0wIDsgaTwxNiA7IGkrKykge1xuICAgICAgICAgICAgICBjb250ZXh0X2RhdGFfdmFsID0gKGNvbnRleHRfZGF0YV92YWwgPDwgMSkgfCAodmFsdWUmMSk7XG4gICAgICAgICAgICAgIGlmIChjb250ZXh0X2RhdGFfcG9zaXRpb24gPT0gYml0c1BlckNoYXItMSkge1xuICAgICAgICAgICAgICAgIGNvbnRleHRfZGF0YV9wb3NpdGlvbiA9IDA7XG4gICAgICAgICAgICAgICAgY29udGV4dF9kYXRhLnB1c2goZ2V0Q2hhckZyb21JbnQoY29udGV4dF9kYXRhX3ZhbCkpO1xuICAgICAgICAgICAgICAgIGNvbnRleHRfZGF0YV92YWwgPSAwO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnRleHRfZGF0YV9wb3NpdGlvbisrO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIHZhbHVlID0gdmFsdWUgPj4gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgY29udGV4dF9lbmxhcmdlSW4tLTtcbiAgICAgICAgICBpZiAoY29udGV4dF9lbmxhcmdlSW4gPT0gMCkge1xuICAgICAgICAgICAgY29udGV4dF9lbmxhcmdlSW4gPSBNYXRoLnBvdygyLCBjb250ZXh0X251bUJpdHMpO1xuICAgICAgICAgICAgY29udGV4dF9udW1CaXRzKys7XG4gICAgICAgICAgfVxuICAgICAgICAgIGRlbGV0ZSBjb250ZXh0X2RpY3Rpb25hcnlUb0NyZWF0ZVtjb250ZXh0X3ddO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHZhbHVlID0gY29udGV4dF9kaWN0aW9uYXJ5W2NvbnRleHRfd107XG4gICAgICAgICAgZm9yIChpPTAgOyBpPGNvbnRleHRfbnVtQml0cyA7IGkrKykge1xuICAgICAgICAgICAgY29udGV4dF9kYXRhX3ZhbCA9IChjb250ZXh0X2RhdGFfdmFsIDw8IDEpIHwgKHZhbHVlJjEpO1xuICAgICAgICAgICAgaWYgKGNvbnRleHRfZGF0YV9wb3NpdGlvbiA9PSBiaXRzUGVyQ2hhci0xKSB7XG4gICAgICAgICAgICAgIGNvbnRleHRfZGF0YV9wb3NpdGlvbiA9IDA7XG4gICAgICAgICAgICAgIGNvbnRleHRfZGF0YS5wdXNoKGdldENoYXJGcm9tSW50KGNvbnRleHRfZGF0YV92YWwpKTtcbiAgICAgICAgICAgICAgY29udGV4dF9kYXRhX3ZhbCA9IDA7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBjb250ZXh0X2RhdGFfcG9zaXRpb24rKztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhbHVlID0gdmFsdWUgPj4gMTtcbiAgICAgICAgICB9XG5cblxuICAgICAgICB9XG4gICAgICAgIGNvbnRleHRfZW5sYXJnZUluLS07XG4gICAgICAgIGlmIChjb250ZXh0X2VubGFyZ2VJbiA9PSAwKSB7XG4gICAgICAgICAgY29udGV4dF9lbmxhcmdlSW4gPSBNYXRoLnBvdygyLCBjb250ZXh0X251bUJpdHMpO1xuICAgICAgICAgIGNvbnRleHRfbnVtQml0cysrO1xuICAgICAgICB9XG4gICAgICAgIC8vIEFkZCB3YyB0byB0aGUgZGljdGlvbmFyeS5cbiAgICAgICAgY29udGV4dF9kaWN0aW9uYXJ5W2NvbnRleHRfd2NdID0gY29udGV4dF9kaWN0U2l6ZSsrO1xuICAgICAgICBjb250ZXh0X3cgPSBTdHJpbmcoY29udGV4dF9jKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBPdXRwdXQgdGhlIGNvZGUgZm9yIHcuXG4gICAgaWYgKGNvbnRleHRfdyAhPT0gXCJcIikge1xuICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChjb250ZXh0X2RpY3Rpb25hcnlUb0NyZWF0ZSxjb250ZXh0X3cpKSB7XG4gICAgICAgIGlmIChjb250ZXh0X3cuY2hhckNvZGVBdCgwKTwyNTYpIHtcbiAgICAgICAgICBmb3IgKGk9MCA7IGk8Y29udGV4dF9udW1CaXRzIDsgaSsrKSB7XG4gICAgICAgICAgICBjb250ZXh0X2RhdGFfdmFsID0gKGNvbnRleHRfZGF0YV92YWwgPDwgMSk7XG4gICAgICAgICAgICBpZiAoY29udGV4dF9kYXRhX3Bvc2l0aW9uID09IGJpdHNQZXJDaGFyLTEpIHtcbiAgICAgICAgICAgICAgY29udGV4dF9kYXRhX3Bvc2l0aW9uID0gMDtcbiAgICAgICAgICAgICAgY29udGV4dF9kYXRhLnB1c2goZ2V0Q2hhckZyb21JbnQoY29udGV4dF9kYXRhX3ZhbCkpO1xuICAgICAgICAgICAgICBjb250ZXh0X2RhdGFfdmFsID0gMDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGNvbnRleHRfZGF0YV9wb3NpdGlvbisrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICB2YWx1ZSA9IGNvbnRleHRfdy5jaGFyQ29kZUF0KDApO1xuICAgICAgICAgIGZvciAoaT0wIDsgaTw4IDsgaSsrKSB7XG4gICAgICAgICAgICBjb250ZXh0X2RhdGFfdmFsID0gKGNvbnRleHRfZGF0YV92YWwgPDwgMSkgfCAodmFsdWUmMSk7XG4gICAgICAgICAgICBpZiAoY29udGV4dF9kYXRhX3Bvc2l0aW9uID09IGJpdHNQZXJDaGFyLTEpIHtcbiAgICAgICAgICAgICAgY29udGV4dF9kYXRhX3Bvc2l0aW9uID0gMDtcbiAgICAgICAgICAgICAgY29udGV4dF9kYXRhLnB1c2goZ2V0Q2hhckZyb21JbnQoY29udGV4dF9kYXRhX3ZhbCkpO1xuICAgICAgICAgICAgICBjb250ZXh0X2RhdGFfdmFsID0gMDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGNvbnRleHRfZGF0YV9wb3NpdGlvbisrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZSA+PiAxO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB2YWx1ZSA9IDE7XG4gICAgICAgICAgZm9yIChpPTAgOyBpPGNvbnRleHRfbnVtQml0cyA7IGkrKykge1xuICAgICAgICAgICAgY29udGV4dF9kYXRhX3ZhbCA9IChjb250ZXh0X2RhdGFfdmFsIDw8IDEpIHwgdmFsdWU7XG4gICAgICAgICAgICBpZiAoY29udGV4dF9kYXRhX3Bvc2l0aW9uID09IGJpdHNQZXJDaGFyLTEpIHtcbiAgICAgICAgICAgICAgY29udGV4dF9kYXRhX3Bvc2l0aW9uID0gMDtcbiAgICAgICAgICAgICAgY29udGV4dF9kYXRhLnB1c2goZ2V0Q2hhckZyb21JbnQoY29udGV4dF9kYXRhX3ZhbCkpO1xuICAgICAgICAgICAgICBjb250ZXh0X2RhdGFfdmFsID0gMDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGNvbnRleHRfZGF0YV9wb3NpdGlvbisrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFsdWUgPSAwO1xuICAgICAgICAgIH1cbiAgICAgICAgICB2YWx1ZSA9IGNvbnRleHRfdy5jaGFyQ29kZUF0KDApO1xuICAgICAgICAgIGZvciAoaT0wIDsgaTwxNiA7IGkrKykge1xuICAgICAgICAgICAgY29udGV4dF9kYXRhX3ZhbCA9IChjb250ZXh0X2RhdGFfdmFsIDw8IDEpIHwgKHZhbHVlJjEpO1xuICAgICAgICAgICAgaWYgKGNvbnRleHRfZGF0YV9wb3NpdGlvbiA9PSBiaXRzUGVyQ2hhci0xKSB7XG4gICAgICAgICAgICAgIGNvbnRleHRfZGF0YV9wb3NpdGlvbiA9IDA7XG4gICAgICAgICAgICAgIGNvbnRleHRfZGF0YS5wdXNoKGdldENoYXJGcm9tSW50KGNvbnRleHRfZGF0YV92YWwpKTtcbiAgICAgICAgICAgICAgY29udGV4dF9kYXRhX3ZhbCA9IDA7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBjb250ZXh0X2RhdGFfcG9zaXRpb24rKztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhbHVlID0gdmFsdWUgPj4gMTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY29udGV4dF9lbmxhcmdlSW4tLTtcbiAgICAgICAgaWYgKGNvbnRleHRfZW5sYXJnZUluID09IDApIHtcbiAgICAgICAgICBjb250ZXh0X2VubGFyZ2VJbiA9IE1hdGgucG93KDIsIGNvbnRleHRfbnVtQml0cyk7XG4gICAgICAgICAgY29udGV4dF9udW1CaXRzKys7XG4gICAgICAgIH1cbiAgICAgICAgZGVsZXRlIGNvbnRleHRfZGljdGlvbmFyeVRvQ3JlYXRlW2NvbnRleHRfd107XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YWx1ZSA9IGNvbnRleHRfZGljdGlvbmFyeVtjb250ZXh0X3ddO1xuICAgICAgICBmb3IgKGk9MCA7IGk8Y29udGV4dF9udW1CaXRzIDsgaSsrKSB7XG4gICAgICAgICAgY29udGV4dF9kYXRhX3ZhbCA9IChjb250ZXh0X2RhdGFfdmFsIDw8IDEpIHwgKHZhbHVlJjEpO1xuICAgICAgICAgIGlmIChjb250ZXh0X2RhdGFfcG9zaXRpb24gPT0gYml0c1BlckNoYXItMSkge1xuICAgICAgICAgICAgY29udGV4dF9kYXRhX3Bvc2l0aW9uID0gMDtcbiAgICAgICAgICAgIGNvbnRleHRfZGF0YS5wdXNoKGdldENoYXJGcm9tSW50KGNvbnRleHRfZGF0YV92YWwpKTtcbiAgICAgICAgICAgIGNvbnRleHRfZGF0YV92YWwgPSAwO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb250ZXh0X2RhdGFfcG9zaXRpb24rKztcbiAgICAgICAgICB9XG4gICAgICAgICAgdmFsdWUgPSB2YWx1ZSA+PiAxO1xuICAgICAgICB9XG5cblxuICAgICAgfVxuICAgICAgY29udGV4dF9lbmxhcmdlSW4tLTtcbiAgICAgIGlmIChjb250ZXh0X2VubGFyZ2VJbiA9PSAwKSB7XG4gICAgICAgIGNvbnRleHRfZW5sYXJnZUluID0gTWF0aC5wb3coMiwgY29udGV4dF9udW1CaXRzKTtcbiAgICAgICAgY29udGV4dF9udW1CaXRzKys7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gTWFyayB0aGUgZW5kIG9mIHRoZSBzdHJlYW1cbiAgICB2YWx1ZSA9IDI7XG4gICAgZm9yIChpPTAgOyBpPGNvbnRleHRfbnVtQml0cyA7IGkrKykge1xuICAgICAgY29udGV4dF9kYXRhX3ZhbCA9IChjb250ZXh0X2RhdGFfdmFsIDw8IDEpIHwgKHZhbHVlJjEpO1xuICAgICAgaWYgKGNvbnRleHRfZGF0YV9wb3NpdGlvbiA9PSBiaXRzUGVyQ2hhci0xKSB7XG4gICAgICAgIGNvbnRleHRfZGF0YV9wb3NpdGlvbiA9IDA7XG4gICAgICAgIGNvbnRleHRfZGF0YS5wdXNoKGdldENoYXJGcm9tSW50KGNvbnRleHRfZGF0YV92YWwpKTtcbiAgICAgICAgY29udGV4dF9kYXRhX3ZhbCA9IDA7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb250ZXh0X2RhdGFfcG9zaXRpb24rKztcbiAgICAgIH1cbiAgICAgIHZhbHVlID0gdmFsdWUgPj4gMTtcbiAgICB9XG5cbiAgICAvLyBGbHVzaCB0aGUgbGFzdCBjaGFyXG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgIGNvbnRleHRfZGF0YV92YWwgPSAoY29udGV4dF9kYXRhX3ZhbCA8PCAxKTtcbiAgICAgIGlmIChjb250ZXh0X2RhdGFfcG9zaXRpb24gPT0gYml0c1BlckNoYXItMSkge1xuICAgICAgICBjb250ZXh0X2RhdGEucHVzaChnZXRDaGFyRnJvbUludChjb250ZXh0X2RhdGFfdmFsKSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgICAgZWxzZSBjb250ZXh0X2RhdGFfcG9zaXRpb24rKztcbiAgICB9XG4gICAgcmV0dXJuIGNvbnRleHRfZGF0YS5qb2luKCcnKTtcbiAgfSxcblxuICBkZWNvbXByZXNzOiBmdW5jdGlvbiAoY29tcHJlc3NlZCkge1xuICAgIGlmIChjb21wcmVzc2VkID09IG51bGwpIHJldHVybiBcIlwiO1xuICAgIGlmIChjb21wcmVzc2VkID09IFwiXCIpIHJldHVybiBudWxsO1xuICAgIHJldHVybiBMWlN0cmluZy5fZGVjb21wcmVzcyhjb21wcmVzc2VkLmxlbmd0aCwgMzI3NjgsIGZ1bmN0aW9uKGluZGV4KSB7IHJldHVybiBjb21wcmVzc2VkLmNoYXJDb2RlQXQoaW5kZXgpOyB9KTtcbiAgfSxcblxuICBfZGVjb21wcmVzczogZnVuY3Rpb24gKGxlbmd0aCwgcmVzZXRWYWx1ZSwgZ2V0TmV4dFZhbHVlKSB7XG4gICAgdmFyIGRpY3Rpb25hcnkgPSBbXSxcbiAgICAgICAgbmV4dCxcbiAgICAgICAgZW5sYXJnZUluID0gNCxcbiAgICAgICAgZGljdFNpemUgPSA0LFxuICAgICAgICBudW1CaXRzID0gMyxcbiAgICAgICAgZW50cnkgPSBcIlwiLFxuICAgICAgICByZXN1bHQgPSBbXSxcbiAgICAgICAgaSxcbiAgICAgICAgdyxcbiAgICAgICAgYml0cywgcmVzYiwgbWF4cG93ZXIsIHBvd2VyLFxuICAgICAgICBjLFxuICAgICAgICBkYXRhID0ge3ZhbDpnZXROZXh0VmFsdWUoMCksIHBvc2l0aW9uOnJlc2V0VmFsdWUsIGluZGV4OjF9O1xuXG4gICAgZm9yIChpID0gMDsgaSA8IDM7IGkgKz0gMSkge1xuICAgICAgZGljdGlvbmFyeVtpXSA9IGk7XG4gICAgfVxuXG4gICAgYml0cyA9IDA7XG4gICAgbWF4cG93ZXIgPSBNYXRoLnBvdygyLDIpO1xuICAgIHBvd2VyPTE7XG4gICAgd2hpbGUgKHBvd2VyIT1tYXhwb3dlcikge1xuICAgICAgcmVzYiA9IGRhdGEudmFsICYgZGF0YS5wb3NpdGlvbjtcbiAgICAgIGRhdGEucG9zaXRpb24gPj49IDE7XG4gICAgICBpZiAoZGF0YS5wb3NpdGlvbiA9PSAwKSB7XG4gICAgICAgIGRhdGEucG9zaXRpb24gPSByZXNldFZhbHVlO1xuICAgICAgICBkYXRhLnZhbCA9IGdldE5leHRWYWx1ZShkYXRhLmluZGV4KyspO1xuICAgICAgfVxuICAgICAgYml0cyB8PSAocmVzYj4wID8gMSA6IDApICogcG93ZXI7XG4gICAgICBwb3dlciA8PD0gMTtcbiAgICB9XG5cbiAgICBzd2l0Y2ggKG5leHQgPSBiaXRzKSB7XG4gICAgICBjYXNlIDA6XG4gICAgICAgICAgYml0cyA9IDA7XG4gICAgICAgICAgbWF4cG93ZXIgPSBNYXRoLnBvdygyLDgpO1xuICAgICAgICAgIHBvd2VyPTE7XG4gICAgICAgICAgd2hpbGUgKHBvd2VyIT1tYXhwb3dlcikge1xuICAgICAgICAgICAgcmVzYiA9IGRhdGEudmFsICYgZGF0YS5wb3NpdGlvbjtcbiAgICAgICAgICAgIGRhdGEucG9zaXRpb24gPj49IDE7XG4gICAgICAgICAgICBpZiAoZGF0YS5wb3NpdGlvbiA9PSAwKSB7XG4gICAgICAgICAgICAgIGRhdGEucG9zaXRpb24gPSByZXNldFZhbHVlO1xuICAgICAgICAgICAgICBkYXRhLnZhbCA9IGdldE5leHRWYWx1ZShkYXRhLmluZGV4KyspO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYml0cyB8PSAocmVzYj4wID8gMSA6IDApICogcG93ZXI7XG4gICAgICAgICAgICBwb3dlciA8PD0gMTtcbiAgICAgICAgICB9XG4gICAgICAgIGMgPSBmKGJpdHMpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMTpcbiAgICAgICAgICBiaXRzID0gMDtcbiAgICAgICAgICBtYXhwb3dlciA9IE1hdGgucG93KDIsMTYpO1xuICAgICAgICAgIHBvd2VyPTE7XG4gICAgICAgICAgd2hpbGUgKHBvd2VyIT1tYXhwb3dlcikge1xuICAgICAgICAgICAgcmVzYiA9IGRhdGEudmFsICYgZGF0YS5wb3NpdGlvbjtcbiAgICAgICAgICAgIGRhdGEucG9zaXRpb24gPj49IDE7XG4gICAgICAgICAgICBpZiAoZGF0YS5wb3NpdGlvbiA9PSAwKSB7XG4gICAgICAgICAgICAgIGRhdGEucG9zaXRpb24gPSByZXNldFZhbHVlO1xuICAgICAgICAgICAgICBkYXRhLnZhbCA9IGdldE5leHRWYWx1ZShkYXRhLmluZGV4KyspO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYml0cyB8PSAocmVzYj4wID8gMSA6IDApICogcG93ZXI7XG4gICAgICAgICAgICBwb3dlciA8PD0gMTtcbiAgICAgICAgICB9XG4gICAgICAgIGMgPSBmKGJpdHMpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMjpcbiAgICAgICAgcmV0dXJuIFwiXCI7XG4gICAgfVxuICAgIGRpY3Rpb25hcnlbM10gPSBjO1xuICAgIHcgPSBjO1xuICAgIHJlc3VsdC5wdXNoKGMpO1xuICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICBpZiAoZGF0YS5pbmRleCA+IGxlbmd0aCkge1xuICAgICAgICByZXR1cm4gXCJcIjtcbiAgICAgIH1cblxuICAgICAgYml0cyA9IDA7XG4gICAgICBtYXhwb3dlciA9IE1hdGgucG93KDIsbnVtQml0cyk7XG4gICAgICBwb3dlcj0xO1xuICAgICAgd2hpbGUgKHBvd2VyIT1tYXhwb3dlcikge1xuICAgICAgICByZXNiID0gZGF0YS52YWwgJiBkYXRhLnBvc2l0aW9uO1xuICAgICAgICBkYXRhLnBvc2l0aW9uID4+PSAxO1xuICAgICAgICBpZiAoZGF0YS5wb3NpdGlvbiA9PSAwKSB7XG4gICAgICAgICAgZGF0YS5wb3NpdGlvbiA9IHJlc2V0VmFsdWU7XG4gICAgICAgICAgZGF0YS52YWwgPSBnZXROZXh0VmFsdWUoZGF0YS5pbmRleCsrKTtcbiAgICAgICAgfVxuICAgICAgICBiaXRzIHw9IChyZXNiPjAgPyAxIDogMCkgKiBwb3dlcjtcbiAgICAgICAgcG93ZXIgPDw9IDE7XG4gICAgICB9XG5cbiAgICAgIHN3aXRjaCAoYyA9IGJpdHMpIHtcbiAgICAgICAgY2FzZSAwOlxuICAgICAgICAgIGJpdHMgPSAwO1xuICAgICAgICAgIG1heHBvd2VyID0gTWF0aC5wb3coMiw4KTtcbiAgICAgICAgICBwb3dlcj0xO1xuICAgICAgICAgIHdoaWxlIChwb3dlciE9bWF4cG93ZXIpIHtcbiAgICAgICAgICAgIHJlc2IgPSBkYXRhLnZhbCAmIGRhdGEucG9zaXRpb247XG4gICAgICAgICAgICBkYXRhLnBvc2l0aW9uID4+PSAxO1xuICAgICAgICAgICAgaWYgKGRhdGEucG9zaXRpb24gPT0gMCkge1xuICAgICAgICAgICAgICBkYXRhLnBvc2l0aW9uID0gcmVzZXRWYWx1ZTtcbiAgICAgICAgICAgICAgZGF0YS52YWwgPSBnZXROZXh0VmFsdWUoZGF0YS5pbmRleCsrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJpdHMgfD0gKHJlc2I+MCA/IDEgOiAwKSAqIHBvd2VyO1xuICAgICAgICAgICAgcG93ZXIgPDw9IDE7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgZGljdGlvbmFyeVtkaWN0U2l6ZSsrXSA9IGYoYml0cyk7XG4gICAgICAgICAgYyA9IGRpY3RTaXplLTE7XG4gICAgICAgICAgZW5sYXJnZUluLS07XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMTpcbiAgICAgICAgICBiaXRzID0gMDtcbiAgICAgICAgICBtYXhwb3dlciA9IE1hdGgucG93KDIsMTYpO1xuICAgICAgICAgIHBvd2VyPTE7XG4gICAgICAgICAgd2hpbGUgKHBvd2VyIT1tYXhwb3dlcikge1xuICAgICAgICAgICAgcmVzYiA9IGRhdGEudmFsICYgZGF0YS5wb3NpdGlvbjtcbiAgICAgICAgICAgIGRhdGEucG9zaXRpb24gPj49IDE7XG4gICAgICAgICAgICBpZiAoZGF0YS5wb3NpdGlvbiA9PSAwKSB7XG4gICAgICAgICAgICAgIGRhdGEucG9zaXRpb24gPSByZXNldFZhbHVlO1xuICAgICAgICAgICAgICBkYXRhLnZhbCA9IGdldE5leHRWYWx1ZShkYXRhLmluZGV4KyspO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYml0cyB8PSAocmVzYj4wID8gMSA6IDApICogcG93ZXI7XG4gICAgICAgICAgICBwb3dlciA8PD0gMTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZGljdGlvbmFyeVtkaWN0U2l6ZSsrXSA9IGYoYml0cyk7XG4gICAgICAgICAgYyA9IGRpY3RTaXplLTE7XG4gICAgICAgICAgZW5sYXJnZUluLS07XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMjpcbiAgICAgICAgICByZXR1cm4gcmVzdWx0LmpvaW4oJycpO1xuICAgICAgfVxuXG4gICAgICBpZiAoZW5sYXJnZUluID09IDApIHtcbiAgICAgICAgZW5sYXJnZUluID0gTWF0aC5wb3coMiwgbnVtQml0cyk7XG4gICAgICAgIG51bUJpdHMrKztcbiAgICAgIH1cblxuICAgICAgaWYgKGRpY3Rpb25hcnlbY10pIHtcbiAgICAgICAgZW50cnkgPSBkaWN0aW9uYXJ5W2NdO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKGMgPT09IGRpY3RTaXplKSB7XG4gICAgICAgICAgZW50cnkgPSB3ICsgdy5jaGFyQXQoMCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJlc3VsdC5wdXNoKGVudHJ5KTtcblxuICAgICAgLy8gQWRkIHcrZW50cnlbMF0gdG8gdGhlIGRpY3Rpb25hcnkuXG4gICAgICBkaWN0aW9uYXJ5W2RpY3RTaXplKytdID0gdyArIGVudHJ5LmNoYXJBdCgwKTtcbiAgICAgIGVubGFyZ2VJbi0tO1xuXG4gICAgICB3ID0gZW50cnk7XG5cbiAgICAgIGlmIChlbmxhcmdlSW4gPT0gMCkge1xuICAgICAgICBlbmxhcmdlSW4gPSBNYXRoLnBvdygyLCBudW1CaXRzKTtcbiAgICAgICAgbnVtQml0cysrO1xuICAgICAgfVxuXG4gICAgfVxuICB9XG59O1xuICByZXR1cm4gTFpTdHJpbmc7XG59KSgpO1xuXG5pZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gIGRlZmluZShmdW5jdGlvbiAoKSB7IHJldHVybiBMWlN0cmluZzsgfSk7XG59IGVsc2UgaWYoIHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZSAhPSBudWxsICkge1xuICBtb2R1bGUuZXhwb3J0cyA9IExaU3RyaW5nXG59XG4iLCIhZnVuY3Rpb24oKSB7XG4gICAgJ3VzZSBzdHJpY3QnO1xuICAgIGZ1bmN0aW9uIFZOb2RlKCkge31cbiAgICBmdW5jdGlvbiBoKG5vZGVOYW1lLCBhdHRyaWJ1dGVzKSB7XG4gICAgICAgIHZhciBsYXN0U2ltcGxlLCBjaGlsZCwgc2ltcGxlLCBpLCBjaGlsZHJlbiA9IEVNUFRZX0NISUxEUkVOO1xuICAgICAgICBmb3IgKGkgPSBhcmd1bWVudHMubGVuZ3RoOyBpLS0gPiAyOyApIHN0YWNrLnB1c2goYXJndW1lbnRzW2ldKTtcbiAgICAgICAgaWYgKGF0dHJpYnV0ZXMgJiYgbnVsbCAhPSBhdHRyaWJ1dGVzLmNoaWxkcmVuKSB7XG4gICAgICAgICAgICBpZiAoIXN0YWNrLmxlbmd0aCkgc3RhY2sucHVzaChhdHRyaWJ1dGVzLmNoaWxkcmVuKTtcbiAgICAgICAgICAgIGRlbGV0ZSBhdHRyaWJ1dGVzLmNoaWxkcmVuO1xuICAgICAgICB9XG4gICAgICAgIHdoaWxlIChzdGFjay5sZW5ndGgpIGlmICgoY2hpbGQgPSBzdGFjay5wb3AoKSkgJiYgdm9pZCAwICE9PSBjaGlsZC5wb3ApIGZvciAoaSA9IGNoaWxkLmxlbmd0aDsgaS0tOyApIHN0YWNrLnB1c2goY2hpbGRbaV0pOyBlbHNlIHtcbiAgICAgICAgICAgIGlmIChjaGlsZCA9PT0gITAgfHwgY2hpbGQgPT09ICExKSBjaGlsZCA9IG51bGw7XG4gICAgICAgICAgICBpZiAoc2ltcGxlID0gJ2Z1bmN0aW9uJyAhPSB0eXBlb2Ygbm9kZU5hbWUpIGlmIChudWxsID09IGNoaWxkKSBjaGlsZCA9ICcnOyBlbHNlIGlmICgnbnVtYmVyJyA9PSB0eXBlb2YgY2hpbGQpIGNoaWxkID0gU3RyaW5nKGNoaWxkKTsgZWxzZSBpZiAoJ3N0cmluZycgIT0gdHlwZW9mIGNoaWxkKSBzaW1wbGUgPSAhMTtcbiAgICAgICAgICAgIGlmIChzaW1wbGUgJiYgbGFzdFNpbXBsZSkgY2hpbGRyZW5bY2hpbGRyZW4ubGVuZ3RoIC0gMV0gKz0gY2hpbGQ7IGVsc2UgaWYgKGNoaWxkcmVuID09PSBFTVBUWV9DSElMRFJFTikgY2hpbGRyZW4gPSBbIGNoaWxkIF07IGVsc2UgY2hpbGRyZW4ucHVzaChjaGlsZCk7XG4gICAgICAgICAgICBsYXN0U2ltcGxlID0gc2ltcGxlO1xuICAgICAgICB9XG4gICAgICAgIHZhciBwID0gbmV3IFZOb2RlKCk7XG4gICAgICAgIHAubm9kZU5hbWUgPSBub2RlTmFtZTtcbiAgICAgICAgcC5jaGlsZHJlbiA9IGNoaWxkcmVuO1xuICAgICAgICBwLmF0dHJpYnV0ZXMgPSBudWxsID09IGF0dHJpYnV0ZXMgPyB2b2lkIDAgOiBhdHRyaWJ1dGVzO1xuICAgICAgICBwLmtleSA9IG51bGwgPT0gYXR0cmlidXRlcyA/IHZvaWQgMCA6IGF0dHJpYnV0ZXMua2V5O1xuICAgICAgICBpZiAodm9pZCAwICE9PSBvcHRpb25zLnZub2RlKSBvcHRpb25zLnZub2RlKHApO1xuICAgICAgICByZXR1cm4gcDtcbiAgICB9XG4gICAgZnVuY3Rpb24gZXh0ZW5kKG9iaiwgcHJvcHMpIHtcbiAgICAgICAgZm9yICh2YXIgaSBpbiBwcm9wcykgb2JqW2ldID0gcHJvcHNbaV07XG4gICAgICAgIHJldHVybiBvYmo7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGNsb25lRWxlbWVudCh2bm9kZSwgcHJvcHMpIHtcbiAgICAgICAgcmV0dXJuIGgodm5vZGUubm9kZU5hbWUsIGV4dGVuZChleHRlbmQoe30sIHZub2RlLmF0dHJpYnV0ZXMpLCBwcm9wcyksIGFyZ3VtZW50cy5sZW5ndGggPiAyID8gW10uc2xpY2UuY2FsbChhcmd1bWVudHMsIDIpIDogdm5vZGUuY2hpbGRyZW4pO1xuICAgIH1cbiAgICBmdW5jdGlvbiBlbnF1ZXVlUmVuZGVyKGNvbXBvbmVudCkge1xuICAgICAgICBpZiAoIWNvbXBvbmVudC5fX2QgJiYgKGNvbXBvbmVudC5fX2QgPSAhMCkgJiYgMSA9PSBpdGVtcy5wdXNoKGNvbXBvbmVudCkpIChvcHRpb25zLmRlYm91bmNlUmVuZGVyaW5nIHx8IHNldFRpbWVvdXQpKHJlcmVuZGVyKTtcbiAgICB9XG4gICAgZnVuY3Rpb24gcmVyZW5kZXIoKSB7XG4gICAgICAgIHZhciBwLCBsaXN0ID0gaXRlbXM7XG4gICAgICAgIGl0ZW1zID0gW107XG4gICAgICAgIHdoaWxlIChwID0gbGlzdC5wb3AoKSkgaWYgKHAuX19kKSByZW5kZXJDb21wb25lbnQocCk7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGlzU2FtZU5vZGVUeXBlKG5vZGUsIHZub2RlLCBoeWRyYXRpbmcpIHtcbiAgICAgICAgaWYgKCdzdHJpbmcnID09IHR5cGVvZiB2bm9kZSB8fCAnbnVtYmVyJyA9PSB0eXBlb2Ygdm5vZGUpIHJldHVybiB2b2lkIDAgIT09IG5vZGUuc3BsaXRUZXh0O1xuICAgICAgICBpZiAoJ3N0cmluZycgPT0gdHlwZW9mIHZub2RlLm5vZGVOYW1lKSByZXR1cm4gIW5vZGUuX2NvbXBvbmVudENvbnN0cnVjdG9yICYmIGlzTmFtZWROb2RlKG5vZGUsIHZub2RlLm5vZGVOYW1lKTsgZWxzZSByZXR1cm4gaHlkcmF0aW5nIHx8IG5vZGUuX2NvbXBvbmVudENvbnN0cnVjdG9yID09PSB2bm9kZS5ub2RlTmFtZTtcbiAgICB9XG4gICAgZnVuY3Rpb24gaXNOYW1lZE5vZGUobm9kZSwgbm9kZU5hbWUpIHtcbiAgICAgICAgcmV0dXJuIG5vZGUuX19uID09PSBub2RlTmFtZSB8fCBub2RlLm5vZGVOYW1lLnRvTG93ZXJDYXNlKCkgPT09IG5vZGVOYW1lLnRvTG93ZXJDYXNlKCk7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGdldE5vZGVQcm9wcyh2bm9kZSkge1xuICAgICAgICB2YXIgcHJvcHMgPSBleHRlbmQoe30sIHZub2RlLmF0dHJpYnV0ZXMpO1xuICAgICAgICBwcm9wcy5jaGlsZHJlbiA9IHZub2RlLmNoaWxkcmVuO1xuICAgICAgICB2YXIgZGVmYXVsdFByb3BzID0gdm5vZGUubm9kZU5hbWUuZGVmYXVsdFByb3BzO1xuICAgICAgICBpZiAodm9pZCAwICE9PSBkZWZhdWx0UHJvcHMpIGZvciAodmFyIGkgaW4gZGVmYXVsdFByb3BzKSBpZiAodm9pZCAwID09PSBwcm9wc1tpXSkgcHJvcHNbaV0gPSBkZWZhdWx0UHJvcHNbaV07XG4gICAgICAgIHJldHVybiBwcm9wcztcbiAgICB9XG4gICAgZnVuY3Rpb24gY3JlYXRlTm9kZShub2RlTmFtZSwgaXNTdmcpIHtcbiAgICAgICAgdmFyIG5vZGUgPSBpc1N2ZyA/IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUygnaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnLCBub2RlTmFtZSkgOiBkb2N1bWVudC5jcmVhdGVFbGVtZW50KG5vZGVOYW1lKTtcbiAgICAgICAgbm9kZS5fX24gPSBub2RlTmFtZTtcbiAgICAgICAgcmV0dXJuIG5vZGU7XG4gICAgfVxuICAgIGZ1bmN0aW9uIHJlbW92ZU5vZGUobm9kZSkge1xuICAgICAgICBpZiAobm9kZS5wYXJlbnROb2RlKSBub2RlLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQobm9kZSk7XG4gICAgfVxuICAgIGZ1bmN0aW9uIHNldEFjY2Vzc29yKG5vZGUsIG5hbWUsIG9sZCwgdmFsdWUsIGlzU3ZnKSB7XG4gICAgICAgIGlmICgnY2xhc3NOYW1lJyA9PT0gbmFtZSkgbmFtZSA9ICdjbGFzcyc7XG4gICAgICAgIGlmICgna2V5JyA9PT0gbmFtZSkgOyBlbHNlIGlmICgncmVmJyA9PT0gbmFtZSkge1xuICAgICAgICAgICAgaWYgKG9sZCkgb2xkKG51bGwpO1xuICAgICAgICAgICAgaWYgKHZhbHVlKSB2YWx1ZShub2RlKTtcbiAgICAgICAgfSBlbHNlIGlmICgnY2xhc3MnID09PSBuYW1lICYmICFpc1N2Zykgbm9kZS5jbGFzc05hbWUgPSB2YWx1ZSB8fCAnJzsgZWxzZSBpZiAoJ3N0eWxlJyA9PT0gbmFtZSkge1xuICAgICAgICAgICAgaWYgKCF2YWx1ZSB8fCAnc3RyaW5nJyA9PSB0eXBlb2YgdmFsdWUgfHwgJ3N0cmluZycgPT0gdHlwZW9mIG9sZCkgbm9kZS5zdHlsZS5jc3NUZXh0ID0gdmFsdWUgfHwgJyc7XG4gICAgICAgICAgICBpZiAodmFsdWUgJiYgJ29iamVjdCcgPT0gdHlwZW9mIHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgaWYgKCdzdHJpbmcnICE9IHR5cGVvZiBvbGQpIGZvciAodmFyIGkgaW4gb2xkKSBpZiAoIShpIGluIHZhbHVlKSkgbm9kZS5zdHlsZVtpXSA9ICcnO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgaW4gdmFsdWUpIG5vZGUuc3R5bGVbaV0gPSAnbnVtYmVyJyA9PSB0eXBlb2YgdmFsdWVbaV0gJiYgSVNfTk9OX0RJTUVOU0lPTkFMLnRlc3QoaSkgPT09ICExID8gdmFsdWVbaV0gKyAncHgnIDogdmFsdWVbaV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoJ2Rhbmdlcm91c2x5U2V0SW5uZXJIVE1MJyA9PT0gbmFtZSkge1xuICAgICAgICAgICAgaWYgKHZhbHVlKSBub2RlLmlubmVySFRNTCA9IHZhbHVlLl9faHRtbCB8fCAnJztcbiAgICAgICAgfSBlbHNlIGlmICgnbycgPT0gbmFtZVswXSAmJiAnbicgPT0gbmFtZVsxXSkge1xuICAgICAgICAgICAgdmFyIHVzZUNhcHR1cmUgPSBuYW1lICE9PSAobmFtZSA9IG5hbWUucmVwbGFjZSgvQ2FwdHVyZSQvLCAnJykpO1xuICAgICAgICAgICAgbmFtZSA9IG5hbWUudG9Mb3dlckNhc2UoKS5zdWJzdHJpbmcoMik7XG4gICAgICAgICAgICBpZiAodmFsdWUpIHtcbiAgICAgICAgICAgICAgICBpZiAoIW9sZCkgbm9kZS5hZGRFdmVudExpc3RlbmVyKG5hbWUsIGV2ZW50UHJveHksIHVzZUNhcHR1cmUpO1xuICAgICAgICAgICAgfSBlbHNlIG5vZGUucmVtb3ZlRXZlbnRMaXN0ZW5lcihuYW1lLCBldmVudFByb3h5LCB1c2VDYXB0dXJlKTtcbiAgICAgICAgICAgIChub2RlLl9fbCB8fCAobm9kZS5fX2wgPSB7fSkpW25hbWVdID0gdmFsdWU7XG4gICAgICAgIH0gZWxzZSBpZiAoJ2xpc3QnICE9PSBuYW1lICYmICd0eXBlJyAhPT0gbmFtZSAmJiAhaXNTdmcgJiYgbmFtZSBpbiBub2RlKSB7XG4gICAgICAgICAgICBzZXRQcm9wZXJ0eShub2RlLCBuYW1lLCBudWxsID09IHZhbHVlID8gJycgOiB2YWx1ZSk7XG4gICAgICAgICAgICBpZiAobnVsbCA9PSB2YWx1ZSB8fCB2YWx1ZSA9PT0gITEpIG5vZGUucmVtb3ZlQXR0cmlidXRlKG5hbWUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFyIG5zID0gaXNTdmcgJiYgbmFtZSAhPT0gKG5hbWUgPSBuYW1lLnJlcGxhY2UoL154bGlua1xcOj8vLCAnJykpO1xuICAgICAgICAgICAgaWYgKG51bGwgPT0gdmFsdWUgfHwgdmFsdWUgPT09ICExKSBpZiAobnMpIG5vZGUucmVtb3ZlQXR0cmlidXRlTlMoJ2h0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsnLCBuYW1lLnRvTG93ZXJDYXNlKCkpOyBlbHNlIG5vZGUucmVtb3ZlQXR0cmlidXRlKG5hbWUpOyBlbHNlIGlmICgnZnVuY3Rpb24nICE9IHR5cGVvZiB2YWx1ZSkgaWYgKG5zKSBub2RlLnNldEF0dHJpYnV0ZU5TKCdodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rJywgbmFtZS50b0xvd2VyQ2FzZSgpLCB2YWx1ZSk7IGVsc2Ugbm9kZS5zZXRBdHRyaWJ1dGUobmFtZSwgdmFsdWUpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGZ1bmN0aW9uIHNldFByb3BlcnR5KG5vZGUsIG5hbWUsIHZhbHVlKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBub2RlW25hbWVdID0gdmFsdWU7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHt9XG4gICAgfVxuICAgIGZ1bmN0aW9uIGV2ZW50UHJveHkoZSkge1xuICAgICAgICByZXR1cm4gdGhpcy5fX2xbZS50eXBlXShvcHRpb25zLmV2ZW50ICYmIG9wdGlvbnMuZXZlbnQoZSkgfHwgZSk7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGZsdXNoTW91bnRzKCkge1xuICAgICAgICB2YXIgYztcbiAgICAgICAgd2hpbGUgKGMgPSBtb3VudHMucG9wKCkpIHtcbiAgICAgICAgICAgIGlmIChvcHRpb25zLmFmdGVyTW91bnQpIG9wdGlvbnMuYWZ0ZXJNb3VudChjKTtcbiAgICAgICAgICAgIGlmIChjLmNvbXBvbmVudERpZE1vdW50KSBjLmNvbXBvbmVudERpZE1vdW50KCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZnVuY3Rpb24gZGlmZihkb20sIHZub2RlLCBjb250ZXh0LCBtb3VudEFsbCwgcGFyZW50LCBjb21wb25lbnRSb290KSB7XG4gICAgICAgIGlmICghZGlmZkxldmVsKyspIHtcbiAgICAgICAgICAgIGlzU3ZnTW9kZSA9IG51bGwgIT0gcGFyZW50ICYmIHZvaWQgMCAhPT0gcGFyZW50Lm93bmVyU1ZHRWxlbWVudDtcbiAgICAgICAgICAgIGh5ZHJhdGluZyA9IG51bGwgIT0gZG9tICYmICEoJ19fcHJlYWN0YXR0cl8nIGluIGRvbSk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHJldCA9IGlkaWZmKGRvbSwgdm5vZGUsIGNvbnRleHQsIG1vdW50QWxsLCBjb21wb25lbnRSb290KTtcbiAgICAgICAgaWYgKHBhcmVudCAmJiByZXQucGFyZW50Tm9kZSAhPT0gcGFyZW50KSBwYXJlbnQuYXBwZW5kQ2hpbGQocmV0KTtcbiAgICAgICAgaWYgKCEtLWRpZmZMZXZlbCkge1xuICAgICAgICAgICAgaHlkcmF0aW5nID0gITE7XG4gICAgICAgICAgICBpZiAoIWNvbXBvbmVudFJvb3QpIGZsdXNoTW91bnRzKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICB9XG4gICAgZnVuY3Rpb24gaWRpZmYoZG9tLCB2bm9kZSwgY29udGV4dCwgbW91bnRBbGwsIGNvbXBvbmVudFJvb3QpIHtcbiAgICAgICAgdmFyIG91dCA9IGRvbSwgcHJldlN2Z01vZGUgPSBpc1N2Z01vZGU7XG4gICAgICAgIGlmIChudWxsID09IHZub2RlKSB2bm9kZSA9ICcnO1xuICAgICAgICBpZiAoJ3N0cmluZycgPT0gdHlwZW9mIHZub2RlKSB7XG4gICAgICAgICAgICBpZiAoZG9tICYmIHZvaWQgMCAhPT0gZG9tLnNwbGl0VGV4dCAmJiBkb20ucGFyZW50Tm9kZSAmJiAoIWRvbS5fY29tcG9uZW50IHx8IGNvbXBvbmVudFJvb3QpKSB7XG4gICAgICAgICAgICAgICAgaWYgKGRvbS5ub2RlVmFsdWUgIT0gdm5vZGUpIGRvbS5ub2RlVmFsdWUgPSB2bm9kZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgb3V0ID0gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUodm5vZGUpO1xuICAgICAgICAgICAgICAgIGlmIChkb20pIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRvbS5wYXJlbnROb2RlKSBkb20ucGFyZW50Tm9kZS5yZXBsYWNlQ2hpbGQob3V0LCBkb20pO1xuICAgICAgICAgICAgICAgICAgICByZWNvbGxlY3ROb2RlVHJlZShkb20sICEwKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBvdXQuX19wcmVhY3RhdHRyXyA9ICEwO1xuICAgICAgICAgICAgcmV0dXJuIG91dDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoJ2Z1bmN0aW9uJyA9PSB0eXBlb2Ygdm5vZGUubm9kZU5hbWUpIHJldHVybiBidWlsZENvbXBvbmVudEZyb21WTm9kZShkb20sIHZub2RlLCBjb250ZXh0LCBtb3VudEFsbCk7XG4gICAgICAgIGlzU3ZnTW9kZSA9ICdzdmcnID09PSB2bm9kZS5ub2RlTmFtZSA/ICEwIDogJ2ZvcmVpZ25PYmplY3QnID09PSB2bm9kZS5ub2RlTmFtZSA/ICExIDogaXNTdmdNb2RlO1xuICAgICAgICBpZiAoIWRvbSB8fCAhaXNOYW1lZE5vZGUoZG9tLCBTdHJpbmcodm5vZGUubm9kZU5hbWUpKSkge1xuICAgICAgICAgICAgb3V0ID0gY3JlYXRlTm9kZShTdHJpbmcodm5vZGUubm9kZU5hbWUpLCBpc1N2Z01vZGUpO1xuICAgICAgICAgICAgaWYgKGRvbSkge1xuICAgICAgICAgICAgICAgIHdoaWxlIChkb20uZmlyc3RDaGlsZCkgb3V0LmFwcGVuZENoaWxkKGRvbS5maXJzdENoaWxkKTtcbiAgICAgICAgICAgICAgICBpZiAoZG9tLnBhcmVudE5vZGUpIGRvbS5wYXJlbnROb2RlLnJlcGxhY2VDaGlsZChvdXQsIGRvbSk7XG4gICAgICAgICAgICAgICAgcmVjb2xsZWN0Tm9kZVRyZWUoZG9tLCAhMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGZjID0gb3V0LmZpcnN0Q2hpbGQsIHByb3BzID0gb3V0Ll9fcHJlYWN0YXR0cl8gfHwgKG91dC5fX3ByZWFjdGF0dHJfID0ge30pLCB2Y2hpbGRyZW4gPSB2bm9kZS5jaGlsZHJlbjtcbiAgICAgICAgaWYgKCFoeWRyYXRpbmcgJiYgdmNoaWxkcmVuICYmIDEgPT09IHZjaGlsZHJlbi5sZW5ndGggJiYgJ3N0cmluZycgPT0gdHlwZW9mIHZjaGlsZHJlblswXSAmJiBudWxsICE9IGZjICYmIHZvaWQgMCAhPT0gZmMuc3BsaXRUZXh0ICYmIG51bGwgPT0gZmMubmV4dFNpYmxpbmcpIHtcbiAgICAgICAgICAgIGlmIChmYy5ub2RlVmFsdWUgIT0gdmNoaWxkcmVuWzBdKSBmYy5ub2RlVmFsdWUgPSB2Y2hpbGRyZW5bMF07XG4gICAgICAgIH0gZWxzZSBpZiAodmNoaWxkcmVuICYmIHZjaGlsZHJlbi5sZW5ndGggfHwgbnVsbCAhPSBmYykgaW5uZXJEaWZmTm9kZShvdXQsIHZjaGlsZHJlbiwgY29udGV4dCwgbW91bnRBbGwsIGh5ZHJhdGluZyB8fCBudWxsICE9IHByb3BzLmRhbmdlcm91c2x5U2V0SW5uZXJIVE1MKTtcbiAgICAgICAgZGlmZkF0dHJpYnV0ZXMob3V0LCB2bm9kZS5hdHRyaWJ1dGVzLCBwcm9wcyk7XG4gICAgICAgIGlzU3ZnTW9kZSA9IHByZXZTdmdNb2RlO1xuICAgICAgICByZXR1cm4gb3V0O1xuICAgIH1cbiAgICBmdW5jdGlvbiBpbm5lckRpZmZOb2RlKGRvbSwgdmNoaWxkcmVuLCBjb250ZXh0LCBtb3VudEFsbCwgaXNIeWRyYXRpbmcpIHtcbiAgICAgICAgdmFyIGosIGMsIHZjaGlsZCwgY2hpbGQsIG9yaWdpbmFsQ2hpbGRyZW4gPSBkb20uY2hpbGROb2RlcywgY2hpbGRyZW4gPSBbXSwga2V5ZWQgPSB7fSwga2V5ZWRMZW4gPSAwLCBtaW4gPSAwLCBsZW4gPSBvcmlnaW5hbENoaWxkcmVuLmxlbmd0aCwgY2hpbGRyZW5MZW4gPSAwLCB2bGVuID0gdmNoaWxkcmVuID8gdmNoaWxkcmVuLmxlbmd0aCA6IDA7XG4gICAgICAgIGlmICgwICE9PSBsZW4pIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBfY2hpbGQgPSBvcmlnaW5hbENoaWxkcmVuW2ldLCBwcm9wcyA9IF9jaGlsZC5fX3ByZWFjdGF0dHJfLCBrZXkgPSB2bGVuICYmIHByb3BzID8gX2NoaWxkLl9jb21wb25lbnQgPyBfY2hpbGQuX2NvbXBvbmVudC5fX2sgOiBwcm9wcy5rZXkgOiBudWxsO1xuICAgICAgICAgICAgaWYgKG51bGwgIT0ga2V5KSB7XG4gICAgICAgICAgICAgICAga2V5ZWRMZW4rKztcbiAgICAgICAgICAgICAgICBrZXllZFtrZXldID0gX2NoaWxkO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwcm9wcyB8fCAodm9pZCAwICE9PSBfY2hpbGQuc3BsaXRUZXh0ID8gaXNIeWRyYXRpbmcgPyBfY2hpbGQubm9kZVZhbHVlLnRyaW0oKSA6ICEwIDogaXNIeWRyYXRpbmcpKSBjaGlsZHJlbltjaGlsZHJlbkxlbisrXSA9IF9jaGlsZDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoMCAhPT0gdmxlbikgZm9yICh2YXIgaSA9IDA7IGkgPCB2bGVuOyBpKyspIHtcbiAgICAgICAgICAgIHZjaGlsZCA9IHZjaGlsZHJlbltpXTtcbiAgICAgICAgICAgIGNoaWxkID0gbnVsbDtcbiAgICAgICAgICAgIHZhciBrZXkgPSB2Y2hpbGQua2V5O1xuICAgICAgICAgICAgaWYgKG51bGwgIT0ga2V5KSB7XG4gICAgICAgICAgICAgICAgaWYgKGtleWVkTGVuICYmIHZvaWQgMCAhPT0ga2V5ZWRba2V5XSkge1xuICAgICAgICAgICAgICAgICAgICBjaGlsZCA9IGtleWVkW2tleV07XG4gICAgICAgICAgICAgICAgICAgIGtleWVkW2tleV0gPSB2b2lkIDA7XG4gICAgICAgICAgICAgICAgICAgIGtleWVkTGVuLS07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmICghY2hpbGQgJiYgbWluIDwgY2hpbGRyZW5MZW4pIGZvciAoaiA9IG1pbjsgaiA8IGNoaWxkcmVuTGVuOyBqKyspIGlmICh2b2lkIDAgIT09IGNoaWxkcmVuW2pdICYmIGlzU2FtZU5vZGVUeXBlKGMgPSBjaGlsZHJlbltqXSwgdmNoaWxkLCBpc0h5ZHJhdGluZykpIHtcbiAgICAgICAgICAgICAgICBjaGlsZCA9IGM7XG4gICAgICAgICAgICAgICAgY2hpbGRyZW5bal0gPSB2b2lkIDA7XG4gICAgICAgICAgICAgICAgaWYgKGogPT09IGNoaWxkcmVuTGVuIC0gMSkgY2hpbGRyZW5MZW4tLTtcbiAgICAgICAgICAgICAgICBpZiAoaiA9PT0gbWluKSBtaW4rKztcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNoaWxkID0gaWRpZmYoY2hpbGQsIHZjaGlsZCwgY29udGV4dCwgbW91bnRBbGwpO1xuICAgICAgICAgICAgaWYgKGNoaWxkICYmIGNoaWxkICE9PSBkb20pIGlmIChpID49IGxlbikgZG9tLmFwcGVuZENoaWxkKGNoaWxkKTsgZWxzZSBpZiAoY2hpbGQgIT09IG9yaWdpbmFsQ2hpbGRyZW5baV0pIGlmIChjaGlsZCA9PT0gb3JpZ2luYWxDaGlsZHJlbltpICsgMV0pIHJlbW92ZU5vZGUob3JpZ2luYWxDaGlsZHJlbltpXSk7IGVsc2UgZG9tLmluc2VydEJlZm9yZShjaGlsZCwgb3JpZ2luYWxDaGlsZHJlbltpXSB8fCBudWxsKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoa2V5ZWRMZW4pIGZvciAodmFyIGkgaW4ga2V5ZWQpIGlmICh2b2lkIDAgIT09IGtleWVkW2ldKSByZWNvbGxlY3ROb2RlVHJlZShrZXllZFtpXSwgITEpO1xuICAgICAgICB3aGlsZSAobWluIDw9IGNoaWxkcmVuTGVuKSBpZiAodm9pZCAwICE9PSAoY2hpbGQgPSBjaGlsZHJlbltjaGlsZHJlbkxlbi0tXSkpIHJlY29sbGVjdE5vZGVUcmVlKGNoaWxkLCAhMSk7XG4gICAgfVxuICAgIGZ1bmN0aW9uIHJlY29sbGVjdE5vZGVUcmVlKG5vZGUsIHVubW91bnRPbmx5KSB7XG4gICAgICAgIHZhciBjb21wb25lbnQgPSBub2RlLl9jb21wb25lbnQ7XG4gICAgICAgIGlmIChjb21wb25lbnQpIHVubW91bnRDb21wb25lbnQoY29tcG9uZW50KTsgZWxzZSB7XG4gICAgICAgICAgICBpZiAobnVsbCAhPSBub2RlLl9fcHJlYWN0YXR0cl8gJiYgbm9kZS5fX3ByZWFjdGF0dHJfLnJlZikgbm9kZS5fX3ByZWFjdGF0dHJfLnJlZihudWxsKTtcbiAgICAgICAgICAgIGlmICh1bm1vdW50T25seSA9PT0gITEgfHwgbnVsbCA9PSBub2RlLl9fcHJlYWN0YXR0cl8pIHJlbW92ZU5vZGUobm9kZSk7XG4gICAgICAgICAgICByZW1vdmVDaGlsZHJlbihub2RlKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBmdW5jdGlvbiByZW1vdmVDaGlsZHJlbihub2RlKSB7XG4gICAgICAgIG5vZGUgPSBub2RlLmxhc3RDaGlsZDtcbiAgICAgICAgd2hpbGUgKG5vZGUpIHtcbiAgICAgICAgICAgIHZhciBuZXh0ID0gbm9kZS5wcmV2aW91c1NpYmxpbmc7XG4gICAgICAgICAgICByZWNvbGxlY3ROb2RlVHJlZShub2RlLCAhMCk7XG4gICAgICAgICAgICBub2RlID0gbmV4dDtcbiAgICAgICAgfVxuICAgIH1cbiAgICBmdW5jdGlvbiBkaWZmQXR0cmlidXRlcyhkb20sIGF0dHJzLCBvbGQpIHtcbiAgICAgICAgdmFyIG5hbWU7XG4gICAgICAgIGZvciAobmFtZSBpbiBvbGQpIGlmICgoIWF0dHJzIHx8IG51bGwgPT0gYXR0cnNbbmFtZV0pICYmIG51bGwgIT0gb2xkW25hbWVdKSBzZXRBY2Nlc3Nvcihkb20sIG5hbWUsIG9sZFtuYW1lXSwgb2xkW25hbWVdID0gdm9pZCAwLCBpc1N2Z01vZGUpO1xuICAgICAgICBmb3IgKG5hbWUgaW4gYXR0cnMpIGlmICghKCdjaGlsZHJlbicgPT09IG5hbWUgfHwgJ2lubmVySFRNTCcgPT09IG5hbWUgfHwgbmFtZSBpbiBvbGQgJiYgYXR0cnNbbmFtZV0gPT09ICgndmFsdWUnID09PSBuYW1lIHx8ICdjaGVja2VkJyA9PT0gbmFtZSA/IGRvbVtuYW1lXSA6IG9sZFtuYW1lXSkpKSBzZXRBY2Nlc3Nvcihkb20sIG5hbWUsIG9sZFtuYW1lXSwgb2xkW25hbWVdID0gYXR0cnNbbmFtZV0sIGlzU3ZnTW9kZSk7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGNvbGxlY3RDb21wb25lbnQoY29tcG9uZW50KSB7XG4gICAgICAgIHZhciBuYW1lID0gY29tcG9uZW50LmNvbnN0cnVjdG9yLm5hbWU7XG4gICAgICAgIChjb21wb25lbnRzW25hbWVdIHx8IChjb21wb25lbnRzW25hbWVdID0gW10pKS5wdXNoKGNvbXBvbmVudCk7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGNyZWF0ZUNvbXBvbmVudChDdG9yLCBwcm9wcywgY29udGV4dCkge1xuICAgICAgICB2YXIgaW5zdCwgbGlzdCA9IGNvbXBvbmVudHNbQ3Rvci5uYW1lXTtcbiAgICAgICAgaWYgKEN0b3IucHJvdG90eXBlICYmIEN0b3IucHJvdG90eXBlLnJlbmRlcikge1xuICAgICAgICAgICAgaW5zdCA9IG5ldyBDdG9yKHByb3BzLCBjb250ZXh0KTtcbiAgICAgICAgICAgIENvbXBvbmVudC5jYWxsKGluc3QsIHByb3BzLCBjb250ZXh0KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGluc3QgPSBuZXcgQ29tcG9uZW50KHByb3BzLCBjb250ZXh0KTtcbiAgICAgICAgICAgIGluc3QuY29uc3RydWN0b3IgPSBDdG9yO1xuICAgICAgICAgICAgaW5zdC5yZW5kZXIgPSBkb1JlbmRlcjtcbiAgICAgICAgfVxuICAgICAgICBpZiAobGlzdCkgZm9yICh2YXIgaSA9IGxpc3QubGVuZ3RoOyBpLS07ICkgaWYgKGxpc3RbaV0uY29uc3RydWN0b3IgPT09IEN0b3IpIHtcbiAgICAgICAgICAgIGluc3QuX19iID0gbGlzdFtpXS5fX2I7XG4gICAgICAgICAgICBsaXN0LnNwbGljZShpLCAxKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBpbnN0O1xuICAgIH1cbiAgICBmdW5jdGlvbiBkb1JlbmRlcihwcm9wcywgc3RhdGUsIGNvbnRleHQpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY29uc3RydWN0b3IocHJvcHMsIGNvbnRleHQpO1xuICAgIH1cbiAgICBmdW5jdGlvbiBzZXRDb21wb25lbnRQcm9wcyhjb21wb25lbnQsIHByb3BzLCBvcHRzLCBjb250ZXh0LCBtb3VudEFsbCkge1xuICAgICAgICBpZiAoIWNvbXBvbmVudC5fX3gpIHtcbiAgICAgICAgICAgIGNvbXBvbmVudC5fX3ggPSAhMDtcbiAgICAgICAgICAgIGlmIChjb21wb25lbnQuX19yID0gcHJvcHMucmVmKSBkZWxldGUgcHJvcHMucmVmO1xuICAgICAgICAgICAgaWYgKGNvbXBvbmVudC5fX2sgPSBwcm9wcy5rZXkpIGRlbGV0ZSBwcm9wcy5rZXk7XG4gICAgICAgICAgICBpZiAoIWNvbXBvbmVudC5iYXNlIHx8IG1vdW50QWxsKSB7XG4gICAgICAgICAgICAgICAgaWYgKGNvbXBvbmVudC5jb21wb25lbnRXaWxsTW91bnQpIGNvbXBvbmVudC5jb21wb25lbnRXaWxsTW91bnQoKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoY29tcG9uZW50LmNvbXBvbmVudFdpbGxSZWNlaXZlUHJvcHMpIGNvbXBvbmVudC5jb21wb25lbnRXaWxsUmVjZWl2ZVByb3BzKHByb3BzLCBjb250ZXh0KTtcbiAgICAgICAgICAgIGlmIChjb250ZXh0ICYmIGNvbnRleHQgIT09IGNvbXBvbmVudC5jb250ZXh0KSB7XG4gICAgICAgICAgICAgICAgaWYgKCFjb21wb25lbnQuX19jKSBjb21wb25lbnQuX19jID0gY29tcG9uZW50LmNvbnRleHQ7XG4gICAgICAgICAgICAgICAgY29tcG9uZW50LmNvbnRleHQgPSBjb250ZXh0O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCFjb21wb25lbnQuX19wKSBjb21wb25lbnQuX19wID0gY29tcG9uZW50LnByb3BzO1xuICAgICAgICAgICAgY29tcG9uZW50LnByb3BzID0gcHJvcHM7XG4gICAgICAgICAgICBjb21wb25lbnQuX194ID0gITE7XG4gICAgICAgICAgICBpZiAoMCAhPT0gb3B0cykgaWYgKDEgPT09IG9wdHMgfHwgb3B0aW9ucy5zeW5jQ29tcG9uZW50VXBkYXRlcyAhPT0gITEgfHwgIWNvbXBvbmVudC5iYXNlKSByZW5kZXJDb21wb25lbnQoY29tcG9uZW50LCAxLCBtb3VudEFsbCk7IGVsc2UgZW5xdWV1ZVJlbmRlcihjb21wb25lbnQpO1xuICAgICAgICAgICAgaWYgKGNvbXBvbmVudC5fX3IpIGNvbXBvbmVudC5fX3IoY29tcG9uZW50KTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBmdW5jdGlvbiByZW5kZXJDb21wb25lbnQoY29tcG9uZW50LCBvcHRzLCBtb3VudEFsbCwgaXNDaGlsZCkge1xuICAgICAgICBpZiAoIWNvbXBvbmVudC5fX3gpIHtcbiAgICAgICAgICAgIHZhciByZW5kZXJlZCwgaW5zdCwgY2Jhc2UsIHByb3BzID0gY29tcG9uZW50LnByb3BzLCBzdGF0ZSA9IGNvbXBvbmVudC5zdGF0ZSwgY29udGV4dCA9IGNvbXBvbmVudC5jb250ZXh0LCBwcmV2aW91c1Byb3BzID0gY29tcG9uZW50Ll9fcCB8fCBwcm9wcywgcHJldmlvdXNTdGF0ZSA9IGNvbXBvbmVudC5fX3MgfHwgc3RhdGUsIHByZXZpb3VzQ29udGV4dCA9IGNvbXBvbmVudC5fX2MgfHwgY29udGV4dCwgaXNVcGRhdGUgPSBjb21wb25lbnQuYmFzZSwgbmV4dEJhc2UgPSBjb21wb25lbnQuX19iLCBpbml0aWFsQmFzZSA9IGlzVXBkYXRlIHx8IG5leHRCYXNlLCBpbml0aWFsQ2hpbGRDb21wb25lbnQgPSBjb21wb25lbnQuX2NvbXBvbmVudCwgc2tpcCA9ICExO1xuICAgICAgICAgICAgaWYgKGlzVXBkYXRlKSB7XG4gICAgICAgICAgICAgICAgY29tcG9uZW50LnByb3BzID0gcHJldmlvdXNQcm9wcztcbiAgICAgICAgICAgICAgICBjb21wb25lbnQuc3RhdGUgPSBwcmV2aW91c1N0YXRlO1xuICAgICAgICAgICAgICAgIGNvbXBvbmVudC5jb250ZXh0ID0gcHJldmlvdXNDb250ZXh0O1xuICAgICAgICAgICAgICAgIGlmICgyICE9PSBvcHRzICYmIGNvbXBvbmVudC5zaG91bGRDb21wb25lbnRVcGRhdGUgJiYgY29tcG9uZW50LnNob3VsZENvbXBvbmVudFVwZGF0ZShwcm9wcywgc3RhdGUsIGNvbnRleHQpID09PSAhMSkgc2tpcCA9ICEwOyBlbHNlIGlmIChjb21wb25lbnQuY29tcG9uZW50V2lsbFVwZGF0ZSkgY29tcG9uZW50LmNvbXBvbmVudFdpbGxVcGRhdGUocHJvcHMsIHN0YXRlLCBjb250ZXh0KTtcbiAgICAgICAgICAgICAgICBjb21wb25lbnQucHJvcHMgPSBwcm9wcztcbiAgICAgICAgICAgICAgICBjb21wb25lbnQuc3RhdGUgPSBzdGF0ZTtcbiAgICAgICAgICAgICAgICBjb21wb25lbnQuY29udGV4dCA9IGNvbnRleHQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb21wb25lbnQuX19wID0gY29tcG9uZW50Ll9fcyA9IGNvbXBvbmVudC5fX2MgPSBjb21wb25lbnQuX19iID0gbnVsbDtcbiAgICAgICAgICAgIGNvbXBvbmVudC5fX2QgPSAhMTtcbiAgICAgICAgICAgIGlmICghc2tpcCkge1xuICAgICAgICAgICAgICAgIHJlbmRlcmVkID0gY29tcG9uZW50LnJlbmRlcihwcm9wcywgc3RhdGUsIGNvbnRleHQpO1xuICAgICAgICAgICAgICAgIGlmIChjb21wb25lbnQuZ2V0Q2hpbGRDb250ZXh0KSBjb250ZXh0ID0gZXh0ZW5kKGV4dGVuZCh7fSwgY29udGV4dCksIGNvbXBvbmVudC5nZXRDaGlsZENvbnRleHQoKSk7XG4gICAgICAgICAgICAgICAgdmFyIHRvVW5tb3VudCwgYmFzZSwgY2hpbGRDb21wb25lbnQgPSByZW5kZXJlZCAmJiByZW5kZXJlZC5ub2RlTmFtZTtcbiAgICAgICAgICAgICAgICBpZiAoJ2Z1bmN0aW9uJyA9PSB0eXBlb2YgY2hpbGRDb21wb25lbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGNoaWxkUHJvcHMgPSBnZXROb2RlUHJvcHMocmVuZGVyZWQpO1xuICAgICAgICAgICAgICAgICAgICBpbnN0ID0gaW5pdGlhbENoaWxkQ29tcG9uZW50O1xuICAgICAgICAgICAgICAgICAgICBpZiAoaW5zdCAmJiBpbnN0LmNvbnN0cnVjdG9yID09PSBjaGlsZENvbXBvbmVudCAmJiBjaGlsZFByb3BzLmtleSA9PSBpbnN0Ll9faykgc2V0Q29tcG9uZW50UHJvcHMoaW5zdCwgY2hpbGRQcm9wcywgMSwgY29udGV4dCwgITEpOyBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRvVW5tb3VudCA9IGluc3Q7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnQuX2NvbXBvbmVudCA9IGluc3QgPSBjcmVhdGVDb21wb25lbnQoY2hpbGRDb21wb25lbnQsIGNoaWxkUHJvcHMsIGNvbnRleHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaW5zdC5fX2IgPSBpbnN0Ll9fYiB8fCBuZXh0QmFzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGluc3QuX191ID0gY29tcG9uZW50O1xuICAgICAgICAgICAgICAgICAgICAgICAgc2V0Q29tcG9uZW50UHJvcHMoaW5zdCwgY2hpbGRQcm9wcywgMCwgY29udGV4dCwgITEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVuZGVyQ29tcG9uZW50KGluc3QsIDEsIG1vdW50QWxsLCAhMCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYmFzZSA9IGluc3QuYmFzZTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjYmFzZSA9IGluaXRpYWxCYXNlO1xuICAgICAgICAgICAgICAgICAgICB0b1VubW91bnQgPSBpbml0aWFsQ2hpbGRDb21wb25lbnQ7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0b1VubW91bnQpIGNiYXNlID0gY29tcG9uZW50Ll9jb21wb25lbnQgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaW5pdGlhbEJhc2UgfHwgMSA9PT0gb3B0cykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNiYXNlKSBjYmFzZS5fY29tcG9uZW50ID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJhc2UgPSBkaWZmKGNiYXNlLCByZW5kZXJlZCwgY29udGV4dCwgbW91bnRBbGwgfHwgIWlzVXBkYXRlLCBpbml0aWFsQmFzZSAmJiBpbml0aWFsQmFzZS5wYXJlbnROb2RlLCAhMCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGluaXRpYWxCYXNlICYmIGJhc2UgIT09IGluaXRpYWxCYXNlICYmIGluc3QgIT09IGluaXRpYWxDaGlsZENvbXBvbmVudCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgYmFzZVBhcmVudCA9IGluaXRpYWxCYXNlLnBhcmVudE5vZGU7XG4gICAgICAgICAgICAgICAgICAgIGlmIChiYXNlUGFyZW50ICYmIGJhc2UgIT09IGJhc2VQYXJlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJhc2VQYXJlbnQucmVwbGFjZUNoaWxkKGJhc2UsIGluaXRpYWxCYXNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghdG9Vbm1vdW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5pdGlhbEJhc2UuX2NvbXBvbmVudCA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVjb2xsZWN0Tm9kZVRyZWUoaW5pdGlhbEJhc2UsICExKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAodG9Vbm1vdW50KSB1bm1vdW50Q29tcG9uZW50KHRvVW5tb3VudCk7XG4gICAgICAgICAgICAgICAgY29tcG9uZW50LmJhc2UgPSBiYXNlO1xuICAgICAgICAgICAgICAgIGlmIChiYXNlICYmICFpc0NoaWxkKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBjb21wb25lbnRSZWYgPSBjb21wb25lbnQsIHQgPSBjb21wb25lbnQ7XG4gICAgICAgICAgICAgICAgICAgIHdoaWxlICh0ID0gdC5fX3UpIChjb21wb25lbnRSZWYgPSB0KS5iYXNlID0gYmFzZTtcbiAgICAgICAgICAgICAgICAgICAgYmFzZS5fY29tcG9uZW50ID0gY29tcG9uZW50UmVmO1xuICAgICAgICAgICAgICAgICAgICBiYXNlLl9jb21wb25lbnRDb25zdHJ1Y3RvciA9IGNvbXBvbmVudFJlZi5jb25zdHJ1Y3RvcjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIWlzVXBkYXRlIHx8IG1vdW50QWxsKSBtb3VudHMudW5zaGlmdChjb21wb25lbnQpOyBlbHNlIGlmICghc2tpcCkge1xuICAgICAgICAgICAgICAgIGZsdXNoTW91bnRzKCk7XG4gICAgICAgICAgICAgICAgaWYgKGNvbXBvbmVudC5jb21wb25lbnREaWRVcGRhdGUpIGNvbXBvbmVudC5jb21wb25lbnREaWRVcGRhdGUocHJldmlvdXNQcm9wcywgcHJldmlvdXNTdGF0ZSwgcHJldmlvdXNDb250ZXh0KTtcbiAgICAgICAgICAgICAgICBpZiAob3B0aW9ucy5hZnRlclVwZGF0ZSkgb3B0aW9ucy5hZnRlclVwZGF0ZShjb21wb25lbnQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG51bGwgIT0gY29tcG9uZW50Ll9faCkgd2hpbGUgKGNvbXBvbmVudC5fX2gubGVuZ3RoKSBjb21wb25lbnQuX19oLnBvcCgpLmNhbGwoY29tcG9uZW50KTtcbiAgICAgICAgICAgIGlmICghZGlmZkxldmVsICYmICFpc0NoaWxkKSBmbHVzaE1vdW50cygpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGZ1bmN0aW9uIGJ1aWxkQ29tcG9uZW50RnJvbVZOb2RlKGRvbSwgdm5vZGUsIGNvbnRleHQsIG1vdW50QWxsKSB7XG4gICAgICAgIHZhciBjID0gZG9tICYmIGRvbS5fY29tcG9uZW50LCBvcmlnaW5hbENvbXBvbmVudCA9IGMsIG9sZERvbSA9IGRvbSwgaXNEaXJlY3RPd25lciA9IGMgJiYgZG9tLl9jb21wb25lbnRDb25zdHJ1Y3RvciA9PT0gdm5vZGUubm9kZU5hbWUsIGlzT3duZXIgPSBpc0RpcmVjdE93bmVyLCBwcm9wcyA9IGdldE5vZGVQcm9wcyh2bm9kZSk7XG4gICAgICAgIHdoaWxlIChjICYmICFpc093bmVyICYmIChjID0gYy5fX3UpKSBpc093bmVyID0gYy5jb25zdHJ1Y3RvciA9PT0gdm5vZGUubm9kZU5hbWU7XG4gICAgICAgIGlmIChjICYmIGlzT3duZXIgJiYgKCFtb3VudEFsbCB8fCBjLl9jb21wb25lbnQpKSB7XG4gICAgICAgICAgICBzZXRDb21wb25lbnRQcm9wcyhjLCBwcm9wcywgMywgY29udGV4dCwgbW91bnRBbGwpO1xuICAgICAgICAgICAgZG9tID0gYy5iYXNlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKG9yaWdpbmFsQ29tcG9uZW50ICYmICFpc0RpcmVjdE93bmVyKSB7XG4gICAgICAgICAgICAgICAgdW5tb3VudENvbXBvbmVudChvcmlnaW5hbENvbXBvbmVudCk7XG4gICAgICAgICAgICAgICAgZG9tID0gb2xkRG9tID0gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGMgPSBjcmVhdGVDb21wb25lbnQodm5vZGUubm9kZU5hbWUsIHByb3BzLCBjb250ZXh0KTtcbiAgICAgICAgICAgIGlmIChkb20gJiYgIWMuX19iKSB7XG4gICAgICAgICAgICAgICAgYy5fX2IgPSBkb207XG4gICAgICAgICAgICAgICAgb2xkRG9tID0gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNldENvbXBvbmVudFByb3BzKGMsIHByb3BzLCAxLCBjb250ZXh0LCBtb3VudEFsbCk7XG4gICAgICAgICAgICBkb20gPSBjLmJhc2U7XG4gICAgICAgICAgICBpZiAob2xkRG9tICYmIGRvbSAhPT0gb2xkRG9tKSB7XG4gICAgICAgICAgICAgICAgb2xkRG9tLl9jb21wb25lbnQgPSBudWxsO1xuICAgICAgICAgICAgICAgIHJlY29sbGVjdE5vZGVUcmVlKG9sZERvbSwgITEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBkb207XG4gICAgfVxuICAgIGZ1bmN0aW9uIHVubW91bnRDb21wb25lbnQoY29tcG9uZW50KSB7XG4gICAgICAgIGlmIChvcHRpb25zLmJlZm9yZVVubW91bnQpIG9wdGlvbnMuYmVmb3JlVW5tb3VudChjb21wb25lbnQpO1xuICAgICAgICB2YXIgYmFzZSA9IGNvbXBvbmVudC5iYXNlO1xuICAgICAgICBjb21wb25lbnQuX194ID0gITA7XG4gICAgICAgIGlmIChjb21wb25lbnQuY29tcG9uZW50V2lsbFVubW91bnQpIGNvbXBvbmVudC5jb21wb25lbnRXaWxsVW5tb3VudCgpO1xuICAgICAgICBjb21wb25lbnQuYmFzZSA9IG51bGw7XG4gICAgICAgIHZhciBpbm5lciA9IGNvbXBvbmVudC5fY29tcG9uZW50O1xuICAgICAgICBpZiAoaW5uZXIpIHVubW91bnRDb21wb25lbnQoaW5uZXIpOyBlbHNlIGlmIChiYXNlKSB7XG4gICAgICAgICAgICBpZiAoYmFzZS5fX3ByZWFjdGF0dHJfICYmIGJhc2UuX19wcmVhY3RhdHRyXy5yZWYpIGJhc2UuX19wcmVhY3RhdHRyXy5yZWYobnVsbCk7XG4gICAgICAgICAgICBjb21wb25lbnQuX19iID0gYmFzZTtcbiAgICAgICAgICAgIHJlbW92ZU5vZGUoYmFzZSk7XG4gICAgICAgICAgICBjb2xsZWN0Q29tcG9uZW50KGNvbXBvbmVudCk7XG4gICAgICAgICAgICByZW1vdmVDaGlsZHJlbihiYXNlKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY29tcG9uZW50Ll9fcikgY29tcG9uZW50Ll9fcihudWxsKTtcbiAgICB9XG4gICAgZnVuY3Rpb24gQ29tcG9uZW50KHByb3BzLCBjb250ZXh0KSB7XG4gICAgICAgIHRoaXMuX19kID0gITA7XG4gICAgICAgIHRoaXMuY29udGV4dCA9IGNvbnRleHQ7XG4gICAgICAgIHRoaXMucHJvcHMgPSBwcm9wcztcbiAgICAgICAgdGhpcy5zdGF0ZSA9IHRoaXMuc3RhdGUgfHwge307XG4gICAgfVxuICAgIGZ1bmN0aW9uIHJlbmRlcih2bm9kZSwgcGFyZW50LCBtZXJnZSkge1xuICAgICAgICByZXR1cm4gZGlmZihtZXJnZSwgdm5vZGUsIHt9LCAhMSwgcGFyZW50LCAhMSk7XG4gICAgfVxuICAgIHZhciBvcHRpb25zID0ge307XG4gICAgdmFyIHN0YWNrID0gW107XG4gICAgdmFyIEVNUFRZX0NISUxEUkVOID0gW107XG4gICAgdmFyIElTX05PTl9ESU1FTlNJT05BTCA9IC9hY2l0fGV4KD86c3xnfG58cHwkKXxycGh8b3dzfG1uY3xudHd8aW5lW2NoXXx6b298Xm9yZC9pO1xuICAgIHZhciBpdGVtcyA9IFtdO1xuICAgIHZhciBtb3VudHMgPSBbXTtcbiAgICB2YXIgZGlmZkxldmVsID0gMDtcbiAgICB2YXIgaXNTdmdNb2RlID0gITE7XG4gICAgdmFyIGh5ZHJhdGluZyA9ICExO1xuICAgIHZhciBjb21wb25lbnRzID0ge307XG4gICAgZXh0ZW5kKENvbXBvbmVudC5wcm90b3R5cGUsIHtcbiAgICAgICAgc2V0U3RhdGU6IGZ1bmN0aW9uKHN0YXRlLCBjYWxsYmFjaykge1xuICAgICAgICAgICAgdmFyIHMgPSB0aGlzLnN0YXRlO1xuICAgICAgICAgICAgaWYgKCF0aGlzLl9fcykgdGhpcy5fX3MgPSBleHRlbmQoe30sIHMpO1xuICAgICAgICAgICAgZXh0ZW5kKHMsICdmdW5jdGlvbicgPT0gdHlwZW9mIHN0YXRlID8gc3RhdGUocywgdGhpcy5wcm9wcykgOiBzdGF0ZSk7XG4gICAgICAgICAgICBpZiAoY2FsbGJhY2spICh0aGlzLl9faCA9IHRoaXMuX19oIHx8IFtdKS5wdXNoKGNhbGxiYWNrKTtcbiAgICAgICAgICAgIGVucXVldWVSZW5kZXIodGhpcyk7XG4gICAgICAgIH0sXG4gICAgICAgIGZvcmNlVXBkYXRlOiBmdW5jdGlvbihjYWxsYmFjaykge1xuICAgICAgICAgICAgaWYgKGNhbGxiYWNrKSAodGhpcy5fX2ggPSB0aGlzLl9faCB8fCBbXSkucHVzaChjYWxsYmFjayk7XG4gICAgICAgICAgICByZW5kZXJDb21wb25lbnQodGhpcywgMik7XG4gICAgICAgIH0sXG4gICAgICAgIHJlbmRlcjogZnVuY3Rpb24oKSB7fVxuICAgIH0pO1xuICAgIHZhciBwcmVhY3QgPSB7XG4gICAgICAgIGg6IGgsXG4gICAgICAgIGNyZWF0ZUVsZW1lbnQ6IGgsXG4gICAgICAgIGNsb25lRWxlbWVudDogY2xvbmVFbGVtZW50LFxuICAgICAgICBDb21wb25lbnQ6IENvbXBvbmVudCxcbiAgICAgICAgcmVuZGVyOiByZW5kZXIsXG4gICAgICAgIHJlcmVuZGVyOiByZXJlbmRlcixcbiAgICAgICAgb3B0aW9uczogb3B0aW9uc1xuICAgIH07XG4gICAgaWYgKCd1bmRlZmluZWQnICE9IHR5cGVvZiBtb2R1bGUpIG1vZHVsZS5leHBvcnRzID0gcHJlYWN0OyBlbHNlIHNlbGYucHJlYWN0ID0gcHJlYWN0O1xufSgpO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9cHJlYWN0LmpzLm1hcCIsInJlcXVpcmUoJy4vcG9seWZpbGxzLmpzJyk7XG5yZXF1aXJlKCcuL2Fzc2VydC5qcycpLnBvbGx1dGUoKTsgLy8gaW5qZWN0IEFzc2VydCBhbmQgVGVzdCBpbnRvIHdpbmRvdyBnbG9iYWwgb2JqZWN0XG5jb25zdFxuXHRSZWFjdCA9IHJlcXVpcmUoJ3ByZWFjdCcpLFxuXHRGaWxlU2F2ZXIgPSByZXF1aXJlKCdmaWxlLXNhdmVyJyksXG5cdEZpbGVPcGVuZXIgPSByZXF1aXJlKCcuL2NvbXBvbmVudHMvRmlsZU9wZW5lci5qcycpLFxuXG5cdFByaW50TW9kYWwgPSByZXF1aXJlKCcuL2NvbXBvbmVudHMvUHJpbnRNb2RhbC5qcycpLFxuXG5cdFdlYXZlVmlldyA9IHJlcXVpcmUoJy4vY29tcG9uZW50cy9XZWF2ZVZpZXcuanMnKSxcblx0U2NlbmVXcml0ZXIgPSByZXF1aXJlKCcuL2NvbXBvbmVudHMvU2NlbmVXcml0ZXIuanMnKSxcblxuXHRCaW5kID0gcmVxdWlyZSgnLi9iaW5kLmpzJyksXG5cdExaVyA9IHJlcXVpcmUoJ2x6LXN0cmluZycpLFxuXHRTb3VyY2UgPSByZXF1aXJlKCcuL1NvdXJjZXJ5LmpzJyksXG5cdEFjdGlvbnMgPSByZXF1aXJlKCcuL2FjdGlvbnMuanMnKSxcblx0U3R5bGUgPSB7XG5cdFx0YXBwOiAnd2lkdGg6IDEwMHZ3Oydcblx0fSxcblx0VEhSRUFEUyA9IFtcblx0XHR7IG5hbWU6ICcnLCBjb2xvcjogJyMzMzMzMzMnIH0sXG5cdFx0eyBuYW1lOiAnJywgY29sb3I6ICcjNjY2NjY2JyB9LFxuXHRcdHsgbmFtZTogJycsIGNvbG9yOiAnIzk5OTk5OScgfSxcblx0XHR7IG5hbWU6ICcnLCBjb2xvcjogJyNiMjFmMzUnIH0sXG5cdFx0eyBuYW1lOiAnJywgY29sb3I6ICcjZDgyNzM1JyB9LFxuXHRcdHsgbmFtZTogJycsIGNvbG9yOiAnI2ZmNzQzNScgfSxcblx0XHR7IG5hbWU6ICcnLCBjb2xvcjogJyNmZmExMzUnIH0sXG5cdFx0eyBuYW1lOiAnJywgY29sb3I6ICcjZmZjYjM1JyB9LFxuXHRcdHsgbmFtZTogJycsIGNvbG9yOiAnIzAwNzUzYScgfSxcblx0XHR7IG5hbWU6ICcnLCBjb2xvcjogJyMwMDllNDcnIH0sXG5cdFx0eyBuYW1lOiAnJywgY29sb3I6ICcjMTZkZDM2JyB9LFxuXHRcdHsgbmFtZTogJycsIGNvbG9yOiAnIzAwNTJhNScgfSxcblx0XHR7IG5hbWU6ICcnLCBjb2xvcjogJyMwMDc5ZTcnIH0sXG5cdFx0eyBuYW1lOiAnJywgY29sb3I6ICcjMDZhOWZjJyB9LFxuXHRcdHsgbmFtZTogJycsIGNvbG9yOiAnIzY4MWU3ZScgfSxcblx0XHR7IG5hbWU6ICcnLCBjb2xvcjogJyM3ZDNjYjUnIH0sXG5cdFx0eyBuYW1lOiAnJywgY29sb3I6ICcjYmQ3YWY2JyB9XG5cdF07XG5cbmNsYXNzIEFwcCBleHRlbmRzIFJlYWN0LkNvbXBvbmVudCB7XG5cdGNvbnN0cnVjdG9yKHByb3BzLCBjb250ZXh0KSB7XG5cdFx0c3VwZXIocHJvcHMsIGNvbnRleHQpO1xuXG5cdFx0dGhpcy5zdGF0ZSA9IHtcblxuXHRcdFx0aXNFZGl0aW5nOiBmYWxzZSxcblx0XHRcdGlzUHJpbnRpbmc6IGZhbHNlLFxuXHRcdFx0dGFyZ2V0Tm90ZTogdW5kZWZpbmVkLFxuXHRcdFx0c2NlbmVDb29yZHM6IHVuZGVmaW5lZCxcblxuXHRcdFx0cHJvamVjdDogU291cmNlLmdldExvY2FsKCd3ZWF2ZS1wcm9qZWN0JyksXG5cdFx0XHRzdG9yZTogU291cmNlLmdldExvY2FsKCd3ZWF2ZS1zdG9yZScpXG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMuc3RhdGUucHJvamVjdCkgdGhpcy5zdGF0ZS5wcm9qZWN0ID0gSlNPTi5wYXJzZSh0aGlzLnN0YXRlLnByb2plY3QpO1xuXHRcdGVsc2UgdGhpcy5zdGF0ZS5wcm9qZWN0ID0ge1xuXHRcdFx0dGl0bGU6ICdXZWxjb21lIHRvIFdlYXZlJyxcblx0XHRcdHdvcmRDb3VudDogNCxcblx0XHRcdHNjZW5lQ291bnQ6IDEsXG5cdFx0XHRhdXRob3I6ICdBYXJvbiBHb2luJ1xuXHRcdH07XG5cblx0XHRpZiAodGhpcy5zdGF0ZS5zdG9yZSkgdGhpcy5zdGF0ZS5zdG9yZSA9IEpTT04ucGFyc2UoTFpXLmRlY29tcHJlc3NGcm9tVVRGMTYodGhpcy5zdGF0ZS5zdG9yZSkpO1xuXHRcdGVsc2UgdGhpcy5zdGF0ZS5zdG9yZSA9IHtcblx0XHRcdHNsaWNlczogW3tkYXRldGltZTogJzE5OTktMTAtMjYnLCBzY2VuZXM6IFt7IHRocmVhZDogMCwgaGVhZDogJ1dlbGNvbWUgdG8gV2VhdmUhJywgYm9keTogJ1RoaXMgaXMgdGhlIHBsYWNlIScsIHdjOiA0IH1dIH1dLFxuXHRcdFx0dGhyZWFkczogT2JqZWN0LmFzc2lnbihbXSwgVEhSRUFEUyksXG5cdFx0XHRsb2NhdGlvbnM6IFsnU3RhciBMYWJzJ10sXG5cdFx0XHRsYXlvdXQ6IFtbJ0NoYXB0ZXIgT25lJ10sIFswLCAwXV1cblx0XHR9O1xuXG5cdFx0QmluZCh0aGlzKTtcblxuXHRcdHRoaXMuc3RhdGUucHJvamVjdCA9IE9iamVjdC5hc3NpZ24odGhpcy5zdGF0ZS5wcm9qZWN0LCB0aGlzLmNvdW50UHJvamVjdCgpKTtcblx0fVxuXG5cdGNvdW50UHJvamVjdCgpIHtcblx0XHRyZXR1cm4ge1xuXHRcdFx0d29yZENvdW50OiB0aGlzLnN0YXRlLnN0b3JlLnNsaWNlcy5yZWR1Y2UoKHdjLCBzbGljZSkgPT4gXG5cdFx0XHRcdCh3YyArIHNsaWNlLnNjZW5lcy5yZWR1Y2UoKHdjLCBzY2VuZSkgPT4gKChzY2VuZSkgPyAod2MgKyBzY2VuZS53YykgOiB3YyksIDApKVxuXHRcdFx0LCAwKSxcblx0XHRcdHNjZW5lQ291bnQ6IHRoaXMuc3RhdGUuc3RvcmUuc2xpY2VzLnJlZHVjZSgoc2NlbmVzLCBzbGljZSkgPT4gXG5cdFx0XHRcdChzY2VuZXMgKyBzbGljZS5zY2VuZXMucmVkdWNlKChzY2VuZXMsIHNjZW5lKSA9PiAoKHNjZW5lKSA/IChzY2VuZXMgKyAxKSA6IHNjZW5lcyksIDApKVxuXHRcdFx0LCAwKVxuXHRcdH07XG5cdH1cblxuXHRjb21wb25lbnREaWRNb3VudCgpIHtcblx0XHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncmVzaXplJywgdGhpcy5vblJlc2l6ZSk7XG5cdH1cblxuXHRjb21wb25lbnRXaWxsVW5tb3VudCgpIHtcblx0XHR3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcigncmVzaXplJywgdGhpcy5vblJlc2l6ZSk7XG5cdH1cblxuXHRyZW5kZXIocHJvcHMsIHN0YXRlKSB7XG5cdFx0cmV0dXJuIChcblx0XHRcdDxkaXYgaWQ9XCJhcHBcIiBzdHlsZT17U3R5bGUuYXBwfT5cblx0XHRcdFx0PEZpbGVPcGVuZXJcblx0XHRcdFx0XHRyZWY9eyhlbCkgPT4gKHRoaXMuRmlsZU9wZW5lciA9IGVsLmJhc2UpfVxuXHRcdFx0XHRcdG9uQ2hhbmdlPXt0aGlzLm9wZW5Qcm9qZWN0fVxuXHRcdFx0XHQvPlxuXHRcdFx0XHR7KHN0YXRlLmlzRWRpdGluZyA/XG5cdFx0XHRcdFx0PFNjZW5lV3JpdGVyXG5cdFx0XHRcdFx0XHRzY2VuZT17c3RhdGUudGFyZ2V0Tm90ZX1cblx0XHRcdFx0XHRcdGNvb3Jkcz17c3RhdGUuc2NlbmVDb29yZHN9XG5cdFx0XHRcdFx0XHR0aHJlYWQ9e3N0YXRlLnN0b3JlLnRocmVhZHNbc3RhdGUudGFyZ2V0Tm90ZS50aHJlYWRdfVxuXHRcdFx0XHRcdFx0b25Eb25lPXt0aGlzLm9uRG9uZX1cblx0XHRcdFx0XHQvPlxuXHRcdFx0XHQ6XG5cdFx0XHRcdFx0PFdlYXZlVmlld1xuXHRcdFx0XHRcdFx0dGl0bGU9e3N0YXRlLnByb2plY3QudGl0bGV9XG5cdFx0XHRcdFx0XHRhdXRob3I9e3N0YXRlLnByb2plY3QuYXV0aG9yfVxuXHRcdFx0XHRcdFx0c2xpY2VzPXtzdGF0ZS5zdG9yZS5zbGljZXN9XG5cdFx0XHRcdFx0XHR0aHJlYWRzPXtzdGF0ZS5zdG9yZS50aHJlYWRzfVxuXHRcdFx0XHRcdFx0bG9jYXRpb25zPXtzdGF0ZS5zdG9yZS5sb2NhdGlvbnN9XG5cdFx0XHRcdFx0XHRlZGl0Tm90ZT17dGhpcy5lZGl0Tm90ZX1cblx0XHRcdFx0XHRcdHdpbmRvd1dpZHRoPXt3aW5kb3cuaW5uZXJXaWR0aH1cblx0XHRcdFx0XHRcdHByb2plY3RGdW5jcz17e1xuXHRcdFx0XHRcdFx0XHRvblRpdGxlQ2hhbmdlOiAoZXZlbnQpID0+IHtcblx0XHRcdFx0XHRcdFx0XHR0aGlzLnN0YXRlLnByb2plY3QudGl0bGUgPSBldmVudC50YXJnZXQudmFsdWU7XG5cdFx0XHRcdFx0XHRcdFx0dGhpcy5mb3JjZVVwZGF0ZSgpO1xuXHRcdFx0XHRcdFx0XHRcdHRoaXMuc2F2ZVByb2plY3QoKTtcblx0XHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdFx0b25BdXRob3JDaGFuZ2U6IChldmVudCkgPT4ge1xuXHRcdFx0XHRcdFx0XHRcdHRoaXMuc3RhdGUucHJvamVjdC5hdXRob3IgPSBldmVudC50YXJnZXQudmFsdWU7XG5cdFx0XHRcdFx0XHRcdFx0dGhpcy5mb3JjZVVwZGF0ZSgpO1xuXHRcdFx0XHRcdFx0XHRcdHRoaXMuc2F2ZVByb2plY3QoKTtcblx0XHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdFx0aW1wb3J0OiB0aGlzLmltcG9ydFByb2plY3QsXG5cdFx0XHRcdFx0XHRcdGV4cG9ydDogdGhpcy5leHBvcnRQcm9qZWN0LFxuXHRcdFx0XHRcdFx0XHRwcmludDogKCkgPT4gdGhpcy5zZXRTdGF0ZSh7IGlzUHJpbnRpbmc6IHRydWUgfSksXG5cdFx0XHRcdFx0XHRcdGRlbGV0ZTogdGhpcy5kZWxldGVcblx0XHRcdFx0XHRcdH19XG5cdFx0XHRcdFx0Lz5cblx0XHRcdFx0KX1cblx0XHRcdFx0e3N0YXRlLmlzUHJpbnRpbmcgP1xuXHRcdFx0XHRcdDxQcmludE1vZGFsXG5cdFx0XHRcdFx0XHRzbGljZXM9e3N0YXRlLnN0b3JlLnNsaWNlc31cblx0XHRcdFx0XHRcdHRocmVhZHM9e3N0YXRlLnN0b3JlLnRocmVhZHN9XG5cdFx0XHRcdFx0XHRjYW5jZWw9eygpID0+IHRoaXMuc2V0U3RhdGUoeyBpc1ByaW50aW5nOiBmYWxzZSB9KX1cblx0XHRcdFx0XHQvPlxuXHRcdFx0XHQ6XG5cdFx0XHRcdFx0Jydcblx0XHRcdFx0fVxuXHRcdFx0PC9kaXY+XG5cdFx0KTtcblx0fVxuXG5cdGVkaXROb3RlKGNvb3Jkcykge1xuXHRcdHRoaXMuc2V0U3RhdGUoe1xuXHRcdFx0aXNFZGl0aW5nOiB0cnVlLFxuXHRcdFx0c2NlbmVDb29yZHM6IGNvb3Jkcyxcblx0XHRcdHRhcmdldE5vdGU6IHRoaXMuc3RhdGUuc3RvcmUuc2xpY2VzW2Nvb3Jkcy5zbGljZUluZGV4XS5zY2VuZXNbY29vcmRzLnNjZW5lSW5kZXhdLFxuXHRcdH0pO1xuXHR9XG5cblx0aW1wb3J0UHJvamVjdCgpIHtcblx0XHR0aGlzLkZpbGVPcGVuZXIuY2xpY2soKTtcblx0fVxuXG5cdGV4cG9ydFByb2plY3QoKSB7XG5cdFx0RmlsZVNhdmVyLnNhdmVBcyhuZXcgQmxvYihbSlNPTi5zdHJpbmdpZnkoT2JqZWN0LmFzc2lnbih7fSwgdGhpcy5zdGF0ZS5wcm9qZWN0LCB0aGlzLnN0YXRlLnN0b3JlKSldLCB7dHlwZTogXCJ0ZXh0L3BsYWluO2NoYXJzZXQ9dXRmLThcIn0pLCB0aGlzLnN0YXRlLnByb2plY3QudGl0bGUgKyAnLndlYXZlJyk7XG5cdH1cblxuXHRwcmludChzY2VuZUxpc3QpIHtcblx0XHR2YXIgdGV4dCwgc2xpY2VzID0gdGhpcy5zdGF0ZS5zdG9yZS5zbGljZXM7XG5cdFx0dGhpcy5zZXRTdGF0ZSh7cHJpbnRpbmc6IGZhbHNlfSk7XG5cblx0XHR0ZXh0ID0gc2NlbmVMaXN0LnJlZHVjZSgodGV4dCwgY29vcmRzLCBpKSA9PiB7XG5cdFx0XHRyZXR1cm4gdGV4dCArICdcXG5cXG5cXG4nICsgaSArICdcXG5cXG4nICsgc2xpY2VzW2Nvb3Jkcy5zbGljZUluZGV4XS5zY2VuZXNbY29vcmRzLnNjZW5lSW5kZXhdLmJvZHlcblx0XHR9LCB0aGlzLnN0YXRlLnByb2plY3QudGl0bGUpO1xuXG5cdFx0RmlsZVNhdmVyLnNhdmVBcyhuZXcgQmxvYihbdGV4dF0sIHt0eXBlOiBcInRleHQvcGxhaW47Y2hhcnNldD11dGYtOFwifSksIHRoaXMuc3RhdGUucHJvamVjdC50aXRsZSArICdfJyArIChuZXcgRGF0ZSgpLnRvU3RyaW5nKCkpICsgJy50eHQnKVxuXHR9XG5cblx0b25SZXNpemUoKSB7XG5cdFx0dGhpcy5mb3JjZVVwZGF0ZSgpO1xuXHR9XG5cblx0b25Eb25lKCkge1xuXHRcdHRoaXMuc2V0U3RhdGUoe1xuXHRcdFx0dGFyZ2V0Tm90ZTogbnVsbCxcblx0XHRcdHNjZW5lQ29vcmRzOiBudWxsLFxuXHRcdFx0aXNFZGl0aW5nOiBmYWxzZVxuXHRcdH0pO1xuXHR9XG5cblx0ZG8oYWN0aW9uLCBkYXRhKSB7XG5cdFx0dGhpcy5zdGF0ZS5zdG9yZSA9IEFjdGlvbnNbYWN0aW9uXShkYXRhLCB0aGlzLnN0YXRlLnN0b3JlKTtcblx0XHR0aGlzLnN0YXRlLnByb2plY3QgPSBPYmplY3QuYXNzaWduKHt9LCB0aGlzLnN0YXRlLnByb2plY3QsIHRoaXMuY291bnRQcm9qZWN0KCkpO1xuXHRcdHRoaXMuZm9yY2VVcGRhdGUoKTtcblx0XHR0aGlzLnNhdmUoKTtcblx0fVxuXG5cdGRlbGV0ZSgpIHtcblx0XHR0aGlzLnNldFN0YXRlKHtcblx0XHRcdHByb2plY3Q6IHtcblx0XHRcdFx0dGl0bGU6ICcnLFxuXHRcdFx0XHRhdXRob3I6ICcnLFxuXHRcdFx0XHR3b3JkQ291bnQ6IDAsXG5cdFx0XHRcdHNjZW5lQ291bnQ6IDBcblx0XHRcdH0sXG5cdFx0XHRzdG9yZToge1xuXHRcdFx0XHRzbGljZXM6IFt7ZGF0ZXRpbWU6ICcnLCBzY2VuZXM6IFtudWxsXSB9XSxcblx0XHRcdFx0dGhyZWFkczogT2JqZWN0LmFzc2lnbihbXSwgVEhSRUFEUyksXG5cdFx0XHRcdGxvY2F0aW9uczogWycnXSxcblx0XHRcdFx0bGF5b3V0OiBbWydDaGFwdGVyIE9uZSddLCBbMCwgMF1dXG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0dGhpcy5zYXZlKCk7XG5cdH1cblxuXHRvcGVuUHJvamVjdChkYXRhKSB7XG5cdFx0ZGF0YSA9IEpTT04ucGFyc2UoZGF0YSk7XG5cdFx0dGhpcy5zZXRTdGF0ZSh7XG5cdFx0XHRwcm9qZWN0OiB7IHRpdGxlOiBkYXRhLnRpdGxlLCB3b3JkQ291bnQ6IGRhdGEud29yZENvdW50LCBzY2VuZUNvdW50OiBkYXRhLnNjZW5lQ291bnQsIGF1dGhvcjogZGF0YS5hdXRob3IgfSxcblx0XHRcdHN0b3JlOiB7IHNsaWNlczogZGF0YS5zY2VuZXMsIHRocmVhZHM6IGRhdGEudGhyZWFkcywgbG9jYXRpb25zOiBkYXRhLmxvY2F0aW9ucyB9XG5cdFx0fSlcblx0XHR0aGlzLnNhdmUoKTtcblx0fVxuXG5cdHNhdmUoKSB7XG5cdFx0dGhpcy5zYXZlUHJvamVjdCgpO1xuXHRcdHRoaXMuc2F2ZVN0b3JlKCk7XG5cdH1cblxuXHRzYXZlUHJvamVjdCgpIHtcblx0XHRTb3VyY2Uuc2V0TG9jYWwoJ3dlYXZlLXByb2plY3QnLCBKU09OLnN0cmluZ2lmeSh0aGlzLnN0YXRlLnByb2plY3QpKTtcblx0fVxuXG5cdHNhdmVTdG9yZSgpIHtcblx0XHRTb3VyY2Uuc2V0TG9jYWwoJ3dlYXZlLXN0b3JlJywgTFpXLmNvbXByZXNzVG9VVEYxNihKU09OLnN0cmluZ2lmeSh0aGlzLnN0YXRlLnN0b3JlKSkpO1xuXHR9XG5cblx0Z2V0Q2hpbGRDb250ZXh0KCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHR0aHJlYWQ6IChpbmRleCkgPT4ge1xuXHRcdFx0XHRyZXR1cm4gdGhpcy5zdGF0ZS5zdG9yZS50aHJlYWRzW2luZGV4XTtcblx0XHRcdH0sXG5cdFx0XHRkbzogdGhpcy5kbyxcblx0XHR9O1xuXHR9XG59XG5cblJlYWN0Lm9wdGlvbnMuZGVib3VuY2VSZW5kZXJpbmcgPSB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lO1xuXG5SZWFjdC5yZW5kZXIoPEFwcC8+LCBkb2N1bWVudC5ib2R5KTsiLCJtb2R1bGUuZXhwb3J0cyA9IHtcblx0LypnZXQ6IGZ1bmN0aW9uKGtleSkge1xuXG5cdH0sXG5cdHNldDogZnVuY3Rpb24oa2V5LCB2YWx1ZSkge1xuXG5cdH0sKi9cblx0Y2hlY2tTdGF0dXM6IGZ1bmN0aW9uKHNlcnZlclVSTCkge1xuXHRcdHZhciBzdGF0dXMgPSB7XG5cdFx0XHRsb2NhbDogZmFsc2UsXG5cdFx0XHRvbmxpbmU6IGZhbHNlXG5cdFx0fVxuXHRcdC8vIGNoZWNrIGlmIGxvY2FsU3RvcmFnZSBleGlzdHNcblx0XHR0cnkge1xuXHRcdFx0d2luZG93LmxvY2FsU3RvcmFnZS5zZXRJdGVtKCdjaGVja1N0YXR1cycsICdhJyk7XG5cdFx0XHR3aW5kb3cubG9jYWxTdG9yYWdlLmdldEl0ZW0oJ2NoZWNrU3RhdHVzJyk7XG5cdFx0XHR3aW5kb3cubG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oJ2NoZWNrU3RhdHVzJyk7XG5cdFx0XHRzdGF0dXMubG9jYWwgPSB0cnVlO1xuXHRcdH0gY2F0Y2goZSkge31cblx0XHQvLyBjaGVjayBpZiBvbmxpbmVcblx0XHRzdGF0dXMub25saW5lID0gd2luZG93Lm5hdmlnYXRvci5vbkxpbmU7XG5cblx0XHRyZXR1cm4gc3RhdHVzO1xuXHR9LFxuXHRnZXRMb2NhbDogZnVuY3Rpb24oa2V5KSB7XG5cdFx0cmV0dXJuIHdpbmRvdy5sb2NhbFN0b3JhZ2UuZ2V0SXRlbShrZXkpO1xuXHR9LFxuXHRzZXRMb2NhbDogZnVuY3Rpb24oa2V5LCB2YWx1ZSkge1xuXHRcdHZhciBzdWNjZXNzID0gdHJ1ZTtcblx0XHRpZiAodmFsdWUgPT09IHVuZGVmaW5lZCkgd2luZG93LmxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKGtleSk7XG5cdFx0ZWxzZSB0cnkge1xuXHRcdFx0d2luZG93LmxvY2FsU3RvcmFnZS5zZXRJdGVtKGtleSwgdmFsdWUpO1xuXHRcdH0gY2F0Y2ggKGUpIHsgLy8gbG9jYWxTdG9yYWdlIGlzIGZ1bGxcblx0XHRcdHN1Y2Nlc3MgPSBmYWxzZTtcblx0XHR9XG5cdFx0cmV0dXJuIHN1Y2Nlc3M7XG5cdH1cbn07IiwibW9kdWxlLmV4cG9ydHMgPSB7XG4vLyBTTElDRSBBQ1RJT05TXG5cdE5FV19TTElDRTogZnVuY3Rpb24oYWN0aW9uLCBzdG9yZSkge1xuXHRcdHN0b3JlLnNsaWNlcyA9IE9iamVjdC5hc3NpZ24oW10sIHN0b3JlLnNsaWNlcyk7XG5cdFx0c3RvcmUuc2xpY2VzLnNwbGljZShhY3Rpb24uYXRJbmRleCwgMCwge1xuXHRcdFx0ZGF0ZXRpbWU6ICcnLFxuXHRcdFx0c2NlbmVzOiBzdG9yZS5sb2NhdGlvbnMubWFwKCgpPT5udWxsKVxuXHRcdH0pO1xuXHRcdHJldHVybiBzdG9yZTtcblx0fSxcblx0REVMRVRFX1NMSUNFOiBmdW5jdGlvbihhY3Rpb24sIHN0b3JlKSB7XG5cdFx0c3RvcmUuc2xpY2VzID0gT2JqZWN0LmFzc2lnbihbXSwgc3RvcmUuc2xpY2VzKTtcblx0XHRhY3Rpb24uc2xpY2UgPSBzdG9yZS5zbGljZXMuc3BsaWNlKGFjdGlvbi5hdEluZGV4LCAxKTtcblx0XHRyZXR1cm4gc3RvcmU7XG5cdH0sXG5cdE1PRElGWV9TTElDRV9EQVRFOiBmdW5jdGlvbihhY3Rpb24sIHN0b3JlKSB7XG5cdFx0c3RvcmUuc2xpY2VzID0gT2JqZWN0LmFzc2lnbihbXSwgc3RvcmUuc2xpY2VzKTtcblx0XHRzdG9yZS5zbGljZXNbYWN0aW9uLmF0SW5kZXhdLmRhdGV0aW1lID0gYWN0aW9uLm5ld0RhdGU7XG5cdFx0cmV0dXJuIHN0b3JlO1xuXHR9LFxuXG4vLyBOT1RFIEFDVElPTlNcblx0TkVXX05PVEU6IGZ1bmN0aW9uKGFjdGlvbiwgc3RvcmUpIHtcblx0XHRzdG9yZS5zbGljZXMgPSBPYmplY3QuYXNzaWduKFtdLCBzdG9yZS5zbGljZXMpO1xuXHRcdHN0b3JlLnNsaWNlc1thY3Rpb24uc2xpY2VJbmRleF0uc2NlbmVzLnNwbGljZShhY3Rpb24uc2NlbmVJbmRleCwgMSwge1xuXHRcdFx0dGhyZWFkOiAwLFxuXHRcdFx0aGVhZDogJycsXG5cdFx0XHRib2R5OiAnJyxcblx0XHRcdHdjOiAwXG5cdFx0fSk7XG5cdFx0cmV0dXJuIHN0b3JlO1xuXHR9LFxuXHRERUxFVEVfTk9URTogZnVuY3Rpb24oYWN0aW9uLCBzdG9yZSkge1xuXHRcdHN0b3JlLnNsaWNlcyA9IE9iamVjdC5hc3NpZ24oW10sIHN0b3JlLnNsaWNlcyk7XG5cdFx0c3RvcmUuc2xpY2VzW2FjdGlvbi5zbGljZUluZGV4XS5zY2VuZXNbYWN0aW9uLnNjZW5lSW5kZXhdID0gbnVsbDtcblx0XHRyZXR1cm4gc3RvcmU7XG5cdH0sXG5cdE1PRElGWV9OT1RFX0hFQUQ6IGZ1bmN0aW9uKGFjdGlvbiwgc3RvcmUpIHtcblx0XHRzdG9yZS5zbGljZXMgPSBPYmplY3QuYXNzaWduKFtdLCBzdG9yZS5zbGljZXMpO1xuXHRcdHN0b3JlLnNsaWNlc1thY3Rpb24uc2xpY2VJbmRleF0uc2NlbmVzW2FjdGlvbi5zY2VuZUluZGV4XS5oZWFkID0gYWN0aW9uLm5ld0hlYWQ7XG5cdFx0cmV0dXJuIHN0b3JlO1xuXHR9LFxuXHRNT0RJRllfTk9URV9CT0RZOiBmdW5jdGlvbihhY3Rpb24sIHN0b3JlKSB7XG5cdFx0c3RvcmUuc2xpY2VzID0gT2JqZWN0LmFzc2lnbihbXSwgc3RvcmUuc2xpY2VzKTtcblx0XHR2YXIgc2NlbmUgPSBzdG9yZS5zbGljZXNbYWN0aW9uLnNsaWNlSW5kZXhdLnNjZW5lc1thY3Rpb24uc2NlbmVJbmRleF07XG5cdFx0c2NlbmUuYm9keSA9IGFjdGlvbi5uZXdCb2R5O1xuXHRcdHNjZW5lLndjID0gYWN0aW9uLndjO1xuXHRcdHJldHVybiBzdG9yZTtcblx0fSxcblx0TU9ESUZZX05PVEVfVEhSRUFEOiBmdW5jdGlvbihhY3Rpb24sIHN0b3JlKSB7XG5cdFx0dmFyIHNjZW5lO1xuXHRcdHN0b3JlLnNsaWNlcyA9IE9iamVjdC5hc3NpZ24oW10sIHN0b3JlLnNsaWNlcyk7XG5cdFx0c2NlbmUgPSBzdG9yZS5zbGljZXNbYWN0aW9uLnNsaWNlSW5kZXhdLnNjZW5lc1thY3Rpb24uc2NlbmVJbmRleF07XG5cdFx0aWYgKCsrc2NlbmUudGhyZWFkID09PSBzdG9yZS50aHJlYWRzLmxlbmd0aCkgc2NlbmUudGhyZWFkID0gMDtcblx0XHRyZXR1cm4gc3RvcmU7XG5cdH0sXG5cdE1PVkVfTk9URTogZnVuY3Rpb24oYWN0aW9uLCBzdG9yZSkge1xuXHRcdHN0b3JlLnNsaWNlcyA9IE9iamVjdC5hc3NpZ24oW10sIHN0b3JlLnNsaWNlcyk7XG5cdFx0c3RvcmUuc2xpY2VzW2FjdGlvbi50by5zbGljZUluZGV4XS5zY2VuZXNbYWN0aW9uLnRvLnNjZW5lSW5kZXhdID0gc3RvcmUuc2xpY2VzW2FjdGlvbi5mcm9tLnNsaWNlSW5kZXhdLnNjZW5lc1thY3Rpb24uZnJvbS5zY2VuZUluZGV4XTtcblx0XHRzdG9yZS5zbGljZXNbYWN0aW9uLmZyb20uc2xpY2VJbmRleF0uc2NlbmVzW2FjdGlvbi5mcm9tLnNjZW5lSW5kZXhdID0gbnVsbDtcblx0XHRyZXR1cm4gc3RvcmU7XG5cdH0sXG5cbi8vIExPQ0FUSU9OIEFDVElPTlNcblx0TkVXX0xPQ0FUSU9OOiBmdW5jdGlvbihhY3Rpb24sIHN0b3JlKSB7XG5cdFx0dmFyIGkgPSBzdG9yZS5zbGljZXMubGVuZ3RoO1xuXHRcdHN0b3JlLmxvY2F0aW9ucyA9IE9iamVjdC5hc3NpZ24oW10sIHN0b3JlLmxvY2F0aW9ucyk7XG5cdFx0c3RvcmUuc2xpY2VzID0gT2JqZWN0LmFzc2lnbihbXSwgc3RvcmUuc2xpY2VzKTtcblx0XHRzdG9yZS5sb2NhdGlvbnMucHVzaCgnJyk7XG5cdFx0d2hpbGUgKGktLSkgc3RvcmUuc2xpY2VzW2ldLnNjZW5lcy5wdXNoKG51bGwpO1xuXHRcdHJldHVybiBzdG9yZTtcblx0fSxcblx0REVMRVRFX0xPQ0FUSU9OOiBmdW5jdGlvbihhY3Rpb24sIHN0b3JlKSB7XG5cdFx0dmFyIGkgPSBzdG9yZS5zbGljZXMubGVuZ3RoO1xuXHRcdHN0b3JlLmxvY2F0aW9ucyA9IE9iamVjdC5hc3NpZ24oW10sIHN0b3JlLmxvY2F0aW9ucyk7XG5cdFx0c3RvcmUuc2xpY2VzID0gT2JqZWN0LmFzc2lnbihbXSwgc3RvcmUuc2xpY2VzKTtcblx0XHRhY3Rpb24ubG9jYXRpb24gPSBzdG9yZS5sb2NhdGlvbnMuc3BsaWNlKGFjdGlvbi5hdEluZGV4LCAxKTtcblx0XHR3aGlsZSAoaS0tKSBzdG9yZS5zbGljZXNbaV0uc2NlbmVzLnNwbGljZShhY3Rpb24uYXRJbmRleCwgMSk7XG5cdFx0cmV0dXJuIHN0b3JlO1xuXHR9LFxuXHRNT1ZFX0xPQ0FUSU9OOiBmdW5jdGlvbihhY3Rpb24sIHN0b3JlKSB7XG5cdFx0dmFyIGkgPSBzdG9yZS5zbGljZXMubGVuZ3RoLCBzY2VuZXM7XG5cdFx0c3RvcmUubG9jYXRpb25zID0gT2JqZWN0LmFzc2lnbihbXSwgc3RvcmUubG9jYXRpb25zKTtcblx0XHRzdG9yZS5zbGljZXMgPSBPYmplY3QuYXNzaWduKFtdLCBzdG9yZS5zbGljZXMpO1xuXHRcdHN0b3JlLmxvY2F0aW9ucy5zcGxpY2UoYWN0aW9uLnRvSW5kZXgsIDAsIHN0b3JlLmxvY2F0aW9ucy5zcGxpY2UoYWN0aW9uLmZyb21JbmRleCwgMSlbMF0pO1xuXHRcdHdoaWxlIChpLS0pIHtcblx0XHRcdHNjZW5lcyA9IHN0b3JlLnNsaWNlc1tpXS5zY2VuZXM7XG5cdFx0XHRzY2VuZXMuc3BsaWNlKGFjdGlvbi50b0luZGV4LCAwLCBzY2VuZXMuc3BsaWNlKGFjdGlvbi5mcm9tSW5kZXgsIDEpWzBdKTtcblx0XHR9XG5cdFx0cmV0dXJuIHN0b3JlO1xuXHR9LFxuXHRNT0RJRllfTE9DQVRJT05fTkFNRTogZnVuY3Rpb24oYWN0aW9uLCBzdG9yZSkge1xuXHRcdHN0b3JlLmxvY2F0aW9ucyA9IE9iamVjdC5hc3NpZ24oW10sIHN0b3JlLmxvY2F0aW9ucyk7XG5cdFx0c3RvcmUubG9jYXRpb25zW2FjdGlvbi5hdEluZGV4XSA9IGFjdGlvbi5uZXdOYW1lO1xuXHRcdHJldHVybiBzdG9yZTtcblx0fSxcblxuLy8gVEhSRUFEIEFDVElPTlNcblx0TkVXX1RIUkVBRDogZnVuY3Rpb24oYWN0aW9uLCBzdG9yZSkge1xuXHRcdHN0b3JlLnRocmVhZHMgPSBPYmplY3QuYXNzaWduKFtdLCBzdG9yZS50aHJlYWRzKTtcblx0XHRzdG9yZS50aHJlYWRzLnB1c2goe1xuXHRcdFx0Y29sb3I6IGFjdGlvbi5jb2xvcixcblx0XHRcdG5hbWU6IGFjdGlvbi5uYW1lXG5cdFx0fSk7XG5cdFx0cmV0dXJuIHN0b3JlO1xuXHR9LFxuXHRERUxFVEVfVEhSRUFEOiBmdW5jdGlvbihhY3Rpb24sIHN0b3JlKSB7XG5cdFx0c3RvcmUudGhyZWFkcyA9IE9iamVjdC5hc3NpZ24oW10sIHN0b3JlLnRocmVhZHMpO1xuXHRcdHN0b3JlLnNwbGljZShhY3Rpb24uYXRJbmRleCwgMSk7XG5cdFx0cmV0dXJuIHN0b3JlO1xuXHR9LFxuXHRNT0RJRllfVEhSRUFEX05BTUU6IGZ1bmN0aW9uKGFjdGlvbiwgc3RvcmUpIHtcblx0XHRzdG9yZS50aHJlYWRzID0gT2JqZWN0LmFzc2lnbihbXSwgc3RvcmUudGhyZWFkcyk7XG5cdFx0c3RvcmUudGhyZWFkc1thY3Rpb24uYXRJbmRleF0ubmFtZSA9IGFjdGlvbi5uZXdOYW1lO1xuXHRcdHJldHVybiBzdG9yZTtcblx0fVxufTsiLCJcbmZ1bmN0aW9uIEFzc2VydGlvbkVycm9yKG1lc3NhZ2UpIHtcblx0dmFyIGUgPSBuZXcgRXJyb3IobWVzc2FnZSk7XG5cdGUubmFtZSA9ICdBc3NlcnRpb25FcnJvcic7XG5cdHJldHVybiBlO1xufVxuXG5mdW5jdGlvbiBBc3NlcnQoY29uZGl0aW9uLCBtZXNzYWdlKSB7XG5cdGlmIChjb25kaXRpb24pIHJldHVybjtcblx0ZWxzZSB0aHJvdyBBc3NlcnRpb25FcnJvcihtZXNzYWdlKTtcbn1cblxuZnVuY3Rpb24gRGVlcEVxdWFscyhhLCBiKSB7XG5cbn1cblxuZnVuY3Rpb24gUG9sbHV0ZSgpIHtcblx0XHR3aW5kb3cuVGVzdCA9IEFzc2VydDtcblx0XHR3aW5kb3cuQXNzZXJ0ID0gQXNzZXJ0O1xuXHR9XG5cbmlmIChtb2R1bGUuZXhwb3J0cykgbW9kdWxlLmV4cG9ydHMgPSB7XG5cdFRlc3Q6IEFzc2VydCxcblx0QXNzZXJ0OiBBc3NlcnQsXG5cdHBvbGx1dGU6IFBvbGx1dGVcbn07IiwiLy8gY29udmVuaWVuY2UgbWV0aG9kXG4vLyBiaW5kcyBldmVyeSBmdW5jdGlvbiBpbiBpbnN0YW5jZSdzIHByb3RvdHlwZSB0byB0aGUgaW5zdGFuY2UgaXRzZWxmXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGluc3RhbmNlKSB7XG5cdHZhciBwcm90byA9IGluc3RhbmNlLmNvbnN0cnVjdG9yLnByb3RvdHlwZSxcblx0XHRrZXlzID0gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMocHJvdG8pLFxuXHRcdGtleTtcblx0d2hpbGUgKGtleSA9IGtleXMucG9wKCkpIGlmICh0eXBlb2YgcHJvdG9ba2V5XSA9PT0gJ2Z1bmN0aW9uJyAmJiBrZXkgIT09ICdjb25zdHJ1Y3RvcicpIGluc3RhbmNlW2tleV0gPSBpbnN0YW5jZVtrZXldLmJpbmQoaW5zdGFuY2UpO1xufSIsImNvbnN0XG5cdGNvbG9ycyA9IFtcblx0XHQnIzAwMDAwMCcsXG5cdFx0JyMzMzMzMzMnLFxuXHRcdCcjNjY2NjY2Jyxcblx0XHQnIzk5OTk5OScsXG5cdFx0JyNiMjFmMzUnLFxuXHRcdCcjZDgyNzM1Jyxcblx0XHQnI2ZmNzQzNScsXG5cdFx0JyNmZmExMzUnLFxuXHRcdCcjZmZjYjM1Jyxcblx0XHQnI2ZmZjczNScsXG5cdFx0JyMwMDc1M2EnLFxuXHRcdCcjMDA5ZTQ3Jyxcblx0XHQnIzE2ZGQzNicsXG5cdFx0JyMwMDUyYTUnLFxuXHRcdCcjMDA3OWU3Jyxcblx0XHQnIzA2YTlmYycsXG5cdFx0JyM2ODFlN2UnLFxuXHRcdCcjN2QzY2I1Jyxcblx0XHQnI2JkN2FmNidcblx0XTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihvbGQpIHtcblx0dmFyIGkgPSBjb2xvcnMuaW5kZXhPZihvbGQpO1xuXG5cdHJldHVybiBjb2xvcnNbKytpID09PSBjb2xvcnMubGVuZ3RoID8gMCA6IGldO1xufSIsImNvbnN0XG5cdFJlYWN0ID0gcmVxdWlyZSgncHJlYWN0JyksXG5cblx0U3R5bGUgPSB7XG5cdFx0dG9vbGJhcjoge1xuXHRcdFx0ekluZGV4OiAnMjAnLFxuXHRcdFx0cG9zaXRpb246ICdmaXhlZCcsXG5cdFx0XHR0b3A6ICcwJyxcblx0XHRcdGxlZnQ6ICcwJyxcblx0XHRcdHJpZ2h0OiAnMCcsXG5cblx0XHRcdHdpZHRoOiAnMTAwdncnLFxuXHRcdFx0Ym9yZGVyOiAnbm9uZScsXG5cdFx0XHRib3JkZXJCb3R0b206ICd0aGluIHNvbGlkICM3NzcnLFxuXG5cdFx0XHRiYWNrZ3JvdW5kQ29sb3I6ICcjMDAwMDAwJyxcblxuXHRcdFx0Y29sb3I6ICcjZmZmJ1xuXHRcdH0sXG5cdFx0bWVudToge1xuXHRcdFx0d2lkdGg6ICcxMDAlJyxcblxuXHRcdFx0ZGlzcGxheTogJ2ZsZXgnLFxuXHRcdFx0ZmxleFdyYXA6ICd3cmFwJyxcblx0XHRcdGp1c3RpZnlDb250ZW50OiAnc3BhY2UtYmV0d2Vlbidcblx0XHR9LFxuXHRcdHVsOiB7XG5cdFx0XHRkaXNwbGF5OiAnZmxleCcsXG5cdFx0XHRqdXN0aWZ5Q29udGVudDogJ3NwYWNlLWJldHdlZW4nLFxuXHRcdFx0YWxpZ25JdGVtczogJ2NlbnRlcicsXG5cblx0XHRcdGxpc3RTdHlsZTogJ25vbmUnXG5cdFx0fSxcblx0XHRsaToge1xuXHRcdFx0ZGlzcGxheTogJ2lubGluZS1mbGV4Jyxcblx0XHRcdGp1c3RpZnlDb250ZW50OiAnY2VudGVyJyxcblx0XHRcdGFsaWduSXRlbXM6ICdjZW50ZXInLFxuXHRcdFx0bWFyZ2luOiAnMCAwLjVyZW0nXG5cdFx0fSxcblx0XHRpdGVtOiB7XG5cdFx0XHRoZWlnaHQ6ICcyLjVyZW0nLFxuXHRcdFx0cGFkZGluZzogJzAgMC43NXJlbScsXG5cblx0XHRcdGJvcmRlcjogJ25vbmUnLFxuXHRcdFx0b3V0bGluZTogJ25vbmUnLFxuXHRcdFx0YmFja2dyb3VuZENvbG9yOiAnIzAwMDAwMCcsXG5cblx0XHRcdGNvbG9yOiAnI2ZmZicsXG5cdFx0XHRmb250U2l6ZTogJzEuMnJlbScsXG5cblx0XHRcdGN1cnNvcjogJ3BvaW50ZXInXG5cdFx0fSxcblx0XHRpbWc6IHtcblx0XHRcdHdpZHRoOiAnMS4ycmVtJyxcblx0XHRcdGhlaWdodDogJzEuMnJlbSdcblx0XHR9LFxuXHRcdHNwYW46IHtcblx0XHRcdHBhZGRpbmdUb3A6ICcxcmVtJyxcblx0XHRcdGhlaWdodDogJzJyZW0nXG5cdFx0fSxcblx0XHR0ZXh0OiB7XG5cdFx0XHRmb250U2l6ZTogJzFyZW0nXG5cdFx0fSxcblx0XHRpbnB1dDoge1xuXHRcdFx0aGVpZ2h0OiAnMnJlbScsXG5cdFx0XHRtYXhXaWR0aDogJzk1dncnLFxuXHRcdFx0cGFkZGluZzogJzAgMC43NXJlbScsXG5cdFx0XHRib3JkZXI6ICdub25lJyxcblx0XHRcdGJvcmRlckJvdHRvbTogJ3RoaW4gc29saWQgI2ZmZicsXG5cdFx0XHRvdXRsaW5lOiAnbm9uZScsXG5cdFx0XHRiYWNrZ3JvdW5kQ29sb3I6ICcjMDAwJyxcblx0XHRcdGZvbnRTaXplOiAnMS4ycmVtJyxcblx0XHRcdGNvbG9yOiAnI2ZmZidcblx0XHR9XG5cdH07XG5cbmZ1bmN0aW9uIE1lYXN1cmVUZXh0KHRleHQpIHtcblx0dmFyIHdpZGUgPSB0ZXh0Lm1hdGNoKC9bV01dL2cpLFxuXHRcdHRoaW4gPSB0ZXh0Lm1hdGNoKC9bSXRybGlqIS4gXS9nKTtcblxuXHRcdHdpZGUgPSB3aWRlID8gd2lkZS5sZW5ndGggOiAwO1xuXHRcdHRoaW4gPSB0aGluID8gdGhpbi5sZW5ndGggOiAwO1xuXG5cdHJldHVybiAodGV4dC5sZW5ndGggKyB3aWRlICogMS4yIC0gdGhpbiAqIDAuMyk7XG59XG5cbmZ1bmN0aW9uIEFwcE1lbnUocHJvcHMsIHN0YXRlKSB7XG5cdHJldHVybiAoXG5cdFx0PGRpdiBcblx0XHRcdGlkPVwidG9vbGJhclwiXG5cdFx0XHRzdHlsZT17U3R5bGUudG9vbGJhcn1cblx0XHQ+XHRcblx0XHRcdDxtZW51IFxuXHRcdFx0XHR0eXBlPVwidG9vbGJhclwiXG5cdFx0XHRcdHN0eWxlPXtTdHlsZS5tZW51fVxuXHRcdFx0XHRyZWY9e3Byb3BzLnJlZn1cblx0XHRcdD5cblx0XHRcdFx0e3Byb3BzLmdyb3Vwcy5tYXAoKGdyb3VwKSA9PlxuXHRcdFx0XHRcdDx1bCBzdHlsZT17U3R5bGUudWx9PlxuXHRcdFx0XHRcdFx0e2dyb3VwLm1hcCgoaXRlbSkgPT4ge1xuXHRcdFx0XHRcdFx0Ly8gQ1VTVE9NIElURU1cblx0XHRcdFx0XHRcdFx0aWYgKGl0ZW0uY3VzdG9tKSByZXR1cm4gaXRlbS5jdXN0b207XG5cdFx0XHRcdFx0XHQvLyBCVVRUT04gSVRFTVxuXHRcdFx0XHRcdFx0XHRpZiAoaXRlbS5vbkNsaWNrIHx8IGl0ZW0ub25Ib2xkKSByZXR1cm4gKFxuXHRcdFx0XHRcdFx0XHRcdDxsaSBzdHlsZT17U3R5bGUubGl9PlxuXHRcdFx0XHRcdFx0XHRcdFx0PGJ1dHRvblxuXHRcdFx0XHRcdFx0XHRcdFx0XHRzdHlsZT17aXRlbS5zdHlsZSA/IE9iamVjdC5hc3NpZ24oe30sIFN0eWxlLml0ZW0sIGl0ZW0uc3R5bGUpIDogU3R5bGUuaXRlbX1cblx0XHRcdFx0XHRcdFx0XHRcdFx0b25DbGljaz17KGUpID0+IHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRlLnRhcmdldC5zdHlsZS5jb2xvciA9IGl0ZW0uc3R5bGUgPyBpdGVtLnN0eWxlLmNvbG9yIHx8IFwiI2ZmZlwiIDogJyNmZmYnO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGlmIChpdGVtLm9uQ2xpY2spIGl0ZW0ub25DbGljayhlKTtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRpZiAoaXRlbS50aW1lcikge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0Y2xlYXJUaW1lb3V0KGl0ZW0udGltZXIpO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0aXRlbS50aW1lciA9IHVuZGVmaW5lZDtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0XHRcdH19XG5cdFx0XHRcdFx0XHRcdFx0XHRcdG9uTW91c2VEb3duPXsoZSkgPT4ge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGUudGFyZ2V0LnN0eWxlLmNvbG9yID0gXCIjNzc3XCI7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0aWYgKGl0ZW0ub25Ib2xkKSBpdGVtLnRpbWVyID0gc2V0VGltZW91dChpdGVtLm9uSG9sZCwgMTAwMCwgZSk7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdH19XG5cdFx0XHRcdFx0XHRcdFx0XHRcdG5hbWU9e2l0ZW0ubmFtZX0+XG5cdFx0XHRcdFx0XHRcdFx0XHRcdHtpdGVtLmljb24gP1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdDxpbWdcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdHN0eWxlPXtTdHlsZS5pbWd9XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRzcmM9e2l0ZW0uaWNvbn1cblx0XHRcdFx0XHRcdFx0XHRcdFx0XHQvPlxuXHRcdFx0XHRcdFx0XHRcdFx0XHQ6XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0aXRlbS52YWx1ZVxuXHRcdFx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0XHQ8L2J1dHRvbj5cblx0XHRcdFx0XHRcdFx0XHQ8L2xpPlxuXHRcdFx0XHRcdFx0XHQpO1xuXHRcdFx0XHRcdFx0Ly8gVEVYVCBJTlBVVCBJVEVNXG5cdFx0XHRcdFx0XHRcdGlmIChpdGVtLm9uSW5wdXQpIHJldHVybiAoXG5cdFx0XHRcdFx0XHRcdFx0PGxpIHN0eWxlPXtTdHlsZS5saX0+XG5cdFx0XHRcdFx0XHRcdFx0XHQ8aW5wdXRcblx0XHRcdFx0XHRcdFx0XHRcdFx0c3R5bGU9e2l0ZW0uc3R5bGUgPyBPYmplY3QuYXNzaWduKHt9LCBTdHlsZS5pbnB1dCwgaXRlbS5zdHlsZSkgOiBTdHlsZS5pbnB1dH1cblx0XHRcdFx0XHRcdFx0XHRcdFx0dHlwZT1cInRleHRcIlxuXHRcdFx0XHRcdFx0XHRcdFx0XHRwbGFjZWhvbGRlcj17aXRlbS5wbGFjZWhvbGRlcn1cblx0XHRcdFx0XHRcdFx0XHRcdFx0bWF4TGVuZ3RoPXs0MH1cblx0XHRcdFx0XHRcdFx0XHRcdFx0c2l6ZT17TWF0aC5tYXgoTWVhc3VyZVRleHQoaXRlbS52YWx1ZS5sZW5ndGggPyBpdGVtLnZhbHVlIDogKHByb3BzLnBsYWNlaG9sZGVyIHx8ICcnKSksIDIwKX1cblx0XHRcdFx0XHRcdFx0XHRcdFx0b25JbnB1dD17aXRlbS5vbklucHV0fVxuXHRcdFx0XHRcdFx0XHRcdFx0XHR2YWx1ZT17aXRlbS52YWx1ZX1cblx0XHRcdFx0XHRcdFx0XHRcdC8+XG5cdFx0XHRcdFx0XHRcdFx0PC9saT5cblxuXHRcdFx0XHRcdFx0XHQpO1xuXHRcdFx0XHRcdFx0Ly8gVEVYVCBJVEVNXG5cdFx0XHRcdFx0XHRcdHJldHVybiAoXG5cdFx0XHRcdFx0XHRcdFx0PGxpIHN0eWxlPXtPYmplY3QuYXNzaWduKHt9LCBTdHlsZS5saSwgU3R5bGUudGV4dCwgaXRlbS5zdHlsZSA/IGl0ZW0uc3R5bGUgOiB7fSl9PlxuXHRcdFx0XHRcdFx0XHRcdFx0PHNwYW4gc3R5bGU9e1N0eWxlLnNwYW59PntpdGVtLnZhbHVlfTwvc3Bhbj5cblx0XHRcdFx0XHRcdFx0XHQ8L2xpPlxuXHRcdFx0XHRcdFx0XHQpO1xuXHRcdFx0XHRcdFx0fSl9XG5cdFx0XHRcdFx0PC91bD5cblx0XHRcdFx0KX1cblx0XHRcdDwvbWVudT5cblx0XHQ8L2Rpdj5cblx0KVxufTtcblxuQXBwTWVudS5tYWluID0gKG8sIGMpID0+ICh7XG5cdG9wZW5lZDogbyxcblx0Y2xvc2VkOiBjXG59KTtcblxuQXBwTWVudS5pbnB1dCA9IChwLCB2LCBmLCBzKSA9PiAoeyBwbGFjZWhvbGRlcjogcCwgdmFsdWU6IHYsIG9uSW5wdXQ6IGYsIHN0eWxlOiBzID8gcyA6IHVuZGVmaW5lZCB9KTtcblxuQXBwTWVudS50ZXh0ID0gKHYsIHMpID0+ICh7IHZhbHVlOiB2LCBzdHlsZTogcyA/IHMgOiB1bmRlZmluZWQgfSk7XG5cbkFwcE1lbnUuYnRuID0gKHYsIGYsIHMpID0+ICh7IHZhbHVlOiB2LCBvbkNsaWNrOiBmLCBzdHlsZTogcyA/IHMgOiB1bmRlZmluZWQgfSk7XG5cbkFwcE1lbnUuZGVsZXRlQnRuID0gKGYpID0+ICh7XG5cdHZhbHVlOiAnZGVsZXRlJyxcblx0c3R5bGU6IHtjb2xvcjogJyNmMDAnLCB0cmFuc2l0aW9uOiAnY29sb3IgMXMnfSxcblx0b25Ib2xkOiBmXG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBBcHBNZW51OyIsImNvbnN0XG5cdFJlYWN0ID0gcmVxdWlyZSgncHJlYWN0JyksXG5cblx0U3R5bGUgPSB7XG5cdFx0YnRuOiB7XG5cdFx0XHR3aWR0aDogJzJyZW0nLFxuXHRcdFx0aGVpZ2h0OiAnMnJlbScsXG5cdFx0XHRib3JkZXJSYWRpdXM6ICcxcmVtJyxcblxuXHRcdFx0Ym9yZGVyOiAnbm9uZScsXG5cdFx0XHRvdXRsaW5lOiAnbm9uZScsXG5cdFx0XHRiYWNrZ3JvdW5kQ29sb3I6ICcjNTU1JyxcblxuXHRcdFx0Y29sb3I6ICcjZjAwJyxcblx0XHRcdGZvbnRTaXplOiAnMS4ycmVtJyxcblx0XHRcdHRyYW5zaXRpb246ICdjb2xvciAxcycsXG5cblx0XHRcdGN1cnNvcjogJ3BvaW50ZXInXG5cdFx0fVxuXHR9O1xuXG5jbGFzcyBEZWxldGVCdXR0b24gZXh0ZW5kcyBSZWFjdC5Db21wb25lbnQge1xuXHRjb25zdHJ1Y3Rvcihwcm9wcywgY29udGV4dCkge1xuXHRcdHN1cGVyKHByb3BzLCBjb250ZXh0KTtcblx0fVxuXG5cdHNob3VsZENvbXBvbmVudFVwZGF0ZSgpIHtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cblxuXHRyZW5kZXIocHJvcHMpIHtcblx0XHRyZXR1cm4gKFxuXHRcdFx0PGJ1dHRvblxuXHRcdFx0XHRzdHlsZT17cHJvcHMuc3R5bGUgPyBPYmplY3QuYXNzaWduKHt9LCBTdHlsZS5idG4sIHByb3BzLnN0eWxlKSA6IFN0eWxlLmJ0bn1cblx0XHRcdFx0b25DbGljaz17KGUpID0+IHtcblx0XHRcdFx0XHRlLnRhcmdldC5zdHlsZS5jb2xvciA9ICcjZjAwJztcblx0XHRcdFx0XHRpZiAodGhpcy50aW1lcikge1xuXHRcdFx0XHRcdFx0Y2xlYXJUaW1lb3V0KHRoaXMudGltZXIpO1xuXHRcdFx0XHRcdFx0dGhpcy50aW1lciA9IHVuZGVmaW5lZDtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH19XG5cdFx0XHRcdG9uTW91c2VEb3duPXsoZSkgPT4ge1xuXHRcdFx0XHRcdGUudGFyZ2V0LnN0eWxlLmNvbG9yID0gXCIjNzc3XCI7XG5cdFx0XHRcdFx0aWYgKHByb3BzLm9uSG9sZCkgdGhpcy50aW1lciA9IHNldFRpbWVvdXQocHJvcHMub25Ib2xkLCAxMDAwLCBlKTtcblx0XHRcdFx0fX1cblx0XHRcdD5YPC9idXR0b24+XG5cdFx0KTtcblx0fVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IERlbGV0ZUJ1dHRvbjsiLCJjb25zdFxuXHRSZWFjdCA9IHJlcXVpcmUoJ3ByZWFjdCcpLFxuXG5cdEJpbmQgPSByZXF1aXJlKCcuLi9iaW5kLmpzJyksXG5cblx0U3R5bGUgPSB7XG5cdFx0ZWRpdEJveDoge1xuXHRcdFx0b3V0bGluZTogJ25vbmUnLFxuXHRcdFx0Ym9yZGVyOiAnbm9uZScsXG5cdFx0XHRvdmVyZmxvdzogJ2hpZGRlbicsXG5cdFx0XHRyZXNpemU6ICdub25lJ1xuXHRcdH1cblx0fTtcblxuY2xhc3MgRXhwYW5kaW5nVGV4dGFyZWEgZXh0ZW5kcyBSZWFjdC5Db21wb25lbnQge1xuXHRjb25zdHJ1Y3Rvcihwcm9wcywgY29udGV4dCkge1xuXHRcdHN1cGVyKHByb3BzLCBjb250ZXh0KTtcblx0XHR0aGlzLnN0YXRlID0ge1xuXHRcdFx0dmFsdWU6IHByb3BzLnZhbHVlLFxuXHRcdFx0c3R5bGU6IE9iamVjdC5hc3NpZ24oe30sIFN0eWxlLmVkaXRCb3gsIHsgaGVpZ2h0OiBwcm9wcy5iYXNlSGVpZ2h0IH0pXG5cdFx0fTtcblxuXHRcdEJpbmQodGhpcyk7XG5cdH1cblxuXHRyZW5kZXIocHJvcHMsIHN0YXRlKSB7XG5cdFx0dmFyIHN0eWxlID0gT2JqZWN0LmFzc2lnbih7fSwgcHJvcHMuc3R5bGUsIHN0YXRlLnN0eWxlKTtcblx0XHRyZXR1cm4gKFxuXHRcdFx0PHRleHRhcmVhXG5cdFx0XHRcdHN0eWxlPXtzdHlsZX1cblx0XHRcdFx0bWF4bGVuZ3RoPXtwcm9wcy5tYXhsZW5ndGh9XG5cdFx0XHRcdHBsYWNlaG9sZGVyPXtwcm9wcy5wbGFjZWhvbGRlcn1cblx0XHRcdFx0b25JbnB1dD17dGhpcy5vbklucHV0fVxuXHRcdFx0XHRvbkNoYW5nZT17cHJvcHMuY2hhbmdlfVxuXHRcdFx0XHRvbkZvY3VzPXtwcm9wcy5mb2N1c31cblx0XHRcdFx0b25CbHVyPXtwcm9wcy5ibHVyfVxuXHRcdFx0XHR2YWx1ZT17c3RhdGUudmFsdWV9XG5cdFx0XHQvPlxuXHRcdClcblx0fVxuXG5cdHNob3VsZENvbXBvbmVudFVwZGF0ZShwcm9wcywgc3RhdGUpIHtcblx0XHRyZXR1cm4gKChwcm9wcy52YWx1ZSAhPT0gdGhpcy5wcm9wcy52YWx1ZSkgfHxcblx0XHRcdFx0KHN0YXRlLnZhbHVlICE9PSB0aGlzLnN0YXRlLnZhbHVlKSk7XG5cdH1cblxuXHRjb21wb25lbnREaWRNb3VudCgpIHtcblx0XHR0aGlzLmRvUmVzaXplKCk7XG5cdFx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIHRoaXMuZG9SZXNpemUpO1xuXHR9XG5cblx0Y29tcG9uZW50V2lsbFVubW91bnQoKSB7XG5cdFx0d2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIHRoaXMuZG9SZXNpemUpO1xuXHR9XG5cblx0b25JbnB1dChldmVudCkge1xuXHRcdHRoaXMuc3RhdGUudmFsdWUgPSBldmVudC50YXJnZXQudmFsdWU7XG5cdFx0aWYgKHRoaXMucHJvcHMuaW5wdXQpIHRoaXMucHJvcHMuaW5wdXQoZXZlbnQpO1xuXHRcdHRoaXMuZG9SZXNpemUoKTtcblx0fVxuXG5cdGRvUmVzaXplKCkge1xuXHRcdHRoaXMuc3RhdGUuc3R5bGUuaGVpZ2h0ID0gdGhpcy5wcm9wcy5iYXNlSGVpZ2h0O1xuXHRcdHRoaXMuZm9yY2VVcGRhdGUodGhpcy5yZXNpemUpO1xuXHR9XG5cblx0cmVzaXplKCkge1xuXHRcdHRoaXMuc3RhdGUuc3R5bGUuaGVpZ2h0ID0gdGhpcy5iYXNlLnNjcm9sbEhlaWdodCArICdweCc7XG5cdFx0dGhpcy5mb3JjZVVwZGF0ZSgpO1xuXG5cdH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBFeHBhbmRpbmdUZXh0YXJlYTsiLCJjb25zdFxuXHRSZWFjdCA9IHJlcXVpcmUoJ3ByZWFjdCcpLFxuXHRSZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHByb3BzKSB7XG5cdHJldHVybiAoXG5cdFx0PGlucHV0XG5cdFx0XHR0eXBlPVwiZmlsZVwiXG5cdFx0XHRhY2NlcHQ9XCIud2VhdmVcIlxuXHRcdFx0c3R5bGU9e3tcblx0XHRcdFx0cG9zaXRpb246ICdhYnNvbHV0ZScsXG5cdFx0XHRcdHZpc2liaWxpdHk6ICdoaWRkZW4nLFxuXHRcdFx0XHR0b3A6ICctNTAnLFxuXHRcdFx0XHRsZWZ0OiAnLTUwJ1xuXHRcdFx0fX1cblx0XHRcdG9uY2hhbmdlPXsoZSkgPT4ge1xuXHRcdFx0XHRSZWFkZXIub25sb2FkZW5kID0gKCkgPT4gXG5cdFx0XHRcdFx0cHJvcHMub25DaGFuZ2UoUmVhZGVyLnJlc3VsdCk7XG5cdFx0XHRcdFJlYWRlci5yZWFkQXNUZXh0KGUudGFyZ2V0LmZpbGVzWzBdKTtcblx0XHRcdH19XG5cdFx0Lz5cblx0KTtcbn0iLCJjb25zdFxuXHRSZWFjdCA9IHJlcXVpcmUoJ3ByZWFjdCcpLFxuXG5cdERlbGV0ZUJ1dHRvbiA9IHJlcXVpcmUoJy4vRGVsZXRlQnV0dG9uLmpzJyksXG5cdEV4cGFuZGluZ1RleHRhcmVhID0gcmVxdWlyZSgnLi9FeHBhbmRpbmdUZXh0YXJlYS5qcycpLFxuXG5cdEJpbmQgPSByZXF1aXJlKCcuLi9iaW5kLmpzJyksXG5cdFN0eWxlID0ge1xuXHRcdGxvY2F0aW9uSGVhZGVyOiB7XG5cdFx0XHR6SW5kZXg6ICcxMCcsXG5cdFx0XHR3aWR0aDogJzdyZW0nLFxuXHRcdFx0Y29sb3I6ICcjZmZmJyxcblx0XHRcdGJhY2tncm91bmRDb2xvcjogJyM3Nzc3NzcnLFxuXHRcdFx0b3V0bGluZTogJ25vbmUnLFxuXHRcdFx0Zm9udFNpemU6ICcwLjlyZW0nLFxuXHRcdFx0Ym9yZGVyOiAnbm9uZScsXG5cdFx0XHR0ZXh0QWxpZ246ICdjZW50ZXInLFxuXHRcdFx0cGFkZGluZ1RvcDogJzAuNXJlbSdcblx0XHR9LFxuXHRcdGRyYWdnYWJsZToge1xuXHRcdFx0bWluSGVpZ2h0OiAnMC45cmVtJ1xuXHRcdH0sXG5cdFx0Ym94OiB7XG5cdFx0XHRwb3NpdGlvbjogJ3JlbGF0aXZlJyxcblx0XHRcdGRpc3BsYXk6ICdmbGV4Jyxcblx0XHRcdGZsZXhEaXJlY3Rpb246ICdjb2x1bW4nLFxuXHRcdFx0anVzdGlmeUNvbnRlbnQ6ICdmbGV4LWVuZCcsXG5cdFx0XHRoZWlnaHQ6ICcxNHJlbScsXG5cdFx0fSxcblx0XHRkZWxldGVCdXR0b246IHtcblx0XHRcdHpJbmRleDogMjUsXG5cdFx0XHRmb250U2l6ZTogJzAuOXJlbScsXG5cdFx0XHRwb3NpdGlvbjogJ2Fic29sdXRlJyxcblx0XHRcdGJvdHRvbTogJy0xLjJyZW0nLFxuXHRcdFx0cmlnaHQ6ICctMS4ycmVtJyxcblx0XHRcdGN1cnNvcjogJ3BvaW50ZXInXG5cdFx0fVxuXHR9O1xuXG5jbGFzcyBMb2NhdGlvbkhlYWRlciBleHRlbmRzIFJlYWN0LkNvbXBvbmVudCB7XG5cdGNvbnN0cnVjdG9yKHByb3BzLCBjb250ZXh0KSB7XG5cdFx0c3VwZXIocHJvcHMsIGNvbnRleHQpO1xuXHRcdHRoaXMuc3RhdGUgPSB7XG5cdFx0XHR2YWx1ZTogcHJvcHMudmFsdWUsXG5cdFx0XHRzZWxlY3RlZDogZmFsc2Vcblx0XHR9O1xuXG5cdFx0QmluZCh0aGlzKTtcblx0fVxuXG5cdHNob3VsZENvbXBvbmVudFVwZGF0ZShwcm9wcywgc3RhdGUpIHtcblx0XHRyZXR1cm4gKChwcm9wcy52YWx1ZSAhPT0gdGhpcy5wcm9wcy52YWx1ZSkgfHxcblx0XHRcdFx0KHN0YXRlLnZhbHVlICE9PSB0aGlzLnN0YXRlLnZhbHVlKSB8fFxuXHRcdFx0XHQoc3RhdGUuc2VsZWN0ZWQgIT09IHRoaXMuc3RhdGUuc2VsZWN0ZWQpKTtcblx0fVxuXG5cdGNvbXBvbmVudFdpbGxSZWNlaXZlUHJvcHMocHJvcHMpIHtcblx0XHR0aGlzLnNldFN0YXRlKHt2YWx1ZTogcHJvcHMudmFsdWUsIHNlbGVjdGVkOiBmYWxzZX0pO1xuXHR9XG5cblx0cmVuZGVyKHByb3BzLCBzdGF0ZSkge1xuXHRcdHJldHVybiAoXG5cdFx0XHQ8ZGl2XG5cdFx0XHRcdHN0eWxlPXtTdHlsZS5ib3h9XG5cdFx0XHRcdG9uRHJhZ092ZXI9eyhlKSA9PiBlLnByZXZlbnREZWZhdWx0KCl9XG5cdFx0XHRcdG9uRHJvcD17KCkgPT4gcHJvcHMub25Ecm9wKHByb3BzLmlkKX1cblx0XHRcdD5cblx0XHRcdFx0PGRpdlxuXHRcdFx0XHRcdHN0eWxlPXtTdHlsZS5kcmFnZ2FibGV9XG5cdFx0XHRcdFx0ZHJhZ2dhYmxlXG5cdFx0XHRcdFx0b25EcmFnU3RhcnQ9eyhlKSA9PiBwcm9wcy5vbkRyYWcocHJvcHMuaWQpfVxuXHRcdFx0XHQ+XG5cdFx0XHRcdFx0PEV4cGFuZGluZ1RleHRhcmVhXG5cdFx0XHRcdFx0XHR0eXBlPVwidGV4dFwiXG5cdFx0XHRcdFx0XHRzdHlsZT17U3R5bGUubG9jYXRpb25IZWFkZXJ9XG5cdFx0XHRcdFx0XHRtYXhMZW5ndGg9XCIyNFwiXG5cdFx0XHRcdFx0XHRiYXNlSGVpZ2h0PVwiMC45cmVtXCJcblx0XHRcdFx0XHRcdHZhbHVlPXtzdGF0ZS52YWx1ZX1cblx0XHRcdFx0XHRcdHBsYWNlaG9sZGVyPVwicGxhY2VcIlxuXHRcdFx0XHRcdFx0Zm9jdXM9e3RoaXMub25Gb2N1c31cblx0XHRcdFx0XHRcdGJsdXI9e3RoaXMub25CbHVyfVxuXHRcdFx0XHRcdFx0aW5wdXQ9eyhldmVudCkgPT4gdGhpcy5zZXRTdGF0ZSh7dmFsdWU6IGV2ZW50LnRhcmdldC52YWx1ZX0pfVxuXHRcdFx0XHRcdFx0Y2hhbmdlPXsoZXZlbnQpID0+IHRoaXMuY29udGV4dC5kbygnTU9ESUZZX0xPQ0FUSU9OX05BTUUnLCB7XG5cdFx0XHRcdFx0XHRcdGF0SW5kZXg6IHRoaXMucHJvcHMuaWQsXG5cdFx0XHRcdFx0XHRcdG5ld05hbWU6IGV2ZW50LnRhcmdldC52YWx1ZVxuXHRcdFx0XHRcdFx0fSl9XG5cdFx0XHRcdFx0Lz5cblx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcdHtzdGF0ZS5zZWxlY3RlZCA/XG5cdFx0XHRcdFx0PERlbGV0ZUJ1dHRvblxuXHRcdFx0XHRcdFx0cmVmPXsoYykgPT4gdGhpcy5kZWxCdG4gPSBjfVxuXHRcdFx0XHRcdFx0c3R5bGU9e1N0eWxlLmRlbGV0ZUJ1dHRvbn1cblx0XHRcdFx0XHRcdG9uSG9sZD17KCkgPT4gdGhpcy5jb250ZXh0LmRvKCdERUxFVEVfTE9DQVRJT04nLCB7IGF0SW5kZXg6IHByb3BzLmlkIH0pfVxuXHRcdFx0XHRcdC8+XG5cdFx0XHRcdDpcblx0XHRcdFx0XHQnJ1xuXHRcdFx0XHR9XG5cdFx0XHQ8L2Rpdj5cblx0XHQpXG5cdH1cblxuXHRvbkZvY3VzKGUpIHtcblx0XHR0aGlzLnNldFN0YXRlKHsgc2VsZWN0ZWQ6IHRydWUgfSk7XG5cdH1cblxuXHRvbkJsdXIoZSkge1xuXHRcdHNldFRpbWVvdXQoKCkgPT4ge1xuXHRcdFx0aWYgKCF0aGlzLmRlbEJ0bi50aW1lcikgdGhpcy5zZXRTdGF0ZSh7c2VsZWN0ZWQ6IGZhbHNlfSk7XG5cdFx0fSwgMTAwKTtcblx0fVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IExvY2F0aW9uSGVhZGVyOyIsImNvbnN0XG5cdFJlYWN0ID0gcmVxdWlyZSgncHJlYWN0JyksXG5cblx0U3R5bGUgPSB7XG5cdFx0b3V0ZXI6IHtcblx0XHRcdHpJbmRleDogMzAsXG5cdFx0XHRwb3NpdGlvbjogJ2ZpeGVkJyxcblx0XHRcdHRvcDogMCxcblx0XHRcdGxlZnQ6IDAsXG5cdFx0XHR3aWR0aDogJzEwMHZ3Jyxcblx0XHRcdGhlaWdodDogJzEwMHZoJyxcblx0XHRcdGJhY2tncm91bmRDb2xvcjogJ3JnYmEoMCwwLDAsMC41KScsXG5cdFx0XHRkaXNwbGF5OiAnZmxleCcsXG5cdFx0XHRqdXN0aWZ5Q29udGVudDogJ2NlbnRlcicsXG5cdFx0XHRhbGlnbkl0ZW1zOiAnY2VudGVyJ1xuXHRcdH0sXG5cdFx0aW5uZXI6IHtcblx0XHRcdGJhY2tncm91bmRDb2xvcjogJyMwMDAnLFxuXHRcdFx0ZGlzcGxheTogJ2ZsZXgnLFxuXHRcdFx0ZmxleERpcmVjdGlvbjogJ2NvbHVtbicsXG5cdFx0XHRqdXN0aWZ5Q29udGVudDogJ2ZsZXgtc3RhcnQnLFxuXHRcdFx0YWxpZ25JdGVtczogJ2NlbnRlcicsXG5cdFx0XHRwYWRkaW5nOiAnMXJlbSdcblx0XHR9XG5cdH07XG5cbmNsYXNzIE1vZGFsVmlldyBleHRlbmRzIFJlYWN0LkNvbXBvbmVudCB7XG5cdGNvbnN0cnVjdG9yKHByb3BzLCBjb250ZXh0KSB7IFxuXHRcdHN1cGVyKHByb3BzLCBjb250ZXh0KTtcblx0fVxuXG5cdHJlbmRlcihwcm9wcywgc3RhdGUpIHtcblx0XHRyZXR1cm4gKFxuXHRcdFx0PGRpdlxuXHRcdFx0XHRzdHlsZT17U3R5bGUub3V0ZXJ9XG5cdFx0XHRcdG9uQ2xpY2s9e3Byb3BzLmRpc21pc3N9XG5cdFx0XHQ+XG5cdFx0XHRcdDxkaXZcblx0XHRcdFx0XHRzdHlsZT17U3R5bGUuaW5uZXJ9XG5cdFx0XHRcdFx0b25DbGljaz17KGUpID0+IGUuc3RvcFByb3BhZ2F0aW9uKCl9XG5cdFx0XHRcdD5cblx0XHRcdFx0XHR7cHJvcHMuY2hpbGRyZW59XG5cdFx0XHRcdDwvZGl2PlxuXHRcdFx0PC9kaXY+XG5cdFx0KTtcblx0fVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IE1vZGFsVmlldzsiLCJjb25zdFxuXHRSZWFjdCA9IHJlcXVpcmUoJ3ByZWFjdCcpLFxuXG5cdE1vZGFsVmlldyA9IHJlcXVpcmUoJy4vTW9kYWxWaWV3LmpzJyksXG5cblx0QmluZCA9IHJlcXVpcmUoJy4uL2JpbmQuanMnKSxcblxuXHRTdHlsZSA9IHtcblx0XHRzY2VuZToge1xuXHRcdFx0ZGlzcGxheTogJ2ZsZXgnLFxuXHRcdFx0anVzdGlmeUNvbnRlbnQ6ICdmbGV4LXN0YXJ0Jyxcblx0XHRcdGZvbnRTaXplOiAnMC45cmVtJyxcblx0XHRcdGFsaWduSXRlbXM6ICdjZW50ZXInLFxuXHRcdFx0cGFkZGluZzogJzAuNXJlbScsXG5cdFx0XHRtYXJnaW46ICcwLjVyZW0gMC41cmVtJyxcblx0XHR9LFxuXHRcdHNwYW46IHtcblx0XHRcdHdpZHRoOiAnOXJlbScsXG5cdFx0XHRtYXJnaW5SaWdodDogJzFyZW0nLFxuXHRcdFx0d2hpdGVTcGFjZTogJ25vd3JhcCcsXG5cdFx0XHRvdmVyZmxvdzogJ2hpZGRlbicsXG5cdFx0XHR0ZXh0T3ZlcmZsb3c6ICdlbGxpcHNpcydcblx0XHR9LFxuXHRcdHJvdzoge1xuXHRcdFx0ZGlzcGxheTogJ2ZsZXgnLFxuXHRcdFx0anVzdGlmeUNvbnRlbnQ6ICdmbGV4LXN0YXJ0Jyxcblx0XHRcdGFsaWduSXRlbXM6ICdjZW50ZXInLFxuXHRcdFx0d2lkdGg6ICcxMDAlJ1xuXHRcdH0sXG5cdFx0aW5wdXQ6IHtcblx0XHRcdHpJbmRleDogJzExJyxcblx0XHRcdGNvbG9yOiAnIzAwMCcsXG5cdFx0XHRtYXhXaWR0aDogJzE0cmVtJyxcblx0XHRcdG91dGxpbmU6ICdub25lJyxcblx0XHRcdGZvbnRTaXplOiAnMXJlbScsXG5cdFx0XHRib3JkZXI6ICdub25lJyxcblx0XHRcdHRleHRBbGlnbjogJ2NlbnRlcicsXG5cdFx0XHRwYWRkaW5nOiAnMC4yNXJlbScsXG5cdFx0XHRtYXJnaW5Ub3A6ICcwLjVyZW0nXG5cdFx0fSxcblx0XHR0aHJlYWQ6IHtcblx0XHRcdGhlaWdodDogJzJyZW0nLFxuXHRcdFx0cGFkZGluZzogJzAgMC43NXJlbScsXG5cblx0XHRcdGJvcmRlcjogJ25vbmUnLFxuXHRcdFx0b3V0bGluZTogJ25vbmUnLFxuXHRcdFx0YmFja2dyb3VuZENvbG9yOiAnIzAwMDAwMCcsXG5cblx0XHRcdGNvbG9yOiAnI2ZmZicsXG5cdFx0XHRmb250U2l6ZTogJzFyZW0nLFxuXG5cdFx0XHRjdXJzb3I6ICdwb2ludGVyJyxcblx0XHRcdGJvcmRlclJhZGl1czogJzFyZW0nXG5cdFx0fSxcblx0XHRzbGljZVNlY3Rpb246IHtcblx0XHRcdG1pbldpZHRoOiAnMjByZW0nXG5cdFx0fSxcblx0XHR0aHJlYWRTZWN0aW9uOiB7XG5cdFx0XHRtYXJnaW5Cb3R0b206ICcxcmVtJ1xuXHRcdH0sXG5cdFx0ZGF0ZToge1xuXHRcdFx0Y29sb3I6ICcjZmZmJyxcblx0XHRcdGZvbnRTaXplOiAnMC45cmVtJ1xuXHRcdH0sXG5cdFx0aXRlbToge1xuXHRcdFx0aGVpZ2h0OiAnMi41cmVtJyxcblx0XHRcdHBhZGRpbmc6ICcwIDAuNzVyZW0nLFxuXG5cdFx0XHRib3JkZXI6ICdub25lJyxcblx0XHRcdG91dGxpbmU6ICdub25lJyxcblx0XHRcdGJhY2tncm91bmRDb2xvcjogJyMwMDAwMDAnLFxuXG5cdFx0XHRjb2xvcjogJyNmZmYnLFxuXHRcdFx0Zm9udFNpemU6ICcxLjJyZW0nLFxuXG5cdFx0XHRjdXJzb3I6ICdwb2ludGVyJ1xuXHRcdH0sXG5cdH07XG5cbmNsYXNzIFByaW50TW9kYWwgZXh0ZW5kcyBSZWFjdC5Db21wb25lbnQge1xuXHRjb25zdHJ1Y3Rvcihwcm9wcywgY29udGV4dCkgeyBcblx0XHRzdXBlcihwcm9wcywgY29udGV4dCk7XG5cblx0XHR0aGlzLnN0YXRlID0ge1xuXHRcdFx0dGhyZWFkczogW10sXG5cdFx0XHRmaWx0ZXJlZDogW10sXG5cdFx0XHRwcmludExpc3Q6IFtdXG5cdFx0fVxuXG5cdFx0QmluZCh0aGlzKTtcblx0fVxuXG5cdHJlbmRlcihwcm9wcywgc3RhdGUpIHtcblx0XHRyZXR1cm4gKFxuXHRcdFx0PE1vZGFsVmlld1xuXHRcdFx0XHRkaXNtaXNzPXtwcm9wcy5jYW5jZWx9XG5cdFx0XHQ+XG5cdFx0XHRcdDxkaXZcblx0XHRcdFx0XHRkYXRhLWlzPVwidGhyZWFkc1wiXG5cdFx0XHRcdFx0c3R5bGU9e1N0eWxlLnRocmVhZFNlY3Rpb259XG5cdFx0XHRcdD5cblx0XHRcdFx0XHR7cHJvcHMudGhyZWFkcy5yZWR1Y2UoKHRocmVhZHMsIHQsIGkpID0+IHtcblx0XHRcdFx0XHRcdGlmICh0Lm5hbWUubGVuZ3RoKSB7XG5cdFx0XHRcdFx0XHRcdHJldHVybiB0aHJlYWRzLmNvbmNhdChbXG5cdFx0XHRcdFx0XHRcdFx0PGJ1dHRvblxuXHRcdFx0XHRcdFx0XHRcdFx0ZGF0YS1pZD17aX1cblx0XHRcdFx0XHRcdFx0XHRcdHN0eWxlPXtPYmplY3QuYXNzaWduKHt9LCBTdHlsZS50aHJlYWQsIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0YmFja2dyb3VuZENvbG9yOiAoc3RhdGUudGhyZWFkcy5pbmRleE9mKGkpICE9PSAtMSkgPyB0LmNvbG9yIDogJyM3NzcnXG5cdFx0XHRcdFx0XHRcdFx0XHR9KX1cblx0XHRcdFx0XHRcdFx0XHRcdG9uQ2xpY2s9e3RoaXMuZmlsdGVyfVxuXHRcdFx0XHRcdFx0XHRcdD5cblx0XHRcdFx0XHRcdFx0XHRcdHt0Lm5hbWV9XG5cdFx0XHRcdFx0XHRcdFx0PC9idXR0b24+XG5cdFx0XHRcdFx0XHRcdF0pO1xuXHRcdFx0XHRcdFx0fSBlbHNlIHJldHVybiB0aHJlYWRzO1xuXHRcdFx0XHRcdH0sIFtdKX1cblx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcdDxkaXZcblx0XHRcdFx0XHRkYXRhLWlzPVwic2xpY2VzXCJcblx0XHRcdFx0XHRzdHlsZT17U3R5bGUuc2xpY2VTZWN0aW9ufVxuXHRcdFx0XHQ+XG5cdFx0XHRcdFx0e3Byb3BzLnNsaWNlcy5yZWR1Y2UoKHNsaWNlcywgc2xpY2UpID0+IHtcblx0XHRcdFx0XHRcdHZhciBzY2VuZXMgPSBzbGljZS5zY2VuZXMucmVkdWNlKChzY2VuZXMsIHNjZW5lKSA9PiB7XG5cdFx0XHRcdFx0XHRcdGlmIChzY2VuZSAmJiBzdGF0ZS50aHJlYWRzLmluZGV4T2Yoc2NlbmUudGhyZWFkKSAhPT0gLTEpIHtcblx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gc2NlbmVzLmNvbmNhdChbXG5cdFx0XHRcdFx0XHRcdFx0XHQ8ZGl2XG5cdFx0XHRcdFx0XHRcdFx0XHRcdHN0eWxlPXtPYmplY3QuYXNzaWduKHt9LCBTdHlsZS5zY2VuZSwge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGNvbG9yOiAnI2ZmZicsXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0YmFja2dyb3VuZENvbG9yOiBwcm9wcy50aHJlYWRzW3NjZW5lLnRocmVhZF0uY29sb3Jcblx0XHRcdFx0XHRcdFx0XHRcdFx0fSl9XG5cdFx0XHRcdFx0XHRcdFx0XHQ+XG5cdFx0XHRcdFx0XHRcdFx0XHRcdDxzcGFuXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0c3R5bGU9e1N0eWxlLnNwYW59XG5cdFx0XHRcdFx0XHRcdFx0XHRcdD57c2NlbmUuaGVhZH08L3NwYW4+XG5cdFx0XHRcdFx0XHRcdFx0XHRcdDxzcGFuPntzY2VuZS53YyArICcgd29yZHMnfTwvc3Bhbj5cblx0XHRcdFx0XHRcdFx0XHRcdDwvZGl2PlxuXHRcdFx0XHRcdFx0XHRcdF0pO1xuXHRcdFx0XHRcdFx0XHR9IGVsc2UgcmV0dXJuIHNjZW5lcztcblx0XHRcdFx0XHRcdH0sIFtdKTtcblxuXHRcdFx0XHRcdFx0aWYgKHNjZW5lcy5sZW5ndGgpIHtcblx0XHRcdFx0XHRcdFx0c2NlbmVzLnVuc2hpZnQoPHNwYW4gc3R5bGU9e1N0eWxlLmRhdGV9PntzbGljZS5kYXRldGltZX08L3NwYW4+KTtcblx0XHRcdFx0XHRcdFx0cmV0dXJuIHNsaWNlcy5jb25jYXQoW1xuXHRcdFx0XHRcdFx0XHRcdDxkaXZcblx0XHRcdFx0XHRcdFx0XHRcdHN0eWxlPXtTdHlsZS5yb3d9XG5cdFx0XHRcdFx0XHRcdFx0PlxuXHRcdFx0XHRcdFx0XHRcdFx0e3NjZW5lc31cblx0XHRcdFx0XHRcdFx0XHQ8L2Rpdj5cblx0XHRcdFx0XHRcdFx0XSk7XG5cdFx0XHRcdFx0XHR9IGVsc2UgcmV0dXJuIHNsaWNlcztcblx0XHRcdFx0XHR9LCBbXSl9XG5cdFx0XHRcdDwvZGl2PlxuXHRcdFx0XHQ8YnV0dG9uXG5cdFx0XHRcdFx0c3R5bGU9e1N0eWxlLml0ZW19XG5cdFx0XHRcdFx0b25DbGljaz17KCkgPT4ge1xuXHRcdFx0XHRcdFx0cHJvcHMuY2FuY2VsKCk7XG5cdFx0XHRcdFx0fX1cblx0XHRcdFx0PlxuXHRcdFx0XHRcdHByaW50XG5cdFx0XHRcdDwvYnV0dG9uPlxuXHRcdFx0PC9Nb2RhbFZpZXc+XG5cdFx0KTtcblx0fVxuXG5cdGZpbHRlcihldmVudCkge1xuXHRcdHZhciBpZCA9IE51bWJlcihldmVudC50YXJnZXQuZGF0YXNldC5pZCksXG5cdFx0XHRpID0gdGhpcy5zdGF0ZS50aHJlYWRzLmluZGV4T2YoaWQpO1xuXG5cdFx0aWYgKGkgPT09IC0xKSB0aGlzLnN0YXRlLnRocmVhZHMucHVzaChpZCk7XG5cdFx0ZWxzZSB0aGlzLnN0YXRlLnRocmVhZHMuc3BsaWNlKGksIDEpO1xuXHRcdFxuXHRcdHRoaXMuc2V0U3RhdGUoeyBmaWx0ZXJlZDogW10gfSk7XG5cblx0fVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFByaW50TW9kYWw7IiwiY29uc3Rcblx0UmVhY3QgPSByZXF1aXJlKCdwcmVhY3QnKSxcblxuXHRNb2RhbFZpZXcgPSByZXF1aXJlKCcuL01vZGFsVmlldy5qcycpLFxuXG5cdFN0eWxlID0ge1xuXHRcdHNjZW5lOiB7XG5cdFx0XHRkaXNwbGF5OiAnZmxleCcsXG5cdFx0XHRqdXN0aWZ5Q29udGVudDogJ3NwYWNlLWFyb3VuZCcsXG5cdFx0XHRhbGlnbkl0ZW1zOiAnY2VudGVyJyxcblx0XHRcdHBhZGRpbmc6ICcwLjI1cmVtJyxcblx0XHRcdG1hcmdpblRvcDogJzAuNXJlbSdcblx0XHR9LFxuXHRcdHRpdGxlOiB7XG5cdFx0XHRoZWlnaHQ6ICcycmVtJyxcblx0XHRcdG1heFdpZHRoOiAnOTV2dycsXG5cdFx0XHRwYWRkaW5nOiAnMCAwLjc1cmVtJyxcblx0XHRcdGJvcmRlcjogJ25vbmUnLFxuXHRcdFx0Ym9yZGVyQm90dG9tOiAndGhpbiBzb2xpZCAjZmZmJyxcblx0XHRcdG91dGxpbmU6ICdub25lJyxcblx0XHRcdGJhY2tncm91bmRDb2xvcjogJyMwMDAnLFxuXHRcdFx0Zm9udFNpemU6ICcxLjJyZW0nLFxuXHRcdFx0Y29sb3I6ICcjZmZmJ1xuXHRcdH0sXG5cdFx0YXV0aG9yOiB7XG5cdFx0XHRoZWlnaHQ6ICcycmVtJyxcblx0XHRcdG1heFdpZHRoOiAnOTV2dycsXG5cdFx0XHRwYWRkaW5nOiAnMCAwLjc1cmVtJyxcblx0XHRcdGJvcmRlcjogJ25vbmUnLFxuXHRcdFx0Ym9yZGVyQm90dG9tOiAndGhpbiBzb2xpZCAjZmZmJyxcblx0XHRcdG91dGxpbmU6ICdub25lJyxcblx0XHRcdGJhY2tncm91bmRDb2xvcjogJyMwMDAnLFxuXHRcdFx0Zm9udFNpemU6ICcxcmVtJyxcblx0XHRcdGNvbG9yOiAnI2ZmZidcblx0XHR9LFxuXHRcdGl0ZW06IHtcblx0XHRcdGhlaWdodDogJzIuNXJlbScsXG5cdFx0XHRwYWRkaW5nOiAnMCAwLjc1cmVtJyxcblxuXHRcdFx0Ym9yZGVyOiAnbm9uZScsXG5cdFx0XHRvdXRsaW5lOiAnbm9uZScsXG5cdFx0XHRiYWNrZ3JvdW5kQ29sb3I6ICcjMDAwMDAwJyxcblxuXHRcdFx0Y29sb3I6ICcjZmZmJyxcblx0XHRcdGZvbnRTaXplOiAnMS4ycmVtJyxcblxuXHRcdFx0Y3Vyc29yOiAncG9pbnRlcidcblx0XHR9LFxuXHRcdHJvdzoge1xuXHRcdFx0ZGlzcGxheTogJ2ZsZXgnLFxuXHRcdFx0anVzdGlmeUNvbnRlbnQ6ICdzcGFjZS1hcm91bmQnLFxuXHRcdFx0YWxpZ25JdGVtczogJ2NlbnRlcicsXG5cdFx0XHRtYXJnaW5Ub3A6ICcxcmVtJ1xuXHRcdH1cblxuXHR9O1xuXG5mdW5jdGlvbiBNZWFzdXJlVGV4dCh0ZXh0KSB7XG5cdHZhciB3aWRlID0gdGV4dC5tYXRjaCgvW1dNXS9nKSxcblx0XHR0aGluID0gdGV4dC5tYXRjaCgvW0l0cmxpaiEuIF0vZyk7XG5cblx0XHR3aWRlID0gd2lkZSA/IHdpZGUubGVuZ3RoIDogMDtcblx0XHR0aGluID0gdGhpbiA/IHRoaW4ubGVuZ3RoIDogMDtcblxuXHRyZXR1cm4gKHRleHQubGVuZ3RoICsgd2lkZSAqIDEuMiAtIHRoaW4gKiAwLjMpO1xufVxuXG5jbGFzcyBQcm9qZWN0TW9kYWwgZXh0ZW5kcyBSZWFjdC5Db21wb25lbnQge1xuXHRjb25zdHJ1Y3Rvcihwcm9wcywgY29udGV4dCkgeyBcblx0XHRzdXBlcihwcm9wcywgY29udGV4dCk7XG5cdH1cblxuXHRyZW5kZXIocHJvcHMsIHN0YXRlKSB7XG5cdFx0cmV0dXJuIChcblx0XHRcdDxNb2RhbFZpZXdcblx0XHRcdFx0ZGlzbWlzcz17cHJvcHMub25Eb25lfVxuXHRcdFx0PlxuXHRcdFx0XHQ8ZGl2IHN0eWxlPXtTdHlsZS5yb3d9PlxuXHRcdFx0XHRcdDxpbnB1dFxuXHRcdFx0XHRcdFx0c3R5bGU9e1N0eWxlLnRpdGxlfVxuXHRcdFx0XHRcdFx0dHlwZT1cInRleHRcIlxuXHRcdFx0XHRcdFx0cGxhY2Vob2xkZXI9XCJQcm9qZWN0IFRpdGxlXCJcblx0XHRcdFx0XHRcdG1heExlbmd0aD17NDB9XG5cdFx0XHRcdFx0XHRzaXplPXtNYXRoLm1heChNZWFzdXJlVGV4dChwcm9wcy50aXRsZS5sZW5ndGggPyBwcm9wcy50aXRsZSA6IChwcm9wcy5wbGFjZWhvbGRlciB8fCAnJykpLCAyMCl9XG5cdFx0XHRcdFx0XHRvbklucHV0PXtwcm9wcy5mdW5jdGlvbnMub25UaXRsZUNoYW5nZX1cblx0XHRcdFx0XHRcdHZhbHVlPXtwcm9wcy50aXRsZX1cblx0XHRcdFx0XHQvPlxuXHRcdFx0XHQ8L2Rpdj5cblx0XHRcdFx0PGRpdiBzdHlsZT17U3R5bGUucm93fT5cblx0XHRcdFx0XHQ8aW5wdXRcblx0XHRcdFx0XHRcdHN0eWxlPXtTdHlsZS5hdXRob3J9XG5cdFx0XHRcdFx0XHR0eXBlPVwidGV4dFwiXG5cdFx0XHRcdFx0XHRwbGFjZWhvbGRlcj1cIkF1dGhvclwiXG5cdFx0XHRcdFx0XHRtYXhMZW5ndGg9ezQwfVxuXHRcdFx0XHRcdFx0c2l6ZT17TWF0aC5tYXgoTWVhc3VyZVRleHQocHJvcHMuYXV0aG9yLmxlbmd0aCA/IHByb3BzLmF1dGhvciA6IChwcm9wcy5wbGFjZWhvbGRlciB8fCAnJykpLCAyMCl9XG5cdFx0XHRcdFx0XHRvbklucHV0PXtwcm9wcy5mdW5jdGlvbnMub25BdXRob3JDaGFuZ2V9XG5cdFx0XHRcdFx0XHR2YWx1ZT17cHJvcHMuYXV0aG9yfVxuXHRcdFx0XHRcdC8+XG5cdFx0XHRcdDwvZGl2PlxuXG5cdFx0XHRcdDxkaXYgc3R5bGU9e1N0eWxlLnJvd30+XG5cdFx0XHRcdFx0PGJ1dHRvblxuXHRcdFx0XHRcdFx0c3R5bGU9e1N0eWxlLml0ZW19XG5cdFx0XHRcdFx0XHRvbkNsaWNrPXsoKSA9PiB7XG5cdFx0XHRcdFx0XHRcdHByb3BzLm9uRG9uZSgpO1xuXHRcdFx0XHRcdFx0XHRwcm9wcy5mdW5jdGlvbnMuaW1wb3J0KClcblx0XHRcdFx0XHRcdH19XG5cdFx0XHRcdFx0PlxuXHRcdFx0XHRcdFx0aW1wb3J0XG5cdFx0XHRcdFx0PC9idXR0b24+XG5cdFx0XHRcdFx0PGJ1dHRvblxuXHRcdFx0XHRcdFx0c3R5bGU9e1N0eWxlLml0ZW19XG5cdFx0XHRcdFx0XHRvbkNsaWNrPXsoKSA9PiB7XG5cdFx0XHRcdFx0XHRcdHByb3BzLm9uRG9uZSgpO1xuXHRcdFx0XHRcdFx0XHRwcm9wcy5mdW5jdGlvbnMuZXhwb3J0KClcblx0XHRcdFx0XHRcdH19XG5cdFx0XHRcdFx0PlxuXHRcdFx0XHRcdFx0ZXhwb3J0XG5cdFx0XHRcdFx0PC9idXR0b24+XG5cdFx0XHRcdFx0PGJ1dHRvblxuXHRcdFx0XHRcdFx0c3R5bGU9e1N0eWxlLml0ZW19XG5cdFx0XHRcdFx0XHRvbkNsaWNrPXsoKSA9PiB7XG5cdFx0XHRcdFx0XHRcdHByb3BzLm9uRG9uZSgpO1xuXHRcdFx0XHRcdFx0XHRwcm9wcy5mdW5jdGlvbnMucHJpbnQoKVxuXHRcdFx0XHRcdFx0fX1cblx0XHRcdFx0XHQ+XG5cdFx0XHRcdFx0XHRwcmludFxuXHRcdFx0XHRcdDwvYnV0dG9uPlxuXHRcdFx0XHQ8L2Rpdj5cblx0XHRcdFx0PGRpdiBzdHlsZT17U3R5bGUucm93fT5cblx0XHRcdFx0XHQ8YnV0dG9uXG5cdFx0XHRcdFx0XHRzdHlsZT17T2JqZWN0LmFzc2lnbih7fSwgU3R5bGUuaXRlbSwgeyBjb2xvcjogJyNmMDAnLCB0cmFuc2l0aW9uOiAnY29sb3IgMXMnIH0pfVxuXHRcdFx0XHRcdFx0b25DbGljaz17KGUpID0+IHtcblx0XHRcdFx0XHRcdFx0ZS50YXJnZXQuc3R5bGUuY29sb3IgPSAnI2YwMCc7XG5cdFx0XHRcdFx0XHRcdGlmICh0aGlzLnRpbWVyKSB7XG5cdFx0XHRcdFx0XHRcdFx0Y2xlYXJUaW1lb3V0KHRoaXMudGltZXIpO1xuXHRcdFx0XHRcdFx0XHRcdHRoaXMudGltZXIgPSB1bmRlZmluZWQ7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH19XG5cdFx0XHRcdFx0XHRvbk1vdXNlRG93bj17KGUpID0+IHtcblx0XHRcdFx0XHRcdFx0ZS50YXJnZXQuc3R5bGUuY29sb3IgPSBcIiM3NzdcIjtcblx0XHRcdFx0XHRcdFx0dGhpcy50aW1lciA9IHNldFRpbWVvdXQocHJvcHMuZnVuY3Rpb25zLmRlbGV0ZSwgMTAwMCwgZSk7XG5cdFx0XHRcdFx0XHR9fVxuXHRcdFx0XHRcdD5kZWxldGU8L2J1dHRvbj5cblx0XHRcdFx0PC9kaXY+XG5cblx0XHRcdDwvTW9kYWxWaWV3PlxuXHRcdCk7XG5cdH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBQcm9qZWN0TW9kYWw7IiwiY29uc3Rcblx0UmVhY3QgPSByZXF1aXJlKCdwcmVhY3QnKSxcblxuXHREZWxldGVCdXR0b24gPSByZXF1aXJlKCcuL0RlbGV0ZUJ1dHRvbi5qcycpLFxuXG5cdG5leHRDb2xvciA9IHJlcXVpcmUoJy4uL2NvbG9ycy5qcycpLFxuXG5cdFRocmVhZExhYmVsID0gcmVxdWlyZSgnLi9UaHJlYWRMYWJlbC5qcycpLFxuXG5cdEJpbmQgPSByZXF1aXJlKCcuLi9iaW5kLmpzJyksXG5cdEV4cGFuZGluZ1RleHRhcmVhID0gcmVxdWlyZSgnLi9FeHBhbmRpbmdUZXh0YXJlYS5qcycpLFxuXG5cdFN0eWxlID0ge1xuXHRcdGJveDoge1xuXHRcdFx0bWF4V2lkdGg6ICc1MHJlbScsXG5cdFx0XHRiYWNrZ3JvdW5kQ29sb3I6ICcjZmZmJyxcblx0XHRcdGNvbG9yOiAnIzIyMicsXG5cdFx0XHRkaXNwbGF5OiAnZmxleCcsXG5cdFx0XHRmbGV4RGlyZWN0aW9uOiAnY29sdW1uJyxcblx0XHRcdGp1c3RpZnlDb250ZW50OiAnc3BhY2UtYXJvdW5kJyxcblx0XHRcdGFsaWduSXRlbXM6ICdzdHJldGNoJyxcblx0XHRcdHdpZHRoOiAnMTRyZW0nLFxuXHRcdFx0cG9zaXRpb246ICdyZWxhdGl2ZScsXG5cdFx0XHR0b3A6ICcwLjJyZW0nLFxuXHRcdFx0bWF4SGVpZ2h0OiAnMTNyZW0nXG5cdFx0fSxcblxuXHRcdHNjZW5lSGVhZDoge1xuXHRcdFx0Zm9udFNpemU6ICcxLjFyZW0nLFxuXHRcdFx0aGVpZ2h0OiAnMS4zcmVtJyxcblx0XHRcdG1hcmdpbjogJzAuMjVyZW0gMC43NXJlbSdcblx0XHR9LFxuXG5cdFx0c3RhdHM6IHtcblx0XHRcdGNvbG9yOiAnI2ZmZicsXG5cdFx0XHRkaXNwbGF5OiAnZmxleCcsXG5cdFx0XHRqdXN0aWZ5Q29udGVudDogJ3NwYWNlLWFyb3VuZCcsXG5cdFx0XHRhbGlnbkl0ZW1zOiAnY2VudGVyJyxcblx0XHRcdGZvbnRTaXplOiAnMC45cmVtJyxcblx0XHRcdGhlaWdodDogJzJyZW0nXG5cdFx0fSxcblxuXHRcdHdvcmRjb3VudDoge1xuXHRcdFx0Zm9udFNpemU6ICcwLjlyZW0nLFxuXHRcdFx0cGFkZGluZzogJzAuNXJlbSdcblx0XHR9LFxuXG5cdFx0dGV4dGFyZWE6IHtcblx0XHRcdGZvbnRTaXplOiAnMS4xcmVtJyxcblx0XHRcdG1hcmdpbjogJzAuNzVyZW0nLFxuXHRcdFx0bWF4SGVpZ2h0OiAnOXJlbSdcblx0XHR9LFxuXG5cdFx0YnV0dG9uOiB7XG5cdFx0XHRmb250U2l6ZTogJzAuOXJlbScsXG5cdFx0XHRwYWRkaW5nOiAnMC41cmVtJyxcblx0XHRcdGNvbG9yOiAnI2ZmZicsXG5cdFx0XHRiYWNrZ3JvdW5kQ29sb3I6ICdyZ2JhKDAsMCwwLDApJyxcblx0XHRcdGJvcmRlcjogJ25vbmUnLFxuXHRcdFx0b3V0bGluZTogJ25vbmUnLFxuXHRcdFx0Y3Vyc29yOiAncG9pbnRlcidcblx0XHR9LFxuXHRcdGNvbG9yQnV0dG9uOiB7XG5cdFx0XHR3aWR0aDogJzFyZW0nLFxuXHRcdFx0aGVpZ2h0OiAnMXJlbScsXG5cdFx0XHRib3JkZXI6ICd0aGluIHNvbGlkICNmZmYnLFxuXHRcdFx0Ym9yZGVyUmFkaXVzOiAnMXJlbScsXG5cdFx0XHRjb2xvcjogJyNmZmYnLFxuXHRcdFx0YmFja2dyb3VuZENvbG9yOiAncmdiYSgwLDAsMCwwKScsXG5cdFx0XHRvdXRsaW5lOiAnbm9uZScsXG5cdFx0XHRjdXJzb3I6ICdwb2ludGVyJ1xuXHRcdH0sXG5cdFx0bW92ZUJ1dHRvbjoge1xuXHRcdFx0ekluZGV4OiAyNSxcblx0XHRcdGZvbnRTaXplOiAnMC45cmVtJyxcblx0XHRcdHBvc2l0aW9uOiAnYWJzb2x1dGUnLFxuXHRcdFx0cGFkZGluZzogJzAuNXJlbScsXG5cdFx0XHRib3R0b206ICctMi41cmVtJyxcblx0XHRcdGxlZnQ6ICczcmVtJyxcblx0XHRcdGJvcmRlcjogJ25vbmUnLFxuXHRcdFx0Y29sb3I6ICcjZmZmJyxcblx0XHRcdGJhY2tncm91bmRDb2xvcjogJyMwMDAnLFxuXHRcdFx0b3V0bGluZTogJ25vbmUnLFxuXHRcdFx0Y3Vyc29yOiAncG9pbnRlcidcblx0XHR9LFxuXHRcdGRlbGV0ZUJ1dHRvbjoge1xuXHRcdFx0ekluZGV4OiAyNSxcblx0XHRcdGZvbnRTaXplOiAnMC45cmVtJyxcblx0XHRcdHBvc2l0aW9uOiAnYWJzb2x1dGUnLFxuXHRcdFx0Ym90dG9tOiAnLTEuNHJlbScsXG5cdFx0XHRyaWdodDogJy0xLjRyZW0nLFxuXHRcdFx0Y3Vyc29yOiAncG9pbnRlcidcblx0XHR9XG5cdH07XG5cblxuY2xhc3MgU2NlbmVFZGl0b3IgZXh0ZW5kcyBSZWFjdC5Db21wb25lbnQge1xuXHRjb25zdHJ1Y3Rvcihwcm9wcywgY29udGV4dCkge1xuXHRcdHN1cGVyKHByb3BzLCBjb250ZXh0KTtcblxuXHRcdEJpbmQodGhpcyk7XG5cdH1cblxuXHRyZW5kZXIocHJvcHMsIHN0YXRlKSB7XG5cdFx0dmFyIGFyZ3lsZSA9IE9iamVjdC5hc3NpZ24oe30sIFN0eWxlLmJveCwge1xuXHRcdFx0Ym9yZGVyOiAocHJvcHMuc2VsZWN0ZWQgPyAoJzAuMnJlbSBzb2xpZCAnICsgcHJvcHMudGhyZWFkLmNvbG9yKSA6ICcwIHNvbGlkIHJnYmEoMCwwLDAsMCknKSxcblx0XHRcdG1hcmdpbjogcHJvcHMuc2VsZWN0ZWQgPyAnMCcgOiAnMC4ycmVtJ1xuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIChcblx0XHRcdDxkaXZcblx0XHRcdFx0c3R5bGU9e2FyZ3lsZX1cblx0XHRcdFx0b25DbGljaz17dGhpcy5vbkNsaWNrfVxuXHRcdFx0XHRkcmFnZ2FibGVcblx0XHRcdFx0b25EcmFnU3RhcnQ9eygpID0+IHByb3BzLm9uRHJhZyh7c2xpY2VJbmRleDogcHJvcHMuc2xpY2VJbmRleCwgc2NlbmVJbmRleDogcHJvcHMuc2NlbmVJbmRleH0pfVxuXHRcdFx0PlxuXHRcdFx0XHQ8RXhwYW5kaW5nVGV4dGFyZWFcblx0XHRcdFx0XHRzdHlsZT17U3R5bGUudGV4dGFyZWF9XG5cdFx0XHRcdFx0bWF4TGVuZ3RoPXsyNTB9IFxuXHRcdFx0XHRcdG9uaW5wdXQ9e3RoaXMub25JbnB1dH0gXG5cdFx0XHRcdFx0YmFzZUhlaWdodD1cIjEuM3JlbVwiXG5cdFx0XHRcdFx0cGxhY2Vob2xkZXI9XCJUaXRsZS9TdW1tYXJ5XCJcblx0XHRcdFx0XHR2YWx1ZT17cHJvcHMuc2NlbmUuaGVhZH1cblx0XHRcdFx0XHRmb2N1cz17dGhpcy5vbkZvY3VzfVxuXHRcdFx0XHRcdGNoYW5nZT17dGhpcy5vbkNoYW5nZX1cblx0XHRcdFx0XHRyZWY9e2VsID0+IHRoaXMuZWwgPSBlbH1cblx0XHRcdFx0Lz5cblx0XHRcdFx0XHQ8c3BhbiBcblx0XHRcdFx0XHRcdHN0eWxlPXtPYmplY3QuYXNzaWduKHt9LCBTdHlsZS5zdGF0cywge2JhY2tncm91bmRDb2xvcjogcHJvcHMudGhyZWFkLmNvbG9yfSl9XG5cdFx0XHRcdFx0PlxuXHRcdFx0XHRcdFx0eyFwcm9wcy5zZWxlY3RlZCA/IFtcblx0XHRcdFx0XHRcdFx0PGJ1dHRvbiBcblx0XHRcdFx0XHRcdFx0XHRvbmNsaWNrPXsoKSA9PiBwcm9wcy5vbkVkaXQoe3NsaWNlSW5kZXg6IHByb3BzLnNsaWNlSW5kZXgsIHNjZW5lSW5kZXg6IHByb3BzLnNjZW5lSW5kZXh9KX0gXG5cdFx0XHRcdFx0XHRcdFx0c3R5bGU9e1N0eWxlLmJ1dHRvbn1cblx0XHRcdFx0XHRcdFx0PmVkaXQ8L2J1dHRvbj4sXG5cdFx0XHRcdFx0XHRcdDxzcGFuIHN0eWxlPXtTdHlsZS53b3JkY291bnR9Pntwcm9wcy5zY2VuZS53Y30gd29yZHM8L3NwYW4+XG5cdFx0XHRcdFx0XHRdIDogW1xuXHRcdFx0XHRcdFx0XHQ8YnV0dG9uXG5cdFx0XHRcdFx0XHRcdFx0c3R5bGU9e1N0eWxlLmNvbG9yQnV0dG9ufVxuXHRcdFx0XHRcdFx0XHRcdG9uQ2xpY2s9eygpID0+IHRoaXMuY29udGV4dC5kbygnTU9ESUZZX05PVEVfVEhSRUFEJywge1xuXHRcdFx0XHRcdFx0XHRcdFx0c2xpY2VJbmRleDogcHJvcHMuc2xpY2VJbmRleCxcblx0XHRcdFx0XHRcdFx0XHRcdHNjZW5lSW5kZXg6IHByb3BzLnNjZW5lSW5kZXhcblx0XHRcdFx0XHRcdFx0XHR9KX1cblx0XHRcdFx0XHRcdFx0PjwvYnV0dG9uPixcblx0XHRcdFx0XHRcdFx0PFRocmVhZExhYmVsXG5cdFx0XHRcdFx0XHRcdFx0dmFsdWU9e3Byb3BzLnRocmVhZC5uYW1lfVxuXHRcdFx0XHRcdFx0XHRcdG9uQ2hhbmdlPXsoZSkgPT4gdGhpcy5jb250ZXh0LmRvKCdNT0RJRllfVEhSRUFEX05BTUUnLCB7XG5cdFx0XHRcdFx0XHRcdFx0XHRhdEluZGV4OiBwcm9wcy5zY2VuZS50aHJlYWQsXG5cdFx0XHRcdFx0XHRcdFx0XHRuZXdOYW1lOiBlLnRhcmdldC52YWx1ZVxuXHRcdFx0XHRcdFx0XHRcdH0pfVxuXHRcdFx0XHRcdFx0XHQvPixcblx0XHRcdFx0XHRcdFx0Lyo8YnV0dG9uXG5cdFx0XHRcdFx0XHRcdFx0c3R5bGU9e1N0eWxlLm1vdmVCdXR0b259XG5cdFx0XHRcdFx0XHRcdFx0b25DbGljaz17cHJvcHMubW92ZU5vdGV9XG5cdFx0XHRcdFx0XHRcdD5tb3ZlPC9idXR0b24+LCovXG5cdFx0XHRcdFx0XHRcdDxEZWxldGVCdXR0b25cblx0XHRcdFx0XHRcdFx0XHRzdHlsZT17U3R5bGUuZGVsZXRlQnV0dG9ufVxuXHRcdFx0XHRcdFx0XHRcdG9uSG9sZD17KCkgPT4gdGhpcy5jb250ZXh0LmRvKCdERUxFVEVfTk9URScsIHtcblx0XHRcdFx0XHRcdFx0XHRcdHNsaWNlSW5kZXg6IHByb3BzLnNsaWNlSW5kZXgsXG5cdFx0XHRcdFx0XHRcdFx0XHRzY2VuZUluZGV4OiBwcm9wcy5zY2VuZUluZGV4XG5cdFx0XHRcdFx0XHRcdFx0fSl9XG5cdFx0XHRcdFx0XHRcdC8+XHRcdFx0XHRcdFx0XHRcblx0XHRcdFx0XHRcdF19XG5cdFx0XHRcdDwvc3Bhbj5cblx0XHRcdDwvZGl2PlxuXHRcdClcblx0fVxuXG5cdG9uQ3JlYXRlTm90ZShldmVudCkge1xuXHRcdHRoaXMubmV3Tm90ZShldmVudCk7XG5cdH1cblxuXHRvbkZvY3VzKGV2ZW50KSB7XG5cdFx0aWYgKCF0aGlzLnByb3BzLnNlbGVjdGVkKSB0aGlzLnNlbGVjdCgpO1xuXHR9XG5cblx0b25DaGFuZ2UoZXZlbnQpIHtcblx0XHR0aGlzLmNvbnRleHQuZG8oJ01PRElGWV9OT1RFX0hFQUQnLCB7XG5cdFx0XHRzbGljZUluZGV4OiB0aGlzLnByb3BzLnNsaWNlSW5kZXgsXG5cdFx0XHRzY2VuZUluZGV4OiB0aGlzLnByb3BzLnNjZW5lSW5kZXgsXG5cdFx0XHRuZXdIZWFkOiBldmVudC50YXJnZXQudmFsdWVcblx0XHR9KTtcblx0fVxuXG5cdG9uQ2xpY2soZXZlbnQpIHtcblx0XHRldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcblx0XHRpZiAoIXRoaXMucHJvcHMuc2VsZWN0ZWQpIHtcblx0XHRcdHRoaXMuc2VsZWN0KCk7XG5cdFx0XHR0aGlzLmVsLmJhc2UuZm9jdXMoKTtcblx0XHR9XG5cdH1cblxuXHRzZWxlY3QoKSB7XG5cdFx0dGhpcy5wcm9wcy5vblNlbGVjdCh7XG5cdFx0XHRzbGljZUluZGV4OiB0aGlzLnByb3BzLnNsaWNlSW5kZXgsXG5cdFx0XHRzY2VuZUluZGV4OiB0aGlzLnByb3BzLnNjZW5lSW5kZXhcblx0XHR9KTtcblx0fVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNjZW5lRWRpdG9yOyIsImNvbnN0XG5cdFJlYWN0ID0gcmVxdWlyZSgncHJlYWN0JyksXG5cblx0RXhwYW5kaW5nVGV4dGFyZWEgPSByZXF1aXJlKCcuL0V4cGFuZGluZ1RleHRhcmVhLmpzJyksXG5cdEFwcE1lbnUgPSByZXF1aXJlKCcuL0FwcE1lbnUuanMnKSxcblx0VGhyZWFkTGFiZWwgPSByZXF1aXJlKCcuL1RocmVhZExhYmVsLmpzJyksXG5cblx0QmluZCA9IHJlcXVpcmUoJy4uL2JpbmQuanMnKSxcblxuXHRTdHlsZSA9IHtcblx0XHRib3g6IHtcblx0XHRcdHpJbmRleDogJzAnLFxuXG5cdFx0XHRtYXhXaWR0aDogJzUwcmVtJyxcblxuXHRcdFx0YmFja2dyb3VuZENvbG9yOiAnI2ZmZicsXG5cdFx0XHRjb2xvcjogJyMyMjInLFxuXG5cdFx0XHRtYXJnaW5MZWZ0OiAnYXV0bycsXG5cdFx0XHRtYXJnaW5SaWdodDogJ2F1dG8nLFxuXHRcdFx0cGFkZGluZ1RvcDogJzEuNXJlbScsXG5cblx0XHRcdGRpc3BsYXk6ICdmbGV4Jyxcblx0XHRcdGZsZXhEaXJlY3Rpb246ICdjb2x1bW4nLFxuXHRcdFx0anVzdGlmeUNvbnRlbnQ6ICdzcGFjZS1hcm91bmQnLFxuXHRcdFx0YWxpZ25JdGVtczogJ3N0cmV0Y2gnXG5cdFx0fSxcblx0XHR0b3A6IHtcblx0XHRcdHBhZGRpbmdMZWZ0OiAnMS41cmVtJyxcblx0XHRcdHBhZGRpbmdSaWdodDogJzEuNXJlbScsXG5cblx0XHRcdGRpc3BsYXk6ICdmbGV4Jyxcblx0XHRcdGZsZXhXcmFwOiAnd3JhcCcsXG5cdFx0XHRqdXN0aWZ5Q29udGVudDogJ2ZsZXgtc3RhcnQnXG5cdFx0fSxcblx0XHR0aHJlYWQ6IHtcblx0XHRcdGNvbG9yOiAnI2ZmZicsXG5cdFx0XHRmb250U2l6ZTogJzAuNzVyZW0nLFxuXHRcdFx0aGVpZ2h0OiAnMXJlbScsXG5cblx0XHRcdGJvcmRlclJhZGl1czogJzFyZW0nLFxuXG5cdFx0XHRtYXJnaW5Cb3R0b206ICcwLjVyZW0nLFxuXHRcdFx0bWFyZ2luUmlnaHQ6ICcwLjVyZW0nLFxuXHRcdFx0cGFkZGluZzogJzAuMjVyZW0gMC41cmVtIDAuMnJlbSAwLjVyZW0nXG5cdFx0fSxcblx0XHRzY2VuZUhlYWQ6IHtcblx0XHRcdGNvbG9yOiAnIzIyMicsXG5cdFx0XHRmb250U2l6ZTogJzEuN3JlbScsXG5cblx0XHRcdG1hcmdpbjogJzAuNXJlbSAxLjVyZW0nXG5cdFx0fSxcblx0XHRzY2VuZUJvZHk6IHtcblx0XHRcdGNvbG9yOiAnIzIyMicsXG5cdFx0XHRmb250U2l6ZTogJzEuMXJlbScsXG5cdFx0XHRtYXJnaW46ICcwLjVyZW0gMS41cmVtJ1xuXHRcdH0sXG5cdFx0c3RhdHM6IHtcblx0XHRcdGJhY2tncm91bmRDb2xvcjogJyNmZmYnLFxuXHRcdFx0Y29sb3I6ICcjNTU1Jyxcblx0XHRcdGZvbnRTaXplOiAnMXJlbScsXG5cblx0XHRcdG1hcmdpbjogJzAnLFxuXHRcdFx0cGFkZGluZzogJzAuNzVyZW0gMS41cmVtIDAuNzVyZW0gMS41cmVtJyxcblxuXHRcdFx0ZGlzcGxheTogJ2ZsZXgnLFxuXHRcdFx0ZmxleERpcmVjdGlvbjogJ3JvdycsXG5cdFx0XHRqdXN0aWZ5Q29udGVudDogJ3NwYWNlLWFyb3VuZCdcblx0XHR9LFxuXHRcdHdjOiB7XG5cdFx0XHR0ZXh0QWxpZ246ICdyaWdodCcsXG5cblx0XHRcdGRpc3BsYXk6ICdpbmxpbmUtYmxvY2snLFxuXHRcdFx0ZmxvYXQ6ICdyaWdodCdcblx0XHR9LFxuXHRcdHN0YXRTdGlja3k6IHtcblx0XHRcdGJvdHRvbTogJzAnLFxuXHRcdFx0cG9zaXRpb246ICdzdGlja3knXG5cdFx0fSxcblx0XHRzdGF0RnJlZToge1xuXHRcdFx0Ym90dG9tOiAnYXV0bycsXG5cdFx0XHRwb3NpdGlvbjogJ2luaGVyaXQnXG5cdFx0fSxcblx0XHRkb25lQnV0dG9uOiB7XG5cdFx0XHRmb250U2l6ZTogJzFyZW0nLFxuXHRcdFx0Zm9udFdlaWdodDogJ2JvbGQnLFxuXHRcdFx0Ym9yZGVyOiAnbm9uZScsXG5cdFx0XHRvdXRsaW5lOiAnbm9uZScsXG5cdFx0XHRiYWNrZ3JvdW5kQ29sb3I6ICdyZ2JhKDAsMCwwLDApJyxcblx0XHRcdGN1cnNvcjogJ3BvaW50ZXInXG5cdFx0fVxuXHR9LFxuXG5cdHRlc3RXb3JkcyA9IC9bXFx3J+KAmV0rKD8hXFx3Kj4pL2lnbTsgLy8gY2FwdHVyZSB3b3JkcyBhbmQgaWdub3JlIGh0bWwgdGFncyBvciBzcGVjaWFsIGNoYXJzXG5cbmZ1bmN0aW9uIGNvdW50KHRleHQpIHtcblx0dmFyIHdjID0gMDtcblxuXHR0ZXN0V29yZHMubGFzdEluZGV4ID0gMDtcblx0d2hpbGUgKHRlc3RXb3Jkcy50ZXN0KHRleHQpKSB3YysrO1xuXHRyZXR1cm4gd2M7XG59XG5cbmNsYXNzIFNjZW5lV3JpdGVyIGV4dGVuZHMgUmVhY3QuQ29tcG9uZW50IHtcblx0Y29uc3RydWN0b3IocHJvcHMsIGNvbnRleHQpIHtcblx0XHRzdXBlcihwcm9wcywgY29udGV4dCk7XG5cblx0XHR0aGlzLnN0YXRlID0ge1xuXHRcdFx0dGhyZWFkU3R5bGU6IE9iamVjdC5hc3NpZ24oe30sIFN0eWxlLnRocmVhZCwgeyBiYWNrZ3JvdW5kQ29sb3I6IHByb3BzLnRocmVhZC5jb2xvciB9KSxcblx0XHRcdGhlYWQ6IHByb3BzLnNjZW5lLmhlYWQsXG5cdFx0XHRib2R5OiBwcm9wcy5zY2VuZS5ib2R5LFxuXHRcdFx0d2M6IHByb3BzLnNjZW5lLndjLFxuXHRcdFx0cGFnZXM6IDEsXG5cdFx0XHRwYWdlT2Y6IDEsXG5cdFx0XHRzdGF0U3R5bGU6IFN0eWxlLnN0YXRTdGlja3lcblx0XHR9XG5cblx0XHRCaW5kKHRoaXMpO1xuXHR9XG5cblx0cmVuZGVyKHByb3BzLCBzdGF0ZSkge1xuXHRcdHJldHVybiAoXG5cdFx0XHQ8ZGl2XG5cdFx0XHRcdHJlZj17dGhpcy5tb3VudGVkfVxuXHRcdFx0XHRzdHlsZT17T2JqZWN0LmFzc2lnbih7bWFyZ2luVG9wOiBwcm9wcy5tZW51T2Zmc2V0ID09PSAnMHJlbScgPyAnMXJlbScgOiBwcm9wcy5tZW51T2Zmc2V0fSwgU3R5bGUuYm94KX1cblx0XHRcdD5cblx0XHRcdFx0PHNwYW4gc3R5bGU9e1N0eWxlLnRvcH0+XG5cdFx0XHRcdFx0PFRocmVhZExhYmVsXG5cdFx0XHRcdFx0XHRzdHlsZT17c3RhdGUudGhyZWFkU3R5bGV9XG5cdFx0XHRcdFx0XHR2YWx1ZT17cHJvcHMudGhyZWFkLm5hbWV9XG5cdFx0XHRcdFx0XHRvbkNoYW5nZT17KGUpID0+IHRoaXMuY29udGV4dC5kbygnTU9ESUZZX1RIUkVBRF9OQU1FJywge1xuXHRcdFx0XHRcdFx0XHRhdEluZGV4OiBwcm9wcy5zY2VuZS50aHJlYWQsXG5cdFx0XHRcdFx0XHRcdG5ld05hbWU6IGUudGFyZ2V0LnZhbHVlXG5cdFx0XHRcdFx0XHR9KX1cblx0XHRcdFx0XHQvPlxuXHRcdFx0XHRcdHsvKjxzcGFuIHN0eWxlPXtzdGF0ZS50aHJlYWRTdHlsZX0+XG5cdFx0XHRcdFx0XHR7JysnfVxuXHRcdFx0XHRcdDwvc3Bhbj4qL31cblx0XHRcdFx0PC9zcGFuPlxuXHRcdFx0XHQ8RXhwYW5kaW5nVGV4dGFyZWFcblx0XHRcdFx0XHRzdHlsZT17U3R5bGUuc2NlbmVIZWFkfVxuXHRcdFx0XHRcdG1heExlbmd0aD1cIjI1MFwiXG5cdFx0XHRcdFx0aW5wdXQ9eyhlKSA9PiB0aGlzLnNldFN0YXRlKHtoZWFkOiBlLnRhcmdldC52YWx1ZX0pfVxuXHRcdFx0XHRcdGNoYW5nZT17KCkgPT4gdGhpcy5jb250ZXh0LmRvKCdNT0RJRllfTk9URV9IRUFEJywgXG5cdFx0XHRcdFx0XHRPYmplY3QuYXNzaWduKHtuZXdIZWFkOiB0aGlzLnN0YXRlLmhlYWR9LCBwcm9wcy5jb29yZHMpXG5cdFx0XHRcdFx0KX1cblx0XHRcdFx0XHR2YWx1ZT17c3RhdGUuaGVhZH1cblx0XHRcdFx0XHRiYXNlSGVpZ2h0PVwiMS43ZW1cIlxuXHRcdFx0XHRcdHBsYWNlaG9sZGVyPVwiVGl0bGUvU3VtbWFyeVwiXG5cdFx0XHRcdC8+XG5cdFx0XHRcdDxFeHBhbmRpbmdUZXh0YXJlYVxuXHRcdFx0XHRcdHJlZj17dGhpcy5ib2R5TW91bnRlZH1cblx0XHRcdFx0XHRzdHlsZT17U3R5bGUuc2NlbmVCb2R5fVxuXHRcdFx0XHRcdGlucHV0PXt0aGlzLm9uQm9keX1cblx0XHRcdFx0XHRjaGFuZ2U9eygpID0+IHRoaXMuY29udGV4dC5kbygnTU9ESUZZX05PVEVfQk9EWScsIFxuXHRcdFx0XHRcdFx0T2JqZWN0LmFzc2lnbih7bmV3Qm9keTogc3RhdGUuYm9keSwgd2M6IHN0YXRlLndjfSwgcHJvcHMuY29vcmRzKVxuXHRcdFx0XHRcdCl9XG5cdFx0XHRcdFx0dmFsdWU9e3N0YXRlLmJvZHl9XG5cdFx0XHRcdFx0YmFzZUhlaWdodD1cIjEuMWVtXCJcblx0XHRcdFx0XHRwbGFjZWhvbGRlcj1cIkJvZHlcIlxuXHRcdFx0XHQvPlxuXHRcdFx0XHQ8c3BhbiBzdHlsZT17T2JqZWN0LmFzc2lnbih7fSwgU3R5bGUuc3RhdHMsIHN0YXRlLnN0YXRTdHlsZSl9PlxuXHRcdFx0XHRcdDxzcGFuIHN0eWxlPXtTdHlsZS53Y30+XG5cdFx0XHRcdFx0XHR7c3RhdGUud2MgKyAnIHdvcmRzJ31cblx0XHRcdFx0XHQ8L3NwYW4+XG5cdFx0XHRcdFx0PHNwYW4+XG5cdFx0XHRcdFx0XHR7c3RhdGUucGFnZU9mICsgJy8nICsgc3RhdGUucGFnZXN9XG5cdFx0XHRcdFx0PC9zcGFuPlxuXHRcdFx0XHRcdDxidXR0b25cblx0XHRcdFx0XHRcdHN0eWxlPXtTdHlsZS5kb25lQnV0dG9ufVxuXHRcdFx0XHRcdFx0b25DbGljaz17cHJvcHMub25Eb25lfVxuXHRcdFx0XHRcdD5kb25lPC9idXR0b24+XG5cdFx0XHRcdDwvc3Bhbj5cblx0XHRcdDwvZGl2PlxuXHRcdClcblx0fVxuXG5cdGNvbXBvbmVudERpZE1vdW50KCkge1xuXHRcdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdzY3JvbGwnLCB0aGlzLm9uU2Nyb2xsKTtcblx0XHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncmVzaXplJywgdGhpcy5vblJlc2l6ZSk7XG5cblx0XHR3aW5kb3cuc2Nyb2xsVG8oMCwgMCk7XG5cdH1cblxuXHRjb21wb25lbnRXaWxsVW5tb3VudCgpIHtcblx0XHR3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcignc2Nyb2xsJywgdGhpcy5vblNjcm9sbCk7XG5cdFx0d2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIHRoaXMub25SZXNpemUpO1xuXHR9XG5cblx0b25Cb2R5KGV2ZW50KSB7XG5cdFx0dGhpcy5zZXRTdGF0ZSh7XG5cdFx0XHRib2R5OiBldmVudC50YXJnZXQudmFsdWUsXG5cdFx0XHR3YzogY291bnQoZXZlbnQudGFyZ2V0LnZhbHVlKSxcblx0XHRcdHBhZ2VzOiBNYXRoLnJvdW5kKHRoaXMuc3RhdGUud2MgLyAyNzUpIHx8IDFcblx0XHR9KTtcblx0XHR0aGlzLm9uU2Nyb2xsKCk7XG5cdH1cblxuXHRtb3VudGVkKGVsZW1lbnQpIHtcblx0XHR0aGlzLmVsID0gZWxlbWVudDtcblx0fVxuXG5cdGJvZHlNb3VudGVkKGVsZW1lbnQpIHtcblx0XHR0aGlzLmJvZHkgPSBlbGVtZW50O1xuXHR9XG5cblx0b25TY3JvbGwoZXZlbnQpIHtcblx0XHR0aGlzLnBhZ2VDb3VudCgpO1xuXHRcdHRoaXMuc3RpY2t5U3RhdHMoKTtcblx0fVxuXG5cdHBhZ2VDb3VudCgpIHtcblx0XHR2YXIgdDtcblx0XHRpZiAodGhpcy5ib2R5LmNsaWVudEhlaWdodCA+IHdpbmRvdy5pbm5lckhlaWdodCkge1xuXHRcdFx0dCA9IE1hdGguYWJzKHRoaXMuYm9keS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS50b3ApO1xuXHRcdFx0dCA9ICh0IC8gdGhpcy5ib2R5LmNsaWVudEhlaWdodCkgKiAodGhpcy5zdGF0ZS5wYWdlcyArIDEpO1xuXHRcdFx0dCA9IE1hdGguY2VpbCh0KTtcblx0XHRcdGlmICh0ID4gdGhpcy5zdGF0ZS5wYWdlcykgdCA9IHRoaXMuc3RhdGUucGFnZXM7XG5cdFx0fSBlbHNlIHQgPSAxO1xuXHRcdHRoaXMuc2V0U3RhdGUoeyBwYWdlT2Y6IHQgfSk7XG5cdH1cblxuXHRzdGlja3lTdGF0cygpIHtcblx0XHRpZiAodGhpcy5lbC5jbGllbnRIZWlnaHQgPiAod2luZG93LmlubmVySGVpZ2h0IC0gNDApKSB7XG5cdFx0XHR0aGlzLnNldFN0YXRlKHsgc3RhdFN0eWxlOiBTdHlsZS5zdGF0U3RpY2t5IH0pXG5cdFx0fSBlbHNlIHtcblx0XHRcdHRoaXMuc2V0U3RhdGUoeyBzdGF0U3R5bGU6IFN0eWxlLnN0YXRGcmVlIH0pXG5cdFx0fVxuXHR9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gU2NlbmVXcml0ZXI7IiwiY29uc3Rcblx0UmVhY3QgPSByZXF1aXJlKCdwcmVhY3QnKSxcblxuXHREZWxldGVCdXR0b24gPSByZXF1aXJlKCcuL0RlbGV0ZUJ1dHRvbi5qcycpLFxuXG5cdEJpbmQgPSByZXF1aXJlKCcuLi9iaW5kLmpzJyksXG5cblx0U3R5bGUgPSB7XG5cdFx0c2xpY2VIZWFkZXI6IHtcblx0XHRcdHpJbmRleDogJzExJyxcblx0XHRcdGhlaWdodDogJzEuNXJlbScsXG5cdFx0XHRjb2xvcjogJyNmZmYnLFxuXHRcdFx0bWF4V2lkdGg6ICcxNHJlbScsXG5cdFx0XHRiYWNrZ3JvdW5kQ29sb3I6ICcjNzc3Nzc3Jyxcblx0XHRcdG91dGxpbmU6ICdub25lJyxcblx0XHRcdGZvbnRTaXplOiAnMC45cmVtJyxcblx0XHRcdG1hcmdpbjogJzAgYXV0bycsXG5cdFx0XHRib3JkZXI6ICdub25lJyxcblx0XHRcdHRleHRBbGlnbjogJ2NlbnRlcicsXG5cdFx0XHRwYWRkaW5nOiAnMC4yNXJlbSdcblx0XHR9LFxuXHRcdHNsaWNlOiB7XG5cdFx0XHRwb3NpdGlvbjogJ3JlbGF0aXZlJyxcblx0XHRcdGRpc3BsYXk6ICdpbmxpbmUtZmxleCcsXG5cdFx0XHRqdXN0aWZ5Q29udGVudDogJ2NlbnRlcicsXG5cdFx0XHRhbGlnbkl0ZW1zOiAnY2VudGVyJyxcblx0XHRcdHdpZHRoOiAnMTRyZW0nLFxuXHRcdFx0aGVpZ2h0OiAnMTAwJSdcblx0XHR9LFxuXHRcdGRlbGV0ZUJ1dHRvbjoge1xuXHRcdFx0ekluZGV4OiAyNSxcblx0XHRcdGZvbnRTaXplOiAnMC45cmVtJyxcblx0XHRcdHBvc2l0aW9uOiAnYWJzb2x1dGUnLFxuXHRcdFx0Ym90dG9tOiAnLTEuMnJlbScsXG5cdFx0XHRyaWdodDogJy0xLjJyZW0nLFxuXHRcdFx0Y3Vyc29yOiAncG9pbnRlcidcblx0XHR9XG5cdH07XG5cbmZ1bmN0aW9uIE1lYXN1cmVUZXh0KHRleHQpIHtcblx0cmV0dXJuIHRleHQubGVuZ3RoID8gKHRleHQubGVuZ3RoICogMS4xKSA6IDU7XG59XG5cbmNsYXNzIFNsaWNlSGVhZGVyIGV4dGVuZHMgUmVhY3QuQ29tcG9uZW50IHtcblx0Y29uc3RydWN0b3IocHJvcHMsIGNvbnRleHQpIHtcblx0XHRzdXBlcihwcm9wcywgY29udGV4dCk7XG5cdFx0dGhpcy5zdGF0ZSA9IHtcblx0XHRcdHZhbHVlOiBwcm9wcy52YWx1ZSxcblx0XHRcdHNlbGVjdGVkOiBmYWxzZVxuXHRcdH07XG5cblx0XHRCaW5kKHRoaXMpO1xuXHR9XG5cblx0Y29tcG9uZW50V2lsbFJlY2VpdmVQcm9wcyhwcm9wcykge1xuXHRcdHRoaXMuc2V0U3RhdGUoe3ZhbHVlOiBwcm9wcy52YWx1ZSwgc2VsZWN0ZWQ6IGZhbHNlfSk7XG5cdH1cblxuXHRyZW5kZXIocHJvcHMsIHN0YXRlKSB7XG5cdFx0cmV0dXJuIChcblx0XHRcdDxkaXYgc3R5bGU9e1N0eWxlLnNsaWNlfT5cblx0XHRcdFx0PGRpdiBzdHlsZT17e3Bvc2l0aW9uOiAncmVsYXRpdmUnfX0+XG5cdFx0XHRcdFx0PGlucHV0XG5cdFx0XHRcdFx0XHR0eXBlPVwidGV4dFwiXG5cdFx0XHRcdFx0XHRzdHlsZT17U3R5bGUuc2xpY2VIZWFkZXJ9XG5cdFx0XHRcdFx0XHRtYXhMZW5ndGg9XCIyNFwiXG5cdFx0XHRcdFx0XHRzaXplPXtNZWFzdXJlVGV4dChzdGF0ZS52YWx1ZSl9XG5cdFx0XHRcdFx0XHR2YWx1ZT17c3RhdGUudmFsdWV9XG5cdFx0XHRcdFx0XHRwbGFjZWhvbGRlcj1cInRpbWVcIlxuXHRcdFx0XHRcdFx0b25Gb2N1cz17KCkgPT4gdGhpcy5zZXRTdGF0ZSh7IHNlbGVjdGVkOiB0cnVlIH0pfVxuXHRcdFx0XHRcdFx0b25CbHVyPXt0aGlzLm9uQmx1cn1cblx0XHRcdFx0XHRcdG9uSW5wdXQ9eyhldmVudCkgPT4gdGhpcy5zZXRTdGF0ZSh7dmFsdWU6IGV2ZW50LnRhcmdldC52YWx1ZX0pfVxuXHRcdFx0XHRcdFx0b25DaGFuZ2U9e3RoaXMub25DaGFuZ2V9XG5cdFx0XHRcdFx0Lz5cblx0XHRcdFx0XHR7c3RhdGUuc2VsZWN0ZWQgP1xuXHRcdFx0XHRcdFx0PERlbGV0ZUJ1dHRvblxuXHRcdFx0XHRcdFx0XHRyZWY9eyhjKSA9PiB0aGlzLmRlbEJ0biA9IGN9XG5cdFx0XHRcdFx0XHRcdHN0eWxlPXtTdHlsZS5kZWxldGVCdXR0b259XG5cdFx0XHRcdFx0XHRcdG9uSG9sZD17KCkgPT4gdGhpcy5jb250ZXh0LmRvKCdERUxFVEVfU0xJQ0UnLCB7IGF0SW5kZXg6IHByb3BzLmlkIH0pfVxuXHRcdFx0XHRcdFx0Lz5cblx0XHRcdFx0XHQ6XG5cdFx0XHRcdFx0XHQnJ1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0PC9kaXY+XG5cdFx0XHQ8L2Rpdj5cblx0XHQpXG5cdH1cblxuXHRvbkNoYW5nZShldmVudCkge1xuXHRcdHRoaXMuY29udGV4dC5kbygnTU9ESUZZX1NMSUNFX0RBVEUnLCB7XG5cdFx0XHRhdEluZGV4OiB0aGlzLnByb3BzLmlkLFxuXHRcdFx0bmV3RGF0ZTogZXZlbnQudGFyZ2V0LnZhbHVlXG5cdFx0fSk7XG5cdH1cblxuXHRvbkJsdXIoZSkge1xuXHRcdHNldFRpbWVvdXQoKCkgPT4ge1xuXHRcdFx0aWYgKCF0aGlzLmRlbEJ0bi50aW1lcikgdGhpcy5zZXRTdGF0ZSh7c2VsZWN0ZWQ6IGZhbHNlfSk7XG5cdFx0fSwgMTAwKTtcblx0fVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFNsaWNlSGVhZGVyOyIsImNvbnN0XG5cdFJlYWN0ID0gcmVxdWlyZSgncHJlYWN0JyksXG5cblx0U2NlbmVFZGl0b3IgPSByZXF1aXJlKCcuL1NjZW5lRWRpdG9yLmpzJyksXG5cblx0U3R5bGUgPSB7XG5cdFx0c2xpY2U6IHtcblx0XHRcdHpJbmRleDogOSxcblx0XHRcdGRpc3BsYXk6ICdmbGV4Jyxcblx0XHRcdGZsZXhEaXJlY3Rpb246ICdjb2x1bW4nLFxuXHRcdFx0anVzdGlmeUNvbnRlbnQ6ICdmbGV4LXN0YXJ0Jyxcblx0XHRcdGFsaWduSXRlbXM6ICdjZW50ZXInLFxuXHRcdFx0bWFyZ2luOiAnMCAycmVtJyxcblx0XHRcdHdpZHRoOiAnMTRyZW0nXG5cdFx0fSxcblxuXHRcdHNwYWNlOiB7XG5cdFx0XHRoZWlnaHQ6ICcxNHJlbScsXG5cdFx0XHR3aWR0aDogJzE0cmVtJyxcblx0XHRcdGRpc3BsYXk6ICdmbGV4Jyxcblx0XHRcdGp1c3RpZnlDb250ZW50OiAnY2VudGVyJyxcblx0XHRcdGFsaWduSXRlbXM6ICdmbGV4LWVuZCdcblx0XHR9LFxuXG5cdFx0YnV0dG9uOiB7XG5cdFx0XHRmb250U2l6ZTogJzAuOXJlbScsXG5cdFx0XHRjb2xvcjogJyNmZmYnLFxuXHRcdFx0Ym9yZGVyOiAnbm9uZScsXG5cdFx0XHRvdXRsaW5lOiAnbm9uZScsXG5cdFx0XHRjdXJzb3I6ICdwb2ludGVyJyxcblx0XHRcdHdpZHRoOiAnMS4zcmVtJyxcblx0XHRcdGhlaWdodDogJzEuMnJlbScsXG5cdFx0XHRiYWNrZ3JvdW5kQ29sb3I6ICdyZ2JhKDAsMCwwLDApJyxcblx0XHRcdHRleHRBbGlnbjogJ2NlbnRlcicsXG5cdFx0XHRtYXJnaW46ICcwIDFyZW0gMC40cmVtIDFyZW0nLFxuXHRcdFx0Ym9yZGVyUmFkaXVzOiAnMXJlbSdcblx0XHR9XG5cdH07XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24ocHJvcHMsIHN0YXRlKSB7XG5cdFxuXHRyZXR1cm4gKFxuXHRcdDxkaXYgc3R5bGU9e1N0eWxlLnNsaWNlfT5cblx0XHRcdHtwcm9wcy5zbGljZS5zY2VuZXMubWFwKChzY2VuZSwgaSkgPT4ge1xuXHRcdFx0XHRpZiAoc2NlbmUpIHJldHVybiAoXG5cdFx0XHRcdFx0PGRpdiBzdHlsZT17U3R5bGUuc3BhY2V9PlxuXHRcdFx0XHRcdFx0PFNjZW5lRWRpdG9yXG5cdFx0XHRcdFx0XHRcdHNsaWNlSW5kZXg9e3Byb3BzLmlkfVxuXHRcdFx0XHRcdFx0XHRzZWxlY3RlZD17KHByb3BzLnNlbGVjdGlvbiAmJiBwcm9wcy5zZWxlY3Rpb24uc2NlbmVJbmRleCA9PT0gaSl9XG5cdFx0XHRcdFx0XHRcdHNjZW5lSW5kZXg9e2l9XG5cdFx0XHRcdFx0XHRcdHNjZW5lPXtzY2VuZX1cblx0XHRcdFx0XHRcdFx0dGhyZWFkPXtwcm9wcy50aHJlYWRzW3NjZW5lLnRocmVhZF19XG5cdFx0XHRcdFx0XHRcdG9uU2VsZWN0PXtwcm9wcy5vblNlbGVjdH1cblx0XHRcdFx0XHRcdFx0b25EZXNlbGVjdD17cHJvcHMub25EZXNlbGVjdH1cblx0XHRcdFx0XHRcdFx0b25FZGl0PXtwcm9wcy5lZGl0Tm90ZX1cblx0XHRcdFx0XHRcdFx0bW92ZU5vdGU9e3Byb3BzLm1vdmVOb3RlfVxuXHRcdFx0XHRcdFx0XHRvbkRyYWc9e3Byb3BzLm9uRHJhZ31cblx0XHRcdFx0XHRcdC8+XG5cdFx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcdCk7XG5cdFx0XHRcdGVsc2UgcmV0dXJuIChcblx0XHRcdFx0XHQ8ZGl2XG5cdFx0XHRcdFx0XHRzdHlsZT17U3R5bGUuc3BhY2V9XG5cdFx0XHRcdFx0XHRvbkRyYWdPdmVyPXsoZSkgPT4gZS5wcmV2ZW50RGVmYXVsdCgpfVxuXHRcdFx0XHRcdFx0b25Ecm9wPXsoKSA9PiBwcm9wcy5vbkRyb3AoeyBzbGljZUluZGV4OiBwcm9wcy5pZCwgc2NlbmVJbmRleDogaSB9KX1cblx0XHRcdFx0XHQ+XG5cdFx0XHRcdFx0XHQ8YnV0dG9uXG5cdFx0XHRcdFx0XHRcdHN0eWxlPXtTdHlsZS5idXR0b259XG5cdFx0XHRcdFx0XHRcdG9uY2xpY2s9eygpID0+IHRoaXMuY29udGV4dC5kbygnTkVXX05PVEUnLCB7XG5cdFx0XHRcdFx0XHRcdFx0c2xpY2VJbmRleDogcHJvcHMuaWQsXG5cdFx0XHRcdFx0XHRcdFx0c2NlbmVJbmRleDogaVxuXHRcdFx0XHRcdFx0XHR9KX1cblx0XHRcdFx0XHRcdD4rPC9idXR0b24+XG5cdFx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcdCk7XG5cdFx0XHR9KX1cblx0XHQ8L2Rpdj5cblx0KVxufVxuIiwiY29uc3Rcblx0UmVhY3QgPSByZXF1aXJlKCdwcmVhY3QnKSxcblxuXHRTdHlsZSA9IHtcblx0XHRlZGl0b3I6IHtcblx0XHRcdGZvbnRTaXplOiAnMC45cmVtJyxcblx0XHRcdHBhZGRpbmc6ICcwLjVyZW0nLFxuXHRcdFx0aGVpZ2h0OiAnMXJlbScsXG5cdFx0XHRib3JkZXI6ICdub25lJyxcblx0XHRcdG91dGxpbmU6ICdub25lJyxcblx0XHRcdGJhY2tncm91bmQ6ICdyZ2JhKDAsMCwwLDApJyxcblx0XHRcdGNvbG9yOiAnI2ZmZidcblx0XHR9XG5cdH07XG5cbmZ1bmN0aW9uIE1lYXN1cmVUZXh0KHRleHQpIHtcblx0cmV0dXJuIHRleHQubGVuZ3RoID8gKHRleHQubGVuZ3RoICogMS4xKSA6IDU7XG59XG5cbmNsYXNzIFRocmVhZExhYmVsIGV4dGVuZHMgUmVhY3QuQ29tcG9uZW50IHtcblx0Y29uc3RydWN0b3IocHJvcHMsIGNvbnRleHQpIHtcblx0XHRzdXBlcihwcm9wcywgY29udGV4dCk7XG5cblx0XHR0aGlzLnN0YXRlID0ge1xuXHRcdFx0dmFsdWU6IHByb3BzLnZhbHVlXG5cdFx0fVxuXHR9XG5cblx0Y29tcG9uZW50V2lsbFJlY2VpdmVQcm9wcyhwcm9wcykge1xuXHRcdHRoaXMuc2V0U3RhdGUoe3ZhbHVlOiBwcm9wcy52YWx1ZX0pO1xuXHR9XG5cblx0cmVuZGVyKHByb3BzLCBzdGF0ZSwgY29udGV4dCkge1xuXHRcdHJldHVybiAoXG5cdFx0XHQ8aW5wdXRcblx0XHRcdFx0dHlwZT1cInRleHRcIlxuXHRcdFx0XHRzdHlsZT17cHJvcHMuc3R5bGUgPyBPYmplY3QuYXNzaWduKHt9LCBTdHlsZS5lZGl0b3IsIHByb3BzLnN0eWxlKSA6IFN0eWxlLmVkaXRvcn1cblx0XHRcdFx0bWF4TGVuZ3RoPVwiNTBcIlxuXHRcdFx0XHRzaXplPXsyMH1cblx0XHRcdFx0dmFsdWU9e3N0YXRlLnZhbHVlfVxuXHRcdFx0XHRwbGFjZWhvbGRlcj1cInRocmVhZFwiXG5cdFx0XHRcdG9uSW5wdXQ9eyhldmVudCkgPT4gdGhpcy5zZXRTdGF0ZSh7dmFsdWU6IGV2ZW50LnRhcmdldC52YWx1ZX0pfVxuXHRcdFx0XHRvbkNoYW5nZT17cHJvcHMub25DaGFuZ2V9XG5cdFx0XHQvPlxuXHRcdCk7XG5cdH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBUaHJlYWRMYWJlbDsiLCJjb25zdFxuXHRSZWFjdCA9IHJlcXVpcmUoJ3ByZWFjdCcpLFxuXG5cdFN0eWxlID0ge1xuXHRcdG91dGVyOiB7XG5cdFx0XHR6SW5kZXg6ICctNScsXG5cdFx0XHRwb3NpdGlvbjogJ2Fic29sdXRlJyxcblx0XHRcdGxlZnQ6ICc3cmVtJyxcblx0XHRcdHRvcDogJzIuNXJlbScsXG5cdFx0XHRtaW5XaWR0aDogJzEwMHZ3Jyxcblx0XHRcdG1pbkhlaWdodDogJzEwMHZoJ1xuXHRcdH0sXG5cdFx0aW5uZXI6IHtcblx0XHRcdHBvc2l0aW9uOiAnYWJzb2x1dGUnLFxuXHRcdFx0dG9wOiAnMnJlbScsXG5cdFx0XHRsZWZ0OiAwLFxuXHRcdFx0d2lkdGg6ICcxMDAlJyxcblx0XHRcdGhlaWdodDogJzEwMCUnXG5cdFx0fSxcblx0XHRsb2NhdGlvbjoge1xuXHRcdFx0bWFyZ2luOiAnMTJyZW0gMCcsXG5cdFx0XHRoZWlnaHQ6ICcycmVtJyxcblx0XHRcdGJhY2tncm91bmRDb2xvcjogJyM0NDQ0NDQnXG5cdFx0fSxcblx0XHRzbGljZToge1xuXHRcdFx0ZGlzcGxheTogJ2lubGluZS1ibG9jaycsXG5cdFx0XHRtYXJnaW46ICcwIDguOTM3NXJlbScsXG5cdFx0XHR3aWR0aDogJzAuMTI1cmVtJyxcblx0XHRcdGhlaWdodDogJzEwMCUnLFxuXHRcdFx0YmFja2dyb3VuZENvbG9yOiAnIzQ0NDQ0NCdcblx0XHR9XG5cdH07XG5cblxuY2xhc3MgV2VhdmVCYWNrZ3JvdW5kIGV4dGVuZHMgUmVhY3QuQ29tcG9uZW50IHtcblx0Y29uc3RydWN0b3IocHJvcHMsIGNvbnRleHQpIHtcblx0XHRzdXBlcihwcm9wcywgY29udGV4dCk7XG5cdH1cblxuXHRzaG91bGRDb21wb25lbnRVcGRhdGUocHJvcHMsIHN0YXRlLCBjb250ZXh0KSB7XG5cdFx0cmV0dXJuICgocHJvcHMubWVudU9mZnNldCAhPT0gdGhpcy5wcm9wcy5tZW51T2Zmc2V0KSB8fFxuXHRcdFx0XHQocHJvcHMubG9jYXRpb25zICE9PSB0aGlzLnByb3BzLmxvY2F0aW9ucykgfHxcblx0XHRcdFx0KHByb3BzLnNsaWNlcyAhPT0gdGhpcy5wcm9wcy5zbGljZXMpKTtcblx0fVxuXG5cdHJlbmRlcihwcm9wcywgc3RhdGUpIHtcblx0XHRyZXR1cm4gKFxuXHRcdFx0PGRpdlxuXHRcdFx0XHRkYXRhLWlzPVwiV2VhdmVCYWNrZ3JvdW5kXCJcblx0XHRcdFx0c3R5bGU9e09iamVjdC5hc3NpZ24oe30sIFN0eWxlLm91dGVyLCB7XG5cdFx0XHRcdFx0dG9wOiBwcm9wcy5tZW51T2Zmc2V0LFxuXHRcdFx0XHRcdHdpZHRoOiAocHJvcHMuc2xpY2VzICogMTggKyAyKSArICdyZW0nLFxuXHRcdFx0XHRcdGhlaWdodDogKHByb3BzLmxvY2F0aW9ucyAqIDE0ICsgMTYpICsgJ3JlbSdcblx0XHRcdFx0fSl9XG5cdFx0XHQ+XG5cdFx0XHRcdDxkaXYgc3R5bGU9e1N0eWxlLmlubmVyfT5cblx0XHRcdFx0XHR7QXJyYXkocHJvcHMubG9jYXRpb25zKS5maWxsKDApLm1hcCgodiwgaSkgPT4gPGRpdiBzdHlsZT17U3R5bGUubG9jYXRpb259PiZuYnNwOzwvZGl2Pil9XG5cdFx0XHRcdDwvZGl2PlxuXHRcdFx0XHQ8ZGl2IHN0eWxlPXtTdHlsZS5pbm5lcn0+XG5cdFx0XHRcdFx0e0FycmF5KHByb3BzLnNsaWNlcykuZmlsbCgwKS5tYXAoKHYsIGkpID0+IDxkaXYgc3R5bGU9e1N0eWxlLnNsaWNlfT4mbmJzcDs8L2Rpdj4pfVxuXHRcdFx0XHQ8L2Rpdj5cblx0XHRcdDwvZGl2PlxuXHRcdClcblx0fVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFdlYXZlQmFja2dyb3VuZDsiLCJjb25zdFxuXHRSZWFjdCA9IHJlcXVpcmUoJ3ByZWFjdCcpLFxuXG5cdExvY2F0aW9uSGVhZGVyID0gcmVxdWlyZSgnLi9Mb2NhdGlvbkhlYWRlci5qcycpLFxuXHRTbGljZUhlYWRlciA9IHJlcXVpcmUoJy4vU2xpY2VIZWFkZXIuanMnKSxcblxuXHRCaW5kID0gcmVxdWlyZSgnLi4vYmluZC5qcycpLFxuXG5cdFN0eWxlID0ge1xuXHRcdG91dGVyOiB7XG5cdFx0XHRwb3NpdGlvbjogJ2Fic29sdXRlJyxcblx0XHRcdGxlZnQ6IDAsXG5cdFx0XHRtaW5XaWR0aDogJzEwMHZ3Jyxcblx0XHRcdG1pbkhlaWdodDogJzEwMHZoJ1xuXHRcdH0sXG5cdFx0bG9jYXRpb25zOiB7XG5cdFx0XHRwb3NpdGlvbjogJ2Fic29sdXRlJyxcblx0XHRcdHRvcDogJzAuMjVyZW0nLFxuXHRcdFx0d2lkdGg6ICc3cmVtJyxcblx0XHRcdG1pbkhlaWdodDogJzEwMHZoJyxcblx0XHRcdHBhZGRpbmdUb3A6ICcycmVtJ1xuXHRcdH0sXG5cdFx0bG9jYXRpb246IHtcblx0XHRcdGRpc3BsYXk6ICdmbGV4Jyxcblx0XHRcdGZsZXhEaXJlY3Rpb246ICdjb2x1bW4nLFxuXHRcdFx0anVzdGlmeUNvbnRlbnQ6ICdmbGV4LWVuZCcsXG5cdFx0XHRwb3NpdGlvbjogJ3JlbGF0aXZlJyxcblx0XHRcdGhlaWdodDogJzE0cmVtJyxcblx0XHR9LFxuXHRcdHNjZW5lczoge1xuXHRcdFx0ekluZGV4OiAnMTEnLFxuXHRcdFx0cG9zaXRpb246ICdhYnNvbHV0ZScsXG5cdFx0XHRiYWNrZ3JvdW5kQ29sb3I6IFwiIzExMVwiLFxuXHRcdFx0bGVmdDogMCxcblx0XHRcdGhlaWdodDogJzJyZW0nLFxuXHRcdFx0cGFkZGluZ0xlZnQ6ICc3cmVtJyxcblx0XHRcdG1pbldpZHRoOiAnMTAwdncnXG5cdFx0fSxcblx0XHRzbGljZUJ1dHRvbjoge1xuXHRcdFx0bWFyZ2luOiAnMCAxLjM3NXJlbScsXG5cdFx0XHRmb250U2l6ZTogJzAuOXJlbScsXG5cdFx0XHRjb2xvcjogJyNmZmYnLFxuXHRcdFx0Ym9yZGVyOiAnbm9uZScsXG5cdFx0XHRvdXRsaW5lOiAnbm9uZScsXG5cdFx0XHRjdXJzb3I6ICdwb2ludGVyJyxcblx0XHRcdHdpZHRoOiAnMS4yNXJlbScsXG5cdFx0XHRoZWlnaHQ6ICcxLjI1cmVtJyxcblx0XHRcdHRleHRBbGlnbjogJ2NlbnRlcicsXG5cdFx0XHRib3JkZXJSYWRpdXM6ICcxcmVtJyxcblx0XHRcdGJhY2tncm91bmRDb2xvcjogJ3JnYmEoMCwwLDAsMCknXG5cdFx0fSxcblx0XHRmaXJzdFNsaWNlQnV0dG9uOiB7XG5cdFx0XHRtYXJnaW46ICcwIDAuMzc1cmVtJyxcblx0XHRcdGZvbnRTaXplOiAnMC45cmVtJyxcblx0XHRcdGNvbG9yOiAnI2ZmZicsXG5cdFx0XHRib3JkZXI6ICdub25lJyxcblx0XHRcdG91dGxpbmU6ICdub25lJyxcblx0XHRcdGN1cnNvcjogJ3BvaW50ZXInLFxuXHRcdFx0d2lkdGg6ICcxLjI1cmVtJyxcblx0XHRcdGhlaWdodDogJzEuMjVyZW0nLFxuXHRcdFx0dGV4dEFsaWduOiAnY2VudGVyJyxcblx0XHRcdGJvcmRlclJhZGl1czogJzFyZW0nLFxuXHRcdFx0YmFja2dyb3VuZENvbG9yOiAncmdiYSgwLDAsMCwwKSdcblx0XHR9LFxuXHRcdHRocmVhZEJ0bjoge1xuXHRcdFx0aGVpZ2h0OiAnMnJlbScsXG5cdFx0XHRmb250U2l6ZTogJzAuOXJlbScsXG5cdFx0XHRjb2xvcjogJyNmZmYnLFxuXHRcdFx0Ym9yZGVyOiAnbm9uZScsXG5cdFx0XHRvdXRsaW5lOiAnbm9uZScsXG5cdFx0XHRjdXJzb3I6ICdwb2ludGVyJyxcblx0XHRcdHRleHRBbGlnbjogJ2NlbnRlcicsXG5cdFx0XHRwYWRkaW5nOiAnMC41cmVtIDAuNXJlbScsXG5cdFx0XHRiYWNrZ3JvdW5kQ29sb3I6ICdyZ2JhKDAsMCwwLDApJyxcblx0XHRcdHdpZHRoOiAnMTAwJSdcblx0XHR9XG5cdH07XG5cblxuY2xhc3MgV2VhdmVIZWFkZXJzIGV4dGVuZHMgUmVhY3QuQ29tcG9uZW50IHtcblx0Y29uc3RydWN0b3IocHJvcHMsIGNvbnRleHQpIHtcblx0XHRzdXBlcihwcm9wcywgY29udGV4dCk7XG5cblx0XHR0aGlzLnN0YXRlID0ge1xuXHRcdFx0eDogMCxcblx0XHRcdHk6IDBcblx0XHR9XG5cblx0XHRCaW5kKHRoaXMpO1xuXHR9XG5cblx0Y29tcG9uZW50RGlkTW91bnQoKSB7XG5cdFx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Njcm9sbCcsIHRoaXMub25TY3JvbGwpO1xuXHR9XG5cblx0Y29tcG9uZW50V2lsbFVubW91bnQoKSB7XG5cdFx0d2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3Njcm9sbCcsIHRoaXMub25TY3JvbGwpO1xuXHR9XG5cblx0c2hvdWxkQ29tcG9uZW50VXBkYXRlKHByb3BzLCBzdGF0ZSkge1xuXHRcdHJldHVybiAoKHByb3BzLndpbmRvd1dpZHRoICE9PSB0aGlzLnByb3BzLndpbmRvd1dpZHRoKSB8fFxuXHRcdFx0XHQocHJvcHMubG9jYXRpb25zICE9PSB0aGlzLnByb3BzLmxvY2F0aW9ucykgfHxcblx0XHRcdFx0KHByb3BzLnNsaWNlcyAhPT0gdGhpcy5wcm9wcy5zbGljZXMpIHx8XG5cdFx0XHRcdChzdGF0ZSAhPT0gdGhpcy5zdGF0ZSkpXG5cdH1cblxuXHRyZW5kZXIocHJvcHMsIHN0YXRlKSB7XG5cdFx0cmV0dXJuIChcblx0XHRcdDxkaXZcblx0XHRcdFx0ZGF0YS1pcz1cIldlYXZlSGVhZGVyc1wiXG5cdFx0XHRcdHN0eWxlPXtPYmplY3QuYXNzaWduKHt9LCBTdHlsZS5vdXRlciwgc3RhdGUuc3R5bGUpfVxuXHRcdFx0PlxuXHRcdFx0XHQ8ZGl2XG5cdFx0XHRcdFx0ZGF0YS1pcz1cIlNsaWNlSGVhZGVyc1wiXG5cdFx0XHRcdFx0c3R5bGU9e09iamVjdC5hc3NpZ24oe30sIFN0eWxlLnNjZW5lcywgeyB0b3A6IHN0YXRlLnksIHdpZHRoOiAoKHByb3BzLnNsaWNlcy5sZW5ndGgqMTggKyAyKSArICdyZW0nKSAgfSl9XG5cdFx0XHRcdD5cblx0XHRcdFx0XHR7W1xuXHRcdFx0XHRcdFx0PGJ1dHRvblxuXHRcdFx0XHRcdFx0XHRvbmNsaWNrPXsoZXZlbnQpID0+IHRoaXMuY29udGV4dC5kbygnTkVXX1NMSUNFJywge2F0SW5kZXg6IDB9KX1cblx0XHRcdFx0XHRcdFx0c3R5bGU9e1N0eWxlLmZpcnN0U2xpY2VCdXR0b259XG5cdFx0XHRcdFx0XHRcdG9ubW91c2VlbnRlcj17ZSA9PiBlLnRhcmdldC5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSAncmdiYSgyNTUsMjU1LDI1NSwwLjIpJ31cblx0XHRcdFx0XHRcdFx0b25tb3VzZWxlYXZlPXtlID0+IGUudGFyZ2V0LnN0eWxlLmJhY2tncm91bmRDb2xvciA9ICdyZ2JhKDAsMCwwLDApJ31cblx0XHRcdFx0XHRcdD4rPC9idXR0b24+XG5cdFx0XHRcdFx0XS5jb25jYXQocHJvcHMuc2xpY2VzLm1hcCgoc2xpY2UsIGkpID0+IFxuXHRcdFx0XHRcdFx0PGRpdiBzdHlsZT17e2Rpc3BsYXk6ICdpbmxpbmUnLCB3aWR0aDogJzE4cmVtJ319PlxuXHRcdFx0XHRcdFx0XHQ8U2xpY2VIZWFkZXJcblx0XHRcdFx0XHRcdFx0XHRpZD17aX1cblx0XHRcdFx0XHRcdFx0XHR2YWx1ZT17c2xpY2UuZGF0ZXRpbWV9XG5cdFx0XHRcdFx0XHRcdC8+XG5cdFx0XHRcdFx0XHRcdDxidXR0b25cblx0XHRcdFx0XHRcdFx0XHRvbmNsaWNrPXsoZXZlbnQpID0+IHRoaXMuY29udGV4dC5kbygnTkVXX1NMSUNFJywge2F0SW5kZXg6IGkrMX0pfVxuXHRcdFx0XHRcdFx0XHRcdHN0eWxlPXtTdHlsZS5zbGljZUJ1dHRvbn1cblx0XHRcdFx0XHRcdFx0XHRvbm1vdXNlZW50ZXI9e2UgPT4gZS50YXJnZXQuc3R5bGUuYmFja2dyb3VuZENvbG9yID0gJ3JnYmEoMjU1LDI1NSwyNTUsMC4yKSd9XG5cdFx0XHRcdFx0XHRcdFx0b25tb3VzZWxlYXZlPXtlID0+IGUudGFyZ2V0LnN0eWxlLmJhY2tncm91bmRDb2xvciA9ICdyZ2JhKDAsMCwwLDApJ31cblx0XHRcdFx0XHRcdFx0Pis8L2J1dHRvbj5cblx0XHRcdFx0XHRcdDwvZGl2PlxuXHRcdFx0XHRcdCkpfVxuXHRcdFx0XHQ8L2Rpdj5cblx0XHRcdFx0PGRpdiBcblx0XHRcdFx0XHRkYXRhLWlzPVwiTG9jYXRpb25IZWFkZXJzXCJcblx0XHRcdFx0XHRzdHlsZT17T2JqZWN0LmFzc2lnbih7fSwgU3R5bGUubG9jYXRpb25zLCB7XG5cdFx0XHRcdFx0XHRsZWZ0OiBzdGF0ZS54LFxuXHRcdFx0XHRcdFx0aGVpZ2h0OiAoKHByb3BzLmxvY2F0aW9ucy5sZW5ndGgqMTQgKyAxNikgKyAncmVtJyksXG5cdFx0XHRcdFx0XHRiYWNrZ3JvdW5kQ29sb3I6IChwcm9wcy53aW5kb3dXaWR0aCA8IDcwMCkgPyAncmdiYSgwLDAsMCwwKScgOiAnIzExMScsXG5cdFx0XHRcdFx0XHR6SW5kZXg6IChwcm9wcy53aW5kb3dXaWR0aCA8IDcwMCkgPyA4IDogMTAgfSl9XG5cdFx0XHRcdD5cblx0XHRcdFx0XHR7KChwcm9wcy5sb2NhdGlvbnMubWFwKChsb2NhdGlvbiwgaSkgPT5cblx0XHRcdFx0XHRcdDxMb2NhdGlvbkhlYWRlclxuXHRcdFx0XHRcdFx0XHRpZD17aX1cblx0XHRcdFx0XHRcdFx0dmFsdWU9e2xvY2F0aW9ufVxuXHRcdFx0XHRcdFx0XHRvbkRyYWc9eyhpZCkgPT4gdGhpcy5kcmFnZ2luZyA9IGlkfVxuXHRcdFx0XHRcdFx0XHRvbkRyb3A9e3RoaXMub25Mb2NhdGlvbkRyb3B9XG5cdFx0XHRcdFx0XHQvPlxuXHRcdFx0XHRcdCkpLmNvbmNhdChcblx0XHRcdFx0XHRcdFs8ZGl2IHN0eWxlPXtTdHlsZS5sb2NhdGlvbn0+XG5cdFx0XHRcdFx0XHRcdDxidXR0b25cblx0XHRcdFx0XHRcdFx0XHRvbmNsaWNrPXsoZXZlbnQpID0+IHRoaXMuY29udGV4dC5kbygnTkVXX0xPQ0FUSU9OJyl9XG5cdFx0XHRcdFx0XHRcdFx0c3R5bGU9e1N0eWxlLnRocmVhZEJ0bn1cblx0XHRcdFx0XHRcdFx0XHRvbm1vdXNlZW50ZXI9e2UgPT4gZS50YXJnZXQuc3R5bGUuYmFja2dyb3VuZENvbG9yID0gJ3JnYmEoMjU1LDI1NSwyNTUsMC4yKSd9XG5cdFx0XHRcdFx0XHRcdFx0b25tb3VzZWxlYXZlPXtlID0+IGUudGFyZ2V0LnN0eWxlLmJhY2tncm91bmRDb2xvciA9ICdyZ2JhKDAsMCwwLDApJ31cblx0XHRcdFx0XHRcdFx0Pis8L2J1dHRvbj5cblx0XHRcdFx0XHRcdDwvZGl2Pl1cblx0XHRcdFx0XHQpKX1cblx0XHRcdFx0PC9kaXY+XG5cdFx0XHQ8L2Rpdj5cblx0XHQpXG5cdH1cblxuXHRvblNjcm9sbCgpIHtcblx0XHR0aGlzLnNldFN0YXRlKHtcblx0XHRcdHg6IGRvY3VtZW50LmJvZHkuc2Nyb2xsTGVmdCxcblx0XHRcdHk6IGRvY3VtZW50LmJvZHkuc2Nyb2xsVG9wXG5cdFx0fSk7XG5cdH1cblxuXHRvbkxvY2F0aW9uRHJvcCh0b0luZGV4KSB7XG5cdFx0dGhpcy5jb250ZXh0LmRvKCdNT1ZFX0xPQ0FUSU9OJywge1xuXHRcdFx0ZnJvbUluZGV4OiB0aGlzLmRyYWdnaW5nLFxuXHRcdFx0dG9JbmRleDogdG9JbmRleFxuXHRcdH0pO1xuXHR9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gV2VhdmVIZWFkZXJzOyIsImNvbnN0XG5cdFJlYWN0ID0gcmVxdWlyZSgncHJlYWN0JyksXG5cblx0QmluZCA9IHJlcXVpcmUoJy4uL2JpbmQuanMnKSxcblxuXHRTbGljZVZpZXcgPSByZXF1aXJlKCcuL1NsaWNlVmlldy5qcycpLFxuXHRXZWF2ZUhlYWRlcnMgPSByZXF1aXJlKCcuL1dlYXZlSGVhZGVycy5qcycpLFxuXHRXZWF2ZUJhY2tncm91bmQgPSByZXF1aXJlKCcuL1dlYXZlQmFja2dyb3VuZC5qcycpLFxuXHRQcm9qZWN0TW9kYWwgPSByZXF1aXJlKCcuL1Byb2plY3RNb2RhbC5qcycpLFxuXG5cdFN0eWxlID0ge1xuXHRcdHdlYXZlOiB7XG5cdFx0XHRtYXJnaW5MZWZ0OiAnN3JlbScsXG5cdFx0XHRkaXNwbGF5OiAnaW5saW5lLWZsZXgnXG5cdFx0fSxcblx0XHRzY2VuZXM6IHtcblx0XHRcdG1hcmdpblRvcDogJzJyZW0nLFxuXHRcdFx0ZGlzcGxheTogJ2ZsZXgnLFxuXHRcdFx0anVzdGlmeUNvbnRlbnQ6ICdmbGV4LXN0YXJ0Jyxcblx0XHRcdGFsaWduSXRlbXM6ICdmbGV4LXN0YXJ0J1xuXHRcdH0sXG5cdFx0cHJvamVjdEJ1dHRvbjoge1xuXHRcdFx0ekluZGV4OiAyMixcblx0XHRcdG1pbkhlaWdodDogJzIuNXJlbScsXG5cdFx0XHRwYWRkaW5nOiAnMC41cmVtIDAuNzVyZW0nLFxuXHRcdFx0d2lkdGg6ICc3cmVtJyxcblx0XHRcdHBvc2l0aW9uOiAnZml4ZWQnLFxuXHRcdFx0bGVmdDogMCxcblxuXHRcdFx0b3V0bGluZTogJ25vbmUnLFxuXHRcdFx0YmFja2dyb3VuZENvbG9yOiAnIzAwMDAwMCcsXG5cblx0XHRcdGJvcmRlcjogJ25vbmUnLFxuXHRcdFx0Ym9yZGVyQm90dG9tOiAndGhpbiBzb2xpZCAjNzc3JyxcblxuXHRcdFx0Y29sb3I6ICcjZmZmJyxcblx0XHRcdGZvbnRTaXplOiAnMS4ycmVtJyxcblxuXHRcdFx0Y3Vyc29yOiAncG9pbnRlcidcblx0XHR9XG5cdH07XG4gXG5jbGFzcyBXZWF2ZVZpZXcgZXh0ZW5kcyBSZWFjdC5Db21wb25lbnQge1xuXHRjb25zdHJ1Y3Rvcihwcm9wcywgY29udGV4dCkge1xuXHRcdHN1cGVyKHByb3BzLCBjb250ZXh0KTtcblxuXHRcdHRoaXMuc3RhdGUgPSB7XG5cdFx0XHRzZWxlY3Rpb246IG51bGwsXG5cdFx0XHRwcm9qZWN0TW9kYWw6IGZhbHNlXG5cdFx0fVxuXG5cdFx0dGhpcy5hbGxvd0Rlc2VsZWN0ID0gdHJ1ZTtcblxuXHRcdEJpbmQodGhpcyk7XG5cdH1cblxuXHRyZW5kZXIocHJvcHMsIHN0YXRlKSB7XG5cdFx0cmV0dXJuIChcblx0XHRcdDxkaXZcblx0XHRcdFx0ZGF0YS1pcz1cIldlYXZlVmlld1wiXG5cdFx0XHRcdHN0eWxlPXtTdHlsZS53ZWF2ZX1cblx0XHRcdFx0b25jbGljaz17dGhpcy5vbkRlc2VsZWN0fVxuXHRcdFx0PlxuXHRcdFx0XHQ8V2VhdmVIZWFkZXJzXG5cdFx0XHRcdFx0c2xpY2VzPXtwcm9wcy5zbGljZXN9XG5cdFx0XHRcdFx0bG9jYXRpb25zPXtwcm9wcy5sb2NhdGlvbnN9XG5cdFx0XHRcdFx0d2luZG93V2lkdGg9e3Byb3BzLndpbmRvd1dpZHRofVxuXHRcdFx0XHQvPlxuXHRcdFx0XHQ8V2VhdmVCYWNrZ3JvdW5kXG5cdFx0XHRcdFx0c2xpY2VzPXtwcm9wcy5zbGljZXMubGVuZ3RofVxuXHRcdFx0XHRcdGxvY2F0aW9ucz17cHJvcHMubG9jYXRpb25zLmxlbmd0aH1cblx0XHRcdFx0Lz5cblx0XHRcdFx0PGRpdiBkYXRhLWlzPVwiV2VhdmVcIiBzdHlsZT17U3R5bGUuc2NlbmVzfT5cblx0XHRcdFx0XHR7cHJvcHMuc2xpY2VzLm1hcCgoc2xpY2UsIGkpID0+XG5cdFx0XHRcdFx0XHQ8U2xpY2VWaWV3XG5cdFx0XHRcdFx0XHRcdGlkPXtpfVxuXHRcdFx0XHRcdFx0XHRzZWxlY3Rpb249eyhzdGF0ZS5zZWxlY3Rpb24gJiYgc3RhdGUuc2VsZWN0aW9uLnNsaWNlSW5kZXggPT09IGkpID8gc3RhdGUuc2VsZWN0aW9uIDogbnVsbH1cblx0XHRcdFx0XHRcdFx0c2xpY2U9e3NsaWNlfVxuXHRcdFx0XHRcdFx0XHR0aHJlYWRzPXtwcm9wcy50aHJlYWRzfVxuXHRcdFx0XHRcdFx0XHRvblNlbGVjdD17dGhpcy5vblNlbGVjdH1cblx0XHRcdFx0XHRcdFx0b25EZXNlbGVjdD17dGhpcy5vbkRlc2VsZWN0fVxuXHRcdFx0XHRcdFx0XHRlZGl0Tm90ZT17cHJvcHMuZWRpdE5vdGV9XG5cdFx0XHRcdFx0XHRcdG9uRHJhZz17dGhpcy5vbk5vdGVEcmFnfVxuXHRcdFx0XHRcdFx0XHRvbkRyb3A9e3RoaXMub25Ob3RlRHJvcH1cblx0XHRcdFx0XHRcdC8+XG5cdFx0XHRcdFx0KX1cblx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcdHsoIXN0YXRlLnByb2plY3RNb2RhbCA/XG5cdFx0XHRcdFx0PGJ1dHRvblxuXHRcdFx0XHRcdFx0c3R5bGU9e1N0eWxlLnByb2plY3RCdXR0b259XG5cdFx0XHRcdFx0XHRvbkNsaWNrPXsoKSA9PiB0aGlzLnNldFN0YXRlKHsgcHJvamVjdE1vZGFsOiB0cnVlIH0pfVxuXHRcdFx0XHRcdD5cblx0XHRcdFx0XHRcdHtwcm9wcy50aXRsZX1cblx0XHRcdFx0XHQ8L2J1dHRvbj5cblx0XHRcdFx0OlxuXHRcdFx0XHRcdDxQcm9qZWN0TW9kYWxcblx0XHRcdFx0XHRcdHRpdGxlPXtwcm9wcy50aXRsZX1cblx0XHRcdFx0XHRcdGF1dGhvcj17cHJvcHMuYXV0aG9yfVxuXHRcdFx0XHRcdFx0ZnVuY3Rpb25zPXtwcm9wcy5wcm9qZWN0RnVuY3N9XG5cdFx0XHRcdFx0XHRvbkRvbmU9eygpID0+IHRoaXMuc2V0U3RhdGUoeyBwcm9qZWN0TW9kYWw6IGZhbHNlIH0pfVxuXHRcdFx0XHRcdC8+XG5cdFx0XHRcdCl9XG5cdFx0XHQ8L2Rpdj5cblx0XHQpXG5cdH1cblxuXHRvblNlbGVjdChjb29yZHMsIGkpIHtcblx0XHR0aGlzLnNldFN0YXRlKHtzZWxlY3Rpb246IGNvb3Jkc30pO1xuXHR9XG5cblx0b25EZXNlbGVjdChldmVudCkge1xuXHRcdHRoaXMuc2NlbmVEZXNlbGVjdGVkKCk7XG5cdH1cblxuXHRzY2VuZURlc2VsZWN0ZWQoKSB7XG5cdFx0aWYgKHRoaXMuYWxsb3dEZXNlbGVjdCkge1xuXHRcdFx0dGhpcy5zZXRTdGF0ZSh7c2VsZWN0aW9uOiBudWxsfSk7XG5cdFx0fVxuXHR9XG5cblx0b25Ob3RlRHJhZyhjb29yZHMpIHtcblx0XHR0aGlzLmRyYWdnaW5nID0gY29vcmRzO1xuXHR9XG5cblx0b25Ob3RlRHJvcChjb29yZHMpIHtcblx0XHRpZiAodGhpcy5kcmFnZ2luZykgdGhpcy5jb250ZXh0LmRvKCdNT1ZFX05PVEUnLCB7XG5cdFx0XHRmcm9tOiB0aGlzLmRyYWdnaW5nLFxuXHRcdFx0dG86IGNvb3Jkc1xuXHRcdH0pO1xuXHR9XG5cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBXZWF2ZVZpZXc7IiwiLy8gT2JqZWN0LmFzc2lnbiBQT0xZRklMTFxuLy8gc291cmNlOiBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9HbG9iYWxfT2JqZWN0cy9PYmplY3QvYXNzaWduI1BvbHlmaWxsXG4vL1xuaWYgKHR5cGVvZiBPYmplY3QuYXNzaWduICE9ICdmdW5jdGlvbicpIHtcblx0T2JqZWN0LmFzc2lnbiA9IGZ1bmN0aW9uKHRhcmdldCwgdmFyQXJncykgeyAvLyAubGVuZ3RoIG9mIGZ1bmN0aW9uIGlzIDJcblx0XHQndXNlIHN0cmljdCc7XG5cdFx0aWYgKHRhcmdldCA9PSBudWxsKSB7IC8vIFR5cGVFcnJvciBpZiB1bmRlZmluZWQgb3IgbnVsbFxuXHRcdFx0dGhyb3cgbmV3IFR5cGVFcnJvcignQ2Fubm90IGNvbnZlcnQgdW5kZWZpbmVkIG9yIG51bGwgdG8gb2JqZWN0Jyk7XG5cdFx0fVxuXG5cdFx0dmFyIHRvID0gT2JqZWN0KHRhcmdldCk7XG5cblx0XHRmb3IgKHZhciBpbmRleCA9IDE7IGluZGV4IDwgYXJndW1lbnRzLmxlbmd0aDsgaW5kZXgrKykge1xuXHRcdFx0dmFyIG5leHRTb3VyY2UgPSBhcmd1bWVudHNbaW5kZXhdO1xuXG5cdFx0XHRpZiAobmV4dFNvdXJjZSAhPSBudWxsKSB7IC8vIFNraXAgb3ZlciBpZiB1bmRlZmluZWQgb3IgbnVsbFxuXHRcdFx0XHRmb3IgKHZhciBuZXh0S2V5IGluIG5leHRTb3VyY2UpIHtcblx0XHRcdFx0XHQvLyBBdm9pZCBidWdzIHdoZW4gaGFzT3duUHJvcGVydHkgaXMgc2hhZG93ZWRcblx0XHRcdFx0XHRpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG5leHRTb3VyY2UsIG5leHRLZXkpKSB7XG5cdFx0XHRcdFx0XHR0b1tuZXh0S2V5XSA9IG5leHRTb3VyY2VbbmV4dEtleV07XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiB0bztcblx0fTtcbn0iXX0=
