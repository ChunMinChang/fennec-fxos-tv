"use strict";

/*
 * Each window object has the following properties
 *
 *                                 ┌ PresentationConnectionManager
 *           ┌ PresentationManager ┤
 *           │                     └ PresentationDeviceManager
 *   Window ─┤
 *           │
 *           └ CastingManager
 *
 *
 */

/*
 * XPCOM modules
 * ==================================
 */
const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/PageActions.jsm");
Cu.import("resource://gre/modules/Prompt.jsm");
Cu.import('resource://gre/modules/PresentationDeviceInfoManager.jsm');

/*
 * Debugging
 * ==================================
 */
// Debugger module
// -----------------------------
XPCOMUtils.defineLazyGetter(this, "Debugger", function() {
  let sandbox = {};
  Services.scriptloader.loadSubScript("chrome://fxostv/content/debugger.js", sandbox);
  return sandbox["Debugger"];
});

// Search devices manually
// -----------------------------
var gDiscoveryMenuId = null;
function discoveryDevices(win) {
  Debugger.log("### discoveryDevices ###");
  win.navigator.mozPresentationDeviceInfo.getAll()
  .then(function(devices) {

    if (devices === undefined || !devices.length) {
      return;
    }

    PresentationDevices.setList(devices);
    Debugger.log(PresentationDevices.getList());

  }, function(error) {
    Debugger.log(error);
  });

  win.NativeWindow.toast.show('Discovery presentaion devices', "short");
}



/*
 * Utils
 * ==================================
 */

// Create a string bundle for localization.
XPCOMUtils.defineLazyGetter(this, "Strings", function() {
  return Services.strings.createBundle("chrome://fxostv/locale/fxostv.properties");
});

// PageActionManager
// -----------------------------
// Dependence:
//   debugger.js
//   PageAction.jsm
XPCOMUtils.defineLazyGetter(this, "PageActionManager", function() {
  let sandbox = {};
  Services.scriptloader.loadSubScript("chrome://fxostv/content/pageActionManager.js", sandbox);
  return sandbox["PageActionManager"];
});

// Used to get window
function GetRecentWindow() {
	let window = Services.wm.getMostRecentWindow("navigator:browser");
	return window;
}


/*
 * Core Functions
 * ==================================
 */
// PresentationConnectionManager module
// -----------------------------
// Dependence:
//   debugger.js
//   Services.jsm
XPCOMUtils.defineLazyGetter(this, "PresentationConnectionManager", function() {
  let sandbox = {};
  Services.scriptloader.loadSubScript("chrome://fxostv/content/presentationConnectionManager.js", sandbox);
  return sandbox["PresentationConnectionManager"];
});

// PresentationDevices module
// -----------------------------
// Dependence:
//   debugger.js
XPCOMUtils.defineLazyGetter(this, "PresentationDevices", function() {
  let sandbox = {};
  Services.scriptloader.loadSubScript("chrome://fxostv/content/presentationDevices.js", sandbox);
  return sandbox["PresentationDevices"];
});

// PresentationDeviceManager module
// -----------------------------
// Dependence:
//   debugger.js
//   presentationDevices.js
//   CastingManager for the owner window
//     [function] initCastingManagerForWindow
//     [function] uninitCastingManagerForWindow
XPCOMUtils.defineLazyGetter(this, "PresentationDeviceManager", function() {
  let sandbox = {};
  Services.scriptloader.loadSubScript("chrome://fxostv/content/presentationDeviceManager.js", sandbox);
  return sandbox["PresentationDeviceManager"];
});

// PresentationManager module
// -----------------------------
// Dependence:
//   debugger.js
//   presentationConnectionManager.js
//   presentationDeviceManager.js
function PresentationManager() {}

PresentationManager.prototype = {
  connectionManager: null,
  deviceManager: null,

  init: function(window) {
    Debugger.log('# PresentationManager.init');

    if (!this.deviceManager) {
      Debugger.log('  >> Create a PresentationDeviceManager');
      this.deviceManager = new PresentationDeviceManager();
      this.deviceManager.init(window);
    }

    if (!this.connectionManager) {
      Debugger.log('  >> Create a PresentationConnectionManager');
      this.connectionManager = new PresentationConnectionManager();
      this.connectionManager.init(window);
    }
  },

  uninit:function(window) {
    Debugger.log('# PresentationManager.uninit');

    if (this.connectionManager) {
      this.connectionManager.uninit();
      this.connectionManager = null;
    }

    if (this.deviceManager) {
      this.deviceManager.uninit(window);
      this.deviceManager = null;
    }
  },
};

