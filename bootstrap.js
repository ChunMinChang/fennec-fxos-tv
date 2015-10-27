"use strict";

/*
 * Const Values
 * ==================================
 */
const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

const ICON_HDPI = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABsAAAAWCAYAAAAxSueLAAAAAXNSR0IArs4c6QAAAOdJREFUSA3tlj0KwkAQhd8LqUQLD6EnsPMI4hkSiEX8KS30BNrYiiBBPYN4BUt7vYSgtjpOlHQjGHCtss2ws7PvzX7NLINOtw9gCpGyRjeLvKnwyKfIRAB3Rmn7+hACE1+NKul+kyx072YFUSypj+dG3lYtzGwuObMFxpzA7PICo80lZ7bAmBOYXf5XjAyj+JKNGbuf32R1fl09Icd4T9LfqFoqqv/ysc5c5T5O5zDqtYHHTBHXvjYnTxQO18l8a935aJYVB9GgCe/e0r9KA8K6mldBlChQNDirwFFrDyR3q+V8n92z4hNcNDP6qelDfAAAAABJRU5ErkJggg==";
const ICON_XHDPI = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACQAAAAeCAYAAABE4bxTAAAAAXNSR0IArs4c6QAAAUtJREFUWAntl7tKxEAUhs85SWFjsz6Bha0KYuEFLCx8g1ia9QKSp8gj2CyKi5dtfQ8RFcQV7CwstPNSWiXHfxZcdiHkCMKOCzMQksxP5nz5MgMTTveyeSrLcyWaJSLG4aMpCj+QSCqkegaYOVD4gnECuMcAFlFVB/MvmmOJQdI30zk56l+PknBrZx+Ceo1llIV/UysAWZaCoWDIMmDlYQ4FQ5YBKw9zKBiyDFh5mENjZ4ixfSxB7WXrWmFLhZm7FYGXLsciUazb0OOgfjbaPmDcf1mXmJs+io9XTXMyN3ezzVK1hS869bdX4/dIJDttty7qxonqQpfd390+Li6sdJT1C/Qz6Jq0nhnKmV5F+GAi1rR9fHgzlFXcmIYGn8nzPH5+eVslKpaxApaQTcNcg4kbOBfo+8CAnzg/YcVcw8jVxvraZZIkxeA4ddff5klO7Te5Hm4AAAAASUVORK5CYII=";
const ICON_XXHDPI = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADYAAAAtCAYAAADlVJiFAAAAAXNSR0IArs4c6QAAAf1JREFUaAXtms1KQkEUx88ZfYCgwha1CVr0AbWolvkEPUGFiB+oiyCC3Lp1FYSUaCYSPUPr3AUREaQEtWrjQl8guvd0pkVIKc29QpxbMyDemXvmzP+c34wDziBwiaVyW0hunggWuBrSbQEsDiK0CFWxUT2+wHgyu+0SnQcwkKGSFeKOcgnyQy0C+oKADhQAzQdU/1DZeklxYIFdU0MD0zGFB71t1Mo4qF1qWyyRoa/aNLE/WWxgQcNqiVliQjJgp6IQEMYyLDHjVAkxtMSEgDCWYYkZp0qIoSUmBISxDEvMOFVCDC0xISCMZVhixqkSYmiJCQFhLMMSM06VEEMc9PewEG0jydBT0RnJg8zODgeGbZna/KvSJ5tKIRT9u5DZUx/Xhu5ub+5XVtefEGiOZU7wJ6i/lPoM+gGU2tdn0DJTblX9wwx4PpKNJTO7CHhIRL+yFhGRLzbQXuO0fOSFj+fAtPN4KhslF854wFkvg3m2RXjmOxuJevXkymtfX1n/GGgmsqhAZZjeo9dBf7RHbKNSaZyeWvITlPbvi1i/MJ6SmEjnNh0XEuxsgymO9b83fkbocpKavNvU6tXSJU/BbzcBjH2x4ciB9Q9WKBTUS6ez7LxhlNvXgCjC37w34iSPNM71V673WHGXhff4ucP753UYQ81KpdQaNRj291neAeiAdCFRHoGDAAAAAElFTkSuQmCC";



