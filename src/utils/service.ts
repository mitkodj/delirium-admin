import axios from "axios";
import { GenresRequest } from "../types/RequestTypes";
import { WizardState } from "../types/WizardTypes";
import { buildODataQuery, eq, ge, le, and } from "./oDataQueryBuilder";
import Constants from "expo-constants";
import { DEvent } from "../types/Disco";

const config = Constants.expoConfig?.extra?.default;

const { partyService } = config ?? {};

export const fetchGenres = async (filters: GenresRequest | undefined) => {
  try {
  // const { city } = filters;

  // return axios.get(`${partyService}/api/genres`, {
  //   params: buildODataQuery({
  //     filter: city ? eq("City", city) : undefined
  //   })
  // });
    return await axios.get(`${partyService}/api/genres`);
  } catch (e) {
    console.log('fetchGenres error', e);
    return null;
  }
};

export const fetchClubs = async (filters: WizardState) => {
  const { city, date, endDate } = filters ?? {
    city: undefined,
    date: undefined,
    endDate: undefined
  };

  const filter = and(
    city ? eq("City", city.City) : "",
    date ? ge("Date", date.toISOString()) : "",
    endDate ? le("Date", endDate.toISOString()) : ""
  );

  try {
    console.log(buildODataQuery({
        filter,
        orderBy: "Name asc"
      }));
    return await axios.get(`${partyService}/api/clubs`, {
      params: buildODataQuery({
        filter,
        orderBy: "Name asc"
      })
    });
  } catch (e) {
    console.log('fetchClubs error', e);
    return null;
  }
};

export const fetchSuggestedClubs = async () => {
  try {
    return await axios.get(`${partyService}/api/discos?$top=3`);
  } catch (e) {
    console.log('fetchSuggestedClubs error', e);
    return null;
  }
};

export const fetchEvents = async (filters: WizardState, top: number, skip: number) => {
  try {
  // const { city, date, endDate, club } = filters

  // const filter = and(
  //   city ? eq("City", city) : "",
  //   date ? ge("Date", date.toISOString()) : "",
  //   endDate ? le("Date", endDate.toISOString()) : "",
  //   club ? eq("ClubId", club.id) : ""
  // )

  // return axios.get(`${partyService}/api/events`, {
  //   params: buildODataQuery({
  //     top,
  //     skip,
  //     filter,
  //     orderBy: "Start asc"
  //   })
  // })
    return await axios.get(`${partyService}/api/events`);
  } catch (e) {
    console.log('fetchEvents error', e);
    return null;
  }
};

export const fetchSuggestedEvents = async () => {
  try {
    return await axios.get(`${partyService}/api/events`);
  } catch (e) {
    console.log('fetchSuggestedEvents error', e);
    return null;
  }
};

export const fetchEventsForClub = async (clubId: string) => {
  try {
    return await axios.get(`${partyService}/api/events`, {
      params: buildODataQuery({
        top: 5,
      })
    });
  } catch (e) {
    console.log('fetchEventsForClub error', e);
    return null;
  }
};

export const fetchNearbyEvents = async (filters: WizardState) => {
  const { city, date, endDate } = filters;
  const locationQuery = city?.Location ? `lat=${city?.Location.latitude}&lon=${city?.Location.longitude}&` : "";
  const filter = and(
    date ? ge("StartDate", date.toISOString()) : "",
    endDate ? le("StartDate", endDate.toISOString()) : ""
  );

  try {
    return await axios.get(`${partyService}/api/events/nearby?${locationQuery}$filter=${filter}`);
  } catch (e) {
    console.log('fetchNearbyEvents error', e);
    return null;
  }
};

