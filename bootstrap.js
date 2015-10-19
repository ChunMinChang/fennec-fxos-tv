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
var castingMgr = new CastingManager();

/*
 * XPCOM modules
 * ==================================
 */
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/PageActions.jsm");
Cu.import("resource://gre/modules/Prompt.jsm");

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



/*
 * Core Functions
 * ==================================
 */

/*
 * Presentation API
 * ----------------------
 */
function PresentationDevice() {
  this.id = null;
  this.name = null;
  this.type = null;
  this.castVideoEnabled = false;
  this.castPageEnabled = false;
  this.pinPageEnabled = false;
}

 var PresentationManager = {
   // TODO: Use real presentation API to get devices
   getDeviceList: function() {
     DEBUG_LOG('# PresentationManager.getDeviceList');
     var dev1 = new PresentationDevice();
     dev1.name = 'Firefox OS TV';
     dev1.castVideoEnabled = true;
     dev1.castPageEnabled = true;
     dev1.pinPageEnabled = true;

     var dev2 = new PresentationDevice();
     dev2.name = 'ChromeCast';
     dev2.castVideoEnabled = true;

     var dev3 = new PresentationDevice();
     dev3.name = 'Roku';
     dev3.castVideoEnabled = true;

     var dev4 = new PresentationDevice();
     dev4.name = 'Firefox OS TV2';
     dev4.castVideoEnabled = true;
     dev4.castPageEnabled = true;
     dev4.pinPageEnabled = true;

     return [dev1, dev2, dev3, dev4];
   },
 };

/*
 * CastingManager
 * ----------------------
 */
function CastingManager(win) {
  this.pageActionIcon = null;
  this.pageActionId = null;
}

CastingManager.prototype = {

  init: function(win) {
    DEBUG_LOG('# CastingManager.init');
    this.setPageActionIcon(win);

    let contentLoadedListener = function() {
      DEBUG_LOG('  >> contentLoadedListener()');
      this.updatePageAction(win);
    }.bind(this);
    win.addEventListener('DOMContentLoaded', contentLoadedListener, false);
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
    // TODO: Use presentation API to define this flag
    var devicesfound = true;
    if (validURL && devicesfound) {
      return true;
    }
    return false;
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
      promptInfo.callbacks[data.button](promptInfo.targets[data.button]);
    });
  },

  promptInfoGenerator: function(win) {
    DEBUG_LOG('# CastingManager.promptInfoGenerator');

    // Prompt menu
    var menu = [];

    // Callbacks for clicking menu
    var sendVideo = function(target) { this.castVideo(win, target); }.bind(this);
    var sendPage = function(target) { this.castWebpage(win, target); }.bind(this);
    var pinPage = function(target) { this.pinWebpageToHome(win, target); }.bind(this);
    // var callbacks = [];
    var callbacks = {};

    // target device for callbacks
    // var targetDevices = [];
    var targetDevices = {};

    // Load devices information into prompt munu and set its callbacks
    var devices = PresentationManager.getDeviceList();
    // TODO: The properties in devies may be changed after using real presentation API

    var key = 0;
    for (var i in devices) {
      // Assume every device has valid name
      menu.push({ label: devices[i].name, header: true });
      // callbacks.push(null);
      // targetDevices.push(null);
      ++key;

      if (devices[i].castVideoEnabled) {
        menu.push({ label: Strings.GetStringFromName("prompt.sendVideo") });
        // callbacks.push(sendVideo);
        // targetDevices.push(devices[i]);
        callbacks[key] = sendVideo;
        targetDevices[key] = devices[i];
        ++key;
      }

      if (devices[i].castPageEnabled) {
        menu.push({ label: Strings.GetStringFromName("prompt.sendURL") });
        // callbacks.push(sendPage);
        // targetDevices.push(devices[i]);
        callbacks[key] = sendPage;
        targetDevices[key] = devices[i];
        ++key;
      }

      if (devices[i].pinPageEnabled) {
        menu.push({ label: Strings.GetStringFromName("prompt.addURL") });
        // callbacks.push(pinPage);
        // targetDevices.push(devices[i]);
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
    win.alert('TODO: Cast video from page: ' + currentURL);
  },

  castWebpage: function(win, target) {
    DEBUG_LOG('# CastingManager.castWebpage');
    DEBUG_LOG(target);
    var currentURL = this.getCurrentURL(win);
    win.alert('TODO: Cast webpage from page: ' + currentURL);
  },

  pinWebpageToHome: function(win, target) {
    DEBUG_LOG('# CastingManager.pinWebpageToHome');
    DEBUG_LOG(target);
    var currentURL = this.getCurrentURL(win);
    win.alert('TODO: Pin webpage from page: ' + currentURL);
  },
};



/*
 * Program Flow Control
 * ==================================
 */
function loadIntoWindow(window) {
  DEBUG_LOG('## loadIntoWindow');
  castingMgr = new CastingManager();
  castingMgr.init(window);
}

function unloadFromWindow(window) {
  DEBUG_LOG('## unloadFromWindow');
  PageActions.remove(castingMgr.pageActionId);
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
