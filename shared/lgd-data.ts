// LGD (Local Government Directory) Data for Himachal Pradesh
// Based on official Government of India LGD directory

export type LocationType = 'mc' | 'tcp' | 'gp';

export interface TehsilData {
  name: string;
  blocks?: string[]; // For rural areas
}

export interface DistrictData {
  name: string;
  tehsils: TehsilData[];
  urbanBodies?: {
    name: string;
    type: 'mc' | 'tcp';
    wards: string[];
  }[];
}

// HP Districts with Tehsils and Blocks (Comprehensive LGD Data)
export const HP_LGD_DATA: Record<string, DistrictData> = {
  "Shimla": {
    name: "Shimla",
    tehsils: [
      { name: "Shimla Urban" },
      { name: "Shimla Rural", blocks: ["Dhami", "Junga", "Mashobra"] },
      { name: "Theog", blocks: ["Theog", "Kharapathar", "Kotkhai"] },
      { name: "Rampur", blocks: ["Rampur", "Kumarsain", "Nankhari"] },
      { name: "Chopal", blocks: ["Chopal", "Tikkar"] },
      { name: "Rohru", blocks: ["Rohru", "Chirgaon", "Jubbal"] },
      { name: "Dodra Kwar", blocks: ["Dodra Kwar"] },
    ],
    urbanBodies: [
      { name: "Shimla Municipal Corporation", type: "mc", wards: ["Ward 1", "Ward 2", "Ward 3", "Ward 4", "Ward 5", "Ward 6", "Ward 7", "Ward 8", "Ward 9", "Ward 10", "Ward 11", "Ward 12", "Ward 13", "Ward 14", "Ward 15", "Ward 16", "Ward 17", "Ward 18", "Ward 19", "Ward 20", "Ward 21", "Ward 22", "Ward 23", "Ward 24", "Ward 25"] },
      { name: "Rampur Nagar Panchayat", type: "tcp", wards: ["Ward 1", "Ward 2", "Ward 3", "Ward 4", "Ward 5", "Ward 6", "Ward 7", "Ward 8", "Ward 9"] },
    ]
  },
  "Mandi": {
    name: "Mandi",
    tehsils: [
      { name: "Mandi Sadar", blocks: ["Mandi", "Balh", "Chauntra"] },
      { name: "Sunder Nagar", blocks: ["Sunder Nagar", "Karsog", "Sandhol"] },
      { name: "Sarkaghat", blocks: ["Sarkaghat", "Baldwara"] },
      { name: "Joginder Nagar", blocks: ["Joginder Nagar", "Thunag", "Chachiot"] },
      { name: "Padhar", blocks: ["Padhar", "Gohar"] },
      { name: "Dharampur", blocks: ["Dharampur", "Kotli"] },
      { name: "Thunag", blocks: ["Thunag", "Janjehli"] },
      { name: "Karsog", blocks: ["Karsog"] },
    ],
    urbanBodies: [
      { name: "Mandi Municipal Council", type: "tcp", wards: ["Ward 1", "Ward 2", "Ward 3", "Ward 4", "Ward 5", "Ward 6", "Ward 7", "Ward 8", "Ward 9", "Ward 10", "Ward 11", "Ward 12", "Ward 13", "Ward 14", "Ward 15"] },
      { name: "Sunder Nagar Nagar Parishad", type: "tcp", wards: ["Ward 1", "Ward 2", "Ward 3", "Ward 4", "Ward 5", "Ward 6", "Ward 7", "Ward 8", "Ward 9", "Ward 10", "Ward 11", "Ward 12"] },
    ]
  },
  "Kullu": {
    name: "Kullu",
    tehsils: [
      { name: "Kullu", blocks: ["Kullu", "Nirmand"] },
      { name: "Banjar", blocks: ["Banjar", "Sainj"] },
      { name: "Anni", blocks: ["Anni"] },
      { name: "Manali", blocks: ["Manali"] },
    ],
    urbanBodies: [
      { name: "Kullu Nagar Panchayat", type: "tcp", wards: ["Ward 1", "Ward 2", "Ward 3", "Ward 4", "Ward 5", "Ward 6", "Ward 7", "Ward 8", "Ward 9", "Ward 10", "Ward 11"] },
      { name: "Manali Nagar Panchayat", type: "tcp", wards: ["Ward 1", "Ward 2", "Ward 3", "Ward 4", "Ward 5", "Ward 6", "Ward 7", "Ward 8", "Ward 9"] },
    ]
  },
  "Kangra": {
    name: "Kangra",
    tehsils: [
      { name: "Dharamshala", blocks: ["Dharamshala", "Shahpur"] },
      { name: "Kangra", blocks: ["Kangra", "Jaisinghpur"] },
      { name: "Palampur", blocks: ["Palampur", "Baijnath"] },
      { name: "Nurpur", blocks: ["Nurpur", "Indora"] },
      { name: "Baroh", blocks: ["Baroh", "Rait"] },
      { name: "Fatehpur", blocks: ["Fatehpur"] },
    ],
    urbanBodies: [
      { name: "Dharamshala Municipal Corporation", type: "mc", wards: ["Ward 1", "Ward 2", "Ward 3", "Ward 4", "Ward 5", "Ward 6", "Ward 7", "Ward 8", "Ward 9", "Ward 10", "Ward 11", "Ward 12", "Ward 13", "Ward 14", "Ward 15", "Ward 16", "Ward 17"] },
      { name: "Palampur Municipal Council", type: "tcp", wards: ["Ward 1", "Ward 2", "Ward 3", "Ward 4", "Ward 5", "Ward 6", "Ward 7", "Ward 8", "Ward 9", "Ward 10", "Ward 11", "Ward 12", "Ward 13"] },
    ]
  },
  "Chamba": {
    name: "Chamba",
    tehsils: [
      { name: "Chamba", blocks: ["Chamba", "Salooni", "Tissa"] },
      { name: "Bharmour", blocks: ["Bharmour", "Holi"] },
      { name: "Churah", blocks: ["Churah", "Tundah"] },
      { name: "Pangi", blocks: ["Pangi"] },
      { name: "Dalhousie", blocks: ["Dalhousie", "Bhattiyat"] },
    ],
    urbanBodies: [
      { name: "Chamba Nagar Panchayat", type: "tcp", wards: ["Ward 1", "Ward 2", "Ward 3", "Ward 4", "Ward 5", "Ward 6", "Ward 7", "Ward 8", "Ward 9", "Ward 10"] },
    ]
  },
  "Hamirpur": {
    name: "Hamirpur",
    tehsils: [
      { name: "Hamirpur", blocks: ["Hamirpur", "Bijhari"] },
      { name: "Barsar", blocks: ["Barsar", "Bhoranj"] },
      { name: "Nadaun", blocks: ["Nadaun", "Sujanpur"] },
    ],
    urbanBodies: [
      { name: "Hamirpur Municipal Council", type: "tcp", wards: ["Ward 1", "Ward 2", "Ward 3", "Ward 4", "Ward 5", "Ward 6", "Ward 7", "Ward 8", "Ward 9", "Ward 10", "Ward 11", "Ward 12"] },
    ]
  },
  "Una": {
    name: "Una",
    tehsils: [
      { name: "Una", blocks: ["Una", "Amb", "Haroli"] },
      { name: "Bangana", blocks: ["Bangana", "Gagret"] },
    ],
    urbanBodies: [
      { name: "Una Municipal Council", type: "tcp", wards: ["Ward 1", "Ward 2", "Ward 3", "Ward 4", "Ward 5", "Ward 6", "Ward 7", "Ward 8", "Ward 9", "Ward 10"] },
    ]
  },
  "Bilaspur": {
    name: "Bilaspur",
    tehsils: [
      { name: "Bilaspur", blocks: ["Bilaspur", "Ghumarwin"] },
      { name: "Jhandutta", blocks: ["Jhandutta", "Naina Devi"] },
    ],
    urbanBodies: [
      { name: "Bilaspur Municipal Council", type: "tcp", wards: ["Ward 1", "Ward 2", "Ward 3", "Ward 4", "Ward 5", "Ward 6", "Ward 7", "Ward 8", "Ward 9", "Ward 10", "Ward 11"] },
    ]
  },
  "Solan": {
    name: "Solan",
    tehsils: [
      { name: "Solan", blocks: ["Solan", "Dharampur", "Kandaghat"] },
      { name: "Arki", blocks: ["Arki", "Kunihar"] },
      { name: "Nalagarh", blocks: ["Nalagarh", "Ramshehar"] },
      { name: "Kasauli", blocks: ["Kasauli"] },
    ],
    urbanBodies: [
      { name: "Solan Municipal Council", type: "tcp", wards: ["Ward 1", "Ward 2", "Ward 3", "Ward 4", "Ward 5", "Ward 6", "Ward 7", "Ward 8", "Ward 9", "Ward 10", "Ward 11", "Ward 12", "Ward 13"] },
    ]
  },
  "Sirmaur": {
    name: "Sirmaur",
    tehsils: [
      { name: "Nahan", blocks: ["Nahan", "Sangrah"] },
      { name: "Paonta Sahib", blocks: ["Paonta Sahib", "Shillai"] },
      { name: "Pachhad", blocks: ["Pachhad", "Rajgarh"] },
    ],
    urbanBodies: [
      { name: "Nahan Municipal Council", type: "tcp", wards: ["Ward 1", "Ward 2", "Ward 3", "Ward 4", "Ward 5", "Ward 6", "Ward 7", "Ward 8", "Ward 9", "Ward 10", "Ward 11"] },
      { name: "Paonta Sahib Municipal Council", type: "tcp", wards: ["Ward 1", "Ward 2", "Ward 3", "Ward 4", "Ward 5", "Ward 6", "Ward 7", "Ward 8", "Ward 9", "Ward 10", "Ward 11", "Ward 12"] },
    ]
  },
  "Kinnaur": {
    name: "Kinnaur",
    tehsils: [
      { name: "Kalpa", blocks: ["Kalpa", "Nichar"] },
      { name: "Poo", blocks: ["Poo", "Hangrang"] },
      { name: "Moorang", blocks: ["Moorang"] },
    ],
    urbanBodies: []
  },
  "Lahaul and Spiti": {
    name: "Lahaul and Spiti",
    tehsils: [
      { name: "Keylong", blocks: ["Keylong", "Udaipur"] },
      { name: "Spiti", blocks: ["Kaza"] },
    ],
    urbanBodies: []
  },
};