/*
 * Global Variables
 * ==================================
 */
var gDiscoveryMenuId = null;



/*
 * XPCOM modules
 * ==================================
 */
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/PageActions.jsm");
Cu.import("resource://gre/modules/Prompt.jsm");
Cu.import('resource://gre/modules/PresentationDeviceInfoManager.jsm');


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
 * Utils
 * ==================================
 */
function DEBUG_LOG(msg) {
  console.log(msg);
}

function GET_UNIQUE_ID() {
  return Date.now();
}

// For Debug
// ----------------------
function discoveryDevices(win) {
  DEBUG_LOG('# discoveryDevices');
  win.navigator.mozPresentationDeviceInfo.getAll()
  .then(function(devices) {
    DEBUG_LOG('-*- discoveryDevices >> mozPresentationDeviceInfo.getAll() >> successfully!');

    if (devices === undefined || !devices.length) {
      DEBUG_LOG('  >> no device!');
      return;
    }

    DEBUG_LOG('  >> we get: ');
    for (var i in devices) {
      DEBUG_LOG(devices[i]);
    }

    PresentationDevices.setList(devices);
    DEBUG_LOG(PresentationDevices.getList());

  }, function(error) {
    DEBUG_LOG('-*- discoveryDevices >> mozPresentationDeviceInfo.getAll() >> fail!');
    DEBUG_LOG(error);
  });

  win.NativeWindow.toast.show('Discovery presentaion devices', "short");
}



/*
 * Core Functions
 * ==================================
 */
// PresentationDevices
// ----------------------
var PresentationDevices = (function () {
  DEBUG_LOG('# [PresentationDevices] Immediately invoked!');
  // Private Basic class for presentation device's infomation
  function DeviceInfo(device) {
    this.id = device.id || 'unidentified';
    this.name = device.name || 'unidentified';
    this.type = device.type || 'unidentified';
    this.castVideoEnabled = true;
    this.castPageEnabled = true;
    this.pinPageEnabled = true;
    this.remoteControlEnabled = true;
  }

  // To save all information of the presentation devices discovered
  var _list = [];

  function setList(devices) {
    DEBUG_LOG('# [PresentationDevices] setList');
    _list = devices.map(function(dev) {
      var info = new DeviceInfo(dev);
      return info;
    });
  }

  function getList() {
    DEBUG_LOG('# [PresentationDevices] getList');
    return _list;
  }

  function addDevice(device) {
    DEBUG_LOG('# [PresentationDevices] addDevice');
    var found = _list.find(function(dev) {
      return dev.id == device.id;
    });

    if (!found) {
      _list.push(new DeviceInfo(device));
    }
    // For Debug
    else {
      DEBUG_LOG('  >> device alreadt exist!');
    }
  }

  function updateDevice(device) {
    DEBUG_LOG('# [PresentationDevices] updateDevice');
    var index = _list.findIndex(function(dev) {
      return dev.id == device.id;
    });

    if (index > -1) {
      _list[index] = new DeviceInfo(device);
    }
    // For Debug
    else {
       DEBUG_LOG('  >> device doesn\'t exist!');
    }
  }

  function removeDevice(device) {
    DEBUG_LOG('# [PresentationDevices] removeDevice');
    var index = _list.findIndex(function(dev) {
      return dev.id == device.id;
    });

    if (index > -1) {
      _list.splice(index, 1);
    }
    // For Debug
    else {
       DEBUG_LOG('  >> device doesn\'t exist!');
    }
  }

  return {
    setList: setList,
    getList: getList,
    add: addDevice,
    update: updateDevice,
    remove: removeDevice
  };

})();


