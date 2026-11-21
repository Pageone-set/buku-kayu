# BukuKayu — Aplikasi Pembukuan Usaha Kayu & Furniture Custom

Aplikasi Android **100% Offline-First** (React Native + Expo Development Build + SQLite WAL) dengan pencadangan dan pemulihan aman ke folder tersembunyi `appDataFolder` di Google Drive pribadi pengguna.

Dirancang khusus untuk operasional bengkel kayu/mebel dengan bahasa lapangan non-akuntansi (*Uang Masuk*, *Uang Keluar*, *Kasbon / Kurang Bayar*, *Stok Balok*, *Orderan Furniture*).

---

## Fitur Utama

1. **Beranda Ringkas:** Total Uang Masuk & Uang Keluar hari ini, total Kasbon / Kurang Bayar belum lunas, 2 tombol aksi cepat besar (`+ Catat Jual Kayu` & `+ Catat Order Furniture`), dan status pencadangan Google Drive.
2. **Penjualan Kayu & Kalkulator Kubikasi Otomatis:**
   - Rumus otomatis: $\text{Volume } (m^3) = \frac{\text{Panjang (cm)} \times \text{Lebar (cm)} \times \text{Tebal (cm)}}{1.000.000} \times \text{Jumlah Batang}$.
   - Preset cepat jenis kayu (`Jati`, `Mahoni`, `Sengon`, `Kamper`) dan dimensi standar (`6×12`, `8×12`, `5×10`, `2×20`).
   - Multi-item dalam 1 nota, otomatis potong stok lokal, mode **Lunas** atau **Kasbon / Kurang Bayar** (wajib nama pembeli + DP), dan kirim nota ke WhatsApp (teks atau PDF).
3. **Orderan Furniture Custom:**
   - Pantau progres pengerjaan (`Baru Pesan` → `Potong & Rakit` → `Finishing` → `Siap Kirim` → `Selesai`).
   - Catat termin pembayaran (DP, Cicilan, Pelunasan) serta biaya pengerjaan (kayu terpakai, upah tukang, cat/plitur/aksesoris) untuk melihat **Perkiraan Untung Bersih** per proyek.
4. **Stok Balok & Buku Kas Harian:**
   - Daftar stok dalam satuan batang & total $m^3$, kulakan stok, dan penyesuaian stok.
   - Buku Kas Harian yang memisahkan **Pengeluaran Usaha** dan **Ambil Pribadi (Prive)**.
5. **Backup & Restore Google Drive (`appDataFolder`):**
   - Menjalankan `PRAGMA wal_checkpoint(FULL);` sebelum snapshot database diunggah melalui Google Drive REST API v3.
   - Pemulihan aman di HP baru (validasi header SQLite, tutup koneksi DB, hapus `-wal`/`-shm` lama, rollback otomatis bila gagal).
   - Opsi pencadangan otomatis saat terhubung Wi-Fi.

---

## Perintah Pengembangan Lokal

```bash
# Pengecekan TypeScript strict mode
npm run typecheck

# Menjalankan unit test (kalkulator kubikasi, formatter, nota WA/PDF, payload Drive)
npm test

# Menjalankan Metro Dev Client (setelah Development Build terpasang di HP Android)
npx expo start --dev-client
```

---

## Panduan Setup Google Cloud Console & Build APK Android

Karena aplikasi menggunakan SQLite native dan `@react-native-google-signin/google-signin`, aplikasi harus dijalankan memakai **Expo Development Build** atau APK/AAB (bukan Expo Go).

### 1. Konfigurasi Google Cloud Console
1. Buka [Google Cloud Console](https://console.cloud.google.com/) dan buat proyek baru (misal: `BukuKayu`).
2. Masuk ke **APIs & Services → Library**, cari dan aktifkan **Google Drive API**.
3. Atur **OAuth Consent Screen**:
   - Pilih tipe **External** (atau **Internal**).
   - Tambahkan scope `https://www.googleapis.com/auth/drive.appdata`.
   - Jika masih status *Testing*, daftarkan email Google Anda di daftar **Test Users**.
4. Masuk ke **Credentials → Create Credentials → OAuth client ID**:
   - Pilih tipe aplikasi **Android**.
   - **Package name:** `com.bukukayu.app` (sesuai `app.json`).
   - **SHA-1 certificate fingerprint:** Ambil SHA-1 keystore debug/release Anda:
     ```bash
     # Untuk debug keystore lokal (setelah prebuild) atau EAS credentials:
     keytool -list -v -keystore android/app/debug.keystore -alias androiddebugkey -storepass android -keypass android
     ```
   - Simpan (tidak perlu menaruh client secret di aplikasi Android).
   - *(Opsional)* Buat juga Web Client ID jika ingin mengisi `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` di `.env` (lihat `.env.example`).

### 2. Build APK Android

#### Opsi A: Build APK Gratis via GitHub Actions (Rekomendasi jika limit EAS habis)
Workflow otomatis sudah tersedia di `.github/workflows/build-android-apk.yml`. Tidak perlu Android Studio atau kuota EAS Build:

1. Buat repository baru di GitHub (misalnya `bukukayu`), lalu push seluruh proyek dari komputer:
   ```powershell
   cd "d:\aplikasi perkayuan"
   git add .
   git commit -m "Initial commit BukuKayu"
   git branch -M main
   git remote add origin https://github.com/USERNAME_GITHUB/bukukayu.git
   git push -u origin main
   ```
2. Buka repository Anda di GitHub → klik tab **Actions** → pilih workflow **Build Android APK**.
3. Setelah selesai (status hijau), buka hasil run tersebut → gulir ke bagian **Artifacts** → unduh **`BukuKayu-release-apk`** (berisi file `BukuKayu-release.apk` siap pasang di HP Android).
4. **Untuk mengaktifkan Login Google Drive di APK:**
   - Di halaman hasil run GitHub Actions (**Summary**), lihat baris **SHA-1 Sertifikat**.
   - Salin nilai SHA-1 tersebut ke **Google Cloud Console → Credentials → Android OAuth Client ID** (`com.bukukayu.app`).
5. *(Opsional)* Jika ingin menandatangani APK rilis dengan keystore sendiri (bukan debug keystore bawaan Expo), tambahkan 4 **Repository Secrets** di GitHub (`Settings → Secrets and variables → Actions`):
   - `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`.

#### Opsi B: Cloud Build dengan EAS
```bash
cd "d:\aplikasi perkayuan"
npx eas-cli@latest login
npx eas-cli@latest init

# 1. APK mandiri offline (langsung pasang & pakai di HP tanpa perlu PC):
npx eas-cli@latest build --profile preview --platform android

# 2. Atau APK Development Build (untuk coding & live reload via `npx expo start --dev-client`):
npx eas-cli@latest build --profile development --platform android
```

#### Opsi C: Build Lokal Android
```bash
npx expo prebuild --platform android
npx expo run:android
```
