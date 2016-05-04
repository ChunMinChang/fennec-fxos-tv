"use strict";

/*
 * Each window object has the following properties
 *
 *                                 ┌ PresentationConnectionManager
 *           ┌ PresentationManager ┤
 *           │                     └ PresentationDeviceManager
 *   Window ─┤
 *           │
 *           └ ControlManager
 *
 *
 */

 /*
 * XPCOM modules
 * ==================================
 */
const { classes: Cc, interfaces: Ci, utils: Cu } = Components;
// const { classes: Cc, interfaces: Ci, utils: Cu, results: Cr, manager: Cm, Constructor: CC } = Components;

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/PageActions.jsm");
Cu.import("resource://gre/modules/Prompt.jsm");
Cu.import("resource://gre/modules/Snackbars.jsm");

/*
 * LazyGetter:
 *   You should not call the object defined in LazyGetter too early,
 *   e.g. in the global scope, or you will get nothing because it's not
 *   loaded!
 */

// An example of how to create a string bundle for localization.
XPCOMUtils.defineLazyGetter(this, "Strings", function() {
  return Services.strings.createBundle("chrome://fxostv/locale/fxostv.properties");
});

// An example of how to import a helper module.
XPCOMUtils.defineLazyGetter(this, "Helper", function() {
  let sandbox = {};
  Services.scriptloader.loadSubScript("chrome://fxostv/content/helper.js", sandbox);
  return sandbox["Helper"];
});

/*
 * Debugging
 * ==================================
 */
// logging
// -----------------------------
function debug(msg) {
  console.log(msg);
}

// Searching devices manually
// -----------------------------
var gDiscoveryMenuId = null;
function discoveryDevices(win) {
  debug("### discoveryDevices ###");
  win.navigator.mozPresentationDeviceInfo.getAll()
  .then(function(devices) {

    if (devices === undefined || !devices.length) {
      return;
    }

    PresentationDevices.setList(devices);
    debug(PresentationDevices.getList());

  }, function(error) {
    debug(error);
  });

  ShowMessage('Discovery presentaion devices', true);
}

// For window.PresentationRequest(URL).start()
// -----------------------------
var gStartRequestMenuId = null;
function startRequest(win) {
  let url = 'app://notification-receiver.gaiamobile.org/index.html'
  let request = new win.PresentationRequest(url);
  request.start().then(function(result){
    console.log('successfully!');
  }).catch(function(error){
    console.log('damn it!');
  });
}

/*
 * Utils
 * ==================================
 */
// Used to get window
function GetRecentWindow() {
	let window = Services.wm.getMostRecentWindow("navigator:browser");
	return window;
}

function CreateEnum(obj) {
  for (let key in obj) {
    obj[key] = key;
  }
  return obj;
}

function ShowMessage(aMsg, aLong) {
  Snackbars.show(aMsg, ((aLong)? Snackbars.LENGTH_LONG : Snackbars.LENGTH_LONG));
}

/*
 * J-PAKE over TLS
 * ==================================
 */
// Certificate module
// -----------------------------
// Dependence:
XPCOMUtils.defineLazyGetter(this, "Certificate", function() {
  let sandbox = {};
  Services.scriptloader.loadSubScript("chrome://fxostv/content/cert.js", sandbox);
  return sandbox["Cert"];
});

// Authentication module
// -----------------------------
// Dependence:
//   cert.js (Certificate module)
XPCOMUtils.defineLazyGetter(this, "Authenticators", function() {
  let sandbox = {};
  Services.scriptloader.loadSubScript("chrome://fxostv/content/auth.js", sandbox);
  return sandbox["Authenticators"];
});

// TLS Socket module
// -----------------------------
// Dependence:
//   XPCOMUtils.jsm (Use: Services.tm.currentThread)
//   auth.js (Authentication module)
//   cert.js (Certificate module)
XPCOMUtils.defineLazyGetter(this, "Socket", function() {
  let sandbox = {};
  Services.scriptloader.loadSubScript("chrome://fxostv/content/socket.js", sandbox);
  return sandbox["Socket"];
});
var gSocketMenuId = null;
function socketConnect(win) {
  Certificate.getOrCreate().then(function(aCert) {
    debug('-- Get Cert --');
    debug(aCert);

    let socket = new Socket(win);
    socket.connect({
      host: "192.168.1.104",
      port: 8080,
      authenticator: new (Authenticators.get().Client)(),
      cert: aCert,
    });
  }).catch(function(aError) {
    debug(aError);
  });
}

// J-PAKE module
// -----------------------------

