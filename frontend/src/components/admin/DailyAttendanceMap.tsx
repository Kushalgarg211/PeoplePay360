import { Fragment, useEffect, useMemo, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, RefreshCw, Users, LogOut, Navigation, AlertCircle } from 'lucide-react';
import api from '../../lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────

interface MapEmployee {
  id: string;
  firstName: string;
  lastName: string;
  workEmail: string;
  jobPosition: string;
  workLocation: string;
  department: { id: string; name: string } | null;
}

interface MapAttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  checkIn: string;
  checkOut: string | null;
  checkInLat: number | null;
  checkInLng: number | null;
  checkOutLat: number | null;
  checkOutLng: number | null;
  status: string;
  workedHours: string | number;
  employee: MapEmployee;
}

interface TodayMapPayload {
  date: string;
  totalPresent: number;
  checkedOut: number;
  stillIn: number;
  withLocation: number;
  records: MapAttendanceRecord[];
}

// ─── Marker icons ────────────────────────────────────────────────────────────
// Leaflet's bundled PNG icons resolve to broken URLs under Vite, so markers are
// drawn as inline SVG divIcons instead — this also gives direct colour control.

function pinIcon(fill: string, ring: string) {
  return L.divIcon({
    className: '',
    html: `
      <svg width="26" height="34" viewBox="0 0 26 34" xmlns="http://www.w3.org/2000/svg">
        <path d="M13 0C5.82 0 0 5.82 0 13c0 9.2 11.51 20.16 12 20.62a1.42 1.42 0 0 0 2 0C14.49 33.16 26 22.2 26 13 26 5.82 20.18 0 13 0z"
              fill="${fill}" stroke="${ring}" stroke-width="1.5"/>
        <circle cx="13" cy="13" r="5" fill="#ffffff"/>
      </svg>`,
    iconSize:    [26, 34],
    iconAnchor:  [13, 34],
    popupAnchor: [0, -32],
  });
}

const CHECK_IN_ICON  = pinIcon('#10b981', '#047857'); // emerald — arrival
const CHECK_OUT_ICON = pinIcon('#ef4444', '#b91c1c'); // red — departure

// ─── Helpers ─────────────────────────────────────────────────────────────────

const INDIA_CENTER: [number, number] = [20.5937, 78.9629];

const fullName = (e: MapEmployee) => `${e.firstName} ${e.lastName}`;

const timeStr = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—';

const isPoint = (lat: number | null, lng: number | null): lat is number =>
  lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng);

