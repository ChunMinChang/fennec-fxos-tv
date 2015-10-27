# Fennec Add-on for Firefox OS Smart TV
A simple fennec add-on for Firefox OS smart TV. This project is based on [leibovic/fennec-fxos-tv](https://github.com/leibovic/fennec-fxos-tv) and [mozilla/firefox-for-android-addons](https://github.com/mozilla/firefox-for-android-addons).

## Installation
./build

## Remove related files
./remove_files

## How to use
- You need to set _dom.presentation.enabled_ to _true_ through ```about:config```
- Remember to modify the target device(e.g., _ANDROID_APP_ID_) to yours in _build_ script.

## Note
Each window has a mozPresentationDeviceInfo and url bar,
so PresentationDeviceManager and CastingManager should follow the window.
However, no matter how many PresentationDeviceManager instances fennec have,
we should have only one device-list, PresentationDevices, because we just have one device!


## TODO:
- bootstrap.js
  - visibilitychange is also fired before tab is switching, it's annoyed
  - Change the service-list dynamically by webpage content and devices' services
    - Presentation API now can't know what services the devices provide before building connection
  - Add a small icon to video tag when there is compatible device nearby
  - Survey how to show submenu in prompt.js