// User Interface
// -----------------------------
var gRemoteControlUIMenuId;
const kRemoteControlUIURL = 'chrome://fxostv/content/remote-control-client/client.html';
function openRemoteControlUI(win) {
  let tab = win.BrowserApp.addTab(kRemoteControlUIURL);
}

/*
 * Presentation API
 * ==================================
 */
// PresentationDevices module
// -----------------------------
XPCOMUtils.defineLazyGetter(this, "PresentationDevices", function() {
  let sandbox = {};
  Services.scriptloader.loadSubScript("chrome://fxostv/content/presentationDevices.js", sandbox);
  return sandbox["PresentationDevices"];
});

// PresentationDeviceManager module
// -----------------------------
// Dependence:
//   presentationDevices.js
XPCOMUtils.defineLazyGetter(this, "PresentationDeviceManager", function() {
  let sandbox = {};
  Services.scriptloader.loadSubScript("chrome://fxostv/content/presentationDeviceManager.js", sandbox);
  return sandbox["PresentationDeviceManager"];
});

// PresentationConnectionManager module
// -----------------------------
XPCOMUtils.defineLazyGetter(this, "PresentationConnectionManager", function() {
  let sandbox = {};
  Services.scriptloader.loadSubScript("chrome://fxostv/content/presentationConnectionManager.js", sandbox);
  return sandbox["PresentationConnectionManager"];
});

// PresentationManager module
// -----------------------------
// Dependence:
//   presentationConnectionManager.js
//   presentationDeviceManager.js
function PresentationManager() {}

PresentationManager.prototype = {
  connectionManager: null,
  deviceManager: null,

  init: function(aWindow) {
    if (!this.deviceManager) {
      this.deviceManager = new PresentationDeviceManager();
      this.deviceManager.init(aWindow);
    }

    if (!this.connectionManager) {
      this.connectionManager = new PresentationConnectionManager();
      this.connectionManager.init(aWindow);
    }
  },

  uninit:function(aWindow) {
    if (this.deviceManager) {
      this.deviceManager.uninit(aWindow);
      this.deviceManager = null;
    }

    if (this.connectionManager) {
      this.connectionManager.uninit();
      this.connectionManager = null;
    }
  },
};

function initPresentationManager(aWindow) {
  if (!aWindow.hasOwnProperty('presentationManager')) {
    aWindow.presentationManager = new PresentationManager();
    aWindow.presentationManager.init(aWindow);
  }
}

function uninitPresentationManager(aWindow) {
  if (aWindow.hasOwnProperty('presentationManager')) {
    aWindow.presentationManager.uninit(aWindow);
    delete aWindow.presentationManager;
  }
}



/*
 * ControlManager
 * ==================================
 */
// PageActionManager module
// -----------------------------
// Dependence:
//   PageAction.jsm
XPCOMUtils.defineLazyGetter(this, "PageActionManager", function() {
  let sandbox = {};
  Services.scriptloader.loadSubScript("chrome://fxostv/content/pageActionManager.js", sandbox);
  return sandbox["PageActionManager"];
});

