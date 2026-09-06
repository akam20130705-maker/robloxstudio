#!/bin/bash

# Startup script for the cloud desktop environment

echo "Starting Cloud Desktop Environment..."

# Start Xvfb (virtual framebuffer)
Xvfb :99 -screen 0 1920x1080x24 &
export DISPLAY=:99

# Start window manager
fluxbox &

# Start VNC server
x11vnc -display :99 -forever -shared -rfbport 5900 -nopw &

# Wait for VNC to start
sleep 2

# Start noVNC websocket proxy
/opt/websockify/run --web /opt/novnc 6080 localhost:5900 &

# Start GStreamer RTSP server for low-latency streaming
# This creates a screen capture stream
gst-launch-1.0 ximagesrc display-name=:99 use-damage=0 show-pointer=true ! \
    video/x-raw,framerate=30/1 ! \
    x264enc speed-preset=ultrafast tune=zerolatency byte-stream=true key-int-max=30 ! \
    rtph264pay config-interval=1 pt=96 ! \
    gdppay ! tcpserversink host=0.0.0.0 port=8554 &

# Launch Roblox Studio if installed
if [ -f "/home/desktopuser/.wine/drive_c/Program Files/Roblox/versions/latest/RobloxStudioBeta.exe" ]; then
    cd /home/desktopuser
    WINEPREFIX=/home/desktopuser/.wine wine "/home/desktopuser/.wine/drive_c/Program Files/Roblox/versions/latest/RobloxStudioBeta.exe" &
elif [ -f "/tmp/RobloxStudio.exe" ]; then
    cd /home/desktopuser
    WINEPREFIX=/home/desktopuser/.wine wine "/tmp/RobloxStudio.exe" &
else
    echo "Roblox Studio not found. Please install manually."
    # Open a terminal for manual installation
    xfce4-terminal &
fi

# Keep container running
tail -f /dev/null
