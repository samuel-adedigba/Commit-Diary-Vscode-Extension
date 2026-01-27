"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// ../../node_modules/.pnpm/ms@2.1.3/node_modules/ms/index.js
var require_ms = __commonJS({
  "../../node_modules/.pnpm/ms@2.1.3/node_modules/ms/index.js"(exports2, module2) {
    var s = 1e3;
    var m = s * 60;
    var h = m * 60;
    var d = h * 24;
    var w = d * 7;
    var y = d * 365.25;
    module2.exports = function(val, options) {
      options = options || {};
      var type = typeof val;
      if (type === "string" && val.length > 0) {
        return parse(val);
      } else if (type === "number" && isFinite(val)) {
        return options.long ? fmtLong(val) : fmtShort(val);
      }
      throw new Error(
        "val is not a non-empty string or a valid number. val=" + JSON.stringify(val)
      );
    };
    function parse(str) {
      str = String(str);
      if (str.length > 100) {
        return;
      }
      var match = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(
        str
      );
      if (!match) {
        return;
      }
      var n = parseFloat(match[1]);
      var type = (match[2] || "ms").toLowerCase();
      switch (type) {
        case "years":
        case "year":
        case "yrs":
        case "yr":
        case "y":
          return n * y;
        case "weeks":
        case "week":
        case "w":
          return n * w;
        case "days":
        case "day":
        case "d":
          return n * d;
        case "hours":
        case "hour":
        case "hrs":
        case "hr":
        case "h":
          return n * h;
        case "minutes":
        case "minute":
        case "mins":
        case "min":
        case "m":
          return n * m;
        case "seconds":
        case "second":
        case "secs":
        case "sec":
        case "s":
          return n * s;
        case "milliseconds":
        case "millisecond":
        case "msecs":
        case "msec":
        case "ms":
          return n;
        default:
          return void 0;
      }
    }
    function fmtShort(ms) {
      var msAbs = Math.abs(ms);
      if (msAbs >= d) {
        return Math.round(ms / d) + "d";
      }
      if (msAbs >= h) {
        return Math.round(ms / h) + "h";
      }
      if (msAbs >= m) {
        return Math.round(ms / m) + "m";
      }
      if (msAbs >= s) {
        return Math.round(ms / s) + "s";
      }
      return ms + "ms";
    }
    function fmtLong(ms) {
      var msAbs = Math.abs(ms);
      if (msAbs >= d) {
        return plural(ms, msAbs, d, "day");
      }
      if (msAbs >= h) {
        return plural(ms, msAbs, h, "hour");
      }
      if (msAbs >= m) {
        return plural(ms, msAbs, m, "minute");
      }
      if (msAbs >= s) {
        return plural(ms, msAbs, s, "second");
      }
      return ms + " ms";
    }
    function plural(ms, msAbs, n, name) {
      var isPlural = msAbs >= n * 1.5;
      return Math.round(ms / n) + " " + name + (isPlural ? "s" : "");
    }
  }
});

// ../../node_modules/.pnpm/debug@4.4.3/node_modules/debug/src/common.js
var require_common = __commonJS({
  "../../node_modules/.pnpm/debug@4.4.3/node_modules/debug/src/common.js"(exports2, module2) {
    function setup(env2) {
      createDebug.debug = createDebug;
      createDebug.default = createDebug;
      createDebug.coerce = coerce;
      createDebug.disable = disable;
      createDebug.enable = enable;
      createDebug.enabled = enabled;
      createDebug.humanize = require_ms();
      createDebug.destroy = destroy;
      Object.keys(env2).forEach((key) => {
        createDebug[key] = env2[key];
      });
      createDebug.names = [];
      createDebug.skips = [];
      createDebug.formatters = {};
      function selectColor(namespace) {
        let hash = 0;
        for (let i = 0; i < namespace.length; i++) {
          hash = (hash << 5) - hash + namespace.charCodeAt(i);
          hash |= 0;
        }
        return createDebug.colors[Math.abs(hash) % createDebug.colors.length];
      }
      createDebug.selectColor = selectColor;
      function createDebug(namespace) {
        let prevTime;
        let enableOverride = null;
        let namespacesCache;
        let enabledCache;
        function debug2(...args) {
          if (!debug2.enabled) {
            return;
          }
          const self2 = debug2;
          const curr = Number(/* @__PURE__ */ new Date());
          const ms = curr - (prevTime || curr);
          self2.diff = ms;
          self2.prev = prevTime;
          self2.curr = curr;
          prevTime = curr;
          args[0] = createDebug.coerce(args[0]);
          if (typeof args[0] !== "string") {
            args.unshift("%O");
          }
          let index = 0;
          args[0] = args[0].replace(/%([a-zA-Z%])/g, (match, format) => {
            if (match === "%%") {
              return "%";
            }
            index++;
            const formatter = createDebug.formatters[format];
            if (typeof formatter === "function") {
              const val = args[index];
              match = formatter.call(self2, val);
              args.splice(index, 1);
              index--;
            }
            return match;
          });
          createDebug.formatArgs.call(self2, args);
          const logFn = self2.log || createDebug.log;
          logFn.apply(self2, args);
        }
        debug2.namespace = namespace;
        debug2.useColors = createDebug.useColors();
        debug2.color = createDebug.selectColor(namespace);
        debug2.extend = extend;
        debug2.destroy = createDebug.destroy;
        Object.defineProperty(debug2, "enabled", {
          enumerable: true,
          configurable: false,
          get: () => {
            if (enableOverride !== null) {
              return enableOverride;
            }
            if (namespacesCache !== createDebug.namespaces) {
              namespacesCache = createDebug.namespaces;
              enabledCache = createDebug.enabled(namespace);
            }
            return enabledCache;
          },
          set: (v) => {
            enableOverride = v;
          }
        });
        if (typeof createDebug.init === "function") {
          createDebug.init(debug2);
        }
        return debug2;
      }
      function extend(namespace, delimiter) {
        const newDebug = createDebug(this.namespace + (typeof delimiter === "undefined" ? ":" : delimiter) + namespace);
        newDebug.log = this.log;
        return newDebug;
      }
      function enable(namespaces) {
        createDebug.save(namespaces);
        createDebug.namespaces = namespaces;
        createDebug.names = [];
        createDebug.skips = [];
        const split = (typeof namespaces === "string" ? namespaces : "").trim().replace(/\s+/g, ",").split(",").filter(Boolean);
        for (const ns of split) {
          if (ns[0] === "-") {
            createDebug.skips.push(ns.slice(1));
          } else {
            createDebug.names.push(ns);
          }
        }
      }
      function matchesTemplate(search, template) {
        let searchIndex = 0;
        let templateIndex = 0;
        let starIndex = -1;
        let matchIndex = 0;
        while (searchIndex < search.length) {
          if (templateIndex < template.length && (template[templateIndex] === search[searchIndex] || template[templateIndex] === "*")) {
            if (template[templateIndex] === "*") {
              starIndex = templateIndex;
              matchIndex = searchIndex;
              templateIndex++;
            } else {
              searchIndex++;
              templateIndex++;
            }
          } else if (starIndex !== -1) {
            templateIndex = starIndex + 1;
            matchIndex++;
            searchIndex = matchIndex;
          } else {
            return false;
          }
        }
        while (templateIndex < template.length && template[templateIndex] === "*") {
          templateIndex++;
        }
        return templateIndex === template.length;
      }
      function disable() {
        const namespaces = [
          ...createDebug.names,
          ...createDebug.skips.map((namespace) => "-" + namespace)
        ].join(",");
        createDebug.enable("");
        return namespaces;
      }
      function enabled(name) {
        for (const skip of createDebug.skips) {
          if (matchesTemplate(name, skip)) {
            return false;
          }
        }
        for (const ns of createDebug.names) {
          if (matchesTemplate(name, ns)) {
            return true;
          }
        }
        return false;
      }
      function coerce(val) {
        if (val instanceof Error) {
          return val.stack || val.message;
        }
        return val;
      }
      function destroy() {
        console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
      }
      createDebug.enable(createDebug.load());
      return createDebug;
    }
    module2.exports = setup;
  }
});

// ../../node_modules/.pnpm/debug@4.4.3/node_modules/debug/src/browser.js
var require_browser = __commonJS({
  "../../node_modules/.pnpm/debug@4.4.3/node_modules/debug/src/browser.js"(exports2, module2) {
    exports2.formatArgs = formatArgs;
    exports2.save = save;
    exports2.load = load;
    exports2.useColors = useColors;
    exports2.storage = localstorage();
    exports2.destroy = /* @__PURE__ */ (() => {
      let warned = false;
      return () => {
        if (!warned) {
          warned = true;
          console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
        }
      };
    })();
    exports2.colors = [
      "#0000CC",
      "#0000FF",
      "#0033CC",
      "#0033FF",
      "#0066CC",
      "#0066FF",
      "#0099CC",
      "#0099FF",
      "#00CC00",
      "#00CC33",
      "#00CC66",
      "#00CC99",
      "#00CCCC",
      "#00CCFF",
      "#3300CC",
      "#3300FF",
      "#3333CC",
      "#3333FF",
      "#3366CC",
      "#3366FF",
      "#3399CC",
      "#3399FF",
      "#33CC00",
      "#33CC33",
      "#33CC66",
      "#33CC99",
      "#33CCCC",
      "#33CCFF",
      "#6600CC",
      "#6600FF",
      "#6633CC",
      "#6633FF",
      "#66CC00",
      "#66CC33",
      "#9900CC",
      "#9900FF",
      "#9933CC",
      "#9933FF",
      "#99CC00",
      "#99CC33",
      "#CC0000",
      "#CC0033",
      "#CC0066",
      "#CC0099",
      "#CC00CC",
      "#CC00FF",
      "#CC3300",
      "#CC3333",
      "#CC3366",
      "#CC3399",
      "#CC33CC",
      "#CC33FF",
      "#CC6600",
      "#CC6633",
      "#CC9900",
      "#CC9933",
      "#CCCC00",
      "#CCCC33",
      "#FF0000",
      "#FF0033",
      "#FF0066",
      "#FF0099",
      "#FF00CC",
      "#FF00FF",
      "#FF3300",
      "#FF3333",
      "#FF3366",
      "#FF3399",
      "#FF33CC",
      "#FF33FF",
      "#FF6600",
      "#FF6633",
      "#FF9900",
      "#FF9933",
      "#FFCC00",
      "#FFCC33"
    ];
    function useColors() {
      if (typeof window !== "undefined" && window.process && (window.process.type === "renderer" || window.process.__nwjs)) {
        return true;
      }
      if (typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/)) {
        return false;
      }
      let m;
      return typeof document !== "undefined" && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance || // Is firebug? http://stackoverflow.com/a/398120/376773
      typeof window !== "undefined" && window.console && (window.console.firebug || window.console.exception && window.console.table) || // Is firefox >= v31?
      // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
      typeof navigator !== "undefined" && navigator.userAgent && (m = navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/)) && parseInt(m[1], 10) >= 31 || // Double check webkit in userAgent just in case we are in a worker
      typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/);
    }
    function formatArgs(args) {
      args[0] = (this.useColors ? "%c" : "") + this.namespace + (this.useColors ? " %c" : " ") + args[0] + (this.useColors ? "%c " : " ") + "+" + module2.exports.humanize(this.diff);
      if (!this.useColors) {
        return;
      }
      const c = "color: " + this.color;
      args.splice(1, 0, c, "color: inherit");
      let index = 0;
      let lastC = 0;
      args[0].replace(/%[a-zA-Z%]/g, (match) => {
        if (match === "%%") {
          return;
        }
        index++;
        if (match === "%c") {
          lastC = index;
        }
      });
      args.splice(lastC, 0, c);
    }
    exports2.log = console.debug || console.log || (() => {
    });
    function save(namespaces) {
      try {
        if (namespaces) {
          exports2.storage.setItem("debug", namespaces);
        } else {
          exports2.storage.removeItem("debug");
        }
      } catch (error) {
      }
    }
    function load() {
      let r;
      try {
        r = exports2.storage.getItem("debug") || exports2.storage.getItem("DEBUG");
      } catch (error) {
      }
      if (!r && typeof process !== "undefined" && "env" in process) {
        r = process.env.DEBUG;
      }
      return r;
    }
    function localstorage() {
      try {
        return localStorage;
      } catch (error) {
      }
    }
    module2.exports = require_common()(exports2);
    var { formatters } = module2.exports;
    formatters.j = function(v) {
      try {
        return JSON.stringify(v);
      } catch (error) {
        return "[UnexpectedJSONParseError]: " + error.message;
      }
    };
  }
});

// ../../node_modules/.pnpm/has-flag@3.0.0/node_modules/has-flag/index.js
var require_has_flag = __commonJS({
  "../../node_modules/.pnpm/has-flag@3.0.0/node_modules/has-flag/index.js"(exports2, module2) {
    "use strict";
    module2.exports = (flag, argv) => {
      argv = argv || process.argv;
      const prefix = flag.startsWith("-") ? "" : flag.length === 1 ? "-" : "--";
      const pos = argv.indexOf(prefix + flag);
      const terminatorPos = argv.indexOf("--");
      return pos !== -1 && (terminatorPos === -1 ? true : pos < terminatorPos);
    };
  }
});

// ../../node_modules/.pnpm/supports-color@5.4.0/node_modules/supports-color/index.js
var require_supports_color = __commonJS({
  "../../node_modules/.pnpm/supports-color@5.4.0/node_modules/supports-color/index.js"(exports2, module2) {
    "use strict";
    var os = require("os");
    var hasFlag = require_has_flag();
    var env2 = process.env;
    var forceColor;
    if (hasFlag("no-color") || hasFlag("no-colors") || hasFlag("color=false")) {
      forceColor = false;
    } else if (hasFlag("color") || hasFlag("colors") || hasFlag("color=true") || hasFlag("color=always")) {
      forceColor = true;
    }
    if ("FORCE_COLOR" in env2) {
      forceColor = env2.FORCE_COLOR.length === 0 || parseInt(env2.FORCE_COLOR, 10) !== 0;
    }
    function translateLevel(level) {
      if (level === 0) {
        return false;
      }
      return {
        level,
        hasBasic: true,
        has256: level >= 2,
        has16m: level >= 3
      };
    }
    function supportsColor(stream) {
      if (forceColor === false) {
        return 0;
      }
      if (hasFlag("color=16m") || hasFlag("color=full") || hasFlag("color=truecolor")) {
        return 3;
      }
      if (hasFlag("color=256")) {
        return 2;
      }
      if (stream && !stream.isTTY && forceColor !== true) {
        return 0;
      }
      const min = forceColor ? 1 : 0;
      if (process.platform === "win32") {
        const osRelease = os.release().split(".");
        if (Number(process.versions.node.split(".")[0]) >= 8 && Number(osRelease[0]) >= 10 && Number(osRelease[2]) >= 10586) {
          return Number(osRelease[2]) >= 14931 ? 3 : 2;
        }
        return 1;
      }
      if ("CI" in env2) {
        if (["TRAVIS", "CIRCLECI", "APPVEYOR", "GITLAB_CI"].some((sign) => sign in env2) || env2.CI_NAME === "codeship") {
          return 1;
        }
        return min;
      }
      if ("TEAMCITY_VERSION" in env2) {
        return /^(9\.(0*[1-9]\d*)\.|\d{2,}\.)/.test(env2.TEAMCITY_VERSION) ? 1 : 0;
      }
      if (env2.COLORTERM === "truecolor") {
        return 3;
      }
      if ("TERM_PROGRAM" in env2) {
        const version = parseInt((env2.TERM_PROGRAM_VERSION || "").split(".")[0], 10);
        switch (env2.TERM_PROGRAM) {
          case "iTerm.app":
            return version >= 3 ? 3 : 2;
          case "Apple_Terminal":
            return 2;
        }
      }
      if (/-256(color)?$/i.test(env2.TERM)) {
        return 2;
      }
      if (/^screen|^xterm|^vt100|^rxvt|color|ansi|cygwin|linux/i.test(env2.TERM)) {
        return 1;
      }
      if ("COLORTERM" in env2) {
        return 1;
      }
      if (env2.TERM === "dumb") {
        return min;
      }
      return min;
    }
    function getSupportLevel(stream) {
      const level = supportsColor(stream);
      return translateLevel(level);
    }
    module2.exports = {
      supportsColor: getSupportLevel,
      stdout: getSupportLevel(process.stdout),
      stderr: getSupportLevel(process.stderr)
    };
  }
});

// ../../node_modules/.pnpm/debug@4.4.3/node_modules/debug/src/node.js
var require_node = __commonJS({
  "../../node_modules/.pnpm/debug@4.4.3/node_modules/debug/src/node.js"(exports2, module2) {
    var tty = require("tty");
    var util = require("util");
    exports2.init = init;
    exports2.log = log;
    exports2.formatArgs = formatArgs;
    exports2.save = save;
    exports2.load = load;
    exports2.useColors = useColors;
    exports2.destroy = util.deprecate(
      () => {
      },
      "Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`."
    );
    exports2.colors = [6, 2, 3, 4, 5, 1];
    try {
      const supportsColor = require_supports_color();
      if (supportsColor && (supportsColor.stderr || supportsColor).level >= 2) {
        exports2.colors = [
          20,
          21,
          26,
          27,
          32,
          33,
          38,
          39,
          40,
          41,
          42,
          43,
          44,
          45,
          56,
          57,
          62,
          63,
          68,
          69,
          74,
          75,
          76,
          77,
          78,
          79,
          80,
          81,
          92,
          93,
          98,
          99,
          112,
          113,
          128,
          129,
          134,
          135,
          148,
          149,
          160,
          161,
          162,
          163,
          164,
          165,
          166,
          167,
          168,
          169,
          170,
          171,
          172,
          173,
          178,
          179,
          184,
          185,
          196,
          197,
          198,
          199,
          200,
          201,
          202,
          203,
          204,
          205,
          206,
          207,
          208,
          209,
          214,
          215,
          220,
          221
        ];
      }
    } catch (error) {
    }
    exports2.inspectOpts = Object.keys(process.env).filter((key) => {
      return /^debug_/i.test(key);
    }).reduce((obj, key) => {
      const prop = key.substring(6).toLowerCase().replace(/_([a-z])/g, (_, k) => {
        return k.toUpperCase();
      });
      let val = process.env[key];
      if (/^(yes|on|true|enabled)$/i.test(val)) {
        val = true;
      } else if (/^(no|off|false|disabled)$/i.test(val)) {
        val = false;
      } else if (val === "null") {
        val = null;
      } else {
        val = Number(val);
      }
      obj[prop] = val;
      return obj;
    }, {});
    function useColors() {
      return "colors" in exports2.inspectOpts ? Boolean(exports2.inspectOpts.colors) : tty.isatty(process.stderr.fd);
    }
    function formatArgs(args) {
      const { namespace: name, useColors: useColors2 } = this;
      if (useColors2) {
        const c = this.color;
        const colorCode = "\x1B[3" + (c < 8 ? c : "8;5;" + c);
        const prefix = `  ${colorCode};1m${name} \x1B[0m`;
        args[0] = prefix + args[0].split("\n").join("\n" + prefix);
        args.push(colorCode + "m+" + module2.exports.humanize(this.diff) + "\x1B[0m");
      } else {
        args[0] = getDate() + name + " " + args[0];
      }
    }
    function getDate() {
      if (exports2.inspectOpts.hideDate) {
        return "";
      }
      return (/* @__PURE__ */ new Date()).toISOString() + " ";
    }
    function log(...args) {
      return process.stderr.write(util.formatWithOptions(exports2.inspectOpts, ...args) + "\n");
    }
    function save(namespaces) {
      if (namespaces) {
        process.env.DEBUG = namespaces;
      } else {
        delete process.env.DEBUG;
      }
    }
    function load() {
      return process.env.DEBUG;
    }
    function init(debug2) {
      debug2.inspectOpts = {};
      const keys = Object.keys(exports2.inspectOpts);
      for (let i = 0; i < keys.length; i++) {
        debug2.inspectOpts[keys[i]] = exports2.inspectOpts[keys[i]];
      }
    }
    module2.exports = require_common()(exports2);
    var { formatters } = module2.exports;
    formatters.o = function(v) {
      this.inspectOpts.colors = this.useColors;
      return util.inspect(v, this.inspectOpts).split("\n").map((str) => str.trim()).join(" ");
    };
    formatters.O = function(v) {
      this.inspectOpts.colors = this.useColors;
      return util.inspect(v, this.inspectOpts);
    };
  }
});

// ../../node_modules/.pnpm/debug@4.4.3/node_modules/debug/src/index.js
var require_src = __commonJS({
  "../../node_modules/.pnpm/debug@4.4.3/node_modules/debug/src/index.js"(exports2, module2) {
    if (typeof process === "undefined" || process.type === "renderer" || process.browser === true || process.__nwjs) {
      module2.exports = require_browser();
    } else {
      module2.exports = require_node();
    }
  }
});

// ../../node_modules/.pnpm/@kwsites+file-exists@1.1.1/node_modules/@kwsites/file-exists/dist/src/index.js
var require_src2 = __commonJS({
  "../../node_modules/.pnpm/@kwsites+file-exists@1.1.1/node_modules/@kwsites/file-exists/dist/src/index.js"(exports2) {
    "use strict";
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    var fs_1 = require("fs");
    var debug_1 = __importDefault(require_src());
    var log = debug_1.default("@kwsites/file-exists");
    function check(path4, isFile, isDirectory) {
      log(`checking %s`, path4);
      try {
        const stat = fs_1.statSync(path4);
        if (stat.isFile() && isFile) {
          log(`[OK] path represents a file`);
          return true;
        }
        if (stat.isDirectory() && isDirectory) {
          log(`[OK] path represents a directory`);
          return true;
        }
        log(`[FAIL] path represents something other than a file or directory`);
        return false;
      } catch (e) {
        if (e.code === "ENOENT") {
          log(`[FAIL] path is not accessible: %o`, e);
          return false;
        }
        log(`[FATAL] %o`, e);
        throw e;
      }
    }
    function exists2(path4, type = exports2.READABLE) {
      return check(path4, (type & exports2.FILE) > 0, (type & exports2.FOLDER) > 0);
    }
    exports2.exists = exists2;
    exports2.FILE = 1;
    exports2.FOLDER = 2;
    exports2.READABLE = exports2.FILE + exports2.FOLDER;
  }
});

// ../../node_modules/.pnpm/@kwsites+file-exists@1.1.1/node_modules/@kwsites/file-exists/dist/index.js
var require_dist = __commonJS({
  "../../node_modules/.pnpm/@kwsites+file-exists@1.1.1/node_modules/@kwsites/file-exists/dist/index.js"(exports2) {
    "use strict";
    function __export3(m) {
      for (var p in m) if (!exports2.hasOwnProperty(p)) exports2[p] = m[p];
    }
    Object.defineProperty(exports2, "__esModule", { value: true });
    __export3(require_src2());
  }
});

// ../../node_modules/.pnpm/@kwsites+promise-deferred@1.1.1/node_modules/@kwsites/promise-deferred/dist/index.js
var require_dist2 = __commonJS({
  "../../node_modules/.pnpm/@kwsites+promise-deferred@1.1.1/node_modules/@kwsites/promise-deferred/dist/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.createDeferred = exports2.deferred = void 0;
    function deferred2() {
      let done;
      let fail;
      let status = "pending";
      const promise = new Promise((_done, _fail) => {
        done = _done;
        fail = _fail;
      });
      return {
        promise,
        done(result) {
          if (status === "pending") {
            status = "resolved";
            done(result);
          }
        },
        fail(error) {
          if (status === "pending") {
            status = "rejected";
            fail(error);
          }
        },
        get fulfilled() {
          return status !== "pending";
        },
        get status() {
          return status;
        }
      };
    }
    exports2.deferred = deferred2;
    exports2.createDeferred = deferred2;
    exports2.default = deferred2;
  }
});

// ../../node_modules/.pnpm/sql.js@1.13.0/node_modules/sql.js/dist/sql-wasm.js
var require_sql_wasm = __commonJS({
  "../../node_modules/.pnpm/sql.js@1.13.0/node_modules/sql.js/dist/sql-wasm.js"(exports2, module2) {
    var initSqlJsPromise = void 0;
    var initSqlJs2 = function(moduleConfig) {
      if (initSqlJsPromise) {
        return initSqlJsPromise;
      }
      initSqlJsPromise = new Promise(function(resolveModule, reject) {
        var Module = typeof moduleConfig !== "undefined" ? moduleConfig : {};
        var originalOnAbortFunction = Module["onAbort"];
        Module["onAbort"] = function(errorThatCausedAbort) {
          reject(new Error(errorThatCausedAbort));
          if (originalOnAbortFunction) {
            originalOnAbortFunction(errorThatCausedAbort);
          }
        };
        Module["postRun"] = Module["postRun"] || [];
        Module["postRun"].push(function() {
          resolveModule(Module);
        });
        module2 = void 0;
        var f;
        f ||= typeof Module != "undefined" ? Module : {};
        var aa = "object" == typeof window, ba = "undefined" != typeof WorkerGlobalScope, ca = "object" == typeof process && "object" == typeof process.versions && "string" == typeof process.versions.node && "renderer" != process.type;
        "use strict";
        f.onRuntimeInitialized = function() {
          function a(g, l) {
            switch (typeof l) {
              case "boolean":
                dc(g, l ? 1 : 0);
                break;
              case "number":
                ec(g, l);
                break;
              case "string":
                fc(g, l, -1, -1);
                break;
              case "object":
                if (null === l) lb(g);
                else if (null != l.length) {
                  var n = da(l, ea);
                  gc(g, n, l.length, -1);
                  fa(n);
                } else va(g, "Wrong API use : tried to return a value of an unknown type (" + l + ").", -1);
                break;
              default:
                lb(g);
            }
          }
          function b(g, l) {
            for (var n = [], r = 0; r < g; r += 1) {
              var t = m(l + 4 * r, "i32"), y = hc(t);
              if (1 === y || 2 === y) t = ic(t);
              else if (3 === y) t = jc(t);
              else if (4 === y) {
                y = t;
                t = kc(y);
                y = lc(y);
                for (var L = new Uint8Array(t), J = 0; J < t; J += 1) L[J] = p[y + J];
                t = L;
              } else t = null;
              n.push(t);
            }
            return n;
          }
          function c(g, l) {
            this.Qa = g;
            this.db = l;
            this.Oa = 1;
            this.lb = [];
          }
          function d(g, l) {
            this.db = l;
            l = ha(g) + 1;
            this.eb = ia(l);
            if (null === this.eb) throw Error("Unable to allocate memory for the SQL string");
            u(g, x, this.eb, l);
            this.kb = this.eb;
            this.Za = this.pb = null;
          }
          function e(g) {
            this.filename = "dbfile_" + (4294967295 * Math.random() >>> 0);
            if (null != g) {
              var l = this.filename, n = "/", r = l;
              n && (n = "string" == typeof n ? n : ja(n), r = l ? ka(n + "/" + l) : n);
              l = la(true, true);
              r = ma(r, l);
              if (g) {
                if ("string" == typeof g) {
                  n = Array(g.length);
                  for (var t = 0, y = g.length; t < y; ++t) n[t] = g.charCodeAt(t);
                  g = n;
                }
                na(r, l | 146);
                n = oa(r, 577);
                pa(n, g, 0, g.length, 0);
                qa(n);
                na(r, l);
              }
            }
            this.handleError(q(this.filename, h));
            this.db = m(h, "i32");
            ob(this.db);
            this.fb = {};
            this.Sa = {};
          }
          var h = z(4), k = f.cwrap, q = k("sqlite3_open", "number", ["string", "number"]), w = k("sqlite3_close_v2", "number", ["number"]), v = k("sqlite3_exec", "number", ["number", "string", "number", "number", "number"]), C = k("sqlite3_changes", "number", ["number"]), G = k("sqlite3_prepare_v2", "number", ["number", "string", "number", "number", "number"]), pb = k("sqlite3_sql", "string", ["number"]), nc = k("sqlite3_normalized_sql", "string", ["number"]), qb = k("sqlite3_prepare_v2", "number", ["number", "number", "number", "number", "number"]), oc = k("sqlite3_bind_text", "number", ["number", "number", "number", "number", "number"]), rb = k("sqlite3_bind_blob", "number", ["number", "number", "number", "number", "number"]), pc = k("sqlite3_bind_double", "number", ["number", "number", "number"]), qc = k(
            "sqlite3_bind_int",
            "number",
            ["number", "number", "number"]
          ), rc = k("sqlite3_bind_parameter_index", "number", ["number", "string"]), sc = k("sqlite3_step", "number", ["number"]), tc = k("sqlite3_errmsg", "string", ["number"]), uc = k("sqlite3_column_count", "number", ["number"]), vc = k("sqlite3_data_count", "number", ["number"]), wc = k("sqlite3_column_double", "number", ["number", "number"]), sb = k("sqlite3_column_text", "string", ["number", "number"]), xc = k("sqlite3_column_blob", "number", ["number", "number"]), yc = k("sqlite3_column_bytes", "number", [
            "number",
            "number"
          ]), zc = k("sqlite3_column_type", "number", ["number", "number"]), Ac = k("sqlite3_column_name", "string", ["number", "number"]), Bc = k("sqlite3_reset", "number", ["number"]), Cc = k("sqlite3_clear_bindings", "number", ["number"]), Dc = k("sqlite3_finalize", "number", ["number"]), tb = k("sqlite3_create_function_v2", "number", "number string number number number number number number number".split(" ")), hc = k("sqlite3_value_type", "number", ["number"]), kc = k("sqlite3_value_bytes", "number", ["number"]), jc = k(
            "sqlite3_value_text",
            "string",
            ["number"]
          ), lc = k("sqlite3_value_blob", "number", ["number"]), ic = k("sqlite3_value_double", "number", ["number"]), ec = k("sqlite3_result_double", "", ["number", "number"]), lb = k("sqlite3_result_null", "", ["number"]), fc = k("sqlite3_result_text", "", ["number", "string", "number", "number"]), gc = k("sqlite3_result_blob", "", ["number", "number", "number", "number"]), dc = k("sqlite3_result_int", "", ["number", "number"]), va = k("sqlite3_result_error", "", ["number", "string", "number"]), ub = k(
            "sqlite3_aggregate_context",
            "number",
            ["number", "number"]
          ), ob = k("RegisterExtensionFunctions", "number", ["number"]), vb = k("sqlite3_update_hook", "number", ["number", "number", "number"]);
          c.prototype.bind = function(g) {
            if (!this.Qa) throw "Statement closed";
            this.reset();
            return Array.isArray(g) ? this.Cb(g) : null != g && "object" === typeof g ? this.Db(g) : true;
          };
          c.prototype.step = function() {
            if (!this.Qa) throw "Statement closed";
            this.Oa = 1;
            var g = sc(this.Qa);
            switch (g) {
              case 100:
                return true;
              case 101:
                return false;
              default:
                throw this.db.handleError(g);
            }
          };
          c.prototype.wb = function(g) {
            null == g && (g = this.Oa, this.Oa += 1);
            return wc(this.Qa, g);
          };
          c.prototype.Gb = function(g) {
            null == g && (g = this.Oa, this.Oa += 1);
            g = sb(this.Qa, g);
            if ("function" !== typeof BigInt) throw Error("BigInt is not supported");
            return BigInt(g);
          };
          c.prototype.Hb = function(g) {
            null == g && (g = this.Oa, this.Oa += 1);
            return sb(this.Qa, g);
          };
          c.prototype.getBlob = function(g) {
            null == g && (g = this.Oa, this.Oa += 1);
            var l = yc(this.Qa, g);
            g = xc(this.Qa, g);
            for (var n = new Uint8Array(l), r = 0; r < l; r += 1) n[r] = p[g + r];
            return n;
          };
          c.prototype.get = function(g, l) {
            l = l || {};
            null != g && this.bind(g) && this.step();
            g = [];
            for (var n = vc(this.Qa), r = 0; r < n; r += 1) switch (zc(this.Qa, r)) {
              case 1:
                var t = l.useBigInt ? this.Gb(r) : this.wb(r);
                g.push(t);
                break;
              case 2:
                g.push(this.wb(r));
                break;
              case 3:
                g.push(this.Hb(r));
                break;
              case 4:
                g.push(this.getBlob(r));
                break;
              default:
                g.push(null);
            }
            return g;
          };
          c.prototype.getColumnNames = function() {
            for (var g = [], l = uc(this.Qa), n = 0; n < l; n += 1) g.push(Ac(this.Qa, n));
            return g;
          };
          c.prototype.getAsObject = function(g, l) {
            g = this.get(g, l);
            l = this.getColumnNames();
            for (var n = {}, r = 0; r < l.length; r += 1) n[l[r]] = g[r];
            return n;
          };
          c.prototype.getSQL = function() {
            return pb(this.Qa);
          };
          c.prototype.getNormalizedSQL = function() {
            return nc(this.Qa);
          };
          c.prototype.run = function(g) {
            null != g && this.bind(g);
            this.step();
            return this.reset();
          };
          c.prototype.sb = function(g, l) {
            null == l && (l = this.Oa, this.Oa += 1);
            g = ra(g);
            var n = da(g, ea);
            this.lb.push(n);
            this.db.handleError(oc(this.Qa, l, n, g.length - 1, 0));
          };
          c.prototype.Bb = function(g, l) {
            null == l && (l = this.Oa, this.Oa += 1);
            var n = da(g, ea);
            this.lb.push(n);
            this.db.handleError(rb(
              this.Qa,
              l,
              n,
              g.length,
              0
            ));
          };
          c.prototype.rb = function(g, l) {
            null == l && (l = this.Oa, this.Oa += 1);
            this.db.handleError((g === (g | 0) ? qc : pc)(this.Qa, l, g));
          };
          c.prototype.Eb = function(g) {
            null == g && (g = this.Oa, this.Oa += 1);
            rb(this.Qa, g, 0, 0, 0);
          };
          c.prototype.tb = function(g, l) {
            null == l && (l = this.Oa, this.Oa += 1);
            switch (typeof g) {
              case "string":
                this.sb(g, l);
                return;
              case "number":
                this.rb(g, l);
                return;
              case "bigint":
                this.sb(g.toString(), l);
                return;
              case "boolean":
                this.rb(g + 0, l);
                return;
              case "object":
                if (null === g) {
                  this.Eb(l);
                  return;
                }
                if (null != g.length) {
                  this.Bb(
                    g,
                    l
                  );
                  return;
                }
            }
            throw "Wrong API use : tried to bind a value of an unknown type (" + g + ").";
          };
          c.prototype.Db = function(g) {
            var l = this;
            Object.keys(g).forEach(function(n) {
              var r = rc(l.Qa, n);
              0 !== r && l.tb(g[n], r);
            });
            return true;
          };
          c.prototype.Cb = function(g) {
            for (var l = 0; l < g.length; l += 1) this.tb(g[l], l + 1);
            return true;
          };
          c.prototype.reset = function() {
            this.freemem();
            return 0 === Cc(this.Qa) && 0 === Bc(this.Qa);
          };
          c.prototype.freemem = function() {
            for (var g; void 0 !== (g = this.lb.pop()); ) fa(g);
          };
          c.prototype.free = function() {
            this.freemem();
            var g = 0 === Dc(this.Qa);
            delete this.db.fb[this.Qa];
            this.Qa = 0;
            return g;
          };
          d.prototype.next = function() {
            if (null === this.eb) return { done: true };
            null !== this.Za && (this.Za.free(), this.Za = null);
            if (!this.db.db) throw this.mb(), Error("Database closed");
            var g = sa(), l = z(4);
            ta(h);
            ta(l);
            try {
              this.db.handleError(qb(this.db.db, this.kb, -1, h, l));
              this.kb = m(l, "i32");
              var n = m(h, "i32");
              if (0 === n) return this.mb(), { done: true };
              this.Za = new c(n, this.db);
              this.db.fb[n] = this.Za;
              return { value: this.Za, done: false };
            } catch (r) {
              throw this.pb = ua(this.kb), this.mb(), r;
            } finally {
              wa(g);
            }
          };
          d.prototype.mb = function() {
            fa(this.eb);
            this.eb = null;
          };
          d.prototype.getRemainingSQL = function() {
            return null !== this.pb ? this.pb : ua(this.kb);
          };
          "function" === typeof Symbol && "symbol" === typeof Symbol.iterator && (d.prototype[Symbol.iterator] = function() {
            return this;
          });
          e.prototype.run = function(g, l) {
            if (!this.db) throw "Database closed";
            if (l) {
              g = this.prepare(g, l);
              try {
                g.step();
              } finally {
                g.free();
              }
            } else this.handleError(v(this.db, g, 0, 0, h));
            return this;
          };
          e.prototype.exec = function(g, l, n) {
            if (!this.db) throw "Database closed";
            var r = sa(), t = null;
            try {
              var y = xa(g), L = z(4);
              for (g = []; 0 !== m(y, "i8"); ) {
                ta(h);
                ta(L);
                this.handleError(qb(this.db, y, -1, h, L));
                var J = m(h, "i32");
                y = m(L, "i32");
                if (0 !== J) {
                  var I = null;
                  t = new c(J, this);
                  for (null != l && t.bind(l); t.step(); ) null === I && (I = { columns: t.getColumnNames(), values: [] }, g.push(I)), I.values.push(t.get(null, n));
                  t.free();
                }
              }
              return g;
            } catch (M) {
              throw t && t.free(), M;
            } finally {
              wa(r);
            }
          };
          e.prototype.each = function(g, l, n, r, t) {
            "function" === typeof l && (r = n, n = l, l = void 0);
            g = this.prepare(g, l);
            try {
              for (; g.step(); ) n(g.getAsObject(
                null,
                t
              ));
            } finally {
              g.free();
            }
            if ("function" === typeof r) return r();
          };
          e.prototype.prepare = function(g, l) {
            ta(h);
            this.handleError(G(this.db, g, -1, h, 0));
            g = m(h, "i32");
            if (0 === g) throw "Nothing to prepare";
            var n = new c(g, this);
            null != l && n.bind(l);
            return this.fb[g] = n;
          };
          e.prototype.iterateStatements = function(g) {
            return new d(g, this);
          };
          e.prototype["export"] = function() {
            Object.values(this.fb).forEach(function(l) {
              l.free();
            });
            Object.values(this.Sa).forEach(A);
            this.Sa = {};
            this.handleError(w(this.db));
            var g = ya(this.filename);
            this.handleError(q(
              this.filename,
              h
            ));
            this.db = m(h, "i32");
            ob(this.db);
            return g;
          };
          e.prototype.close = function() {
            null !== this.db && (Object.values(this.fb).forEach(function(g) {
              g.free();
            }), Object.values(this.Sa).forEach(A), this.Sa = {}, this.Ya && (A(this.Ya), this.Ya = void 0), this.handleError(w(this.db)), za("/" + this.filename), this.db = null);
          };
          e.prototype.handleError = function(g) {
            if (0 === g) return null;
            g = tc(this.db);
            throw Error(g);
          };
          e.prototype.getRowsModified = function() {
            return C(this.db);
          };
          e.prototype.create_function = function(g, l) {
            Object.prototype.hasOwnProperty.call(
              this.Sa,
              g
            ) && (A(this.Sa[g]), delete this.Sa[g]);
            var n = Aa(function(r, t, y) {
              t = b(t, y);
              try {
                var L = l.apply(null, t);
              } catch (J) {
                va(r, J, -1);
                return;
              }
              a(r, L);
            }, "viii");
            this.Sa[g] = n;
            this.handleError(tb(this.db, g, l.length, 1, 0, n, 0, 0, 0));
            return this;
          };
          e.prototype.create_aggregate = function(g, l) {
            var n = l.init || function() {
              return null;
            }, r = l.finalize || function(I) {
              return I;
            }, t = l.step;
            if (!t) throw "An aggregate function must have a step function in " + g;
            var y = {};
            Object.hasOwnProperty.call(this.Sa, g) && (A(this.Sa[g]), delete this.Sa[g]);
            l = g + "__finalize";
            Object.hasOwnProperty.call(this.Sa, l) && (A(this.Sa[l]), delete this.Sa[l]);
            var L = Aa(function(I, M, Ra) {
              var X = ub(I, 1);
              Object.hasOwnProperty.call(y, X) || (y[X] = n());
              M = b(M, Ra);
              M = [y[X]].concat(M);
              try {
                y[X] = t.apply(null, M);
              } catch (Fc) {
                delete y[X], va(I, Fc, -1);
              }
            }, "viii"), J = Aa(function(I) {
              var M = ub(I, 1);
              try {
                var Ra = r(y[M]);
              } catch (X) {
                delete y[M];
                va(I, X, -1);
                return;
              }
              a(I, Ra);
              delete y[M];
            }, "vi");
            this.Sa[g] = L;
            this.Sa[l] = J;
            this.handleError(tb(this.db, g, t.length - 1, 1, 0, 0, L, J, 0));
            return this;
          };
          e.prototype.updateHook = function(g) {
            this.Ya && (vb(this.db, 0, 0), A(this.Ya), this.Ya = void 0);
            g && (this.Ya = Aa(function(l, n, r, t, y) {
              switch (n) {
                case 18:
                  l = "insert";
                  break;
                case 23:
                  l = "update";
                  break;
                case 9:
                  l = "delete";
                  break;
                default:
                  throw "unknown operationCode in updateHook callback: " + n;
              }
              r = r ? B(x, r) : "";
              t = t ? B(x, t) : "";
              if (y > Number.MAX_SAFE_INTEGER) throw "rowId too big to fit inside a Number";
              g(l, r, t, Number(y));
            }, "viiiij"), vb(this.db, this.Ya, 0));
          };
          f.Database = e;
        };
        var Ba = { ...f }, Ca = "./this.program", Da = (a, b) => {
          throw b;
        }, D = "", Ea, Fa;
        if (ca) {
          var fs2 = require("fs");
          require("path");
          D = __dirname + "/";
          Fa = (a) => {
            a = Ga(a) ? new URL(a) : a;
            return fs2.readFileSync(a);
          };
          Ea = async (a) => {
            a = Ga(a) ? new URL(a) : a;
            return fs2.readFileSync(a, void 0);
          };
          !f.thisProgram && 1 < process.argv.length && (Ca = process.argv[1].replace(/\\/g, "/"));
          process.argv.slice(2);
          "undefined" != typeof module2 && (module2.exports = f);
          Da = (a, b) => {
            process.exitCode = a;
            throw b;
          };
        } else if (aa || ba) ba ? D = self.location.href : "undefined" != typeof document && document.currentScript && (D = document.currentScript.src), D = D.startsWith("blob:") ? "" : D.slice(0, D.replace(/[?#].*/, "").lastIndexOf("/") + 1), ba && (Fa = (a) => {
          var b = new XMLHttpRequest();
          b.open("GET", a, false);
          b.responseType = "arraybuffer";
          b.send(null);
          return new Uint8Array(b.response);
        }), Ea = async (a) => {
          if (Ga(a)) return new Promise((c, d) => {
            var e = new XMLHttpRequest();
            e.open("GET", a, true);
            e.responseType = "arraybuffer";
            e.onload = () => {
              200 == e.status || 0 == e.status && e.response ? c(e.response) : d(e.status);
            };
            e.onerror = d;
            e.send(null);
          });
          var b = await fetch(a, { credentials: "same-origin" });
          if (b.ok) return b.arrayBuffer();
          throw Error(b.status + " : " + b.url);
        };
        var Ha = f.print || console.log.bind(console), Ia = f.printErr || console.error.bind(console);
        Object.assign(f, Ba);
        Ba = null;
        f.thisProgram && (Ca = f.thisProgram);
        var Ja = f.wasmBinary, Ka, La = false, Ma, p, x, Na, E, F, Oa, H, Pa, Ga = (a) => a.startsWith("file://");
        function Qa() {
          var a = Ka.buffer;
          f.HEAP8 = p = new Int8Array(a);
          f.HEAP16 = Na = new Int16Array(a);
          f.HEAPU8 = x = new Uint8Array(a);
          f.HEAPU16 = new Uint16Array(a);
          f.HEAP32 = E = new Int32Array(a);
          f.HEAPU32 = F = new Uint32Array(a);
          f.HEAPF32 = Oa = new Float32Array(a);
          f.HEAPF64 = Pa = new Float64Array(a);
          f.HEAP64 = H = new BigInt64Array(a);
          f.HEAPU64 = new BigUint64Array(a);
        }
        var K = 0, Sa = null;
        function Ta(a) {
          f.onAbort?.(a);
          a = "Aborted(" + a + ")";
          Ia(a);
          La = true;
          throw new WebAssembly.RuntimeError(a + ". Build with -sASSERTIONS for more info.");
        }
        var Ua;
        async function Va(a) {
          if (!Ja) try {
            var b = await Ea(a);
            return new Uint8Array(b);
          } catch {
          }
          if (a == Ua && Ja) a = new Uint8Array(Ja);
          else if (Fa) a = Fa(a);
          else throw "both async and sync fetching of the wasm failed";
          return a;
        }
        async function Wa(a, b) {
          try {
            var c = await Va(a);
            return await WebAssembly.instantiate(c, b);
          } catch (d) {
            Ia(`failed to asynchronously prepare wasm: ${d}`), Ta(d);
          }
        }
        async function Xa(a) {
          var b = Ua;
          if (!Ja && "function" == typeof WebAssembly.instantiateStreaming && !Ga(b) && !ca) try {
            var c = fetch(b, { credentials: "same-origin" });
            return await WebAssembly.instantiateStreaming(c, a);
          } catch (d) {
            Ia(`wasm streaming compile failed: ${d}`), Ia("falling back to ArrayBuffer instantiation");
          }
          return Wa(b, a);
        }
        class Ya {
          name = "ExitStatus";
          constructor(a) {
            this.message = `Program terminated with exit(${a})`;
            this.status = a;
          }
        }
        var Za = (a) => {
          for (; 0 < a.length; ) a.shift()(f);
        }, $a = [], ab = [], bb = () => {
          var a = f.preRun.shift();
          ab.unshift(a);
        };
        function m(a, b = "i8") {
          b.endsWith("*") && (b = "*");
          switch (b) {
            case "i1":
              return p[a];
            case "i8":
              return p[a];
            case "i16":
              return Na[a >> 1];
            case "i32":
              return E[a >> 2];
            case "i64":
              return H[a >> 3];
            case "float":
              return Oa[a >> 2];
            case "double":
              return Pa[a >> 3];
            case "*":
              return F[a >> 2];
            default:
              Ta(`invalid type for getValue: ${b}`);
          }
        }
        var cb = f.noExitRuntime || true;
        function ta(a) {
          var b = "i32";
          b.endsWith("*") && (b = "*");
          switch (b) {
            case "i1":
              p[a] = 0;
              break;
            case "i8":
              p[a] = 0;
              break;
            case "i16":
              Na[a >> 1] = 0;
              break;
            case "i32":
              E[a >> 2] = 0;
              break;
            case "i64":
              H[a >> 3] = BigInt(0);
              break;
            case "float":
              Oa[a >> 2] = 0;
              break;
            case "double":
              Pa[a >> 3] = 0;
              break;
            case "*":
              F[a >> 2] = 0;
              break;
            default:
              Ta(`invalid type for setValue: ${b}`);
          }
        }
        var db2 = "undefined" != typeof TextDecoder ? new TextDecoder() : void 0, B = (a, b = 0, c = NaN) => {
          var d = b + c;
          for (c = b; a[c] && !(c >= d); ) ++c;
          if (16 < c - b && a.buffer && db2) return db2.decode(a.subarray(b, c));
          for (d = ""; b < c; ) {
            var e = a[b++];
            if (e & 128) {
              var h = a[b++] & 63;
              if (192 == (e & 224)) d += String.fromCharCode((e & 31) << 6 | h);
              else {
                var k = a[b++] & 63;
                e = 224 == (e & 240) ? (e & 15) << 12 | h << 6 | k : (e & 7) << 18 | h << 12 | k << 6 | a[b++] & 63;
                65536 > e ? d += String.fromCharCode(e) : (e -= 65536, d += String.fromCharCode(55296 | e >> 10, 56320 | e & 1023));
              }
            } else d += String.fromCharCode(e);
          }
          return d;
        }, ua = (a, b) => a ? B(x, a, b) : "", eb = (a, b) => {
          for (var c = 0, d = a.length - 1; 0 <= d; d--) {
            var e = a[d];
            "." === e ? a.splice(d, 1) : ".." === e ? (a.splice(d, 1), c++) : c && (a.splice(d, 1), c--);
          }
          if (b) for (; c; c--) a.unshift("..");
          return a;
        }, ka = (a) => {
          var b = "/" === a.charAt(0), c = "/" === a.slice(-1);
          (a = eb(a.split("/").filter((d) => !!d), !b).join("/")) || b || (a = ".");
          a && c && (a += "/");
          return (b ? "/" : "") + a;
        }, fb = (a) => {
          var b = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/.exec(a).slice(1);
          a = b[0];
          b = b[1];
          if (!a && !b) return ".";
          b &&= b.slice(0, -1);
          return a + b;
        }, gb = (a) => a && a.match(/([^\/]+|\/)\/*$/)[1], hb = () => {
          if (ca) {
            var a = require("crypto");
            return (b) => a.randomFillSync(b);
          }
          return (b) => crypto.getRandomValues(b);
        }, ib = (a) => {
          (ib = hb())(a);
        }, jb = (...a) => {
          for (var b = "", c = false, d = a.length - 1; -1 <= d && !c; d--) {
            c = 0 <= d ? a[d] : "/";
            if ("string" != typeof c) throw new TypeError("Arguments to path.resolve must be strings");
            if (!c) return "";
            b = c + "/" + b;
            c = "/" === c.charAt(0);
          }
          b = eb(b.split("/").filter((e) => !!e), !c).join("/");
          return (c ? "/" : "") + b || ".";
        }, kb = [], ha = (a) => {
          for (var b = 0, c = 0; c < a.length; ++c) {
            var d = a.charCodeAt(c);
            127 >= d ? b++ : 2047 >= d ? b += 2 : 55296 <= d && 57343 >= d ? (b += 4, ++c) : b += 3;
          }
          return b;
        }, u = (a, b, c, d) => {
          if (!(0 < d)) return 0;
          var e = c;
          d = c + d - 1;
          for (var h = 0; h < a.length; ++h) {
            var k = a.charCodeAt(h);
            if (55296 <= k && 57343 >= k) {
              var q = a.charCodeAt(++h);
              k = 65536 + ((k & 1023) << 10) | q & 1023;
            }
            if (127 >= k) {
              if (c >= d) break;
              b[c++] = k;
            } else {
              if (2047 >= k) {
                if (c + 1 >= d) break;
                b[c++] = 192 | k >> 6;
              } else {
                if (65535 >= k) {
                  if (c + 2 >= d) break;
                  b[c++] = 224 | k >> 12;
                } else {
                  if (c + 3 >= d) break;
                  b[c++] = 240 | k >> 18;
                  b[c++] = 128 | k >> 12 & 63;
                }
                b[c++] = 128 | k >> 6 & 63;
              }
              b[c++] = 128 | k & 63;
            }
          }
          b[c] = 0;
          return c - e;
        }, ra = (a, b) => {
          var c = Array(ha(a) + 1);
          a = u(a, c, 0, c.length);
          b && (c.length = a);
          return c;
        }, mb = [];
        function nb(a, b) {
          mb[a] = { input: [], output: [], cb: b };
          wb(a, xb);
        }
        var xb = { open(a) {
          var b = mb[a.node.rdev];
          if (!b) throw new N(43);
          a.tty = b;
          a.seekable = false;
        }, close(a) {
          a.tty.cb.fsync(a.tty);
        }, fsync(a) {
          a.tty.cb.fsync(a.tty);
        }, read(a, b, c, d) {
          if (!a.tty || !a.tty.cb.xb) throw new N(60);
          for (var e = 0, h = 0; h < d; h++) {
            try {
              var k = a.tty.cb.xb(a.tty);
            } catch (q) {
              throw new N(29);
            }
            if (void 0 === k && 0 === e) throw new N(6);
            if (null === k || void 0 === k) break;
            e++;
            b[c + h] = k;
          }
          e && (a.node.atime = Date.now());
          return e;
        }, write(a, b, c, d) {
          if (!a.tty || !a.tty.cb.qb) throw new N(60);
          try {
            for (var e = 0; e < d; e++) a.tty.cb.qb(a.tty, b[c + e]);
          } catch (h) {
            throw new N(29);
          }
          d && (a.node.mtime = a.node.ctime = Date.now());
          return e;
        } }, yb = { xb() {
          a: {
            if (!kb.length) {
              var a = null;
              if (ca) {
                var b = Buffer.alloc(256), c = 0, d = process.stdin.fd;
                try {
                  c = fs2.readSync(d, b, 0, 256);
                } catch (e) {
                  if (e.toString().includes("EOF")) c = 0;
                  else throw e;
                }
                0 < c && (a = b.slice(0, c).toString("utf-8"));
              } else "undefined" != typeof window && "function" == typeof window.prompt && (a = window.prompt("Input: "), null !== a && (a += "\n"));
              if (!a) {
                a = null;
                break a;
              }
              kb = ra(a, true);
            }
            a = kb.shift();
          }
          return a;
        }, qb(a, b) {
          null === b || 10 === b ? (Ha(B(a.output)), a.output = []) : 0 != b && a.output.push(b);
        }, fsync(a) {
          0 < a.output?.length && (Ha(B(a.output)), a.output = []);
        }, Tb() {
          return { Ob: 25856, Qb: 5, Nb: 191, Pb: 35387, Mb: [3, 28, 127, 21, 4, 0, 1, 0, 17, 19, 26, 0, 18, 15, 23, 22, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] };
        }, Ub() {
          return 0;
        }, Vb() {
          return [24, 80];
        } }, zb = { qb(a, b) {
          null === b || 10 === b ? (Ia(B(a.output)), a.output = []) : 0 != b && a.output.push(b);
        }, fsync(a) {
          0 < a.output?.length && (Ia(B(a.output)), a.output = []);
        } }, O = { Wa: null, Xa() {
          return O.createNode(null, "/", 16895, 0);
        }, createNode(a, b, c, d) {
          if (24576 === (c & 61440) || 4096 === (c & 61440)) throw new N(63);
          O.Wa || (O.Wa = { dir: { node: { Ta: O.La.Ta, Ua: O.La.Ua, lookup: O.La.lookup, hb: O.La.hb, rename: O.La.rename, unlink: O.La.unlink, rmdir: O.La.rmdir, readdir: O.La.readdir, symlink: O.La.symlink }, stream: { Va: O.Ma.Va } }, file: { node: { Ta: O.La.Ta, Ua: O.La.Ua }, stream: { Va: O.Ma.Va, read: O.Ma.read, write: O.Ma.write, ib: O.Ma.ib, jb: O.Ma.jb } }, link: { node: { Ta: O.La.Ta, Ua: O.La.Ua, readlink: O.La.readlink }, stream: {} }, ub: { node: { Ta: O.La.Ta, Ua: O.La.Ua }, stream: Ab } });
          c = Bb(a, b, c, d);
          P(c.mode) ? (c.La = O.Wa.dir.node, c.Ma = O.Wa.dir.stream, c.Na = {}) : 32768 === (c.mode & 61440) ? (c.La = O.Wa.file.node, c.Ma = O.Wa.file.stream, c.Ra = 0, c.Na = null) : 40960 === (c.mode & 61440) ? (c.La = O.Wa.link.node, c.Ma = O.Wa.link.stream) : 8192 === (c.mode & 61440) && (c.La = O.Wa.ub.node, c.Ma = O.Wa.ub.stream);
          c.atime = c.mtime = c.ctime = Date.now();
          a && (a.Na[b] = c, a.atime = a.mtime = a.ctime = c.atime);
          return c;
        }, Sb(a) {
          return a.Na ? a.Na.subarray ? a.Na.subarray(0, a.Ra) : new Uint8Array(a.Na) : new Uint8Array(0);
        }, La: { Ta(a) {
          var b = {};
          b.dev = 8192 === (a.mode & 61440) ? a.id : 1;
          b.ino = a.id;
          b.mode = a.mode;
          b.nlink = 1;
          b.uid = 0;
          b.gid = 0;
          b.rdev = a.rdev;
          P(a.mode) ? b.size = 4096 : 32768 === (a.mode & 61440) ? b.size = a.Ra : 40960 === (a.mode & 61440) ? b.size = a.link.length : b.size = 0;
          b.atime = new Date(a.atime);
          b.mtime = new Date(a.mtime);
          b.ctime = new Date(a.ctime);
          b.blksize = 4096;
          b.blocks = Math.ceil(b.size / b.blksize);
          return b;
        }, Ua(a, b) {
          for (var c of ["mode", "atime", "mtime", "ctime"]) null != b[c] && (a[c] = b[c]);
          void 0 !== b.size && (b = b.size, a.Ra != b && (0 == b ? (a.Na = null, a.Ra = 0) : (c = a.Na, a.Na = new Uint8Array(b), c && a.Na.set(c.subarray(0, Math.min(b, a.Ra))), a.Ra = b)));
        }, lookup() {
          throw O.vb;
        }, hb(a, b, c, d) {
          return O.createNode(a, b, c, d);
        }, rename(a, b, c) {
          try {
            var d = Q(b, c);
          } catch (h) {
          }
          if (d) {
            if (P(a.mode)) for (var e in d.Na) throw new N(55);
            Cb(d);
          }
          delete a.parent.Na[a.name];
          b.Na[c] = a;
          a.name = c;
          b.ctime = b.mtime = a.parent.ctime = a.parent.mtime = Date.now();
        }, unlink(a, b) {
          delete a.Na[b];
          a.ctime = a.mtime = Date.now();
        }, rmdir(a, b) {
          var c = Q(a, b), d;
          for (d in c.Na) throw new N(55);
          delete a.Na[b];
          a.ctime = a.mtime = Date.now();
        }, readdir(a) {
          return [".", "..", ...Object.keys(a.Na)];
        }, symlink(a, b, c) {
          a = O.createNode(a, b, 41471, 0);
          a.link = c;
          return a;
        }, readlink(a) {
          if (40960 !== (a.mode & 61440)) throw new N(28);
          return a.link;
        } }, Ma: { read(a, b, c, d, e) {
          var h = a.node.Na;
          if (e >= a.node.Ra) return 0;
          a = Math.min(a.node.Ra - e, d);
          if (8 < a && h.subarray) b.set(h.subarray(e, e + a), c);
          else for (d = 0; d < a; d++) b[c + d] = h[e + d];
          return a;
        }, write(a, b, c, d, e, h) {
          b.buffer === p.buffer && (h = false);
          if (!d) return 0;
          a = a.node;
          a.mtime = a.ctime = Date.now();
          if (b.subarray && (!a.Na || a.Na.subarray)) {
            if (h) return a.Na = b.subarray(c, c + d), a.Ra = d;
            if (0 === a.Ra && 0 === e) return a.Na = b.slice(c, c + d), a.Ra = d;
            if (e + d <= a.Ra) return a.Na.set(b.subarray(
              c,
              c + d
            ), e), d;
          }
          h = e + d;
          var k = a.Na ? a.Na.length : 0;
          k >= h || (h = Math.max(h, k * (1048576 > k ? 2 : 1.125) >>> 0), 0 != k && (h = Math.max(h, 256)), k = a.Na, a.Na = new Uint8Array(h), 0 < a.Ra && a.Na.set(k.subarray(0, a.Ra), 0));
          if (a.Na.subarray && b.subarray) a.Na.set(b.subarray(c, c + d), e);
          else for (h = 0; h < d; h++) a.Na[e + h] = b[c + h];
          a.Ra = Math.max(a.Ra, e + d);
          return d;
        }, Va(a, b, c) {
          1 === c ? b += a.position : 2 === c && 32768 === (a.node.mode & 61440) && (b += a.node.Ra);
          if (0 > b) throw new N(28);
          return b;
        }, ib(a, b, c, d, e) {
          if (32768 !== (a.node.mode & 61440)) throw new N(43);
          a = a.node.Na;
          if (e & 2 || !a || a.buffer !== p.buffer) {
            e = true;
            d = 65536 * Math.ceil(b / 65536);
            var h = Db(65536, d);
            h && x.fill(0, h, h + d);
            d = h;
            if (!d) throw new N(48);
            if (a) {
              if (0 < c || c + b < a.length) a.subarray ? a = a.subarray(c, c + b) : a = Array.prototype.slice.call(a, c, c + b);
              p.set(a, d);
            }
          } else e = false, d = a.byteOffset;
          return { Kb: d, Ab: e };
        }, jb(a, b, c, d) {
          O.Ma.write(a, b, 0, d, c, false);
          return 0;
        } } }, la = (a, b) => {
          var c = 0;
          a && (c |= 365);
          b && (c |= 146);
          return c;
        }, Eb = null, Fb = {}, Gb = [], Hb = 1, R = null, Ib = false, Jb = true, Kb = {}, N = class {
          name = "ErrnoError";
          constructor(a) {
            this.Pa = a;
          }
        }, Lb = class {
          gb = {};
          node = null;
          get flags() {
            return this.gb.flags;
          }
          set flags(a) {
            this.gb.flags = a;
          }
          get position() {
            return this.gb.position;
          }
          set position(a) {
            this.gb.position = a;
          }
        }, Mb = class {
          La = {};
          Ma = {};
          ab = null;
          constructor(a, b, c, d) {
            a ||= this;
            this.parent = a;
            this.Xa = a.Xa;
            this.id = Hb++;
            this.name = b;
            this.mode = c;
            this.rdev = d;
            this.atime = this.mtime = this.ctime = Date.now();
          }
          get read() {
            return 365 === (this.mode & 365);
          }
          set read(a) {
            a ? this.mode |= 365 : this.mode &= -366;
          }
          get write() {
            return 146 === (this.mode & 146);
          }
          set write(a) {
            a ? this.mode |= 146 : this.mode &= -147;
          }
        };
        function S(a, b = {}) {
          if (!a) throw new N(44);
          b.nb ?? (b.nb = true);
          "/" === a.charAt(0) || (a = "//" + a);
          var c = 0;
          a: for (; 40 > c; c++) {
            a = a.split("/").filter((q) => !!q);
            for (var d = Eb, e = "/", h = 0; h < a.length; h++) {
              var k = h === a.length - 1;
              if (k && b.parent) break;
              if ("." !== a[h]) if (".." === a[h]) e = fb(e), d = d.parent;
              else {
                e = ka(e + "/" + a[h]);
                try {
                  d = Q(d, a[h]);
                } catch (q) {
                  if (44 === q?.Pa && k && b.Jb) return { path: e };
                  throw q;
                }
                !d.ab || k && !b.nb || (d = d.ab.root);
                if (40960 === (d.mode & 61440) && (!k || b.$a)) {
                  if (!d.La.readlink) throw new N(52);
                  d = d.La.readlink(d);
                  "/" === d.charAt(0) || (d = fb(e) + "/" + d);
                  a = d + "/" + a.slice(h + 1).join("/");
                  continue a;
                }
              }
            }
            return { path: e, node: d };
          }
          throw new N(32);
        }
        function ja(a) {
          for (var b; ; ) {
            if (a === a.parent) return a = a.Xa.zb, b ? "/" !== a[a.length - 1] ? `${a}/${b}` : a + b : a;
            b = b ? `${a.name}/${b}` : a.name;
            a = a.parent;
          }
        }
        function Nb(a, b) {
          for (var c = 0, d = 0; d < b.length; d++) c = (c << 5) - c + b.charCodeAt(d) | 0;
          return (a + c >>> 0) % R.length;
        }
        function Cb(a) {
          var b = Nb(a.parent.id, a.name);
          if (R[b] === a) R[b] = a.bb;
          else for (b = R[b]; b; ) {
            if (b.bb === a) {
              b.bb = a.bb;
              break;
            }
            b = b.bb;
          }
        }
        function Q(a, b) {
          var c = P(a.mode) ? (c = Ob(a, "x")) ? c : a.La.lookup ? 0 : 2 : 54;
          if (c) throw new N(c);
          for (c = R[Nb(a.id, b)]; c; c = c.bb) {
            var d = c.name;
            if (c.parent.id === a.id && d === b) return c;
          }
          return a.La.lookup(a, b);
        }
        function Bb(a, b, c, d) {
          a = new Mb(a, b, c, d);
          b = Nb(a.parent.id, a.name);
          a.bb = R[b];
          return R[b] = a;
        }
        function P(a) {
          return 16384 === (a & 61440);
        }
        function Pb(a) {
          var b = ["r", "w", "rw"][a & 3];
          a & 512 && (b += "w");
          return b;
        }
        function Ob(a, b) {
          if (Jb) return 0;
          if (!b.includes("r") || a.mode & 292) {
            if (b.includes("w") && !(a.mode & 146) || b.includes("x") && !(a.mode & 73)) return 2;
          } else return 2;
          return 0;
        }
        function Qb(a, b) {
          if (!P(a.mode)) return 54;
          try {
            return Q(a, b), 20;
          } catch (c) {
          }
          return Ob(a, "wx");
        }
        function Rb(a, b, c) {
          try {
            var d = Q(a, b);
          } catch (e) {
            return e.Pa;
          }
          if (a = Ob(a, "wx")) return a;
          if (c) {
            if (!P(d.mode)) return 54;
            if (d === d.parent || "/" === ja(d)) return 10;
          } else if (P(d.mode)) return 31;
          return 0;
        }
        function Sb(a) {
          if (!a) throw new N(63);
          return a;
        }
        function T(a) {
          a = Gb[a];
          if (!a) throw new N(8);
          return a;
        }
        function Tb(a, b = -1) {
          a = Object.assign(new Lb(), a);
          if (-1 == b) a: {
            for (b = 0; 4096 >= b; b++) if (!Gb[b]) break a;
            throw new N(33);
          }
          a.fd = b;
          return Gb[b] = a;
        }
        function Ub(a, b = -1) {
          a = Tb(a, b);
          a.Ma?.Rb?.(a);
          return a;
        }
        function Vb(a, b, c) {
          var d = a?.Ma.Ua;
          a = d ? a : b;
          d ??= b.La.Ua;
          Sb(d);
          d(a, c);
        }
        var Ab = { open(a) {
          a.Ma = Fb[a.node.rdev].Ma;
          a.Ma.open?.(a);
        }, Va() {
          throw new N(70);
        } };
        function wb(a, b) {
          Fb[a] = { Ma: b };
        }
        function Wb(a, b) {
          var c = "/" === b;
          if (c && Eb) throw new N(10);
          if (!c && b) {
            var d = S(b, { nb: false });
            b = d.path;
            d = d.node;
            if (d.ab) throw new N(10);
            if (!P(d.mode)) throw new N(54);
          }
          b = { type: a, Wb: {}, zb: b, Ib: [] };
          a = a.Xa(b);
          a.Xa = b;
          b.root = a;
          c ? Eb = a : d && (d.ab = b, d.Xa && d.Xa.Ib.push(b));
        }
        function Xb(a, b, c) {
          var d = S(a, { parent: true }).node;
          a = gb(a);
          if (!a) throw new N(28);
          if ("." === a || ".." === a) throw new N(20);
          var e = Qb(d, a);
          if (e) throw new N(e);
          if (!d.La.hb) throw new N(63);
          return d.La.hb(d, a, b, c);
        }
        function ma(a, b = 438) {
          return Xb(a, b & 4095 | 32768, 0);
        }
        function U(a, b = 511) {
          return Xb(a, b & 1023 | 16384, 0);
        }
        function Yb(a, b, c) {
          "undefined" == typeof c && (c = b, b = 438);
          Xb(a, b | 8192, c);
        }
        function Zb(a, b) {
          if (!jb(a)) throw new N(44);
          var c = S(b, { parent: true }).node;
          if (!c) throw new N(44);
          b = gb(b);
          var d = Qb(c, b);
          if (d) throw new N(d);
          if (!c.La.symlink) throw new N(63);
          c.La.symlink(c, b, a);
        }
        function $b(a) {
          var b = S(a, { parent: true }).node;
          a = gb(a);
          var c = Q(b, a), d = Rb(b, a, true);
          if (d) throw new N(d);
          if (!b.La.rmdir) throw new N(63);
          if (c.ab) throw new N(10);
          b.La.rmdir(b, a);
          Cb(c);
        }
        function za(a) {
          var b = S(a, { parent: true }).node;
          if (!b) throw new N(44);
          a = gb(a);
          var c = Q(b, a), d = Rb(b, a, false);
          if (d) throw new N(d);
          if (!b.La.unlink) throw new N(63);
          if (c.ab) throw new N(10);
          b.La.unlink(b, a);
          Cb(c);
        }
        function ac(a, b) {
          a = S(a, { $a: !b }).node;
          return Sb(a.La.Ta)(a);
        }
        function bc(a, b, c, d) {
          Vb(a, b, { mode: c & 4095 | b.mode & -4096, ctime: Date.now(), Fb: d });
        }
        function na(a, b) {
          a = "string" == typeof a ? S(a, { $a: true }).node : a;
          bc(null, a, b);
        }
        function cc(a, b, c) {
          if (P(b.mode)) throw new N(31);
          if (32768 !== (b.mode & 61440)) throw new N(28);
          var d = Ob(b, "w");
          if (d) throw new N(d);
          Vb(a, b, { size: c, timestamp: Date.now() });
        }
        function oa(a, b, c = 438) {
          if ("" === a) throw new N(44);
          if ("string" == typeof b) {
            var d = { r: 0, "r+": 2, w: 577, "w+": 578, a: 1089, "a+": 1090 }[b];
            if ("undefined" == typeof d) throw Error(`Unknown file open mode: ${b}`);
            b = d;
          }
          c = b & 64 ? c & 4095 | 32768 : 0;
          if ("object" == typeof a) d = a;
          else {
            var e = a.endsWith("/");
            a = S(a, { $a: !(b & 131072), Jb: true });
            d = a.node;
            a = a.path;
          }
          var h = false;
          if (b & 64) if (d) {
            if (b & 128) throw new N(20);
          } else {
            if (e) throw new N(31);
            d = Xb(a, c | 511, 0);
            h = true;
          }
          if (!d) throw new N(44);
          8192 === (d.mode & 61440) && (b &= -513);
          if (b & 65536 && !P(d.mode)) throw new N(54);
          if (!h && (e = d ? 40960 === (d.mode & 61440) ? 32 : P(d.mode) && ("r" !== Pb(b) || b & 576) ? 31 : Ob(d, Pb(b)) : 44)) throw new N(e);
          b & 512 && !h && (e = d, e = "string" == typeof e ? S(e, { $a: true }).node : e, cc(null, e, 0));
          b &= -131713;
          e = Tb({ node: d, path: ja(d), flags: b, seekable: true, position: 0, Ma: d.Ma, Lb: [], error: false });
          e.Ma.open && e.Ma.open(e);
          h && na(d, c & 511);
          !f.logReadFiles || b & 1 || a in Kb || (Kb[a] = 1);
          return e;
        }
        function qa(a) {
          if (null === a.fd) throw new N(8);
          a.ob && (a.ob = null);
          try {
            a.Ma.close && a.Ma.close(a);
          } catch (b) {
            throw b;
          } finally {
            Gb[a.fd] = null;
          }
          a.fd = null;
        }
        function mc(a, b, c) {
          if (null === a.fd) throw new N(8);
          if (!a.seekable || !a.Ma.Va) throw new N(70);
          if (0 != c && 1 != c && 2 != c) throw new N(28);
          a.position = a.Ma.Va(a, b, c);
          a.Lb = [];
        }
        function Ec(a, b, c, d, e) {
          if (0 > d || 0 > e) throw new N(28);
          if (null === a.fd) throw new N(8);
          if (1 === (a.flags & 2097155)) throw new N(8);
          if (P(a.node.mode)) throw new N(31);
          if (!a.Ma.read) throw new N(28);
          var h = "undefined" != typeof e;
          if (!h) e = a.position;
          else if (!a.seekable) throw new N(70);
          b = a.Ma.read(a, b, c, d, e);
          h || (a.position += b);
          return b;
        }
        function pa(a, b, c, d, e) {
          if (0 > d || 0 > e) throw new N(28);
          if (null === a.fd) throw new N(8);
          if (0 === (a.flags & 2097155)) throw new N(8);
          if (P(a.node.mode)) throw new N(31);
          if (!a.Ma.write) throw new N(28);
          a.seekable && a.flags & 1024 && mc(a, 0, 2);
          var h = "undefined" != typeof e;
          if (!h) e = a.position;
          else if (!a.seekable) throw new N(70);
          b = a.Ma.write(a, b, c, d, e, void 0);
          h || (a.position += b);
          return b;
        }
        function ya(a) {
          var b = "binary";
          if ("utf8" !== b && "binary" !== b) throw Error(`Invalid encoding type "${b}"`);
          var c;
          var d = oa(a, d || 0);
          a = ac(a).size;
          var e = new Uint8Array(a);
          Ec(d, e, 0, a, 0);
          "utf8" === b ? c = B(e) : "binary" === b && (c = e);
          qa(d);
          return c;
        }
        function V(a, b, c) {
          a = ka("/dev/" + a);
          var d = la(!!b, !!c);
          V.yb ?? (V.yb = 64);
          var e = V.yb++ << 8 | 0;
          wb(e, { open(h) {
            h.seekable = false;
          }, close() {
            c?.buffer?.length && c(10);
          }, read(h, k, q, w) {
            for (var v = 0, C = 0; C < w; C++) {
              try {
                var G = b();
              } catch (pb) {
                throw new N(29);
              }
              if (void 0 === G && 0 === v) throw new N(6);
              if (null === G || void 0 === G) break;
              v++;
              k[q + C] = G;
            }
            v && (h.node.atime = Date.now());
            return v;
          }, write(h, k, q, w) {
            for (var v = 0; v < w; v++) try {
              c(k[q + v]);
            } catch (C) {
              throw new N(29);
            }
            w && (h.node.mtime = h.node.ctime = Date.now());
            return v;
          } });
          Yb(a, d, e);
        }
        var W = {};
        function Gc(a, b, c) {
          if ("/" === b.charAt(0)) return b;
          a = -100 === a ? "/" : T(a).path;
          if (0 == b.length) {
            if (!c) throw new N(44);
            return a;
          }
          return a + "/" + b;
        }
        function Hc(a, b) {
          E[a >> 2] = b.dev;
          E[a + 4 >> 2] = b.mode;
          F[a + 8 >> 2] = b.nlink;
          E[a + 12 >> 2] = b.uid;
          E[a + 16 >> 2] = b.gid;
          E[a + 20 >> 2] = b.rdev;
          H[a + 24 >> 3] = BigInt(b.size);
          E[a + 32 >> 2] = 4096;
          E[a + 36 >> 2] = b.blocks;
          var c = b.atime.getTime(), d = b.mtime.getTime(), e = b.ctime.getTime();
          H[a + 40 >> 3] = BigInt(Math.floor(c / 1e3));
          F[a + 48 >> 2] = c % 1e3 * 1e6;
          H[a + 56 >> 3] = BigInt(Math.floor(d / 1e3));
          F[a + 64 >> 2] = d % 1e3 * 1e6;
          H[a + 72 >> 3] = BigInt(Math.floor(e / 1e3));
          F[a + 80 >> 2] = e % 1e3 * 1e6;
          H[a + 88 >> 3] = BigInt(b.ino);
          return 0;
        }
        var Ic = void 0, Jc = () => {
          var a = E[+Ic >> 2];
          Ic += 4;
          return a;
        }, Kc = 0, Lc = [0, 31, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335], Mc = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334], Nc = {}, Oc = (a) => {
          Ma = a;
          cb || 0 < Kc || (f.onExit?.(a), La = true);
          Da(a, new Ya(a));
        }, Pc = (a) => {
          if (!La) try {
            if (a(), !(cb || 0 < Kc)) try {
              Ma = a = Ma, Oc(a);
            } catch (b) {
              b instanceof Ya || "unwind" == b || Da(1, b);
            }
          } catch (b) {
            b instanceof Ya || "unwind" == b || Da(1, b);
          }
        }, Qc = {}, Sc = () => {
          if (!Rc) {
            var a = { USER: "web_user", LOGNAME: "web_user", PATH: "/", PWD: "/", HOME: "/home/web_user", LANG: ("object" == typeof navigator && navigator.languages && navigator.languages[0] || "C").replace("-", "_") + ".UTF-8", _: Ca || "./this.program" }, b;
            for (b in Qc) void 0 === Qc[b] ? delete a[b] : a[b] = Qc[b];
            var c = [];
            for (b in a) c.push(`${b}=${a[b]}`);
            Rc = c;
          }
          return Rc;
        }, Rc, xa = (a) => {
          var b = ha(a) + 1, c = z(b);
          u(a, x, c, b);
          return c;
        }, Tc = (a, b, c, d) => {
          var e = { string: (v) => {
            var C = 0;
            null !== v && void 0 !== v && 0 !== v && (C = xa(v));
            return C;
          }, array: (v) => {
            var C = z(v.length);
            p.set(v, C);
            return C;
          } };
          a = f["_" + a];
          var h = [], k = 0;
          if (d) for (var q = 0; q < d.length; q++) {
            var w = e[c[q]];
            w ? (0 === k && (k = sa()), h[q] = w(d[q])) : h[q] = d[q];
          }
          c = a(...h);
          return c = (function(v) {
            0 !== k && wa(k);
            return "string" === b ? v ? B(x, v) : "" : "boolean" === b ? !!v : v;
          })(c);
        }, ea = 0, da = (a, b) => {
          b = 1 == b ? z(a.length) : ia(a.length);
          a.subarray || a.slice || (a = new Uint8Array(a));
          x.set(a, b);
          return b;
        }, Uc, Vc = [], Y, A = (a) => {
          Uc.delete(Y.get(a));
          Y.set(a, null);
          Vc.push(a);
        }, Aa = (a, b) => {
          if (!Uc) {
            Uc = /* @__PURE__ */ new WeakMap();
            var c = Y.length;
            if (Uc) for (var d = 0; d < 0 + c; d++) {
              var e = Y.get(d);
              e && Uc.set(e, d);
            }
          }
          if (c = Uc.get(a) || 0) return c;
          if (Vc.length) c = Vc.pop();
          else {
            try {
              Y.grow(1);
            } catch (w) {
              if (!(w instanceof RangeError)) throw w;
              throw "Unable to grow wasm table. Set ALLOW_TABLE_GROWTH.";
            }
            c = Y.length - 1;
          }
          try {
            Y.set(c, a);
          } catch (w) {
            if (!(w instanceof TypeError)) throw w;
            if ("function" == typeof WebAssembly.Function) {
              var h = WebAssembly.Function;
              d = { i: "i32", j: "i64", f: "f32", d: "f64", e: "externref", p: "i32" };
              e = { parameters: [], results: "v" == b[0] ? [] : [d[b[0]]] };
              for (var k = 1; k < b.length; ++k) e.parameters.push(d[b[k]]);
              b = new h(e, a);
            } else {
              d = [1];
              e = b.slice(0, 1);
              b = b.slice(1);
              k = { i: 127, p: 127, j: 126, f: 125, d: 124, e: 111 };
              d.push(96);
              var q = b.length;
              128 > q ? d.push(q) : d.push(q % 128 | 128, q >> 7);
              for (h of b) d.push(k[h]);
              "v" == e ? d.push(0) : d.push(1, k[e]);
              b = [0, 97, 115, 109, 1, 0, 0, 0, 1];
              h = d.length;
              128 > h ? b.push(h) : b.push(h % 128 | 128, h >> 7);
              b.push(...d);
              b.push(2, 7, 1, 1, 101, 1, 102, 0, 0, 7, 5, 1, 1, 102, 0, 0);
              b = new WebAssembly.Module(new Uint8Array(b));
              b = new WebAssembly.Instance(b, { e: { f: a } }).exports.f;
            }
            Y.set(c, b);
          }
          Uc.set(a, c);
          return c;
        };
        R = Array(4096);
        Wb(O, "/");
        U("/tmp");
        U("/home");
        U("/home/web_user");
        (function() {
          U("/dev");
          wb(259, { read: () => 0, write: (d, e, h, k) => k, Va: () => 0 });
          Yb("/dev/null", 259);
          nb(1280, yb);
          nb(1536, zb);
          Yb("/dev/tty", 1280);
          Yb("/dev/tty1", 1536);
          var a = new Uint8Array(1024), b = 0, c = () => {
            0 === b && (ib(a), b = a.byteLength);
            return a[--b];
          };
          V("random", c);
          V("urandom", c);
          U("/dev/shm");
          U("/dev/shm/tmp");
        })();
        (function() {
          U("/proc");
          var a = U("/proc/self");
          U("/proc/self/fd");
          Wb({ Xa() {
            var b = Bb(a, "fd", 16895, 73);
            b.Ma = { Va: O.Ma.Va };
            b.La = { lookup(c, d) {
              c = +d;
              var e = T(c);
              c = { parent: null, Xa: { zb: "fake" }, La: { readlink: () => e.path }, id: c + 1 };
              return c.parent = c;
            }, readdir() {
              return Array.from(Gb.entries()).filter(([, c]) => c).map(([c]) => c.toString());
            } };
            return b;
          } }, "/proc/self/fd");
        })();
        O.vb = new N(44);
        O.vb.stack = "<generic error, no stack>";
        var Xc = { a: (a, b, c, d) => Ta(`Assertion failed: ${a ? B(x, a) : ""}, at: ` + [b ? b ? B(x, b) : "" : "unknown filename", c, d ? d ? B(x, d) : "" : "unknown function"]), i: function(a, b) {
          try {
            return a = a ? B(x, a) : "", na(a, b), 0;
          } catch (c) {
            if ("undefined" == typeof W || "ErrnoError" !== c.name) throw c;
            return -c.Pa;
          }
        }, L: function(a, b, c) {
          try {
            b = b ? B(x, b) : "";
            b = Gc(a, b);
            if (c & -8) return -28;
            var d = S(b, { $a: true }).node;
            if (!d) return -44;
            a = "";
            c & 4 && (a += "r");
            c & 2 && (a += "w");
            c & 1 && (a += "x");
            return a && Ob(d, a) ? -2 : 0;
          } catch (e) {
            if ("undefined" == typeof W || "ErrnoError" !== e.name) throw e;
            return -e.Pa;
          }
        }, j: function(a, b) {
          try {
            var c = T(a);
            bc(c, c.node, b, false);
            return 0;
          } catch (d) {
            if ("undefined" == typeof W || "ErrnoError" !== d.name) throw d;
            return -d.Pa;
          }
        }, h: function(a) {
          try {
            var b = T(a);
            Vb(b, b.node, { timestamp: Date.now(), Fb: false });
            return 0;
          } catch (c) {
            if ("undefined" == typeof W || "ErrnoError" !== c.name) throw c;
            return -c.Pa;
          }
        }, b: function(a, b, c) {
          Ic = c;
          try {
            var d = T(a);
            switch (b) {
              case 0:
                var e = Jc();
                if (0 > e) break;
                for (; Gb[e]; ) e++;
                return Ub(d, e).fd;
              case 1:
              case 2:
                return 0;
              case 3:
                return d.flags;
              case 4:
                return e = Jc(), d.flags |= e, 0;
              case 12:
                return e = Jc(), Na[e + 0 >> 1] = 2, 0;
              case 13:
              case 14:
                return 0;
            }
            return -28;
          } catch (h) {
            if ("undefined" == typeof W || "ErrnoError" !== h.name) throw h;
            return -h.Pa;
          }
        }, g: function(a, b) {
          try {
            var c = T(a), d = c.node, e = c.Ma.Ta;
            a = e ? c : d;
            e ??= d.La.Ta;
            Sb(e);
            var h = e(a);
            return Hc(b, h);
          } catch (k) {
            if ("undefined" == typeof W || "ErrnoError" !== k.name) throw k;
            return -k.Pa;
          }
        }, H: function(a, b) {
          b = -9007199254740992 > b || 9007199254740992 < b ? NaN : Number(b);
          try {
            if (isNaN(b)) return 61;
            var c = T(a);
            if (0 > b || 0 === (c.flags & 2097155)) throw new N(28);
            cc(c, c.node, b);
            return 0;
          } catch (d) {
            if ("undefined" == typeof W || "ErrnoError" !== d.name) throw d;
            return -d.Pa;
          }
        }, G: function(a, b) {
          try {
            if (0 === b) return -28;
            var c = ha("/") + 1;
            if (b < c) return -68;
            u("/", x, a, b);
            return c;
          } catch (d) {
            if ("undefined" == typeof W || "ErrnoError" !== d.name) throw d;
            return -d.Pa;
          }
        }, K: function(a, b) {
          try {
            return a = a ? B(x, a) : "", Hc(b, ac(a, true));
          } catch (c) {
            if ("undefined" == typeof W || "ErrnoError" !== c.name) throw c;
            return -c.Pa;
          }
        }, C: function(a, b, c) {
          try {
            return b = b ? B(x, b) : "", b = Gc(a, b), U(b, c), 0;
          } catch (d) {
            if ("undefined" == typeof W || "ErrnoError" !== d.name) throw d;
            return -d.Pa;
          }
        }, J: function(a, b, c, d) {
          try {
            b = b ? B(x, b) : "";
            var e = d & 256;
            b = Gc(a, b, d & 4096);
            return Hc(c, e ? ac(b, true) : ac(b));
          } catch (h) {
            if ("undefined" == typeof W || "ErrnoError" !== h.name) throw h;
            return -h.Pa;
          }
        }, x: function(a, b, c, d) {
          Ic = d;
          try {
            b = b ? B(x, b) : "";
            b = Gc(a, b);
            var e = d ? Jc() : 0;
            return oa(b, c, e).fd;
          } catch (h) {
            if ("undefined" == typeof W || "ErrnoError" !== h.name) throw h;
            return -h.Pa;
          }
        }, v: function(a, b, c, d) {
          try {
            b = b ? B(x, b) : "";
            b = Gc(a, b);
            if (0 >= d) return -28;
            var e = S(b).node;
            if (!e) throw new N(44);
            if (!e.La.readlink) throw new N(28);
            var h = e.La.readlink(e);
            var k = Math.min(d, ha(h)), q = p[c + k];
            u(h, x, c, d + 1);
            p[c + k] = q;
            return k;
          } catch (w) {
            if ("undefined" == typeof W || "ErrnoError" !== w.name) throw w;
            return -w.Pa;
          }
        }, u: function(a) {
          try {
            return a = a ? B(x, a) : "", $b(a), 0;
          } catch (b) {
            if ("undefined" == typeof W || "ErrnoError" !== b.name) throw b;
            return -b.Pa;
          }
        }, f: function(a, b) {
          try {
            return a = a ? B(x, a) : "", Hc(b, ac(a));
          } catch (c) {
            if ("undefined" == typeof W || "ErrnoError" !== c.name) throw c;
            return -c.Pa;
          }
        }, r: function(a, b, c) {
          try {
            return b = b ? B(x, b) : "", b = Gc(a, b), 0 === c ? za(b) : 512 === c ? $b(b) : Ta("Invalid flags passed to unlinkat"), 0;
          } catch (d) {
            if ("undefined" == typeof W || "ErrnoError" !== d.name) throw d;
            return -d.Pa;
          }
        }, q: function(a, b, c) {
          try {
            b = b ? B(x, b) : "";
            b = Gc(a, b, true);
            var d = Date.now(), e, h;
            if (c) {
              var k = F[c >> 2] + 4294967296 * E[c + 4 >> 2], q = E[c + 8 >> 2];
              1073741823 == q ? e = d : 1073741822 == q ? e = null : e = 1e3 * k + q / 1e6;
              c += 16;
              k = F[c >> 2] + 4294967296 * E[c + 4 >> 2];
              q = E[c + 8 >> 2];
              1073741823 == q ? h = d : 1073741822 == q ? h = null : h = 1e3 * k + q / 1e6;
            } else h = e = d;
            if (null !== (h ?? e)) {
              a = e;
              var w = S(b, { $a: true }).node;
              Sb(w.La.Ua)(w, { atime: a, mtime: h });
            }
            return 0;
          } catch (v) {
            if ("undefined" == typeof W || "ErrnoError" !== v.name) throw v;
            return -v.Pa;
          }
        }, m: () => Ta(""), l: () => {
          cb = false;
          Kc = 0;
        }, A: function(a, b) {
          a = -9007199254740992 > a || 9007199254740992 < a ? NaN : Number(a);
          a = new Date(1e3 * a);
          E[b >> 2] = a.getSeconds();
          E[b + 4 >> 2] = a.getMinutes();
          E[b + 8 >> 2] = a.getHours();
          E[b + 12 >> 2] = a.getDate();
          E[b + 16 >> 2] = a.getMonth();
          E[b + 20 >> 2] = a.getFullYear() - 1900;
          E[b + 24 >> 2] = a.getDay();
          var c = a.getFullYear();
          E[b + 28 >> 2] = (0 !== c % 4 || 0 === c % 100 && 0 !== c % 400 ? Mc : Lc)[a.getMonth()] + a.getDate() - 1 | 0;
          E[b + 36 >> 2] = -(60 * a.getTimezoneOffset());
          c = new Date(
            a.getFullYear(),
            6,
            1
          ).getTimezoneOffset();
          var d = new Date(a.getFullYear(), 0, 1).getTimezoneOffset();
          E[b + 32 >> 2] = (c != d && a.getTimezoneOffset() == Math.min(d, c)) | 0;
        }, y: function(a, b, c, d, e, h, k) {
          e = -9007199254740992 > e || 9007199254740992 < e ? NaN : Number(e);
          try {
            if (isNaN(e)) return 61;
            var q = T(d);
            if (0 !== (b & 2) && 0 === (c & 2) && 2 !== (q.flags & 2097155)) throw new N(2);
            if (1 === (q.flags & 2097155)) throw new N(2);
            if (!q.Ma.ib) throw new N(43);
            if (!a) throw new N(28);
            var w = q.Ma.ib(q, a, e, b, c);
            var v = w.Kb;
            E[h >> 2] = w.Ab;
            F[k >> 2] = v;
            return 0;
          } catch (C) {
            if ("undefined" == typeof W || "ErrnoError" !== C.name) throw C;
            return -C.Pa;
          }
        }, z: function(a, b, c, d, e, h) {
          h = -9007199254740992 > h || 9007199254740992 < h ? NaN : Number(h);
          try {
            var k = T(e);
            if (c & 2) {
              c = h;
              if (32768 !== (k.node.mode & 61440)) throw new N(43);
              if (!(d & 2)) {
                var q = x.slice(a, a + b);
                k.Ma.jb && k.Ma.jb(k, q, c, b, d);
              }
            }
          } catch (w) {
            if ("undefined" == typeof W || "ErrnoError" !== w.name) throw w;
            return -w.Pa;
          }
        }, n: (a, b) => {
          Nc[a] && (clearTimeout(Nc[a].id), delete Nc[a]);
          if (!b) return 0;
          var c = setTimeout(() => {
            delete Nc[a];
            Pc(() => Wc(a, performance.now()));
          }, b);
          Nc[a] = {
            id: c,
            Xb: b
          };
          return 0;
        }, B: (a, b, c, d) => {
          var e = (/* @__PURE__ */ new Date()).getFullYear(), h = new Date(e, 0, 1).getTimezoneOffset();
          e = new Date(e, 6, 1).getTimezoneOffset();
          F[a >> 2] = 60 * Math.max(h, e);
          E[b >> 2] = Number(h != e);
          b = (k) => {
            var q = Math.abs(k);
            return `UTC${0 <= k ? "-" : "+"}${String(Math.floor(q / 60)).padStart(2, "0")}${String(q % 60).padStart(2, "0")}`;
          };
          a = b(h);
          b = b(e);
          e < h ? (u(a, x, c, 17), u(b, x, d, 17)) : (u(a, x, d, 17), u(b, x, c, 17));
        }, d: () => Date.now(), s: () => 2147483648, c: () => performance.now(), o: (a) => {
          var b = x.length;
          a >>>= 0;
          if (2147483648 < a) return false;
          for (var c = 1; 4 >= c; c *= 2) {
            var d = b * (1 + 0.2 / c);
            d = Math.min(d, a + 100663296);
            a: {
              d = (Math.min(2147483648, 65536 * Math.ceil(Math.max(a, d) / 65536)) - Ka.buffer.byteLength + 65535) / 65536 | 0;
              try {
                Ka.grow(d);
                Qa();
                var e = 1;
                break a;
              } catch (h) {
              }
              e = void 0;
            }
            if (e) return true;
          }
          return false;
        }, E: (a, b) => {
          var c = 0;
          Sc().forEach((d, e) => {
            var h = b + c;
            e = F[a + 4 * e >> 2] = h;
            for (h = 0; h < d.length; ++h) p[e++] = d.charCodeAt(h);
            p[e] = 0;
            c += d.length + 1;
          });
          return 0;
        }, F: (a, b) => {
          var c = Sc();
          F[a >> 2] = c.length;
          var d = 0;
          c.forEach((e) => d += e.length + 1);
          F[b >> 2] = d;
          return 0;
        }, e: function(a) {
          try {
            var b = T(a);
            qa(b);
            return 0;
          } catch (c) {
            if ("undefined" == typeof W || "ErrnoError" !== c.name) throw c;
            return c.Pa;
          }
        }, p: function(a, b) {
          try {
            var c = T(a);
            p[b] = c.tty ? 2 : P(c.mode) ? 3 : 40960 === (c.mode & 61440) ? 7 : 4;
            Na[b + 2 >> 1] = 0;
            H[b + 8 >> 3] = BigInt(0);
            H[b + 16 >> 3] = BigInt(0);
            return 0;
          } catch (d) {
            if ("undefined" == typeof W || "ErrnoError" !== d.name) throw d;
            return d.Pa;
          }
        }, w: function(a, b, c, d) {
          try {
            a: {
              var e = T(a);
              a = b;
              for (var h, k = b = 0; k < c; k++) {
                var q = F[a >> 2], w = F[a + 4 >> 2];
                a += 8;
                var v = Ec(e, p, q, w, h);
                if (0 > v) {
                  var C = -1;
                  break a;
                }
                b += v;
                if (v < w) break;
                "undefined" != typeof h && (h += v);
              }
              C = b;
            }
            F[d >> 2] = C;
            return 0;
          } catch (G) {
            if ("undefined" == typeof W || "ErrnoError" !== G.name) throw G;
            return G.Pa;
          }
        }, D: function(a, b, c, d) {
          b = -9007199254740992 > b || 9007199254740992 < b ? NaN : Number(b);
          try {
            if (isNaN(b)) return 61;
            var e = T(a);
            mc(e, b, c);
            H[d >> 3] = BigInt(e.position);
            e.ob && 0 === b && 0 === c && (e.ob = null);
            return 0;
          } catch (h) {
            if ("undefined" == typeof W || "ErrnoError" !== h.name) throw h;
            return h.Pa;
          }
        }, I: function(a) {
          try {
            var b = T(a);
            return b.Ma?.fsync ? b.Ma.fsync(b) : 0;
          } catch (c) {
            if ("undefined" == typeof W || "ErrnoError" !== c.name) throw c;
            return c.Pa;
          }
        }, t: function(a, b, c, d) {
          try {
            a: {
              var e = T(a);
              a = b;
              for (var h, k = b = 0; k < c; k++) {
                var q = F[a >> 2], w = F[a + 4 >> 2];
                a += 8;
                var v = pa(e, p, q, w, h);
                if (0 > v) {
                  var C = -1;
                  break a;
                }
                b += v;
                if (v < w) break;
                "undefined" != typeof h && (h += v);
              }
              C = b;
            }
            F[d >> 2] = C;
            return 0;
          } catch (G) {
            if ("undefined" == typeof W || "ErrnoError" !== G.name) throw G;
            return G.Pa;
          }
        }, k: Oc }, Z;
        (async function() {
          function a(c) {
            Z = c.exports;
            Ka = Z.M;
            Qa();
            Y = Z.O;
            K--;
            f.monitorRunDependencies?.(K);
            0 == K && Sa && (c = Sa, Sa = null, c());
            return Z;
          }
          K++;
          f.monitorRunDependencies?.(K);
          var b = { a: Xc };
          if (f.instantiateWasm) return new Promise((c) => {
            f.instantiateWasm(b, (d, e) => {
              a(d, e);
              c(d.exports);
            });
          });
          Ua ??= f.locateFile ? f.locateFile("sql-wasm.wasm", D) : D + "sql-wasm.wasm";
          return a((await Xa(b)).instance);
        })();
        f._sqlite3_free = (a) => (f._sqlite3_free = Z.P)(a);
        f._sqlite3_value_text = (a) => (f._sqlite3_value_text = Z.Q)(a);
        f._sqlite3_prepare_v2 = (a, b, c, d, e) => (f._sqlite3_prepare_v2 = Z.R)(a, b, c, d, e);
        f._sqlite3_step = (a) => (f._sqlite3_step = Z.S)(a);
        f._sqlite3_reset = (a) => (f._sqlite3_reset = Z.T)(a);
        f._sqlite3_exec = (a, b, c, d, e) => (f._sqlite3_exec = Z.U)(a, b, c, d, e);
        f._sqlite3_finalize = (a) => (f._sqlite3_finalize = Z.V)(a);
        f._sqlite3_column_name = (a, b) => (f._sqlite3_column_name = Z.W)(a, b);
        f._sqlite3_column_text = (a, b) => (f._sqlite3_column_text = Z.X)(a, b);
        f._sqlite3_column_type = (a, b) => (f._sqlite3_column_type = Z.Y)(a, b);
        f._sqlite3_errmsg = (a) => (f._sqlite3_errmsg = Z.Z)(a);
        f._sqlite3_clear_bindings = (a) => (f._sqlite3_clear_bindings = Z._)(a);
        f._sqlite3_value_blob = (a) => (f._sqlite3_value_blob = Z.$)(a);
        f._sqlite3_value_bytes = (a) => (f._sqlite3_value_bytes = Z.aa)(a);
        f._sqlite3_value_double = (a) => (f._sqlite3_value_double = Z.ba)(a);
        f._sqlite3_value_int = (a) => (f._sqlite3_value_int = Z.ca)(a);
        f._sqlite3_value_type = (a) => (f._sqlite3_value_type = Z.da)(a);
        f._sqlite3_result_blob = (a, b, c, d) => (f._sqlite3_result_blob = Z.ea)(a, b, c, d);
        f._sqlite3_result_double = (a, b) => (f._sqlite3_result_double = Z.fa)(a, b);
        f._sqlite3_result_error = (a, b, c) => (f._sqlite3_result_error = Z.ga)(a, b, c);
        f._sqlite3_result_int = (a, b) => (f._sqlite3_result_int = Z.ha)(a, b);
        f._sqlite3_result_int64 = (a, b) => (f._sqlite3_result_int64 = Z.ia)(a, b);
        f._sqlite3_result_null = (a) => (f._sqlite3_result_null = Z.ja)(a);
        f._sqlite3_result_text = (a, b, c, d) => (f._sqlite3_result_text = Z.ka)(a, b, c, d);
        f._sqlite3_aggregate_context = (a, b) => (f._sqlite3_aggregate_context = Z.la)(a, b);
        f._sqlite3_column_count = (a) => (f._sqlite3_column_count = Z.ma)(a);
        f._sqlite3_data_count = (a) => (f._sqlite3_data_count = Z.na)(a);
        f._sqlite3_column_blob = (a, b) => (f._sqlite3_column_blob = Z.oa)(a, b);
        f._sqlite3_column_bytes = (a, b) => (f._sqlite3_column_bytes = Z.pa)(a, b);
        f._sqlite3_column_double = (a, b) => (f._sqlite3_column_double = Z.qa)(a, b);
        f._sqlite3_bind_blob = (a, b, c, d, e) => (f._sqlite3_bind_blob = Z.ra)(a, b, c, d, e);
        f._sqlite3_bind_double = (a, b, c) => (f._sqlite3_bind_double = Z.sa)(a, b, c);
        f._sqlite3_bind_int = (a, b, c) => (f._sqlite3_bind_int = Z.ta)(a, b, c);
        f._sqlite3_bind_text = (a, b, c, d, e) => (f._sqlite3_bind_text = Z.ua)(a, b, c, d, e);
        f._sqlite3_bind_parameter_index = (a, b) => (f._sqlite3_bind_parameter_index = Z.va)(a, b);
        f._sqlite3_sql = (a) => (f._sqlite3_sql = Z.wa)(a);
        f._sqlite3_normalized_sql = (a) => (f._sqlite3_normalized_sql = Z.xa)(a);
        f._sqlite3_changes = (a) => (f._sqlite3_changes = Z.ya)(a);
        f._sqlite3_close_v2 = (a) => (f._sqlite3_close_v2 = Z.za)(a);
        f._sqlite3_create_function_v2 = (a, b, c, d, e, h, k, q, w) => (f._sqlite3_create_function_v2 = Z.Aa)(a, b, c, d, e, h, k, q, w);
        f._sqlite3_update_hook = (a, b, c) => (f._sqlite3_update_hook = Z.Ba)(a, b, c);
        f._sqlite3_open = (a, b) => (f._sqlite3_open = Z.Ca)(a, b);
        var ia = f._malloc = (a) => (ia = f._malloc = Z.Da)(a), fa = f._free = (a) => (fa = f._free = Z.Ea)(a);
        f._RegisterExtensionFunctions = (a) => (f._RegisterExtensionFunctions = Z.Fa)(a);
        var Db = (a, b) => (Db = Z.Ga)(a, b), Wc = (a, b) => (Wc = Z.Ha)(a, b), wa = (a) => (wa = Z.Ia)(a), z = (a) => (z = Z.Ja)(a), sa = () => (sa = Z.Ka)();
        f.stackSave = () => sa();
        f.stackRestore = (a) => wa(a);
        f.stackAlloc = (a) => z(a);
        f.cwrap = (a, b, c, d) => {
          var e = !c || c.every((h) => "number" === h || "boolean" === h);
          return "string" !== b && e && !d ? f["_" + a] : (...h) => Tc(a, b, c, h);
        };
        f.addFunction = Aa;
        f.removeFunction = A;
        f.UTF8ToString = ua;
        f.ALLOC_NORMAL = ea;
        f.allocate = da;
        f.allocateUTF8OnStack = xa;
        function Yc() {
          function a() {
            f.calledRun = true;
            if (!La) {
              if (!f.noFSInit && !Ib) {
                var b, c;
                Ib = true;
                d ??= f.stdin;
                b ??= f.stdout;
                c ??= f.stderr;
                d ? V("stdin", d) : Zb("/dev/tty", "/dev/stdin");
                b ? V("stdout", null, b) : Zb("/dev/tty", "/dev/stdout");
                c ? V("stderr", null, c) : Zb("/dev/tty1", "/dev/stderr");
                oa("/dev/stdin", 0);
                oa("/dev/stdout", 1);
                oa("/dev/stderr", 1);
              }
              Z.N();
              Jb = false;
              f.onRuntimeInitialized?.();
              if (f.postRun) for ("function" == typeof f.postRun && (f.postRun = [f.postRun]); f.postRun.length; ) {
                var d = f.postRun.shift();
                $a.unshift(d);
              }
              Za($a);
            }
          }
          if (0 < K) Sa = Yc;
          else {
            if (f.preRun) for ("function" == typeof f.preRun && (f.preRun = [f.preRun]); f.preRun.length; ) bb();
            Za(ab);
            0 < K ? Sa = Yc : f.setStatus ? (f.setStatus("Running..."), setTimeout(() => {
              setTimeout(() => f.setStatus(""), 1);
              a();
            }, 1)) : a();
          }
        }
        if (f.preInit) for ("function" == typeof f.preInit && (f.preInit = [f.preInit]); 0 < f.preInit.length; ) f.preInit.pop()();
        Yc();
        return Module;
      });
      return initSqlJsPromise;
    };
    if (typeof exports2 === "object" && typeof module2 === "object") {
      module2.exports = initSqlJs2;
      module2.exports.default = initSqlJs2;
    } else if (typeof define === "function" && define["amd"]) {
      define([], function() {
        return initSqlJs2;
      });
    } else if (typeof exports2 === "object") {
      exports2["Module"] = initSqlJs2;
    }
  }
});

// src/db.ts
var db_exports = {};
__export(db_exports, {
  acquireSyncLock: () => acquireSyncLock,
  addToSyncQueue: () => addToSyncQueue,
  compactDatabase: () => compactDatabase,
  exportDatabaseFile: () => exportDatabaseFile,
  getCommits: () => getCommits,
  getDB: () => getDB,
  getMetricsByCategory: () => getMetricsByCategory,
  getOrCreateRepo: () => getOrCreateRepo,
  getPendingSyncQueue: () => getPendingSyncQueue,
  getRepoById: () => getRepoById,
  getRepoByPath: () => getRepoByPath,
  getSyncStats: () => getSyncStats,
  getTopComponents: () => getTopComponents,
  getUnsyncedCommits: () => getUnsyncedCommits,
  getUnsyncedCommitsCursor: () => getUnsyncedCommitsCursor,
  initDB: () => initDB,
  insertCommit: () => insertCommit,
  insertCommitFiles: () => insertCommitFiles,
  markCommitsFailed: () => markCommitsFailed,
  markCommitsSynced: () => markCommitsSynced,
  markCommitsSyncedWithTimestamp: () => markCommitsSyncedWithTimestamp,
  markCommitsSyncing: () => markCommitsSyncing,
  releaseSyncLock: () => releaseSyncLock,
  removeSyncQueueItem: () => removeSyncQueueItem,
  resetOldFailedCommits: () => resetOldFailedCommits,
  resetSyncingCommits: () => resetSyncingCommits,
  saveDB: () => saveDB,
  updateRepoScanSha: () => updateRepoScanSha,
  updateRepoSyncSha: () => updateRepoSyncSha,
  updateSyncQueueAttempt: () => updateSyncQueueAttempt
});
async function initDB(context) {
  const wasmPath = vscode3.Uri.joinPath(context.extensionUri, "wasm/sql-wasm.wasm");
  SQL = await (0, import_sql.default)({
    locateFile: () => wasmPath.fsPath
  });
  const dbPath = path2.join(context.globalStorageUri.fsPath, "commitdiary.sqlite");
  fs.mkdirSync(context.globalStorageUri.fsPath, { recursive: true });
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
    console.log("\u{1F4C1} Loaded existing DB");
    await runMigrations(context);
  } else {
    db = new SQL.Database();
    await createInitialSchema(context);
    console.log("\u{1F195} Created new DB");
  }
  return db;
}
async function createInitialSchema(context) {
  if (!db) return;
  db.run(`
        CREATE TABLE IF NOT EXISTS schema_version (
            version INTEGER PRIMARY KEY,
            applied_at TEXT NOT NULL
        );
    `);
  db.run(`
        CREATE TABLE IF NOT EXISTS repos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            path TEXT UNIQUE NOT NULL,
            remote TEXT,
            last_scanned_sha TEXT,
            last_synced_sha TEXT,
            last_synced_at TEXT,
            sync_lock TEXT,
            needs_reindex INTEGER DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
    `);
  db.run(`
        CREATE TABLE IF NOT EXISTS commits (
            sha TEXT PRIMARY KEY,
            repo_id INTEGER NOT NULL,
            author_name TEXT,
            author_email TEXT,
            author_email_hash TEXT,
            date TEXT NOT NULL,
            message TEXT,
            category TEXT,
            files_json TEXT,
            components_json TEXT,
            diff_summary TEXT,
            context_tags_json TEXT,
            synced_at TEXT,
            sync_status TEXT DEFAULT 'pending' CHECK(sync_status IN ('pending', 'syncing', 'synced', 'failed')),
            sync_batch_id TEXT,
            sync_error TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (repo_id) REFERENCES repos(id) ON DELETE CASCADE
        );
    `);
  db.run(`
        CREATE TABLE IF NOT EXISTS commit_files (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sha TEXT NOT NULL,
            path TEXT NOT NULL,
            component TEXT,
            FOREIGN KEY (sha) REFERENCES commits(sha) ON DELETE CASCADE
        );
    `);
  db.run(`CREATE INDEX IF NOT EXISTS idx_commit_files_component ON commit_files(component);`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_commit_files_sha ON commit_files(sha);`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_commits_repo_date ON commits(repo_id, date);`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_commits_category ON commits(category);`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_commits_sync_status ON commits(sync_status);`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_commits_sync_batch ON commits(sync_batch_id);`);
  db.run(`
        CREATE TABLE IF NOT EXISTS sync_queue (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            repo_id INTEGER NOT NULL,
            commits_json TEXT NOT NULL,
            payload_size_bytes INTEGER,
            attempt_count INTEGER DEFAULT 0,
            last_error TEXT,
            next_retry_at TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            last_attempt_at TEXT,
            FOREIGN KEY (repo_id) REFERENCES repos(id) ON DELETE CASCADE
        );
    `);
  db.run(`
        CREATE TABLE IF NOT EXISTS metrics_cache (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            repo_id INTEGER NOT NULL,
            period_start TEXT NOT NULL,
            period_end TEXT NOT NULL,
            period_type TEXT NOT NULL,
            payload_json TEXT NOT NULL,
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (repo_id) REFERENCES repos(id) ON DELETE CASCADE,
            UNIQUE(repo_id, period_start, period_type)
        );
    `);
  db.run(
    "INSERT INTO schema_version (version, applied_at) VALUES (?, ?)",
    [CURRENT_SCHEMA_VERSION, (/* @__PURE__ */ new Date()).toISOString()]
  );
  saveDB(context);
}
async function runMigrations(context) {
  if (!db) return;
  let currentVersion = 0;
  try {
    const result = db.exec("SELECT MAX(version) as version FROM schema_version");
    if (result.length && result[0].values.length) {
      currentVersion = result[0].values[0][0] || 0;
    }
  } catch (e) {
    currentVersion = 0;
  }
  console.log(`Current schema version: ${currentVersion}`);
  if (currentVersion === 0) {
    console.log("Running migration: v0 -> v2");
    try {
      const tableExists = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='commits'");
      if (tableExists.length > 0) {
        const oldData = db.exec("SELECT * FROM commits");
        db.run("DROP TABLE IF EXISTS commits");
        await createInitialSchema(context);
        console.log("Old schema detected. Database recreated. Please rescan repositories.");
      } else {
        await createInitialSchema(context);
      }
    } catch (e) {
      console.error("Migration error:", e);
      await createInitialSchema(context);
    }
  }
  if (currentVersion === 2) {
    console.log("Running migration: v2 -> v3 (Adding sync state tracking)");
    try {
      db.run(`ALTER TABLE commits ADD COLUMN sync_status TEXT DEFAULT 'pending' CHECK(sync_status IN ('pending', 'syncing', 'synced', 'failed'))`);
      db.run(`ALTER TABLE commits ADD COLUMN sync_batch_id TEXT`);
      db.run(`ALTER TABLE commits ADD COLUMN sync_error TEXT`);
      db.run(`ALTER TABLE repos ADD COLUMN sync_lock TEXT`);
      db.run(`ALTER TABLE sync_queue ADD COLUMN payload_size_bytes INTEGER`);
      db.run(`ALTER TABLE sync_queue ADD COLUMN next_retry_at TEXT`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_commits_sync_status ON commits(sync_status)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_commits_sync_batch ON commits(sync_batch_id)`);
      db.run(`UPDATE commits SET sync_status = CASE WHEN synced_at IS NOT NULL THEN 'synced' ELSE 'pending' END`);
      db.run(
        "INSERT INTO schema_version (version, applied_at) VALUES (?, ?)",
        [3, (/* @__PURE__ */ new Date()).toISOString()]
      );
      console.log("\u2705 Migration v2 -> v3 completed successfully");
    } catch (e) {
      console.error("\u274C Migration v2 -> v3 failed:", e);
      throw e;
    }
  }
  saveDB(context);
}
function getDB() {
  if (!db) throw new Error("Database not initialized yet");
  return db;
}
function saveDB(context) {
  if (!db) return;
  const dbPath = path2.join(context.globalStorageUri.fsPath, "commitdiary.sqlite");
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}
function insertCommit(data, context) {
  const db2 = getDB();
  const crypto4 = require("crypto");
  const emailHash = crypto4.createHash("sha256").update(data.authorEmail.toLowerCase()).digest("hex");
  const config = vscode3.workspace.getConfiguration("commitDiary");
  const includeEmails = config.get("sync.includeEmails", false);
  db2.run(
    `INSERT OR IGNORE INTO commits 
         (sha, repo_id, author_name, author_email, author_email_hash, date, message, category, 
          files_json, components_json, diff_summary, context_tags_json, sync_status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [
      data.sha,
      data.repoId,
      data.authorName,
      includeEmails ? data.authorEmail : null,
      emailHash,
      data.date,
      data.message,
      data.category,
      JSON.stringify(data.files),
      JSON.stringify(data.components),
      data.diffSummary || null,
      JSON.stringify(data.contextTags || [])
    ]
  );
  saveDB(context);
}
function insertCommitFiles(sha, files, context) {
  const db2 = getDB();
  for (const file of files) {
    db2.run(
      `INSERT INTO commit_files (sha, path, component) VALUES (?, ?, ?)`,
      [sha, file.path, file.component || null]
    );
  }
  saveDB(context);
}
function getCommits(repoId, limit = 50) {
  const db2 = getDB();
  const query = repoId ? `SELECT * FROM commits WHERE repo_id = ${repoId} ORDER BY date DESC LIMIT ${limit}` : `SELECT * FROM commits ORDER BY date DESC LIMIT ${limit}`;
  const res = db2.exec(query);
  return res.length ? res[0].values : [];
}
function getOrCreateRepo(repoPath, repoName, remote, context) {
  const db2 = getDB();
  const existing = db2.exec(`SELECT id FROM repos WHERE path = ?`, [repoPath]);
  if (existing.length && existing[0].values.length) {
    return existing[0].values[0][0];
  }
  db2.run(
    `INSERT INTO repos (name, path, remote) VALUES (?, ?, ?)`,
    [repoName, repoPath, remote]
  );
  saveDB(context);
  const result = db2.exec(`SELECT id FROM repos WHERE path = ?`, [repoPath]);
  return result[0].values[0][0];
}
function updateRepoScanSha(repoId, sha, context) {
  const db2 = getDB();
  db2.run(`UPDATE repos SET last_scanned_sha = ? WHERE id = ?`, [sha, repoId]);
  saveDB(context);
}
function updateRepoSyncSha(repoId, sha, context) {
  const db2 = getDB();
  db2.run(
    `UPDATE repos SET last_synced_sha = ?, last_synced_at = ? WHERE id = ?`,
    [sha, (/* @__PURE__ */ new Date()).toISOString(), repoId]
  );
  saveDB(context);
}
function getRepoById(repoId) {
  const db2 = getDB();
  const res = db2.exec(`SELECT * FROM repos WHERE id = ?`, [repoId]);
  if (res.length && res[0].values.length) {
    const row = res[0].values[0];
    const columns = res[0].columns;
    return Object.fromEntries(columns.map((col, i) => [col, row[i]]));
  }
  return null;
}
function getRepoByPath(repoPath) {
  const db2 = getDB();
  const res = db2.exec(`SELECT * FROM repos WHERE path = ?`, [repoPath]);
  if (res.length && res[0].values.length) {
    const row = res[0].values[0];
    const columns = res[0].columns;
    return Object.fromEntries(columns.map((col, i) => [col, row[i]]));
  }
  return null;
}
function getUnsyncedCommits(repoId, limit = 500) {
  const db2 = getDB();
  const repo = getRepoById(repoId);
  if (!repo) return [];
  const query = `
        SELECT * FROM commits 
        WHERE repo_id = ${repoId} 
        AND sync_status IN ('pending', 'failed')
        ORDER BY date ASC 
        LIMIT ${limit}
    `;
  const res = db2.exec(query);
  return res.length ? res[0].values : [];
}
function markCommitsSynced(shas, context) {
  const db2 = getDB();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  for (const sha of shas) {
    db2.run(
      `UPDATE commits SET synced_at = ?, sync_status = 'synced', sync_error = NULL WHERE sha = ?`,
      [now, sha]
    );
  }
  saveDB(context);
}
function addToSyncQueue(repoId, commitsJson, context) {
  const db2 = getDB();
  const payloadSize = Buffer.byteLength(commitsJson, "utf-8");
  const nextRetry = new Date(Date.now() + 60 * 60 * 1e3).toISOString();
  if (payloadSize > 1024 * 1024) {
    console.error(`Sync queue: Payload too large (${payloadSize} bytes), skipping`);
    return;
  }
  db2.run(
    `INSERT INTO sync_queue (repo_id, commits_json, payload_size_bytes, attempt_count, last_attempt_at, next_retry_at) 
         VALUES (?, ?, ?, 0, ?, ?)`,
    [repoId, commitsJson, payloadSize, (/* @__PURE__ */ new Date()).toISOString(), nextRetry]
  );
  saveDB(context);
}
function updateSyncQueueAttempt(queueId, error, context) {
  const db2 = getDB();
  const current = db2.exec(`SELECT attempt_count FROM sync_queue WHERE id = ${queueId}`);
  const attemptCount = current.length ? current[0].values[0][0] : 0;
  const delayHours = Math.pow(2, attemptCount);
  const nextRetry = new Date(Date.now() + delayHours * 60 * 60 * 1e3).toISOString();
  db2.run(
    `UPDATE sync_queue 
         SET attempt_count = attempt_count + 1, last_error = ?, last_attempt_at = ?, next_retry_at = ? 
         WHERE id = ?`,
    [error, (/* @__PURE__ */ new Date()).toISOString(), nextRetry, queueId]
  );
  saveDB(context);
}
function removeSyncQueueItem(queueId, context) {
  const db2 = getDB();
  db2.run(`DELETE FROM sync_queue WHERE id = ?`, [queueId]);
  saveDB(context);
}
function getPendingSyncQueue() {
  const db2 = getDB();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const res = db2.exec(`
        SELECT * FROM sync_queue 
        WHERE attempt_count < 3 
        AND (next_retry_at IS NULL OR next_retry_at <= '${now}')
        ORDER BY created_at ASC
    `);
  return res.length ? res[0].values : [];
}
function getMetricsByCategory(repoId, startDate, endDate) {
  const db2 = getDB();
  const res = db2.exec(`
        SELECT category, COUNT(*) as count 
        FROM commits 
        WHERE repo_id = ? AND date BETWEEN ? AND ?
        GROUP BY category 
        ORDER BY count DESC
    `, [repoId, startDate, endDate]);
  return res.length ? res[0].values : [];
}
function getTopComponents(repoId, startDate, endDate, limit = 20) {
  const db2 = getDB();
  const res = db2.exec(`
        SELECT cf.component, COUNT(*) as count
        FROM commit_files cf
        JOIN commits c ON cf.sha = c.sha
        WHERE c.repo_id = ? AND c.date BETWEEN ? AND ? AND cf.component IS NOT NULL
        GROUP BY cf.component
        ORDER BY count DESC
        LIMIT ${limit}
    `, [repoId, startDate, endDate]);
  return res.length ? res[0].values : [];
}
function compactDatabase(context) {
  if (!db) return;
  const data = db.export();
  db.close();
  if (!SQL) throw new Error("SQL.js not initialized");
  db = new SQL.Database(data);
  saveDB(context);
  console.log("Database compacted");
}
function exportDatabaseFile(context) {
  const dbPath = path2.join(context.globalStorageUri.fsPath, "commitdiary.sqlite");
  return dbPath;
}
function getUnsyncedCommitsCursor(repoId, limit = 500, lastProcessedSha = null) {
  const db2 = getDB();
  let query = `
        SELECT * FROM commits 
        WHERE repo_id = ${repoId} 
        AND sync_status IN ('pending', 'failed')
    `;
  if (lastProcessedSha) {
    query += ` AND sha > '${lastProcessedSha}'`;
  }
  query += ` ORDER BY sha ASC LIMIT ${limit}`;
  const res = db2.exec(query);
  return res.length ? res[0].values : [];
}
function markCommitsSyncing(shas, batchId, context) {
  const db2 = getDB();
  for (const sha of shas) {
    db2.run(
      `UPDATE commits 
             SET sync_status = 'syncing', sync_batch_id = ? 
             WHERE sha = ?`,
      [batchId, sha]
    );
  }
  saveDB(context);
}
function markCommitsSyncedWithTimestamp(shas, serverTime, context) {
  const db2 = getDB();
  for (const sha of shas) {
    db2.run(
      `UPDATE commits 
             SET sync_status = 'synced', synced_at = ?, sync_error = NULL 
             WHERE sha = ?`,
      [serverTime, sha]
    );
  }
  saveDB(context);
}
function markCommitsFailed(shas, error, context) {
  const db2 = getDB();
  for (const sha of shas) {
    db2.run(
      `UPDATE commits 
             SET sync_status = 'failed', sync_error = ? 
             WHERE sha = ?`,
      [error, sha]
    );
  }
  saveDB(context);
}
function resetSyncingCommits(batchId, context) {
  const db2 = getDB();
  db2.run(
    `UPDATE commits 
         SET sync_status = 'pending', sync_batch_id = NULL 
         WHERE sync_batch_id = ? AND sync_status = 'syncing'`,
    [batchId]
  );
  saveDB(context);
}
function acquireSyncLock(repoId, context) {
  const db2 = getDB();
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1e3).toISOString();
  const lockCheck = db2.exec(
    `SELECT sync_lock FROM repos WHERE id = ${repoId}`
  );
  if (lockCheck.length === 0) return false;
  const currentLock = lockCheck[0].values[0]?.[0];
  if (currentLock === null || currentLock < fiveMinutesAgo) {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    db2.run(`UPDATE repos SET sync_lock = ? WHERE id = ?`, [now, repoId]);
    saveDB(context);
    return true;
  }
  return false;
}
function releaseSyncLock(repoId, context) {
  const db2 = getDB();
  db2.run(`UPDATE repos SET sync_lock = NULL WHERE id = ?`, [repoId]);
  saveDB(context);
}
function getSyncStats(repoId) {
  const db2 = getDB();
  const stats = db2.exec(`
        SELECT 
            sync_status,
            COUNT(*) as count
        FROM commits
        WHERE repo_id = ${repoId}
        GROUP BY sync_status
    `);
  return stats.length ? stats[0].values : [];
}
function resetOldFailedCommits(context) {
  const db2 = getDB();
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1e3).toISOString();
  db2.run(
    `UPDATE commits 
         SET sync_status = 'pending', sync_error = NULL 
         WHERE sync_status = 'failed' AND synced_at < ?`,
    [oneDayAgo]
  );
  saveDB(context);
}
var import_sql, fs, path2, vscode3, SQL, db, CURRENT_SCHEMA_VERSION;
var init_db = __esm({
  "src/db.ts"() {
    "use strict";
    import_sql = __toESM(require_sql_wasm());
    fs = __toESM(require("fs"));
    path2 = __toESM(require("path"));
    vscode3 = __toESM(require("vscode"));
    SQL = null;
    db = null;
    CURRENT_SCHEMA_VERSION = 3;
  }
});

// src/extension.ts
var extension_exports = {};
__export(extension_exports, {
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(extension_exports);
var vscode8 = __toESM(require("vscode"));
var path3 = __toESM(require("path"));

// src/repoDiscovery.ts
var vscode = __toESM(require("vscode"));
var path = __toESM(require("node:path"));
async function discoverRepositories() {
  const fromApi = await getReposFromGitApi().catch(() => []);
  const workspaceRoots = (vscode.workspace.workspaceFolders ?? []).map((f) => f.uri);
  const fromScan = await scanForGitReposFromWorkspace(workspaceRoots).catch(() => []);
  return dedupeByRootPath([...fromApi, ...fromScan]);
}
async function getReposFromGitApi() {
  const gitExt = vscode.extensions.getExtension("vscode.git");
  const exportsApi = gitExt?.exports;
  if (!exportsApi || typeof exportsApi.getAPI !== "function") return [];
  const api = exportsApi.getAPI(1);
  const repos = api?.repositories ?? [];
  return repos.map((r) => ({
    rootUri: r.rootUri,
    rootPath: r.rootUri.fsPath,
    source: "git-api"
  }));
}
async function scanForGitReposFromWorkspace(workspaceRoots) {
  if (!vscode.workspace.workspaceFolders?.length) return [];
  const configs = await vscode.workspace.findFiles(
    "**/.git/config",
    "{**/node_modules/**,**/.git/**,**/.venv/**,**/.direnv/**,**/vendor/**,**/dist/**,**/build/**}",
    2e3
  );
  const repos = configs.map((u) => {
    const repoRoot = vscode.Uri.joinPath(u, "..", "..");
    return { rootUri: repoRoot, rootPath: repoRoot.fsPath, source: "fs-scan" };
  });
  return dedupeByRootPath(repos);
}
function dedupeByRootPath(repos) {
  const map = /* @__PURE__ */ new Map();
  for (const r of repos) {
    const key = path.resolve(r.rootPath);
    if (!map.has(key)) map.set(key, r);
  }
  return Array.from(map.values());
}

// src/userIdentity.ts
var vscode2 = __toESM(require("vscode"));

// ../../node_modules/.pnpm/simple-git@3.30.0/node_modules/simple-git/dist/esm/index.js
var import_node_buffer = require("node:buffer");
var import_file_exists = __toESM(require_dist(), 1);
var import_debug = __toESM(require_src(), 1);
var import_child_process = require("child_process");
var import_promise_deferred = __toESM(require_dist2(), 1);
var import_node_path = require("node:path");
var import_promise_deferred2 = __toESM(require_dist2(), 1);
var import_node_events = require("node:events");
var __defProp2 = Object.defineProperty;
var __getOwnPropDesc2 = Object.getOwnPropertyDescriptor;
var __getOwnPropNames2 = Object.getOwnPropertyNames;
var __hasOwnProp2 = Object.prototype.hasOwnProperty;
var __esm2 = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames2(fn)[0]])(fn = 0)), res;
};
var __commonJS2 = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames2(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export2 = (target, all) => {
  for (var name in all)
    __defProp2(target, name, { get: all[name], enumerable: true });
};
var __copyProps2 = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames2(from))
      if (!__hasOwnProp2.call(to, key) && key !== except)
        __defProp2(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc2(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS2 = (mod) => __copyProps2(__defProp2({}, "__esModule", { value: true }), mod);
function pathspec(...paths) {
  const key = new String(paths);
  cache.set(key, paths);
  return key;
}
function isPathSpec(path4) {
  return path4 instanceof String && cache.has(path4);
}
function toPaths(pathSpec) {
  return cache.get(pathSpec) || [];
}
var cache;
var init_pathspec = __esm2({
  "src/lib/args/pathspec.ts"() {
    "use strict";
    cache = /* @__PURE__ */ new WeakMap();
  }
});
var GitError;
var init_git_error = __esm2({
  "src/lib/errors/git-error.ts"() {
    "use strict";
    GitError = class extends Error {
      constructor(task, message) {
        super(message);
        this.task = task;
        Object.setPrototypeOf(this, new.target.prototype);
      }
    };
  }
});
var GitResponseError;
var init_git_response_error = __esm2({
  "src/lib/errors/git-response-error.ts"() {
    "use strict";
    init_git_error();
    GitResponseError = class extends GitError {
      constructor(git, message) {
        super(void 0, message || String(git));
        this.git = git;
      }
    };
  }
});
var TaskConfigurationError;
var init_task_configuration_error = __esm2({
  "src/lib/errors/task-configuration-error.ts"() {
    "use strict";
    init_git_error();
    TaskConfigurationError = class extends GitError {
      constructor(message) {
        super(void 0, message);
      }
    };
  }
});
function asFunction(source) {
  if (typeof source !== "function") {
    return NOOP;
  }
  return source;
}
function isUserFunction(source) {
  return typeof source === "function" && source !== NOOP;
}
function splitOn(input, char) {
  const index = input.indexOf(char);
  if (index <= 0) {
    return [input, ""];
  }
  return [input.substr(0, index), input.substr(index + 1)];
}
function first(input, offset = 0) {
  return isArrayLike(input) && input.length > offset ? input[offset] : void 0;
}
function last(input, offset = 0) {
  if (isArrayLike(input) && input.length > offset) {
    return input[input.length - 1 - offset];
  }
}
function isArrayLike(input) {
  return filterHasLength(input);
}
function toLinesWithContent(input = "", trimmed2 = true, separator = "\n") {
  return input.split(separator).reduce((output, line) => {
    const lineContent = trimmed2 ? line.trim() : line;
    if (lineContent) {
      output.push(lineContent);
    }
    return output;
  }, []);
}
function forEachLineWithContent(input, callback) {
  return toLinesWithContent(input, true).map((line) => callback(line));
}
function folderExists(path4) {
  return (0, import_file_exists.exists)(path4, import_file_exists.FOLDER);
}
function append(target, item) {
  if (Array.isArray(target)) {
    if (!target.includes(item)) {
      target.push(item);
    }
  } else {
    target.add(item);
  }
  return item;
}
function including(target, item) {
  if (Array.isArray(target) && !target.includes(item)) {
    target.push(item);
  }
  return target;
}
function remove(target, item) {
  if (Array.isArray(target)) {
    const index = target.indexOf(item);
    if (index >= 0) {
      target.splice(index, 1);
    }
  } else {
    target.delete(item);
  }
  return item;
}
function asArray(source) {
  return Array.isArray(source) ? source : [source];
}
function asCamelCase(str) {
  return str.replace(/[\s-]+(.)/g, (_all, chr) => {
    return chr.toUpperCase();
  });
}
function asStringArray(source) {
  return asArray(source).map((item) => {
    return item instanceof String ? item : String(item);
  });
}
function asNumber(source, onNaN = 0) {
  if (source == null) {
    return onNaN;
  }
  const num = parseInt(source, 10);
  return Number.isNaN(num) ? onNaN : num;
}
function prefixedArray(input, prefix) {
  const output = [];
  for (let i = 0, max = input.length; i < max; i++) {
    output.push(prefix, input[i]);
  }
  return output;
}
function bufferToString(input) {
  return (Array.isArray(input) ? import_node_buffer.Buffer.concat(input) : input).toString("utf-8");
}
function pick(source, properties) {
  const out = {};
  properties.forEach((key) => {
    if (source[key] !== void 0) {
      out[key] = source[key];
    }
  });
  return out;
}
function delay(duration = 0) {
  return new Promise((done) => setTimeout(done, duration));
}
function orVoid(input) {
  if (input === false) {
    return void 0;
  }
  return input;
}
var NULL;
var NOOP;
var objectToString;
var init_util = __esm2({
  "src/lib/utils/util.ts"() {
    "use strict";
    init_argument_filters();
    NULL = "\0";
    NOOP = () => {
    };
    objectToString = Object.prototype.toString.call.bind(Object.prototype.toString);
  }
});
function filterType(input, filter, def) {
  if (filter(input)) {
    return input;
  }
  return arguments.length > 2 ? def : void 0;
}
function filterPrimitives(input, omit) {
  const type = isPathSpec(input) ? "string" : typeof input;
  return /number|string|boolean/.test(type) && (!omit || !omit.includes(type));
}
function filterPlainObject(input) {
  return !!input && objectToString(input) === "[object Object]";
}
function filterFunction(input) {
  return typeof input === "function";
}
var filterArray;
var filterNumber;
var filterString;
var filterStringOrStringArray;
var filterHasLength;
var init_argument_filters = __esm2({
  "src/lib/utils/argument-filters.ts"() {
    "use strict";
    init_pathspec();
    init_util();
    filterArray = (input) => {
      return Array.isArray(input);
    };
    filterNumber = (input) => {
      return typeof input === "number";
    };
    filterString = (input) => {
      return typeof input === "string";
    };
    filterStringOrStringArray = (input) => {
      return filterString(input) || Array.isArray(input) && input.every(filterString);
    };
    filterHasLength = (input) => {
      if (input == null || "number|boolean|function".includes(typeof input)) {
        return false;
      }
      return typeof input.length === "number";
    };
  }
});
var ExitCodes;
var init_exit_codes = __esm2({
  "src/lib/utils/exit-codes.ts"() {
    "use strict";
    ExitCodes = /* @__PURE__ */ ((ExitCodes2) => {
      ExitCodes2[ExitCodes2["SUCCESS"] = 0] = "SUCCESS";
      ExitCodes2[ExitCodes2["ERROR"] = 1] = "ERROR";
      ExitCodes2[ExitCodes2["NOT_FOUND"] = -2] = "NOT_FOUND";
      ExitCodes2[ExitCodes2["UNCLEAN"] = 128] = "UNCLEAN";
      return ExitCodes2;
    })(ExitCodes || {});
  }
});
var GitOutputStreams;
var init_git_output_streams = __esm2({
  "src/lib/utils/git-output-streams.ts"() {
    "use strict";
    GitOutputStreams = class _GitOutputStreams {
      constructor(stdOut, stdErr) {
        this.stdOut = stdOut;
        this.stdErr = stdErr;
      }
      asStrings() {
        return new _GitOutputStreams(this.stdOut.toString("utf8"), this.stdErr.toString("utf8"));
      }
    };
  }
});
function useMatchesDefault() {
  throw new Error(`LineParser:useMatches not implemented`);
}
var LineParser;
var RemoteLineParser;
var init_line_parser = __esm2({
  "src/lib/utils/line-parser.ts"() {
    "use strict";
    LineParser = class {
      constructor(regExp, useMatches) {
        this.matches = [];
        this.useMatches = useMatchesDefault;
        this.parse = (line, target) => {
          this.resetMatches();
          if (!this._regExp.every((reg, index) => this.addMatch(reg, index, line(index)))) {
            return false;
          }
          return this.useMatches(target, this.prepareMatches()) !== false;
        };
        this._regExp = Array.isArray(regExp) ? regExp : [regExp];
        if (useMatches) {
          this.useMatches = useMatches;
        }
      }
      resetMatches() {
        this.matches.length = 0;
      }
      prepareMatches() {
        return this.matches;
      }
      addMatch(reg, index, line) {
        const matched = line && reg.exec(line);
        if (matched) {
          this.pushMatch(index, matched);
        }
        return !!matched;
      }
      pushMatch(_index, matched) {
        this.matches.push(...matched.slice(1));
      }
    };
    RemoteLineParser = class extends LineParser {
      addMatch(reg, index, line) {
        return /^remote:\s/.test(String(line)) && super.addMatch(reg, index, line);
      }
      pushMatch(index, matched) {
        if (index > 0 || matched.length > 1) {
          super.pushMatch(index, matched);
        }
      }
    };
  }
});
function createInstanceConfig(...options) {
  const baseDir = process.cwd();
  const config = Object.assign(
    { baseDir, ...defaultOptions },
    ...options.filter((o) => typeof o === "object" && o)
  );
  config.baseDir = config.baseDir || baseDir;
  config.trimmed = config.trimmed === true;
  return config;
}
var defaultOptions;
var init_simple_git_options = __esm2({
  "src/lib/utils/simple-git-options.ts"() {
    "use strict";
    defaultOptions = {
      binary: "git",
      maxConcurrentProcesses: 5,
      config: [],
      trimmed: false
    };
  }
});
function appendTaskOptions(options, commands4 = []) {
  if (!filterPlainObject(options)) {
    return commands4;
  }
  return Object.keys(options).reduce((commands22, key) => {
    const value = options[key];
    if (isPathSpec(value)) {
      commands22.push(value);
    } else if (filterPrimitives(value, ["boolean"])) {
      commands22.push(key + "=" + value);
    } else if (Array.isArray(value)) {
      for (const v of value) {
        if (!filterPrimitives(v, ["string", "number"])) {
          commands22.push(key + "=" + v);
        }
      }
    } else {
      commands22.push(key);
    }
    return commands22;
  }, commands4);
}
function getTrailingOptions(args, initialPrimitive = 0, objectOnly = false) {
  const command = [];
  for (let i = 0, max = initialPrimitive < 0 ? args.length : initialPrimitive; i < max; i++) {
    if ("string|number".includes(typeof args[i])) {
      command.push(String(args[i]));
    }
  }
  appendTaskOptions(trailingOptionsArgument(args), command);
  if (!objectOnly) {
    command.push(...trailingArrayArgument(args));
  }
  return command;
}
function trailingArrayArgument(args) {
  const hasTrailingCallback = typeof last(args) === "function";
  return asStringArray(filterType(last(args, hasTrailingCallback ? 1 : 0), filterArray, []));
}
function trailingOptionsArgument(args) {
  const hasTrailingCallback = filterFunction(last(args));
  return filterType(last(args, hasTrailingCallback ? 1 : 0), filterPlainObject);
}
function trailingFunctionArgument(args, includeNoop = true) {
  const callback = asFunction(last(args));
  return includeNoop || isUserFunction(callback) ? callback : void 0;
}
var init_task_options = __esm2({
  "src/lib/utils/task-options.ts"() {
    "use strict";
    init_argument_filters();
    init_util();
    init_pathspec();
  }
});
function callTaskParser(parser4, streams) {
  return parser4(streams.stdOut, streams.stdErr);
}
function parseStringResponse(result, parsers12, texts, trim = true) {
  asArray(texts).forEach((text) => {
    for (let lines = toLinesWithContent(text, trim), i = 0, max = lines.length; i < max; i++) {
      const line = (offset = 0) => {
        if (i + offset >= max) {
          return;
        }
        return lines[i + offset];
      };
      parsers12.some(({ parse }) => parse(line, result));
    }
  });
  return result;
}
var init_task_parser = __esm2({
  "src/lib/utils/task-parser.ts"() {
    "use strict";
    init_util();
  }
});
var utils_exports = {};
__export2(utils_exports, {
  ExitCodes: () => ExitCodes,
  GitOutputStreams: () => GitOutputStreams,
  LineParser: () => LineParser,
  NOOP: () => NOOP,
  NULL: () => NULL,
  RemoteLineParser: () => RemoteLineParser,
  append: () => append,
  appendTaskOptions: () => appendTaskOptions,
  asArray: () => asArray,
  asCamelCase: () => asCamelCase,
  asFunction: () => asFunction,
  asNumber: () => asNumber,
  asStringArray: () => asStringArray,
  bufferToString: () => bufferToString,
  callTaskParser: () => callTaskParser,
  createInstanceConfig: () => createInstanceConfig,
  delay: () => delay,
  filterArray: () => filterArray,
  filterFunction: () => filterFunction,
  filterHasLength: () => filterHasLength,
  filterNumber: () => filterNumber,
  filterPlainObject: () => filterPlainObject,
  filterPrimitives: () => filterPrimitives,
  filterString: () => filterString,
  filterStringOrStringArray: () => filterStringOrStringArray,
  filterType: () => filterType,
  first: () => first,
  folderExists: () => folderExists,
  forEachLineWithContent: () => forEachLineWithContent,
  getTrailingOptions: () => getTrailingOptions,
  including: () => including,
  isUserFunction: () => isUserFunction,
  last: () => last,
  objectToString: () => objectToString,
  orVoid: () => orVoid,
  parseStringResponse: () => parseStringResponse,
  pick: () => pick,
  prefixedArray: () => prefixedArray,
  remove: () => remove,
  splitOn: () => splitOn,
  toLinesWithContent: () => toLinesWithContent,
  trailingFunctionArgument: () => trailingFunctionArgument,
  trailingOptionsArgument: () => trailingOptionsArgument
});
var init_utils = __esm2({
  "src/lib/utils/index.ts"() {
    "use strict";
    init_argument_filters();
    init_exit_codes();
    init_git_output_streams();
    init_line_parser();
    init_simple_git_options();
    init_task_options();
    init_task_parser();
    init_util();
  }
});
var check_is_repo_exports = {};
__export2(check_is_repo_exports, {
  CheckRepoActions: () => CheckRepoActions,
  checkIsBareRepoTask: () => checkIsBareRepoTask,
  checkIsRepoRootTask: () => checkIsRepoRootTask,
  checkIsRepoTask: () => checkIsRepoTask
});
function checkIsRepoTask(action) {
  switch (action) {
    case "bare":
      return checkIsBareRepoTask();
    case "root":
      return checkIsRepoRootTask();
  }
  const commands4 = ["rev-parse", "--is-inside-work-tree"];
  return {
    commands: commands4,
    format: "utf-8",
    onError,
    parser
  };
}
function checkIsRepoRootTask() {
  const commands4 = ["rev-parse", "--git-dir"];
  return {
    commands: commands4,
    format: "utf-8",
    onError,
    parser(path4) {
      return /^\.(git)?$/.test(path4.trim());
    }
  };
}
function checkIsBareRepoTask() {
  const commands4 = ["rev-parse", "--is-bare-repository"];
  return {
    commands: commands4,
    format: "utf-8",
    onError,
    parser
  };
}
function isNotRepoMessage(error) {
  return /(Not a git repository|Kein Git-Repository)/i.test(String(error));
}
var CheckRepoActions;
var onError;
var parser;
var init_check_is_repo = __esm2({
  "src/lib/tasks/check-is-repo.ts"() {
    "use strict";
    init_utils();
    CheckRepoActions = /* @__PURE__ */ ((CheckRepoActions2) => {
      CheckRepoActions2["BARE"] = "bare";
      CheckRepoActions2["IN_TREE"] = "tree";
      CheckRepoActions2["IS_REPO_ROOT"] = "root";
      return CheckRepoActions2;
    })(CheckRepoActions || {});
    onError = ({ exitCode }, error, done, fail) => {
      if (exitCode === 128 && isNotRepoMessage(error)) {
        return done(Buffer.from("false"));
      }
      fail(error);
    };
    parser = (text) => {
      return text.trim() === "true";
    };
  }
});
function cleanSummaryParser(dryRun, text) {
  const summary = new CleanResponse(dryRun);
  const regexp = dryRun ? dryRunRemovalRegexp : removalRegexp;
  toLinesWithContent(text).forEach((line) => {
    const removed = line.replace(regexp, "");
    summary.paths.push(removed);
    (isFolderRegexp.test(removed) ? summary.folders : summary.files).push(removed);
  });
  return summary;
}
var CleanResponse;
var removalRegexp;
var dryRunRemovalRegexp;
var isFolderRegexp;
var init_CleanSummary = __esm2({
  "src/lib/responses/CleanSummary.ts"() {
    "use strict";
    init_utils();
    CleanResponse = class {
      constructor(dryRun) {
        this.dryRun = dryRun;
        this.paths = [];
        this.files = [];
        this.folders = [];
      }
    };
    removalRegexp = /^[a-z]+\s*/i;
    dryRunRemovalRegexp = /^[a-z]+\s+[a-z]+\s*/i;
    isFolderRegexp = /\/$/;
  }
});
var task_exports = {};
__export2(task_exports, {
  EMPTY_COMMANDS: () => EMPTY_COMMANDS,
  adhocExecTask: () => adhocExecTask,
  configurationErrorTask: () => configurationErrorTask,
  isBufferTask: () => isBufferTask,
  isEmptyTask: () => isEmptyTask,
  straightThroughBufferTask: () => straightThroughBufferTask,
  straightThroughStringTask: () => straightThroughStringTask
});
function adhocExecTask(parser4) {
  return {
    commands: EMPTY_COMMANDS,
    format: "empty",
    parser: parser4
  };
}
function configurationErrorTask(error) {
  return {
    commands: EMPTY_COMMANDS,
    format: "empty",
    parser() {
      throw typeof error === "string" ? new TaskConfigurationError(error) : error;
    }
  };
}
function straightThroughStringTask(commands4, trimmed2 = false) {
  return {
    commands: commands4,
    format: "utf-8",
    parser(text) {
      return trimmed2 ? String(text).trim() : text;
    }
  };
}
function straightThroughBufferTask(commands4) {
  return {
    commands: commands4,
    format: "buffer",
    parser(buffer) {
      return buffer;
    }
  };
}
function isBufferTask(task) {
  return task.format === "buffer";
}
function isEmptyTask(task) {
  return task.format === "empty" || !task.commands.length;
}
var EMPTY_COMMANDS;
var init_task = __esm2({
  "src/lib/tasks/task.ts"() {
    "use strict";
    init_task_configuration_error();
    EMPTY_COMMANDS = [];
  }
});
var clean_exports = {};
__export2(clean_exports, {
  CONFIG_ERROR_INTERACTIVE_MODE: () => CONFIG_ERROR_INTERACTIVE_MODE,
  CONFIG_ERROR_MODE_REQUIRED: () => CONFIG_ERROR_MODE_REQUIRED,
  CONFIG_ERROR_UNKNOWN_OPTION: () => CONFIG_ERROR_UNKNOWN_OPTION,
  CleanOptions: () => CleanOptions,
  cleanTask: () => cleanTask,
  cleanWithOptionsTask: () => cleanWithOptionsTask,
  isCleanOptionsArray: () => isCleanOptionsArray
});
function cleanWithOptionsTask(mode, customArgs) {
  const { cleanMode, options, valid } = getCleanOptions(mode);
  if (!cleanMode) {
    return configurationErrorTask(CONFIG_ERROR_MODE_REQUIRED);
  }
  if (!valid.options) {
    return configurationErrorTask(CONFIG_ERROR_UNKNOWN_OPTION + JSON.stringify(mode));
  }
  options.push(...customArgs);
  if (options.some(isInteractiveMode)) {
    return configurationErrorTask(CONFIG_ERROR_INTERACTIVE_MODE);
  }
  return cleanTask(cleanMode, options);
}
function cleanTask(mode, customArgs) {
  const commands4 = ["clean", `-${mode}`, ...customArgs];
  return {
    commands: commands4,
    format: "utf-8",
    parser(text) {
      return cleanSummaryParser(mode === "n", text);
    }
  };
}
function isCleanOptionsArray(input) {
  return Array.isArray(input) && input.every((test) => CleanOptionValues.has(test));
}
function getCleanOptions(input) {
  let cleanMode;
  let options = [];
  let valid = { cleanMode: false, options: true };
  input.replace(/[^a-z]i/g, "").split("").forEach((char) => {
    if (isCleanMode(char)) {
      cleanMode = char;
      valid.cleanMode = true;
    } else {
      valid.options = valid.options && isKnownOption(options[options.length] = `-${char}`);
    }
  });
  return {
    cleanMode,
    options,
    valid
  };
}
function isCleanMode(cleanMode) {
  return cleanMode === "f" || cleanMode === "n";
}
function isKnownOption(option) {
  return /^-[a-z]$/i.test(option) && CleanOptionValues.has(option.charAt(1));
}
function isInteractiveMode(option) {
  if (/^-[^\-]/.test(option)) {
    return option.indexOf("i") > 0;
  }
  return option === "--interactive";
}
var CONFIG_ERROR_INTERACTIVE_MODE;
var CONFIG_ERROR_MODE_REQUIRED;
var CONFIG_ERROR_UNKNOWN_OPTION;
var CleanOptions;
var CleanOptionValues;
var init_clean = __esm2({
  "src/lib/tasks/clean.ts"() {
    "use strict";
    init_CleanSummary();
    init_utils();
    init_task();
    CONFIG_ERROR_INTERACTIVE_MODE = "Git clean interactive mode is not supported";
    CONFIG_ERROR_MODE_REQUIRED = 'Git clean mode parameter ("n" or "f") is required';
    CONFIG_ERROR_UNKNOWN_OPTION = "Git clean unknown option found in: ";
    CleanOptions = /* @__PURE__ */ ((CleanOptions2) => {
      CleanOptions2["DRY_RUN"] = "n";
      CleanOptions2["FORCE"] = "f";
      CleanOptions2["IGNORED_INCLUDED"] = "x";
      CleanOptions2["IGNORED_ONLY"] = "X";
      CleanOptions2["EXCLUDING"] = "e";
      CleanOptions2["QUIET"] = "q";
      CleanOptions2["RECURSIVE"] = "d";
      return CleanOptions2;
    })(CleanOptions || {});
    CleanOptionValues = /* @__PURE__ */ new Set([
      "i",
      ...asStringArray(Object.values(CleanOptions))
    ]);
  }
});
function configListParser(text) {
  const config = new ConfigList();
  for (const item of configParser(text)) {
    config.addValue(item.file, String(item.key), item.value);
  }
  return config;
}
function configGetParser(text, key) {
  let value = null;
  const values = [];
  const scopes = /* @__PURE__ */ new Map();
  for (const item of configParser(text, key)) {
    if (item.key !== key) {
      continue;
    }
    values.push(value = item.value);
    if (!scopes.has(item.file)) {
      scopes.set(item.file, []);
    }
    scopes.get(item.file).push(value);
  }
  return {
    key,
    paths: Array.from(scopes.keys()),
    scopes,
    value,
    values
  };
}
function configFilePath(filePath) {
  return filePath.replace(/^(file):/, "");
}
function* configParser(text, requestedKey = null) {
  const lines = text.split("\0");
  for (let i = 0, max = lines.length - 1; i < max; ) {
    const file = configFilePath(lines[i++]);
    let value = lines[i++];
    let key = requestedKey;
    if (value.includes("\n")) {
      const line = splitOn(value, "\n");
      key = line[0];
      value = line[1];
    }
    yield { file, key, value };
  }
}
var ConfigList;
var init_ConfigList = __esm2({
  "src/lib/responses/ConfigList.ts"() {
    "use strict";
    init_utils();
    ConfigList = class {
      constructor() {
        this.files = [];
        this.values = /* @__PURE__ */ Object.create(null);
      }
      get all() {
        if (!this._all) {
          this._all = this.files.reduce((all, file) => {
            return Object.assign(all, this.values[file]);
          }, {});
        }
        return this._all;
      }
      addFile(file) {
        if (!(file in this.values)) {
          const latest = last(this.files);
          this.values[file] = latest ? Object.create(this.values[latest]) : {};
          this.files.push(file);
        }
        return this.values[file];
      }
      addValue(file, key, value) {
        const values = this.addFile(file);
        if (!Object.hasOwn(values, key)) {
          values[key] = value;
        } else if (Array.isArray(values[key])) {
          values[key].push(value);
        } else {
          values[key] = [values[key], value];
        }
        this._all = void 0;
      }
    };
  }
});
function asConfigScope(scope, fallback) {
  if (typeof scope === "string" && Object.hasOwn(GitConfigScope, scope)) {
    return scope;
  }
  return fallback;
}
function addConfigTask(key, value, append2, scope) {
  const commands4 = ["config", `--${scope}`];
  if (append2) {
    commands4.push("--add");
  }
  commands4.push(key, value);
  return {
    commands: commands4,
    format: "utf-8",
    parser(text) {
      return text;
    }
  };
}
function getConfigTask(key, scope) {
  const commands4 = ["config", "--null", "--show-origin", "--get-all", key];
  if (scope) {
    commands4.splice(1, 0, `--${scope}`);
  }
  return {
    commands: commands4,
    format: "utf-8",
    parser(text) {
      return configGetParser(text, key);
    }
  };
}
function listConfigTask(scope) {
  const commands4 = ["config", "--list", "--show-origin", "--null"];
  if (scope) {
    commands4.push(`--${scope}`);
  }
  return {
    commands: commands4,
    format: "utf-8",
    parser(text) {
      return configListParser(text);
    }
  };
}
function config_default() {
  return {
    addConfig(key, value, ...rest) {
      return this._runTask(
        addConfigTask(
          key,
          value,
          rest[0] === true,
          asConfigScope(
            rest[1],
            "local"
            /* local */
          )
        ),
        trailingFunctionArgument(arguments)
      );
    },
    getConfig(key, scope) {
      return this._runTask(
        getConfigTask(key, asConfigScope(scope, void 0)),
        trailingFunctionArgument(arguments)
      );
    },
    listConfig(...rest) {
      return this._runTask(
        listConfigTask(asConfigScope(rest[0], void 0)),
        trailingFunctionArgument(arguments)
      );
    }
  };
}
var GitConfigScope;
var init_config = __esm2({
  "src/lib/tasks/config.ts"() {
    "use strict";
    init_ConfigList();
    init_utils();
    GitConfigScope = /* @__PURE__ */ ((GitConfigScope2) => {
      GitConfigScope2["system"] = "system";
      GitConfigScope2["global"] = "global";
      GitConfigScope2["local"] = "local";
      GitConfigScope2["worktree"] = "worktree";
      return GitConfigScope2;
    })(GitConfigScope || {});
  }
});
function isDiffNameStatus(input) {
  return diffNameStatus.has(input);
}
var DiffNameStatus;
var diffNameStatus;
var init_diff_name_status = __esm2({
  "src/lib/tasks/diff-name-status.ts"() {
    "use strict";
    DiffNameStatus = /* @__PURE__ */ ((DiffNameStatus2) => {
      DiffNameStatus2["ADDED"] = "A";
      DiffNameStatus2["COPIED"] = "C";
      DiffNameStatus2["DELETED"] = "D";
      DiffNameStatus2["MODIFIED"] = "M";
      DiffNameStatus2["RENAMED"] = "R";
      DiffNameStatus2["CHANGED"] = "T";
      DiffNameStatus2["UNMERGED"] = "U";
      DiffNameStatus2["UNKNOWN"] = "X";
      DiffNameStatus2["BROKEN"] = "B";
      return DiffNameStatus2;
    })(DiffNameStatus || {});
    diffNameStatus = new Set(Object.values(DiffNameStatus));
  }
});
function grepQueryBuilder(...params) {
  return new GrepQuery().param(...params);
}
function parseGrep(grep) {
  const paths = /* @__PURE__ */ new Set();
  const results = {};
  forEachLineWithContent(grep, (input) => {
    const [path4, line, preview] = input.split(NULL);
    paths.add(path4);
    (results[path4] = results[path4] || []).push({
      line: asNumber(line),
      path: path4,
      preview
    });
  });
  return {
    paths,
    results
  };
}
function grep_default() {
  return {
    grep(searchTerm) {
      const then = trailingFunctionArgument(arguments);
      const options = getTrailingOptions(arguments);
      for (const option of disallowedOptions) {
        if (options.includes(option)) {
          return this._runTask(
            configurationErrorTask(`git.grep: use of "${option}" is not supported.`),
            then
          );
        }
      }
      if (typeof searchTerm === "string") {
        searchTerm = grepQueryBuilder().param(searchTerm);
      }
      const commands4 = ["grep", "--null", "-n", "--full-name", ...options, ...searchTerm];
      return this._runTask(
        {
          commands: commands4,
          format: "utf-8",
          parser(stdOut) {
            return parseGrep(stdOut);
          }
        },
        then
      );
    }
  };
}
var disallowedOptions;
var Query;
var _a;
var GrepQuery;
var init_grep = __esm2({
  "src/lib/tasks/grep.ts"() {
    "use strict";
    init_utils();
    init_task();
    disallowedOptions = ["-h"];
    Query = /* @__PURE__ */ Symbol("grepQuery");
    GrepQuery = class {
      constructor() {
        this[_a] = [];
      }
      *[(_a = Query, Symbol.iterator)]() {
        for (const query of this[Query]) {
          yield query;
        }
      }
      and(...and) {
        and.length && this[Query].push("--and", "(", ...prefixedArray(and, "-e"), ")");
        return this;
      }
      param(...param) {
        this[Query].push(...prefixedArray(param, "-e"));
        return this;
      }
    };
  }
});
var reset_exports = {};
__export2(reset_exports, {
  ResetMode: () => ResetMode,
  getResetMode: () => getResetMode,
  resetTask: () => resetTask
});
function resetTask(mode, customArgs) {
  const commands4 = ["reset"];
  if (isValidResetMode(mode)) {
    commands4.push(`--${mode}`);
  }
  commands4.push(...customArgs);
  return straightThroughStringTask(commands4);
}
function getResetMode(mode) {
  if (isValidResetMode(mode)) {
    return mode;
  }
  switch (typeof mode) {
    case "string":
    case "undefined":
      return "soft";
  }
  return;
}
function isValidResetMode(mode) {
  return typeof mode === "string" && validResetModes.includes(mode);
}
var ResetMode;
var validResetModes;
var init_reset = __esm2({
  "src/lib/tasks/reset.ts"() {
    "use strict";
    init_utils();
    init_task();
    ResetMode = /* @__PURE__ */ ((ResetMode2) => {
      ResetMode2["MIXED"] = "mixed";
      ResetMode2["SOFT"] = "soft";
      ResetMode2["HARD"] = "hard";
      ResetMode2["MERGE"] = "merge";
      ResetMode2["KEEP"] = "keep";
      return ResetMode2;
    })(ResetMode || {});
    validResetModes = asStringArray(Object.values(ResetMode));
  }
});
function createLog() {
  return (0, import_debug.default)("simple-git");
}
function prefixedLogger(to, prefix, forward) {
  if (!prefix || !String(prefix).replace(/\s*/, "")) {
    return !forward ? to : (message, ...args) => {
      to(message, ...args);
      forward(message, ...args);
    };
  }
  return (message, ...args) => {
    to(`%s ${message}`, prefix, ...args);
    if (forward) {
      forward(message, ...args);
    }
  };
}
function childLoggerName(name, childDebugger, { namespace: parentNamespace }) {
  if (typeof name === "string") {
    return name;
  }
  const childNamespace = childDebugger && childDebugger.namespace || "";
  if (childNamespace.startsWith(parentNamespace)) {
    return childNamespace.substr(parentNamespace.length + 1);
  }
  return childNamespace || parentNamespace;
}
function createLogger(label, verbose, initialStep, infoDebugger = createLog()) {
  const labelPrefix = label && `[${label}]` || "";
  const spawned = [];
  const debugDebugger = typeof verbose === "string" ? infoDebugger.extend(verbose) : verbose;
  const key = childLoggerName(filterType(verbose, filterString), debugDebugger, infoDebugger);
  return step(initialStep);
  function sibling(name, initial) {
    return append(
      spawned,
      createLogger(label, key.replace(/^[^:]+/, name), initial, infoDebugger)
    );
  }
  function step(phase) {
    const stepPrefix = phase && `[${phase}]` || "";
    const debug2 = debugDebugger && prefixedLogger(debugDebugger, stepPrefix) || NOOP;
    const info = prefixedLogger(infoDebugger, `${labelPrefix} ${stepPrefix}`, debug2);
    return Object.assign(debugDebugger ? debug2 : info, {
      label,
      sibling,
      info,
      step
    });
  }
}
var init_git_logger = __esm2({
  "src/lib/git-logger.ts"() {
    "use strict";
    init_utils();
    import_debug.default.formatters.L = (value) => String(filterHasLength(value) ? value.length : "-");
    import_debug.default.formatters.B = (value) => {
      if (Buffer.isBuffer(value)) {
        return value.toString("utf8");
      }
      return objectToString(value);
    };
  }
});
var TasksPendingQueue;
var init_tasks_pending_queue = __esm2({
  "src/lib/runners/tasks-pending-queue.ts"() {
    "use strict";
    init_git_error();
    init_git_logger();
    TasksPendingQueue = class _TasksPendingQueue {
      constructor(logLabel = "GitExecutor") {
        this.logLabel = logLabel;
        this._queue = /* @__PURE__ */ new Map();
      }
      withProgress(task) {
        return this._queue.get(task);
      }
      createProgress(task) {
        const name = _TasksPendingQueue.getName(task.commands[0]);
        const logger = createLogger(this.logLabel, name);
        return {
          task,
          logger,
          name
        };
      }
      push(task) {
        const progress = this.createProgress(task);
        progress.logger("Adding task to the queue, commands = %o", task.commands);
        this._queue.set(task, progress);
        return progress;
      }
      fatal(err) {
        for (const [task, { logger }] of Array.from(this._queue.entries())) {
          if (task === err.task) {
            logger.info(`Failed %o`, err);
            logger(
              `Fatal exception, any as-yet un-started tasks run through this executor will not be attempted`
            );
          } else {
            logger.info(
              `A fatal exception occurred in a previous task, the queue has been purged: %o`,
              err.message
            );
          }
          this.complete(task);
        }
        if (this._queue.size !== 0) {
          throw new Error(`Queue size should be zero after fatal: ${this._queue.size}`);
        }
      }
      complete(task) {
        const progress = this.withProgress(task);
        if (progress) {
          this._queue.delete(task);
        }
      }
      attempt(task) {
        const progress = this.withProgress(task);
        if (!progress) {
          throw new GitError(void 0, "TasksPendingQueue: attempt called for an unknown task");
        }
        progress.logger("Starting task");
        return progress;
      }
      static getName(name = "empty") {
        return `task:${name}:${++_TasksPendingQueue.counter}`;
      }
      static {
        this.counter = 0;
      }
    };
  }
});
function pluginContext(task, commands4) {
  return {
    method: first(task.commands) || "",
    commands: commands4
  };
}
function onErrorReceived(target, logger) {
  return (err) => {
    logger(`[ERROR] child process exception %o`, err);
    target.push(Buffer.from(String(err.stack), "ascii"));
  };
}
function onDataReceived(target, name, logger, output) {
  return (buffer) => {
    logger(`%s received %L bytes`, name, buffer);
    output(`%B`, buffer);
    target.push(buffer);
  };
}
var GitExecutorChain;
var init_git_executor_chain = __esm2({
  "src/lib/runners/git-executor-chain.ts"() {
    "use strict";
    init_git_error();
    init_task();
    init_utils();
    init_tasks_pending_queue();
    GitExecutorChain = class {
      constructor(_executor, _scheduler, _plugins) {
        this._executor = _executor;
        this._scheduler = _scheduler;
        this._plugins = _plugins;
        this._chain = Promise.resolve();
        this._queue = new TasksPendingQueue();
      }
      get cwd() {
        return this._cwd || this._executor.cwd;
      }
      set cwd(cwd) {
        this._cwd = cwd;
      }
      get env() {
        return this._executor.env;
      }
      get outputHandler() {
        return this._executor.outputHandler;
      }
      chain() {
        return this;
      }
      push(task) {
        this._queue.push(task);
        return this._chain = this._chain.then(() => this.attemptTask(task));
      }
      async attemptTask(task) {
        const onScheduleComplete = await this._scheduler.next();
        const onQueueComplete = () => this._queue.complete(task);
        try {
          const { logger } = this._queue.attempt(task);
          return await (isEmptyTask(task) ? this.attemptEmptyTask(task, logger) : this.attemptRemoteTask(task, logger));
        } catch (e) {
          throw this.onFatalException(task, e);
        } finally {
          onQueueComplete();
          onScheduleComplete();
        }
      }
      onFatalException(task, e) {
        const gitError = e instanceof GitError ? Object.assign(e, { task }) : new GitError(task, e && String(e));
        this._chain = Promise.resolve();
        this._queue.fatal(gitError);
        return gitError;
      }
      async attemptRemoteTask(task, logger) {
        const binary = this._plugins.exec("spawn.binary", "", pluginContext(task, task.commands));
        const args = this._plugins.exec(
          "spawn.args",
          [...task.commands],
          pluginContext(task, task.commands)
        );
        const raw = await this.gitResponse(
          task,
          binary,
          args,
          this.outputHandler,
          logger.step("SPAWN")
        );
        const outputStreams = await this.handleTaskData(task, args, raw, logger.step("HANDLE"));
        logger(`passing response to task's parser as a %s`, task.format);
        if (isBufferTask(task)) {
          return callTaskParser(task.parser, outputStreams);
        }
        return callTaskParser(task.parser, outputStreams.asStrings());
      }
      async attemptEmptyTask(task, logger) {
        logger(`empty task bypassing child process to call to task's parser`);
        return task.parser(this);
      }
      handleTaskData(task, args, result, logger) {
        const { exitCode, rejection, stdOut, stdErr } = result;
        return new Promise((done, fail) => {
          logger(`Preparing to handle process response exitCode=%d stdOut=`, exitCode);
          const { error } = this._plugins.exec(
            "task.error",
            { error: rejection },
            {
              ...pluginContext(task, args),
              ...result
            }
          );
          if (error && task.onError) {
            logger.info(`exitCode=%s handling with custom error handler`);
            return task.onError(
              result,
              error,
              (newStdOut) => {
                logger.info(`custom error handler treated as success`);
                logger(`custom error returned a %s`, objectToString(newStdOut));
                done(
                  new GitOutputStreams(
                    Array.isArray(newStdOut) ? Buffer.concat(newStdOut) : newStdOut,
                    Buffer.concat(stdErr)
                  )
                );
              },
              fail
            );
          }
          if (error) {
            logger.info(
              `handling as error: exitCode=%s stdErr=%s rejection=%o`,
              exitCode,
              stdErr.length,
              rejection
            );
            return fail(error);
          }
          logger.info(`retrieving task output complete`);
          done(new GitOutputStreams(Buffer.concat(stdOut), Buffer.concat(stdErr)));
        });
      }
      async gitResponse(task, command, args, outputHandler, logger) {
        const outputLogger = logger.sibling("output");
        const spawnOptions = this._plugins.exec(
          "spawn.options",
          {
            cwd: this.cwd,
            env: this.env,
            windowsHide: true
          },
          pluginContext(task, task.commands)
        );
        return new Promise((done) => {
          const stdOut = [];
          const stdErr = [];
          logger.info(`%s %o`, command, args);
          logger("%O", spawnOptions);
          let rejection = this._beforeSpawn(task, args);
          if (rejection) {
            return done({
              stdOut,
              stdErr,
              exitCode: 9901,
              rejection
            });
          }
          this._plugins.exec("spawn.before", void 0, {
            ...pluginContext(task, args),
            kill(reason) {
              rejection = reason || rejection;
            }
          });
          const spawned = (0, import_child_process.spawn)(command, args, spawnOptions);
          spawned.stdout.on(
            "data",
            onDataReceived(stdOut, "stdOut", logger, outputLogger.step("stdOut"))
          );
          spawned.stderr.on(
            "data",
            onDataReceived(stdErr, "stdErr", logger, outputLogger.step("stdErr"))
          );
          spawned.on("error", onErrorReceived(stdErr, logger));
          if (outputHandler) {
            logger(`Passing child process stdOut/stdErr to custom outputHandler`);
            outputHandler(command, spawned.stdout, spawned.stderr, [...args]);
          }
          this._plugins.exec("spawn.after", void 0, {
            ...pluginContext(task, args),
            spawned,
            close(exitCode, reason) {
              done({
                stdOut,
                stdErr,
                exitCode,
                rejection: rejection || reason
              });
            },
            kill(reason) {
              if (spawned.killed) {
                return;
              }
              rejection = reason;
              spawned.kill("SIGINT");
            }
          });
        });
      }
      _beforeSpawn(task, args) {
        let rejection;
        this._plugins.exec("spawn.before", void 0, {
          ...pluginContext(task, args),
          kill(reason) {
            rejection = reason || rejection;
          }
        });
        return rejection;
      }
    };
  }
});
var git_executor_exports = {};
__export2(git_executor_exports, {
  GitExecutor: () => GitExecutor
});
var GitExecutor;
var init_git_executor = __esm2({
  "src/lib/runners/git-executor.ts"() {
    "use strict";
    init_git_executor_chain();
    GitExecutor = class {
      constructor(cwd, _scheduler, _plugins) {
        this.cwd = cwd;
        this._scheduler = _scheduler;
        this._plugins = _plugins;
        this._chain = new GitExecutorChain(this, this._scheduler, this._plugins);
      }
      chain() {
        return new GitExecutorChain(this, this._scheduler, this._plugins);
      }
      push(task) {
        return this._chain.push(task);
      }
    };
  }
});
function taskCallback(task, response, callback = NOOP) {
  const onSuccess = (data) => {
    callback(null, data);
  };
  const onError2 = (err) => {
    if (err?.task === task) {
      callback(
        err instanceof GitResponseError ? addDeprecationNoticeToError(err) : err,
        void 0
      );
    }
  };
  response.then(onSuccess, onError2);
}
function addDeprecationNoticeToError(err) {
  let log = (name) => {
    console.warn(
      `simple-git deprecation notice: accessing GitResponseError.${name} should be GitResponseError.git.${name}, this will no longer be available in version 3`
    );
    log = NOOP;
  };
  return Object.create(err, Object.getOwnPropertyNames(err.git).reduce(descriptorReducer, {}));
  function descriptorReducer(all, name) {
    if (name in err) {
      return all;
    }
    all[name] = {
      enumerable: false,
      configurable: false,
      get() {
        log(name);
        return err.git[name];
      }
    };
    return all;
  }
}
var init_task_callback = __esm2({
  "src/lib/task-callback.ts"() {
    "use strict";
    init_git_response_error();
    init_utils();
  }
});
function changeWorkingDirectoryTask(directory, root) {
  return adhocExecTask((instance) => {
    if (!folderExists(directory)) {
      throw new Error(`Git.cwd: cannot change to non-directory "${directory}"`);
    }
    return (root || instance).cwd = directory;
  });
}
var init_change_working_directory = __esm2({
  "src/lib/tasks/change-working-directory.ts"() {
    "use strict";
    init_utils();
    init_task();
  }
});
function checkoutTask(args) {
  const commands4 = ["checkout", ...args];
  if (commands4[1] === "-b" && commands4.includes("-B")) {
    commands4[1] = remove(commands4, "-B");
  }
  return straightThroughStringTask(commands4);
}
function checkout_default() {
  return {
    checkout() {
      return this._runTask(
        checkoutTask(getTrailingOptions(arguments, 1)),
        trailingFunctionArgument(arguments)
      );
    },
    checkoutBranch(branchName, startPoint) {
      return this._runTask(
        checkoutTask(["-b", branchName, startPoint, ...getTrailingOptions(arguments)]),
        trailingFunctionArgument(arguments)
      );
    },
    checkoutLocalBranch(branchName) {
      return this._runTask(
        checkoutTask(["-b", branchName, ...getTrailingOptions(arguments)]),
        trailingFunctionArgument(arguments)
      );
    }
  };
}
var init_checkout = __esm2({
  "src/lib/tasks/checkout.ts"() {
    "use strict";
    init_utils();
    init_task();
  }
});
function countObjectsResponse() {
  return {
    count: 0,
    garbage: 0,
    inPack: 0,
    packs: 0,
    prunePackable: 0,
    size: 0,
    sizeGarbage: 0,
    sizePack: 0
  };
}
function count_objects_default() {
  return {
    countObjects() {
      return this._runTask({
        commands: ["count-objects", "--verbose"],
        format: "utf-8",
        parser(stdOut) {
          return parseStringResponse(countObjectsResponse(), [parser2], stdOut);
        }
      });
    }
  };
}
var parser2;
var init_count_objects = __esm2({
  "src/lib/tasks/count-objects.ts"() {
    "use strict";
    init_utils();
    parser2 = new LineParser(
      /([a-z-]+): (\d+)$/,
      (result, [key, value]) => {
        const property = asCamelCase(key);
        if (Object.hasOwn(result, property)) {
          result[property] = asNumber(value);
        }
      }
    );
  }
});
function parseCommitResult(stdOut) {
  const result = {
    author: null,
    branch: "",
    commit: "",
    root: false,
    summary: {
      changes: 0,
      insertions: 0,
      deletions: 0
    }
  };
  return parseStringResponse(result, parsers, stdOut);
}
var parsers;
var init_parse_commit = __esm2({
  "src/lib/parsers/parse-commit.ts"() {
    "use strict";
    init_utils();
    parsers = [
      new LineParser(/^\[([^\s]+)( \([^)]+\))? ([^\]]+)/, (result, [branch, root, commit]) => {
        result.branch = branch;
        result.commit = commit;
        result.root = !!root;
      }),
      new LineParser(/\s*Author:\s(.+)/i, (result, [author]) => {
        const parts = author.split("<");
        const email = parts.pop();
        if (!email || !email.includes("@")) {
          return;
        }
        result.author = {
          email: email.substr(0, email.length - 1),
          name: parts.join("<").trim()
        };
      }),
      new LineParser(
        /(\d+)[^,]*(?:,\s*(\d+)[^,]*)(?:,\s*(\d+))/g,
        (result, [changes, insertions, deletions]) => {
          result.summary.changes = parseInt(changes, 10) || 0;
          result.summary.insertions = parseInt(insertions, 10) || 0;
          result.summary.deletions = parseInt(deletions, 10) || 0;
        }
      ),
      new LineParser(
        /^(\d+)[^,]*(?:,\s*(\d+)[^(]+\(([+-]))?/,
        (result, [changes, lines, direction]) => {
          result.summary.changes = parseInt(changes, 10) || 0;
          const count = parseInt(lines, 10) || 0;
          if (direction === "-") {
            result.summary.deletions = count;
          } else if (direction === "+") {
            result.summary.insertions = count;
          }
        }
      )
    ];
  }
});
function commitTask(message, files, customArgs) {
  const commands4 = [
    "-c",
    "core.abbrev=40",
    "commit",
    ...prefixedArray(message, "-m"),
    ...files,
    ...customArgs
  ];
  return {
    commands: commands4,
    format: "utf-8",
    parser: parseCommitResult
  };
}
function commit_default() {
  return {
    commit(message, ...rest) {
      const next = trailingFunctionArgument(arguments);
      const task = rejectDeprecatedSignatures(message) || commitTask(
        asArray(message),
        asArray(filterType(rest[0], filterStringOrStringArray, [])),
        [
          ...asStringArray(filterType(rest[1], filterArray, [])),
          ...getTrailingOptions(arguments, 0, true)
        ]
      );
      return this._runTask(task, next);
    }
  };
  function rejectDeprecatedSignatures(message) {
    return !filterStringOrStringArray(message) && configurationErrorTask(
      `git.commit: requires the commit message to be supplied as a string/string[]`
    );
  }
}
var init_commit = __esm2({
  "src/lib/tasks/commit.ts"() {
    "use strict";
    init_parse_commit();
    init_utils();
    init_task();
  }
});
function first_commit_default() {
  return {
    firstCommit() {
      return this._runTask(
        straightThroughStringTask(["rev-list", "--max-parents=0", "HEAD"], true),
        trailingFunctionArgument(arguments)
      );
    }
  };
}
var init_first_commit = __esm2({
  "src/lib/tasks/first-commit.ts"() {
    "use strict";
    init_utils();
    init_task();
  }
});
function hashObjectTask(filePath, write) {
  const commands4 = ["hash-object", filePath];
  if (write) {
    commands4.push("-w");
  }
  return straightThroughStringTask(commands4, true);
}
var init_hash_object = __esm2({
  "src/lib/tasks/hash-object.ts"() {
    "use strict";
    init_task();
  }
});
function parseInit(bare, path4, text) {
  const response = String(text).trim();
  let result;
  if (result = initResponseRegex.exec(response)) {
    return new InitSummary(bare, path4, false, result[1]);
  }
  if (result = reInitResponseRegex.exec(response)) {
    return new InitSummary(bare, path4, true, result[1]);
  }
  let gitDir = "";
  const tokens = response.split(" ");
  while (tokens.length) {
    const token = tokens.shift();
    if (token === "in") {
      gitDir = tokens.join(" ");
      break;
    }
  }
  return new InitSummary(bare, path4, /^re/i.test(response), gitDir);
}
var InitSummary;
var initResponseRegex;
var reInitResponseRegex;
var init_InitSummary = __esm2({
  "src/lib/responses/InitSummary.ts"() {
    "use strict";
    InitSummary = class {
      constructor(bare, path4, existing, gitDir) {
        this.bare = bare;
        this.path = path4;
        this.existing = existing;
        this.gitDir = gitDir;
      }
    };
    initResponseRegex = /^Init.+ repository in (.+)$/;
    reInitResponseRegex = /^Rein.+ in (.+)$/;
  }
});
function hasBareCommand(command) {
  return command.includes(bareCommand);
}
function initTask(bare = false, path4, customArgs) {
  const commands4 = ["init", ...customArgs];
  if (bare && !hasBareCommand(commands4)) {
    commands4.splice(1, 0, bareCommand);
  }
  return {
    commands: commands4,
    format: "utf-8",
    parser(text) {
      return parseInit(commands4.includes("--bare"), path4, text);
    }
  };
}
var bareCommand;
var init_init = __esm2({
  "src/lib/tasks/init.ts"() {
    "use strict";
    init_InitSummary();
    bareCommand = "--bare";
  }
});
function logFormatFromCommand(customArgs) {
  for (let i = 0; i < customArgs.length; i++) {
    const format = logFormatRegex.exec(customArgs[i]);
    if (format) {
      return `--${format[1]}`;
    }
  }
  return "";
}
function isLogFormat(customArg) {
  return logFormatRegex.test(customArg);
}
var logFormatRegex;
var init_log_format = __esm2({
  "src/lib/args/log-format.ts"() {
    "use strict";
    logFormatRegex = /^--(stat|numstat|name-only|name-status)(=|$)/;
  }
});
var DiffSummary;
var init_DiffSummary = __esm2({
  "src/lib/responses/DiffSummary.ts"() {
    "use strict";
    DiffSummary = class {
      constructor() {
        this.changed = 0;
        this.deletions = 0;
        this.insertions = 0;
        this.files = [];
      }
    };
  }
});
function getDiffParser(format = "") {
  const parser4 = diffSummaryParsers[format];
  return (stdOut) => parseStringResponse(new DiffSummary(), parser4, stdOut, false);
}
var statParser;
var numStatParser;
var nameOnlyParser;
var nameStatusParser;
var diffSummaryParsers;
var init_parse_diff_summary = __esm2({
  "src/lib/parsers/parse-diff-summary.ts"() {
    "use strict";
    init_log_format();
    init_DiffSummary();
    init_diff_name_status();
    init_utils();
    statParser = [
      new LineParser(
        /^(.+)\s+\|\s+(\d+)(\s+[+\-]+)?$/,
        (result, [file, changes, alterations = ""]) => {
          result.files.push({
            file: file.trim(),
            changes: asNumber(changes),
            insertions: alterations.replace(/[^+]/g, "").length,
            deletions: alterations.replace(/[^-]/g, "").length,
            binary: false
          });
        }
      ),
      new LineParser(
        /^(.+) \|\s+Bin ([0-9.]+) -> ([0-9.]+) ([a-z]+)/,
        (result, [file, before, after]) => {
          result.files.push({
            file: file.trim(),
            before: asNumber(before),
            after: asNumber(after),
            binary: true
          });
        }
      ),
      new LineParser(
        /(\d+) files? changed\s*((?:, \d+ [^,]+){0,2})/,
        (result, [changed, summary]) => {
          const inserted = /(\d+) i/.exec(summary);
          const deleted = /(\d+) d/.exec(summary);
          result.changed = asNumber(changed);
          result.insertions = asNumber(inserted?.[1]);
          result.deletions = asNumber(deleted?.[1]);
        }
      )
    ];
    numStatParser = [
      new LineParser(
        /(\d+)\t(\d+)\t(.+)$/,
        (result, [changesInsert, changesDelete, file]) => {
          const insertions = asNumber(changesInsert);
          const deletions = asNumber(changesDelete);
          result.changed++;
          result.insertions += insertions;
          result.deletions += deletions;
          result.files.push({
            file,
            changes: insertions + deletions,
            insertions,
            deletions,
            binary: false
          });
        }
      ),
      new LineParser(/-\t-\t(.+)$/, (result, [file]) => {
        result.changed++;
        result.files.push({
          file,
          after: 0,
          before: 0,
          binary: true
        });
      })
    ];
    nameOnlyParser = [
      new LineParser(/(.+)$/, (result, [file]) => {
        result.changed++;
        result.files.push({
          file,
          changes: 0,
          insertions: 0,
          deletions: 0,
          binary: false
        });
      })
    ];
    nameStatusParser = [
      new LineParser(
        /([ACDMRTUXB])([0-9]{0,3})\t(.[^\t]*)(\t(.[^\t]*))?$/,
        (result, [status, similarity, from, _to, to]) => {
          result.changed++;
          result.files.push({
            file: to ?? from,
            changes: 0,
            insertions: 0,
            deletions: 0,
            binary: false,
            status: orVoid(isDiffNameStatus(status) && status),
            from: orVoid(!!to && from !== to && from),
            similarity: asNumber(similarity)
          });
        }
      )
    ];
    diffSummaryParsers = {
      [
        ""
        /* NONE */
      ]: statParser,
      [
        "--stat"
        /* STAT */
      ]: statParser,
      [
        "--numstat"
        /* NUM_STAT */
      ]: numStatParser,
      [
        "--name-status"
        /* NAME_STATUS */
      ]: nameStatusParser,
      [
        "--name-only"
        /* NAME_ONLY */
      ]: nameOnlyParser
    };
  }
});
function lineBuilder(tokens, fields) {
  return fields.reduce(
    (line, field, index) => {
      line[field] = tokens[index] || "";
      return line;
    },
    /* @__PURE__ */ Object.create({ diff: null })
  );
}
function createListLogSummaryParser(splitter = SPLITTER, fields = defaultFieldNames, logFormat = "") {
  const parseDiffResult = getDiffParser(logFormat);
  return function(stdOut) {
    const all = toLinesWithContent(
      stdOut.trim(),
      false,
      START_BOUNDARY
    ).map(function(item) {
      const lineDetail = item.split(COMMIT_BOUNDARY);
      const listLogLine = lineBuilder(lineDetail[0].split(splitter), fields);
      if (lineDetail.length > 1 && !!lineDetail[1].trim()) {
        listLogLine.diff = parseDiffResult(lineDetail[1]);
      }
      return listLogLine;
    });
    return {
      all,
      latest: all.length && all[0] || null,
      total: all.length
    };
  };
}
var START_BOUNDARY;
var COMMIT_BOUNDARY;
var SPLITTER;
var defaultFieldNames;
var init_parse_list_log_summary = __esm2({
  "src/lib/parsers/parse-list-log-summary.ts"() {
    "use strict";
    init_utils();
    init_parse_diff_summary();
    init_log_format();
    START_BOUNDARY = "\xF2\xF2\xF2\xF2\xF2\xF2 ";
    COMMIT_BOUNDARY = " \xF2\xF2";
    SPLITTER = " \xF2 ";
    defaultFieldNames = ["hash", "date", "message", "refs", "author_name", "author_email"];
  }
});
var diff_exports = {};
__export2(diff_exports, {
  diffSummaryTask: () => diffSummaryTask,
  validateLogFormatConfig: () => validateLogFormatConfig
});
function diffSummaryTask(customArgs) {
  let logFormat = logFormatFromCommand(customArgs);
  const commands4 = ["diff"];
  if (logFormat === "") {
    logFormat = "--stat";
    commands4.push("--stat=4096");
  }
  commands4.push(...customArgs);
  return validateLogFormatConfig(commands4) || {
    commands: commands4,
    format: "utf-8",
    parser: getDiffParser(logFormat)
  };
}
function validateLogFormatConfig(customArgs) {
  const flags = customArgs.filter(isLogFormat);
  if (flags.length > 1) {
    return configurationErrorTask(
      `Summary flags are mutually exclusive - pick one of ${flags.join(",")}`
    );
  }
  if (flags.length && customArgs.includes("-z")) {
    return configurationErrorTask(
      `Summary flag ${flags} parsing is not compatible with null termination option '-z'`
    );
  }
}
var init_diff = __esm2({
  "src/lib/tasks/diff.ts"() {
    "use strict";
    init_log_format();
    init_parse_diff_summary();
    init_task();
  }
});
function prettyFormat(format, splitter) {
  const fields = [];
  const formatStr = [];
  Object.keys(format).forEach((field) => {
    fields.push(field);
    formatStr.push(String(format[field]));
  });
  return [fields, formatStr.join(splitter)];
}
function userOptions(input) {
  return Object.keys(input).reduce((out, key) => {
    if (!(key in excludeOptions)) {
      out[key] = input[key];
    }
    return out;
  }, {});
}
function parseLogOptions(opt = {}, customArgs = []) {
  const splitter = filterType(opt.splitter, filterString, SPLITTER);
  const format = filterPlainObject(opt.format) ? opt.format : {
    hash: "%H",
    date: opt.strictDate === false ? "%ai" : "%aI",
    message: "%s",
    refs: "%D",
    body: opt.multiLine ? "%B" : "%b",
    author_name: opt.mailMap !== false ? "%aN" : "%an",
    author_email: opt.mailMap !== false ? "%aE" : "%ae"
  };
  const [fields, formatStr] = prettyFormat(format, splitter);
  const suffix = [];
  const command = [
    `--pretty=format:${START_BOUNDARY}${formatStr}${COMMIT_BOUNDARY}`,
    ...customArgs
  ];
  const maxCount = opt.n || opt["max-count"] || opt.maxCount;
  if (maxCount) {
    command.push(`--max-count=${maxCount}`);
  }
  if (opt.from || opt.to) {
    const rangeOperator = opt.symmetric !== false ? "..." : "..";
    suffix.push(`${opt.from || ""}${rangeOperator}${opt.to || ""}`);
  }
  if (filterString(opt.file)) {
    command.push("--follow", pathspec(opt.file));
  }
  appendTaskOptions(userOptions(opt), command);
  return {
    fields,
    splitter,
    commands: [...command, ...suffix]
  };
}
function logTask(splitter, fields, customArgs) {
  const parser4 = createListLogSummaryParser(splitter, fields, logFormatFromCommand(customArgs));
  return {
    commands: ["log", ...customArgs],
    format: "utf-8",
    parser: parser4
  };
}
function log_default() {
  return {
    log(...rest) {
      const next = trailingFunctionArgument(arguments);
      const options = parseLogOptions(
        trailingOptionsArgument(arguments),
        asStringArray(filterType(arguments[0], filterArray, []))
      );
      const task = rejectDeprecatedSignatures(...rest) || validateLogFormatConfig(options.commands) || createLogTask(options);
      return this._runTask(task, next);
    }
  };
  function createLogTask(options) {
    return logTask(options.splitter, options.fields, options.commands);
  }
  function rejectDeprecatedSignatures(from, to) {
    return filterString(from) && filterString(to) && configurationErrorTask(
      `git.log(string, string) should be replaced with git.log({ from: string, to: string })`
    );
  }
}
var excludeOptions;
var init_log = __esm2({
  "src/lib/tasks/log.ts"() {
    "use strict";
    init_log_format();
    init_pathspec();
    init_parse_list_log_summary();
    init_utils();
    init_task();
    init_diff();
    excludeOptions = /* @__PURE__ */ ((excludeOptions2) => {
      excludeOptions2[excludeOptions2["--pretty"] = 0] = "--pretty";
      excludeOptions2[excludeOptions2["max-count"] = 1] = "max-count";
      excludeOptions2[excludeOptions2["maxCount"] = 2] = "maxCount";
      excludeOptions2[excludeOptions2["n"] = 3] = "n";
      excludeOptions2[excludeOptions2["file"] = 4] = "file";
      excludeOptions2[excludeOptions2["format"] = 5] = "format";
      excludeOptions2[excludeOptions2["from"] = 6] = "from";
      excludeOptions2[excludeOptions2["to"] = 7] = "to";
      excludeOptions2[excludeOptions2["splitter"] = 8] = "splitter";
      excludeOptions2[excludeOptions2["symmetric"] = 9] = "symmetric";
      excludeOptions2[excludeOptions2["mailMap"] = 10] = "mailMap";
      excludeOptions2[excludeOptions2["multiLine"] = 11] = "multiLine";
      excludeOptions2[excludeOptions2["strictDate"] = 12] = "strictDate";
      return excludeOptions2;
    })(excludeOptions || {});
  }
});
var MergeSummaryConflict;
var MergeSummaryDetail;
var init_MergeSummary = __esm2({
  "src/lib/responses/MergeSummary.ts"() {
    "use strict";
    MergeSummaryConflict = class {
      constructor(reason, file = null, meta) {
        this.reason = reason;
        this.file = file;
        this.meta = meta;
      }
      toString() {
        return `${this.file}:${this.reason}`;
      }
    };
    MergeSummaryDetail = class {
      constructor() {
        this.conflicts = [];
        this.merges = [];
        this.result = "success";
      }
      get failed() {
        return this.conflicts.length > 0;
      }
      get reason() {
        return this.result;
      }
      toString() {
        if (this.conflicts.length) {
          return `CONFLICTS: ${this.conflicts.join(", ")}`;
        }
        return "OK";
      }
    };
  }
});
var PullSummary;
var PullFailedSummary;
var init_PullSummary = __esm2({
  "src/lib/responses/PullSummary.ts"() {
    "use strict";
    PullSummary = class {
      constructor() {
        this.remoteMessages = {
          all: []
        };
        this.created = [];
        this.deleted = [];
        this.files = [];
        this.deletions = {};
        this.insertions = {};
        this.summary = {
          changes: 0,
          deletions: 0,
          insertions: 0
        };
      }
    };
    PullFailedSummary = class {
      constructor() {
        this.remote = "";
        this.hash = {
          local: "",
          remote: ""
        };
        this.branch = {
          local: "",
          remote: ""
        };
        this.message = "";
      }
      toString() {
        return this.message;
      }
    };
  }
});
function objectEnumerationResult(remoteMessages) {
  return remoteMessages.objects = remoteMessages.objects || {
    compressing: 0,
    counting: 0,
    enumerating: 0,
    packReused: 0,
    reused: { count: 0, delta: 0 },
    total: { count: 0, delta: 0 }
  };
}
function asObjectCount(source) {
  const count = /^\s*(\d+)/.exec(source);
  const delta = /delta (\d+)/i.exec(source);
  return {
    count: asNumber(count && count[1] || "0"),
    delta: asNumber(delta && delta[1] || "0")
  };
}
var remoteMessagesObjectParsers;
var init_parse_remote_objects = __esm2({
  "src/lib/parsers/parse-remote-objects.ts"() {
    "use strict";
    init_utils();
    remoteMessagesObjectParsers = [
      new RemoteLineParser(
        /^remote:\s*(enumerating|counting|compressing) objects: (\d+),/i,
        (result, [action, count]) => {
          const key = action.toLowerCase();
          const enumeration = objectEnumerationResult(result.remoteMessages);
          Object.assign(enumeration, { [key]: asNumber(count) });
        }
      ),
      new RemoteLineParser(
        /^remote:\s*(enumerating|counting|compressing) objects: \d+% \(\d+\/(\d+)\),/i,
        (result, [action, count]) => {
          const key = action.toLowerCase();
          const enumeration = objectEnumerationResult(result.remoteMessages);
          Object.assign(enumeration, { [key]: asNumber(count) });
        }
      ),
      new RemoteLineParser(
        /total ([^,]+), reused ([^,]+), pack-reused (\d+)/i,
        (result, [total, reused, packReused]) => {
          const objects = objectEnumerationResult(result.remoteMessages);
          objects.total = asObjectCount(total);
          objects.reused = asObjectCount(reused);
          objects.packReused = asNumber(packReused);
        }
      )
    ];
  }
});
function parseRemoteMessages(_stdOut, stdErr) {
  return parseStringResponse({ remoteMessages: new RemoteMessageSummary() }, parsers2, stdErr);
}
var parsers2;
var RemoteMessageSummary;
var init_parse_remote_messages = __esm2({
  "src/lib/parsers/parse-remote-messages.ts"() {
    "use strict";
    init_utils();
    init_parse_remote_objects();
    parsers2 = [
      new RemoteLineParser(/^remote:\s*(.+)$/, (result, [text]) => {
        result.remoteMessages.all.push(text.trim());
        return false;
      }),
      ...remoteMessagesObjectParsers,
      new RemoteLineParser(
        [/create a (?:pull|merge) request/i, /\s(https?:\/\/\S+)$/],
        (result, [pullRequestUrl]) => {
          result.remoteMessages.pullRequestUrl = pullRequestUrl;
        }
      ),
      new RemoteLineParser(
        [/found (\d+) vulnerabilities.+\(([^)]+)\)/i, /\s(https?:\/\/\S+)$/],
        (result, [count, summary, url]) => {
          result.remoteMessages.vulnerabilities = {
            count: asNumber(count),
            summary,
            url
          };
        }
      )
    ];
    RemoteMessageSummary = class {
      constructor() {
        this.all = [];
      }
    };
  }
});
function parsePullErrorResult(stdOut, stdErr) {
  const pullError = parseStringResponse(new PullFailedSummary(), errorParsers, [stdOut, stdErr]);
  return pullError.message && pullError;
}
var FILE_UPDATE_REGEX;
var SUMMARY_REGEX;
var ACTION_REGEX;
var parsers3;
var errorParsers;
var parsePullDetail;
var parsePullResult;
var init_parse_pull = __esm2({
  "src/lib/parsers/parse-pull.ts"() {
    "use strict";
    init_PullSummary();
    init_utils();
    init_parse_remote_messages();
    FILE_UPDATE_REGEX = /^\s*(.+?)\s+\|\s+\d+\s*(\+*)(-*)/;
    SUMMARY_REGEX = /(\d+)\D+((\d+)\D+\(\+\))?(\D+(\d+)\D+\(-\))?/;
    ACTION_REGEX = /^(create|delete) mode \d+ (.+)/;
    parsers3 = [
      new LineParser(FILE_UPDATE_REGEX, (result, [file, insertions, deletions]) => {
        result.files.push(file);
        if (insertions) {
          result.insertions[file] = insertions.length;
        }
        if (deletions) {
          result.deletions[file] = deletions.length;
        }
      }),
      new LineParser(SUMMARY_REGEX, (result, [changes, , insertions, , deletions]) => {
        if (insertions !== void 0 || deletions !== void 0) {
          result.summary.changes = +changes || 0;
          result.summary.insertions = +insertions || 0;
          result.summary.deletions = +deletions || 0;
          return true;
        }
        return false;
      }),
      new LineParser(ACTION_REGEX, (result, [action, file]) => {
        append(result.files, file);
        append(action === "create" ? result.created : result.deleted, file);
      })
    ];
    errorParsers = [
      new LineParser(/^from\s(.+)$/i, (result, [remote]) => void (result.remote = remote)),
      new LineParser(/^fatal:\s(.+)$/, (result, [message]) => void (result.message = message)),
      new LineParser(
        /([a-z0-9]+)\.\.([a-z0-9]+)\s+(\S+)\s+->\s+(\S+)$/,
        (result, [hashLocal, hashRemote, branchLocal, branchRemote]) => {
          result.branch.local = branchLocal;
          result.hash.local = hashLocal;
          result.branch.remote = branchRemote;
          result.hash.remote = hashRemote;
        }
      )
    ];
    parsePullDetail = (stdOut, stdErr) => {
      return parseStringResponse(new PullSummary(), parsers3, [stdOut, stdErr]);
    };
    parsePullResult = (stdOut, stdErr) => {
      return Object.assign(
        new PullSummary(),
        parsePullDetail(stdOut, stdErr),
        parseRemoteMessages(stdOut, stdErr)
      );
    };
  }
});
var parsers4;
var parseMergeResult;
var parseMergeDetail;
var init_parse_merge = __esm2({
  "src/lib/parsers/parse-merge.ts"() {
    "use strict";
    init_MergeSummary();
    init_utils();
    init_parse_pull();
    parsers4 = [
      new LineParser(/^Auto-merging\s+(.+)$/, (summary, [autoMerge]) => {
        summary.merges.push(autoMerge);
      }),
      new LineParser(/^CONFLICT\s+\((.+)\): Merge conflict in (.+)$/, (summary, [reason, file]) => {
        summary.conflicts.push(new MergeSummaryConflict(reason, file));
      }),
      new LineParser(
        /^CONFLICT\s+\((.+\/delete)\): (.+) deleted in (.+) and/,
        (summary, [reason, file, deleteRef]) => {
          summary.conflicts.push(new MergeSummaryConflict(reason, file, { deleteRef }));
        }
      ),
      new LineParser(/^CONFLICT\s+\((.+)\):/, (summary, [reason]) => {
        summary.conflicts.push(new MergeSummaryConflict(reason, null));
      }),
      new LineParser(/^Automatic merge failed;\s+(.+)$/, (summary, [result]) => {
        summary.result = result;
      })
    ];
    parseMergeResult = (stdOut, stdErr) => {
      return Object.assign(parseMergeDetail(stdOut, stdErr), parsePullResult(stdOut, stdErr));
    };
    parseMergeDetail = (stdOut) => {
      return parseStringResponse(new MergeSummaryDetail(), parsers4, stdOut);
    };
  }
});
function mergeTask(customArgs) {
  if (!customArgs.length) {
    return configurationErrorTask("Git.merge requires at least one option");
  }
  return {
    commands: ["merge", ...customArgs],
    format: "utf-8",
    parser(stdOut, stdErr) {
      const merge = parseMergeResult(stdOut, stdErr);
      if (merge.failed) {
        throw new GitResponseError(merge);
      }
      return merge;
    }
  };
}
var init_merge = __esm2({
  "src/lib/tasks/merge.ts"() {
    "use strict";
    init_git_response_error();
    init_parse_merge();
    init_task();
  }
});
function pushResultPushedItem(local, remote, status) {
  const deleted = status.includes("deleted");
  const tag = status.includes("tag") || /^refs\/tags/.test(local);
  const alreadyUpdated = !status.includes("new");
  return {
    deleted,
    tag,
    branch: !tag,
    new: !alreadyUpdated,
    alreadyUpdated,
    local,
    remote
  };
}
var parsers5;
var parsePushResult;
var parsePushDetail;
var init_parse_push = __esm2({
  "src/lib/parsers/parse-push.ts"() {
    "use strict";
    init_utils();
    init_parse_remote_messages();
    parsers5 = [
      new LineParser(/^Pushing to (.+)$/, (result, [repo]) => {
        result.repo = repo;
      }),
      new LineParser(/^updating local tracking ref '(.+)'/, (result, [local]) => {
        result.ref = {
          ...result.ref || {},
          local
        };
      }),
      new LineParser(/^[=*-]\s+([^:]+):(\S+)\s+\[(.+)]$/, (result, [local, remote, type]) => {
        result.pushed.push(pushResultPushedItem(local, remote, type));
      }),
      new LineParser(
        /^Branch '([^']+)' set up to track remote branch '([^']+)' from '([^']+)'/,
        (result, [local, remote, remoteName]) => {
          result.branch = {
            ...result.branch || {},
            local,
            remote,
            remoteName
          };
        }
      ),
      new LineParser(
        /^([^:]+):(\S+)\s+([a-z0-9]+)\.\.([a-z0-9]+)$/,
        (result, [local, remote, from, to]) => {
          result.update = {
            head: {
              local,
              remote
            },
            hash: {
              from,
              to
            }
          };
        }
      )
    ];
    parsePushResult = (stdOut, stdErr) => {
      const pushDetail = parsePushDetail(stdOut, stdErr);
      const responseDetail = parseRemoteMessages(stdOut, stdErr);
      return {
        ...pushDetail,
        ...responseDetail
      };
    };
    parsePushDetail = (stdOut, stdErr) => {
      return parseStringResponse({ pushed: [] }, parsers5, [stdOut, stdErr]);
    };
  }
});
var push_exports = {};
__export2(push_exports, {
  pushTagsTask: () => pushTagsTask,
  pushTask: () => pushTask
});
function pushTagsTask(ref = {}, customArgs) {
  append(customArgs, "--tags");
  return pushTask(ref, customArgs);
}
function pushTask(ref = {}, customArgs) {
  const commands4 = ["push", ...customArgs];
  if (ref.branch) {
    commands4.splice(1, 0, ref.branch);
  }
  if (ref.remote) {
    commands4.splice(1, 0, ref.remote);
  }
  remove(commands4, "-v");
  append(commands4, "--verbose");
  append(commands4, "--porcelain");
  return {
    commands: commands4,
    format: "utf-8",
    parser: parsePushResult
  };
}
var init_push = __esm2({
  "src/lib/tasks/push.ts"() {
    "use strict";
    init_parse_push();
    init_utils();
  }
});
function show_default() {
  return {
    showBuffer() {
      const commands4 = ["show", ...getTrailingOptions(arguments, 1)];
      if (!commands4.includes("--binary")) {
        commands4.splice(1, 0, "--binary");
      }
      return this._runTask(
        straightThroughBufferTask(commands4),
        trailingFunctionArgument(arguments)
      );
    },
    show() {
      const commands4 = ["show", ...getTrailingOptions(arguments, 1)];
      return this._runTask(
        straightThroughStringTask(commands4),
        trailingFunctionArgument(arguments)
      );
    }
  };
}
var init_show = __esm2({
  "src/lib/tasks/show.ts"() {
    "use strict";
    init_utils();
    init_task();
  }
});
var fromPathRegex;
var FileStatusSummary;
var init_FileStatusSummary = __esm2({
  "src/lib/responses/FileStatusSummary.ts"() {
    "use strict";
    fromPathRegex = /^(.+)\0(.+)$/;
    FileStatusSummary = class {
      constructor(path4, index, working_dir) {
        this.path = path4;
        this.index = index;
        this.working_dir = working_dir;
        if (index === "R" || working_dir === "R") {
          const detail = fromPathRegex.exec(path4) || [null, path4, path4];
          this.from = detail[2] || "";
          this.path = detail[1] || "";
        }
      }
    };
  }
});
function renamedFile(line) {
  const [to, from] = line.split(NULL);
  return {
    from: from || to,
    to
  };
}
function parser3(indexX, indexY, handler) {
  return [`${indexX}${indexY}`, handler];
}
function conflicts(indexX, ...indexY) {
  return indexY.map((y) => parser3(indexX, y, (result, file) => append(result.conflicted, file)));
}
function splitLine(result, lineStr) {
  const trimmed2 = lineStr.trim();
  switch (" ") {
    case trimmed2.charAt(2):
      return data(trimmed2.charAt(0), trimmed2.charAt(1), trimmed2.substr(3));
    case trimmed2.charAt(1):
      return data(" ", trimmed2.charAt(0), trimmed2.substr(2));
    default:
      return;
  }
  function data(index, workingDir, path4) {
    const raw = `${index}${workingDir}`;
    const handler = parsers6.get(raw);
    if (handler) {
      handler(result, path4);
    }
    if (raw !== "##" && raw !== "!!") {
      result.files.push(new FileStatusSummary(path4, index, workingDir));
    }
  }
}
var StatusSummary;
var parsers6;
var parseStatusSummary;
var init_StatusSummary = __esm2({
  "src/lib/responses/StatusSummary.ts"() {
    "use strict";
    init_utils();
    init_FileStatusSummary();
    StatusSummary = class {
      constructor() {
        this.not_added = [];
        this.conflicted = [];
        this.created = [];
        this.deleted = [];
        this.ignored = void 0;
        this.modified = [];
        this.renamed = [];
        this.files = [];
        this.staged = [];
        this.ahead = 0;
        this.behind = 0;
        this.current = null;
        this.tracking = null;
        this.detached = false;
        this.isClean = () => {
          return !this.files.length;
        };
      }
    };
    parsers6 = new Map([
      parser3(
        " ",
        "A",
        (result, file) => append(result.created, file)
      ),
      parser3(
        " ",
        "D",
        (result, file) => append(result.deleted, file)
      ),
      parser3(
        " ",
        "M",
        (result, file) => append(result.modified, file)
      ),
      parser3(
        "A",
        " ",
        (result, file) => append(result.created, file) && append(result.staged, file)
      ),
      parser3(
        "A",
        "M",
        (result, file) => append(result.created, file) && append(result.staged, file) && append(result.modified, file)
      ),
      parser3(
        "D",
        " ",
        (result, file) => append(result.deleted, file) && append(result.staged, file)
      ),
      parser3(
        "M",
        " ",
        (result, file) => append(result.modified, file) && append(result.staged, file)
      ),
      parser3(
        "M",
        "M",
        (result, file) => append(result.modified, file) && append(result.staged, file)
      ),
      parser3("R", " ", (result, file) => {
        append(result.renamed, renamedFile(file));
      }),
      parser3("R", "M", (result, file) => {
        const renamed = renamedFile(file);
        append(result.renamed, renamed);
        append(result.modified, renamed.to);
      }),
      parser3("!", "!", (_result, _file) => {
        append(_result.ignored = _result.ignored || [], _file);
      }),
      parser3(
        "?",
        "?",
        (result, file) => append(result.not_added, file)
      ),
      ...conflicts(
        "A",
        "A",
        "U"
        /* UNMERGED */
      ),
      ...conflicts(
        "D",
        "D",
        "U"
        /* UNMERGED */
      ),
      ...conflicts(
        "U",
        "A",
        "D",
        "U"
        /* UNMERGED */
      ),
      [
        "##",
        (result, line) => {
          const aheadReg = /ahead (\d+)/;
          const behindReg = /behind (\d+)/;
          const currentReg = /^(.+?(?=(?:\.{3}|\s|$)))/;
          const trackingReg = /\.{3}(\S*)/;
          const onEmptyBranchReg = /\son\s(\S+?)(?=\.{3}|$)/;
          let regexResult = aheadReg.exec(line);
          result.ahead = regexResult && +regexResult[1] || 0;
          regexResult = behindReg.exec(line);
          result.behind = regexResult && +regexResult[1] || 0;
          regexResult = currentReg.exec(line);
          result.current = filterType(regexResult?.[1], filterString, null);
          regexResult = trackingReg.exec(line);
          result.tracking = filterType(regexResult?.[1], filterString, null);
          regexResult = onEmptyBranchReg.exec(line);
          if (regexResult) {
            result.current = filterType(regexResult?.[1], filterString, result.current);
          }
          result.detached = /\(no branch\)/.test(line);
        }
      ]
    ]);
    parseStatusSummary = function(text) {
      const lines = text.split(NULL);
      const status = new StatusSummary();
      for (let i = 0, l = lines.length; i < l; ) {
        let line = lines[i++].trim();
        if (!line) {
          continue;
        }
        if (line.charAt(0) === "R") {
          line += NULL + (lines[i++] || "");
        }
        splitLine(status, line);
      }
      return status;
    };
  }
});
function statusTask(customArgs) {
  const commands4 = [
    "status",
    "--porcelain",
    "-b",
    "-u",
    "--null",
    ...customArgs.filter((arg) => !ignoredOptions.includes(arg))
  ];
  return {
    format: "utf-8",
    commands: commands4,
    parser(text) {
      return parseStatusSummary(text);
    }
  };
}
var ignoredOptions;
var init_status = __esm2({
  "src/lib/tasks/status.ts"() {
    "use strict";
    init_StatusSummary();
    ignoredOptions = ["--null", "-z"];
  }
});
function versionResponse(major = 0, minor = 0, patch = 0, agent = "", installed = true) {
  return Object.defineProperty(
    {
      major,
      minor,
      patch,
      agent,
      installed
    },
    "toString",
    {
      value() {
        return `${this.major}.${this.minor}.${this.patch}`;
      },
      configurable: false,
      enumerable: false
    }
  );
}
function notInstalledResponse() {
  return versionResponse(0, 0, 0, "", false);
}
function version_default() {
  return {
    version() {
      return this._runTask({
        commands: ["--version"],
        format: "utf-8",
        parser: versionParser,
        onError(result, error, done, fail) {
          if (result.exitCode === -2) {
            return done(Buffer.from(NOT_INSTALLED));
          }
          fail(error);
        }
      });
    }
  };
}
function versionParser(stdOut) {
  if (stdOut === NOT_INSTALLED) {
    return notInstalledResponse();
  }
  return parseStringResponse(versionResponse(0, 0, 0, stdOut), parsers7, stdOut);
}
var NOT_INSTALLED;
var parsers7;
var init_version = __esm2({
  "src/lib/tasks/version.ts"() {
    "use strict";
    init_utils();
    NOT_INSTALLED = "installed=false";
    parsers7 = [
      new LineParser(
        /version (\d+)\.(\d+)\.(\d+)(?:\s*\((.+)\))?/,
        (result, [major, minor, patch, agent = ""]) => {
          Object.assign(
            result,
            versionResponse(asNumber(major), asNumber(minor), asNumber(patch), agent)
          );
        }
      ),
      new LineParser(
        /version (\d+)\.(\d+)\.(\D+)(.+)?$/,
        (result, [major, minor, patch, agent = ""]) => {
          Object.assign(result, versionResponse(asNumber(major), asNumber(minor), patch, agent));
        }
      )
    ];
  }
});
var simple_git_api_exports = {};
__export2(simple_git_api_exports, {
  SimpleGitApi: () => SimpleGitApi
});
var SimpleGitApi;
var init_simple_git_api = __esm2({
  "src/lib/simple-git-api.ts"() {
    "use strict";
    init_task_callback();
    init_change_working_directory();
    init_checkout();
    init_count_objects();
    init_commit();
    init_config();
    init_first_commit();
    init_grep();
    init_hash_object();
    init_init();
    init_log();
    init_merge();
    init_push();
    init_show();
    init_status();
    init_task();
    init_version();
    init_utils();
    SimpleGitApi = class {
      constructor(_executor) {
        this._executor = _executor;
      }
      _runTask(task, then) {
        const chain = this._executor.chain();
        const promise = chain.push(task);
        if (then) {
          taskCallback(task, promise, then);
        }
        return Object.create(this, {
          then: { value: promise.then.bind(promise) },
          catch: { value: promise.catch.bind(promise) },
          _executor: { value: chain }
        });
      }
      add(files) {
        return this._runTask(
          straightThroughStringTask(["add", ...asArray(files)]),
          trailingFunctionArgument(arguments)
        );
      }
      cwd(directory) {
        const next = trailingFunctionArgument(arguments);
        if (typeof directory === "string") {
          return this._runTask(changeWorkingDirectoryTask(directory, this._executor), next);
        }
        if (typeof directory?.path === "string") {
          return this._runTask(
            changeWorkingDirectoryTask(
              directory.path,
              directory.root && this._executor || void 0
            ),
            next
          );
        }
        return this._runTask(
          configurationErrorTask("Git.cwd: workingDirectory must be supplied as a string"),
          next
        );
      }
      hashObject(path4, write) {
        return this._runTask(
          hashObjectTask(path4, write === true),
          trailingFunctionArgument(arguments)
        );
      }
      init(bare) {
        return this._runTask(
          initTask(bare === true, this._executor.cwd, getTrailingOptions(arguments)),
          trailingFunctionArgument(arguments)
        );
      }
      merge() {
        return this._runTask(
          mergeTask(getTrailingOptions(arguments)),
          trailingFunctionArgument(arguments)
        );
      }
      mergeFromTo(remote, branch) {
        if (!(filterString(remote) && filterString(branch))) {
          return this._runTask(
            configurationErrorTask(
              `Git.mergeFromTo requires that the 'remote' and 'branch' arguments are supplied as strings`
            )
          );
        }
        return this._runTask(
          mergeTask([remote, branch, ...getTrailingOptions(arguments)]),
          trailingFunctionArgument(arguments, false)
        );
      }
      outputHandler(handler) {
        this._executor.outputHandler = handler;
        return this;
      }
      push() {
        const task = pushTask(
          {
            remote: filterType(arguments[0], filterString),
            branch: filterType(arguments[1], filterString)
          },
          getTrailingOptions(arguments)
        );
        return this._runTask(task, trailingFunctionArgument(arguments));
      }
      stash() {
        return this._runTask(
          straightThroughStringTask(["stash", ...getTrailingOptions(arguments)]),
          trailingFunctionArgument(arguments)
        );
      }
      status() {
        return this._runTask(
          statusTask(getTrailingOptions(arguments)),
          trailingFunctionArgument(arguments)
        );
      }
    };
    Object.assign(
      SimpleGitApi.prototype,
      checkout_default(),
      commit_default(),
      config_default(),
      count_objects_default(),
      first_commit_default(),
      grep_default(),
      log_default(),
      show_default(),
      version_default()
    );
  }
});
var scheduler_exports = {};
__export2(scheduler_exports, {
  Scheduler: () => Scheduler
});
var createScheduledTask;
var Scheduler;
var init_scheduler = __esm2({
  "src/lib/runners/scheduler.ts"() {
    "use strict";
    init_utils();
    init_git_logger();
    createScheduledTask = /* @__PURE__ */ (() => {
      let id = 0;
      return () => {
        id++;
        const { promise, done } = (0, import_promise_deferred.createDeferred)();
        return {
          promise,
          done,
          id
        };
      };
    })();
    Scheduler = class {
      constructor(concurrency = 2) {
        this.concurrency = concurrency;
        this.logger = createLogger("", "scheduler");
        this.pending = [];
        this.running = [];
        this.logger(`Constructed, concurrency=%s`, concurrency);
      }
      schedule() {
        if (!this.pending.length || this.running.length >= this.concurrency) {
          this.logger(
            `Schedule attempt ignored, pending=%s running=%s concurrency=%s`,
            this.pending.length,
            this.running.length,
            this.concurrency
          );
          return;
        }
        const task = append(this.running, this.pending.shift());
        this.logger(`Attempting id=%s`, task.id);
        task.done(() => {
          this.logger(`Completing id=`, task.id);
          remove(this.running, task);
          this.schedule();
        });
      }
      next() {
        const { promise, id } = append(this.pending, createScheduledTask());
        this.logger(`Scheduling id=%s`, id);
        this.schedule();
        return promise;
      }
    };
  }
});
var apply_patch_exports = {};
__export2(apply_patch_exports, {
  applyPatchTask: () => applyPatchTask
});
function applyPatchTask(patches, customArgs) {
  return straightThroughStringTask(["apply", ...customArgs, ...patches]);
}
var init_apply_patch = __esm2({
  "src/lib/tasks/apply-patch.ts"() {
    "use strict";
    init_task();
  }
});
function branchDeletionSuccess(branch, hash) {
  return {
    branch,
    hash,
    success: true
  };
}
function branchDeletionFailure(branch) {
  return {
    branch,
    hash: null,
    success: false
  };
}
var BranchDeletionBatch;
var init_BranchDeleteSummary = __esm2({
  "src/lib/responses/BranchDeleteSummary.ts"() {
    "use strict";
    BranchDeletionBatch = class {
      constructor() {
        this.all = [];
        this.branches = {};
        this.errors = [];
      }
      get success() {
        return !this.errors.length;
      }
    };
  }
});
function hasBranchDeletionError(data, processExitCode) {
  return processExitCode === 1 && deleteErrorRegex.test(data);
}
var deleteSuccessRegex;
var deleteErrorRegex;
var parsers8;
var parseBranchDeletions;
var init_parse_branch_delete = __esm2({
  "src/lib/parsers/parse-branch-delete.ts"() {
    "use strict";
    init_BranchDeleteSummary();
    init_utils();
    deleteSuccessRegex = /(\S+)\s+\(\S+\s([^)]+)\)/;
    deleteErrorRegex = /^error[^']+'([^']+)'/m;
    parsers8 = [
      new LineParser(deleteSuccessRegex, (result, [branch, hash]) => {
        const deletion = branchDeletionSuccess(branch, hash);
        result.all.push(deletion);
        result.branches[branch] = deletion;
      }),
      new LineParser(deleteErrorRegex, (result, [branch]) => {
        const deletion = branchDeletionFailure(branch);
        result.errors.push(deletion);
        result.all.push(deletion);
        result.branches[branch] = deletion;
      })
    ];
    parseBranchDeletions = (stdOut, stdErr) => {
      return parseStringResponse(new BranchDeletionBatch(), parsers8, [stdOut, stdErr]);
    };
  }
});
var BranchSummaryResult;
var init_BranchSummary = __esm2({
  "src/lib/responses/BranchSummary.ts"() {
    "use strict";
    BranchSummaryResult = class {
      constructor() {
        this.all = [];
        this.branches = {};
        this.current = "";
        this.detached = false;
      }
      push(status, detached, name, commit, label) {
        if (status === "*") {
          this.detached = detached;
          this.current = name;
        }
        this.all.push(name);
        this.branches[name] = {
          current: status === "*",
          linkedWorkTree: status === "+",
          name,
          commit,
          label
        };
      }
    };
  }
});
function branchStatus(input) {
  return input ? input.charAt(0) : "";
}
function parseBranchSummary(stdOut, currentOnly = false) {
  return parseStringResponse(
    new BranchSummaryResult(),
    currentOnly ? [currentBranchParser] : parsers9,
    stdOut
  );
}
var parsers9;
var currentBranchParser;
var init_parse_branch = __esm2({
  "src/lib/parsers/parse-branch.ts"() {
    "use strict";
    init_BranchSummary();
    init_utils();
    parsers9 = [
      new LineParser(
        /^([*+]\s)?\((?:HEAD )?detached (?:from|at) (\S+)\)\s+([a-z0-9]+)\s(.*)$/,
        (result, [current, name, commit, label]) => {
          result.push(branchStatus(current), true, name, commit, label);
        }
      ),
      new LineParser(
        /^([*+]\s)?(\S+)\s+([a-z0-9]+)\s?(.*)$/s,
        (result, [current, name, commit, label]) => {
          result.push(branchStatus(current), false, name, commit, label);
        }
      )
    ];
    currentBranchParser = new LineParser(/^(\S+)$/s, (result, [name]) => {
      result.push("*", false, name, "", "");
    });
  }
});
var branch_exports = {};
__export2(branch_exports, {
  branchLocalTask: () => branchLocalTask,
  branchTask: () => branchTask,
  containsDeleteBranchCommand: () => containsDeleteBranchCommand,
  deleteBranchTask: () => deleteBranchTask,
  deleteBranchesTask: () => deleteBranchesTask
});
function containsDeleteBranchCommand(commands4) {
  const deleteCommands = ["-d", "-D", "--delete"];
  return commands4.some((command) => deleteCommands.includes(command));
}
function branchTask(customArgs) {
  const isDelete = containsDeleteBranchCommand(customArgs);
  const isCurrentOnly = customArgs.includes("--show-current");
  const commands4 = ["branch", ...customArgs];
  if (commands4.length === 1) {
    commands4.push("-a");
  }
  if (!commands4.includes("-v")) {
    commands4.splice(1, 0, "-v");
  }
  return {
    format: "utf-8",
    commands: commands4,
    parser(stdOut, stdErr) {
      if (isDelete) {
        return parseBranchDeletions(stdOut, stdErr).all[0];
      }
      return parseBranchSummary(stdOut, isCurrentOnly);
    }
  };
}
function branchLocalTask() {
  return {
    format: "utf-8",
    commands: ["branch", "-v"],
    parser(stdOut) {
      return parseBranchSummary(stdOut);
    }
  };
}
function deleteBranchesTask(branches, forceDelete = false) {
  return {
    format: "utf-8",
    commands: ["branch", "-v", forceDelete ? "-D" : "-d", ...branches],
    parser(stdOut, stdErr) {
      return parseBranchDeletions(stdOut, stdErr);
    },
    onError({ exitCode, stdOut }, error, done, fail) {
      if (!hasBranchDeletionError(String(error), exitCode)) {
        return fail(error);
      }
      done(stdOut);
    }
  };
}
function deleteBranchTask(branch, forceDelete = false) {
  const task = {
    format: "utf-8",
    commands: ["branch", "-v", forceDelete ? "-D" : "-d", branch],
    parser(stdOut, stdErr) {
      return parseBranchDeletions(stdOut, stdErr).branches[branch];
    },
    onError({ exitCode, stdErr, stdOut }, error, _, fail) {
      if (!hasBranchDeletionError(String(error), exitCode)) {
        return fail(error);
      }
      throw new GitResponseError(
        task.parser(bufferToString(stdOut), bufferToString(stdErr)),
        String(error)
      );
    }
  };
  return task;
}
var init_branch = __esm2({
  "src/lib/tasks/branch.ts"() {
    "use strict";
    init_git_response_error();
    init_parse_branch_delete();
    init_parse_branch();
    init_utils();
  }
});
function toPath(input) {
  const path4 = input.trim().replace(/^["']|["']$/g, "");
  return path4 && (0, import_node_path.normalize)(path4);
}
var parseCheckIgnore;
var init_CheckIgnore = __esm2({
  "src/lib/responses/CheckIgnore.ts"() {
    "use strict";
    parseCheckIgnore = (text) => {
      return text.split(/\n/g).map(toPath).filter(Boolean);
    };
  }
});
var check_ignore_exports = {};
__export2(check_ignore_exports, {
  checkIgnoreTask: () => checkIgnoreTask
});
function checkIgnoreTask(paths) {
  return {
    commands: ["check-ignore", ...paths],
    format: "utf-8",
    parser: parseCheckIgnore
  };
}
var init_check_ignore = __esm2({
  "src/lib/tasks/check-ignore.ts"() {
    "use strict";
    init_CheckIgnore();
  }
});
var clone_exports = {};
__export2(clone_exports, {
  cloneMirrorTask: () => cloneMirrorTask,
  cloneTask: () => cloneTask
});
function disallowedCommand(command) {
  return /^--upload-pack(=|$)/.test(command);
}
function cloneTask(repo, directory, customArgs) {
  const commands4 = ["clone", ...customArgs];
  filterString(repo) && commands4.push(repo);
  filterString(directory) && commands4.push(directory);
  const banned = commands4.find(disallowedCommand);
  if (banned) {
    return configurationErrorTask(`git.fetch: potential exploit argument blocked.`);
  }
  return straightThroughStringTask(commands4);
}
function cloneMirrorTask(repo, directory, customArgs) {
  append(customArgs, "--mirror");
  return cloneTask(repo, directory, customArgs);
}
var init_clone = __esm2({
  "src/lib/tasks/clone.ts"() {
    "use strict";
    init_task();
    init_utils();
  }
});
function parseFetchResult(stdOut, stdErr) {
  const result = {
    raw: stdOut,
    remote: null,
    branches: [],
    tags: [],
    updated: [],
    deleted: []
  };
  return parseStringResponse(result, parsers10, [stdOut, stdErr]);
}
var parsers10;
var init_parse_fetch = __esm2({
  "src/lib/parsers/parse-fetch.ts"() {
    "use strict";
    init_utils();
    parsers10 = [
      new LineParser(/From (.+)$/, (result, [remote]) => {
        result.remote = remote;
      }),
      new LineParser(/\* \[new branch]\s+(\S+)\s*-> (.+)$/, (result, [name, tracking]) => {
        result.branches.push({
          name,
          tracking
        });
      }),
      new LineParser(/\* \[new tag]\s+(\S+)\s*-> (.+)$/, (result, [name, tracking]) => {
        result.tags.push({
          name,
          tracking
        });
      }),
      new LineParser(/- \[deleted]\s+\S+\s*-> (.+)$/, (result, [tracking]) => {
        result.deleted.push({
          tracking
        });
      }),
      new LineParser(
        /\s*([^.]+)\.\.(\S+)\s+(\S+)\s*-> (.+)$/,
        (result, [from, to, name, tracking]) => {
          result.updated.push({
            name,
            tracking,
            to,
            from
          });
        }
      )
    ];
  }
});
var fetch_exports = {};
__export2(fetch_exports, {
  fetchTask: () => fetchTask
});
function disallowedCommand2(command) {
  return /^--upload-pack(=|$)/.test(command);
}
function fetchTask(remote, branch, customArgs) {
  const commands4 = ["fetch", ...customArgs];
  if (remote && branch) {
    commands4.push(remote, branch);
  }
  const banned = commands4.find(disallowedCommand2);
  if (banned) {
    return configurationErrorTask(`git.fetch: potential exploit argument blocked.`);
  }
  return {
    commands: commands4,
    format: "utf-8",
    parser: parseFetchResult
  };
}
var init_fetch = __esm2({
  "src/lib/tasks/fetch.ts"() {
    "use strict";
    init_parse_fetch();
    init_task();
  }
});
function parseMoveResult(stdOut) {
  return parseStringResponse({ moves: [] }, parsers11, stdOut);
}
var parsers11;
var init_parse_move = __esm2({
  "src/lib/parsers/parse-move.ts"() {
    "use strict";
    init_utils();
    parsers11 = [
      new LineParser(/^Renaming (.+) to (.+)$/, (result, [from, to]) => {
        result.moves.push({ from, to });
      })
    ];
  }
});
var move_exports = {};
__export2(move_exports, {
  moveTask: () => moveTask
});
function moveTask(from, to) {
  return {
    commands: ["mv", "-v", ...asArray(from), to],
    format: "utf-8",
    parser: parseMoveResult
  };
}
var init_move = __esm2({
  "src/lib/tasks/move.ts"() {
    "use strict";
    init_parse_move();
    init_utils();
  }
});
var pull_exports = {};
__export2(pull_exports, {
  pullTask: () => pullTask
});
function pullTask(remote, branch, customArgs) {
  const commands4 = ["pull", ...customArgs];
  if (remote && branch) {
    commands4.splice(1, 0, remote, branch);
  }
  return {
    commands: commands4,
    format: "utf-8",
    parser(stdOut, stdErr) {
      return parsePullResult(stdOut, stdErr);
    },
    onError(result, _error, _done, fail) {
      const pullError = parsePullErrorResult(
        bufferToString(result.stdOut),
        bufferToString(result.stdErr)
      );
      if (pullError) {
        return fail(new GitResponseError(pullError));
      }
      fail(_error);
    }
  };
}
var init_pull = __esm2({
  "src/lib/tasks/pull.ts"() {
    "use strict";
    init_git_response_error();
    init_parse_pull();
    init_utils();
  }
});
function parseGetRemotes(text) {
  const remotes = {};
  forEach(text, ([name]) => remotes[name] = { name });
  return Object.values(remotes);
}
function parseGetRemotesVerbose(text) {
  const remotes = {};
  forEach(text, ([name, url, purpose]) => {
    if (!Object.hasOwn(remotes, name)) {
      remotes[name] = {
        name,
        refs: { fetch: "", push: "" }
      };
    }
    if (purpose && url) {
      remotes[name].refs[purpose.replace(/[^a-z]/g, "")] = url;
    }
  });
  return Object.values(remotes);
}
function forEach(text, handler) {
  forEachLineWithContent(text, (line) => handler(line.split(/\s+/)));
}
var init_GetRemoteSummary = __esm2({
  "src/lib/responses/GetRemoteSummary.ts"() {
    "use strict";
    init_utils();
  }
});
var remote_exports = {};
__export2(remote_exports, {
  addRemoteTask: () => addRemoteTask,
  getRemotesTask: () => getRemotesTask,
  listRemotesTask: () => listRemotesTask,
  remoteTask: () => remoteTask,
  removeRemoteTask: () => removeRemoteTask
});
function addRemoteTask(remoteName, remoteRepo, customArgs) {
  return straightThroughStringTask(["remote", "add", ...customArgs, remoteName, remoteRepo]);
}
function getRemotesTask(verbose) {
  const commands4 = ["remote"];
  if (verbose) {
    commands4.push("-v");
  }
  return {
    commands: commands4,
    format: "utf-8",
    parser: verbose ? parseGetRemotesVerbose : parseGetRemotes
  };
}
function listRemotesTask(customArgs) {
  const commands4 = [...customArgs];
  if (commands4[0] !== "ls-remote") {
    commands4.unshift("ls-remote");
  }
  return straightThroughStringTask(commands4);
}
function remoteTask(customArgs) {
  const commands4 = [...customArgs];
  if (commands4[0] !== "remote") {
    commands4.unshift("remote");
  }
  return straightThroughStringTask(commands4);
}
function removeRemoteTask(remoteName) {
  return straightThroughStringTask(["remote", "remove", remoteName]);
}
var init_remote = __esm2({
  "src/lib/tasks/remote.ts"() {
    "use strict";
    init_GetRemoteSummary();
    init_task();
  }
});
var stash_list_exports = {};
__export2(stash_list_exports, {
  stashListTask: () => stashListTask
});
function stashListTask(opt = {}, customArgs) {
  const options = parseLogOptions(opt);
  const commands4 = ["stash", "list", ...options.commands, ...customArgs];
  const parser4 = createListLogSummaryParser(
    options.splitter,
    options.fields,
    logFormatFromCommand(commands4)
  );
  return validateLogFormatConfig(commands4) || {
    commands: commands4,
    format: "utf-8",
    parser: parser4
  };
}
var init_stash_list = __esm2({
  "src/lib/tasks/stash-list.ts"() {
    "use strict";
    init_log_format();
    init_parse_list_log_summary();
    init_diff();
    init_log();
  }
});
var sub_module_exports = {};
__export2(sub_module_exports, {
  addSubModuleTask: () => addSubModuleTask,
  initSubModuleTask: () => initSubModuleTask,
  subModuleTask: () => subModuleTask,
  updateSubModuleTask: () => updateSubModuleTask
});
function addSubModuleTask(repo, path4) {
  return subModuleTask(["add", repo, path4]);
}
function initSubModuleTask(customArgs) {
  return subModuleTask(["init", ...customArgs]);
}
function subModuleTask(customArgs) {
  const commands4 = [...customArgs];
  if (commands4[0] !== "submodule") {
    commands4.unshift("submodule");
  }
  return straightThroughStringTask(commands4);
}
function updateSubModuleTask(customArgs) {
  return subModuleTask(["update", ...customArgs]);
}
var init_sub_module = __esm2({
  "src/lib/tasks/sub-module.ts"() {
    "use strict";
    init_task();
  }
});
function singleSorted(a, b) {
  const aIsNum = Number.isNaN(a);
  const bIsNum = Number.isNaN(b);
  if (aIsNum !== bIsNum) {
    return aIsNum ? 1 : -1;
  }
  return aIsNum ? sorted(a, b) : 0;
}
function sorted(a, b) {
  return a === b ? 0 : a > b ? 1 : -1;
}
function trimmed(input) {
  return input.trim();
}
function toNumber(input) {
  if (typeof input === "string") {
    return parseInt(input.replace(/^\D+/g, ""), 10) || 0;
  }
  return 0;
}
var TagList;
var parseTagList;
var init_TagList = __esm2({
  "src/lib/responses/TagList.ts"() {
    "use strict";
    TagList = class {
      constructor(all, latest) {
        this.all = all;
        this.latest = latest;
      }
    };
    parseTagList = function(data, customSort = false) {
      const tags = data.split("\n").map(trimmed).filter(Boolean);
      if (!customSort) {
        tags.sort(function(tagA, tagB) {
          const partsA = tagA.split(".");
          const partsB = tagB.split(".");
          if (partsA.length === 1 || partsB.length === 1) {
            return singleSorted(toNumber(partsA[0]), toNumber(partsB[0]));
          }
          for (let i = 0, l = Math.max(partsA.length, partsB.length); i < l; i++) {
            const diff = sorted(toNumber(partsA[i]), toNumber(partsB[i]));
            if (diff) {
              return diff;
            }
          }
          return 0;
        });
      }
      const latest = customSort ? tags[0] : [...tags].reverse().find((tag) => tag.indexOf(".") >= 0);
      return new TagList(tags, latest);
    };
  }
});
var tag_exports = {};
__export2(tag_exports, {
  addAnnotatedTagTask: () => addAnnotatedTagTask,
  addTagTask: () => addTagTask,
  tagListTask: () => tagListTask
});
function tagListTask(customArgs = []) {
  const hasCustomSort = customArgs.some((option) => /^--sort=/.test(option));
  return {
    format: "utf-8",
    commands: ["tag", "-l", ...customArgs],
    parser(text) {
      return parseTagList(text, hasCustomSort);
    }
  };
}
function addTagTask(name) {
  return {
    format: "utf-8",
    commands: ["tag", name],
    parser() {
      return { name };
    }
  };
}
function addAnnotatedTagTask(name, tagMessage) {
  return {
    format: "utf-8",
    commands: ["tag", "-a", "-m", tagMessage, name],
    parser() {
      return { name };
    }
  };
}
var init_tag = __esm2({
  "src/lib/tasks/tag.ts"() {
    "use strict";
    init_TagList();
  }
});
var require_git = __commonJS2({
  "src/git.js"(exports2, module2) {
    "use strict";
    var { GitExecutor: GitExecutor2 } = (init_git_executor(), __toCommonJS2(git_executor_exports));
    var { SimpleGitApi: SimpleGitApi2 } = (init_simple_git_api(), __toCommonJS2(simple_git_api_exports));
    var { Scheduler: Scheduler2 } = (init_scheduler(), __toCommonJS2(scheduler_exports));
    var { configurationErrorTask: configurationErrorTask2 } = (init_task(), __toCommonJS2(task_exports));
    var {
      asArray: asArray2,
      filterArray: filterArray2,
      filterPrimitives: filterPrimitives2,
      filterString: filterString2,
      filterStringOrStringArray: filterStringOrStringArray2,
      filterType: filterType2,
      getTrailingOptions: getTrailingOptions2,
      trailingFunctionArgument: trailingFunctionArgument2,
      trailingOptionsArgument: trailingOptionsArgument2
    } = (init_utils(), __toCommonJS2(utils_exports));
    var { applyPatchTask: applyPatchTask2 } = (init_apply_patch(), __toCommonJS2(apply_patch_exports));
    var {
      branchTask: branchTask2,
      branchLocalTask: branchLocalTask2,
      deleteBranchesTask: deleteBranchesTask2,
      deleteBranchTask: deleteBranchTask2
    } = (init_branch(), __toCommonJS2(branch_exports));
    var { checkIgnoreTask: checkIgnoreTask2 } = (init_check_ignore(), __toCommonJS2(check_ignore_exports));
    var { checkIsRepoTask: checkIsRepoTask2 } = (init_check_is_repo(), __toCommonJS2(check_is_repo_exports));
    var { cloneTask: cloneTask2, cloneMirrorTask: cloneMirrorTask2 } = (init_clone(), __toCommonJS2(clone_exports));
    var { cleanWithOptionsTask: cleanWithOptionsTask2, isCleanOptionsArray: isCleanOptionsArray2 } = (init_clean(), __toCommonJS2(clean_exports));
    var { diffSummaryTask: diffSummaryTask2 } = (init_diff(), __toCommonJS2(diff_exports));
    var { fetchTask: fetchTask2 } = (init_fetch(), __toCommonJS2(fetch_exports));
    var { moveTask: moveTask2 } = (init_move(), __toCommonJS2(move_exports));
    var { pullTask: pullTask2 } = (init_pull(), __toCommonJS2(pull_exports));
    var { pushTagsTask: pushTagsTask2 } = (init_push(), __toCommonJS2(push_exports));
    var {
      addRemoteTask: addRemoteTask2,
      getRemotesTask: getRemotesTask2,
      listRemotesTask: listRemotesTask2,
      remoteTask: remoteTask2,
      removeRemoteTask: removeRemoteTask2
    } = (init_remote(), __toCommonJS2(remote_exports));
    var { getResetMode: getResetMode2, resetTask: resetTask2 } = (init_reset(), __toCommonJS2(reset_exports));
    var { stashListTask: stashListTask2 } = (init_stash_list(), __toCommonJS2(stash_list_exports));
    var {
      addSubModuleTask: addSubModuleTask2,
      initSubModuleTask: initSubModuleTask2,
      subModuleTask: subModuleTask2,
      updateSubModuleTask: updateSubModuleTask2
    } = (init_sub_module(), __toCommonJS2(sub_module_exports));
    var { addAnnotatedTagTask: addAnnotatedTagTask2, addTagTask: addTagTask2, tagListTask: tagListTask2 } = (init_tag(), __toCommonJS2(tag_exports));
    var { straightThroughBufferTask: straightThroughBufferTask2, straightThroughStringTask: straightThroughStringTask2 } = (init_task(), __toCommonJS2(task_exports));
    function Git2(options, plugins) {
      this._plugins = plugins;
      this._executor = new GitExecutor2(
        options.baseDir,
        new Scheduler2(options.maxConcurrentProcesses),
        plugins
      );
      this._trimmed = options.trimmed;
    }
    (Git2.prototype = Object.create(SimpleGitApi2.prototype)).constructor = Git2;
    Git2.prototype.customBinary = function(command) {
      this._plugins.reconfigure("binary", command);
      return this;
    };
    Git2.prototype.env = function(name, value) {
      if (arguments.length === 1 && typeof name === "object") {
        this._executor.env = name;
      } else {
        (this._executor.env = this._executor.env || {})[name] = value;
      }
      return this;
    };
    Git2.prototype.stashList = function(options) {
      return this._runTask(
        stashListTask2(
          trailingOptionsArgument2(arguments) || {},
          filterArray2(options) && options || []
        ),
        trailingFunctionArgument2(arguments)
      );
    };
    function createCloneTask(api, task, repoPath, localPath) {
      if (typeof repoPath !== "string") {
        return configurationErrorTask2(`git.${api}() requires a string 'repoPath'`);
      }
      return task(repoPath, filterType2(localPath, filterString2), getTrailingOptions2(arguments));
    }
    Git2.prototype.clone = function() {
      return this._runTask(
        createCloneTask("clone", cloneTask2, ...arguments),
        trailingFunctionArgument2(arguments)
      );
    };
    Git2.prototype.mirror = function() {
      return this._runTask(
        createCloneTask("mirror", cloneMirrorTask2, ...arguments),
        trailingFunctionArgument2(arguments)
      );
    };
    Git2.prototype.mv = function(from, to) {
      return this._runTask(moveTask2(from, to), trailingFunctionArgument2(arguments));
    };
    Git2.prototype.checkoutLatestTag = function(then) {
      var git = this;
      return this.pull(function() {
        git.tags(function(err, tags) {
          git.checkout(tags.latest, then);
        });
      });
    };
    Git2.prototype.pull = function(remote, branch, options, then) {
      return this._runTask(
        pullTask2(
          filterType2(remote, filterString2),
          filterType2(branch, filterString2),
          getTrailingOptions2(arguments)
        ),
        trailingFunctionArgument2(arguments)
      );
    };
    Git2.prototype.fetch = function(remote, branch) {
      return this._runTask(
        fetchTask2(
          filterType2(remote, filterString2),
          filterType2(branch, filterString2),
          getTrailingOptions2(arguments)
        ),
        trailingFunctionArgument2(arguments)
      );
    };
    Git2.prototype.silent = function(silence) {
      console.warn(
        "simple-git deprecation notice: git.silent: logging should be configured using the `debug` library / `DEBUG` environment variable, this will be an error in version 3"
      );
      return this;
    };
    Git2.prototype.tags = function(options, then) {
      return this._runTask(
        tagListTask2(getTrailingOptions2(arguments)),
        trailingFunctionArgument2(arguments)
      );
    };
    Git2.prototype.rebase = function() {
      return this._runTask(
        straightThroughStringTask2(["rebase", ...getTrailingOptions2(arguments)]),
        trailingFunctionArgument2(arguments)
      );
    };
    Git2.prototype.reset = function(mode) {
      return this._runTask(
        resetTask2(getResetMode2(mode), getTrailingOptions2(arguments)),
        trailingFunctionArgument2(arguments)
      );
    };
    Git2.prototype.revert = function(commit) {
      const next = trailingFunctionArgument2(arguments);
      if (typeof commit !== "string") {
        return this._runTask(configurationErrorTask2("Commit must be a string"), next);
      }
      return this._runTask(
        straightThroughStringTask2(["revert", ...getTrailingOptions2(arguments, 0, true), commit]),
        next
      );
    };
    Git2.prototype.addTag = function(name) {
      const task = typeof name === "string" ? addTagTask2(name) : configurationErrorTask2("Git.addTag requires a tag name");
      return this._runTask(task, trailingFunctionArgument2(arguments));
    };
    Git2.prototype.addAnnotatedTag = function(tagName, tagMessage) {
      return this._runTask(
        addAnnotatedTagTask2(tagName, tagMessage),
        trailingFunctionArgument2(arguments)
      );
    };
    Git2.prototype.deleteLocalBranch = function(branchName, forceDelete, then) {
      return this._runTask(
        deleteBranchTask2(branchName, typeof forceDelete === "boolean" ? forceDelete : false),
        trailingFunctionArgument2(arguments)
      );
    };
    Git2.prototype.deleteLocalBranches = function(branchNames, forceDelete, then) {
      return this._runTask(
        deleteBranchesTask2(branchNames, typeof forceDelete === "boolean" ? forceDelete : false),
        trailingFunctionArgument2(arguments)
      );
    };
    Git2.prototype.branch = function(options, then) {
      return this._runTask(
        branchTask2(getTrailingOptions2(arguments)),
        trailingFunctionArgument2(arguments)
      );
    };
    Git2.prototype.branchLocal = function(then) {
      return this._runTask(branchLocalTask2(), trailingFunctionArgument2(arguments));
    };
    Git2.prototype.raw = function(commands4) {
      const createRestCommands = !Array.isArray(commands4);
      const command = [].slice.call(createRestCommands ? arguments : commands4, 0);
      for (let i = 0; i < command.length && createRestCommands; i++) {
        if (!filterPrimitives2(command[i])) {
          command.splice(i, command.length - i);
          break;
        }
      }
      command.push(...getTrailingOptions2(arguments, 0, true));
      var next = trailingFunctionArgument2(arguments);
      if (!command.length) {
        return this._runTask(
          configurationErrorTask2("Raw: must supply one or more command to execute"),
          next
        );
      }
      return this._runTask(straightThroughStringTask2(command, this._trimmed), next);
    };
    Git2.prototype.submoduleAdd = function(repo, path4, then) {
      return this._runTask(addSubModuleTask2(repo, path4), trailingFunctionArgument2(arguments));
    };
    Git2.prototype.submoduleUpdate = function(args, then) {
      return this._runTask(
        updateSubModuleTask2(getTrailingOptions2(arguments, true)),
        trailingFunctionArgument2(arguments)
      );
    };
    Git2.prototype.submoduleInit = function(args, then) {
      return this._runTask(
        initSubModuleTask2(getTrailingOptions2(arguments, true)),
        trailingFunctionArgument2(arguments)
      );
    };
    Git2.prototype.subModule = function(options, then) {
      return this._runTask(
        subModuleTask2(getTrailingOptions2(arguments)),
        trailingFunctionArgument2(arguments)
      );
    };
    Git2.prototype.listRemote = function() {
      return this._runTask(
        listRemotesTask2(getTrailingOptions2(arguments)),
        trailingFunctionArgument2(arguments)
      );
    };
    Git2.prototype.addRemote = function(remoteName, remoteRepo, then) {
      return this._runTask(
        addRemoteTask2(remoteName, remoteRepo, getTrailingOptions2(arguments)),
        trailingFunctionArgument2(arguments)
      );
    };
    Git2.prototype.removeRemote = function(remoteName, then) {
      return this._runTask(removeRemoteTask2(remoteName), trailingFunctionArgument2(arguments));
    };
    Git2.prototype.getRemotes = function(verbose, then) {
      return this._runTask(getRemotesTask2(verbose === true), trailingFunctionArgument2(arguments));
    };
    Git2.prototype.remote = function(options, then) {
      return this._runTask(
        remoteTask2(getTrailingOptions2(arguments)),
        trailingFunctionArgument2(arguments)
      );
    };
    Git2.prototype.tag = function(options, then) {
      const command = getTrailingOptions2(arguments);
      if (command[0] !== "tag") {
        command.unshift("tag");
      }
      return this._runTask(straightThroughStringTask2(command), trailingFunctionArgument2(arguments));
    };
    Git2.prototype.updateServerInfo = function(then) {
      return this._runTask(
        straightThroughStringTask2(["update-server-info"]),
        trailingFunctionArgument2(arguments)
      );
    };
    Git2.prototype.pushTags = function(remote, then) {
      const task = pushTagsTask2(
        { remote: filterType2(remote, filterString2) },
        getTrailingOptions2(arguments)
      );
      return this._runTask(task, trailingFunctionArgument2(arguments));
    };
    Git2.prototype.rm = function(files) {
      return this._runTask(
        straightThroughStringTask2(["rm", "-f", ...asArray2(files)]),
        trailingFunctionArgument2(arguments)
      );
    };
    Git2.prototype.rmKeepLocal = function(files) {
      return this._runTask(
        straightThroughStringTask2(["rm", "--cached", ...asArray2(files)]),
        trailingFunctionArgument2(arguments)
      );
    };
    Git2.prototype.catFile = function(options, then) {
      return this._catFile("utf-8", arguments);
    };
    Git2.prototype.binaryCatFile = function() {
      return this._catFile("buffer", arguments);
    };
    Git2.prototype._catFile = function(format, args) {
      var handler = trailingFunctionArgument2(args);
      var command = ["cat-file"];
      var options = args[0];
      if (typeof options === "string") {
        return this._runTask(
          configurationErrorTask2("Git.catFile: options must be supplied as an array of strings"),
          handler
        );
      }
      if (Array.isArray(options)) {
        command.push.apply(command, options);
      }
      const task = format === "buffer" ? straightThroughBufferTask2(command) : straightThroughStringTask2(command);
      return this._runTask(task, handler);
    };
    Git2.prototype.diff = function(options, then) {
      const task = filterString2(options) ? configurationErrorTask2(
        "git.diff: supplying options as a single string is no longer supported, switch to an array of strings"
      ) : straightThroughStringTask2(["diff", ...getTrailingOptions2(arguments)]);
      return this._runTask(task, trailingFunctionArgument2(arguments));
    };
    Git2.prototype.diffSummary = function() {
      return this._runTask(
        diffSummaryTask2(getTrailingOptions2(arguments, 1)),
        trailingFunctionArgument2(arguments)
      );
    };
    Git2.prototype.applyPatch = function(patches) {
      const task = !filterStringOrStringArray2(patches) ? configurationErrorTask2(
        `git.applyPatch requires one or more string patches as the first argument`
      ) : applyPatchTask2(asArray2(patches), getTrailingOptions2([].slice.call(arguments, 1)));
      return this._runTask(task, trailingFunctionArgument2(arguments));
    };
    Git2.prototype.revparse = function() {
      const commands4 = ["rev-parse", ...getTrailingOptions2(arguments, true)];
      return this._runTask(
        straightThroughStringTask2(commands4, true),
        trailingFunctionArgument2(arguments)
      );
    };
    Git2.prototype.clean = function(mode, options, then) {
      const usingCleanOptionsArray = isCleanOptionsArray2(mode);
      const cleanMode = usingCleanOptionsArray && mode.join("") || filterType2(mode, filterString2) || "";
      const customArgs = getTrailingOptions2([].slice.call(arguments, usingCleanOptionsArray ? 1 : 0));
      return this._runTask(
        cleanWithOptionsTask2(cleanMode, customArgs),
        trailingFunctionArgument2(arguments)
      );
    };
    Git2.prototype.exec = function(then) {
      const task = {
        commands: [],
        format: "utf-8",
        parser() {
          if (typeof then === "function") {
            then();
          }
        }
      };
      return this._runTask(task);
    };
    Git2.prototype.clearQueue = function() {
      return this;
    };
    Git2.prototype.checkIgnore = function(pathnames, then) {
      return this._runTask(
        checkIgnoreTask2(asArray2(filterType2(pathnames, filterStringOrStringArray2, []))),
        trailingFunctionArgument2(arguments)
      );
    };
    Git2.prototype.checkIsRepo = function(checkType, then) {
      return this._runTask(
        checkIsRepoTask2(filterType2(checkType, filterString2)),
        trailingFunctionArgument2(arguments)
      );
    };
    module2.exports = Git2;
  }
});
init_pathspec();
init_git_error();
var GitConstructError = class extends GitError {
  constructor(config, message) {
    super(void 0, message);
    this.config = config;
  }
};
init_git_error();
init_git_error();
var GitPluginError = class extends GitError {
  constructor(task, plugin, message) {
    super(task, message);
    this.task = task;
    this.plugin = plugin;
    Object.setPrototypeOf(this, new.target.prototype);
  }
};
init_git_response_error();
init_task_configuration_error();
init_check_is_repo();
init_clean();
init_config();
init_diff_name_status();
init_grep();
init_reset();
function abortPlugin(signal) {
  if (!signal) {
    return;
  }
  const onSpawnAfter = {
    type: "spawn.after",
    action(_data, context) {
      function kill() {
        context.kill(new GitPluginError(void 0, "abort", "Abort signal received"));
      }
      signal.addEventListener("abort", kill);
      context.spawned.on("close", () => signal.removeEventListener("abort", kill));
    }
  };
  const onSpawnBefore = {
    type: "spawn.before",
    action(_data, context) {
      if (signal.aborted) {
        context.kill(new GitPluginError(void 0, "abort", "Abort already signaled"));
      }
    }
  };
  return [onSpawnBefore, onSpawnAfter];
}
function isConfigSwitch(arg) {
  return typeof arg === "string" && arg.trim().toLowerCase() === "-c";
}
function preventProtocolOverride(arg, next) {
  if (!isConfigSwitch(arg)) {
    return;
  }
  if (!/^\s*protocol(.[a-z]+)?.allow/.test(next)) {
    return;
  }
  throw new GitPluginError(
    void 0,
    "unsafe",
    "Configuring protocol.allow is not permitted without enabling allowUnsafeExtProtocol"
  );
}
function preventUploadPack(arg, method) {
  if (/^\s*--(upload|receive)-pack/.test(arg)) {
    throw new GitPluginError(
      void 0,
      "unsafe",
      `Use of --upload-pack or --receive-pack is not permitted without enabling allowUnsafePack`
    );
  }
  if (method === "clone" && /^\s*-u\b/.test(arg)) {
    throw new GitPluginError(
      void 0,
      "unsafe",
      `Use of clone with option -u is not permitted without enabling allowUnsafePack`
    );
  }
  if (method === "push" && /^\s*--exec\b/.test(arg)) {
    throw new GitPluginError(
      void 0,
      "unsafe",
      `Use of push with option --exec is not permitted without enabling allowUnsafePack`
    );
  }
}
function blockUnsafeOperationsPlugin({
  allowUnsafeProtocolOverride = false,
  allowUnsafePack = false
} = {}) {
  return {
    type: "spawn.args",
    action(args, context) {
      args.forEach((current, index) => {
        const next = index < args.length ? args[index + 1] : "";
        allowUnsafeProtocolOverride || preventProtocolOverride(current, next);
        allowUnsafePack || preventUploadPack(current, context.method);
      });
      return args;
    }
  };
}
init_utils();
function commandConfigPrefixingPlugin(configuration) {
  const prefix = prefixedArray(configuration, "-c");
  return {
    type: "spawn.args",
    action(data) {
      return [...prefix, ...data];
    }
  };
}
init_utils();
var never = (0, import_promise_deferred2.deferred)().promise;
function completionDetectionPlugin({
  onClose = true,
  onExit = 50
} = {}) {
  function createEvents() {
    let exitCode = -1;
    const events = {
      close: (0, import_promise_deferred2.deferred)(),
      closeTimeout: (0, import_promise_deferred2.deferred)(),
      exit: (0, import_promise_deferred2.deferred)(),
      exitTimeout: (0, import_promise_deferred2.deferred)()
    };
    const result = Promise.race([
      onClose === false ? never : events.closeTimeout.promise,
      onExit === false ? never : events.exitTimeout.promise
    ]);
    configureTimeout(onClose, events.close, events.closeTimeout);
    configureTimeout(onExit, events.exit, events.exitTimeout);
    return {
      close(code) {
        exitCode = code;
        events.close.done();
      },
      exit(code) {
        exitCode = code;
        events.exit.done();
      },
      get exitCode() {
        return exitCode;
      },
      result
    };
  }
  function configureTimeout(flag, event, timeout) {
    if (flag === false) {
      return;
    }
    (flag === true ? event.promise : event.promise.then(() => delay(flag))).then(timeout.done);
  }
  return {
    type: "spawn.after",
    async action(_data, { spawned, close }) {
      const events = createEvents();
      let deferClose = true;
      let quickClose = () => void (deferClose = false);
      spawned.stdout?.on("data", quickClose);
      spawned.stderr?.on("data", quickClose);
      spawned.on("error", quickClose);
      spawned.on("close", (code) => events.close(code));
      spawned.on("exit", (code) => events.exit(code));
      try {
        await events.result;
        if (deferClose) {
          await delay(50);
        }
        close(events.exitCode);
      } catch (err) {
        close(events.exitCode, err);
      }
    }
  };
}
init_utils();
var WRONG_NUMBER_ERR = `Invalid value supplied for custom binary, requires a single string or an array containing either one or two strings`;
var WRONG_CHARS_ERR = `Invalid value supplied for custom binary, restricted characters must be removed or supply the unsafe.allowUnsafeCustomBinary option`;
function isBadArgument(arg) {
  return !arg || !/^([a-z]:)?([a-z0-9/.\\_-]+)$/i.test(arg);
}
function toBinaryConfig(input, allowUnsafe) {
  if (input.length < 1 || input.length > 2) {
    throw new GitPluginError(void 0, "binary", WRONG_NUMBER_ERR);
  }
  const isBad = input.some(isBadArgument);
  if (isBad) {
    if (allowUnsafe) {
      console.warn(WRONG_CHARS_ERR);
    } else {
      throw new GitPluginError(void 0, "binary", WRONG_CHARS_ERR);
    }
  }
  const [binary, prefix] = input;
  return {
    binary,
    prefix
  };
}
function customBinaryPlugin(plugins, input = ["git"], allowUnsafe = false) {
  let config = toBinaryConfig(asArray(input), allowUnsafe);
  plugins.on("binary", (input2) => {
    config = toBinaryConfig(asArray(input2), allowUnsafe);
  });
  plugins.append("spawn.binary", () => {
    return config.binary;
  });
  plugins.append("spawn.args", (data) => {
    return config.prefix ? [config.prefix, ...data] : data;
  });
}
init_git_error();
function isTaskError(result) {
  return !!(result.exitCode && result.stdErr.length);
}
function getErrorMessage(result) {
  return Buffer.concat([...result.stdOut, ...result.stdErr]);
}
function errorDetectionHandler(overwrite = false, isError = isTaskError, errorMessage = getErrorMessage) {
  return (error, result) => {
    if (!overwrite && error || !isError(result)) {
      return error;
    }
    return errorMessage(result);
  };
}
function errorDetectionPlugin(config) {
  return {
    type: "task.error",
    action(data, context) {
      const error = config(data.error, {
        stdErr: context.stdErr,
        stdOut: context.stdOut,
        exitCode: context.exitCode
      });
      if (Buffer.isBuffer(error)) {
        return { error: new GitError(void 0, error.toString("utf-8")) };
      }
      return {
        error
      };
    }
  };
}
init_utils();
var PluginStore = class {
  constructor() {
    this.plugins = /* @__PURE__ */ new Set();
    this.events = new import_node_events.EventEmitter();
  }
  on(type, listener) {
    this.events.on(type, listener);
  }
  reconfigure(type, data) {
    this.events.emit(type, data);
  }
  append(type, action) {
    const plugin = append(this.plugins, { type, action });
    return () => this.plugins.delete(plugin);
  }
  add(plugin) {
    const plugins = [];
    asArray(plugin).forEach((plugin2) => plugin2 && this.plugins.add(append(plugins, plugin2)));
    return () => {
      plugins.forEach((plugin2) => this.plugins.delete(plugin2));
    };
  }
  exec(type, data, context) {
    let output = data;
    const contextual = Object.freeze(Object.create(context));
    for (const plugin of this.plugins) {
      if (plugin.type === type) {
        output = plugin.action(output, contextual);
      }
    }
    return output;
  }
};
init_utils();
function progressMonitorPlugin(progress) {
  const progressCommand = "--progress";
  const progressMethods = ["checkout", "clone", "fetch", "pull", "push"];
  const onProgress = {
    type: "spawn.after",
    action(_data, context) {
      if (!context.commands.includes(progressCommand)) {
        return;
      }
      context.spawned.stderr?.on("data", (chunk) => {
        const message = /^([\s\S]+?):\s*(\d+)% \((\d+)\/(\d+)\)/.exec(chunk.toString("utf8"));
        if (!message) {
          return;
        }
        progress({
          method: context.method,
          stage: progressEventStage(message[1]),
          progress: asNumber(message[2]),
          processed: asNumber(message[3]),
          total: asNumber(message[4])
        });
      });
    }
  };
  const onArgs = {
    type: "spawn.args",
    action(args, context) {
      if (!progressMethods.includes(context.method)) {
        return args;
      }
      return including(args, progressCommand);
    }
  };
  return [onArgs, onProgress];
}
function progressEventStage(input) {
  return String(input.toLowerCase().split(" ", 1)) || "unknown";
}
init_utils();
function spawnOptionsPlugin(spawnOptions) {
  const options = pick(spawnOptions, ["uid", "gid"]);
  return {
    type: "spawn.options",
    action(data) {
      return { ...options, ...data };
    }
  };
}
function timeoutPlugin({
  block,
  stdErr = true,
  stdOut = true
}) {
  if (block > 0) {
    return {
      type: "spawn.after",
      action(_data, context) {
        let timeout;
        function wait() {
          timeout && clearTimeout(timeout);
          timeout = setTimeout(kill, block);
        }
        function stop() {
          context.spawned.stdout?.off("data", wait);
          context.spawned.stderr?.off("data", wait);
          context.spawned.off("exit", stop);
          context.spawned.off("close", stop);
          timeout && clearTimeout(timeout);
        }
        function kill() {
          stop();
          context.kill(new GitPluginError(void 0, "timeout", `block timeout reached`));
        }
        stdOut && context.spawned.stdout?.on("data", wait);
        stdErr && context.spawned.stderr?.on("data", wait);
        context.spawned.on("exit", stop);
        context.spawned.on("close", stop);
        wait();
      }
    };
  }
}
init_pathspec();
function suffixPathsPlugin() {
  return {
    type: "spawn.args",
    action(data) {
      const prefix = [];
      let suffix;
      function append2(args) {
        (suffix = suffix || []).push(...args);
      }
      for (let i = 0; i < data.length; i++) {
        const param = data[i];
        if (isPathSpec(param)) {
          append2(toPaths(param));
          continue;
        }
        if (param === "--") {
          append2(
            data.slice(i + 1).flatMap((item) => isPathSpec(item) && toPaths(item) || item)
          );
          break;
        }
        prefix.push(param);
      }
      return !suffix ? prefix : [...prefix, "--", ...suffix.map(String)];
    }
  };
}
init_utils();
var Git = require_git();
function gitInstanceFactory(baseDir, options) {
  const plugins = new PluginStore();
  const config = createInstanceConfig(
    baseDir && (typeof baseDir === "string" ? { baseDir } : baseDir) || {},
    options
  );
  if (!folderExists(config.baseDir)) {
    throw new GitConstructError(
      config,
      `Cannot use simple-git on a directory that does not exist`
    );
  }
  if (Array.isArray(config.config)) {
    plugins.add(commandConfigPrefixingPlugin(config.config));
  }
  plugins.add(blockUnsafeOperationsPlugin(config.unsafe));
  plugins.add(suffixPathsPlugin());
  plugins.add(completionDetectionPlugin(config.completion));
  config.abort && plugins.add(abortPlugin(config.abort));
  config.progress && plugins.add(progressMonitorPlugin(config.progress));
  config.timeout && plugins.add(timeoutPlugin(config.timeout));
  config.spawnOptions && plugins.add(spawnOptionsPlugin(config.spawnOptions));
  plugins.add(errorDetectionPlugin(errorDetectionHandler(true)));
  config.errors && plugins.add(errorDetectionPlugin(config.errors));
  customBinaryPlugin(plugins, config.binary, config.unsafe?.allowUnsafeCustomBinary);
  return new Git(config, plugins);
}
init_git_response_error();
var esm_default = gitInstanceFactory;

// src/userIdentity.ts
var ESC = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
async function getUserEmails(repoRoot) {
  const cfg = vscode2.workspace.getConfiguration("commitDiary");
  const emailsFromSettings = (cfg.get("user.emails") ?? []).map((s) => s.trim()).filter(Boolean);
  if (emailsFromSettings.length > 0) return dedupe(emailsFromSettings);
  const git = esm_default(repoRoot);
  const local = await getGitConfig(git, "user.email");
  if (local) return [local];
  const global = await getGitConfig(git, "user.email", true);
  return global ? [global] : [];
}
async function getUserName(repoRoot) {
  const git = esm_default(repoRoot);
  const local = await getGitConfig(git, "user.name");
  return local || await getGitConfig(git, "user.name", true);
}
async function getGitConfig(git, key, isGlobal = false) {
  const args = isGlobal ? ["config", "--global", "--get", key] : ["config", "--get", key];
  return await tryRaw(git, args);
}
async function discoverRepoEmailsForName(repoRoot, userName) {
  const git = esm_default(repoRoot);
  const out = await tryRaw(git, ["shortlog", "-sne", "--all", "--since", "1 year ago"]);
  if (!out) return [];
  const emails = /* @__PURE__ */ new Set();
  for (const line of out.split("\n")) {
    const match = line.match(/^\s*\d+\s+(.+?)\s+<([^>]+)>/);
    if (match) {
      const name = match[1].trim();
      const email = match[2].trim();
      if (eqIC(name, userName)) emails.add(email);
    }
  }
  return Array.from(emails);
}
function buildIdentityRegex(emails, names = []) {
  const parts = [...emails.map(ESC), ...names.map(ESC)].filter(Boolean);
  if (parts.length === 0) return "";
  return `(${parts.join("|")})`;
}
async function tryRaw(git, args) {
  try {
    const out = await git.raw(args);
    const trimmed2 = out.trim();
    return trimmed2.length > 0 ? trimmed2 : null;
  } catch {
    return null;
  }
}
function dedupe(arr) {
  return Array.from(new Set(arr));
}
function eqIC(a, b) {
  return a.localeCompare(b, void 0, { sensitivity: "accent" }) === 0;
}

// src/gitLog.ts
async function getCommitsByIdentity(repoRoot, identityRegex, maxCount = 50, field = "author", includeFiles = false, timeRange = "1 year") {
  const git = esm_default(repoRoot);
  const args = [
    "log",
    `--extended-regexp`,
    `-n`,
    String(maxCount),
    `--${field}`,
    identityRegex,
    "--date=iso-strict",
    "--pretty=%H%x1f%an%x1f%ae%x1f%ad%x1f%s"
  ];
  if (timeRange !== "all") {
    args.splice(4, 0, "--since", timeRange + " ago");
  }
  if (includeFiles) {
    args.push("--name-only");
  }
  try {
    const out = await git.raw(args);
    const lines = out.split("\n").filter(Boolean);
    const commits = [];
    let currentCommit = null;
    for (const line of lines) {
      if (line.includes("")) {
        const parts = line.split("");
        if (parts.length < 5) continue;
        const [sha, an, ae, ad, msg] = parts;
        currentCommit = { sha, authorName: an, authorEmail: ae, date: ad, message: msg, files: [] };
        commits.push(currentCommit);
      } else if (currentCommit && line.trim()) {
        currentCommit.files.push(line.trim());
      }
    }
    return commits;
  } catch (error) {
    console.error("Error executing git log for identity:", error);
    return [];
  }
}

// src/categorizer.ts
var START_TYPE = /^(?<type>feat|fix|refactor|docs?|test|chore|build|ci|perf|style|revert|merge)(?:\(|:)\s*/i;
var EMOJI_HINTS = [
  { re: /✨|:sparkles:/, cat: "Feature" },
  { re: /🐛|:bug:/, cat: "Fix" },
  { re: /♻️|:recycle:/, cat: "Refactor" },
  { re: /📝|:memo:/, cat: "Docs" },
  { re: /✅|:white_check_mark:/, cat: "Test" },
  { re: /🚀|:rocket:/, cat: "Perf" },
  { re: /🎨|:art:/, cat: "Style" },
  { re: /🔧|:wrench:/, cat: "Chore" }
];
var LOOSE_RULES = [
  // Feature
  { re: /\b(feature|features|implement(ed|ing)?|introduc(e|ed|ing)|add(s|ed|ing)?|create(d)?)\b/i, cat: "Feature" },
  // Fix
  { re: /\b(fix|fixes|fixed|bug|bugs|hotfix|hot-fix|resolve(d|s)?)\b/i, cat: "Fix" },
  // Refactor
  { re: /\brefactor(ed|ing)?\b/i, cat: "Refactor" },
  // Docs (avoid too-broad "md"; match doc, docs, readme, changelog)
  { re: /\b(doc|docs|document(ation)?|readme|changelog|guide|manual)\b/i, cat: "Docs" },
  // Test
  { re: /\b(test|tests|unit|e2e|spec|specs|integration)\b/i, cat: "Test" },
  // Perf
  { re: /\b(perf(ormance)?|optimi[sz]e(d|s|r)?|speed|throughput|latency)\b/i, cat: "Perf" },
  // Style
  { re: /\b(style|format|prettier|eslint[- ]?(fix)?|lint(ing)?)\b/i, cat: "Style" },
  // Build
  { re: /\b(build|builds|bundl(e|er)|webpack|vite|rollup|esbuild)\b/i, cat: "Build" },
  // CI
  { re: /\b(ci|cd|pipeline|workflow|github actions|gitlab ci|circleci)\b/i, cat: "CI" },
  // Chore
  { re: /\b(chore|bump|upgrade|update|deps?|dependency|housekeep(ing)?)\b/i, cat: "Chore" }
];
var ENHANCEMENT_RULES = [
  // Action words mapping
  { pattern: /^update\s+(.+)$/i, replacement: "Made changes to $1" },
  { pattern: /^fix\s+(.+)$/i, replacement: "Fixed $1" },
  { pattern: /^add\s+(.+)$/i, replacement: "Added $1" },
  { pattern: /^create\s+(.+)$/i, replacement: "Created $1" },
  { pattern: /^remove\s+(.+)$/i, replacement: "Removed $1" },
  { pattern: /^delete\s+(.+)$/i, replacement: "Deleted $1" },
  { pattern: /^implement\s+(.+)$/i, replacement: "Implemented $1" },
  { pattern: /^refactor\s+(.+)$/i, replacement: "Reorganized $1" },
  { pattern: /^improve\s+(.+)$/i, replacement: "Improved $1" },
  { pattern: /^cleanup\s+(.+)$/i, replacement: "Cleaned up $1" },
  // Technical term expansions
  { pattern: /\bapi\b/gi, replacement: "API functionality" },
  { pattern: /\bdb\b/gi, replacement: "database" },
  { pattern: /\bui\b/gi, replacement: "user interface" },
  { pattern: /\bauth\b/gi, replacement: "authentication" },
  { pattern: /\bconfig\b/gi, replacement: "configuration" },
  { pattern: /\breadme\b/gi, replacement: "documentation" },
  { pattern: /\breadme\.md\b/gi, replacement: "documentation file" },
  // Verb expansions to complete sentences
  { pattern: /^(\w+)\s+seed/i, replacement: "$1 seed and export functionality" },
  { pattern: /^(\w+)\s+documentation/i, replacement: "$1 documentation files" },
  { pattern: /^(\w+)\s+first\s+push/i, replacement: "$1 my first push" },
  // General patterns
  { pattern: /^(\w+)\s+tests?/i, replacement: "$1 test cases" },
  { pattern: /^(\w+)\s+components?/i, replacement: "$1 components" },
  { pattern: /^(\w+)\s+styles?/i, replacement: "$1 styling" }
];
function enhanceMessage(message) {
  const msg = message.trim();
  if (msg.length === 0) return msg;
  if (/^merge\b/i.test(msg)) return "Merged branch";
  if (/^revert\b/i.test(msg)) return "Reverted previous changes";
  if (/^wip\b/i.test(msg)) return "Work in progress";
  if (/^initial\s+/i.test(msg)) return "Initial setup";
  let enhanced = msg;
  for (const rule of ENHANCEMENT_RULES) {
    const result = rule.pattern.exec(enhanced);
    if (result) {
      enhanced = enhanced.replace(rule.pattern, rule.replacement);
      break;
    }
  }
  enhanced = enhanced.charAt(0).toUpperCase() + enhanced.slice(1);
  if (!/[.!?]$/.test(enhanced)) {
    enhanced += "";
  }
  if (enhanced.toLowerCase() === msg.toLowerCase() && msg.split(" ").length <= 3) {
    enhanced = "Made " + enhanced.toLowerCase();
    enhanced = enhanced.charAt(0).toUpperCase() + enhanced.slice(1);
  }
  return enhanced || msg;
}
function categorizeCommit(message) {
  const msg = (message || "").trim();
  const enhanced = enhanceMessage(msg);
  if (msg.length === 0) {
    return {
      category: "Other",
      enhancedMessage: enhanced,
      originalMessage: msg
    };
  }
  if (/^merge\b/i.test(msg)) {
    return {
      category: "Merge",
      enhancedMessage: enhanced,
      originalMessage: msg
    };
  }
  if (/^revert\b/i.test(msg)) {
    return {
      category: "Revert",
      enhancedMessage: enhanced,
      originalMessage: msg
    };
  }
  if (/^wip\b/i.test(msg)) {
    return {
      category: "Chore",
      enhancedMessage: enhanced,
      originalMessage: msg
    };
  }
  const start = START_TYPE.exec(msg);
  if (start?.groups?.type) {
    let category = "Other";
    switch (start.groups.type.toLowerCase()) {
      case "feat":
        category = "Feature";
        break;
      case "fix":
        category = "Fix";
        break;
      case "refactor":
        category = "Refactor";
        break;
      case "docs":
      case "doc":
        category = "Docs";
        break;
      case "test":
        category = "Test";
        break;
      case "chore":
        category = "Chore";
        break;
      case "build":
        category = "Build";
        break;
      case "ci":
        category = "CI";
        break;
      case "perf":
        category = "Perf";
        break;
      case "style":
        category = "Style";
        break;
      case "revert":
        category = "Revert";
        break;
      case "merge":
        category = "Merge";
        break;
    }
    return {
      category,
      enhancedMessage: enhanced,
      originalMessage: msg
    };
  }
  for (const rule of EMOJI_HINTS) {
    if (rule.re.test(msg)) {
      return {
        category: rule.cat,
        enhancedMessage: enhanced,
        originalMessage: msg
      };
    }
  }
  for (const rule of LOOSE_RULES) {
    if (rule.re.test(msg)) {
      return {
        category: rule.cat,
        enhancedMessage: enhanced,
        originalMessage: msg
      };
    }
  }
  return {
    category: "Other",
    enhancedMessage: enhanced,
    originalMessage: msg
  };
}

// src/extension.ts
init_db();

// src/componentDetector.ts
var vscode4 = __toESM(require("vscode"));
var DEFAULT_COMPONENT_RULES = [
  { pattern: "^src/components/", name: "Components" },
  { pattern: "^src/api/", name: "API" },
  { pattern: "^src/lib/", name: "Library" },
  { pattern: "^src/utils/", name: "Utils" },
  { pattern: "^src/hooks/", name: "Hooks" },
  { pattern: "^src/services/", name: "Services" },
  { pattern: "^src/models/", name: "Models" },
  { pattern: "^src/types/", name: "Types" },
  { pattern: "^tests?/", name: "Tests" },
  { pattern: "^__tests__/", name: "Tests" },
  { pattern: "^spec/", name: "Tests" },
  { pattern: "^migrations/", name: "Database" },
  { pattern: "^db/", name: "Database" },
  { pattern: "^database/", name: "Database" },
  { pattern: "^docs?/", name: "Documentation" },
  { pattern: "^config/", name: "Config" },
  { pattern: "^public/", name: "Assets" },
  { pattern: "^assets/", name: "Assets" },
  { pattern: "^styles?/", name: "Styles" },
  { pattern: "^css/", name: "Styles" },
  { pattern: "\\.test\\.(ts|js|tsx|jsx)$", name: "Tests" },
  { pattern: "\\.spec\\.(ts|js|tsx|jsx)$", name: "Tests" },
  { pattern: "\\.css$", name: "Styles" },
  { pattern: "\\.scss$", name: "Styles" },
  { pattern: "\\.md$", name: "Documentation" },
  { pattern: "README", name: "Documentation" },
  { pattern: "^Dockerfile", name: "Infrastructure" },
  { pattern: "^docker-compose", name: "Infrastructure" },
  { pattern: "^\\.github/", name: "CI/CD" },
  { pattern: "^\\.gitlab/", name: "CI/CD" },
  { pattern: "^azure-pipelines", name: "CI/CD" },
  { pattern: "^package\\.json$", name: "Build" },
  { pattern: "^tsconfig\\.json$", name: "Build" },
  { pattern: "^webpack\\.", name: "Build" },
  { pattern: "^vite\\.", name: "Build" }
];
var ComponentDetector = class {
  constructor(config) {
    this.compiledRules = [];
    this.loadRules(config);
  }
  loadRules(config) {
    const rules = config?.rules || this.getUserConfigRules() || DEFAULT_COMPONENT_RULES;
    this.compiledRules = rules.map((rule) => ({
      regex: new RegExp(rule.pattern),
      name: rule.name
    }));
    console.log(`ComponentDetector: Loaded ${this.compiledRules.length} rules`);
  }
  getUserConfigRules() {
    try {
      const vscodeConfig = vscode4.workspace.getConfiguration("commitDiary");
      const userRules = vscodeConfig.get("componentRules");
      if (userRules && Array.isArray(userRules) && userRules.length > 0) {
        console.log(`ComponentDetector: Using ${userRules.length} user-defined rules`);
        return userRules;
      }
    } catch (e) {
      console.error("Error loading user component rules:", e);
    }
    return null;
  }
  /**
   * Detect component for a single file path
   */
  detectComponent(filePath) {
    const normalized = filePath.replace(/\\/g, "/");
    for (const rule of this.compiledRules) {
      if (rule.regex.test(normalized)) {
        return rule.name;
      }
    }
    const parts = normalized.split("/");
    if (parts.length > 1) {
      for (const part of parts) {
        if (part && part !== "." && part !== ".." && !part.startsWith(".")) {
          return this.capitalizeFirst(part);
        }
      }
    }
    return "Other";
  }
  /**
   * Detect components for multiple files
   */
  detectComponents(filePaths) {
    const components = /* @__PURE__ */ new Set();
    for (const filePath of filePaths) {
      const component = this.detectComponent(filePath);
      if (component) {
        components.add(component);
      }
    }
    return Array.from(components);
  }
  /**
   * Detect components and return with file associations
   */
  detectComponentsWithFiles(filePaths) {
    return filePaths.map((path4) => ({
      path: path4,
      component: this.detectComponent(path4)
    }));
  }
  /**
   * Reload rules from VS Code configuration
   */
  reload() {
    this.loadRules();
  }
  capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
};
var detector = null;
function getComponentDetector() {
  if (!detector) {
    detector = new ComponentDetector();
  }
  return detector;
}
function reloadComponentDetector() {
  detector = new ComponentDetector();
}

// src/sync.ts
var vscode5 = __toESM(require("vscode"));
var zlib = __toESM(require("zlib"));
var import_util = require("util");

// ../../node_modules/.pnpm/uuid@10.0.0/node_modules/uuid/dist/esm-node/stringify.js
var byteToHex = [];
for (let i = 0; i < 256; ++i) {
  byteToHex.push((i + 256).toString(16).slice(1));
}
function unsafeStringify(arr, offset = 0) {
  return (byteToHex[arr[offset + 0]] + byteToHex[arr[offset + 1]] + byteToHex[arr[offset + 2]] + byteToHex[arr[offset + 3]] + "-" + byteToHex[arr[offset + 4]] + byteToHex[arr[offset + 5]] + "-" + byteToHex[arr[offset + 6]] + byteToHex[arr[offset + 7]] + "-" + byteToHex[arr[offset + 8]] + byteToHex[arr[offset + 9]] + "-" + byteToHex[arr[offset + 10]] + byteToHex[arr[offset + 11]] + byteToHex[arr[offset + 12]] + byteToHex[arr[offset + 13]] + byteToHex[arr[offset + 14]] + byteToHex[arr[offset + 15]]).toLowerCase();
}

// ../../node_modules/.pnpm/uuid@10.0.0/node_modules/uuid/dist/esm-node/rng.js
var import_node_crypto = __toESM(require("node:crypto"));
var rnds8Pool = new Uint8Array(256);
var poolPtr = rnds8Pool.length;
function rng() {
  if (poolPtr > rnds8Pool.length - 16) {
    import_node_crypto.default.randomFillSync(rnds8Pool);
    poolPtr = 0;
  }
  return rnds8Pool.slice(poolPtr, poolPtr += 16);
}

// ../../node_modules/.pnpm/uuid@10.0.0/node_modules/uuid/dist/esm-node/native.js
var import_node_crypto2 = __toESM(require("node:crypto"));
var native_default = {
  randomUUID: import_node_crypto2.default.randomUUID
};

// ../../node_modules/.pnpm/uuid@10.0.0/node_modules/uuid/dist/esm-node/v4.js
function v4(options, buf, offset) {
  if (native_default.randomUUID && !buf && !options) {
    return native_default.randomUUID();
  }
  options = options || {};
  const rnds = options.random || (options.rng || rng)();
  rnds[6] = rnds[6] & 15 | 64;
  rnds[8] = rnds[8] & 63 | 128;
  if (buf) {
    offset = offset || 0;
    for (let i = 0; i < 16; ++i) {
      buf[offset + i] = rnds[i];
    }
    return buf;
  }
  return unsafeStringify(rnds);
}
var v4_default = v4;

// src/sync.ts
init_db();
var gzip2 = (0, import_util.promisify)(zlib.gzip);
var gunzip2 = (0, import_util.promisify)(zlib.gunzip);
var SyncManager = class {
  constructor(context, output, notificationManager2) {
    this.syncTimer = null;
    this.notificationManager = null;
    this.context = context;
    this.output = output;
    this.config = this.loadConfig();
    this.notificationManager = notificationManager2 || null;
  }
  loadConfig() {
    const vscodeConfig = vscode5.workspace.getConfiguration("commitDiary");
    const apiUrl = "https://commitdiary-backend.onrender.com";
    return {
      // enabled: vscodeConfig.get<boolean>('sync.enabled', true),
      enabled: true,
      // Force enabled regardless of user setting
      apiUrl,
      chunkSize: vscodeConfig.get("sync.chunkSize", 200),
      maxRetries: 3,
      retryDelays: [2e3, 4e3, 8e3]
      // Exponential backoff: 2s, 4s, 8s
    };
  }
  async buildDeltaPayload(repoId, commits) {
    const repo = getRepoById(repoId);
    if (!repo) {
      this.output.appendLine(`[Sync] Repository ${repoId} not found`);
      return null;
    }
    const unsyncedCommits = commits || getUnsyncedCommits(repoId, this.config.chunkSize);
    if (unsyncedCommits.length === 0) {
      this.output.appendLine(`[Sync] No unsynced commits for repo ${repo.name}`);
      return null;
    }
    const extension = vscode5.extensions.getExtension("samuel-adedigba.commitdiary-extension");
    const version = extension?.packageJSON?.version || "0.0.0";
    let clientId = this.context.globalState.get("clientId");
    if (!clientId) {
      clientId = this.generateClientId();
      await this.context.globalState.update("clientId", clientId);
    }
    const payload = {
      repo: {
        id: repoId,
        name: repo.name,
        remote: repo.remote,
        path: repo.path
      },
      commits: unsyncedCommits.map((row) => ({
        sha: row[0],
        author_name: row[2],
        author_email: row[3],
        author_email_hash: row[4],
        date: row[5],
        message: row[6],
        category: row[7],
        files: JSON.parse(row[8] || "[]"),
        components: JSON.parse(row[9] || "[]"),
        diff_summary: row[10],
        context_tags: JSON.parse(row[11] || "[]")
      })),
      client_metadata: {
        client_id: clientId,
        platform: process.platform,
        version
      }
    };
    this.output.appendLine(`[Sync] Built delta payload: ${payload.commits.length} commits for ${repo.name}`);
    return payload;
  }
  async compressPayload(payload) {
    const json = JSON.stringify(payload);
    const compressed = await gzip2(Buffer.from(json, "utf-8"));
    const compressionRatio = ((1 - compressed.length / json.length) * 100).toFixed(1);
    this.output.appendLine(`[Sync] Compressed ${json.length} bytes \u2192 ${compressed.length} bytes (${compressionRatio}% reduction)`);
    return compressed;
  }
  async syncToCloud(repoId, forceFullResync = false) {
    this.output.appendLine(`[Sync] Starting sync for repo ${repoId}`);
    if (!acquireSyncLock(repoId, this.context)) {
      this.output.appendLine("[Sync] \u23F8\uFE0F  Another sync is already in progress for this repo");
      return false;
    }
    const batchId = v4_default();
    this.output.appendLine(`[Sync] \u{1F512} Acquired sync lock. Batch ID: ${batchId}`);
    try {
      const token = await this.getAuthToken();
      if (!token) {
        this.output.appendLine("[Sync] No auth token found");
        vscode5.window.showWarningMessage("CommitDiary: Please login to enable cloud sync.");
        return false;
      }
      const unsyncedCommits = getUnsyncedCommits(repoId, this.config.chunkSize);
      if (unsyncedCommits.length === 0) {
        this.output.appendLine("[Sync] \u2705 No unsynced commits");
        return true;
      }
      const totalCommits = unsyncedCommits.length;
      this.output.appendLine(`[Sync] Found ${totalCommits} unsynced commits`);
      await this.notificationManager?.notifySyncStart(totalCommits);
      const stats = getSyncStats(repoId);
      this.output.appendLine(`[Sync] Sync stats: ${JSON.stringify(stats)}`);
      const shas = unsyncedCommits.map((row) => row[0]);
      markCommitsSyncing(shas, batchId, this.context);
      this.output.appendLine(`[Sync] Marked ${shas.length} commits as 'syncing'`);
      const payload = await this.buildDeltaPayload(repoId, unsyncedCommits);
      if (!payload) {
        resetSyncingCommits(batchId, this.context);
        return false;
      }
      const compressed = await this.compressPayload(payload);
      const response = await this.notificationManager?.showProgress(
        `Syncing ${totalCommits} commits...`,
        async (progress) => {
          progress.report({ increment: 0, message: "Uploading..." });
          const result = await this.sendWithRetry(compressed, token);
          progress.report({ increment: 100, message: "Complete!" });
          return result;
        }
      ) || await vscode5.window.withProgress({
        location: vscode5.ProgressLocation.Notification,
        title: `CommitDiary: Syncing ${totalCommits} commits...`,
        cancellable: false
      }, async (progress) => {
        progress.report({ increment: 0, message: "Uploading..." });
        const result = await this.sendWithRetry(compressed, token);
        progress.report({ increment: 100, message: "Complete!" });
        return result;
      });
      if (response) {
        const confirmedShas = response.synced_shas && response.synced_shas.length > 0 ? response.synced_shas : shas;
        markCommitsSyncedWithTimestamp(confirmedShas, response.server_timestamp, this.context);
        this.output.appendLine(`[Sync] \u2705 Marked ${confirmedShas.length} commits as 'synced'`);
        if (response.rejected && response.rejected.length > 0) {
          const rejectedShas = response.rejected.map((r) => r.sha);
          const rejectedReasons = response.rejected.map((r) => `${r.sha}: ${r.reason}`).join(", ");
          markCommitsFailed(rejectedShas, rejectedReasons, this.context);
          this.output.appendLine(`[Sync] \u26A0\uFE0F  ${rejectedShas.length} commits rejected: ${rejectedReasons}`);
        }
        const lastSha = confirmedShas[confirmedShas.length - 1];
        updateRepoSyncSha(repoId, lastSha, this.context);
        this.output.appendLine(`[Sync] \u2705 Successfully synced ${response.synced} commits`);
        const rejectedCount = response.rejected?.length || 0;
        await this.notificationManager?.notifySyncComplete(response.synced, rejectedCount);
        await this.sendTelemetry("sync_success", {
          repo_id: repoId,
          commit_count: response.synced,
          compressed_size: compressed.length,
          batch_id: batchId
        });
        return true;
      }
      resetSyncingCommits(batchId, this.context);
      return false;
    } catch (error) {
      this.output.appendLine(`[Sync] \u274C Error: ${error}`);
      resetSyncingCommits(batchId, this.context);
      const willRetry = true;
      const retryDelay = this.config.retryDelays[0];
      const errorMessage = String(error);
      const isNetworkError = errorMessage.includes("fetch failed") || errorMessage.includes("ECONNREFUSED") || errorMessage.includes("ETIMEDOUT") || errorMessage.includes("network");
      if (isNetworkError) {
        const statsResult = getSyncStats(repoId);
        const pendingCount = statsResult.find((row) => row[0] === "pending")?.[1] || 0;
        await this.notificationManager?.notifyOfflineQueued(pendingCount);
      } else {
        await this.notificationManager?.notifySyncFailed(errorMessage, willRetry, retryDelay);
      }
      await this.sendTelemetry("sync_failure", {
        repo_id: repoId,
        error: String(error),
        batch_id: batchId
      });
      const payload = await this.buildDeltaPayload(repoId);
      if (payload) {
        addToSyncQueue(repoId, JSON.stringify(payload), this.context);
        this.output.appendLine("[Sync] Added failed sync to retry queue");
      }
      return false;
    } finally {
      releaseSyncLock(repoId, this.context);
      this.output.appendLine("[Sync] \u{1F513} Released sync lock");
    }
  }
  async sendWithRetry(compressed, token, attempt = 0) {
    try {
      const url = `${this.config.apiUrl}/v1/ingest/commits`;
      this.output.appendLine(`[Sync] Attempt ${attempt + 1}/${this.config.maxRetries}: POST ${url}`);
      this.output.appendLine(`[Sync] Payload size: ${compressed.length} bytes`);
      this.output.appendLine(`[Sync] Auth token: ${token.substring(0, 15)}...`);
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "X-API-Key": token,
          "Content-Type": "application/gzip",
          "Content-Encoding": "gzip",
          "X-Client-Version": vscode5.extensions.getExtension("samuel-adedigba.commitdiary-extension")?.packageJSON?.version || "0.0.0"
        },
        body: compressed
      });
      this.output.appendLine(`[Sync] Response status: ${response.status}`);
      if (!response.ok) {
        const errorText = await response.text();
        this.output.appendLine(`[Sync] Error response: ${errorText}`);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      this.output.appendLine(`[Sync] \u2705 Success: ${JSON.stringify(data)}`);
      return data;
    } catch (error) {
      this.output.appendLine(`[Sync] \u274C Request failed: ${error.message}`);
      if (error.cause) {
        this.output.appendLine(`[Sync] Error cause: ${JSON.stringify(error.cause)}`);
      }
      if (error.stack) {
        this.output.appendLine(`[Sync] Stack trace: ${error.stack.split("\n").slice(0, 3).join("\n")}`);
      }
      if (attempt < this.config.maxRetries - 1) {
        const delay2 = this.config.retryDelays[attempt];
        this.output.appendLine(`[Sync] Retry ${attempt + 1}/${this.config.maxRetries} after ${delay2}ms...`);
        await new Promise((resolve2) => setTimeout(resolve2, delay2));
        return this.sendWithRetry(compressed, token, attempt + 1);
      }
      throw error;
    }
  }
  async processSyncQueue() {
    this.config = this.loadConfig();
    const queue = getPendingSyncQueue();
    if (queue.length === 0) {
      return;
    }
    this.output.appendLine(`[Sync] Processing ${queue.length} items from sync queue`);
    const token = await this.getAuthToken();
    if (!token) {
      this.output.appendLine("[Sync] No auth token, skipping queue processing");
      return;
    }
    for (const item of queue) {
      const queueId = item[0];
      const repoId = item[1];
      const commitsJson = item[2];
      const payloadSize = item[3];
      const attemptCount = item[4];
      if (!acquireSyncLock(repoId, this.context)) {
        this.output.appendLine(`[Sync] Queue item ${queueId}: Repo ${repoId} is locked, skipping`);
        continue;
      }
      const batchId = v4_default();
      try {
        const payload = JSON.parse(commitsJson);
        const shas = payload.commits.map((c) => c.sha);
        markCommitsSyncing(shas, batchId, this.context);
        const compressed = await this.compressPayload(payload);
        const response = await this.sendWithRetry(compressed, token);
        if (response) {
          removeSyncQueueItem(queueId, this.context);
          const confirmedShas = response.synced_shas && response.synced_shas.length > 0 ? response.synced_shas : shas;
          markCommitsSyncedWithTimestamp(confirmedShas, response.server_timestamp, this.context);
          if (response.rejected && response.rejected.length > 0) {
            const rejectedShas = response.rejected.map((r) => r.sha);
            const rejectedReasons = response.rejected.map((r) => `${r.sha}: ${r.reason}`).join(", ");
            markCommitsFailed(rejectedShas, rejectedReasons, this.context);
          }
          const lastSha = confirmedShas[confirmedShas.length - 1];
          updateRepoSyncSha(repoId, lastSha, this.context);
          this.output.appendLine(`[Sync] \u2705 Queue item ${queueId} synced successfully`);
        }
      } catch (error) {
        resetSyncingCommits(batchId, this.context);
        updateSyncQueueAttempt(queueId, String(error), this.context);
        this.output.appendLine(`[Sync] \u274C Queue item ${queueId} failed (attempt ${attemptCount + 1}): ${error}`);
      } finally {
        releaseSyncLock(repoId, this.context);
      }
    }
  }
  async startAutoSync() {
    const config = vscode5.workspace.getConfiguration("commitDiary");
    const syncEnabled = config.get("sync.enabled", true);
    if (!syncEnabled) {
      this.output.appendLine("[Sync] Auto-sync disabled in settings");
      this.stopAutoSync();
      return;
    }
    const apiKey = await this.getAuthToken();
    if (!apiKey) {
      this.output.appendLine("[Sync] \u23F8\uFE0F  No API key found - auto-sync will start when you add one");
      this.output.appendLine("[Sync] Get your API key from the dashboard");
      this.stopAutoSync();
      return;
    }
    const interval = config.get("sync.autoInterval", "daily");
    if (interval === "never") {
      this.output.appendLine('[Sync] Auto-sync interval set to "never"');
      this.stopAutoSync();
      return;
    }
    this.stopAutoSync();
    let intervalMs;
    switch (interval) {
      case "hourly":
        intervalMs = 60 * 60 * 1e3;
        break;
      case "daily":
        intervalMs = 24 * 60 * 60 * 1e3;
        break;
      default:
        return;
    }
    this.output.appendLine(`[Sync] \u2705 Auto-sync enabled: every ${interval}`);
    this.output.appendLine("[Sync] Running initial sync...");
    await this.processSyncQueue();
    this.syncTimer = setInterval(async () => {
      this.output.appendLine("[Sync] Running scheduled sync...");
      await this.processSyncQueue();
      await this.checkSyncHealth();
    }, intervalMs);
  }
  /**
   * Check sync health and warn about accumulated unsynced commits
   */
  async checkSyncHealth() {
    try {
      const db2 = this.context.globalState.db;
      if (!db2) return;
      const result = db2.exec(`
                SELECT COUNT(*) as count 
                FROM commits 
                WHERE sync_status = 'pending'
            `);
      if (result && result[0] && result[0].values && result[0].values[0]) {
        const unsyncedCount = result[0].values[0][0];
        await this.notificationManager?.notifyUnsyncedAccumulation(unsyncedCount, 50);
      }
    } catch (error) {
      this.output.appendLine(`[Sync Health] Error checking sync health: ${error}`);
    }
  }
  stopAutoSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
      this.output.appendLine("[Sync] Auto-sync stopped");
    }
  }
  async getAuthToken() {
    const config = vscode5.workspace.getConfiguration("commitDiary");
    const settingsApiKey = config.get("apiKey", "").trim();
    if (settingsApiKey) {
      return settingsApiKey;
    }
    const secretApiKey = await this.context.secrets.get("api_key");
    if (secretApiKey) {
      return secretApiKey;
    }
    return null;
  }
  generateClientId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  async sendTelemetry(event, data) {
    const telemetryEnabled = vscode5.workspace.getConfiguration("commitDiary").get("telemetry.enabled", false);
    if (!telemetryEnabled) {
      return;
    }
    try {
      const token = await this.getAuthToken();
      if (!token) return;
      await fetch(`${this.config.apiUrl}/v1/telemetry`, {
        method: "POST",
        headers: {
          "X-API-Key": token,
          // Use X-API-Key for all API requests
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          event,
          data,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        })
      });
    } catch (e) {
    }
  }
  reloadConfig() {
    this.config = this.loadConfig();
    this.output.appendLine("[Sync] Configuration reloaded");
  }
};

// src/auth.ts
var vscode6 = __toESM(require("vscode"));
var AuthManager = class {
  constructor(context, output) {
    this.context = context;
    this.output = output;
  }
  /**
   * Check if user has configured API key
   */
  async isAuthenticated() {
    const apiKey = await this.getApiKey();
    return !!apiKey;
  }
  /**
   * Get API key from settings (visible) or secrets (legacy)
   */
  async getApiKey() {
    const config = vscode6.workspace.getConfiguration("commitDiary");
    const settingsApiKey = config.get("apiKey", "").trim();
    if (settingsApiKey) {
      return settingsApiKey;
    }
    const secretApiKey = await this.context.secrets.get("api_key");
    if (secretApiKey) {
      return secretApiKey;
    }
    return null;
  }
  /**
   * Get auth token for API requests
   */
  async getAuthToken() {
    return this.getApiKey();
  }
  /**
   * Store API key in secrets
   * Called when user pastes key from dashboard
   */
  async storeApiKey(apiKey) {
    await this.context.secrets.store("api_key", apiKey);
    await this.context.globalState.update("auth_timestamp", Date.now());
    this.output.appendLine("[Auth] \u2705 API key stored successfully");
    vscode6.window.showInformationMessage(
      "\u2705 CommitDiary: API key saved! Cloud sync is now enabled.",
      "View Settings"
    ).then((action) => {
      if (action === "View Settings") {
        vscode6.commands.executeCommand("workbench.action.openSettings", "commitDiary");
      }
    });
  }
  /**
   * Validate API key by making a test request
   */
  async validateApiKey(apiKey) {
    try {
      const key = apiKey || await this.getApiKey();
      if (!key) {
        return false;
      }
      const config = vscode6.workspace.getConfiguration("commitDiary");
      let apiUrl = config.get("sync.apiUrl", "https://commitdiary-backend.onrender.com");
      apiUrl = apiUrl.replace(/\/$/, "");
      this.output.appendLine(`[Auth] Validating API key with ${apiUrl}...`);
      const response = await fetch(`${apiUrl}/v1/users/profile`, {
        method: "GET",
        headers: {
          "X-API-Key": key
        }
      });
      if (response.ok) {
        this.output.appendLine("[Auth] \u2705 API key is valid");
        return true;
      } else if (response.status === 401) {
        this.output.appendLine("[Auth] \u274C API key is invalid or expired");
        return false;
      } else {
        this.output.appendLine(`[Auth] \u26A0\uFE0F  API validation returned HTTP ${response.status}`);
        return true;
      }
    } catch (error) {
      this.output.appendLine(`[Auth] \u274C API key validation error: ${error}`);
      return true;
    }
  }
  /**
   * Clear API key (logout equivalent)
   */
  async clearApiKey() {
    try {
      await this.context.secrets.delete("api_key");
      const config = vscode6.workspace.getConfiguration("commitDiary");
      await config.update("apiKey", "", vscode6.ConfigurationTarget.Global);
      await this.context.globalState.update("auth_timestamp", void 0);
      this.output.appendLine("[Auth] API key cleared successfully");
      vscode6.window.showInformationMessage("CommitDiary: API key removed. Cloud sync disabled.");
    } catch (error) {
      this.output.appendLine(`[Auth] Clear API key error: ${error}`);
      vscode6.window.showErrorMessage(`Failed to clear API key: ${error}`);
    }
  }
  /**
   * Prompt user to register if not authenticated
   */
  async promptRegistration() {
    const dashboardUrl = vscode6.workspace.getConfiguration("commitDiary").get("dashboardUrl", "https://commitdiary-web.vercel.app");
    const action = await vscode6.window.showInformationMessage(
      "\u{1F680} CommitDiary: Register for cloud sync to backup and analyze your commits across all devices!",
      { modal: false },
      "Register Now",
      "Learn More",
      "Maybe Later"
    );
    if (action === "Register Now") {
      await vscode6.env.openExternal(vscode6.Uri.parse(dashboardUrl));
      this.output.appendLine(`[Auth] Opened dashboard for registration: ${dashboardUrl}`);
    } else if (action === "Learn More") {
      await vscode6.env.openExternal(vscode6.Uri.parse("https://github.com/samuel-adedigba/Commit-Diary-Vscode-Extension#cloud-sync"));
      this.output.appendLine("[Auth] Opened documentation");
    }
  }
  /**
   * Show instructions for setting up API key
   */
  async showApiKeyInstructions() {
    const dashboardUrl = vscode6.workspace.getConfiguration("commitDiary").get("dashboardUrl", "https://commitdiary-web.vercel.app");
    const message = `To enable cloud sync:
1. Register at ${dashboardUrl}
2. Generate an API key from your dashboard
3. Copy the key
4. Paste it in VS Code Settings \u2192 CommitDiary \u2192 API Key
5. Your commits will sync automatically!`;
    const action = await vscode6.window.showInformationMessage(
      message,
      { modal: true },
      "Open Dashboard",
      "Open Settings"
    );
    if (action === "Open Dashboard") {
      await vscode6.env.openExternal(vscode6.Uri.parse(dashboardUrl));
    } else if (action === "Open Settings") {
      await vscode6.commands.executeCommand("workbench.action.openSettings", "commitDiary.apiKey");
    }
  }
};

// src/notifications.ts
var vscode7 = __toESM(require("vscode"));
var NotificationManager = class {
  // 30 seconds
  constructor(output, statusBarItem2) {
    this.syncStatus = "idle" /* Idle */;
    this.commitCount = 0;
    this.currentRepoName = "";
    this.batchQueue = /* @__PURE__ */ new Map();
    this.batchTimer = null;
    this.BATCH_WINDOW_MS = 3e4;
    this.output = output;
    this.statusBarItem = statusBarItem2;
    this.setupStatusBar();
  }
  setupStatusBar() {
    this.statusBarItem.command = "commitDiary.showMyCommits";
    this.updateStatusBar();
  }
  /**
   * Update status bar with current state
   */
  updateStatusBar(commitCount, repoName) {
    if (commitCount !== void 0) {
      this.commitCount = commitCount;
    }
    if (repoName !== void 0) {
      this.currentRepoName = repoName;
    }
    const icon = this.getSyncStatusIcon();
    const statusText = this.getSyncStatusText();
    this.statusBarItem.text = `$(git-commit) ${icon} ${this.commitCount} commits`;
    this.statusBarItem.tooltip = this.buildTooltip(statusText);
    this.statusBarItem.show();
  }
  /**
   * Set sync status and update UI
   */
  setSyncStatus(status, details) {
    this.syncStatus = status;
    this.output.appendLine(`[Status] Sync status changed to: ${status}${details ? ` - ${details}` : ""}`);
    this.updateStatusBar();
  }
  getSyncStatusIcon() {
    switch (this.syncStatus) {
      case "syncing" /* Syncing */:
        return "\u23F3";
      case "synced" /* Synced */:
        return "\u2705";
      case "pending" /* Pending */:
        return "\u26A0\uFE0F";
      case "failed" /* Failed */:
        return "\u274C";
      case "offline" /* Offline */:
        return "\u{1F4E1}";
      default:
        return "\u{1F600}";
    }
  }
  getSyncStatusText() {
    switch (this.syncStatus) {
      case "syncing" /* Syncing */:
        return "Syncing to cloud...";
      case "synced" /* Synced */:
        return "All commits synced";
      case "pending" /* Pending */:
        return "Unsynced commits (will sync soon)";
      case "failed" /* Failed */:
        return "Sync failed (will retry)";
      case "offline" /* Offline */:
        return "Offline (queued for sync)";
      default:
        return "Ready";
    }
  }
  buildTooltip(statusText) {
    const parts = [
      `CommitDiary: ${this.commitCount} commits`,
      statusText
    ];
    if (this.currentRepoName) {
      parts.push(`Repository: ${this.currentRepoName}`);
    }
    parts.push("\nClick to view your commits");
    return parts.join("\n");
  }
  /**
   * Check if notification is enabled for this event type
   */
  isEventEnabled(event) {
    const config = vscode7.workspace.getConfiguration("commitDiary.notifications");
    const globalEnabled = config.get("enabled", true);
    if (!globalEnabled) {
      return false;
    }
    return config.get(event, true);
  }
  /**
   * Get notification verbosity level
   */
  getVerbosity() {
    const config = vscode7.workspace.getConfiguration("commitDiary.notifications");
    return config.get("verbosity", "normal");
  }
  /**
   * Add event to batch queue for smart batching
   */
  addToBatch(event, data) {
    if (!this.batchQueue.has(event)) {
      this.batchQueue.set(event, []);
    }
    this.batchQueue.get(event).push({
      event,
      data,
      timestamp: Date.now()
    });
    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        this.processBatchQueue();
      }, this.BATCH_WINDOW_MS);
    }
  }
  /**
   * Process batched notifications
   */
  processBatchQueue() {
    const verbosity = this.getVerbosity();
    for (const [event, batches] of this.batchQueue.entries()) {
      if (batches.length === 0) continue;
      if (verbosity === "verbose") {
        batches.forEach((batch) => {
          this.showImmediateNotification(event, batch.data);
        });
      } else if (verbosity === "normal") {
        if (batches.length === 1) {
          this.showImmediateNotification(event, batches[0].data);
        } else {
          this.showBatchedNotification(event, batches);
        }
      } else if (verbosity === "quiet") {
        if (event === "onSyncFailed" /* SyncFailed */ || event === "onFirstCommit" /* FirstCommit */) {
          this.showImmediateNotification(event, batches[batches.length - 1].data);
        }
      }
    }
    this.batchQueue.clear();
    this.batchTimer = null;
  }
  /**
   * Show immediate notification (first event or high priority)
   */
  showImmediateNotification(event, data) {
    switch (event) {
      case "onNewCommits" /* NewCommits */:
        this.showToast("info" /* Info */, `${data.count} new commit${data.count > 1 ? "s" : ""} detected`, {
          actions: ["View Commits", "Sync Now"]
        });
        break;
      case "onBranchSwitch" /* BranchSwitch */:
        this.showToast("info" /* Info */, `Switched to branch: ${data.branch}`, {
          actions: ["View Commits", "Rescan"]
        });
        break;
      case "onSyncComplete" /* SyncComplete */:
        this.showToast("success" /* Success */, `\u2705 Synced ${data.count} commits to cloud`, {
          timeout: 5e3
        });
        break;
      case "onSyncFailed" /* SyncFailed */:
        this.showToast("error" /* Error */, `Sync failed: ${data.error}`, {
          actions: ["Retry", "View Output"]
        });
        break;
    }
  }
  /**
   * Show batched notification (multiple similar events)
   */
  showBatchedNotification(event, batches) {
    switch (event) {
      case "onNewCommits" /* NewCommits */:
        const totalCommits = batches.reduce((sum, b) => sum + (b.data.count || 0), 0);
        this.showToast("info" /* Info */, `${totalCommits} new commits detected (${batches.length} updates)`, {
          actions: ["View Commits", "Sync Now"]
        });
        break;
      case "onBranchSwitch" /* BranchSwitch */:
        const lastBranch = batches[batches.length - 1].data.branch;
        this.showToast("info" /* Info */, `Switched branches ${batches.length} times (now on: ${lastBranch})`, {
          actions: ["View Commits"]
        });
        break;
    }
  }
  /**
   * Show toast notification based on level
   */
  async showToast(level, message, options = {}) {
    const fullMessage = `CommitDiary: ${message}`;
    if (options.showInOutput !== false) {
      this.output.appendLine(`[Notification] ${message}`);
    }
    const actions = options.actions || [];
    let result;
    switch (level) {
      case "info" /* Info */:
      case "success" /* Success */:
        result = await vscode7.window.showInformationMessage(fullMessage, ...actions);
        break;
      case "warning" /* Warning */:
        result = await vscode7.window.showWarningMessage(fullMessage, ...actions);
        break;
      case "error" /* Error */:
        result = await vscode7.window.showErrorMessage(fullMessage, ...actions);
        break;
    }
    return result;
  }
  /**
   * Notify about new commits detected
   */
  async notifyNewCommits(count, autoSync = true) {
    if (!this.isEventEnabled("onNewCommits" /* NewCommits */)) {
      return;
    }
    const verbosity = this.getVerbosity();
    if (!this.batchQueue.has("onNewCommits" /* NewCommits */) || this.batchQueue.get("onNewCommits" /* NewCommits */).length === 0) {
      const message = `${count} new commit${count > 1 ? "s" : ""} detected`;
      const actions = autoSync ? ["View Commits", "Sync Now"] : ["View Commits"];
      const action = await this.showToast("info" /* Info */, message, { actions });
      if (action === "View Commits") {
        vscode7.commands.executeCommand("commitDiary.showMyCommits");
      } else if (action === "Sync Now") {
        vscode7.commands.executeCommand("commitDiary.syncNow");
      }
      this.addToBatch("onNewCommits" /* NewCommits */, { count });
    } else {
      this.addToBatch("onNewCommits" /* NewCommits */, { count });
    }
  }
  /**
   * Notify about branch switch
   */
  async notifyBranchSwitch(oldBranch, newBranch, autoDiff = true) {
    if (!this.isEventEnabled("onBranchSwitch" /* BranchSwitch */)) {
      return;
    }
    const message = `Switched to branch: ${newBranch}`;
    const actions = autoDiff ? ["View Commits", "Rescan"] : ["View Commits"];
    const action = await this.showToast("info" /* Info */, message, { actions });
    if (action === "View Commits") {
      vscode7.commands.executeCommand("commitDiary.showMyCommits");
    } else if (action === "Rescan") {
      vscode7.commands.executeCommand("commitDiary.refreshCount");
    }
    this.addToBatch("onBranchSwitch" /* BranchSwitch */, { branch: newBranch });
  }
  /**
   * Notify about workspace change
   */
  async notifyWorkspaceChange(foldersAdded, foldersRemoved) {
    if (!this.isEventEnabled("onWorkspaceChange" /* WorkspaceChange */)) {
      return;
    }
    let message = "";
    if (foldersAdded > 0 && foldersRemoved > 0) {
      message = `Workspace changed: ${foldersAdded} added, ${foldersRemoved} removed`;
    } else if (foldersAdded > 0) {
      message = `${foldersAdded} workspace folder${foldersAdded > 1 ? "s" : ""} added`;
    } else if (foldersRemoved > 0) {
      message = `${foldersRemoved} workspace folder${foldersRemoved > 1 ? "s" : ""} removed`;
    }
    if (message) {
      const action = await this.showToast("info" /* Info */, message, {
        actions: ["Discover Repos", "View Commits"]
      });
      if (action === "Discover Repos") {
        vscode7.commands.executeCommand("commitDiary.discoverRepos");
      } else if (action === "View Commits") {
        vscode7.commands.executeCommand("commitDiary.showMyCommits");
      }
    }
  }
  /**
   * Notify about repository discovered
   */
  async notifyRepoDiscovered(repoName, commitCount) {
    if (!this.isEventEnabled("onRepoDiscovered" /* RepoDiscovered */)) {
      return;
    }
    const message = `Repository discovered: ${repoName} (${commitCount} commits)`;
    const action = await this.showToast("success" /* Success */, message, {
      actions: ["View Commits", "Sync Now"]
    });
    if (action === "View Commits") {
      vscode7.commands.executeCommand("commitDiary.showMyCommits");
    } else if (action === "Sync Now") {
      vscode7.commands.executeCommand("commitDiary.syncNow");
    }
  }
  /**
   * Notify about first commit in new repo (onboarding)
   */
  async notifyFirstCommit(repoName) {
    if (!this.isEventEnabled("onFirstCommit" /* FirstCommit */)) {
      return;
    }
    const message = `\u{1F389} Welcome to CommitDiary! Tracking ${repoName}`;
    const action = await this.showToast("success" /* Success */, message, {
      actions: ["Setup Cloud Sync", "View Commits", "Dismiss"]
    });
    if (action === "Setup Cloud Sync") {
      vscode7.commands.executeCommand("commitDiary.login");
    } else if (action === "View Commits") {
      vscode7.commands.executeCommand("commitDiary.showMyCommits");
    }
  }
  /**
   * Notify about sync start
   */
  async notifySyncStart(commitCount) {
    if (!this.isEventEnabled("onSyncStart" /* SyncStart */)) {
      return;
    }
    this.setSyncStatus("syncing" /* Syncing */, `${commitCount} commits`);
    const verbosity = this.getVerbosity();
    if (verbosity === "verbose") {
      this.showToast("info" /* Info */, `Starting sync: ${commitCount} commits...`, {
        timeout: 3e3
      });
    }
  }
  /**
   * Notify about sync completion
   */
  async notifySyncComplete(syncedCount, rejectedCount = 0) {
    if (!this.isEventEnabled("onSyncComplete" /* SyncComplete */)) {
      return;
    }
    this.setSyncStatus("synced" /* Synced */);
    const verbosity = this.getVerbosity();
    if (verbosity !== "quiet") {
      let message = `\u2705 Synced ${syncedCount} commit${syncedCount !== 1 ? "s" : ""} to cloud`;
      if (rejectedCount > 0) {
        message += ` (${rejectedCount} skipped)`;
      }
      this.showToast("success" /* Success */, message, {
        timeout: 5e3
      });
    }
  }
  /**
   * Notify about sync failure
   */
  async notifySyncFailed(error, willRetry = true, retryDelay) {
    if (!this.isEventEnabled("onSyncFailed" /* SyncFailed */)) {
      return;
    }
    this.setSyncStatus("failed" /* Failed */, error);
    let message = `Sync failed: ${error}`;
    if (willRetry && retryDelay) {
      const delaySec = Math.round(retryDelay / 1e3);
      message += ` (retrying in ${delaySec}s)`;
    }
    const action = await this.showToast("error" /* Error */, message, {
      actions: willRetry ? ["Retry Now", "View Output", "Dismiss"] : ["View Output", "Dismiss"]
    });
    if (action === "Retry Now") {
      vscode7.commands.executeCommand("commitDiary.syncNow");
    } else if (action === "View Output") {
      this.output.show();
    }
  }
  /**
   * Notify about offline status (queued for sync)
   */
  async notifyOfflineQueued(commitCount) {
    const verbosity = this.getVerbosity();
    this.setSyncStatus("offline" /* Offline */, `${commitCount} commits queued`);
    if (verbosity === "verbose") {
      this.showToast("warning" /* Warning */, `Offline: ${commitCount} commits queued for sync`, {
        timeout: 5e3
      });
    }
  }
  /**
   * Notify about accumulated unsynced commits (health monitoring)
   */
  async notifyUnsyncedAccumulation(count, threshold = 50) {
    if (count < threshold) {
      return;
    }
    const verbosity = this.getVerbosity();
    if (verbosity === "quiet") {
      return;
    }
    this.setSyncStatus("pending" /* Pending */, `${count} unsynced`);
    const message = `\u26A0\uFE0F ${count} unsynced commits. Consider syncing to cloud.`;
    const action = await this.showToast("warning" /* Warning */, message, {
      actions: ["Sync Now", "Dismiss"]
    });
    if (action === "Sync Now") {
      vscode7.commands.executeCommand("commitDiary.syncNow");
    }
  }
  /**
   * Show progress notification with cancellation support
   */
  async showProgress(title, task, cancellable = false) {
    return vscode7.window.withProgress(
      {
        location: vscode7.ProgressLocation.Notification,
        title: `CommitDiary: ${title}`,
        cancellable
      },
      task
    );
  }
  /**
   * Dispose resources
   */
  dispose() {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }
    this.processBatchQueue();
  }
};

// src/extension.ts
var statusBarItem;
var debounceTimer = null;
var gitWatcher = null;
var currentRepoRoot = null;
var commitCacheMap = /* @__PURE__ */ new Map();
var syncManager = null;
var authManager = null;
var notificationManager = null;
var currentBranch = null;
var lastCommitCount = 0;
async function checkFirstRunAndPromptRegistration(context, auth, output) {
  const hasSeenWelcome = context.globalState.get("hasSeenWelcome", false);
  const hasApiKey = await auth.isAuthenticated();
  output.appendLine(`[FirstRun] hasSeenWelcome: ${hasSeenWelcome}, hasApiKey: ${hasApiKey}`);
  if (!hasSeenWelcome && !hasApiKey) {
    output.appendLine("[FirstRun] Showing registration prompt...");
    await auth.promptRegistration();
    await context.globalState.update("hasSeenWelcome", true);
  } else if (!hasApiKey) {
    setTimeout(async () => {
      const stillNoKey = !await auth.isAuthenticated();
      if (stillNoKey) {
        output.appendLine("[FirstRun] Showing delayed registration reminder...");
        const action = await vscode8.window.showInformationMessage(
          "\u{1F4A1} CommitDiary: Enable cloud sync to backup your commits",
          "Get API Key",
          "Dismiss"
        );
        if (action === "Get API Key") {
          await auth.promptRegistration();
        }
      }
    }, 3e4);
  }
  context.subscriptions.push(
    vscode8.workspace.onDidChangeConfiguration(async (e) => {
      if (e.affectsConfiguration("commitDiary.apiKey")) {
        const newApiKey = vscode8.workspace.getConfiguration("commitDiary").get("apiKey", "").trim();
        if (newApiKey && syncManager) {
          output.appendLine("[FirstRun] \u2705 API key detected! Starting initial sync...");
          const isValid = await auth.validateApiKey(newApiKey);
          if (isValid) {
            vscode8.window.showInformationMessage(
              "\u2705 CommitDiary: API key validated! Scanning and syncing your commits...",
              "View Output"
            ).then((action) => {
              if (action === "View Output") {
                output.show();
              }
            });
            await syncManager.startAutoSync();
            output.appendLine("[FirstRun] Triggering automatic commit scan...");
            setTimeout(async () => {
              try {
                await vscode8.commands.executeCommand("commitDiary.showMyCommits");
                output.appendLine("[FirstRun] \u2705 Initial scan and sync complete!");
              } catch (error) {
                output.appendLine(`[FirstRun] \u274C Scan failed: ${error}`);
              }
            }, 1e3);
          } else {
            vscode8.window.showErrorMessage(
              "\u274C CommitDiary: Invalid API key. Please check and try again.",
              "Open Settings"
            ).then((action) => {
              if (action === "Open Settings") {
                vscode8.commands.executeCommand("workbench.action.openSettings", "commitDiary.apiKey");
              }
            });
          }
        }
      }
    })
  );
}
async function activate(context) {
  const output = vscode8.window.createOutputChannel("CommitDiary");
  output.appendLine("CommitDiary activated!");
  try {
    await initDB(context);
    output.appendLine("\u2705 Database initialized");
  } catch (error) {
    output.appendLine(`\u274C Database initialization failed: ${error}`);
    vscode8.window.showErrorMessage(`CommitDiary: Database initialization failed: ${error}`);
  }
  statusBarItem = vscode8.window.createStatusBarItem(vscode8.StatusBarAlignment.Left, 100);
  context.subscriptions.push(statusBarItem);
  notificationManager = new NotificationManager(output, statusBarItem);
  syncManager = new SyncManager(context, output, notificationManager);
  authManager = new AuthManager(context, output);
  await checkFirstRunAndPromptRegistration(context, authManager, output);
  const initialRoot = vscode8.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (initialRoot) {
    output.appendLine(`[Activation] Scanning initial workspace: ${initialRoot}`);
    await scanAndSaveRepository(initialRoot);
  } else {
    output.appendLine("[Activation] No workspace folder found");
  }
  output.appendLine("[Activation] Starting auto-sync...");
  try {
    await syncManager.startAutoSync();
    output.appendLine("[Activation] Auto-sync initialization complete");
  } catch (error) {
    output.appendLine(`[Activation] Auto-sync error: ${error}`);
  }
  const workspaceWatcher = vscode8.workspace.onDidChangeWorkspaceFolders(async (event) => {
    output.appendLine("[WorkspaceChange] Workspace folders changed, clearing cache and rescanning...");
    const foldersAdded = event.added.length;
    const foldersRemoved = event.removed.length;
    await notificationManager?.notifyWorkspaceChange(foldersAdded, foldersRemoved);
    commitCacheMap.clear();
    if (gitWatcher) {
      gitWatcher.dispose();
      gitWatcher = null;
      currentRepoRoot = null;
    }
    const newRoot = vscode8.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (newRoot) {
      await scanAndSaveRepository(newRoot);
      await updateStatusBar();
    }
  });
  context.subscriptions.push(workspaceWatcher);
  const configWatcher = vscode8.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration("commitDiary.defaultTimeRange") || e.affectsConfiguration("commitDiary.user.emails")) {
      output.appendLine("[Debug] Configuration changed, clearing cache...");
      commitCacheMap.clear();
      updateStatusBar();
    }
    if (e.affectsConfiguration("commitDiary.componentRules")) {
      output.appendLine("[Debug] Component rules changed, reloading detector...");
      reloadComponentDetector();
    }
    if (e.affectsConfiguration("commitDiary.sync")) {
      output.appendLine("[Debug] Sync configuration changed...");
      syncManager?.reloadConfig();
      syncManager?.startAutoSync();
    }
  });
  context.subscriptions.push(configWatcher);
  async function saveCommitsToDatabase(root, commits) {
    try {
      const git = esm_default(root);
      const remotes = await git.getRemotes(true);
      const remote = remotes.find((r) => r.name === "origin")?.refs.fetch || null;
      const repoName = root.split("/").pop() || "unknown";
      const repoId = getOrCreateRepo(root, repoName, remote, context);
      const componentDetector = getComponentDetector();
      for (const commit of commits) {
        const analysis = categorizeCommit(commit.message);
        const components = componentDetector.detectComponents(commit.files);
        const filesWithComponents = componentDetector.detectComponentsWithFiles(commit.files).map((f) => ({
          path: f.path,
          component: f.component || void 0
        }));
        const commitData = {
          sha: commit.sha,
          repoId,
          authorName: commit.authorName,
          authorEmail: commit.authorEmail,
          date: commit.date,
          message: commit.message,
          category: analysis.category,
          files: commit.files,
          components,
          diffSummary: void 0,
          contextTags: []
        };
        insertCommit(commitData, context);
        insertCommitFiles(commit.sha, filesWithComponents, context);
      }
      if (commits.length > 0) {
        const latestSha = commits[0].sha;
        updateRepoScanSha(repoId, latestSha, context);
      }
      output.appendLine(`[DB] Saved ${commits.length} commits to database (status: pending)`);
    } catch (error) {
      output.appendLine(`[DB] Error saving commits: ${error}`);
    }
  }
  async function scanAndSaveRepository(root) {
    try {
      output.appendLine(`[Scan] Starting repository scan: ${root}`);
      const git = esm_default(root);
      const isRepo = await git.checkIsRepo();
      if (!isRepo) {
        output.appendLine(`[Scan] Not a git repository: ${root}`);
        return;
      }
      const repoName = path3.basename(root);
      let remoteUrl = null;
      try {
        const remotes = await git.getRemotes(true);
        remoteUrl = remotes.find((r) => r.name === "origin")?.refs?.fetch || null;
      } catch (error) {
        output.appendLine(`[Scan] No remote found: ${error}`);
      }
      const repoId = getOrCreateRepo(root, repoName, remoteUrl, context);
      output.appendLine(`[Scan] Repository ID: ${repoId}`);
      let emails = await getUserEmails(root);
      let name = await getUserName(root);
      if (emails.length === 0 && name) {
        const discovered = await discoverRepoEmailsForName(root, name);
        if (discovered.length) {
          emails = discovered;
          output.appendLine(`[Scan] Discovered emails for ${name}: ${emails.join(", ")}`);
        }
      }
      if (emails.length === 0 && !name) {
        output.appendLine(`[Scan] No git user.email or user.name found. Set commitDiary.user.emails or run git config user.email.`);
        vscode8.window.showWarningMessage("CommitDiary: Set commitDiary.user.emails or configure git user.email for this repo.");
        return;
      }
      const identityRegex = buildIdentityRegex(emails, name ? [name] : []);
      output.appendLine(`[Scan] Identity regex: ${identityRegex}`);
      const timeRange = vscode8.workspace.getConfiguration("commitDiary").get("defaultTimeRange", "1 year");
      output.appendLine(`[Scan] Fetching commits for time range: ${timeRange}`);
      let commits = await getCommitsByIdentity(root, identityRegex, 500, "author", true, timeRange);
      if (commits.length === 0) {
        commits = await getCommitsByIdentity(root, identityRegex, 500, "committer", true, timeRange);
      }
      output.appendLine(`[Scan] Found ${commits.length} commits`);
      if (commits.length > 0) {
        const existingRepo = getRepoByPath(root);
        const isFirstCommit = !existingRepo || !existingRepo.last_scan_sha;
        await saveCommitsToDatabase(root, commits);
        const headSHA = await git.revparse(["HEAD"]);
        commitCacheMap.set(root, {
          repoPath: root,
          headSHA,
          commits,
          timestamp: Date.now(),
          timeRange
        });
        updateRepoScanSha(repoId, headSHA, context);
        currentBranch = await git.revparse(["--abbrev-ref", "HEAD"]);
        lastCommitCount = commits.length;
        setupGitWatcher(root);
        notificationManager?.updateStatusBar(commits.length, repoName);
        output.appendLine(`[Scan] Updated status bar: ${commits.length} commits`);
        try {
          if (isFirstCommit) {
            await notificationManager?.notifyFirstCommit(repoName);
          } else {
            await notificationManager?.notifyRepoDiscovered(repoName, commits.length);
          }
          output.appendLine(`[Scan] Notification sent successfully`);
        } catch (notifError) {
          output.appendLine(`[Scan] Notification error (non-fatal): ${notifError}`);
        }
        const hasApiKey = await authManager.isAuthenticated();
        output.appendLine(`[Scan] Has API key: ${hasApiKey}`);
        if (syncManager && hasApiKey) {
          output.appendLine(`[Scan] Triggering cloud sync for repo ${repoId}...`);
          try {
            const syncResult = await syncManager.syncToCloud(repoId);
            output.appendLine(`[Scan] Sync result: ${syncResult}`);
          } catch (error) {
            output.appendLine(`[Scan] Sync error: ${error}`);
          }
        } else {
          if (!syncManager) {
            output.appendLine(`[Scan] Skipping sync - sync manager not initialized`);
          } else if (!hasApiKey) {
            output.appendLine(`[Scan] Skipping sync - no API key configured`);
          }
        }
      } else {
        notificationManager?.updateStatusBar(0, repoName);
      }
    } catch (error) {
      output.appendLine(`[Scan] Error scanning repository: ${error}`);
      notificationManager?.updateStatusBar(0, "unknown");
    }
  }
  function setupGitWatcher(repoRoot) {
    if (gitWatcher) {
      gitWatcher.dispose();
    }
    currentRepoRoot = repoRoot;
    gitWatcher = vscode8.workspace.createFileSystemWatcher(
      `${repoRoot}/.git/{refs/**,HEAD,index}`,
      false,
      true,
      false
    );
    gitWatcher.onDidChange(() => scheduleStatusUpdate());
    gitWatcher.onDidCreate(() => scheduleStatusUpdate());
    gitWatcher.onDidDelete(() => scheduleStatusUpdate());
    context.subscriptions.push(gitWatcher);
  }
  async function scheduleStatusUpdate() {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    const config = vscode8.workspace.getConfiguration("commitDiary");
    const delay2 = config.get("debounceDelay", 2e3);
    debounceTimer = setTimeout(async () => {
      await updateStatusBarWithNotifications();
    }, delay2);
  }
  async function updateStatusBarWithNotifications() {
    if (!currentRepoRoot) return;
    try {
      const git = esm_default(currentRepoRoot);
      const config = vscode8.workspace.getConfiguration("commitDiary");
      const newBranch = await git.revparse(["--abbrev-ref", "HEAD"]);
      const branchChanged = currentBranch && currentBranch !== newBranch;
      if (branchChanged) {
        output.appendLine(`[BranchSwitch] Branch changed: ${currentBranch} \u2192 ${newBranch}`);
        await notificationManager?.notifyBranchSwitch(currentBranch, newBranch);
        const autoDiff = config.get("commitDiary.autoDiff.onBranchSwitch", true);
        if (autoDiff) {
          commitCacheMap.delete(currentRepoRoot);
        }
      }
      currentBranch = newBranch;
      await updateStatusBar();
      const repoName = path3.basename(currentRepoRoot);
      const commitCount = lastCommitCount;
      const newCommitCount = await getCommitCountForRepo(currentRepoRoot);
      if (commitCount > 0 && newCommitCount > commitCount) {
        const newCommits = newCommitCount - commitCount;
        output.appendLine(`[NewCommits] Detected ${newCommits} new commits`);
        await notificationManager?.notifyNewCommits(newCommits);
        const autoSync = config.get("commitDiary.autoSync.onDetection", true);
        if (autoSync && authManager && await authManager.isAuthenticated()) {
          output.appendLine(`[AutoSync] Triggering automatic sync...`);
          const repo = getRepoByPath(currentRepoRoot);
          if (repo) {
            await scanAndSaveRepository(currentRepoRoot);
            await syncManager?.syncToCloud(repo.id);
          }
        }
      }
      lastCommitCount = newCommitCount;
    } catch (e) {
      output.appendLine(`[StatusUpdate] Error: ${e}`);
    }
  }
  async function getCommitCountForRepo(repoPath) {
    try {
      const cachedData = commitCacheMap.get(repoPath);
      if (cachedData) {
        return cachedData.commits.length;
      }
      const git = esm_default(repoPath);
      let emails = await getUserEmails(repoPath);
      let name = await getUserName(repoPath);
      if (emails.length === 0 && name) {
        const discovered = await discoverRepoEmailsForName(repoPath, name);
        if (discovered.length) emails = discovered;
      }
      if (emails.length === 0 && !name) return 0;
      const identityRegex = buildIdentityRegex(emails, name ? [name] : []);
      const timeRange = vscode8.workspace.getConfiguration("commitDiary").get("defaultTimeRange", "1 year");
      let commits = await getCommitsByIdentity(repoPath, identityRegex, 500, "author", false, timeRange);
      if (commits.length === 0) {
        commits = await getCommitsByIdentity(repoPath, identityRegex, 500, "committer", false, timeRange);
      }
      return commits.length;
    } catch (e) {
      return 0;
    }
  }
  async function updateStatusBar() {
    if (!currentRepoRoot) return;
    try {
      const git = esm_default(currentRepoRoot);
      const config = vscode8.workspace.getConfiguration("commitDiary");
      const timeRange = config.get("defaultTimeRange", "1 year");
      const currentHeadSHA = await git.revparse(["HEAD"]);
      const cachedData = commitCacheMap.get(currentRepoRoot);
      const isCacheValid = cachedData && cachedData.headSHA === currentHeadSHA && cachedData.timeRange === timeRange;
      let commits;
      if (isCacheValid && cachedData) {
        commits = cachedData.commits;
      } else {
        let emails = await getUserEmails(currentRepoRoot);
        let name = await getUserName(currentRepoRoot);
        if (emails.length === 0 && name) {
          const discovered = await discoverRepoEmailsForName(currentRepoRoot, name);
          if (discovered.length) emails = discovered;
        }
        if (emails.length === 0 && !name) return;
        const identityRegex = buildIdentityRegex(emails, name ? [name] : []);
        commits = await getCommitsByIdentity(currentRepoRoot, identityRegex, 500, "author", false, timeRange);
        if (commits.length === 0) {
          commits = await getCommitsByIdentity(currentRepoRoot, identityRegex, 500, "committer", false, timeRange);
        }
        if (commits.length > 0) {
          commitCacheMap.set(currentRepoRoot, {
            repoPath: currentRepoRoot,
            headSHA: currentHeadSHA,
            commits,
            timestamp: Date.now(),
            timeRange
          });
        }
      }
      statusBarItem.text = `$(git-commit) \u{1F600} ${commits.length} commits`;
      statusBarItem.tooltip = "Click to view your commits \u{1F600}";
      statusBarItem.show();
      const repoName = path3.basename(currentRepoRoot);
      notificationManager?.updateStatusBar(commits.length, repoName);
    } catch (e) {
    }
  }
  const showMyCommits = vscode8.commands.registerCommand("commitDiary.showMyCommits", async () => {
    const root = vscode8.workspace.workspaceFolders?.[0]?.uri.fsPath || ".";
    output.appendLine(`[Debug] Workspace root: ${root}`);
    const git = esm_default(root);
    const isRepo = await git.checkIsRepo();
    if (!isRepo) {
      vscode8.window.showWarningMessage("CommitDiary: current workspace is not a Git repository.");
      output.appendLine("[Warn] Current workspace is not a Git repository.");
      output.show();
      return;
    }
    setupGitWatcher(root);
    updateStatusBar();
    let emails = await getUserEmails(root);
    let name = await getUserName(root);
    if (emails.length === 0 && name) {
      const discovered = await discoverRepoEmailsForName(root, name);
      if (discovered.length) {
        emails = discovered;
        output.appendLine(`[Debug] Discovered emails for ${name}: ${emails.join(", ")}`);
      }
    }
    if (emails.length === 0 && !name) {
      output.appendLine(`[Warn] No git user.email or user.name found. Set commitDiary.user.emails or run git config user.email.`);
      vscode8.window.showWarningMessage("CommitDiary: set commitDiary.user.emails or configure git user.email for this repo.");
      return;
    }
    const identityRegex = buildIdentityRegex(emails, name ? [name] : []);
    output.appendLine(`[Debug] Identity regex: ${identityRegex}`);
    const config = vscode8.workspace.getConfiguration("commitDiary");
    const timeRange = config.get("defaultTimeRange", "1 year");
    output.appendLine(`[Debug] Using timeRange: ${timeRange}`);
    const currentHeadSHA = await git.revparse(["HEAD"]);
    const cachedData = commitCacheMap.get(root);
    const isCacheValid = cachedData && cachedData.headSHA === currentHeadSHA && cachedData.timeRange === timeRange;
    let commits;
    output.appendLine(`[Debug] Fetching fresh data from repository...`);
    commits = await getCommitsByIdentity(root, identityRegex, 500, "author", true, timeRange);
    if (commits.length === 0) {
      output.appendLine(`[Debug] No author matches, trying committer\u2026`);
      commits = await getCommitsByIdentity(root, identityRegex, 500, "committer", true, timeRange);
    }
    if (commits.length > 0) {
      commitCacheMap.set(root, {
        repoPath: root,
        headSHA: currentHeadSHA,
        commits,
        timestamp: Date.now(),
        timeRange
      });
      output.appendLine(`[DB] Saving ${commits.length} commits to database...`);
      await saveCommitsToDatabase(root, commits);
      output.appendLine(`[DB] \u2705 Saved successfully`);
      const repo = getRepoByPath(root);
      if (repo && syncManager && await authManager.isAuthenticated()) {
        output.appendLine(`[Sync] Triggering cloud sync for repo ${repo.id}...`);
        await syncManager.syncToCloud(repo.id);
      }
    }
    output.appendLine(`[Debug] Fetched ${commits.length} commit(s) for identity=${identityRegex}.`);
    for (const c of commits) {
      const analysis = categorizeCommit(c.message);
      output.appendLine(`${c.date} \u2014 ${analysis.enhancedMessage}  -[${analysis.category}] ${analysis.originalMessage}`);
      for (const file of c.files) {
        output.appendLine(`  + ${file}`);
      }
    }
    output.show(true);
    if (commits.length === 0) {
      const hintSince = timeRange === "all" ? "entire history" : timeRange + " ago";
      output.appendLine(`[Hint] Run: git -C "${root}" shortlog -sne --all --since '${timeRange} ago' (check which email(s)/name(s) appear in history)`);
      vscode8.window.showInformationMessage(
        `No commits matched your identity in the ${hintSince}. Consider adding all your emails in Settings: commitDiary.user.emails, or check if your identity is configured correctly.`
      );
    }
  });
  context.subscriptions.push(showMyCommits);
  const refresh = vscode8.commands.registerCommand("commitDiary.refreshCount", async () => {
    const root = vscode8.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (root && await esm_default(root).checkIsRepo()) {
      setupGitWatcher(root);
      updateStatusBar();
    } else {
      vscode8.window.showWarningMessage("CommitDiary: No Git repository in current workspace.");
    }
  });
  context.subscriptions.push(refresh);
  const clearCache = vscode8.commands.registerCommand("commitDiary.clearCache", async () => {
    const root = vscode8.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) {
      vscode8.window.showWarningMessage("CommitDiary: No workspace open.");
      return;
    }
    const cacheSize = commitCacheMap.size;
    commitCacheMap.clear();
    output.appendLine(`[Debug] Cleared ${cacheSize} cached repo(s)`);
    output.show(true);
    await updateStatusBar();
    vscode8.window.showInformationMessage("CommitDiary: Cache cleared and refreshed.");
  });
  context.subscriptions.push(clearCache);
  const showMetrics = vscode8.commands.registerCommand("commitDiary.showMetrics", async () => {
    const root = vscode8.workspace.workspaceFolders?.[0]?.uri.fsPath || ".";
    output.appendLine(`[Debug] Workspace root: ${root}`);
    const git = esm_default(root);
    const isRepo = await git.checkIsRepo();
    if (!isRepo) {
      vscode8.window.showWarningMessage("CommitDiary: current workspace is not a Git repository.");
      output.appendLine("[Warn] Current workspace is not a Git repository.");
      output.show();
      return;
    }
    const timeRangeOptions = [
      { label: "1 week", value: "1 week" },
      { label: "2 weeks", value: "2 weeks" },
      { label: "1 month", value: "1 month" },
      { label: "3 months", value: "3 months" },
      { label: "6 months", value: "6 months" },
      { label: "1 year", value: "1 year" },
      { label: "2 years", value: "2 years" },
      { label: "All time", value: "all" }
    ];
    const selectedRange = await vscode8.window.showQuickPick(timeRangeOptions, {
      placeHolder: "Select time range for metrics",
      title: "CommitDiary Metrics - Time Range"
    });
    if (!selectedRange) return;
    const customTimeRange = selectedRange.value;
    output.appendLine(`[Debug] User selected time range: ${customTimeRange}`);
    let emails = await getUserEmails(root);
    let name = await getUserName(root);
    if (emails.length === 0 && name) {
      const discovered = await discoverRepoEmailsForName(root, name);
      if (discovered.length) {
        emails = discovered;
        output.appendLine(`[Debug] Discovered emails for ${name}: ${emails.join(", ")}`);
      }
    }
    if (emails.length === 0 && !name) {
      output.appendLine(`[Warn] No git user.email or user.name found.`);
      vscode8.window.showWarningMessage("CommitDiary: set commitDiary.user.emails or configure git user.email for this repo.");
      return;
    }
    const identityRegex = buildIdentityRegex(emails, name ? [name] : []);
    output.appendLine(`[Debug] Identity regex: ${identityRegex}`);
    output.appendLine(`[Debug] Fetching commits for time range: ${customTimeRange}`);
    let commits = await getCommitsByIdentity(root, identityRegex, 1e3, "author", false, customTimeRange);
    if (commits.length === 0) {
      commits = await getCommitsByIdentity(root, identityRegex, 1e3, "committer", false, customTimeRange);
    }
    output.appendLine(`[Debug] Fetched ${commits.length} commit(s).`);
    if (commits.length === 0) {
      output.appendLine(`[Warn] No commits found in the selected time range.`);
      vscode8.window.showInformationMessage(`No commits found in ${customTimeRange}.`);
      output.show(true);
      return;
    }
    const categoryStats = {};
    const dailyStats = {};
    const monthlyStats = {};
    const componentStats = {};
    for (const c of commits) {
      const analysis = categorizeCommit(c.message);
      categoryStats[analysis.category] = (categoryStats[analysis.category] || 0) + 1;
      const date = new Date(c.date);
      const dayKey = date.toISOString().slice(0, 10);
      const monthKey = date.toISOString().slice(0, 7);
      dailyStats[dayKey] = (dailyStats[dayKey] || 0) + 1;
      monthlyStats[monthKey] = (monthlyStats[monthKey] || 0) + 1;
      const componentMatch = c.message.match(/(?:\w+\()?([a-zA-Z0-9_-]+)(?:\)|:)/);
      if (componentMatch) {
        const component = componentMatch[1];
        if (!["feat", "fix", "docs", "test", "chore", "build", "ci", "perf", "style", "refactor"].includes(component.toLowerCase())) {
          componentStats[component] = (componentStats[component] || 0) + 1;
        }
      }
    }
    const startDate = commits[commits.length - 1]?.date.slice(0, 10);
    const endDate = commits[0]?.date.slice(0, 10);
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    const calendarDays = Math.ceil((endDateObj.getTime() - startDateObj.getTime()) / (1e3 * 60 * 60 * 24)) + 1;
    const activeDays = Object.keys(dailyStats).length;
    output.appendLine(`
${"=".repeat(60)}`);
    output.appendLine(`\u{1F4CA} COMMIT METRICS - ${customTimeRange.toUpperCase()}`);
    output.appendLine(`${"=".repeat(60)}
`);
    output.appendLine(`\u{1F4C8} Total Commits: ${commits.length}`);
    output.appendLine(`\u{1F4C5} Date Range: ${startDate} \u2192 ${endDate} (${calendarDays} calendar days)`);
    output.appendLine(`\u{1F4C6} Active Days: ${activeDays} days with commits`);
    output.appendLine(``);
    output.appendLine(`\u{1F3F7}\uFE0F  COMMITS BY CATEGORY:`);
    output.appendLine(`${"\u2500".repeat(60)}`);
    const sortedCategories = Object.entries(categoryStats).sort((a, b) => b[1] - a[1]);
    for (const [category, count] of sortedCategories) {
      const percentage = (count / commits.length * 100).toFixed(1);
      const bar = "\u2588".repeat(Math.floor(count / commits.length * 40));
      output.appendLine(`  ${category.padEnd(12)} ${count.toString().padStart(4)} (${percentage.padStart(5)}%)  ${bar}`);
    }
    output.appendLine(``);
    output.appendLine(`\u{1F4C5} COMMITS BY MONTH (Top 12):`);
    output.appendLine(`${"\u2500".repeat(60)}`);
    const sortedMonths = Object.entries(monthlyStats).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 12);
    for (const [month, count] of sortedMonths) {
      const bar = "\u2593".repeat(Math.floor(count / Math.max(...Object.values(monthlyStats)) * 30));
      output.appendLine(`  ${month}  ${count.toString().padStart(4)} commits  ${bar}`);
    }
    output.appendLine(``);
    if (Object.keys(componentStats).length > 0) {
      output.appendLine(`\u{1F527} TOP COMPONENTS (Top 10):`);
      output.appendLine(`${"\u2500".repeat(60)}`);
      const sortedComponents = Object.entries(componentStats).sort((a, b) => b[1] - a[1]).slice(0, 10);
      for (const [component, count] of sortedComponents) {
        const percentage = (count / commits.length * 100).toFixed(1);
        output.appendLine(`  ${component.padEnd(25)} ${count.toString().padStart(4)} (${percentage.padStart(5)}%)`);
      }
      output.appendLine(``);
    }
    const maxDayCommits = Math.max(...Object.values(dailyStats));
    const productiveDay = Object.entries(dailyStats).find(([_, count]) => count === maxDayCommits)?.[0];
    output.appendLine(`\u{1F525} Most Productive Day: ${productiveDay} (${maxDayCommits} commits)`);
    const avgPerCalendarDay = (commits.length / calendarDays).toFixed(3);
    const avgPerActiveDay = (commits.length / activeDays).toFixed(2);
    output.appendLine(`\u{1F4CA} Average Commits/Day (calendar): ${avgPerCalendarDay}`);
    output.appendLine(`\u{1F4CA} Average Commits/Day (active days): ${avgPerActiveDay}`);
    output.appendLine(`
${"=".repeat(60)}
`);
    output.show(true);
  });
  context.subscriptions.push(showMetrics);
  const discover = vscode8.commands.registerCommand("commitDiary.discoverRepos", async () => {
    try {
      const repos = await discoverRepositories();
      output.appendLine(`Discovered ${repos.length} repo(s).`);
      for (const r of repos) output.appendLine(`- [${r.source}] ${r.rootPath}`);
      output.show(true);
    } catch (e) {
      output.appendLine(`[Error] repo discovery failed: ${e.message}`);
      vscode8.window.showErrorMessage(String(e));
    }
  });
  context.subscriptions.push(discover);
  const setupApiKeyCommand = vscode8.commands.registerCommand("commitDiary.login", async () => {
    if (!authManager) {
      vscode8.window.showErrorMessage("CommitDiary: Authentication manager not initialized");
      return;
    }
    const isAuth = await authManager.isAuthenticated();
    if (isAuth) {
      vscode8.window.showInformationMessage("CommitDiary: Cloud sync is already configured!");
      return;
    }
    await authManager.showApiKeyInstructions();
  });
  context.subscriptions.push(setupApiKeyCommand);
  const clearApiKeyCommand = vscode8.commands.registerCommand("commitDiary.logout", async () => {
    if (!authManager) return;
    const confirm = await vscode8.window.showWarningMessage(
      "Are you sure you want to remove your API key? Cloud sync will be disabled.",
      { modal: true },
      "Yes, Remove It",
      "Cancel"
    );
    if (confirm === "Yes, Remove It") {
      await authManager.clearApiKey();
    }
  });
  context.subscriptions.push(clearApiKeyCommand);
  const syncNowCommand = vscode8.commands.registerCommand("commitDiary.syncNow", async () => {
    if (!syncManager) {
      vscode8.window.showErrorMessage("CommitDiary: Sync manager not initialized");
      return;
    }
    const root = vscode8.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) {
      vscode8.window.showWarningMessage("CommitDiary: No workspace open");
      return;
    }
    const repo = getRepoByPath(root);
    if (!repo) {
      vscode8.window.showWarningMessage("CommitDiary: Repository not found in database. Please scan first.");
      return;
    }
    await vscode8.window.withProgress({
      location: vscode8.ProgressLocation.Notification,
      title: "CommitDiary: Syncing commits...",
      cancellable: false
    }, async () => {
      const success = await syncManager.syncToCloud(repo.id);
      if (success) {
        vscode8.window.showInformationMessage("CommitDiary: Sync completed successfully");
      } else {
        vscode8.window.showWarningMessage("CommitDiary: Sync failed. Check output for details.");
        output.show();
      }
    });
  });
  context.subscriptions.push(syncNowCommand);
  const forceFullResyncCommand = vscode8.commands.registerCommand("commitDiary.forceFullResync", async () => {
    const confirm = await vscode8.window.showWarningMessage(
      "This will reset sync status and re-sync all commits to cloud. Continue?",
      "Yes",
      "No"
    );
    if (confirm !== "Yes") return;
    const root = vscode8.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) return;
    const repo = getRepoByPath(root);
    if (!repo) {
      vscode8.window.showWarningMessage("CommitDiary: Repository not found. Please scan first.");
      return;
    }
    const repoId = repo.id;
    const db2 = (init_db(), __toCommonJS(db_exports)).getDB();
    db2.run(
      `UPDATE commits 
       SET sync_status = 'pending', 
           synced_at = NULL, 
           sync_batch_id = NULL, 
           sync_error = NULL 
       WHERE repo_id = ?`,
      [repoId]
    );
    db2.run(
      `UPDATE repos 
       SET last_synced_sha = NULL, 
           last_synced_at = NULL, 
           sync_lock = NULL 
       WHERE id = ?`,
      [repoId]
    );
    (init_db(), __toCommonJS(db_exports)).saveDB(context);
    output.appendLine("[ForceResync] Reset sync status for all commits to pending");
    commitCacheMap.clear();
    await updateStatusBar();
    if (syncManager && await authManager.isAuthenticated()) {
      await vscode8.window.withProgress({
        location: vscode8.ProgressLocation.Notification,
        title: "CommitDiary: Re-syncing all commits...",
        cancellable: false
      }, async () => {
        const success = await syncManager.syncToCloud(repoId);
        if (success) {
          vscode8.window.showInformationMessage("CommitDiary: Full resync completed!");
        } else {
          vscode8.window.showWarningMessage("CommitDiary: Resync failed. Check output.");
          output.show();
        }
      });
    } else {
      vscode8.window.showInformationMessage("CommitDiary: Sync status reset. Sync will occur on next scheduled run.");
    }
  });
  context.subscriptions.push(forceFullResyncCommand);
  const exportDBCommand = vscode8.commands.registerCommand("commitDiary.exportDB", async () => {
    try {
      const dbPath = exportDatabaseFile(context);
      const uri = vscode8.Uri.file(dbPath);
      const saveUri = await vscode8.window.showSaveDialog({
        defaultUri: uri,
        filters: {
          "SQLite Database": ["sqlite", "db"]
        }
      });
      if (saveUri) {
        const fs2 = require("fs");
        fs2.copyFileSync(dbPath, saveUri.fsPath);
        vscode8.window.showInformationMessage(`CommitDiary: Database exported to ${saveUri.fsPath}`);
      }
    } catch (error) {
      vscode8.window.showErrorMessage(`Export failed: ${error}`);
    }
  });
  context.subscriptions.push(exportDBCommand);
  const checkSyncStatusCommand = vscode8.commands.registerCommand("commitDiary.checkSyncStatus", async () => {
    try {
      const root = vscode8.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!root) {
        vscode8.window.showErrorMessage("No workspace folder open");
        return;
      }
      const repo = getRepoByPath(root);
      if (!repo) {
        vscode8.window.showErrorMessage("Repository not found in database. Please scan first.");
        return;
      }
      const repoId = repo.id;
      const { getSyncStats: getSyncStats2, getUnsyncedCommits: getUnsyncedCommits2 } = (init_db(), __toCommonJS(db_exports));
      const stats = getSyncStats2(repoId);
      output.appendLine("\n" + "=".repeat(60));
      output.appendLine("SYNC STATUS DIAGNOSTIC");
      output.appendLine("=".repeat(60));
      output.appendLine(`Repo: ${repo.name} (ID: ${repoId})`);
      output.appendLine(`Path: ${repo.path}`);
      output.appendLine(`Sync Lock: ${repo.sync_lock || "None"}`);
      output.appendLine(`Last Synced SHA: ${repo.last_synced_sha || "None"}`);
      output.appendLine(`Last Synced At: ${repo.last_synced_at || "Never"}`);
      output.appendLine("");
      output.appendLine("Commit Status Breakdown:");
      let totalCommits = 0;
      for (const stat of stats) {
        const status = stat[0];
        const count = stat[1];
        totalCommits += count;
        const emoji = status === "synced" ? "\u2705" : status === "pending" ? "\u23F3" : status === "syncing" ? "\u{1F504}" : "\u274C";
        output.appendLine(`  ${emoji} ${status.padEnd(10)}: ${count} commits`);
      }
      output.appendLine(`
  TOTAL: ${totalCommits} commits`);
      const unsynced = getUnsyncedCommits2(repoId, 5);
      if (unsynced.length > 0) {
        output.appendLine("\nSample Unsynced Commits (first 5):");
        for (const commit of unsynced) {
          const sha = commit[0];
          const message = commit[6];
          const syncStatus = commit[12];
          const shortMessage = message.length > 50 ? message.substring(0, 50) + "..." : message;
          output.appendLine(`  ${sha.substring(0, 7)}: ${shortMessage} [${syncStatus}]`);
        }
      } else {
        output.appendLine("\n\u2705 No unsynced commits found!");
      }
      output.appendLine("\n" + "=".repeat(60) + "\n");
      output.show();
      vscode8.window.showInformationMessage("Sync status diagnostic complete. Check output.");
    } catch (error) {
      output.appendLine(`[Diagnostic] Error: ${error}`);
      vscode8.window.showErrorMessage(`Diagnostic failed: ${error}`);
    }
  });
  context.subscriptions.push(checkSyncStatusCommand);
  const viewSyncedCommitsCommand = vscode8.commands.registerCommand("commitDiary.viewSyncedCommits", async () => {
    try {
      const root = vscode8.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!root) {
        vscode8.window.showErrorMessage("No workspace folder open");
        return;
      }
      const repo = getRepoByPath(root);
      if (!repo) {
        vscode8.window.showErrorMessage("Repository not found in database. Please scan first.");
        return;
      }
      const { getDB: getDB2 } = (init_db(), __toCommonJS(db_exports));
      const db2 = getDB2();
      const result = db2.exec(`
        SELECT sha, message, date, synced_at, sync_status
        FROM commits
        WHERE repo_id = ? AND sync_status = 'synced'
        ORDER BY date DESC
        LIMIT 20
      `, [repo.id]);
      if (!result || !result[0] || result[0].values.length === 0) {
        vscode8.window.showInformationMessage("No synced commits found");
        return;
      }
      output.appendLine("\n" + "=".repeat(60));
      output.appendLine("SYNCED COMMITS (Last 20)");
      output.appendLine("=".repeat(60) + "\n");
      for (const row of result[0].values) {
        const sha = row[0].substring(0, 7);
        const message = row[1].substring(0, 60);
        const date = row[2];
        const syncedAt = row[3];
        output.appendLine(`${sha} | ${date} | ${message}... | Synced: ${syncedAt}`);
      }
      output.appendLine(`
Total: ${result[0].values.length} commits shown
`);
      output.show();
    } catch (error) {
      output.appendLine(`[ViewSynced] Error: ${error}`);
      vscode8.window.showErrorMessage(`Failed to view synced commits: ${error}`);
    }
  });
  context.subscriptions.push(viewSyncedCommitsCommand);
  const resetDatabaseCommand = vscode8.commands.registerCommand("commitDiary.resetDatabase", async () => {
    const confirm = await vscode8.window.showWarningMessage(
      "\u26A0\uFE0F Reset local database?\n\nThis will:\n\u2022 Delete all local commit data\n\u2022 Clear sync history\n\u2022 NOT affect your Supabase cloud data\n\nYou can rescan and re-sync commits after reset.",
      { modal: true },
      "Reset Database"
    );
    if (confirm !== "Reset Database") {
      return;
    }
    try {
      const { getDB: getDB2, saveDB: saveDB2 } = (init_db(), __toCommonJS(db_exports));
      const db2 = getDB2();
      output.appendLine("[Reset] Dropping all tables...");
      db2.run("DROP TABLE IF EXISTS commit_files");
      db2.run("DROP TABLE IF EXISTS commits");
      db2.run("DROP TABLE IF EXISTS repos");
      db2.run("DROP TABLE IF EXISTS sync_queue");
      db2.run("DROP TABLE IF EXISTS metrics_cache");
      db2.run("DROP TABLE IF EXISTS schema_version");
      saveDB2(context);
      output.appendLine("[Reset] \u2705 Database reset complete");
      output.appendLine("[Reset] Cloud data in Supabase is unchanged");
      const choice = await vscode8.window.showInformationMessage(
        "Database reset! Reload window to reinitialize and rescan commits.",
        "Reload Window",
        "Cancel"
      );
      if (choice === "Reload Window") {
        vscode8.commands.executeCommand("workbench.action.reloadWindow");
      }
    } catch (error) {
      output.appendLine(`[Reset] \u274C Error: ${error}`);
      vscode8.window.showErrorMessage(`Reset failed: ${error}`);
    }
  });
  context.subscriptions.push(resetDatabaseCommand);
}
function deactivate() {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  if (gitWatcher) {
    gitWatcher.dispose();
  }
  if (statusBarItem) {
    statusBarItem.dispose();
  }
  if (syncManager) {
    syncManager.stopAutoSync();
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate,
  deactivate
});
