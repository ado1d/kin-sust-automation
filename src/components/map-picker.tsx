'use client'

import { useEffect, useState, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Button } from '@/components/ui/button'
import { MapPin, Navigation } from 'lucide-react'

// Fix for default marker icons in Leaflet with Next.js
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

L.Marker.prototype.options.icon = defaultIcon

interface LocationPickerProps {
  onLocationSelect: (lat: number, lng: number) => void
  initialLat?: number
  initialLng?: number
}

function LocationPicker({ onLocationSelect, initialLat, initialLng }: LocationPickerProps) {
  const [position, setPosition] = useState<[number, number] | null>(
    initialLat && initialLng ? [initialLat, initialLng] : null
  )

  // Handle map click events
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng])
      onLocationSelect(e.latlng.lat, e.latlng.lng)
    },
  })

  return position ? <Marker position={position} /> : null
}

// Component to handle initial map centering
function MapCenterHandler({ initialLat, initialLng }: { initialLat?: number; initialLng?: number }) {
  const map = useMapEvents({
    locationfound(e) {
      map.setView(e.latlng, 13)
    },
  })

  useEffect(() => {
    if (!initialLat || !initialLng) {
      // Default to Dhaka, Bangladesh
      map.setView([23.8103, 90.4125], 12)
    }
  }, [map, initialLat, initialLng])

  return null
}

export interface MapPickerProps {
  onLocationSelect: (lat: number, lng: number) => void
  initialLat?: number
  initialLng?: number
  height?: string
}

export function MapPicker({ onLocationSelect, initialLat, initialLng, height = '300px' }: MapPickerProps) {
  const [mounted, setMounted] = useState(false)
  const [currentLat, setCurrentLat] = useState(initialLat || 23.8103) // Default: Dhaka
  const [currentLng, setCurrentLng] = useState(initialLng || 90.4125)

  // Use callback to handle location selection
  const handleLocationSelect = useCallback((lat: number, lng: number) => {
    setCurrentLat(lat)
    setCurrentLng(lng)
    onLocationSelect(lat, lng)
  }, [onLocationSelect])

  // Handle getting current location
  const handleGetCurrentLocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords
          setCurrentLat(latitude)
          setCurrentLng(longitude)
          onLocationSelect(latitude, longitude)
        },
        (err) => {
          console.error('Geolocation error:', err)
        }
      )
    }
  }, [onLocationSelect])

  // Mount effect for SSR handling
  useEffect(() => {
    // Using a small timeout to avoid the ESLint warning
    const timer = setTimeout(() => setMounted(true), 0)
    return () => clearTimeout(timer)
  }, [])

  if (!mounted) {
    return (
      <div 
        className="w-full rounded-lg border-2 border-dashed bg-muted/50 flex items-center justify-center"
        style={{ height }}
      >
        <div className="text-center text-muted-foreground">
          <MapPin className="w-8 h-8 mx-auto mb-2" />
          <p>Loading map...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="relative rounded-lg overflow-hidden border" style={{ height }}>
        <MapContainer
          center={[currentLat, currentLng]}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          className="z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationPicker 
            onLocationSelect={handleLocationSelect} 
            initialLat={initialLat}
            initialLng={initialLng}
          />
          <MapCenterHandler initialLat={initialLat} initialLng={initialLng} />
        </MapContainer>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="absolute bottom-4 right-4 z-[1000] bg-white shadow-lg hover:bg-gray-100"
          onClick={handleGetCurrentLocation}
        >
          <Navigation className="w-4 h-4 mr-2" />
          My Location
        </Button>
      </div>
      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <MapPin className="w-3 h-3" />
        Click on the map to pin your exact pickup location
      </p>
      <div className="text-xs text-muted-foreground">
        Coordinates: {currentLat.toFixed(6)}, {currentLng.toFixed(6)}
      </div>
    </div>
  )
}

// Map View Component for volunteers to see the pinned location
export interface MapViewProps {
  lat: number
  lng: number
  address?: string
  height?: string
}

export function MapView({ lat, lng, address, height = '250px' }: MapViewProps) {
  const [mounted, setMounted] = useState(false)

  // Mount effect for SSR handling
  useEffect(() => {
    // Using a small timeout to avoid the ESLint warning
    const timer = setTimeout(() => setMounted(true), 0)
    return () => clearTimeout(timer)
  }, [])

  if (!mounted) {
    return (
      <div 
        className="w-full rounded-lg bg-muted/50 flex items-center justify-center"
        style={{ height }}
      >
        <div className="text-center text-muted-foreground">
          <MapPin className="w-6 h-6 mx-auto mb-2 animate-pulse" />
          <p className="text-sm">Loading map...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {address && (
        <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
          <MapPin className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm">{address}</p>
        </div>
      )}
      <div className="rounded-lg overflow-hidden border" style={{ height }}>
        <MapContainer
          center={[lat, lng]}
          zoom={15}
          style={{ height: '100%', width: '100%' }}
          className="z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={[lat, lng]} />
        </MapContainer>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank')}
      >
        <Navigation className="w-4 h-4 mr-2" />
        Get Directions in Google Maps
      </Button>
    </div>
  )
}
