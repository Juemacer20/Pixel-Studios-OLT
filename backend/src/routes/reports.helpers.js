const EXPORT_FIELDS = [
  // Identity
  { key: 'serial_number',    label: 'Serial Number',    category: 'Identity' },
  { key: 'description',      label: 'Description',      category: 'Identity' },
  { key: 'mac',              label: 'MAC Address',      category: 'Identity' },
  { key: 'model',            label: 'Model',            category: 'Identity' },
  { key: 'contact',          label: 'Contact',          category: 'Identity' },
  { key: 'external_id',      label: 'External ID',      category: 'Identity' },
  { key: 'authorized_by',    label: 'Authorized By',    category: 'Identity' },
  // Client
  { key: 'client_name',      label: 'Client Name',      category: 'Client' },
  { key: 'client_address',   label: 'Client Address',   category: 'Client' },
  { key: 'client_phone',     label: 'Client Phone',     category: 'Client' },
  // OLT / PON location
  { key: 'olt_name',         label: 'OLT',              category: 'OLT / PON' },
  { key: 'board',            label: 'Board',            category: 'OLT / PON' },
  { key: 'port',             label: 'Port',             category: 'OLT / PON' },
  { key: 'onu_id',           label: 'ONU ID',           category: 'OLT / PON' },
  { key: 'channel',          label: 'Channel',          category: 'OLT / PON' },
  { key: 'protocol',         label: 'Protocol',         category: 'OLT / PON' },
  // Geographic / logical location
  { key: 'zone',             label: 'Zone',             category: 'Location' },
  { key: 'odb',              label: 'ODB',              category: 'Location' },
  { key: 'odb_port',         label: 'ODB Port',         category: 'Location' },
  { key: 'latitude',         label: 'Latitude',         category: 'Location' },
  { key: 'longitude',        label: 'Longitude',        category: 'Location' },
  // Status / timeline
  { key: 'status',           label: 'Status',           category: 'Status' },
  { key: 'last_seen',        label: 'Last Seen',        category: 'Status' },
  { key: 'last_up',          label: 'Last Up',          category: 'Status' },
  { key: 'last_down',        label: 'Last Down',        category: 'Status' },
  { key: 'last_down_cause',  label: 'Last Down Cause',  category: 'Status' },
  { key: 'online_duration',  label: 'Online Duration',  category: 'Status' },
  // Signal / physical
  { key: 'rx_power',         label: 'Rx Power (dBm)',   category: 'Signal' },
  { key: 'tx_power',         label: 'Tx Power (dBm)',   category: 'Signal' },
  { key: 'olt_rx_power',     label: 'OLT Rx (dBm)',     category: 'Signal' },
  { key: 'distance',         label: 'Distance (m)',     category: 'Signal' },
  { key: 'temperature',      label: 'Temperature (°C)', category: 'Signal' },
  { key: 'voltage',          label: 'Voltage (V)',      category: 'Signal' },
  { key: 'bias_current',     label: 'Bias Current (mA)',category: 'Signal' },
  // Network / WAN
  { key: 'ip_address',       label: 'IP Address',       category: 'Network' },
  { key: 'svlan',            label: 'SVLAN',            category: 'Network' },
  { key: 'cvlan',            label: 'CVLAN',            category: 'Network' },
  { key: 'tag_transform',    label: 'Tag Transform',    category: 'Network' },
  { key: 'vlan',             label: 'VLAN',             category: 'Network' },
  { key: 'wan_mode',         label: 'WAN Mode',         category: 'Network' },
  { key: 'wan_ip_source',    label: 'WAN IP Source',    category: 'Network' },
  { key: 'wan_mask',         label: 'WAN Mask',         category: 'Network' },
  { key: 'wan_gateway',      label: 'WAN Gateway',      category: 'Network' },
  { key: 'wan_vlan',         label: 'WAN VLAN',         category: 'Network' },
  { key: 'wan_encap',        label: 'WAN Encap',        category: 'Network' },
  { key: 'pppoe_user',       label: 'PPPoE User',       category: 'Network' },
  { key: 'mgmt_ip',          label: 'Mgmt IP',          category: 'Network' },
  // Resources / firmware
  { key: 'cpu_pct',          label: 'CPU (%)',          category: 'Resources' },
  { key: 'mem_pct',          label: 'Memory (%)',       category: 'Resources' },
  { key: 'uptime',           label: 'Uptime (s)',       category: 'Resources' },
  { key: 'firmware',         label: 'Firmware',         category: 'Resources' },
  { key: 'sw_version',       label: 'SW Version',       category: 'Resources' },
  // Profiles
  { key: 'speed_profile_name', label: 'Speed Profile',  category: 'Profiles' },
  { key: 'line_profile',     label: 'Line Profile',     category: 'Profiles' },
  { key: 'srv_profile',      label: 'Service Profile',  category: 'Profiles' },
  { key: 'download_profile', label: 'Download Profile', category: 'Profiles' },
  { key: 'upload_profile',   label: 'Upload Profile',   category: 'Profiles' },
  { key: 'download_mbps',    label: 'Download (Mbps)',  category: 'Profiles' },
  { key: 'upload_mbps',      label: 'Upload (Mbps)',    category: 'Profiles' },
  { key: 'configuration_method', label: 'Config Method', category: 'Profiles' },
  // Services
  { key: 'has_iptv',         label: 'IPTV',             category: 'Services' },
  { key: 'iptv_vlan',        label: 'IPTV VLAN',        category: 'Services' },
  { key: 'has_catv',         label: 'CATV',             category: 'Services' },
  { key: 'tr069_enabled',    label: 'TR-069',           category: 'Services' },
  // Timestamps
  { key: 'created_at',       label: 'Created At',       category: 'Timestamps' },
  { key: 'provisioned_at',   label: 'Provisioned At',   category: 'Timestamps' },
  { key: 'enriched_at',      label: 'Enriched At',      category: 'Timestamps' },
];

