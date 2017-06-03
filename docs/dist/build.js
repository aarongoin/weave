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
};

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
			threads: [{ color: '#00cc66', name: 'Barry Allen' }],
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
					threads: [{ name: '', color: '#f60' }],
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

},{"./Sourcery.js":5,"./actions.js":6,"./bind.js":7,"./components/AppMenu.js":8,"./components/FileOpener.js":10,"./components/NoteEditor.js":12,"./components/WeaveView.js":18,"./polyfills.js":19,"file-saver":1,"lz-string":2,"preact":3}],5:[function(require,module,exports){
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
		store.thread.push({
			color: '#ffffff',
			name: 'Thread'
		});
		return store;
	},
	DELETE_THREAD: function DELETE_THREAD(action, store) {
		store.splice(action.atIndex, 1);
		return store;
	},
	MODIFY_THREAD_COLOR: function MODIFY_THREAD_COLOR(action, store) {
		store.thread[action.atIndex].color = action.newColor;
		return store;
	}
};

},{}],7:[function(require,module,exports){
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

},{}],8:[function(require,module,exports){
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

},{"preact":3}],9:[function(require,module,exports){
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

},{"preact":3}],10:[function(require,module,exports){
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

},{"../bind.js":7,"./ExpandingTextarea.js":9,"preact":3}],12:[function(require,module,exports){
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
			}, React.createElement('span', { style: Style.top }, React.createElement('span', { style: state.threadStyle }, props.thread.name), React.createElement('span', { style: state.threadStyle }, '+')), React.createElement(ExpandingTextarea, {
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

},{"../bind.js":7,"./AppMenu.js":8,"./ExpandingTextarea.js":9,"preact":3}],13:[function(require,module,exports){
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
		padding: '0.5rem 0.75rem 0.5rem 0.75rem',
		fontSize: '0.9rem'
	},

	wordcount: {
		fontSize: '0.9rem'
	},

	textarea: {
		fontSize: '1.1rem',
		margin: '0.75rem'
	},

	button: {
		fontSize: '0.9rem',
		color: '#fff',
		backgroundColor: 'rgba(0,0,0,0)',
		border: 'none',
		outline: 'none',
		cursor: 'pointer'
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
			}, React.createElement('button', {
				onclick: function onclick() {
					return props.onEdit({ sliceIndex: props.sliceIndex, noteIndex: props.noteIndex });
				},
				style: Style.button
			}, 'edit'), React.createElement('span', { style: Style.wordcount }, props.note.wc, ' words')));
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

},{"../bind.js":7,"./ExpandingTextarea.js":9,"preact":3}],14:[function(require,module,exports){
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

},{"../bind.js":7,"./NoteView.js":13,"preact":3}],15:[function(require,module,exports){
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
			onEdit: props.editNote
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

},{"./NoteView.js":13,"preact":3}],16:[function(require,module,exports){
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

},{"./LocationHeader.js":11,"./SliceHeader.js":14,"preact":3}],18:[function(require,module,exports){
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
					editNote: props.editNote
				});
			})));
		}
	}, {
		key: 'activeNoteMenu',
		value: function activeNoteMenu() {
			var _this3 = this;

			this.context.useMenu(undefined, [[AppMenu.btn('move', function () {
				_this3.allowDeselect = false;
				console.log("TODO!");
			})], [AppMenu.btn('edit', function () {
				_this3.allowDeselect = false;
				_this3.props.editNote(_this3.selection[0]);
			})], [AppMenu.deleteBtn(function () {
				_this3.context.do('DELETE_NOTE', _this3.selection[0]);
				_this3.allowDeselect = true;
				_this3.noteDeselected();
			})]]);
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

},{"../bind.js":7,"./AppMenu.js":8,"./SliceView.js":15,"./WeaveBackground.js":16,"./WeaveHeaders.js":17,"preact":3}],19:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvZmlsZS1zYXZlci9GaWxlU2F2ZXIuanMiLCJub2RlX21vZHVsZXMvbHotc3RyaW5nL2xpYnMvbHotc3RyaW5nLmpzIiwibm9kZV9tb2R1bGVzL3ByZWFjdC9kaXN0L3ByZWFjdC5qcyIsInNyYy9BcHAuanMiLCJzcmMvU291cmNlcnkuanMiLCJzcmMvYWN0aW9ucy5qcyIsInNyYy9iaW5kLmpzIiwic3JjL2NvbXBvbmVudHMvQXBwTWVudS5qcyIsInNyYy9jb21wb25lbnRzL0V4cGFuZGluZ1RleHRhcmVhLmpzIiwic3JjL2NvbXBvbmVudHMvRmlsZU9wZW5lci5qcyIsInNyYy9jb21wb25lbnRzL0xvY2F0aW9uSGVhZGVyLmpzIiwic3JjL2NvbXBvbmVudHMvTm90ZUVkaXRvci5qcyIsInNyYy9jb21wb25lbnRzL05vdGVWaWV3LmpzIiwic3JjL2NvbXBvbmVudHMvU2xpY2VIZWFkZXIuanMiLCJzcmMvY29tcG9uZW50cy9TbGljZVZpZXcuanMiLCJzcmMvY29tcG9uZW50cy9XZWF2ZUJhY2tncm91bmQuanMiLCJzcmMvY29tcG9uZW50cy9XZWF2ZUhlYWRlcnMuanMiLCJzcmMvY29tcG9uZW50cy9XZWF2ZVZpZXcuanMiLCJzcmMvcG9seWZpbGxzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FDL1lBLFFBQUEsQUFBUTtBQUNSLElBQ0MsUUFBUSxRQURULEFBQ1MsQUFBUTtJQUNoQixZQUFZLFFBRmIsQUFFYSxBQUFRO0lBQ3BCLGFBQWEsUUFIZCxBQUdjLEFBQVE7SUFFckIsVUFBVSxRQUxYLEFBS1csQUFBUTtJQUNsQixZQUFZLFFBTmIsQUFNYSxBQUFRO0lBQ3BCLGFBQWEsUUFQ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O09BQUssSUFBSSxRQUFULEFBQWlCLEdBQUcsUUFBUSxVQUE1QixBQUFzQyxRQUF0QyxBQUE4QyxTQUFTLEFBQ3REO09BQUksYUFBYSxVQUFqQixBQUFpQixBQUFVLEFBRTNCOztPQUFJLGNBQUosQUFBa0IsTUFBTSxBQUFFO0FBQ3pCO1NBQUssSUFBTCxBQUFTLFdBQVQsQUFBb0IsWUFBWSxBQUMvQjtBQUNBO1NBQUksT0FBQSxBQUFPLFVBQVAsQUFBaUIsZUFBakIsQUFBZ0MsS0FBaEMsQUFBcUMsWUFBekMsQUFBSSxBQUFpRCxVQUFVLEFBQzlEO1NBQUEsQUFBRyxXQUFXLFdBQWQsQUFBYyxBQUFXLEFBQ3pCO0FBQ0Q7QUFDRDtBQUNEO0FBQ0Q7U0FBQSxBQUFPLEFBQ1A7QUFyQkQsQUFzQkEiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLyogRmlsZVNhdmVyLmpzXG4gKiBBIHNhdmVBcygpIEZpbGVTYXZlciBpbXBsZW1lbnRhdGlvbi5cbiAqIDEuMy4yXG4gKiAyMDE2LTA2LTE2IDE4OjI1OjE5XG4gKlxuICogQnkgRWxpIEdyZXksIGh0dHA6Ly9lbGlncmV5LmNvbVxuICogTGljZW5zZTogTUlUXG4gKiAgIFNlZSBodHRwczovL2dpdGh1Yi5jb20vZWxpZ3JleS9GaWxlU2F2ZXIuanMvYmxvYi9tYXN0ZXIvTElDRU5TRS5tZFxuICovXG5cbi8qZ2xvYmFsIHNlbGYgKi9cbi8qanNsaW50IGJpdHdpc2U6IHRydWUsIGluZGVudDogNCwgbGF4YnJlYWs6IHRydWUsIGxheGNvbW1hOiB0cnVlLCBzbWFydHRhYnM6IHRydWUsIHBsdXNwbHVzOiB0cnVlICovXG5cbi8qISBAc291cmNlIGh0dHA6Ly9wdXJsLmVsaWdyZXkuY29tL2dpdGh1Yi9GaWxlU2F2ZXIuanMvYmxvYi9tYXN0ZXIvRmlsZVNhdmVyLmpzICovXG5cbnZhciBzYXZlQXMgPSBzYXZlQXMgfHwgKGZ1bmN0aW9uKHZpZXcpIHtcblx0XCJ1c2Ugc3RyaWN0XCI7XG5cdC8vIElFIDwxMCBpcyBleHBsaWNpdGx5IHVuc3VwcG9ydGVkXG5cdGlmICh0eXBlb2YgdmlldyA9PT0gXCJ1bmRlZmluZWRcIiB8fCB0eXBlb2YgbmF2aWdhdG9yICE9PSBcInVuZGVmaW5lZFwiICYmIC9NU0lFIFsxLTldXFwuLy50ZXN0KG5hdmlnYXRvci51c2VyQWdlbnQpKSB7XG5cdFx0cmV0dXJuO1xuXHR9XG5cdHZhclxuXHRcdCAgZG9jID0gdmlldy5kb2N1bWVudFxuXHRcdCAgLy8gb25seSBnZXQgVVJMIHdoZW4gbmVjZXNzYXJ5IGluIGNhc2UgQmxvYi5qcyBoYXNuJ3Qgb3ZlcnJpZGRlbiBpdCB5ZXRcblx0XHQsIGdldF9VUkwgPSBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiB2aWV3LlVSTCB8fCB2aWV3LndlYmtpdFVSTCB8fCB2aWV3O1xuXHRcdH1cblx0XHQsIHNhdmVfbGluayA9IGRvYy5jcmVhdGVFbGVtZW50TlMoXCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hodG1sXCIsIFwiYVwiKVxuXHRcdCwgY2FuX3VzZV9zYXZlX2xpbmsgPSBcImRvd25sb2FkXCIgaW4gc2F2ZV9saW5rXG5cdFx0LCBjbGljayA9IGZ1bmN0aW9uKG5vZGUpIHtcblx0XHRcdHZhciBldmVudCA9IG5ldyBNb3VzZUV2ZW50KFwiY2xpY2tcIik7XG5cdFx0XHRub2RlLmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuXHRcdH1cblx0XHQsIGlzX3NhZmFyaSA9IC9jb25zdHJ1Y3Rvci9pLnRlc3Qodmlldy5IVE1MRWxlbWVudCkgfHwgdmlldy5zYWZhcmlcblx0XHQsIGlzX2Nocm9tZV9pb3MgPS9DcmlPU1xcL1tcXGRdKy8udGVzdChuYXZpZ2F0b3IudXNlckFnZW50KVxuXHRcdCwgdGhyb3dfb3V0c2lkZSA9IGZ1bmN0aW9uKGV4KSB7XG5cdFx0XHQodmlldy5zZXRJbW1lZGlhdGUgfHwgdmlldy5zZXRUaW1lb3V0KShmdW5jdGlvbigpIHtcblx0XHRcdFx0dGhyb3cgZXg7XG5cdFx0XHR9LCAwKTtcblx0XHR9XG5cdFx0LCBmb3JjZV9zYXZlYWJsZV90eXBlID0gXCJhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW1cIlxuXHRcdC8vIHRoZSBCbG9iIEFQSSBpcyBmdW5kYW1lbnRhbGx5IGJyb2tlbiBhcyB0aGVyZSBpcyBubyBcImRvd25sb2FkZmluaXNoZWRcIiBldmVudCB0byBzdWJzY3JpYmUgdG9cblx0XHQsIGFyYml0cmFyeV9yZXZva2VfdGltZW91dCA9IDEwMDAgKiA0MCAvLyBpbiBtc1xuXHRcdCwgcmV2b2tlID0gZnVuY3Rpb24oZmlsZSkge1xuXHRcdFx0dmFyIHJldm9rZXIgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0aWYgKHR5cGVvZiBmaWxlID09PSBcInN0cmluZ1wiKSB7IC8vIGZpbGUgaXMgYW4gb2JqZWN0IFVSTFxuXHRcdFx0XHRcdGdldF9VUkwoKS5yZXZva2VPYmplY3RVUkwoZmlsZSk7XG5cdFx0XHRcdH0gZWxzZSB7IC8vIGZpbGUgaXMgYSBGaWxlXG5cdFx0XHRcdFx0ZmlsZS5yZW1vdmUoKTtcblx0XHRcdFx0fVxuXHRcdFx0fTtcblx0XHRcdHNldFRpbWVvdXQocmV2b2tlciwgYXJiaXRyYXJ5X3Jldm9rZV90aW1lb3V0KTtcblx0XHR9XG5cdFx0LCBkaXNwYXRjaCA9IGZ1bmN0aW9uKGZpbGVzYXZlciwgZXZlbnRfdHlwZXMsIGV2ZW50KSB7XG5cdFx0XHRldmVudF90eXBlcyA9IFtdLmNvbmNhdChldmVudF90eXBlcyk7XG5cdFx0XHR2YXIgaSA9IGV2ZW50X3R5cGVzLmxlbmd0aDtcblx0XHRcdHdoaWxlIChpLS0pIHtcblx0XHRcdFx0dmFyIGxpc3RlbmVyID0gZmlsZXNhdmVyW1wib25cIiArIGV2ZW50X3R5cGVzW2ldXTtcblx0XHRcdFx0aWYgKHR5cGVvZiBsaXN0ZW5lciA9PT0gXCJmdW5jdGlvblwiKSB7XG5cdFx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRcdGxpc3RlbmVyLmNhbGwoZmlsZXNhdmVyLCBldmVudCB8fCBmaWxlc2F2ZXIpO1xuXHRcdFx0XHRcdH0gY2F0Y2ggKGV4KSB7XG5cdFx0XHRcdFx0XHR0aHJvd19vdXRzaWRlKGV4KTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdFx0LCBhdXRvX2JvbSA9IGZ1bmN0aW9uKGJsb2IpIHtcblx0XHRcdC8vIHByZXBlbmQgQk9NIGZvciBVVEYtOCBYTUwgYW5kIHRleHQvKiB0eXBlcyAoaW5jbHVkaW5nIEhUTUwpXG5cdFx0XHQvLyBub3RlOiB5b3VyIGJyb3dzZXIgd2lsbCBhdXRvbWF0aWNhbGx5IGNvbnZlcnQgVVRGLTE2IFUrRkVGRiB0byBFRiBCQiBCRlxuXHRcdFx0aWYgKC9eXFxzKig/OnRleHRcXC9cXFMqfGFwcGxpY2F0aW9uXFwveG1sfFxcUypcXC9cXFMqXFwreG1sKVxccyo7LipjaGFyc2V0XFxzKj1cXHMqdXRmLTgvaS50ZXN0KGJsb2IudHlwZSkpIHtcblx0XHRcdFx0cmV0dXJuIG5ldyBCbG9iKFtTdHJpbmcuZnJvbUNoYXJDb2RlKDB4RkVGRiksIGJsb2JdLCB7dHlwZTogYmxvYi50eXBlfSk7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gYmxvYjtcblx0XHR9XG5cdFx0LCBGaWxlU2F2ZXIgPSBmdW5jdGlvbihibG9iLCBuYW1lLCBub19hdXRvX2JvbSkge1xuXHRcdFx0aWYgKCFub19hdXRvX2JvbSkge1xuXHRcdFx0XHRibG9iID0gYXV0b19ib20oYmxvYik7XG5cdFx0XHR9XG5cdFx0XHQvLyBGaXJzdCB0cnkgYS5kb3dubG9hZCwgdGhlbiB3ZWIgZmlsZXN5c3RlbSwgdGhlbiBvYmplY3QgVVJMc1xuXHRcdFx0dmFyXG5cdFx0XHRcdCAgZmlsZXNhdmVyID0gdGhpc1xuXHRcdFx0XHQsIHR5cGUgPSBibG9iLnR5cGVcblx0XHRcdFx0LCBmb3JjZSA9IHR5cGUgPT09IGZvcmNlX3NhdmVhYmxlX3R5cGVcblx0XHRcdFx0LCBvYmplY3RfdXJsXG5cdFx0XHRcdCwgZGlzcGF0Y2hfYWxsID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0ZGlzcGF0Y2goZmlsZXNhdmVyLCBcIndyaXRlc3RhcnQgcHJvZ3Jlc3Mgd3JpdGUgd3JpdGVlbmRcIi5zcGxpdChcIiBcIikpO1xuXHRcdFx0XHR9XG5cdFx0XHRcdC8vIG9uIGFueSBmaWxlc3lzIGVycm9ycyByZXZlcnQgdG8gc2F2aW5nIHdpdGggb2JqZWN0IFVSTHNcblx0XHRcdFx0LCBmc19lcnJvciA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGlmICgoaXNfY2hyb21lX2lvcyB8fCAoZm9yY2UgJiYgaXNfc2FmYXJpKSkgJiYgdmlldy5GaWxlUmVhZGVyKSB7XG5cdFx0XHRcdFx0XHQvLyBTYWZhcmkgZG9lc24ndCBhbGxvdyBkb3dubG9hZGluZyBvZiBibG9iIHVybHNcblx0XHRcdFx0XHRcdHZhciByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpO1xuXHRcdFx0XHRcdFx0cmVhZGVyLm9ubG9hZGVuZCA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0XHR2YXIgdXJsID0gaXNfY2hyb21lX2lvcyA/IHJlYWRlci5yZXN1bHQgOiByZWFkZXIucmVzdWx0LnJlcGxhY2UoL15kYXRhOlteO10qOy8sICdkYXRhOmF0dGFjaG1lbnQvZmlsZTsnKTtcblx0XHRcdFx0XHRcdFx0dmFyIHBvcHVwID0gdmlldy5vcGVuKHVybCwgJ19ibGFuaycpO1xuXHRcdFx0XHRcdFx0XHRpZighcG9wdXApIHZpZXcubG9jYXRpb24uaHJlZiA9IHVybDtcblx0XHRcdFx0XHRcdFx0dXJsPXVuZGVmaW5lZDsgLy8gcmVsZWFzZSByZWZlcmVuY2UgYmVmb3JlIGRpc3BhdGNoaW5nXG5cdFx0XHRcdFx0XHRcdGZpbGVzYXZlci5yZWFkeVN0YXRlID0gZmlsZXNhdmVyLkRPTkU7XG5cdFx0XHRcdFx0XHRcdGRpc3BhdGNoX2FsbCgpO1xuXHRcdFx0XHRcdFx0fTtcblx0XHRcdFx0XHRcdHJlYWRlci5yZWFkQXNEYXRhVVJMKGJsb2IpO1xuXHRcdFx0XHRcdFx0ZmlsZXNhdmVyLnJlYWR5U3RhdGUgPSBmaWxlc2F2ZXIuSU5JVDtcblx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0Ly8gZG9uJ3QgY3JlYXRlIG1vcmUgb2JqZWN0IFVSTHMgdGhhbiBuZWVkZWRcblx0XHRcdFx0XHRpZiAoIW9iamVjdF91cmwpIHtcblx0XHRcdFx0XHRcdG9iamVjdF91cmwgPSBnZXRfVVJMKCkuY3JlYXRlT2JqZWN0VVJMKGJsb2IpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAoZm9yY2UpIHtcblx0XHRcdFx0XHRcdHZpZXcubG9jYXRpb24uaHJlZiA9IG9iamVjdF91cmw7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdHZhciBvcGVuZWQgPSB2aWV3Lm9wZW4ob2JqZWN0X3VybCwgXCJfYmxhbmtcIik7XG5cdFx0XHRcdFx0XHRpZiAoIW9wZW5lZCkge1xuXHRcdFx0XHRcdFx0XHQvLyBBcHBsZSBkb2VzIG5vdCBhbGxvdyB3aW5kb3cub3Blbiwgc2VlIGh0dHBzOi8vZGV2ZWxvcGVyLmFwcGxlLmNvbS9saWJyYXJ5L3NhZmFyaS9kb2N1bWVudGF0aW9uL1Rvb2xzL0NvbmNlcHR1YWwvU2FmYXJpRXh0ZW5zaW9uR3VpZGUvV29ya2luZ3dpdGhXaW5kb3dzYW5kVGFicy9Xb3JraW5nd2l0aFdpbmRvd3NhbmRUYWJzLmh0bWxcblx0XHRcdFx0XHRcdFx0dmlldy5sb2NhdGlvbi5ocmVmID0gb2JqZWN0X3VybDtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0ZmlsZXNhdmVyLnJlYWR5U3RhdGUgPSBmaWxlc2F2ZXIuRE9ORTtcblx0XHRcdFx0XHRkaXNwYXRjaF9hbGwoKTtcblx0XHRcdFx0XHRyZXZva2Uob2JqZWN0X3VybCk7XG5cdFx0XHRcdH1cblx0XHRcdDtcblx0XHRcdGZpbGVzYXZlci5yZWFkeVN0YXRlID0gZmlsZXNhdmVyLklOSVQ7XG5cblx0XHRcdGlmIChjYW5fdXNlX3NhdmVfbGluaykge1xuXHRcdFx0XHRvYmplY3RfdXJsID0gZ2V0X1VSTCgpLmNyZWF0ZU9iamVjdFVSTChibG9iKTtcblx0XHRcdFx0c2V0VGltZW91dChmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRzYXZlX2xpbmsuaHJlZiA9IG9iamVjdF91cmw7XG5cdFx0XHRcdFx0c2F2ZV9saW5rLmRvd25sb2FkID0gbmFtZTtcblx0XHRcdFx0XHRjbGljayhzYXZlX2xpbmspO1xuXHRcdFx0XHRcdGRpc3BhdGNoX2FsbCgpO1xuXHRcdFx0XHRcdHJldm9rZShvYmplY3RfdXJsKTtcblx0XHRcdFx0XHRmaWxlc2F2ZXIucmVhZHlTdGF0ZSA9IGZpbGVzYXZlci5ET05FO1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHRmc19lcnJvcigpO1xuXHRcdH1cblx0XHQsIEZTX3Byb3RvID0gRmlsZVNhdmVyLnByb3RvdHlwZVxuXHRcdCwgc2F2ZUFzID0gZnVuY3Rpb24oYmxvYiwgbmFtZSwgbm9fYXV0b19ib20pIHtcblx0XHRcdHJldHVybiBuZXcgRmlsZVNhdmVyKGJsb2IsIG5hbWUgfHwgYmxvYi5uYW1lIHx8IFwiZG93bmxvYWRcIiwgbm9fYXV0b19ib20pO1xuXHRcdH1cblx0O1xuXHQvLyBJRSAxMCsgKG5hdGl2ZSBzYXZlQXMpXG5cdGlmICh0eXBlb2YgbmF2aWdhdG9yICE9PSBcInVuZGVmaW5lZFwiICYmIG5hdmlnYXRvci5tc1NhdmVPck9wZW5CbG9iKSB7XG5cdFx0cmV0dXJuIGZ1bmN0aW9uKGJsb2IsIG5hbWUsIG5vX2F1dG9fYm9tKSB7XG5cdFx0XHRuYW1lID0gbmFtZSB8fCBibG9iLm5hbWUgfHwgXCJkb3dubG9hZFwiO1xuXG5cdFx0XHRpZiAoIW5vX2F1dG9fYm9tKSB7XG5cdFx0XHRcdGJsb2IgPSBhdXRvX2JvbShibG9iKTtcblx0XHRcdH1cblx0XHRcdHJldHVybiBuYXZpZ2F0b3IubXNTYXZlT3JPcGVuQmxvYihibG9iLCBuYW1lKTtcblx0XHR9O1xuXHR9XG5cblx0RlNfcHJvdG8uYWJvcnQgPSBmdW5jdGlvbigpe307XG5cdEZTX3Byb3RvLnJlYWR5U3RhdGUgPSBGU19wcm90by5JTklUID0gMDtcblx0RlNfcHJvdG8uV1JJVElORyA9IDE7XG5cdEZTX3Byb3RvLkRPTkUgPSAyO1xuXG5cdEZTX3Byb3RvLmVycm9yID1cblx0RlNfcHJvdG8ub253cml0ZXN0YXJ0ID1cblx0RlNfcHJvdG8ub25wcm9ncmVzcyA9XG5cdEZTX3Byb3RvLm9ud3JpdGUgPVxuXHRGU19wcm90by5vbmFib3J0ID1cblx0RlNfcHJvdG8ub25lcnJvciA9XG5cdEZTX3Byb3RvLm9ud3JpdGVlbmQgPVxuXHRcdG51bGw7XG5cblx0cmV0dXJuIHNhdmVBcztcbn0oXG5cdCAgIHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiICYmIHNlbGZcblx0fHwgdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiAmJiB3aW5kb3dcblx0fHwgdGhpcy5jb250ZW50XG4pKTtcbi8vIGBzZWxmYCBpcyB1bmRlZmluZWQgaW4gRmlyZWZveCBmb3IgQW5kcm9pZCBjb250ZW50IHNjcmlwdCBjb250ZXh0XG4vLyB3aGlsZSBgdGhpc2AgaXMgbnNJQ29udGVudEZyYW1lTWVzc2FnZU1hbmFnZXJcbi8vIHdpdGggYW4gYXR0cmlidXRlIGBjb250ZW50YCB0aGF0IGNvcnJlc3BvbmRzIHRvIHRoZSB3aW5kb3dcblxuaWYgKHR5cGVvZiBtb2R1bGUgIT09IFwidW5kZWZpbmVkXCIgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgbW9kdWxlLmV4cG9ydHMuc2F2ZUFzID0gc2F2ZUFzO1xufSBlbHNlIGlmICgodHlwZW9mIGRlZmluZSAhPT0gXCJ1bmRlZmluZWRcIiAmJiBkZWZpbmUgIT09IG51bGwpICYmIChkZWZpbmUuYW1kICE9PSBudWxsKSkge1xuICBkZWZpbmUoXCJGaWxlU2F2ZXIuanNcIiwgZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHNhdmVBcztcbiAgfSk7XG59XG4iLCIvLyBDb3B5cmlnaHQgKGMpIDIwMTMgUGllcm94eSA8cGllcm94eUBwaWVyb3h5Lm5ldD5cbi8vIFRoaXMgd29yayBpcyBmcmVlLiBZb3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5IGl0XG4vLyB1bmRlciB0aGUgdGVybXMgb2YgdGhlIFdURlBMLCBWZXJzaW9uIDJcbi8vIEZvciBtb3JlIGluZm9ybWF0aW9uIHNlZSBMSUNFTlNFLnR4dCBvciBodHRwOi8vd3d3Lnd0ZnBsLm5ldC9cbi8vXG4vLyBGb3IgbW9yZSBpbmZvcm1hdGlvbiwgdGhlIGhvbWUgcGFnZTpcbi8vIGh0dHA6Ly9waWVyb3h5Lm5ldC9ibG9nL3BhZ2VzL2x6LXN0cmluZy90ZXN0aW5nLmh0bWxcbi8vXG4vLyBMWi1iYXNlZCBjb21wcmVzc2lvbiBhbGdvcml0aG0sIHZlcnNpb24gMS40LjRcbnZhciBMWlN0cmluZyA9IChmdW5jdGlvbigpIHtcblxuLy8gcHJpdmF0ZSBwcm9wZXJ0eVxudmFyIGYgPSBTdHJpbmcuZnJvbUNoYXJDb2RlO1xudmFyIGtleVN0ckJhc2U2NCA9IFwiQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0NTY3ODkrLz1cIjtcbnZhciBrZXlTdHJVcmlTYWZlID0gXCJBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6MDEyMzQ1Njc4OSstJFwiO1xudmFyIGJhc2VSZXZlcnNlRGljID0ge307XG5cbmZ1bmN0aW9uIGdldEJhc2VWYWx1ZShhbHBoYWJldCwgY2hhcmFjdGVyKSB7XG4gIGlmICghYmFzZVJldmVyc2VEaWNbYWxwaGFiZXRdKSB7XG4gICAgYmFzZVJldmVyc2VEaWNbYWxwaGFiZXRdID0ge307XG4gICAgZm9yICh2YXIgaT0wIDsgaTxhbHBoYWJldC5sZW5ndGggOyBpKyspIHtcbiAgICAgIGJhc2VSZXZlcnNlRGljW2FscGhhYmV0XVthbHBoYWJldC5jaGFyQXQoaSldID0gaTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGJhc2VSZXZlcnNlRGljW2FscGhhYmV0XVtjaGFyYWN0ZXJdO1xufVxuXG52YXIgTFpTdHJpbmcgPSB7XG4gIGNvbXByZXNzVG9CYXNlNjQgOiBmdW5jdGlvbiAoaW5wdXQpIHtcbiAgICBpZiAoaW5wdXQgPT0gbnVsbCkgcmV0dXJuIFwiXCI7XG4gICAgdmFyIHJlcyA9IExaU3RyaW5nLl9jb21wcmVzcyhpbnB1dCwgNiwgZnVuY3Rpb24oYSl7cmV0dXJuIGtleVN0ckJhc2U2NC5jaGFyQXQoYSk7fSk7XG4gICAgc3dpdGNoIChyZXMubGVuZ3RoICUgNCkgeyAvLyBUbyBwcm9kdWNlIHZhbGlkIEJhc2U2NFxuICAgIGRlZmF1bHQ6IC8vIFdoZW4gY291bGQgdGhpcyBoYXBwZW4gP1xuICAgIGNhc2UgMCA6IHJldHVybiByZXM7XG4gICAgY2FzZSAxIDogcmV0dXJuIHJlcytcIj09PVwiO1xuICAgIGNhc2UgMiA6IHJldHVybiByZXMrXCI9PVwiO1xuICAgIGNhc2UgMyA6IHJldHVybiByZXMrXCI9XCI7XG4gICAgfVxuICB9LFxuXG4gIGRlY29tcHJlc3NGcm9tQmFzZTY0IDogZnVuY3Rpb24gKGlucHV0KSB7XG4gICAgaWYgKGlucHV0ID09IG51bGwpIHJldHVybiBcIlwiO1xuICAgIGlmIChpbnB1dCA9PSBcIlwiKSByZXR1cm4gbnVsbDtcbiAgICByZXR1cm4gTFpTdHJpbmcuX2RlY29tcHJlc3MoaW5wdXQubGVuZ3RoLCAzMiwgZnVuY3Rpb24oaW5kZXgpIHsgcmV0dXJuIGdldEJhc2VWYWx1ZShrZXlTdHJCYXNlNjQsIGlucHV0LmNoYXJBdChpbmRleCkpOyB9KTtcbiAgfSxcblxuICBjb21wcmVzc1RvVVRGMTYgOiBmdW5jdGlvbiAoaW5wdXQpIHtcbiAgICBpZiAoaW5wdXQgPT0gbnVsbCkgcmV0dXJuIFwiXCI7XG4gICAgcmV0dXJuIExaU3RyaW5nLl9jb21wcmVzcyhpbnB1dCwgMTUsIGZ1bmN0aW9uKGEpe3JldHVybiBmKGErMzIpO30pICsgXCIgXCI7XG4gIH0sXG5cbiAgZGVjb21wcmVzc0Zyb21VVEYxNjogZnVuY3Rpb24gKGNvbXByZXNzZWQpIHtcbiAgICBpZiAoY29tcHJlc3NlZCA9PSBudWxsKSByZXR1cm4gXCJcIjtcbiAgICBpZiAoY29tcHJlc3NlZCA9PSBcIlwiKSByZXR1cm4gbnVsbDtcbiAgICByZXR1cm4gTFpTdHJpbmcuX2RlY29tcHJlc3MoY29tcHJlc3NlZC5sZW5ndGgsIDE2Mzg0LCBmdW5jdGlvbihpbmRleCkgeyByZXR1cm4gY29tcHJlc3NlZC5jaGFyQ29kZUF0KGluZGV4KSAtIDMyOyB9KTtcbiAgfSxcblxuICAvL2NvbXByZXNzIGludG8gdWludDhhcnJheSAoVUNTLTIgYmlnIGVuZGlhbiBmb3JtYXQpXG4gIGNvbXByZXNzVG9VaW50OEFycmF5OiBmdW5jdGlvbiAodW5jb21wcmVzc2VkKSB7XG4gICAgdmFyIGNvbXByZXNzZWQgPSBMWlN0cmluZy5jb21wcmVzcyh1bmNvbXByZXNzZWQpO1xuICAgIHZhciBidWY9bmV3IFVpbnQ4QXJyYXkoY29tcHJlc3NlZC5sZW5ndGgqMik7IC8vIDIgYnl0ZXMgcGVyIGNoYXJhY3RlclxuXG4gICAgZm9yICh2YXIgaT0wLCBUb3RhbExlbj1jb21wcmVzc2VkLmxlbmd0aDsgaTxUb3RhbExlbjsgaSsrKSB7XG4gICAgICB2YXIgY3VycmVudF92YWx1ZSA9IGNvbXByZXNzZWQuY2hhckNvZGVBdChpKTtcbiAgICAgIGJ1ZltpKjJdID0gY3VycmVudF92YWx1ZSA+Pj4gODtcbiAgICAgIGJ1ZltpKjIrMV0gPSBjdXJyZW50X3ZhbHVlICUgMjU2O1xuICAgIH1cbiAgICByZXR1cm4gYnVmO1xuICB9LFxuXG4gIC8vZGVjb21wcmVzcyBmcm9tIHVpbnQ4YXJyYXkgKFVDUy0yIGJpZyBlbmRpYW4gZm9ybWF0KVxuICBkZWNvbXByZXNzRnJvbVVpbnQ4QXJyYXk6ZnVuY3Rpb24gKGNvbXByZXNzZWQpIHtcbiAgICBpZiAoY29tcHJlc3NlZD09PW51bGwgfHwgY29tcHJlc3NlZD09PXVuZGVmaW5lZCl7XG4gICAgICAgIHJldHVybiBMWlN0cmluZy5kZWNvbXByZXNzKGNvbXByZXNzZWQpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBidWY9bmV3IEFycmF5KGNvbXByZXNzZWQubGVuZ3RoLzIpOyAvLyAyIGJ5dGVzIHBlciBjaGFyYWN0ZXJcbiAgICAgICAgZm9yICh2YXIgaT0wLCBUb3RhbExlbj1idWYubGVuZ3RoOyBpPFRvdGFsTGVuOyBpKyspIHtcbiAgICAgICAgICBidWZbaV09Y29tcHJlc3NlZFtpKjJdKjI1Nitjb21wcmVzc2VkW2kqMisxXTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciByZXN1bHQgPSBbXTtcbiAgICAgICAgYnVmLmZvckVhY2goZnVuY3Rpb24gKGMpIHtcbiAgICAgICAgICByZXN1bHQucHVzaChmKGMpKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBMWlN0cmluZy5kZWNvbXByZXNzKHJlc3VsdC5qb2luKCcnKSk7XG5cbiAgICB9XG5cbiAgfSxcblxuXG4gIC8vY29tcHJlc3MgaW50byBhIHN0cmluZyB0aGF0IGlzIGFscmVhZHkgVVJJIGVuY29kZWRcbiAgY29tcHJlc3NUb0VuY29kZWRVUklDb21wb25lbnQ6IGZ1bmN0aW9uIChpbnB1dCkge1xuICAgIGlmIChpbnB1dCA9PSBudWxsKSByZXR1cm4gXCJcIjtcbiAgICByZXR1cm4gTFpTdHJpbmcuX2NvbXByZXNzKGlucHV0LCA2LCBmdW5jdGlvbihhKXtyZXR1cm4ga2V5U3RyVXJpU2FmZS5jaGFyQXQoYSk7fSk7XG4gIH0sXG5cbiAgLy9kZWNvbXByZXNzIGZyb20gYW4gb3V0cHV0IG9mIGNvbXByZXNzVG9FbmNvZGVkVVJJQ29tcG9uZW50XG4gIGRlY29tcHJlc3NGcm9tRW5jb2RlZFVSSUNvbXBvbmVudDpmdW5jdGlvbiAoaW5wdXQpIHtcbiAgICBpZiAoaW5wdXQgPT0gbnVsbCkgcmV0dXJuIFwiXCI7XG4gICAgaWYgKGlucHV0ID09IFwiXCIpIHJldHVybiBudWxsO1xuICAgIGlucHV0ID0gaW5wdXQucmVwbGFjZSgvIC9nLCBcIitcIik7XG4gICAgcmV0dXJuIExaU3RyaW5nLl9kZWNvbXByZXNzKGlucHV0Lmxlbmd0aCwgMzIsIGZ1bmN0aW9uKGluZGV4KSB7IHJldHVybiBnZXRCYXNlVmFsdWUoa2V5U3RyVXJpU2FmZSwgaW5wdXQuY2hhckF0KGluZGV4KSk7IH0pO1xuICB9LFxuXG4gIGNvbXByZXNzOiBmdW5jdGlvbiAodW5jb21wcmVzc2VkKSB7XG4gICAgcmV0dXJuIExaU3RyaW5nLl9jb21wcmVzcyh1bmNvbXByZXNzZWQsIDE2LCBmdW5jdGlvbihhKXtyZXR1cm4gZihhKTt9KTtcbiAgfSxcbiAgX2NvbXByZXNzOiBmdW5jdGlvbiAodW5jb21wcmVzc2VkLCBiaXRzUGVyQ2hhciwgZ2V0Q2hhckZyb21JbnQpIHtcbiAgICBpZiAodW5jb21wcmVzc2VkID09IG51bGwpIHJldHVybiBcIlwiO1xuICAgIHZhciBpLCB2YWx1ZSxcbiAgICAgICAgY29udGV4dF9kaWN0aW9uYXJ5PSB7fSxcbiAgICAgICAgY29udGV4dF9kaWN0aW9uYXJ5VG9DcmVhdGU9IHt9LFxuICAgICAgICBjb250ZXh0X2M9XCJcIixcbiAgICAgICAgY29udGV4dF93Yz1cIlwiLFxuICAgICAgICBjb250ZXh0X3c9XCJcIixcbiAgICAgICAgY29udGV4dF9lbmxhcmdlSW49IDIsIC8vIENvbXBlbnNhdGUgZm9yIHRoZSBmaXJzdCBlbnRyeSB3aGljaCBzaG91bGQgbm90IGNvdW50XG4gICAgICAgIGNvbnRleHRfZGljdFNpemU9IDMsXG4gICAgICAgIGNvbnRleHRfbnVtQml0cz0gMixcbiAgICAgICAgY29udGV4dF9kYXRhPVtdLFxuICAgICAgICBjb250ZXh0X2RhdGFfdmFsPTAsXG4gICAgICAgIGNvbnRleHRfZGF0YV9wb3NpdGlvbj0wLFxuICAgICAgICBpaTtcblxuICAgIGZvciAoaWkgPSAwOyBpaSA8IHVuY29tcHJlc3NlZC5sZW5ndGg7IGlpICs9IDEpIHtcbiAgICAgIGNvbnRleHRfYyA9IHVuY29tcHJlc3NlZC5jaGFyQXQoaWkpO1xuICAgICAgaWYgKCFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoY29udGV4dF9kaWN0aW9uYXJ5LGNvbnRleHRfYykpIHtcbiAgICAgICAgY29udGV4dF9kaWN0aW9uYXJ5W2NvbnRleHRfY10gPSBjb250ZXh0X2RpY3RTaXplKys7XG4gICAgICAgIGNvbnRleHRfZGljdGlvbmFyeVRvQ3JlYXRlW2NvbnRleHRfY10gPSB0cnVlO1xuICAgICAgfVxuXG4gICAgICBjb250ZXh0X3djID0gY29udGV4dF93ICsgY29udGV4dF9jO1xuICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChjb250ZXh0X2RpY3Rpb25hcnksY29udGV4dF93YykpIHtcbiAgICAgICAgY29udGV4dF93ID0gY29udGV4dF93YztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoY29udGV4dF9kaWN0aW9uYXJ5VG9DcmVhdGUsY29udGV4dF93KSkge1xuICAgICAgICAgIGlmIChjb250ZXh0X3cuY2hhckNvZGVBdCgwKTwyNTYpIHtcbiAgICAgICAgICAgIGZvciAoaT0wIDsgaTxjb250ZXh0X251bUJpdHMgOyBpKyspIHtcbiAgICAgICAgICAgICAgY29udGV4dF9kYXRhX3ZhbCA9IChjb250ZXh0X2RhdGFfdmFsIDw8IDEpO1xuICAgICAgICAgICAgICBpZiAoY29udGV4dF9kYXRhX3Bvc2l0aW9uID09IGJpdHNQZXJDaGFyLTEpIHtcbiAgICAgICAgICAgICAgICBjb250ZXh0X2RhdGFfcG9zaXRpb24gPSAwO1xuICAgICAgICAgICAgICAgIGNvbnRleHRfZGF0YS5wdXNoKGdldENoYXJGcm9tSW50KGNvbnRleHRfZGF0YV92YWwpKTtcbiAgICAgICAgICAgICAgICBjb250ZXh0X2RhdGFfdmFsID0gMDtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb250ZXh0X2RhdGFfcG9zaXRpb24rKztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFsdWUgPSBjb250ZXh0X3cuY2hhckNvZGVBdCgwKTtcbiAgICAgICAgICAgIGZvciAoaT0wIDsgaTw4IDsgaSsrKSB7XG4gICAgICAgICAgICAgIGNvbnRleHRfZGF0YV92YWwgPSAoY29udGV4dF9kYXRhX3ZhbCA8PCAxKSB8ICh2YWx1ZSYxKTtcbiAgICAgICAgICAgICAgaWYgKGNvbnRleHRfZGF0YV9wb3NpdGlvbiA9PSBiaXRzUGVyQ2hhci0xKSB7XG4gICAgICAgICAgICAgICAgY29udGV4dF9kYXRhX3Bvc2l0aW9uID0gMDtcbiAgICAgICAgICAgICAgICBjb250ZXh0X2RhdGEucHVzaChnZXRDaGFyRnJvbUludChjb250ZXh0X2RhdGFfdmFsKSk7XG4gICAgICAgICAgICAgICAgY29udGV4dF9kYXRhX3ZhbCA9IDA7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29udGV4dF9kYXRhX3Bvc2l0aW9uKys7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZSA+PiAxO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YWx1ZSA9IDE7XG4gICAgICAgICAgICBmb3IgKGk9MCA7IGk8Y29udGV4dF9udW1CaXRzIDsgaSsrKSB7XG4gICAgICAgICAgICAgIGNvbnRleHRfZGF0YV92YWwgPSAoY29udGV4dF9kYXRhX3ZhbCA8PCAxKSB8IHZhbHVlO1xuICAgICAgICAgICAgICBpZiAoY29udGV4dF9kYXRhX3Bvc2l0aW9uID09Yml0c1BlckNoYXItMSkge1xuICAgICAgICAgICAgICAgIGNvbnRleHRfZGF0YV9wb3NpdGlvbiA9IDA7XG4gICAgICAgICAgICAgICAgY29udGV4dF9kYXRhLnB1c2goZ2V0Q2hhckZyb21JbnQoY29udGV4dF9kYXRhX3ZhbCkpO1xuICAgICAgICAgICAgICAgIGNvbnRleHRfZGF0YV92YWwgPSAwO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnRleHRfZGF0YV9wb3NpdGlvbisrO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIHZhbHVlID0gMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhbHVlID0gY29udGV4dF93LmNoYXJDb2RlQXQoMCk7XG4gICAgICAgICAgICBmb3IgKGk9MCA7IGk8MTYgOyBpKyspIHtcbiAgICAgICAgICAgICAgY29udGV4dF9kYXRhX3ZhbCA9IChjb250ZXh0X2RhdGFfdmFsIDw8IDEpIHwgKHZhbHVlJjEpO1xuICAgICAgICAgICAgICBpZiAoY29udGV4dF9kYXRhX3Bvc2l0aW9uID09IGJpdHNQZXJDaGFyLTEpIHtcbiAgICAgICAgICAgICAgICBjb250ZXh0X2RhdGFfcG9zaXRpb24gPSAwO1xuICAgICAgICAgICAgICAgIGNvbnRleHRfZGF0YS5wdXNoKGdldENoYXJGcm9tSW50KGNvbnRleHRfZGF0YV92YWwpKTtcbiAgICAgICAgICAgICAgICBjb250ZXh0X2RhdGFfdmFsID0gMDtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb250ZXh0X2RhdGFfcG9zaXRpb24rKztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB2YWx1ZSA9IHZhbHVlID4+IDE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnRleHRfZW5sYXJnZUluLS07XG4gICAgICAgICAgaWYgKGNvbnRleHRfZW5sYXJnZUluID09IDApIHtcbiAgICAgICAgICAgIGNvbnRleHRfZW5sYXJnZUluID0gTWF0aC5wb3coMiwgY29udGV4dF9udW1CaXRzKTtcbiAgICAgICAgICAgIGNvbnRleHRfbnVtQml0cysrO1xuICAgICAgICAgIH1cbiAgICAgICAgICBkZWxldGUgY29udGV4dF9kaWN0aW9uYXJ5VG9DcmVhdGVbY29udGV4dF93XTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB2YWx1ZSA9IGNvbnRleHRfZGljdGlvbmFyeVtjb250ZXh0X3ddO1xuICAgICAgICAgIGZvciAoaT0wIDsgaTxjb250ZXh0X251bUJpdHMgOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnRleHRfZGF0YV92YWwgPSAoY29udGV4dF9kYXRhX3ZhbCA8PCAxKSB8ICh2YWx1ZSYxKTtcbiAgICAgICAgICAgIGlmIChjb250ZXh0X2RhdGFfcG9zaXRpb24gPT0gYml0c1BlckNoYXItMSkge1xuICAgICAgICAgICAgICBjb250ZXh0X2RhdGFfcG9zaXRpb24gPSAwO1xuICAgICAgICAgICAgICBjb250ZXh0X2RhdGEucHVzaChnZXRDaGFyRnJvbUludChjb250ZXh0X2RhdGFfdmFsKSk7XG4gICAgICAgICAgICAgIGNvbnRleHRfZGF0YV92YWwgPSAwO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgY29udGV4dF9kYXRhX3Bvc2l0aW9uKys7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YWx1ZSA9IHZhbHVlID4+IDE7XG4gICAgICAgICAgfVxuXG5cbiAgICAgICAgfVxuICAgICAgICBjb250ZXh0X2VubGFyZ2VJbi0tO1xuICAgICAgICBpZiAoY29udGV4dF9lbmxhcmdlSW4gPT0gMCkge1xuICAgICAgICAgIGNvbnRleHRfZW5sYXJnZUluID0gTWF0aC5wb3coMiwgY29udGV4dF9udW1CaXRzKTtcbiAgICAgICAgICBjb250ZXh0X251bUJpdHMrKztcbiAgICAgICAgfVxuICAgICAgICAvLyBBZGQgd2MgdG8gdGhlIGRpY3Rpb25hcnkuXG4gICAgICAgIGNvbnRleHRfZGljdGlvbmFyeVtjb250ZXh0X3djXSA9IGNvbnRleHRfZGljdFNpemUrKztcbiAgICAgICAgY29udGV4dF93ID0gU3RyaW5nKGNvbnRleHRfYyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gT3V0cHV0IHRoZSBjb2RlIGZvciB3LlxuICAgIGlmIChjb250ZXh0X3cgIT09IFwiXCIpIHtcbiAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoY29udGV4dF9kaWN0aW9uYXJ5VG9DcmVhdGUsY29udGV4dF93KSkge1xuICAgICAgICBpZiAoY29udGV4dF93LmNoYXJDb2RlQXQoMCk8MjU2KSB7XG4gICAgICAgICAgZm9yIChpPTAgOyBpPGNvbnRleHRfbnVtQml0cyA7IGkrKykge1xuICAgICAgICAgICAgY29udGV4dF9kYXRhX3ZhbCA9IChjb250ZXh0X2RhdGFfdmFsIDw8IDEpO1xuICAgICAgICAgICAgaWYgKGNvbnRleHRfZGF0YV9wb3NpdGlvbiA9PSBiaXRzUGVyQ2hhci0xKSB7XG4gICAgICAgICAgICAgIGNvbnRleHRfZGF0YV9wb3NpdGlvbiA9IDA7XG4gICAgICAgICAgICAgIGNvbnRleHRfZGF0YS5wdXNoKGdldENoYXJGcm9tSW50KGNvbnRleHRfZGF0YV92YWwpKTtcbiAgICAgICAgICAgICAgY29udGV4dF9kYXRhX3ZhbCA9IDA7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBjb250ZXh0X2RhdGFfcG9zaXRpb24rKztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgdmFsdWUgPSBjb250ZXh0X3cuY2hhckNvZGVBdCgwKTtcbiAgICAgICAgICBmb3IgKGk9MCA7IGk8OCA7IGkrKykge1xuICAgICAgICAgICAgY29udGV4dF9kYXRhX3ZhbCA9IChjb250ZXh0X2RhdGFfdmFsIDw8IDEpIHwgKHZhbHVlJjEpO1xuICAgICAgICAgICAgaWYgKGNvbnRleHRfZGF0YV9wb3NpdGlvbiA9PSBiaXRzUGVyQ2hhci0xKSB7XG4gICAgICAgICAgICAgIGNvbnRleHRfZGF0YV9wb3NpdGlvbiA9IDA7XG4gICAgICAgICAgICAgIGNvbnRleHRfZGF0YS5wdXNoKGdldENoYXJGcm9tSW50KGNvbnRleHRfZGF0YV92YWwpKTtcbiAgICAgICAgICAgICAgY29udGV4dF9kYXRhX3ZhbCA9IDA7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBjb250ZXh0X2RhdGFfcG9zaXRpb24rKztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhbHVlID0gdmFsdWUgPj4gMTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdmFsdWUgPSAxO1xuICAgICAgICAgIGZvciAoaT0wIDsgaTxjb250ZXh0X251bUJpdHMgOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnRleHRfZGF0YV92YWwgPSAoY29udGV4dF9kYXRhX3ZhbCA8PCAxKSB8IHZhbHVlO1xuICAgICAgICAgICAgaWYgKGNvbnRleHRfZGF0YV9wb3NpdGlvbiA9PSBiaXRzUGVyQ2hhci0xKSB7XG4gICAgICAgICAgICAgIGNvbnRleHRfZGF0YV9wb3NpdGlvbiA9IDA7XG4gICAgICAgICAgICAgIGNvbnRleHRfZGF0YS5wdXNoKGdldENoYXJGcm9tSW50KGNvbnRleHRfZGF0YV92YWwpKTtcbiAgICAgICAgICAgICAgY29udGV4dF9kYXRhX3ZhbCA9IDA7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBjb250ZXh0X2RhdGFfcG9zaXRpb24rKztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhbHVlID0gMDtcbiAgICAgICAgICB9XG4gICAgICAgICAgdmFsdWUgPSBjb250ZXh0X3cuY2hhckNvZGVBdCgwKTtcbiAgICAgICAgICBmb3IgKGk9MCA7IGk8MTYgOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnRleHRfZGF0YV92YWwgPSAoY29udGV4dF9kYXRhX3ZhbCA8PCAxKSB8ICh2YWx1ZSYxKTtcbiAgICAgICAgICAgIGlmIChjb250ZXh0X2RhdGFfcG9zaXRpb24gPT0gYml0c1BlckNoYXItMSkge1xuICAgICAgICAgICAgICBjb250ZXh0X2RhdGFfcG9zaXRpb24gPSAwO1xuICAgICAgICAgICAgICBjb250ZXh0X2RhdGEucHVzaChnZXRDaGFyRnJvbUludChjb250ZXh0X2RhdGFfdmFsKSk7XG4gICAgICAgICAgICAgIGNvbnRleHRfZGF0YV92YWwgPSAwO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgY29udGV4dF9kYXRhX3Bvc2l0aW9uKys7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YWx1ZSA9IHZhbHVlID4+IDE7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGNvbnRleHRfZW5sYXJnZUluLS07XG4gICAgICAgIGlmIChjb250ZXh0X2VubGFyZ2VJbiA9PSAwKSB7XG4gICAgICAgICAgY29udGV4dF9lbmxhcmdlSW4gPSBNYXRoLnBvdygyLCBjb250ZXh0X251bUJpdHMpO1xuICAgICAgICAgIGNvbnRleHRfbnVtQml0cysrO1xuICAgICAgICB9XG4gICAgICAgIGRlbGV0ZSBjb250ZXh0X2RpY3Rpb25hcnlUb0NyZWF0ZVtjb250ZXh0X3ddO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFsdWUgPSBjb250ZXh0X2RpY3Rpb25hcnlbY29udGV4dF93XTtcbiAgICAgICAgZm9yIChpPTAgOyBpPGNvbnRleHRfbnVtQml0cyA7IGkrKykge1xuICAgICAgICAgIGNvbnRleHRfZGF0YV92YWwgPSAoY29udGV4dF9kYXRhX3ZhbCA8PCAxKSB8ICh2YWx1ZSYxKTtcbiAgICAgICAgICBpZiAoY29udGV4dF9kYXRhX3Bvc2l0aW9uID09IGJpdHNQZXJDaGFyLTEpIHtcbiAgICAgICAgICAgIGNvbnRleHRfZGF0YV9wb3NpdGlvbiA9IDA7XG4gICAgICAgICAgICBjb250ZXh0X2RhdGEucHVzaChnZXRDaGFyRnJvbUludChjb250ZXh0X2RhdGFfdmFsKSk7XG4gICAgICAgICAgICBjb250ZXh0X2RhdGFfdmFsID0gMDtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29udGV4dF9kYXRhX3Bvc2l0aW9uKys7XG4gICAgICAgICAgfVxuICAgICAgICAgIHZhbHVlID0gdmFsdWUgPj4gMTtcbiAgICAgICAgfVxuXG5cbiAgICAgIH1cbiAgICAgIGNvbnRleHRfZW5sYXJnZUluLS07XG4gICAgICBpZiAoY29udGV4dF9lbmxhcmdlSW4gPT0gMCkge1xuICAgICAgICBjb250ZXh0X2VubGFyZ2VJbiA9IE1hdGgucG93KDIsIGNvbnRleHRfbnVtQml0cyk7XG4gICAgICAgIGNvbnRleHRfbnVtQml0cysrO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIE1hcmsgdGhlIGVuZCBvZiB0aGUgc3RyZWFtXG4gICAgdmFsdWUgPSAyO1xuICAgIGZvciAoaT0wIDsgaTxjb250ZXh0X251bUJpdHMgOyBpKyspIHtcbiAgICAgIGNvbnRleHRfZGF0YV92YWwgPSAoY29udGV4dF9kYXRhX3ZhbCA8PCAxKSB8ICh2YWx1ZSYxKTtcbiAgICAgIGlmIChjb250ZXh0X2RhdGFfcG9zaXRpb24gPT0gYml0c1BlckNoYXItMSkge1xuICAgICAgICBjb250ZXh0X2RhdGFfcG9zaXRpb24gPSAwO1xuICAgICAgICBjb250ZXh0X2RhdGEucHVzaChnZXRDaGFyRnJvbUludChjb250ZXh0X2RhdGFfdmFsKSk7XG4gICAgICAgIGNvbnRleHRfZGF0YV92YWwgPSAwO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29udGV4dF9kYXRhX3Bvc2l0aW9uKys7XG4gICAgICB9XG4gICAgICB2YWx1ZSA9IHZhbHVlID4+IDE7XG4gICAgfVxuXG4gICAgLy8gRmx1c2ggdGhlIGxhc3QgY2hhclxuICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICBjb250ZXh0X2RhdGFfdmFsID0gKGNvbnRleHRfZGF0YV92YWwgPDwgMSk7XG4gICAgICBpZiAoY29udGV4dF9kYXRhX3Bvc2l0aW9uID09IGJpdHNQZXJDaGFyLTEpIHtcbiAgICAgICAgY29udGV4dF9kYXRhLnB1c2goZ2V0Q2hhckZyb21JbnQoY29udGV4dF9kYXRhX3ZhbCkpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIGVsc2UgY29udGV4dF9kYXRhX3Bvc2l0aW9uKys7XG4gICAgfVxuICAgIHJldHVybiBjb250ZXh0X2RhdGEuam9pbignJyk7XG4gIH0sXG5cbiAgZGVjb21wcmVzczogZnVuY3Rpb24gKGNvbXByZXNzZWQpIHtcbiAgICBpZiAoY29tcHJlc3NlZCA9PSBudWxsKSByZXR1cm4gXCJcIjtcbiAgICBpZiAoY29tcHJlc3NlZCA9PSBcIlwiKSByZXR1cm4gbnVsbDtcbiAgICByZXR1cm4gTFpTdHJpbmcuX2RlY29tcHJlc3MoY29tcHJlc3NlZC5sZW5ndGgsIDMyNzY4LCBmdW5jdGlvbihpbmRleCkgeyByZXR1cm4gY29tcHJlc3NlZC5jaGFyQ29kZUF0KGluZGV4KTsgfSk7XG4gIH0sXG5cbiAgX2RlY29tcHJlc3M6IGZ1bmN0aW9uIChsZW5ndGgsIHJlc2V0VmFsdWUsIGdldE5leHRWYWx1ZSkge1xuICAgIHZhciBkaWN0aW9uYXJ5ID0gW10sXG4gICAgICAgIG5leHQsXG4gICAgICAgIGVubGFyZ2VJbiA9IDQsXG4gICAgICAgIGRpY3RTaXplID0gNCxcbiAgICAgICAgbnVtQml0cyA9IDMsXG4gICAgICAgIGVudHJ5ID0gXCJcIixcbiAgICAgICAgcmVzdWx0ID0gW10sXG4gICAgICAgIGksXG4gICAgICAgIHcsXG4gICAgICAgIGJpdHMsIHJlc2IsIG1heHBvd2VyLCBwb3dlcixcbiAgICAgICAgYyxcbiAgICAgICAgZGF0YSA9IHt2YWw6Z2V0TmV4dFZhbHVlKDApLCBwb3NpdGlvbjpyZXNldFZhbHVlLCBpbmRleDoxfTtcblxuICAgIGZvciAoaSA9IDA7IGkgPCAzOyBpICs9IDEpIHtcbiAgICAgIGRpY3Rpb25hcnlbaV0gPSBpO1xuICAgIH1cblxuICAgIGJpdHMgPSAwO1xuICAgIG1heHBvd2VyID0gTWF0aC5wb3coMiwyKTtcbiAgICBwb3dlcj0xO1xuICAgIHdoaWxlIChwb3dlciE9bWF4cG93ZXIpIHtcbiAgICAgIHJlc2IgPSBkYXRhLnZhbCAmIGRhdGEucG9zaXRpb247XG4gICAgICBkYXRhLnBvc2l0aW9uID4+PSAxO1xuICAgICAgaWYgKGRhdGEucG9zaXRpb24gPT0gMCkge1xuICAgICAgICBkYXRhLnBvc2l0aW9uID0gcmVzZXRWYWx1ZTtcbiAgICAgICAgZGF0YS52YWwgPSBnZXROZXh0VmFsdWUoZGF0YS5pbmRleCsrKTtcbiAgICAgIH1cbiAgICAgIGJpdHMgfD0gKHJlc2I+MCA/IDEgOiAwKSAqIHBvd2VyO1xuICAgICAgcG93ZXIgPDw9IDE7XG4gICAgfVxuXG4gICAgc3dpdGNoIChuZXh0ID0gYml0cykge1xuICAgICAgY2FzZSAwOlxuICAgICAgICAgIGJpdHMgPSAwO1xuICAgICAgICAgIG1heHBvd2VyID0gTWF0aC5wb3coMiw4KTtcbiAgICAgICAgICBwb3dlcj0xO1xuICAgICAgICAgIHdoaWxlIChwb3dlciE9bWF4cG93ZXIpIHtcbiAgICAgICAgICAgIHJlc2IgPSBkYXRhLnZhbCAmIGRhdGEucG9zaXRpb247XG4gICAgICAgICAgICBkYXRhLnBvc2l0aW9uID4+PSAxO1xuICAgICAgICAgICAgaWYgKGRhdGEucG9zaXRpb24gPT0gMCkge1xuICAgICAgICAgICAgICBkYXRhLnBvc2l0aW9uID0gcmVzZXRWYWx1ZTtcbiAgICAgICAgICAgICAgZGF0YS52YWwgPSBnZXROZXh0VmFsdWUoZGF0YS5pbmRleCsrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJpdHMgfD0gKHJlc2I+MCA/IDEgOiAwKSAqIHBvd2VyO1xuICAgICAgICAgICAgcG93ZXIgPDw9IDE7XG4gICAgICAgICAgfVxuICAgICAgICBjID0gZihiaXRzKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDE6XG4gICAgICAgICAgYml0cyA9IDA7XG4gICAgICAgICAgbWF4cG93ZXIgPSBNYXRoLnBvdygyLDE2KTtcbiAgICAgICAgICBwb3dlcj0xO1xuICAgICAgICAgIHdoaWxlIChwb3dlciE9bWF4cG93ZXIpIHtcbiAgICAgICAgICAgIHJlc2IgPSBkYXRhLnZhbCAmIGRhdGEucG9zaXRpb247XG4gICAgICAgICAgICBkYXRhLnBvc2l0aW9uID4+PSAxO1xuICAgICAgICAgICAgaWYgKGRhdGEucG9zaXRpb24gPT0gMCkge1xuICAgICAgICAgICAgICBkYXRhLnBvc2l0aW9uID0gcmVzZXRWYWx1ZTtcbiAgICAgICAgICAgICAgZGF0YS52YWwgPSBnZXROZXh0VmFsdWUoZGF0YS5pbmRleCsrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJpdHMgfD0gKHJlc2I+MCA/IDEgOiAwKSAqIHBvd2VyO1xuICAgICAgICAgICAgcG93ZXIgPDw9IDE7XG4gICAgICAgICAgfVxuICAgICAgICBjID0gZihiaXRzKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDI6XG4gICAgICAgIHJldHVybiBcIlwiO1xuICAgIH1cbiAgICBkaWN0aW9uYXJ5WzNdID0gYztcbiAgICB3ID0gYztcbiAgICByZXN1bHQucHVzaChjKTtcbiAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgaWYgKGRhdGEuaW5kZXggPiBsZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIFwiXCI7XG4gICAgICB9XG5cbiAgICAgIGJpdHMgPSAwO1xuICAgICAgbWF4cG93ZXIgPSBNYXRoLnBvdygyLG51bUJpdHMpO1xuICAgICAgcG93ZXI9MTtcbiAgICAgIHdoaWxlIChwb3dlciE9bWF4cG93ZXIpIHtcbiAgICAgICAgcmVzYiA9IGRhdGEudmFsICYgZGF0YS5wb3NpdGlvbjtcbiAgICAgICAgZGF0YS5wb3NpdGlvbiA+Pj0gMTtcbiAgICAgICAgaWYgKGRhdGEucG9zaXRpb24gPT0gMCkge1xuICAgICAgICAgIGRhdGEucG9zaXRpb24gPSByZXNldFZhbHVlO1xuICAgICAgICAgIGRhdGEudmFsID0gZ2V0TmV4dFZhbHVlKGRhdGEuaW5kZXgrKyk7XG4gICAgICAgIH1cbiAgICAgICAgYml0cyB8PSAocmVzYj4wID8gMSA6IDApICogcG93ZXI7XG4gICAgICAgIHBvd2VyIDw8PSAxO1xuICAgICAgfVxuXG4gICAgICBzd2l0Y2ggKGMgPSBiaXRzKSB7XG4gICAgICAgIGNhc2UgMDpcbiAgICAgICAgICBiaXRzID0gMDtcbiAgICAgICAgICBtYXhwb3dlciA9IE1hdGgucG93KDIsOCk7XG4gICAgICAgICAgcG93ZXI9MTtcbiAgICAgICAgICB3aGlsZSAocG93ZXIhPW1heHBvd2VyKSB7XG4gICAgICAgICAgICByZXNiID0gZGF0YS52YWwgJiBkYXRhLnBvc2l0aW9uO1xuICAgICAgICAgICAgZGF0YS5wb3NpdGlvbiA+Pj0gMTtcbiAgICAgICAgICAgIGlmIChkYXRhLnBvc2l0aW9uID09IDApIHtcbiAgICAgICAgICAgICAgZGF0YS5wb3NpdGlvbiA9IHJlc2V0VmFsdWU7XG4gICAgICAgICAgICAgIGRhdGEudmFsID0gZ2V0TmV4dFZhbHVlKGRhdGEuaW5kZXgrKyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBiaXRzIHw9IChyZXNiPjAgPyAxIDogMCkgKiBwb3dlcjtcbiAgICAgICAgICAgIHBvd2VyIDw8PSAxO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGRpY3Rpb25hcnlbZGljdFNpemUrK10gPSBmKGJpdHMpO1xuICAgICAgICAgIGMgPSBkaWN0U2l6ZS0xO1xuICAgICAgICAgIGVubGFyZ2VJbi0tO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDE6XG4gICAgICAgICAgYml0cyA9IDA7XG4gICAgICAgICAgbWF4cG93ZXIgPSBNYXRoLnBvdygyLDE2KTtcbiAgICAgICAgICBwb3dlcj0xO1xuICAgICAgICAgIHdoaWxlIChwb3dlciE9bWF4cG93ZXIpIHtcbiAgICAgICAgICAgIHJlc2IgPSBkYXRhLnZhbCAmIGRhdGEucG9zaXRpb247XG4gICAgICAgICAgICBkYXRhLnBvc2l0aW9uID4+PSAxO1xuICAgICAgICAgICAgaWYgKGRhdGEucG9zaXRpb24gPT0gMCkge1xuICAgICAgICAgICAgICBkYXRhLnBvc2l0aW9uID0gcmVzZXRWYWx1ZTtcbiAgICAgICAgICAgICAgZGF0YS52YWwgPSBnZXROZXh0VmFsdWUoZGF0YS5pbmRleCsrKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJpdHMgfD0gKHJlc2I+MCA/IDEgOiAwKSAqIHBvd2VyO1xuICAgICAgICAgICAgcG93ZXIgPDw9IDE7XG4gICAgICAgICAgfVxuICAgICAgICAgIGRpY3Rpb25hcnlbZGljdFNpemUrK10gPSBmKGJpdHMpO1xuICAgICAgICAgIGMgPSBkaWN0U2l6ZS0xO1xuICAgICAgICAgIGVubGFyZ2VJbi0tO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgcmV0dXJuIHJlc3VsdC5qb2luKCcnKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGVubGFyZ2VJbiA9PSAwKSB7XG4gICAgICAgIGVubGFyZ2VJbiA9IE1hdGgucG93KDIsIG51bUJpdHMpO1xuICAgICAgICBudW1CaXRzKys7XG4gICAgICB9XG5cbiAgICAgIGlmIChkaWN0aW9uYXJ5W2NdKSB7XG4gICAgICAgIGVudHJ5ID0gZGljdGlvbmFyeVtjXTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChjID09PSBkaWN0U2l6ZSkge1xuICAgICAgICAgIGVudHJ5ID0gdyArIHcuY2hhckF0KDApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXN1bHQucHVzaChlbnRyeSk7XG5cbiAgICAgIC8vIEFkZCB3K2VudHJ5WzBdIHRvIHRoZSBkaWN0aW9uYXJ5LlxuICAgICAgZGljdGlvbmFyeVtkaWN0U2l6ZSsrXSA9IHcgKyBlbnRyeS5jaGFyQXQoMCk7XG4gICAgICBlbmxhcmdlSW4tLTtcblxuICAgICAgdyA9IGVudHJ5O1xuXG4gICAgICBpZiAoZW5sYXJnZUluID09IDApIHtcbiAgICAgICAgZW5sYXJnZUluID0gTWF0aC5wb3coMiwgbnVtQml0cyk7XG4gICAgICAgIG51bUJpdHMrKztcbiAgICAgIH1cblxuICAgIH1cbiAgfVxufTtcbiAgcmV0dXJuIExaU3RyaW5nO1xufSkoKTtcblxuaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICBkZWZpbmUoZnVuY3Rpb24gKCkgeyByZXR1cm4gTFpTdHJpbmc7IH0pO1xufSBlbHNlIGlmKCB0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiBtb2R1bGUgIT0gbnVsbCApIHtcbiAgbW9kdWxlLmV4cG9ydHMgPSBMWlN0cmluZ1xufVxuIiwiIWZ1bmN0aW9uKCkge1xuICAgICd1c2Ugc3RyaWN0JztcbiAgICBmdW5jdGlvbiBWTm9kZSgpIHt9XG4gICAgZnVuY3Rpb24gaChub2RlTmFtZSwgYXR0cmlidXRlcykge1xuICAgICAgICB2YXIgbGFzdFNpbXBsZSwgY2hpbGQsIHNpbXBsZSwgaSwgY2hpbGRyZW4gPSBFTVBUWV9DSElMRFJFTjtcbiAgICAgICAgZm9yIChpID0gYXJndW1lbnRzLmxlbmd0aDsgaS0tID4gMjsgKSBzdGFjay5wdXNoKGFyZ3VtZW50c1tpXSk7XG4gICAgICAgIGlmIChhdHRyaWJ1dGVzICYmIG51bGwgIT0gYXR0cmlidXRlcy5jaGlsZHJlbikge1xuICAgICAgICAgICAgaWYgKCFzdGFjay5sZW5ndGgpIHN0YWNrLnB1c2goYXR0cmlidXRlcy5jaGlsZHJlbik7XG4gICAgICAgICAgICBkZWxldGUgYXR0cmlidXRlcy5jaGlsZHJlbjtcbiAgICAgICAgfVxuICAgICAgICB3aGlsZSAoc3RhY2subGVuZ3RoKSBpZiAoKGNoaWxkID0gc3RhY2sucG9wKCkpICYmIHZvaWQgMCAhPT0gY2hpbGQucG9wKSBmb3IgKGkgPSBjaGlsZC5sZW5ndGg7IGktLTsgKSBzdGFjay5wdXNoKGNoaWxkW2ldKTsgZWxzZSB7XG4gICAgICAgICAgICBpZiAoY2hpbGQgPT09ICEwIHx8IGNoaWxkID09PSAhMSkgY2hpbGQgPSBudWxsO1xuICAgICAgICAgICAgaWYgKHNpbXBsZSA9ICdmdW5jdGlvbicgIT0gdHlwZW9mIG5vZGVOYW1lKSBpZiAobnVsbCA9PSBjaGlsZCkgY2hpbGQgPSAnJzsgZWxzZSBpZiAoJ251bWJlcicgPT0gdHlwZW9mIGNoaWxkKSBjaGlsZCA9IFN0cmluZyhjaGlsZCk7IGVsc2UgaWYgKCdzdHJpbmcnICE9IHR5cGVvZiBjaGlsZCkgc2ltcGxlID0gITE7XG4gICAgICAgICAgICBpZiAoc2ltcGxlICYmIGxhc3RTaW1wbGUpIGNoaWxkcmVuW2NoaWxkcmVuLmxlbmd0aCAtIDFdICs9IGNoaWxkOyBlbHNlIGlmIChjaGlsZHJlbiA9PT0gRU1QVFlfQ0hJTERSRU4pIGNoaWxkcmVuID0gWyBjaGlsZCBdOyBlbHNlIGNoaWxkcmVuLnB1c2goY2hpbGQpO1xuICAgICAgICAgICAgbGFzdFNpbXBsZSA9IHNpbXBsZTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgcCA9IG5ldyBWTm9kZSgpO1xuICAgICAgICBwLm5vZGVOYW1lID0gbm9kZU5hbWU7XG4gICAgICAgIHAuY2hpbGRyZW4gPSBjaGlsZHJlbjtcbiAgICAgICAgcC5hdHRyaWJ1dGVzID0gbnVsbCA9PSBhdHRyaWJ1dGVzID8gdm9pZCAwIDogYXR0cmlidXRlcztcbiAgICAgICAgcC5rZXkgPSBudWxsID09IGF0dHJpYnV0ZXMgPyB2b2lkIDAgOiBhdHRyaWJ1dGVzLmtleTtcbiAgICAgICAgaWYgKHZvaWQgMCAhPT0gb3B0aW9ucy52bm9kZSkgb3B0aW9ucy52bm9kZShwKTtcbiAgICAgICAgcmV0dXJuIHA7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGV4dGVuZChvYmosIHByb3BzKSB7XG4gICAgICAgIGZvciAodmFyIGkgaW4gcHJvcHMpIG9ialtpXSA9IHByb3BzW2ldO1xuICAgICAgICByZXR1cm4gb2JqO1xuICAgIH1cbiAgICBmdW5jdGlvbiBjbG9uZUVsZW1lbnQodm5vZGUsIHByb3BzKSB7XG4gICAgICAgIHJldHVybiBoKHZub2RlLm5vZGVOYW1lLCBleHRlbmQoZXh0ZW5kKHt9LCB2bm9kZS5hdHRyaWJ1dGVzKSwgcHJvcHMpLCBhcmd1bWVudHMubGVuZ3RoID4gMiA/IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAyKSA6IHZub2RlLmNoaWxkcmVuKTtcbiAgICB9XG4gICAgZnVuY3Rpb24gZW5xdWV1ZVJlbmRlcihjb21wb25lbnQpIHtcbiAgICAgICAgaWYgKCFjb21wb25lbnQuX19kICYmIChjb21wb25lbnQuX19kID0gITApICYmIDEgPT0gaXRlbXMucHVzaChjb21wb25lbnQpKSAob3B0aW9ucy5kZWJvdW5jZVJlbmRlcmluZyB8fCBzZXRUaW1lb3V0KShyZXJlbmRlcik7XG4gICAgfVxuICAgIGZ1bmN0aW9uIHJlcmVuZGVyKCkge1xuICAgICAgICB2YXIgcCwgbGlzdCA9IGl0ZW1zO1xuICAgICAgICBpdGVtcyA9IFtdO1xuICAgICAgICB3aGlsZSAocCA9IGxpc3QucG9wKCkpIGlmIChwLl9fZCkgcmVuZGVyQ29tcG9uZW50KHApO1xuICAgIH1cbiAgICBmdW5jdGlvbiBpc1NhbWVOb2RlVHlwZShub2RlLCB2bm9kZSwgaHlkcmF0aW5nKSB7XG4gICAgICAgIGlmICgnc3RyaW5nJyA9PSB0eXBlb2Ygdm5vZGUgfHwgJ251bWJlcicgPT0gdHlwZW9mIHZub2RlKSByZXR1cm4gdm9pZCAwICE9PSBub2RlLnNwbGl0VGV4dDtcbiAgICAgICAgaWYgKCdzdHJpbmcnID09IHR5cGVvZiB2bm9kZS5ub2RlTmFtZSkgcmV0dXJuICFub2RlLl9jb21wb25lbnRDb25zdHJ1Y3RvciAmJiBpc05hbWVkTm9kZShub2RlLCB2bm9kZS5ub2RlTmFtZSk7IGVsc2UgcmV0dXJuIGh5ZHJhdGluZyB8fCBub2RlLl9jb21wb25lbnRDb25zdHJ1Y3RvciA9PT0gdm5vZGUubm9kZU5hbWU7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGlzTmFtZWROb2RlKG5vZGUsIG5vZGVOYW1lKSB7XG4gICAgICAgIHJldHVybiBub2RlLl9fbiA9PT0gbm9kZU5hbWUgfHwgbm9kZS5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpID09PSBub2RlTmFtZS50b0xvd2VyQ2FzZSgpO1xuICAgIH1cbiAgICBmdW5jdGlvbiBnZXROb2RlUHJvcHModm5vZGUpIHtcbiAgICAgICAgdmFyIHByb3BzID0gZXh0ZW5kKHt9LCB2bm9kZS5hdHRyaWJ1dGVzKTtcbiAgICAgICAgcHJvcHMuY2hpbGRyZW4gPSB2bm9kZS5jaGlsZHJlbjtcbiAgICAgICAgdmFyIGRlZmF1bHRQcm9wcyA9IHZub2RlLm5vZGVOYW1lLmRlZmF1bHRQcm9wcztcbiAgICAgICAgaWYgKHZvaWQgMCAhPT0gZGVmYXVsdFByb3BzKSBmb3IgKHZhciBpIGluIGRlZmF1bHRQcm9wcykgaWYgKHZvaWQgMCA9PT0gcHJvcHNbaV0pIHByb3BzW2ldID0gZGVmYXVsdFByb3BzW2ldO1xuICAgICAgICByZXR1cm4gcHJvcHM7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGNyZWF0ZU5vZGUobm9kZU5hbWUsIGlzU3ZnKSB7XG4gICAgICAgIHZhciBub2RlID0gaXNTdmcgPyBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoJ2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJywgbm9kZU5hbWUpIDogZG9jdW1lbnQuY3JlYXRlRWxlbWVudChub2RlTmFtZSk7XG4gICAgICAgIG5vZGUuX19uID0gbm9kZU5hbWU7XG4gICAgICAgIHJldHVybiBub2RlO1xuICAgIH1cbiAgICBmdW5jdGlvbiByZW1vdmVOb2RlKG5vZGUpIHtcbiAgICAgICAgaWYgKG5vZGUucGFyZW50Tm9kZSkgbm9kZS5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKG5vZGUpO1xuICAgIH1cbiAgICBmdW5jdGlvbiBzZXRBY2Nlc3Nvcihub2RlLCBuYW1lLCBvbGQsIHZhbHVlLCBpc1N2Zykge1xuICAgICAgICBpZiAoJ2NsYXNzTmFtZScgPT09IG5hbWUpIG5hbWUgPSAnY2xhc3MnO1xuICAgICAgICBpZiAoJ2tleScgPT09IG5hbWUpIDsgZWxzZSBpZiAoJ3JlZicgPT09IG5hbWUpIHtcbiAgICAgICAgICAgIGlmIChvbGQpIG9sZChudWxsKTtcbiAgICAgICAgICAgIGlmICh2YWx1ZSkgdmFsdWUobm9kZSk7XG4gICAgICAgIH0gZWxzZSBpZiAoJ2NsYXNzJyA9PT0gbmFtZSAmJiAhaXNTdmcpIG5vZGUuY2xhc3NOYW1lID0gdmFsdWUgfHwgJyc7IGVsc2UgaWYgKCdzdHlsZScgPT09IG5hbWUpIHtcbiAgICAgICAgICAgIGlmICghdmFsdWUgfHwgJ3N0cmluZycgPT0gdHlwZW9mIHZhbHVlIHx8ICdzdHJpbmcnID09IHR5cGVvZiBvbGQpIG5vZGUuc3R5bGUuY3NzVGV4dCA9IHZhbHVlIHx8ICcnO1xuICAgICAgICAgICAgaWYgKHZhbHVlICYmICdvYmplY3QnID09IHR5cGVvZiB2YWx1ZSkge1xuICAgICAgICAgICAgICAgIGlmICgnc3RyaW5nJyAhPSB0eXBlb2Ygb2xkKSBmb3IgKHZhciBpIGluIG9sZCkgaWYgKCEoaSBpbiB2YWx1ZSkpIG5vZGUuc3R5bGVbaV0gPSAnJztcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpIGluIHZhbHVlKSBub2RlLnN0eWxlW2ldID0gJ251bWJlcicgPT0gdHlwZW9mIHZhbHVlW2ldICYmIElTX05PTl9ESU1FTlNJT05BTC50ZXN0KGkpID09PSAhMSA/IHZhbHVlW2ldICsgJ3B4JyA6IHZhbHVlW2ldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKCdkYW5nZXJvdXNseVNldElubmVySFRNTCcgPT09IG5hbWUpIHtcbiAgICAgICAgICAgIGlmICh2YWx1ZSkgbm9kZS5pbm5lckhUTUwgPSB2YWx1ZS5fX2h0bWwgfHwgJyc7XG4gICAgICAgIH0gZWxzZSBpZiAoJ28nID09IG5hbWVbMF0gJiYgJ24nID09IG5hbWVbMV0pIHtcbiAgICAgICAgICAgIHZhciB1c2VDYXB0dXJlID0gbmFtZSAhPT0gKG5hbWUgPSBuYW1lLnJlcGxhY2UoL0NhcHR1cmUkLywgJycpKTtcbiAgICAgICAgICAgIG5hbWUgPSBuYW1lLnRvTG93ZXJDYXNlKCkuc3Vic3RyaW5nKDIpO1xuICAgICAgICAgICAgaWYgKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFvbGQpIG5vZGUuYWRkRXZlbnRMaXN0ZW5lcihuYW1lLCBldmVudFByb3h5LCB1c2VDYXB0dXJlKTtcbiAgICAgICAgICAgIH0gZWxzZSBub2RlLnJlbW92ZUV2ZW50TGlzdGVuZXIobmFtZSwgZXZlbnRQcm94eSwgdXNlQ2FwdHVyZSk7XG4gICAgICAgICAgICAobm9kZS5fX2wgfHwgKG5vZGUuX19sID0ge30pKVtuYW1lXSA9IHZhbHVlO1xuICAgICAgICB9IGVsc2UgaWYgKCdsaXN0JyAhPT0gbmFtZSAmJiAndHlwZScgIT09IG5hbWUgJiYgIWlzU3ZnICYmIG5hbWUgaW4gbm9kZSkge1xuICAgICAgICAgICAgc2V0UHJvcGVydHkobm9kZSwgbmFtZSwgbnVsbCA9PSB2YWx1ZSA/ICcnIDogdmFsdWUpO1xuICAgICAgICAgICAgaWYgKG51bGwgPT0gdmFsdWUgfHwgdmFsdWUgPT09ICExKSBub2RlLnJlbW92ZUF0dHJpYnV0ZShuYW1lKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBucyA9IGlzU3ZnICYmIG5hbWUgIT09IChuYW1lID0gbmFtZS5yZXBsYWNlKC9eeGxpbmtcXDo/LywgJycpKTtcbiAgICAgICAgICAgIGlmIChudWxsID09IHZhbHVlIHx8IHZhbHVlID09PSAhMSkgaWYgKG5zKSBub2RlLnJlbW92ZUF0dHJpYnV0ZU5TKCdodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rJywgbmFtZS50b0xvd2VyQ2FzZSgpKTsgZWxzZSBub2RlLnJlbW92ZUF0dHJpYnV0ZShuYW1lKTsgZWxzZSBpZiAoJ2Z1bmN0aW9uJyAhPSB0eXBlb2YgdmFsdWUpIGlmIChucykgbm9kZS5zZXRBdHRyaWJ1dGVOUygnaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluaycsIG5hbWUudG9Mb3dlckNhc2UoKSwgdmFsdWUpOyBlbHNlIG5vZGUuc2V0QXR0cmlidXRlKG5hbWUsIHZhbHVlKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBmdW5jdGlvbiBzZXRQcm9wZXJ0eShub2RlLCBuYW1lLCB2YWx1ZSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgbm9kZVtuYW1lXSA9IHZhbHVlO1xuICAgICAgICB9IGNhdGNoIChlKSB7fVxuICAgIH1cbiAgICBmdW5jdGlvbiBldmVudFByb3h5KGUpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX19sW2UudHlwZV0ob3B0aW9ucy5ldmVudCAmJiBvcHRpb25zLmV2ZW50KGUpIHx8IGUpO1xuICAgIH1cbiAgICBmdW5jdGlvbiBmbHVzaE1vdW50cygpIHtcbiAgICAgICAgdmFyIGM7XG4gICAgICAgIHdoaWxlIChjID0gbW91bnRzLnBvcCgpKSB7XG4gICAgICAgICAgICBpZiAob3B0aW9ucy5hZnRlck1vdW50KSBvcHRpb25zLmFmdGVyTW91bnQoYyk7XG4gICAgICAgICAgICBpZiAoYy5jb21wb25lbnREaWRNb3VudCkgYy5jb21wb25lbnREaWRNb3VudCgpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGZ1bmN0aW9uIGRpZmYoZG9tLCB2bm9kZSwgY29udGV4dCwgbW91bnRBbGwsIHBhcmVudCwgY29tcG9uZW50Um9vdCkge1xuICAgICAgICBpZiAoIWRpZmZMZXZlbCsrKSB7XG4gICAgICAgICAgICBpc1N2Z01vZGUgPSBudWxsICE9IHBhcmVudCAmJiB2b2lkIDAgIT09IHBhcmVudC5vd25lclNWR0VsZW1lbnQ7XG4gICAgICAgICAgICBoeWRyYXRpbmcgPSBudWxsICE9IGRvbSAmJiAhKCdfX3ByZWFjdGF0dHJfJyBpbiBkb20pO1xuICAgICAgICB9XG4gICAgICAgIHZhciByZXQgPSBpZGlmZihkb20sIHZub2RlLCBjb250ZXh0LCBtb3VudEFsbCwgY29tcG9uZW50Um9vdCk7XG4gICAgICAgIGlmIChwYXJlbnQgJiYgcmV0LnBhcmVudE5vZGUgIT09IHBhcmVudCkgcGFyZW50LmFwcGVuZENoaWxkKHJldCk7XG4gICAgICAgIGlmICghLS1kaWZmTGV2ZWwpIHtcbiAgICAgICAgICAgIGh5ZHJhdGluZyA9ICExO1xuICAgICAgICAgICAgaWYgKCFjb21wb25lbnRSb290KSBmbHVzaE1vdW50cygpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGlkaWZmKGRvbSwgdm5vZGUsIGNvbnRleHQsIG1vdW50QWxsLCBjb21wb25lbnRSb290KSB7XG4gICAgICAgIHZhciBvdXQgPSBkb20sIHByZXZTdmdNb2RlID0gaXNTdmdNb2RlO1xuICAgICAgICBpZiAobnVsbCA9PSB2bm9kZSkgdm5vZGUgPSAnJztcbiAgICAgICAgaWYgKCdzdHJpbmcnID09IHR5cGVvZiB2bm9kZSkge1xuICAgICAgICAgICAgaWYgKGRvbSAmJiB2b2lkIDAgIT09IGRvbS5zcGxpdFRleHQgJiYgZG9tLnBhcmVudE5vZGUgJiYgKCFkb20uX2NvbXBvbmVudCB8fCBjb21wb25lbnRSb290KSkge1xuICAgICAgICAgICAgICAgIGlmIChkb20ubm9kZVZhbHVlICE9IHZub2RlKSBkb20ubm9kZVZhbHVlID0gdm5vZGU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG91dCA9IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKHZub2RlKTtcbiAgICAgICAgICAgICAgICBpZiAoZG9tKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChkb20ucGFyZW50Tm9kZSkgZG9tLnBhcmVudE5vZGUucmVwbGFjZUNoaWxkKG91dCwgZG9tKTtcbiAgICAgICAgICAgICAgICAgICAgcmVjb2xsZWN0Tm9kZVRyZWUoZG9tLCAhMCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb3V0Ll9fcHJlYWN0YXR0cl8gPSAhMDtcbiAgICAgICAgICAgIHJldHVybiBvdXQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCdmdW5jdGlvbicgPT0gdHlwZW9mIHZub2RlLm5vZGVOYW1lKSByZXR1cm4gYnVpbGRDb21wb25lbnRGcm9tVk5vZGUoZG9tLCB2bm9kZSwgY29udGV4dCwgbW91bnRBbGwpO1xuICAgICAgICBpc1N2Z01vZGUgPSAnc3ZnJyA9PT0gdm5vZGUubm9kZU5hbWUgPyAhMCA6ICdmb3JlaWduT2JqZWN0JyA9PT0gdm5vZGUubm9kZU5hbWUgPyAhMSA6IGlzU3ZnTW9kZTtcbiAgICAgICAgaWYgKCFkb20gfHwgIWlzTmFtZWROb2RlKGRvbSwgU3RyaW5nKHZub2RlLm5vZGVOYW1lKSkpIHtcbiAgICAgICAgICAgIG91dCA9IGNyZWF0ZU5vZGUoU3RyaW5nKHZub2RlLm5vZGVOYW1lKSwgaXNTdmdNb2RlKTtcbiAgICAgICAgICAgIGlmIChkb20pIHtcbiAgICAgICAgICAgICAgICB3aGlsZSAoZG9tLmZpcnN0Q2hpbGQpIG91dC5hcHBlbmRDaGlsZChkb20uZmlyc3RDaGlsZCk7XG4gICAgICAgICAgICAgICAgaWYgKGRvbS5wYXJlbnROb2RlKSBkb20ucGFyZW50Tm9kZS5yZXBsYWNlQ2hpbGQob3V0LCBkb20pO1xuICAgICAgICAgICAgICAgIHJlY29sbGVjdE5vZGVUcmVlKGRvbSwgITApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHZhciBmYyA9IG91dC5maXJzdENoaWxkLCBwcm9wcyA9IG91dC5fX3ByZWFjdGF0dHJfIHx8IChvdXQuX19wcmVhY3RhdHRyXyA9IHt9KSwgdmNoaWxkcmVuID0gdm5vZGUuY2hpbGRyZW47XG4gICAgICAgIGlmICghaHlkcmF0aW5nICYmIHZjaGlsZHJlbiAmJiAxID09PSB2Y2hpbGRyZW4ubGVuZ3RoICYmICdzdHJpbmcnID09IHR5cGVvZiB2Y2hpbGRyZW5bMF0gJiYgbnVsbCAhPSBmYyAmJiB2b2lkIDAgIT09IGZjLnNwbGl0VGV4dCAmJiBudWxsID09IGZjLm5leHRTaWJsaW5nKSB7XG4gICAgICAgICAgICBpZiAoZmMubm9kZVZhbHVlICE9IHZjaGlsZHJlblswXSkgZmMubm9kZVZhbHVlID0gdmNoaWxkcmVuWzBdO1xuICAgICAgICB9IGVsc2UgaWYgKHZjaGlsZHJlbiAmJiB2Y2hpbGRyZW4ubGVuZ3RoIHx8IG51bGwgIT0gZmMpIGlubmVyRGlmZk5vZGUob3V0LCB2Y2hpbGRyZW4sIGNvbnRleHQsIG1vdW50QWxsLCBoeWRyYXRpbmcgfHwgbnVsbCAhPSBwcm9wcy5kYW5nZXJvdXNseVNldElubmVySFRNTCk7XG4gICAgICAgIGRpZmZBdHRyaWJ1dGVzKG91dCwgdm5vZGUuYXR0cmlidXRlcywgcHJvcHMpO1xuICAgICAgICBpc1N2Z01vZGUgPSBwcmV2U3ZnTW9kZTtcbiAgICAgICAgcmV0dXJuIG91dDtcbiAgICB9XG4gICAgZnVuY3Rpb24gaW5uZXJEaWZmTm9kZShkb20sIHZjaGlsZHJlbiwgY29udGV4dCwgbW91bnRBbGwsIGlzSHlkcmF0aW5nKSB7XG4gICAgICAgIHZhciBqLCBjLCB2Y2hpbGQsIGNoaWxkLCBvcmlnaW5hbENoaWxkcmVuID0gZG9tLmNoaWxkTm9kZXMsIGNoaWxkcmVuID0gW10sIGtleWVkID0ge30sIGtleWVkTGVuID0gMCwgbWluID0gMCwgbGVuID0gb3JpZ2luYWxDaGlsZHJlbi5sZW5ndGgsIGNoaWxkcmVuTGVuID0gMCwgdmxlbiA9IHZjaGlsZHJlbiA/IHZjaGlsZHJlbi5sZW5ndGggOiAwO1xuICAgICAgICBpZiAoMCAhPT0gbGVuKSBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgX2NoaWxkID0gb3JpZ2luYWxDaGlsZHJlbltpXSwgcHJvcHMgPSBfY2hpbGQuX19wcmVhY3RhdHRyXywga2V5ID0gdmxlbiAmJiBwcm9wcyA/IF9jaGlsZC5fY29tcG9uZW50ID8gX2NoaWxkLl9jb21wb25lbnQuX19rIDogcHJvcHMua2V5IDogbnVsbDtcbiAgICAgICAgICAgIGlmIChudWxsICE9IGtleSkge1xuICAgICAgICAgICAgICAgIGtleWVkTGVuKys7XG4gICAgICAgICAgICAgICAga2V5ZWRba2V5XSA9IF9jaGlsZDtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvcHMgfHwgKHZvaWQgMCAhPT0gX2NoaWxkLnNwbGl0VGV4dCA/IGlzSHlkcmF0aW5nID8gX2NoaWxkLm5vZGVWYWx1ZS50cmltKCkgOiAhMCA6IGlzSHlkcmF0aW5nKSkgY2hpbGRyZW5bY2hpbGRyZW5MZW4rK10gPSBfY2hpbGQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKDAgIT09IHZsZW4pIGZvciAodmFyIGkgPSAwOyBpIDwgdmxlbjsgaSsrKSB7XG4gICAgICAgICAgICB2Y2hpbGQgPSB2Y2hpbGRyZW5baV07XG4gICAgICAgICAgICBjaGlsZCA9IG51bGw7XG4gICAgICAgICAgICB2YXIga2V5ID0gdmNoaWxkLmtleTtcbiAgICAgICAgICAgIGlmIChudWxsICE9IGtleSkge1xuICAgICAgICAgICAgICAgIGlmIChrZXllZExlbiAmJiB2b2lkIDAgIT09IGtleWVkW2tleV0pIHtcbiAgICAgICAgICAgICAgICAgICAgY2hpbGQgPSBrZXllZFtrZXldO1xuICAgICAgICAgICAgICAgICAgICBrZXllZFtrZXldID0gdm9pZCAwO1xuICAgICAgICAgICAgICAgICAgICBrZXllZExlbi0tO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoIWNoaWxkICYmIG1pbiA8IGNoaWxkcmVuTGVuKSBmb3IgKGogPSBtaW47IGogPCBjaGlsZHJlbkxlbjsgaisrKSBpZiAodm9pZCAwICE9PSBjaGlsZHJlbltqXSAmJiBpc1NhbWVOb2RlVHlwZShjID0gY2hpbGRyZW5bal0sIHZjaGlsZCwgaXNIeWRyYXRpbmcpKSB7XG4gICAgICAgICAgICAgICAgY2hpbGQgPSBjO1xuICAgICAgICAgICAgICAgIGNoaWxkcmVuW2pdID0gdm9pZCAwO1xuICAgICAgICAgICAgICAgIGlmIChqID09PSBjaGlsZHJlbkxlbiAtIDEpIGNoaWxkcmVuTGVuLS07XG4gICAgICAgICAgICAgICAgaWYgKGogPT09IG1pbikgbWluKys7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjaGlsZCA9IGlkaWZmKGNoaWxkLCB2Y2hpbGQsIGNvbnRleHQsIG1vdW50QWxsKTtcbiAgICAgICAgICAgIGlmIChjaGlsZCAmJiBjaGlsZCAhPT0gZG9tKSBpZiAoaSA+PSBsZW4pIGRvbS5hcHBlbmRDaGlsZChjaGlsZCk7IGVsc2UgaWYgKGNoaWxkICE9PSBvcmlnaW5hbENoaWxkcmVuW2ldKSBpZiAoY2hpbGQgPT09IG9yaWdpbmFsQ2hpbGRyZW5baSArIDFdKSByZW1vdmVOb2RlKG9yaWdpbmFsQ2hpbGRyZW5baV0pOyBlbHNlIGRvbS5pbnNlcnRCZWZvcmUoY2hpbGQsIG9yaWdpbmFsQ2hpbGRyZW5baV0gfHwgbnVsbCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGtleWVkTGVuKSBmb3IgKHZhciBpIGluIGtleWVkKSBpZiAodm9pZCAwICE9PSBrZXllZFtpXSkgcmVjb2xsZWN0Tm9kZVRyZWUoa2V5ZWRbaV0sICExKTtcbiAgICAgICAgd2hpbGUgKG1pbiA8PSBjaGlsZHJlbkxlbikgaWYgKHZvaWQgMCAhPT0gKGNoaWxkID0gY2hpbGRyZW5bY2hpbGRyZW5MZW4tLV0pKSByZWNvbGxlY3ROb2RlVHJlZShjaGlsZCwgITEpO1xuICAgIH1cbiAgICBmdW5jdGlvbiByZWNvbGxlY3ROb2RlVHJlZShub2RlLCB1bm1vdW50T25seSkge1xuICAgICAgICB2YXIgY29tcG9uZW50ID0gbm9kZS5fY29tcG9uZW50O1xuICAgICAgICBpZiAoY29tcG9uZW50KSB1bm1vdW50Q29tcG9uZW50KGNvbXBvbmVudCk7IGVsc2Uge1xuICAgICAgICAgICAgaWYgKG51bGwgIT0gbm9kZS5fX3ByZWFjdGF0dHJfICYmIG5vZGUuX19wcmVhY3RhdHRyXy5yZWYpIG5vZGUuX19wcmVhY3RhdHRyXy5yZWYobnVsbCk7XG4gICAgICAgICAgICBpZiAodW5tb3VudE9ubHkgPT09ICExIHx8IG51bGwgPT0gbm9kZS5fX3ByZWFjdGF0dHJfKSByZW1vdmVOb2RlKG5vZGUpO1xuICAgICAgICAgICAgcmVtb3ZlQ2hpbGRyZW4obm9kZSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZnVuY3Rpb24gcmVtb3ZlQ2hpbGRyZW4obm9kZSkge1xuICAgICAgICBub2RlID0gbm9kZS5sYXN0Q2hpbGQ7XG4gICAgICAgIHdoaWxlIChub2RlKSB7XG4gICAgICAgICAgICB2YXIgbmV4dCA9IG5vZGUucHJldmlvdXNTaWJsaW5nO1xuICAgICAgICAgICAgcmVjb2xsZWN0Tm9kZVRyZWUobm9kZSwgITApO1xuICAgICAgICAgICAgbm9kZSA9IG5leHQ7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZnVuY3Rpb24gZGlmZkF0dHJpYnV0ZXMoZG9tLCBhdHRycywgb2xkKSB7XG4gICAgICAgIHZhciBuYW1lO1xuICAgICAgICBmb3IgKG5hbWUgaW4gb2xkKSBpZiAoKCFhdHRycyB8fCBudWxsID09IGF0dHJzW25hbWVdKSAmJiBudWxsICE9IG9sZFtuYW1lXSkgc2V0QWNjZXNzb3IoZG9tLCBuYW1lLCBvbGRbbmFtZV0sIG9sZFtuYW1lXSA9IHZvaWQgMCwgaXNTdmdNb2RlKTtcbiAgICAgICAgZm9yIChuYW1lIGluIGF0dHJzKSBpZiAoISgnY2hpbGRyZW4nID09PSBuYW1lIHx8ICdpbm5lckhUTUwnID09PSBuYW1lIHx8IG5hbWUgaW4gb2xkICYmIGF0dHJzW25hbWVdID09PSAoJ3ZhbHVlJyA9PT0gbmFtZSB8fCAnY2hlY2tlZCcgPT09IG5hbWUgPyBkb21bbmFtZV0gOiBvbGRbbmFtZV0pKSkgc2V0QWNjZXNzb3IoZG9tLCBuYW1lLCBvbGRbbmFtZV0sIG9sZFtuYW1lXSA9IGF0dHJzW25hbWVdLCBpc1N2Z01vZGUpO1xuICAgIH1cbiAgICBmdW5jdGlvbiBjb2xsZWN0Q29tcG9uZW50KGNvbXBvbmVudCkge1xuICAgICAgICB2YXIgbmFtZSA9IGNvbXBvbmVudC5jb25zdHJ1Y3Rvci5uYW1lO1xuICAgICAgICAoY29tcG9uZW50c1tuYW1lXSB8fCAoY29tcG9uZW50c1tuYW1lXSA9IFtdKSkucHVzaChjb21wb25lbnQpO1xuICAgIH1cbiAgICBmdW5jdGlvbiBjcmVhdGVDb21wb25lbnQoQ3RvciwgcHJvcHMsIGNvbnRleHQpIHtcbiAgICAgICAgdmFyIGluc3QsIGxpc3QgPSBjb21wb25lbnRzW0N0b3IubmFtZV07XG4gICAgICAgIGlmIChDdG9yLnByb3RvdHlwZSAmJiBDdG9yLnByb3RvdHlwZS5yZW5kZXIpIHtcbiAgICAgICAgICAgIGluc3QgPSBuZXcgQ3Rvcihwcm9wcywgY29udGV4dCk7XG4gICAgICAgICAgICBDb21wb25lbnQuY2FsbChpbnN0LCBwcm9wcywgY29udGV4dCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpbnN0ID0gbmV3IENvbXBvbmVudChwcm9wcywgY29udGV4dCk7XG4gICAgICAgICAgICBpbnN0LmNvbnN0cnVjdG9yID0gQ3RvcjtcbiAgICAgICAgICAgIGluc3QucmVuZGVyID0gZG9SZW5kZXI7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGxpc3QpIGZvciAodmFyIGkgPSBsaXN0Lmxlbmd0aDsgaS0tOyApIGlmIChsaXN0W2ldLmNvbnN0cnVjdG9yID09PSBDdG9yKSB7XG4gICAgICAgICAgICBpbnN0Ll9fYiA9IGxpc3RbaV0uX19iO1xuICAgICAgICAgICAgbGlzdC5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gaW5zdDtcbiAgICB9XG4gICAgZnVuY3Rpb24gZG9SZW5kZXIocHJvcHMsIHN0YXRlLCBjb250ZXh0KSB7XG4gICAgICAgIHJldHVybiB0aGlzLmNvbnN0cnVjdG9yKHByb3BzLCBjb250ZXh0KTtcbiAgICB9XG4gICAgZnVuY3Rpb24gc2V0Q29tcG9uZW50UHJvcHMoY29tcG9uZW50LCBwcm9wcywgb3B0cywgY29udGV4dCwgbW91bnRBbGwpIHtcbiAgICAgICAgaWYgKCFjb21wb25lbnQuX194KSB7XG4gICAgICAgICAgICBjb21wb25lbnQuX194ID0gITA7XG4gICAgICAgICAgICBpZiAoY29tcG9uZW50Ll9fciA9IHByb3BzLnJlZikgZGVsZXRlIHByb3BzLnJlZjtcbiAgICAgICAgICAgIGlmIChjb21wb25lbnQuX19rID0gcHJvcHMua2V5KSBkZWxldGUgcHJvcHMua2V5O1xuICAgICAgICAgICAgaWYgKCFjb21wb25lbnQuYmFzZSB8fCBtb3VudEFsbCkge1xuICAgICAgICAgICAgICAgIGlmIChjb21wb25lbnQuY29tcG9uZW50V2lsbE1vdW50KSBjb21wb25lbnQuY29tcG9uZW50V2lsbE1vdW50KCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGNvbXBvbmVudC5jb21wb25lbnRXaWxsUmVjZWl2ZVByb3BzKSBjb21wb25lbnQuY29tcG9uZW50V2lsbFJlY2VpdmVQcm9wcyhwcm9wcywgY29udGV4dCk7XG4gICAgICAgICAgICBpZiAoY29udGV4dCAmJiBjb250ZXh0ICE9PSBjb21wb25lbnQuY29udGV4dCkge1xuICAgICAgICAgICAgICAgIGlmICghY29tcG9uZW50Ll9fYykgY29tcG9uZW50Ll9fYyA9IGNvbXBvbmVudC5jb250ZXh0O1xuICAgICAgICAgICAgICAgIGNvbXBvbmVudC5jb250ZXh0ID0gY29udGV4dDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghY29tcG9uZW50Ll9fcCkgY29tcG9uZW50Ll9fcCA9IGNvbXBvbmVudC5wcm9wcztcbiAgICAgICAgICAgIGNvbXBvbmVudC5wcm9wcyA9IHByb3BzO1xuICAgICAgICAgICAgY29tcG9uZW50Ll9feCA9ICExO1xuICAgICAgICAgICAgaWYgKDAgIT09IG9wdHMpIGlmICgxID09PSBvcHRzIHx8IG9wdGlvbnMuc3luY0NvbXBvbmVudFVwZGF0ZXMgIT09ICExIHx8ICFjb21wb25lbnQuYmFzZSkgcmVuZGVyQ29tcG9uZW50KGNvbXBvbmVudCwgMSwgbW91bnRBbGwpOyBlbHNlIGVucXVldWVSZW5kZXIoY29tcG9uZW50KTtcbiAgICAgICAgICAgIGlmIChjb21wb25lbnQuX19yKSBjb21wb25lbnQuX19yKGNvbXBvbmVudCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZnVuY3Rpb24gcmVuZGVyQ29tcG9uZW50KGNvbXBvbmVudCwgb3B0cywgbW91bnRBbGwsIGlzQ2hpbGQpIHtcbiAgICAgICAgaWYgKCFjb21wb25lbnQuX194KSB7XG4gICAgICAgICAgICB2YXIgcmVuZGVyZWQsIGluc3QsIGNiYXNlLCBwcm9wcyA9IGNvbXBvbmVudC5wcm9wcywgc3RhdGUgPSBjb21wb25lbnQuc3RhdGUsIGNvbnRleHQgPSBjb21wb25lbnQuY29udGV4dCwgcHJldmlvdXNQcm9wcyA9IGNvbXBvbmVudC5fX3AgfHwgcHJvcHMsIHByZXZpb3VzU3RhdGUgPSBjb21wb25lbnQuX19zIHx8IHN0YXRlLCBwcmV2aW91c0NvbnRleHQgPSBjb21wb25lbnQuX19jIHx8IGNvbnRleHQsIGlzVXBkYXRlID0gY29tcG9uZW50LmJhc2UsIG5leHRCYXNlID0gY29tcG9uZW50Ll9fYiwgaW5pdGlhbEJhc2UgPSBpc1VwZGF0ZSB8fCBuZXh0QmFzZSwgaW5pdGlhbENoaWxkQ29tcG9uZW50ID0gY29tcG9uZW50Ll9jb21wb25lbnQsIHNraXAgPSAhMTtcbiAgICAgICAgICAgIGlmIChpc1VwZGF0ZSkge1xuICAgICAgICAgICAgICAgIGNvbXBvbmVudC5wcm9wcyA9IHByZXZpb3VzUHJvcHM7XG4gICAgICAgICAgICAgICAgY29tcG9uZW50LnN0YXRlID0gcHJldmlvdXNTdGF0ZTtcbiAgICAgICAgICAgICAgICBjb21wb25lbnQuY29udGV4dCA9IHByZXZpb3VzQ29udGV4dDtcbiAgICAgICAgICAgICAgICBpZiAoMiAhPT0gb3B0cyAmJiBjb21wb25lbnQuc2hvdWxkQ29tcG9uZW50VXBkYXRlICYmIGNvbXBvbmVudC5zaG91bGRDb21wb25lbnRVcGRhdGUocHJvcHMsIHN0YXRlLCBjb250ZXh0KSA9PT0gITEpIHNraXAgPSAhMDsgZWxzZSBpZiAoY29tcG9uZW50LmNvbXBvbmVudFdpbGxVcGRhdGUpIGNvbXBvbmVudC5jb21wb25lbnRXaWxsVXBkYXRlKHByb3BzLCBzdGF0ZSwgY29udGV4dCk7XG4gICAgICAgICAgICAgICAgY29tcG9uZW50LnByb3BzID0gcHJvcHM7XG4gICAgICAgICAgICAgICAgY29tcG9uZW50LnN0YXRlID0gc3RhdGU7XG4gICAgICAgICAgICAgICAgY29tcG9uZW50LmNvbnRleHQgPSBjb250ZXh0O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29tcG9uZW50Ll9fcCA9IGNvbXBvbmVudC5fX3MgPSBjb21wb25lbnQuX19jID0gY29tcG9uZW50Ll9fYiA9IG51bGw7XG4gICAgICAgICAgICBjb21wb25lbnQuX19kID0gITE7XG4gICAgICAgICAgICBpZiAoIXNraXApIHtcbiAgICAgICAgICAgICAgICByZW5kZXJlZCA9IGNvbXBvbmVudC5yZW5kZXIocHJvcHMsIHN0YXRlLCBjb250ZXh0KTtcbiAgICAgICAgICAgICAgICBpZiAoY29tcG9uZW50LmdldENoaWxkQ29udGV4dCkgY29udGV4dCA9IGV4dGVuZChleHRlbmQoe30sIGNvbnRleHQpLCBjb21wb25lbnQuZ2V0Q2hpbGRDb250ZXh0KCkpO1xuICAgICAgICAgICAgICAgIHZhciB0b1VubW91bnQsIGJhc2UsIGNoaWxkQ29tcG9uZW50ID0gcmVuZGVyZWQgJiYgcmVuZGVyZWQubm9kZU5hbWU7XG4gICAgICAgICAgICAgICAgaWYgKCdmdW5jdGlvbicgPT0gdHlwZW9mIGNoaWxkQ29tcG9uZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBjaGlsZFByb3BzID0gZ2V0Tm9kZVByb3BzKHJlbmRlcmVkKTtcbiAgICAgICAgICAgICAgICAgICAgaW5zdCA9IGluaXRpYWxDaGlsZENvbXBvbmVudDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGluc3QgJiYgaW5zdC5jb25zdHJ1Y3RvciA9PT0gY2hpbGRDb21wb25lbnQgJiYgY2hpbGRQcm9wcy5rZXkgPT0gaW5zdC5fX2spIHNldENvbXBvbmVudFByb3BzKGluc3QsIGNoaWxkUHJvcHMsIDEsIGNvbnRleHQsICExKTsgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0b1VubW91bnQgPSBpbnN0O1xuICAgICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50Ll9jb21wb25lbnQgPSBpbnN0ID0gY3JlYXRlQ29tcG9uZW50KGNoaWxkQ29tcG9uZW50LCBjaGlsZFByb3BzLCBjb250ZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGluc3QuX19iID0gaW5zdC5fX2IgfHwgbmV4dEJhc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICBpbnN0Ll9fdSA9IGNvbXBvbmVudDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNldENvbXBvbmVudFByb3BzKGluc3QsIGNoaWxkUHJvcHMsIDAsIGNvbnRleHQsICExKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlbmRlckNvbXBvbmVudChpbnN0LCAxLCBtb3VudEFsbCwgITApO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJhc2UgPSBpbnN0LmJhc2U7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY2Jhc2UgPSBpbml0aWFsQmFzZTtcbiAgICAgICAgICAgICAgICAgICAgdG9Vbm1vdW50ID0gaW5pdGlhbENoaWxkQ29tcG9uZW50O1xuICAgICAgICAgICAgICAgICAgICBpZiAodG9Vbm1vdW50KSBjYmFzZSA9IGNvbXBvbmVudC5fY29tcG9uZW50ID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGluaXRpYWxCYXNlIHx8IDEgPT09IG9wdHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjYmFzZSkgY2Jhc2UuX2NvbXBvbmVudCA9IG51bGw7XG4gICAgICAgICAgICAgICAgICAgICAgICBiYXNlID0gZGlmZihjYmFzZSwgcmVuZGVyZWQsIGNvbnRleHQsIG1vdW50QWxsIHx8ICFpc1VwZGF0ZSwgaW5pdGlhbEJhc2UgJiYgaW5pdGlhbEJhc2UucGFyZW50Tm9kZSwgITApO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChpbml0aWFsQmFzZSAmJiBiYXNlICE9PSBpbml0aWFsQmFzZSAmJiBpbnN0ICE9PSBpbml0aWFsQ2hpbGRDb21wb25lbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGJhc2VQYXJlbnQgPSBpbml0aWFsQmFzZS5wYXJlbnROb2RlO1xuICAgICAgICAgICAgICAgICAgICBpZiAoYmFzZVBhcmVudCAmJiBiYXNlICE9PSBiYXNlUGFyZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBiYXNlUGFyZW50LnJlcGxhY2VDaGlsZChiYXNlLCBpbml0aWFsQmFzZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXRvVW5tb3VudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluaXRpYWxCYXNlLl9jb21wb25lbnQgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlY29sbGVjdE5vZGVUcmVlKGluaXRpYWxCYXNlLCAhMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHRvVW5tb3VudCkgdW5tb3VudENvbXBvbmVudCh0b1VubW91bnQpO1xuICAgICAgICAgICAgICAgIGNvbXBvbmVudC5iYXNlID0gYmFzZTtcbiAgICAgICAgICAgICAgICBpZiAoYmFzZSAmJiAhaXNDaGlsZCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgY29tcG9uZW50UmVmID0gY29tcG9uZW50LCB0ID0gY29tcG9uZW50O1xuICAgICAgICAgICAgICAgICAgICB3aGlsZSAodCA9IHQuX191KSAoY29tcG9uZW50UmVmID0gdCkuYmFzZSA9IGJhc2U7XG4gICAgICAgICAgICAgICAgICAgIGJhc2UuX2NvbXBvbmVudCA9IGNvbXBvbmVudFJlZjtcbiAgICAgICAgICAgICAgICAgICAgYmFzZS5fY29tcG9uZW50Q29uc3RydWN0b3IgPSBjb21wb25lbnRSZWYuY29uc3RydWN0b3I7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCFpc1VwZGF0ZSB8fCBtb3VudEFsbCkgbW91bnRzLnVuc2hpZnQoY29tcG9uZW50KTsgZWxzZSBpZiAoIXNraXApIHtcbiAgICAgICAgICAgICAgICBmbHVzaE1vdW50cygpO1xuICAgICAgICAgICAgICAgIGlmIChjb21wb25lbnQuY29tcG9uZW50RGlkVXBkYXRlKSBjb21wb25lbnQuY29tcG9uZW50RGlkVXBkYXRlKHByZXZpb3VzUHJvcHMsIHByZXZpb3VzU3RhdGUsIHByZXZpb3VzQ29udGV4dCk7XG4gICAgICAgICAgICAgICAgaWYgKG9wdGlvbnMuYWZ0ZXJVcGRhdGUpIG9wdGlvbnMuYWZ0ZXJVcGRhdGUoY29tcG9uZW50KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChudWxsICE9IGNvbXBvbmVudC5fX2gpIHdoaWxlIChjb21wb25lbnQuX19oLmxlbmd0aCkgY29tcG9uZW50Ll9faC5wb3AoKS5jYWxsKGNvbXBvbmVudCk7XG4gICAgICAgICAgICBpZiAoIWRpZmZMZXZlbCAmJiAhaXNDaGlsZCkgZmx1c2hNb3VudHMoKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBmdW5jdGlvbiBidWlsZENvbXBvbmVudEZyb21WTm9kZShkb20sIHZub2RlLCBjb250ZXh0LCBtb3VudEFsbCkge1xuICAgICAgICB2YXIgYyA9IGRvbSAmJiBkb20uX2NvbXBvbmVudCwgb3JpZ2luYWxDb21wb25lbnQgPSBjLCBvbGREb20gPSBkb20sIGlzRGlyZWN0T3duZXIgPSBjICYmIGRvbS5fY29tcG9uZW50Q29uc3RydWN0b3IgPT09IHZub2RlLm5vZGVOYW1lLCBpc093bmVyID0gaXNEaXJlY3RPd25lciwgcHJvcHMgPSBnZXROb2RlUHJvcHModm5vZGUpO1xuICAgICAgICB3aGlsZSAoYyAmJiAhaXNPd25lciAmJiAoYyA9IGMuX191KSkgaXNPd25lciA9IGMuY29uc3RydWN0b3IgPT09IHZub2RlLm5vZGVOYW1lO1xuICAgICAgICBpZiAoYyAmJiBpc093bmVyICYmICghbW91bnRBbGwgfHwgYy5fY29tcG9uZW50KSkge1xuICAgICAgICAgICAgc2V0Q29tcG9uZW50UHJvcHMoYywgcHJvcHMsIDMsIGNvbnRleHQsIG1vdW50QWxsKTtcbiAgICAgICAgICAgIGRvbSA9IGMuYmFzZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmIChvcmlnaW5hbENvbXBvbmVudCAmJiAhaXNEaXJlY3RPd25lcikge1xuICAgICAgICAgICAgICAgIHVubW91bnRDb21wb25lbnQob3JpZ2luYWxDb21wb25lbnQpO1xuICAgICAgICAgICAgICAgIGRvbSA9IG9sZERvbSA9IG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjID0gY3JlYXRlQ29tcG9uZW50KHZub2RlLm5vZGVOYW1lLCBwcm9wcywgY29udGV4dCk7XG4gICAgICAgICAgICBpZiAoZG9tICYmICFjLl9fYikge1xuICAgICAgICAgICAgICAgIGMuX19iID0gZG9tO1xuICAgICAgICAgICAgICAgIG9sZERvbSA9IG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzZXRDb21wb25lbnRQcm9wcyhjLCBwcm9wcywgMSwgY29udGV4dCwgbW91bnRBbGwpO1xuICAgICAgICAgICAgZG9tID0gYy5iYXNlO1xuICAgICAgICAgICAgaWYgKG9sZERvbSAmJiBkb20gIT09IG9sZERvbSkge1xuICAgICAgICAgICAgICAgIG9sZERvbS5fY29tcG9uZW50ID0gbnVsbDtcbiAgICAgICAgICAgICAgICByZWNvbGxlY3ROb2RlVHJlZShvbGREb20sICExKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZG9tO1xuICAgIH1cbiAgICBmdW5jdGlvbiB1bm1vdW50Q29tcG9uZW50KGNvbXBvbmVudCkge1xuICAgICAgICBpZiAob3B0aW9ucy5iZWZvcmVVbm1vdW50KSBvcHRpb25zLmJlZm9yZVVubW91bnQoY29tcG9uZW50KTtcbiAgICAgICAgdmFyIGJhc2UgPSBjb21wb25lbnQuYmFzZTtcbiAgICAgICAgY29tcG9uZW50Ll9feCA9ICEwO1xuICAgICAgICBpZiAoY29tcG9uZW50LmNvbXBvbmVudFdpbGxVbm1vdW50KSBjb21wb25lbnQuY29tcG9uZW50V2lsbFVubW91bnQoKTtcbiAgICAgICAgY29tcG9uZW50LmJhc2UgPSBudWxsO1xuICAgICAgICB2YXIgaW5uZXIgPSBjb21wb25lbnQuX2NvbXBvbmVudDtcbiAgICAgICAgaWYgKGlubmVyKSB1bm1vdW50Q29tcG9uZW50KGlubmVyKTsgZWxzZSBpZiAoYmFzZSkge1xuICAgICAgICAgICAgaWYgKGJhc2UuX19wcmVhY3RhdHRyXyAmJiBiYXNlLl9fcHJlYWN0YXR0cl8ucmVmKSBiYXNlLl9fcHJlYWN0YXR0cl8ucmVmKG51bGwpO1xuICAgICAgICAgICAgY29tcG9uZW50Ll9fYiA9IGJhc2U7XG4gICAgICAgICAgICByZW1vdmVOb2RlKGJhc2UpO1xuICAgICAgICAgICAgY29sbGVjdENvbXBvbmVudChjb21wb25lbnQpO1xuICAgICAgICAgICAgcmVtb3ZlQ2hpbGRyZW4oYmFzZSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNvbXBvbmVudC5fX3IpIGNvbXBvbmVudC5fX3IobnVsbCk7XG4gICAgfVxuICAgIGZ1bmN0aW9uIENvbXBvbmVudChwcm9wcywgY29udGV4dCkge1xuICAgICAgICB0aGlzLl9fZCA9ICEwO1xuICAgICAgICB0aGlzLmNvbnRleHQgPSBjb250ZXh0O1xuICAgICAgICB0aGlzLnByb3BzID0gcHJvcHM7XG4gICAgICAgIHRoaXMuc3RhdGUgPSB0aGlzLnN0YXRlIHx8IHt9O1xuICAgIH1cbiAgICBmdW5jdGlvbiByZW5kZXIodm5vZGUsIHBhcmVudCwgbWVyZ2UpIHtcbiAgICAgICAgcmV0dXJuIGRpZmYobWVyZ2UsIHZub2RlLCB7fSwgITEsIHBhcmVudCwgITEpO1xuICAgIH1cbiAgICB2YXIgb3B0aW9ucyA9IHt9O1xuICAgIHZhciBzdGFjayA9IFtdO1xuICAgIHZhciBFTVBUWV9DSElMRFJFTiA9IFtdO1xuICAgIHZhciBJU19OT05fRElNRU5TSU9OQUwgPSAvYWNpdHxleCg/OnN8Z3xufHB8JCl8cnBofG93c3xtbmN8bnR3fGluZVtjaF18em9vfF5vcmQvaTtcbiAgICB2YXIgaXRlbXMgPSBbXTtcbiAgICB2YXIgbW91bnRzID0gW107XG4gICAgdmFyIGRpZmZMZXZlbCA9IDA7XG4gICAgdmFyIGlzU3ZnTW9kZSA9ICExO1xuICAgIHZhciBoeWRyYXRpbmcgPSAhMTtcbiAgICB2YXIgY29tcG9uZW50cyA9IHt9O1xuICAgIGV4dGVuZChDb21wb25lbnQucHJvdG90eXBlLCB7XG4gICAgICAgIHNldFN0YXRlOiBmdW5jdGlvbihzdGF0ZSwgY2FsbGJhY2spIHtcbiAgICAgICAgICAgIHZhciBzID0gdGhpcy5zdGF0ZTtcbiAgICAgICAgICAgIGlmICghdGhpcy5fX3MpIHRoaXMuX19zID0gZXh0ZW5kKHt9LCBzKTtcbiAgICAgICAgICAgIGV4dGVuZChzLCAnZnVuY3Rpb24nID09IHR5cGVvZiBzdGF0ZSA/IHN0YXRlKHMsIHRoaXMucHJvcHMpIDogc3RhdGUpO1xuICAgICAgICAgICAgaWYgKGNhbGxiYWNrKSAodGhpcy5fX2ggPSB0aGlzLl9faCB8fCBbXSkucHVzaChjYWxsYmFjayk7XG4gICAgICAgICAgICBlbnF1ZXVlUmVuZGVyKHRoaXMpO1xuICAgICAgICB9LFxuICAgICAgICBmb3JjZVVwZGF0ZTogZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICAgICAgICAgIGlmIChjYWxsYmFjaykgKHRoaXMuX19oID0gdGhpcy5fX2ggfHwgW10pLnB1c2goY2FsbGJhY2spO1xuICAgICAgICAgICAgcmVuZGVyQ29tcG9uZW50KHRoaXMsIDIpO1xuICAgICAgICB9LFxuICAgICAgICByZW5kZXI6IGZ1bmN0aW9uKCkge31cbiAgICB9KTtcbiAgICB2YXIgcHJlYWN0ID0ge1xuICAgICAgICBoOiBoLFxuICAgICAgICBjcmVhdGVFbGVtZW50OiBoLFxuICAgICAgICBjbG9uZUVsZW1lbnQ6IGNsb25lRWxlbWVudCxcbiAgICAgICAgQ29tcG9uZW50OiBDb21wb25lbnQsXG4gICAgICAgIHJlbmRlcjogcmVuZGVyLFxuICAgICAgICByZXJlbmRlcjogcmVyZW5kZXIsXG4gICAgICAgIG9wdGlvbnM6IG9wdGlvbnNcbiAgICB9O1xuICAgIGlmICgndW5kZWZpbmVkJyAhPSB0eXBlb2YgbW9kdWxlKSBtb2R1bGUuZXhwb3J0cyA9IHByZWFjdDsgZWxzZSBzZWxmLnByZWFjdCA9IHByZWFjdDtcbn0oKTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPXByZWFjdC5qcy5tYXAiLCJyZXF1aXJlKCcuL3BvbHlmaWxscy5qcycpO1xuY29uc3Rcblx0UmVhY3QgPSByZXF1aXJlKCdwcmVhY3QnKSxcblx0RmlsZVNhdmVyID0gcmVxdWlyZSgnZmlsZS1zYXZlcicpLFxuXHRGaWxlT3BlbmVyID0gcmVxdWlyZSgnLi9jb21wb25lbnRzL0ZpbGVPcGVuZXIuanMnKSxcblxuXHRBcHBNZW51ID0gcmVxdWlyZSgnLi9jb21wb25lbnRzL0FwcE1lbnUuanMnKSxcblx0V2VhdmVWaWV3ID0gcmVxdWlyZSgnLi9jb21wb25lbnRzL1dlYXZlVmlldy5qcycpLFxuXHROb3RlRWRpdG9yID0gcmVxdWlyZSgnLi9jb21wb25lbnRzL05vdGVFZGl0b3IuanMnKSxcblxuXHRCaW5kID0gcmVxdWlyZSgnLi9iaW5kLmpzJyksXG5cdExaVyA9IHJlcXVpcmUoJ2x6LXN0cmluZycpLFxuXHRTb3VyY2UgPSByZXF1aXJlKCcuL1NvdXJjZXJ5LmpzJyksXG5cdEFjdGlvbnMgPSByZXF1aXJlKCcuL2FjdGlvbnMuanMnKSxcblx0U3R5bGUgPSB7XG5cdFx0YXBwOiAnd2lkdGg6IDEwMHZ3OycsXG5cdFx0bWVudUJ1dHRvbjoge1xuXHRcdFx0ekluZGV4OiAyMixcblx0XHRcdG1pbkhlaWdodDogJzIuNXJlbScsXG5cdFx0XHRwYWRkaW5nOiAnMC41cmVtIDAuNzVyZW0nLFxuXHRcdFx0d2lkdGg6ICc3cmVtJyxcblx0XHRcdHBvc2l0aW9uOiAnZml4ZWQnLFxuXHRcdFx0bGVmdDogMCxcblxuXHRcdFx0b3V0bGluZTogJ25vbmUnLFxuXHRcdFx0YmFja2dyb3VuZENvbG9yOiAnIzAwMDAwMCcsXG5cblx0XHRcdGJvcmRlcjogJ25vbmUnLFxuXHRcdFx0Ym9yZGVyQm90dG9tOiAndGhpbiBzb2xpZCAjNzc3JyxcblxuXHRcdFx0Y29sb3I6ICcjZmZmJyxcblx0XHRcdGZvbnRTaXplOiAnMS4ycmVtJyxcblxuXHRcdFx0Y3Vyc29yOiAncG9pbnRlcidcblx0XHR9XG5cdH07XG5cbmNsYXNzIEFwcCBleHRlbmRzIFJlYWN0LkNvbXBvbmVudCB7XG5cdGNvbnN0cnVjdG9yKHByb3BzLCBjb250ZXh0KSB7XG5cdFx0c3VwZXIocHJvcHMsIGNvbnRleHQpO1xuXG5cdFx0dGhpcy5zdGF0ZSA9IHtcblxuXHRcdFx0aXNFZGl0aW5nOiBmYWxzZSxcblx0XHRcdHRhcmdldE5vdGU6IHVuZGVmaW5lZCxcblx0XHRcdG5vdGVDb29yZHM6IHVuZGVmaW5lZCxcblxuXHRcdFx0bWVudU9wZW46IGZhbHNlLFxuXHRcdFx0bWVudU9mZnNldDogJzByZW0nLFxuXHRcdFx0bWVudUdyb3VwczogW10sXG5cdFx0XHRtZW51QnV0dG9uOiB7fSxcblxuXHRcdFx0cHJvamVjdDogU291cmNlLmdldExvY2FsKCd3ZWF2ZS1wcm9qZWN0JyksXG5cdFx0XHRzdG9yZTogU291cmNlLmdldExvY2FsKCd3ZWF2ZS1zdG9yZScpXG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMuc3RhdGUucHJvamVjdCkgdGhpcy5zdGF0ZS5wcm9qZWN0ID0gSlNPTi5wYXJzZSh0aGlzLnN0YXRlLnByb2plY3QpO1xuXHRcdGVsc2UgdGhpcy5zdGF0ZS5wcm9qZWN0ID0geyB0aXRsZTogJ1dlbGNvbWUgdG8gV2VhdmUnLCB3b3JkQ291bnQ6IDQsIHNjZW5lQ291bnQ6IDF9XG5cblx0XHRpZiAodGhpcy5zdGF0ZS5zdG9yZSkgdGhpcy5zdGF0ZS5zdG9yZSA9IEpTT04ucGFyc2UoTFpXLmRlY29tcHJlc3NGcm9tVVRGMTYodGhpcy5zdGF0ZS5zdG9yZSkpO1xuXHRcdGVsc2UgdGhpcy5zdGF0ZS5zdG9yZSA9IHtcblx0XHRcdHNjZW5lczogW3tkYXRldGltZTogJzE5OTktMTAtMjYnLCBub3RlczogW3sgdGhyZWFkOiAwLCBoZWFkOiAnV2VsY29tZSB0byBXZWF2ZSEnLCBib2R5OiAnVGhpcyBpcyB0aGUgcGxhY2UhJywgd2M6IDQgfV0gfV0sXG5cdFx0XHR0aHJlYWRzOiBbeyBjb2xvcjogJyMwMGNjNjYnLCBuYW1lOiAnQmFycnkgQWxsZW4nfV0sXG5cdFx0XHRsb2NhdGlvbnM6IFsnU3RhciBMYWJzJ11cblx0XHR9O1xuXG5cdFx0QmluZCh0aGlzKTtcblxuXHRcdHRoaXMuc3RhdGUucHJvamVjdCA9IE9iamVjdC5hc3NpZ24oe3RpdGxlOiB0aGlzLnN0YXRlLnByb2plY3QudGl0bGV9LCB0aGlzLmNvdW50UHJvamVjdCgpKTtcblx0XHR0aGlzLnN0YXRlLm1lbnVCdXR0b24gPSB0aGlzLnByb2plY3RCdXR0b24oKTtcblx0XHR0aGlzLnN0YXRlLm1lbnVHcm91cHMgPSB0aGlzLnByb2plY3RNZXRhKCk7XG5cdH1cblxuXHRjb3VudFByb2plY3QoKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdHdvcmRDb3VudDogdGhpcy5zdGF0ZS5zdG9yZS5zY2VuZXMucmVkdWNlKCh3Yywgc2xpY2UpID0+IFxuXHRcdFx0XHQod2MgKyBzbGljZS5ub3Rlcy5yZWR1Y2UoKHdjLCBub3RlKSA9PiAoKG5vdGUpID8gKHdjICsgbm90ZS53YykgOiB3YyksIDApKVxuXHRcdFx0LCAwKSxcblx0XHRcdHNjZW5lQ291bnQ6IHRoaXMuc3RhdGUuc3RvcmUuc2NlbmVzLnJlZHVjZSgoc2NlbmVzLCBzbGljZSkgPT4gXG5cdFx0XHRcdChzY2VuZXMgKyBzbGljZS5ub3Rlcy5yZWR1Y2UoKHNjZW5lcywgbm90ZSkgPT4gKChub3RlKSA/IChzY2VuZXMgKyAxKSA6IHNjZW5lcyksIDApKVxuXHRcdFx0LCAwKVxuXHRcdH07XG5cdH1cblxuXHRjb21wb25lbnREaWRNb3VudCgpIHtcblx0XHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncmVzaXplJywgdGhpcy5vblJlc2l6ZSk7XG5cdH1cblxuXHRjb21wb25lbnRXaWxsVW5tb3VudCgpIHtcblx0XHR3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcigncmVzaXplJywgdGhpcy5vblJlc2l6ZSk7XG5cdH1cblxuXHRyZW5kZXIocHJvcHMsIHN0YXRlKSB7XG5cdFx0dmFyIGNoaWxkcmVuID0gW1xuXHRcdFx0PEZpbGVPcGVuZXJcblx0XHRcdFx0cmVmPXsoZWwpID0+ICh0aGlzLkZpbGVPcGVuZXIgPSBlbC5iYXNlKX1cblx0XHRcdFx0b25DaGFuZ2U9e3RoaXMub3BlblByb2plY3R9XG5cdFx0XHQvPlxuXHRcdF07XG5cblx0XHRpZiAoc3RhdGUubWVudU9wZW4pIHtcblx0XHRcdGNoaWxkcmVuLnB1c2goXG5cdFx0XHRcdDxBcHBNZW51XG5cdFx0XHRcdFx0Z3JvdXBzPXtzdGF0ZS5tZW51R3JvdXBzfVxuXHRcdFx0XHRcdHJlZj17KGVsKSA9PiB7XG5cdFx0XHRcdFx0XHRpZiAoZWwgJiYgZWwuYmFzZS5jbGllbnRIZWlnaHQgIT0gdGhpcy5zdGF0ZS5tZW51T2Zmc2V0KSB0aGlzLnNldFN0YXRlKHsgbWVudU9mZnNldDogZWwuYmFzZS5jbGllbnRIZWlnaHQgfSk7XG5cdFx0XHRcdFx0fX1cblx0XHRcdFx0Lz5cblx0XHRcdCk7XG5cdFx0XHRpZiAoc3RhdGUubWVudUJ1dHRvbikgY2hpbGRyZW4ucHVzaChcblx0XHRcdFx0PGJ1dHRvblxuXHRcdFx0XHRcdHN0eWxlPXtPYmplY3QuYXNzaWduKHt0b3A6IHN0YXRlLm1lbnVPZmZzZXQsIG1hcmdpblRvcDogJzFweCd9LCBTdHlsZS5tZW51QnV0dG9uKX1cblx0XHRcdFx0XHRvbkNsaWNrPXsoZSkgPT4ge1xuXHRcdFx0XHRcdFx0aWYgKHN0YXRlLm1lbnVCdXR0b24ub25DbGljaykgc3RhdGUubWVudUJ1dHRvbi5vbkNsaWNrKGUpXG5cdFx0XHRcdFx0XHR0aGlzLnNldFN0YXRlKHsgbWVudU9wZW46IGZhbHNlLCBtZW51T2Zmc2V0OiAnMHJlbScgfSk7XG5cdFx0XHRcdFx0fX1cblx0XHRcdFx0PlxuXHRcdFx0XHRcdHtzdGF0ZS5tZW51QnV0dG9uLm9wZW5lZC52YWx1ZX1cblx0XHRcdFx0PC9idXR0b24+XG5cdFx0XHQpO1xuXHRcdH0gZWxzZSBjaGlsZHJlbi5wdXNoKFxuXHRcdFx0PGJ1dHRvblxuXHRcdFx0XHRzdHlsZT17T2JqZWN0LmFzc2lnbih7dG9wOiAnMHJlbSd9LCBTdHlsZS5tZW51QnV0dG9uKX1cblx0XHRcdFx0b25DbGljaz17KGUpID0+IHtcblx0XHRcdFx0XHRpZiAoc3RhdGUubWVudUJ1dHRvbi5jbG9zZWQub25DbGljaykgc3RhdGUubWVudUJ1dHRvbi5jbG9zZWQub25DbGljayhlKVxuXHRcdFx0XHRcdHRoaXMuc2V0U3RhdGUoeyBtZW51T3BlbjogdHJ1ZSwgbWVudU9mZnNldDogJzIuNXJlbScgfSk7XG5cdFx0XHRcdH19XG5cdFx0XHQ+XG5cdFx0XHRcdHtzdGF0ZS5tZW51QnV0dG9uLmNsb3NlZC52YWx1ZX1cblx0XHRcdDwvYnV0dG9uPlxuXHRcdCk7XG5cblx0XHRjaGlsZHJlbi5wdXNoKHN0YXRlLmlzRWRpdGluZyA/XG5cdFx0XHQ8Tm90ZUVkaXRvclxuXHRcdFx0XHRtZW51T2Zmc2V0PXtzdGF0ZS5tZW51T2Zmc2V0fVxuXHRcdFx0XHRub3RlPXtzdGF0ZS50YXJnZXROb3RlfVxuXHRcdFx0XHRjb29yZHM9e3N0YXRlLm5vdGVDb29yZHN9XG5cdFx0XHRcdHRocmVhZD17c3RhdGUuc3RvcmUudGhyZWFkc1tzdGF0ZS50YXJnZXROb3RlLnRocmVhZF19XG5cdFx0XHRcdG1lbnU9e3RoaXMubGF5b3V0TWVudX1cblx0XHRcdFx0b25Eb25lPXt0aGlzLm9uRG9uZX1cblx0XHRcdC8+XG5cdFx0OlxuXHRcdFx0PFdlYXZlVmlld1xuXHRcdFx0XHRtZW51T2Zmc2V0PXtzdGF0ZS5tZW51T2Zmc2V0fVxuXHRcdFx0XHRzY2VuZXM9e3N0YXRlLnN0b3JlLnNjZW5lc31cblx0XHRcdFx0dGhyZWFkcz17c3RhdGUuc3RvcmUudGhyZWFkc31cblx0XHRcdFx0bG9jYXRpb25zPXtzdGF0ZS5zdG9yZS5sb2NhdGlvbnN9XG5cdFx0XHRcdG1lbnU9e3RoaXMubGF5b3V0TWVudX1cblx0XHRcdFx0ZWRpdE5vdGU9e3RoaXMuZWRpdE5vdGV9XG5cdFx0XHRcdHdpbmRvd1dpZHRoPXt3aW5kb3cuaW5uZXJXaWR0aH1cblx0XHRcdC8+XG5cdFx0KTtcblxuXHRcdHJldHVybiAoXG5cdFx0XHQ8ZGl2IGlkPVwiYXBwXCIgc3R5bGU9e1N0eWxlLmFwcH0+XG5cdFx0XHRcdHtjaGlsZHJlbn1cblx0XHRcdDwvZGl2PlxuXHRcdCk7XG5cdH1cblxuXHRlZGl0Tm90ZShjb29yZHMpIHtcblx0XHR0aGlzLnNldFN0YXRlKHtcblx0XHRcdGlzRWRpdGluZzogdHJ1ZSxcblx0XHRcdG5vdGVDb29yZHM6IGNvb3Jkcyxcblx0XHRcdHRhcmdldE5vdGU6IHRoaXMuc3RhdGUuc3RvcmUuc2NlbmVzW2Nvb3Jkcy5zbGljZUluZGV4XS5ub3Rlc1tjb29yZHMubm90ZUluZGV4XSxcblx0XHRcdG1lbnVPcGVuOiB0cnVlIFxuXHRcdH0pO1xuXHR9XG5cblx0cHJvamVjdEJ1dHRvbigpIHtcblx0XHRyZXR1cm4gQXBwTWVudS5tYWluKEFwcE1lbnUudGV4dCgnZG9uZScpLCBBcHBNZW51LnRleHQodGhpcy5zdGF0ZS5wcm9qZWN0LnRpdGxlLmxlbmd0aCA/IHRoaXMuc3RhdGUucHJvamVjdC50aXRsZSA6ICdQcm9qZWN0JykpO1xuXHR9XG5cblx0cHJvamVjdE1ldGEoKSB7XG5cdFx0cmV0dXJuIFtcblx0XHRcdFtcblx0XHRcdFx0QXBwTWVudS5pbnB1dCgnUHJvamVjdCBUaXRsZScsIHRoaXMuc3RhdGUucHJvamVjdC50aXRsZSwgKGV2ZW50KSA9PiB7XG5cdFx0XHRcdFx0dGhpcy5zdGF0ZS5wcm9qZWN0LnRpdGxlID0gZXZlbnQudGFyZ2V0LnZhbHVlO1xuXHRcdFx0XHRcdHRoaXMuc2V0U3RhdGUoeyBtZW51R3JvdXBzOiB0aGlzLnByb2plY3RNZXRhKGV2ZW50LnRhcmdldC52YWx1ZSksIG1lbnVCdXR0b246IHRoaXMucHJvamVjdEJ1dHRvbigpIH0pO1xuXHRcdFx0XHRcdHRoaXMuc2F2ZVByb2plY3QoKTtcblx0XHRcdFx0fSlcblx0XHRcdF0sW1xuXHRcdFx0XHRBcHBNZW51LnRleHQodGhpcy5zdGF0ZS5wcm9qZWN0LnNjZW5lQ291bnQgKyAnIHNjZW5lcycpLFxuXHRcdFx0XHRBcHBNZW51LnRleHQodGhpcy5zdGF0ZS5wcm9qZWN0LndvcmRDb3VudCArICcgd29yZHMnKVxuXHRcdFx0XSxbXG5cdFx0XHRcdEFwcE1lbnUuYnRuKCdpbXBvcnQnLCAoZXZlbnQpID0+IHRoaXMuRmlsZU9wZW5lci5jbGljaygpKSxcblx0XHRcdFx0QXBwTWVudS5idG4oJ2V4cG9ydCcsIChldmVudCkgPT4gRmlsZVNhdmVyLnNhdmVBcyhuZXcgQmxvYihbSlNPTi5zdHJpbmdpZnkoT2JqZWN0LmFzc2lnbih7fSwgdGhpcy5zdGF0ZS5wcm9qZWN0LCB0aGlzLnN0YXRlLnN0b3JlKSldLCB7dHlwZTogXCJ0ZXh0L3BsYWluO2NoYXJzZXQ9dXRmLThcIn0pLCB0aGlzLnN0YXRlLnByb2plY3QudGl0bGUgKyAnLndlYXZlJykpLFxuXHRcdFx0XHRBcHBNZW51LmJ0bigncHJpbnQnLCAoZXZlbnQpID0+IGNvbnNvbGUubG9nKFwiVE9ETyFcIikpXG5cdFx0XHRdLFxuXHRcdFx0W0FwcE1lbnUuZGVsZXRlQnRuKHRoaXMuZGVsZXRlKV1cblx0XHRdO1xuXHR9XG5cblx0b25SZXNpemUoKSB7XG5cdFx0dGhpcy5mb3JjZVVwZGF0ZSgpO1xuXHR9XG5cblx0b25Eb25lKCkge1xuXHRcdHRoaXMuc2V0U3RhdGUoe1xuXHRcdFx0dGFyZ2V0Tm90ZTogbnVsbCxcblx0XHRcdG5vdGVDb29yZHM6IG51bGwsXG5cdFx0XHRpc0VkaXRpbmc6IGZhbHNlLFxuXHRcdFx0bWVudU9wZW46IGZhbHNlLFxuXHRcdFx0bWVudUJ1dHRvbjogdGhpcy5wcm9qZWN0QnV0dG9uKCksXG5cdFx0XHRtZW51R3JvdXBzOiB0aGlzLnByb2plY3RNZXRhKCksXG5cdFx0XHRtZW51T2Zmc2V0OiAnMHJlbScgXG5cdFx0fSk7XG5cdH1cblxuXHRkbyhhY3Rpb24sIGRhdGEpIHtcblx0XHR0aGlzLnN0YXRlLnN0b3JlID0gQWN0aW9uc1thY3Rpb25dKGRhdGEsIHRoaXMuc3RhdGUuc3RvcmUpO1xuXHRcdHRoaXMuc3RhdGUucHJvamVjdCA9IE9iamVjdC5hc3NpZ24oe30sIHRoaXMuc3RhdGUucHJvamVjdCwgdGhpcy5jb3VudFByb2plY3QoKSk7XG5cdFx0dGhpcy5zZXRTdGF0ZSh7XG5cdFx0XHRtZW51R3JvdXBzOiAodGhpcy5zdGF0ZS5tZW51R3JvdXBzWzBdWzBdLm9uSW5wdXQpID8gdGhpcy5wcm9qZWN0TWV0YSgpIDogdGhpcy5zdGF0ZS5tZW51R3JvdXBzXG5cdFx0fSk7XG5cdFx0dGhpcy5zYXZlKCk7XG5cdH1cblxuXHRkZWxldGUoKSB7XG5cdFx0dGhpcy5zdGF0ZS5wcm9qZWN0ID0ge1xuXHRcdFx0dGl0bGU6ICdQcm9qZWN0IFRpdGxlJyxcblx0XHRcdHdvcmRDb3VudDogMCxcblx0XHRcdHNjZW5lQ291bnQ6IDBcblx0XHR9O1xuXHRcdHRoaXMuc2V0U3RhdGUoe1xuXHRcdFx0bWVudU9wZW46IGZhbHNlLFxuXHRcdFx0bWVudUJ1dHRvbjogdGhpcy5wcm9qZWN0QnV0dG9uKCksXG5cdFx0XHRtZW51R3JvdXBzOiB0aGlzLnByb2plY3RNZXRhKCksXG5cdFx0XHRtZW51T2Zmc2V0OiAnMHJlbScsXG5cdFx0XHRzdG9yZToge1xuXHRcdFx0XHRzY2VuZXM6IFt7ZGF0ZXRpbWU6ICcnLCBub3RlczogW251bGxdIH1dLFxuXHRcdFx0XHR0aHJlYWRzOiBbe25hbWU6ICcnLCBjb2xvcjogJyNmNjAnfV0sXG5cdFx0XHRcdGxvY2F0aW9uczogWycnXVxuXHRcdFx0fVxuXHRcdH0pO1xuXHRcdHRoaXMuc2F2ZSgpO1xuXHR9XG5cblx0b3BlblByb2plY3QoZGF0YSkge1xuXG5cdFx0ZGF0YSA9IEpTT04ucGFyc2UoZGF0YSk7XG5cdFx0dGhpcy5zdGF0ZS5wcm9qZWN0ID0geyB0aXRsZTogZGF0YS50aXRsZSwgd29yZENvdW50OiBkYXRhLndvcmRDb3VudCwgc2NlbmVDb3VudDogZGF0YS5zY2VuZUNvdW50IH07XG5cdFx0dGhpcy5zdGF0ZS5zdG9yZSA9IHsgc2NlbmVzOiBkYXRhLnNjZW5lcywgdGhyZWFkczogZGF0YS50aHJlYWRzLCBsb2NhdGlvbnM6IGRhdGEubG9jYXRpb25zIH07XG5cdFx0dGhpcy5zZXRTdGF0ZSh7XG5cdFx0XHRtZW51T3BlbjogZmFsc2UsXG5cdFx0XHRtZW51QnV0dG9uOiB0aGlzLnByb2plY3RCdXR0b24oKSxcblx0XHRcdG1lbnVHcm91cHM6IHRoaXMucHJvamVjdE1ldGEoKSxcblx0XHRcdG1lbnVPZmZzZXQ6ICcwcmVtJyxcblx0XHR9KVxuXHRcdHRoaXMuc2F2ZSgpO1xuXHR9XG5cblx0c2F2ZSgpIHtcblx0XHR0aGlzLnNhdmVQcm9qZWN0KCk7XG5cdFx0dGhpcy5zYXZlU3RvcmUoKTtcblx0fVxuXG5cdHNhdmVQcm9qZWN0KCkge1xuXHRcdFNvdXJjZS5zZXRMb2NhbCgnd2VhdmUtcHJvamVjdCcsIEpTT04uc3RyaW5naWZ5KHRoaXMuc3RhdGUucHJvamVjdCkpO1xuXHR9XG5cblx0c2F2ZVN0b3JlKCkge1xuXHRcdFNvdXJjZS5zZXRMb2NhbCgnd2VhdmUtc3RvcmUnLCBMWlcuY29tcHJlc3NUb1VURjE2KEpTT04uc3RyaW5naWZ5KHRoaXMuc3RhdGUuc3RvcmUpKSk7XG5cdH1cblxuXHRnZXRDaGlsZENvbnRleHQoKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGRvOiB0aGlzLmRvLFxuXHRcdFx0dXNlTWVudTogKG1lbnVCdXR0b24sIG1lbnVHcm91cHMpID0+IHRoaXMuc2V0U3RhdGUoeyBtZW51T3BlbjogdHJ1ZSwgbWVudUJ1dHRvbjogbWVudUJ1dHRvbiwgbWVudUdyb3VwczogbWVudUdyb3VwcywgbWVudU9mZnNldDogJzIuNXJlbScgfSksXG5cdFx0XHRyZWxlYXNlTWVudTogKCkgPT4gdGhpcy5zZXRTdGF0ZSh7IG1lbnVPcGVuOiBmYWxzZSwgbWVudUJ1dHRvbjogdGhpcy5wcm9qZWN0QnV0dG9uKCksIG1lbnVHcm91cHM6IHRoaXMucHJvamVjdE1ldGEoKSwgbWVudU9mZnNldDogJzByZW0nIH0pLFxuXHRcdFx0bW9kYWw6IChjb250ZW50cykgPT4gdGhpcy5zZXRTdGF0ZSh7IG1vZGFsOiBjb250ZW50cyB9KVxuXHRcdH07XG5cdH1cbn1cblxuUmVhY3Qub3B0aW9ucy5kZWJvdW5jZVJlbmRlcmluZyA9IHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWU7XG5cblJlYWN0LnJlbmRlcig8QXBwLz4sIGRvY3VtZW50LmJvZHkpOyIsIm1vZHVsZS5leHBvcnRzID0ge1xuXHQvKmdldDogZnVuY3Rpb24oa2V5KSB7XG5cblx0fSxcblx0c2V0OiBmdW5jdGlvbihrZXksIHZhbHVlKSB7XG5cblx0fSwqL1xuXHRjaGVja1N0YXR1czogZnVuY3Rpb24oc2VydmVyVVJMKSB7XG5cdFx0dmFyIHN0YXR1cyA9IHtcblx0XHRcdGxvY2FsOiBmYWxzZSxcblx0XHRcdG9ubGluZTogZmFsc2Vcblx0XHR9XG5cdFx0Ly8gY2hlY2sgaWYgbG9jYWxTdG9yYWdlIGV4aXN0c1xuXHRcdHRyeSB7XG5cdFx0XHR3aW5kb3cubG9jYWxTdG9yYWdlLnNldEl0ZW0oJ2NoZWNrU3RhdHVzJywgJ2EnKTtcblx0XHRcdHdpbmRvdy5sb2NhbFN0b3JhZ2UuZ2V0SXRlbSgnY2hlY2tTdGF0dXMnKTtcblx0XHRcdHdpbmRvdy5sb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbSgnY2hlY2tTdGF0dXMnKTtcblx0XHRcdHN0YXR1cy5sb2NhbCA9IHRydWU7XG5cdFx0fSBjYXRjaChlKSB7fVxuXHRcdC8vIGNoZWNrIGlmIG9ubGluZVxuXHRcdHN0YXR1cy5vbmxpbmUgPSB3aW5kb3cubmF2aWdhdG9yLm9uTGluZTtcblxuXHRcdHJldHVybiBzdGF0dXM7XG5cdH0sXG5cdGdldExvY2FsOiBmdW5jdGlvbihrZXkpIHtcblx0XHRyZXR1cm4gd2luZG93LmxvY2FsU3RvcmFnZS5nZXRJdGVtKGtleSk7XG5cdH0sXG5cdHNldExvY2FsOiBmdW5jdGlvbihrZXksIHZhbHVlKSB7XG5cdFx0dmFyIHN1Y2Nlc3MgPSB0cnVlO1xuXHRcdGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkKSB3aW5kb3cubG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oa2V5KTtcblx0XHRlbHNlIHRyeSB7XG5cdFx0XHR3aW5kb3cubG9jYWxTdG9yYWdlLnNldEl0ZW0oa2V5LCB2YWx1ZSk7XG5cdFx0fSBjYXRjaCAoZSkgeyAvLyBsb2NhbFN0b3JhZ2UgaXMgZnVsbFxuXHRcdFx0c3VjY2VzcyA9IGZhbHNlO1xuXHRcdH1cblx0XHRyZXR1cm4gc3VjY2Vzcztcblx0fVxufTsiLCJtb2R1bGUuZXhwb3J0cyA9IHtcbi8vIFNMSUNFIEFDVElPTlNcblx0TkVXX1NMSUNFOiBmdW5jdGlvbihhY3Rpb24sIHN0b3JlKSB7XG5cdFx0c3RvcmUuc2NlbmVzID0gT2JqZWN0LmFzc2lnbihbXSwgc3RvcmUuc2NlbmVzKTtcblx0XHRzdG9yZS5zY2VuZXMuc3BsaWNlKGFjdGlvbi5hdEluZGV4LCAwLCB7XG5cdFx0XHRkYXRldGltZTogJycsXG5cdFx0XHRub3Rlczogc3RvcmUubG9jYXRpb25zLm1hcCgoKT0+bnVsbClcblx0XHR9KTtcblx0XHRyZXR1cm4gc3RvcmU7XG5cdH0sXG5cdERFTEVURV9TTElDRTogZnVuY3Rpb24oYWN0aW9uLCBzdG9yZSkge1xuXHRcdHN0b3JlLnNjZW5lcyA9IE9iamVjdC5hc3NpZ24oW10sIHN0b3JlLnNjZW5lcyk7XG5cdFx0YWN0aW9uLnNsaWNlID0gc3RvcmUuc2NlbmVzLnNwbGljZShhY3Rpb24uYXRJbmRleCwgMSk7XG5cdFx0cmV0dXJuIHN0b3JlO1xuXHR9LFxuXHRNT0RJRllfU0xJQ0VfREFURTogZnVuY3Rpb24oYWN0aW9uLCBzdG9yZSkge1xuXHRcdHN0b3JlLnNjZW5lcyA9IE9iamVjdC5hc3NpZ24oW10sIHN0b3JlLnNjZW5lcyk7XG5cdFx0c3RvcmUuc2NlbmVzW2FjdGlvbi5hdEluZGV4XS5kYXRldGltZSA9IGFjdGlvbi5uZXdEYXRlO1xuXHRcdHJldHVybiBzdG9yZTtcblx0fSxcblxuLy8gTk9URSBBQ1RJT05TXG5cdE5FV19OT1RFOiBmdW5jdGlvbihhY3Rpb24sIHN0b3JlKSB7XG5cdFx0c3RvcmUuc2NlbmVzID0gT2JqZWN0LmFzc2lnbihbXSwgc3RvcmUuc2NlbmVzKTtcblx0XHRzdG9yZS5zY2VuZXNbYWN0aW9uLnNsaWNlSW5kZXhdLm5vdGVzLnNwbGljZShhY3Rpb24ubm90ZUluZGV4LCAxLCB7XG5cdFx0XHR0aHJlYWQ6IDAsXG5cdFx0XHRoZWFkOiAnJyxcblx0XHRcdGJvZHk6ICcnLFxuXHRcdFx0d2M6IDBcblx0XHR9KTtcblx0XHRyZXR1cm4gc3RvcmU7XG5cdH0sXG5cdERFTEVURV9OT1RFOiBmdW5jdGlvbihhY3Rpb24sIHN0b3JlKSB7XG5cdFx0c3RvcmUuc2NlbmVzID0gT2JqZWN0LmFzc2lnbihbXSwgc3RvcmUuc2NlbmVzKTtcblx0XHRzdG9yZS5zY2VuZXNbYWN0aW9uLnNsaWNlSW5kZXhdLm5vdGVzW2FjdGlvbi5ub3RlSW5kZXhdID0gbnVsbDtcblx0XHRyZXR1cm4gc3RvcmU7XG5cdH0sXG5cdE1PRElGWV9OT1RFX0hFQUQ6IGZ1bmN0aW9uKGFjdGlvbiwgc3RvcmUpIHtcblx0XHRzdG9yZS5zY2VuZXMgPSBPYmplY3QuYXNzaWduKFtdLCBzdG9yZS5zY2VuZXMpO1xuXHRcdHN0b3JlLnNjZW5lc1thY3Rpb24uc2xpY2VJbmRleF0ubm90ZXNbYWN0aW9uLm5vdGVJbmRleF0uaGVhZCA9IGFjdGlvbi5uZXdIZWFkO1xuXHRcdHJldHVybiBzdG9yZTtcblx0fSxcblx0TU9ESUZZX05PVEVfQk9EWTogZnVuY3Rpb24oYWN0aW9uLCBzdG9yZSkge1xuXHRcdHN0b3JlLnNjZW5lcyA9IE9iamVjdC5hc3NpZ24oW10sIHN0b3JlLnNjZW5lcyk7XG5cdFx0dmFyIG5vdGUgPSBzdG9yZS5zY2VuZXNbYWN0aW9uLnNsaWNlSW5kZXhdLm5vdGVzW2FjdGlvbi5ub3RlSW5kZXhdO1xuXHRcdG5vdGUuYm9keSA9IGFjdGlvbi5uZXdCb2R5O1xuXHRcdG5vdGUud2MgPSBhY3Rpb24ud2M7XG5cdFx0cmV0dXJuIHN0b3JlO1xuXHR9LFxuXG4vLyBMT0NBVElPTiBBQ1RJT05TXG5cdE5FV19MT0NBVElPTjogZnVuY3Rpb24oYWN0aW9uLCBzdG9yZSkge1xuXHRcdHZhciBpID0gc3RvcmUuc2NlbmVzLmxlbmd0aDtcblx0XHRzdG9yZS5sb2NhdGlvbnMgPSBPYmplY3QuYXNzaWduKFtdLCBzdG9yZS5sb2NhdGlvbnMpO1xuXHRcdHN0b3JlLnNjZW5lcyA9IE9iamVjdC5hc3NpZ24oW10sIHN0b3JlLnNjZW5lcyk7XG5cdFx0c3RvcmUubG9jYXRpb25zLnB1c2goJycpO1xuXHRcdHdoaWxlIChpLS0pIHN0b3JlLnNjZW5lc1tpXS5ub3Rlcy5wdXNoKG51bGwpO1xuXHRcdHJldHVybiBzdG9yZTtcblx0fSxcblx0REVMRVRFX0xPQ0FUSU9OOiBmdW5jdGlvbihhY3Rpb24sIHN0b3JlKSB7XG5cdFx0dmFyIGkgPSBzdG9yZS5zY2VuZXMubGVuZ3RoO1xuXHRcdHN0b3JlLmxvY2F0aW9ucyA9IE9iamVjdC5hc3NpZ24oW10sIHN0b3JlLmxvY2F0aW9ucyk7XG5cdFx0c3RvcmUuc2NlbmVzID0gT2JqZWN0LmFzc2lnbihbXSwgc3RvcmUuc2NlbmVzKTtcblx0XHRhY3Rpb24ubG9jYXRpb24gPSBzdG9yZS5sb2NhdGlvbnMuc3BsaWNlKGFjdGlvbi5hdEluZGV4LCAxKTtcblx0XHR3aGlsZSAoaS0tKSBzdG9yZS5zY2VuZXNbaV0ubm90ZXMuc3BsaWNlKGFjdGlvbi5hdEluZGV4LCAxKTtcblx0XHRyZXR1cm4gc3RvcmU7XG5cdH0sXG5cdE1PVkVfTE9DQVRJT046IGZ1bmN0aW9uKGFjdGlvbiwgc3RvcmUpIHtcblx0XHR2YXIgaSA9IHN0b3JlLnNjZW5lcy5sZW5ndGgsIG5vdGVzO1xuXHRcdHN0b3JlLmxvY2F0aW9ucyA9IE9iamVjdC5hc3NpZ24oW10sIHN0b3JlLmxvY2F0aW9ucyk7XG5cdFx0c3RvcmUuc2NlbmVzID0gT2JqZWN0LmFzc2lnbihbXSwgc3RvcmUuc2NlbmVzKTtcblx0XHRzdG9yZS5sb2NhdGlvbnMuc3BsaWNlKGFjdGlvbi50b0luZGV4LCAwLCBzdG9yZS5sb2NhdGlvbnMuc3BsaWNlKGFjdGlvbi5mcm9tSW5kZXgsIDEpKTtcblx0XHR3aGlsZSAoaS0tKSB7XG5cdFx0XHRub3RlcyA9IHN0b3JlLnNjZW5lc1tpXS5ub3Rlc1xuXHRcdFx0bm90ZXMuc3BsaWNlKGFjdGlvbi50b0luZGV4LCAwLCBub3Rlcy5zcGxpY2UoYWN0aW9uLmZyb21JbmRleCwgMSkpO1xuXHRcdH1cblx0XHRyZXR1cm4gc3RvcmU7XG5cdH0sXG5cdE1PRElGWV9MT0NBVElPTl9OQU1FOiBmdW5jdGlvbihhY3Rpb24sIHN0b3JlKSB7XG5cdFx0c3RvcmUubG9jYXRpb25zID0gT2JqZWN0LmFzc2lnbihbXSwgc3RvcmUubG9jYXRpb25zKTtcblx0XHRzdG9yZS5sb2NhdGlvbnNbYWN0aW9uLmF0SW5kZXhdID0gYWN0aW9uLm5ld05hbWU7XG5cdFx0cmV0dXJuIHN0b3JlO1xuXHR9LFxuXG4vLyBUSFJFQUQgQUNUSU9OU1xuXHRORVdfVEhSRUFEOiBmdW5jdGlvbihhY3Rpb24sIHN0b3JlKSB7XG5cdFx0c3RvcmUudGhyZWFkLnB1c2goe1xuXHRcdFx0Y29sb3I6ICcjZmZmZmZmJyxcblx0XHRcdG5hbWU6ICdUaHJlYWQnXG5cdFx0fSk7XG5cdFx0cmV0dXJuIHN0b3JlO1xuXHR9LFxuXHRERUxFVEVfVEhSRUFEOiBmdW5jdGlvbihhY3Rpb24sIHN0b3JlKSB7XG5cdFx0c3RvcmUuc3BsaWNlKGFjdGlvbi5hdEluZGV4LCAxKTtcblx0XHRyZXR1cm4gc3RvcmU7XG5cdH0sXG5cdE1PRElGWV9USFJFQURfQ09MT1I6IGZ1bmN0aW9uKGFjdGlvbiwgc3RvcmUpIHtcblx0XHRzdG9yZS50aHJlYWRbYWN0aW9uLmF0SW5kZXhdLmNvbG9yID0gYWN0aW9uLm5ld0NvbG9yO1xuXHRcdHJldHVybiBzdG9yZTtcblx0fSxcbn07IiwiLy8gY29udmVuaWVuY2UgbWV0aG9kXG4vLyBiaW5kcyBldmVyeSBmdW5jdGlvbiBpbiBpbnN0YW5jZSdzIHByb3RvdHlwZSB0byB0aGUgaW5zdGFuY2UgaXRzZWxmXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGluc3RhbmNlKSB7XG5cdHZhciBwcm90byA9IGluc3RhbmNlLmNvbnN0cnVjdG9yLnByb3RvdHlwZSxcblx0XHRrZXlzID0gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMocHJvdG8pLFxuXHRcdGtleTtcblx0d2hpbGUgKGtleSA9IGtleXMucG9wKCkpIGlmICh0eXBlb2YgcHJvdG9ba2V5XSA9PT0gJ2Z1bmN0aW9uJyAmJiBrZXkgIT09ICdjb25zdHJ1Y3RvcicpIGluc3RhbmNlW2tleV0gPSBpbnN0YW5jZVtrZXldLmJpbmQoaW5zdGFuY2UpO1xufSIsImNvbnN0XG5cdFJlYWN0ID0gcmVxdWlyZSgncHJlYWN0JyksXG5cblx0U3R5bGUgPSB7XG5cdFx0dG9vbGJhcjoge1xuXHRcdFx0ekluZGV4OiAnMjAnLFxuXHRcdFx0cG9zaXRpb246ICdmaXhlZCcsXG5cdFx0XHR0b3A6ICcwJyxcblx0XHRcdGxlZnQ6ICcwJyxcblx0XHRcdHJpZ2h0OiAnMCcsXG5cblx0XHRcdHdpZHRoOiAnMTAwJScsXG5cdFx0XHRib3JkZXI6ICdub25lJyxcblx0XHRcdGJvcmRlckJvdHRvbTogJ3RoaW4gc29saWQgIzc3NycsXG5cblx0XHRcdGJhY2tncm91bmRDb2xvcjogJyMwMDAwMDAnLFxuXG5cdFx0XHRjb2xvcjogJyNmZmYnXG5cdFx0fSxcblx0XHRtZW51OiB7XG5cdFx0XHR3aWR0aDogJzEwMCUnLFxuXG5cdFx0XHRkaXNwbGF5OiAnZmxleCcsXG5cdFx0XHRmbGV4V3JhcDogJ3dyYXAnLFxuXHRcdFx0anVzdGlmeUNvbnRlbnQ6ICdzcGFjZS1iZXR3ZWVuJ1xuXHRcdH0sXG5cdFx0dWw6IHtcblx0XHRcdGRpc3BsYXk6ICdmbGV4Jyxcblx0XHRcdGp1c3RpZnlDb250ZW50OiAnc3BhY2UtYmV0d2VlbicsXG5cdFx0XHRhbGlnbkl0ZW1zOiAnY2VudGVyJyxcblxuXHRcdFx0bGlzdFN0eWxlOiAnbm9uZSdcblx0XHR9LFxuXHRcdGxpOiB7XG5cdFx0XHRkaXNwbGF5OiAnaW5saW5lLWZsZXgnLFxuXHRcdFx0anVzdGlmeUNvbnRlbnQ6ICdjZW50ZXInLFxuXHRcdFx0YWxpZ25JdGVtczogJ2NlbnRlcicsXG5cdFx0XHRtYXJnaW46ICcwIDAuNXJlbSdcblx0XHR9LFxuXHRcdGl0ZW06IHtcblx0XHRcdGhlaWdodDogJzIuNXJlbScsXG5cdFx0XHRwYWRkaW5nOiAnMCAwLjc1cmVtJyxcblxuXHRcdFx0Ym9yZGVyOiAnbm9uZScsXG5cdFx0XHRvdXRsaW5lOiAnbm9uZScsXG5cdFx0XHRiYWNrZ3JvdW5kQ29sb3I6ICcjMDAwMDAwJyxcblxuXHRcdFx0Y29sb3I6ICcjZmZmJyxcblx0XHRcdGZvbnRTaXplOiAnMS4ycmVtJyxcblxuXHRcdFx0Y3Vyc29yOiAncG9pbnRlcidcblx0XHR9LFxuXHRcdGltZzoge1xuXHRcdFx0d2lkdGg6ICcxLjJyZW0nLFxuXHRcdFx0aGVpZ2h0OiAnMS4ycmVtJ1xuXHRcdH0sXG5cdFx0c3Bhbjoge1xuXHRcdFx0cGFkZGluZ1RvcDogJzFyZW0nLFxuXHRcdFx0aGVpZ2h0OiAnMnJlbSdcblx0XHR9LFxuXHRcdHRleHQ6IHtcblx0XHRcdGZvbnRTaXplOiAnMXJlbSdcblx0XHR9LFxuXHRcdGlucHV0OiB7XG5cdFx0XHRoZWlnaHQ6ICcycmVtJyxcblx0XHRcdG1heFdpZHRoOiAnOTV2dycsXG5cdFx0XHRwYWRkaW5nOiAnMCAwLjc1cmVtJyxcblx0XHRcdGJvcmRlcjogJ25vbmUnLFxuXHRcdFx0Ym9yZGVyQm90dG9tOiAndGhpbiBzb2xpZCAjZmZmJyxcblx0XHRcdG91dGxpbmU6ICdub25lJyxcblx0XHRcdGJhY2tncm91bmRDb2xvcjogJyMwMDAnLFxuXHRcdFx0Zm9udFNpemU6ICcxLjJyZW0nLFxuXHRcdFx0Y29sb3I6ICcjZmZmJ1xuXHRcdH1cblx0fTtcblxuZnVuY3Rpb24gTWVhc3VyZVRleHQodGV4dCkge1xuXHR2YXIgd2lkZSA9IHRleHQubWF0Y2goL1tXTV0vZyksXG5cdFx0dGhpbiA9IHRleHQubWF0Y2goL1tJdHJsaWohLiBdL2cpO1xuXG5cdFx0d2lkZSA9IHdpZGUgPyB3aWRlLmxlbmd0aCA6IDA7XG5cdFx0dGhpbiA9IHRoaW4gPyB0aGluLmxlbmd0aCA6IDA7XG5cblx0cmV0dXJuICh0ZXh0Lmxlbmd0aCArIHdpZGUgKiAxLjIgLSB0aGluICogMC4zKTtcbn1cblxuZnVuY3Rpb24gQXBwTWVudShwcm9wcywgc3RhdGUpIHtcblx0cmV0dXJuIChcblx0XHQ8ZGl2IFxuXHRcdFx0aWQ9XCJ0b29sYmFyXCJcblx0XHRcdHN0eWxlPXtTdHlsZS50b29sYmFyfVxuXHRcdD5cdFxuXHRcdFx0PG1lbnUgXG5cdFx0XHRcdHR5cGU9XCJ0b29sYmFyXCJcblx0XHRcdFx0c3R5bGU9e1N0eWxlLm1lbnV9XG5cdFx0XHRcdHJlZj17cHJvcHMucmVmfVxuXHRcdFx0PlxuXHRcdFx0XHR7cHJvcHMuZ3JvdXBzLm1hcCgoZ3JvdXApID0+XG5cdFx0XHRcdFx0PHVsIHN0eWxlPXtTdHlsZS51bH0+XG5cdFx0XHRcdFx0XHR7Z3JvdXAubWFwKChpdGVtKSA9PiB7XG5cdFx0XHRcdFx0XHQvLyBCVVRUT04gSVRFTVxuXHRcdFx0XHRcdFx0XHRpZiAoaXRlbS5vbkNsaWNrIHx8IGl0ZW0ub25Ib2xkKSByZXR1cm4gKFxuXHRcdFx0XHRcdFx0XHRcdDxsaSBzdHlsZT17U3R5bGUubGl9PlxuXHRcdFx0XHRcdFx0XHRcdFx0PGJ1dHRvblxuXHRcdFx0XHRcdFx0XHRcdFx0XHRzdHlsZT17aXRlbS5zdHlsZSA/IE9iamVjdC5hc3NpZ24oe30sIFN0eWxlLml0ZW0sIGl0ZW0uc3R5bGUpIDogU3R5bGUuaXRlbX1cblx0XHRcdFx0XHRcdFx0XHRcdFx0b25DbGljaz17KGUpID0+IHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRlLnRhcmdldC5zdHlsZS5jb2xvciA9IGl0ZW0uc3R5bGUgPyBpdGVtLnN0eWxlLmNvbG9yIHx8IFwiI2ZmZlwiIDogJyNmZmYnO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGlmIChpdGVtLm9uQ2xpY2spIGl0ZW0ub25DbGljayhlKTtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRpZiAoaXRlbS50aW1lcikge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0Y2xlYXJUaW1lb3V0KGl0ZW0udGltZXIpO1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0aXRlbS50aW1lciA9IHVuZGVmaW5lZDtcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0XHRcdH19XG5cdFx0XHRcdFx0XHRcdFx0XHRcdG9uTW91c2VEb3duPXsoZSkgPT4ge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGUudGFyZ2V0LnN0eWxlLmNvbG9yID0gXCIjNzc3XCI7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0aWYgKGl0ZW0ub25Ib2xkKSBpdGVtLnRpbWVyID0gc2V0VGltZW91dChpdGVtLm9uSG9sZCwgMTAwMCwgZSk7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdH19XG5cdFx0XHRcdFx0XHRcdFx0XHRcdG5hbWU9e2l0ZW0ubmFtZX0+XG5cdFx0XHRcdFx0XHRcdFx0XHRcdHtpdGVtLmljb24gP1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdDxpbWdcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdHN0eWxlPXtTdHlsZS5pbWd9XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRzcmM9e2l0ZW0uaWNvbn1cblx0XHRcdFx0XHRcdFx0XHRcdFx0XHQvPlxuXHRcdFx0XHRcdFx0XHRcdFx0XHQ6XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0aXRlbS52YWx1ZVxuXHRcdFx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0XHQ8L2J1dHRvbj5cblx0XHRcdFx0XHRcdFx0XHQ8L2xpPlxuXHRcdFx0XHRcdFx0XHQpO1xuXHRcdFx0XHRcdFx0Ly8gVEVYVCBJTlBVVCBJVEVNXG5cdFx0XHRcdFx0XHRcdGlmIChpdGVtLm9uSW5wdXQpIHJldHVybiAoXG5cdFx0XHRcdFx0XHRcdFx0PGxpIHN0eWxlPXtTdHlsZS5saX0+XG5cdFx0XHRcdFx0XHRcdFx0XHQ8aW5wdXRcblx0XHRcdFx0XHRcdFx0XHRcdFx0c3R5bGU9e2l0ZW0uc3R5bGUgPyBPYmplY3QuYXNzaWduKHt9LCBTdHlsZS5pbnB1dCwgaXRlbS5zdHlsZSkgOiBTdHlsZS5pbnB1dH1cblx0XHRcdFx0XHRcdFx0XHRcdFx0dHlwZT1cInRleHRcIlxuXHRcdFx0XHRcdFx0XHRcdFx0XHRwbGFjZWhvbGRlcj17aXRlbS5wbGFjZWhvbGRlcn1cblx0XHRcdFx0XHRcdFx0XHRcdFx0bWF4TGVuZ3RoPXs0MH1cblx0XHRcdFx0XHRcdFx0XHRcdFx0c2l6ZT17TWF0aC5tYXgoTWVhc3VyZVRleHQoaXRlbS52YWx1ZS5sZW5ndGggPyBpdGVtLnZhbHVlIDogKHByb3BzLnBsYWNlaG9sZGVyIHx8ICcnKSksIDIwKX1cblx0XHRcdFx0XHRcdFx0XHRcdFx0b25JbnB1dD17aXRlbS5vbklucHV0fVxuXHRcdFx0XHRcdFx0XHRcdFx0XHR2YWx1ZT17aXRlbS52YWx1ZX1cblx0XHRcdFx0XHRcdFx0XHRcdC8+XG5cdFx0XHRcdFx0XHRcdFx0PC9saT5cblxuXHRcdFx0XHRcdFx0XHQpO1xuXHRcdFx0XHRcdFx0Ly8gVEVYVCBJVEVNXG5cdFx0XHRcdFx0XHRcdHJldHVybiAoXG5cdFx0XHRcdFx0XHRcdFx0PGxpIHN0eWxlPXtPYmplY3QuYXNzaWduKHt9LCBTdHlsZS5saSwgU3R5bGUudGV4dCwgaXRlbS5zdHlsZSA/IGl0ZW0uc3R5bGUgOiB7fSl9PlxuXHRcdFx0XHRcdFx0XHRcdFx0PHNwYW4gc3R5bGU9e1N0eWxlLnNwYW59PntpdGVtLnZhbHVlfTwvc3Bhbj5cblx0XHRcdFx0XHRcdFx0XHQ8L2xpPlxuXHRcdFx0XHRcdFx0XHQpO1xuXHRcdFx0XHRcdFx0fSl9XG5cdFx0XHRcdFx0PC91bD5cblx0XHRcdFx0KX1cblx0XHRcdDwvbWVudT5cblx0XHQ8L2Rpdj5cblx0KVxufTtcblxuQXBwTWVudS5tYWluID0gKG8sIGMpID0+ICh7XG5cdG9wZW5lZDogbyxcblx0Y2xvc2VkOiBjXG59KTtcblxuQXBwTWVudS5pbnB1dCA9IChwLCB2LCBmLCBzKSA9PiAoeyBwbGFjZWhvbGRlcjogcCwgdmFsdWU6IHYsIG9uSW5wdXQ6IGYsIHN0eWxlOiBzID8gcyA6IHVuZGVmaW5lZCB9KTtcblxuQXBwTWVudS50ZXh0ID0gKHYsIHMpID0+ICh7IHZhbHVlOiB2LCBzdHlsZTogcyA/IHMgOiB1bmRlZmluZWQgfSk7XG5cbkFwcE1lbnUuYnRuID0gKHYsIGYsIHMpID0+ICh7IHZhbHVlOiB2LCBvbkNsaWNrOiBmLCBzdHlsZTogcyA/IHMgOiB1bmRlZmluZWQgfSk7XG5cbkFwcE1lbnUuZGVsZXRlQnRuID0gKGYpID0+ICh7XG5cdHZhbHVlOiAnZGVsZXRlJyxcblx0c3R5bGU6IHtjb2xvcjogJyNmMDAnLCB0cmFuc2l0aW9uOiAnY29sb3IgMXMnfSxcblx0b25Ib2xkOiBmXG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBBcHBNZW51OyIsImNvbnN0XG5cdFJlYWN0ID0gcmVxdWlyZSgncHJlYWN0JyksXG5cblx0U3R5bGUgPSB7XG5cdFx0ZWRpdEJveDoge1xuXHRcdFx0b3V0bGluZTogJ25vbmUnLFxuXHRcdFx0Ym9yZGVyOiAnbm9uZScsXG5cdFx0XHRvdmVyZmxvdzogJ2hpZGRlbicsXG5cdFx0XHRyZXNpemU6ICdub25lJ1xuXHRcdH1cblx0fTtcblxuY2xhc3MgRXhwYW5kaW5nVGV4dGFyZWEgZXh0ZW5kcyBSZWFjdC5Db21wb25lbnQge1xuXHRjb25zdHJ1Y3Rvcihwcm9wcywgY29udGV4dCkge1xuXHRcdHN1cGVyKHByb3BzLCBjb250ZXh0KTtcblx0XHR0aGlzLnN0YXRlID0ge1xuXHRcdFx0c3R5bGU6IE9iamVjdC5hc3NpZ24oe30sIFN0eWxlLmVkaXRCb3gsIHsgaGVpZ2h0OiBwcm9wcy5iYXNlSGVpZ2h0IH0pXG5cdFx0fTtcblxuXHRcdHRoaXMub25JbnB1dCA9IHRoaXMub25JbnB1dC5iaW5kKHRoaXMpO1xuXHRcdHRoaXMuZG9SZXNpemUgPSB0aGlzLmRvUmVzaXplLmJpbmQodGhpcyk7XG5cdFx0dGhpcy5yZXNpemUgPSB0aGlzLnJlc2l6ZS5iaW5kKHRoaXMpO1xuXHR9XG5cblx0cmVuZGVyKHByb3BzLCBzdGF0ZSkge1xuXHRcdHZhciBzdHlsZSA9IE9iamVjdC5hc3NpZ24oe30sIHByb3BzLnN0eWxlLCBzdGF0ZS5zdHlsZSk7XG5cdFx0cmV0dXJuIChcblx0XHRcdDx0ZXh0YXJlYVxuXHRcdFx0XHRzdHlsZT17c3R5bGV9XG5cdFx0XHRcdG1heGxlbmd0aD17cHJvcHMubWF4bGVuZ3RofVxuXHRcdFx0XHRwbGFjZWhvbGRlcj17cHJvcHMucGxhY2Vob2xkZXJ9XG5cdFx0XHRcdG9uSW5wdXQ9e3RoaXMub25JbnB1dH1cblx0XHRcdFx0b25DaGFuZ2U9e3Byb3BzLmNoYW5nZX1cblx0XHRcdFx0b25Gb2N1cz17cHJvcHMuZm9jdXN9XG5cdFx0XHRcdG9uQmx1cj17cHJvcHMuYmx1cn1cblx0XHRcdC8+XG5cdFx0KVxuXHR9XG5cblx0Y29tcG9uZW50RGlkTW91bnQoKSB7XG5cdFx0dGhpcy5iYXNlLnZhbHVlID0gKHRoaXMucHJvcHMudmFsdWUgIT09IHVuZGVmaW5lZCkgPyB0aGlzLnByb3BzLnZhbHVlIDogXCJObyBkZWZhdWx0IHZhbHVlIHNldC4uLlwiO1xuXHRcdHRoaXMuZG9SZXNpemUoKTtcblx0XHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncmVzaXplJywgdGhpcy5kb1Jlc2l6ZSk7XG5cdH1cblxuXHRjb21wb25lbnRXaWxsVW5tb3VudCgpIHtcblx0XHR3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcigncmVzaXplJywgdGhpcy5kb1Jlc2l6ZSk7XG5cdH1cblxuXHRvbklucHV0KGV2ZW50KSB7XG5cdFx0aWYgKHRoaXMucHJvcHMuaW5wdXQpIHRoaXMucHJvcHMuaW5wdXQoZXZlbnQpO1xuXHRcdHRoaXMuZG9SZXNpemUoKTtcblx0fVxuXG5cdGRvUmVzaXplKCkge1xuXHRcdHRoaXMuc3RhdGUuc3R5bGUuaGVpZ2h0ID0gdGhpcy5wcm9wcy5iYXNlSGVpZ2h0O1xuXHRcdHRoaXMuZm9yY2VVcGRhdGUodGhpcy5yZXNpemUpO1xuXHR9XG5cblx0cmVzaXplKCkge1xuXHRcdHRoaXMuc3RhdGUuc3R5bGUuaGVpZ2h0ID0gdGhpcy5iYXNlLnNjcm9sbEhlaWdodCArICdweCc7XG5cdFx0dGhpcy5mb3JjZVVwZGF0ZSgpO1xuXG5cdH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBFeHBhbmRpbmdUZXh0YXJlYTsiLCJjb25zdFxuXHRSZWFjdCA9IHJlcXVpcmUoJ3ByZWFjdCcpLFxuXHRSZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHByb3BzKSB7XG5cdHJldHVybiAoXG5cdFx0PGlucHV0XG5cdFx0XHR0eXBlPVwiZmlsZVwiXG5cdFx0XHRhY2NlcHQ9XCIud2VhdmVcIlxuXHRcdFx0c3R5bGU9e3tcblx0XHRcdFx0cG9zaXRpb246ICdhYnNvbHV0ZScsXG5cdFx0XHRcdHZpc2liaWxpdHk6ICdoaWRkZW4nLFxuXHRcdFx0XHR0b3A6ICctNTAnLFxuXHRcdFx0XHRsZWZ0OiAnLTUwJ1xuXHRcdFx0fX1cblx0XHRcdG9uY2hhbmdlPXsoZSkgPT4ge1xuXHRcdFx0XHRSZWFkZXIub25sb2FkZW5kID0gKCkgPT4gXG5cdFx0XHRcdFx0cHJvcHMub25DaGFuZ2UoUmVhZGVyLnJlc3VsdCk7XG5cdFx0XHRcdFJlYWRlci5yZWFkQXNUZXh0KGUudGFyZ2V0LmZpbGVzWzBdKTtcblx0XHRcdH19XG5cdFx0Lz5cblx0KTtcbn0iLCJjb25zdFxuXHRSZWFjdCA9IHJlcXVpcmUoJ3ByZWFjdCcpLFxuXG5cdEV4cGFuZGluZ1RleHRhcmVhID0gcmVxdWlyZSgnLi9FeHBhbmRpbmdUZXh0YXJlYS5qcycpLFxuXG5cdEJpbmQgPSByZXF1aXJlKCcuLi9iaW5kLmpzJyksXG5cdFN0eWxlID0ge1xuXHRcdGxvY2F0aW9uSGVhZGVyOiB7XG5cdFx0XHR6SW5kZXg6ICcxMCcsXG5cdFx0XHR3aWR0aDogJzdyZW0nLFxuXHRcdFx0Y29sb3I6ICcjZmZmJyxcblx0XHRcdGJhY2tncm91bmRDb2xvcjogJyM3Nzc3NzcnLFxuXHRcdFx0b3V0bGluZTogJ25vbmUnLFxuXHRcdFx0Zm9udFNpemU6ICcwLjlyZW0nLFxuXHRcdFx0Ym9yZGVyOiAnbm9uZScsXG5cdFx0XHR0ZXh0QWxpZ246ICdjZW50ZXInLFxuXHRcdFx0cGFkZGluZ1RvcDogJzAuNXJlbSdcblx0XHR9XG5cdH07XG5cbmNsYXNzIExvY2F0aW9uSGVhZGVyIGV4dGVuZHMgUmVhY3QuQ29tcG9uZW50IHtcblx0Y29uc3RydWN0b3IocHJvcHMsIGNvbnRleHQpIHtcblx0XHRzdXBlcihwcm9wcywgY29udGV4dCk7XG5cdFx0dGhpcy5zdGF0ZSA9IHtcblx0XHRcdHZhbHVlOiBwcm9wcy52YWx1ZVxuXHRcdH07XG5cdH1cblxuXHRzaG91bGRDb21wb25lbnRVcGRhdGUocHJvcHMsIHN0YXRlLCBjb250ZXh0KSB7XG5cdFx0cmV0dXJuICgocHJvcHMudmFsdWUgIT09IHRoaXMucHJvcHMudmFsdWUpICYmXG5cdFx0XHRcdChzdGF0ZS52YWx1ZSAhPT0gdGhpcy5zdGF0ZS52YWx1ZSkpO1xuXHR9XG5cblx0cmVuZGVyKHByb3BzLCBzdGF0ZSkge1xuXHRcdHJldHVybiAoXG5cdFx0XHQ8RXhwYW5kaW5nVGV4dGFyZWFcblx0XHRcdFx0dHlwZT1cInRleHRcIlxuXHRcdFx0XHRzdHlsZT17U3R5bGUubG9jYXRpb25IZWFkZXJ9XG5cdFx0XHRcdG1heExlbmd0aD1cIjI0XCJcblx0XHRcdFx0YmFzZUhlaWdodD1cIjAuOXJlbVwiXG5cdFx0XHRcdHZhbHVlPXtzdGF0ZS52YWx1ZX1cblx0XHRcdFx0cGxhY2Vob2xkZXI9XCJwbGFjZVwiXG5cdFx0XHRcdGlucHV0PXsoZXZlbnQpID0+IHRoaXMuc2V0U3RhdGUoe3ZhbHVlOiBldmVudC50YXJnZXQudmFsdWV9KX1cblx0XHRcdFx0Y2hhbmdlPXsoZXZlbnQpID0+IHRoaXMuY29udGV4dC5kbygnTU9ESUZZX0xPQ0FUSU9OX05BTUUnLCB7XG5cdFx0XHRcdFx0YXRJbmRleDogdGhpcy5wcm9wcy5pZCxcblx0XHRcdFx0XHRuZXdOYW1lOiBldmVudC50YXJnZXQudmFsdWVcblx0XHRcdFx0fSl9XG5cdFx0XHQvPlxuXHRcdClcblx0fVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IExvY2F0aW9uSGVhZGVyOyIsImNvbnN0XG5cdFJlYWN0ID0gcmVxdWlyZSgncHJlYWN0JyksXG5cblx0RXhwYW5kaW5nVGV4dGFyZWEgPSByZXF1aXJlKCcuL0V4cGFuZGluZ1RleHRhcmVhLmpzJyksXG5cdEFwcE1lbnUgPSByZXF1aXJlKCcuL0FwcE1lbnUuanMnKSxcblxuXHRCaW5kID0gcmVxdWlyZSgnLi4vYmluZC5qcycpLFxuXG5cdFN0eWxlID0ge1xuXHRcdGJveDoge1xuXHRcdFx0ekluZGV4OiAnMCcsXG5cblx0XHRcdG1heFdpZHRoOiAnNTByZW0nLFxuXG5cdFx0XHRiYWNrZ3JvdW5kQ29sb3I6ICcjZmZmJyxcblx0XHRcdGNvbG9yOiAnIzIyMicsXG5cblx0XHRcdG1hcmdpbkxlZnQ6ICdhdXRvJyxcblx0XHRcdG1hcmdpblJpZ2h0OiAnYXV0bycsXG5cdFx0XHRwYWRkaW5nVG9wOiAnMS41cmVtJyxcblxuXHRcdFx0ZGlzcGxheTogJ2ZsZXgnLFxuXHRcdFx0ZmxleERpcmVjdGlvbjogJ2NvbHVtbicsXG5cdFx0XHRqdXN0aWZ5Q29udGVudDogJ3NwYWNlLWFyb3VuZCcsXG5cdFx0XHRhbGlnbkl0ZW1zOiAnc3RyZXRjaCdcblx0XHR9LFxuXHRcdHRvcDoge1xuXHRcdFx0cGFkZGluZ0xlZnQ6ICcxLjVyZW0nLFxuXHRcdFx0cGFkZGluZ1JpZ2h0OiAnMS41cmVtJyxcblxuXHRcdFx0ZGlzcGxheTogJ2ZsZXgnLFxuXHRcdFx0ZmxleFdyYXA6ICd3cmFwJyxcblx0XHRcdGp1c3RpZnlDb250ZW50OiAnZmxleC1zdGFydCdcblx0XHR9LFxuXHRcdHRocmVhZDoge1xuXHRcdFx0Y29sb3I6ICcjZmZmJyxcblx0XHRcdGZvbnRTaXplOiAnMC43NXJlbScsXG5cblx0XHRcdGJvcmRlclJhZGl1czogJzFyZW0nLFxuXG5cdFx0XHRtYXJnaW5Cb3R0b206ICcwLjVyZW0nLFxuXHRcdFx0bWFyZ2luUmlnaHQ6ICcwLjVyZW0nLFxuXHRcdFx0cGFkZGluZzogJzAuMjVyZW0gMC41cmVtIDAuMnJlbSAwLjVyZW0nXG5cdFx0fSxcblx0XHRub3RlSGVhZDoge1xuXHRcdFx0Y29sb3I6ICcjMjIyJyxcblx0XHRcdGZvbnRTaXplOiAnMS43cmVtJyxcblxuXHRcdFx0bWFyZ2luOiAnMC41cmVtIDEuNXJlbSdcblx0XHR9LFxuXHRcdG5vdGVCb2R5OiB7XG5cdFx0XHRjb2xvcjogJyMyMjInLFxuXHRcdFx0Zm9udFNpemU6ICcxLjFyZW0nLFxuXHRcdFx0bWFyZ2luOiAnMC41cmVtIDEuNXJlbSdcblx0XHR9LFxuXHRcdHN0YXRzOiB7XG5cdFx0XHRiYWNrZ3JvdW5kQ29sb3I6ICcjZmZmJyxcblx0XHRcdGNvbG9yOiAnIzU1NScsXG5cdFx0XHRmb250U2l6ZTogJzFyZW0nLFxuXG5cdFx0XHRtYXJnaW46ICcwJyxcblx0XHRcdHBhZGRpbmc6ICcwLjc1cmVtIDEuNXJlbSAwLjc1cmVtIDEuNXJlbScsXG5cblx0XHRcdGRpc3BsYXk6ICdmbGV4Jyxcblx0XHRcdGZsZXhEaXJlY3Rpb246ICdyb3cnLFxuXHRcdFx0anVzdGlmeUNvbnRlbnQ6ICdzcGFjZS1hcm91bmQnXG5cdFx0fSxcblx0XHR3Yzoge1xuXHRcdFx0dGV4dEFsaWduOiAncmlnaHQnLFxuXG5cdFx0XHRkaXNwbGF5OiAnaW5saW5lLWJsb2NrJyxcblx0XHRcdGZsb2F0OiAncmlnaHQnXG5cdFx0fSxcblx0XHRzdGF0U3RpY2t5OiB7XG5cdFx0XHRib3R0b206ICcwJyxcblx0XHRcdHBvc2l0aW9uOiAnc3RpY2t5J1xuXHRcdH0sXG5cdFx0c3RhdEZyZWU6IHtcblx0XHRcdGJvdHRvbTogJ2F1dG8nLFxuXHRcdFx0cG9zaXRpb246ICdpbmhlcml0J1xuXHRcdH1cblx0fSxcblxuXHR0ZXN0V29yZHMgPSAvW1xcdyfigJldKyg/IVxcdyo+KS9pZ207IC8vIGNhcHR1cmUgd29yZHMgYW5kIGlnbm9yZSBodG1sIHRhZ3Mgb3Igc3BlY2lhbCBjaGFyc1xuXG5mdW5jdGlvbiBjb3VudCh0ZXh0KSB7XG5cdHZhciB3YyA9IDA7XG5cblx0dGVzdFdvcmRzLmxhc3RJbmRleCA9IDA7XG5cdHdoaWxlICh0ZXN0V29yZHMudGVzdCh0ZXh0KSkgd2MrKztcblx0cmV0dXJuIHdjO1xufVxuXG5jbGFzcyBOb3RlRWRpdG9yIGV4dGVuZHMgUmVhY3QuQ29tcG9uZW50IHtcblx0Y29uc3RydWN0b3IocHJvcHMsIGNvbnRleHQpIHtcblx0XHRzdXBlcihwcm9wcywgY29udGV4dCk7XG5cblx0XHR0aGlzLnN0YXRlID0ge1xuXHRcdFx0dGhyZWFkU3R5bGU6IE9iamVjdC5hc3NpZ24oe30sIFN0eWxlLnRocmVhZCwgeyBiYWNrZ3JvdW5kQ29sb3I6IHByb3BzLnRocmVhZC5jb2xvciB9KSxcblx0XHRcdGhlYWQ6IHByb3BzLm5vdGUuaGVhZCxcblx0XHRcdGJvZHk6IHByb3BzLm5vdGUuYm9keSxcblx0XHRcdHdjOiBwcm9wcy5ub3RlLndjLFxuXHRcdFx0cGFnZXM6IDEsXG5cdFx0XHRwYWdlT2Y6IDEsXG5cdFx0XHRzdGF0U3R5bGU6IHt9XG5cdFx0fVxuXG5cdFx0QmluZCh0aGlzKTtcblx0fVxuXG5cdHJlbmRlcihwcm9wcywgc3RhdGUpIHtcblx0XHRyZXR1cm4gKFxuXHRcdFx0PGRpdlxuXHRcdFx0XHRyZWY9e3RoaXMubW91bnRlZH1cblx0XHRcdFx0c3R5bGU9e09iamVjdC5hc3NpZ24oe21hcmdpblRvcDogcHJvcHMubWVudU9mZnNldCA9PT0gJzByZW0nID8gJzFyZW0nIDogcHJvcHMubWVudU9mZnNldH0sIFN0eWxlLmJveCl9XG5cdFx0XHQ+XG5cdFx0XHRcdDxzcGFuIHN0eWxlPXtTdHlsZS50b3B9PlxuXHRcdFx0XHRcdDxzcGFuIHN0eWxlPXtzdGF0ZS50aHJlYWRTdHlsZX0+XG5cdFx0XHRcdFx0XHR7cHJvcHMudGhyZWFkLm5hbWV9XG5cdFx0XHRcdFx0PC9zcGFuPlxuXHRcdFx0XHRcdDxzcGFuIHN0eWxlPXtzdGF0ZS50aHJlYWRTdHlsZX0+XG5cdFx0XHRcdFx0XHR7JysnfVxuXHRcdFx0XHRcdDwvc3Bhbj5cblx0XHRcdFx0PC9zcGFuPlxuXHRcdFx0XHQ8RXhwYW5kaW5nVGV4dGFyZWFcblx0XHRcdFx0XHRzdHlsZT17U3R5bGUubm90ZUhlYWR9XG5cdFx0XHRcdFx0bWF4TGVuZ3RoPVwiMjUwXCJcblx0XHRcdFx0XHRpbnB1dD17KGUpID0+IHRoaXMuc2V0U3RhdGUoe2hlYWQ6IGUudGFyZ2V0LnZhbHVlfSl9XG5cdFx0XHRcdFx0Y2hhbmdlPXsoKSA9PiB0aGlzLmNvbnRleHQuZG8oJ01PRElGWV9OT1RFX0hFQUQnLCBcblx0XHRcdFx0XHRcdE9iamVjdC5hc3NpZ24oe25ld0hlYWQ6IHRoaXMuc3RhdGUuaGVhZH0sIHByb3BzLmNvb3Jkcylcblx0XHRcdFx0XHQpfVxuXHRcdFx0XHRcdHZhbHVlPXtzdGF0ZS5oZWFkfVxuXHRcdFx0XHRcdGJhc2VIZWlnaHQ9XCIxLjdlbVwiXG5cdFx0XHRcdFx0cGxhY2Vob2xkZXI9XCJUaXRsZS9TdW1tYXJ5XCJcblx0XHRcdFx0Lz5cblx0XHRcdFx0PEV4cGFuZGluZ1RleHRhcmVhXG5cdFx0XHRcdFx0cmVmPXt0aGlzLmJvZHlNb3VudGVkfVxuXHRcdFx0XHRcdHN0eWxlPXtTdHlsZS5ub3RlQm9keX1cblx0XHRcdFx0XHRpbnB1dD17dGhpcy5vbkJvZHl9XG5cdFx0XHRcdFx0Y2hhbmdlPXsoKSA9PiB0aGlzLmNvbnRleHQuZG8oJ01PRElGWV9OT1RFX0JPRFknLCBcblx0XHRcdFx0XHRcdE9iamVjdC5hc3NpZ24oe25ld0JvZHk6IHN0YXRlLmJvZHksIHdjOiBzdGF0ZS53Y30sIHByb3BzLmNvb3Jkcylcblx0XHRcdFx0XHQpfVxuXHRcdFx0XHRcdHZhbHVlPXtzdGF0ZS5ib2R5fVxuXHRcdFx0XHRcdGJhc2VIZWlnaHQ9XCIxLjFlbVwiXG5cdFx0XHRcdFx0cGxhY2Vob2xkZXI9XCJCb2R5XCJcblx0XHRcdFx0Lz5cblx0XHRcdFx0PHNwYW4gc3R5bGU9e09iamVjdC5hc3NpZ24oe30sIFN0eWxlLnN0YXRzLCBzdGF0ZS5zdGF0U3R5bGUpfT5cblx0XHRcdFx0XHQ8c3Bhbj5cblx0XHRcdFx0XHRcdHtzdGF0ZS5wYWdlT2YgKyAnLycgKyBzdGF0ZS5wYWdlc31cblx0XHRcdFx0XHQ8L3NwYW4+XG5cdFx0XHRcdFx0PHNwYW4gc3R5bGU9e1N0eWxlLndjfT5cblx0XHRcdFx0XHRcdHtzdGF0ZS53YyArICcgd29yZHMnfVxuXHRcdFx0XHRcdDwvc3Bhbj5cblx0XHRcdFx0PC9zcGFuPlxuXHRcdFx0PC9kaXY+XG5cdFx0KVxuXHR9XG5cblx0Y29tcG9uZW50RGlkTW91bnQoKSB7XG5cdFx0dGhpcy5vblNjcm9sbCgpO1xuXG5cdFx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Njcm9sbCcsIHRoaXMub25TY3JvbGwpO1xuXHRcdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdyZXNpemUnLCB0aGlzLm9uUmVzaXplKTtcblxuXHRcdHRoaXMuY29udGV4dC51c2VNZW51KG51bGwsIFtcblx0XHRcdFtcblx0XHRcdFx0eyBcblx0XHRcdFx0XHRpY29uOiAnLi9kaXN0L2ltZy91bmRvLnN2ZycsXG5cdFx0XHRcdFx0b25DbGljazogKGV2ZW50KSA9PiBkb2N1bWVudC5leGVjQ29tbWFuZCgndW5kbycpXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHsgXG5cdFx0XHRcdFx0aWNvbjogJy4vZGlzdC9pbWcvcmVkby5zdmcnLFxuXHRcdFx0XHRcdG9uQ2xpY2s6IChldmVudCkgPT4gZG9jdW1lbnQuZXhlY0NvbW1hbmQoJ3JlZG8nKVxuXHRcdFx0XHR9XG5cblx0XHRcdF0sXG5cdFx0XHRbQXBwTWVudS5idG4oJ2RvbmUnLCAoKSA9PiB0aGlzLnByb3BzLm9uRG9uZSgpKV1cblx0XHRdKTtcblxuXHR9XG5cblx0Y29tcG9uZW50V2lsbFVubW91bnQoKSB7XG5cdFx0d2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3Njcm9sbCcsIHRoaXMub25TY3JvbGwpO1xuXHRcdHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdyZXNpemUnLCB0aGlzLm9uUmVzaXplKTtcblx0fVxuXG5cdG9uQm9keShldmVudCkge1xuXHRcdHRoaXMuc2V0U3RhdGUoe1xuXHRcdFx0Ym9keTogZXZlbnQudGFyZ2V0LnZhbHVlLFxuXHRcdFx0d2M6IGNvdW50KGV2ZW50LnRhcmdldC52YWx1ZSksXG5cdFx0XHRwYWdlczogTWF0aC5yb3VuZCh0aGlzLnN0YXRlLndjIC8gMjc1KSB8fCAxXG5cdFx0fSk7XG5cdFx0dGhpcy5vblNjcm9sbCgpO1xuXHR9XG5cblx0bW91bnRlZChlbGVtZW50KSB7XG5cdFx0dGhpcy5lbCA9IGVsZW1lbnQ7XG5cdH1cblxuXHRib2R5TW91bnRlZChlbGVtZW50KSB7XG5cdFx0dGhpcy5ib2R5ID0gZWxlbWVudDtcblx0fVxuXG5cdG9uU2Nyb2xsKGV2ZW50KSB7XG5cdFx0dGhpcy5wYWdlQ291bnQoKTtcblx0XHR0aGlzLnN0aWNreVN0YXRzKCk7XG5cdH1cblxuXHRwYWdlQ291bnQoKSB7XG5cdFx0dmFyIHQ7XG5cdFx0aWYgKHRoaXMuYm9keS5jbGllbnRIZWlnaHQgPiB3aW5kb3cuaW5uZXJIZWlnaHQpIHtcblx0XHRcdHQgPSBNYXRoLmFicyh0aGlzLmJvZHkuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkudG9wKTtcblx0XHRcdHQgPSAodCAvIHRoaXMuYm9keS5jbGllbnRIZWlnaHQpICogKHRoaXMuc3RhdGUucGFnZXMgKyAxKTtcblx0XHRcdHQgPSBNYXRoLmNlaWwodCk7XG5cdFx0XHRpZiAodCA+IHRoaXMuc3RhdGUucGFnZXMpIHQgPSB0aGlzLnN0YXRlLnBhZ2VzO1xuXHRcdH0gZWxzZSB0ID0gMTtcblx0XHR0aGlzLnNldFN0YXRlKHsgcGFnZU9mOiB0IH0pO1xuXHR9XG5cblx0c3RpY2t5U3RhdHMoKSB7XG5cdFx0aWYgKHRoaXMuZWwuY2xpZW50SGVpZ2h0ID4gKHdpbmRvdy5pbm5lckhlaWdodCAtIDQwKSkge1xuXHRcdFx0dGhpcy5zZXRTdGF0ZSh7IHN0YXRTdHlsZTogU3R5bGUuc3RhdFN0aWNreSB9KVxuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzLnNldFN0YXRlKHsgc3RhdFN0eWxlOiBTdHlsZS5zdGF0RnJlZSB9KVxuXHRcdH1cblx0fVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IE5vdGVFZGl0b3I7IiwiY29uc3Rcblx0UmVhY3QgPSByZXF1aXJlKCdwcmVhY3QnKSxcblxuXHRCaW5kID0gcmVxdWlyZSgnLi4vYmluZC5qcycpLFxuXHRFeHBhbmRpbmdUZXh0YXJlYSA9IHJlcXVpcmUoJy4vRXhwYW5kaW5nVGV4dGFyZWEuanMnKSxcblxuXHRTdHlsZSA9IHtcblx0XHRib3g6IHtcblx0XHRcdG1heFdpZHRoOiAnNTByZW0nLFxuXHRcdFx0YmFja2dyb3VuZENvbG9yOiAnI2ZmZicsXG5cdFx0XHRjb2xvcjogJyMyMjInLFxuXHRcdFx0ZGlzcGxheTogJ2ZsZXgnLFxuXHRcdFx0ZmxleERpcmVjdGlvbjogJ2NvbHVtbicsXG5cdFx0XHRqdXN0aWZ5Q29udGVudDogJ3NwYWNlLWFyb3VuZCcsXG5cdFx0XHRhbGlnbkl0ZW1zOiAnc3RyZXRjaCcsXG5cdFx0XHR3aWR0aDogJzE0cmVtJyxcblx0XHRcdHBvc2l0aW9uOiAncmVsYXRpdmUnLFxuXHRcdFx0dG9wOiAnMC4ycmVtJyxcblx0XHRcdG1heEhlaWdodDogJzEzcmVtJ1xuXHRcdH0sXG5cblx0XHRub3RlSGVhZDoge1xuXHRcdFx0Zm9udFNpemU6ICcxLjFyZW0nLFxuXHRcdFx0aGVpZ2h0OiAnMS4zcmVtJyxcblx0XHRcdG1hcmdpbjogJzAuMjVyZW0gMC43NXJlbSdcblx0XHR9LFxuXG5cdFx0c3RhdHM6IHtcblx0XHRcdGNvbG9yOiAnI2ZmZicsXG5cdFx0XHRkaXNwbGF5OiAnZmxleCcsXG5cdFx0XHRqdXN0aWZ5Q29udGVudDogJ3NwYWNlLWFyb3VuZCcsXG5cdFx0XHRhbGlnbkl0ZW1zOiAnY2VudGVyJyxcblx0XHRcdHBhZGRpbmc6ICcwLjVyZW0gMC43NXJlbSAwLjVyZW0gMC43NXJlbScsXG5cdFx0XHRmb250U2l6ZTogJzAuOXJlbSdcblx0XHR9LFxuXG5cdFx0d29yZGNvdW50OiB7XG5cdFx0XHRmb250U2l6ZTogJzAuOXJlbSdcblx0XHR9LFxuXG5cdFx0dGV4dGFyZWE6IHtcblx0XHRcdGZvbnRTaXplOiAnMS4xcmVtJyxcblx0XHRcdG1hcmdpbjogJzAuNzVyZW0nXG5cdFx0fSxcblxuXHRcdGJ1dHRvbjoge1xuXHRcdFx0Zm9udFNpemU6ICcwLjlyZW0nLFxuXHRcdFx0Y29sb3I6ICcjZmZmJyxcblx0XHRcdGJhY2tncm91bmRDb2xvcjogJ3JnYmEoMCwwLDAsMCknLFxuXHRcdFx0Ym9yZGVyOiAnbm9uZScsXG5cdFx0XHRvdXRsaW5lOiAnbm9uZScsXG5cdFx0XHRjdXJzb3I6ICdwb2ludGVyJ1xuXHRcdH1cblx0fTtcblxuXG5jbGFzcyBOb3RlVmlldyBleHRlbmRzIFJlYWN0LkNvbXBvbmVudCB7XG5cdGNvbnN0cnVjdG9yKHByb3BzLCBjb250ZXh0KSB7XG5cdFx0c3VwZXIocHJvcHMsIGNvbnRleHQpO1xuXG5cdFx0QmluZCh0aGlzKTtcblx0fVxuXG5cdHJlbmRlcihwcm9wcywgc3RhdGUpIHtcblx0XHR2YXIgYXJneWxlID0gT2JqZWN0LmFzc2lnbih7fSwgU3R5bGUuYm94LCB7XG5cdFx0XHRib3JkZXI6IChwcm9wcy5zZWxlY3RlZCA/ICgnMC4ycmVtIHNvbGlkICcgKyBwcm9wcy50aHJlYWQuY29sb3IpIDogJzAgc29saWQgcmdiYSgwLDAsMCwwKScpLFxuXHRcdFx0bWFyZ2luOiBwcm9wcy5zZWxlY3RlZCA/ICcwJyA6ICcwLjJyZW0nXG5cdFx0fSk7XG5cblx0XHRyZXR1cm4gKFxuXHRcdFx0PGRpdlxuXHRcdFx0XHRzdHlsZT17YXJneWxlfVxuXHRcdFx0XHRvbmNsaWNrPXt0aGlzLm9uQ2xpY2t9XG5cdFx0XHQ+XG5cdFx0XHRcdDxFeHBhbmRpbmdUZXh0YXJlYVxuXHRcdFx0XHRcdHN0eWxlPXtTdHlsZS50ZXh0YXJlYX1cblx0XHRcdFx0XHRtYXhMZW5ndGg9ezI1MH0gXG5cdFx0XHRcdFx0b25pbnB1dD17dGhpcy5vbklucHV0fSBcblx0XHRcdFx0XHRiYXNlSGVpZ2h0PVwiMS4zcmVtXCJcblx0XHRcdFx0XHRwbGFjZWhvbGRlcj1cIlRpdGxlL1N1bW1hcnlcIlxuXHRcdFx0XHRcdHZhbHVlPXtwcm9wcy5ub3RlLmhlYWR9XG5cdFx0XHRcdFx0Zm9jdXM9e3RoaXMub25Gb2N1c31cblx0XHRcdFx0XHRjaGFuZ2U9e3RoaXMub25DaGFuZ2V9XG5cdFx0XHRcdFx0cmVmPXtlbCA9PiB0aGlzLmVsID0gZWx9XG5cdFx0XHRcdC8+XG5cdFx0XHRcdDxzcGFuIFxuXHRcdFx0XHRcdHN0eWxlPXtPYmplY3QuYXNzaWduKHt9LCBTdHlsZS5zdGF0cywge2JhY2tncm91bmRDb2xvcjogcHJvcHMudGhyZWFkLmNvbG9yfSl9XG5cdFx0XHRcdD5cblx0XHRcdFx0XHQ8YnV0dG9uIFxuXHRcdFx0XHRcdFx0b25jbGljaz17KCkgPT4gcHJvcHMub25FZGl0KHtzbGljZUluZGV4OiBwcm9wcy5zbGljZUluZGV4LCBub3RlSW5kZXg6IHByb3BzLm5vdGVJbmRleH0pfSBcblx0XHRcdFx0XHRcdHN0eWxlPXtTdHlsZS5idXR0b259XG5cdFx0XHRcdFx0PmVkaXQ8L2J1dHRvbj5cblx0XHRcdFx0XHQ8c3BhbiBzdHlsZT17U3R5bGUud29yZGNvdW50fT57cHJvcHMubm90ZS53Y30gd29yZHM8L3NwYW4+XG5cdFx0XHRcdDwvc3Bhbj5cblx0XHRcdDwvZGl2PlxuXHRcdClcblx0fVxuXG5cdG9uQ3JlYXRlTm90ZShldmVudCkge1xuXHRcdHRoaXMubmV3Tm90ZShldmVudCk7XG5cdH1cblxuXHRvbkZvY3VzKGV2ZW50KSB7XG5cdFx0aWYgKCF0aGlzLnByb3BzLnNlbGVjdGVkKSB0aGlzLnNlbGVjdCgpO1xuXHR9XG5cblx0b25DaGFuZ2UoZXZlbnQpIHtcblx0XHR0aGlzLmNvbnRleHQuZG8oJ01PRElGWV9OT1RFX0hFQUQnLCB7XG5cdFx0XHRzbGljZUluZGV4OiB0aGlzLnByb3BzLnNsaWNlSW5kZXgsXG5cdFx0XHRub3RlSW5kZXg6IHRoaXMucHJvcHMubm90ZUluZGV4LFxuXHRcdFx0bmV3SGVhZDogZXZlbnQudGFyZ2V0LnZhbHVlXG5cdFx0fSk7XG5cdH1cblxuXHRvbkNsaWNrKGV2ZW50KSB7XG5cdFx0ZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG5cdFx0aWYgKCF0aGlzLnByb3BzLnNlbGVjdGVkKSB7XG5cdFx0XHR0aGlzLnNlbGVjdCgpO1xuXHRcdFx0dGhpcy5lbC5iYXNlLmZvY3VzKCk7XG5cdFx0fVxuXHR9XG5cblx0c2VsZWN0KCkge1xuXHRcdHRoaXMucHJvcHMub25TZWxlY3Qoe1xuXHRcdFx0c2xpY2VJbmRleDogdGhpcy5wcm9wcy5zbGljZUluZGV4LFxuXHRcdFx0bm90ZUluZGV4OiB0aGlzLnByb3BzLm5vdGVJbmRleFxuXHRcdH0pO1xuXHR9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gTm90ZVZpZXc7IiwiY29uc3Rcblx0UmVhY3QgPSByZXF1aXJlKCdwcmVhY3QnKSxcblxuXHROb3RlVmlldyA9IHJlcXVpcmUoJy4vTm90ZVZpZXcuanMnKSxcblxuXHRCaW5kID0gcmVxdWlyZSgnLi4vYmluZC5qcycpLFxuXHRTdHlsZSA9IHtcblx0XHRzbGljZUhlYWRlcjoge1xuXHRcdFx0ekluZGV4OiAnMTEnLFxuXHRcdFx0aGVpZ2h0OiAnMS41cmVtJyxcblx0XHRcdGNvbG9yOiAnI2ZmZicsXG5cdFx0XHRtYXhXaWR0aDogJzE0cmVtJyxcblx0XHRcdGJhY2tncm91bmRDb2xvcjogJyM3Nzc3NzcnLFxuXHRcdFx0b3V0bGluZTogJ25vbmUnLFxuXHRcdFx0Zm9udFNpemU6ICcwLjlyZW0nLFxuXHRcdFx0bWFyZ2luOiAnMCBhdXRvJyxcblx0XHRcdGJvcmRlcjogJ25vbmUnLFxuXHRcdFx0dGV4dEFsaWduOiAnY2VudGVyJyxcblx0XHRcdHBhZGRpbmc6ICcwLjI1cmVtJ1xuXHRcdH0sXG5cdFx0c2xpY2U6IHtcblx0XHRcdGRpc3BsYXk6ICdpbmxpbmUtZmxleCcsXG5cdFx0XHRqdXN0aWZ5Q29udGVudDogJ2NlbnRlcicsXG5cdFx0XHRhbGlnbkl0ZW1zOiAnY2VudGVyJyxcblx0XHRcdHdpZHRoOiAnMTRyZW0nLFxuXHRcdFx0aGVpZ2h0OiAnMTAwJSdcblx0XHR9XG5cdH07XG5cbmZ1bmN0aW9uIE1lYXN1cmVUZXh0KHRleHQpIHtcblx0cmV0dXJuIHRleHQubGVuZ3RoID8gKHRleHQubGVuZ3RoICogMS4xKSA6IDU7XG59XG5cbmNsYXNzIFNsaWNlSGVhZGVyIGV4dGVuZHMgUmVhY3QuQ29tcG9uZW50IHtcblx0Y29uc3RydWN0b3IocHJvcHMsIGNvbnRleHQpIHtcblx0XHRzdXBlcihwcm9wcywgY29udGV4dCk7XG5cdFx0dGhpcy5zdGF0ZSA9IHtcblx0XHRcdHZhbHVlOiBwcm9wcy52YWx1ZVxuXHRcdH07XG5cblx0XHRCaW5kKHRoaXMpO1xuXHR9XG5cblx0Y29tcG9uZW50V2lsbFJlY2VpdmVQcm9wcyhwcm9wcykge1xuXHRcdHRoaXMuc2V0U3RhdGUoe3ZhbHVlOiBwcm9wcy52YWx1ZX0pO1xuXHR9XG5cblx0c2hvdWxkQ29tcG9uZW50VXBkYXRlKHByb3BzLCBzdGF0ZSwgY29udGV4dCkge1xuXHRcdHJldHVybiAoKHN0YXRlICE9PSB0aGlzLnN0YXRlKSB8fFxuXHRcdFx0XHQocHJvcHMudmFsdWUgIT09IHRoaXMucHJvcHMudmFsdWUpKTtcblx0fVxuXG5cdHJlbmRlcihwcm9wcywgc3RhdGUpIHtcblx0XHRyZXR1cm4gKFxuXHRcdFx0PGRpdiBzdHlsZT17U3R5bGUuc2xpY2V9PlxuXHRcdFx0XHQ8aW5wdXRcblx0XHRcdFx0XHR0eXBlPVwidGV4dFwiXG5cdFx0XHRcdFx0c3R5bGU9e1N0eWxlLnNsaWNlSGVhZGVyfVxuXHRcdFx0XHRcdG1heExlbmd0aD1cIjI0XCJcblx0XHRcdFx0XHRzaXplPXtNZWFzdXJlVGV4dChzdGF0ZS52YWx1ZSl9XG5cdFx0XHRcdFx0dmFsdWU9e3N0YXRlLnZhbHVlfVxuXHRcdFx0XHRcdHBsYWNlaG9sZGVyPVwidGltZVwiXG5cdFx0XHRcdFx0b25pbnB1dD17KGV2ZW50KSA9PiB0aGlzLnNldFN0YXRlKHt2YWx1ZTogZXZlbnQudGFyZ2V0LnZhbHVlfSl9XG5cdFx0XHRcdFx0b25jaGFuZ2U9e3RoaXMub25DaGFuZ2V9XG5cdFx0XHRcdC8+XG5cdFx0XHQ8L2Rpdj5cblx0XHQpXG5cdH1cblxuXHRvbkNoYW5nZShldmVudCkge1xuXHRcdHRoaXMuY29udGV4dC5kbygnTU9ESUZZX1NMSUNFX0RBVEUnLCB7XG5cdFx0XHRhdEluZGV4OiB0aGlzLnByb3BzLmlkLFxuXHRcdFx0bmV3RGF0ZTogZXZlbnQudGFyZ2V0LnZhbHVlXG5cdFx0fSk7XG5cdH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTbGljZUhlYWRlcjsiLCJjb25zdFxuXHRSZWFjdCA9IHJlcXVpcmUoJ3ByZWFjdCcpLFxuXG5cdE5vdGVWaWV3ID0gcmVxdWlyZSgnLi9Ob3RlVmlldy5qcycpLFxuXG5cdFN0eWxlID0ge1xuXHRcdHNsaWNlOiB7XG5cdFx0XHR6SW5kZXg6IDksXG5cdFx0XHRkaXNwbGF5OiAnZmxleCcsXG5cdFx0XHRmbGV4RGlyZWN0aW9uOiAnY29sdW1uJyxcblx0XHRcdGp1c3RpZnlDb250ZW50OiAnZmxleC1zdGFydCcsXG5cdFx0XHRhbGlnbkl0ZW1zOiAnY2VudGVyJyxcblx0XHRcdG1hcmdpbjogJzAgMnJlbScsXG5cdFx0XHR3aWR0aDogJzE0cmVtJ1xuXHRcdH0sXG5cblx0XHRzcGFjZToge1xuXHRcdFx0aGVpZ2h0OiAnMTRyZW0nLFxuXHRcdFx0ZGlzcGxheTogJ2ZsZXgnLFxuXHRcdFx0anVzdGlmeUNvbnRlbnQ6ICdjZW50ZXInLFxuXHRcdFx0YWxpZ25JdGVtczogJ2ZsZXgtZW5kJ1xuXHRcdH0sXG5cblx0XHRidXR0b246IHtcblx0XHRcdGZvbnRTaXplOiAnMC45cmVtJyxcblx0XHRcdGNvbG9yOiAnI2ZmZicsXG5cdFx0XHRib3JkZXI6ICdub25lJyxcblx0XHRcdG91dGxpbmU6ICdub25lJyxcblx0XHRcdGN1cnNvcjogJ3BvaW50ZXInLFxuXHRcdFx0d2lkdGg6ICcxLjNyZW0nLFxuXHRcdFx0aGVpZ2h0OiAnMS4ycmVtJyxcblx0XHRcdGJhY2tncm91bmRDb2xvcjogJ3JnYmEoMCwwLDAsMCknLFxuXHRcdFx0dGV4dEFsaWduOiAnY2VudGVyJyxcblx0XHRcdG1hcmdpbjogJzAgMXJlbSAwLjRyZW0gMXJlbScsXG5cdFx0XHRib3JkZXJSYWRpdXM6ICcxcmVtJ1xuXHRcdH1cblx0fTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihwcm9wcywgc3RhdGUpIHtcblx0XG5cdHJldHVybiAoXG5cdFx0PGRpdiBzdHlsZT17U3R5bGUuc2xpY2V9PlxuXHRcdFx0e3Byb3BzLnNsaWNlLm5vdGVzLm1hcCgobm90ZSwgaSkgPT4gXG5cdFx0XHRcdDxkaXYgc3R5bGU9e1N0eWxlLnNwYWNlfT5cblx0XHRcdFx0XHR7KG5vdGUpID9cblx0XHRcdFx0XHRcdDxOb3RlVmlld1xuXHRcdFx0XHRcdFx0XHRzbGljZUluZGV4PXtwcm9wcy5pZH1cblx0XHRcdFx0XHRcdFx0c2VsZWN0ZWQ9eyhwcm9wcy5zZWxlY3Rpb24gJiYgcHJvcHMuc2VsZWN0aW9uLm5vdGVJbmRleCA9PT0gaSl9XG5cdFx0XHRcdFx0XHRcdG5vdGVJbmRleD17aX1cblx0XHRcdFx0XHRcdFx0bm90ZT17bm90ZX1cblx0XHRcdFx0XHRcdFx0dGhyZWFkPXtwcm9wcy50aHJlYWRzW25vdGUudGhyZWFkXX1cblx0XHRcdFx0XHRcdFx0b25TZWxlY3Q9e3Byb3BzLm9uU2VsZWN0fVxuXHRcdFx0XHRcdFx0XHRvbkRlc2VsZWN0PXtwcm9wcy5vbkRlc2VsZWN0fVxuXHRcdFx0XHRcdFx0XHRvbkVkaXQ9e3Byb3BzLmVkaXROb3RlfVxuXHRcdFx0XHRcdFx0Lz5cblx0XHRcdFx0XHQ6XG5cdFx0XHRcdFx0XHQ8YnV0dG9uXG5cdFx0XHRcdFx0XHRcdHN0eWxlPXtTdHlsZS5idXR0b259XG5cdFx0XHRcdFx0XHRcdG9uY2xpY2s9eygpID0+IHRoaXMuY29udGV4dC5kbygnTkVXX05PVEUnLCB7XG5cdFx0XHRcdFx0XHRcdFx0c2xpY2VJbmRleDogcHJvcHMuaWQsXG5cdFx0XHRcdFx0XHRcdFx0bm90ZUluZGV4OiBpXG5cdFx0XHRcdFx0XHRcdH0pfVxuXHRcdFx0XHRcdFx0Pis8L2J1dHRvbj5cblx0XHRcdFx0XHR9XG5cdFx0XHRcdDwvZGl2PlxuXHRcdFx0KX1cblx0XHQ8L2Rpdj5cblx0KVxufVxuIiwiY29uc3Rcblx0UmVhY3QgPSByZXF1aXJlKCdwcmVhY3QnKSxcblxuXHRTdHlsZSA9IHtcblx0XHRvdXRlcjoge1xuXHRcdFx0ekluZGV4OiAnLTUnLFxuXHRcdFx0cG9zaXRpb246ICdhYnNvbHV0ZScsXG5cdFx0XHRsZWZ0OiAnN3JlbScsXG5cdFx0XHR0b3A6ICcyLjVyZW0nLFxuXHRcdFx0bWluV2lkdGg6ICcxMDB2dycsXG5cdFx0XHRtaW5IZWlnaHQ6ICcxMDB2aCdcblx0XHR9LFxuXHRcdGlubmVyOiB7XG5cdFx0XHRwb3NpdGlvbjogJ2Fic29sdXRlJyxcblx0XHRcdHRvcDogJzJyZW0nLFxuXHRcdFx0bGVmdDogMCxcblx0XHRcdHdpZHRoOiAnMTAwJScsXG5cdFx0XHRoZWlnaHQ6ICcxMDAlJ1xuXHRcdH0sXG5cdFx0bG9jYXRpb246IHtcblx0XHRcdG1hcmdpbjogJzEycmVtIDAnLFxuXHRcdFx0aGVpZ2h0OiAnMnJlbScsXG5cdFx0XHRiYWNrZ3JvdW5kQ29sb3I6ICcjNDQ0NDQ0J1xuXHRcdH0sXG5cdFx0c2xpY2U6IHtcblx0XHRcdGRpc3BsYXk6ICdpbmxpbmUtYmxvY2snLFxuXHRcdFx0bWFyZ2luOiAnMCA4LjkzNzVyZW0nLFxuXHRcdFx0d2lkdGg6ICcwLjEyNXJlbScsXG5cdFx0XHRoZWlnaHQ6ICcxMDAlJyxcblx0XHRcdGJhY2tncm91bmRDb2xvcjogJyM0NDQ0NDQnXG5cdFx0fVxuXHR9O1xuXG5cbmNsYXNzIFdlYXZlQmFja2dyb3VuZCBleHRlbmRzIFJlYWN0LkNvbXBvbmVudCB7XG5cdGNvbnN0cnVjdG9yKHByb3BzLCBjb250ZXh0KSB7XG5cdFx0c3VwZXIocHJvcHMsIGNvbnRleHQpO1xuXHR9XG5cblx0c2hvdWxkQ29tcG9uZW50VXBkYXRlKHByb3BzLCBzdGF0ZSwgY29udGV4dCkge1xuXHRcdHJldHVybiAoKHByb3BzLm1lbnVPZmZzZXQgIT09IHRoaXMucHJvcHMubWVudU9mZnNldCkgfHxcblx0XHRcdFx0KHByb3BzLmxvY2F0aW9ucyAhPT0gdGhpcy5wcm9wcy5sb2NhdGlvbnMpIHx8XG5cdFx0XHRcdChwcm9wcy5zY2VuZXMgIT09IHRoaXMucHJvcHMuc2NlbmVzKSk7XG5cdH1cblxuXHRyZW5kZXIocHJvcHMsIHN0YXRlKSB7XG5cdFx0cmV0dXJuIChcblx0XHRcdDxkaXZcblx0XHRcdFx0ZGF0YS1pcz1cIldlYXZlQmFja2dyb3VuZFwiXG5cdFx0XHRcdHN0eWxlPXtPYmplY3QuYXNzaWduKHt9LCBTdHlsZS5vdXRlciwge1xuXHRcdFx0XHRcdHRvcDogcHJvcHMubWVudU9mZnNldCxcblx0XHRcdFx0XHR3aWR0aDogKHByb3BzLnNjZW5lcyAqIDE4ICsgMikgKyAncmVtJyxcblx0XHRcdFx0XHRoZWlnaHQ6IChwcm9wcy5sb2NhdGlvbnMgKiAxNCArIDE2KSArICdyZW0nXG5cdFx0XHRcdH0pfVxuXHRcdFx0PlxuXHRcdFx0XHQ8ZGl2IHN0eWxlPXtTdHlsZS5pbm5lcn0+XG5cdFx0XHRcdFx0e0FycmF5KHByb3BzLmxvY2F0aW9ucykuZmlsbCgwKS5tYXAoKHYsIGkpID0+IDxkaXYgc3R5bGU9e1N0eWxlLmxvY2F0aW9ufT4mbmJzcDs8L2Rpdj4pfVxuXHRcdFx0XHQ8L2Rpdj5cblx0XHRcdFx0PGRpdiBzdHlsZT17U3R5bGUuaW5uZXJ9PlxuXHRcdFx0XHRcdHtBcnJheShwcm9wcy5zY2VuZXMpLmZpbGwoMCkubWFwKCh2LCBpKSA9PiA8ZGl2IHN0eWxlPXtTdHlsZS5zbGljZX0+Jm5ic3A7PC9kaXY+KX1cblx0XHRcdFx0PC9kaXY+XG5cdFx0XHQ8L2Rpdj5cblx0XHQpXG5cdH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBXZWF2ZUJhY2tncm91bmQ7IiwiY29uc3Rcblx0UmVhY3QgPSByZXF1aXJlKCdwcmVhY3QnKSxcblxuXHRMb2NhdGlvbkhlYWRlciA9IHJlcXVpcmUoJy4vTG9jYXRpb25IZWFkZXIuanMnKSxcblx0U2xpY2VIZWFkZXIgPSByZXF1aXJlKCcuL1NsaWNlSGVhZGVyLmpzJyksXG5cblx0U3R5bGUgPSB7XG5cdFx0b3V0ZXI6IHtcblx0XHRcdHBvc2l0aW9uOiAnYWJzb2x1dGUnLFxuXHRcdFx0bGVmdDogMCxcblx0XHRcdG1pbldpZHRoOiAnMTAwdncnLFxuXHRcdFx0bWluSGVpZ2h0OiAnMTAwdmgnXG5cdFx0fSxcblx0XHRsb2NhdGlvbnM6IHtcblx0XHRcdHBvc2l0aW9uOiAnYWJzb2x1dGUnLFxuXHRcdFx0dG9wOiAwLFxuXHRcdFx0d2lkdGg6ICc3cmVtJyxcblx0XHRcdG1pbkhlaWdodDogJzEwMHZoJyxcblx0XHRcdHBhZGRpbmdUb3A6ICcycmVtJ1xuXHRcdH0sXG5cdFx0c2NlbmVzOiB7XG5cdFx0XHR6SW5kZXg6ICcxMScsXG5cdFx0XHRwb3NpdGlvbjogJ2Fic29sdXRlJyxcblx0XHRcdGJhY2tncm91bmRDb2xvcjogXCIjMTExXCIsXG5cdFx0XHRsZWZ0OiAwLFxuXHRcdFx0aGVpZ2h0OiAnMnJlbScsXG5cdFx0XHRwYWRkaW5nTGVmdDogJzdyZW0nLFxuXHRcdFx0bWluV2lkdGg6ICcxMDB2dydcblx0XHR9LFxuXHRcdGxvY2F0aW9uOiB7XG5cdFx0XHRkaXNwbGF5OiAnZmxleCcsXG5cdFx0XHRmbGV4RGlyZWN0aW9uOiAnY29sdW1uJyxcblx0XHRcdGp1c3RpZnlDb250ZW50OiAnZmxleC1lbmQnLFxuXHRcdFx0aGVpZ2h0OiAnMTRyZW0nLFxuXHRcdH0sXG5cdFx0c2xpY2VCdXR0b246IHtcblx0XHRcdG1hcmdpbjogJzAgMS4zNzVyZW0nLFxuXHRcdFx0Zm9udFNpemU6ICcwLjlyZW0nLFxuXHRcdFx0Y29sb3I6ICcjZmZmJyxcblx0XHRcdGJvcmRlcjogJ25vbmUnLFxuXHRcdFx0b3V0bGluZTogJ25vbmUnLFxuXHRcdFx0Y3Vyc29yOiAncG9pbnRlcicsXG5cdFx0XHR3aWR0aDogJzEuMjVyZW0nLFxuXHRcdFx0aGVpZ2h0OiAnMS4yNXJlbScsXG5cdFx0XHR0ZXh0QWxpZ246ICdjZW50ZXInLFxuXHRcdFx0Ym9yZGVyUmFkaXVzOiAnMXJlbScsXG5cdFx0XHRiYWNrZ3JvdW5kQ29sb3I6ICdyZ2JhKDAsMCwwLDApJ1xuXHRcdH0sXG5cdFx0Zmlyc3RTbGljZUJ1dHRvbjoge1xuXHRcdFx0bWFyZ2luOiAnMCAwLjM3NXJlbScsXG5cdFx0XHRmb250U2l6ZTogJzAuOXJlbScsXG5cdFx0XHRjb2xvcjogJyNmZmYnLFxuXHRcdFx0Ym9yZGVyOiAnbm9uZScsXG5cdFx0XHRvdXRsaW5lOiAnbm9uZScsXG5cdFx0XHRjdXJzb3I6ICdwb2ludGVyJyxcblx0XHRcdHdpZHRoOiAnMS4yNXJlbScsXG5cdFx0XHRoZWlnaHQ6ICcxLjI1cmVtJyxcblx0XHRcdHRleHRBbGlnbjogJ2NlbnRlcicsXG5cdFx0XHRib3JkZXJSYWRpdXM6ICcxcmVtJyxcblx0XHRcdGJhY2tncm91bmRDb2xvcjogJ3JnYmEoMCwwLDAsMCknXG5cdFx0fSxcblx0XHR0aHJlYWRCdG46IHtcblx0XHRcdGhlaWdodDogJzJyZW0nLFxuXHRcdFx0Zm9udFNpemU6ICcwLjlyZW0nLFxuXHRcdFx0Y29sb3I6ICcjZmZmJyxcblx0XHRcdGJvcmRlcjogJ25vbmUnLFxuXHRcdFx0b3V0bGluZTogJ25vbmUnLFxuXHRcdFx0Y3Vyc29yOiAncG9pbnRlcicsXG5cdFx0XHR0ZXh0QWxpZ246ICdjZW50ZXInLFxuXHRcdFx0cGFkZGluZzogJzAuNXJlbSAwLjVyZW0nLFxuXHRcdFx0YmFja2dyb3VuZENvbG9yOiAncmdiYSgwLDAsMCwwKScsXG5cdFx0XHR3aWR0aDogJzEwMCUnXG5cdFx0fVxuXHR9O1xuXG5cbmNsYXNzIFdlYXZlSGVhZGVycyBleHRlbmRzIFJlYWN0LkNvbXBvbmVudCB7XG5cdGNvbnN0cnVjdG9yKHByb3BzLCBjb250ZXh0KSB7XG5cdFx0c3VwZXIocHJvcHMsIGNvbnRleHQpO1xuXG5cdFx0dGhpcy5zdGF0ZSA9IHtcblx0XHRcdHg6IDAsXG5cdFx0XHR5OiAwXG5cdFx0fVxuXG5cdFx0dGhpcy5vblNjcm9sbCA9IHRoaXMub25TY3JvbGwuYmluZCh0aGlzKTtcblx0fVxuXG5cdGNvbXBvbmVudERpZE1vdW50KCkge1xuXHRcdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdzY3JvbGwnLCB0aGlzLm9uU2Nyb2xsKTtcblx0fVxuXG5cdGNvbXBvbmVudFdpbGxVbm1vdW50KCkge1xuXHRcdHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdzY3JvbGwnLCB0aGlzLm9uU2Nyb2xsKTtcblx0fVxuXG5cdHNob3VsZENvbXBvbmVudFVwZGF0ZShwcm9wcywgc3RhdGUsIGNvbnRleHQpIHtcblx0XHRyZXR1cm4gKChzdGF0ZS54ICE9PSB0aGlzLnN0YXRlLngpIHx8XG5cdFx0XHRcdChzdGF0ZS55ICE9PSB0aGlzLnN0YXRlLnkpIHx8XG5cdFx0XHRcdChwcm9wcy5zY2VuZXMgIT09IHRoaXMucHJvcHMuc2NlbmVzKSB8fFxuXHRcdFx0XHQocHJvcHMubG9jYXRpb25zICE9PSB0aGlzLnByb3BzLmxvY2F0aW9ucykgfHxcblx0XHRcdFx0KHByb3BzLndpbmRvd1dpZHRoICE9PSB0aGlzLnByb3BzLndpbmRvd1dpZHRoKSk7XG5cdH1cblxuXHRyZW5kZXIocHJvcHMsIHN0YXRlKSB7XG5cdFx0cmV0dXJuIChcblx0XHRcdDxkaXZcblx0XHRcdFx0ZGF0YS1pcz1cIldlYXZlSGVhZGVyc1wiXG5cdFx0XHRcdHN0eWxlPXtPYmplY3QuYXNzaWduKHt9LCBTdHlsZS5vdXRlciwgc3RhdGUuc3R5bGUpfVxuXHRcdFx0PlxuXHRcdFx0XHQ8ZGl2XG5cdFx0XHRcdFx0ZGF0YS1pcz1cIlNsaWNlSGVhZGVyc1wiXG5cdFx0XHRcdFx0c3R5bGU9e09iamVjdC5hc3NpZ24oe30sIFN0eWxlLnNjZW5lcywgeyB0b3A6IHN0YXRlLnksIHdpZHRoOiAoKHByb3BzLnNjZW5lcy5sZW5ndGgqMTggKyAyKSArICdyZW0nKSAgfSl9XG5cdFx0XHRcdD5cblx0XHRcdFx0XHR7W1xuXHRcdFx0XHRcdFx0PGJ1dHRvblxuXHRcdFx0XHRcdFx0XHRvbmNsaWNrPXsoZXZlbnQpID0+IHRoaXMuY29udGV4dC5kbygnTkVXX1NMSUNFJywge2F0SW5kZXg6IDB9KX1cblx0XHRcdFx0XHRcdFx0c3R5bGU9e1N0eWxlLmZpcnN0U2xpY2VCdXR0b259XG5cdFx0XHRcdFx0XHRcdG9ubW91c2VlbnRlcj17ZSA9PiBlLnRhcmdldC5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSAncmdiYSgyNTUsMjU1LDI1NSwwLjIpJ31cblx0XHRcdFx0XHRcdFx0b25tb3VzZWxlYXZlPXtlID0+IGUudGFyZ2V0LnN0eWxlLmJhY2tncm91bmRDb2xvciA9ICdyZ2JhKDAsMCwwLDApJ31cblx0XHRcdFx0XHRcdD4rPC9idXR0b24+XG5cdFx0XHRcdFx0XS5jb25jYXQocHJvcHMuc2NlbmVzLm1hcCgoc2xpY2UsIGkpID0+IFxuXHRcdFx0XHRcdFx0PGRpdiBzdHlsZT17e2Rpc3BsYXk6ICdpbmxpbmUnLCB3aWR0aDogJzE4cmVtJ319PlxuXHRcdFx0XHRcdFx0XHQ8U2xpY2VIZWFkZXJcblx0XHRcdFx0XHRcdFx0XHRpZD17aX1cblx0XHRcdFx0XHRcdFx0XHR2YWx1ZT17c2xpY2UuZGF0ZXRpbWV9XG5cdFx0XHRcdFx0XHRcdC8+XG5cdFx0XHRcdFx0XHRcdDxidXR0b25cblx0XHRcdFx0XHRcdFx0XHRvbmNsaWNrPXsoZXZlbnQpID0+IHRoaXMuY29udGV4dC5kbygnTkVXX1NMSUNFJywge2F0SW5kZXg6IGkrMX0pfVxuXHRcdFx0XHRcdFx0XHRcdHN0eWxlPXtTdHlsZS5zbGljZUJ1dHRvbn1cblx0XHRcdFx0XHRcdFx0XHRvbm1vdXNlZW50ZXI9e2UgPT4gZS50YXJnZXQuc3R5bGUuYmFja2dyb3VuZENvbG9yID0gJ3JnYmEoMjU1LDI1NSwyNTUsMC4yKSd9XG5cdFx0XHRcdFx0XHRcdFx0b25tb3VzZWxlYXZlPXtlID0+IGUudGFyZ2V0LnN0eWxlLmJhY2tncm91bmRDb2xvciA9ICdyZ2JhKDAsMCwwLDApJ31cblx0XHRcdFx0XHRcdFx0Pis8L2J1dHRvbj5cblx0XHRcdFx0XHRcdDwvZGl2PlxuXHRcdFx0XHRcdCkpfVxuXHRcdFx0XHQ8L2Rpdj5cblx0XHRcdFx0PGRpdiBcblx0XHRcdFx0XHRkYXRhLWlzPVwiTG9jYXRpb25IZWFkZXJzXCJcblx0XHRcdFx0XHRzdHlsZT17T2JqZWN0LmFzc2lnbih7fSwgU3R5bGUubG9jYXRpb25zLCB7XG5cdFx0XHRcdFx0XHRsZWZ0OiBzdGF0ZS54LFxuXHRcdFx0XHRcdFx0aGVpZ2h0OiAoKHByb3BzLmxvY2F0aW9ucy5sZW5ndGgqMTQgKyAxNikgKyAncmVtJyksXG5cdFx0XHRcdFx0XHRiYWNrZ3JvdW5kQ29sb3I6IChwcm9wcy53aW5kb3dXaWR0aCA8IDcwMCkgPyAncmdiYSgwLDAsMCwwKScgOiAnIzExMScsXG5cdFx0XHRcdFx0XHR6SW5kZXg6IChwcm9wcy53aW5kb3dXaWR0aCA8IDcwMCkgPyA4IDogMTAgfSl9XG5cdFx0XHRcdD5cblx0XHRcdFx0XHR7KChwcm9wcy5sb2NhdGlvbnMubWFwKChsb2NhdGlvbiwgaSkgPT5cblx0XHRcdFx0XHRcdDxkaXYgc3R5bGU9e1N0eWxlLmxvY2F0aW9ufT5cblx0XHRcdFx0XHRcdFx0PExvY2F0aW9uSGVhZGVyXG5cdFx0XHRcdFx0XHRcdFx0aWQ9e2l9XG5cdFx0XHRcdFx0XHRcdFx0dmFsdWU9e2xvY2F0aW9ufVxuXHRcdFx0XHRcdFx0XHQvPlxuXHRcdFx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcdFx0KSkuY29uY2F0KFxuXHRcdFx0XHRcdFx0WzxkaXYgc3R5bGU9e1N0eWxlLmxvY2F0aW9ufT5cblx0XHRcdFx0XHRcdFx0PGJ1dHRvblxuXHRcdFx0XHRcdFx0XHRcdG9uY2xpY2s9eyhldmVudCkgPT4gdGhpcy5jb250ZXh0LmRvKCdORVdfTE9DQVRJT04nKX1cblx0XHRcdFx0XHRcdFx0XHRzdHlsZT17U3R5bGUudGhyZWFkQnRufVxuXHRcdFx0XHRcdFx0XHRcdG9ubW91c2VlbnRlcj17ZSA9PiBlLnRhcmdldC5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSAncmdiYSgyNTUsMjU1LDI1NSwwLjIpJ31cblx0XHRcdFx0XHRcdFx0XHRvbm1vdXNlbGVhdmU9e2UgPT4gZS50YXJnZXQuc3R5bGUuYmFja2dyb3VuZENvbG9yID0gJ3JnYmEoMCwwLDAsMCknfVxuXHRcdFx0XHRcdFx0XHQ+KzwvYnV0dG9uPlxuXHRcdFx0XHRcdFx0PC9kaXY+XVxuXHRcdFx0XHRcdCkpfVxuXHRcdFx0XHQ8L2Rpdj5cblx0XHRcdDwvZGl2PlxuXHRcdClcblx0fVxuXG5cdG9uU2Nyb2xsKCkge1xuXHRcdHRoaXMuc2V0U3RhdGUoe1xuXHRcdFx0eDogZG9jdW1lbnQuYm9keS5zY3JvbGxMZWZ0LFxuXHRcdFx0eTogZG9jdW1lbnQuYm9keS5zY3JvbGxUb3Bcblx0XHR9KTtcblx0fVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFdlYXZlSGVhZGVyczsiLCJjb25zdFxuXHRSZWFjdCA9IHJlcXVpcmUoJ3ByZWFjdCcpLFxuXG5cdEJpbmQgPSByZXF1aXJlKCcuLi9iaW5kLmpzJyksXG5cblx0U2xpY2VWaWV3ID0gcmVxdWlyZSgnLi9TbGljZVZpZXcuanMnKSxcblx0V2VhdmVIZWFkZXJzID0gcmVxdWlyZSgnLi9XZWF2ZUhlYWRlcnMuanMnKSxcblx0V2VhdmVCYWNrZ3JvdW5kID0gcmVxdWlyZSgnLi9XZWF2ZUJhY2tncm91bmQuanMnKSxcblx0QXBwTWVudSA9IHJlcXVpcmUoJy4vQXBwTWVudS5qcycpLFxuXG5cdFN0eWxlID0ge1xuXHRcdHdlYXZlOiB7XG5cdFx0XHRtYXJnaW5MZWZ0OiAnN3JlbScsXG5cdFx0XHRkaXNwbGF5OiAnaW5saW5lLWZsZXgnXG5cdFx0fSxcblx0XHRzY2VuZXM6IHtcblx0XHRcdG1hcmdpblRvcDogJzJyZW0nLFxuXHRcdFx0ZGlzcGxheTogJ2ZsZXgnLFxuXHRcdFx0anVzdGlmeUNvbnRlbnQ6ICdmbGV4LXN0YXJ0Jyxcblx0XHRcdGFsaWduSXRlbXM6ICdmbGV4LXN0YXJ0J1xuXHRcdH1cblx0fTtcbiBcbmNsYXNzIFdlYXZlVmlldyBleHRlbmRzIFJlYWN0LkNvbXBvbmVudCB7XG5cdGNvbnN0cnVjdG9yKHByb3BzLCBjb250ZXh0KSB7XG5cdFx0c3VwZXIocHJvcHMsIGNvbnRleHQpO1xuXG5cdFx0dGhpcy5zdGF0ZSA9IHtcblx0XHRcdHNlbGVjdGlvbjogbnVsbFxuXHRcdH1cblxuXHRcdHRoaXMuYWxsb3dEZXNlbGVjdCA9IHRydWU7XG5cblx0XHRCaW5kKHRoaXMpO1xuXHR9XG5cblx0cmVuZGVyKHByb3BzLCBzdGF0ZSkge1xuXHRcdHJldHVybiAoXG5cdFx0XHQ8ZGl2XG5cdFx0XHRcdGRhdGEtaXM9XCJXZWF2ZVZpZXdcIlxuXHRcdFx0XHRzdHlsZT17T2JqZWN0LmFzc2lnbih7bWFyZ2luVG9wOiBwcm9wcy5tZW51T2Zmc2V0fSwgU3R5bGUud2VhdmUpfVxuXHRcdFx0XHRvbmNsaWNrPXt0aGlzLm9uRGVzZWxlY3R9XG5cdFx0XHQ+XG5cdFx0XHRcdDxXZWF2ZUhlYWRlcnNcblx0XHRcdFx0XHRzY2VuZXM9e3Byb3BzLnNjZW5lc31cblx0XHRcdFx0XHRsb2NhdGlvbnM9e3Byb3BzLmxvY2F0aW9uc31cblx0XHRcdFx0XHR3aW5kb3dXaWR0aD17cHJvcHMud2luZG93V2lkdGh9XG5cdFx0XHRcdC8+XG5cdFx0XHRcdDxXZWF2ZUJhY2tncm91bmRcblx0XHRcdFx0XHRzY2VuZXM9e3Byb3BzLnNjZW5lcy5sZW5ndGh9XG5cdFx0XHRcdFx0bG9jYXRpb25zPXtwcm9wcy5sb2NhdGlvbnMubGVuZ3RofVxuXHRcdFx0XHRcdG1lbnVPZmZzZXQ9e3Byb3BzLm1lbnVPZmZzZXR9XG5cdFx0XHRcdC8+XG5cdFx0XHRcdDxkaXYgZGF0YS1pcz1cIldlYXZlXCIgc3R5bGU9e1N0eWxlLnNjZW5lc30+XG5cdFx0XHRcdFx0e3Byb3BzLnNjZW5lcy5tYXAoKHNsaWNlLCBpKSA9PlxuXHRcdFx0XHRcdFx0PFNsaWNlVmlld1xuXHRcdFx0XHRcdFx0XHRpZD17aX1cblx0XHRcdFx0XHRcdFx0c2VsZWN0aW9uPXsoc3RhdGUuc2VsZWN0aW9uICYmIHN0YXRlLnNlbGVjdGlvbi5zbGljZUluZGV4ID09PSBpKSA/IHN0YXRlLnNlbGVjdGlvbiA6IG51bGx9XG5cdFx0XHRcdFx0XHRcdHNsaWNlPXtzbGljZX1cblx0XHRcdFx0XHRcdFx0dGhyZWFkcz17cHJvcHMudGhyZWFkc31cblx0XHRcdFx0XHRcdFx0b25TZWxlY3Q9e3RoaXMub25TZWxlY3R9XG5cdFx0XHRcdFx0XHRcdG9uRGVzZWxlY3Q9e3RoaXMub25EZXNlbGVjdH1cblx0XHRcdFx0XHRcdFx0ZWRpdE5vdGU9e3Byb3BzLmVkaXROb3RlfVxuXHRcdFx0XHRcdFx0Lz5cblx0XHRcdFx0XHQpfVxuXHRcdFx0XHQ8L2Rpdj5cblx0XHRcdDwvZGl2PlxuXHRcdClcblx0fVxuXG5cdGFjdGl2ZU5vdGVNZW51KCkge1xuXHRcdHRoaXMuY29udGV4dC51c2VNZW51KHVuZGVmaW5lZCwgW1xuXHRcdFx0W1xuXHRcdFx0XHRBcHBNZW51LmJ0bignbW92ZScsKCkgPT4ge1xuXHRcdFx0XHRcdHRoaXMuYWxsb3dEZXNlbGVjdCA9IGZhbHNlO1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKFwiVE9ETyFcIilcblx0XHRcdFx0fSlcblx0XHRcdF0sW1xuXHRcdFx0XHRBcHBNZW51LmJ0bignZWRpdCcsKCkgPT4ge1xuXHRcdFx0XHRcdHRoaXMuYWxsb3dEZXNlbGVjdCA9IGZhbHNlO1xuXHRcdFx0XHRcdHRoaXMucHJvcHMuZWRpdE5vdGUodGhpcy5zZWxlY3Rpb25bMF0pXG5cdFx0XHRcdH0pXG5cdFx0XHRdLFtcblx0XHRcdFx0QXBwTWVudS5kZWxldGVCdG4oKCkgPT4ge1xuXHRcdFx0XHRcdHRoaXMuY29udGV4dC5kbygnREVMRVRFX05PVEUnLCB0aGlzLnNlbGVjdGlvblswXSlcblx0XHRcdFx0XHR0aGlzLmFsbG93RGVzZWxlY3QgPSB0cnVlO1xuXHRcdFx0XHRcdHRoaXMubm90ZURlc2VsZWN0ZWQoKTtcblx0XHRcdFx0fSlcblx0XHRcdF1cblx0XHRdKTtcblx0fVxuXG5cdG9uU2VsZWN0KGNvb3JkcywgaSkge1xuXHRcdHRoaXMuc2V0U3RhdGUoe3NlbGVjdGlvbjogY29vcmRzfSk7XG5cdFx0Ly90aGlzLmFjdGl2ZU5vdGVNZW51KCk7XG5cdH1cblxuXHRvbkRlc2VsZWN0KGV2ZW50KSB7XG5cdFx0dGhpcy5ub3RlRGVzZWxlY3RlZCgpO1xuXHR9XG5cblx0bm90ZURlc2VsZWN0ZWQoKSB7XG5cdFx0aWYgKHRoaXMuYWxsb3dEZXNlbGVjdCkge1xuXHRcdFx0dGhpcy5zZXRTdGF0ZSh7c2VsZWN0aW9uOiBudWxsfSk7XG5cdFx0fVxuXHR9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gV2VhdmVWaWV3OyIsIi8vIE9iamVjdC5hc3NpZ24gUE9MWUZJTExcbi8vIHNvdXJjZTogaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvSmF2YVNjcmlwdC9SZWZlcmVuY2UvR2xvYmFsX09iamVjdHMvT2JqZWN0L2Fzc2lnbiNQb2x5ZmlsbFxuLy9cbmlmICh0eXBlb2YgT2JqZWN0LmFzc2lnbiAhPSAnZnVuY3Rpb24nKSB7XG5cdE9iamVjdC5hc3NpZ24gPSBmdW5jdGlvbih0YXJnZXQsIHZhckFyZ3MpIHsgLy8gLmxlbmd0aCBvZiBmdW5jdGlvbiBpcyAyXG5cdFx0J3VzZSBzdHJpY3QnO1xuXHRcdGlmICh0YXJnZXQgPT0gbnVsbCkgeyAvLyBUeXBlRXJyb3IgaWYgdW5kZWZpbmVkIG9yIG51bGxcblx0XHRcdHRocm93IG5ldyBUeXBlRXJyb3IoJ0Nhbm5vdCBjb252ZXJ0IHVuZGVmaW5lZCBvciBudWxsIHRvIG9iamVjdCcpO1xuXHRcdH1cblxuXHRcdHZhciB0byA9IE9iamVjdCh0YXJnZXQpO1xuXG5cdFx0Zm9yICh2YXIgaW5kZXggPSAxOyBpbmRleCA8IGFyZ3VtZW50cy5sZW5ndGg7IGluZGV4KyspIHtcblx0XHRcdHZhciBuZXh0U291cmNlID0gYXJndW1lbnRzW2luZGV4XTtcblxuXHRcdFx0aWYgKG5leHRTb3VyY2UgIT0gbnVsbCkgeyAvLyBTa2lwIG92ZXIgaWYgdW5kZWZpbmVkIG9yIG51bGxcblx0XHRcdFx0Zm9yICh2YXIgbmV4dEtleSBpbiBuZXh0U291cmNlKSB7XG5cdFx0XHRcdFx0Ly8gQXZvaWQgYnVncyB3aGVuIGhhc093blByb3BlcnR5IGlzIHNoYWRvd2VkXG5cdFx0XHRcdFx0aWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChuZXh0U291cmNlLCBuZXh0S2V5KSkge1xuXHRcdFx0XHRcdFx0dG9bbmV4dEtleV0gPSBuZXh0U291cmNlW25leHRLZXldO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gdG87XG5cdH07XG59Il19
