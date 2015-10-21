# Fennec Add-on for Firefox OS Smart TV
A simple fennec add-on for Firefox OS smart TV. This project is based on [leibovic/fennec-fxos-tv](https://github.com/leibovic/fennec-fxos-tv) and [mozilla/firefox-for-android-addons](https://github.com/mozilla/firefox-for-android-addons).

## Installation
./build

## Remove related files
./remove_files

## How to use
You need to set _dom.presentation.enabled_ to _true_ through ```about:config```

## TODO:
- Show casting-icon only when devices that support presentation API were found.
  - Test 'devicechange' part
- Change the cast-list dynamically by webpage content