const FIELD_MAP = Object.fromEntries(EXPORT_FIELDS.map(f => [f.key, f]));

const DATETIME_KEYS = new Set([
  'last_seen', 'last_up', 'last_down', 'created_at', 'provisioned_at', 'enriched_at',
]);

function resolveValue(ont, key) {
  switch (key) {
    case 'olt_name':          return ont.olt?.name ?? null;
    case 'speed_profile_name': return ont.speed_profile?.name ?? null;
    case 'client_name':       return ont.client?.name ?? null;
    case 'client_address':    return ont.client?.address ?? null;
    case 'client_phone':      return ont.client?.phone ?? null;
    case 'svlan':             return ont.vlan ?? null;
    case 'cvlan':             return ont.wan_vlan ?? null;
    case 'tag_transform':     return ont.tag_transform ?? null;
    case 'authorized_by':     return ont.authorizedBy ?? null;
    case 'odb_port':          return ont.odb_port ?? null;
    default: return ont[key] ?? null;
  }
}

function formatValue(key, raw) {
  if (raw === null || raw === undefined) return '—';
  if (DATETIME_KEYS.has(key)) return raw instanceof Date ? raw.toISOString() : String(raw);
  if (typeof raw === 'bigint') return Number(raw);
  return raw;
}

function buildExportRow(ont, fieldKeys) {
  const row = {};
  for (const key of fieldKeys) {
    const def = FIELD_MAP[key];
    if (!def) continue;
    const raw = resolveValue(ont, key);
    row[def.label] = formatValue(key, raw);
  }
  return row;
}

function getFieldsByCategory() {
  const grouped = {};
  for (const f of EXPORT_FIELDS) {
    if (!grouped[f.category]) grouped[f.category] = [];
    grouped[f.category].push(f);
  }
  return grouped;
}

module.exports = { EXPORT_FIELDS, getFieldsByCategory, buildExportRow };