function initPresentationManagerForWindow(window) {
  Debugger.log('$$$ initPresentationManagerForWindow');

  if (!window.hasOwnProperty('presentationManager')) {
    Debugger.log('  >> Create PresentationManager for this window');
    window.presentationManager = new PresentationManager();
    window.presentationManager.init(window);
  }
}

function uninitPresentationManagerForWindow(window) {
  Debugger.log('$$$ uninitPresentationManagerForWindow');
  if (window.hasOwnProperty('presentationManager')) {
    Debugger.log('  >> Delete PresentationManager for this window');
    window.presentationManager.uninit();
    delete window.presentationManager;
  }
}


// CastingManager
// -----------------------------
// Dependence:
//   debugger.js
//   fxos.properties
//   PresentationManager for the CastingManager's owner window
//   PresentationDevices.js
//   PageActionManager.js
var CastingManager = function() {

    function _isCastingEnabled() {
      return Services.prefs.getBoolPref("browser.casting.enabled");
    }

    function _getCurrentURL(window) {
      return window.BrowserApp.selectedBrowser.currentURI.spec;
    }

    function _castVideo(window, target) {
      Debugger.log('# CastingManager._castVideo');
      var currentURL = _getCurrentURL(window);
      // window.alert('TODO: Cast video from page: ' + currentURL + '\n to ' + target.name + ': ' + target.id);
      if (window.presentationManager && window.presentationManager.connectionManager) {
        // cast video here...
      }
    }

    function _castWebpage(window, target) {
      Debugger.log('# CastingManager._castWebpage');
      var currentURL = _getCurrentURL(window);
      if (window.presentationManager && window.presentationManager.connectionManager) {
        // cast webpage here...
        var appURL = "app://notification-receiver.gaiamobile.org/index.html";
        window.presentationManager.connectionManager.connect(window, appURL, target).then(function(result) {
          window.NativeWindow.toast.show(Strings.GetStringFromName("toast.request.send"), "long");
          window.presentationManager.connectionManager.sendCommand("view", { "url": currentURL, "timestamp": Date.now() });
          window.presentationManager.connectionManager.close();
        }).catch(function(error){
          window.NativeWindow.toast.show(Strings.GetStringFromName("toast.request.fail"), "long");
          Debugger.log(error);
          window.presentationManager.connectionManager.terminate();
        });
      }
    }

    function _pinWebpageToHomescreen(window, target) {
      Debugger.log('# CastingManager._pinWebpageToHomescreen');
      var currentURL = _getCurrentURL(window);
      // window.alert('TODO: Pin webpage from page: ' + currentURL + '\n to ' + target.name + ': ' + target.id);
      if (window.presentationManager && window.presentationManager.connectionManager) {
        // pin webpage to home here...
      }
    }

    function _remoteControl(window, target) {
      Debugger.log('# CastingManager._remoteControl');
      Debugger.log(target);
      var currentURL = _getCurrentURL(window);
      if (window.presentationManager && window.presentationManager.connectionManager) {
        // remote control to TV here...
        var appURL = "app://notification-receiver.gaiamobile.org/index.html";
        window.presentationManager.connectionManager.connect(window, appURL, target).then(function(result) {
          window.NativeWindow.toast.show(Strings.GetStringFromName("toast.request.send"), "long");
          // We need to cast a webpage first
          window.presentationManager.connectionManager.sendCommand("view", { "url": currentURL, "timestamp": Date.now() });
          // and open a remote control tab
          Debugger.log(">> ip: " + target.id);
          Debugger.log(">> port and path: " + target.remoteControlPortAndPath);
          window.BrowserApp.addTab(target.id + target.remoteControlPortAndPath);
          // close the session
          window.presentationManager.connectionManager.close();
        }).catch(function(error){
          window.NativeWindow.toast.show(Strings.GetStringFromName("toast.request.fail"), "long");
          Debugger.log(error);
          window.presentationManager.connectionManager.terminate();
        });
      }
    }

    function _shouldCast(window) {
      var currentURL = _getCurrentURL(window);
      var validURL = currentURL.includes('http://') || currentURL.includes('https://');
      return validURL && window.presentationManager.deviceManager.deviceAvailable;
    }

    // TODO: Define conditions to cast video
    // reference: using 'mozAllowCasting' for video tag
    // https://dxr.mozilla.org/mozilla-central/source/mobile/android/chrome/content/browser.js#4341
    function _findCastableVideo(browser) {
      Debugger.log('# CastingManager._findCastableVideo');
      return false;
    }

    function _chooseAction(window) {
      Debugger.log('# CastingManager._chooseAction');
      var promptInfo = _promptInfoGenerator(window);

      var p = new Prompt({
        title: Strings.GetStringFromName("prompt.title")
      });

      p.setSingleChoiceItems(promptInfo.menu);

      p.show(function(data) {
        Debugger.log('  >> press button: ' + data.button);
        // Fire callbacks with corresponding target device
        // If user touches outside of this menu, then data.button = -1
        if (data.button > 0 && promptInfo.callbacks[data.button]) {
          promptInfo.callbacks[data.button](window, promptInfo.targets[data.button]);
        }
      });
    }

    function _promptInfoGenerator(window) {
      // Prompt menu
      var menu = [];

      // Callbacks for clicking menu
      var callbacks = {};

      // target device for callbacks
      var targetDevices = {};

      // Load devices information into prompt munu and set its callbacks
      var devices = PresentationDevices.getList();

      // Find whether or not there is video in content that can be casted
      var videoCastable = _findCastableVideo(window.BrowserApp.selectedBrowser);

      var key = 0;
      for (var i in devices) {
        // Assume every device has valid name
        menu.push({ label: devices[i].name, header: true });
        ++key;

        if (videoCastable && devices[i].castVideoEnabled) {
          menu.push({ label: Strings.GetStringFromName("prompt.sendVideo") });
          callbacks[key] = _castVideo;
          targetDevices[key] = devices[i];
          ++key;
        }

        if (devices[i].castPageEnabled) {
          menu.push({ label: Strings.GetStringFromName("prompt.sendURL") });
          callbacks[key] = _castWebpage;
          targetDevices[key] = devices[i];
          ++key;
        }

        if (devices[i].pinPageEnabled) {
          menu.push({ label: Strings.GetStringFromName("prompt.addURL") });
          callbacks[key] = _pinWebpageToHomescreen;
          targetDevices[key] = devices[i];
          ++key;
        }

        if (devices[i].remoteControlPortAndPath) {
          menu.push({ label: Strings.GetStringFromName("prompt.remoteControl") });
          callbacks[key] = _remoteControl;
          targetDevices[key] = devices[i];
          ++key;
        }
      }

      return { menu: menu, callbacks: callbacks, targets:targetDevices };
    }

    function _handleEvent(evt) {
      Debugger.log('# CastingManager._handleEvent: ' + evt.type);
      Debugger.log(evt);
      switch (evt.type) {
        case 'pageshow': {
          let domWindow = evt.currentTarget; //evt.currentTarget is ChromeWindow!
          let tab = domWindow.BrowserApp.getTabForWindow(evt.originalTarget.defaultView);
          _updatePageActionForTab(domWindow, tab);
          break;
        }
        case 'TabSelect': {
          let domWindow = evt.view; //evt.view and evt.currentTarget.ownerGlobal are ChromeWindow!
          let tab = domWindow.BrowserApp.getTabForBrowser(evt.target);
          _updatePageActionForTab(domWindow, tab);
          break;
        }
        default:
          Debugger.log('No event handler for this type');
          break;
      }
    }

    function _updatePageActionForTab(window, tab) {
      Debugger.log('# CastingManager._updatePageActionForTab');
      // We only care about events on the selected tab
      if (tab != window.BrowserApp.selectedTab) {
        return;
      }

      _updatePageAction(window);
    }

    function _updatePageAction(window) {
      Debugger.log('# CastingManager._updatePageAction');
      if (!_shouldCast(window)) {
        Debugger.log('  >> no need to cast!');
        PageActionManager.remove();
        return;
      }

      PageActionManager.add(() => _chooseAction(window));
    }

    function _getPageActionIcon(window) {
      const HDPI = "chrome://fxostv/content/cast-link-icons/cast-link-icon_22.png";
      const XHDPI = "chrome://fxostv/content/cast-link-icons/cast-link-icon_30.png";
      const XXHDPI = "chrome://fxostv/content/cast-link-icons/cast-link-icon_45.png";
      return (window.devicePixelRatio <= 1.5)?
               HDPI : (window.devicePixelRatio <= 2)?
                 XHDPI : XXHDPI;
    }

    function init(window) {
      Debugger.log('# CastingManager.init');

      if (!_isCastingEnabled()) {
        return;
      }

      PageActionManager.init(_getPageActionIcon(window),
                             Strings.GetStringFromName("pageaction.title"));

      // Reload pageActionIcon in URL bar after page has been loaded
      window.addEventListener("pageshow", _handleEvent, true);

      // Reload pageActionIcon after tab has been switched
      window.BrowserApp.deck.addEventListener("TabSelect", _handleEvent, true);

      // TODO: Remove pageAction when wifi is turned-off,
      // and reload it when wifi is turned-on.

      // Add pageActionIcon to URL bar if it need
      _updatePageAction(window);
    }

    function uninit(window) {
      Debugger.log('# CastingManager.uninit');
      PageActionManager.remove();
      window.removeEventListener('pageshow', _handleEvent);
      window.BrowserApp.deck.removeEventListener('TabSelect', _handleEvent);
    }

    return {
      init: init,
      uninit: uninit,
    };
};

