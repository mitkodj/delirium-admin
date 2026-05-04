export type DiscoLocation = {
  Id: string;
  City: string;
  IconUrl?: string;
  Location: DLocation;
};

export type DLocation = {
  latitude: number;
  longitude: number;
};

export type Club = {
  id: string;
  name: string;
  locationNormalized: string;
  location?: {
    latitude: number;
    longitude: number;
  },
  genres?: string[];
  phone: string;
  openDays: number;
  defaultBanner: string;
  images?: any[];
  promotions?: string;
  description?: string;
  date?: string;
  accentColor?: string;
};

export type DEvent = {
  id: string;
  discoId: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  description: string;
  promotions: string;
  entranceFee: string;
  startDate?: Date;
  date?: Date;
  name: string,
  disco: string,
  banner: string,
  locationNormalized: string,
};

export type DetailsProps = {
  item: any;
  bookmarked: boolean;
};

export type DGenre = {
  id: string;
  name: string;
}

export enum ReservationStatus {
  OPEN = 0,
  APPROVED = 1,
  SEATED = 2,
  GONE = 3,
  CANCELLED = 4,
}

export type Reservation = {
  id: string;
  firstName: string;
  lastName: string;
  reservationDate: string;
  table?: string;
  numberOfPeople?: number;
  phoneNumber: string;
  comment?: string;
  status?: ReservationStatus;
  dateCreated?: string;
}