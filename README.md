# Homey FreeGrilly

A [Homey](https://homey.app) app that integrates with the [FreeGrilly](https://github.com/epiecs/free-grilly) open-source grill thermometer firmware. It reads live temperature and battery data directly from the device over your local network — no cloud, no MQTT broker required.

## Features

- Live temperature readings from up to 8 probes
- Battery percentage monitoring
- Low battery alarm (triggers below 20 %)
- Automatic Fahrenheit → Celsius conversion
- Configurable poll interval (default 5 s)

## Requirements

- Homey Pro running firmware ≥ 12.0.0
- A Grilleye Max thermometer flashed with the [FreeGrilly firmware](https://github.com/epiecs/free-grilly)
- The thermometer connected to your home WiFi (same network as Homey)

## Installation

Install via the [Homey App Store](https://homey.app) or sideload during development:

```bash
npm install -g homey
homey app run
```

## Pairing

1. Open the Homey app and add a new device
2. Select **FreeGrilly** → **FreeGrilly Thermometer**
3. Enter the IP address of your thermometer (find it in your router's DHCP list)
4. Tap **Connect** — the app validates the connection before adding the device

The default IP in AP mode is `192.168.200.10`. After joining your home WiFi the address is DHCP-assigned.

## Device Settings

| Setting | Default | Description |
|---|---|---|
| IP Address | `192.168.200.10` | IP of the FreeGrilly device |
| Poll interval | `5` s | How often to fetch data (1–60 s) |

## License

[Mozilla Public License 2.0](LICENSE)
