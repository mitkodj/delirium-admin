class Genre {
    id: string;
    name: string;
}

class DiscoGenre {
    genreId: string;
    discoId: string;
}

export class Location {
    lat: string;
    lon: string;
    discoIds: Array<string>;
}