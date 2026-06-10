import Constants from "expo-constants";
import { Club, DEvent } from "../types/Disco";

const config = Constants.expoConfig?.extra?.default;

const { partyService } = config ?? {};

export function getWeekRangeString(date: Date) {
  const d = new Date(date);

  const day = d.getDay() || 7; // Sunday = 7
  const monday = new Date(d);
  monday.setDate(d.getDate() - (day - 1));

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const format = (dt: any) =>
    `${String(dt.getDate()).padStart(2, '0')}.${String(
      dt.getMonth() + 1
    ).padStart(2, '0')}`;

  return `${format(monday)}–${format(sunday)}.${sunday.getFullYear()}`;
}

export function buildAssetUrl(name: string) {
  return `${partyService}/api/assets/${name}`;
}

export function buildAssetSource(name: string | null | undefined): { uri: string; headers: Record<string, string> } {
  const token = (globalThis as any).authToken as string | undefined;
  return {
    uri: buildAssetUrl(name ?? ''),
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  };
}

export function mapClubToEvent(event: DEvent, clubs: Club[]) {
  return {
      ...event,
      club: clubs?.find(club => club?.id === event.discoId)
  }
}
