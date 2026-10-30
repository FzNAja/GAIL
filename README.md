# GAIL

## Setup Supabase

1. Buat proyek Supabase dan aktifkan Email/Password di Authentication.
2. Buat akun admin melalui Supabase Authentication.
3. Ganti `GANTI_DENGAN_EMAIL_SUPER_ADMIN` di bagian akhir `supabase-schema.sql` dengan email akun tersebut, lalu jalankan seluruh SQL melalui SQL Editor Supabase.
4. Isi `url` dan `anonKey` di `supabase-config.js` menggunakan Project URL dan publishable/anon key dari pengaturan proyek. Jangan pernah masukkan service-role key ke frontend.
5. Jalankan situs melalui server lokal atau hosting statis. Dashboard Admin akan muncul setelah login jika profil pengguna memiliki role `super_admin`.

Dashboard mengelola blok konten teks yang diterbitkan pada halaman, masukan pengguna, dan hasil riset. Konten yang sudah tertanam di halaman tidak dihapus atau diganti; blok terbitan ditambahkan setelah konten halaman. Progres siswa tetap tersimpan lokal di perangkat.

Jika akun admin lain perlu ditambahkan, buat akun melalui Authentication lalu jalankan perintah berikut di SQL Editor dengan UUID akun yang benar:

```sql
insert into public.profiles (id, role)
values ('UUID_AKUN_AUTH', 'super_admin')
on conflict (id) do update set role = excluded.role;
```