import { v4 as uuidv4 } from 'uuid';
import type {
  Device, FCPort, Fabric, ISL, FCNSEntry, FLOGIEntry, SimEvent,
  ZoningConfig, Alias, Zone, ConfigDef, PortType, PortState,
  Vendor, DeviceType, Severity, EventType, VSAN, TrafficFlow,
  FailureScenario, ValidationResult, TopologyNode, TopologyEdge,
  PortErrors, VirtualPort
} from '../types';

// ============= WWN Generator =============
export class WWNGenerator {
  private static counter = 0;
  
  static generateWWPN(vendor: Vendor = 'brocade'): string {
    this.counter++;
    const prefix = vendor === 'brocade' ? '10:00:00:90:fa' : '20:00:00:00:c9';
    const suffix = this.counter.toString(16).padStart(6, '0').match(/.{2}/g)!.join(':');
    return `${prefix}:${suffix}`;
  }
  
  static generateWWNN(vendor: Vendor = 'brocade'): string {
    this.counter++;
    const prefix = vendor === 'brocade' ? '20:00:00:90:fa' : '20:00:00:00:c9';
    const suffix = this.counter.toString(16).padStart(6, '0').match(/.{2}/g)!.join(':');
    return `${prefix}:${suffix}`;
  }
  
  static generateFCID(domainId: number, area: number, port: number): string {
    return `${domainId.toString(16).padStart(2, '0')}${area.toString(16).padStart(2, '0')}${port.toString(16).padStart(2, '0')}`;
  }
  
  static isValidWWN(wwn: string): boolean {
    return /^([0-9a-f]{2}:){7}[0-9a-f]{2}$/i.test(wwn);
  }
}

// ============= Vendor Capability Database =============
export const VendorCapabilities: Record<string, Record<string, Record<string, boolean>>> = {
  brocade: {
    '7.x': {
      npiv: true, trunking: true, virtual_fabrics: true, access_gateway: true,
      port_trunking: true, fcr: false, extended_fabric: true,
      f_port_channel: true, dynamic_load_balancing: true,
      fabric_watch: true, ism: false, qos: true,
      enhanced_grouping: true, fc_routing: false,
    },
    '8.x': {
      npiv: true, trunking: true, virtual_fabrics: true, access_gateway: true,
      port_trunking: true, fcr: true, extended_fabric: true,
      f_port_channel: true, dynamic_load_balancing: true,
      fabric_watch: true, ism: true, qos: true,
      enhanced_grouping: true, fc_routing: true,
    },
    '9.x': {
      npiv: true, trunking: true, virtual_fabrics: true, access_gateway: true,
      port_trunking: true, fcr: true, extended_fabric: true,
      f_port_channel: true, dynamic_load_balancing: true,
      fabric_watch: true, ism: true, qos: true,
      enhanced_grouping: true, fc_routing: true,
      gen7_fc: true, nvme_fc: true, ipfc: false,
    },
  },
  cisco: {
    '8.x': {
      vsan: true, npv: true, npiv: true, port_channel: true,
      device_alias: true, fcdomain: true, ivr: true,
      fcip: true, fport_channel_trunk: true,
      flogi_database: true, fcns: true,
    },
    '9.x': {
      vsan: true, npv: true, npiv: true, port_channel: true,
      device_alias: true, fcdomain: true, ivr: true,
      fcip: true, fport_channel_trunk: true,
      flogi_database: true, fcns: true,
      nvme_fc: true, analytics: true,
    },
    '10.x': {
      vsan: true, npv: true, npiv: true, port_channel: true,
      device_alias: true, fcdomain: true, ivr: true,
      fcip: true, fport_channel_trunk: true,
      flogi_database: true, fcns: true,
      nvme_fc: true, analytics: true,
      smart_health: true, intent_based: true,
    },
  },
};

