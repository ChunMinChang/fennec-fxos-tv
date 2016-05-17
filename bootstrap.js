"use strict";

/*
 * The high-level overview of architecture:
 *
 *
 *                                 ┌ PresentationConnectionManager
 *           ┌ PresentationManager ┤
 *           │                     └ PresentationDeviceManager
 *   Window ─┤                                ↑
 *           │                                │ Call
 *           └ UIActionManager                │
 *                 ↑                          │
 *                 │ Call                     │
 *                 │                          │
 *     RemoteControlManager          PresentationDevices
 *            │                               │
 *            └────┬──────────────────────────┘
 *               Global
 *
 *  PresentationDevices:
 *    Store all the information of the discovered presentaion-api devices
 *  PresentationDeviceManager:
 *    Use |window.navigator.mozPresentationDeviceInfo| to add, update, remove
 *    presentation devices
 *  PresentationConnectionManager:
 *    Use |window.PresentationRequest| to connect, disconnect, send commands
 *    to presentation devices
 *  PresentationManager:
 *    A interface to operate PresentationDeviceManager and
 *    PresentationConnectionManager. (This might be removed.)
 *  RemoteControlManager:
 *    Connect, disconnect, send and receive messages to/from Firefox OS TV
 *    via our secure channel. The remote-control secure channel is built on
 *    TLS. We use TLS to build a confidential channel, and then run J-PAKE
 *    for authentication.
 *  UIActionManager:
 *    Show/hide the pageAction and prompt UI depending on conditions.
 *    User can choose many ways to interact with FxOS TV by
 *    clicking different options on prompt UI.
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
Cu.import("resource://gre/modules/Snackbars.jsm");

/*
 * LazyGetter:
 *   You should NOT call the object defined in LazyGetter too early,
 *   e.g. in the global scope, or you will get nothing because it's not
 *   loaded!
 */

