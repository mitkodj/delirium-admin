import { Floor, FloorObject } from '../../../types/FloorMap';

/**
 * Seed layout for development.
 * Replace with a real GET /clubs/{id}/layout response when the API is ready.
 */
const GROUND_FLOOR_OBJECTS: FloorObject[] = [
  // ── Stage (top centre) ──────────────────────────────────────────
  { id: 'mock-1', type: 'stage_rect',     x: 140, y: 15,  width: 220, height: 65,  label: 'Stage'    },
  { id: 'mock-2', type: 'stage_circle',   x: 215, y: 95,  width: 70,  height: 70,  label: 'DJ'       },

  // ── VIP tables — left column ─────────────────────────────────────
  { id: 'mock-3', type: 'table_vip_rect', x: 20,  y: 80,  width: 90,  height: 55,  label: 'VIP 1'    },
  { id: 'mock-4', type: 'table_vip_rect', x: 20,  y: 155, width: 90,  height: 55,  label: 'VIP 2'    },
  { id: 'mock-5', type: 'table_vip_rect', x: 20,  y: 230, width: 90,  height: 55,  label: 'VIP 3'    },

  // ── VIP tables — right column ─────────────────────────────────────
  { id: 'mock-6', type: 'table_vip_rect', x: 390, y: 80,  width: 90,  height: 55,  label: 'VIP 4'    },
  { id: 'mock-7', type: 'table_vip_rect', x: 390, y: 155, width: 90,  height: 55,  label: 'VIP 5'    },
  { id: 'mock-8', type: 'table_vip_rect', x: 390, y: 230, width: 90,  height: 55,  label: 'VIP 6'    },

  // ── Regular tables — centre floor ────────────────────────────────
  { id: 'mock-9',  type: 'table_circle',  x: 155, y: 195, width: 64,  height: 64,  label: 'T1'       },
  { id: 'mock-10', type: 'table_circle',  x: 240, y: 195, width: 64,  height: 64,  label: 'T2'       },
  { id: 'mock-11', type: 'table_circle',  x: 325, y: 195, width: 64,  height: 64,  label: 'T3'       },
  { id: 'mock-12', type: 'table_circle',  x: 155, y: 280, width: 64,  height: 64,  label: 'T4'       },
  { id: 'mock-13', type: 'table_circle',  x: 240, y: 280, width: 64,  height: 64,  label: 'T5'       },
  { id: 'mock-14', type: 'table_circle',  x: 325, y: 280, width: 64,  height: 64,  label: 'T6'       },
  { id: 'mock-15', type: 'table_circle',  x: 197, y: 365, width: 64,  height: 64,  label: 'T7'       },
  { id: 'mock-16', type: 'table_circle',  x: 282, y: 365, width: 64,  height: 64,  label: 'T8'       },
];

export const MOCK_FLOORS: Floor[] = [
  { id: 'floor-1', name: 'Ground Floor', objects: GROUND_FLOOR_OBJECTS },
];