// ============= Device Factory =============
export class DeviceFactory {
  static createDevice(params: {
    name: string;
    vendor: Vendor;
    type: DeviceType;
    version: string;
    domainId: number;
    portCount: number;
    ipAddress?: string;
  }): Device {
    const ports: FCPort[] = [];
    const basePortCount = params.type === 'director' ? 8 : params.portCount;
    
    for (let i = 0; i < basePortCount; i++) {
      const port: FCPort = {
        id: uuidv4(),
        index: i,
        name: params.vendor === 'brocade' ? `${i}` : `fc${Math.floor(i / 4) + 1}/${(i % 4) + 1}`,
        type: i < 2 ? 'E_Port' : 'F_Port',
        state: 'online',
        speed: params.version.startsWith('9') ? 32 : params.version.startsWith('8') ? 16 : 8,
        wwpn: WWNGenerator.generateWWPN(params.vendor),
        wwnn: WWNGenerator.generateWWNN(params.vendor),
        media: 'id',
        npivEnabled: false,
        virtualPorts: [],
        errors: this.createEmptyErrors(),
      };
      ports.push(port);
    }

    return {
      id: uuidv4(),
      name: params.name,
      vendor: params.vendor,
      type: params.type,
      version: params.version,
      domainId: params.domainId,
      principalSwitch: false,
      ipAddress: params.ipAddress || `10.0.0.${Math.floor(Math.random() * 254) + 1}`,
      mgmtWwpn: WWNGenerator.generateWWPN(params.vendor),
      ports,
      enabled: true,
      serialNumber: `SN${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
      chassisId: `CH${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      config: {
        zoning: { aliases: [], zones: [], configs: [] },
        trunking: true,
        npiv: false,
        virtualFabrics: false,
      },
      logs: [],
      uptime: 0,
    };
  }

  static createHost(name: string, hbaCount: number = 2): Device {
    const ports: FCPort[] = [];
    for (let i = 0; i < hbaCount; i++) {
      ports.push({
        id: uuidv4(),
        index: i,
        name: `HBA${i}`,
        type: 'N_Port',
        state: 'online',
        speed: 16,
        wwpn: WWNGenerator.generateWWPN('brocade'),
        wwnn: WWNGenerator.generateWWNN('brocade'),
        media: 'id',
        npivEnabled: false,
        virtualPorts: [],
        errors: this.createEmptyErrors(),
      });
    }
    return {
      id: uuidv4(),
      name,
      vendor: 'brocade',
      type: 'host',
      version: 'N/A',
      domainId: 0,
      principalSwitch: false,
      ipAddress: '',
      mgmtWwpn: '',
      ports,
      enabled: true,
      serialNumber: '',
      chassisId: '',
      config: {
        zoning: { aliases: [], zones: [], configs: [] },
        trunking: false,
        npiv: false,
        virtualFabrics: false,
      },
      logs: [],
      uptime: 0,
    };
  }

  static createStorage(name: string, portCount: number = 4): Device {
    const ports: FCPort[] = [];
    for (let i = 0; i < portCount; i++) {
      ports.push({
        id: uuidv4(),
        index: i,
        name: `P${i}`,
        type: 'N_Port',
        state: 'online',
        speed: 32,
        wwpn: WWNGenerator.generateWWPN('brocade'),
        wwnn: WWNGenerator.generateWWNN('brocade'),
        media: 'id',
        npivEnabled: false,
        virtualPorts: [],
        errors: this.createEmptyErrors(),
      });
    }
    return {
      id: uuidv4(),
      name,
      vendor: 'brocade',
      type: 'storage',
      version: 'N/A',
      domainId: 0,
      principalSwitch: false,
      ipAddress: '',
      mgmtWwpn: '',
      ports,
      enabled: true,
      serialNumber: '',
      chassisId: '',
      config: {
        zoning: { aliases: [], zones: [], configs: [] },
        trunking: false,
        npiv: false,
        virtualFabrics: false,
      },
      logs: [],
      uptime: 0,
    };
  }

  static createEmptyErrors(): PortErrors {
    return {
      encIn: 0, encOut: 0, crcErr: 0, tooShort: 0, tooLong: 0,
      badEof: 0, discC3: 0, lossSync: 0, lossSignal: 0,
      primSeqErr: 0, invalidTxWord: 0, invalidCrc: 0,
    };
  }
}

// ============= Fabric Engine =============
export class FabricEngine {
  private fabrics: Map<string, Fabric> = new Map();
  private events: SimEvent[] = [];

