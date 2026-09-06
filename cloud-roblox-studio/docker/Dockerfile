FROM ubuntu:22.04

# Avoid interactive prompts during build
ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=UTC

# Install base dependencies
RUN apt-get update && apt-get install -y \
    software-properties-common \
    curl \
    wget \
    gnupg \
    ca-certificates \
    git \
    sudo \
    xvfb \
    x11vnc \
    fluxbox \
    supervisor \
    net-tools \
    procps \
    pulseaudio \
    ffmpeg \
    gstreamer1.0-tools \
    gstreamer1.0-plugins-base \
    gstreamer1.0-plugins-good \
    gstreamer1.0-plugins-bad \
    gstreamer1.0-plugins-ugly \
    libgstreamer1.0-dev \
    libgstrtspserver-1.0-dev \
    gir1.2-gst-rtsp-server-1.0 \
    python3 \
    python3-pip \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

# Install Wine for running Windows applications (Roblox Studio)
RUN dpkg --add-architecture i386 && \
    apt-get update && \
    apt-get install -y wine64 wine32 winetricks && \
    rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -m -s /bin/bash desktopuser && \
    echo "desktopuser:password" | chpasswd && \
    adduser desktopuser sudo

# Set up working directories
WORKDIR /home/desktopuser
RUN chown -R desktopuser:desktopuser /home/desktopuser

# Install noVNC for browser-based VNC access
RUN git clone https://github.com/novnc/noVNC.git /opt/novnc && \
    git clone https://github.com/novnc/websockify.git /opt/websockify && \
    ln -s /opt/novnc/vnc.html /opt/novnc/index.html

# Install Roblox Studio via Wine (this will download and install)
USER desktopuser
RUN mkdir -p /home/desktopuser/.wine && \
    WINEPREFIX=/home/desktopuser/.wine winetricks corefonts vcrun2015 vcrun2017 vcrun2019 dotnet48 || true

# Download Roblox Studio installer (using official URL)
RUN cd /tmp && \
    wget -O RobloxStudio.exe "https://www.roblox.com/download/client?os=win" || \
    wget -O RobloxStudio.exe "https://setup.roblox.com/RobloxPlayerLauncher.exe" || \
    echo "Roblox Studio installer download failed - will be installed manually"

# Note: Actual Roblox Studio installation requires manual intervention or specific version URL
# For production, you would pre-install a specific version of Roblox Studio

# Create startup script
COPY docker/startup.sh /startup.sh
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
RUN chmod +x /startup.sh

USER root

# Expose ports
# 6080 - noVNC web interface
# 8554 - GStreamer RTSP stream
EXPOSE 6080 8554 5900

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
