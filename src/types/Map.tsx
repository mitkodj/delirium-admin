import React from 'react';

export class Address {
    city: string;
    town: string;
    village: string;
}

export class LocationEntity {
    place_id: string;
    address: Address;
    display_name: string;
}