  createFabric(name: string): Fabric {
    const fabric: Fabric = {
      id: uuidv4(),
      name,
      state: 'stable',
      switches: [],
      domainIds: [],
      isls: [],
      zones: { aliases: [], zones: [], configs: [] },
      fcns: [],
      flogiDb: [],
      events: [],
    };
    this.fabrics.set(fabric.id, fabric);
    return fabric;
  }

  addSwitchToFabric(fabricId: string, deviceId: string, domainId: number): boolean {
    const fabric = this.fabrics.get(fabricId);
    if (!fabric) return false;
    if (fabric.domainIds.includes(domainId)) {
      this.addEvent({
        type: 'DOMAIN_CONFLICT',
        severity: 'CRITICAL',
        deviceId,
        message: `Domain ID ${domainId} conflict in fabric ${fabric.name}`,
      });
      return false;
    }
    fabric.switches.push(deviceId);
    fabric.domainIds.push(domainId);
    if (!fabric.principalSwitchId) {
      fabric.principalSwitchId = deviceId;
    }
    return true;
  }

  removeSwitchFromFabric(fabricId: string, deviceId: string): boolean {
    const fabric = this.fabrics.get(fabricId);
    if (!fabric) return false;
    const idx = fabric.switches.indexOf(deviceId);
    if (idx === -1) return false;
    fabric.switches.splice(idx, 1);
    const domainIdx = fabric.domainIds.indexOf(fabric.domainIds[idx]);
    if (domainIdx !== -1) fabric.domainIds.splice(domainIdx, 1);
    if (fabric.principalSwitchId === deviceId) {
      fabric.principalSwitchId = fabric.switches[0] || undefined;
    }
    return true;
  }

  addISL(fabricId: string, isl: ISL): boolean {
    const fabric = this.fabrics.get(fabricId);
    if (!fabric) return false;
    fabric.isls.push(isl);
    this.addEvent({
      type: 'ISL_UP',
      severity: 'INFO',
      message: `ISL established: ${isl.srcDeviceId}:${isl.srcPort} <-> ${isl.dstDeviceId}:${isl.dstPort}`,
    });
    return true;
  }

  removeISL(fabricId: string, islId: string): boolean {
    const fabric = this.fabrics.get(fabricId);
    if (!fabric) return false;
    const idx = fabric.isls.findIndex(i => i.id === islId);
    if (idx === -1) return false;
    const isl = fabric.isls[idx];
    isl.state = 'down';
    this.addEvent({
      type: 'ISL_DOWN',
      severity: 'WARNING',
      message: `ISL down: ${isl.srcDeviceId}:${isl.srcPort} <-> ${isl.dstDeviceId}:${isl.dstPort}`,
    });
    return true;
  }

  registerFCNS(fabricId: string, entry: FCNSEntry): void {
    const fabric = this.fabrics.get(fabricId);
    if (!fabric) return;
    const existing = fabric.fcns.findIndex(e => e.wwpn === entry.wwpn);
    if (existing !== -1) {
      fabric.fcns[existing] = entry;
    } else {
      fabric.fcns.push(entry);
    }
    this.addEvent({
      type: 'FCNS_REGISTER',
      severity: 'INFO',
      deviceId: entry.deviceId,
      message: `FCNS: ${entry.wwpn} registered as ${entry.portName} (FCID: ${entry.fcid})`,
    });
  }

  registerFLOGI(fabricId: string, entry: FLOGIEntry): void {
    const fabric = this.fabrics.get(fabricId);
    if (!fabric) return;
    const existing = fabric.flogiDb.findIndex(e => e.wwpn === entry.wwpn);
    if (existing !== -1) {
      fabric.flogiDb[existing] = entry;
    } else {
      fabric.flogiDb.push(entry);
    }
    this.addEvent({
      type: 'FLOGI',
      severity: 'INFO',
      deviceId: entry.deviceId,
      message: `FLOGI: ${entry.wwpn} logged in with FCID ${entry.fcid}`,
    });
  }

