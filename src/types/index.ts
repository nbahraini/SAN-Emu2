// SAN Simulator Type Definitions

export type Vendor = 'brocade' | 'cisco';
export type FOSVersion = '7.x' | '8.x' | '9.x';
export type NXOSVersion = '8.x' | '9.x' | '10.x';
export type DeviceType = 'switch' | 'director' | 'host' | 'storage' | 'hba' | 'access_gateway';
export type PortType = 'N_Port' | 'F_Port' | 'E_Port' | 'NP_Port' | 'EX_Port' | 'VE_Port' | 'D_Port';
export type PortState = 'online' | 'offline' | 'disabled' | 'faulty' | 'no_module' | 'no_light';
export type FabricState = 'stable' | 'merging' | 'segmented' | 'isolated';
export type Severity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

export interface LogEntry {
  timestamp: number;
  severity: Severity;
  source: string;
  message: string;
}

export interface WWN {
  wwpn: string;
  wwnn: string;
}

export interface FCPort {
  id: string;
  index: number;
  name: string;
  type: PortType;
  state: PortState;
  speed: number; // Gbps
  wwpn?: string;
  wwnn?: string;
  fcid?: string;
  connectedTo?: string; // port id
  media: 'id' | 'sm' | 'mm';
  npivEnabled: boolean;
  virtualPorts: VirtualPort[];
  errors: PortErrors;
}

export interface VirtualPort {
  vwwpn: string;
  vwwnn: string;
  fcid: string;
  state: PortState;
}

export interface PortErrors {
  encIn: number;
  encOut: number;
  crcErr: number;
  tooShort: number;
  tooLong: number;
  badEof: number;
  discC3: number;
  lossSync: number;
  lossSignal: number;
  primSeqErr: number;
  invalidTxWord: number;
  invalidCrc: number;
}

export interface Device {
  id: string;
  name: string;
  vendor: Vendor;
  type: DeviceType;
  version: string;
  domainId: number;
  principalSwitch: boolean;
  ipAddress: string;
  mgmtWwpn: string;
  ports: FCPort[];
  enabled: boolean;
  serialNumber: string;
  chassisId: string;
  fabricId?: string;
  vsanId?: number;
  config: DeviceConfig;
  logs: LogEntry[];
  uptime: number;
}

export interface DeviceConfig {
  zoning: ZoningConfig;
  trunking: boolean;
  npiv: boolean;
  virtualFabrics: boolean;
  logicalSwitches?: LogicalSwitch[];
  accessGateway?: AccessGatewayConfig;
}

export interface LogicalSwitch {
  id: number;
  name: string;
  fabricId: string;
  ports: string[];
}

export interface AccessGatewayConfig {
  enabled: boolean;
  upstreamPorts: string[];
  npvMode: boolean;
}

export interface ZoningConfig {
  aliases: Alias[];
  zones: Zone[];
  activeConfig?: string;
  configs: ConfigDef[];
}

export interface Alias {
  name: string;
  members: string[]; // WWPNs
}

export interface Zone {
  name: string;
  members: string[]; // alias names or WWPNs
  vsanId?: number;
}

export interface ConfigDef {
  name: string;
  zones: string[];
  active: boolean;
}

export interface Fabric {
  id: string;
  name: string;
  state: FabricState;
  switches: string[]; // device ids
  principalSwitchId?: string;
  domainIds: number[];
  isls: ISL[];
  zones: ZoningConfig;
  fcns: FCNSEntry[];
  flogiDb: FLOGIEntry[];
  events: SimEvent[];
}

export interface ISL {
  id: string;
  srcDeviceId: string;
  srcPort: string;
  dstDeviceId: string;
  dstPort: string;
  state: 'up' | 'down' | 'faulty';
  speed: number;
  utilization: number;
  trunkGroup?: string;
}

export interface FCNSEntry {
  fcid: string;
  wwpn: string;
  wwnn: string;
  portName: string;
  nodeName: string;
  portType: PortType;
  deviceId: string;
  portIndex: number;
}

export interface FLOGIEntry {
  wwpn: string;
  fcid: string;
  deviceId: string;
  portIndex: number;
  timestamp: number;
}

export interface SimEvent {
  id: string;
  timestamp: number;
  type: EventType;
  severity: Severity;
  deviceId?: string;
  portIndex?: number;
  message: string;
  details?: Record<string, any>;
}

export type EventType = 
  | 'FLOGI' | 'PLOGI' | 'PRLI' | 'LOGO' | 'SCR' | 'RSCN'
  | 'LINK_UP' | 'LINK_DOWN' | 'PORT_ENABLE' | 'PORT_DISABLE'
  | 'ISL_UP' | 'ISL_DOWN' | 'FABRIC_MERGE' | 'FABRIC_SEGMENT'
  | 'ZONE_CHANGE' | 'CONFIG_CHANGE' | 'ERROR' | 'WARNING'
  | 'DEVICE_UP' | 'DEVICE_DOWN' | 'NPIV_LOGIN' | 'FCNS_REGISTER'
  | 'DOMAIN_CONFLICT' | 'DUPLICATE_WWN' | 'TRUNK_FORMED';

export interface TopologyNode {
  id: string;
  type: 'device' | 'host' | 'storage';
  position: { x: number; y: number };
  data: {
    deviceId: string;
    label: string;
    vendor: Vendor;
    status: 'online' | 'offline' | 'warning';
  };
}

export interface TopologyEdge {
  id: string;
  source: string;
  target: string;
  data: {
    linkType: 'ISL' | 'FC' | 'trunk';
    speed: number;
    state: 'up' | 'down';
  };
}

export interface LabTemplate {
  id: string;
  name: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  topology: LabTopology;
  objectives: string[];
}

export interface LabTopology {
  devices: DeviceTemplate[];
  links: LinkTemplate[];
}

export interface DeviceTemplate {
  name: string;
  vendor: Vendor;
  type: DeviceType;
  version: string;
  domainId: number;
  portCount: number;
}

export interface LinkTemplate {
  srcDevice: string;
  srcPort: number;
  dstDevice: string;
  dstPort: number;
  type: 'ISL' | 'FC' | 'trunk';
  speed: number;
}

export interface TrafficFlow {
  id: string;
  srcWwpn: string;
  dstWwpn: string;
  iops: number;
  throughputMbps: number;
  readWriteRatio: number;
  blockSize: number;
  latency: number;
}

export interface FailureScenario {
  id: string;
  name: string;
  description: string;
  type: FailureType;
  target: string;
  details: Record<string, any>;
}

export type FailureType = 
  | 'cable_failure' | 'port_failure' | 'switch_failure'
  | 'isl_failure' | 'trunk_member_failure' | 'hba_failure'
  | 'zoning_error' | 'duplicate_wwpn' | 'domain_conflict'
  | 'fabric_merge_conflict' | 'vsan_mismatch' | 'link_flapping';

export interface ValidationResult {
  rule: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  severity: Severity;
  message: string;
  details?: string;
}

export interface CLISession {
  id: string;
  deviceId: string;
  history: string[];
  currentLine: string;
  mode: 'exec' | 'config' | 'config-if' | 'config-zone' | 'config-vsan';
  prompt: string;
}

export interface VSAN {
  id: number;
  name: string;
  description: string;
  fabricId: string;
  switches: string[];
  interfaces: string[];
  zones: ZoningConfig;
  fcns: FCNSEntry[];
  flogiDb: FLOGIEntry[];
}

export interface AutomationScript {
  id: string;
  name: string;
  language: 'python' | 'javascript' | 'cli';
  code: string;
  lastRun?: number;
  lastResult?: string;
}
