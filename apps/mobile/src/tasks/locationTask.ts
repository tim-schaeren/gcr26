import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addDoc, collection, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

export const TASK_NAME = 'gcr-background-location';

TaskManager.defineTask(TASK_NAME, async ({ data, error }: TaskManager.TaskManagerTaskBody<{ locations: Location.LocationObject[] }>) => {
  if (error) return;
  const locations = data?.locations;
  if (!locations?.length) return;

  const [uid, teamId, gameId] = await AsyncStorage.multiGet(['uid', 'teamId', 'gameId'])
    .then(pairs => pairs.map(([, v]) => v));
  if (!uid || !teamId || !gameId) return;

  const { latitude: lat, longitude: lng } = locations[locations.length - 1].coords;
  const t = Date.now();

  await updateDoc(doc(db, 'users', uid), { lastLocation: { lat, lng, updatedAt: t } }).catch(() => {});
  await addDoc(collection(db, 'trail'), { userId: uid, teamId, gameId, lat, lng, t }).catch(() => {});
});
