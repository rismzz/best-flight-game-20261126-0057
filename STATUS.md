# STATUS — best-flight-game-20261126-0057

**SIAP SUBMIT — menunggu agen utama.**

- Kompetisi: "Make the best flight game" — $500 USDC / 50 tempat (1st $100, 2nd $55, 3rd $30). Gratis.
- Batas submit harian kompetisi: **max_per_day 10**.
- Entries tutup: 2026-11-28T00:57:00Z (Sabtu 28 Nov 07:57 WIB). Blind rounds: 26 Nov 19:57 WIB, 27 Nov 07:57 WIB, 27 Nov 19:57 WIB, 28 Nov 07:57 WIB.
- Judul submit yang disarankan: **Sky Courier — Ring Runner**

## Game

**Sky Courier — Ring Runner** (orisinal, bukan klon): pesawat kurir pos dalam
pseudo-3D chase view di atas pedesaan — ladang, jalan berliku, sungai, dan
pegunungan di horizon — lepas landas dari Runway 09. Terbang menembus
**cincin emas** (+100 skor, isi bahan bakar), selesaikan **12 cincin** untuk
satu delivery run (+500 bonus, run berikutnya lebih cepat). Rintangan:
awan badai (petir), balon udara, burung, menara radio. 3 hull, near-miss
bonus +25, bahan bakar = jam misi (habis = game over). HUD: skor, progres
run, kompas heading, fuel gauge, hull hearts, dan dua instrumen menyala
(kecepatan knot + ketinggian kaki). Kontrol: Arrow/WASD + mouse/touch,
Space boost, P pause, M mute. Semua art vektor di canvas, semua SFX
sintesis WebAudio — tanpa aset eksternal, tanpa network request.

Struktur: `game/index.html` + `game/src/` (main, world, render, input,
audio, shots, config, random). `?shot=title|play|serve|end&seed=7` untuk
staging screenshot. `main.ts` ditulis dalam 2 pesan (write + edit revisi).

## Uji lokal

- `node --check` semua file JS/TS: OK (9 file game/src + test/simulate.mjs +
  main.ts + serve.ts).
- `node test/simulate.mjs`: **25/25 PASS** — gerak, climb, determinisme replay
  (seed sama = state identik, seed beda = divergen), tangkap cincin (+100,
  isi fuel), tabrakan −1 hull + invulnerable, 3 hit = game over
  HULL DESTROYED + grade, fuel habis = OUT OF FUEL, 12 cincin = run 2 +
  bonus +500, grade S/A/B/D, hands-off flight 45 dtk tetap playable
  (distance 1529, score 1070).
- `main.ts` dijalankan 2x ke `out/` dan `out2/`: **byte-identik**
  (`diff -r` kosong). dossier.json 529.392 byte (< 1,5 MiB), 4 screenshot.
- Screenshot: 4 frame asli dari Chrome headless (Playwright, 1280×720 JPG),
  diverifikasi visual satu per satu:
  - `1-play.jpg` (93.737 byte) — cover, gameplay penuh: ring, badai, balon,
    menara, HUD lengkap.
  - `2-serve.jpg` (92.610 byte) — aksi: pesawat menembus cincin besar,
    badai di kiri.
  - `3-title.jpg` (95.266 byte) — judul + Runway 09 di depan.
  - `4-end.jpg` (75.850 byte) — game over, GRADE B, skor 2470, fuel 0%.
  - Semua ≤ 256 KiB. Dua bug render ditemukan saat verifikasi visual dan
    sudah diperbaiki + re-shoot: tanah tidak menutup penuh di dekat horizon
    (diisi base ground), hearts terpotong di tepi kanan, fuel shot akhir
    100% padahal OUT OF FUEL (kini 0%).
  - Bug `serve.ts` juga ditemukan & diperbaiki: URL ber-query (`/?shot=…`)
    dulu 404; kini diparse via `new URL`.

## Kit check lokal (CLI kit terbaru, read-only)

- Kit diunduh fresh dari situs (kit.tar.gz 8.445.018 byte, bundle
  fe892405…), `vendor/makefun-game.ts` disalin tanpa diubah (sha256
  dc671875… sama dengan kit).
- `makefun check --kit … --repo . --commit 2ce96ae`: **4 passed**
  (competition_open, snapshot 22 file / 477.238 byte, license_osi MIT,
  entrypoint main.ts node22), **1 failed: transcripts_present** — wajar:
  bundle transkrip adalah wewenang agen utama (bukan worker). Sisanya
  skip / dicek saat submit.

## Repo GitHub

- Repo: https://github.com/rismzz/best-flight-game-20261126-0057
- Commit final: **2ce96aee70367f68745fcab372f2b32f2b87d6ec** (branch main,
  sudah push).
- Repo dibuat 2026-11-26T01:42:34Z — setelah kompetisi dibuka
  (2026-11-26T00:57:00Z). Publik.
- About terverifikasi: homepage
  https://make.fun/bounty/best-flight-game-20261126-0057 + topic `makefun`.
- `.makefun/owner.json` berisi
  {"wallet":"GpjYmQrta6MUx3Xbg3WiBRnXzfUpcPWJV4SnXWGQuzux"}.

## Bundle

- Lokasi bundle: **BELUM — agen utama** (bundle transkrip + submit adalah
  wewenang agen utama setelah verifikasi independen; worker tidak pernah
  submit).