// ControlManager module
// -----------------------------
// Dependence:
//   PageActionManager.js
//   PresentationManager
//     - PresentationDeviceManager.js
//     - PresentationConnectionManager.js
var ControlManager = function() {

  // Utils
  // -------------------------------
  function _debug(aMsg) {
    console.log('# [ControlManager] ' + aMsg);
  }

  function _isCastable() {
    _debug('_isCastable');
    return Services.prefs.getBoolPref("browser.casting.enabled");
  }

  function _getCurrentURL(aWindow) {
    _debug('_getCurrentURL');
    return aWindow.BrowserApp.selectedBrowser.currentURI.spec;
  }

  function _shouldCast(aWindow) {
    _debug('_shouldCast');
    var currentURL = _getCurrentURL(aWindow);
    var validURL = currentURL.includes('http://') || currentURL.includes('https://');
    return validURL && aWindow.presentationManager.deviceManager.deviceAvailable;
  }

  // TODO: Define conditions to cast video
  // For send-video service
  // reference: using 'mozAllowCasting' for video tag
  // https://dxr.mozilla.org/mozilla-central/source/mobile/android/chrome/content/browser.js
  function _findCastableVideo() {
    return false;
  }

  // let _bundle = null;
  function _getString(aName) {
    _debug('_getString');
    // if (!_bundle) {
    //     _bundle = Services.strings.createBundle("chrome://fxostv/locale/fxostv.properties");
    // }
    // return _bundle.GetStringFromName(aName);
    return Strings.GetStringFromName(aName);
  }

  // Prompt UI
  // -------------------------------
  function _getPrompt(aTitle, aMenu) {
    _debug('_getPrompt');
    let p = new Prompt({
      title: aTitle,
    });

    p.setSingleChoiceItems(aMenu);

    return p;
  }

  function _getPromptInfo() {
    _debug('_getPromptInfo');
    // Prompt menu
    let menu = [];

    // Callbacks for clicking menu
    let callbacks = {};

    // target device for callbacks
    let targetDevices = {};

    // Load devices information into prompt munu and set its callbacks
    let devices = PresentationDevices.getList();

    // Find whether or not there is video in content that can be casted
    // let videoCastable = _findCastableVideo(window.BrowserApp.selectedBrowser);
    let videoCastable = _findCastableVideo();

    let buttonIndex = 0;
    for (let i in devices) {
      // Assume every device has a valid name
      menu.push({ label: devices[i].name, header: true });
      ++buttonIndex;

      // Add send page service
      addServiceToMenu(devices[i].sendPage,
                       _getString('service.sendPage'),
                       _sendPage,
                       devices[i]);

      // Add remote-control service
      addServiceToMenu(devices[i].remoteControlPort,
                       _getString('service.remoteControl'),
                       _remoteControl,
                       devices[i]);

      // Add video casting service
      addServiceToMenu(videoCastable && devices[i].sendVideo,
                       _getString('service.sendVideo'),
                       _castVideo,
                       devices[i]);

      // Add pin-page-to-homescreen service
      addServiceToMenu(devices[i].pinPage,
                       _getString('service.pinPage'),
                       _pinPageToHomescreen,
                       devices[i]);
    }

    function addServiceToMenu(aCondition, aLabel, aCallback, aTarget) {
      if (aCondition) {
        menu.push({ label: aLabel });
        callbacks[buttonIndex] = aCallback;
        targetDevices[buttonIndex] = aTarget;
        ++buttonIndex;
      }
    }

    return { menu: menu, callbacks: callbacks, targets: targetDevices };
  }

  function _showPrompt(aPrompt) {
    _debug('_showPrompt');

    let response = null;
    aPrompt.show(function(data) {
      response = data;
    });

    // Spin this thread while we wait for a result
    let thread = Services.tm.currentThread;
    while (response === null)
      thread.processNextEvent(true);

    return response;
  }

  // PageAction
  // -------------------------------
  function _chooseAction(aWindow) {
    _debug('_chooseAction');
    let promptInfo = _getPromptInfo();
    let prompt = _getPrompt(_getString('service.title'), promptInfo.menu);
    let response = _showPrompt(prompt);
    let index = response.button; // -1: outside of prompt menu, 0: header
    if (index > 0 && promptInfo.callbacks[index] && promptInfo.targets[index]) {
      let service = promptInfo.callbacks[index];
      let target = promptInfo.targets[index];
      service(aWindow, target);
    }
  }

  function _getPageActionIcon(aWindow) {
    _debug('_getPageActionIcon');
    const HDPI = "chrome://fxostv/content/cast-link-icons/cast-link-icon_22.png";
    const XHDPI = "chrome://fxostv/content/cast-link-icons/cast-link-icon_30.png";
    const XXHDPI = "chrome://fxostv/content/cast-link-icons/cast-link-icon_45.png";
    return (aWindow.devicePixelRatio <= 1.5)?
              HDPI : (aWindow.devicePixelRatio <= 2)?
                XHDPI : XXHDPI;
  }

  function _updatePageAction(aWindow) {
    _debug('_updatePageAction');
    if (!_shouldCast(aWindow)) {
      _debug('  >> no need to cast');
      PageActionManager.remove();
      return;
    }

    PageActionManager.add(() => _chooseAction(aWindow));
  }

  function _updatePageActionForTab(aWindow, aTab) {
    _debug('_updatePageActionForTab');

    if (!aWindow.BrowserApp || !aWindow.BrowserApp.selectedTab) {
      _debug('  >> there is no aWindow.BrowserApp.selectedTab!');
      return;
    }

    // We only care about events on the selected tab
    if (aTab != aWindow.BrowserApp.selectedTab) {
      return;
    }

    _updatePageAction(aWindow);
  }

  // Services
  // -------------------------------
  function _sendPage(aWindow, aTarget) {
    _debug('_sendPage');
    if (!aWindow.presentationManager ||
        !aWindow.presentationManager.connectionManager) {
      _debug('  >> there is no available PresentationConnectionManager');
      return;
    }

    // Close the presentation session after receiving 'ack'
    let listener = {
      ack: function(aMessage, aEvent) {
        _debug('terminate after receiving ack!');
        let win = GetRecentWindow();
        win.presentationManager.connectionManager.unregisterListener(this);
        win.presentationManager.connectionManager.terminate();
      },
    }
    aWindow.presentationManager.connectionManager.registerListener(listener);

    // Start connecting to TV
    let currentURL = _getCurrentURL(aWindow);
    let appURL = 'app://notification-receiver.gaiamobile.org/index.html';
    aWindow.presentationManager.connectionManager.start(aWindow, appURL, aTarget)
    .then(function(aResult) {
      // Show message: request sent
      ShowMessage(_getString('service.request.send'), true);
      // Request TV to show the page
      aWindow.presentationManager.connectionManager
      .sendCommand('view', {
        'url': currentURL,
        'timestamp': Date.now(),
      });
    }).catch(function(aError) {
      // Show message: request fail
      ShowMessage(_getString('service.request.fail'), true);
    });
  }

  function _remoteControl(aWindow, aTarget) {
    _debug('_remoteControl');
    if (!aWindow.presentationManager ||
        !aWindow.presentationManager.connectionManager) {
      _debug('  >> there is no available PresentationConnectionManager');
      return;
    }
  }

  function _castVideo(aWindow, aTarget) {
    _debug('_castVideo');
  }

  function _pinPageToHomescreen(aWindow, aTarget) {
    _debug('_pinPageToHomescreen');
  }

  // Event Listeners
  // -------------------------------
  function _handleEvent(aEvent) {
    _debug('_handleEvent: ' + aEvent.type);
    switch (aEvent.type) {
      case 'pageshow': {
        // aEvent.currentTarget is ChromeWindow!
        let domWindow = aEvent.currentTarget;
        // domWindow.BrowserApp might be null if window is Ci.nsIDOMWindow
        // instead of Ci.nsIDOMWindowInternal
        if (!domWindow.BrowserApp) {
          _debug('>> ther is no domWindow.BrowserApp!');
          domWindow = GetRecentWindow();
        }
        let tab = domWindow.BrowserApp.getTabForWindow(aEvent.originalTarget.defaultView);
        _updatePageActionForTab(domWindow, tab);
        break;
      }

      case 'TabSelect': {
        // aEvent.view and aEvent.currentTarget.ownerGlobal are ChromeWindow!
        let domWindow = aEvent.view;
        // domWindow.BrowserApp might be null if window is Ci.nsIDOMWindow
        // instead of Ci.nsIDOMWindowInternal
        if (!domWindow.BrowserApp) {
          _debug('>> ther is no domWindow.BrowserApp!');
          domWindow = GetRecentWindow();
        }
        let tab = domWindow.BrowserApp.getTabForBrowser(aEvent.target);
        _updatePageActionForTab(domWindow, tab);
        break;
      }

      default: {
        _debug('  no handler for this type!');
        break;
      }
    }
  }

  let _listener = null;
  function _listenDeviceChange(aWindow) {
    _debug('_listenDeviceChange');
    if (!aWindow.presentationManager ||
        !aWindow.presentationManager.deviceManager) {
      _debug('  >> there is no available PresentationDeviceManager');
      return;
    }

    // callback for _listener.add/update/remove
    let updatePageAction = function(evt) {
      // evt.target is PresentationDeviceInfoManager
      // and evt.target.ownerGlobal is ChromeWindow;
      _updatePageAction(evt.target.ownerGlobal);
    };
    _listener = {
      add: updatePageAction,
      update: updatePageAction,
      remove: updatePageAction,
    };

    // _listener = {
    //   add: function() { let win = GetRecentWindow() ; _updatePageAction(win); },
    //   update: function() { let win = GetRecentWindow() ; _updatePageAction(win); },
    //   remove: function() { let win = GetRecentWindow() ; _updatePageAction(win); },
    // };

    aWindow.presentationManager.deviceManager.registerListener(_listener);
  }

  function _removeListenerOnDeviceChange(aWindow) {
    _debug('_removeListenerOnDeviceChange');
    if (!aWindow.presentationManager ||
        !aWindow.presentationManager.deviceManager) {
      _debug('  >> there is no available PresentationDeviceManager');
      return;
    }

    if (!_listener) {
      _debug('  >> there is used _listener!');
      return;
    }

    aWindow.presentationManager.deviceManager.unregisterListener(_listener);
  }

  // Initializer
  // -------------------------------
  function _initializer(aWindow) {
    _debug('_initializer');

    // Reload pageAction after page has been loaded
    aWindow.addEventListener('pageshow', _handleEvent, true);

    // Reload pageAction after tab has been switched
    aWindow.BrowserApp.deck.addEventListener('TabSelect', _handleEvent, true);

    // TODO: Remove pageAction when wifi is turned-off,
    // and reload it when wifi is turned-on.

    // Init PageAction
    PageActionManager.init(_getPageActionIcon(aWindow),
                           _getString('pageaction.title'));

    // // Add pageAction if it need
    // _updatePageAction(aWindow);

    // Reload pageAction when PresentationDeviceManager receives devicechange
    _listenDeviceChange(aWindow);
  }

  function init(aWindow) {
    _debug('init');

    if (!_isCastable()) {
      _debug('  >> disallow for casting!');
      return;
    }

    // Call initializer() immediately if UI is ready
    if (aWindow.BrowserApp && aWindow.BrowserApp.deck) {
      _debug('Call initializer() immediately');
      _initializer(aWindow);
    // Wait for BrowserApp to initialize.
    } else {
      _debug('Wait for BrowserApp to initialize');
      aWindow.addEventListener('UIReady', function onUIReady() {
        aWindow.removeEventListener('UIReady', onUIReady, false);
        let win = GetRecentWindow();
        _initializer(win);
      }, false);
    }
  }

  function uninit(aWindow) {
    _debug('uninit');

    // Remove listeners
    aWindow.remoteEventListener('pageshow', _handleEvent);
    aWindow.BrowserApp.deck.removeEventListener('TabSelect', _handleEvent);

    // Remove listeners for devicechange
    _removeListenerOnDeviceChange(aWindow);

    // Uninit PageAction
    PageActionManager.uninit();
  }

  return {
    init: init,
    uninit: uninit,
  };
};

