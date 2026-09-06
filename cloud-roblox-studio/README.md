# Cloud Roblox Studio - To'liq O'rnatish Qo'llanmasi

Eski noutbuklar uchun brauzerda Roblox Studio ishlatish imkonini beruvchi Cloud Desktop loyihasi.

## 📋 Loyiha Tuzilmasi

```
cloud-roblox-studio/
├── docker/
│   ├── Dockerfile              # Ubuntu + XFCE + Wine + noVNC + GStreamer
│   ├── docker-compose.yml      # Konteynerlarni boshqarish
│   ├── startup.sh              # Ishga tushirish skripti
│   └── supervisord.conf        # Jarayonlarni boshqarish
├── backend/
│   ├── server.js               # Node.js/Express API server
│   ├── package.json            # Backend dependensiyalari
│   ├── .env.example            # Muhit o'zgaruvchilari namunasi
│   └── Dockerfile              # Backend konteyneri
└── frontend/
    ├── index.html              # Veb-interfeys
    ├── styles.css              # Zamonaviy UI dizayn
    └── app.js                  # Frontend JavaScript logikasi
```

## 🔧 Talablar

- **Docker** (versiya 20.10+)
- **Docker Compose** (versiya 2.0+)
- **Kamida 4GB RAM** (8GB+ tavsiya etiladi)
- **2+ CPU yadrolar**
- **Tez internet aloqasi** (streaming uchun)

## 🚀 O'rnatish Bosqichlari

### 1-qadam: Loyihani Yuklab Olish

```bash
cd /workspace/cloud-roblox-studio
```

### 2-qadam: Backend Sozlash

```bash
# Backend papkasiga o'ting
cd backend

# Muhit o'zgaruvchilarini sozlang
cp .env.example .env

# .env faylini tahrirlang va maxfiy kalitlarni o'zgartiring
nano .env
```

**.env fayli mazmuni:**
```env
NODE_ENV=production
PORT=3000
JWT_SECRET=sizning-maxfiy-kalitingiz-bu-yerda-ozgartiring
DESKTOP_CONTAINER_URL=http://cloud-desktop:6080
```

### 3-qadam: Docker Image-larni Qurish

```bash
# Asosiy papkaga qayting
cd ..

# Docker image-larni quring (bu jarayon 10-15 daqiqa davom etishi mumkin)
docker-compose build
```

### 4-qadam: Konteynerlarni Ishga Tushirish

```bash
# Barcha xizmatlarni ishga tushiring
docker-compose up -d

# Loglarni kuzatish
docker-compose logs -f
```

### 5-qadam: Xizmatlarni Tekshirish

```bash
# Ishlayotgan konteynerlarni ko'rish
docker-compose ps

# Portlarni tekshirish
netstat -tlnp | grep -E '3000|3001|6080|8554|5900'
```

## 🌐 Kirish Manzillari

| Xizmat | Port | URL | Tavsif |
|--------|------|-----|---------|
| **Frontend** | 8080 | http://localhost:8080 | Foydalanuvchi interfeysi |
| **Backend API** | 3000 | http://localhost:3000/api | REST API |
| **WebSocket** | 3001 | ws://localhost:3001 | Real-time aloqa |
| **noVNC** | 6080 | http://localhost:6080 | Brauzerda desktop |
| **GStreamer RTSP** | 8554 | rtsp://localhost:8554/stream | Video streaming |
| **VNC Server** | 5900 | localhost:5900 | To'g'ridan-to'g'ri VNC |

## 📱 Foydalanish Qo'llanmasi

### 1. Dastlabki Ro'yxatdan O'tish

1. Brauzerda `http://localhost:8080` manziliga o'ting
2. **"Sign Up"** tugmasini bosing
3. Foydalanuvchi nomi va parol kiriting
4. Hisob yaratilgandan keyin **"Login"** qiling

### 2. Roblox Studio Sessiyasini Boshlash