export const queryLocations = async (query: string) => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=10`,
      {
        headers: {
          'User-Agent': 'nightlife-app'
        }
      }
    );

    const data = await res.json();

    return data.map((item: any) => ({
      Id: item.place_id.toString(),
      City: item.display_name,
      IconUrl: 'https://cdn-icons-png.flaticon.com/512/9194/9194915.png',
      Location: {
        lat: item.lat,
        long: item.lon
      }
    }));
  } catch (e) {
    console.log('queryLocations error', e);
    return null;
  }
};

export const uploadBanner = async (FileName: string) => {
  const formData = new FormData();
  formData.append("file", {
    uri: FileName,
    name: "banner.jpg",
    type: "image/jpeg",
  } as any);

  try {
    return await axios.post(`${partyService}/api/assets/upload`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
  } catch (e) {
    console.log('uploadBanner error', e);
    return null;
  }
};

export const createEvent = async (event: DEvent) => {
  try {
    return await axios.post(`${partyService}/api/events`, event);
  } catch (e) {
    console.log('createEvent error', e);
    return null;
  }
};

export type UpdateClubPayload = {
  name: string;
  locationNormalized: string;
  phone: string;
  openDays: number;
  defaultBanner: string;
  accentColor: string;
  dayTimeStart?: string;
  dayTimeEnd?: string;
  nightTimeStart?: string;
  nightTimeEnd?: string;
  defaultStartHour?: string;
};

export const updateClub = async (id: string, payload: UpdateClubPayload) => {
  try {
    return await axios.put(`${partyService}/api/discos/${id}`, payload);
  } catch (e) {
    console.log('updateClub error', e);
    return null;
  }
};

export const updateEvent = async (id: string, event: Partial<DEvent>) => {
  try {
    return await axios.put(`${partyService}/api/events/${id}`, event);
  } catch (e) {
    console.log('updateEvent error', e);
    return null;
  }
};

export const login = async (email: string, password: string) => {
  try {
    const res: any = await axios.post(`${partyService}/api/auth/login`, {
      email,
      password
    });

    return res.data as { accessToken: string; refreshToken: string; expiresIn: number };
  } catch (e) {
    console.log('login error', e, JSON.stringify(e));
    return null;
  }
};

export const getMyClubs = async (token: string) => {
  try {
    const res = await axios.get(`${partyService}/api/discos/my-discos`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    return res.data;
  } catch (e) {
    console.log('getMyClubs error', e, JSON.stringify(e));
    return null;
  }
};

export const setEventsGenres = async (eventId: string, genres: string[]) => {
  try {
    return await axios.post(`${partyService}/api/events/${eventId}/genres`, genres);
  } catch (e) {
    console.log('setEventsGenres error', e);
    return null;
  }
};

const authHeader = () => ({ Authorization: `Bearer ${(globalThis as any).authToken}` });

export const getLayout = async (discoId: string) => {
  try {
    return await axios.get(`${partyService}/api/layouts/${discoId}`, { headers: authHeader() });
  } catch (e) {
    console.log('getLayout error', e);
    return null;
  }
};

export const postLayout = async (discoId: string, schema: any[], date?: Date | null, isDefault?: boolean) => {
  const body: Record<string, any> = { schema };
  if (isDefault) {
    body.isDefault = true;
  } else if (date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    body.date = `${y}-${m}-${d}`;
    body.isDefault = false;
  }
  try {
    return await axios.put(`${partyService}/api/layouts/${discoId}/${discoId}`, body, { headers: authHeader() });
  } catch (e) {
    console.log('postLayout error', e);
    return null;
  }
};

export const updateReservation = async (id: string, reservation: CreateReservationPayload) => {
  try {
    return await axios.put(`${partyService}/api/reservations/${id}`, reservation, { headers: authHeader() });
  } catch (e) {
    console.log('updateReservation error', e);
    return null;
  }
};

export const getReservations = async (date: Date, discoId: string) => {
  try {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    console.log(`ReservationDate eq ${dateStr} and DiscoId eq ${discoId}`);
    return await axios.get(`${partyService}/api/reservations`, {
      params: { '$filter': `ReservationDate eq ${dateStr} and DiscoId eq ${discoId}` },
      headers: authHeader(),
    });
  } catch (e) {
    console.log('getReservations error', e);
    return [];
  }
};

export type CreateReservationPayload = {
  discoId: string;
  eventId?: string;
  firstName: string;
  lastName: string;
  reservationDate: string;
  tables?: string[] | null;
  phoneNumber: string;
  comment?: string;
  status: number;
  clientsCount: number;
};

export const fetchEventsForDate = async (date: Date, discoId: string) => {
  return fetchEvents(null as any, null as any, null as any) as any;
  // try {
  //   const start = new Date(date);
  //   start.setHours(0, 0, 0, 0);
  //   const end = new Date(date);
  //   end.setHours(23, 59, 59, 999);
  //   return await axios.get(`${partyService}/api/events`, {
  //     params: buildODataQuery({
  //       filter: and(
  //         eq("DiscoId", discoId),
  //         ge("StartDate", start.toISOString()),
  //         le("StartDate", end.toISOString())
  //       ),
  //       top: 1,
  //     })
  //   });
  // } catch (e) {
  //   console.log('fetchEventsForDate error', e);
  //   return null;
  // }
};

export const createReservation = async (payload: CreateReservationPayload) => {
  try {
    return await axios.post(`${partyService}/api/reservations`, payload, { headers: authHeader() });
  } catch (e) {
    console.log('createReservation error', e);
    return null;
  }
};

export const editDiscoImages = async (discoId: string, images: any) => {
  try {
    return await axios.put(`${partyService}/api/discos/${discoId}/images`, images);
  } catch (e) {
    console.log('editDiscoImages error', e);
    return null;
  }
};