// PresentationDeviceManager
// ----------------------
// function PresentationDeviceManager() {}
//
// PresentationDeviceManager.prototype = {
//
//   init: function(window) {
//     DEBUG_LOG('# PresentationDeviceManager.init');
//
//     if (!window.navigator.mozPresentationDeviceInfo) {
//       DEBUG_LOG('  >> You need to open the preference of Presentation!');
//       return;
//     }
//
//     window.navigator.mozPresentationDeviceInfo.addEventListener('devicechange', this);
//
//     window.navigator.mozPresentationDeviceInfo.getAll()
//     .then(function(devices) {
//       DEBUG_LOG('-*- mozPresentationDeviceInfo.getAll() >> successfully!');
//
//       if (devices === undefined || !devices.length) {
//         DEBUG_LOG('  >> no device!');
//         return;
//       }
//
//       // Add these devices into list
//       PresentationDevices.setList(devices);
//       DEBUG_LOG(PresentationDevices.getList());
//
//       // Initialize CastingManager for this window if it doesn't exist
//       initCastingManagerForWindow(window);
//
//     }, function(error) {
//       DEBUG_LOG('-*- mozPresentationDeviceInfo.getAll() >> fail!');
//       DEBUG_LOG(error);
//     });
//   },
//
//   uninit: function(window) {
//     DEBUG_LOG('# PresentationDeviceManager.uninit');
//     window.navigator.mozPresentationDeviceInfo.removeEventListener('devicechange', this);
//   },
//
//   handleEvent: function(evt) {
//     DEBUG_LOG('# PresentationDeviceManager.handleEvent: ' + evt.detail.type);
//     switch(evt.detail.type) {
//       case 'add':
//         PresentationDevices.add(evt.detail.deviceInfo);
//         // If this is the first device, then we need to
//         // initialize CastingManager for this window
//         if (PresentationDevices.getList().length == 1) {
//           // evt.currentTarget is PresentationDeviceManager itself,
//           // but we can get window by 'evt.currentTarget.ownerGlobal'
//           initCastingManagerForWindow(evt.currentTarget.ownerGlobal);
//         }
//         break;
//
//       case 'update':
//         PresentationDevices.update(evt.detail.deviceInfo);
//         break;
//
//       case 'remove':
//         PresentationDevices.remove(evt.detail.deviceInfo);
//         // If the device list is empty now, then CastingManager is no longer
//         // needed for this window
//         if (!PresentationDevices.getList().length) {
//           uninitCastingManagerForWindow(evt.currentTarget.ownerGlobal);
//         }
//         break;
//
//       default:
//         DEBUG_LOG('!!!!! Unexpected error: No event handler for this type');
//         break;
//     }
//   },
//
// };

var PresentationDeviceManager = function() {

  function _handleEvent(evt) {
    DEBUG_LOG('# PresentationDeviceManager.handleEvent: ' + evt.detail.type);
    switch(evt.detail.type) {
      case 'add':
        PresentationDevices.add(evt.detail.deviceInfo);
        // If this is the first device, then we need to
        // initialize CastingManager for this window
        if (PresentationDevices.getList().length == 1) {
          // evt.currentTarget is PresentationDeviceManager itself,
          // but we can get window by 'evt.currentTarget.ownerGlobal'
          initCastingManagerForWindow(evt.currentTarget.ownerGlobal);
        }
        break;

      case 'update':
        PresentationDevices.update(evt.detail.deviceInfo);
        break;

      case 'remove':
        PresentationDevices.remove(evt.detail.deviceInfo);
        // If the device list is empty now, then CastingManager is no longer
        // needed for this window
        if (!PresentationDevices.getList().length) {
          uninitCastingManagerForWindow(evt.currentTarget.ownerGlobal);
        }
        break;

      default:
        DEBUG_LOG('!!!!! Unexpected error: No event handler for this type');
        break;
    }
  }

  function init(window) {
    DEBUG_LOG('# PresentationDeviceManager.init');

    if (!window.navigator.mozPresentationDeviceInfo) {
      DEBUG_LOG('  >> You need to open the preference of Presentation!');
      return;
    }

    window.navigator.mozPresentationDeviceInfo.addEventListener('devicechange', _handleEvent);

    window.navigator.mozPresentationDeviceInfo.getAll()
    .then(function(devices) {
      DEBUG_LOG('-*- mozPresentationDeviceInfo.getAll() >> successfully!');

      if (devices === undefined || !devices.length) {
        DEBUG_LOG('  >> no device!');
        return;
      }

      // Add these devices into list
      PresentationDevices.setList(devices);
      DEBUG_LOG(PresentationDevices.getList());

      // Initialize CastingManager for this window if it doesn't exist
      initCastingManagerForWindow(window);

    }, function(error) {
      DEBUG_LOG('-*- mozPresentationDeviceInfo.getAll() >> fail!');
      DEBUG_LOG(error);
    });
  }

  function uninit(window) {
    DEBUG_LOG('# PresentationDeviceManager.uninit');
    window.navigator.mozPresentationDeviceInfo.removeEventListener('devicechange', _handleEvent);
  }

  return {
    init: init,
    uninit: uninit,
  };
};

