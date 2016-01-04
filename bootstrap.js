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
 * Images
 * ==================================
 */
 const ICON_HDPI = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABsAAAAWCAYAAAAxSueLAAAAAXNSR0IArs4c6QAAAOdJREFUSA3tlj0KwkAQhd8LqUQLD6EnsPMI4hkSiEX8KS30BNrYiiBBPYN4BUt7vYSgtjpOlHQjGHCtss2ws7PvzX7NLINOtw9gCpGyRjeLvKnwyKfIRAB3Rmn7+hACE1+NKul+kyx072YFUSypj+dG3lYtzGwuObMFxpzA7PICo80lZ7bAmBOYXf5XjAyj+JKNGbuf32R1fl09Icd4T9LfqFoqqv/ysc5c5T5O5zDqtYHHTBHXvjYnTxQO18l8a935aJYVB9GgCe/e0r9KA8K6mldBlChQNDirwFFrDyR3q+V8n92z4hNcNDP6qelDfAAAAABJRU5ErkJggg==";
 const ICON_XHDPI = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACQAAAAeCAYAAABE4bxTAAAAAXNSR0IArs4c6QAAAUtJREFUWAntl7tKxEAUhs85SWFjsz6Bha0KYuEFLCx8g1ia9QKSp8gj2CyKi5dtfQ8RFcQV7CwstPNSWiXHfxZcdiHkCMKOCzMQksxP5nz5MgMTTveyeSrLcyWaJSLG4aMpCj+QSCqkegaYOVD4gnECuMcAFlFVB/MvmmOJQdI30zk56l+PknBrZx+Ceo1llIV/UysAWZaCoWDIMmDlYQ4FQ5YBKw9zKBiyDFh5mENjZ4ixfSxB7WXrWmFLhZm7FYGXLsciUazb0OOgfjbaPmDcf1mXmJs+io9XTXMyN3ezzVK1hS869bdX4/dIJDttty7qxonqQpfd390+Li6sdJT1C/Qz6Jq0nhnKmV5F+GAi1rR9fHgzlFXcmIYGn8nzPH5+eVslKpaxApaQTcNcg4kbOBfo+8CAnzg/YcVcw8jVxvraZZIkxeA4ddff5klO7Te5Hm4AAAAASUVORK5CYII=";
 const ICON_XXHDPI = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADYAAAAtCAYAAADlVJiFAAAAAXNSR0IArs4c6QAAAf1JREFUaAXtms1KQkEUx88ZfYCgwha1CVr0AbWolvkEPUGFiB+oiyCC3Lp1FYSUaCYSPUPr3AUREaQEtWrjQl8guvd0pkVIKc29QpxbMyDemXvmzP+c34wDziBwiaVyW0hunggWuBrSbQEsDiK0CFWxUT2+wHgyu+0SnQcwkKGSFeKOcgnyQy0C+oKADhQAzQdU/1DZeklxYIFdU0MD0zGFB71t1Mo4qF1qWyyRoa/aNLE/WWxgQcNqiVliQjJgp6IQEMYyLDHjVAkxtMSEgDCWYYkZp0qIoSUmBISxDEvMOFVCDC0xISCMZVhixqkSYmiJCQFhLMMSM06VEEMc9PewEG0jydBT0RnJg8zODgeGbZna/KvSJ5tKIRT9u5DZUx/Xhu5ub+5XVtefEGiOZU7wJ6i/lPoM+gGU2tdn0DJTblX9wwx4PpKNJTO7CHhIRL+yFhGRLzbQXuO0fOSFj+fAtPN4KhslF854wFkvg3m2RXjmOxuJevXkymtfX1n/GGgmsqhAZZjeo9dBf7RHbKNSaZyeWvITlPbvi1i/MJ6SmEjnNh0XEuxsgymO9b83fkbocpKavNvU6tXSJU/BbzcBjH2x4ciB9Q9WKBTUS6ez7LxhlNvXgCjC37w34iSPNM71V673WHGXhff4ucP753UYQ81KpdQaNRj291neAeiAdCFRHoGDAAAAAElFTkSuQmCC";

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
Cu.import("resource://gre/modules/MulticastDNS.jsm");


// Create a string bundle for localization.
XPCOMUtils.defineLazyGetter(this, "Strings", function() {
  return Services.strings.createBundle("chrome://fxostv/locale/fxostv.properties");
});

// Import a helper module.
XPCOMUtils.defineLazyGetter(this, "Helper", function() {
  let sandbox = {};
  Services.scriptloader.loadSubScript("chrome://fxostv/content/helper.js", sandbox);
  return sandbox["Helper"];
});


/*
 * Utils
 * ==================================
 */

// Import a Debugger module.
XPCOMUtils.defineLazyGetter(this, "Debugger", function() {
  let sandbox = {};
  Services.scriptloader.loadSubScript("chrome://fxostv/content/debugger.js", sandbox);
  return sandbox["Debugger"];
});
// Enable the log
Debugger.enable = true;

