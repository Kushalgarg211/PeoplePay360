import { useCallback, useState } from 'react';
import api from '../lib/api';

/** A resolved browser GPS fix. */
export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

/** Why a location capture produced no coordinates. */
export type GeoFailureReason =
  | 'unsupported'   // browser exposes no Geolocation API
  | 'insecure'      // page is not HTTPS/localhost, so the API is blocked
  | 'denied'        // user declined the permission prompt
  | 'unavailable'   // hardware/OS could not produce a fix
  | 'timeout'       // no fix within the deadline
  | 'unknown';

export interface GeoResult {
  coords: Coordinates | null;
  reason: GeoFailureReason | null;
}

const GEO_MESSAGES: Record<GeoFailureReason, string> = {
  unsupported:  'This browser does not support location services.',
  insecure:     'Location requires a secure (HTTPS) connection.',
  denied:       'Location permission was denied.',
  unavailable:  'Your location could not be determined.',
  timeout:      'Timed out while getting your location.',
  unknown:      'Could not read your location.',
};

/** Human-readable note for a failed capture, or null when the fix succeeded. */
export function describeGeoFailure(reason: GeoFailureReason | null): string | null {
  if (!reason) return null;
  return `${GEO_MESSAGES[reason]} Your attendance was recorded without a location.`;
}

const GEO_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10_000,
  maximumAge: 0,
};

/**
 * Resolve the current position.
 *
 * Never rejects — geolocation is an optional enrichment, so every failure path
 * resolves to `{ coords: null, reason }` and the caller proceeds regardless.
 */
export function getCurrentCoordinates(): Promise<GeoResult> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve({ coords: null, reason: 'unsupported' });
      return;
    }

    // Browsers block the API outright on non-secure origins; detect that up
    // front so the user gets a precise message instead of a silent timeout.
    if (typeof window !== 'undefined' && window.isSecureContext === false) {
      resolve({ coords: null, reason: 'insecure' });
      return;
    }

    let settled = false;
    const finish = (result: GeoResult) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    // Safety net: some environments never invoke either callback.
    const guard = setTimeout(() => finish({ coords: null, reason: 'timeout' }), GEO_OPTIONS.timeout! + 2_000);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(guard);
        finish({
          coords: {
            latitude:  pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy:  pos.coords.accuracy,
          },
          reason: null,
        });
      },
      (err) => {
        clearTimeout(guard);
        const reason: GeoFailureReason =
          err.code === err.PERMISSION_DENIED    ? 'denied'      :
          err.code === err.POSITION_UNAVAILABLE ? 'unavailable' :
          err.code === err.TIMEOUT              ? 'timeout'     :
          'unknown';
        finish({ coords: null, reason });
      },
      GEO_OPTIONS
    );
  });
}

/** Paid leave the backend granted for overtime worked on this record. */
export interface CompOffAccrual {
  credited: boolean;
  days: number;
  overtimeHours: number;
  typeName: string;
  /** 'Approved' = spendable now; 'To_Approve' = waiting on an HR officer. */
  status: 'Approved' | 'To_Approve';
  message: string;
}

export interface AttendanceActionResult {
  record: any;
  /** Null when coordinates were captured; otherwise why they were not. */
  geoWarning: string | null;
  /** Non-null only when overtime actually earned leave — see readCompOff. */
  compOff: CompOffAccrual | null;
}

/**
 * The backend answers on every clock action, including "no overtime today".
 * Only an actual credit is worth interrupting the user with, so everything else
 * collapses to null.
 */
function readCompOff(record: any): CompOffAccrual | null {
  const accrual = record?.compOffAccrual;
  return accrual?.credited ? (accrual as CompOffAccrual) : null;
}

/**
 * Check-in / check-out actions that attach the browser's coordinates.
 *
 * A missing or refused location downgrades gracefully: the API call still
 * fires, just without `latitude`/`longitude`, and the caller receives a
 * `geoWarning` it can surface non-blockingly.
 */
export function useAttendanceActions() {
  const [isLocating, setIsLocating] = useState(false);

  const submit = useCallback(async (path: '/attendance/check-in' | '/attendance/check-out') => {
    setIsLocating(true);
    let geo: GeoResult;
    try {
      geo = await getCurrentCoordinates();
    } finally {
      setIsLocating(false);
    }

    const res = await api.post(path, {
      ...(geo.coords
        ? { latitude: geo.coords.latitude, longitude: geo.coords.longitude }
        : {}),
    });

    const record = res.data?.data;
    return {
      record,
      geoWarning: describeGeoFailure(geo.reason),
      compOff: readCompOff(record),
    } as AttendanceActionResult;
  }, []);

  const checkInWithLocation  = useCallback(() => submit('/attendance/check-in'),  [submit]);
  const checkOutWithLocation = useCallback(() => submit('/attendance/check-out'), [submit]);

  return { checkInWithLocation, checkOutWithLocation, isLocating };
}