  performFLOGI(devices: Map<string, Device>, fabricId: string): void {
    const fabric = this.fabrics.get(fabricId);
    if (!fabric) return;
    
    for (const switchId of fabric.switches) {
      const device = devices.get(switchId);
      if (!device || device.type === 'host' || device.type === 'storage') continue;
      
      for (const port of device.ports) {
        if (port.state !== 'online' || port.type !== 'F_Port') continue;
        if (port.connectedTo) {
          const connectedDevice = this.findConnectedDevice(devices, port.connectedTo);
          if (connectedDevice && (connectedDevice.type === 'host' || connectedDevice.type === 'storage')) {
            const connectedPort = connectedDevice.ports.find(p => p.id === port.connectedTo);
            if (connectedPort && connectedPort.wwpn) {
              const fcid = WWNGenerator.generateFCID(device.domainId, port.index + 1, 1);
              this.registerFLOGI(fabricId, {
                wwpn: connectedPort.wwpn,
                fcid,
                deviceId: connectedDevice.id,
                portIndex: connectedPort.index,
                timestamp: Date.now(),
              });
              this.registerFCNS(fabricId, {
                fcid,
                wwpn: connectedPort.wwpn,
                wwnn: connectedPort.wwnn || '',
                portName: connectedPort.name,
                nodeName: connectedDevice.name,
                portType: 'N_Port',
                deviceId: connectedDevice.id,
                portIndex: connectedPort.index,
              });
              this.addEvent({
                type: 'PLOGI',
                severity: 'INFO',
                deviceId: device.id,
                portIndex: port.index,
                message: `PLOGI: ${connectedDevice.name}:${connectedPort.name} -> ${device.name}:${port.name}`,
              });
            }
          }
        }
      }
    }
  }

  private findConnectedDevice(devices: Map<string, Device>, portId: string): Device | undefined {
    for (const device of devices.values()) {
      if (device.ports.some(p => p.id === portId)) return device;
    }
    return undefined;
  }

  mergeFabrics(fabric1Id: string, fabric2Id: string, devices: Map<string, Device>): boolean {
    const f1 = this.fabrics.get(fabric1Id);
    const f2 = this.fabrics.get(fabric2Id);
    if (!f1 || !f2) return false;
    
    // Check for domain conflicts
    for (const domain of f2.domainIds) {
      if (f1.domainIds.includes(domain)) {
        this.addEvent({
          type: 'FABRIC_SEGMENT',
          severity: 'CRITICAL',
          message: `Fabric merge failed: Domain ID ${domain} conflict between ${f1.name} and ${f2.name}`,
        });
        return false;
      }
    }
    
    // Merge
    f1.switches.push(...f2.switches);
    f1.domainIds.push(...f2.domainIds);
    f1.isls.push(...f2.isls);
    f1.fcns.push(...f2.fcns);
    f1.flogiDb.push(...f2.flogiDb);
    
    // Update device fabric assignments
    for (const switchId of f2.switches) {
      const device = devices.get(switchId);
      if (device) device.fabricId = f1.id;
    }
    
    this.addEvent({
      type: 'FABRIC_MERGE',
      severity: 'INFO',
      message: `Fabric merge: ${f2.name} merged into ${f1.name}`,
    });
    
    this.fabrics.delete(fabric2Id);
    return true;
  }

  getFabric(id: string): Fabric | undefined {
    return this.fabrics.get(id);
  }

  getAllFabrics(): Fabric[] {
    return Array.from(this.fabrics.values());
  }

  getEvents(): SimEvent[] {
    return this.events;
  }

  addEvent(event: Omit<SimEvent, 'id' | 'timestamp'>): SimEvent {
    const simEvent: SimEvent = {
      ...event,
      id: uuidv4(),
      timestamp: Date.now(),
    };
    this.events.push(simEvent);
    // Also add to fabric events if relevant
    if (event.deviceId) {
      for (const fabric of this.fabrics.values()) {
        if (fabric.switches.includes(event.deviceId)) {
          fabric.events.push(simEvent);
          break;
        }
      }
    }
    return simEvent;
  }

  deleteFabric(id: string): void {
    this.fabrics.delete(id);
  }

