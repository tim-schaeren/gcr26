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

const STALE_MS = 5 * 60 * 1000; // 5 minutes

function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function teamQuestStatus(team, quests, memberUsers, questOrder) {
  if (team.finishedAt) return null;
  const questId = team.currentQuestId ?? questOrder?.[0] ?? null;
  const quest = quests.find(q => q.id === questId);
  if (!quest) return null;
  const withLoc = memberUsers.filter(u => u.lastLocation);
  if (!withLoc.length || !quest.location?.lat) return { label: quest.title, solving: false };
  const lat = withLoc.reduce((s, u) => s + u.lastLocation.lat, 0) / withLoc.length;
  const lng = withLoc.reduce((s, u) => s + u.lastLocation.lng, 0) / withLoc.length;
  const solving = distanceMeters(lat, lng, quest.location.lat, quest.location.lng) <= (quest.fenceRadius ?? 50);
  return { label: quest.title, solving };
}

function formatAge(updatedAt, now) {
  const ms = now - updatedAt;
  if (ms < 60000) return 'just now';
  if (ms < 3600000) return `${Math.floor(ms / 60000)} min ago`;
  return `${Math.floor(ms / 3600000)}h ago`;
}

function memberDotIcon(teamColor, isStale) {
  const fill = isStale ? '#9ca3af' : teamColor;
  return L.divIcon({
    className: '',
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${fill};border:2.5px solid ${teamColor};box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>`,
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

function FlyToTeam({ focusTeamId, teams, gameUsers, headerFlyTarget }) {
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
  useEffect(() => {
    if (!headerFlyTarget?.teamId) return;
    const team = teams.find(t => t.id === headerFlyTarget.teamId);
    if (!team) return;
    const members = gameUsers.filter(u => team.memberIds?.includes(u.id) && u.lastLocation);
    if (members.length === 0) return;
    const lat = members.reduce((s, u) => s + u.lastLocation.lat, 0) / members.length;
    const lng = members.reduce((s, u) => s + u.lastLocation.lng, 0) / members.length;
    map.flyTo([lat, lng], 16);
  }, [headerFlyTarget]);
  return null;
}

export default function LiveMapPage() {
  const { gameId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const focusTeamId = location.state?.focusTeamId ?? null;
  const focusQuestId = location.state?.focusQuestId ?? null;

  const [now, setNow] = useState(Date.now());
  const [game, setGame] = useState(null);
  const [quests, setQuests] = useState([]);
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [trail, setTrail] = useState([]);
  const [headerFlyTarget, setHeaderFlyTarget] = useState(null);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

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
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {teams.map((team, i) => {
            const memberUsers = gameUsers.filter(u => team.memberIds?.includes(u.id));
            const status = teamQuestStatus(team, quests, memberUsers, game?.questOrder);
            return (
              <button
                key={team.id}
                onClick={() => setHeaderFlyTarget({ teamId: team.id, seq: Date.now() })}
                className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 transition-colors"
              >
                <span
                  className="inline-block w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: team.color ?? teamColor(i) }}
                />
                <span className="font-medium">{team.name}</span>
                {team.finishedAt && <span className="text-green-600">✓</span>}
                {status && (
                  <span className="text-gray-400">
                    — <span className={status.solving ? 'text-green-600' : 'text-yellow-500'}>
                      {status.solving ? 'Solving' : 'Looking'}
                    </span>
                    {' '}{status.label}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Map */}
      <div className="flex-1">
        <MapContainer key={game?.id ?? 'loading'} center={center} zoom={14} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />

          <FlyToTeam focusTeamId={focusTeamId} teams={teams} gameUsers={gameUsers} headerFlyTarget={headerFlyTarget} />
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
            const isStale = !u.lastLocation.updatedAt || (now - u.lastLocation.updatedAt) > STALE_MS;
            return (
              <Marker
                key={u.id}
                position={[u.lastLocation.lat, u.lastLocation.lng]}
                icon={memberDotIcon(color, isStale)}
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
                    <div style={{ fontSize: '0.75rem', color: isStale ? '#ef4444' : '#6b7280', marginTop: 2 }}>
                      {u.lastLocation.updatedAt ? formatAge(u.lastLocation.updatedAt, now) : 'unknown'}
                    </div>
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
