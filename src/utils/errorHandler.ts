/**
 * Transforms technical errors (network, database, auth) into clear,
 * human-readable Indonesian messages for UI presentation.
 */
export function formatUserFriendlyError(err: unknown): string {
  if (!err) return 'Terjadi kendala yang tidak diketahui. Silakan coba lagi.';

  const rawMsg = err instanceof Error ? err.message : String(err);
  const lower = rawMsg.toLowerCase();

  if (
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('fetch failed') ||
    lower.includes('offline') ||
    lower.includes('err_connection') ||
    lower.includes('err_name_not_resolved')
  ) {
    return 'Koneksi ke server terputus atau jaringan internet Anda tidak stabil. Silakan periksa koneksi lalu klik Coba Lagi.';
  }

  if (
    lower.includes('jwt expired') ||
    lower.includes('invalid refresh token') ||
    lower.includes('session expired') ||
    lower.includes('token is expired')
  ) {
    return 'Sesi masuk Anda telah berakhir demi keamanan. Silakan muat ulang halaman untuk masuk kembali.';
  }

  if (lower.includes('duplicate key') || lower.includes('unique constraint') || lower.includes('23505')) {
    return 'Data ini sudah terdaftar sebelumnya di sistem. Silakan periksa kembali entri Anda.';
  }

  if (
    lower.includes('permission denied') ||
    lower.includes('row-level security') ||
    lower.includes('violates row-level security')
  ) {
    return 'Anda tidak memiliki hak akses untuk memodifikasi data ini.';
  }

  if (lower.includes('relation') && lower.includes('does not exist')) {
    return 'Struktur tabel database sedang dalam sinkronisasi. Harap tunggu beberapa saat.';
  }

  if (lower.includes('abort') || lower.includes('cancelled')) {
    return 'Proses pengambilan data dibatalkan.';
  }

  // If already concise and doesn't look like code or json
  if (rawMsg.length < 120 && !rawMsg.includes('{') && !rawMsg.includes('at ') && !rawMsg.includes('TypeError:')) {
    return rawMsg;
  }

  return 'Terjadi kendala saat memproses data. Silakan coba lagi dalam beberapa saat.';
}