// An string bundle for localization.
XPCOMUtils.defineLazyGetter(this, "Strings", function() {
  return Services.strings.createBundle("chrome://fxostv/locale/fxostv.properties");
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
// To get window object
function GetRecentWindow() {
	let window = Services.wm.getMostRecentWindow("navigator:browser");
	return window;
}

// To simulate enum
function CreateEnum(obj) {
  for (let key in obj) {
    obj[key] = key;
  }
  return obj;
}

// To show message below the view
function ShowMessage(aMsg, aLong) {
  Snackbars.show(aMsg, ((aLong)? Snackbars.LENGTH_LONG : Snackbars.LENGTH_LONG));
}

/*
 * Remote Control: J-PAKE over TLS
 * ==================================
 */
// Certificate module
// -----------------------------
// To get client's certificate for building TLS channel.
// However, in our case, the server side(FxOS TV) doesn't use this.
// Dependence:
//   Components // for using Cc
XPCOMUtils.defineLazyGetter(this, "Certificate", function() {
  let sandbox = {};
  Services.scriptloader.loadSubScript("chrome://fxostv/content/cert.js", sandbox);
  return sandbox["Cert"];
});

// Authentication module
// -----------------------------
// To authenticate our TLS channel.
// However, the client(the add-on itself) doesn't use it. (We should remove it)
// Dependence:
//   cert.js (Certificate module)
XPCOMUtils.defineLazyGetter(this, "Authenticators", function() {
  let sandbox = {};
  Services.scriptloader.loadSubScript("chrome://fxostv/content/auth.js", sandbox);
  return sandbox["Authenticators"];
});

// TLS Socket module
// -----------------------------
// To build a confidential TLS channel without authentication
// Dependence:
//   Components // for using Cc, Ci, Cu
//   XPCOMUtils.jsm (Use: Services.tm.currentThread)
//   auth.js (Authentication module)
//   cert.js (Certificate module)
XPCOMUtils.defineLazyGetter(this, "Socket", function() {
  let sandbox = {};
  Services.scriptloader.loadSubScript("chrome://fxostv/content/socket.js", sandbox);
  return sandbox["Socket"];
});

// J-PAKE module
// -----------------------------
// To authenticate the confidential TLS channel
// Dependence:
//   Components // for using Cc, Ci
XPCOMUtils.defineLazyGetter(this, "JPAKE", function() {
  let sandbox = {};
  Services.scriptloader.loadSubScript("chrome://fxostv/content/jpake.js", sandbox);
  return sandbox["JPAKE"];
});

// Authenticated TLS Socket module
// -----------------------------
// Run J-PAKE to authenticate the TLS channel to the servers
// Dependence:
//   socket.js        // for TLS socket module
//   jpake.js         // for J-PAKE module
//   GetRecentWindow  // for getting window
XPCOMUtils.defineLazyGetter(this, "AuthSocket", function() {
  let sandbox = {};
  Services.scriptloader.loadSubScript("chrome://fxostv/content/authSocket.js", sandbox);
  return sandbox["AuthSocket"];
});

// Remote-control user interface
// -----------------------------
// The remote-control client ported from Gaia
// is located under 'content/remote-control-client/'.
// Dependence:
//   GetRecentWindow

// The remote-control client PIN page
const kRemoteControlPairingPINURL = 'chrome://fxostv/content/remote-control-client/pairing.html';
// The remote-control client page
const kRemoteControlUIURL = 'chrome://fxostv/content/remote-control-client/client.html';

// Remote Control Manager module
// -----------------------------
// The description is in the begining of bootstrap.js.
var gSocketMenuId = null;

var RemoteControlManager = (function() {

  function _debug(aMsg) {
    console.log('# [RemoteControlManager] ' + aMsg);
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

  // Store the TLS session information
  function Session(aHost, aPort, aAuthSocket) {
    this.host = aHost || false;
    this.port = aPort || -1;
    this.authSocket = aAuthSocket || false;
  }

  // _sessions = {
  //   tabId: Session(host, port, authSocket),
  //   ...
  // }
  let _sessions = {};

  // _serverClientPairs = {
  //   server1 id: {
  //     client id: server1 assigned client id,
  //     PIN: the AES base 64 signature from last time,
  //   }
  //   server2 id: {
  //     client id: server2 assigned client id,
  //     PIN: the AES base 64 signature from last time,
  //   }
  //   ...
  // }
  let _serverClientPairs = {};

  function _clearSession(aTabId) {
    _debug('_clearSession: ' + aTabId);

    if (!_sessions[aTabId]) {
      _debug('  no session for this tab');
      return;
    }

    // // Disconnect
    // _sessions[aTabId].authSocket.disconnect();
    //
    // // Delete the session
    // delete _sessions[aTabId];

    // Close the tab:
    //   _onTabClose will help us to disconnect and delete the session.
    let window = GetRecentWindow();
    let tab = window.BrowserApp.getTabForId(aTabId);
    window.BrowserApp.closeTab(tab);
  }

  // Observer to receive remote-control messages/commands
  // from remote-control client page
  let _messageObserver = {
    observe: function (aSubject, aTopic, aData) {
      _debug('_remoteControlObserver >> obsere: ' + aTopic);

      switch(aTopic) {
        case 'remote-control-message': {
          let msg = JSON.parse(aData);

          if (!_sessions[msg.tabId] || !_sessions[msg.tabId].authSocket) {
            _debug('  There is no existing authSocket for this client');
            return;
          }

          let authSocket = _sessions[msg.tabId].authSocket;
          authSocket.sendCommand(msg.action, msg.detail);
          break;
        }

        case 'pairing-pincode': {
          let msg = JSON.parse(aData);

          if (!_sessions[msg.tabId] || !_sessions[msg.tabId].authSocket) {
            _debug('  There is no existing authSocket for this client');
            return;
          }

          let authSocket = _sessions[msg.tabId].authSocket;

          authSocket.enterPIN(msg.pincode);
          break;
        }

        default:
          break;
      }
    }
  };

  // A listener that will be fired when tab is closed
  function _onTabClose(aEvent) {
    _debug('_onTabClose');

    // the target is a XUL browser element
    let browser = aEvent.target;

    // Disconnect to server if remote-control client page is closed
    let window = GetRecentWindow();
    let closedTab = window.BrowserApp.getTabForBrowser(browser);

    if (!_sessions[closedTab.id]) {
      _debug('  The closed tab is not for the remote-control service');
      return;
    }

    // Disconnect to TV if the connection is still inuse.
    let authSocket = _sessions[closedTab.id].authSocket;

    if (authSocket) {
      _debug('  Disconnect for this socket');
      authSocket.disconnect();
    }

    // Remove this session from _sessions
    delete _sessions[closedTab.id];

    // Remove observer and listener to receive remote-control messages and
    // TabClose event when all sessions are removed
    if (Object.keys(_sessions).length === 0 &&
        JSON.stringify(_sessions) === JSON.stringify({})) {
      _debug('  Remove observer to receive remote-control and pairing-pincode messages');
      Services.obs.removeObserver(_messageObserver, 'remote-control-message');
      Services.obs.removeObserver(_messageObserver, 'pairing-pincode');

      _debug('  Remove listener to receive TabClose');
      window.BrowserApp.deck.removeEventListener("TabClose", _onTabClose, false);
    }
  }

  // Start connecting to TV:
  // After connection to TV via TLS channel, we will run J-PAKE to authenticate.
  // We will open a page for users to enter the PIN code first.
  // server will show PIN code after it receives our round 1 data of J-PAKE.
  // Users should enter the PIN code shown on TV, and we will use it to
  // compute the round 2 data of J-PAKE.
  //
  // If the authentication is passed, then the page will be re-directed to
  // the remote-control client page. Otherwise, we will close the pin-code page
  // and show the error messages.
  function start(aHost, aPort) {
    _debug('start: ' + aHost + ':' + aPort);

    let authSocket;
    let tab;

    // Get a client certificate first(server might need it)
    Certificate.getOrCreate()
    // then connect to server
    .then(function(aCert) {

      // Create a AuthSocket
      authSocket = new AuthSocket();

      // Open a PIN code page
      let window = GetRecentWindow();
      tab = window.BrowserApp.addTab(kRemoteControlPairingPINURL);
      _debug('  Open tab: ' + tab.id);

      // Store all the session information
      _sessions[tab.id] = new Session(aHost, aPort, authSocket);

      // Add observer and listener to receive pairing-pincode,
      // remote-control messages and TabClose event
      // when the first session is built
      if (Object.keys(_sessions).length == 1) {
        _debug('  Add observer to receive remote-control and pairing-pincode messages');
        Services.obs.addObserver(_messageObserver, 'remote-control-message', false);
        Services.obs.addObserver(_messageObserver, 'pairing-pincode', false);

        _debug('  Add listener to receive TabClose');
        window.BrowserApp.deck.addEventListener("TabClose", _onTabClose, false);
      }

      // Show message: request sent
      ShowMessage(_getString('service.request.send'), true);

      // Try to connect TV
      return authSocket.connect({
        host: aHost,
        port: aPort,
        authenticator: new (Authenticators.get().Client)(),
        cert: aCert,
      }, _serverClientPairs);
    })
    .then(function(aPairInfo) { // returns { serverId: assigned clientId }
      // Re-direct the pairing pin code page to remote-controller page
      _debug('Re-directing URL of tab ' + tab.id + ' to remote-controller page......');
      let window = GetRecentWindow();
      window.BrowserApp.loadURI(kRemoteControlUIURL, tab.browser);

      // Save the server-client id pair if it doesn't exist
      if (!_serverClientPairs[aPairInfo.server]) {
        _serverClientPairs[aPairInfo.server] = {
          client: aPairInfo.client,
          pin: aPairInfo.pin,
        };
      // Otherwise, update the pin code
      } else {
        _serverClientPairs[aPairInfo.server].pin = aPairInfo.pin;
      }

    })
    .catch(function(aError) {
      _debug(aError);
      // Show error message
      ShowMessage(_getString('service.request.fail'), true);
      // Clear the this failed session
      _clearSession(tab.id);
    });
  }

  return {
    start: start,
  };
})();

/*
 * Presentation API
 * ==================================
 */
// PresentationDevices module
// -----------------------------
// The description is in the begining of bootstrap.js.
XPCOMUtils.defineLazyGetter(this, "PresentationDevices", function() {
  let sandbox = {};
  Services.scriptloader.loadSubScript("chrome://fxostv/content/presentationDevices.js", sandbox);
  return sandbox["PresentationDevices"];
});

// PresentationDeviceManager module
// -----------------------------
// The description is in the begining of bootstrap.js.
// Dependence:
//   Components // for using Cc, Ci
//   presentationDevices.js
XPCOMUtils.defineLazyGetter(this, "PresentationDeviceManager", function() {
  let sandbox = {};
  Services.scriptloader.loadSubScript("chrome://fxostv/content/presentationDeviceManager.js", sandbox);
  return sandbox["PresentationDeviceManager"];
});

// PresentationConnectionManager module
// -----------------------------
// The description is in the begining of bootstrap.js.
XPCOMUtils.defineLazyGetter(this, "PresentationConnectionManager", function() {
  let sandbox = {};
  Services.scriptloader.loadSubScript("chrome://fxostv/content/presentationConnectionManager.js", sandbox);
  return sandbox["PresentationConnectionManager"];
});

// PresentationManager module
// -----------------------------
// The description is in the begining of bootstrap.js.
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
 * UI Action Manager
 * ==================================
 */
// PageActionManager module
// -----------------------------
// An interface to operate PageAction.jsm
// Dependence:
//   PageAction.jsm
XPCOMUtils.defineLazyGetter(this, "PageActionManager", function() {
  let sandbox = {};
  Services.scriptloader.loadSubScript("chrome://fxostv/content/pageActionManager.js", sandbox);
  return sandbox["PageActionManager"];
});

// UIActionManager module
// -----------------------------
// The description is in the begining of bootstrap.js.
// Dependence:
//   PageActionManager.js
//   PresentationManager
//     - PresentationDeviceManager.js
//     - PresentationConnectionManager.js
var UIActionManager = function() {

  // Utils
  // -------------------------------
  function _debug(aMsg) {
    console.log('# [UIActionManager] ' + aMsg);
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
      addServiceToMenu(!!devices[i].remoteControlInfo,
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

    _debug('Connect to ' + aTarget.remoteControlInfo.address +
           ':' + aTarget.remoteControlInfo.port);

    // Connect to TV and remotely operate it on fennec
    RemoteControlManager.start(aTarget.remoteControlInfo.address,
                               aTarget.remoteControlInfo.port);
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

function initUIActionManager(aWindow) {
  if (!aWindow.hasOwnProperty('UIActionManager')) {
    aWindow.UIActionManager = new UIActionManager();
    aWindow.UIActionManager.init(aWindow);
  }
}

function uninitUIActionManager(aWindow) {
  if (aWindow.hasOwnProperty('UIActionManager')) {
    aWindow.UIActionManager.uninit(aWindow);
    delete aWindow.UIActionManager;
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
  gSocketMenuId = window.NativeWindow.menu.add("Socket Connect", null, function() { RemoteControlManager.start("192.168.1.111", 8080); });
  // For Debug: Add a button in menu to do window.PresentationRequest(URL).start()
  gStartRequestMenuId = window.NativeWindow.menu.add("Start Request", null, function() { startRequest(window); });

  // Initialize PresentationManager for this window
  initPresentationManager(window);

  // Initialize UIActionManager for this window
  initUIActionManager(window);
}

function unloadFromWindow(window) {
  // For Debug: Remove the force-discovery from menu
  gDiscoveryMenuId && window.NativeWindow.menu.remove(gDiscoveryMenuId);
  // For Debug: Remove the socket-connecting from menu
  gSocketMenuId && window.NativeWindow.menu.remove(gSocketMenuId);
  // For Debug: Remove the start-request from menu
  gStartRequestMenuId && window.NativeWindow.menu.remove(gStartRequestMenuId);

  // Delete PresentationManager for this window
  uninitPresentationManager(window);

  // Delete UIActionManager for this window
  uninitUIActionManager(window);
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
