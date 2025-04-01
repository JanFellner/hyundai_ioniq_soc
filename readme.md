# Hyundai Ioniq state of charge (SOC) node webservice

This tiny node service fetches the SOC of a Hyundai Ioniq with an OBD2 bluetooth dongle. The service preferably runs on a rasperry pi. It offers a webservice which allows to query the SOC through web calls. I use it to provide the SOC to openwb - https://github.com/openWB.

The service tries to fetch the SOC periodicly. The SOC is only readable if the car is charing or the ignition is switched on. As soon as the SOC has been fetched the value is stored (also as file).
Thus the service is always able to provide a SOC even if it might be outdated. As you ask the webservice urls the SOC is instantly fetched from the car (if possible).

## Things you need to have on hand
Things you need to have:
- Raspberry PI with bluetooth support
- SD Card matching your raspberry PI. 8GB are enough.
- (USB power supply, housing etc.)
- Get an ODB Bluetooth dongle. Get one that offers a certain level of security (e.g. the device should have a button to start paring and should not be in pairing mode when it´s powered on.) I use an OBDLink LX
- Get a simple OBD extension cord (30cm) as the dongle will not allow you to close the cover otherwise. I bought one from ali for ~5€.

## Installation
* Use Raspberry PI imager to burn a current Raspberry PI OS Lite (no need for a desktop). Check that you preconfigure the wifi credentials and user credentials with the image.
* Put the sd-card in your raspi and power it up.
* Check in your wifi router for the new rasperry to get the ip.
  * Either you use a DHCP address reseveration to get a static ip
  * Or you configure a static ip within debian (sudo nano /etc/network/interfaces)

### Install the dependencies
Connect to the raspberry pi via SSH
  ```
  sudo apt update
  sudo apt upgrade
  sudo apt install bluetooth nodejs npm git
  ```

### Get the bluetooth device connected
Open the cover next and below the steering wheel. Use the extension cord and connect the OBD dongle to the OBD port.

* Start the bluetooth agent to pair the OBD bluetooth device
  ```
  sudo bluetoothctl
  ```

* Activate the agent
  ```
  agent on
  ```

* Activate scanning
  ```
  scan on
  ```

Now press the bluetooth link button on the OBD dongle

* As soon as you see the bluetooth dongle you can stop scanning with
  ```
  scan off
  ```
  **Copy the address of the dongle.**
  
* Pair with the device and trust it
  ```
  pair XX:XX:XX:XX:XX:XX
  ```
  Follow the wizard and acknowledge as you are prompted to do so.
  ```
  trust XX:XX:XX:XX:XX:XX
  ```

* Exit the bluetooth tool 
  ```
  exit
  ```

* Create the serial port we will then use to communicate with the dongle
  ```
  sudo rfcomm bind hci0 XX:XX:XX:XX:XX:XX 1
  ```
  
* Reboot
  ```
  sudo reboot
  ```

### Install the hyundai soc service
Check out the repo, preferably in /usr/local/bin/

```
git clone https://github.com/JanFellner/hyundai_ioniq_soc.git
cd hyundai_ioniq_soc
```

- Touch the .env config as appropriate. <span style="color:red">You need to set the proper OBD dongle MAC address (as used before).<span style="color:red">

```
sudo nano .env
```

You can now manually start the service and check the status on the console. ***Ensure that the car is either charging or the ignition is switched on!*** Otherwise you won´t get any SOC.

```
npm run serve
```

This will checkout node libraries, compile the sources and run the service.
The service provides three web url entry points that serve the SOC information.

- http://rasperries_ip/
  - Provides a simple status page with links to the following pages, logs, some interaction possibilities
- http://rasperries_ip/soc_double
  - Provides the SOC with decimals (95.5%)
- http://rasperries_ip/soc_integer
  - Provides the SOC as integer (95%)
- http://rasperries_ip/distance
  - Provides the theoretical distance, based on the SOC (210)

Once everything looks good you can call the setup_service.sh to register it as service so that it automatically starts (and restarts 😉)

```
chmod +x setup_service.sh
sudo ./setup_service.sh
```

The soc service is not regsitered as ioniqsoc.
You may query the status and log entries with

```
systemctl status ioniqsoc
```

Happy charging 😁🔌⚡️🚗
