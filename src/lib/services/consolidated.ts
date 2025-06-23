import { supabase } from '$lib/supabase_client';
import type { Member, Event, Availability, ConsolidatedAvailability } from '$lib/types/index';

/**
 * Fetch consolidated availability for a list of events with only two extra
 * queries (members and availability). Assumes the caller has already fetched
 * the events themselves.
 */
export async function getConsolidatedAvailabilityBulk(
  events: Event[]
): Promise<Map<number, ConsolidatedAvailability>> {
  if (events.length === 0) return new Map();

  const eventIds = events.map((e) => e.id);

  // Fetch members once
  const { data: membersData, error: membersError } = await supabase
    .from('members')
    .select('*')
    .order('name');

  if (membersError || !membersData) {
    console.error('Error fetching members:', membersError);
    return new Map();
  }

  // Fetch availability rows for all supplied events in a single query
  const { data: availabilityData, error: availabilityError } = await supabase
    .from('availability')
    .select('*')
    .in('event_id', eventIds);

  if (availabilityError || !availabilityData) {
    console.error('Error fetching availability:', availabilityError);
    return new Map();
  }

  // Group availabilities by event id
  const availabilityByEvent = new Map<number, Availability[]>();
  availabilityData.forEach((row: Availability) => {
    const list = availabilityByEvent.get(row.event_id) ?? [];
    list.push(row as Availability);
    availabilityByEvent.set(row.event_id, list);
  });

  const consolidatedMap = new Map<number, ConsolidatedAvailability>();

  events.forEach((event) => {
    const rowsForEvent = availabilityByEvent.get(event.id) ?? [];
    const statusByMember = new Map<number, Availability['status']>();
    rowsForEvent.forEach((row) => {
      statusByMember.set(row.member_id, row.status);
    });

    const available: Member[] = [];
    const unavailable: Member[] = [];
    const unknown: Member[] = [];

    membersData.forEach((member: Member) => {
      const status = statusByMember.get(member.id) ?? 'unknown';
      if (status === 'available') {
        available.push(member);
      } else if (status === 'unavailable') {
        unavailable.push(member);
      } else {
        unknown.push(member);
      }
    });

    consolidatedMap.set(event.id, {
      event,
      available,
      unavailable,
      unknown,
      allAvailable: unknown.length === 0 && unavailable.length === 0 && available.length > 0,
      anyUnavailable: unavailable.length > 0,
      allResponded: unknown.length === 0,
    });
  });

  return consolidatedMap;
}