function initControlManager(aWindow) {
  if (!aWindow.hasOwnProperty('controlManager')) {
    aWindow.controlManager = new ControlManager();
    aWindow.controlManager.init(aWindow);
  }
}

function uninitControlManager(aWindow) {
  if (aWindow.hasOwnProperty('controlManager')) {
    aWindow.controlManager.uninit(aWindow);
    delete aWindow.controlManager;
  }
}



/*
 * Main
 * ==================================
 */
function loadIntoWindow(window) {
  console.log('Hello World!');
  // For Debug: Add a button in menu to do force-discovery
  gDiscoveryMenuId = window.NativeWindow.menu.add("Search Devices", null, function() { discoveryDevices(window); });
  // For Debug: Add a button in menu to do socket-connecting
  gSocketMenuId = window.NativeWindow.menu.add("Socket Connect", null, function() { socketConnect(window); });
  // For Debug: Add a button in menu to do window.PresentationRequest(URL).start()
  gStartRequestMenuId = window.NativeWindow.menu.add("Start Request", null, function() { startRequest(window); });
  // For Debug: Add a button in menu to do open Remote Control UI
  gRemoteControlUIMenuId = window.NativeWindow.menu.add("Open UI", null, function() { openRemoteControlUI(window); });

  // Initialize PresentationManager for this window
  initPresentationManager(window);

  // Initialize ControlManager for this window
  initControlManager(window);
}

