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
var CastingMgrList = {};
var PresDevMgrList = {};

var DiscoveryMenuId = null;

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

    if (!PresDevMgrList[win.name]) {
      DEBUG_LOG('  >> no PresentationDeviceManager for this window!');
      return;
    }

    PresDevMgrList[win.name].deviceList = devices.map(function(dev) {
      var presDevInfo = new PresentationDeviceInfo(dev);
      return presDevInfo;
    });

  }, function(error) {
    DEBUG_LOG('-*- discoveryDevices >> mozPresentationDeviceInfo.getAll() >> fail!');
    DEBUG_LOG(error);
  });

  win.NativeWindow.toast.show('Discovery presentaion devices', "short");
}

// function checkPermission(win, type) {
//   DEBUG_LOG('# checkPermission: ' + type);
//   DEBUG_LOG(win);
//   DEBUG_LOG(win.document);
//   let principal = win.document.nodePrincipal;
//   DEBUG_LOG(principal);
//   var hasPerm = Services.perms.testPermissionFromPrincipal(principal, type);
//   DEBUG_LOG('  hasPerm >> ' + hasPerm);
//   return hasPerm;
// }

function unloadPresentationDeviceManagerAndCastingManagerFromWindow(win) {
  DEBUG_LOG('# unloadPresentationDeviceManagerAndCastingManagerFromWindow(');
  if (PresDevMgrList.hasOwnProperty(win.name)) {
    DEBUG_LOG('  >> delete PresDevMgr');
    delete PresDevMgrList[win.name];
  }

  if (CastingMgrList.hasOwnProperty(win.name)) {
    DEBUG_LOG('  >> delete CastingMgr');
    // Remove pageAction from this window
    PageActions.remove(CastingMgrList[win.name].pageActionId);

    // then delete the CastingManager
    delete CastingMgrList[win.name];
  }
}

function initCastingManagerForWindow(win) {
  DEBUG_LOG('# initCastingManagerForWindow');
  // If CastingManager for this window alreay exist, then do nothing
  if (CastingMgrList[win.name]) {
    DEBUG_LOG('  >> CastingManager for this window alreay exist!');
    return;
  }

  var castingMgr = new CastingManager();
  castingMgr.init(win);

  // Add this CastingManager to array that
  // contains all pairs of window and CastingManager
  CastingMgrList[win.name] = castingMgr;
}

function initPresentationDeviceManagerForWindow(win) {
  DEBUG_LOG('# initPresentationDeviceManagerForWindow');
  // If CastingManager for this window alreay exist, then do nothing
  if (PresDevMgrList[win.name]) {
    DEBUG_LOG('  >> PresentationDeviceManager for this window alreay exist!');
    return;
  }

  var presDevMgr = new PresentationDeviceManager();
  presDevMgr.init(win);
  // Add this PresentationDeviceManager to array that
  // contains all pairs of window and PresentationDeviceManager
  PresDevMgrList[win.name] = presDevMgr;
}

/*
 * Core Functions
 * ==================================
 */

/*
 * Presentation API
 * ----------------------
 */
function PresentationDeviceInfo(device) {
  this.id = device.id;
  this.name = device.name;
  this.type = device.type;
  this.castVideoEnabled = true;
  this.castPageEnabled = true;
  this.pinPageEnabled = true;
}

function PresentationDeviceManager() {}

