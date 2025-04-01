#!/bin/bash

# Variables
SERVICE_NAME="ioniqsoc"
DESCRIPTION="Hyundai Ioniq state of charge service"
USER=$(whoami)
WORKING_DIR=$(pwd)
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

# Check if script is run as root
if [[ "$EUID" -ne 0 ]]; then 
  echo "Please run as root"
  exit 1
fi

# Create systemd service file
echo "Creating systemd service file at ${SERVICE_FILE}..."

cat <<EOT > $SERVICE_FILE
[Unit]
Description=$DESCRIPTION
After=network.target

[Service]
ExecStart=/usr/bin/npm run serve
WorkingDirectory=$WORKING_DIR
Restart=always
RestartSec=10
User=$USER
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOT

# Allow any user to call l2ping
setcap cap_net_raw+ep /usr/bin/l2ping

# Reload systemd to apply new service
echo "Reloading systemd..."
systemctl daemon-reload

# Enable and start the service
echo "Enabling and starting $SERVICE_NAME service..."
systemctl enable $SERVICE_NAME.service
systemctl start $SERVICE_NAME.service

# Check status
echo "Checking status of $SERVICE_NAME service..."
systemctl status $SERVICE_NAME.service