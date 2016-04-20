"use strict";

var PageActionManager = (function() {

  var _actionId = null,
      _icon = null,
      _title = null;

  function _debug(aMsg) {
    console.log('# [PageActionManager] ' + aMsg);
  }

  function _setIcon(aIcon) {
    _debug('_setIcon');

    if (!aIcon) {
      _debug('  >> no icon passed!');
      return;
    }

    // pageActionIncon has already been set
    if (_icon) {
      _debug('  >> icon alreay exist!');
      return;
    }

    _icon = aIcon;
  }

  function _setTitle(aTitle) {
    _debug('_setTitle');

    if (!aTitle) {
      _debug('  >> no title passed!');
      return;
    }

    if (_title) {
      _debug('  >> title alreay exist!');
      return;
    }

    _title = aTitle;
  }

  function removePageAction() {
    _debug('removePageAction');

    if (!_actionId) {
      _debug('  there is no existing actionId!');
      return;
    }

    PageActions.remove(_actionId);
    _actionId = null;
  }

  function addPageAction(aCallback) {
    _debug('addPageAction');

    if (_actionId) {
      _debug('  >> PageAction already exist!');
      return;
    }

    if (!aCallback) {
      _debug('  >> no callback passed!');
      return;
    }

    if (!_icon) {
      _debug('  >> icon doesn\'t be set yet!');
      return;
    }

    if (!_title) {
      _debug('  >> title doesn\'t be set yet!');
      return;
    }

    _actionId = PageActions.add({
      icon: _icon,
      title: _title,
      clickCallback: aCallback
    });
  }

  function init(aIcon, aTitle) {
    _debug('init');
    _setIcon(aIcon);
    _setTitle(aTitle);
  }

  function uninit() {
    _debug('uninit');
    removePageAction();
    _title = null;
    _icon = null;
  }

  return {
    init: init,
    uninit: uninit,
    add: addPageAction,
    remove: removePageAction
  };
})();
