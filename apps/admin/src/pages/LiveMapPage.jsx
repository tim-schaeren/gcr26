import { useState, useEffect } from 'react';
import { collection, doc, query, where, onSnapshot } from 'firebase/firestore';
import { MapContainer, TileLayer, Marker, Circle, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { db } from '../firebase';

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

const questIcon = L.divIcon({
  className: '',
  html: `<div style="width:28px;height:28px;border-radius:50%;background:#6366f1;border:2px solid white;color:white;font-weight:700;font-size:15px;line-height:24px;text-align:center;box-shadow:0 1px 4px rgba(0,0,0,0.4)">?</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

function FlyToQuest({ focusQuestId, quests }) {
  const map = useMap();
  useEffect(() => {
    if (!focusQuestId) return;
    const quest = quests.find(q => q.id === focusQuestId);
    if (!quest?.location?.lat) return;
    map.flyTo([quest.location.lat, quest.location.lng], 18);
  }, [focusQuestId, quests]);
  return null;
}

function FlyToTeam({ focusTeamId, teams, gameUsers }) {
  const map = useMap();
  useEffect(() => {
    if (!focusTeamId) return;
    const team = teams.find(t => t.id === focusTeamId);
    if (!team) return;
    const members = gameUsers.filter(u => team.memberIds?.includes(u.id) && u.lastLocation);
    if (members.length === 0) return;
    const lat = members.reduce((s, u) => s + u.lastLocation.lat, 0) / members.length;
    const lng = members.reduce((s, u) => s + u.lastLocation.lng, 0) / members.length;
    map.flyTo([lat, lng], 16);
  }, [focusTeamId, teams, gameUsers]);
  return null;
}

export default function LiveMapPage() {
  const { gameId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const focusTeamId = location.state?.focusTeamId ?? null;
  const focusQuestId = location.state?.focusQuestId ?? null;

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
  const teamColorMap = Object.fromEntries(teams.map((t, i) => [t.id, t.color ?? teamColor(i)]));
  const userTeamMap = {};
  teams.forEach(team => (team.memberIds ?? []).forEach(uid => { userTeamMap[uid] = team.id; }));

  // Only users in a team for this game
  const gameUserIds = new Set(teams.flatMap(t => t.memberIds ?? []));
  const gameUsers = users.filter(u => gameUserIds.has(u.id));

  // Combined trail per team (all member points merged + sorted by time)
  const trailByTeam = {};
  trail.forEach(pt => {
    if (!trailByTeam[pt.teamId]) trailByTeam[pt.teamId] = [];
    trailByTeam[pt.teamId].push(pt);
  });
  Object.values(trailByTeam).forEach(pts => pts.sort((a, b) => a.t - b.t));

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
                style={{ backgroundColor: team.color ?? teamColor(i) }}
              />
              {team.name}
            </span>
          ))}
        </div>
      </div>

      {/* Map */}
      <div className="flex-1">
        <MapContainer key={game?.id ?? 'loading'} center={center} zoom={14} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />

          <FlyToTeam focusTeamId={focusTeamId} teams={teams} gameUsers={gameUsers} />
          <FlyToQuest focusQuestId={focusQuestId} quests={quests} />

          {/* Quest markers + fence circles */}
          {quests.map(quest => {
            if (!quest.location?.lat) return null;
            const pos = [quest.location.lat, quest.location.lng];
            return (
              <span key={quest.id}>
                <Marker position={pos} icon={questIcon}>
                  <Popup>
                    <button
                      onClick={() => navigate(`/games/${gameId}/quests`, { state: { highlightQuestId: quest.id } })}
                      style={{ fontWeight: 600, color: '#4f46e5', cursor: 'pointer', background: 'none', border: 'none', padding: 0, fontSize: 'inherit' }}
                    >
                      {quest.title}
                    </button>
                    {quest.fenceRadius > 0 && <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: 4 }}>Fence: {quest.fenceRadius} m</div>}
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

          {/* Team trail polylines (one per team, all members combined) */}
          {Object.entries(trailByTeam).map(([tid, pts]) => {
            const color = teamColorMap[tid] ?? '#999';
            const positions = pts.map(p => [p.lat, p.lng]);
            return (
              <Polyline
                key={tid}
                positions={positions}
                pathOptions={{ color, weight: 2, opacity: 0.45 }}
              />
            );
          })}

          {/* Individual member dots for current position */}
          {gameUsers.filter(u => u.lastLocation).map(u => {
            const color = teamColorMap[userTeamMap[u.id]] ?? '#999';
            const team = teams.find(t => t.id === userTeamMap[u.id]);
            return (
              <Marker
                key={u.id}
                position={[u.lastLocation.lat, u.lastLocation.lng]}
                icon={teamDotIcon(color)}
              >
                <Popup>
                  <div style={{ lineHeight: 1.6 }}>
                    <button
                      onClick={() => navigate('/players', { state: { highlightUserId: u.id } })}
                      style={{ fontWeight: 600, color: '#111', cursor: 'pointer', background: 'none', border: 'none', padding: 0, fontSize: 'inherit', display: 'block' }}
                    >
                      {u.name}
                    </button>
                    {team && (
                      <button
                        onClick={() => navigate(`/games/${gameId}/teams`, { state: { highlightTeamId: team.id } })}
                        style={{ color: '#4f46e5', cursor: 'pointer', background: 'none', border: 'none', padding: 0, fontSize: '0.8rem' }}
                      >
                        {team.name}
                      </button>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}
