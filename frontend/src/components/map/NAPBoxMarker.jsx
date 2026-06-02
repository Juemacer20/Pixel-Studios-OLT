import React from 'react';
import { Marker, Popup } from 'react-leaflet';
export default function NAPBoxMarker({ napBox }) {
  return (
    <Marker position={[napBox.latitude, napBox.longitude]}>
      <Popup><div style={{ fontSize: '11px' }}><b>{napBox.name}</b><br />Puertos: {napBox.ports_used}/{napBox.ports_total}</div></Popup>
    </Marker>
  );
}
