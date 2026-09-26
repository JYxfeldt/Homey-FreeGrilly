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
  pair/confirm.html                 # Pairing step 2: confirm device and call createDevice
  assets/icon.svg                   # Driver icon
assets/icon.svg                     # App icon
locales/en.json                     # English strings
```

### Pair flow

`app.json` defines two steps:

1. `login_credentials` (built-in template) — user enters the IP address. Homey calls the `login` session handler in `driver.js`, which validates the IP format, fetches `/api/grill`, and stores the device in a closure-scoped `pendingDevice` variable.
2. `confirm` (custom view `pair/confirm.html`) — calls `get_device` to retrieve `pendingDevice`, shows the device name and IP, and calls `Homey.createDevice()` (supports both Promise and callback APIs) when the user taps **Add device**.

### Data flow

1. **Pairing** — see pair flow above.
2. **Polling** (`device.js`): on `onInit`, a recursive `setTimeout` loop fires every `poll_interval` seconds (default 5 s). Each iteration awaits the previous poll before scheduling the next, preventing overlapping requests. Each tick calls `GET /api/grill` using the built-in `http` module.
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

- Polling uses a recursive `this.homey.setTimeout` loop (not `setInterval`) so each poll fully completes before the next is scheduled, preventing overlapping HTTP requests. Use `this.homey.clearTimeout` to stop it.
- HTTP calls use the Node.js built-in `http` module with a 5-second `timeout` option — no npm dependencies. Always check `res.statusCode === 200` before reading the body.
- `_fetchGrill(ip)` uses a `settled` flag to ensure the returned Promise is resolved or rejected exactly once, even when `req.destroy()` triggers both the `timeout` and `error` events.
- Response bodies are capped at 64 KB (`MAX_BODY_BYTES`) to prevent memory exhaustion from a misbehaving device.
- The `_fetchGrill(ip)` helper is duplicated between `driver.js` and `device.js` intentionally; do not introduce a shared module unless the codebase grows significantly.
- Settings changes (`onSettings`) call `_clearPolling()` then restart `_pollLoop()` immediately so the new IP and interval take effect without waiting for the current timer to expire. An in-flight `_poll()` completes safely — it checks `_stopPolling` before scheduling the next tick.
- IP addresses are validated as IPv4 format in the `login` pair handler before any network call is made.

## Publishing Checklist

Before submitting to the Homey App Store, add:
- `assets/images/small.png` (640 × 320 px)
- `assets/images/large.png` (1280 × 640 px)
- `assets/images/xlarge.png` (1920 × 960 px)
- Update `"author"` in `app.json` with real name and email
- Update `"id"` in `app.json` to match your registered Homey developer namespace
