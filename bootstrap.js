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
var gToastMenuId = null;
var gDoorhangerMenuId = null;
var gContextMenuId = null;

var gCastingMenuId = null;
var gPageActionId = null;
var gPageActionIcon = null;

/*
 * XPCOM modules
 * ==================================
 */

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/PageActions.jsm");

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
// function Presentation() {
// }
// Presentation.prototype.init = function() {
// };

/*
 * CastingManager
 * ----------------------
 */
// function CastingManager() {
// }
// CastingManager.prototype.init = function() {
// };

function showCastingOptions(win) {
  win.NativeWindow.toast.show(Strings.GetStringFromName("prompt.sendVideo"), "short");
}

function chooseAction(win) {
  DEBUG_LOG('###### chooseAction');
  var title = Strings.GetStringFromName("prompt.title");
  win.alert(title);
}

function shouldCast(win) {
  DEBUG_LOG('###### shouldCast');
  var currentURL = win.BrowserApp.selectedBrowser.currentURI.spec;
  DEBUG_LOG('  >> url: ' + currentURL);
  var matchStr = 'youtube.com';
  if (currentURL.includes(matchStr)) {
    return true;
  }
  return false;
}

function addCastingIconToURLBar(win) {
  DEBUG_LOG('#### addCastingIconToURLBar');

  if (!shouldCast(win)) {
    DEBUG_LOG('>> no need to cast!');

    if (gPageActionId) {
      DEBUG_LOG('Remove existing PageActionIcon!');
      PageActions.remove(gPageActionId);
      gPageActionId = null;
    }

    return;
  }

  if (gPageActionId) {
    DEBUG_LOG('PageActionsIcon already exist!');
    return;
  }

  // Using data URIs as a workaround until bug 993698 is fixed.
  if (win.devicePixelRatio <= 1.5) {
    DEBUG_LOG('win.devicePixelRatio <= 1.5');
    gPageActionIcon = ICON_HDPI;
  } else if (win.devicePixelRatio <= 2) {
    DEBUG_LOG('win.devicePixelRatio <= 2');
    gPageActionIcon = ICON_XHDPI;
  } else {
    DEBUG_LOG('win.devicePixelRatio > 2');
    gPageActionIcon = ICON_XXHDPI;
  }

  DEBUG_LOG('show PageActions!');
  gPageActionId = PageActions.add({
    icon: gPageActionIcon,
    title: Strings.GetStringFromName("pageaction.title"),
    clickCallback: () => chooseAction(win)
  });
}

/*
 * Program Flow Control
 * ==================================
 */
function showToast(aWindow) {
  aWindow.NativeWindow.toast.show(Strings.GetStringFromName("toast.message"), "short");
}

function showDoorhanger(aWindow) {
  let buttons = [
    {
      label: "Button 1",
      callback: function() {
        aWindow.NativeWindow.toast.show("Button 1 was tapped", "short");
      }
    } , {
      label: "Button 2",
      callback: function() {
        aWindow.NativeWindow.toast.show("Button 2 was tapped", "short");
      }
    }];

  aWindow.NativeWindow.doorhanger.show("Showing a doorhanger with two button choices.", "doorhanger-test", buttons);
}

function copyLink(aWindow, aTarget) {
  let url = aWindow.NativeWindow.contextmenus._getLinkURL(aTarget);
  aWindow.NativeWindow.toast.show("Todo: copy > " + url, "short");
}

function loadIntoWindow(window) {
  DEBUG_LOG('## loadIntoWindow');
  gToastMenuId = window.NativeWindow.menu.add("Show Toast", null, function() { showToast(window); });
  gDoorhangerMenuId = window.NativeWindow.menu.add("Show Doorhanger", null, function() { showDoorhanger(window); });
  gContextMenuId = window.NativeWindow.contextmenus.add("Copy Link", window.NativeWindow.contextmenus.linkOpenableContext, function(aTarget) { copyLink(window, aTarget); });

  // gCastingMenuId = window.NativeWindow.menu.add("Cast", null, function() { addCastingIconToURLBar(window); });
  gCastingMenuId = window.NativeWindow.menu.add("Cast", null, function() { showCastingOptions(window); });

  let contentLoadedListener = function() {
    DEBUG_LOG('  >> contentLoadedListener()');
    addCastingIconToURLBar(window);
  };
  window.addEventListener("DOMContentLoaded", contentLoadedListener, false);
}

function unloadFromWindow(window) {
  DEBUG_LOG('## unloadFromWindow');
  window.NativeWindow.menu.remove(gToastMenuId);
  window.NativeWindow.menu.remove(gDoorhangerMenuId);
  window.NativeWindow.contextmenus.remove(gContextMenuId);

  window.NativeWindow.menu.remove(gCastingMenuId);
  PageActions.remove(gPageActionId);
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
