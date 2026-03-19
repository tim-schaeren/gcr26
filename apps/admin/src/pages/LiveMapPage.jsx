import { useState, useEffect } from 'react';
import { collection, doc, query, where, onSnapshot } from 'firebase/firestore';
import { MapContainer, TileLayer, Marker, Circle, Polyline, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useParams } from 'react-router-dom';
import { db } from '../firebase';

// Fix Leaflet default marker icons broken by bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const TEAM_COLORS = [
  '#e11d48', '#2563eb', '#16a34a', '#d97706',
  '#7c3aed', '#0891b2', '#be185d', '#15803d',
  '#ea580c', '#6d28d9',
];

function teamColor(index) {
  return TEAM_COLORS[index % TEAM_COLORS.length];
}

function teamDotIcon(color) {
  return L.divIcon({
    className: '',
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

export default function LiveMapPage() {
  const { gameId } = useParams();
  const [game, setGame] = useState(null);
  const [quests, setQuests] = useState([]);
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [trail, setTrail] = useState([]);

  useEffect(() => {
    return onSnapshot(doc(db, 'games', gameId), snap => {
      setGame(snap.exists() ? { id: snap.id, ...snap.data() } : null);
    });
  }, [gameId]);

  useEffect(() => {
    return onSnapshot(collection(db, 'games', gameId, 'quests'), snap => {
      setQuests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [gameId]);

  useEffect(() => {
    return onSnapshot(
      query(collection(db, 'teams'), where('gameId', '==', gameId)),
      snap => setTeams(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    );
  }, [gameId]);

  // Subscribe to all users — small event scale, filter client-side
  useEffect(() => {
    return onSnapshot(collection(db, 'users'), snap => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, []);

  useEffect(() => {
    return onSnapshot(
      query(collection(db, 'trail'), where('gameId', '==', gameId)),
      snap => setTrail(snap.docs.map(d => d.data())),
    );
  }, [gameId]);

  // Build lookup maps
  const teamColorMap = Object.fromEntries(teams.map((t, i) => [t.id, teamColor(i)]));
  const userTeamMap = {};
  teams.forEach(team => (team.memberIds ?? []).forEach(uid => { userTeamMap[uid] = team.id; }));

  // Only users who are in a team for this game
  const gameUserIds = new Set(teams.flatMap(t => t.memberIds ?? []));
  const gameUsers = users.filter(u => gameUserIds.has(u.id));

  // Trail polylines per user (sorted by time)
  const trailByUser = {};
  trail.forEach(pt => {
    if (!trailByUser[pt.userId]) trailByUser[pt.userId] = [];
    trailByUser[pt.userId].push(pt);
  });
  Object.values(trailByUser).forEach(pts => pts.sort((a, b) => a.t - b.t));

  // Team mean positions
  const teamMeans = teams.flatMap(team => {
    const members = gameUsers.filter(u => team.memberIds?.includes(u.id) && u.lastLocation);
    if (members.length === 0) return [];
    const lat = members.reduce((s, u) => s + u.lastLocation.lat, 0) / members.length;
    const lng = members.reduce((s, u) => s + u.lastLocation.lng, 0) / members.length;
    return [{ team, lat, lng }];
  });

  const center = game?.cityCoordinates
    ? [game.cityCoordinates.lat, game.cityCoordinates.lng]
    : [47.3769, 8.5417];

  return (
    <div className="flex flex-col h-full -m-4 md:-m-8">
      {/* Header */}
      <div className="px-4 md:px-8 py-4 bg-white border-b border-gray-200 flex items-center gap-6 shrink-0">
        <h1 className="text-lg font-bold text-gray-900">Live Map</h1>
        <div className="flex flex-wrap gap-3">
          {teams.map((team, i) => (
            <span key={team.id} className="flex items-center gap-1.5 text-xs text-gray-600">
              <span
                className="inline-block w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: teamColor(i) }}
              />
              {team.name}
            </span>
          ))}
        </div>
      </div>

      {/* Map */}
      <div className="flex-1">
        <MapContainer center={center} zoom={14} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Quest markers + fence circles */}
          {quests.map(quest => {
            if (!quest.location?.lat) return null;
            const pos = [quest.location.lat, quest.location.lng];
            return (
              <span key={quest.id}>
                <Marker position={pos}>
                  <Popup>
                    <strong>{quest.title}</strong>
                    {quest.fenceRadius && <div className="text-xs text-gray-500 mt-1">Fence: {quest.fenceRadius} m</div>}
                  </Popup>
                </Marker>
                {quest.fenceRadius > 0 && (
                  <Circle
                    center={pos}
                    radius={quest.fenceRadius}
                    pathOptions={{ color: '#6366f1', fillColor: '#6366f1', fillOpacity: 0.08, weight: 1.5 }}
                  />
                )}
              </span>
            );
          })}

          {/* Player trail polylines */}
          {Object.entries(trailByUser).map(([userId, pts]) => {
            const color = teamColorMap[userTeamMap[userId]] ?? '#999';
            const positions = pts.map(p => [p.lat, p.lng]);
            return (
              <Polyline
                key={userId}
                positions={positions}
                pathOptions={{ color, weight: 2, opacity: 0.45 }}
              />
            );
          })}

          {/* Team mean position markers */}
          {teamMeans.map(({ team, lat, lng }) => (
            <Marker
              key={team.id}
              position={[lat, lng]}
              icon={teamDotIcon(teamColorMap[team.id])}
            >
              <Popup>{team.name}</Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