// Helper functions to get cascading data
export function getDistricts(): string[] {
  return Object.keys(HP_LGD_DATA).sort();
}

export function getTehsilsForDistrict(district: string): string[] {
  const districtData = HP_LGD_DATA[district];
  if (!districtData) return [];
  return districtData.tehsils.map(t => t.name);
}

export function getBlocksForTehsil(district: string, tehsil: string): string[] {
  const districtData = HP_LGD_DATA[district];
  if (!districtData) return [];
  const tehsilData = districtData.tehsils.find(t => t.name === tehsil);
  return tehsilData?.blocks || [];
}

export function getUrbanBodiesForDistrict(district: string) {
  const districtData = HP_LGD_DATA[district];
  return districtData?.urbanBodies || [];
}

export function getWardsForUrbanBody(district: string, urbanBodyName: string): string[] {
  const districtData = HP_LGD_DATA[district];
  if (!districtData) return [];
  const urbanBody = districtData.urbanBodies?.find(ub => ub.name === urbanBodyName);
  return urbanBody?.wards || [];
}

// Location type labels
export const LOCATION_TYPE_LABELS = {
  mc: "Municipal Corporation (MC)",
  tcp: "Town & Country Planning / Nagar Panchayat",
  gp: "Gram Panchayat (Rural)",
};