1. **"🚀 Start Roblox Studio"** tugmasini bosing
2. Tizim avtomatik ravishda Docker konteynerini ishga tushiradi
3. 15-30 soniya kuting (desktop tayyor bo'lguncha)
4. Roblox Studio brauzer oynasida paydo bo'ladi

### 3. To'liq Ekranda Ishlash

- **Fullscreen** tugmasini bosing yoki **F11** klavishini qisging
- Chiqish uchun yana **F11** yoki **ESC**

### 4. Sessiyani To'xtatish

- **"Stop Session"** tugmasini bosing
- Barcha resurslar ozod qilinadi

## 🔑 Muhim Fayllar Tavsifi

### Dockerfile (docker/Dockerfile)

Ubuntu 22.04 bazasida quyidagilarni o'z ichiga oladi:
- **Xvfb**: Virtual displey
- **Fluxbox**: Yengil oynalar menejeri
- **x11vnc**: VNC server
- **noVNC**: Brauzerda VNC klienti
- **Wine**: Windows dasturlarini Linux'da ishga tushirish
- **GStreamer**: Ultra-low latency video streaming
- **Roblox Studio**: Wine orqali o'rnatilgan

### docker-compose.yml

- **cloud-desktop**: Asosiy desktop konteyneri
- **backend**: Node.js API serveri
- **Persistent volumes**: Ma'lumotlarni saqlash
- **Network**: Izolyatsiyalangan tarmoq

### server.js (backend)

API endpoint'lari:
- `POST /api/register` - Yangi foydalanuvchi ro'yxati
- `POST /api/login` - Autentifikatsiya
- `POST /api/start-session` - Desktop sessiyasini boshlash
- `POST /api/stop-session/:id` - Sessiyani to'xtatish
- `GET /api/session/:id` - Sessiya holatini tekshirish
- `POST /api/logout` - Chiqish

### index.html & app.js (frontend)

- Zamonaviy responsive dizayn
- Real-time WebSocket aloqa
- Full-screen video streaming
- FPS/Latency monitoring
- Foydalanuvchi dashboard'i

## ⚙️ Konfiguratsiya Parametrlari

### Streaming Sifatini Sozlash

`docker/startup.sh` faylida GStreamer parametrlarini o'zgartiring:

```bash
# Yuqori sifat (ko'proq bandwidth)
x264enc speed-preset=ultrafast tune=zerolatency bitrate=8000

# O'rta sifat (tavsiya etiladi)
x264enc speed-preset=ultrafast tune=zerolatency bitrate=5000

# Past sifat (sekin internet uchun)
x264enc speed-preset=ultrafast tune=zerolatency bitrate=2000
```

### Rezolyutsiyani O'zgartirish

`docker/docker-compose.yml` faylida:

```yaml
environment:
  - RESOLUTION=1280x720x24  # HD
  # - RESOLUTION=1920x1080x24  # Full HD (default)
  # - RESOLUTION=2560x1440x24  # 2K
```

## 🐛 Muammolarni Bartaraf Etish

### Konteyner ishga tushmayapti

```bash
# Loglarni tekshiring
docker-compose logs cloud-desktop

# Konteynerni qayta ishga tushiring
docker-compose restart cloud-desktop
```

### Video streaming ishlamayapti

```bash
# GStreamer paketlari o'rnatilganligini tekshiring
docker exec roblox-cloud-desktop gst-launch-1.0 --version

# Port ochiqligini tekshiring
telnet localhost 8554
```

### Roblox Studio yuklanmayapti

```bash
# Konteyner ichiga kiring
docker exec -it roblox-cloud-desktop bash

# Wine konfiguratsiyasini tekshiring
su - desktopuser
winecfg

# Roblox Studio'ni qayta o'rnating
cd /tmp
wget https://www.roblox.com/download/client?os=win -O RobloxStudio.exe
wine RobloxStudio.exe
```

### noVNC ulanmayapti

```bash
# noVNC xizmatini qayta ishga tushiring
docker exec roblox-cloud-desktop supervisorctl restart novnc

# Websockify holatini tekshiring
docker exec roblox-cloud-desktop netstat -tlnp | grep 6080
```

## 🔒 Xavfsizlik Tavsiyalari

1. **JWT_SECRET** ni albatta o'zgartiring
2. Production'da **HTTPS** ishlatng
3. **Firewall** sozlang (faqat kerakli portlar)
4. Muntazam ravishda **security updates** o'rnating
5. Foydalanuvchilar uchun **session timeout** sozlang

```bash
# Firewall sozlash (Ubuntu)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3000/tcp
sudo ufw enable
```

## 📊 Monitoring va Logging

```bash
# Real-time loglar
docker-compose logs -f

# Resurslardan foydalanish
docker stats

# Konteyner ichiga kirish
docker exec -it roblox-cloud-desktop bash

# Backend loglari
docker exec roblox-backend tail -f /app/logs/app.log
```

## 🔄 Yangilash

```bash
# Kodni yangilash
git pull

# Image-larni qayta qurish
docker-compose build --no-cache

# Xizmatlarni qayta ishga tushirish
docker-compose down
docker-compose up -d
```

## 📝 Eslatmalar

⚠️ **Muhim:**
- Roblox Studio litsenziyasi talab qilinishi mumkin
- Wine orqali ishlaganligi sababli ba'zi funksiyalar cheklangan bo'lishi mumkin
- Streaming uchun barqaror internet aloqasi zarur (min. 10 Mbps)
- Birinchi ishga tushirishda Wine konfiguratsiyasi uchun qo'shimcha vaqt ketadi

## 🎯 Keyingi Qadamlar

1. **WebRTC optimallashtirish** - yanada past latency uchun
2. **Load balancing** - ko'p foydalanuvchilar uchun
3. **Database integratsiyasi** - PostgreSQL/MongoDB
4. **CI/CD pipeline** - avtomatik deploy
5. **Monitoring dashboard** - Prometheus + Grafana

## 📞 Yordam

Muammolar yuzaga kelsa:
1. Loglarni tekshiring: `docker-compose logs -f`
2. GitHub Issues oching
3. Discord/Jammer jamoasiga qo'shiling

---

**Loyiha muallifi:** Cloud Roblox Studio Team  
**Versiya:** 1.0.0  
**Litsenziya:** MIT
