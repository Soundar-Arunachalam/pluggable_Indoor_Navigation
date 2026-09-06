/**
 * Apple / Microsoft Places Indoor Mapping Data Format (IMDF) Specification Types
 * Conforming to OGC Community Standard
 */

export interface IMDFFeature<TProps = any, TGeom = any> {
  id: string;
  type: 'Feature';
  feature_type: string;
  geometry: TGeom;
  properties: TProps;
}

export interface IMDFFeatureCollection<T = any> {
  type: 'FeatureCollection';
  name?: string;
  features: IMDFFeature<T>[];
}

export interface IMDFVenueProperties {
  category?: 'healthcare' | 'shopping' | 'university' | 'entertainment' | 'convention' | 'transit' | 'business' | 'other' | string;
  restriction?: string | null;
  name?: {
    en?: string;
    [lang: string]: any;
  } | string | null;
  alt_name?: { [lang: string]: string } | null;
  hours?: string | null;
  phone?: string | null;
  website?: string | null;
  display_point?: {
    type: 'Point';
    coordinates: [number, number];
  };
  address?: string | null;
}

export interface IMDFLevelProperties {
  category?: 'parking' | 'concourse' | 'arrivals' | 'departures' | 'transit' | 'ground' | 'unspecified' | string;
  restriction?: string | null;
  name?: {
    en?: string;
    [lang: string]: any;
  } | string | null;
  short_name?: {
    en?: string;
    [lang: string]: any;
  } | string | null;
  ordinal?: number;
  outdoor?: boolean;
  building_ids?: string[];
}

export interface IMDFUnitProperties {
  category?: 'room' | 'restroom' | 'restroom.female' | 'restroom.male' | 'restroom.unisex' | 'restroom.accessible' | 'elevator' | 'stairs' | 'escalator' | 'ramp' | 'corridor' | 'walkway' | 'reception' | 'food' | 'first_aid' | 'clinic' | 'stage' | string;
  restriction?: string | null;
  accessibility?: ('wheelchair' | 'assisted_listening' | 'braille' | 'tactile_paving')[] | null;
  name?: {
    en?: string;
    [lang: string]: any;
  } | string | null;
  alt_name?: { [lang: string]: string } | null;
  level_id?: string;
  display_point?: {
    type: 'Point';
    coordinates: [number, number];
  };
  color?: string;
}

export interface IMDFOpeningProperties {
  category?: 'pedestrian' | 'service' | 'emergency' | 'bicycle' | 'unspecified' | string;
  accessibility?: ('wheelchair' | 'assisted_listening')[] | null;
  access_control?: string | null;
  door?: {
    type?: 'sliding' | 'swinging' | 'revolving' | 'turnstile' | 'unspecified';
    automatic?: boolean;
  } | null;
  level_id?: string;
}

export interface IMDFAnchorProperties {
  name?: {
    en?: string;
    [lang: string]: any;
  } | string | null;
  unit_id?: string;
  level_id?: string;
  category?: string;
}

export interface IMDFNodeProperties {
  level_id: string;
  node_type: 'hallway' | 'room_entry' | 'elevator_door' | 'stair_landing' | 'checkpoint' | 'entrance' | 'exit' | string;
  accessibility?: ('wheelchair' | 'assisted_listening' | 'braille')[] | null;
  name?: string;
}

export interface IMDFPathwayProperties {
  category?: 'walkway' | 'elevator' | 'stairs' | 'escalator' | 'ramp' | string;
  direction?: 'unidirectional' | 'bidirectional';
  accessibility?: ('wheelchair' | 'assisted_listening')[] | null;
  level_id?: string;
  from_node_id: string;
  to_node_id: string;
  distance_meters?: number;
  vertical_connector_group?: string;
}

export interface IMDFBundle {
  manifest?: {
    version?: string;
    generated_at?: string;
    venue_id?: string;
  };
  venue?: IMDFFeatureCollection<IMDFVenueProperties>;
  levels?: IMDFFeatureCollection<IMDFLevelProperties>;
  units?: IMDFFeatureCollection<IMDFUnitProperties>;
  openings?: IMDFFeatureCollection<IMDFOpeningProperties>;
  anchors?: IMDFFeatureCollection<IMDFAnchorProperties>;
  nodes?: IMDFFeatureCollection<IMDFNodeProperties>;
  pathways?: IMDFFeatureCollection<IMDFPathwayProperties>;
  [key: string]: any;
}
