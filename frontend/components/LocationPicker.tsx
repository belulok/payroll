'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { MapPinIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

declare global {
  interface Window {
    google: any;
    initGoogleMaps: () => void;
  }
}

interface LocationPickerProps {
  value?: {
    lat: number;
    lng: number;
    address?: string;
  };
  onChange: (location: { lat: number; lng: number; address: string }) => void;
  radius?: number;
  onRadiusChange?: (radius: number) => void;
}

const GOOGLE_MAPS_API_KEY = 'AIzaSyD8k_pU3xfS9EZ_F0T9hSRa5sSVVicBRvo';

export default function LocationPicker({ value, onChange, radius = 100, onRadiusChange }: LocationPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const circleRef = useRef<any>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);

  const [isLoaded, setIsLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentRadius, setCurrentRadius] = useState(radius);

  // Load Google Maps script
  useEffect(() => {
    if (window.google && window.google.maps) {
      setIsLoaded(true);
      return;
    }

    const existingScript = document.getElementById('google-maps-script');
    if (existingScript) {
      existingScript.addEventListener('load', () => setIsLoaded(true));
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => setIsLoaded(true);
    document.head.appendChild(script);
  }, []);

  // Initialize map
  useEffect(() => {
    if (!isLoaded || !mapRef.current || mapInstanceRef.current) return;

    const defaultCenter = value?.lat && value?.lng
      ? { lat: value.lat, lng: value.lng }
      : { lat: 3.1390, lng: 101.6869 }; // Default to KL, Malaysia

    const map = new window.google.maps.Map(mapRef.current, {
      center: defaultCenter,
      zoom: 15,
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: true,
    });

    mapInstanceRef.current = map;

    // Create marker
    const marker = new window.google.maps.Marker({
      position: defaultCenter,
      map,
      draggable: true,
      animation: window.google.maps.Animation.DROP,
    });
    markerRef.current = marker;

    // Create radius circle
    const circle = new window.google.maps.Circle({
      map,
      center: defaultCenter,
      radius: currentRadius,
      fillColor: '#4F46E5',
      fillOpacity: 0.2,
      strokeColor: '#4F46E5',
      strokeOpacity: 0.8,
      strokeWeight: 2,
    });
    circleRef.current = circle;

    // Handle marker drag
    marker.addListener('dragend', () => {
      const position = marker.getPosition();
      if (position) {
        updateLocation(position.lat(), position.lng());
        circle.setCenter(position);
      }
    });

    // Handle map click
    map.addListener('click', (e: any) => {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      marker.setPosition(e.latLng);
      circle.setCenter(e.latLng);
      updateLocation(lat, lng);
    });

    // Initialize places autocomplete
    if (searchInputRef.current) {
      const autocomplete = new window.google.maps.places.Autocomplete(searchInputRef.current, {
        fields: ['formatted_address', 'geometry', 'name'],
      });
      autocompleteRef.current = autocomplete;

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (place.geometry?.location) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();

          map.setCenter(place.geometry.location);
          map.setZoom(17);
          marker.setPosition(place.geometry.location);
          circle.setCenter(place.geometry.location);

          onChange({
            lat,
            lng,
            address: place.formatted_address || place.name || ''
          });
        }
      });
    }

    // If initial value exists, set it
    if (value?.lat && value?.lng) {
      marker.setPosition({ lat: value.lat, lng: value.lng });
      circle.setCenter({ lat: value.lat, lng: value.lng });
    }
  }, [isLoaded]);

  // Update circle radius when it changes
  useEffect(() => {
    if (circleRef.current) {
      circleRef.current.setRadius(currentRadius);
    }
  }, [currentRadius]);

  const updateLocation = useCallback(async (lat: number, lng: number) => {
    // Reverse geocode to get address
    const geocoder = new window.google.maps.Geocoder();
    try {
      const response = await geocoder.geocode({ location: { lat, lng } });
      const address = response.results[0]?.formatted_address || '';
      onChange({ lat, lng, address });
    } catch (error) {
      onChange({ lat, lng, address: '' });
    }
  }, [onChange]);

  const handleRadiusChange = (newRadius: number) => {
    setCurrentRadius(newRadius);
    if (onRadiusChange) {
      onRadiusChange(newRadius);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          if (mapInstanceRef.current && markerRef.current && circleRef.current) {
            const pos = { lat, lng };
            mapInstanceRef.current.setCenter(pos);
            mapInstanceRef.current.setZoom(17);
            markerRef.current.setPosition(pos);
            circleRef.current.setCenter(pos);
            updateLocation(lat, lng);
          }
        },
        (error) => {
          console.error('Error getting location:', error);
          alert('Unable to get your current location. Please search or click on the map.');
        }
      );
    } else {
      alert('Geolocation is not supported by this browser.');
    }
  };

  if (!isLoaded) {
    return (
      <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-500">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Box */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search for a location..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <button
          type="button"
          onClick={getCurrentLocation}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
        >
          <MapPinIcon className="h-5 w-5" />
          Current
        </button>
      </div>

      {/* Map Container */}
      <div
        ref={mapRef}
        className="w-full h-64 rounded-lg border-2 border-gray-200"
        style={{ minHeight: '256px' }}
      />

      {/* Radius Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Allowed Check-in Radius: <span className="font-bold text-indigo-600">{currentRadius}m</span>
        </label>
        <input
          type="range"
          min="50"
          max="500"
          step="10"
          value={currentRadius}
          onChange={(e) => handleRadiusChange(Number(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>50m</span>
          <span>250m</span>
          <span>500m</span>
        </div>
      </div>

      {/* Selected Location Display */}
      {value?.address && (
        <div className="bg-indigo-50 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <MapPinIcon className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-indigo-900">{value.address}</p>
              <p className="text-xs text-indigo-600 mt-1">
                Coordinates: {value.lat.toFixed(6)}, {value.lng.toFixed(6)}
              </p>
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-500">
        💡 Click on the map or drag the marker to set the check-in location. Workers must be within the radius to check in.
      </p>
    </div>
  );
}


