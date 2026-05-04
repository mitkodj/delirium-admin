export type FloorObjectType =
  | 'table_circle'
  | 'table_vip_rect'
  | 'stage_circle'
  | 'stage_rect';

export interface FloorObject {
  id: string;
  type: FloorObjectType;
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
  capacity?: number;
}

export interface Floor {
  id: string;
  name: string;
  width?: number;
  height?: number;
  objects: FloorObject[];
}

export interface FloorLayout {
  clubId: string;
  canvasWidth: number;
  canvasHeight: number;
  floors: Floor[];
}
