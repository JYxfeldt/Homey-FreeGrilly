Monitor your FreeGrilly grill thermometer directly from Homey — no cloud, no MQTT broker, no intermediary. Temperature and battery data are read live from the device over your local Wi-Fi network.

Features:
- Live temperature readings from up to 8 probes simultaneously
- Battery percentage monitoring
- Low battery alarm (triggers below 20 %)
- Automatic Fahrenheit → Celsius conversion
- Configurable poll interval (1–60 seconds, default 5 s)
- Full offline operation — works entirely within your local network

Requirements:
- Homey Pro running firmware 12.0 or later
- A Grilleye Max thermometer flashed with the FreeGrilly open-source firmware
- The thermometer connected to your home Wi-Fi (same network as Homey)

Pairing:
Open the Homey app, add a new device, select FreeGrilly → FreeGrilly Thermometer, and enter the IP address of your thermometer. You can find it in your router's DHCP list. The default AP-mode address is 192.168.200.10.

After pairing you can adjust the IP address and poll interval at any time from the device settings page.