  validateFabric(fabricId: string, devices: Map<string, Device>): ValidationResult[] {
    const fabric = this.fabrics.get(fabricId);
    if (!fabric) return [];
    const results: ValidationResult[] = [];
    
    // Check WWPN uniqueness
    const wwpns = new Set<string>();
    let duplicateFound = false;
    for (const switchId of fabric.switches) {
      const device = devices.get(switchId);
      if (!device) continue;
      for (const port of device.ports) {
        if (port.wwpn) {
          if (wwpns.has(port.wwpn)) {
            duplicateFound = true;
          }
          wwpns.add(port.wwpn);
        }
      }
    }
    results.push({
      rule: 'WWPN Uniqueness',
      status: duplicateFound ? 'FAIL' : 'PASS',
      severity: duplicateFound ? 'CRITICAL' : 'INFO',
      message: duplicateFound ? 'Duplicate WWPNs detected' : 'All WWPNs are unique',
    });

    // Check domain IDs
    const domainSet = new Set<number>();
    let domainConflict = false;
    for (const d of fabric.domainIds) {
      if (domainSet.has(d)) domainConflict = true;
      domainSet.add(d);
    }
    results.push({
      rule: 'Domain IDs',
      status: domainConflict ? 'FAIL' : 'PASS',
      severity: domainConflict ? 'CRITICAL' : 'INFO',
      message: domainConflict ? 'Domain ID conflicts detected' : 'All domain IDs are unique',
    });

    // Check ISL connectivity
    const activeISLs = fabric.isls.filter(i => i.state === 'up');
    results.push({
      rule: 'ISL Connectivity',
      status: activeISLs.length > 0 ? 'PASS' : 'WARNING',
      severity: activeISLs.length > 0 ? 'INFO' : 'WARNING',
      message: `${activeISLs.length} active ISLs`,
    });

    // Check ISL utilization
    for (const isl of fabric.isls) {
      if (isl.utilization > 80) {
        results.push({
          rule: 'ISL Utilization',
          status: 'WARNING',
          severity: 'WARNING',
          message: `ISL ${isl.id} utilization at ${isl.utilization}%`,
        });
      }
    }

    // Check FLOGI
    results.push({
      rule: 'FLOGI',
      status: fabric.flogiDb.length > 0 ? 'PASS' : 'WARNING',
      severity: fabric.flogiDb.length > 0 ? 'INFO' : 'WARNING',
      message: `${fabric.flogiDb.length} devices logged in`,
    });

    // Check FCNS
    results.push({
      rule: 'FCNS',
      status: fabric.fcns.length > 0 ? 'PASS' : 'WARNING',
      severity: fabric.fcns.length > 0 ? 'INFO' : 'WARNING',
      message: `${fabric.fcns.length} entries in name server`,
    });

    // Check zoning
    const hasActiveConfig = fabric.zones.configs.some(c => c.active);
    results.push({
      rule: 'Active Zoning',
      status: hasActiveConfig ? 'PASS' : 'WARNING',
      severity: hasActiveConfig ? 'INFO' : 'WARNING',
      message: hasActiveConfig ? 'Active configuration exists' : 'No active zoning configuration',
    });

    return results;
  }
}

// ============= Zoning Engine =============
export class ZoningEngine {
  static createAlias(config: ZoningConfig, name: string, members: string[]): Alias {
    const alias: Alias = { name, members };
    config.aliases.push(alias);
    return alias;
  }

  static createZone(config: ZoningConfig, name: string, members: string[]): Zone {
    const zone: Zone = { name, members };
    config.zones.push(zone);
    return zone;
  }

  static addToZone(config: ZoningConfig, zoneName: string, members: string[]): boolean {
    const zone = config.zones.find(z => z.name === zoneName);
    if (!zone) return false;
    zone.members.push(...members);
    return true;
  }

  static createConfig(config: ZoningConfig, name: string, zones: string[]): ConfigDef {
    const cfg: ConfigDef = { name, zones, active: false };
    config.configs.push(cfg);
    return cfg;
  }

  static activateConfig(config: ZoningConfig, name: string): boolean {
    const cfg = config.configs.find(c => c.name === name);
    if (!cfg) return false;
    config.configs.forEach(c => c.active = false);
    cfg.active = true;
    config.activeConfig = name;
    return true;
  }

  static deactivateConfig(config: ZoningConfig): void {
    config.configs.forEach(c => c.active = false);
    config.activeConfig = undefined;
  }

  static saveConfig(config: ZoningConfig): boolean {
    return true; // In simulation, always succeeds
  }

