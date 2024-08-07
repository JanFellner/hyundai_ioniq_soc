sudo apt update
sudo apt upgrade
sudo apt install bluetooth nodejs


sudo bluetoothctl
agent on
scan on
pair XX:XX:XX:XX:XX:XX
trust XX:XX:XX:XX:XX:XX
sudo rfcomm bind hci0 XX:XX:XX:XX:XX:XX 1
sudo reboot