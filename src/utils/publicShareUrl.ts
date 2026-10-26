/**
 * Utility for parsing and detecting Public Share URLs across query params, path, and hash.
 * Supports both modern cryptographic tokens and backward-compatible legacy share formats.
 */

export interface PublicShareRef {
  type: 'absen' | 'nilai' | 'tabungan' | 'agenda';
  shareId: string;
}

export function parsePublicShareParams(params: URLSearchParams): PublicShareRef | null {
  // 1. Direct typed share keys
  if (params.get('nilai_share')) {
    return { type: 'nilai', shareId: params.get('nilai_share')!.trim() };
  }
  if (params.get('absen_share')) {
    return { type: 'absen', shareId: params.get('absen_share')!.trim() };
  }
  if (params.get('tabungan_share')) {
    return { type: 'tabungan', shareId: params.get('tabungan_share')!.trim() };
  }
  if (params.get('agenda_share')) {
    return { type: 'agenda', shareId: params.get('agenda_share')!.trim() };
  }

  // 2. Token-based parameters: ?token=... or ?share_token=...
  const tokenParam = params.get('token') || params.get('share_token');
  if (tokenParam) {
    const rawType = params.get('type');
    let detectedType: PublicShareRef['type'] = 'nilai';
    if (rawType && ['absen', 'nilai', 'tabungan', 'agenda'].includes(rawType)) {
      detectedType = rawType as PublicShareRef['type'];
    }
    return { type: detectedType, shareId: tokenParam.trim() };
  }

  // 3. Generic share key: ?share=... or ?share_id=... or short aliases ?s=... or ?p=...
  const genericShare =
    params.get('share') ||
    params.get('share_id') ||
    params.get('s') ||
    params.get('p');

  if (genericShare) {
    const cleanShare = genericShare.trim();
    let detectedType: PublicShareRef['type'] = 'nilai';
    const explicitType = params.get('type');
    if (explicitType && ['absen', 'nilai', 'tabungan', 'agenda'].includes(explicitType)) {
      detectedType = explicitType as PublicShareRef['type'];
    } else if (cleanShare.startsWith('att_') || cleanShare.includes('absen')) {
      detectedType = 'absen';
    } else if (cleanShare.startsWith('sav_') || cleanShare.includes('tabungan')) {
      detectedType = 'tabungan';
    } else if (cleanShare.startsWith('age_') || cleanShare.includes('agenda')) {
      detectedType = 'agenda';
    }
    return { type: detectedType, shareId: cleanShare };
  }

  // 4. Preview / public / view convenience shortcuts
  const previewParam = params.get('preview') || params.get('public') || params.get('view');
  if (previewParam) {
    if (previewParam === 'absen' || previewParam === 'presensi') {
      return { type: 'absen', shareId: 'att_share_class_tkj_1' };
    }
    if (previewParam === 'nilai') {
      return { type: 'nilai', shareId: 'grade_share_class_tkj_1' };
    }
    if (previewParam === 'tabungan' || previewParam === 'kas') {
      return { type: 'tabungan', shareId: 'sav_share_class_tkj_1' };
    }
    if (previewParam === 'agenda') {
      return { type: 'agenda', shareId: 'agenda_share_class_tkj_1' };
    }
  }

  // 5. Explicit type + id / shareId parameter pair
  const typeParam = params.get('type');
  const idParam = params.get('id') || params.get('shareId');
  if (
    typeParam &&
    idParam &&
    ['absen', 'nilai', 'tabungan', 'agenda'].includes(typeParam)
  ) {
    return {
      type: typeParam as PublicShareRef['type'],
      shareId: idParam.trim(),
    };
  }

  return null;
}

export function parsePublicShareFromPath(pathname: string): PublicShareRef | null {
  if (!pathname || pathname === '/') return null;
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return null;

  // Patterns: /share/:id, /p/:id, /public/:id or /share/:type/:id, etc.
  const prefix = segments[0]?.toLowerCase();
  if (prefix === 'share' || prefix === 'p' || prefix === 'public') {
    if (segments.length >= 3) {
      const maybeType = segments[1]?.toLowerCase();
      const maybeId = segments[2];
      if (['absen', 'nilai', 'tabungan', 'agenda'].includes(maybeType)) {
        return { type: maybeType as PublicShareRef['type'], shareId: maybeId };
      }
    }
    if (segments.length >= 2) {
      const maybeId = segments[1];
      let detectedType: PublicShareRef['type'] = 'nilai';
      if (maybeId.startsWith('att_') || maybeId.includes('absen')) {
        detectedType = 'absen';
      } else if (maybeId.startsWith('sav_') || maybeId.includes('tabungan')) {
        detectedType = 'tabungan';
      } else if (maybeId.startsWith('age_') || maybeId.includes('agenda')) {
        detectedType = 'agenda';
      }
      return { type: detectedType, shareId: maybeId };
    }
  }

  return null;
}

/**
 * Universal public share detector.
 * Checks search parameters, hash parameters, and pathname.
 */
export function getPublicShareRefFromLocation(): PublicShareRef | null {
  if (typeof window === 'undefined') return null;

  // 1. Check window.location.search (?nilai_share=..., ?token=..., etc.)
  if (window.location.search) {
    const fromSearch = parsePublicShareParams(new URLSearchParams(window.location.search));
    if (fromSearch) return fromSearch;
  }

  // 2. Check window.location.hash (#nilai_share=..., #?token=...)
  if (window.location.hash) {
    const hashClean = window.location.hash.replace(/^#\??/, '');
    const fromHash = parsePublicShareParams(new URLSearchParams(hashClean));
    if (fromHash) return fromHash;
  }

  // 3. Check window.location.pathname (/share/..., /p/..., /public/...)
  if (window.location.pathname) {
    const fromPath = parsePublicShareFromPath(window.location.pathname);
    if (fromPath) return fromPath;
  }

  return null;
}