function initCastingManagerForWindow(window) {
  Debugger.log('$$$ initCastingManagerForWindow');

  if (window.hasOwnProperty('castingManager')) {
    Debugger.log('  >> CastingManager already exist! Delete it first!');
    uninitCastingManagerForWindow(window);
  }

  Debugger.log('  >> Create CastingManager for this window');
  window.castingManager = new CastingManager();
  window.castingManager.init(window);
}

function uninitCastingManagerForWindow(window) {
  Debugger.log('$$$ uninitCastingManagerForWindow');
  if (window.hasOwnProperty('castingManager')) {
    Debugger.log('  >> Delete CastingManager for this window');
    window.castingManager.uninit(window);
    delete window.castingManager;
  }
}

/*
 * Program Flow Control
 * ==================================
 */
function loadIntoWindow(window) {
  Debugger.log('### loadIntoWindow: ');

  // Initialize PresentationManager for this window
  initPresentationManagerForWindow(window);

  // For Debug: Add a force-discovery into menu
  gDiscoveryMenuId = window.NativeWindow.menu.add("Discovery Devices", null, function() { discoveryDevices(window); });
}

function unloadFromWindow(window) {
  Debugger.log('### unloadFromWindow');

  // For Debug: Remove the force-discovery from menu
  if (gDiscoveryMenuId) {
    window.NativeWindow.menu.remove(gDiscoveryMenuId);
  }

  // Remove CastingManager from this window
  uninitCastingManagerForWindow(window);

  // Remove PresentationManager from this window
  uninitPresentationManagerForWindow(window);
}



