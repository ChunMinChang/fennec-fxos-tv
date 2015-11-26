# Fennec Add-on for Firefox OS Smart TV
A simple fennec add-on for Firefox OS smart TV. This project is based on [leibovic/fennec-fxos-tv](https://github.com/leibovic/fennec-fxos-tv) and [mozilla/firefox-for-android-addons](https://github.com/mozilla/firefox-for-android-addons).

## Installation
- [Fennec](https://wiki.mozilla.org/Mobile/Fennec/Android)
  - Please apply the patch on [Bug 1129785](https://bugzilla.mozilla.org/show_bug.cgi?id=1129785) first
  - Build your _mozilla-central_ to _fennec_ by setting [.mozconfig](https://wiki.mozilla.org/Mobile/Fennec/Android#Preparing_a_Fennec_mozconfig)
  - Flash _fennec_ into your android device
- [build script](https://github.com/ChunMinChang/fennec-fxos-tv/blob/master/build)
  - Remember to modify the target device(e.g., _ANDROID_APP_ID_) to yours in _build_ script
  - run ```./build``` and click the link shown on a installation webpage!
- Please check __dom.presentation.enabled__ is set to __true__ through ```about:config```

## Remove related files
- Open menu > Tools > Add-ons > Firefox OS TV 1.0 >> Unubstall
- [remove script](https://github.com/ChunMinChang/fennec-fxos-tv/blob/master/rm_files): run ```./rm_files```

## How to use


## Note
- Window
  - PresentationManager
    - PresentationDeviceManager
      - _mozPresentationDeviceInfo_
    - PresentationConnectionManager
      - _navigator.presentation_
  - CastingManager: To control __url-bar__ and __pageAction__
- PresentationDevices

Each _window_ object has its own _mozPresentationDeviceInfo_,
_navigator.presentation_, and _url bar_,
so _PresentationDeviceManager_, _PresentationConnectionManager_ and _CastingManager_ should follow the window.
However, no matter how many _PresentationDeviceManager_ instances fennec have,
we should have only one device-list, _PresentationDevices_, because we just have one device!

## TODO:
- Issues
  - [Bug 1228192 - Expose |attributes| of mDNS on Fennec](https://bugzilla.mozilla.org/show_bug.cgi?id=1228192)
- bootstrap.js
  - Consider a general archi for four use cases
  - Define conditions to cast video
  - UI:
    - Change the service-list dynamically by webpage content and devices' services
      - Presentation API now can't know what services the devices provide before building connection
    - Add a small icon to video tag when there is compatible device nearby
    - Survey how to show submenu
    - Survey how to create and overlay a control menu for casting video and remote control
