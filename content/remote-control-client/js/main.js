'use strict';

// Get Services to use Services.obs.notifyObservers
// to send remote-control message to bootstrap.js
const { classes: Cc, interfaces: Ci, utils: Cu } = Components;
Cu.import("resource://gre/modules/Services.jsm");

(function(exports) {
  var DEBUG = false;

  // Polyfill for Safari
  if (!navigator.languages) {
    var language = navigator.language.split('-', 2);
    if (language[1].length == 2) {
      language = language[0].toLowerCase() + '-' + language[1].toUpperCase();
    } else {
      language = language[0].toLowerCase() + '-' +
        language[1].charAt(0).toUpperCase() +
        language[1].substring(1).toLowerCase();
    }
    navigator.languages = [language];
  }

  exports.ready = function(handler) {
    var handled = false;
    function wrapper() {
      if (!handled) {
        handled = true;
        document.removeEventListener('DOMContentLoaded', wrapper);
        document.removeEventListener('load', wrapper);
        handler();
      }
    }
    document.addEventListener('DOMContentLoaded', wrapper);
    document.addEventListener('load', wrapper);
  };

  exports.sendCommand = function(action, detail) {
    // Get the tab id for this remote-control client page
    let window = Services.wm.getMostRecentWindow("navigator:browser");
    let tabId = window.BrowserApp.selectedTab.id;

    // Message to notify RemoteControlManager in bootstrap.js
    let data = {
      tabId: tabId,
      action: action,
      detail: detail,
    }
    let msg = JSON.stringify(data);
    Services.obs.notifyObservers(null, 'remote-control-message', msg);
  };

  exports.sendPINCode = function(pincode) {
    // Get the tab id for this remote-control client page
    let window = Services.wm.getMostRecentWindow("navigator:browser");
    let tabId = window.BrowserApp.selectedTab.id;

    // Message to notify RemoteControlManager in bootstrap.js
    let data = {
      tabId: tabId,
      pincode: pincode
    }
    let msg = JSON.stringify(data);
    Services.obs.notifyObservers(null, 'pairing-pincode', msg);
  };

  exports.setCookie = function(key, value, expires, path) {
    var cookie = [];
    cookie.push(encodeURIComponent(String(key)) + '=' +
      encodeURIComponent(String(value)));
    if (typeof expires === 'number') {
      cookie.push(new Date(Date.now() + expires * 864e+5).toUTCString());
    }
    if (path) {
      cookie.push('path=' + encodeURI(path));
    }
    document.cookie = cookie.join('; ');
  };
}(window));
