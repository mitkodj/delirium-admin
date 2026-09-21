import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, PanResponder, View } from 'react-native';
import { FloorObject } from '../types/FloorMap';
import { Reservation, ReservationStatus } from '../types/Disco';

const LONG_PRESS_MS = 350;
const MOVE_SLOP = 8;
const FROM_COLOR = '#7c6ff0';
const TARGET_COLOR = '#22c55e';
const TABLE_TYPES = new Set(['table_circle', 'table_vip_rect']);
const RELEASED_STATUSES = new Set([ReservationStatus.GONE, ReservationStatus.CANCELLED]);

type Params = {
    objects: FloorObject[];
    reservations?: Reservation[];
    canvasW: number;
    canvasH: number;
    containerW: number;
    containerH: number;
    scale: number;
    enabled: boolean;
    onTapTable: (tableId: string) => void;
    onMove: (reservation: Reservation, fromId: string, toId: string) => void;
};

type Session = {
    fromId: string;
    reservation: Reservation;
    x: number;
    y: number;
    targetId: string | null;
    active: boolean;
    cancelled: boolean;
    timer: ReturnType<typeof setTimeout> | null;
};

type Drag = { reservation: Reservation; fromId: string; targetId: string | null; x: number; y: number };

/**
 * Long-press a reserved table, drag onto a free table, release to confirm moving the reservation.
 * Spread `panHandlers` and `wrapperRef` on the view that wraps the scaled canvas.
 */
export function useTableReassignDrag(params: Params) {
    const wrapperRef = useRef<View>(null);
    const wrapperPos = useRef({ x: 0, y: 0 });
    const session = useRef<Session | null>(null);
    const [drag, setDrag] = useState<Drag | null>(null);

    const reservationByTable = useMemo(() => {
        const map = new Map<string, Reservation>();
        for (const r of params.reservations ?? []) {
            if (r.status !== undefined && RELEASED_STATUSES.has(r.status)) continue;
            for (const id of r.tables ?? []) map.set(id, r);
        }
        return map;
    }, [params.reservations]);

    // The PanResponder is created once; it reads the latest params through this ref.
    const latest = useRef({ ...params, reservationByTable });
    latest.current = { ...params, reservationByTable };

    const measureWrapper = () => {
        wrapperRef.current?.measure((_x, _y, _w, _h, px, py) => { wrapperPos.current = { x: px, y: py }; });
    };

    const tableAt = (pageX: number, pageY: number) => {
        const p = latest.current;
        const cx = (pageX - wrapperPos.current.x - p.containerW / 2) / p.scale + p.canvasW / 2;
        const cy = (pageY - wrapperPos.current.y - p.containerH / 2) / p.scale + p.canvasH / 2;
        return p.objects.find(o =>
            TABLE_TYPES.has(o.type) && cx >= o.x && cx <= o.x + o.width && cy >= o.y && cy <= o.y + o.height);
    };

    const endSession = () => {
        if (session.current?.timer) clearTimeout(session.current.timer);
        session.current = null;
        setDrag(null);
    };

    const confirmMove = (s: Session, toId: string) => {
        const { objects, onMove } = latest.current;
        const label = (id: string) => objects.find(o => o.id === id)?.label ?? id;
        Alert.alert(
            'Move reservation',
            `Move ${s.reservation.firstName} ${s.reservation.lastName} from table ${label(s.fromId)} to table ${label(toId)}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Move', onPress: () => onMove(s.reservation, s.fromId, toId) },
            ],
        );
    };

    const panResponder = useRef(PanResponder.create({
        // Claim the touch before the table's tap overlay, but only on a reserved table and with one finger.
        onStartShouldSetPanResponderCapture: e => {
            const { enabled, reservationByTable } = latest.current;
            if (!enabled || e.nativeEvent.touches.length !== 1) return false;
            measureWrapper();
            const table = tableAt(e.nativeEvent.pageX, e.nativeEvent.pageY);
            return !!table && reservationByTable.has(table.id);
        },
        onPanResponderGrant: e => {
            const { pageX, pageY } = e.nativeEvent;
            const table = tableAt(pageX, pageY);
            const reservation = table && latest.current.reservationByTable.get(table.id);
            if (!table || !reservation) return;
            const s: Session = {
                fromId: table.id, reservation, x: pageX, y: pageY,
                targetId: null, active: false, cancelled: false, timer: null,
            };
            s.timer = setTimeout(() => {
                s.active = true;
                setDrag({
                    reservation, fromId: s.fromId, targetId: null,
                    x: s.x - wrapperPos.current.x, y: s.y - wrapperPos.current.y,
                });
            }, LONG_PRESS_MS);
            session.current = s;
        },
        onPanResponderMove: (_, gs) => {
            const s = session.current;
            if (!s) return;
            s.x = gs.moveX;
            s.y = gs.moveY;
            if (!s.active) {
                if (!s.cancelled && Math.hypot(gs.dx, gs.dy) > MOVE_SLOP) {
                    s.cancelled = true;
                    if (s.timer) clearTimeout(s.timer);
                }
                return;
            }
            const table = tableAt(s.x, s.y);
            s.targetId = table && !latest.current.reservationByTable.has(table.id) ? table.id : null;
            setDrag({
                reservation: s.reservation, fromId: s.fromId, targetId: s.targetId,
                x: s.x - wrapperPos.current.x, y: s.y - wrapperPos.current.y,
            });
        },
        onPanResponderTerminationRequest: () => !session.current?.active,
        onPanResponderRelease: () => {
            const s = session.current;
            endSession();
            if (!s) return;
            if (s.active) {
                if (s.targetId) confirmMove(s, s.targetId);
            } else if (!s.cancelled) {
                latest.current.onTapTable(s.fromId);
            }
        },
        onPanResponderTerminate: endSession,
    })).current;

    useEffect(() => () => { if (session.current?.timer) clearTimeout(session.current.timer); }, []);

    return {
        panHandlers: panResponder.panHandlers,
        wrapperRef,
        measureWrapper,
        highlights: drag
            ? { [drag.fromId]: FROM_COLOR, ...(drag.targetId ? { [drag.targetId]: TARGET_COLOR } : {}) }
            : undefined,
        tooltip: drag
            ? { text: `${drag.reservation.firstName} ${drag.reservation.lastName}`, x: drag.x, y: drag.y }
            : null,
    };
}