function unloadFromWindow(window) {
  // For Debug: Remove the force-discovery from menu
  gDiscoveryMenuId && window.NativeWindow.menu.remove(gDiscoveryMenuId);
  // For Debug: Remove the socket-connecting from menu
  gSocketMenuId && window.NativeWindow.menu.remove(gSocketMenuId);
  // For Debug: Remove the start-request from menu
  gStartRequestMenuId && window.NativeWindow.menu.remove(gStartRequestMenuId);
  // For Debug: Remove the remoteControl UI button from menu
  gRemoteControlUIMenuId && window.NativeWindow.menu.remove(gRemoteControlUIMenuId);

  // Delete PresentationManager for this window
  uninitPresentationManager(window);

  // Delete ControlManager for this window
  uninitControlManager(window);
}

/**
 * bootstrap.js API
 */
var windowListener = {
  onOpenWindow: function(aWindow) {
    // Wait for the window to finish loading
    let domWindow = aWindow.QueryInterface(Ci.nsIInterfaceRequestor)
            .getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
    function loadListener() {
      domWindow.removeEventListener("load", loadListener, false);
      loadIntoWindow(domWindow);
    };
    domWindow.addEventListener("load", loadListener, false);
  },

  onCloseWindow: function(aWindow) {
  },

  onWindowTitleChange: function(aWindow, aTitle) {
  }
};

function startup(aData, aReason) {
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