function initPresentationDeviceManagerForWindow(window) {
  DEBUG_LOG('$$$ initPresentationDeviceManagerForWindow');

  if (!window.hasOwnProperty('presentationDeviceManager')) {
    DEBUG_LOG('  >> Create PresentationDeviceManager for this window');
    window.presentationDeviceManager = new PresentationDeviceManager();
    window.presentationDeviceManager.init(window);
  }
}

function uninitPresentationDeviceManagerForWindow(window) {
  DEBUG_LOG('$$$ uninitPresentationDeviceManagerForWindow');
  if (window.hasOwnProperty('presentationDeviceManager')) {
    DEBUG_LOG('  >> Delete PresentationDeviceManager for this window');
    window.presentationDeviceManager.uninit();
    delete window.presentationDeviceManager;
  }
}


// CastingManager
// ----------------------
// function CastingManager() {}
//
// CastingManager.prototype = {
//   _pageActionIcon: null,
//   _pageActionId: null,
//
//   _setPageActionIcon: function() {
//   },
//
//   _shouldCast: function() {
//   },
//
//   _addPageAction: function() {
//   },
//
//   _chooseAction: function() {
//   },
//
//   _promptInfoGenerator: function() {
//   },
//
//   _getCurrentURL: function() {
//   },
//
//   _castVideo: function() {
//   },
//
//   _castWebpage: function() {
//   },
//
//   _pinWebpageToHomescreen: function() {
//   },
//
//   _remoteControl: function() {
//   },
//
//   init: function() {
//   },
//
//   uninit: function() {
//   },
//
//   updatePageAction: function() {
//   },
//
// };