// Used to get window
function GetRecentWindow() {
	let window = Services.wm.getMostRecentWindow("navigator:browser");
	return window;
}

// For Debugging
// ----------------------
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
 * Core Functions
 * ==================================
 */
// PresentationDevices
// ----------------------
// Import a presentationDevices module.
XPCOMUtils.defineLazyGetter(this, "PresentationDevices", function() {
  let sandbox = {};
  Services.scriptloader.loadSubScript("chrome://fxostv/content/presentationDevices.js", sandbox);
  return sandbox["PresentationDevices"];
});


// PresentationDeviceManager
// ----------------------
// Import a presentationDevices module.
XPCOMUtils.defineLazyGetter(this, "PresentationDeviceManager", function() {
  let sandbox = {};
  Services.scriptloader.loadSubScript("chrome://fxostv/content/presentationDeviceManager.js", sandbox);
  return sandbox["PresentationDeviceManager"];
});


// PresentationConnectionManager
// ----------------------
XPCOMUtils.defineLazyGetter(this, "PresentationConnectionManager", function() {
  let sandbox = {};
  Services.scriptloader.loadSubScript("chrome://fxostv/content/presentationConnectionManager.js", sandbox);
  return sandbox["PresentationConnectionManager"];
});

// PresentationManager
// ----------------------
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

    if (this.deviceManager) {
      this.deviceManager.uninit(window);
      this.deviceManager = null;
    }

    if (this.connectionManager) {
      this.connectionManager.uninit();
      this.connectionManager = null;
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
// ----------------------
var CastingManager = function() {

    var _pageActionIcon = null,
        _pageActionId = null;

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


    function _setPageActionIcon(window) {
      Debugger.log('# CastingManager._setPageActionIcon');
      // pageActionIncon has already been set
      if (_pageActionIcon) {
        Debugger.log('  >> pageActionIcon alreay exist!');
        return;
      }

      _pageActionIcon = (window.devicePixelRatio <= 1.5)?
                        ICON_HDPI : (window.devicePixelRatio <= 2)?
                                    ICON_XHDPI : ICON_XXHDPI;
    }

    function _addPageAction(window) {
      Debugger.log('# CastingManager._addPageAction');

      // Simulate a static variable to avoid adding pageAction multiple times.
      // This situation might happen when 'pageshow' or 'TabSelect' events are
      // fired in one webpage multiple times.
      if (typeof _addPageAction.isAdding !== 'undefined' &&
          _addPageAction.isAdding) {
        Debugger.log('  >> PageActions is adding now!');
        return;
      }
      _addPageAction.isAdding = true;

      if (_pageActionId) {
        Debugger.log('  >> PageActions already exist!');
        return;
      }

      if (!_pageActionIcon) {
        Debugger.log('  >> PageActionsIcon doesn\'t be set yet!');
        return;
      }

      _pageActionId = PageActions.add({
        icon: _pageActionIcon,
        title: Strings.GetStringFromName("pageaction.title"),
        clickCallback: () => _chooseAction(window)
      });

      Debugger.log('##### finish adding PageAction!');
      _addPageAction.isAdding = false;
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
          let domWindow = evt.currentTarget;
          let tab = domWindow.BrowserApp.getTabForWindow(evt.originalTarget.defaultView);
          _updatePageActionForTab(domWindow, tab);
          break;
        }
        case 'TabSelect': {
          let domWindow = evt.view; //evt.view is ChromeWindow!
          let tab = domWindow.BrowserApp.getTabForBrowser(evt.target);
          _updatePageActionForTab(domWindow, tab);
          break;
        }
        default:
          Debugger.log('No event handler for this type');
          break;
      }
    }

    function _removePageAction() {
      Debugger.log('# CastingManager._removePageAction');
      if (_pageActionId) {
        Debugger.log('  >> Remove existing PageActionIcon!');
        PageActions.remove(_pageActionId);
        _pageActionId = null;
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
        _removePageAction();
        return;
      }

      _addPageAction(window);
    }

    function init(window) {
      Debugger.log('# CastingManager.init');

      if (!_isCastingEnabled()) {
        return;
      }

      _setPageActionIcon(window);

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
      _removePageAction();
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

  // Remove PresentationManager from this window
  uninitPresentationManagerForWindow(window);

  // Remove CastingManager from this window
  uninitCastingManagerForWindow(window);

  // For Debug: Remove the force-discovery from menu
  if (gDiscoveryMenuId) {
    window.NativeWindow.menu.remove(gDiscoveryMenuId);
  }
}



/**
 * bootstrap.js API
 */
var windowListener = {
  onOpenWindow: function(aWindow) {
    Debugger.log('windowListener >> onOpenWindow');
    // Wait for the window to finish loading
    let domWindow = aWindow.QueryInterface(Ci.nsIInterfaceRequestor)
            .getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
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
  Debugger.log('install!');
}

function uninstall(aData, aReason) {
  Debugger.log('uninstall!');
}