/**
 * bootstrap.js API
 */
var windowListener = {
  onOpenWindow: function(aWindow) {
    Debugger.log('windowListener >> onOpenWindow');
    // Wait for the window to finish loading
    let domWindow = aWindow.QueryInterface(Ci.nsIInterfaceRequestor)
                           .getInterface(Ci.nsIDOMWindow);
    function loadListener() {
      Debugger.log('  >> loadListener()');
      domWindow.removeEventListener("load", loadListener, false);
      loadIntoWindow(domWindow);
    }
    domWindow.addEventListener("load", loadListener, false);
  },

  onCloseWindow: function(aWindow) {
    Debugger.log('windowListener >> onCloseWindow');
  },

  onWindowTitleChange: function(aWindow, aTitle) {
    Debugger.log('windowListener >> onWindowTitleChange');
  }
};

function startup(aData, aReason) {
  Debugger.log('startup!');
  // Load into any existing windows
  let windows = Services.wm.getEnumerator("navigator:browser");
  while (windows.hasMoreElements()) {
    let domWindow = windows.getNext().QueryInterface(Ci.nsIDOMWindow);
    loadIntoWindow(domWindow);
  }

  // Load into any new windows
  Services.wm.addListener(windowListener);
}

function shutdown(aData, aReason) {
  Debugger.log('shutdown!');
  // When the application is shutting down we normally don't have to clean
  // up any UI changes made
  if (aReason == APP_SHUTDOWN) {
    return;
  }

  // Stop listening for new windows
  Services.wm.removeListener(windowListener);

  // Unload from any existing windows
  let windows = Services.wm.getEnumerator("navigator:browser");
  while (windows.hasMoreElements()) {
    let domWindow = windows.getNext().QueryInterface(Ci.nsIDOMWindow);
    unloadFromWindow(domWindow);
  }
}

function install(aData, aReason) {
}

function uninstall(aData, aReason) {
}