/** Pans/zooms the map so every plotted point is visible. */
function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 15);
      return;
    }
    map.fitBounds(L.latLngBounds(points), { padding: [48, 48], maxZoom: 16 });
  }, [map, points]);

  return null;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function DailyAttendanceMap() {
  const [payload, setPayload]   = useState<TodayMapPayload | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const res = await api.get('/attendance/today-map');
      setPayload(res.data.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not load today’s attendance map.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Only records with a usable check-in fix can be drawn.
  const plotted = useMemo(
    () => (payload?.records ?? []).filter(r => isPoint(r.checkInLat, r.checkInLng)),
    [payload]
  );

  const allPoints = useMemo(() => {
    const pts: [number, number][] = [];
    for (const r of plotted) {
      pts.push([r.checkInLat as number, r.checkInLng as number]);
      if (isPoint(r.checkOutLat, r.checkOutLng)) {
        pts.push([r.checkOutLat as number, r.checkOutLng as number]);
      }
    }
    return pts;
  }, [plotted]);

  const totalPresent = payload?.totalPresent ?? 0;
  const checkedOut   = payload?.checkedOut   ?? 0;
  const stillIn      = payload?.stillIn      ?? 0;

  const todayLabel = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div className="space-y-4 animate-fade-in">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Daily Attendance Map</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Live check-in and check-out locations for {todayLabel}. Resets automatically at midnight.
          </p>
        </div>
        <button className="btn-secondary" onClick={fetchData} disabled={isLoading}>
          <RefreshCw size={13} className={isLoading ? 'animate-spin' : undefined} /> Refresh
        </button>
      </div>

      {/* ── Summary banner ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SummaryTile
          icon={<Users size={16} className="text-primary-600" />}
          label="Total Present Today"
          value={totalPresent}
          tone="bg-primary-50 border-primary-200"
        />
        <SummaryTile
          icon={<LogOut size={16} className="text-red-600" />}
          label="Checked Out"
          value={checkedOut}
          tone="bg-red-50 border-red-200"
        />
        <SummaryTile
          icon={<Navigation size={16} className="text-emerald-600" />}
          label="Still Checked In"
          value={stillIn}
          tone="bg-emerald-50 border-emerald-200"
        />
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-md px-3 py-2.5">
          <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      {/* ── Legend ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 flex-wrap text-xs text-slate-600">
        <LegendSwatch color="#10b981" label="Check-in location" />
        <LegendSwatch color="#ef4444" label="Check-out location" />
        <span className="flex items-center gap-1.5">
          <span className="w-6 border-t-2 border-dashed border-primary-600" />
          Commute path
        </span>
        {payload && plotted.length < totalPresent && (
          <span className="text-slate-400">
            {totalPresent - plotted.length} record(s) without location data
          </span>
        )}
      </div>

      {/* ── Map ────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-card overflow-hidden">
        {isLoading ? (
          <div className="h-[520px] flex items-center justify-center">
            <div className="animate-spin w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full" />
          </div>
        ) : plotted.length === 0 ? (
          <div className="h-[520px] flex flex-col items-center justify-center text-center px-6">
            <MapPin size={32} className="text-slate-300 mb-3" />
            <p className="text-sm font-semibold text-slate-700">No location data yet today</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Points appear here as employees check in with location sharing enabled.
            </p>
          </div>
        ) : (
          <MapContainer
            center={INDIA_CENTER}
            zoom={5}
            scrollWheelZoom
            style={{ height: 520, width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FitBounds points={allPoints} />

            {plotted.map((r) => {
              const inPos: [number, number] = [r.checkInLat as number, r.checkInLng as number];
              const hasOut = isPoint(r.checkOutLat, r.checkOutLng);
              const outPos: [number, number] | null = hasOut
                ? [r.checkOutLat as number, r.checkOutLng as number]
                : null;

              return (
                <Fragment key={r.id}>
                  <Marker position={inPos} icon={CHECK_IN_ICON}>
                    <Popup>
                      <MarkerPopup record={r} kind="in" />
                    </Popup>
                  </Marker>

                  {outPos && (
                    <>
                      <Marker position={outPos} icon={CHECK_OUT_ICON}>
                        <Popup>
                          <MarkerPopup record={r} kind="out" />
                        </Popup>
                      </Marker>
                      <Polyline
                        positions={[inPos, outPos]}
                        pathOptions={{ color: '#6B3A7D', weight: 3, opacity: 0.7, dashArray: '6 6' }}
                      />
                    </>
                  )}
                </Fragment>
              );
            })}
          </MapContainer>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SummaryTile({
  icon, label, value, tone,
}: { icon: React.ReactNode; label: string; value: number; tone: string }) {
  return (
    <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${tone}`}>
      <div className="shrink-0">{icon}</div>
      <div>
        <p className="text-xs font-medium text-slate-600">{label}</p>
        <p className="text-xl font-bold text-slate-900 leading-tight">{value}</p>
      </div>
    </div>
  );
}

function LegendSwatch({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function MarkerPopup({ record, kind }: { record: MapAttendanceRecord; kind: 'in' | 'out' }) {
  const e = record.employee;
  return (
    <div className="min-w-[190px]">
      <p className="text-sm font-semibold text-slate-900">{fullName(e)}</p>
      <p className="text-xs text-slate-500">{e.jobPosition}</p>
      {e.department && <p className="text-xs text-slate-500">{e.department.name}</p>}

      <div className="mt-2 pt-2 border-t border-slate-200 space-y-0.5">
        <p className="text-xs">
          <span className={kind === 'in' ? 'font-semibold text-emerald-700' : 'text-slate-500'}>
            Check in:
          </span>{' '}
          {timeStr(record.checkIn)}
        </p>
        <p className="text-xs">
          <span className={kind === 'out' ? 'font-semibold text-red-700' : 'text-slate-500'}>
            Check out:
          </span>{' '}
          {record.checkOut ? timeStr(record.checkOut) : 'Still in'}
        </p>
        <p className="text-xs text-slate-500">Status: {record.status}</p>
      </div>
    </div>
  );
}