var CastingManager = function() {

    var _pageActionIcon = null,
        _pageActionId = null;

    function _getCurrentURL(window) {
      DEBUG_LOG('# CastingManager._getCurrentURL');
      DEBUG_LOG(window);
      return window.BrowserApp.selectedBrowser.currentURI.spec;
    }

    function _castVideo(window, target) {
      DEBUG_LOG('# CastingManager._castVideo');
      DEBUG_LOG(target);
      var currentURL = _getCurrentURL(window);
      window.alert('TODO: Cast video from page: ' + currentURL + '\n to ' + target.name + ': ' + target.id);
    }

    function _castWebpage(window, target) {
      DEBUG_LOG('# CastingManager._castWebpage');
      DEBUG_LOG(target);
      var currentURL = _getCurrentURL(window);
      window.alert('TODO: Cast webpage from page: ' + currentURL + '\n to ' + target.name + ': ' + target.id);
    }

    function _pinWebpageToHomescreen(window, target) {
      DEBUG_LOG('# CastingManager._pinWebpageToHomescreen');
      DEBUG_LOG(target);
      var currentURL = _getCurrentURL(window);
      window.alert('TODO: Pin webpage from page: ' + currentURL + '\n to ' + target.name + ': ' + target.id);
    }

    function _remoteControl(window, target) {
      DEBUG_LOG('# CastingManager._remoteControl');
      DEBUG_LOG(target);
      var currentURL = _getCurrentURL(window);
      window.alert('TODO: remote control from: ' + currentURL + '\n to ' + target.name + ': ' + target.id);
    }

    function _shouldCast(window) {
      DEBUG_LOG('# CastingManager._shouldCast');
      var currentURL = _getCurrentURL(window);
      var validURL = currentURL.includes('http://') || currentURL.includes('https://');
      DEBUG_LOG('  >> validURL: ' + validURL);
      var devicesFound = PresentationDevices.getList().length > 0;
      DEBUG_LOG('  >> devicesFound: ' + devicesFound);
      return validURL && devicesFound;
    }

    function _setPageActionIcon(window) {
      DEBUG_LOG('# CastingManager._setPageActionIcon');

      // pageActionIncon has already been set
      if (_pageActionIcon) {
        DEBUG_LOG('  >> pageActionIcon alreay exist!');
        return;
      }

      if (window) {
        // Using data URIs as a workaround until bug 993698 is fixed.
        if (window.devicePixelRatio <= 1.5) {
          DEBUG_LOG('window.devicePixelRatio <= 1.5');
          _pageActionIcon = ICON_HDPI;
        } else if (window.devicePixelRatio <= 2) {
          DEBUG_LOG('window.devicePixelRatio <= 2');
          _pageActionIcon = ICON_XHDPI;
        } else {
          DEBUG_LOG('window.devicePixelRatio > 2');
          _pageActionIcon = ICON_XXHDPI;
        }
      }
    }

    function _addPageAction(window) {
      DEBUG_LOG('# CastingManager._addPageAction');
      if (_pageActionId) {
        DEBUG_LOG('  >> PageActionsIcon already exist!');
        return;
      }
      _pageActionId = PageActions.add({
        icon: _pageActionIcon,
        title: Strings.GetStringFromName("pageaction.title"),
        clickCallback: () => _chooseAction(window)
      });
    }

    function _chooseAction(window) {
      DEBUG_LOG('# CastingManager._chooseAction');
      var promptInfo = _promptInfoGenerator(window);

      var p = new Prompt({
        title: Strings.GetStringFromName("prompt.title")
      });

      p.setSingleChoiceItems(promptInfo.menu);

      p.show(function(data) {
        DEBUG_LOG('  >> press button: ' + data.button);
        // Fire callbacks with corresponding target device
        if (data.button > 0 && promptInfo.callbacks[data.button]) {
          DEBUG_LOG('  >> Fire callbak for this button!');
          promptInfo.callbacks[data.button](window, promptInfo.targets[data.button]);
        }
      });
    }

    function _promptInfoGenerator(window) {
      DEBUG_LOG('# CastingManager._promptInfoGenerator');
      // Prompt menu
      var menu = [];

      // Callbacks for clicking menu
      var callbacks = {};

      // target device for callbacks
      var targetDevices = {};

      // Load devices information into prompt munu and set its callbacks
      var devices = PresentationDevices.getList();

      var key = 0;
      for (var i in devices) {
        // Assume every device has valid name
        menu.push({ label: devices[i].name, header: true });
        ++key;

        if (devices[i].castVideoEnabled) {
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

        if (devices[i].remoteControlEnabled) {
          menu.push({ label: Strings.GetStringFromName("prompt.remoteControl") });
          callbacks[key] = _remoteControl;
          targetDevices[key] = devices[i];
          ++key;
        }
      }

      return { menu: menu, callbacks: callbacks, targets:targetDevices };
    }

    function _handleEvent(evt) {
      DEBUG_LOG('# CastingManager._handleEvent');
      switch(evt.type) {
        case 'DOMContentLoaded':
          DEBUG_LOG(' >> DOMContentLoaded');
        case 'visibilitychange':
          DEBUG_LOG(' >> visibilitychange');
          updatePageAction(evt.currentTarget); // current target is window!
          break;
        default:
          DEBUG_LOG('!!!!! Unexpected error: No event handler for this type');
          break;
      }
    }

    function updatePageAction(window) {
      DEBUG_LOG('# CastingManager.updatePageAction');
      if (!_shouldCast(window)) {
        DEBUG_LOG('  >> no need to cast!');

        if (_pageActionId) {
          DEBUG_LOG('  >> Remove existing PageActionIcon!');
          PageActions.remove(_pageActionId);
          _pageActionId = null;
        }

        return;
      }

      _addPageAction(window);
    }

    function init(window) {
      DEBUG_LOG('# CastingManager.init');
      _setPageActionIcon(window);

      // Reload pageActionIcon in URL bar after page has been loaded
      window.addEventListener('DOMContentLoaded', _handleEvent, false);

      // Reload pageActionIcon after tab has been switched
      // TODO: visibilitychange is also fired before tab is switching, it's annoyed
      window.addEventListener('visibilitychange', _handleEvent, false);

      // Add pageActionIcon to URL bar if it need
      updatePageAction(window);
    }

    function uninit(window) {
      DEBUG_LOG('# CastingManager.uninit');
      window.removeEventListener('DOMContentLoaded', _handleEvent);
      window.removeEventListener('visibilitychange', _handleEvent);
    }

    return {
      init: init,
      uninit: uninit,
      update: updatePageAction
    };
};

function initCastingManagerForWindow(window) {
  DEBUG_LOG('$$$ initCastingManagerForWindow');

  if (!window.hasOwnProperty('castingManager')) {
    DEBUG_LOG('  >> Create CastingManager for this window');
    window.castingManager = new CastingManager();
    window.castingManager.init(window);
  }
}

function uninitCastingManagerForWindow(window) {
  DEBUG_LOG('$$$ uninitCastingManagerForWindow');
  if (window.hasOwnProperty('castingManager')) {
    DEBUG_LOG('  >> Delete CastingManager for this window');
    window.castingManager.uninit();
    delete window.castingManager;
  }
}

/*
 * Program Flow Control
 * ==================================
 */
function loadIntoWindow(window) {
  DEBUG_LOG('### loadIntoWindow: ');
  // Set an unique id to window's name
  window.name = GET_UNIQUE_ID();
  DEBUG_LOG('  >> window.name: ' + window.name);

  // Initialize PresentationDeviceManager for this window
  initPresentationDeviceManagerForWindow(window);

  // For Debug: Add a force-discovery into menu
  gDiscoveryMenuId = window.NativeWindow.menu.add("Discovery Devices", null, function() { discoveryDevices(window); });
}

function unloadFromWindow(window) {
  DEBUG_LOG('### unloadFromWindow');

  // Remove PresentationDeviceManager from this window
  uninitPresentationDeviceManagerForWindow(window);

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
    DEBUG_LOG('windowListener >> onOpenWindow');
    // Wait for the window to finish loading
    let domWindow = aWindow.QueryInterface(Ci.nsIInterfaceRequestor)
            .getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
    function loadListener() {
      DEBUG_LOG('  >> loadListener()');
      domWindow.removeEventListener("load", loadListener, false);
      loadIntoWindow(domWindow);
    }
    domWindow.addEventListener("load", loadListener, false);
  },

  onCloseWindow: function(aWindow) {
    DEBUG_LOG('windowListener >> onCloseWindow');
  },

  onWindowTitleChange: function(aWindow, aTitle) {
    DEBUG_LOG('windowListener >> onWindowTitleChange');
  }
};

function startup(aData, aReason) {
  DEBUG_LOG('startup!');
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
  DEBUG_LOG('shutdown!');
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
  DEBUG_LOG('install!');
}

function uninstall(aData, aReason) {
  DEBUG_LOG('uninstall!');
}
