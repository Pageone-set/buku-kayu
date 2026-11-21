# BukuKayu — Design System v3.0 ("Financial Stability" Ultra-Clean Minimalist)

Panduan resmi tampilan visual, arsitektur warna **Financial Stability**, navigasi kapsul gelap mengambang (*Floating Charcoal Pill Tab Bar*), ikonografi minimalis **Feather**, tipografi, dan ergonomi bengkel aplikasi **BukuKayu**.

---

## 1. Filosofi Desain: *Ultra-Clean Financial Stability*
Menggabungkan **estetika produk finansial ultra-bersih** (latar off-white lega `#F7F9FB`, kartu putih murni `#FFFFFF` bertepi halus `#E6ECF2`, chip filter aktif `#333333`, serta bilah navigasi kapsul gelap mengambang `#333333` dengan ikon garis tipis **Feather**) dan **identitas kestabilan Finansial** (`#0A3C6E` Deep Navy + `#1783C1` Ocean Blue) dengan **ergonomi bengkel lapangan** (tombol `>= 54px`, angka `tabular-nums`, dan 100% bahasa bengkel non-akuntansi).

---

## 2. Palet Warna Resmi (*Financial Stability*) (`src/theme/tokens.ts`)

### A. 4 Warna Inti Referensi
| Peran | Token | Hex | Kegunaan |
| :--- | :--- | :--- | :--- |
| **Primary Navy** | `navy` (`walnut`, `amber`) | `#0A3C6E` | Kartu Hero Beranda, CTA utama (`+ Catat Jual Kayu`), header nota PDF, teks total utama, ikon aplikasi |
| **Pure White** | `surface` (`textOnDark`) | `#FFFFFF` | Kartu konten, kotak pencarian kapsul, input modal, ikon/teks di atas kartu gelap |
| **Ocean Blue** | `ocean` (`blue`) | `#1783C1` | CTA sekunder (`+ Catat Order Furniture`), titik indikator tab aktif, tautan `Buku Kas ->`, ikon dimensi & orderan |
| **Deep Charcoal** | `charcoal` (`navBarBg`) | `#333333` | **Floating Pill Bottom Navigation Bar**, chip filter aktif (`Semua`, `Lunas`, `Sedang Jalan`), chip kayu terpilih |

### B. Kanvas, Hairline & Tinta Netral
| Token | Hex | Peran |
| :--- | :--- | :--- |
| `bg` | `#F7F9FB` | Latar kanvas utama (ultra-bersih, ringan di mata) |
| `surfaceSubtle` | `#EFF3F7` | Chip pasif tanpa border, kolom *Dimension Spec Strip*, kotak ringkasan metrik |
| `border` / `borderStrong` | `#E6ECF2` / `#CBD5E1` | Hairline pembatas kartu & garis input |
| `textPrimary` | `#222831` | Judul, angka Rupiah besar, teks utama (kontras tinggi) |
| `textSecondary` / `textMuted` | `#5A6675` / `#8B97A6` | Subjudul, metadata waktu, placeholder, ikon tab non-aktif (`#9CA3AF` di atas kapsul `#333333`) |

### C. Warna Status Transaksi
| Token | Hex Utama | Tint Latar | Kegunaan |
| :--- | :--- | :--- | :--- |
| `green` | `#15803D` | `#EAF7EF` | **Uang Masuk**, status **Lunas**, indikator aman offline, tombol WhatsApp/simpan bayar |
| `red` | `#C0392B` | `#FDECEC` | **Uang Keluar**, **Kasbon / Kurang Bayar**, stok menipis (`<= 5 btg`), tombol hapus |

---

## 3. Bilah Navigasi Kapsul Mengambang & Ikonografi (`Feather`)
Diimplementasikan di [\_layout.tsx](file:///d:/aplikasi%20perkayuan/src/app/(tabs)/_layout.tsx) dengan komponen `FloatingPillTabBar`:
- **Bentuk Kapsul Mengambang:** `backgroundColor: #333333`, `borderRadius: 999`, tinggi `66px`, margin horizontal `16px`, melayang di atas *safe area* bawah dengan bayangan lembut (`SHADOWS.navPill`). Semua 5 halaman tab menambahkan `paddingBottom: 104` agar konten tidak pernah tertutup kapsul.
- **5 Ikon Minimalis `Feather` (`@expo/vector-icons`, ukuran `20px`):**
  1. `index` (**Beranda**) -> `home`
  2. `sales` (**Jual**) -> `file-text`
  3. `orders` (**Orderan**) -> `layers`
  4. `stock` (**Stok**) -> `box`
  5. `cashflow` (**Kas**) -> `credit-card`
- **Status Aktif:** Wadah pil lembut `rgba(255, 255, 255, 0.12)`, ikon & teks `#FFFFFF`, dan titik aksen **Ocean Blue** (`#1783C1`, `4×4px`). Tab pasif berwarna `#9CA3AF`.

---

## 4. Tipografi & Hierarki (`Plus Jakarta Sans`)
Dipaketkan lokal via `@expo-google-fonts/plus-jakarta-sans` agar tetap 100% stabil saat bengkel berada di area tanpa sinyal internet:
- `hero` (`28px`, ExtraBold 800): Nama bengkel di Beranda
- `amountLg` (`26px`, ExtraBold 800, `tabular-nums`): Total nota & Kasbon belum lunas
- `title` (`24px`, ExtraBold 800): Judul halaman tab
- `heading` / `amountMd` (`20px`, ExtraBold 800): Judul modal & angka Uang Masuk/Keluar
- `subhead` (`18px`, Bold/ExtraBold): Nama item & subjudul seksi
- `body` (`16px`, Regular/Bold): Teks isi, input, tombol aksi
- `label` (`14px`) & `caption` (`13px`) / tab label (`10px`)

---

## 5. Identitas Merek & Aset (`assets/`)
- [bukukayu-mark.svg](file:///d:/aplikasi%20perkayuan/assets/logo/bukukayu-mark.svg) & [icon.png](file:///d:/aplikasi%20perkayuan/assets/icon.png): Latar `#0A3C6E` Deep Navy dengan lambang buku catatan terbuka (`#FFFFFF`) & balok kayu geometris (`#1783C1`).
- [bukukayu-wordmark.svg](file:///d:/aplikasi%20perkayuan/assets/logo/bukukayu-wordmark.svg): Lockup horizontal `#333333` Charcoal + `#0A3C6E` Navy + tagline `#1783C1` Ocean Blue.
- [bukukayu-monochrome.svg](file:///d:/aplikasi%20perkayuan/assets/logo/bukukayu-monochrome.svg): Versi garis monokrom `#333333` untuk cetak/stempel.

---

## 6. Kepatuhan Ergonomi & Bahasa Bengkel
- Tinggi tombol minimum: `54px` (`PrimaryButton md`) dan `60px` (`PrimaryButton lg`), item navigasi `>= 52px`, chip filter `46px`.
- 100% bebas istilah akuntansi rumit (*tanpa Jurnal, Neraca, Piutang, Utang, Buku Besar, HPP, Laba Rugi, Debit, Kredit*).
