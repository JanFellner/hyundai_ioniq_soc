# Hyundai Ioniq SOC Webservice

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
- sudo apt update
- sudo apt upgrade
- sudo apt install bluetooth nodejs npm git

### Get the bluetooth device connected
Open the cover next and below the steering wheel. Use the extension cord and connect the OBD dongle to the OBD port.

Start the bluetooth agent to pair the OBD bluetooth device
*sudo bluetoothctl*

Activate the agent:
*agent on*

Activate scanning:
*scan on*
Now press the bluetooth link button on the OBD dongle

As soon as you see the bluetooth dongle you can stop scanning with *scan off*
Copy the address of the dongle.

Pair with the device and trust it
*pair XX:XX:XX:XX:XX:XX*
*trust XX:XX:XX:XX:XX:XX*

Create the serial port we will then use to communicate with the dongle
*sudo rfcomm bind hci0 XX:XX:XX:XX:XX:XX 1*

Reboot
*sudo reboot*

### Install the hyundai soc service
*git clone https://github.com/JanFellner/hyundai_ioniq_soc.git*
*cd hyundai_ioniq_soc*
*npm i*

- Touch the config with the address of the bluetooth dongle
- Turn on the ignition or start charging (Otherwise the OBD device cannot read data from the bus)
- start the service, check the console if the SOC is read from the car
- 
