# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Homey SDK3 app that reads temperature and battery data from a [FreeGrilly](https://github.com/epiecs/free-grilly) grill thermometer over HTTP. The device exposes a local REST API; no cloud or MQTT broker is required.

Licensed under the Mozilla Public License 2.0.

## Development Commands

Install the Homey CLI globally if not already present:
```bash
npm install -g homey
```

Run on a local Homey Pro (must be on the same network):
```bash
homey app run
```

Validate the app manifest and code before deploying:
```bash
homey app validate
```

Publish to the Homey App Store:
```bash
homey app publish
```

## Architecture

```
app.js                              # Homey.App entry point (minimal)
app.json                            # SDK3 manifest: driver, capabilities, settings, pair views
drivers/thermometer/
  driver.js                         # Homey.Driver — handles pairing session
  device.js                         # Homey.Device — HTTP polling loop, capability updates
  pair/start.html                   # Pairing UI: IP address input form
  assets/icon.svg                   # Driver icon
assets/icon.svg                     # App icon
locales/en.json                     # English strings
```

### Data flow

1. **Pairing** (`driver.js` + `pair/start.html`): the user enters the device IP; the driver calls `GET /api/grill` to validate connectivity, then stores the IP in device settings.
2. **Polling** (`device.js`): on `onInit`, a `homey.setInterval` loop fires every `poll_interval` seconds (default 5 s). Each tick calls `GET /api/grill` using the built-in `http` module.
3. **Sync**: the response is mapped to Homey capabilities — eight `measure_temperature.probeN` values, `measure_battery`, and `alarm_battery` (fires below 20 %). If the device returns Fahrenheit (`temperature_unit === 'fahrenheit'`), temperatures are converted to Celsius before being written.
4. **Availability**: `setAvailable()` / `setUnavailable(message)` are called on each poll to reflect connectivity state in the Homey UI.

### Capabilities (defined in `app.json`)

| Capability | Source field | Notes |
|---|---|---|
| `measure_temperature.probe1`–`probe8` | `probes[].temperature` | `null` when probe not connected |
| `measure_battery` | `battery_percentage` | Integer 0–100 |
| `alarm_battery` | `battery_percentage` | `true` when < 20 % |

### FreeGrilly REST API (relevant endpoints)

| Endpoint | Method | Description |
|---|---|---|
| `/api/grill` | GET | All probe temperatures, battery, WiFi info |
| `/api/probes` | GET/POST | Probe names and target temperatures |
| `/api/settings` | GET/POST | Device settings including MQTT, WiFi |

The default device IP in AP mode is `192.168.200.10`. After connecting to home WiFi the IP is DHCP-assigned.

## Key Conventions

- All intervals use `this.homey.setInterval` / `this.homey.clearInterval` (SDK3 requirement — global `setInterval` is not available).
- HTTP calls use the Node.js built-in `http` module with a 5-second `timeout` option — no npm dependencies.
- The `_fetchGrill(ip)` helper is duplicated between `driver.js` and `device.js` intentionally; do not introduce a shared module unless the codebase grows significantly.
- Settings changes (`onSettings`) tear down and restart the polling timer so the new IP and interval take effect immediately.

## Publishing Checklist

Before submitting to the Homey App Store, add:
- `assets/images/small.png` (640 × 320 px)
- `assets/images/large.png` (1280 × 640 px)
- `assets/images/xlarge.png` (1920 × 960 px)
- Update `"author"` in `app.json` with real name and email
- Update `"id"` in `app.json` to match your registered Homey developer namespace