  static checkZonePermit(config: ZoningConfig, srcWwpn: string, dstWwpn: string): boolean {
    if (!config.activeConfig) return true; // No zoning = open
    const activeCfg = config.configs.find(c => c.active);
    if (!activeCfg) return true;
    
    for (const zoneName of activeCfg.zones) {
      const zone = config.zones.find(z => z.name === zoneName);
      if (!zone) continue;
      
      // Resolve aliases
      const resolvedMembers = new Set<string>();
      for (const member of zone.members) {
        const alias = config.aliases.find(a => a.name === member);
        if (alias) {
          alias.members.forEach(m => resolvedMembers.add(m));
        } else {
          resolvedMembers.add(member);
        }
      }
      
      if (resolvedMembers.has(srcWwpn) && resolvedMembers.has(dstWwpn)) {
        return true;
      }
    }
    return false;
  }
}

// ============= Traffic Engine =============
export class TrafficEngine {
  private flows: Map<string, TrafficFlow> = new Map();

  addFlow(flow: TrafficFlow): void {
    this.flows.set(flow.id, flow);
  }

  removeFlow(id: string): void {
    this.flows.delete(id);
  }

  getFlows(): TrafficFlow[] {
    return Array.from(this.flows.values());
  }

  simulateTraffic(devices: Map<string, Device>, fabrics: Fabric[]): void {
    for (const flow of this.flows.values()) {
      // Simulate congestion based on IOPS and throughput
      const congestion = Math.min(100, (flow.iops / 100000) * 100);
      flow.latency = 0.5 + (congestion / 100) * 5;
    }
  }
}

// ============= Failure Engine =============
export class FailureEngine {
  static injectFailure(
    type: string,
    target: string,
    devices: Map<string, Device>,
    fabrics: FabricEngine,
    fabricId: string
  ): SimEvent {
    const event: Omit<SimEvent, 'id' | 'timestamp'> = { type: 'ERROR' as EventType, severity: 'ERROR' as Severity, message: '' };
    
    switch (type) {
      case 'cable_failure':
      case 'isl_failure': {
        const fabric = fabrics.getFabric(fabricId);
        if (fabric) {
          const isl = fabric.isls.find(i => i.srcDeviceId === target || i.dstDeviceId === target);
          if (isl) {
            isl.state = 'down';
            event.type = 'ISL_DOWN';
            event.message = `ISL failure injected: ${target}`;
          }
        }
        break;
      }
      case 'port_failure': {
        for (const device of devices.values()) {
          const port = device.ports.find(p => p.id === target || p.name === target);
          if (port) {
            port.state = 'faulty';
            event.type = 'LINK_DOWN';
            event.deviceId = device.id;
            event.message = `Port failure injected: ${device.name}:${port.name}`;
            break;
          }
        }
        break;
      }
      case 'switch_failure': {
        const device = devices.get(target);
        if (device) {
          device.enabled = false;
          device.ports.forEach(p => p.state = 'offline');
          event.type = 'DEVICE_DOWN';
          event.deviceId = device.id;
          event.message = `Switch failure injected: ${device.name}`;
        }
        break;
      }
      case 'duplicate_wwpn': {
        event.type = 'DUPLICATE_WWN';
        event.severity = 'CRITICAL';
        event.message = `Duplicate WWPN detected at ${target}`;
        break;
      }
      case 'domain_conflict': {
        event.type = 'DOMAIN_CONFLICT';
        event.severity = 'CRITICAL';
        event.message = `Domain ID conflict at ${target}`;
        break;
      }
      case 'link_flapping': {
        event.type = 'LINK_DOWN';
        event.message = `Link flapping detected on ${target}`;
        break;
      }
      default:
        event.message = `Failure injected: ${type} on ${target}`;
    }
    
    return fabrics.addEvent(event);
  }
}

// ============= Export/Import =============
export class LabExporter {
  static exportLab(
    devices: Map<string, Device>,
    fabrics: Fabric[],
    vsans: VSAN[]
  ): string {
    const lab = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      devices: Array.from(devices.values()),
      fabrics,
      vsans,
    };
    return JSON.stringify(lab, null, 2);
  }

  static importLab(json: string): {
    devices: Device[];
    fabrics: Fabric[];
    vsans: VSAN[];
  } {
    const lab = JSON.parse(json);
    return {
      devices: lab.devices || [],
      fabrics: lab.fabrics || [],
      vsans: lab.vsans || [],
    };
  }
}