PresentationDeviceManager.prototype = {
  deviceList: [],

  init: function(win) {
    DEBUG_LOG('# PresentationDeviceManager.init');

    if (!win.navigator.mozPresentationDeviceInfo) {
      DEBUG_LOG('  >> You need to open the preference of Presentation!');
      return;
    }

    // Get available devices
    win.navigator.mozPresentationDeviceInfo.getAll()
    .then(function(devices) {
      DEBUG_LOG('-*- mozPresentationDeviceInfo.getAll() >> successfully!');

      if (devices === undefined || !devices.length) {
        DEBUG_LOG('  >> no device!');
        return;
      }

      DEBUG_LOG('  >> we get: ');
      for (var i in devices) {
        DEBUG_LOG(devices[i]);
      }

      // Add these devices into list
      this.appendDevicesIntoList(devices);

      // Initialize CastingManager for this window if it doesn't exist
      initCastingManagerForWindow(win);

      // Show icon in URL bar
      CastingMgrList[win.name].updatePageAction(win);

    }.bind(this), function(error) {
      DEBUG_LOG('-*- mozPresentationDeviceInfo.getAll() >> fail!');
      DEBUG_LOG(error);
    });

    // Use event listener to update deviceList
    win.navigator.mozPresentationDeviceInfo.addEventListener('devicechange',
    function deviceChangeHandler(evt) {
      let detail = evt.detail;
      DEBUG_LOG('-*- devicechange: ' + detail.type);
      this.updateDeviceList(win, detail.type, detail.deviceInfo);
    }.bind(this));
  },

  updateDeviceList: function(win, type, dev) {
    DEBUG_LOG('# PresentationDeviceManager.updateDeviceList: ' + type);
    DEBUG_LOG(dev);
    switch(type) {
      case 'add':
        this.addDeviceToList(win, dev);
        break;

      case 'update':
        this.updateDeviceInList(dev);
        break;

      case 'remove':
        this.removeDeviceFromList(win, dev);
        break;

      default:
        DEBUG_LOG('!!!!! Unexpected error: No corresponding action for ' + type);
        break;
    }
  },

  appendDevicesIntoList: function(devices) {
    DEBUG_LOG('# PresentationDeviceManager.appendDevicesIntoList');
    this.deviceList = this.deviceList.concat(devices.map(function(dev) {
      var presDevInfo = new PresentationDeviceInfo(dev);
      return presDevInfo;
    }));
  },

  addDeviceToList: function(win, dev) {
    DEBUG_LOG('# PresentationDeviceManager.addDeviceToList');

    var devFound = this.deviceList.find(function(d) {
      return d.id == dev.id;
    });

    if (devFound) {
      DEBUG_LOG('  >> device alreadt exist!');
      return;
    }

    this.deviceList.push(new PresentationDeviceInfo(dev));

    // If it's first device, then
    if (this.deviceList.length == 1) {
      DEBUG_LOG('  >> it\'s first device!');
      // Initialize CastingManager for this window if it doesn't exist
      initCastingManagerForWindow(win);
      // Add icon to URL bar
      CastingMgrList[win.name].updatePageAction(win);
    }
  },

  updateDeviceInList: function(dev) {
    DEBUG_LOG('# PresentationDeviceManager.updateDeviceInList');
    var devFound = this.deviceList.find(function(d) {
      return d.id == dev.id;
    });
    if (!devFound) {
      DEBUG_LOG('  !!!!! Error: Can\'t find device !!!!!');
    }
    devFound = dev;
  },

  removeDeviceFromList: function(win, dev) {
    DEBUG_LOG('# PresentationDeviceManager.removeDeviceFromList');

    // Create a new list without the removed one
    this.deviceList = this.deviceList.filter(function(d) {
      return d.id != dev.id;
    });

    // If device list is empty now, then
    if (!this.deviceList.length) {
      DEBUG_LOG('  >> device is empty now');

      // Remove icon from URL bar
      CastingMgrList[win.name].updatePageAction(win);

      // Remove the CastingManager from this window
    }
  },
};

/*
 * CastingManager
 * ----------------------
 */
function CastingManager() {}

