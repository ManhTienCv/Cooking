import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Search, Navigation, Check, X, Loader2, Sparkles, Building2 } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import toast from 'react-hot-toast';
import { apiJson } from '../../lib/api';

// Fix Leaflet's default marker icon issue in bundlers like Vite
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export interface SelectedMapAddress {
  fullAddress: string;
  road?: string;
  ward?: string;
  district?: string;
  city?: string;
  lat?: number;
  lon?: number;
  ghnDistrictId?: number;
  ghnWardCode?: string;
}

interface MapAddressModalProps {
  open: boolean;
  onClose: () => void;
  onSelectAddress: (data: SelectedMapAddress) => void;
  initialAddress?: string;
}

interface NominatimResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  address?: {
    road?: string;
    suburb?: string;
    quarter?: string;
    neighbourhood?: string;
    city_district?: string;
    county?: string;
    district?: string;
    city?: string;
    state?: string;
    country?: string;
    house_number?: string;
  };
}

export function MapAddressModal({
  open,
  onClose,
  onSelectAddress,
  initialAddress,
}: MapAddressModalProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [resolving, setResolving] = useState(false);

  // Resolved address details
  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number;
    lon: number;
    fullAddress: string;
    road?: string;
    ward?: string;
    district?: string;
    city?: string;
    ghnDistrictId?: number;
    ghnWardCode?: string;
  }>({
    lat: 21.0285, // Mặc định Hà Nội
    lon: 105.8542,
    fullAddress: initialAddress || 'Hà Nội, Việt Nam',
  });

  // GHN Districts cache for matching
  const [ghnDistricts, setGhnDistricts] = useState<Array<{ DistrictID: number; DistrictName: string; ProvinceID: number }>>([]);

  // Fetch GHN Districts for matching
  useEffect(() => {
    if (!open) return;
    apiJson<{ success: boolean; data: Array<{ DistrictID: number; DistrictName: string; ProvinceID: number }> }>('/api/marketplace/shipping/ghn/districts/201') // Hanoi default
      .then((res) => {
        if (res.data) setGhnDistricts(res.data);
      })
      .catch(() => {});
  }, [open]);

  // Reverse geocode coordinate into address using Nominatim
  const reverseGeocode = useCallback(async (lat: number, lon: number) => {
    setResolving(true);
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`;
      const res = await fetch(url, {
        headers: { 'Accept-Language': 'vi' },
      });
      if (!res.ok) throw new Error('Không thể lấy địa chỉ');
      const data: NominatimResult = await res.json();

      const addr = data.address || {};
      const houseNumber = addr.house_number ? `${addr.house_number} ` : '';
      const road = addr.road ? `${houseNumber}${addr.road}` : '';
      const ward = addr.suburb || addr.quarter || addr.neighbourhood || '';
      const district = addr.city_district || addr.county || addr.district || '';
      const city = addr.city || addr.state || 'Việt Nam';

      const parts = [road, ward, district, city].filter(Boolean);
      const full = parts.length > 0 ? parts.join(', ') : data.display_name;

      // Match GHN District if possible
      let matchedDistrictId: number | undefined;
      if (district && ghnDistricts.length > 0) {
        const dClean = district.toLowerCase().replace(/(quận|huyện|thị xã|tp|thành phố)\s+/g, '').trim();
        const match = ghnDistricts.find((d) => d.DistrictName.toLowerCase().includes(dClean));
        if (match) matchedDistrictId = match.DistrictID;
      }

      setSelectedLocation({
        lat,
        lon,
        fullAddress: full,
        road,
        ward,
        district,
        city,
        ghnDistrictId: matchedDistrictId,
      });
    } catch {
      setSelectedLocation((prev) => ({
        ...prev,
        lat,
        lon,
        fullAddress: `Tọa độ: ${lat.toFixed(5)}, ${lon.toFixed(5)}`,
      }));
    } finally {
      setResolving(false);
    }
  }, [ghnDistricts]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!open) return;

    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return;

      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current, {
          center: [selectedLocation.lat, selectedLocation.lon],
          zoom: 15,
          zoomControl: false,
        });

        L.control.zoom({ position: 'bottomright' }).addTo(map);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap',
        }).addTo(map);

        const marker = L.marker([selectedLocation.lat, selectedLocation.lon], {
          icon: defaultIcon,
          draggable: true,
        }).addTo(map);

        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          void reverseGeocode(pos.lat, pos.lng);
        });

        map.on('click', (e: L.LeafletMouseEvent) => {
          marker.setLatLng(e.latlng);
          void reverseGeocode(e.latlng.lat, e.latlng.lng);
        });

        mapInstanceRef.current = map;
        markerRef.current = marker;
      } else {
        mapInstanceRef.current.invalidateSize();
      }
    }, 150);

    return () => {
      clearTimeout(timer);
    };
  }, [open, reverseGeocode, selectedLocation.lat, selectedLocation.lon]);

  // Clean up map when modal closes
  useEffect(() => {
    if (!open && mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    }
  }, [open]);

  // Handle Search Input (Autocomplete)
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        searchQuery
      )}&countrycodes=vn&addressdetails=1&limit=5`;
      const res = await fetch(url, {
        headers: { 'Accept-Language': 'vi' },
      });
      const data: NominatimResult[] = await res.json();
      setSearchResults(data);
      if (data.length === 0) {
        toast.error('Không tìm thấy địa chỉ phù hợp');
      }
    } catch {
      toast.error('Lỗi tìm kiếm địa chỉ');
    } finally {
      setSearching(false);
    }
  };

  // Select a suggestion from search results
  const handleSelectSearchResult = (result: NominatimResult) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);

    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.setView([lat, lon], 16);
      markerRef.current.setLatLng([lat, lon]);
    }

    setSearchResults([]);
    setSearchQuery(result.display_name);
    void reverseGeocode(lat, lon);
  };

  // Current GPS location with IP fallback
  const handleGetCurrentLocation = () => {
    setLocating(true);

    const tryIpFallback = async () => {
      try {
        const res = await fetch('https://ipapi.co/json/');
        if (res.ok) {
          const data = await res.json();
          if (data.latitude && data.longitude) {
            const lat = parseFloat(data.latitude);
            const lon = parseFloat(data.longitude);
            if (mapInstanceRef.current && markerRef.current) {
              mapInstanceRef.current.setView([lat, lon], 14);
              markerRef.current.setLatLng([lat, lon]);
            }
            void reverseGeocode(lat, lon);
            toast.success(`Đã định vị tạm theo mạng IP: ${data.city || data.region || 'Việt Nam'}`);
            return;
          }
        }
      } catch {
        // Fallback error
      }
      toast.error('Vui lòng bật quyền truy cập Vị trí (Location) trên trình duyệt hoặc gõ địa chỉ vào ô tìm kiếm.');
    };

    if (!navigator.geolocation) {
      void tryIpFallback();
      setLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.setView([latitude, longitude], 17);
          markerRef.current.setLatLng([latitude, longitude]);
        }
        void reverseGeocode(latitude, longitude);
        setLocating(false);
        toast.success('Đã định vị thành công vị trí của bạn!');
      },
      (err) => {
        setLocating(false);
        if (err.message.includes('permissions policy')) {
          toast.error('Cấu hình bảo mật Permissions-Policy đã được mở. Vui lòng tải lại trang (F5) để nhận quyền vị trí!');
        } else if (err.code === 1) {
          toast.error('Bạn hãy bấm vào biểu tượng 🔒 bên cạnh thanh URL trình duyệt và chọn "Cho phép" (Allow) Vị trí nhé!');
        } else {
          toast.error('Không lấy được GPS chính xác. Đang chuyển sang định vị IP...');
        }
        void tryIpFallback();
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Confirm selection
  const handleConfirm = () => {
    if (!selectedLocation.fullAddress) {
      toast.error('Vui lòng chọn một địa chỉ trên bản đồ.');
      return;
    }

    onSelectAddress({
      fullAddress: selectedLocation.fullAddress,
      road: selectedLocation.road,
      ward: selectedLocation.ward,
      district: selectedLocation.district,
      city: selectedLocation.city,
      lat: selectedLocation.lat,
      lon: selectedLocation.lon,
      ghnDistrictId: selectedLocation.ghnDistrictId,
      ghnWardCode: selectedLocation.ghnWardCode,
    });
    toast.success('Đã áp dụng địa chỉ từ Bản đồ!');
    onClose();
  };

  if (!open) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-5 overflow-hidden">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 16 }}
          className="relative flex flex-col w-full max-w-3xl h-[88vh] max-h-[780px] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-gray-200 dark:border-slate-700"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-800 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-gray-950 dark:text-white flex items-center gap-2">
                  Chọn địa chỉ từ Bản đồ Maps
                  <span className="text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Chuẩn GPS & GHN
                  </span>
                </h3>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  Kéo ghim hoặc click trên bản đồ để tự động lấy địa chỉ chính xác
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search bar & Controls */}
          <div className="p-4 bg-gray-50/70 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800 shrink-0 space-y-2">
            <form onSubmit={handleSearch} className="flex gap-2 relative">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Nhập số nhà, tên đường, phường/xã, quận/huyện để tìm nhanh..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                />
              </div>
              <button
                type="submit"
                disabled={searching}
                className="px-4 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-xl text-sm font-semibold hover:opacity-85 disabled:opacity-50 flex items-center gap-1.5 shrink-0 transition"
              >
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Tìm kiếm'}
              </button>
              <button
                type="button"
                onClick={handleGetCurrentLocation}
                disabled={locating}
                title="Lấy vị trí GPS hiện tại của tôi"
                className="px-3.5 py-2.5 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-xl text-sm font-semibold hover:bg-amber-100 dark:hover:bg-amber-900/50 disabled:opacity-50 flex items-center gap-1.5 shrink-0 transition"
              >
                {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                <span className="hidden sm:inline">Vị trí của tôi</span>
              </button>
            </form>

            {/* Suggestions Dropdown */}
            {searchResults.length > 0 && (
              <div className="absolute z-[1000] left-4 right-4 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-200 dark:border-slate-700 overflow-hidden max-h-56 overflow-y-auto">
                {searchResults.map((item) => (
                  <button
                    key={item.place_id}
                    type="button"
                    onClick={() => handleSelectSearchResult(item)}
                    className="w-full text-left px-4 py-3 text-sm text-gray-800 dark:text-gray-200 hover:bg-amber-50 dark:hover:bg-slate-700/60 flex items-start gap-2.5 border-b border-gray-100 dark:border-slate-700/50 last:border-b-0 transition"
                  >
                    <MapPin className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{item.display_name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Map Canvas */}
          <div className="relative flex-1 min-h-[260px] bg-slate-100 dark:bg-slate-800">
            <div ref={mapContainerRef} className="w-full h-full" />

            {resolving && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[500] bg-black/80 backdrop-blur-md text-white text-xs font-semibold px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                Đang nhận diện địa chỉ từ tọa độ...
              </div>
            )}
          </div>

          {/* Footer - Selected Address Display */}
          <div className="p-4 sm:p-5 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 shrink-0 space-y-3">
            <div className="p-3.5 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 rounded-2xl flex items-start gap-3">
              <Building2 className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  Địa chỉ đã chọn từ Bản đồ:
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-white mt-0.5 break-words">
                  {selectedLocation.fullAddress || 'Chưa chọn vị trí'}
                </p>
                {(selectedLocation.district || selectedLocation.city) && (
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                    {selectedLocation.district && `Quận/Huyện: ${selectedLocation.district} · `}
                    {selectedLocation.city && `Tỉnh/Thành: ${selectedLocation.city}`}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="px-6 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-xl text-sm font-bold hover:bg-gray-800 dark:hover:bg-gray-200 flex items-center gap-2 shadow-md transition"
              >
                <Check className="w-4 h-4" />
                Xác nhận & Sử dụng địa chỉ này
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