CastingManager.prototype = {
  pageActionIcon: null,
  pageActionId: null,

  init: function(win) {
    DEBUG_LOG('# CastingManager.init');
    this.setPageActionIcon(win);

    let refreshPageActionIcon = function() {
      DEBUG_LOG('  >> refreshPageActionIcon()');
      this.updatePageAction(win);
    }.bind(this);

    // Reload pageActionIcon in URL bar after page has been loaded
    win.addEventListener('DOMContentLoaded', function() {
      DEBUG_LOG('  >> DOMContentLoaded!!');
      refreshPageActionIcon();
    }, false);

    // Reload pageActionIcon after tab has been switched
    // TODO: visibilitychange is also fired before tab is switching, it's annoyed
    win.addEventListener('visibilitychange', function() {
      DEBUG_LOG('  >> visibilitychange!!');
      refreshPageActionIcon();
    }, false);
  },

  setPageActionIcon: function(win) {
    DEBUG_LOG('# CastingManager.setPageActionIcon');
    // pageActionIncon has already been set
    if (this.pageActionIcon) {
      return;
    }

    // Using data URIs as a workaround until bug 993698 is fixed.
    if (win.devicePixelRatio <= 1.5) {
      DEBUG_LOG('win.devicePixelRatio <= 1.5');
      this.pageActionIcon = ICON_HDPI;
    } else if (win.devicePixelRatio <= 2) {
      DEBUG_LOG('win.devicePixelRatio <= 2');
      this.pageActionIcon = ICON_XHDPI;
    } else {
      DEBUG_LOG('win.devicePixelRatio > 2');
      this.pageActionIcon = ICON_XXHDPI;
    }
  },

  shouldCast: function(win) {
    DEBUG_LOG('# CastingManager.shouldCast');
    var currentURL = this.getCurrentURL(win);
    var validURL = currentURL.includes('http://') || currentURL.includes('https://');
    DEBUG_LOG('  >> validURL: ' + validURL);
    var devicesFound = PresDevMgrList[win.name] && (PresDevMgrList[win.name].deviceList.length > 0);
    DEBUG_LOG('  >> devicesFound: ' + devicesFound);
    return validURL && devicesFound;
  },

  updatePageAction: function(win) {
    DEBUG_LOG('# CastingManager.loadPageAction');

    if (!this.shouldCast(win)) {
      DEBUG_LOG('>> no need to cast!');

      if (this.pageActionId) {
        DEBUG_LOG('Remove existing PageActionIcon!');
        PageActions.remove(this.pageActionId);
        this.pageActionId = null;
      }

      return;
    }

    DEBUG_LOG('>> prepare to cast!');
    this.addPageAction(win);
  },

  addPageAction: function(win) {
    DEBUG_LOG('# CastingManager.addPageAction');

    if (this.pageActionId) {
      DEBUG_LOG('PageActionsIcon already exist!');
      return;
    }

    DEBUG_LOG('>> show PageActions!');
    this.pageActionId = PageActions.add({
      icon: this.pageActionIcon,
      title: Strings.GetStringFromName("pageaction.title"),
      clickCallback: () => this.chooseAction(win)
    });
  },

  chooseAction: function(win) {
    DEBUG_LOG('# CastingManager.chooseAction');
    var promptInfo = this.promptInfoGenerator(win);

    var p = new Prompt({
      title: Strings.GetStringFromName("prompt.title")
    });
    p.setSingleChoiceItems(promptInfo.menu);

    p.show(function(data) {
      DEBUG_LOG('  >> press button: ' + data.button);
      // Fire callbacks with corresponding target device
      // promptInfo.callbacks[data.button](promptInfo.targets[data.button]);

      // This condition is for demo!
      if (!promptInfo.callbacks[data.button]) {
        DEBUG_LOG('  >> no callbak for this button!');
        return;
      }

      if (promptInfo.callbacks[data.button]) {
        promptInfo.callbacks[data.button](promptInfo.targets[data.button]);
      }
    });
  },

  promptInfoGenerator: function(win) {
    DEBUG_LOG('# CastingManager.promptInfoGenerator');

    // Prompt menu
    var menu = [];

    // Callbacks for clicking menu
    var sendVideo = function(target) { this.castVideo(win, target); }.bind(this);
    var sendPage = function(target) { this.castWebpage(win, target); }.bind(this);
    var pinPage = function(target) { this.pinWebpageToHomescreen(win, target); }.bind(this);
    var callbacks = {};

    // target device for callbacks
    var targetDevices = {};

    // Load devices information into prompt munu and set its callbacks
    var devices = PresDevMgrList[win.name].deviceList;
    // TODO: The properties in devies may be changed after using real presentation API

    var key = 0;
    for (var i in devices) {
      // Assume every device has valid name
      menu.push({ label: devices[i].name, header: true });
      ++key;

      if (devices[i].castVideoEnabled) {
        menu.push({ label: Strings.GetStringFromName("prompt.sendVideo") });
        callbacks[key] = sendVideo;
        targetDevices[key] = devices[i];
        ++key;
      }

      if (devices[i].castPageEnabled) {
        menu.push({ label: Strings.GetStringFromName("prompt.sendURL") });
        callbacks[key] = sendPage;
        targetDevices[key] = devices[i];
        ++key;
      }

      if (devices[i].pinPageEnabled) {
        menu.push({ label: Strings.GetStringFromName("prompt.addURL") });
        callbacks[key] = pinPage;
        targetDevices[key] = devices[i];
        ++key;
      }
    }

    return { menu: menu, callbacks: callbacks, targets:targetDevices };
  },

  getCurrentURL: function(win) {
    DEBUG_LOG('# CastingManager.getCurrentURL');
    return win.BrowserApp.selectedBrowser.currentURI.spec;
  },

  castVideo: function(win, target) {
    DEBUG_LOG('# CastingManager.castVideo');
    DEBUG_LOG(target);
    var currentURL = this.getCurrentURL(win);
    win.alert('TODO: Cast video from page: ' + currentURL + '\n to ' + target.name + ': ' + target.id);
  },

  castWebpage: function(win, target) {
    DEBUG_LOG('# CastingManager.castWebpage');
    DEBUG_LOG(target);
    var currentURL = this.getCurrentURL(win);
    win.alert('TODO: Cast webpage from page: ' + currentURL + '\n to ' + target.name + ': ' + target.id);
  },

  pinWebpageToHomescreen: function(win, target) {
    DEBUG_LOG('# CastingManager.pinWebpageToHomescreen');
    DEBUG_LOG(target);
    var currentURL = this.getCurrentURL(win);
    win.alert('TODO: Pin webpage from page: ' + currentURL + '\n to ' + target.name + ': ' + target.id);
  },
};



/*
 * Program Flow Control
 * ==================================
 */
function loadIntoWindow(window) {
  DEBUG_LOG('### loadIntoWindow: ');
  // Set an unique id to window
  window.name = GET_UNIQUE_ID();
  DEBUG_LOG('  >> window.name: ' + window.name);
  initPresentationDeviceManagerForWindow(window);

  // Add a force-discovery into menu
  DiscoveryMenuId = window.NativeWindow.menu.add("Discovery Devices", null, function() { discoveryDevices(window); });
}

function unloadFromWindow(window) {
  DEBUG_LOG('### unloadFromWindow');
  unloadPresentationDeviceManagerAndCastingManagerFromWindow(window);

  // Remove the force-discovery from menu
  if (DiscoveryMenuId) {
    window.NativeWindow.menu.remove(DiscoveryMenuId);
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
